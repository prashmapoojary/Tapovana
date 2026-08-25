const { query } = require('../src/config/db');

const blogsByStaff = {
  "saliannagaprasad22@gmail.com": [
    {
      title: "Rasayana Chikitsa: Ayurvedic Rejuvenation for Cellular Longevity",
      subtitle: "Replenishing metabolic tissues and immune resilience through classical Rasayana herbs.",
      summary: "Explore the ancient science of Rasayana in Ayurveda, focusing on herbal formulations like Chyawanprash and Brahma Rasayana to combat premature cellular degeneration.",
      category: "AYURVEDA",
      featured_image: "https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&w=1200&q=80",
      read_time: "5 min read",
      status: "draft",
      seo_title: "Rasayana Chikitsa Rejuvenation Therapy | Dr. Nagaprasad Salian",
      seo_description: "Learn how classical Rasayana therapy restores tissue nourishment (Dhatu Agni) and enhances lifespan according to Ayurvedic medicine.",
      seo_keywords: "Rasayana, Rejuvenation, Ayurveda, Longevity, Immunity, Chyawanprash",
      content_html: `
        <h2>The Science of Cellular Rejuvenation (Rasayana)</h2>
        <p>In Ayurvedic medicine, <strong>Rasayana Chikitsa</strong> is the specialized branch dedicated to preserving youthfulness, enhancing memory, boosting immunity (Ojas), and extending life expectancy.</p>
        
        <h3>Key Principles of Rasayana</h3>
        <p>Rasayana herbs work by refining the transformation of Rasa Dhatu (plasma tissue) into subsequent tissue channels (Rakta, Mamsa, Meda, Asthi, Majja, and Shukra). Without clear channels (Srotas), nutrition cannot reach deep tissues.</p>

        <h3>Top Rasayana Herbs</h3>
        <ul>
          <li><strong>Amalaki (Emblica officinalis):</strong> The ultimate antioxidant rich in bio-available Vitamin C.</li>
          <li><strong>Ashwagandha (Withania somnifera):</strong> Strengthens nervous and neuromuscular vitality.</li>
          <li><strong>Guduchi (Tinospora cordifolia):</strong> Modulates immune responses and purifies blood chemistry.</li>
        </ul>
      `
    },
    {
      title: "Ayurvedic Protocols for Managing High Blood Pressure (Rakta Chapa)",
      subtitle: "Natural dietary shifts and herbal therapies to balance arterial pressure and Vata-Pitta.",
      summary: "Understand the root causes of hypertension (Rakta Chapa) in Ayurveda and discover how Arjuna, Sarpagandha, and diet soothe arterial tension.",
      category: "AYURVEDA",
      featured_image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80",
      read_time: "6 min read",
      status: "pending",
      seo_title: "Ayurvedic Management of High Blood Pressure | Dr. Nagaprasad Salian",
      seo_description: "Discover natural Ayurvedic treatments including Arjuna herb, reduced sodium intake, and stress reduction for hypertension management.",
      seo_keywords: "Hypertension, Rakta Chapa, Arjuna Herb, Blood Pressure, Ayurveda, Heart Health",
      content_html: `
        <h2>Rakta Chapa: Understanding Vascular Tension in Ayurveda</h2>
        <p>Hypertension is categorized in Ayurveda as a disorder involving <strong>Vyakta Vata</strong> and <strong>Pitta</strong> in the blood vascular system (Rakta Vaha Srotas). When emotional stress or dietary toxins constrict blood vessels, arterial pressure rises.</p>

        <h3>Cardioprotective Botanical Interventions</h3>
        <h4>1. Arjuna Bark (Terminalia arjuna)</h4>
        <p>Arjuna has been prescribed for millenniums as the premier cardiac tonic, strengthening heart muscle contraction and improving endothelial flexibility.</p>

        <h4>2. Sarpagandha (Rauwolfia serpentina)</h4>
        <p>Calms the central nervous system, reducing sympathetic vascular constriction and promoting calm rest.</p>
      `
    }
  ],
  "29prashma10@gmail.com": [
    {
      title: "Mindful Abhyanga: Therapeutic Touch and Somatic Healing",
      subtitle: "Releasing deep fascial tension and nervous exhaustion through rhythmic oil massage.",
      summary: "Discover how specialized Ayurvedic massage (Abhyanga) regulates parasympathetic nerve tone, reduces cortisol, and restores somatic emotional balance.",
      category: "WELLNESS",
      featured_image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1200&q=80",
      read_time: "5 min read",
      status: "draft",
      seo_title: "Mindful Abhyanga & Somatic Healing | Therapist Shivaranjini Poojary",
      seo_description: "Explore the therapeutic power of Abhyanga touch therapy for releasing fascia stress and grounding emotional Vata imbalances.",
      seo_keywords: "Abhyanga, Somatic Healing, Massage Therapy, Vata Balance, Touch Therapy, Wellness",
      content_html: `
        <h2>The Healing Power of Therapeutic Touch</h2>
        <p>Touch is the first sensory modality developed in utero, regulated primarily by Vata dosha through the skin (Sparshanendriya). Therapeutic oil massage acts directly upon cutaneous nerve endings to regulate the Vagus nerve.</p>

        <h3>Benefits for Chronic Fatigue & Anxiety</h3>
        <p>By applying warm herb-infused oils along the direction of hair follicles (Anulomana), Abhyanga calms hyper-reactive sensory receptors and promotes deep parasympathetic relaxation.</p>
      `
    },
    {
      title: "Ayurvedic Spa Protocols for Postpartum Recovery and Vata Restoration",
      subtitle: "Gentle abdominal binding, herb-infused baths, and grounding therapies for new mothers.",
      summary: "Learn classical Ayurvedic Sutika Paricharya (postpartum care) rituals that promote pelvic recovery, hormone balance, and maternal emotional peace.",
      category: "WELLNESS",
      featured_image: "https://images.unsplash.com/photo-1512290900673-8a39529b4703?auto=format&fit=crop&w=1200&q=80",
      read_time: "6 min read",
      status: "pending",
      seo_title: "Ayurvedic Postpartum Care & Recovery | Therapist Shivaranjini Poojary",
      seo_description: "Discover traditional Ayurvedic Sutika Paricharya rituals, warm oil treatments, and restorative foods for postpartum maternal wellness.",
      seo_keywords: "Postpartum Care, Sutika Paricharya, Maternal Health, Abhyanga, Vata Recovery, Wellness",
      content_html: `
        <h2>Sutika Paricharya: The First 42 Days</h2>
        <p>In traditional Ayurvedic care, the 42 days following childbirth are considered vital for setting a woman's health baseline for the next 40 years. Childbirth leaves an empty space in the pelvic cavity, rapidly increasing Vata dosha.</p>

        <h3>Core Rejuvenative Practices</h3>
        <ul>
          <li><strong>Warm Abhyanga & Vedana:</strong> Daily oil application followed by gentle herbal steam baths eases muscular soreness.</li>
          <li><strong>Vestra Bandhana (Abdominal Wrapping):</strong> Gentle wrapping of the abdomen supports organ realignment and uterine involution.</li>
        </ul>
      `
    }
  ],
  "susmapoojari.28@gmail.com": [
    {
      title: "Ayurvedic Management of PCOS and Hormonal Imbalances",
      subtitle: "Restoring menstrual regularity and metabolic balance through herbal Rasayanas.",
      summary: "Understand PCOS (Artava Kshaya) through the lens of Kapha-Vata blockage and learn how Kanchanar Guggulu and Shatavari regulate ovulation.",
      category: "AYURVEDA",
      featured_image: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=80",
      read_time: "6 min read",
      status: "draft",
      seo_title: "Ayurvedic Treatment for PCOS & Hormonal Balance | Dr. Sushma Poojary",
      seo_description: "Learn how Dr. Sushma Poojary utilizes Ayurvedic therapies, Kanchanar Guggulu, and Shatavari to reverse PCOS and normalize hormonal balance naturally.",
      seo_keywords: "PCOS, Hormonal Imbalance, Ayurveda, Shatavari, Kanchanar Guggulu, Women Health",
      content_html: `
        <h2>PCOS: An Ayurvedic Perspective (Artava Kshaya)</h2>
        <p>Polycystic Ovarian Syndrome is understood in Ayurveda as a state of metabolic sluggishness (Manda Agni) leading to Kapha accumulation in the ovarian channels (Artava Vaha Srotas), preventing normal follicle maturation.</p>

        <h3>Proven Botanical Interventions</h3>
        <ul>
          <li><strong>Kanchanar Guggulu:</strong> Clears glandular swellings and tissue stagnation in pelvic organs.</li>
          <li><strong>Shatavari (Asparagus racemosus):</strong> Promotes hormonal balance and nourishes ovarian tissue.</li>
          <li><strong>Varunadi Kwath:</strong> Enhances insulin sensitivity and metabolic lipid turnover.</li>
        </ul>
      `
    },
    {
      title: "Immunity and Gut Health: The Ayurvedic Triphala Protocol",
      subtitle: "Detoxifying the colon and restoring gut microbiome diversity with ancient Rasayana fruits.",
      summary: "Discover why Triphala (Amalaki, Bibhitaki, Haritaki) is Ayurveda's most venerated formula for digestive motility and gut-immune harmony.",
      category: "NUTRITION",
      featured_image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1200&q=80",
      read_time: "5 min read",
      status: "pending",
      seo_title: "Triphala Benefits for Gut Health & Immunity | Dr. Sushma Poojary",
      seo_description: "Explore the digestive and rejuvenative benefits of Triphala powder for colon cleansing, antioxidant protection, and immune enhancement.",
      seo_keywords: "Triphala, Gut Health, Immunity, Amalaki, Haritaki, Bibhitaki, Colon Cleanse, Nutrition",
      content_html: `
        <h2>Triphala: The Three Sacred Fruits of Wisdom</h2>
        <p>Triphala is composed of three dried fruits: <strong>Amalaki</strong> (Emblica officinalis), <strong>Bibhitaki</strong> (Terminalia bellirica), and <strong>Haritaki</strong> (Terminalia chebula). Together, they contain 5 of the 6 Ayurvedic tastes (excluding only salty).</p>

        <h3>How Triphala Works on the Digestive Tract</h3>
        <p>Unlike harsh chemical laxatives, Triphala gently tones the smooth muscle tissue of the intestinal wall, promotes healthy peristalsis, and feeds beneficial probiotic gut flora while flushing out Ama.</p>
      `
    }
  ]
};

async function seedAllStaffBlogs() {
  try {
    console.log("Starting blog seeding for all Doctors and Therapists...");

    for (const [email, blogsList] of Object.entries(blogsByStaff)) {
      console.log(`\nChecking staff member with email: ${email}...`);
      const memberRes = await query("SELECT id, first_name, last_name, email FROM team_members WHERE LOWER(email) = LOWER($1)", [email]);

      if (memberRes.rows.length === 0) {
        console.error(`❌ Team member with email ${email} not found!`);
        continue;
      }

      const authorId = memberRes.rows[0].id;
      const authorName = `${memberRes.rows[0].first_name} ${memberRes.rows[0].last_name}`;
      console.log(`Found ${authorName} (ID: ${authorId})`);

      for (let i = 0; i < blogsList.length; i++) {
        const b = blogsList[i];
        const slug = b.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString().slice(-4) + i;

        const res = await query(`
          INSERT INTO blogs (
            title, slug, subtitle, summary, category, content_html, featured_image,
            status, read_time, seo_title, seo_description, seo_keywords, created_by, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11, $12, $13, NOW(), NOW()
          ) RETURNING id, title, status
        `, [
          b.title, slug, b.subtitle, b.summary, b.category, b.content_html, b.featured_image,
          b.status, b.read_time, b.seo_title, b.seo_description, b.seo_keywords, authorId
        ]);

        const blogId = res.rows[0].id;
        console.log(`✓ Inserted blog for ${authorName} [${b.status}]: ID ${blogId} - "${res.rows[0].title}"`);

        // Add tags
        const tags = [b.category.toLowerCase(), "ayurveda", "wellness", "health"];
        for (const tag of tags) {
          await query('INSERT INTO blog_tags (blog_id, tag) VALUES ($1, $2) ON CONFLICT DO NOTHING', [blogId, tag]);
        }
      }
    }

    console.log("\n🎉 SEEDED 2 BLOGS FOR ALL DOCTORS AND THERAPISTS SUCCESSFULLY!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Failed to seed staff blogs:", err);
    process.exit(1);
  }
}

seedAllStaffBlogs();
