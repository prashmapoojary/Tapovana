const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to database. Running membership migration...');

        await client.query(`
      CREATE TABLE IF NOT EXISTS membership_tiers (
        id          SERIAL PRIMARY KEY,
        name        VARCHAR(20) NOT NULL UNIQUE CHECK (name IN ('SILVER','GOLD','PLATINUM')),
        label       VARCHAR(50) NOT NULL,
        price       DECIMAL(10,2) DEFAULT 0,
        benefits    JSONB DEFAULT '[]',
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        updated_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);
        console.log('✅ membership_tiers table created');

        await client.query(`
      INSERT INTO membership_tiers (name, label, price, benefits) VALUES
        ('SILVER', 'Silver', 1999, '["15% discount on services", "Priority booking", "Monthly wellness consult"]'),
        ('GOLD', 'Gold', 3999, '["25% discount on services", "2 free sessions/mo", "Dedicated advisor"]'),
        ('PLATINUM', 'Platinum', 7999, '["40% discount on services", "24/7 support & care", "Annual wellness retreat"]')
      ON CONFLICT (name) DO NOTHING;
    `);
        console.log('✅ default tiers seeded');

        await client.query(`
      CREATE TABLE IF NOT EXISTS memberships (
        id                SERIAL PRIMARY KEY,
        name              VARCHAR(255) NOT NULL,
        email             VARCHAR(255),
        phone             VARCHAR(20),
        tier              VARCHAR(20) NOT NULL DEFAULT 'SILVER'
                          CHECK (tier IN ('SILVER','GOLD','PLATINUM')),
        join_date         DATE DEFAULT CURRENT_DATE,
        expiry_date       DATE,
        sessions          INTEGER DEFAULT 0,
        total_spent       DECIMAL(10,2) DEFAULT 0,
        status            VARCHAR(20) DEFAULT 'pending'
                          CHECK (status IN ('pending','active','inactive','expired')),
        profile_photo_url TEXT,
        created_by        UUID REFERENCES team_members(id) ON DELETE SET NULL,
        created_at        TIMESTAMPTZ DEFAULT NOW(),
        updated_at        TIMESTAMPTZ DEFAULT NOW()
      );
    `);
        console.log('✅ memberships table created');

        await client.query('CREATE INDEX IF NOT EXISTS idx_memberships_email ON memberships(email);');
        await client.query('CREATE INDEX IF NOT EXISTS idx_memberships_tier ON memberships(tier);');
        await client.query('CREATE INDEX IF NOT EXISTS idx_memberships_status ON memberships(status);');
        console.log('✅ indexes created');

        await client.query('DROP TRIGGER IF EXISTS trg_memberships_updated ON memberships;');
        await client.query('CREATE TRIGGER trg_memberships_updated BEFORE UPDATE ON memberships FOR EACH ROW EXECUTE FUNCTION set_updated_at();');

        await client.query('DROP TRIGGER IF EXISTS trg_membership_tiers_updated ON membership_tiers;');
        await client.query('CREATE TRIGGER trg_membership_tiers_updated BEFORE UPDATE ON membership_tiers FOR EACH ROW EXECUTE FUNCTION set_updated_at();');
        console.log('✅ triggers created');

        console.log('✅ Membership schema applied successfully.');
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

run();