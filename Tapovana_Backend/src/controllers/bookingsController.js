const { query } = require('../config/db');
const { sendBookingStatusEmail, sendBookingAllocationEmail } = require('../services/emailService');

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
    const { status, staff_id, note } = req.body;
    const newStatus = status ? status.toUpperCase() : null;

    if (!newStatus || !['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].includes(newStatus)) {
        return res.status(400).json({ success: false, message: 'Valid status is required.' });
    }

    try {
        const existingRes = await query('SELECT * FROM bookings WHERE id = $1', [req.params.id]);
        if (!existingRes.rows.length) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }
        const booking = existingRes.rows[0];

        let finalStaffId = booking.therapist_id;
        let finalStaffName = booking.therapist_name;
        let staffEmail = null;

        // Completion constraints
        if (newStatus === 'COMPLETED') {
            const serviceRes = await query('SELECT duration_minutes FROM services WHERE name = $1', [booking.service_name]);
            let duration = 60; // default
            if (serviceRes.rows.length && serviceRes.rows[0].duration_minutes) {
                duration = serviceRes.rows[0].duration_minutes;
            }

            const baseDate = new Date(booking.booking_date);
            const timeStr = booking.booking_time || '00:00';
            let match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
            if (match) {
                let hours = parseInt(match[1], 10);
                const mins = parseInt(match[2], 10);
                const ampm = match[3] ? match[3].toUpperCase() : null;
                if (ampm === 'PM' && hours < 12) hours += 12;
                if (ampm === 'AM' && hours === 12) hours = 0;
                baseDate.setHours(hours, mins, 0, 0);
            }

            const endTime = new Date(baseDate.getTime() + (duration + 10) * 60000);
            if (new Date() < endTime) {
                return res.status(400).json({ success: false, message: 'Error: Booking cannot be marked as completed before scheduled end time + buffer.' });
            }
        }

        // Cancellation constraints
        if (newStatus === 'CANCELLED') {
            if (booking.status === 'COMPLETED') {
                return res.status(400).json({ success: false, message: 'Error: Completed bookings cannot be cancelled.' });
            }
            finalStaffId = null;
            finalStaffName = null;
        }

        // Staff assignment rules
        if (staff_id !== undefined) {
            if (staff_id !== null && newStatus !== 'CONFIRMED') {
                return res.status(400).json({ success: false, message: 'Error: Staff allocation is only allowed after booking is confirmed.' });
            }

            if (staff_id === null) {
                finalStaffId = null;
                finalStaffName = null;
            } else if (staff_id !== booking.therapist_id) {
                // Check scheduling conflict
                const currServiceRes = await query('SELECT duration_minutes FROM services WHERE name = $1', [booking.service_name]);
                let currDuration = 60;
                if (currServiceRes.rows.length && currServiceRes.rows[0].duration_minutes) currDuration = currServiceRes.rows[0].duration_minutes;

                const getMinsFromTime = (timeStr) => {
                    let match = (timeStr || '00:00').match(/(\d+):(\d+)\s*(AM|PM)?/i);
                    if (!match) return 0;
                    let hours = parseInt(match[1], 10);
                    const mins = parseInt(match[2], 10);
                    const ampm = match[3] ? match[3].toUpperCase() : null;
                    if (ampm === 'PM' && hours < 12) hours += 12;
                    if (ampm === 'AM' && hours === 12) hours = 0;
                    return hours * 60 + mins;
                };

                const currStart = getMinsFromTime(booking.booking_time);
                const currEnd = currStart + currDuration;

                const staffBookings = await query('SELECT service_name, booking_time FROM bookings WHERE therapist_id = $1 AND booking_date = $2 AND id != $3 AND status IN ($4, $5)', [staff_id, booking.booking_date, booking.id, 'CONFIRMED', 'PENDING']);
                
                let conflict = false;
                for (let b of staffBookings.rows) {
                    const bServiceRes = await query('SELECT duration_minutes FROM services WHERE name = $1', [b.service_name]);
                    let bDuration = 60;
                    if (bServiceRes.rows.length && bServiceRes.rows[0].duration_minutes) bDuration = bServiceRes.rows[0].duration_minutes;
                    
                    const bStart = getMinsFromTime(b.booking_time);
                    const bEnd = bStart + bDuration;

                    if (currStart < bEnd && currEnd > bStart) {
                        conflict = true;
                        break;
                    }
                }

                if (conflict) {
                    return res.status(400).json({ success: false, message: 'Error: Staff allocation failed due to scheduling conflict.' });
                }

                // If no conflict, assign
                const staffRes = await query('SELECT id, first_name, last_name, email FROM team_members WHERE id = $1', [staff_id]);
                if (staffRes.rows.length) {
                    finalStaffId = staffRes.rows[0].id;
                    finalStaffName = (staffRes.rows[0].first_name + ' ' + staffRes.rows[0].last_name).trim();
                    staffEmail = staffRes.rows[0].email;
                }
            }
        }

        const result = await query(
            'UPDATE bookings SET status = $1, therapist_id = $2, therapist_name = $3, note = $4 WHERE id = $5 RETURNING *',
            [newStatus, finalStaffId, finalStaffName, note !== undefined ? note : booking.note, req.params.id]
        );
        const updatedBooking = result.rows[0];

        // Attempt to find user email
        let userEmail = null;
        if (updatedBooking.user_email) {
            userEmail = updatedBooking.user_email;
        }

        const details = {
            service: updatedBooking.service_name,
            date: updatedBooking.booking_date,
            time: updatedBooking.booking_time,
            staff: updatedBooking.therapist_name,
            customer: updatedBooking.user_name
        };

        if (userEmail && booking.status !== newStatus) {
            await sendBookingStatusEmail({
                to: userEmail,
                firstName: updatedBooking.user_name || 'Customer',
                status: newStatus,
                details
            }).catch(e => console.error("Error sending user email:", e));
        }

        if (newStatus === 'CONFIRMED' && staffEmail && finalStaffId !== booking.therapist_id) {
            await sendBookingAllocationEmail({
                to: staffEmail,
                staffName: finalStaffName,
                bookingId: updatedBooking.id,
                details
            }).catch(e => console.error("Error sending staff email:", e));
        }

        if (newStatus === 'COMPLETED' && booking.status !== 'COMPLETED' && finalStaffId) {
            // Need to fetch staff email to send completion note if staffEmail not populated in this request
            if (!staffEmail) {
                const staffRes = await query('SELECT email, first_name, last_name FROM team_members WHERE id = $1', [finalStaffId]);
                if (staffRes.rows.length) {
                    staffEmail = staffRes.rows[0].email;
                    finalStaffName = (staffRes.rows[0].first_name + ' ' + staffRes.rows[0].last_name).trim();
                }
            }
            if (staffEmail) {
                await sendBookingStatusEmail({
                    to: staffEmail,
                    firstName: finalStaffName,
                    status: 'COMPLETED',
                    details
                }).catch(e => console.error("Error sending staff completion email:", e));
            }
        }

        return res.json({ success: true, message: 'Booking status updated.', booking: updatedBooking });
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

// SYNC BOOKINGS FROM RENDER API (mobile app data)
const syncFromRender = async (req, res) => {
    try {
        const response = await fetch('https://tapoclg.onrender.com/api/bookings?limit=100');
        const data = await response.json();

        if (!data.success || !data.bookings) {
            return res.status(400).json({ success: false, message: 'Failed to fetch from Render API.' });
        }

        let synced = 0;
        for (const booking of data.bookings) {
            const existing = await query('SELECT id FROM bookings WHERE id = $1', [booking.id]);
            if (existing.rows.length) continue;

            const paymentStatus = 'PAID';

            const insertResult = await query(
                'INSERT INTO bookings (id, user_name, service_name, booking_date, booking_time, therapist_name, note, total_amount, pass_details, payment_status, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *',
                [
                    booking.id, booking.user_name, booking.service_name,
                    booking.booking_date, booking.booking_time, booking.therapist_name,
                    booking.note, booking.total_amount, booking.pass_details,
                    paymentStatus, 'PENDING', booking.created_at
                ]
            );

            synced++;
            
            // Try to find user email and send Pending notification
            const newBooking = insertResult.rows[0];
            let userEmail = null;
            if (newBooking.user_email) {
                userEmail = newBooking.user_email;
            }

            if (userEmail) {
                await sendBookingStatusEmail({
                    to: userEmail,
                    firstName: newBooking.user_name || 'Customer',
                    status: 'PENDING',
                    details: {
                        service: newBooking.service_name,
                        date: newBooking.booking_date,
                        time: newBooking.booking_time
                    }
                }).catch(e => console.error("Error sending pending email:", e));
            }
        }

        return res.json({ success: true, message: 'Sync complete.', synced: synced, total: data.bookings.length });
    } catch (err) {
        console.error('syncFromRender error:', err);
        return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
};

module.exports = { getAllBookings, getBookingById, updateBookingStatus, assignTherapist, syncFromRender };