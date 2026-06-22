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

            // 1. Load background image (certificate_template.png) if it exists
            const templatePath = path.join(__dirname, '../assets/certificate_template.png');
            if (fs.existsSync(templatePath)) {
                doc.image(templatePath, 0, 0, { width: width, height: height });
            } else {
                // Safe vector fallback if background image is missing
                doc.rect(0, 0, width, height).fill('#FAF9F6');
                doc.rect(25, 25, width - 50, height - 50)
                   .lineWidth(12)
                   .strokeColor('#d4af37')
                   .stroke();
            }

            // 2. Render logo
            const logo = await getLogoBuffer();
            const logoWidth = 65;
            const logoX = (width - logoWidth) / 2;
            const logoY = 60;
            if (logo) {
                try {
                    doc.image(logo, logoX, logoY, { width: logoWidth });
                } catch (imgErr) {
                    console.warn('Failed to draw logo:', imgErr);
                    renderTextLogo(doc, 0, logoY + 10, width);
                }
            } else {
                renderTextLogo(doc, 0, logoY + 10, width);
            }

            // 3. Render title: CERTIFICATE OF COMPLETION
            doc.font('Times-Bold')
               .fontSize(28)
               .fillColor('#d4af37')
               .text('CERTIFICATE OF COMPLETION', 0, 140, { width: width, align: 'center', characterSpacing: 1 });

            // 4. Body presented text
            doc.font('Times-Italic')
               .fontSize(15)
               .fillColor('#555555')
               .text('This is proudly presented to', 0, 200, { width: width, align: 'center' });

            // 5. Participant Name (large bold)
            doc.font('Times-Bold')
               .fontSize(36)
               .fillColor('#000000')
               .text(participantName, 0, 230, { width: width, align: 'center' });

            // 6. Completion subtitle
            doc.font('Times-Italic')
               .fontSize(14)
               .fillColor('#555555')
               .text('for successfully completing the workshop', 0, 285, { width: width, align: 'center' });

            // 7. Workshop Title
            doc.font('Times-Bold')
               .fontSize(24)
               .fillColor('#d4af37')
               .text(workshopTitle, 0, 312, { width: width, align: 'center' });

            // 8. Footer Section (Left, Center, Right aligned)
            const footerY = 415;

            // Left: Completed Date
            doc.font('Times-Roman')
               .fontSize(12)
               .fillColor('#000000')
               .text(`Completed on ${completionDate}`, 55, footerY + 45, { width: 240, align: 'left' });

            // Center: Certificate ID
            if (certificateId) {
                doc.font('Times-Roman')
                   .fontSize(11)
                   .fillColor('#000000')
                   .text(`Certificate ID: ${certificateId}`, (width - 240) / 2, footerY + 45, { width: 240, align: 'center' });
            }

            // Right: Signature block
            const rightColX = width - 295;
            const sigWidth = 150;
            const sigX = rightColX + (240 - sigWidth) / 2;
            const sigY = footerY - 10;

            let signatureDrawn = false;

            // Check signature image
            if (signatureImage && typeof signatureImage === 'string') {
                try {
                    if (signatureImage.startsWith('data:image/')) {
                        const matches = signatureImage.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
                        if (matches && matches.length === 3) {
                            const buffer = Buffer.from(matches[2], 'base64');
                            doc.image(buffer, sigX, sigY, { width: sigWidth, height: 45 });
                            signatureDrawn = true;
                        }
                    } else if (signatureImage.startsWith('/') || /^[a-zA-Z]:[\\/]/i.test(signatureImage)) {
                        const resolvedPath = path.isAbsolute(signatureImage) 
                            ? signatureImage 
                            : path.join(__dirname, '../../', signatureImage);
                        if (fs.existsSync(resolvedPath)) {
                            doc.image(resolvedPath, sigX, sigY, { width: sigWidth, height: 45 });
                            signatureDrawn = true;
                        }
                    }
                } catch (sigErr) {
                    console.warn('Failed to draw signature image, falling back to cursive text:', sigErr);
                }
            }

            // Cursive name signature generator (styled like handwritten cursive in 3rd screenshot)
            if (!signatureDrawn) {
                const signatureText = conductorName || 'Prashmana Poojary';
                if (signatureFontPath) {
                    try {
                        doc.font(signatureFontPath)
                           .fontSize(28)
                           .fillColor('#000000')
                           .text(signatureText, rightColX, sigY + 5, { width: 240, align: 'center' });
                        signatureDrawn = true;
                    } catch (fontErr) {
                        console.warn('Failed to render loaded cursive font:', fontErr);
                    }
                }
                
                // Absolute fallback to Times-Italic
                if (!signatureDrawn) {
                    doc.font('Times-Italic')
                       .fontSize(22)
                       .fillColor('#1b4d3e')
                       .text(signatureText, rightColX, sigY + 10, { width: 240, align: 'center' });
                }
            }

            // Signature divider line
            doc.lineWidth(1)
               .strokeColor('#d4af37')
               .moveTo(rightColX + 30, footerY + 40)
               .lineTo(rightColX + 210, footerY + 40)
               .stroke();

            // Instructor details below line
            const instructorPrintName = conductorName || 'Prashmana Poojary';
            doc.font('Times-Roman')
               .fontSize(11)
               .fillColor('#000000')
               .text(instructorPrintName, rightColX, footerY + 46, { width: 240, align: 'center' });

            doc.font('Times-Roman')
               .fontSize(9)
               .fillColor('#777777')
               .text('Workshop Instructor', rightColX, footerY + 59, { width: 240, align: 'center' });

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

module.exports = {
    generateCertificatePDF
};
