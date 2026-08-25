const { query } = require('../src/config/db');

async function run() {
    try {
        console.log('Running v33 migration (Fix allocations updated_at column & exception-safe trigger)...');

        // 1. Add updated_at to allocations table if missing
        await query(`
            ALTER TABLE allocations 
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
        `);
        console.log('✅ Column updated_at added/verified on allocations table.');

        // 2. Exception-safe set_updated_at function
        await query(`
            CREATE OR REPLACE FUNCTION set_updated_at()
            RETURNS TRIGGER AS $$
            BEGIN
              BEGIN
                NEW.updated_at = NOW();
              EXCEPTION WHEN OTHERS THEN
                -- Ignore if table does not have updated_at column
              END;
              RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);
        console.log('✅ Exception-safe set_updated_at() trigger function updated.');

        // 3. Register trigger on allocations
        await query(`
            DROP TRIGGER IF EXISTS trg_allocations_updated ON allocations;
            CREATE TRIGGER trg_allocations_updated
            BEFORE UPDATE ON allocations
            FOR EACH ROW
            EXECUTE FUNCTION set_updated_at();
        `);
        console.log('✅ trg_allocations_updated trigger verified.');

        console.log('🎉 v33 migration complete!');
        process.exit(0);
    } catch (err) {
        console.error('❌ v33 migration error:', err);
        process.exit(1);
    }
}

run();
