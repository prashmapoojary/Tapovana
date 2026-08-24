const { Client } = require('pg');

const c = new Client({
  connectionString: 'postgresql://neondb_owner:npg_9J7lqUbeAarM@ep-cold-snow-axc6fc35-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await c.connect();
  await c.query('SET search_path TO public;');
  console.log('Updating all services with high-resolution Unsplash images...\n');

  const imageMap = [
    // Body Care
    { pattern: '%abhyanga%', url: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=600&q=80' },
    { pattern: '%shirodhara%', url: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=600&q=80' },
    { pattern: '%panchakarma%', url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80' },
    { pattern: '%hydrotherapy%', url: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=600&q=80' },
    { pattern: '%scrub%', url: 'https://images.unsplash.com/photo-1608248597261-26c7100e4e75?auto=format&fit=crop&w=600&q=80' },

    // Skin Care
    { pattern: '%kesar%', url: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=600&q=80' },
    { pattern: '%facial%', url: 'https://images.unsplash.com/photo-1512290900673-70020a5975ff?auto=format&fit=crop&w=600&q=80' },
    { pattern: '%tan%', url: 'https://images.unsplash.com/photo-1512290900673-70020a5975ff?auto=format&fit=crop&w=600&q=80' },
    { pattern: '%bleach%', url: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=600&q=80' },
    { pattern: '%waxing%', url: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=600&q=80' },

    // Hair Care
    { pattern: '%haircut%', url: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=600&q=80' },
    { pattern: '%hair spa%', url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80' },
    { pattern: '%blow-dry%', url: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=600&q=80' },
    { pattern: '%yoga%', url: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&w=600&q=80' },

    // Nail Care
    { pattern: '%manicure%', url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=600&q=80' },
    { pattern: '%pedicure%', url: 'https://images.unsplash.com/photo-1519415510236-718bdfcd89c8?auto=format&fit=crop&w=600&q=80' },
    { pattern: '%nail art%', url: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=600&q=80' },

    // Styling & Make over
    { pattern: '%makeup%', url: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=600&q=80' },
    { pattern: '%bridal%', url: 'https://images.unsplash.com/photo-1522337094846-8a838592e371?auto=format&fit=crop&w=600&q=80' },
    { pattern: '%hair styling%', url: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=600&q=80' }
  ];

  for (const item of imageMap) {
    const res = await c.query(`
      UPDATE services 
      SET image_url = $1 
      WHERE LOWER(name) LIKE $2 OR (image_url IS NULL OR image_url LIKE '/uploads/%');
    `, [item.url, item.pattern]);
    console.log(`Updated images for pattern "${item.pattern}": ${res.rowCount} rows`);
  }

  // Fallback for any remaining services without external Unsplash URLs
  await c.query(`
    UPDATE services 
    SET image_url = 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80' 
    WHERE image_url IS NULL OR image_url LIKE '/uploads/%';
  `);

  console.log('\n✅ All service images in Neon DB successfully updated with Unsplash URLs!');
  await c.end();
}

main().catch(err => { console.error(err); process.exit(1); });
