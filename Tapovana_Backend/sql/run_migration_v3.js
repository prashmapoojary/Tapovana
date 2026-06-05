const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to database. Running workshop schema...');

        await client.query(`
      CREATE TABLE IF NOT EXISTS workshops (
        id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title                VARCHAR(255) NOT NULL,
        category             VARCHAR(50),
        instructor           VARCHAR(255),
        date                 DATE,
        time                 VARCHAR(20),
        duration             INTEGER,
        capacity             INTEGER DEFAULT 20,
        enrolled             INTEGER DEFAULT 0,
        price                DECIMAL(10,2),
        status               VARCHAR(20) DEFAULT 'upcoming'
                               CHECK (status IN ('upcoming','ongoing','full','completed')),
        description          TEXT,
        image_url            TEXT,
        assigned_staff_ids   JSONB DEFAULT '[]',
        created_by           UUID REFERENCES team_members(id) ON DELETE SET NULL,
        created_at           TIMESTAMPTZ DEFAULT NOW(),
        updated_at           TIMESTAMPTZ DEFAULT NOW()
      );
    `);
        console.log('✅ workshops table created');

        await client.query(`
      CREATE INDEX IF NOT EXISTS idx_workshops_category ON workshops(category);
    `);
        await client.query(`
      CREATE INDEX IF NOT EXISTS idx_workshops_status ON workshops(status);
    `);
        console.log('✅ indexes created');

        await client.query(`
      DROP TRIGGER IF EXISTS trg_workshops_updated ON workshops;
    `);
        await client.query(`
      CREATE TRIGGER trg_workshops_updated
        BEFORE UPDATE ON workshops
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    `);
        console.log('✅ trigger created');

        console.log('✅ Workshop schema applied successfully.');
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

run();