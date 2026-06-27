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

/**
 * Draw a rose-gold wax seal badge with initials in the center.
 */
function drawWaxSeal(doc, cx, cy, radius, initials) {
    doc.save();

    // Outer scalloped edge (bumpy seal border)
    const bumps = 24;
    const outerR = radius;
    const innerR = radius * 0.85;
    
    doc.lineWidth(0.5);
    
    // Draw scalloped circle path
    let firstX, firstY;
    for (let i = 0; i < bumps; i++) {
        const angle1 = (i / bumps) * Math.PI * 2;
        const angle2 = ((i + 0.5) / bumps) * Math.PI * 2;
        const angle3 = ((i + 1) / bumps) * Math.PI * 2;
        
        const x1 = cx + Math.cos(angle1) * outerR;
        const y1 = cy + Math.sin(angle1) * outerR;
        const xMid = cx + Math.cos(angle2) * innerR;
        const yMid = cy + Math.sin(angle2) * innerR;
        const x2 = cx + Math.cos(angle3) * outerR;
        const y2 = cy + Math.sin(angle3) * outerR;
        
        if (i === 0) {
            firstX = x1;
            firstY = y1;
            doc.moveTo(x1, y1);
        }
        doc.quadraticCurveTo(xMid, yMid, x2, y2);
    }
    doc.closePath();
    doc.fillAndStroke('#C4967A', '#A0735A');

    // Inner circle
    doc.circle(cx, cy, radius * 0.65)
       .fillAndStroke('#B8846C', '#A0735A');

    // Inner ring
    doc.circle(cx, cy, radius * 0.55)
       .lineWidth(1)
       .strokeColor('#D4A88C')
       .stroke();

    // Initials text
    doc.font('Times-Bold')
       .fontSize(radius * 0.55)
       .fillColor('#F5E6DC')
       .text(initials, cx - radius * 0.5, cy - radius * 0.22, {
           width: radius,
           align: 'center'
       });

    // Ribbon tails
    const ribbonW = radius * 0.35;
    const ribbonLen = radius * 0.8;
    
    // Left ribbon
    doc.moveTo(cx - ribbonW * 0.5, cy + radius * 0.7)
       .lineTo(cx - ribbonW * 1.5, cy + radius * 0.7 + ribbonLen)
       .lineTo(cx - ribbonW * 0.8, cy + radius * 0.7 + ribbonLen * 0.7)
       .lineTo(cx - ribbonW * 0.2, cy + radius * 0.7 + ribbonLen)
       .closePath()
       .fill('#C4967A');

    // Right ribbon
    doc.moveTo(cx + ribbonW * 0.5, cy + radius * 0.7)
       .lineTo(cx + ribbonW * 0.2, cy + radius * 0.7 + ribbonLen)
       .lineTo(cx + ribbonW * 0.8, cy + radius * 0.7 + ribbonLen * 0.7)
       .lineTo(cx + ribbonW * 1.5, cy + radius * 0.7 + ribbonLen)
       .closePath()
       .fill('#C4967A');

    doc.restore();
}

/**
 * Draw a decorative flourish divider line.
 */
function drawFlourish(doc, cx, y, halfWidth) {
    doc.save();
    doc.lineWidth(0.8);
    doc.strokeColor('#C4967A');

    // Left line
    doc.moveTo(cx - halfWidth, y)
       .lineTo(cx - 15, y)
       .stroke();

    // Center diamond
    doc.moveTo(cx - 8, y)
       .lineTo(cx, y - 4)
       .lineTo(cx + 8, y)
       .lineTo(cx, y + 4)
       .closePath()
       .fillAndStroke('#C4967A', '#A0735A');

    // Right line
    doc.moveTo(cx + 15, y)
       .lineTo(cx + halfWidth, y)
       .stroke();

    doc.restore();
}

/**
 * Generates a premium rose-gold themed certificate of completion matching the uploaded template.
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
            const cx = width / 2; // center x

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

            // ── 1. BACKGROUND ──────────────────────────────────────────────────
            const templatePath = path.join(__dirname, '../assets/certificate_template copy.png');
            if (fs.existsSync(templatePath)) {
                doc.image(templatePath, 0, 0, { width: width, height: height });
            } else {
                // Fallback warm ivory background
                doc.rect(0, 0, width, height).fill('#F2ECE4');
                doc.rect(20, 20, width - 40, height - 40)
                   .lineWidth(1.5)
                   .strokeColor('#C4967A')
                   .stroke();
            }

            // ── COLOR CONSTANTS ─────────────────────────────────────────────────
            const titleColor = '#8E624C';     // soft brown for title
            const bodyColor = '#3D2B1F';      // dark brown for body text
            const accentColor = '#C4967A';    // rose-gold accent

            const logo = await getLogoBuffer();

            // ── 4. TITLE: "Certificate" (large, elegant serif) ──────────────────
            const titleY = 65;
            /*
            doc.font('Times-Bold')
               .fontSize(76)
               .fillColor(titleColor)
               .text('certificate', 50, titleY, { width: width - 100, align: 'center' });
            */

            // ── 5. SUBTITLE: "of Completion" ────────────────────────────────────
            const subtitleY = titleY + 80;
            /*
            doc.font('Times-Roman')
               .fontSize(20)
               .fillColor(titleColor)
               .text('OF COMPLETION', 50, subtitleY, { 
                   width: width - 100, 
                   align: 'center',
                   characterSpacing: 5
               });
            */

            // ── 6. DECORATIVE FLOURISH DIVIDER ──────────────────────────────────
            const flourishY = subtitleY + 28;
            // drawFlourish(doc, cx, flourishY, 180);

            // ── 7. "This is to certify that" (italic serif) ─────────────────────
            const certifyY = flourishY + 16;
            doc.font('Times-Italic')
               .fontSize(27)
               .fillColor(bodyColor)
               .text('this is to certify that', 50, certifyY, { width: width - 100, align: 'center' });

            // ── 8. ATTENDEE NAME (cursive, large) ───────────────────────────────
            const nameY = certifyY + 36;
            let nameDrawn = false;
            if (signatureFontPath) {
                try {
                    doc.font(signatureFontPath)
                       .fontSize(84)
                       .fillColor(bodyColor)
                       .text(participantName, 50, nameY, { width: width - 100, align: 'center' });
                    nameDrawn = true;
                } catch (fontErr) {
                    console.warn('Failed to render cursive name font:', fontErr);
                }
            }
            if (!nameDrawn) {
                doc.font('Times-BoldItalic')
                   .fontSize(68)
                   .fillColor(bodyColor)
                   .text(participantName, 50, nameY, { width: width - 100, align: 'center' });
            }

            // Underline under participant name
            const nameUnderlineY = nameY + 84;
            /*
            doc.save();
            doc.lineWidth(0.8)
               .strokeColor(accentColor)
               .moveTo(cx - 200, nameUnderlineY)
               .lineTo(cx + 200, nameUnderlineY)
               .stroke();
            doc.restore();
            */

            // ── 9. VERIFICATION ID (below name, serif, not bold, smaller) ───────
            if (certificateId) {
                doc.font('Times-Roman')
                   .fontSize(15)
                   .fillColor('#666666')
                   .text(`verification id: ${certificateId.toLowerCase()}`, 50, nameUnderlineY + 12, {
                       width: width - 100,
                       align: 'center'
                   });
            }

            // ── 10. "has successfully completed" (italic serif) ─────────────────
            const completedY = nameUnderlineY + 45;
            doc.font('Times-Italic')
               .fontSize(27)
               .fillColor(bodyColor)
               .text('has successfully completed', 50, completedY, { width: width - 100, align: 'center' });

            // ── 11. WORKSHOP TITLE (bold serif, preserves original casing) ──────
            const workshopY = completedY + 38;
            doc.font('Times-Bold')
               .fontSize(48)
               .fillColor(bodyColor)
               .text(workshopTitle, 50, workshopY, { width: width - 100, align: 'center' });

            // ── 12. FOOTER SECTION ──────────────────────────────────────────────
            const lineY = 490;

            // ─── Left Column: Date of Completion ────────────────────────────────
            /*
            doc.save();
            doc.lineWidth(0.8)
               .strokeColor(accentColor)
               .moveTo(90, lineY)
               .lineTo(290, lineY)
               .stroke();
            doc.restore();
            */

            doc.font('Times-Italic')
               .fontSize(27)
               .fillColor(bodyColor)
               .text(completionDate, 90, lineY - 28, { width: 200, align: 'center' });

            doc.font('Times-Italic')
               .fontSize(18)
               .fillColor('#888888')
               .text('date of completion', 90, lineY + 6, { width: 200, align: 'center' });

            // ─── Center Column: Tapovana Logo + Company Name ─────────────────────────
             const footerLogoWidth = 75;
             const footerLogoX = cx - footerLogoWidth / 2;
             const footerLogoY = lineY - 78;
             if (logo) {
                 try {
                     doc.image(logo, footerLogoX, footerLogoY, { width: footerLogoWidth });
                 } catch (imgErr) {
                     console.warn('Failed to draw logo in footer:', imgErr);
                 }
             }

            doc.font('Times-Bold')
               .fontSize(22)
               .fillColor(bodyColor)
               .text('tapovana', cx - 100, lineY + 14, { width: 200, align: 'center' });

            doc.font('Times-Italic')
               .fontSize(16)
               .fillColor(accentColor)
               .text('nurturing wisdom through tradition', cx - 100, lineY + 38, { width: 200, align: 'center' });

            // ─── Right Column: Instructor Signature ─────────────────────────────
            /*
            doc.save();
            doc.lineWidth(0.8)
               .strokeColor(accentColor)
               .moveTo(551.89, lineY)
               .lineTo(751.89, lineY)
               .stroke();
            doc.restore();
            */

            // Signature Graphic placement (drawn above the line)
            let signatureDrawn = false;
            const sigWidth = 195;
            const sigX = 551.89 + (200 - sigWidth) / 2;
            const sigY = lineY - 55;

            if (signatureImage && typeof signatureImage === 'string') {
                try {
                    if (signatureImage.startsWith('data:image/')) {
                        const matches = signatureImage.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
                        if (matches && matches.length === 3) {
                            const buffer = Buffer.from(matches[2], 'base64');
                            doc.image(buffer, sigX, sigY, { width: sigWidth, height: 52 });
                            signatureDrawn = true;
                        }
                    } else if (signatureImage.startsWith('/') || /^[a-zA-Z]:[\\/]/i.test(signatureImage)) {
                        const resolvedPath = path.isAbsolute(signatureImage) 
                            ? signatureImage 
                            : path.join(__dirname, '../../', signatureImage);
                        if (fs.existsSync(resolvedPath)) {
                            doc.image(resolvedPath, sigX, sigY, { width: sigWidth, height: 52 });
                            signatureDrawn = true;
                        }
                    } else {
                        // Fallback checking in uploads directory
                        const uploadsPath = path.join(__dirname, '../../uploads', signatureImage);
                        if (fs.existsSync(uploadsPath)) {
                            doc.image(uploadsPath, sigX, sigY, { width: sigWidth, height: 52 });
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
                           .fontSize(52)
                           .fillColor(bodyColor)
                           .text(signatureText, 551.89, sigY + 5, { width: 200, align: 'center' });
                        signatureDrawn = true;
                    } catch (fontErr) {
                        console.warn('Failed to render loaded cursive font:', fontErr);
                    }
                }
                if (!signatureDrawn) {
                    doc.font('Times-BoldItalic')
                       .fontSize(36)
                       .fillColor(bodyColor)
                       .text(signatureText, 551.89, sigY + 10, { width: 200, align: 'center' });
                }
            }

            doc.font('Times-Italic')
               .fontSize(18)
               .fillColor('#888888')
               .text('workshop instructor', 551.89, lineY + 6, { width: 200, align: 'center' });

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

module.exports = {
    generateCertificatePDF
};
