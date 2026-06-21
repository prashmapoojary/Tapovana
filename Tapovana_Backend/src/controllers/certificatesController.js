const { query } = require('../config/db');
const fs = require('fs');
const path = require('path');
const { generateCertificatePDF } = require('../utils/pdfGenerator');
const { sendWorkshopCompletionCertificateEmail } = require('../services/emailService');

// Helper: Validate UUID
const isValidUUID = (id) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
};

// Helper: Generate unique certificate ID in the format CERT-YYYY-RANDOM6
function generateUniqueCertificateId() {
    const year = new Date().getFullYear();
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let rand = '';
    for (let i = 0; i < 6; i++) {
        rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `CERT-${year}-${rand}`;
}

// 1. GET ALL GENERATED CERTIFICATES (Search & List)
const getAllCertificates = async (req, res) => {
    try {
        const { search = '', page = 1, limit = 50 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        let conditions = [];
        let values = [];
        let idx = 1;

        if (search && search.trim() !== '') {
            conditions.push(`(participant_name ILIKE $${idx} OR workshop_name ILIKE $${idx} OR certificate_id ILIKE $${idx})`);
            values.push(`%${search.trim()}%`);
            idx++;
        }

        const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

        const countRes = await query(`SELECT COUNT(*) FROM certificates ${whereClause}`, values);
        const total = parseInt(countRes.rows[0].count);

        const listQuery = `
            SELECT c.*, a.email AS participant_email
            FROM certificates c
            JOIN attendees a ON a.id = c.participant_id
            ${whereClause}
            ORDER BY c.generated_at DESC
            LIMIT $${idx} OFFSET $${idx + 1}
        `;
        const listRes = await query(listQuery, [...values, parseInt(limit), offset]);

        return res.json({
            success: true,
            certificates: listRes.rows,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (err) {
        console.error('getAllCertificates error:', err);
        return res.status(500).json({ success: false, message: 'Server error retrieving certificates.' });
    }
};

// 2. GET CERTIFICATE STATISTICS
const getCertificateStats = async (req, res) => {
    try {
        const totalRes = await query('SELECT COUNT(*) FROM certificates');
        const uniqueWorkshopsRes = await query('SELECT COUNT(DISTINCT workshop_id) FROM certificates');
        
        // Stats by month
        const monthlyRes = await query(`
            SELECT TO_CHAR(generated_at, 'YYYY-MM') AS month, COUNT(*) AS count
            FROM certificates
            GROUP BY month
            ORDER BY month DESC
            LIMIT 6
        `);

        return res.json({
            success: true,
            stats: {
                total: parseInt(totalRes.rows[0].count),
                uniqueWorkshops: parseInt(uniqueWorkshopsRes.rows[0].count),
                monthly: monthlyRes.rows
            }
        });
    } catch (err) {
        console.error('getCertificateStats error:', err);
        return res.status(500).json({ success: false, message: 'Server error retrieving certificate statistics.' });
    }
};

// 3. GENERATE CERTIFICATES FOR WORKSHOP (POST /api/certificates/generate/:workshopId)
const generateCertificatesForWorkshop = async (req, res) => {
    const { workshopId } = req.params;
    if (!isValidUUID(workshopId)) {
        return res.status(400).json({ success: false, message: 'Invalid workshop ID format.' });
    }

    try {
        // Fetch workshop details
        const wsRes = await query('SELECT id, title, date, time, instructor_id, instructor, status FROM workshops WHERE id = $1', [workshopId]);
        if (!wsRes.rows.length) {
            return res.status(404).json({ success: false, message: 'Workshop not found.' });
        }
        const workshop = wsRes.rows[0];

        // Fetch instructor signature image
        let signatureImage = null;
        let instructorName = workshop.instructor || 'Workshop Instructor';
        if (workshop.instructor_id && isValidUUID(workshop.instructor_id)) {
            const instRes = await query('SELECT first_name, last_name, signature_image FROM team_members WHERE id = $1', [workshop.instructor_id]);
            if (instRes.rows.length) {
                const inst = instRes.rows[0];
                instructorName = `${inst.first_name} ${inst.last_name}`.trim();
                signatureImage = inst.signature_image;
            }
        }

        // Fetch attendees not absent
        const attendeesRes = await query("SELECT id, name, email FROM attendees WHERE workshop_id = $1 AND status != 'absent'", [workshopId]);
        if (!attendeesRes.rows.length) {
            return res.status(400).json({ success: false, message: 'No participants available for certificate generation.' });
        }

        const port = process.env.PORT || 5000;
        const defaultUrl = process.env.NODE_ENV === 'production' ? 'https://tapovana.onrender.com' : `http://localhost:${port}`;
        const backendUrl = process.env.BACKEND_URL || process.env.SELF_URL || process.env.RENDER_EXTERNAL_URL || defaultUrl;

        let generatedCount = 0;
        for (const att of attendeesRes.rows) {
            const certCheck = await query('SELECT id FROM certificates WHERE participant_id = $1 AND workshop_id = $2', [att.id, workshop.id]);
            
            if (certCheck.rows.length === 0) {
                const certificateId = generateUniqueCertificateId();
                const certUrl = `${backendUrl}/api/certificates/download/${certificateId}`;

                let dateStr = workshop.date;
                if (workshop.date instanceof Date) {
                    const year = workshop.date.getFullYear();
                    const month = String(workshop.date.getMonth() + 1).padStart(2, '0');
                    const day = String(workshop.date.getDate()).padStart(2, '0');
                    dateStr = `${year}-${month}-${day}`;
                }
                const compDateObj = new Date(dateStr);
                const completionDateStr = compDateObj.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });

                // Generate PDF Buffer
                const pdfBuffer = await generateCertificatePDF(
                    att.name,
                    workshop.title,
                    completionDateStr,
                    instructorName,
                    signatureImage,
                    certificateId
                );

                // Save file persistently to disk
                const certsDir = path.join(process.cwd(), 'certificates');
                if (!fs.existsSync(certsDir)) {
                    fs.mkdirSync(certsDir, { recursive: true });
                }
                const filePath = path.join(certsDir, `${certificateId}.pdf`);
                fs.writeFileSync(filePath, pdfBuffer);

                // Insert into database
                await query(`
                    INSERT INTO certificates (certificate_id, participant_id, participant_name, workshop_id, workshop_name, instructor_id, pdf_url, completion_date)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                `, [
                    certificateId,
                    att.id,
                    att.name,
                    workshop.id,
                    workshop.title,
                    workshop.instructor_id,
                    certUrl,
                    dateStr
                ]);

                // Send email notification
                try {
                    await sendWorkshopCompletionCertificateEmail({
                        to: att.email,
                        participantName: att.name,
                        workshopTitle: workshop.title,
                        completionDate: completionDateStr,
                        downloadUrl: certUrl,
                        certId: certificateId
                    });
                    await query(
                        `INSERT INTO email_logs (participant_id, workshop_id, status, sent_at)
                         VALUES ($1, $2, 'sent', NOW())`,
                        [att.id, workshop.id]
                    );
                } catch (emailErr) {
                    console.error(`Failed to send manual certificate email to ${att.email}:`, emailErr.message);
                    await query(
                        `INSERT INTO email_logs (participant_id, workshop_id, status, sent_at)
                         VALUES ($1, $2, 'failed', NOW())`,
                        [att.id, workshop.id]
                    );
                }

                generatedCount++;
            }
        }

        // Set completed_notified flag to true for the workshop
        await query('UPDATE workshops SET completed_notified = TRUE WHERE id = $1', [workshopId]);

        return res.json({
            success: true,
            message: `Certificate workflow completed successfully. Generated ${generatedCount} certificates.`,
            generatedCount
        });
    } catch (err) {
        console.error('generateCertificatesForWorkshop error:', err);
        return res.status(500).json({ success: false, message: 'Server error generating certificates.' });
    }
};

// 4. GET CERTIFICATE DETAILS (GET /api/certificates/:certificateId)
const getCertificateDetails = async (req, res) => {
    const { certificateId } = req.params;
    try {
        const certRes = await query(`
            SELECT c.*, a.email AS participant_email, w.instructor
            FROM certificates c
            JOIN attendees a ON a.id = c.participant_id
            JOIN workshops w ON w.id = c.workshop_id
            WHERE c.certificate_id = $1 OR c.id::text = $1
        `, [certificateId]);

        if (!certRes.rows.length) {
            return res.status(404).json({ success: false, message: 'Certificate details not found.' });
        }

        return res.json({ success: true, certificate: certRes.rows[0] });
    } catch (err) {
        console.error('getCertificateDetails error:', err);
        return res.status(500).json({ success: false, message: 'Server error retrieving certificate details.' });
    }
};

// 5. DOWNLOAD CERTIFICATE PDF DIRECTLY (GET /api/certificates/download/:certificateId)
const downloadCertificatePdf = async (req, res) => {
    const { certificateId } = req.params;
    
    // Clean up filename suffix if request contains .pdf
    let cleanId = certificateId;
    if (cleanId && cleanId.endsWith('.pdf')) {
        cleanId = cleanId.slice(0, -4);
    }

    try {
        // Query DB
        const certRes = await query(`
            SELECT c.*, w.instructor, w.date AS workshop_date
            FROM certificates c
            JOIN workshops w ON w.id = c.workshop_id
            WHERE c.certificate_id = $1 OR c.id::text = $1 OR c.participant_id::text = $1
        `, [cleanId]);

        if (!certRes.rows.length) {
            return res.status(404).json({ success: false, message: 'Certificate record not found.' });
        }

        const cert = certRes.rows[0];
        const certsDir = path.join(process.cwd(), 'certificates');
        let filePath = path.join(certsDir, `${cert.certificate_id}.pdf`);

        // If file does not exist on disk, regenerate it on the fly
        if (!fs.existsSync(filePath)) {
            let signatureImage = null;
            let instructorName = cert.instructor || 'Workshop Instructor';

            if (cert.instructor_id && isValidUUID(cert.instructor_id)) {
                const instRes = await query('SELECT first_name, last_name, signature_image FROM team_members WHERE id = $1', [cert.instructor_id]);
                if (instRes.rows.length) {
                    const inst = instRes.rows[0];
                    instructorName = `${inst.first_name} ${inst.last_name}`.trim();
                    signatureImage = inst.signature_image;
                }
            }

            const compDateObj = new Date(cert.completion_date);
            const completionDateStr = compDateObj.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            // Regenerate
            const pdfBuffer = await generateCertificatePDF(
                cert.participant_name,
                cert.workshop_name,
                completionDateStr,
                instructorName,
                signatureImage,
                cert.certificate_id
            );

            if (!fs.existsSync(certsDir)) {
                fs.mkdirSync(certsDir, { recursive: true });
            }
            fs.writeFileSync(filePath, pdfBuffer);
        }

        // Return headers for immediate browser download
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="Certificate-${cert.certificate_id}.pdf"`);

        const stream = fs.createReadStream(filePath);
        stream.on('error', (streamErr) => {
            console.error('downloadCertificatePdf stream error:', streamErr);
            if (!res.headersSent) {
                res.status(500).json({ success: false, message: 'Server error streaming certificate.' });
            }
        });
        return stream.pipe(res);
    } catch (err) {
        console.error('downloadCertificatePdf error:', err);
        return res.status(500).json({ success: false, message: 'Server error downloading certificate.' });
    }
};

// 6. RESEND CERTIFICATE EMAIL (POST /api/certificates/resend/:certificateId)
const resendCertificateEmail = async (req, res) => {
    const { certificateId } = req.params;
    try {
        const certRes = await query(`
            SELECT c.*, a.email AS participant_email, w.instructor
            FROM certificates c
            JOIN attendees a ON a.id = c.participant_id
            JOIN workshops w ON w.id = c.workshop_id
            WHERE c.certificate_id = $1 OR c.id::text = $1
        `, [certificateId]);

        if (!certRes.rows.length) {
            return res.status(404).json({ success: false, message: 'Certificate record not found.' });
        }

        const cert = certRes.rows[0];
        const compDateObj = new Date(cert.completion_date);
        const completionDateStr = compDateObj.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Resend email
        try {
            await sendWorkshopCompletionCertificateEmail({
                to: cert.participant_email,
                participantName: cert.participant_name,
                workshopTitle: cert.workshop_name,
                completionDate: completionDateStr,
                downloadUrl: cert.pdf_url,
                certId: cert.certificate_id
            });
            await query(
                `INSERT INTO email_logs (participant_id, workshop_id, status, sent_at)
                 VALUES ($1, $2, 'sent', NOW())`,
                [cert.participant_id, cert.workshop_id]
            );
        } catch (emailErr) {
            console.error(`Failed to resend certificate email to ${cert.participant_email}:`, emailErr.message);
            await query(
                `INSERT INTO email_logs (participant_id, workshop_id, status, sent_at)
                 VALUES ($1, $2, 'failed', NOW())`,
                [cert.participant_id, cert.workshop_id]
            );
        }

        return res.json({ success: true, message: 'Certificate email resent successfully.' });
    } catch (err) {
        console.error('resendCertificateEmail error:', err);
        return res.status(500).json({ success: false, message: 'Server error resending email.' });
    }
};

module.exports = {
    getAllCertificates,
    getCertificateStats,
    generateCertificatesForWorkshop,
    getCertificateDetails,
    downloadCertificatePdf,
    resendCertificateEmail
};
