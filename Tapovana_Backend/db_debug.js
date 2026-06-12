const { query, pool } = require('./src/config/db');

async function debug() {
    try {
        console.log('--- ALL ROLES ---');
        const roles = await query('SELECT * FROM roles');
        console.log(roles.rows);

        console.log('\n--- ALL TEAM MEMBERS WITH ROLES ---');
        const members = await query('SELECT tm.first_name, tm.last_name, r.name AS role FROM team_members tm JOIN roles r ON r.id = tm.role_id');
        console.log(members.rows);
    } catch (err) {
        console.error('Error running debug:', err);
    } finally {
        await pool.end();
    }
}

debug();
