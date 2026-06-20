const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

let cachedLogoBuffer = null;

/**
 * Fetch local logo image buffer. Caches buffer in memory to keep subsequent generation calls fast.
 */
function getLogoBuffer() {
    if (cachedLogoBuffer) return Promise.resolve(cachedLogoBuffer);
    return new Promise((resolve) => {
        try {
            const logoPath = path.join(__dirname, '../../../Tapovana_Frontend/src/assets/logo.png');
            cachedLogoBuffer = fs.readFileSync(logoPath);
            resolve(cachedLogoBuffer);
        } catch (err) {
            console.warn('Failed to load local logo, falling back to text:', err);
            resolve(null);
        }
    });
}

function renderTextLogo(doc, x, y, width) {
    doc.save();
    doc.font('Times-Bold')
       .fontSize(16)
       .fillColor('#1b4d3e')
       .text('T A P O V A N A', x, y, { width: width, align: 'center' });
    doc.restore();
}

/**
 * Draw a beautiful gold radial mandala in the background with low opacity
 */
function drawWatermarkMandala(doc, cx, cy) {
    doc.save();
    const goldColor = '#DAA520';
    doc.strokeColor(goldColor);
    doc.opacity(0.07); // Subtle watermark opacity
    
    // Draw concentric circles
    const radii = [60, 120, 180, 240, 300];
    radii.forEach((r, idx) => {
        doc.lineWidth(idx % 2 === 0 ? 1 : 0.5);
        doc.circle(cx, cy, r).stroke();
    });

    // Petal patterns
    const layers = [
        { count: 12, r: 120, petalH: 20 },
        { count: 24, r: 240, petalH: 40 }
    ];

    layers.forEach((layer) => {
        doc.lineWidth(0.8);
        for (let i = 0; i < layer.count; i++) {
            const angle = (i * 2 * Math.PI) / layer.count;
            const nextAngle = ((i + 1) * 2 * Math.PI) / layer.count;
            const midAngle = (angle + nextAngle) / 2;

            const x1 = cx + Math.cos(angle) * layer.r;
            const y1 = cy + Math.sin(angle) * layer.r;
            const x2 = cx + Math.cos(nextAngle) * layer.r;
            const y2 = cy + Math.sin(nextAngle) * layer.r;

            const peakR = layer.r + layer.petalH;
            const mx = cx + Math.cos(midAngle) * peakR;
            const my = cy + Math.sin(midAngle) * peakR;

            doc.moveTo(x1, y1)
               .quadraticCurveTo(mx, my, x2, y2)
               .stroke();
        }
    });

    // Draw lines radiating from the inner core
    doc.lineWidth(0.5);
    const coreCount = 16;
    for (let i = 0; i < coreCount; i++) {
        const angle = (i * 2 * Math.PI) / coreCount;
        const x1 = cx + Math.cos(angle) * 15;
        const y1 = cy + Math.sin(angle) * 15;
        const x2 = cx + Math.cos(angle) * 60;
        const y2 = cy + Math.sin(angle) * 60;
        doc.moveTo(x1, y1).lineTo(x2, y2).stroke();
    }

    doc.restore();
}

/**
 * Generates a premium gold and green themed certificate of completion.
 * @param {string} participantName - The participant's full name.
 * @param {string} workshopTitle - The title of the workshop completed.
 * @param {string} completionDate - The date of completion (formatted string).
 * @param {string} [conductorName] - Conductor name.
 * @param {string} [signatureImage] - Dynamic signature image (path, URL or base64).
 * @param {string} [certificateId] - Unique certificate identifier.
 * @returns {Promise<Buffer>} - Resolves with a PDF buffer.
 */
function generateCertificatePDF(participantName, workshopTitle, completionDate, conductorName, signatureImage, certificateId) {
    return new Promise(async (resolve, reject) => {
        try {
            const doc = new PDFDocument({
                layout: 'landscape',
                size: 'A4',
                margins: { top: 0, left: 0, right: 0, bottom: 0 }
            });

            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', (err) => reject(err));

            const width = 841.89;
            const height = 595.28;

            // 1. Premium soft off-white background
            doc.rect(0, 0, width, height).fill('#FAF9F6');

            // 2. Draw watermark mandala centered
            drawWatermarkMandala(doc, width / 2, height / 2);

            // 3. Gold and Green double borders
            // Outer green border
            doc.rect(25, 25, width - 50, height - 50)
               .lineWidth(5)
               .strokeColor('#1b4d3e')
               .stroke();

            // Inner gold border
            doc.rect(34, 34, width - 68, height - 68)
               .lineWidth(1.5)
               .strokeColor('#DAA520')
               .stroke();

            // Corner border accents (gold leaf curves)
            const drawCornerAccent = (x, y, rotation) => {
                doc.save();
                doc.translate(x, y);
                doc.rotate(rotation);
                doc.lineWidth(1.5);
                doc.strokeColor('#DAA520');
                doc.moveTo(0, 0).quadraticCurveTo(20, 0, 20, 20).stroke();
                doc.moveTo(0, 0).quadraticCurveTo(0, 20, 20, 20).stroke();
                doc.restore();
            };
            drawCornerAccent(40, 40, 0);
            drawCornerAccent(width - 40, 40, 90);
            drawCornerAccent(width - 40, height - 40, 180);
            drawCornerAccent(40, height - 40, 270);

            // 4. Header: TAPOVANA LIFE SPACE (centered)
            doc.font('Times-Bold')
               .fontSize(16)
               .fillColor('#1b4d3e')
               .text('TAPOVANA LIFE SPACE', 0, 52, { width: width, align: 'center', characterSpacing: 2 });

            // 5. Logo directly below the title
            const logo = await getLogoBuffer();
            const logoWidth = 60;
            const logoX = (width - logoWidth) / 2;
            const logoY = 78;
            if (logo) {
                try {
                    doc.image(logo, logoX, logoY, { width: logoWidth });
                } catch (imgErr) {
                    console.warn('Failed to draw logo, rendering backup text:', imgErr);
                    renderTextLogo(doc, 0, logoY, width);
                }
            } else {
                renderTextLogo(doc, 0, logoY, width);
            }

            // 6. Title: CERTIFICATE OF COMPLETION
            doc.font('Times-Bold')
               .fontSize(28)
               .fillColor('#DAA520')
               .text('CERTIFICATE OF COMPLETION', 0, 150, { width: width, align: 'center', characterSpacing: 1 });

            // Thin gold line under title
            doc.lineWidth(1)
               .strokeColor('#DAA520')
               .moveTo(width / 2 - 150, 188)
               .lineTo(width / 2 + 150, 188)
               .stroke();

            // 7. Presentation text
            doc.font('Times-Italic')
               .fontSize(15)
               .fillColor('#555555')
               .text('This is proudly presented to', 0, 208, { width: width, align: 'center' });

            // 8. Participant Name (gold/green accent)
            doc.font('Times-BoldItalic')
               .fontSize(36)
               .fillColor('#1b4d3e')
               .text(participantName, 0, 238, { width: width, align: 'center' });

            // Completion description
            doc.font('Times-Italic')
               .fontSize(14)
               .fillColor('#555555')
               .text('for successfully completing the workshop', 0, 292, { width: width, align: 'center' });

            // 9. Workshop Title (bold, gold)
            doc.font('Times-Bold')
               .fontSize(22)
               .fillColor('#DAA520')
               .text(workshopTitle, 0, 318, { width: width, align: 'center' });

            // 10. Date of completion
            doc.font('Times-Roman')
               .fontSize(13)
               .fillColor('#555555')
               .text(`Completed on ${completionDate}`, 0, 356, { width: width, align: 'center' });

            // 11. Certificate ID (Optional, bottom right or bottom center)
            if (certificateId) {
                doc.font('Times-Roman')
                   .fontSize(9)
                   .fillColor('#888888')
                   .text(`Certificate ID: ${certificateId}`, 0, 376, { width: width, align: 'center' });
            }

            // 12. Instructor Signature Section (Centered at the bottom of the certificate)
            const sigY = 412;
            const sigLineY = 475;
            const sigWidth = 180;
            const sigX = (width - sigWidth) / 2;

            // Draw signature image if provided
            let signatureDrawn = false;
            if (signatureImage && typeof signatureImage === 'string') {
                try {
                    // signatureImage could be base64, file path, or URL.
                    // If it is a base64 string
                    if (signatureImage.startsWith('data:image/')) {
                        const matches = signatureImage.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
                        if (matches && matches.length === 3) {
                            const buffer = Buffer.from(matches[2], 'base64');
                            doc.image(buffer, sigX + 15, sigY, { width: sigWidth - 30, height: 50 });
                            signatureDrawn = true;
                        }
                    } else if (signatureImage.startsWith('/') || /^[a-zA-Z]:[\\/]/i.test(signatureImage)) {
                        // Check if absolute or relative file path
                        const resolvedPath = path.isAbsolute(signatureImage) 
                            ? signatureImage 
                            : path.join(__dirname, '../../', signatureImage);
                        if (fs.existsSync(resolvedPath)) {
                            doc.image(resolvedPath, sigX + 15, sigY, { width: sigWidth - 30, height: 50 });
                            signatureDrawn = true;
                        }
                    } else if (/^https?:\/\//i.test(signatureImage)) {
                        // If it's a URL, we might need sync fetching, which is tricky in a sync loop.
                        // We will fall back to cursive rendering but if the file exists locally, we render it.
                    }
                } catch (sigErr) {
                    console.warn('Failed to draw signature image, falling back to cursive:', sigErr);
                }
            }

            // Fallback: Display instructor name in cursive if signature image is not drawn
            if (!signatureDrawn) {
                doc.font('Times-Italic')
                   .fontSize(20)
                   .fillColor('#1b4d3e')
                   .text(conductorName || 'Tapovana Specialist', 0, sigY + 12, { width: width, align: 'center' });
            }

            // Thin gold signature line
            doc.lineWidth(1)
               .strokeColor('#DAA520')
               .moveTo(sigX, sigLineY)
               .lineTo(sigX + sigWidth, sigLineY)
               .stroke();

            // Instructor details
            doc.font('Times-Bold')
               .fontSize(11)
               .fillColor('#1a1a1a')
               .text(conductorName || 'Tapovana Instructor', 0, sigLineY + 6, { width: width, align: 'center' });

            doc.font('Times-Roman')
               .fontSize(9)
               .fillColor('#777777')
               .text('Workshop Instructor', 0, sigLineY + 20, { width: width, align: 'center' });

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

module.exports = {
    generateCertificatePDF
};
