const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to database. Running schema additions...');

        await client.query(`
      CREATE TABLE IF NOT EXISTS services (
        id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name                 VARCHAR(255) NOT NULL,
        category             VARCHAR(100),
        subcategory          VARCHAR(100),
        description          TEXT,
        base_price           DECIMAL(10,2),
        duration_minutes     INTEGER,
        benefits             TEXT,
        required_certification TEXT,
        experience_level     VARCHAR(100),
        tools                TEXT,
        image_url            TEXT,
        status               VARCHAR(20) DEFAULT 'ACTIVE'
                               CHECK (status IN ('ACTIVE','DRAFT','ARCHIVED')),
        assigned_staff_ids   JSONB DEFAULT '[]',
        created_by           UUID REFERENCES team_members(id) ON DELETE SET NULL,
        created_at           TIMESTAMPTZ DEFAULT NOW(),
        updated_at           TIMESTAMPTZ DEFAULT NOW()
      );
    `);
        console.log('✅ services table created');

        await client.query(`
      CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
    `);
        await client.query(`
      CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);
    `);
        console.log('✅ indexes created');

        // Drop trigger first if exists, then create
        await client.query(`
      DROP TRIGGER IF EXISTS trg_services_updated ON services;
    `);
        await client.query(`
      CREATE TRIGGER trg_services_updated
        BEFORE UPDATE ON services
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    `);
        console.log('✅ trigger created');

        console.log('✅ All service schema additions applied successfully.');
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

run();