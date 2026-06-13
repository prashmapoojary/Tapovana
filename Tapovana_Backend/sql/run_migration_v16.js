const { query, pool } = require('../src/config/db');

async function run() {
    try {
        console.log('Running v16 migration (Vedic Program Staff junction table, status alters)...');

        // 1. Create junction table vedic_program_staff
        await query(`
            CREATE TABLE IF NOT EXISTS vedic_program_staff (
                id               SERIAL PRIMARY KEY,
                program_id       INTEGER NOT NULL REFERENCES vedic_programs(id) ON DELETE CASCADE,
                staff_id         UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
                role             VARCHAR(50) NOT NULL CHECK (role IN ('lead_consultant', 'assigned_staff')),
                assigned_at      TIMESTAMPTZ DEFAULT NOW(),
                assigned_by      UUID REFERENCES team_members(id) ON DELETE SET NULL,
                UNIQUE(program_id, staff_id)
            );
        `);
        console.log('✅ vedic_program_staff junction table verified/created');

        // 2. Rename consultant_id to lead_consultant_id in vedic_programs
        const colCheck = await query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'vedic_programs' AND column_name = 'consultant_id'
        `);
        if (colCheck.rows.length > 0) {
            await query(`
                ALTER TABLE vedic_programs RENAME COLUMN consultant_id TO lead_consultant_id;
            `);
            console.log('✅ Renamed consultant_id to lead_consultant_id');
        } else {
            console.log('ℹ️ consultant_id already renamed or does not exist');
        }

        // 3. Add status column to vedic_programs
        await query(`
            ALTER TABLE vedic_programs ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Upcoming';
        `);
        console.log('✅ status column verified/added to vedic_programs');

        // Drop check constraint if exists and re-add
        await query(`
            ALTER TABLE vedic_programs DROP CONSTRAINT IF EXISTS vedic_programs_status_check;
        `);
        await query(`
            ALTER TABLE vedic_programs ADD CONSTRAINT vedic_programs_status_check CHECK (status IN ('Upcoming', 'Live', 'Completed', 'Cancelled'));
        `);
        console.log('✅ status constraint added to vedic_programs');

        // 4. Update existing allocations table status checks
        await query(`
            ALTER TABLE allocations DROP CONSTRAINT IF EXISTS allocations_status_check;
        `);
        await query(`
            ALTER TABLE allocations ADD CONSTRAINT allocations_status_check CHECK (status IN (
                'active', 'expired', 'cancelled', 'removed', 'pending',
                'Upcoming', 'Live', 'Completed', 'Cancelled',
                'upcoming', 'live', 'completed', 'cancelled'
            ));
        `);
        console.log('✅ allocations check constraint verified');

        // 5. Add checked_in_at to vedic_program_attendees
        await query(`
            ALTER TABLE vedic_program_attendees ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;
        `);
        console.log('✅ checked_in_at column verified/added to vedic_program_attendees');

        // 6. Update status constraint in vedic_program_attendees
        await query(`
            ALTER TABLE vedic_program_attendees DROP CONSTRAINT IF EXISTS vedic_program_attendees_status_check;
        `);
        
        // Temporarily change default and update old status
        await query(`
            ALTER TABLE vedic_program_attendees ALTER COLUMN status SET DEFAULT 'registered';
        `);
        await query(`
            UPDATE vedic_program_attendees SET status = 'registered' WHERE status = 'enrolled';
        `);
        
        // Add new check constraint
        await query(`
            ALTER TABLE vedic_program_attendees ADD CONSTRAINT vedic_program_attendees_status_check CHECK (status IN ('registered', 'confirmed', 'checked_in', 'attended', 'absent', 'cancelled'));
        `);
        console.log('✅ Status check constraint updated on vedic_program_attendees');

        // Migrate existing consultant_id fields from vedic_programs to vedic_program_staff junction table as lead_consultant
        const existingPrograms = await query('SELECT id, lead_consultant_id FROM vedic_programs');
        for (const p of existingPrograms.rows) {
            if (p.lead_consultant_id) {
                await query(`
                    INSERT INTO vedic_program_staff (program_id, staff_id, role)
                    VALUES ($1, $2, 'lead_consultant')
                    ON CONFLICT (program_id, staff_id) DO UPDATE SET role = EXCLUDED.role
                `, [p.id, p.lead_consultant_id]);
            }
        }
        console.log('✅ Migrated existing consultant_id values to junction table');

        console.log('🟢 v16 migration completed successfully.');
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

run();
