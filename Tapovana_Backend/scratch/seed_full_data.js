const { Client } = require('pg');

const c = new Client({
  connectionString: 'postgresql://neondb_owner:npg_9J7lqUbeAarM@ep-cold-snow-axc6fc35-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await c.connect();
  await c.query('SET search_path TO public;');
  console.log('Connected to Neon DB for Seeding!\n');

  // 1. Seed Services
  console.log('--- Seeding Services ---');
  await c.query(`
    INSERT INTO services (name, category, description, base_price, duration_minutes, image_url, status)
    VALUES 
    ('Abhyanga Ayurvedic Massage', 'Ayurveda', 'Full body warm herbal oil massage to restore energy balance.', 2500.00, 60, '/uploads/service1.jpg', 'ACTIVE'),
    ('Shirodhara Therapy', 'Therapy', 'Continuous pouring of warm medicated oil on the forehead for stress relief.', 3200.00, 45, '/uploads/service2.jpg', 'ACTIVE'),
    ('Panchakarma Detox Session', 'Detox', 'Deep cellular body purification and rejuvenation therapy.', 4500.00, 90, '/uploads/service3.jpg', 'ACTIVE'),
    ('Vedic Yoga Therapy', 'Wellness', 'Personalized yoga asana and pranayama session.', 1800.00, 60, '/uploads/service4.jpg', 'ACTIVE'),
    ('Herbal Facial Rejuvenation', 'Skin Care', 'Natural organic herbal facial treatment for glowing skin.', 2200.00, 45, '/uploads/service5.jpg', 'ACTIVE')
    ON CONFLICT DO NOTHING;
  `);
  console.log('✅ Services seeded');

  // 2. Seed Workshops
  console.log('--- Seeding Workshops ---');
  await c.query(`
    INSERT INTO workshops (title, category, instructor, date, time, duration, capacity, enrolled, price, status, description, image_url)
    VALUES 
    ('Yoga & Pranayama Masterclass', 'Yoga', 'Acharya Tapovan', CURRENT_DATE + INTERVAL '5 days', '07:00 AM', 90, 30, 18, 1500.00, 'Upcoming', 'Learn ancient breathing techniques and postural alignment.', '/uploads/workshop1.jpg'),
    ('Ayurvedic Nutrition & Diet', 'Nutrition', 'Dr. Ananya Rao', CURRENT_DATE + INTERVAL '12 days', '10:00 AM', 120, 25, 22, 1800.00, 'Upcoming', 'Customizing food according to your body Prakriti (Vata, Pitta, Kapha).', '/uploads/workshop2.jpg'),
    ('Mindfulness Meditation Retreat', 'Meditation', 'Swami Vidyananda', CURRENT_DATE - INTERVAL '2 days', '06:00 AM', 60, 20, 20, 1200.00, 'Completed', 'Guided silent meditation and self-reflection session.', '/uploads/workshop3.jpg')
    ON CONFLICT DO NOTHING;
  `);
  console.log('✅ Workshops seeded');

  // 3. Seed Vedic Programs
  console.log('--- Seeding Vedic Programs ---');
  await c.query(`
    INSERT INTO vedic_programs (title, type, description, duration, start_date, end_date, capacity, enrolled, price, status, image_url)
    VALUES 
    ('14-Day Kayakalpa Rejuvenation', 'Residential', 'Complete body overhaul program with Panchakarma & sattvic diet.', '14 Days', CURRENT_DATE + INTERVAL '10 days', CURRENT_DATE + INTERVAL '24 days', 15, 12, 45000.00, 'Upcoming', '/uploads/vedic1.jpg'),
    ('7-Day Stress Relief Retreat', 'Residential', 'Holistic mind detox with Abhyanga, Shirodhara, and Guided Meditation.', '7 Days', CURRENT_DATE + INTERVAL '3 days', CURRENT_DATE + INTERVAL '10 days', 20, 16, 25000.00, 'Upcoming', '/uploads/vedic2.jpg')
    ON CONFLICT DO NOTHING;
  `);
  console.log('✅ Vedic Programs seeded');

  // 4. Seed Customers
  console.log('--- Seeding Customers ---');
  await c.query(`
    INSERT INTO customers (customer_id, name, first_name, last_name, email, phone, status, membership_status, total_bookings, total_spent, join_date)
    VALUES 
    ('CUST-001', 'Karthik Rao', 'Karthik', 'Rao', 'karthikrao608@gmail.com', '+91 98765 43210', 'ACTIVE', 'GOLD', 5, 12500.00, CURRENT_DATE - INTERVAL '30 days'),
    ('CUST-002', 'Priya Sharma', 'Priya', 'Sharma', 'priya.sharma@example.com', '+91 98123 45678', 'ACTIVE', 'PLATINUM', 8, 28000.00, CURRENT_DATE - INTERVAL '60 days'),
    ('CUST-003', 'Rahul Verma', 'Rahul', 'Verma', 'rahul.verma@example.com', '+91 97654 32109', 'ACTIVE', 'SILVER', 3, 7500.00, CURRENT_DATE - INTERVAL '15 days'),
    ('CUST-004', 'Neha Patel', 'Neha', 'Patel', 'neha.patel@example.com', '+91 96543 21098', 'ACTIVE', 'NONE', 1, 2500.00, CURRENT_DATE - INTERVAL '5 days'),
    ('CUST-005', 'Vikram Hegde', 'Vikram', 'Hegde', 'vikram.hegde@example.com', '+91 95432 10987', 'ACTIVE', 'GOLD', 6, 16800.00, CURRENT_DATE - INTERVAL '45 days')
    ON CONFLICT DO NOTHING;
  `);
  console.log('✅ Customers seeded');

  // 5. Seed Bookings
  console.log('--- Seeding Bookings ---');
  await c.query(`
    INSERT INTO bookings (user_name, service_name, booking_date, booking_time, total_amount, status)
    VALUES 
    ('Karthik Rao', 'Abhyanga Ayurvedic Massage', CURRENT_DATE, '10:00 AM', 2500.00, 'CONFIRMED'),
    ('Priya Sharma', 'Shirodhara Therapy', CURRENT_DATE, '02:00 PM', 3200.00, 'CONFIRMED'),
    ('Rahul Verma', 'Panchakarma Detox Session', CURRENT_DATE - INTERVAL '1 day', '11:00 AM', 4500.00, 'COMPLETED'),
    ('Neha Patel', 'Vedic Yoga Therapy', CURRENT_DATE + INTERVAL '2 days', '08:00 AM', 1800.00, 'PENDING')
    ON CONFLICT DO NOTHING;
  `);
  console.log('✅ Bookings seeded');

  // 6. Seed Transactions
  console.log('--- Seeding Transactions ---');
  await c.query(`
    INSERT INTO transactions (transaction_id, customer_name, amount, currency, status, payment_method, payment_gateway, gateway_transaction_id, created_at)
    VALUES 
    ('TXN-2026-001', 'Karthik Rao', 2500.00, 'INR', 'COMPLETED', 'UPI', 'RAZORPAY', 'pay_N83a7Ksl91', CURRENT_DATE - INTERVAL '1 hour'),
    ('TXN-2026-002', 'Priya Sharma', 3200.00, 'INR', 'COMPLETED', 'CARD', 'RAZORPAY', 'pay_M92b6Jxl82', CURRENT_DATE - INTERVAL '3 hours'),
    ('TXN-2026-003', 'Rahul Verma', 4500.00, 'INR', 'COMPLETED', 'NETBANKING', 'RAZORPAY', 'pay_P10c4Kzp12', CURRENT_DATE - INTERVAL '1 day'),
    ('TXN-2026-004', 'Neha Patel', 1800.00, 'INR', 'PENDING', 'UPI', 'RAZORPAY', 'pay_Q44d5Mqp44', CURRENT_DATE)
    ON CONFLICT DO NOTHING;
  `);
  console.log('✅ Transactions seeded');

  // 7. Seed Blogs
  console.log('--- Seeding Blogs ---');
  const teamRes = await c.query("SELECT id FROM team_members LIMIT 1");
  if (teamRes.rows.length > 0) {
    const adminId = teamRes.rows[0].id;
    await c.query(`
      INSERT INTO blogs (title, slug, content_html, summary, category, status, created_by, published_at)
      VALUES 
      ('Understanding Ayurvedic Doshas: Vata, Pitta, Kapha', 'understanding-ayurvedic-doshas', '<p>Ayurveda emphasizes body constitution balance...</p>', 'Learn how your Prakriti dictates your health and wellness.', 'AYURVEDA', 'published', '${adminId}', NOW() - INTERVAL '10 days'),
      ('The Science of Shirodhara for Deep Relaxation', 'science-of-shirodhara', '<p>Shirodhara is a classical Ayurvedic treatment...</p>', 'Discover how warm oil pouring calms the central nervous system.', 'AYURVEDA', 'published', '${adminId}', NOW() - INTERVAL '5 days'),
      ('Daily Dinacharya: Healthy Ayurvedic Morning Routines', 'daily-dinacharya-routine', '<p>Starting your day with Ayurvedic principles...</p>', 'Simple steps to align your daily routine with nature.', 'WELLNESS', 'published', '${adminId}', NOW() - INTERVAL '2 days')
      ON CONFLICT DO NOTHING;
    `);
    console.log('✅ Blogs seeded');
  }

  await c.end();
  console.log('\n🎉 Full Database Seed Complete!');
}

main().catch(err => { console.error('Seeding error:', err); process.exit(1); });
