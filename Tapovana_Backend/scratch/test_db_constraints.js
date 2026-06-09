const { query } = require('../src/config/db');

async function test() {
    try {
        console.log('Testing setting availability_status to "On Leave" on a team member...');
        // Find one team member
        const memberRes = await query('SELECT id, availability_status FROM team_members LIMIT 1');
        if (!memberRes.rows.length) {
            console.log('No team members found to test.');
            process.exit(0);
        }
        const memberId = memberRes.rows[0].id;
        const originalStatus = memberRes.rows[0].availability_status;
        console.log(`Found member ID ${memberId} with original availability_status: ${originalStatus}`);

        // Try setting to 'On Leave'
        await query('UPDATE team_members SET availability_status = $1 WHERE id = $2', ['On Leave', memberId]);
        console.log('✅ Successfully updated to "On Leave" without constraint error!');

        // Revert to original
        await query('UPDATE team_members SET availability_status = $1 WHERE id = $2', [originalStatus, memberId]);
        console.log('✅ Successfully reverted to original status.');
    } catch (err) {
        console.error('❌ Database query failed:', err);
    }
    process.exit(0);
}

test();
