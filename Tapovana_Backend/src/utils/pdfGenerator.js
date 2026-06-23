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

function drawGoldSeal(doc, x, y) {
    doc.save();
    
    // Draw ribbons draping from bottom of the seal
    doc.lineWidth(1);
    
    // Left ribbon
    doc.moveTo(x + 20, y + 25)
       .lineTo(x + 10, y + 55)
       .lineTo(x + 20, y + 50)
       .lineTo(x + 30, y + 25)
       .closePath()
       .fillAndStroke('#d4af37', '#b8860b');
       
    // Right ribbon
    doc.moveTo(x + 30, y + 25)
       .lineTo(x + 40, y + 50)
       .lineTo(x + 50, y + 55)
       .lineTo(x + 40, y + 25)
       .closePath()
       .fillAndStroke('#d4af37', '#b8860b');
    
    // Translate to center of seal
    doc.translate(x + 30, y + 25);
    
    // Spiked outer wax seal circle (24 points)
    const numPoints = 24;
    const outerRadius = 26;
    const innerRadius = 22;
    const firstAngle = 0;
    const firstRadius = outerRadius;
    doc.moveTo(Math.cos(firstAngle) * firstRadius, Math.sin(firstAngle) * firstRadius);
    for (let i = 1; i < numPoints * 2; i++) {
        const angle = (i * Math.PI) / numPoints;
        const radius = (i % 2 === 0) ? outerRadius : innerRadius;
        const px = Math.cos(angle) * radius;
        const py = Math.sin(angle) * radius;
        doc.lineTo(px, py);
    }
    doc.closePath().fillAndStroke('#d4af37', '#b8860b');
    
    // Inner round gold circle
    doc.circle(0, 0, 18)
       .fillAndStroke('#d4af37', '#b8860b');
       
    // Inner dotted circle
    doc.circle(0, 0, 15)
       .lineWidth(0.5)
       .dash(2, { space: 2 })
       .stroke();
       
    // Text inside seal
    doc.font('Times-Bold')
       .fontSize(5)
       .fillColor('#000000')
       .text('TAPOVANA', -15, -6, { width: 30, align: 'center' })
       .fontSize(4)
       .text('SEAL', -15, 1, { width: 30, align: 'center' });
       
    // Star emblem
    doc.font('Times-Roman')
       .fontSize(6)
       .text('★', -15, 6, { width: 30, align: 'center' });
       
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
                // Safe vector fallback if background image is missing (warm ivory/off-white background)
                doc.rect(0, 0, width, height).fill('#FAF9F6');
            }

            // 2. Draw thinner, elegant gold borders
            doc.save();
            doc.rect(15, 15, width - 30, height - 30)
               .lineWidth(1.5)
               .strokeColor('#d4af37')
               .stroke();
            doc.rect(20, 20, width - 40, height - 40)
               .lineWidth(3.5)
               .strokeColor('#d4af37')
               .stroke();
            doc.restore();

            // 3. Align decorative lotus patterns symmetrically on left and right sides
            drawLotusPattern(doc, 42, height / 2, 0.9);
            drawLotusPattern(doc, width - 42, height / 2, 0.9);
            
            // Draw lotuses in the corners as well for a premium feel
            drawLotusPattern(doc, 42, 42, 0.6);
            drawLotusPattern(doc, width - 42, 42, 0.6);
            drawLotusPattern(doc, 42, height - 42, 0.6);
            drawLotusPattern(doc, width - 42, height - 42, 0.6);

            // 4. Render logo centered at the top
            const logo = await getLogoBuffer();
            const logoWidth = 65;
            const logoX = (width - logoWidth) / 2;
            const logoY = 55;
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

            // 5. Render title: "Certificate of Completion" centered at the top
            const titleFont = signatureFontPath || 'Times-BoldItalic';
            doc.font(titleFont)
               .fontSize(signatureFontPath ? 38 : 28)
               .fillColor('#d4af37')
               .text('Certificate of Completion', 0, 135, { width: width, align: 'center' });

            // 6. Recipient Section: "This is to certify that"
            doc.font('Times-Italic')
               .fontSize(16)
               .fillColor('#555555')
               .text('This is to certify that', 0, 195, { width: width, align: 'center' });

            // Recipient's name in bold serif, larger font, centered
            doc.font('Times-Bold')
               .fontSize(40)
               .fillColor('#000000')
               .text(participantName, 0, 225, { width: width, align: 'center' });

            // 7. Course Section: "has successfully completed"
            doc.font('Times-Italic')
               .fontSize(15)
               .fillColor('#555555')
               .text('has successfully completed', 0, 280, { width: width, align: 'center' });

            // Course name in uppercase emphasis, larger font size
            doc.font('Times-Bold')
               .fontSize(28)
               .fillColor('#d4af37')
               .text(workshopTitle.toUpperCase(), 0, 308, { width: width, align: 'center' });

            // 8. Footer Section
            const footerY = 415;

            // Date Section: Labeled "Date of Completion" with date beneath in clean serif font
            const leftColX = 75;
            const dateColY = footerY + 20;
            doc.font('Times-Bold')
               .fontSize(12)
               .fillColor('#d4af37')
               .text('Date of Completion', leftColX, dateColY, { width: 200, align: 'center' });
            
            doc.font('Times-Roman')
               .fontSize(12)
               .fillColor('#000000')
               .text(completionDate, leftColX, dateColY + 18, { width: 200, align: 'center' });

            // Center: Certificate ID
            if (certificateId) {
                doc.font('Times-Roman')
                   .fontSize(11)
                   .fillColor('#000000')
                   .text(`Certificate ID: ${certificateId}`, (width - 200) / 2, footerY + 38, { width: 200, align: 'center' });
            }

            // Right: Issuer Section (Awarded by + tagline/motto)
            const rightColX = width - 275;
            const issuerColY = footerY + 20;
            
            // Signature Graphic placement (drawn above "Awarded by" text)
            let signatureDrawn = false;
            const sigWidth = 150;
            const sigX = rightColX + (200 - sigWidth) / 2;
            const sigY = footerY - 25;

            if (signatureImage && typeof signatureImage === 'string') {
                try {
                    if (signatureImage.startsWith('data:image/')) {
                        const matches = signatureImage.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
                        if (matches && matches.length === 3) {
                            const buffer = Buffer.from(matches[2], 'base64');
                            doc.image(buffer, sigX, sigY, { width: sigWidth, height: 40 });
                            signatureDrawn = true;
                        }
                    } else if (signatureImage.startsWith('/') || /^[a-zA-Z]:[\\/]/i.test(signatureImage)) {
                        const resolvedPath = path.isAbsolute(signatureImage) 
                            ? signatureImage 
                            : path.join(__dirname, '../../', signatureImage);
                        if (fs.existsSync(resolvedPath)) {
                            doc.image(resolvedPath, sigX, sigY, { width: sigWidth, height: 40 });
                            signatureDrawn = true;
                        }
                    }
                } catch (sigErr) {
                    console.warn('Failed to draw signature image, falling back to cursive text:', sigErr);
                }
            }

            // Fallback cursive signature text if image not drawn
            if (!signatureDrawn) {
                const signatureText = conductorName || 'Prashmana Poojary';
                if (signatureFontPath) {
                    try {
                        doc.font(signatureFontPath)
                           .fontSize(24)
                           .fillColor('#000000')
                           .text(signatureText, rightColX, sigY + 5, { width: 200, align: 'center' });
                        signatureDrawn = true;
                    } catch (fontErr) {
                        console.warn('Failed to render loaded cursive font:', fontErr);
                    }
                }
                if (!signatureDrawn) {
                    doc.font('Times-Italic')
                       .fontSize(20)
                       .fillColor('#1b4d3e')
                       .text(signatureText, rightColX, sigY + 10, { width: 200, align: 'center' });
                }
            }

            // Replace signature lines with "Awarded by" + organization name, with tagline/motto beneath in smaller italic text
            doc.font('Times-Italic')
               .fontSize(12)
               .fillColor('#555555')
               .text('Awarded by', rightColX, issuerColY, { width: 200, align: 'center' });

            doc.font('Times-Bold')
               .fontSize(16)
               .fillColor('#d4af37')
               .text('Tapovana Life Space', rightColX, issuerColY + 16, { width: 200, align: 'center' });

            doc.font('Times-Italic')
               .fontSize(10)
               .fillColor('#555555')
               .text('Path to Inner Harmony & Wellness', rightColX, issuerColY + 34, { width: 200, align: 'center' });

            // 9. Decorative Gold Seal/Stamp at bottom center for authenticity
            drawGoldSeal(doc, (width - 60) / 2, footerY + 10);

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

module.exports = {
    generateCertificatePDF
};
