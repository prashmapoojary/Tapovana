const { query } = require('../config/db');
const { getValidCustomerMembership } = require('../utils/membershipHelper');
const {
    sendBookingStatusEmail,
    sendBookingAllocationEmail,
    sendBookingRemovalEmail,
    sendStaffCancellationEmail,
    sendStaffCompletionEmail
} = require('../services/emailService');
const { checkStaffAllocationConflict, syncStaffMemberStatus } = require('../utils/conflictChecker');
const https = require('https');

// Helper: Apply Membership Discount automatically
const applyMembershipDiscount = async (emailOrId, serviceName, currentAmountStr, userName = null, bookingDate = new Date()) => {
    const ident = emailOrId ? String(emailOrId).trim() : '';
    const nameVal = userName ? String(userName).trim() : '';

    if (!ident && !nameVal) return currentAmountStr;

    try {
        const memResult = await getValidCustomerMembership(ident, nameVal, bookingDate);
        
        if (!memResult.active || memResult.discountRate <= 0) {
            return currentAmountStr;
        }

        const discountRate = memResult.discountRate;
        const passLabel = memResult.passDetails || `${memResult.tier} Tier`;

        // Determine base price
        let basePrice = null;
        if (serviceName) {
            // 1. Try services table
            const svcRes = await query(
                "SELECT base_price FROM services WHERE LOWER(name) = LOWER($1)",
                [serviceName.trim()]
            );
            if (svcRes.rows.length > 0 && svcRes.rows[0].base_price) {
                basePrice = parseFloat(svcRes.rows[0].base_price);
            }

            // 2. Try workshops table if not found
            if (!basePrice) {
                const wsRes = await query(
                    "SELECT price FROM workshops WHERE LOWER(title) = LOWER($1)",
                    [serviceName.trim()]
                );
                if (wsRes.rows.length > 0 && wsRes.rows[0].price) {
                    basePrice = parseFloat(wsRes.rows[0].price);
                }
            }

            // 3. Try vedic_programs table if not found
            if (!basePrice) {
                const vpRes = await query(
                    "SELECT price FROM vedic_programs WHERE LOWER(title) = LOWER($1)",
                    [serviceName.trim()]
                );
                if (vpRes.rows.length > 0 && vpRes.rows[0].price) {
                    basePrice = parseFloat(vpRes.rows[0].price);
                }
            }
        }

        // If not found in database, try parsing from incoming amount
        if (!basePrice && currentAmountStr) {
            if (currentAmountStr.includes('(')) {
                return currentAmountStr;
            }
            const cleanStr = currentAmountStr.replace(/[^0-9.]/g, '');
            if (cleanStr) {
                basePrice = parseFloat(cleanStr);
            }
        }

        if (!basePrice || isNaN(basePrice)) {
            return currentAmountStr;
        }

        const discountedAmount = basePrice * (1 - discountRate);
        const roundedAmount = Math.round(discountedAmount);

        return `₹${roundedAmount} (${passLabel} discount applied)`;
    } catch (err) {
        console.error('[applyMembershipDiscount] Error:', err);
        return currentAmountStr;
    }
};

// Helper: Validate UUID
const isValidUUID = (id) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
};

const unsplashCache = new Map();

const getUnsplashFallbackImage = async (queryStr) => {
    if (!queryStr) return 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=800&q=80';
    const cleanQuery = queryStr.trim().toLowerCase();
    if (unsplashCache.has(cleanQuery)) {
        return unsplashCache.get(cleanQuery);
    }
    const unsplashKey = process.env.UNSPLASH_ACCESS_KEY || process.env.UNSPLASH_KEY;
    if (unsplashKey) {
        try {
            const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(cleanQuery)}&per_page=1&client_id=${unsplashKey}`;
            const resData = await new Promise((resolve) => {
                https.get(url, { timeout: 3000 }, (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => resolve(data));
                }).on('error', () => resolve(null));
            });
            if (resData) {
                const parsed = JSON.parse(resData);
                if (parsed.results && parsed.results.length > 0) {
                    const imgUrl = parsed.results[0].urls.regular;
                    unsplashCache.set(cleanQuery, imgUrl);
                    return imgUrl;
                }
            }
        } catch (e) {
            console.warn("Unsplash API fetch warning:", e.message);
        }
    }
    const defaultUrl = 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=800&q=80';
    unsplashCache.set(cleanQuery, defaultUrl);
    return defaultUrl;
};

const getFullImageUrl = (req, imageUrl) => {
    if (!imageUrl || typeof imageUrl !== 'string') return imageUrl;
    if (/^https?:\/\//.test(imageUrl) || imageUrl.startsWith('data:')) {
        return imageUrl;
    }
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    return `${protocol}://${host}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
};

const enrichBookingObject = async (req, booking) => {
    if (!booking) return null;

    let profilePhoto = null;
    if (booking.profile_pic) {
        if (booking.profile_pic.startsWith('http')) {
            profilePhoto = booking.profile_pic;
        } else {
            profilePhoto = `https://tapovana.onrender.com${booking.profile_pic.startsWith('/') ? '' : '/'}${booking.profile_pic}`;
        }
    }

    let serviceImage = null;
    if (booking.service_name) {
        try {
            const svcRes = await query('SELECT image_url FROM services WHERE LOWER(name) = LOWER($1)', [booking.service_name.trim()]);
            if (svcRes.rows.length && svcRes.rows[0].image_url) {
                serviceImage = svcRes.rows[0].image_url;
            } else {
                serviceImage = await getUnsplashFallbackImage(booking.service_name);
            }
        } catch (err) {
            console.error('Error fetching service image for booking:', err);
        }
    }

    return {
        ...booking,
        profilePhoto,
        serviceImage: serviceImage ? getFullImageUrl(req, serviceImage) : null
    };
};


// Ensure booking_status_updates table exists
const ensureUpdatesTableExists = async () => {
    try {
        const colRes = await query(`
            SELECT data_type 
            FROM information_schema.columns 
            WHERE table_name = 'booking_status_updates' AND column_name = 'booking_id'
        `);
        if (colRes.rows.length && colRes.rows[0].data_type === 'character varying') {
            await query(`DROP TABLE IF EXISTS booking_status_updates CASCADE;`);
        }
        await query(`
            CREATE TABLE IF NOT EXISTS booking_status_updates (
                id SERIAL PRIMARY KEY,
                booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
                status VARCHAR(20) NOT NULL,
                therapist_id UUID,
                therapist_name VARCHAR(255),
                note TEXT,
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
    } catch (err) {
        console.error('Error creating booking_status_updates table:', err);
    }
};
ensureUpdatesTableExists();

// Ensure deleted_booking_ids table exists
const ensureDeletedBookingsTableExists = async () => {
    try {
        await query(`
            CREATE TABLE IF NOT EXISTS deleted_booking_ids (
                booking_id INTEGER PRIMARY KEY,
                deleted_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
    } catch (err) {
        console.error('Error creating deleted_booking_ids table:', err);
    }
};
ensureDeletedBookingsTableExists();

// Helper: Log audit trail entry
const logBookingAudit = async (bookingId, status, therapistId, therapistName, note) => {
    try {
        await query(
            `INSERT INTO booking_status_updates (booking_id, status, therapist_id, therapist_name, note, updated_at)
             VALUES ($1, $2, $3, $4, $5, NOW())`,
            [bookingId ? parseInt(bookingId) : null, status, therapistId || null, therapistName || null, note || null]
        );
    } catch (err) {
        console.error('Failed to log booking audit:', err);
    }
};

// Helper: Ingest/Sync bookings from the mobile app endpoint into the local DB
const syncIncomingBookings = async ({ noEmail = false } = {}) => {
    try {
        let remoteBookings = [];
        try {
            const response = await fetch('https://tapoclg.onrender.com/api/bookings?limit=200', { signal: AbortSignal.timeout(8000) });
            if (response.ok) {
                const data = await response.json();
                remoteBookings = data.success ? (data.bookings || []) : (Array.isArray(data) ? data : []);
            }
        } catch (e) {
            // fallback
        }

        if (remoteBookings.length === 0) {
            const fallbackRes = await fetch('https://tapovana.onrender.com/api/bookings?limit=200', { signal: AbortSignal.timeout(8000) });
            if (fallbackRes.ok) {
                const data = await fallbackRes.json();
                remoteBookings = data.success ? (data.bookings || []) : [];
            }
        }

        if (remoteBookings.length > 0) {
            // Load membership name -> email mappings
            const memberEmailMap = new Map();
            try {
                const memRes = await query(`SELECT name, email FROM memberships WHERE name IS NOT NULL AND email IS NOT NULL`);
                for (const row of memRes.rows) {
                    if (row.name && row.email) {
                        memberEmailMap.set(String(row.name).trim().toLowerCase(), String(row.email).trim());
                    }
                }
            } catch (e) { }

            // Get all deleted booking IDs
            const deletedRes = await query("SELECT booking_id FROM deleted_booking_ids");
            const deletedIds = new Set(deletedRes.rows.map(r => String(r.booking_id)));

            for (const rb of remoteBookings) {
                const bookingId = String(rb.id || rb.booking_id);
                if (!bookingId || deletedIds.has(bookingId)) continue;

                let userName = (rb.user_name || rb.customer_name || rb.name || 'Guest Customer').trim();
                let userEmail = rb.user_email || rb.email || rb.customer_email || null;

                // Rule 1: Prashma Poojary / Prashma salian -> prashmapoojary@gmail.com
                if (userName.toLowerCase().includes('prashma') || userName.toLowerCase().includes('poojary')) {
                    userEmail = 'prashmapoojary@gmail.com';
                }

                // Rule 2: Match customer name against membership table
                const lowerName = userName.toLowerCase();
                if (memberEmailMap.has(lowerName)) {
                    userEmail = memberEmailMap.get(lowerName);
                }

                // Rule 3: Default email if missing
                if (!userEmail || userEmail === 'null' || userEmail === 'undefined') {
                    const cleanName = userName.toLowerCase().replace(/[^a-z0-9]/g, '');
                    userEmail = `${cleanName || 'customer'}@gmail.com`;
                }

                let serviceName = (rb.service_name || rb.service || 'Abhyanga Ayurvedic Massage').trim();
                let bookingDate = rb.booking_date || rb.date || '2026-09-01';
                let bookingTime = rb.booking_time || rb.time || '10:00 AM';
                let totalAmount = rb.total_amount || rb.amount || '₹2,500';
                let profilePic = rb.profile_pic || rb.profile_photo || null;
                let note = rb.note || null;
                let passDetails = rb.pass_details || null;

                const existing = await query("SELECT id, profile_pic FROM bookings WHERE id = $1", [rb.id]);
                if (existing.rows.length === 0) {
                    const paymentStatus = 'PAID';
                    const bookingStatus = 'PENDING';
                    await query(
                        'INSERT INTO bookings (id, user_name, service_name, booking_date, booking_time, therapist_name, note, total_amount, pass_details, payment_status, status, created_at, user_email, profile_pic) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), $12, $13) ON CONFLICT (id) DO NOTHING',
                        [
                            rb.id, userName, serviceName,
                            bookingDate, bookingTime, null,
                            note, totalAmount, passDetails,
                            paymentStatus, bookingStatus, userEmail,
                            profilePic
                        ]
                    );

                    if (!noEmail && userEmail) {
                        await sendBookingStatusEmail({
                            to: userEmail,
                            firstName: userName,
                            status: bookingStatus,
                            details: { service: serviceName, date: bookingDate, time: bookingTime }
                        }).catch(e => console.error("Error sending email during auto-sync:", e));
                    }
                } else {
                    // Update user_email and user_name if missing/updated
                    await query(
                        "UPDATE bookings SET user_email = $1, user_name = $2, profile_pic = COALESCE(profile_pic, $3) WHERE id = $4",
                        [userEmail, userName, profilePic, rb.id]
                    );
                }
            }
        }
    } catch (err) {
        console.error('syncIncomingBookings error:', err.message);
    }
};

// Helper: Common booking transition & allocation rules validation
const validateBookingTransitionAndAllocations = async (booking, newStatus, incomingStaffIds) => {
    // 1. Terminal state locks
    if (booking.status === 'COMPLETED') {
        if (newStatus === 'CANCELLED') {
            return { valid: false, message: 'Completed bookings cannot be cancelled.' };
        }
        return { valid: false, message: 'Completed bookings cannot be modified.' };
    }
    if (booking.status === 'CANCELLED') {
        if (newStatus === 'COMPLETED') {
            return { valid: false, message: 'Cancelled bookings cannot be marked as completed.' };
        }
        return { valid: false, message: 'Cancelled bookings cannot be modified.' };
    }

    // 2. Direct Pending → Completed not allowed
    if (newStatus === 'COMPLETED' && booking.status === 'PENDING') {
        return { valid: false, message: 'You cannot mark a pending booking as completed.' };
    }

    // 3. Reverting to Pending from Confirmed not allowed
    if (booking.status === 'CONFIRMED' && newStatus === 'PENDING') {
        return { valid: false, message: 'Confirmed bookings cannot revert to pending.' };
    }

    // 4. Fetch service duration
    const serviceRes = await query('SELECT duration_minutes FROM services WHERE name = $1', [booking.service_name]);
    let duration = 60;
    if (serviceRes.rows.length && serviceRes.rows[0].duration_minutes) {
        duration = serviceRes.rows[0].duration_minutes;
    }

    // 5. Completion buffer constraint (service end time + 30 minutes)
    if (newStatus === 'COMPLETED') {
        if (booking.status !== 'CONFIRMED') {
            return { valid: false, message: 'Error: Booking must be in Confirmed state to be completed.' };
        }
        const baseDate = new Date(booking.booking_date);
        const timeStr = booking.booking_time || '00:00';
        const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
        if (match) {
            let hours = parseInt(match[1], 10);
            const mins = parseInt(match[2], 10);
            const ampm = match[3] ? match[3].toUpperCase() : null;
            if (ampm === 'PM' && hours < 12) hours += 12;
            if (ampm === 'AM' && hours === 12) hours = 0;
            baseDate.setHours(hours, mins, 0, 0);
        }
        const endTime = new Date(baseDate.getTime() + (duration + 30) * 60000);
        if (new Date() < endTime) {
            const diffMins = Math.ceil((endTime - new Date()) / 60000);
            return {
                valid: false,
                message: `Cannot complete yet. Available after end time + 30 min buffer (${diffMins} min remaining).`
            };
        }
    }

    // 6. Cannot cancel once service started
    if (newStatus === 'CANCELLED' && booking.status === 'CONFIRMED') {
        const baseDate = new Date(booking.booking_date);
        const timeStr = booking.booking_time || '00:00';
        const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
        if (match) {
            let hours = parseInt(match[1], 10);
            const mins = parseInt(match[2], 10);
            const ampm = match[3] ? match[3].toUpperCase() : null;
            if (ampm === 'PM' && hours < 12) hours += 12;
            if (ampm === 'AM' && hours === 12) hours = 0;
            baseDate.setHours(hours, mins, 0, 0);
        }
        if (new Date() >= baseDate) {
            return { valid: false, message: 'Cannot cancel booking once the service has started.' };
        }
    }

    // 7. Allocation Rules (CONFIRMED & COMPLETED status require staff allocation)
    if (newStatus === 'CONFIRMED' || newStatus === 'COMPLETED') {
        if (incomingStaffIds === null) {
            const existingAllocs = await query(
                `SELECT staff_id FROM allocations WHERE session_id = $1 AND type = 'service'`,
                [String(booking.id)]
            );
            if (existingAllocs.rows.length === 0 && !booking.therapist_id) {
                return { valid: false, message: 'Staff allocation required before confirmation or completion. Booking status must remain Pending.' };
            }
        } else {
            if (incomingStaffIds.length === 0 && !booking.therapist_id) {
                return { valid: false, message: 'Staff allocation required before confirmation or completion. Booking status must remain Pending.' };
            }
            if (incomingStaffIds.length > 3) {
                return { valid: false, message: 'Maximum of 3 staff allocations possible per service.' };
            }

            const rolesRes = await query(
                `SELECT tm.id, r.name AS role_name 
                 FROM team_members tm 
                 JOIN roles r ON r.id = tm.role_id 
                 WHERE tm.id = ANY($1::uuid[])`,
                [incomingStaffIds]
            );
            const invalidStaff = rolesRes.rows.filter(s => 
                !['DOCTOR', 'THERAPIST'].includes(String(s.role_name).toUpperCase())
            );
            if (invalidStaff.length > 0) {
                return { valid: false, message: 'Invalid staff allocation: Only staff with Doctor or Therapist roles can be allocated.' };
            }

            for (const staffId of incomingStaffIds) {
                const conflictCheck = await checkStaffAllocationConflict({
                    staffId: staffId,
                    date: booking.booking_date,
                    timeStr: booking.booking_time,
                    durationMins: duration,
                    type: 'service',
                    sessionId: booking.id
                });
                if (conflictCheck.conflict) {
                    return {
                        valid: false,
                        message: conflictCheck.message || 'Staff allocation failed due to daily limit or package conflict.',
                        reasonCode: conflictCheck.reasonCode
                    };
                }
            }
        }
    }

    return { valid: true, duration };
};

// CREATE BOOKING (New booking from mobile client)
const createBooking = async (req, res) => {
    try {
        const { id, user_name, service_name, booking_date, booking_time, note, total_amount, pass_details, user_email, email, profile_pic } = req.body;
        if (!user_name || !service_name) {
            return res.status(400).json({ success: false, message: 'user_name and service_name are required.' });
        }

        // Check if deleted
        const bookingId = id ? parseInt(id) : null;
        if (bookingId) {
            const deletedCheck = await query('SELECT 1 FROM deleted_booking_ids WHERE booking_id = $1', [bookingId]);
            if (deletedCheck.rows.length) {
                return res.status(400).json({ success: false, message: 'This booking has been deleted.' });
            }
            const existing = await query("SELECT id FROM bookings WHERE id = $1", [bookingId]);
            if (existing.rows.length) {
                return res.status(400).json({ success: false, message: 'Booking already exists.' });
            }
        }

        const paymentStatus = 'PAID';
        const status = 'PENDING';
        const emailAddressForDiscount = user_email || email || null;
        const finalAmount = await applyMembershipDiscount(emailAddressForDiscount, service_name, total_amount, user_name);

        const insertRes = await query(
            'INSERT INTO bookings (id, user_name, service_name, booking_date, booking_time, therapist_name, note, total_amount, pass_details, payment_status, status, created_at, profile_pic) VALUES (COALESCE($1, nextval(\'bookings_id_seq\')), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), $12) RETURNING *',
            [
                bookingId, user_name, service_name,
                booking_date, booking_time, null,
                note || null, finalAmount || null, pass_details || null,
                paymentStatus, status,
                profile_pic || null
            ]
        );

        const newBooking = insertRes.rows[0];

        // Trigger audit trail log
        await logBookingAudit(newBooking.id, newBooking.status, null, null, 'New booking created from mobile endpoint.');

        // Trigger email
        let emailAddress = user_email || email || null;
        if (emailAddress) {
            await sendBookingStatusEmail({
                to: emailAddress,
                firstName: user_name || 'Customer',
                status: 'PENDING',
                details: {
                    service: service_name,
                    date: booking_date,
                    time: booking_time
                }
            }).catch(e => console.error("Error sending pending email during POST booking:", e));
        }

        return res.status(201).json({ success: true, booking: newBooking });
    } catch (err) {
        console.error('POST booking error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// GET ALL BOOKINGS
const getAllBookings = async (req, res) => {
    try {
        const { status, date_from, date_to, page = 1, limit = 50 } = req.query;

        // Check if local DB is empty — if so, await sync to populate it first
        const countRes = await query('SELECT COUNT(*) FROM bookings');
        const localCount = parseInt(countRes.rows[0].count);

        if (localCount === 0) {
            // Await sync on first load so bookings appear immediately
            await syncIncomingBookings({ noEmail: true });
        } else {
            // Otherwise sync in background (non-blocking)
            syncIncomingBookings({ noEmail: true }).catch(e => console.error('Background sync error:', e));
        }

        // 2. Query bookings from local database ONLY
        let dbQuery = "SELECT * FROM bookings WHERE 1=1";
        const queryParams = [];

        if (status) {
            queryParams.push(status.toUpperCase());
            dbQuery += ` AND status = $${queryParams.length}`;
        }
        if (date_from) {
            queryParams.push(new Date(date_from));
            dbQuery += ` AND booking_date >= $${queryParams.length}`;
        }
        if (date_to) {
            const toDate = new Date(date_to);
            toDate.setHours(23, 59, 59, 999);
            queryParams.push(toDate);
            dbQuery += ` AND booking_date <= $${queryParams.length}`;
        }

        const dbRes = await query(dbQuery, queryParams);
        let allBookings = dbRes.rows;

        // Sort by created_at DESC, fallback to booking_date
        allBookings.sort((a, b) => new Date(b.created_at || b.booking_date) - new Date(a.created_at || a.booking_date));

        // Paginate
        const total = allBookings.length;
        const pg = parseInt(page) || 1;
        const lim = parseInt(limit) || 10;
        const startIndex = (pg - 1) * lim;
        const paginatedBookings = allBookings.slice(startIndex, startIndex + lim);

        // Batch-load all service images in ONE query instead of N+1 per-booking
        const serviceNames = [...new Set(paginatedBookings.map(b => b.service_name).filter(Boolean))];
        const serviceImageMap = {};
        if (serviceNames.length > 0) {
            try {
                const svcRes = await query(
                    `SELECT LOWER(name) as name, image_url FROM services WHERE LOWER(name) = ANY($1::text[])`,
                    [serviceNames.map(n => n.trim().toLowerCase())]
                );
                for (const row of svcRes.rows) {
                    if (row.image_url) serviceImageMap[row.name] = row.image_url;
                }
            } catch (e) {
                console.warn('Batch service image lookup failed:', e.message);
            }
        }

// Helper: Compute pricing breakdown (Original Price, Tier, Discount, Final Price)
const computeBookingPricingBreakdown = async (b) => {
    try {
        const { getMemberTierAndDiscount } = require('./membershipController');
        const email = b.user_email || b.email || null;
        const name = b.user_name || null;
        
        let tier = b.membership_tier;
        let discountPct = 0;

        if (!tier || tier === 'Standard' || tier === 'NONE' || tier === 'N/A') {
            const resolved = await getMemberTierAndDiscount(email, name);
            tier = resolved.tier;
            discountPct = resolved.discountPercentage;
        } else {
            const tierRes = await query('SELECT discount_percentage FROM membership_tiers WHERE UPPER(name) = UPPER($1) LIMIT 1', [tier]);
            if (tierRes.rows.length && tierRes.rows[0].discount_percentage !== undefined) {
                discountPct = parseFloat(tierRes.rows[0].discount_percentage) || 0;
            } else {
                const defaultDiscounts = { 'SILVER': 15, 'GOLD': 25, 'PLATINUM': 40 };
                discountPct = defaultDiscounts[tier.toUpperCase()] || 0;
            }
        }

        let origNum = 0;
        if (b.original_price) {
            origNum = parseFloat(String(b.original_price).replace(/[^0-9.]/g, '')) || 0;
        }
        if (!origNum && b.service_name) {
            const svcRes = await query("SELECT base_price FROM services WHERE LOWER(name) = LOWER($1) LIMIT 1", [b.service_name.trim()]);
            if (svcRes.rows.length && svcRes.rows[0].base_price) {
                origNum = parseFloat(svcRes.rows[0].base_price) || 0;
            }
        }
        if (!origNum && b.total_amount) {
            origNum = parseFloat(String(b.total_amount).replace(/[^0-9.]/g, '')) || 0;
        }
        if (!origNum) origNum = 2500;

        const discountNum = Math.round((origNum * discountPct) / 100);
        const finalNum = Math.max(0, origNum - discountNum);

        const original_price = `₹${origNum.toLocaleString('en-IN')}`;
        const membership_tier = tier || 'Standard';
        const discount_amount = discountNum > 0 ? `₹${discountNum.toLocaleString('en-IN')} (${discountPct}%)` : `₹0 (0%)`;
        const final_price = `₹${finalNum.toLocaleString('en-IN')}`;

        return { original_price, membership_tier, discount_amount, final_price };
    } catch (e) {
        console.warn('computeBookingPricingBreakdown error:', e.message);
        return {
            original_price: b.original_price || b.total_amount || '₹2,500',
            membership_tier: b.membership_tier || 'Standard',
            discount_amount: b.discount_amount || '₹0 (0%)',
            final_price: b.final_price || b.total_amount || '₹2,500'
        };
    }
};

        // Enrich bookings in-memory (no per-booking DB calls)
        const enrichedBookings = await Promise.all(paginatedBookings.map(async (booking) => {
            let profilePhoto = null;
            if (booking.profile_pic) {
                profilePhoto = booking.profile_pic.startsWith('http')
                    ? booking.profile_pic
                    : `https://tapovana.onrender.com${booking.profile_pic.startsWith('/') ? '' : '/'}${booking.profile_pic}`;
            }
            const lowerName = booking.service_name ? booking.service_name.trim().toLowerCase() : '';
            const serviceImage = serviceImageMap[lowerName] || null;

            const pricing = await computeBookingPricingBreakdown(booking);

            return {
                ...booking,
                original_price: booking.original_price || pricing.original_price,
                membership_tier: booking.membership_tier || pricing.membership_tier,
                discount_amount: booking.discount_amount || pricing.discount_amount,
                final_price: booking.final_price || pricing.final_price,
                total_amount: booking.total_amount || pricing.final_price,
                profilePhoto,
                serviceImage: serviceImage ? getFullImageUrl(req, serviceImage) : null
            };
        }));

        return res.json({
            success: true,
            count: enrichedBookings.length,
            bookings: enrichedBookings,
            pagination: {
                total,
                page: pg,
                limit: lim,
                totalPages: Math.ceil(total / lim)
            }
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
        const enriched = await enrichBookingObject(req, result.rows[0]);
        return res.json({ success: true, booking: enriched });
    } catch (err) {
        console.error('getBookingById error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// Helper: Ensure booking exists locally by syncing from Render if needed
const ensureBookingExistsLocally = async (bookingId) => {
    // Check if it was deleted locally
    const deletedCheck = await query('SELECT 1 FROM deleted_booking_ids WHERE booking_id = $1', [parseInt(bookingId)]);
    if (deletedCheck.rows.length) {
        return null;
    }

    const existingRes = await query('SELECT * FROM bookings WHERE id = $1', [bookingId]);
    if (existingRes.rows.length) {
        return existingRes.rows[0];
    }

    // Try fetching single booking directly by ID first
    try {
        const response = await fetch(`https://tapovana.onrender.com/api/bookings/${bookingId}`);
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.booking) {
                const remoteBooking = data.booking;
                const paymentStatus = 'PAID';
                const finalAmount = await applyMembershipDiscount(remoteBooking.user_email || remoteBooking.email, remoteBooking.service_name, remoteBooking.total_amount, remoteBooking.user_name);
                const insertResult = await query(
                    'INSERT INTO bookings (id, user_name, service_name, booking_date, booking_time, therapist_name, note, total_amount, pass_details, payment_status, status, created_at, user_email, profile_pic) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) ON CONFLICT (id) DO NOTHING RETURNING *',
                    [
                        remoteBooking.id, remoteBooking.user_name, remoteBooking.service_name,
                        remoteBooking.booking_date, remoteBooking.booking_time, null,
                        remoteBooking.note, finalAmount, remoteBooking.pass_details,
                        paymentStatus, 'PENDING', remoteBooking.created_at, remoteBooking.user_email || remoteBooking.email || null,
                        remoteBooking.profile_pic || null
                    ]
                );
                if (insertResult.rows.length) {
                    return insertResult.rows[0];
                }
                const fetchAgain = await query('SELECT * FROM bookings WHERE id = $1', [remoteBooking.id]);
                return fetchAgain.rows[0];
            }
        }
    } catch (err) {
        console.error('ensureBookingExistsLocally single fetch error:', err);
    }

    // Fallback to bulk fetch
    try {
        const response = await fetch('https://tapovana.onrender.com/api/bookings?limit=100');
        const data = await response.json();
        if (data.success && data.bookings) {
            const remoteBooking = data.bookings.find(b => String(b.id) === String(bookingId));
            if (remoteBooking) {
                const paymentStatus = 'PAID';
                const finalAmount = await applyMembershipDiscount(remoteBooking.user_email || remoteBooking.email, remoteBooking.service_name, remoteBooking.total_amount, remoteBooking.user_name);
                const insertResult = await query(
                    'INSERT INTO bookings (id, user_name, service_name, booking_date, booking_time, therapist_name, note, total_amount, pass_details, payment_status, status, created_at, user_email, profile_pic) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) ON CONFLICT (id) DO NOTHING RETURNING *',
                    [
                        remoteBooking.id, remoteBooking.user_name, remoteBooking.service_name,
                        remoteBooking.booking_date, remoteBooking.booking_time, null,
                        remoteBooking.note, finalAmount, remoteBooking.pass_details,
                        paymentStatus, 'PENDING', remoteBooking.created_at, remoteBooking.user_email || remoteBooking.email || null,
                        remoteBooking.profile_pic || null
                    ]
                );
                if (insertResult.rows.length) {
                    return insertResult.rows[0];
                }
                const fetchAgain = await query('SELECT * FROM bookings WHERE id = $1', [remoteBooking.id]);
                return fetchAgain.rows[0];
            }
        }
    } catch (err) {
        console.error('ensureBookingExistsLocally bulk fallback error:', err);
    }
    return null;
};

// ─── Helper: sync all allocations for a booking across all staff ───
const syncBookingAllocations = async (bookingId, newStaffIds, newStatus, bookingData, duration) => {
    const sessionTitle = `${bookingData.service_name} - ${bookingData.user_name || 'Guest'}`;

    // Fetch current allocation rows for this booking
    const existingRows = await query(
        `SELECT id, staff_id FROM allocations WHERE session_id = $1 AND type = 'service' AND id LIKE $2`,
        [String(bookingId), `bk-alloc-${bookingId}-%`]
    );
    const existingStaffIds = new Set(existingRows.rows.map(r => String(r.staff_id)));
    const newStaffIdSet = new Set((newStaffIds || []).map(id => String(id)));

    // Compute added and removed
    const addedIds = [...newStaffIdSet].filter(id => !existingStaffIds.has(id));
    const removedIds = [...existingStaffIds].filter(id => !newStaffIdSet.has(id));

    // Determine target allocation status
    let allocStatus = 'active';
    if (newStatus === 'COMPLETED') allocStatus = 'expired';
    if (newStatus === 'CANCELLED') allocStatus = 'cancelled';

    // Delete removed staff rows entirely from allocations
    for (const staffId of removedIds) {
        await query(
            `DELETE FROM allocations WHERE id = $1`,
            [`bk-alloc-${bookingId}-${staffId}`]
        );
    }

    // Insert or update rows for all new staff
    for (const staffId of newStaffIdSet) {
        const allocId = `bk-alloc-${bookingId}-${staffId}`;
        // Upsert: delete existing and re-insert
        await query(`DELETE FROM allocations WHERE id = $1`, [allocId]);
        await query(
            `INSERT INTO allocations (id, staff_id, type, session_title, session_id, start_date, end_date, booking_time, duration_minutes, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
                allocId,
                staffId,
                'service',
                sessionTitle,
                String(bookingId),
                bookingData.booking_date,
                bookingData.booking_date,
                bookingData.booking_time,
                duration,
                allocStatus
            ]
        );
    }

    // If status is CANCELLED or COMPLETED, also update any existing rows not in newStaffIds
    if ((newStatus === 'CANCELLED' || newStatus === 'COMPLETED') && newStaffIdSet.size === 0) {
        // Update all remaining rows for this booking to the terminal status
        await query(
            `UPDATE allocations SET status = $1 WHERE session_id = $2 AND type = 'service' AND id LIKE $3`,
            [allocStatus, String(bookingId), `bk-alloc-${bookingId}-%`]
        );
    }

    return { addedIds, removedIds };
};

// UPDATE BOOKING STATUS
const updateBookingStatus = async (req, res) => {
    // Accept staff_ids (array, preferred) or legacy staff_id (single value)
    const { status, staff_ids, staff_id, note } = req.body;
    const newStatus = status ? status.toUpperCase() : null;

    if (!newStatus || !['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].includes(newStatus)) {
        await logBookingAudit(req.params.id, 'ERROR', null, null, 'Valid status is required.');
        return res.status(400).json({ success: false, message: 'Valid status is required.' });
    }

    // Normalize to array: prefer staff_ids, fall back to staff_id
    let incomingStaffIds = null;
    if (Array.isArray(staff_ids)) {
        incomingStaffIds = staff_ids.filter(Boolean);
    } else if (staff_id !== undefined && staff_id !== null) {
        incomingStaffIds = [staff_id];
    } else if (staff_ids === null || staff_id === null) {
        incomingStaffIds = [];
    }

    try {
        const booking = await ensureBookingExistsLocally(req.params.id);
        if (!booking) {
            await logBookingAudit(req.params.id, 'ERROR', null, null, 'Booking not found.');
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }

        // Run validation helper
        const validation = await validateBookingTransitionAndAllocations(booking, newStatus, incomingStaffIds);
        if (!validation.valid) {
            await logBookingAudit(booking.id, 'ERROR', incomingStaffIds && incomingStaffIds.length ? incomingStaffIds[0] : null, null, validation.message);
            return res.status(400).json({ success: false, message: validation.message, reasonCode: validation.reasonCode });
        }

        const duration = validation.duration;

        // ─── Multi-Staff Allocation Logic (CONFIRMED only) ───────────────────────
        let finalStaffName = booking.therapist_name;
        let finalStaffId = booking.therapist_id;
        let allocDiff = { addedIds: [], removedIds: [] };

        if (newStatus === 'CONFIRMED' && incomingStaffIds !== null) {
            // Fetch all names for display
            const validIncomingStaffIds = incomingStaffIds.filter(isValidUUID);
            const staffNamesRes = await query(
                `SELECT id, first_name, last_name, email FROM team_members WHERE id = ANY($1::uuid[])`,
                [validIncomingStaffIds]
            );
            const staffMap = {};
            for (const row of staffNamesRes.rows) {
                staffMap[row.id] = { name: `${row.first_name} ${row.last_name}`.trim(), email: row.email };
            }

            // Comma-joined names for display in bookings table
            finalStaffName = incomingStaffIds.map(id => staffMap[id]?.name || id).join(', ');
            // First staff ID kept for legacy therapist_id field
            finalStaffId = incomingStaffIds[0];

            // Sync allocations and get diff for notifications
            allocDiff = await syncBookingAllocations(
                booking.id, incomingStaffIds, 'CONFIRMED', booking, duration
            );

            // ── Notify removed staff (Reallocation Notice) ──
            if (!req.body.skip_notify) {
                for (const removedId of allocDiff.removedIds) {
                    const staffInfo = staffMap[removedId];
                    if (!staffInfo) {
                        query('SELECT first_name, last_name, email FROM team_members WHERE id = $1', [removedId])
                            .then(removedRes => {
                                if (removedRes.rows.length) {
                                    const r = removedRes.rows[0];
                                    sendBookingRemovalEmail({
                                        to: r.email,
                                        staffName: `${r.first_name} ${r.last_name}`.trim(),
                                        bookingId: booking.id,
                                        details: { service: booking.service_name, date: booking.booking_date, time: booking.booking_time, customer: booking.user_name }
                                    }).catch(e => console.error('[RemovalEmail] Error:', e));
                                }
                            })
                            .catch(e => console.error('[RemovalEmail] Query error:', e));
                    } else {
                        sendBookingRemovalEmail({
                            to: staffInfo.email,
                            staffName: staffInfo.name,
                            bookingId: booking.id,
                            details: { service: booking.service_name, date: booking.booking_date, time: booking.booking_time, customer: booking.user_name }
                        }).catch(e => console.error('[RemovalEmail] Error:', e));
                    }
                }
            }

            // ── Notify newly added staff (Allocation Email) ──
            if (!req.body.skip_notify) {
                for (const addedId of allocDiff.addedIds) {
                    const staffInfo = staffMap[addedId];
                    if (staffInfo) {
                        sendBookingAllocationEmail({
                            to: staffInfo.email,
                            staffName: staffInfo.name,
                            bookingId: booking.id,
                            details: { service: booking.service_name, date: booking.booking_date, time: booking.booking_time, customer: booking.user_name }
                        }).catch(e => console.error('[AllocationEmail] Error:', e));
                    }
                }
            }

            // Sync each staff's availability_status
            for (const staffId of [...incomingStaffIds, ...allocDiff.removedIds]) {
                await syncStaffMemberStatus(staffId).catch(() => { });
            }

        } else if (newStatus === 'CANCELLED') {
            // Fetch previously allocated staff before deleting
            const allocStaffRows = await query(
                `SELECT staff_id FROM allocations WHERE session_id = $1 AND type = 'service' AND id LIKE $2`,
                [String(booking.id), `bk-alloc-${booking.id}-%`]
            );

            // Delete allocations entirely (Allocation removed)
            await query(
                `DELETE FROM allocations WHERE session_id = $1 AND type = 'service' AND id LIKE $2`,
                [String(booking.id), `bk-alloc-${booking.id}-%`]
            );

            finalStaffId = null;
            finalStaffName = null;

            // Sync any previously allocated staff availability status
            const uniqueStaffIds = new Set(allocStaffRows.rows.map(r => r.staff_id).filter(Boolean));
            if (booking.therapist_id) {
                uniqueStaffIds.add(booking.therapist_id);
            }
            for (const staffId of uniqueStaffIds) {
                await syncStaffMemberStatus(staffId).catch(() => { });
            }

            // Notify staff of cancellation
            if (!req.body.skip_notify) {
                for (const staffId of uniqueStaffIds) {
                    const staffRes = await query('SELECT email, first_name, last_name FROM team_members WHERE id = $1', [staffId]);
                    if (staffRes.rows.length) {
                        const s = staffRes.rows[0];
                        await sendStaffCancellationEmail({
                            to: s.email,
                            staffName: `${s.first_name} ${s.last_name}`.trim(),
                            bookingId: booking.id,
                            details: { service: booking.service_name, date: booking.booking_date, time: booking.booking_time }
                        }).catch(e => console.error('[CancellationEmail] Staff Error:', e));
                    }
                }
            }

        } else if (newStatus === 'COMPLETED') {
            // Mark all existing allocation rows as expired
            await query(
                `UPDATE allocations SET status = 'expired' WHERE session_id = $1 AND type = 'service' AND id LIKE $2`,
                [String(booking.id), `bk-alloc-${booking.id}-%`]
            );

            // Fetch completed staff
            const completedAllocRows = await query(
                `SELECT staff_id FROM allocations WHERE session_id = $1 AND type = 'service' AND id LIKE $2`,
                [String(booking.id), `bk-alloc-${booking.id}-%`]
            );
            const uniqueStaffIds = new Set(completedAllocRows.rows.map(r => r.staff_id).filter(Boolean));
            if (booking.therapist_id) {
                uniqueStaffIds.add(booking.therapist_id);
            }

            for (const staffId of uniqueStaffIds) {
                await syncStaffMemberStatus(staffId).catch(() => { });
            }

            // Send completion email to staff
            if (!req.body.skip_notify) {
                for (const staffId of uniqueStaffIds) {
                    const staffRes = await query('SELECT email, first_name, last_name FROM team_members WHERE id = $1', [staffId]);
                    if (staffRes.rows.length) {
                        const s = staffRes.rows[0];
                        await sendStaffCompletionEmail({
                            to: s.email,
                            staffName: `${s.first_name} ${s.last_name}`.trim(),
                            bookingId: booking.id,
                            details: { service: booking.service_name, date: booking.booking_date, time: booking.booking_time }
                        }).catch(e => console.error('[CompletionEmail] Staff Error:', e));
                    }
                }
            }
        }

        // ─── Persist to bookings table ────────────────────────────────────────────
        const result = await query(
            'UPDATE bookings SET status = $1, therapist_id = $2, therapist_name = $3, note = $4 WHERE id = $5 RETURNING *',
            [newStatus, finalStaffId, finalStaffName, note !== undefined ? note : booking.note, req.params.id]
        );
        const updatedBooking = result.rows[0];

        // Store audit record
        await logBookingAudit(updatedBooking.id, updatedBooking.status, updatedBooking.therapist_id, updatedBooking.therapist_name, updatedBooking.note);

        // ─── Customer email notification ──────────────────────────────────────────
        const userEmail = updatedBooking.user_email || null;
        if (userEmail && booking.status !== newStatus && !req.body.skip_notify) {
            await sendBookingStatusEmail({
                to: userEmail,
                firstName: updatedBooking.user_name || 'Customer',
                status: newStatus,
                details: {
                    service: updatedBooking.service_name,
                    date: updatedBooking.booking_date,
                    time: updatedBooking.booking_time,
                    staff: updatedBooking.therapist_name,
                    customer: updatedBooking.user_name
                }
            }).catch(e => console.error('[UserEmail] Error:', e));
        }

        const enriched = await enrichBookingObject(req, updatedBooking);
        return res.json({ success: true, message: 'Booking status updated.', booking: enriched });
    } catch (err) {
        console.error('updateBookingStatus error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ASSIGN THERAPIST TO BOOKING
const assignTherapist = async (req, res) => {
    const { therapist_id, therapist_name } = req.body;

    try {
        const bookingRes = await query('SELECT * FROM bookings WHERE id = $1', [req.params.id]);
        if (!bookingRes.rows.length) {
            await logBookingAudit(req.params.id, 'ERROR', therapist_id, therapist_name, 'Booking not found.');
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }
        const booking = bookingRes.rows[0];
        if (booking.status === 'COMPLETED' || booking.status === 'CANCELLED') {
            await logBookingAudit(booking.id, 'ERROR', therapist_id, therapist_name, 'Staff allocation cannot be changed for completed or cancelled bookings.');
            return res.status(400).json({ success: false, message: 'Staff allocation cannot be changed for completed or cancelled bookings.' });
        }
        const oldTherapistId = booking.therapist_id;

        let name = therapist_name;
        let staffEmail = null;
        if (therapist_id) {
            const staffRes = await query('SELECT id, first_name, last_name, email FROM team_members WHERE id = $1', [therapist_id]);
            if (staffRes.rows.length) {
                name = (staffRes.rows[0].first_name + ' ' + staffRes.rows[0].last_name).trim();
                staffEmail = staffRes.rows[0].email;
            }
        }

        // Check scheduling conflict if booking is confirmed
        if (therapist_id) {
            const serviceRes = await query('SELECT duration_minutes FROM services WHERE name = $1', [booking.service_name]);
            const duration = serviceRes.rows.length && serviceRes.rows[0].duration_minutes ? serviceRes.rows[0].duration_minutes : 60;

            const conflictCheck = await checkStaffAllocationConflict({
                staffId: therapist_id,
                date: booking.booking_date,
                timeStr: booking.booking_time,
                durationMins: duration,
                type: 'service',
                sessionId: booking.id
            });

            if (conflictCheck.conflict) {
                await logBookingAudit(booking.id, 'ERROR', therapist_id, name, conflictCheck.message || 'Staff allocation failed due to daily limit or package conflict.');
                return res.status(400).json({
                    success: false,
                    message: conflictCheck.message || `Staff allocation failed due to daily limit or package conflict.`
                });
            }
        }

        const result = await query(
            'UPDATE bookings SET therapist_id = $1, therapist_name = $2 WHERE id = $3 RETURNING *',
            [therapist_id || null, name || null, req.params.id]
        );
        const updatedBooking = result.rows[0];

        // Store in the separate booking_status_updates table (Audit log)
        await logBookingAudit(updatedBooking.id, updatedBooking.status, updatedBooking.therapist_id, updatedBooking.therapist_name, 'Therapist assigned.');

        // Sync to allocations table using the multi-staff helper to keep formats consistent
        const serviceRes = await query('SELECT duration_minutes FROM services WHERE name = $1', [updatedBooking.service_name]);
        const duration = serviceRes.rows.length && serviceRes.rows[0].duration_minutes ? serviceRes.rows[0].duration_minutes : 60;
        await syncBookingAllocations(
            updatedBooking.id,
            updatedBooking.therapist_id ? [updatedBooking.therapist_id] : [],
            updatedBooking.status,
            updatedBooking,
            duration
        );

        // Sync team_members table status for both old and new therapist
        if (oldTherapistId) {
            await syncStaffMemberStatus(oldTherapistId);
        }
        if (updatedBooking.therapist_id) {
            await syncStaffMemberStatus(updatedBooking.therapist_id);
        }

        // Notify removed staff (Reallocation Notice)
        if (oldTherapistId && oldTherapistId !== therapist_id && !req.body.skip_notify) {
            const oldStaffRes = await query('SELECT email, first_name, last_name FROM team_members WHERE id = $1', [oldTherapistId]);
            if (oldStaffRes.rows.length && oldStaffRes.rows[0].email) {
                const s = oldStaffRes.rows[0];
                await sendBookingRemovalEmail({
                    to: s.email,
                    staffName: `${s.first_name} ${s.last_name}`.trim(),
                    bookingId: booking.id,
                    details: { service: booking.service_name, date: booking.booking_date, time: booking.booking_time, customer: booking.user_name }
                }).catch(e => console.error('[RemovalEmail] Error:', e));
            }
        }

        // Notify newly added staff (Allocation Email)
        if (therapist_id && therapist_id !== oldTherapistId && staffEmail && !req.body.skip_notify) {
            await sendBookingAllocationEmail({
                to: staffEmail,
                staffName: name,
                bookingId: booking.id,
                details: { service: booking.service_name, date: booking.booking_date, time: booking.booking_time, customer: booking.user_name }
            }).catch(e => console.error('[AllocationEmail] Error:', e));
        }

        // Send reassignment notice to customer
        const userEmail = updatedBooking.user_email || req.body.user_email || null;
        if (userEmail && !req.body.skip_notify) {
            const { sendUserReassignmentEmail } = require('../services/emailService');
            await sendUserReassignmentEmail({
                to: userEmail,
                userName: updatedBooking.user_name || 'Customer',
                details: {
                    service: updatedBooking.service_name,
                    date: updatedBooking.booking_date,
                    time: updatedBooking.booking_time,
                    staff: updatedBooking.therapist_name
                }
            }).catch(e => console.error("Error sending user reassignment email:", e));
        }

        const enriched = await enrichBookingObject(req, updatedBooking);
        return res.json({ success: true, message: 'Therapist assigned.', booking: enriched });
    } catch (err) {
        console.error('assignTherapist error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// SYNC BOOKINGS FROM RENDER API (mobile app data)
const syncFromRender = async (req, res) => {
    try {
        const response = await fetch('https://tapovana.onrender.com/api/bookings?limit=100');
        const data = await response.json();

        if (!data.success || !data.bookings) {
            return res.status(400).json({ success: false, message: 'Failed to fetch from Render API.' });
        }

        let synced = 0;
        for (const booking of data.bookings) {
            // Check if it was deleted locally
            const wasDeleted = await query('SELECT 1 FROM deleted_booking_ids WHERE booking_id = $1', [parseInt(booking.id)]);
            if (wasDeleted.rows.length) continue;

            const existing = await query('SELECT id FROM bookings WHERE id = $1', [booking.id]);
            if (existing.rows.length) continue;

            const paymentStatus = 'PAID';
            const finalAmount = await applyMembershipDiscount(booking.user_email || booking.email, booking.service_name, booking.total_amount, booking.user_name);

            const insertResult = await query(
                'INSERT INTO bookings (id, user_name, service_name, booking_date, booking_time, therapist_name, note, total_amount, pass_details, payment_status, status, created_at, user_email, profile_pic) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *',
                [
                    booking.id, booking.user_name, booking.service_name,
                    booking.booking_date, booking.booking_time, null,
                    booking.note, finalAmount, booking.pass_details,
                    paymentStatus, 'PENDING', booking.created_at, booking.user_email || booking.email || null,
                    booking.profile_pic || null
                ]
            );

            synced++;

            // Try to find user email and send Pending notification
            const newBooking = insertResult.rows[0];
            let userEmail = newBooking.user_email || booking.user_email || booking.email || null;

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

// DELETE BOOKING
const deleteBooking = async (req, res) => {
    try {
        const bookingId = req.params.id;

        // Sync staff status: get allocated staff before deleting allocations
        const staffToSyncRes = await query(
            `SELECT DISTINCT staff_id FROM allocations WHERE session_id = $1 AND type = 'service'`,
            [String(bookingId)]
        );

        // Delete all allocations for this booking
        await query(
            `DELETE FROM allocations WHERE session_id = $1 AND type = 'service'`,
            [String(bookingId)]
        );

        // Update their availability status in team_members
        for (const row of staffToSyncRes.rows) {
            if (row.staff_id) {
                await syncStaffMemberStatus(row.staff_id).catch(() => { });
            }
        }

        // Now delete the booking from the local DB
        await query('DELETE FROM bookings WHERE id = $1', [bookingId]);

        // Mark as deleted in our tracking table to prevent remote app sync resurrection
        await query('INSERT INTO deleted_booking_ids (booking_id) VALUES ($1) ON CONFLICT DO NOTHING', [parseInt(bookingId)]);

        return res.json({ success: true, message: 'Booking deleted successfully.' });
    } catch (err) {
        console.error('deleteBooking error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// NOTIFICATION ONLY ENDPOINT (sends notification emails before DB writes)
const sendBookingNotificationOnly = async (req, res) => {
    const { status, staff_ids, staff_id, note } = req.body;
    const newStatus = status ? status.toUpperCase() : null;

    if (!newStatus || !['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].includes(newStatus)) {
        await logBookingAudit(req.params.id, 'ERROR', null, null, 'Valid status is required.');
        return res.status(400).json({ success: false, message: 'Valid status is required.' });
    }

    // Normalize to array: prefer staff_ids, fall back to staff_id
    let incomingStaffIds = null;
    if (Array.isArray(staff_ids)) {
        incomingStaffIds = staff_ids.filter(Boolean);
    } else if (staff_id !== undefined && staff_id !== null) {
        incomingStaffIds = [staff_id];
    } else if (staff_ids === null || staff_id === null) {
        incomingStaffIds = [];
    }

    try {
        const booking = await ensureBookingExistsLocally(req.params.id);
        if (!booking) {
            await logBookingAudit(req.params.id, 'ERROR', null, null, 'Booking not found.');
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }

        // Run validation helper
        const validation = await validateBookingTransitionAndAllocations(booking, newStatus, incomingStaffIds);
        if (!validation.valid) {
            await logBookingAudit(booking.id, 'ERROR', incomingStaffIds && incomingStaffIds.length ? incomingStaffIds[0] : null, null, validation.message);
            return res.status(400).json({ success: false, message: validation.message, reasonCode: validation.reasonCode });
        }

        // Fetch existing allocations for comparison
        const existingRows = await query(
            `SELECT staff_id FROM allocations WHERE session_id = $1 AND type = 'service' AND id LIKE $2`,
            [String(booking.id), `bk-alloc-${booking.id}-%`]
        );
        const existingStaffIds = new Set(existingRows.rows.map(r => String(r.staff_id)));
        const newStaffIdSet = new Set((incomingStaffIds || []).map(id => String(id)));

        const addedIds = [...newStaffIdSet].filter(id => !existingStaffIds.has(id));
        const removedIds = [...existingStaffIds].filter(id => !newStaffIdSet.has(id));

        // Fetch staff info for notifications
        const staffIdsToFetch = [...new Set([...incomingStaffIds, ...removedIds, booking.therapist_id].filter(Boolean))];
        const validStaffIdsToFetch = staffIdsToFetch.filter(isValidUUID);
        const staffMap = {};
        if (validStaffIdsToFetch.length > 0) {
            const staffNamesRes = await query(
                `SELECT id, first_name, last_name, email FROM team_members WHERE id = ANY($1::uuid[])`,
                [validStaffIdsToFetch]
            );
            for (const row of staffNamesRes.rows) {
                staffMap[row.id] = { name: `${row.first_name} ${row.last_name}`.trim(), email: row.email };
            }
        }

        // 1. Notify removed staff
        for (const removedId of removedIds) {
            const staffInfo = staffMap[removedId];
            if (staffInfo) {
                await sendBookingRemovalEmail({
                    to: staffInfo.email,
                    staffName: staffInfo.name,
                    bookingId: booking.id,
                    details: { service: booking.service_name, date: booking.booking_date, time: booking.booking_time, customer: booking.user_name }
                }).catch(e => console.error('[RemovalEmail] Notify-only error:', e));
            }
        }

        // 2. Notify added staff
        for (const addedId of addedIds) {
            const staffInfo = staffMap[addedId];
            if (staffInfo) {
                await sendBookingAllocationEmail({
                    to: staffInfo.email,
                    staffName: staffInfo.name,
                    bookingId: booking.id,
                    details: { service: booking.service_name, date: booking.booking_date, time: booking.booking_time, customer: booking.user_name }
                }).catch(e => console.error('[AllocationEmail] Notify-only error:', e));
            }
        }

        // 3. Notify customer
        const userEmail = booking.user_email || null;
        if (userEmail && booking.status !== newStatus) {
            const staffNames = incomingStaffIds.map(id => staffMap[id]?.name || id).join(', ');
            await sendBookingStatusEmail({
                to: userEmail,
                firstName: booking.user_name || 'Customer',
                status: newStatus,
                details: {
                    service: booking.service_name,
                    date: booking.booking_date,
                    time: booking.booking_time,
                    staff: staffNames || booking.therapist_name,
                    customer: booking.user_name
                },
                previousStatus: booking.status
            }).catch(e => console.error('[UserEmail] Notify-only error:', e));
        }

        // 4. Staff completion email (if COMPLETED)
        if (newStatus === 'COMPLETED' && booking.status !== 'COMPLETED') {
            const { sendStaffCompletionEmail } = require('../services/emailService');
            for (const row of existingRows.rows) {
                const staffRes = await query('SELECT email, first_name, last_name FROM team_members WHERE id = $1', [row.staff_id]);
                if (staffRes.rows.length) {
                    const s = staffRes.rows[0];
                    await sendStaffCompletionEmail({
                        to: s.email,
                        staffName: `${s.first_name} ${s.last_name}`.trim(),
                        bookingId: booking.id,
                        details: { service: booking.service_name, date: booking.booking_date, time: booking.booking_time }
                    }).catch(e => console.error('[CompletionEmail] Notify-only error:', e));
                }
            }
        }

        // 5. Staff cancellation email (if CANCELLED)
        if (newStatus === 'CANCELLED' && booking.status !== 'CANCELLED') {
            const { sendStaffCancellationEmail } = require('../services/emailService');
            for (const row of existingRows.rows) {
                const staffRes = await query('SELECT email, first_name, last_name FROM team_members WHERE id = $1', [row.staff_id]);
                if (staffRes.rows.length) {
                    const s = staffRes.rows[0];
                    await sendStaffCancellationEmail({
                        to: s.email,
                        staffName: `${s.first_name} ${s.last_name}`.trim(),
                        bookingId: booking.id,
                        details: { service: booking.service_name, date: booking.booking_date, time: booking.booking_time }
                    }).catch(e => console.error('[CancellationEmail] Notify-only error:', e));
                }
            }
        }

        return res.json({ success: true, message: 'Notifications sent successfully.' });
    } catch (err) {
        console.error('sendBookingNotificationOnly error:', err);
        return res.status(500).json({ success: false, message: 'Failed to send notifications.', error: err.message });
    }
};

module.exports = { getAllBookings, getBookingById, updateBookingStatus, assignTherapist, syncFromRender, deleteBooking, sendBookingNotificationOnly, createBooking };