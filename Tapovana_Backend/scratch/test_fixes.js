const { autoUpdateVedicProgramStatuses } = require('../src/controllers/vedicProgramsController');
const { generateCertificatePDF } = require('../src/utils/pdfGenerator');

async function testFixes() {
  console.log('=== TESTING BOTH FIXES ===\n');

  console.log('1. Testing autoUpdateVedicProgramStatuses...');
  await autoUpdateVedicProgramStatuses();
  console.log('✅ autoUpdateVedicProgramStatuses completed with ZERO errors!');

  console.log('\n2. Testing generateCertificatePDF...');
  const pdfBuffer = await generateCertificatePDF({
    attendee_name: 'Prashant Poojary',
    workshop_title: 'Sunset Yoga Flow',
    completion_date: '2026-08-24',
    certificate_id: 'CERT-TEST-123'
  });
  console.log('✅ generateCertificatePDF completed successfully! PDF Buffer length:', pdfBuffer.length);

  console.log('\n🎉 ALL ERRORS RESOLVED CLEANLY!');
  process.exit(0);
}

testFixes().catch(err => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
