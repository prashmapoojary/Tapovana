const PDFDocument = require('pdfkit');
const https = require('https');

let cachedLogoBuffer = null;

/**
 * Fetch remote logo image buffer. Caches buffer in memory to keep subsequent generation calls fast.
 */
function getLogoBuffer() {
    if (cachedLogoBuffer) return Promise.resolve(cachedLogoBuffer);
    return new Promise((resolve) => {
        https.get('https://i.postimg.cc/5X7w5TCQ/logo.png', (res) => {
            if (res.statusCode !== 200) {
                return resolve(null);
            }
            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
                cachedLogoBuffer = Buffer.concat(chunks);
                resolve(cachedLogoBuffer);
            });
        }).on('error', () => {
            resolve(null);
        });
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

            // 5. Title – serif heading in gold
            doc.font('Times-Bold')
               .fontSize(34)
               .fillColor('#DAA520')
               .text('CERTIFICATE OF COMPLETION', 0, 170, { align: 'center' });

            // Horizontal decorative divider below title
            doc.lineWidth(1)
               .strokeColor('#DAA520')
               .moveTo(841.89 / 2 - 180, 218)
               .lineTo(841.89 / 2 + 180, 218)
               .stroke();

            // 6. Award line – serif italic body
            doc.font('Times-Italic')
               .fontSize(16)
               .fillColor('#333333')
               .text('This Certificate is Proudly Awarded to', 0, 240, { align: 'center' });

            // 7. Participant Name – large bold, gold/black
            doc.font('Times-Bold')
               .fontSize(38)
               .fillColor('#1a1a1a')
               .text(participantName, 0, 275, { align: 'center' });

            // Decorative underline beneath participant name
            const nameWidth = doc.widthOfString(participantName);
            const nameUnderlineHalf = Math.min(nameWidth / 2 + 30, 220);
            doc.lineWidth(0.75)
               .strokeColor('#DAA520')
               .moveTo(841.89 / 2 - nameUnderlineHalf, 320)
               .lineTo(841.89 / 2 + nameUnderlineHalf, 320)
               .stroke();

            // 8. Completion statement – sans-serif (Helvetica) body in black
            doc.font('Helvetica')
               .fontSize(15)
               .fillColor('#333333')
               .text('For successfully completing the workshop', 0, 340, { align: 'center' });

            // Workshop Title – italic, gold-highlighted
            doc.font('Times-BoldItalic')
               .fontSize(24)
               .fillColor('#DAA520')
               .text(`"${workshopTitle}"`, 0, 372, { align: 'center' });

            // Conducted on date
            doc.font('Helvetica')
               .fontSize(14)
               .fillColor('#555555')
               .text(`conducted on ${completionDate}`, 0, 412, { align: 'center' });

            // ─── Footer ───
            // Gold decorative line
            doc.lineWidth(1.5)
               .strokeColor('#DAA520')
               .moveTo(841.89 / 2 - 200, 500)
               .lineTo(841.89 / 2 + 200, 500)
               .stroke();

            // Small decorative diamond in center of footer line
            const cx = 841.89 / 2;
            doc.save();
            doc.fillColor('#DAA520');
            doc.moveTo(cx, 500 - 4)
               .lineTo(cx + 4, 500)
               .lineTo(cx, 500 + 4)
               .lineTo(cx - 4, 500)
               .closePath()
               .fill();
            doc.restore();

            // Tagline & website
            doc.font('Helvetica')
               .fontSize(10)
               .fillColor('#888888')
               .text('Tapovana Life Space  •  www.tapovana.in', 0, 514, { align: 'center' });

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

module.exports = {
    generateCertificatePDF
};
