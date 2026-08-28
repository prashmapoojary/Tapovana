const { query } = require('../src/config/db');

async function seedBlogsForAdmin() {
  console.log("=== SEEDING 3 PUBLISHED AND 3 PENDING REVIEW BLOGS INTO DATABASE ===");

  try {
    const tmRes = await query(`SELECT id FROM team_members LIMIT 1`);
    const defaultUserId = tmRes.rows.length ? tmRes.rows[0].id : '4dd67d95-ff18-4393-91e5-16af20e71fd2';

    const publishedBlogs = [
      {
        title: "Ayurvedic Daily Routine (Dinacharya) for Vitality & Balance",
        slug: "ayurvedic-daily-routine-dinacharya-for-vitality-balance",
        category: "AYURVEDA",
        summary: "Discover essential morning and evening practices rooted in classical Ayurveda to align your body with nature's rhythm.",
        content_html: "<p>Dinacharya is an essential concept in Ayurveda that emphasizes daily rituals for optimal health. Starting your day with tongue scraping, warm water, and gentle self-massage (Abhyanga) prepares your body for natural detoxification and sustained energy.</p><p>By maintaining a consistent schedule, you harmonize your Vata, Pitta, and Kapha doshas, resulting in mental clarity and physical vitality.</p>",
        status: "published",
        author_name: "Dr. Sushma Salian",
        author_role: "Doctor",
        read_time: "5 min read",
        featured_image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=800&q=80"
      },
      {
        title: "Harnessing the Power of Pranayama for Stress Reduction",
        slug: "harnessing-the-power-of-pranayama-for-stress-reduction",
        category: "YOGA",
        summary: "Learn how controlled breathwork techniques like Anulom Vilom and Bhramari restore calm and reduce anxiety.",
        content_html: "<p>Pranayama is the science of breath regulation in Yoga. Daily practice of Nadi Shodhana (Alternate Nostril Breathing) regulates the nervous system, decreases cortisol levels, and improves lung capacity.</p><p>Integrating 10 minutes of conscious breathwork every morning enhances mindfulness and immune response.</p>",
        status: "published",
        author_name: "Dr. Hariprasad Prabhu",
        author_role: "Doctor",
        read_time: "4 min read",
        featured_image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80"
      },
      {
        title: "Sattvic Foods for Inner Harmony & Mindful Eating",
        slug: "sattvic-foods-for-inner-harmony-mindful-eating",
        category: "NUTRITION",
        summary: "A deep dive into fresh, wholesome, plant-based foods that nourish both body and consciousness.",
        content_html: "<p>In Ayurvedic philosophy, foods are categorized into Sattvic, Rajasic, and Tamasic. A Sattvic diet consists of fresh fruits, sprouted grains, ghee, nuts, and organic vegetables cooked with warming spices.</p><p>Eating Sattvic meals promotes mental peace, clear skin, and robust digestion (Agni).</p>",
        status: "published",
        author_name: "Suhan Salian",
        author_role: "Therapist",
        read_time: "6 min read",
        featured_image: "https://images.unsplash.com/photo-1512290900673-8a39529b4703?auto=format&fit=crop&w=800&q=80"
      }
    ];

    const pendingBlogs = [
      {
        title: "Holistic Skin Care Secrets using Ayurvedic Herbal Masks",
        slug: "holistic-skin-care-secrets-using-ayurvedic-herbal-masks",
        category: "WELLNESS",
        summary: "Explore natural herbal pastes made from Turmeric, Sandalwood, and Neem to reveal glowing, healthy skin.",
        content_html: "<p>Ayurvedic skin care focuses on treating the skin from within. Herbal pastes (Lepas) formulated with Neem and Turmeric soothe inflammation while Sandalwood cools and brightens the complexion.</p><p>Regular application preserves elasticity and prevents premature aging naturally.</p>",
        status: "pending",
        author_name: "Harish Poojary",
        author_role: "Therapist",
        read_time: "4 min read",
        featured_image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80"
      },
      {
        title: "Panchakarma Detox Therapy: Complete Seasonal Guide",
        slug: "panchakarma-detox-therapy-complete-seasonal-guide",
        category: "AYURVEDA",
        summary: "An in-depth explanation of the 5 bio-purification procedures used to cleanse toxins and rejuvenate organs.",
        content_html: "<p>Panchakarma is the ultimate Ayurvedic cleansing therapy designed to remove deep-rooted cellular toxins (Ama). Through five specialized treatments including Virechana and Basti, body tissues are thoroughly purified.</p><p>Seasonal Panchakarma retreats restore metabolic health and prevent chronic illnesses.</p>",
        status: "pending",
        author_name: "Dr. Sushma Salian",
        author_role: "Doctor",
        read_time: "7 min read",
        featured_image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80"
      },
      {
        title: "Understanding Agni: The Key to Digestive Wellness",
        slug: "understanding-agni-the-key-to-digestive-wellness",
        category: "NUTRITION",
        summary: "How to identify and balance your digestive fire (Agni) for enhanced nutrient absorption and immunity.",
        content_html: "<p>Agni, or metabolic fire, governs digestion, absorption, and transformation of food into life energy. When Agni is weak, un-digested food produces Ama (toxins), causing fatigue and bloating.</p><p>Sipping warm ginger tea before meals stimulates Agni and strengthens digestive capacity.</p>",
        status: "pending",
        author_name: "Dr. Hariprasad Prabhu",
        author_role: "Doctor",
        read_time: "5 min read",
        featured_image: "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=800&q=80"
      }
    ];

    const allToInsert = [...publishedBlogs, ...pendingBlogs];

    for (const b of allToInsert) {
      const checkRes = await query(`SELECT id FROM blogs WHERE LOWER(title) = LOWER($1) LIMIT 1`, [b.title]);
      if (!checkRes.rows.length) {
        await query(
          `INSERT INTO blogs (title, slug, category, summary, content_html, status, author_name, author_role, read_time, featured_image, created_by, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
          [b.title, b.slug, b.category, b.summary, b.content_html, b.status, b.author_name, b.author_role, b.read_time, b.featured_image, defaultUserId]
        );
        console.log(`Inserted Blog [${b.status.toUpperCase()}]: "${b.title}"`);
      } else {
        await query(
          `UPDATE blogs SET status = $1, updated_at = NOW() WHERE id = $2`,
          [b.status, checkRes.rows[0].id]
        );
        console.log(`Updated Blog Status [${b.status.toUpperCase()}]: "${b.title}"`);
      }
    }

    const pubCount = (await query(`SELECT COUNT(*) FROM blogs WHERE status = 'published'`)).rows[0].count;
    const pendCount = (await query(`SELECT COUNT(*) FROM blogs WHERE status = 'pending'`)).rows[0].count;

    console.log(`\nDATABASE SUMMARY:`);
    console.log(`Published Blogs Count in DB: ${pubCount}`);
    console.log(`Pending Review Blogs Count in DB: ${pendCount}`);

  } catch (e) {
    console.error("Seeding error:", e);
  }

  process.exit(0);
}

seedBlogsForAdmin();
