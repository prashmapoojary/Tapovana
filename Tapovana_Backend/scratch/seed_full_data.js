const { Client } = require('pg');

const c = new Client({
  connectionString: 'postgresql://neondb_owner:npg_9J7lqUbeAarM@ep-cold-snow-axc6fc35-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await c.connect();
  await c.query('SET search_path TO public;');
  console.log('Connected to Neon DB for Date-Spanning Seed!\n');

  // Clear existing bookings & transactions to ensure exact metrics
  await c.query("DELETE FROM bookings WHERE user_name IN ('Karthik Rao', 'Priya Sharma', 'Rahul Verma', 'Neha Patel', 'Vikram Hegde', 'Ananya Roy', 'Suresh Kumar');");
  await c.query("DELETE FROM transactions WHERE customer_name IN ('Karthik Rao', 'Priya Sharma', 'Rahul Verma', 'Neha Patel', 'Vikram Hegde', 'Ananya Roy', 'Suresh Kumar');");

  // 1. Seed Bookings across Today, This Week, and earlier This Month
  console.log('--- Seeding Period-Based Bookings ---');
  await c.query(`
    INSERT INTO bookings (user_name, service_name, booking_date, booking_time, total_amount, status)
    VALUES 
    -- Today's Bookings (2)
    ('Karthik Rao', 'Abhyanga Ayurvedic Massage', NOW(), '10:00 AM', 2500.00, 'CONFIRMED'),
    ('Priya Sharma', 'Shirodhara Therapy', NOW(), '02:00 PM', 3200.00, 'CONFIRMED'),
    
    -- Earlier This Week Bookings (3)
    ('Rahul Verma', 'Panchakarma Detox Session', NOW() - INTERVAL '1 day', '11:00 AM', 4500.00, 'COMPLETED'),
    ('Neha Patel', 'Vedic Yoga Therapy', NOW() - INTERVAL '2 days', '08:00 AM', 1800.00, 'COMPLETED'),
    ('Vikram Hegde', 'Herbal Facial Rejuvenation', NOW() + INTERVAL '1 day', '04:00 PM', 2200.00, 'PENDING'),

    -- Earlier This Month Bookings (5)
    ('Ananya Roy', 'Abhyanga Ayurvedic Massage', NOW() - INTERVAL '10 days', '09:00 AM', 2500.00, 'COMPLETED'),
    ('Suresh Kumar', 'Shirodhara Therapy', NOW() - INTERVAL '14 days', '03:00 PM', 3200.00, 'COMPLETED'),
    ('Karthik Rao', 'Panchakarma Detox Session', NOW() - INTERVAL '18 days', '10:00 AM', 4500.00, 'COMPLETED'),
    ('Priya Sharma', 'Vedic Yoga Therapy', NOW() - INTERVAL '20 days', '07:00 AM', 1800.00, 'COMPLETED'),
    ('Rahul Verma', 'Herbal Facial Rejuvenation', NOW() - INTERVAL '22 days', '01:00 PM', 2200.00, 'COMPLETED');
  `);
  console.log('✅ Period Bookings seeded');

  // 2. Seed Transactions across Today, This Week, and earlier This Month
  console.log('--- Seeding Period-Based Transactions ---');
  await c.query(`
    INSERT INTO transactions (transaction_id, customer_name, amount, currency, status, payment_method, payment_gateway, gateway_transaction_id, created_at)
    VALUES 
    -- Today's Transactions (Revenue = 5,700)
    ('TXN-2026-TODAY-1', 'Karthik Rao', 2500.00, 'INR', 'COMPLETED', 'UPI', 'RAZORPAY', 'pay_today_1', NOW()),
    ('TXN-2026-TODAY-2', 'Priya Sharma', 3200.00, 'INR', 'COMPLETED', 'CARD', 'RAZORPAY', 'pay_today_2', NOW()),

    -- Earlier This Week Transactions (Revenue = +6,300, Total Week = 12,000)
    ('TXN-2026-WEEK-1', 'Rahul Verma', 4500.00, 'INR', 'COMPLETED', 'NETBANKING', 'RAZORPAY', 'pay_week_1', NOW() - INTERVAL '1 day'),
    ('TXN-2026-WEEK-2', 'Neha Patel', 1800.00, 'INR', 'COMPLETED', 'UPI', 'RAZORPAY', 'pay_week_2', NOW() - INTERVAL '2 days'),

    -- Earlier This Month Transactions (Revenue = +14,200, Total Month = 26,200)
    ('TXN-2026-MNTH-1', 'Ananya Roy', 2500.00, 'INR', 'COMPLETED', 'UPI', 'RAZORPAY', 'pay_mnth_1', NOW() - INTERVAL '10 days'),
    ('TXN-2026-MNTH-2', 'Suresh Kumar', 3200.00, 'INR', 'COMPLETED', 'CARD', 'RAZORPAY', 'pay_mnth_2', NOW() - INTERVAL '14 days'),
    ('TXN-2026-MNTH-3', 'Karthik Rao', 4500.00, 'INR', 'COMPLETED', 'NETBANKING', 'RAZORPAY', 'pay_mnth_3', NOW() - INTERVAL '18 days'),
    ('TXN-2026-MNTH-4', 'Priya Sharma', 1800.00, 'INR', 'COMPLETED', 'UPI', 'RAZORPAY', 'pay_mnth_4', NOW() - INTERVAL '20 days'),
    ('TXN-2026-MNTH-5', 'Rahul Verma', 2200.00, 'INR', 'COMPLETED', 'CARD', 'RAZORPAY', 'pay_mnth_5', NOW() - INTERVAL '22 days');
  `);
  console.log('✅ Period Transactions seeded');

  await c.end();
  console.log('\n🎉 Date-Spanning DB Seed Complete!');
}

main().catch(err => { console.error('Seeding error:', err); process.exit(1); });
