const { query, pool } = require('../src/config/db');

async function run() {
    try {
        console.log('Running v19 migration (Creating unsplash_media table and seeding)...');

        // Create table
        await query(`
            CREATE TABLE IF NOT EXISTS unsplash_media (
                id SERIAL PRIMARY KEY,
                category VARCHAR(100) NOT NULL,
                subcategory VARCHAR(100) DEFAULT '',
                page_type VARCHAR(50) NOT NULL DEFAULT 'services', -- 'services', 'workshops', 'vedic_packages', 'blogs'
                media_type VARCHAR(20) NOT NULL DEFAULT 'image', -- 'image' or 'video'
                url TEXT NOT NULL,
                thumbnail_url TEXT,
                description TEXT,
                author VARCHAR(255),
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(category, subcategory, page_type, url)
            );
        `);
        console.log('✅ unsplash_media table verified/created');

        // Indexes
        await query(`
            CREATE INDEX IF NOT EXISTS idx_unsplash_media_lookup 
            ON unsplash_media(page_type, category, subcategory);
        `);
        console.log('✅ index verified/created');

        // Seeding initial curated media URLs
        console.log('Seeding initial curated media...');

        const seedMedia = [
            // === 1. Services Page Media ===
            // Body Care - Massages
            {
                page_type: 'services', category: 'Body Care', subcategory: 'Massages', media_type: 'image',
                url: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&q=80&w=800',
                description: 'Relaxing hot oil massage therapy', author: 'Raza Ali'
            },
            {
                page_type: 'services', category: 'Body Care', subcategory: 'Massages', media_type: 'image',
                url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=800',
                description: 'Ayurvedic oils and herbal treatment', author: 'Monika Grabkowska'
            },
            {
                page_type: 'services', category: 'Body Care', subcategory: 'All', media_type: 'image',
                url: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&q=80&w=800',
                description: 'Hot stone body care therapy', author: 'Esther Tuttle'
            },
            {
                page_type: 'services', category: 'Body Care', subcategory: 'Scrubs', media_type: 'image',
                url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=800',
                description: 'Natural organic exfoliating body scrub', author: 'Calum Lewis'
            },
            {
                page_type: 'services', category: 'Body Care', subcategory: 'Hydrotherapy', media_type: 'image',
                url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=800',
                description: 'Relaxing luxury bath wellness', author: 'Jared Rice'
            },

            // Skin Care
            {
                page_type: 'services', category: 'Skin Care', subcategory: 'All', media_type: 'image',
                url: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&q=80&w=800',
                description: 'Natural skincare ingredients', author: 'Tiard'
            },
            {
                page_type: 'services', category: 'Skin Care', subcategory: 'Facials', media_type: 'image',
                url: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&q=80&w=800',
                description: 'Relaxing facial skincare treatment', author: 'Valeriia Harchenko'
            },
            {
                page_type: 'services', category: 'Skin Care', subcategory: 'Detain Treatment', media_type: 'image',
                url: 'https://images.unsplash.com/photo-1590439471364-192aa70c0b53?auto=format&fit=crop&q=80&w=800',
                description: 'Facial mask detan spa therapy', author: 'Kseniia'
            },
            {
                page_type: 'services', category: 'Skin Care', subcategory: 'Waxing', media_type: 'image',
                url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&q=80&w=800',
                description: 'Waxing hair removal skincare', author: 'Sora'
            },

            // Nail Care
            {
                page_type: 'services', category: 'Nail Care', subcategory: 'All', media_type: 'image',
                url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&q=80&w=800',
                description: 'Elegant manicure session', author: 'Krisztina Papp'
            },
            {
                page_type: 'services', category: 'Nail Care', subcategory: 'Pedicure', media_type: 'image',
                url: 'https://images.unsplash.com/photo-1632345031435-8797b2d58045?auto=format&fit=crop&q=80&w=800',
                description: 'Relaxing luxury pedicure spa treatment', author: 'Raza Ali'
            },
            {
                page_type: 'services', category: 'Nail Care', subcategory: 'Nail Art', media_type: 'image',
                url: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&q=80&w=800',
                description: 'Beautifully painted fingernails nail art', author: 'Sora'
            },

            // Hair Care
            {
                page_type: 'services', category: 'Hair Care', subcategory: 'All', media_type: 'image',
                url: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&q=80&w=800',
                description: 'Professional haircut and hair care', author: 'Gregory Hayes'
            },
            {
                page_type: 'services', category: 'Hair Care', subcategory: 'Hair Spa', media_type: 'image',
                url: 'https://images.unsplash.com/photo-1560869713-7d0a29430f33?auto=format&fit=crop&q=80&w=800',
                description: 'Nourishing hair spa treatment', author: 'Giorgio Trovato'
            },

            // Styling & Makeover
            {
                page_type: 'services', category: 'Styling & Make over', subcategory: 'All', media_type: 'image',
                url: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&q=80&w=800',
                description: 'Cosmetics styling setup', author: 'Sora'
            },
            {
                page_type: 'services', category: 'Styling & Make over', subcategory: 'Bridal Makeover', media_type: 'image',
                url: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&q=80&w=800',
                description: 'Beautiful bridal makeup details', author: 'Sora'
            },
            {
                page_type: 'services', category: 'Styling & Makeover', subcategory: 'All', media_type: 'image',
                url: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&q=80&w=800',
                description: 'Cosmetics styling setup', author: 'Sora'
            },
            {
                page_type: 'services', category: 'Styling & Makeover', subcategory: 'Bridal Makeover', media_type: 'image',
                url: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&q=80&w=800',
                description: 'Beautiful bridal makeup details', author: 'Sora'
            },

            // === 2. Workshop Page Media (Images & Videos) ===
            // Yoga Workshops
            {
                page_type: 'workshops', category: 'Yoga', subcategory: 'All', media_type: 'image',
                url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=800',
                description: 'Dynamic Vinyasa flow class stretching', author: 'An挑戰'
            },
            {
                page_type: 'workshops', category: 'Yoga', subcategory: 'All', media_type: 'video',
                url: 'https://player.vimeo.com/external/371433846.sd.mp4?s=236da2f3c054273f60f6efec27c02c6cbb030226&profile_id=139&oauth2_token_id=57447761',
                thumbnail_url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=800',
                description: 'Vinyasa yoga flow video lesson', author: 'Pexels Video'
            },
            // Meditation Workshops
            {
                page_type: 'workshops', category: 'Meditation', subcategory: 'All', media_type: 'image',
                url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=800',
                description: 'Zen meditation at sunset', author: 'Jared Rice'
            },
            {
                page_type: 'workshops', category: 'Meditation', subcategory: 'All', media_type: 'video',
                url: 'https://player.vimeo.com/external/485603224.sd.mp4?s=c8ffcf86050b1a03e2c21966a3ea66453d85834b&profile_id=165&oauth2_token_id=57447761',
                thumbnail_url: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&q=80&w=800',
                description: 'Tibetan singing bowl sound therapy', author: 'Pexels Video'
            },
            // Wellness Retreats (Holistic/Ayurveda)
            {
                page_type: 'workshops', category: 'Holistic', subcategory: 'All', media_type: 'image',
                url: 'https://images.unsplash.com/photo-1528319725582-ddc096101511?auto=format&fit=crop&q=80&w=800',
                description: 'Outdoor wellness mindfulness retreat', author: 'Dingzeyu Li'
            },
            {
                page_type: 'workshops', category: 'Holistic', subcategory: 'All', media_type: 'video',
                url: 'https://player.vimeo.com/external/409228833.sd.mp4?s=c130ef7cae617d9282fa2c92e76f6c91e138ee4e&profile_id=165&oauth2_token_id=57447761',
                thumbnail_url: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&q=80&w=800',
                description: 'Holistic massage and oils wellness retreat session', author: 'Pexels Video'
            },

            // === 3. Vedic Life Packages (Ayurveda, Yoga, Wellness, Holistic Lifestyle) ===
            {
                page_type: 'vedic_packages', category: 'Retreat', subcategory: 'All', media_type: 'image',
                url: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&q=80&w=800',
                description: 'Holistic Ayurveda wellness retreat center', author: 'Devi'
            },
            {
                page_type: 'vedic_packages', category: 'Treatment', subcategory: 'All', media_type: 'image',
                url: 'https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?auto=format&fit=crop&q=80&w=800',
                description: 'Traditional Ayurvedic herbal remedies', author: 'Anoop'
            },
            {
                page_type: 'vedic_packages', category: 'Consultation', subcategory: 'All', media_type: 'image',
                url: 'https://images.unsplash.com/photo-1608889175123-8ec330b86f84?auto=format&fit=crop&q=80&w=800',
                description: 'Ayurvedic wellness consulting mortar pestle', author: 'Devi'
            },
            {
                page_type: 'vedic_packages', category: 'Accommodation', subcategory: 'All', media_type: 'image',
                url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=800',
                description: 'Luxury wellness resort cottage accommodation', author: 'Manuel Moreno'
            },

            // === 4. Blog Page (Ayurveda, Yoga, Wellness, Healthy Lifestyle) ===
            {
                page_type: 'blogs', category: 'AYURVEDA', subcategory: 'All', media_type: 'image',
                url: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=800',
                description: 'Ayurvedic spices and healthy herbs', author: 'Katherine Karas'
            },
            {
                page_type: 'blogs', category: 'YOGA', subcategory: 'All', media_type: 'image',
                url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=800',
                description: 'Pranayama yoga flow meditation', author: 'Jared Rice'
            },
            {
                page_type: 'blogs', category: 'NUTRITION', subcategory: 'All', media_type: 'image',
                url: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&q=80&w=800',
                description: 'Nutritious salad healthy food blog topic', author: 'Brooke Lark'
            },
            {
                page_type: 'blogs', category: 'WELLNESS', subcategory: 'All', media_type: 'image',
                url: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&q=80&w=800',
                description: 'Morning wellness dinacharya ritual self care', author: 'Valeriia Harchenko'
            }
        ];

        for (const item of seedMedia) {
            await query(`
                INSERT INTO unsplash_media (category, subcategory, page_type, media_type, url, thumbnail_url, description, author)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (category, subcategory, page_type, url) DO NOTHING
            `, [
                item.category, item.subcategory || 'All', item.page_type, item.media_type, 
                item.url, item.thumbnail_url || null, item.description, item.author
            ]);
        }

        console.log(`✅ Seeded ${seedMedia.length} initial stock media records successfully.`);
        console.log('🟢 v19 migration completed successfully.');
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

run();
