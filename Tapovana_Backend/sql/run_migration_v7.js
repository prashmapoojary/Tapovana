const { query, pool } = require('../src/config/db');

async function run() {
    try {
        console.log('Running v7 migration (leaves and availability_status constraint updates)...');

        // Drop the old availability_status CHECK constraint
        await query(`
            ALTER TABLE team_members 
            DROP CONSTRAINT IF EXISTS team_members_availability_status_check;
        `);

        // Add the new availability_status CHECK constraint including 'On Leave'
        await query(`
            ALTER TABLE team_members 
            ADD CONSTRAINT team_members_availability_status_check 
            CHECK (availability_status IN ('Available', 'Allocated', 'On Leave'));
        `);
        console.log('✅ team_members availability_status constraint updated');

        // Create leaves table
        await query(`
            CREATE TABLE IF NOT EXISTS leaves (
                id          SERIAL PRIMARY KEY,
                staff_id    UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
                start_date  DATE NOT NULL,
                end_date    DATE NOT NULL,
                reason      VARCHAR(255),
                status      VARCHAR(20) DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
                created_at  TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log('✅ leaves table verified/created');

        // Add indexes for optimization
        await query(`
            CREATE INDEX IF NOT EXISTS idx_leaves_staff_dates ON leaves(staff_id, start_date, end_date);
        `);
        console.log('✅ indexes verified/created');

        console.log('🟢 v7 migration completed successfully.');
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

run();
