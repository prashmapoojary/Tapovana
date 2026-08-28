const { query } = require('../src/config/db');

// Collection of 20 distinct, high quality Unsplash wellness / Ayurveda / yoga images
const UNIQUE_IMAGES = [
  "https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&w=800&q=80", // Yoga sunset pose
  "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80", // Meditation outdoors
  "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=800&q=80", // Spa essential oils & towels
  "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=800&q=80", // Massage oil therapy
  "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80", // Herbal steam spa
  "https://images.unsplash.com/photo-1512290900673-8a39529b4703?auto=format&fit=crop&w=800&q=80", // Herbal bowls & spices
  "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80", // Facial & skin care
  "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=800&q=80", // Healthy green smoothie bowl
  "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=800&q=80", // Fresh organic vegetables & herbs
  "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=800&q=80", // Healthy salad & tea
  "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&w=800&q=80", // Stethoscope & herbal medicine
  "https://images.unsplash.com/photo-1470468969717-61d5d54fd036?auto=format&fit=crop&w=800&q=80", // Forest nature walk & zen
  "https://images.unsplash.com/photo-1447452001602-7090c7ab2db3?auto=format&fit=crop&w=800&q=80", // Japanese garden lotus pond
  "https://images.unsplash.com/photo-1599447421416-3414500d18a5?auto=format&fit=crop&w=800&q=80", // Herbal tea infusion
  "https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&w=800&q=80", // Essential oil dropper
  "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=800&q=80", // Pilates stretching
  "https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=800&q=80", // Fitness & mindfulness
  "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80", // Vibrant salad bowl
  "https://images.unsplash.com/photo-1511295742362-92c96b124e52?auto=format&fit=crop&w=800&q=80", // Candlelight relaxation
  "https://images.unsplash.com/photo-1552196563-55cd4e45efb3?auto=format&fit=crop&w=800&q=80"  // Zen stones & bamboo
];

// Valid Doctor & Therapist authors to replace any Super Admin / Co Admin authors
const VALID_DOCTOR_THERAPIST_AUTHORS = [
  { name: "Dr. Prashma Salian", role: "Doctor" },
  { name: "Siddharth Kulal", role: "Therapist" },
  { name: "Dr. Deepa Kulkarni", role: "Doctor" },
  { name: "prash poo", role: "Therapist" },
  { name: "Dr. Meenakshi Hegde", role: "Doctor" },
  { name: "Pooja Bangera", role: "Therapist" }
];

async function updateBlogsUniqueImagesAndRoles() {
  console.log("=== UPDATING ALL BLOGS WITH UNIQUE IMAGES AND DOCTOR/THERAPIST AUTHORS ONLY ===");

  try {
    const res = await query(`SELECT id, title, author_name, author_role, featured_image, status FROM blogs ORDER BY id ASC`);
    console.log(`Found ${res.rows.length} total blogs in database.`);

    let imageIndex = 0;
    let authorIndex = 0;

    for (const blog of res.rows) {
      const isForbiddenRole = !blog.author_role || 
                              blog.author_role.toLowerCase().includes('admin') || 
                              blog.author_name.toLowerCase().includes('rose') || 
                              blog.author_name.toLowerCase().includes('admin');

      let newAuthorName = blog.author_name;
      let newAuthorRole = blog.author_role;

      if (isForbiddenRole) {
        const replacement = VALID_DOCTOR_THERAPIST_AUTHORS[authorIndex % VALID_DOCTOR_THERAPIST_AUTHORS.length];
        newAuthorName = replacement.name;
        newAuthorRole = replacement.role;
        authorIndex++;
      }

      const newImage = UNIQUE_IMAGES[imageIndex % UNIQUE_IMAGES.length];
      imageIndex++;

      await query(
        `UPDATE blogs 
         SET author_name = $1, author_role = $2, featured_image = $3, updated_at = NOW() 
         WHERE id = $4`,
        [newAuthorName, newAuthorRole, newImage, blog.id]
      );

      console.log(`Blog ID ${blog.id} updated: Title="${blog.title.slice(0, 30)}..." | Author="${newAuthorName}" (${newAuthorRole}) | ImageIndex=${imageIndex - 1}`);
    }

    const updatedList = await query(`SELECT id, title, author_name, author_role, featured_image, status FROM blogs ORDER BY status DESC, id ASC`);
    console.log(`\nALL UPDATED BLOGS (${updatedList.rows.length}):`);
    console.table(updatedList.rows.map(r => ({
      id: r.id,
      title: r.title.length > 35 ? r.title.slice(0, 32) + '...' : r.title,
      author: r.author_name,
      role: r.author_role,
      status: r.status,
      image: r.featured_image.slice(0, 45) + '...'
    })));

  } catch (e) {
    console.error("Update error:", e);
  }

  process.exit(0);
}

updateBlogsUniqueImagesAndRoles();
