const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const https = require('https');

let cachedLogoBuffer = null;
let cachedFontPath = null;

/**
 * Fetch local logo image buffer. Caches buffer in memory to keep subsequent generation calls fast.
 */
function getLogoBuffer() {
    if (cachedLogoBuffer) return Promise.resolve(cachedLogoBuffer);
    return new Promise((resolve) => {
        try {
            const logoPath = path.join(__dirname, '../../../Tapovana_Frontend/src/assets/logo.png');
            if (fs.existsSync(logoPath)) {
                cachedLogoBuffer = fs.readFileSync(logoPath);
                resolve(cachedLogoBuffer);
            } else {
                resolve(null);
            }
        } catch (err) {
            console.warn('Failed to load local logo:', err);
            resolve(null);
        }
    });
}

/**
 * Automatically downloads and caches the cursive signature font from Google Fonts GitHub repo.
 * Handles HTTP redirects gracefully.
 */
function downloadFontIfNotExist() {
    if (cachedFontPath && fs.existsSync(cachedFontPath)) {
        return Promise.resolve(cachedFontPath);
    }

    const fontDir = path.join(__dirname, '../assets');
    if (!fs.existsSync(fontDir)) {
        fs.mkdirSync(fontDir, { recursive: true });
    }

    const fontPath = path.join(fontDir, 'AlexBrush-Regular.ttf');
    if (fs.existsSync(fontPath)) {
        // Simple sanity check of the file format
        try {
            const stat = fs.statSync(fontPath);
            if (stat.size > 1000) {
                cachedFontPath = fontPath;
                return Promise.resolve(fontPath);
            } else {
                fs.unlinkSync(fontPath);
            }
        } catch (e) {
            fs.unlinkSync(fontPath);
        }
    }

    return new Promise((resolve) => {
        console.log('Tapovana Certificate: Downloading signature font from Google Fonts GitHub repository...');
        const url = 'https://github.com/google/fonts/raw/main/ofl/alexbrush/AlexBrush-Regular.ttf';
        const file = fs.createWriteStream(fontPath);
        
        const download = (targetUrl) => {
            https.get(targetUrl, (response) => {
                if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                    // Follow redirection (e.g. raw.githubusercontent.com)
                    download(response.headers.location);
                } else if (response.statusCode === 200) {
                    response.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        console.log('Tapovana Certificate: Signature font cached successfully at:', fontPath);
                        cachedFontPath = fontPath;
                        resolve(fontPath);
                    });
                } else {
                    file.close();
                    fs.unlink(fontPath, () => {});
                    console.warn(`Failed to download font: HTTP Status ${response.statusCode}`);
                    resolve(null);
                }
            }).on('error', (err) => {
                file.close();
                fs.unlink(fontPath, () => {});
                console.warn('Failed to download cursive signature font:', err.message);
                resolve(null);
            });
        };

        download(url);
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

function drawLotusPattern(doc, x, y, scale) {
    doc.save();
    doc.translate(x, y);
    doc.scale(scale);
    doc.lineWidth(1);
    doc.strokeColor('#d4af37');
    
    // Center petal
    doc.moveTo(0, -18)
       .bezierCurveTo(-5, -5, -5, 10, 0, 15)
       .bezierCurveTo(5, 10, 5, -5, 0, -18)
       .closePath()
       .fillAndStroke('#fff9e6', '#d4af37');
    
    // Outer left petal
    doc.moveTo(0, 15)
       .bezierCurveTo(-15, 5, -18, -8, -18, -8)
       .bezierCurveTo(-10, -3, -5, 5, 0, 15)
       .closePath()
       .fillAndStroke('#fff9e6', '#d4af37');
       
    // Outer right petal
    doc.moveTo(0, 15)
       .bezierCurveTo(15, 5, 18, -8, 18, -8)
       .bezierCurveTo(10, -3, 5, 5, 0, 15)
       .closePath()
       .fillAndStroke('#fff9e6', '#d4af37');
       
    // Far left petal
    doc.moveTo(0, 15)
       .bezierCurveTo(-22, 10, -26, 0, -26, 0)
       .bezierCurveTo(-14, 3, -5, 8, 0, 15)
       .closePath()
       .fillAndStroke('#fff9e6', '#d4af37');
       
    // Far right petal
    doc.moveTo(0, 15)
       .bezierCurveTo(22, 10, 26, 0, 26, 0)
       .bezierCurveTo(14, 3, 5, 8, 0, 15)
       .closePath()
       .fillAndStroke('#fff9e6', '#d4af37');

    // Draw small base circle
    doc.circle(0, 15, 2.5)
       .fill('#d4af37');

    doc.restore();
}

function drawHalfMandala(doc, cx, cy) {
    doc.save();
    doc.lineWidth(1);
    doc.strokeColor('#d4af37');

    // Draw concentric half-circles facing left
    const radii = [30, 60, 90, 120, 150, 180];
    
    // Fill inner core
    doc.arc(cx, cy, 30, Math.PI / 2, (3 * Math.PI) / 2)
       .closePath()
       .fillAndStroke('#fff9e6', '#d4af37');

    radii.forEach((r, idx) => {
        doc.arc(cx, cy, r, Math.PI / 2, (3 * Math.PI) / 2)
           .stroke();
           
        if (idx === 1) {
            // Dotted intermediate arc
            doc.save()
               .arc(cx, cy, r + 5, Math.PI / 2, (3 * Math.PI) / 2)
               .dash(2, { space: 3 })
               .stroke()
               .restore();
        }
    });

    // Draw radiating spokes
    const spokes = 18;
    for (let i = 0; i <= spokes; i++) {
        const angle = Math.PI / 2 + (i * Math.PI) / spokes;
        const x1 = cx + Math.cos(angle) * 30;
        const y1 = cy + Math.sin(angle) * 30;
        const x2 = cx + Math.cos(angle) * 180;
        const y2 = cy + Math.sin(angle) * 180;
        
        doc.moveTo(x1, y1)
           .lineTo(x2, y2)
           .stroke();
           
        // Spoke tip dots
        doc.circle(x2 + Math.cos(angle) * 5, y2 + Math.sin(angle) * 5, 2)
           .fill('#d4af37');
    }

    // Outer decorative leaf petals
    const leaves = 12;
    for (let i = 0; i < leaves; i++) {
        const startAngle = Math.PI / 2 + (i * Math.PI) / leaves;
        const endAngle = Math.PI / 2 + ((i + 1) * Math.PI) / leaves;
        const midAngle = (startAngle + endAngle) / 2;
        
        const sx = cx + Math.cos(startAngle) * 180;
        const sy = cy + Math.sin(startAngle) * 180;
        const ex = cx + Math.cos(endAngle) * 180;
        const ey = cy + Math.sin(endAngle) * 180;
        
        const ctrlRadius = 210;
        const ctrlX = cx + Math.cos(midAngle) * ctrlRadius;
        const ctrlY = cy + Math.sin(midAngle) * ctrlRadius;
        
        doc.moveTo(sx, sy)
           .quadraticCurveTo(ctrlX, ctrlY, ex, ey)
           .stroke();
           
        doc.circle(ctrlX, ctrlY, 3)
           .fill('#d4af37');
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
            // A4 page dimensions in points (landscape)
            const width = 841.89;
            const height = 595.28;

            const doc = new PDFDocument({
                layout: 'landscape',
                size: 'A4',
                margins: { top: 0, left: 0, right: 0, bottom: 0 }
            });

            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', (err) => reject(err));

            // Ensure signature font is downloaded and ready
            let signatureFontPath = null;
            try {
                signatureFontPath = await downloadFontIfNotExist();
            } catch (err) {
                console.warn('Failed to check or download cursive font:', err);
            }

            // 1. Draw the pink + gold background template image
            const templatePath = path.join(__dirname, '../assets/certificate_template.png');
            if (fs.existsSync(templatePath)) {
                doc.image(templatePath, 0, 0, { width: width, height: height });
            } else {
                // Fallback warm ivory background
                doc.rect(0, 0, width, height).fill('#FCFBF9');
                doc.rect(20, 20, width - 40, height - 40)
                   .lineWidth(1.5)
                   .strokeColor('#d4af37')
                   .stroke();
            }

            // 2. Render Title: "Certificate of Completion"
            const titleFont = signatureFontPath || 'Times-BoldItalic';
            doc.font(titleFont)
               .fontSize(signatureFontPath ? 46 : 36)
               .fillColor('#1b1b1b')
               .text('Certificate of Completion', 50, 90, { width: width - 100, align: 'center' });

            // 3. Subheader: "This is to certify that"
            doc.font('Times-Italic')
               .fontSize(16)
               .fillColor('#555555')
               .text('This is to certify that', 50, 155, { width: width - 100, align: 'center' });

            // 4. Participant Name in cursive font, centered
            doc.font(titleFont)
               .fontSize(signatureFontPath ? 52 : 40)
               .fillColor('#1b1b1b')
               .text(participantName, 50, 185, { width: width - 100, align: 'center' });

            // Underline under participant name (matching screenshot)
            doc.save();
            doc.lineWidth(0.5)
               .strokeColor('#bbbbbb')
               .moveTo(width / 2 - 220, 244)
               .lineTo(width / 2 + 220, 244)
               .stroke();
            doc.restore();

            // 5. Course Section: "has successfully completed"
            doc.font('Times-Italic')
               .fontSize(15)
               .fillColor('#555555')
               .text('has successfully completed', 50, 272, { width: width - 100, align: 'center' });

            // Course name in uppercase emphasis, larger bold serif font size
            doc.font('Times-Bold')
               .fontSize(28)
               .fillColor('#1b1b1b')
               .text(workshopTitle.toUpperCase(), 50, 300, { width: width - 100, align: 'center' });

            // 6. Footer Sections (Horizontally Aligned at Y=480)
            const lineY = 480;

            // Left Column: Date of Completion
            doc.save();
            doc.lineWidth(0.5)
               .strokeColor('#aaaaaa')
               .moveTo(90, lineY)
               .lineTo(290, lineY)
               .stroke();
            doc.restore();

            doc.font('Times-Roman')
               .fontSize(14)
               .fillColor('#1b1b1b')
               .text(completionDate, 90, lineY - 18, { width: 200, align: 'center' });

            doc.font('Times-Italic')
               .fontSize(12)
               .fillColor('#555555')
               .text('Date of completion', 90, lineY + 6, { width: 200, align: 'center' });

            // Right Column: Workshop Instructor Signature
            doc.save();
            doc.lineWidth(0.5)
               .strokeColor('#aaaaaa')
               .moveTo(551.89, lineY)
               .lineTo(751.89, lineY)
               .stroke();
            doc.restore();

            // Signature Graphic placement (drawn above the line)
            let signatureDrawn = false;
            const sigWidth = 130;
            const sigX = 551.89 + (200 - sigWidth) / 2;
            const sigY = lineY - 38;

            if (signatureImage && typeof signatureImage === 'string') {
                try {
                    if (signatureImage.startsWith('data:image/')) {
                        const matches = signatureImage.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
                        if (matches && matches.length === 3) {
                            const buffer = Buffer.from(matches[2], 'base64');
                            doc.image(buffer, sigX, sigY, { width: sigWidth, height: 35 });
                            signatureDrawn = true;
                        }
                    } else if (signatureImage.startsWith('/') || /^[a-zA-Z]:[\\/]/i.test(signatureImage)) {
                        const resolvedPath = path.isAbsolute(signatureImage) 
                            ? signatureImage 
                            : path.join(__dirname, '../../', signatureImage);
                        if (fs.existsSync(resolvedPath)) {
                            doc.image(resolvedPath, sigX, sigY, { width: sigWidth, height: 35 });
                            signatureDrawn = true;
                        }
                    }
                } catch (sigErr) {
                    console.warn('Failed to draw signature image, falling back to cursive text:', sigErr);
                }
            }

            // Fallback cursive signature text if image not drawn
            if (!signatureDrawn) {
                const signatureText = conductorName || 'Workshop Instructor';
                if (signatureFontPath) {
                    try {
                        doc.font(signatureFontPath)
                           .fontSize(26)
                           .fillColor('#1b1b1b')
                           .text(signatureText, 551.89, sigY + 5, { width: 200, align: 'center' });
                        signatureDrawn = true;
                    } catch (fontErr) {
                        console.warn('Failed to render loaded cursive font:', fontErr);
                    }
                }
                if (!signatureDrawn) {
                    doc.font('Times-Italic')
                       .fontSize(20)
                       .fillColor('#1b1b1b')
                       .text(signatureText, 551.89, sigY + 10, { width: 200, align: 'center' });
                }
            }

            doc.font('Times-Italic')
               .fontSize(12)
               .fillColor('#555555')
               .text('Workshop Instructor', 551.89, lineY + 6, { width: 200, align: 'center' });

            // Center Column: Logo and Text
            const logoCenterX = width / 2;
            const logoWidth = 55;
            const logoX = logoCenterX - logoWidth / 2;
            const logoY = 395;

            // Load and draw Tapovana logo
            const logo = await getLogoBuffer();
            if (logo) {
                try {
                    doc.image(logo, logoX, logoY, { width: logoWidth });
                } catch (imgErr) {
                    console.warn('Failed to draw logo in footer:', imgErr);
                }
            }

            // Company Name: TAPOVANA
            doc.font('Times-Bold')
               .fontSize(13)
               .fillColor('#1b1b1b')
               .text('TAPOVANA', logoCenterX - 100, logoY + 63, { width: 200, align: 'center', characterSpacing: 1.5 });

            // Company Tagline: harmony with nature
            doc.font('Times-Italic')
               .fontSize(10)
               .fillColor('#555555')
               .text('harmony with nature', logoCenterX - 100, logoY + 77, { width: 200, align: 'center' });

            // Unique Verification ID at the absolute bottom
            if (certificateId) {
                doc.font('Times-Roman')
                   .fontSize(8)
                   .fillColor('#999999')
                   .text(`Verification ID: ${certificateId}`, 50, 562, { width: width - 100, align: 'center' });
            }

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

module.exports = {
    generateCertificatePDF
};
