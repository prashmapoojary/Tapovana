const { query } = require('../config/db');

// GET ALL BOOKINGS
const getAllBookings = async (req, res) => {
    try {
        const { status, date_from, date_to, page = 1, limit = 10 } = req.query;
        const conditions = [];
        const values = [];
        let idx = 1;

        if (status) { conditions.push('b.status = $' + idx++); values.push(status.toUpperCase()); }
        if (date_from) { conditions.push('b.booking_date >= $' + idx++); values.push(date_from); }
        if (date_to) { conditions.push('b.booking_date <= $' + idx++); values.push(date_to); }

        const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const countResult = await query('SELECT COUNT(*) FROM bookings b ' + whereClause, values);
        const total = parseInt(countResult.rows[0].count);

        const result = await query(
            'SELECT b.* FROM bookings b ' + whereClause + ' ORDER BY b.created_at DESC LIMIT $' + idx + ' OFFSET $' + (idx + 1),
            [...values, parseInt(limit), offset]
        );

        return res.json({
            success: true,
            count: result.rows.length,
            bookings: result.rows,
            pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) }
        });
    } catch (err) {
        console.error('getAllBookings error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// GET SINGLE BOOKING
const getBookingById = async (req, res) => {
    try {
        const result = await query('SELECT * FROM bookings WHERE id = $1', [req.params.id]);
        if (!result.rows.length) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }
        return res.json({ success: true, booking: result.rows[0] });
    } catch (err) {
        console.error('getBookingById error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// UPDATE BOOKING STATUS
const updateBookingStatus = async (req, res) => {
    const { status } = req.body;
    if (!status || !['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].includes(status.toUpperCase())) {
        return res.status(400).json({ success: false, message: 'Valid status is required (PENDING, CONFIRMED, COMPLETED, CANCELLED).' });
    }

    try {
        const result = await query(
            'UPDATE bookings SET status = $1 WHERE id = $2 RETURNING *',
            [status.toUpperCase(), req.params.id]
        );
        if (!result.rows.length) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }
        return res.json({ success: true, message: 'Booking status updated.', booking: result.rows[0] });
    } catch (err) {
        console.error('updateBookingStatus error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ASSIGN THERAPIST TO BOOKING
const assignTherapist = async (req, res) => {
    const { therapist_id, therapist_name } = req.body;

    try {
        let name = therapist_name;
        if (therapist_id) {
            const staffRes = await query('SELECT first_name, last_name FROM team_members WHERE id = $1', [therapist_id]);
            if (staffRes.rows.length) {
                name = (staffRes.rows[0].first_name + ' ' + staffRes.rows[0].last_name).trim();
            }
        }

        const result = await query(
            'UPDATE bookings SET therapist_id = $1, therapist_name = $2 WHERE id = $3 RETURNING *',
            [therapist_id || null, name || null, req.params.id]
        );
        if (!result.rows.length) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }
        return res.json({ success: true, message: 'Therapist assigned.', booking: result.rows[0] });
    } catch (err) {
        console.error('assignTherapist error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// SYNC BOOKINGS FROM RENDER API
const syncFromRender = async (req, res) => {
    try {
        const response = await fetch('https://tapoclg.onrender.com/api/bookings?limit=100');
        const data = await response.json();

        if (!data.success || !data.bookings) {
            return res.status(400).json({ success: false, message: 'Failed to fetch from Render API.' });
        }

        let synced = 0;
        for (const booking of data.bookings) {
            // Check if already exists
            const existing = await query('SELECT id FROM bookings WHERE id = $1', [booking.id]);
            if (existing.rows.length) continue;

            // Parse total_amount to extract numeric value and payment status
            const amountStr = booking.total_amount || '₹0';
            const amountMatch = amountStr.match(/₹([\d,]+)/);
            const numericAmount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;
            const paymentStatus = amountStr.includes('FREE') ? 'PAID' : (amountStr.includes('Pass') ? 'PAID' : 'PENDING');

            await query(
                'INSERT INTO bookings (id, user_name, profile_pic, service_name, booking_date, booking_time, therapist_name, note, total_amount, pass_details, payment_status, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)',
                [
                    booking.id, booking.user_name, booking.profile_pic, booking.service_name,
                    booking.booking_date, booking.booking_time, booking.therapist_name,
                    booking.note, booking.total_amount, booking.pass_details,
                    paymentStatus, 'PENDING', booking.created_at
                ]
            );
            synced++;
        }

        return res.json({ success: true, message: 'Sync complete.', synced: synced, total: data.bookings.length });
    } catch (err) {
        console.error('syncFromRender error:', err);
        return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
};

module.exports = { getAllBookings, getBookingById, updateBookingStatus, assignTherapist, syncFromRender };