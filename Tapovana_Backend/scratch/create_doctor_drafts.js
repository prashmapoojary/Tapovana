const { query } = require('../src/config/db');

const draftBlogsData = [
  {
    title: "10 Daily Dinacharya Habits for Optimal Vitality and Ojas",
    subtitle: "Unlock daily energy and immunity with authentic Ayurvedic morning and evening routines.",
    summary: "Discover traditional Ayurvedic Dinacharya practices including oil pulling, tongue scraping, and warm herbal hydration to balance Vata, Pitta, and Kapha daily.",
    category: "AYURVEDA",
    featured_image: "https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&w=1200&q=80",
    read_time: "5 min read",
    seo_title: "10 Daily Ayurvedic Dinacharya Habits for Vitality | Tapovana",
    seo_description: "Learn essential Ayurvedic morning daily routines (Dinacharya) prescribed by Dr. Nagaprasad Salian for enhancing immunity, digestion, and clarity.",
    seo_keywords: "Ayurveda, Dinacharya, Daily Routine, Ojas, Immunity, Vata Pitta Kapha, Herbal Wellness",
    content_html: `
      <h2>The Timeless Wisdom of Dinacharya</h2>
      <p>In classical Ayurvedic wisdom, health is not merely the absence of disease, but a vibrant state of metabolic equilibrium (Sama Agni), balanced tissues (Dhatus), and serene mental clarity. <strong>Dinacharya</strong>—the daily Ayurvedic regimen—aligns human physiology with natural circadian rhythms.</p>
      
      <h3>1. Brahma Muhurta Waking</h3>
      <p>Waking during <em>Brahma Muhurta</em> (roughly 45 minutes before sunrise) connects your nervous system with pure sattvic energy, promoting mental peace and hormonal harmony.</p>
      
      <h3>2. Jivha Nirlekhana (Tongue Scraping)</h3>
      <p>Using a copper or silver tongue scraper removes overnight accumulation of <strong>Ama</strong> (metabolic toxins) and stimulates digestive agni.</p>
      
      <h3>3. Gandusha (Oil Pulling)</h3>
      <p>Swishing warm organic sesame or coconut oil fortifies oral hygiene, strengthens teeth, and enhances facial muscular tone.</p>
      
      <h3>4. Warm Water & Herbal Infusions</h3>
      <p>Drinking a warm glass of water infused with cumin, coriander, or fennel seeds awakens the gastrointestinal tract and gently promotes bowel evacuation.</p>
      
      <h3>5. Abhyanga (Self-Abhyanga Oil Massage)</h3>
      <p>Massaging the skin with warm warm herb-infused sesame oil calms Vata dosha, lubricates joints, and rejuvenates cutaneous tissues.</p>

      <p>Consistent practice of these ten core daily rituals builds durable immunity (Ojas) and prevents chronic metabolic stagnation.</p>
    `
  },
  {
    title: "Understanding Agni: The Sacred Fire of Digestion and Metabolism",
    subtitle: "Why digestive capacity is the ultimate foundation of physical and emotional health.",
    summary: "Explore the four states of Agni (Sama, Vishama, Tikshna, and Manda) and learn how to kindle your digestive fire through Ayurvedic dietetics.",
    category: "AYURVEDA",
    featured_image: "https://images.unsplash.com/photo-1512290900673-8a39529b4703?auto=format&fit=crop&w=1200&q=80",
    read_time: "6 min read",
    seo_title: "Understanding Agni in Ayurveda | Dr. Nagaprasad Salian",
    seo_description: "Deep dive into Ayurvedic Agni (digestive fire). Learn practical tips to balance digestion and eliminate metabolic Ama.",
    seo_keywords: "Agni, Digestion, Ayurveda, Ama, Metabolic Fire, Gut Health, Nutrition",
    content_html: `
      <h2>Agni: The Fundamental Pillar of Longevity</h2>
      <p>According to Acharya Charaka, a person's lifespan, complexion, strength, immunity, and vitality all depend upon <strong>Agni</strong>. When Agni functions optimally, food transforms into nourishing body tissues (Dhatus). When Agni is impaired, undigested food ferments into toxic <strong>Ama</strong>.</p>
      
      <h3>The Four Functional States of Agni</h3>
      <ul>
        <li><strong>Sama Agni (Balanced Fire):</strong> Digests food effortlessly at normal intervals. Tissues remain healthy and minds remain calm.</li>
        <li><strong>Vishama Agni (Irregular Fire):</strong> Caused by Vata aggravation. Causes bloating, constipation, variable appetite, and gas.</li>
        <li><strong>Tikshna Agni (Sharp/Hyperactive Fire):</strong> Caused by Pitta dominance. Leads to heartburn, hyperacidity, loose stools, and excessive thirst.</li>
        <li><strong>Manda Agni (Sluggish Fire):</strong> Caused by Kapha imbalance. Results in heaviness, slow metabolism, weight gain, and lethargy.</li>
      </ul>

      <h3>Spices to Re-kindle Your Agni</h3>
      <p>Incorporating fresh ginger, black pepper, long pepper (Trikatu), cumin, and ajwain into your meals restores optimal metabolic speed without overheating the system.</p>
    `
  },
  {
    title: "Ayurvedic Management of Seasonal Allergies and Respiratory Health",
    subtitle: "Natural protocols using Rasayanas and Pranayama for clear nasal passages.",
    summary: "Seasonal transitions (Rutu Sandhi) often trigger Kapha accumulation. Discover Ayurvedic herbs like Sitopaladi, Haridra, and Nasya oil treatment for sinus health.",
    category: "AYURVEDA",
    featured_image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1200&q=80",
    read_time: "4 min read",
    seo_title: "Ayurvedic Remedies for Seasonal Allergies | Dr. Nagaprasad Salian",
    seo_description: "Discover authentic Ayurvedic therapies including Nasya and herbal formulations to combat seasonal allergies and Kapha imbalances naturally.",
    seo_keywords: "Seasonal Allergies, Nasya, Ayurveda, Sinus Relief, Kapha, Haridra, Respiratory Health",
    content_html: `
      <h2>Rutu Sandhi: Navigating Seasonal Transitions</h2>
      <p>During the 14-day window surrounding seasonal shifts (Rutu Sandhi), the bodily doshas undergo natural accumulation and aggravation. Spring and autumn particularly provoke Kapha and Pitta doshas in the respiratory mucosa.</p>

      <h3>Key Ayurvedic Remedies for Sinus & Allergy Relief</h3>
      <h4>1. Pratimarsha Nasya</h4>
      <p>Instilling 2 drops of warm Anu Tailam or organic Ghee into each nostril daily creates a protective lipid shield against external allergens and dust particles.</p>

      <h4>2. Haridra Khanda & Turmeric Golden Milk</h4>
      <p>Turmeric combined with black pepper and warm plant milk strengthens the respiratory mucosal barrier and modulates hyperactive histamine responses.</p>

      <h4>3. Kapalabhati & Nadi Shodhana Pranayama</h4>
      <p>Daily diaphragmatic breathing practices clear mucus stasis, improve pulmonary blood circulation, and reduce bronchial hyper-responsiveness.</p>
    `
  },
  {
    title: "Pranayama and Mindful Breathing for Stress Reduction and Mental Clarity",
    subtitle: "Calming the Vata dosha in the nervous system through classical breath regulation.",
    summary: "Learn how controlled breathwork (Pranayama) acts as a direct bridge between the autonomic nervous system, mental tranquility, and cellular oxygenation.",
    category: "YOGA",
    featured_image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80",
    read_time: "5 min read",
    seo_title: "Pranayama for Stress Relief & Vata Balance | Tapovana Ayurveda",
    seo_description: "Master classical Pranayama techniques to calm your nervous system, reduce cortisol, and enhance mental focus according to Yogic and Ayurvedic principles.",
    seo_keywords: "Pranayama, Yoga, Stress Relief, Nadi Shodhana, Mindful Breathing, Mental Health, Vata Balance",
    content_html: `
      <h2>The Breath as the Control Dial of the Mind</h2>
      <p>In Yogic psychology, <em>Chitta</em> (mind) and <em>Prana</em> (vital breath) are intrinsically linked. When breath is irregular and shallow, thoughts become chaotic and anxious. When breath is rhythmic and deep, the mind enters a state of peaceful equilibrium.</p>

      <h3>3 Restorative Pranayama Practices</h3>
      <ol>
        <li><strong>Nadi Shodhana (Alternate Nostril Breathing):</strong> Balances the sympathetic (Pingala) and parasympathetic (Ida) nervous systems. Practice for 10 minutes prior to sleep.</li>
        <li><strong>Bhramari (Humming Bee Breath):</strong> Generates soothing vibrations that increase endogenous nitric oxide production and calm hyper-aroused neural circuits.</li>
        <li><strong>Sheetali & Sheetkari (Cooling Breath):</strong> Excellent during summer months or acute anger/anxiety episodes to cool Pitta heat in the heart and brain.</li>
      </ol>
    `
  },
  {
    title: "Ayurvedic Nutrition: Eating According to Your Prakriti (Body Type)",
    subtitle: "Why one size does not fit all in holistic dietetics and meal planning.",
    summary: "Discover the 6 Shada Rasas (tastes) and learn how to customize your diet to soothe Vata, Pitta, or Kapha constitutional dominance.",
    category: "NUTRITION",
    featured_image: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=80",
    read_time: "7 min read",
    seo_title: "Ayurvedic Nutrition & Constitutional Eating Guide | Dr. Nagaprasad Salian",
    seo_description: "Learn how to select foods, spices, and cooking methods tailored to your individual Ayurvedic Prakriti for vibrant metabolic health.",
    seo_keywords: "Ayurvedic Nutrition, Prakriti, Vata Diet, Pitta Diet, Kapha Diet, Six Tastes, Healthy Food",
    content_html: `
      <h2>Ahara: Food as Sacred Medicine</h2>
      <p>In Ayurveda, food (Ahara) is considered the primary pillar of health. However, a superfood for one individual can act as a toxin for another based on their unique <strong>Prakriti</strong> (mind-body constitution).</p>

      <h3>Nutritional Guidelines by Dosha Dominance</h3>
      <h4>Vata Types (Air & Ether)</h4>
      <p>Require warm, moist, grounding, cooked foods with healthy fats (Ghee, sesame oil). Emphasize sweet, sour, and salty tastes. Minimize cold salads and dry crackers.</p>

      <h4>Pitta Types (Fire & Water)</h4>
      <p>Require cooling, moderately dense, hydrating foods. Emphasize sweet, bitter, and astringent tastes. Minimize heavy spices, vinegar, fried foods, and alcohol.</p>

      <h4>Kapha Types (Earth & Water)</h4>
      <p>Require warm, light, dry, stimulating foods. Emphasize pungent, bitter, and astringent tastes. Minimize dairy, refined sugars, and excessive oily dishes.</p>
    `
  },
  {
    title: "Herbal Remedies for Joint Flexibility and Osteoarthritis Management",
    subtitle: "Traditional Ayurvedic botanical formulations for cartilage and bone health.",
    summary: "Explore how Guggulu, Shallaki (Boswellia), Ashwagandha, and Nirgundi oil reduce joint inflammation and support smooth synovial articulation.",
    category: "AYURVEDA",
    featured_image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1200&q=80",
    read_time: "6 min read",
    seo_title: "Ayurvedic Remedies for Joint Health & Arthritis | Dr. Nagaprasad Salian",
    seo_description: "Discover herbal remedies like Boswellia, Guggulu, and Janu Basti therapies to restore joint flexibility and alleviate osteoarthritis pain naturally.",
    seo_keywords: "Joint Health, Arthritis, Guggulu, Boswellia, Ayurveda, Janu Basti, Inflammation",
    content_html: `
      <h2>Restoring Sandhi Swasthya (Joint Health)</h2>
      <p>Osteoarthritis in Ayurveda is understood as <strong>Sandhigata Vata</strong>—where aggravated Vata dosha accumulates in the joint spaces (Sandhi), leading to drying of synovial fluid (Shleshmaka Kapha), cartilage erosion, and pain.</p>

      <h3>Top Botanical Interventions</h3>
      <ul>
        <li><strong>Shallaki (Boswellia serrata):</strong> Inhibits 5-LOX inflammatory enzymes, protecting cartilage matrix from degradation.</li>
        <li><strong>Yogaraj Guggulu:</strong> A classical polyherbal compound that detoxifies deep tissue channels (Srotas) and reduces stiffness.</li>
        <li><strong>Ashwagandha (Withania somnifera):</strong> Strengthens periarticular muscles and bone tissue (Asthi Dhatu).</li>
      </ul>

      <h3>External Therapies</h3>
      <p>Localized warm oil pooling (<strong>Janu Basti</strong>) using Mahanarayana Tailam offers deep thermal and lipid penetration directly into painful knee joints.</p>
    `
  },
  {
    title: "Holistic Sleep Hygiene: Ayurvedic Strategies for Restful Nidra",
    subtitle: "Overcoming insomnia and mental overactivity through bedtime rituals.",
    summary: "Nidra (sleep) is one of the three sub-pillars of life in Ayurveda. Learn how warm milk with nutmeg, Shiroabhyanga, and digital fasting restore deep restorative sleep.",
    category: "WELLNESS",
    featured_image: "https://images.unsplash.com/photo-1511295742362-92c96b124e52?auto=format&fit=crop&w=1200&q=80",
    read_time: "5 min read",
    seo_title: "Ayurvedic Secrets for Deep Sleep & Insomnia Relief | Dr. Nagaprasad Salian",
    seo_description: "Struggling with sleep? Discover proven Ayurvedic rituals like foot massage (Padabhyanga), herbs like Brahmi & Jatamansi, and evening dietary guidelines.",
    seo_keywords: "Sleep, Insomnia, Nidra, Ayurveda, Sleep Hygiene, Padabhyanga, Brahmi, Relaxation",
    content_html: `
      <h2>Nidra: The Sacred Pillar of Cellular Regeneration</h2>
      <p>In Ayurvedic physiology, sound sleep (Samyak Nidra) brings happiness, nourishment, tissue strength, virility, and mental endurance. Disturbed sleep leads to premature aging, cognitive decline, and metabolic disruption.</p>

      <h3>Bedtime Routine for Sound Sleep</h3>
      <ol>
        <li><strong>Padabhyanga (Foot Massage):</strong> Rubbing warm sesame oil or Brahmi Ghee on the soles of the feet calms hyperactive brain waves and pulls excess heat downward.</li>
        <li><strong>Spiced Warm Milk:</strong> A warm cup of organic milk (or almond milk) spiced with nutmeg, cardamom, and a pinch of Ashwagandha relaxes the nervous system.</li>
        <li><strong>Digital Detox after 8 PM:</strong> Blue light suppress Melatonin and excites Vata in the optic nerve and pineal gland.</li>
      </ol>
    `
  },
  {
    title: "The Power of Abhyanga: Daily Self-Massage with Herb-Infused Oils",
    subtitle: "Nourishing cutaneous tissues, improving lymphatic circulation, and slowing aging.",
    summary: "Discover why warm daily oil application is considered the ultimate anti-aging (Rasayana) technique for skin elasticity, nervous stability, and longevity.",
    category: "WELLNESS",
    featured_image: "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=1200&q=80",
    read_time: "5 min read",
    seo_title: "Abhyanga Daily Self Oil Massage Benefits | Tapovana Ayurveda",
    seo_description: "Learn the correct technique and oil selection for daily Ayurvedic self-massage (Abhyanga) to enhance circulation, skin health, and stress resilience.",
    seo_keywords: "Abhyanga, Oil Massage, Ayurveda, Self Care, Skin Health, Lymphatic Drainage, Vata Care",
    content_html: `
      <h2>Sneha: The Dual Meaning of Oil and Love</h2>
      <p>In Sanskrit, the word <em>Sneha</em> translates to both 'oil' and 'love'. Applying warm oil over the skin saturates the physical body with warmth and protective boundaries, soothing the nervous system.</p>

      <h3>Benefits of Daily Abhyanga</h3>
      <ul>
        <li>Improves cutaneous arterial and lymphatic circulation.</li>
        <li>Enhances skin glow, texture, and resilience against environmental pathogens.</li>
        <li>Pacifies hyperactive Vata dosha, alleviating anxiety and fatigue.</li>
        <li>Promotes joint lubrication and muscular flexibility.</li>
      </ul>

      <h3>Oil Selection by Body Type</h3>
      <p><strong>Vata:</strong> Sesame oil or Dhanwantharam Thailam.<br/>
      <strong>Pitta:</strong> Coconut oil or Murivenna.<br/>
      <strong>Kapha:</strong> Mustard oil, Sesame oil, or Eladi Thailam.</p>
    `
  },
  {
    title: "Ayurvedic Detoxification: Simple At-Home Kitchari Cleanse",
    subtitle: "Resetting your metabolic Agni and eliminating accumulated Ama safely.",
    summary: "Learn how a 3-day mono-diet of Kitchari (mung dal and basmati rice) gives the digestive system a deep rest while sustaining blood sugar stability.",
    category: "NUTRITION",
    featured_image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1200&q=80",
    read_time: "6 min read",
    seo_title: "3-Day Kitchari Cleanse & Home Detox Guide | Dr. Nagaprasad Salian",
    seo_description: "Step-by-step guide to conducting a gentle Ayurvedic 3-day Kitchari detox cleanse at home to reset digestion and boost clarity.",
    seo_keywords: "Kitchari, Ayurvedic Detox, Cleanse, Agni Reset, Mung Dal, Nutrition, Ama Detox",
    content_html: `
      <h2>Why Kitchari is the Perfect Healing Meal</h2>
      <p>Unlike harsh juice fasts or starvation diets that weaken Agni and provoke Vata, a <strong>Kitchari Cleanse</strong> supplies complete protein, easily absorbable complex carbohydrates, and therapeutic digestive spices.</p>

      <h3>How Kitchari Heals the Gut</h3>
      <p>The combination of split yellow mung dal and white basmati rice cooked soft with Ghee, cumin, coriander, turmeric, and ginger is exceptionally gentle on the intestinal lining. It allows gastrointestinal digestive enzymes to rest while pulling fat-soluble Ama out of cellular tissues.</p>

      <h3>Basic Cleanse Protocol</h3>
      <p>For 3 days, consume freshly prepared warm Kitchari for breakfast, lunch, and dinner. Sip warm CCF tea (Cumin, Coriander, Fennel) throughout the day. Avoid cold drinks, caffeine, and strenuous physical exertion.</p>
    `
  },
  {
    title: "Integrating Yoga Sthanas and Ayurvedic Marma Therapy for Energy Flow",
    subtitle: "Unblocking vital energetic pathways (Nadis) through posture and vital point stimulation.",
    summary: "Discover how combining classical Hatha Yoga postures with targeted Marma point stimulation unleashes blocked Prana energy and accelerates physical healing.",
    category: "YOGA",
    featured_image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80",
    read_time: "6 min read",
    seo_title: "Yoga & Marma Point Therapy Integration | Dr. Nagaprasad Salian",
    seo_description: "Explore the profound synergy between Asana practice and Ayurvedic Marma points to enhance energy flow, relieve pain, and deepen meditation.",
    seo_keywords: "Marma Therapy, Yoga Asana, Prana, Nadis, Energy Flow, Ayurveda Yoga, Healing",
    content_html: `
      <h2>Marma: The 107 Vital Anatomical Junctions</h2>
      <p><strong>Marma points</strong> are bio-energetic locations where muscle, vein, ligament, bone, and joint intersect, infused with vital Prana. In traditional Ayurvedic medicine, gentle pressure or oil application on Marma points removes blockages in energy channels (Nadis).</p>

      <h3>Synergy between Yoga Postures and Marma Points</h3>
      <ul>
        <li><strong>Bhujangasana (Cobra Pose):</strong> Stimulates <em>Hridaya Marma</em> (heart center) and <em>Kshipra Marma</em>, enhancing cardiovascular vitality and opening chest expansion.</li>
        <li><strong>Paschimottanasana (Seated Forward Bend):</strong> Activates <em>Basti Marma</em> (lower abdomen/sacral area) and regulates digestive apana vayu.</li>
        <li><strong>Vrikshasana (Tree Pose):</strong> Balances <em>Talahridaya Marma</em> in the soles of the feet, grounding root chakra energy and reducing anxiety.</li>
      </ul>
    `
  }
];

async function createDrafts() {
  try {
    console.log("1. Finding or creating Team Member: Nagaprasad Salian...");
    const email = "saliannagaprasad22@gmail.com";
    let memberRes = await query("SELECT id, first_name, last_name, email FROM team_members WHERE LOWER(email) = LOWER($1)", [email]);

    let authorId;
    if (memberRes.rows.length === 0) {
      console.log("Member not found, creating team member record...");
      const insertMember = await query(`
        INSERT INTO team_members (first_name, last_name, email, phone, role_id, status)
        VALUES ('Nagaprasad', 'Salian', $1, '7204582972', (SELECT id FROM roles WHERE UPPER(name) = 'DOCTOR' LIMIT 1), 'active')
        RETURNING id
      `, [email]);
      authorId = insertMember.rows[0].id;
    } else {
      authorId = memberRes.rows[0].id;
      console.log("Found existing team member ID:", authorId);
    }

    console.log(`2. Inserting 10 Ayurvedic draft blogs for Author ID: ${authorId}...`);

    for (let i = 0; i < draftBlogsData.length; i++) {
      const b = draftBlogsData[i];
      const slug = b.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString().slice(-4) + i;

      const res = await query(`
        INSERT INTO blogs (
          title, slug, subtitle, summary, category, content_html, featured_image,
          status, read_time, seo_title, seo_description, seo_keywords, created_by, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          'draft', $8, $9, $10, $11, $12, NOW(), NOW()
        ) RETURNING id, title, status
      `, [
        b.title, slug, b.subtitle, b.summary, b.category, b.content_html, b.featured_image,
        b.read_time, b.seo_title, b.seo_description, b.seo_keywords, authorId
      ]);

      const blogId = res.rows[0].id;
      console.log(`✓ Inserted Draft ${i + 1}/10: ID ${blogId} - "${res.rows[0].title}"`);

      // Add default tags
      const tags = [b.category.toLowerCase(), "ayurveda", "wellness", "health"];
      for (const tag of tags) {
        await query('INSERT INTO blog_tags (blog_id, tag) VALUES ($1, $2) ON CONFLICT DO NOTHING', [blogId, tag]);
      }
    }

    console.log("\n🎉 ALL 10 DRAFT BLOGS CREATED SUCCESSFULLY FOR NAGAPRASAD SALIAN!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Failed to create draft blogs:", err);
    process.exit(1);
  }
}

createDrafts();
