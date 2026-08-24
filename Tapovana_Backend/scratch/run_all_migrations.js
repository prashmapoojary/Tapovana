const { execSync } = require('child_process');
const path = require('path');

// Migrations in correct order (v2, v3, v5..v31)
const migrations = [
  'run_migration_v2.js',
  'run_migration_v3.js',
  'run_migration_v5.js',
  'run_migration_v6.js',
  'run_migration_v7.js',
  'run_migration_v8.js',
  'run_migration_v9.js',
  'run_migration_v10.js',
  'run_migration_v11.js',
  'run_migration_v12.js',
  'run_migration_v13.js',
  'run_migration_v14.js',
  'run_migration_v15.js',
  'run_migration_v16.js',
  'run_migration_v17.js',
  'run_migration_v18.js',
  'run_migration_v19.js',
  'run_migration_v20.js',
  'run_migration_v21.js',
  'run_migration_v22.js',
  'run_migration_v23_remove_certificates.js',
  'run_migration_v24_readd_certificates.js',
  'run_migration_v25_add_signature_image.js',
  'run_migration_v26_premium_certificates_table.js',
  'run_migration_v27_add_enrollment_source.js',
  'run_migration_v28_add_vedic_attendee_fields.js',
  'run_migration_v29_create_vedic_attendees_table.js',
  'run_migration_v30_workshop_certificates.js',
  'run_migration_v31_create_vedic_packages_members.js',
];

const sqlDir = path.join(__dirname, '../sql');

async function runAll() {
  for (const file of migrations) {
    const filePath = path.join(sqlDir, file);
    console.log(`\n========== Running: ${file} ==========`);
    try {
      const output = execSync(`node "${filePath}"`, {
        cwd: path.join(__dirname, '..'),
        timeout: 30000,
        encoding: 'utf8',
        env: { ...process.env }
      });
      console.log(output);
      console.log(`✅ ${file} completed`);
    } catch (err) {
      console.error(`⚠️ ${file} had issues: ${err.stdout || err.message}`);
      // Continue to next migration
    }
  }
  console.log('\n🎉 All migrations finished!');
}

runAll();
