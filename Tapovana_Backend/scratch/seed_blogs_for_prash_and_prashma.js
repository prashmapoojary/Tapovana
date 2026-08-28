const { query } = require('../src/config/db');

async function seedBlogsForPrashAndPrashma() {
  console.log("=== SEEDING 2 PUBLISHED + 2 PENDING BLOGS FOR PRASH POO AND PRASHMA SALIAN ===");

  try {
    // 1. Fetch team member UUID for Prash Poo and Prashma Salian
    const prashPooRes = await query(`
      SELECT tm.id, tm.first_name, tm.last_name, tm.email, r.name AS role 
      FROM team_members tm
      JOIN roles r ON r.id = tm.role_id
      WHERE LOWER(CONCAT(tm.first_name, ' ', tm.last_name)) LIKE '%prash%poo%'
         OR LOWER(tm.email) LIKE '%29prashma10%'
      LIMIT 1
    `);

    const prashmaSalianRes = await query(`
      SELECT tm.id, tm.first_name, tm.last_name, tm.email, r.name AS role 
      FROM team_members tm
      JOIN roles r ON r.id = tm.role_id
      WHERE LOWER(CONCAT(tm.first_name, ' ', tm.last_name)) LIKE '%prashma%salian%'
         OR LOWER(tm.email) LIKE '%prashma2910%'
      LIMIT 1
    `);

    let prashPooId = '4dd67d95-ff18-4393-91e5-16af20e71fd2';
    if (prashPooRes.rows.length) {
      prashPooId = prashPooRes.rows[0].id;
      console.log(`Found Prash Poo: ID=${prashPooId}, Email=${prashPooRes.rows[0].email}`);
    }

    let prashmaSalianId = '4a089107-5e16-470c-a744-389bbe82bef2';
    if (prashmaSalianRes.rows.length) {
      prashmaSalianId = prashmaSalianRes.rows[0].id;
      console.log(`Found Prashma Salian: ID=${prashmaSalianId}, Email=${prashmaSalianRes.rows[0].email}`);
    }

    // 2. Define 8 unique, high-quality blogs (4 Published, 4 Pending)
    const newBlogs = [
      // --- PRASH POO (THERAPIST) - PUBLISHED (2) ---
      {
        title: "Marma Therapy: Unlocking Vital Energy Points for Deep Healing",
        slug: "marma-therapy-unlocking-vital-energy-points-for-deep-healing",
        category: "AYURVEDA",
        summary: "An essential therapist guide to Marma point stimulation for pain relief, muscular tension, and prana flow.",
        content_html: "<p>Marma points are 107 anatomical locations on the body where physical tissue and subtle life energy (Prana) intersect. Therapeutic Marma massage using warm herbal oils restores vital energy and relieves chronic joint pain.</p><p>Regular Marma therapy enhances blood circulation, releases emotional stress, and deepens physical relaxation.</p>",
        status: "published",
        author_name: "prash poo",
        author_role: "Therapist",
        created_by: prashPooId,
        read_time: "5 min read",
        featured_image: "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=800&q=80"
      },
      {
        title: "Sound Bath Healing: Restoring Cellular Frequencies Through Vibrations",
        slug: "sound-bath-healing-restoring-cellular-frequencies-through-vibrations",
        category: "HOLISTIC",
        summary: "Discover how Tibetan singing bowls and gong harmonics rebalance the brainwaves and promote deep restful sleep.",
        content_html: "<p>Sound bath therapy uses resonant frequencies from crystal and bronze singing bowls to induce alpha and theta brainwave states. As sound waves pass through the body, cellular vibration shifts into natural harmony.</p><p>Participants report reduced anxiety, improved sleep quality, and an overwhelming sense of peace after a 60-minute session.</p>",
        status: "published",
        author_name: "prash poo",
        author_role: "Therapist",
        created_by: prashPooId,
        read_time: "6 min read",
        featured_image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80"
      },

      // --- PRASH POO (THERAPIST) - PENDING REVIEW (2) ---
      {
        title: "Kirodhara Therapy: Cooling Hot Minds with Herbal Milk Infusions",
        slug: "kirodhara-therapy-cooling-hot-minds-with-herbal-milk-infusions",
        category: "WELLNESS",
        summary: "A gentle variation of Shirodhara using medicated milk to soothe Pitta burnout, headaches, and insomnia.",
        content_html: "<p>Kirodhara involves pouring a continuous stream of cooled, herb-infused milk over the forehead (Ajna chakra). It is particularly effective during warm seasons to pacify Pitta aggravated conditions like migraine and mental exhaustion.</p><p>This soothing therapy restores deep calm to the central nervous system.</p>",
        status: "pending",
        author_name: "prash poo",
        author_role: "Therapist",
        created_by: prashPooId,
        read_time: "4 min read",
        featured_image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=800&q=80"
      },
      {
        title: "Aromatherapy & Herbal Steam (Swedana) for Muscle Recovery",
        slug: "aromatherapy-herbal-steam-swedana-for-muscle-recovery",
        category: "WELLNESS",
        summary: "Combining therapeutic steam with eucalyptus and lemongrass oils to flush toxins and ease stiffness.",
        content_html: "<p>Swedana is the Ayurvedic practice of herbal steam bath following oil massage. Infusing the steam chamber with Eucalyptus and Lemongrass opens pores, loosens stubborn toxins, and accelerates post-workout muscle recovery.</p><p>Steam therapy leaves the skin glowing while relaxing tight fascia.</p>",
        status: "pending",
        author_name: "prash poo",
        author_role: "Therapist",
        created_by: prashPooId,
        read_time: "5 min read",
        featured_image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80"
      },

      // --- PRASHMA SALIAN (DOCTOR) - PUBLISHED (2) ---
      {
        title: "Clinical Diagnostics of Tridosha Imbalances in Modern Lifestyles",
        slug: "clinical-diagnostics-of-tridosha-imbalances-in-modern-lifestyles",
        category: "AYURVEDA",
        summary: "A doctor's perspective on identifying Vata, Pitta, and Kapha disruptions caused by chronic stress and poor sleep.",
        content_html: "<p>Modern lifestyle disorders like metabolic syndrome and chronic fatigue stem from hidden dosha imbalances. Pulse diagnosis (Nadi Pariksha) combined with tongue examination reveals early systemic dysfunction before clinical disease manifests.</p><p>Early Ayurvedic intervention through personalized diet modification reverses metabolic stress effectively.</p>",
        status: "published",
        author_name: "Dr. Prashma Salian",
        author_role: "Doctor",
        created_by: prashmaSalianId,
        read_time: "7 min read",
        featured_image: "https://images.unsplash.com/photo-1512290900673-8a39529b4703?auto=format&fit=crop&w=800&q=80"
      },
      {
        title: "Integrative Management of Thyroid & Metabolic Disorders",
        slug: "integrative-management-of-thyroid-metabolic-disorders",
        category: "NUTRITION",
        summary: "Balancing Glandular Agni with Kanchanar Guggulu, Ashwagandha, and specific circadian fasting rituals.",
        content_html: "<p>Thyroid health in Ayurveda is governed by Dhatu Agni (tissue metabolism). Formulations containing Kanchanar Guggulu and Ashwagandha regulate metabolic rate and hormonal balance naturally.</p><p>Aligning meal times with circadian solar peaks optimizes hormone synthesis and thyroid gland responsiveness.</p>",
        status: "published",
        author_name: "Dr. Prashma Salian",
        author_role: "Doctor",
        created_by: prashmaSalianId,
        read_time: "6 min read",
        featured_image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80"
      },

      // --- PRASHMA SALIAN (DOCTOR) - PENDING REVIEW (2) ---
      {
        title: "Rasayana Rejuvenation Protocols for Healthy Aging & Longevity",
        slug: "rasayana-rejuvenation-protocols-for-healthy-aging-longevity",
        category: "AYURVEDA",
        summary: "Understanding longevity therapies, Ojas building herbs like Chyawanprash and Brahmi for cognitive vitality.",
        content_html: "<p>Rasayana is the specialized branch of Ayurveda focused on cellular rejuvenation and extending lifespan. Rasayana herbs like Chyawanprash, Brahmi, and Guduchi scavenge free radicals and rebuild tissue integrity (Ojas).</p><p>Consistent Rasayana protocols enhance memory, immunity, and stamina well into golden years.</p>",
        status: "pending",
        author_name: "Dr. Prashma Salian",
        author_role: "Doctor",
        created_by: prashmaSalianId,
        read_time: "8 min read",
        featured_image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80"
      },
      {
        title: "Gut-Brain Axis & Ayurvedic Mental Health Interventions",
        slug: "gut-brain-axis-ayurvedic-mental-health-interventions",
        category: "HOLISTIC",
        summary: "How balancing gut microbiota (Koshtha) relieves anxiety, brain fog, and systemic inflammation.",
        content_html: "<p>Scientific research increasingly confirms what Ayurveda established millennia ago: the digestive tract directly governs neurological health. A compromised intestinal barrier leads to neuro-inflammation and mood fluctuations.</p><p>Administering probiotic buttermilk (Takra) infused with cumin and curry leaves heals gut lining and stabilizes mood.</p>",
        status: "pending",
        author_name: "Dr. Prashma Salian",
        author_role: "Doctor",
        created_by: prashmaSalianId,
        read_time: "6 min read",
        featured_image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=800&q=80"
      }
    ];

    for (const b of newBlogs) {
      const checkRes = await query(`SELECT id FROM blogs WHERE LOWER(title) = LOWER($1) LIMIT 1`, [b.title]);
      if (!checkRes.rows.length) {
        await query(
          `INSERT INTO blogs (title, slug, category, summary, content_html, status, author_name, author_role, read_time, featured_image, created_by, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::uuid, NOW())`,
          [b.title, b.slug, b.category, b.summary, b.content_html, b.status, b.author_name, b.author_role, b.read_time, b.featured_image, b.created_by]
        );
        console.log(`Inserted Blog [${b.status.toUpperCase()}]: "${b.title}" by ${b.author_name}`);
      } else {
        await query(
          `UPDATE blogs SET status = $1, author_name = $2, author_role = $3, featured_image = $4, created_by = $5::uuid, updated_at = NOW() WHERE id = $6`,
          [b.status, b.author_name, b.author_role, b.featured_image, b.created_by, checkRes.rows[0].id]
        );
        console.log(`Updated Blog [${b.status.toUpperCase()}]: "${b.title}" by ${b.author_name}`);
      }
    }

    const pubCount = (await query(`SELECT COUNT(*) FROM blogs WHERE status = 'published'`)).rows[0].count;
    const pendCount = (await query(`SELECT COUNT(*) FROM blogs WHERE status IN ('pending', 'pending_review')`)).rows[0].count;

    console.log(`\nDATABASE SUMMARY:`);
    console.log(`Total Published Blogs in DB: ${pubCount}`);
    console.log(`Total Pending Review Blogs in DB: ${pendCount}`);

  } catch (e) {
    console.error("Seeding error:", e);
  }

  process.exit(0);
}

seedBlogsForPrashAndPrashma();
