const { query, pool } = require('../src/config/db');

async function run() {
    try {
        console.log('Running v17 migration (Blogs CMS tables)...');

        // 1. blogs table
        await query(`
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
        `);
        console.log('✅ blogs table verified/created');

        // 2. blog_tags table
        await query(`
            CREATE TABLE IF NOT EXISTS blog_tags (
                id SERIAL PRIMARY KEY,
                blog_id INTEGER NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
                tag VARCHAR(100) NOT NULL,
                UNIQUE(blog_id, tag)
            );
        `);
        console.log('✅ blog_tags table verified/created');

        // 3. blog_versions table
        await query(`
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
        `);
        console.log('✅ blog_versions table verified/created');

        // 4. blog_comments table
        await query(`
            CREATE TABLE IF NOT EXISTS blog_comments (
                id SERIAL PRIMARY KEY,
                blog_id INTEGER NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
                user_id UUID REFERENCES team_members(id) ON DELETE SET NULL,
                guest_name VARCHAR(100),
                guest_email VARCHAR(255),
                comment TEXT NOT NULL,
                status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log('✅ blog_comments table verified/created');

        // 5. blog_likes table
        await query(`
            CREATE TABLE IF NOT EXISTS blog_likes (
                id SERIAL PRIMARY KEY,
                blog_id INTEGER NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
                user_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(blog_id, user_id)
            );
        `);
        console.log('✅ blog_likes table verified/created');

        // 6. blog_bookmarks table
        await query(`
            CREATE TABLE IF NOT EXISTS blog_bookmarks (
                id SERIAL PRIMARY KEY,
                blog_id INTEGER NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
                user_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(blog_id, user_id)
            );
        `);
        console.log('✅ blog_bookmarks table verified/created');

        // 7. blog_views table
        await query(`
            CREATE TABLE IF NOT EXISTS blog_views (
                id SERIAL PRIMARY KEY,
                blog_id INTEGER NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
                ip_address VARCHAR(45),
                user_id UUID REFERENCES team_members(id) ON DELETE SET NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log('✅ blog_views table verified/created');

        // 8. Indexes
        await query(`CREATE INDEX IF NOT EXISTS idx_blogs_slug ON blogs(slug);`);
        await query(`CREATE INDEX IF NOT EXISTS idx_blogs_status ON blogs(status);`);
        await query(`CREATE INDEX IF NOT EXISTS idx_blogs_created_by ON blogs(created_by);`);
        await query(`CREATE INDEX IF NOT EXISTS idx_blogs_category ON blogs(category);`);
        await query(`CREATE INDEX IF NOT EXISTS idx_blog_tags_blog ON blog_tags(blog_id);`);
        await query(`CREATE INDEX IF NOT EXISTS idx_blog_comments_blog ON blog_comments(blog_id);`);
        await query(`CREATE INDEX IF NOT EXISTS idx_blog_views_blog ON blog_views(blog_id);`);
        console.log('✅ Indexes verified/created');

        // 9. Seed initial blogs from the first doctor found in team_members
        const existingBlogs = await query('SELECT COUNT(*) FROM blogs');
        if (parseInt(existingBlogs.rows[0].count, 10) === 0) {
            console.log('Seeding initial blogs...');

            // Find a doctor to use as author
            const doctorResult = await query(`
                SELECT tm.id FROM team_members tm
                JOIN roles r ON r.id = tm.role_id
                WHERE UPPER(r.name) = 'DOCTOR' AND tm.status = 'active'
                LIMIT 1
            `);

            if (doctorResult.rows.length === 0) {
                console.log('⚠️ No active doctor found for blog seeding, skipping seed.');
            } else {
                const authorId = doctorResult.rows[0].id;

                const seedBlogs = [
                    {
                        title: 'Understanding Your Dosha: The Path to Personalized Wellness',
                        slug: 'understanding-your-dosha',
                        category: 'AYURVEDA',
                        summary: 'Discover your unique Vata, Pitta, or Kapha constitution and learn how Ayurvedic wisdom can help you balance your body, mind, and spirit.',
                        image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=800',
                        body: '<p>Ayurveda, the ancient Indian science of life, teaches us that everything in the universe, including our bodies, is composed of the five elements: space, air, fire, water, and earth.</p><h2>The Three Primary Doshas</h2><p>Understanding which dosha is dominant in your constitution is the first step toward living a life of true harmony and health.</p><h3>1. Vata (Space &amp; Air)</h3><p>Vata is the energy of movement. Those with a dominant Vata dosha are often creative, energetic, and thin-framed.</p><h3>2. Pitta (Fire &amp; Water)</h3><p>Pitta represents transformation and digestion. Dominant Pitta individuals are typically highly focused and competitive.</p><h3>3. Kapha (Water &amp; Earth)</h3><p>Kapha provides structure and stability. Dominant Kapha types are compassionate, loyal, and physically strong.</p>',
                        date: '2026-05-28'
                    },
                    {
                        title: 'Pranayama: Cultivating Vitality Through Sacred Breath Control',
                        slug: 'pranayama-breath-control',
                        category: 'YOGA',
                        summary: 'An in-depth guide to key breathing techniques like Nadi Shodhana and Kapalabhati to calm the central nervous system.',
                        image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=800',
                        body: '<p>The word <strong>Pranayama</strong> is derived from two Sanskrit words: <em>Prana</em>, meaning vital life force, and <em>Yama</em>, meaning control or extension.</p><h2>Key Pranayama Techniques</h2><h3>1. Nadi Shodhana (Alternate Nostril Breathing)</h3><p>This technique is unparalleled for balancing the left and right hemispheres of the brain.</p><h3>2. Kapalabhati (Skull-Shining Breath)</h3><p>A dynamic, energizing breath that purifies the digestive tract.</p>',
                        date: '2026-05-15'
                    },
                    {
                        title: 'Spices as Medicine: Healing Secrets in Your Kitchen Cabinet',
                        slug: 'spices-as-medicine',
                        category: 'NUTRITION',
                        summary: 'Discover how everyday spices like turmeric, ginger, cardamom, and cumin act as potent antioxidants and digestive aids.',
                        image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=800',
                        body: '<p>In Ayurvedic science, a kitchen is not just a place to prepare food; it is the ultimate pharmacy.</p><h2>Four Powerhouse Spices</h2><h3>1. Turmeric (Haridra)</h3><p>Known as the golden spice, turmeric contains curcumin, a powerful anti-inflammatory compound.</p><h3>2. Ginger (Ardraka)</h3><p>Often referred to as "the universal medicine", ginger is a supreme spice for digestion.</p>',
                        date: '2026-05-10'
                    },
                    {
                        title: 'Creating a Sacred Dinacharya: The Ayurvedic Morning Ritual',
                        slug: 'ayurvedic-morning-ritual',
                        category: 'WELLNESS',
                        summary: 'Establish a grounding daily routine to align your biological rhythms with natural cycles.',
                        image: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&q=80&w=800',
                        body: '<p>In the modern world, our bodies are constantly subjected to erratic schedules. Ayurveda provides a profound remedy: <strong>Dinacharya</strong>, a daily morning routine.</p><h2>The Core Steps</h2><h3>1. Rise with the Sun</h3><p>The time before sunrise is filled with a unique, calm energy (Sattva).</p><h3>2. Tongue Scraping</h3><p>Use a copper tongue scraper to remove toxins accumulated overnight.</p>',
                        date: '2026-04-20'
                    }
                ];

                for (const blog of seedBlogs) {
                    await query(`
                        INSERT INTO blogs (title, slug, content_html, summary, category, featured_image, status, created_by, published_at)
                        VALUES ($1, $2, $3, $4, $5, $6, 'published', $7, $8)
                        ON CONFLICT (slug) DO NOTHING
                    `, [blog.title, blog.slug, blog.body, blog.summary, blog.category, blog.image, authorId, blog.date]);
                }
                console.log('✅ Seeded 4 initial published blogs');
            }
        } else {
            console.log('ℹ️ Blogs table already has data, skipping seed.');
        }

        console.log('🟢 v17 migration (Blogs CMS) completed successfully.');
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

run();
