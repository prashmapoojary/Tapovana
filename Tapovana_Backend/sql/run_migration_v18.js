const { query, pool } = require('../src/config/db');

async function run() {
    try {
        console.log('Running v18 migration (Customers, Transactions & Home Dashboard tables)...');

        // ============================================================
        // 1. CUSTOMERS TABLE
        // ============================================================
        await query(`
            CREATE TABLE IF NOT EXISTS customers (
                id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                customer_id     VARCHAR(30) UNIQUE NOT NULL,
                first_name      VARCHAR(100) NOT NULL,
                last_name       VARCHAR(100) NOT NULL,
                email           VARCHAR(255) UNIQUE,
                phone           VARCHAR(30),
                status          VARCHAR(20) DEFAULT 'ACTIVE'
                                    CHECK (status IN ('ACTIVE','INACTIVE','ARCHIVED')),
                membership_status VARCHAR(20) DEFAULT 'NONE'
                                    CHECK (membership_status IN ('NONE','SILVER','GOLD','PLATINUM')),
                total_bookings  INTEGER DEFAULT 0,
                total_spent     NUMERIC(12,2) DEFAULT 0,
                join_date       DATE DEFAULT CURRENT_DATE,
                last_activity   TIMESTAMPTZ DEFAULT NOW(),
                admin_notes     TEXT DEFAULT '',
                avatar_url      TEXT,
                address         TEXT,
                city            VARCHAR(100),
                state           VARCHAR(100),
                pincode         VARCHAR(10),
                date_of_birth   DATE,
                gender          VARCHAR(20),
                created_at      TIMESTAMPTZ DEFAULT NOW(),
                updated_at      TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log('✅ customers table verified/created');

        // ============================================================
        // 2. TRANSACTIONS TABLE
        // ============================================================
        await query(`
            CREATE TABLE IF NOT EXISTS transactions (
                id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                transaction_id          VARCHAR(30) UNIQUE NOT NULL,
                booking_id              VARCHAR(30),
                customer_id             UUID REFERENCES customers(id) ON DELETE SET NULL,
                customer_name           VARCHAR(200),
                amount                  NUMERIC(12,2) NOT NULL DEFAULT 0,
                currency                VARCHAR(10) DEFAULT 'INR',
                status                  VARCHAR(20) DEFAULT 'PENDING'
                                            CHECK (status IN ('PENDING','COMPLETED','FAILED','REFUNDED','PAID')),
                payment_method          VARCHAR(30)
                                            CHECK (payment_method IN ('UPI','CARD','NETBANKING','INTERNATIONAL','CASH','WALLET')),
                payment_gateway         VARCHAR(30)
                                            CHECK (payment_gateway IN ('RAZORPAY','STRIPE','MANUAL','OTHER')),
                gateway_transaction_id  VARCHAR(100),
                receipt_url             TEXT,
                refund_amount           NUMERIC(12,2) DEFAULT 0,
                refund_reason           TEXT,
                refunded_at             TIMESTAMPTZ,
                notes                   TEXT,
                created_at              TIMESTAMPTZ DEFAULT NOW(),
                updated_at              TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log('✅ transactions table verified/created');

        // ============================================================
        // 3. HOME DASHBOARD SNAPSHOTS TABLE
        // ============================================================
        await query(`
            CREATE TABLE IF NOT EXISTS home_dashboard_snapshots (
                id                  SERIAL PRIMARY KEY,
                total_customers     INTEGER DEFAULT 0,
                active_customers    INTEGER DEFAULT 0,
                total_transactions  INTEGER DEFAULT 0,
                total_revenue       NUMERIC(14,2) DEFAULT 0,
                pending_amount      NUMERIC(14,2) DEFAULT 0,
                refunded_amount     NUMERIC(14,2) DEFAULT 0,
                failed_amount       NUMERIC(14,2) DEFAULT 0,
                total_services      INTEGER DEFAULT 0,
                active_bookings     INTEGER DEFAULT 0,
                published_blogs     INTEGER DEFAULT 0,
                snapshot_date       DATE DEFAULT CURRENT_DATE,
                created_at          TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log('✅ home_dashboard_snapshots table verified/created');

        // ============================================================
        // 4. INDEXES
        // ============================================================
        await query(`CREATE INDEX IF NOT EXISTS idx_customers_customer_id   ON customers(customer_id);`);
        await query(`CREATE INDEX IF NOT EXISTS idx_customers_email         ON customers(email);`);
        await query(`CREATE INDEX IF NOT EXISTS idx_customers_status        ON customers(status);`);
        await query(`CREATE INDEX IF NOT EXISTS idx_customers_membership    ON customers(membership_status);`);
        await query(`CREATE INDEX IF NOT EXISTS idx_customers_join_date     ON customers(join_date);`);

        await query(`CREATE INDEX IF NOT EXISTS idx_transactions_txn_id     ON transactions(transaction_id);`);
        await query(`CREATE INDEX IF NOT EXISTS idx_transactions_customer   ON transactions(customer_id);`);
        await query(`CREATE INDEX IF NOT EXISTS idx_transactions_status     ON transactions(status);`);
        await query(`CREATE INDEX IF NOT EXISTS idx_transactions_method     ON transactions(payment_method);`);
        await query(`CREATE INDEX IF NOT EXISTS idx_transactions_gateway    ON transactions(payment_gateway);`);
        await query(`CREATE INDEX IF NOT EXISTS idx_transactions_created    ON transactions(created_at);`);
        await query(`CREATE INDEX IF NOT EXISTS idx_transactions_booking    ON transactions(booking_id);`);

        await query(`CREATE INDEX IF NOT EXISTS idx_dashboard_snapshot_date ON home_dashboard_snapshots(snapshot_date);`);
        console.log('✅ Indexes verified/created');

        // ============================================================
        // 5. TRIGGERS (auto-update updated_at)
        // ============================================================
        await query(`
            CREATE OR REPLACE FUNCTION set_updated_at()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = NOW();
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

        // Customers trigger
        await query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_customers_updated'
                ) THEN
                    CREATE TRIGGER trg_customers_updated
                        BEFORE UPDATE ON customers
                        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
                END IF;
            END $$;
        `);

        // Transactions trigger
        await query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_transactions_updated'
                ) THEN
                    CREATE TRIGGER trg_transactions_updated
                        BEFORE UPDATE ON transactions
                        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
                END IF;
            END $$;
        `);
        console.log('✅ Triggers verified/created');

        // ============================================================
        // 6. SEED CUSTOMERS
        // ============================================================
        const existingCustomers = await query('SELECT COUNT(*) FROM customers');
        if (parseInt(existingCustomers.rows[0].count, 10) === 0) {
            console.log('Seeding initial customers...');

            const seedCustomers = [
                {
                    customer_id: 'CUST-001', first_name: 'Rahul', last_name: 'Sharma',
                    email: 'rahul.s@example.com', phone: '+91 98765 43210',
                    status: 'ACTIVE', membership_status: 'GOLD',
                    total_bookings: 12, total_spent: 24500,
                    join_date: '2024-01-15', last_activity: '2026-06-01',
                    admin_notes: 'Prefers evening slots'
                },
                {
                    customer_id: 'CUST-002', first_name: 'Priya', last_name: 'Desai',
                    email: 'priya.d@example.com', phone: '+91 87654 32109',
                    status: 'ACTIVE', membership_status: 'NONE',
                    total_bookings: 2, total_spent: 3500,
                    join_date: '2024-05-20', last_activity: '2026-05-22',
                    admin_notes: ''
                },
                {
                    customer_id: 'CUST-003', first_name: 'Vikram', last_name: 'Singh',
                    email: 'vikram.s@example.com', phone: '+91 76543 21098',
                    status: 'INACTIVE', membership_status: 'PLATINUM',
                    total_bookings: 45, total_spent: 89000,
                    join_date: '2023-05-10', last_activity: '2026-04-10',
                    admin_notes: 'VIP Client. Always books premium packages.'
                },
                {
                    customer_id: 'CUST-004', first_name: 'Anita', last_name: 'Nair',
                    email: 'anita.n@example.com', phone: '+91 65432 10987',
                    status: 'ACTIVE', membership_status: 'SILVER',
                    total_bookings: 8, total_spent: 12000,
                    join_date: '2024-02-22', last_activity: '2026-06-05',
                    admin_notes: 'Allergic to sesame oil.'
                },
                {
                    customer_id: 'CUST-005', first_name: 'Sanjay', last_name: 'Kumar',
                    email: 'sanjay.k@example.com', phone: '+91 54321 09876',
                    status: 'ARCHIVED', membership_status: 'NONE',
                    total_bookings: 1, total_spent: 1500,
                    join_date: '2023-01-01', last_activity: '2023-01-15',
                    admin_notes: 'Duplicate account. Archived on request.'
                }
            ];

            for (const c of seedCustomers) {
                await query(`
                    INSERT INTO customers (customer_id, first_name, last_name, email, phone, status, membership_status, total_bookings, total_spent, join_date, last_activity, admin_notes)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                    ON CONFLICT (customer_id) DO NOTHING
                `, [c.customer_id, c.first_name, c.last_name, c.email, c.phone, c.status, c.membership_status, c.total_bookings, c.total_spent, c.join_date, c.last_activity, c.admin_notes]);
            }
            console.log('✅ Seeded 5 initial customers');
        } else {
            console.log('ℹ️ Customers table already has data, skipping seed.');
        }

        // ============================================================
        // 7. SEED TRANSACTIONS
        // ============================================================
        const existingTxns = await query('SELECT COUNT(*) FROM transactions');
        if (parseInt(existingTxns.rows[0].count, 10) === 0) {
            console.log('Seeding initial transactions...');

            // Look up customer UUIDs by customer_id
            const custMap = {};
            const custRows = await query('SELECT id, customer_id FROM customers');
            for (const row of custRows.rows) {
                custMap[row.customer_id] = row.id;
            }

            const seedTransactions = [
                {
                    transaction_id: 'TXN-10001', booking_id: 'BK-1001',
                    customer_id_ref: 'CUST-001', customer_name: 'Rahul Sharma',
                    amount: 2500, currency: 'INR', status: 'COMPLETED',
                    payment_method: 'UPI', payment_gateway: 'RAZORPAY',
                    gateway_transaction_id: 'pay_Ox9aAbCd123',
                    created_at: '2026-06-15T10:00:00Z'
                },
                {
                    transaction_id: 'TXN-10002', booking_id: 'BK-1002',
                    customer_id_ref: 'CUST-002', customer_name: 'Priya Desai',
                    amount: 1200, currency: 'INR', status: 'PENDING',
                    payment_method: 'CARD', payment_gateway: 'STRIPE',
                    gateway_transaction_id: 'ch_3Px7YqGH456',
                    created_at: '2026-06-16T07:00:00Z'
                },
                {
                    transaction_id: 'TXN-10003', booking_id: 'BK-1003',
                    customer_id_ref: 'CUST-003', customer_name: 'Vikram Singh',
                    amount: 5000, currency: 'INR', status: 'COMPLETED',
                    payment_method: 'NETBANKING', payment_gateway: 'RAZORPAY',
                    gateway_transaction_id: 'pay_Qr8bCdEf789',
                    created_at: '2026-06-18T09:00:00Z'
                },
                {
                    transaction_id: 'TXN-10004', booking_id: 'BK-1004',
                    customer_id_ref: 'CUST-004', customer_name: 'Anita Nair',
                    amount: 800, currency: 'INR', status: 'COMPLETED',
                    payment_method: 'UPI', payment_gateway: 'RAZORPAY',
                    gateway_transaction_id: 'pay_Ss1cDeFg012',
                    created_at: '2026-06-15T17:00:00Z'
                },
                {
                    transaction_id: 'TXN-10005', booking_id: 'BK-1005',
                    customer_id_ref: 'CUST-005', customer_name: 'Sanjay Kumar',
                    amount: 1500, currency: 'INR', status: 'FAILED',
                    payment_method: 'CARD', payment_gateway: 'STRIPE',
                    gateway_transaction_id: 'ch_4Rx9YsHI345',
                    created_at: '2026-06-20T11:00:00Z'
                },
                {
                    transaction_id: 'TXN-10006', booking_id: 'BK-1006',
                    customer_id_ref: null, customer_name: 'Deepika Menon',
                    amount: 3500, currency: 'INR', status: 'REFUNDED',
                    payment_method: 'UPI', payment_gateway: 'RAZORPAY',
                    gateway_transaction_id: 'pay_Tt2dEfGh678',
                    created_at: '2026-06-12T14:00:00Z'
                },
                {
                    transaction_id: 'TXN-10007', booking_id: 'BK-1007',
                    customer_id_ref: null, customer_name: 'Mohan Pillai',
                    amount: 4200, currency: 'INR', status: 'COMPLETED',
                    payment_method: 'UPI', payment_gateway: 'RAZORPAY',
                    gateway_transaction_id: 'pay_Uu3eFgHi901',
                    created_at: '2026-06-22T08:00:00Z'
                },
                {
                    transaction_id: 'TXN-10008', booking_id: 'BK-1008',
                    customer_id_ref: null, customer_name: 'Kavitha Iyer',
                    amount: 7999, currency: 'INR', status: 'COMPLETED',
                    payment_method: 'CARD', payment_gateway: 'STRIPE',
                    gateway_transaction_id: 'ch_5Sy0ZtIJ234',
                    created_at: '2026-06-25T10:30:00Z'
                }
            ];

            for (const t of seedTransactions) {
                const custUUID = t.customer_id_ref ? (custMap[t.customer_id_ref] || null) : null;
                await query(`
                    INSERT INTO transactions (transaction_id, booking_id, customer_id, customer_name, amount, currency, status, payment_method, payment_gateway, gateway_transaction_id, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    ON CONFLICT (transaction_id) DO NOTHING
                `, [t.transaction_id, t.booking_id, custUUID, t.customer_name, t.amount, t.currency, t.status, t.payment_method, t.payment_gateway, t.gateway_transaction_id, t.created_at]);
            }
            console.log('✅ Seeded 8 initial transactions');
        } else {
            console.log('ℹ️ Transactions table already has data, skipping seed.');
        }

        // ============================================================
        // 8. SEED INITIAL DASHBOARD SNAPSHOT
        // ============================================================
        const existingSnapshots = await query('SELECT COUNT(*) FROM home_dashboard_snapshots');
        if (parseInt(existingSnapshots.rows[0].count, 10) === 0) {
            // Compute snapshot from seeded data
            const custCount = await query('SELECT COUNT(*) as cnt FROM customers');
            const activeCust = await query("SELECT COUNT(*) as cnt FROM customers WHERE status = 'ACTIVE'");
            const txnCount = await query('SELECT COUNT(*) as cnt FROM transactions');
            const revenueRes = await query("SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE status IN ('COMPLETED','PAID')");
            const pendingRes = await query("SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE status = 'PENDING'");
            const refundedRes = await query("SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE status = 'REFUNDED'");
            const failedRes = await query("SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE status = 'FAILED'");

            let svcCount = 0, bookCount = 0, blogCount = 0;
            try { svcCount = parseInt((await query("SELECT COUNT(*) as cnt FROM services")).rows[0].cnt); } catch(e) {}
            try { bookCount = parseInt((await query("SELECT COUNT(*) as cnt FROM bookings")).rows[0].cnt); } catch(e) {}
            try { blogCount = parseInt((await query("SELECT COUNT(*) as cnt FROM blogs WHERE status = 'published'")).rows[0].cnt); } catch(e) {}

            await query(`
                INSERT INTO home_dashboard_snapshots (total_customers, active_customers, total_transactions, total_revenue, pending_amount, refunded_amount, failed_amount, total_services, active_bookings, published_blogs)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `, [
                parseInt(custCount.rows[0].cnt),
                parseInt(activeCust.rows[0].cnt),
                parseInt(txnCount.rows[0].cnt),
                parseFloat(revenueRes.rows[0].total),
                parseFloat(pendingRes.rows[0].total),
                parseFloat(refundedRes.rows[0].total),
                parseFloat(failedRes.rows[0].total),
                svcCount, bookCount, blogCount
            ]);
            console.log('✅ Seeded initial dashboard snapshot');
        } else {
            console.log('ℹ️ Dashboard snapshots already exist, skipping seed.');
        }

        console.log('🟢 v18 migration (Customers, Transactions & Home Dashboard) completed successfully.');
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

run();
