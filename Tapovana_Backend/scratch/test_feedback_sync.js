const reviewsController = require('../src/controllers/reviewsController');

async function testFeedbackSync() {
  console.log("🧪 Testing Mobile Feedback Sync & API...");

  const fakeReq = {};
  const fakeRes = {
    json: (d) => {
      console.log("   Get Reviews Response Status: success =", d.success);
      console.log("   Total Reviews Count in DB:", d.reviews?.length);
      if (d.reviews && d.reviews.length > 0) {
        console.log("   Sample Review:", d.reviews[0]);
      }
    }
  };

  await reviewsController.getReviews(fakeReq, fakeRes);
  process.exit(0);
}

testFeedbackSync().catch(err => {
  console.error("❌ Feedback test error:", err);
  process.exit(1);
});
