const { query, pool } = require('./src/config/db');

async function run() {
    try {
        console.log('1. Querying created_by in workshops...');
        const wsRes = await query('SELECT DISTINCT created_by FROM workshops');
        console.log('Distinct created_by values:', wsRes.rows);

        console.log('\n2. Querying IDs in team_members...');
        const tmRes = await query('SELECT id, first_name, last_name, email FROM team_members');
        console.log('Team members:', tmRes.rows);

        console.log('\n3. Testing simple join query...');
        const joinRes = await query(
            'SELECT w.id, w.title, w.created_by, tm.first_name FROM workshops w LEFT JOIN team_members tm ON tm.id = w.created_by LIMIT 2'
        );
        console.log('Simple Join succeeds! Rows:', joinRes.rows);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

run();
