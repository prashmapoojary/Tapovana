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
  console.log('Connected!\n');

  // 1. Add missing columns to vedic_programs
  console.log('=== FIXING vedic_programs ===');
  await safeQuery(`ALTER TABLE vedic_programs ADD COLUMN IF NOT EXISTS lead_consultant_id UUID REFERENCES team_members(id) ON DELETE SET NULL`, 'lead_consultant_id column');
  await safeQuery(`ALTER TABLE vedic_programs ADD COLUMN IF NOT EXISTS assigned_staff_ids JSONB DEFAULT '[]'`, 'assigned_staff_ids column');
  await safeQuery(`ALTER TABLE vedic_programs ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Upcoming'`, 'status column');
  // Copy consultant_id data to lead_consultant_id if not null
  await safeQuery(`UPDATE vedic_programs SET lead_consultant_id = consultant_id WHERE lead_consultant_id IS NULL AND consultant_id IS NOT NULL`, 'migrate consultant_id to lead_consultant_id');

  // 2. Add missing columns to workshops
  console.log('\n=== FIXING workshops ===');
  await safeQuery(`ALTER TABLE workshops ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ`, 'start_time column');
  await safeQuery(`ALTER TABLE workshops ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ`, 'end_time column');
  await safeQuery(`ALTER TABLE workshops ADD COLUMN IF NOT EXISTS completed_notified BOOLEAN DEFAULT FALSE`, 'completed_notified column');
  await safeQuery(`ALTER TABLE workshops ADD COLUMN IF NOT EXISTS customer_email TEXT`, 'customer_email column');

  // 3. Create blogs table (missing entirely)
  console.log('\n=== CREATING blogs ===');
  await safeQuery(`
    CREATE TABLE IF NOT EXISTS blogs (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      slug VARCHAR(255) UNIQUE NOT NULL,
      content_html TEXT NOT NULL DEFAULT '',
      content_json TEXT,
      summary TEXT,
      category VARCHAR(100) NOT NULL DEFAULT 'AYURVEDA',
      featured_image TEXT,
      status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'published', 'rejected', 'archived', 'scheduled')),
      created_by UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
      approved_by UUID REFERENCES team_members(id) ON DELETE SET NULL,
      approved_at TIMESTAMPTZ,
      rejection_reason TEXT,
      published_at TIMESTAMPTZ,
      scheduled_publish_at TIMESTAMPTZ,
      is_featured BOOLEAN DEFAULT FALSE,
      featured_order INTEGER DEFAULT 0,
      seo_title VARCHAR(255),
      seo_description TEXT,
      seo_keywords VARCHAR(255),
      view_count INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `, 'blogs table');

  await safeQuery(`
    CREATE TABLE IF NOT EXISTS blog_tags (
      id SERIAL PRIMARY KEY,
      blog_id INTEGER NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
      tag VARCHAR(100) NOT NULL,
      UNIQUE(blog_id, tag)
    );
  `, 'blog_tags table');

  await safeQuery(`
    CREATE TABLE IF NOT EXISTS blog_versions (
      id SERIAL PRIMARY KEY,
      blog_id INTEGER NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
      version INTEGER NOT NULL,
      title VARCHAR(255) NOT NULL,
      content_html TEXT NOT NULL DEFAULT '',
      content_json TEXT,
      summary TEXT,
      featured_image TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      created_by UUID REFERENCES team_members(id) ON DELETE SET NULL
    );
  `, 'blog_versions table');

  await safeQuery(`
    CREATE TABLE IF NOT EXISTS blog_audit_log (
      id SERIAL PRIMARY KEY,
      blog_id INTEGER NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
      action VARCHAR(50) NOT NULL,
      performed_by UUID REFERENCES team_members(id) ON DELETE SET NULL,
      details TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `, 'blog_audit_log table');

  // 4. Create blogs indexes
  await safeQuery(`CREATE INDEX IF NOT EXISTS idx_blogs_status ON blogs(status)`, 'blogs status index');
  await safeQuery(`CREATE INDEX IF NOT EXISTS idx_blogs_created_by ON blogs(created_by)`, 'blogs created_by index');
  await safeQuery(`CREATE INDEX IF NOT EXISTS idx_blogs_slug ON blogs(slug)`, 'blogs slug index');
  await safeQuery(`CREATE INDEX IF NOT EXISTS idx_blogs_published_at ON blogs(published_at)`, 'blogs published_at index');

  // 5. Create blogs trigger
  await safeQuery(`
    CREATE TRIGGER trg_blogs_updated
    BEFORE UPDATE ON blogs
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  `, 'blogs trigger');

  // 6. Create customers & transactions tables if missing
  console.log('\n=== CHECKING customers & transactions ===');
  await safeQuery(`
    CREATE TABLE IF NOT EXISTS customers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(200) NOT NULL,
      email VARCHAR(255),
      phone VARCHAR(20),
      address TEXT,
      notes TEXT,
      profile_picture TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `, 'customers table');

  await safeQuery(`
    CREATE TABLE IF NOT EXISTS transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
      booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
      amount NUMERIC(10,2) NOT NULL,
      type VARCHAR(20) DEFAULT 'payment',
      method VARCHAR(50),
      notes TEXT,
      created_by UUID REFERENCES team_members(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `, 'transactions table');

  // 7. Create reviews table if missing
  console.log('\n=== CHECKING reviews ===');
  await safeQuery(`
    CREATE TABLE IF NOT EXISTS reviews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_name VARCHAR(200) NOT NULL,
      customer_email VARCHAR(255),
      rating INTEGER CHECK (rating >= 1 AND rating <= 5),
      comment TEXT,
      service_id INTEGER REFERENCES services(id) ON DELETE SET NULL,
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `, 'reviews table');

  // Final check
  console.log('\n=== FINAL TABLE LIST ===');
  const tables = await c.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' ORDER BY table_name;
  `);
  tables.rows.forEach(r => console.log(' -', r.table_name));

  await c.end();
  console.log('\n🎉 All fixes applied!');
}

main().catch(e => { console.error(e); process.exit(1); });
