const { query } = require('../src/config/db');
const jwt = require('jsonwebtoken');
const http = require('http');
require('dotenv').config();

const PORT = 5000;
const BASE_URL = `http://localhost:${PORT}`;

async function runTests() {
    console.log('=== STARTING END-TO-END VEDIC ATTENDEE TESTS ===');
    
    // 1. Fetch a SUPER_ADMIN or CO_ADMIN user from team_members
    const userRes = await query(`
        SELECT tm.id, tm.email, r.name AS role 
        FROM team_members tm 
        JOIN roles r ON r.id = tm.role_id 
        WHERE r.name IN ('SUPER_ADMIN', 'CO_ADMIN') AND tm.status = 'active'
        LIMIT 1
    `);
    
    if (!userRes.rows.length) {
        console.error('❌ No active SUPER_ADMIN or CO_ADMIN found in database.');
        process.exit(1);
    }
    
    const admin = userRes.rows[0];
    console.log(`Using admin: ${admin.email} (Role: ${admin.role})`);
    
    // 2. Generate a JWT token for this admin
    const token = jwt.sign({ sub: admin.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const authHeader = `Bearer ${token}`;

    // 3. Fetch an upcoming program ID
    const progRes = await query(`
        SELECT id, title, enrolled, capacity 
        FROM vedic_programs 
        WHERE status = 'Upcoming'
        LIMIT 1
    `);

    if (!progRes.rows.length) {
        console.error('❌ No upcoming Vedic programs found in database to run tests against.');
        process.exit(1);
    }

    const program = progRes.rows[0];
    console.log(`Using program: "${program.title}" (ID: ${program.id}, Enrolled: ${program.enrolled}/${program.capacity})`);

    // Helper function to send requests
    const sendRequest = (method, path, body) => new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : '';
        const options = {
            hostname: 'localhost',
            port: PORT,
            path: path,
            method: method,
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
        });

        req.on('error', err => reject(err));
        if (payload) req.write(payload);
        req.end();
    });

    let testAttendeeId = null;

    // Test Case 1: Valid Manual Enrollment (POST /api/vedic-programs/attendees)
    console.log('\n--- Test Case 1: Valid Enrollment (POST /api/vedic-programs/attendees) ---');
    const enrollPayload = {
        programId: program.id,
        name: "Test Attendee",
        email: "test.attendee@example.com",
        phone: "1234567890",
        accommodationType: "Double Room Stay",
        paymentStatus: "PENDING",
        checkInDate: "2026-10-01",
        checkOutDate: "2026-10-07"
    };

    try {
        // Clean up any old duplicate test attendee first to avoid conflict error
        await query(`DELETE FROM vedic_attendees WHERE email = 'test.attendee@example.com' AND program_id = $1`, [program.id]);
        
        const res = await sendRequest('POST', '/api/vedic-programs/attendees', enrollPayload);
        console.log('Status Code:', res.status);
        console.log('Response Body:', res.body);
        
        if (res.status === 201 && res.body.success) {
            console.log('✅ Test Case 1 Passed!');
            testAttendeeId = res.body.attendee.id;
        } else {
            console.log('❌ Test Case 1 Failed!');
        }
    } catch (err) {
        console.error('Test Case 1 Error:', err.message);
    }

    // Test Case 2: Validation Errors (POST /api/vedic-programs/attendees)
    console.log('\n--- Test Case 2: Strict Validations (Invalid Inputs) ---');
    const invalidPayloads = [
        {
            label: "Invalid Email suffix (must end in .com)",
            payload: { ...enrollPayload, email: "test@example.org" }
        },
        {
            label: "Name containing numbers",
            payload: { ...enrollPayload, name: "John123" }
        },
        {
            label: "Phone not exactly 10 digits",
            payload: { ...enrollPayload, phone: "12345" }
        },
        {
            label: "Checkout date before checkin date",
            payload: { ...enrollPayload, checkInDate: "2026-10-05", checkOutDate: "2026-10-02" }
        },
        {
            label: "Checkin date in the past",
            payload: { ...enrollPayload, checkInDate: "2024-01-01" }
        }
    ];

    for (const test of invalidPayloads) {
        console.log(`Testing constraint: ${test.label}...`);
        try {
            const res = await sendRequest('POST', '/api/vedic-programs/attendees', test.payload);
            console.log('Status Code:', res.status, '| Success:', res.body.success, '| Message:', res.body.message);
            if (res.status === 400 && !res.body.success) {
                console.log(`✅ Passed: Correctly blocked with 400 Bad Request`);
            } else {
                console.log(`❌ Failed: Allowed invalid request!`);
            }
        } catch (err) {
            console.error('Request Error:', err.message);
        }
    }

    if (!testAttendeeId) {
        console.error('❌ Cannot run update/delete tests without a valid testAttendeeId.');
        process.exit(1);
    }

    // Test Case 3: Update Status (PATCH /api/vedic-programs/attendees/:id/status)
    console.log('\n--- Test Case 3: Update Status (PATCH /api/vedic-programs/attendees/:id/status) ---');
    try {
        const res = await sendRequest('PATCH', `/api/vedic-programs/attendees/${testAttendeeId}/status`, { status: "CONFIRMED" });
        console.log('Status Code:', res.status);
        console.log('Response Body:', res.body);
        if (res.status === 200 && res.body.success && res.body.attendee.status === 'CONFIRMED') {
            console.log('✅ Test Case 3 Passed!');
        } else {
            console.log('❌ Test Case 3 Failed!');
        }
    } catch (err) {
        console.error('Test Case 3 Error:', err.message);
    }

    // Test Case 4: General Attendee Patch (PATCH /api/vedic-programs/attendees/:id)
    console.log('\n--- Test Case 4: General Attendee Details Update (PATCH /api/vedic-programs/attendees/:id) ---');
    try {
        const res = await sendRequest('PATCH', `/api/vedic-programs/attendees/${testAttendeeId}`, {
            accommodationType: "VIP Suite Stay",
            paymentStatus: "PAID"
        });
        console.log('Status Code:', res.status);
        console.log('Response Body:', res.body);
        if (res.status === 200 && res.body.success && res.body.attendee.accommodation_type === 'VIP Suite Stay' && res.body.attendee.payment_status === 'PAID') {
            console.log('✅ Test Case 4 Passed!');
        } else {
            console.log('❌ Test Case 4 Failed!');
        }
    } catch (err) {
        console.error('Test Case 4 Error:', err.message);
    }

    // Test Case 5: Delete Attendee (DELETE /api/vedic-programs/attendees/:id)
    console.log('\n--- Test Case 5: Delete Attendee (DELETE /api/vedic-programs/attendees/:id) ---');
    try {
        const res = await sendRequest('DELETE', `/api/vedic-programs/attendees/${testAttendeeId}`);
        console.log('Status Code:', res.status);
        console.log('Response Body:', res.body);
        if (res.status === 200 && res.body.success) {
            console.log('✅ Test Case 5 Passed!');
        } else {
            console.log('❌ Test Case 5 Failed!');
        }
    } catch (err) {
        console.error('Test Case 5 Error:', err.message);
    }

    console.log('\n=== ALL END-TO-END VEDIC ATTENDEE TESTS COMPLETED ===');
    process.exit(0);
}

runTests().catch(err => {
    console.error('E2E script crashed:', err);
    process.exit(1);
});
