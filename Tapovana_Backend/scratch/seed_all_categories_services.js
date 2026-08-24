const { Client } = require('pg');

const c = new Client({
  connectionString: 'postgresql://neondb_owner:npg_9J7lqUbeAarM@ep-cold-snow-axc6fc35-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await c.connect();
  await c.query('SET search_path TO public;');
  console.log('Connected to Neon DB to seed comprehensive services across ALL categories & subcategories...\n');

  // Complete list of services covering every single Category and Subcategory
  const servicesToSeed = [
    // ── 1. BODY CARE ──────────────────────────────────────────────────────────
    {
      name: 'Full Body Abhyanga Massage',
      category: 'Body Care',
      subcategory: 'Massages',
      description: 'Traditional warm herbal oil full body massage to harmonize Doshas, release muscle tension, and nourish deep tissues.',
      base_price: 2800.00,
      duration_minutes: 60,
      benefits: 'Relieves stress and anxiety\nImproves blood circulation\nEnhances sleep quality',
      required_certification: 'Kerala Therapy Certification',
      experience_level: 'Senior (3-7 Years)',
      tools: 'Warm Oil Dispenser\nAyurvedic Massage Table',
      image_url: '/uploads/service1.jpg',
      status: 'ACTIVE'
    },
    {
      name: 'Shirodhara Mind Calming Therapy',
      category: 'Body Care',
      subcategory: 'Facials',
      description: 'Gentle continuous stream of warm medicated oil poured onto the forehead for mental clarity and nervous system rejuvenation.',
      base_price: 3500.00,
      duration_minutes: 45,
      benefits: 'Calms central nervous system\nAlleviates chronic headaches\nPromotes deep relaxation',
      required_certification: 'BAMS (Ayurveda)',
      experience_level: 'Expert (7+ Years)',
      tools: 'Shirodhara Vessel\nHerbal Oil Stand',
      image_url: '/uploads/service2.jpg',
      status: 'ACTIVE'
    },
    {
      name: 'Herbal Body Polish & Scrub',
      category: 'Body Care',
      subcategory: 'Scrubs',
      description: 'Exfoliating full-body scrub made from organic neem, turmeric, and sandalwood pastes to shed dead skin cells.',
      base_price: 2200.00,
      duration_minutes: 50,
      benefits: 'Exfoliating dead skin\nRestoring natural glow\nDeep pore cleansing',
      required_certification: 'Certified Massage Therapist',
      experience_level: 'Mid-Level (2-3 Years)',
      tools: 'Organic Herbal Scrubs\nWarm Towel Warmer',
      image_url: '/uploads/service3.jpg',
      status: 'ACTIVE'
    },
    {
      name: 'Vedic Hydrotherapy Immersion',
      category: 'Body Care',
      subcategory: 'Hydrotherapy',
      description: 'Therapeutic bath infused with fresh flower petals, essential oils, and mineral salts for detox and lymphatic drainage.',
      base_price: 3000.00,
      duration_minutes: 45,
      benefits: 'Flushes lymphatic toxins\nSoothes joint inflammation\nSoftens skin texture',
      required_certification: 'Certified Massage Therapist',
      experience_level: 'Mid-Level (2-3 Years)',
      tools: 'Copper Hydrotub\nFlower Oils',
      image_url: '/uploads/service4.jpg',
      status: 'DRAFT'
    },

    // ── 2. SKIN CARE ──────────────────────────────────────────────────────────
    {
      name: 'Kesar & Chandan Glow Facial',
      category: 'Skin Care',
      subcategory: 'Facials',
      description: 'Luxurious Ayurvedic face treatment using pure saffron, sandalwood, and raw honey to brighten skin tone.',
      base_price: 2600.00,
      duration_minutes: 60,
      benefits: 'Brightens skin complexion\nReduces pigmentation\nRestores youthful elasticity',
      required_certification: 'Certified Massage Therapist',
      experience_level: 'Senior (3-7 Years)',
      tools: 'Jade Roller\nFacial Steamer',
      image_url: '/uploads/service5.jpg',
      status: 'ACTIVE'
    },
    {
      name: 'Sun Tan De-Pigmentation Treatment',
      category: 'Skin Care',
      subcategory: 'Detain Treatment',
      description: 'Specialized natural herbal mask designed to undo UV sun damage and even out hyperpigmented skin patches.',
      base_price: 1900.00,
      duration_minutes: 45,
      benefits: 'Removes stubborn sun tan\nEvens out skin tone\nHydrates sun-damaged skin',
      required_certification: 'Certified Massage Therapist',
      experience_level: 'Junior (0-2 Years)',
      tools: 'De-tan Clay Mask\nCooling Gel Applicator',
      image_url: '/uploads/service1.jpg',
      status: 'ACTIVE'
    },
    {
      name: 'Herbal Organic Facial Bleach',
      category: 'Skin Care',
      subcategory: 'Bleach',
      description: 'Ammonia-free herbal brightening pack formulated with milk proteins and lemon peel extract for gentle facial hair lightning.',
      base_price: 1200.00,
      duration_minutes: 30,
      benefits: 'Lightens fine facial hair\nRefines facial pores\nNo harsh chemical irritation',
      required_certification: 'Certified Massage Therapist',
      experience_level: 'Junior (0-2 Years)',
      tools: 'Herbal Cream\nMixing Bowl',
      image_url: '/uploads/service2.jpg',
      status: 'DRAFT'
    },
    {
      name: 'Full Arms & Legs Organic Waxing',
      category: 'Skin Care',
      subcategory: 'Waxing',
      description: 'Gentle sugar-based aloe vera wax for smooth, hair-free skin with zero redness or bumps.',
      base_price: 1500.00,
      duration_minutes: 40,
      benefits: 'Long lasting smoothness\nNo ingrown hairs\nSoothes sensitive skin',
      required_certification: 'Certified Massage Therapist',
      experience_level: 'Junior (0-2 Years)',
      tools: 'Sugar Wax Heater\nAloe Vera Soothing Gel',
      image_url: '/uploads/service3.jpg',
      status: 'ACTIVE'
    },

    // ── 3. HAIR CARE ──────────────────────────────────────────────────────────
    {
      name: 'Precision Layered Haircut & Styling',
      category: 'Hair Care',
      subcategory: 'Haircut',
      description: 'Custom tailored haircut designed to suit your face shape, accompanied by blow-dry and leave-in serum.',
      base_price: 1800.00,
      duration_minutes: 45,
      benefits: 'Enhances hair volume\nRemoves split ends\nModern aesthetic look',
      required_certification: 'Certified Massage Therapist',
      experience_level: 'Senior (3-7 Years)',
      tools: 'Japanese Shears\nBlow Dryer',
      image_url: '/uploads/service4.jpg',
      status: 'ACTIVE'
    },
    {
      name: 'Botanical Hair Spa & Deep Conditioning',
      category: 'Hair Care',
      subcategory: 'Hair Spa',
      description: 'Nourishing hot oil scalp massage followed by herbal hair mask and ozonated steam for silky, strong hair.',
      base_price: 2400.00,
      duration_minutes: 60,
      benefits: 'Deeply nourishes dry scalp\nControls dandruff and frizz\nStrengthens hair roots',
      required_certification: 'Certified Massage Therapist',
      experience_level: 'Mid-Level (2-3 Years)',
      tools: 'Ozone Hair Steamer\nScalp Massager',
      image_url: '/uploads/service5.jpg',
      status: 'ACTIVE'
    },
    {
      name: 'Volumizing Blow-Dry & Waves Styling',
      category: 'Hair Care',
      subcategory: 'Styling',
      description: 'Heat-protected professional blow-out for sleek straight or soft wavy hair styles that last all day.',
      base_price: 1400.00,
      duration_minutes: 30,
      benefits: 'Instant volume boost\nFrizz-free shine\nLong lasting hold',
      required_certification: 'Certified Massage Therapist',
      experience_level: 'Junior (0-2 Years)',
      tools: 'Ceramic Barrel Brush\nHeat Shield Spray',
      image_url: '/uploads/service1.jpg',
      status: 'DRAFT'
    },

    // ── 4. NAIL CARE ──────────────────────────────────────────────────────────
    {
      name: 'Rose & Honey Pampering Manicure',
      category: 'Nail Care',
      subcategory: 'Manicure',
      description: 'Soaking hands in warm rose water, nail shaping, cuticle care, hand massage, and non-toxic polish application.',
      base_price: 1500.00,
      duration_minutes: 45,
      benefits: 'Hydrates dry cuticles\nClean shaped nails\nRelaxing hand reflexology',
      required_certification: 'Certified Massage Therapist',
      experience_level: 'Junior (0-2 Years)',
      tools: 'Nail Buffer\nRose Oil Soak',
      image_url: '/uploads/service2.jpg',
      status: 'ACTIVE'
    },
    {
      name: 'Detoxifying Herbal Foot Pedicure',
      category: 'Nail Care',
      subcategory: 'Pedicure',
      description: 'Foot bath with Epsom salt and eucalyptus oil, callus removal, feet scrub, mask, and nail lacquer.',
      base_price: 1800.00,
      duration_minutes: 50,
      benefits: 'Removes dead foot callus\nRelieves tired aching feet\nPrevents ingrown toe nails',
      required_certification: 'Certified Massage Therapist',
      experience_level: 'Mid-Level (2-3 Years)',
      tools: 'Pedicure Tub\nPumice Stone\nFoot Scrubber',
      image_url: '/uploads/service3.jpg',
      status: 'ACTIVE'
    },
    {
      name: 'Gel Nail Art & Extension Touchup',
      category: 'Nail Care',
      subcategory: 'Nail Art',
      description: 'Creative custom nail art design using UV gel polishes, glitters, and protective topcoat finish.',
      base_price: 2200.00,
      duration_minutes: 60,
      benefits: 'Chip-resistant finish for 3 weeks\nStunning artistic designs\nProtects natural nail bed',
      required_certification: 'Certified Massage Therapist',
      experience_level: 'Senior (3-7 Years)',
      tools: 'UV LED Lamp\nFine Detail Brushes',
      image_url: '/uploads/service4.jpg',
      status: 'DRAFT'
    },

    // ── 5. STYLING & MAKE OVER ────────────────────────────────────────────────
    {
      name: 'HD Soft Glam Party Makeup',
      category: 'Styling & Make over',
      subcategory: 'Makeup',
      description: 'High-definition flawless foundation base, contoured features, subtle eyeshadow, and long-wear lip color.',
      base_price: 3500.00,
      duration_minutes: 75,
      benefits: 'Camera-ready HD finish\nSweat and transfer proof\nLightweight on skin',
      required_certification: 'Certified Massage Therapist',
      experience_level: 'Senior (3-7 Years)',
      tools: 'Beauty Blender\nAirbrush Kit\nHD Cosmetics',
      image_url: '/uploads/service5.jpg',
      status: 'ACTIVE'
    },
    {
      name: 'Royal Vedic Bridal Makeover Package',
      category: 'Styling & Make over',
      subcategory: 'Bridal Makeover',
      description: 'Complete luxury bridal transformation including HD airbrush makeup, saree/lehenga draping, and intricate hair updos.',
      base_price: 15000.00,
      duration_minutes: 180,
      benefits: 'Complete head-to-toe bridal look\nWaterproof 24h makeup\nPersonalized artist assistant',
      required_certification: 'BAMS (Ayurveda)',
      experience_level: 'Expert (7+ Years)',
      tools: 'Airbrush Makeup Station\nHair Extension Pins',
      image_url: '/uploads/service1.jpg',
      status: 'ACTIVE'
    },
    {
      name: 'Elegant Event Hair Styling & Updo',
      category: 'Styling & Make over',
      subcategory: 'Hair Styling',
      description: 'Sophisticated braided buns, messy chignons, or Hollywood curls suited for red-carpet and traditional events.',
      base_price: 2500.00,
      duration_minutes: 60,
      benefits: 'Secure hold for long events\nComplements saree & gown necklines\nIncludes decorative pins',
      required_certification: 'Certified Massage Therapist',
      experience_level: 'Senior (3-7 Years)',
      tools: 'Curling Wand\nFirm Hold Spray',
      image_url: '/uploads/service2.jpg',
      status: 'DRAFT'
    }
  ];

  console.log(`Inserting ${servicesToSeed.length} services directly into database...`);

  for (const s of servicesToSeed) {
    await c.query(`
      INSERT INTO services (
        name, category, subcategory, description, base_price, duration_minutes,
        benefits, required_certification, experience_level, tools, image_url, status,
        assigned_staff_ids, assigned_staff_details
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT DO NOTHING;
    `, [
      s.name, s.category, s.subcategory, s.description, s.base_price, s.duration_minutes,
      s.benefits, s.required_certification, s.experience_level, s.tools, s.image_url, s.status,
      JSON.stringify([]), JSON.stringify([])
    ]);
  }

  console.log('✅ All services inserted directly into Neon PostgreSQL database!');

  const countRes = await c.query('SELECT COUNT(*) as cnt FROM services');
  console.log(`Total services in database now: ${countRes.rows[0].cnt}`);

  await c.end();
}

main().catch(err => { console.error('Seeding error:', err); process.exit(1); });
