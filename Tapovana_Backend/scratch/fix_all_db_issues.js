const { Client } = require('pg');

const c = new Client({
  connectionString: 'postgresql://neondb_owner:npg_9J7lqUbeAarM@ep-cold-snow-axc6fc35-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function safeQuery(sql, label) {
  try {
    await c.query(sql);
    console.log(`✅ ${label}`);
  } catch (err) {
    if (err.code === '42701' || err.code === '42P07' || err.code === '42710') {
      console.log(`⏭️ ${label} (already exists)`);
    } else {
      console.log(`⚠️ ${label}: ${err.message}`);
    }
  }
}

async function main() {
  await c.connect();
  await c.query('SET search_path TO public;');
  console.log('Connected to Neon Postgres DB!\n');

  // 1. Fix CUSTOMERS table columns
  console.log('=== FIXING CUSTOMERS TABLE ===');
  await safeQuery(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_id VARCHAR(30) UNIQUE`, 'customers.customer_id');
  await safeQuery(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS first_name VARCHAR(100)`, 'customers.first_name');
  await safeQuery(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_name VARCHAR(100)`, 'customers.last_name');
  await safeQuery(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ACTIVE'`, 'customers.status');
  await safeQuery(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS membership_status VARCHAR(20) DEFAULT 'NONE'`, 'customers.membership_status');
  await safeQuery(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_bookings INTEGER DEFAULT 0`, 'customers.total_bookings');
  await safeQuery(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_spent NUMERIC(12,2) DEFAULT 0`, 'customers.total_spent');
  await safeQuery(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS join_date DATE DEFAULT CURRENT_DATE`, 'customers.join_date');
  await safeQuery(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_activity TIMESTAMPTZ DEFAULT NOW()`, 'customers.last_activity');
  await safeQuery(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS admin_notes TEXT DEFAULT ''`, 'customers.admin_notes');
  await safeQuery(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS avatar_url TEXT`, 'customers.avatar_url');
  await safeQuery(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS city VARCHAR(100)`, 'customers.city');
  await safeQuery(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS state VARCHAR(100)`, 'customers.state');
  await safeQuery(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS pincode VARCHAR(10)`, 'customers.pincode');
  await safeQuery(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS date_of_birth DATE`, 'customers.date_of_birth');
  await safeQuery(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS gender VARCHAR(20)`, 'customers.gender');

  // 2. Fix TRANSACTIONS table columns
  console.log('\n=== FIXING TRANSACTIONS TABLE ===');
  await safeQuery(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(30) UNIQUE`, 'transactions.transaction_id');
  await safeQuery(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS booking_id VARCHAR(30)`, 'transactions.booking_id');
  await safeQuery(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS customer_name VARCHAR(200)`, 'transactions.customer_name');
  await safeQuery(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'INR'`, 'transactions.currency');
  await safeQuery(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'PENDING'`, 'transactions.status');
  await safeQuery(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payment_method VARCHAR(30)`, 'transactions.payment_method');
  await safeQuery(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payment_gateway VARCHAR(30)`, 'transactions.payment_gateway');
  await safeQuery(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS gateway_transaction_id VARCHAR(100)`, 'transactions.gateway_transaction_id');
  await safeQuery(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS receipt_url TEXT`, 'transactions.receipt_url');
  await safeQuery(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(12,2) DEFAULT 0`, 'transactions.refund_amount');
  await safeQuery(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS refund_reason TEXT`, 'transactions.refund_reason');
  await safeQuery(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ`, 'transactions.refunded_at');

  // 3. Create missing BLOG CMS tables
  console.log('\n=== CREATING BLOG TABLES ===');
  await safeQuery(`
    CREATE TABLE IF NOT EXISTS blog_comments (
      id SERIAL PRIMARY KEY,
      blog_id INTEGER NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
      author_name VARCHAR(100) NOT NULL,
      author_email VARCHAR(255),
      content TEXT NOT NULL,
      status VARCHAR(20) DEFAULT 'approved',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `, 'blog_comments table');

  await safeQuery(`
    CREATE TABLE IF NOT EXISTS blog_likes (
      id SERIAL PRIMARY KEY,
      blog_id INTEGER NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
      ip_address VARCHAR(45),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `, 'blog_likes table');

  await safeQuery(`
    CREATE TABLE IF NOT EXISTS blog_bookmarks (
      id SERIAL PRIMARY KEY,
      blog_id INTEGER NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
      user_id UUID REFERENCES team_members(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `, 'blog_bookmarks table');

  await safeQuery(`
    CREATE TABLE IF NOT EXISTS blog_views (
      id SERIAL PRIMARY KEY,
      blog_id INTEGER NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
      ip_address VARCHAR(45),
      viewed_at TIMESTAMPTZ DEFAULT NOW()
    );
  `, 'blog_views table');

  // 4. Create missing VEDIC PROGRAM STAFF table
  console.log('\n=== CREATING VEDIC PROGRAM STAFF TABLE ===');
  await safeQuery(`
    CREATE TABLE IF NOT EXISTS vedic_program_staff (
      id SERIAL PRIMARY KEY,
      program_id INTEGER NOT NULL REFERENCES vedic_programs(id) ON DELETE CASCADE,
      staff_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
      role_in_program VARCHAR(50) DEFAULT 'Staff',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(program_id, staff_id)
    );
  `, 'vedic_program_staff table');

  // 5. Create HOME DASHBOARD SNAPSHOTS table
  console.log('\n=== CREATING HOME DASHBOARD SNAPSHOTS TABLE ===');
  await safeQuery(`
    CREATE TABLE IF NOT EXISTS home_dashboard_snapshots (
      id SERIAL PRIMARY KEY,
      total_customers INTEGER DEFAULT 0,
      active_customers INTEGER DEFAULT 0,
      total_transactions INTEGER DEFAULT 0,
      total_revenue NUMERIC(14,2) DEFAULT 0,
      pending_amount NUMERIC(14,2) DEFAULT 0,
      refunded_amount NUMERIC(14,2) DEFAULT 0,
      failed_amount NUMERIC(14,2) DEFAULT 0,
      total_services INTEGER DEFAULT 0,
      active_bookings INTEGER DEFAULT 0,
      published_blogs INTEGER DEFAULT 0,
      snapshot_date DATE DEFAULT CURRENT_DATE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `, 'home_dashboard_snapshots table');

  await c.end();
  console.log('\n🎉 Database Schema Fix Completed!');
}

main().catch(err => { console.error('Error during schema fix:', err); process.exit(1); });
