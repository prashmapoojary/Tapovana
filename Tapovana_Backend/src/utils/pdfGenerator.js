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
            const logoPath = path.join(__dirname, '../../Tapovana_Frontend/src/assets/logo.png');
            cachedLogoBuffer = fs.readFileSync(logoPath);
            resolve(cachedLogoBuffer);
        } catch (err) {
            console.warn('Failed to load local logo, falling back to text:', err);
            resolve(null);
        }
    });
}

function renderTextLogo(doc) {
    doc.font('Times-Bold')
       .fontSize(22)
       .fillColor('#DAA520')
       .text('T A P O V A N A   L I F E   S P A C E', 0, 75, { align: 'center' });
    
    doc.fontSize(10)
       .fillColor('#DAA520')
       .text('★ ★ ★ ★ ★', 0, 102, { align: 'center' });
}

/**
 * Generates a premium gold-themed certificate of completion.
 * @param {string} participantName - The participant's full name.
 * @param {string} workshopTitle - The title of the workshop completed.
 * @param {string} completionDate - The date of completion (formatted string).
 * @returns {Promise<Buffer>} - Resolves with a PDF buffer.
 */
function generateCertificatePDF(participantName, workshopTitle, completionDate) {
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

            // 1. Draw background
            doc.rect(0, 0, 841.89, 595.28).fill('#FAF9F6');

            // 2. Draw gold borders
            doc.rect(30, 30, 841.89 - 60, 595.28 - 60)
               .lineWidth(6)
               .stroke('#DAA520');

            doc.rect(38, 38, 841.89 - 76, 595.28 - 76)
               .lineWidth(2)
               .stroke('#DAA520');

            // 3. Draw corner decorations
            doc.lineWidth(1.5);
            doc.strokeColor('#DAA520');
            // top left
            doc.moveTo(48, 48).lineTo(80, 48).stroke();
            doc.moveTo(48, 48).lineTo(48, 80).stroke();
            // top right
            doc.moveTo(841.89 - 48, 48).lineTo(841.89 - 80, 48).stroke();
            doc.moveTo(841.89 - 48, 48).lineTo(841.89 - 48, 80).stroke();
            // bottom left
            doc.moveTo(48, 595.28 - 48).lineTo(80, 595.28 - 48).stroke();
            doc.moveTo(48, 595.28 - 48).lineTo(48, 595.28 - 80).stroke();
            // bottom right
            doc.moveTo(841.89 - 48, 595.28 - 48).lineTo(841.89 - 80, 595.28 - 48).stroke();
            doc.moveTo(841.89 - 48, 595.28 - 48).lineTo(841.89 - 48, 595.28 - 80).stroke();

            // 4. Logo section
            const logo = await getLogoBuffer();
            if (logo) {
                try {
                    // Position logo in center
                    doc.image(logo, 841.89 / 2 - 75, 55, { width: 150 });
                } catch (imgErr) {
                    console.warn('Failed to draw logo image, falling back to text:', imgErr);
                    renderTextLogo(doc);
                }
            } else {
                renderTextLogo(doc);
            }

            // 5. Title
            doc.font('Times-Bold')
               .fontSize(34)
               .fillColor('#DAA520')
               .text('CERTIFICATE OF COMPLETION', 0, 165, { align: 'center' });

            // Horizontal decorative divider line below title
            doc.lineWidth(1)
               .strokeColor('#DAA520')
               .moveTo(841.89 / 2 - 180, 215)
               .lineTo(841.89 / 2 + 180, 215)
               .stroke();

            // 6. Presentation lines
            doc.font('Times-Italic')
               .fontSize(16)
               .fillColor('#444444')
               .text('This is proudly presented to', 0, 235, { align: 'center' });

            // 7. Participant Name
            doc.font('Times-Bold')
               .fontSize(36)
               .fillColor('#1a1a1a')
               .text(participantName, 0, 268, { align: 'center' });

            // 8. Completion Statements
            doc.font('Times-Roman')
               .fontSize(16)
               .fillColor('#444444')
               .text('for successfully completing the workshop', 0, 322, { align: 'center' });

            // Workshop Title
            doc.font('Times-BoldItalic')
               .fontSize(24)
               .fillColor('#DAA520')
               .text(workshopTitle, 0, 352, { align: 'center' });

            // Date of completion
            doc.font('Times-Roman')
               .fontSize(14)
               .fillColor('#555555')
               .text(`Completed on ${completionDate}`, 0, 395, { align: 'center' });

            // 9. Signature lines
            doc.lineWidth(1)
               .strokeColor('#DAA520');

            // Left line
            doc.moveTo(150, 495).lineTo(320, 495).stroke();
            doc.font('Times-Italic')
               .fontSize(18)
               .fillColor('#2d3748')
               .text('Tapovana Team', 150, 472, { width: 170, align: 'center' });
            
            doc.font('Times-Roman')
               .fontSize(12)
               .fillColor('#718096')
               .text('Workshop Instructor', 150, 502, { width: 170, align: 'center' });

            // Right line
            doc.moveTo(841.89 - 320, 495).lineTo(841.89 - 150, 495).stroke();
            doc.font('Times-Italic')
               .fontSize(18)
               .fillColor('#2d3748')
               .text('Prashma Poojary', 841.89 - 320, 472, { width: 170, align: 'center' });
            
            doc.font('Times-Roman')
               .fontSize(12)
               .fillColor('#718096')
               .text('Authorized Representative', 841.89 - 320, 502, { width: 170, align: 'center' });

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

module.exports = {
    generateCertificatePDF
};
