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

function renderTextLogo(doc, x, y) {
    doc.save();
    doc.font('Times-Bold')
       .fontSize(18)
       .fillColor('#DAA520')
       .text('T A P O V A N A', x, y, { width: 200, align: 'left' });
    
    doc.fontSize(8)
       .fillColor('#DAA520')
       .text('L I F E   S P A C E', x, y + 20, { width: 200, align: 'left' });
    doc.restore();
}

/**
 * Draw a beautiful gold radial mandala on the right side of the certificate
 */
function drawMandala(doc, cx, cy) {
    doc.save();
    const goldColor = '#DAA520';
    doc.strokeColor(goldColor);
    
    // Draw concentric circles with varying opacity / line widths
    const radii = [45, 90, 135, 180, 225, 270, 315];
    radii.forEach((r, idx) => {
        doc.lineWidth(idx % 2 === 0 ? 1 : 0.5);
        if (idx === 3 || idx === 5) {
            doc.dash(4, { space: 3 });
        } else {
            doc.undash();
        }
        doc.circle(cx, cy, r).stroke();
        doc.circle(cx, cy, r - 3).lineWidth(0.2).stroke();
    });
    doc.undash();

    // Petal counts for different layers
    const layers = [
        { count: 12, r: 90, petalH: 15 },
        { count: 18, r: 135, petalH: 22 },
        { count: 24, r: 180, petalH: 30 },
        { count: 32, r: 225, petalH: 38 },
        { count: 36, r: 270, petalH: 45 }
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

            // Draw vector curves for petals
            doc.moveTo(x1, y1)
               .quadraticCurveTo(mx, my, x2, y2)
               .stroke();

            // Draw a small decorative circle dot at each peak
            if (layer.r >= 180) {
                doc.fillColor(goldColor).circle(mx, my, 2).fill();
            }
        }
    });

    // Draw lines radiating from the inner core
    doc.lineWidth(0.4);
    const coreCount = 16;
    for (let i = 0; i < coreCount; i++) {
        const angle = (i * 2 * Math.PI) / coreCount;
        const x1 = cx + Math.cos(angle) * 15;
        const y1 = cy + Math.sin(angle) * 15;
        const x2 = cx + Math.cos(angle) * 45;
        const y2 = cy + Math.sin(angle) * 45;
        doc.moveTo(x1, y1).lineTo(x2, y2).stroke();
        
        // Dot at the end of the line
        doc.fillColor(goldColor).circle(x2, y2, 1.5).fill();
    }

    doc.restore();
}

/**
 * Draw the premium gold rosette seal
 */
function drawGoldSeal(doc, cx, cy) {
    doc.save();
    const goldColor = '#DAA520';
    const darkGold = '#C59B27';
    
    // Draw seal ribbons pointing downward
    doc.fillColor(darkGold);
    // Left ribbon
    doc.moveTo(cx - 15, cy + 15)
       .lineTo(cx - 28, cy + 60)
       .lineTo(cx - 12, cy + 52)
       .lineTo(cx - 3, cy + 20)
       .closePath()
       .fill();
       
    // Right ribbon
    doc.moveTo(cx + 15, cy + 15)
       .lineTo(cx + 28, cy + 60)
       .lineTo(cx + 12, cy + 52)
       .lineTo(cx + 3, cy + 20)
       .closePath()
       .fill();
       
    // Rosette scalloped outer border (24 points)
    const outerRadius = 28;
    const innerRadius = 24;
    const points = 28;
    doc.beginPath();
    for (let i = 0; i < points * 2; i++) {
        const angle = (i * Math.PI) / points;
        const r = (i % 2 === 0) ? outerRadius : innerRadius;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) {
            doc.moveTo(x, y);
        } else {
            doc.lineTo(x, y);
        }
    }
    doc.closePath().fillColor(goldColor).fill();
    
    // Inner cream circle
    doc.circle(cx, cy, 20)
       .fillColor('#FAF9F6')
       .fill();
       
    // Inner gold circle
    doc.circle(cx, cy, 18)
       .fillColor(goldColor)
       .fill();
       
    // Monogram inside seal
    doc.font('Times-Bold')
       .fontSize(12)
       .fillColor('#FAF9F6')
       .text('T', cx - 6, cy - 8, { width: 12, align: 'center' });
       
    doc.restore();
}

/**
 * Generates a premium gold-themed certificate of completion.
 * @param {string} participantName - The participant's full name.
 * @param {string} workshopTitle - The title of the workshop completed.
 * @param {string} completionDate - The date of completion (formatted string).
 * @param {string} [conductorName] - Optional name of the instructor/conductor.
 * @returns {Promise<Buffer>} - Resolves with a PDF buffer.
 */
function generateCertificatePDF(participantName, workshopTitle, completionDate, conductorName) {
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

            // 1. Draw premium off-white parchment background
            doc.rect(0, 0, width, height).fill('#FAF9F6');

            // 2. Draw outer elegant gold double frame
            doc.rect(25, 25, width - 50, height - 50)
               .lineWidth(3)
               .strokeColor('#DAA520')
               .stroke();

            doc.rect(32, 32, width - 64, height - 64)
               .lineWidth(1)
               .strokeColor('#DAA520')
               .stroke();

            // 3. Draw programmatic mandala on the right edge
            const mandalaCx = width; 
            const mandalaCy = height / 2;
            drawMandala(doc, mandalaCx, mandalaCy);

            // 4. Logo section at the top-left
            const logo = await getLogoBuffer();
            const logoX = 80;
            const logoY = 65;
            if (logo) {
                try {
                    doc.image(logo, logoX, logoY, { width: 90 });
                } catch (imgErr) {
                    console.warn('Failed to draw logo image, falling back to text:', imgErr);
                    renderTextLogo(doc, logoX, logoY);
                }
            } else {
                renderTextLogo(doc, logoX, logoY);
            }

            // 5. Left column content variables
            const contentX = 80;
            const contentWidth = 440;

            // 6. Header
            doc.font('Times-Bold')
               .fontSize(40)
               .fillColor('#1a1a1a')
               .text('Certificate of Completion', contentX, 155, { width: contentWidth, align: 'left' });

            // Horizontal thin divider line under title
            doc.lineWidth(1)
               .strokeColor('#DAA520')
               .moveTo(contentX, 215)
               .lineTo(contentX + 220, 215)
               .stroke();

            // Presentation description
            doc.font('Times-Italic')
               .fontSize(15)
               .fillColor('#666666')
               .text('This is to certify that', contentX, 235, { width: contentWidth, align: 'left' });

            // 7. Participant Name (In cursive Times-BoldItalic)
            doc.font('Times-BoldItalic')
               .fontSize(36)
               .fillColor('#DAA520')
               .text(participantName, contentX, 268, { width: contentWidth, align: 'left' });

            // Success text
            doc.font('Times-Italic')
               .fontSize(14)
               .fillColor('#666666')
               .text('has successfully completed the workshop', contentX, 325, { width: contentWidth, align: 'left' });

            // 8. Workshop Title
            doc.font('Times-Bold')
               .fontSize(22)
               .fillColor('#1a1a1a')
               .text(workshopTitle.toUpperCase(), contentX, 355, { width: contentWidth, align: 'left', lineGap: 4 });

            // 9. Seal at bottom-middle
            const sealCx = contentX + 380;
            const sealCy = 465;
            drawGoldSeal(doc, sealCx, sealCy);

            // 10. Date of completion line
            const dateLineY = 485;
            doc.lineWidth(0.8)
               .strokeColor('#DAA520')
               .moveTo(contentX, dateLineY)
               .lineTo(contentX + 130, dateLineY)
               .stroke();

            doc.font('Times-Roman')
               .fontSize(12)
               .fillColor('#2d3748')
               .text(completionDate, contentX, dateLineY - 18, { width: 130, align: 'left' });

            doc.font('Times-Roman')
               .fontSize(10)
               .fillColor('#888888')
               .text('Date of Completion', contentX, dateLineY + 6, { width: 130, align: 'left' });

            // 11. Conductor signature line
            const sigLineX = contentX + 180;
            doc.lineWidth(0.8)
               .strokeColor('#DAA520')
               .moveTo(sigLineX, dateLineY)
               .lineTo(sigLineX + 150, dateLineY)
               .stroke();

            const conductor = conductorName || 'Tapovana Authorized Specialist';
            
            // Cursive name fallback
            doc.font('Times-Italic')
               .fontSize(15)
               .fillColor('#2d3748')
               .text(conductor, sigLineX, dateLineY - 18, { width: 150, align: 'left' });

            doc.font('Times-Roman')
               .fontSize(10)
               .fillColor('#888888')
               .text('Awarded by Conductor', sigLineX, dateLineY + 6, { width: 150, align: 'left' });

            // 12. Signature of Representative (Prashma Poojary)
            const repLineX = contentX + 380;
            // Draw authorized text instead of double signature overlap
            doc.font('Times-Italic')
               .fontSize(9)
               .fillColor('#888888')
               .text('Tapovana authorized representative', contentX, height - 70, { width: 280, align: 'left' });

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

module.exports = {
    generateCertificatePDF
};
