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
      ALTER TABLE team_members ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;
      
      -- Remove existing check constraint if it exists to prevent errors on recreate
      DO $$
      BEGIN
        ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_profile_photo_source_check;
      EXCEPTION
        WHEN undefined_object THEN NULL;
      END $$;

      ALTER TABLE team_members ADD COLUMN IF NOT EXISTS profile_photo_source VARCHAR(20) DEFAULT 'default';
      ALTER TABLE team_members ADD CONSTRAINT team_members_profile_photo_source_check 
        CHECK (profile_photo_source IN ('local', 'upload', 'default'));

      DO $$
      BEGIN
        ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_availability_status_check;
      EXCEPTION
        WHEN undefined_object THEN NULL;
      END $$;

      ALTER TABLE team_members ADD COLUMN IF NOT EXISTS availability_status VARCHAR(20) DEFAULT 'Available';
      ALTER TABLE team_members ADD CONSTRAINT team_members_availability_status_check 
        CHECK (availability_status IN ('Available', 'Allocated'));

      ALTER TABLE team_members ADD COLUMN IF NOT EXISTS allocation_details JSONB DEFAULT NULL;

      -- Backfill profile_photo_url from avatar_url if avatar_url is set
      UPDATE team_members 
      SET profile_photo_url = avatar_url, profile_photo_source = 'upload' 
      WHERE avatar_url IS NOT NULL AND profile_photo_url IS NULL;
    `);

    console.log('✅ Database schema updated successfully.');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
