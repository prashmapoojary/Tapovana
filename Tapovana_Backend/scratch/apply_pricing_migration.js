const { pool } = require('../src/config/db');

async function applyMigrations() {
  console.log('=== APPLYING PRICING & DISCOUNT SCHEMA MIGRATIONS ===\n');

  // 1. membership_tiers table
  await pool.query(`
    ALTER TABLE membership_tiers ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC DEFAULT 0;
  `);
  await pool.query(`UPDATE membership_tiers SET discount_percentage = 15 WHERE UPPER(name) = 'SILVER'`);
  await pool.query(`UPDATE membership_tiers SET discount_percentage = 25 WHERE UPPER(name) = 'GOLD'`);
  await pool.query(`UPDATE membership_tiers SET discount_percentage = 40 WHERE UPPER(name) = 'PLATINUM'`);
  console.log('✅ membership_tiers schema updated with discount_percentage!');

  // 2. bookings table
  await pool.query(`
    ALTER TABLE bookings 
    ADD COLUMN IF NOT EXISTS original_price VARCHAR(100),
    ADD COLUMN IF NOT EXISTS discount_amount VARCHAR(100),
    ADD COLUMN IF NOT EXISTS membership_tier VARCHAR(50),
    ADD COLUMN IF NOT EXISTS final_price VARCHAR(100);
  `);
  console.log('✅ bookings schema updated with original_price, discount_amount, membership_tier, final_price!');

  // 3. attendees table (Workshop Attendees)
  await pool.query(`
    ALTER TABLE attendees 
    ADD COLUMN IF NOT EXISTS original_price VARCHAR(100),
    ADD COLUMN IF NOT EXISTS discount_amount VARCHAR(100),
    ADD COLUMN IF NOT EXISTS membership_tier VARCHAR(50),
    ADD COLUMN IF NOT EXISTS final_price VARCHAR(100);
  `);
  console.log('✅ attendees schema updated with original_price, discount_amount, membership_tier, final_price!');

  // 4. vedic_attendees table (Vedic Life Attendees)
  await pool.query(`
    ALTER TABLE vedic_attendees 
    ADD COLUMN IF NOT EXISTS original_price VARCHAR(100),
    ADD COLUMN IF NOT EXISTS discount_amount VARCHAR(100),
    ADD COLUMN IF NOT EXISTS membership_tier VARCHAR(50),
    ADD COLUMN IF NOT EXISTS final_price VARCHAR(100);
  `);
  console.log('✅ vedic_attendees schema updated with original_price, discount_amount, membership_tier, final_price!');

  console.log('\n🎉 ALL DATABASE SCHEMA MIGRATIONS COMPLETED SUCCESSFULLY!');
  process.exit(0);
}

applyMigrations().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
