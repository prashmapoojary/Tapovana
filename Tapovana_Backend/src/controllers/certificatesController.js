const { query } = require('../config/db');
const fs = require('fs');
const path = require('path');
const { generateCertificatePDF } = require('../utils/pdfGenerator');
const { sendWorkshopCompletionCertificateEmail } = require('../services/emailService');
const { getLocalIpAddress } = require('../utils/ip');

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

        // Fetch attendees marked as attended
        const attendeesRes = await query("SELECT id, name, email FROM attendees WHERE workshop_id = $1 AND status = 'attended' AND certificate_eligible = true", [workshopId]);
        if (!attendeesRes.rows.length) {
            return res.status(400).json({ success: false, message: 'No attended participants available for certificate generation.' });
        }

        const port = process.env.PORT || 5000;
        const localIp = getLocalIpAddress();
        const isCloud = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true' || process.env.RENDER_EXTERNAL_URL;
        const defaultUrl = isCloud ? 'https://tapovana.onrender.com' : `http://${localIp}:${port}`;
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
                        certId: certificateId,
                        participantId: att.id,
                        pdfBuffer
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

// 4.5 GET PUBLIC CERTIFICATE DETAILS (GET /api/certificates/public/:certificateId)
const getPublicCertificateDetails = async (req, res) => {
    const { certificateId } = req.params;
    try {
        const certRes = await query(`
            SELECT c.certificate_id, c.participant_name, c.workshop_name, c.completion_date, w.instructor AS instructor_name
            FROM certificates c
            JOIN workshops w ON w.id = c.workshop_id
            WHERE c.certificate_id = $1 OR c.id::text = $1 OR c.participant_id::text = $1
        `, [certificateId]);

        if (!certRes.rows.length) {
            return res.status(404).json({ success: false, message: 'Certificate details not found.' });
        }

        return res.json({ success: true, certificate: certRes.rows[0] });
    } catch (err) {
        console.error('getPublicCertificateDetails error:', err);
        return res.status(500).json({ success: false, message: 'Server error retrieving certificate details.' });
    }
};

// 5. DOWNLOAD CERTIFICATE PDF DIRECTLY (GET /api/certificates/download/:certificateId)
const downloadCertificatePdf = async (req, res) => {
    const { certificateId, id } = req.params;
    const certParam = certificateId || id;

    // Clean up filename suffix if request contains .pdf
    let cleanId = certParam;
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

        // Mark downloaded status to true
        try {
            await query('UPDATE certificates SET downloaded = TRUE WHERE id = $1', [cert.id]);
        } catch (dbErr) {
            console.error('Failed to update downloaded status for certificate:', dbErr.message);
        }

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
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
        res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="certificate-${cert.certificate_id}.pdf"`);
        res.setHeader("Content-Description", "File Transfer");
        res.setHeader("Content-Transfer-Encoding", "binary");
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");

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

        // Load saved PDF from disk for attachment
        let pdfBuffer = null;
        const certsDir = path.join(process.cwd(), 'certificates');
        const filePath = path.join(certsDir, `${cert.certificate_id}.pdf`);
        if (fs.existsSync(filePath)) {
            pdfBuffer = fs.readFileSync(filePath);
        } else {
            // Try uploads/certificates directory too
            const altPath = path.join(process.cwd(), 'uploads', 'certificates', `${cert.certificate_id}.pdf`);
            if (fs.existsSync(altPath)) {
                pdfBuffer = fs.readFileSync(altPath);
            } else {
                // Regenerate if file is missing
                try {
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
                    pdfBuffer = await generateCertificatePDF(
                        cert.participant_name,
                        cert.workshop_name,
                        completionDateStr,
                        instructorName,
                        signatureImage,
                        cert.certificate_id
                    );
                } catch (genErr) {
                    console.warn('Failed to regenerate PDF for resend:', genErr.message);
                }
            }
        }

        // Resend email
        try {
            await sendWorkshopCompletionCertificateEmail({
                to: cert.participant_email,
                participantName: cert.participant_name,
                workshopTitle: cert.workshop_name,
                completionDate: completionDateStr,
                downloadUrl: cert.pdf_url,
                certId: cert.certificate_id,
                participantId: cert.participant_id,
                pdfBuffer
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

const crypto = require('crypto');

// POST /api/workshops/:id/certificates
const issueWorkshopCertificate = async (req, res) => {
    const workshopId = req.params.id;
    const { attendeeId } = req.body;

    if (!isValidUUID(workshopId) || !isValidUUID(attendeeId)) {
        return res.status(400).json({ success: false, message: 'Invalid workshop ID or attendee ID format.' });
    }

    try {
        // 1. Fetch workshop details
        const wsRes = await query(
            'SELECT id, title, date, instructor_id, instructor FROM workshops WHERE id = $1',
            [workshopId]
        );
        if (!wsRes.rows.length) {
            return res.status(404).json({ success: false, message: 'Workshop not found.' });
        }
        const workshop = wsRes.rows[0];

        // 2. Fetch attendee details
        const attRes = await query(
            'SELECT id, name, email, status FROM attendees WHERE id = $1 AND workshop_id = $2',
            [attendeeId, workshopId]
        );
        if (!attRes.rows.length) {
            return res.status(404).json({ success: false, message: 'Attendee not found for this workshop.' });
        }
        const attendee = attRes.rows[0];

        // 3. Attendee Status Validation
        if (!attendee.status || attendee.status.toUpperCase() !== 'ATTENDED') {
            return res.status(400).json({
                success: false,
                message: `Certificate can only be issued if attendee status is 'ATTENDED' (current status: ${attendee.status}).`
            });
        }

        // 4. Fetch Instructor Signature
        let signatureFile = req.body.instructorSignature;
        let instructorName = workshop.instructor || 'Workshop Instructor';
        let instructorId = workshop.instructor_id;

        if (instructorId && isValidUUID(instructorId)) {
            const instRes = await query(
                'SELECT first_name, last_name, signature_image FROM team_members WHERE id = $1',
                [instructorId]
            );
            if (instRes.rows.length) {
                const inst = instRes.rows[0];
                instructorName = `${inst.first_name} ${inst.last_name}`.trim();
                if (!signatureFile) {
                    signatureFile = inst.signature_image;
                }
            }
        }

        // Validate Instructor Signature exists
        if (!signatureFile) {
            return res.status(400).json({
                success: false,
                message: 'Instructor digital signature is required but does not exist for the assigned instructor.'
            });
        }

        // 5. Verification ID Logic
        let verificationId = req.body.verificationId;
        if (!verificationId) {
            const newUuid = crypto.randomUUID();
            verificationId = `CERT-${newUuid}`;
        }

        // Check uniqueness of verification ID
        const checkCert = await query(
            'SELECT id FROM workshop_certificates WHERE verification_id = $1',
            [verificationId]
        );
        if (checkCert.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'Verification ID must be unique.' });
        }

        // 6. Setup backend base URL
        const port = process.env.PORT || 5000;
        const localIp = getLocalIpAddress();
        const isCloud = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true' || process.env.RENDER_EXTERNAL_URL;
        const defaultUrl = isCloud ? 'https://tapovana.onrender.com' : `http://${localIp}:${port}`;
        const backendUrl = process.env.BACKEND_URL || process.env.SELF_URL || process.env.RENDER_EXTERNAL_URL || defaultUrl;

        const pdfUrl = req.body.pdfUrl || `${backendUrl}/api/workshops/${workshop.id}/certificates/${verificationId}`;

        // 7. Format Dates
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

        // 8. Generate Certificate PDF and Save
        const pdfBuffer = await generateCertificatePDF(
            attendee.name,
            workshop.title,
            completionDateStr,
            instructorName,
            signatureFile,
            verificationId
        );

        const certsDir = path.join(process.cwd(), 'uploads', 'certificates');
        if (!fs.existsSync(certsDir)) {
            fs.mkdirSync(certsDir, { recursive: true });
        }
        const filePath = path.join(certsDir, `${verificationId}.pdf`);
        fs.writeFileSync(filePath, pdfBuffer);

        // 9. Store in Database
        await query(`
            INSERT INTO workshop_certificates (attendee_id, workshop_id, verification_id, instructor_id, signature_file, pdf_url)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [attendee.id, workshop.id, verificationId, instructorId, signatureFile, pdfUrl]);

        // 10. Deliver Email with Certificate URL
        try {
            await sendWorkshopCompletionCertificateEmail({
                to: attendee.email,
                participantName: attendee.name,
                workshopTitle: workshop.title,
                completionDate: completionDateStr,
                downloadUrl: pdfUrl,
                certId: verificationId,
                participantId: attendee.id,
                pdfBuffer
            });
            await query(
                `INSERT INTO email_logs (participant_id, workshop_id, status, sent_at)
                 VALUES ($1, $2, 'sent', NOW())`,
                [attendee.id, workshop.id]
            );
        } catch (emailErr) {
            console.error(`[WorkshopCertificates] Failed to send certificate email:`, emailErr.message);
            await query(
                `INSERT INTO email_logs (participant_id, workshop_id, status, sent_at)
                 VALUES ($1, $2, 'failed', NOW())`,
                [attendee.id, workshop.id]
            );
        }

        return res.status(201).json({
            success: true,
            attendeeId: attendee.id,
            workshopId: workshop.id,
            verificationId,
            instructorSignature: signatureFile,
            pdfUrl
        });

    } catch (err) {
        console.error('issueWorkshopCertificate error:', err);
        return res.status(500).json({ success: false, message: 'Server error generating certificate.' });
    }
};

// GET /api/workshops/:id/certificates/:verificationId
const downloadWorkshopCertificate = async (req, res) => {
    const { id, verificationId } = req.params;
    try {
        const certRes = await query(`
            SELECT wc.*, a.name AS participant_name, a.email AS participant_email, 
                   w.title AS workshop_title, w.date AS workshop_date, w.instructor,
                   tm.first_name, tm.last_name
            FROM workshop_certificates wc
            JOIN attendees a ON a.id = wc.attendee_id
            JOIN workshops w ON w.id = wc.workshop_id
            JOIN team_members tm ON tm.id = wc.instructor_id
            WHERE wc.verification_id = $1 AND wc.workshop_id = $2
        `, [verificationId, id]);

        if (!certRes.rows.length) {
            return res.status(404).json({ success: false, message: 'Certificate record not found.' });
        }

        const cert = certRes.rows[0];
        const certsDir = path.join(process.cwd(), 'uploads', 'certificates');
        const filePath = path.join(certsDir, `${verificationId}.pdf`);

        // Regenerate if file missing from filesystem
        if (!fs.existsSync(filePath)) {
            if (!fs.existsSync(certsDir)) {
                fs.mkdirSync(certsDir, { recursive: true });
            }

            let dateStr = cert.workshop_date;
            if (cert.workshop_date instanceof Date) {
                const year = cert.workshop_date.getFullYear();
                const month = String(cert.workshop_date.getMonth() + 1).padStart(2, '0');
                const day = String(cert.workshop_date.getDate()).padStart(2, '0');
                dateStr = `${year}-${month}-${day}`;
            }
            const compDateObj = new Date(dateStr);
            const completionDateStr = compDateObj.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            const instructorName = `${cert.first_name} ${cert.last_name}`.trim();

            const pdfBuffer = await generateCertificatePDF(
                cert.participant_name,
                cert.workshop_title,
                completionDateStr,
                instructorName,
                cert.signature_file,
                verificationId
            );
            fs.writeFileSync(filePath, pdfBuffer);
        }

        // Return headers for immediate download
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="Certificate-${verificationId}.pdf"`);
        res.setHeader("Content-Description", "File Transfer");
        res.setHeader("Content-Transfer-Encoding", "binary");
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

        const stream = fs.createReadStream(filePath);
        stream.on('error', (streamErr) => {
            console.error('downloadWorkshopCertificate stream error:', streamErr);
            if (!res.headersSent) {
                res.status(500).json({ success: false, message: 'Server error streaming certificate.' });
            }
        });
        return stream.pipe(res);

    } catch (err) {
        console.error('downloadWorkshopCertificate error:', err);
        return res.status(500).json({ success: false, message: 'Server error downloading certificate.' });
    }
};

module.exports = {
    getAllCertificates,
    getCertificateStats,
    generateCertificatesForWorkshop,
    getCertificateDetails,
    getPublicCertificateDetails,
    downloadCertificatePdf,
    resendCertificateEmail,
    issueWorkshopCertificate,
    downloadWorkshopCertificate
};
