const { query } = require('../config/db');

exports.getReviews = async (req, res) => {
  try {
    const result = await query(
      `SELECT id, username, email, module_type, title, feedback, rating, date, status
       FROM reviews
       ORDER BY date DESC, id DESC`
    );
    return res.json({ success: true, reviews: result.rows });
  } catch (err) {
    console.error("getReviews error:", err);
    // Return empty array instead of crashing if table is empty/missing
    return res.json({ success: true, reviews: [] });
  }
};

exports.updateReviewStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const result = await query(
      `UPDATE reviews SET status = $1 WHERE id = $2 RETURNING *`,
      [status, id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Review not found.' });
    }
    return res.json({ success: true, message: 'Review status updated.', review: result.rows[0] });
  } catch (err) {
    console.error("updateReviewStatus error:", err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.deleteReview = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query(`DELETE FROM reviews WHERE id = $1 RETURNING id`, [id]);
    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Review not found.' });
    }
    return res.json({ success: true, message: 'Review deleted successfully.' });
  } catch (err) {
    console.error("deleteReview error:", err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};
