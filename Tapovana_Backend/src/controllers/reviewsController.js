const https = require('https');
const http = require('http');
const { query } = require('../config/db');

const RENDER_BACKEND_URL = process.env.RENDER_BACKEND_URL || 'https://tapoclg.onrender.com';

const fetchRemoteReviews = (url) => {
    return new Promise((resolve) => {
        const client = url.startsWith('https') ? https : http;
        const req = client.get(url, { timeout: 7000 }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    const list = Array.isArray(parsed) ? parsed : (parsed.reviews || parsed.feedbacks || parsed.data || []);
                    resolve(Array.isArray(list) ? list : []);
                } catch (e) {
                    resolve([]);
                }
            });
        });
        req.on('error', () => resolve([]));
        req.on('timeout', () => { req.destroy(); resolve([]); });
    });
};

const syncIncomingReviews = async () => {
    try {
        await query(`
            CREATE TABLE IF NOT EXISTS reviews (
                id SERIAL PRIMARY KEY,
                customer_name VARCHAR(255),
                customer_email VARCHAR(255),
                rating INTEGER DEFAULT 5,
                comment TEXT,
                service_id VARCHAR(100),
                status VARCHAR(50) DEFAULT 'Pending',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        `);

        await query(`
            ALTER TABLE reviews 
            ADD COLUMN IF NOT EXISTS username VARCHAR(255),
            ADD COLUMN IF NOT EXISTS email VARCHAR(255),
            ADD COLUMN IF NOT EXISTS module_type VARCHAR(100) DEFAULT 'Blog',
            ADD COLUMN IF NOT EXISTS title VARCHAR(255) DEFAULT 'General Feedback',
            ADD COLUMN IF NOT EXISTS feedback TEXT,
            ADD COLUMN IF NOT EXISTS date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        `);

        await query(`
            CREATE TABLE IF NOT EXISTS deleted_review_ids (
                review_id VARCHAR(255) PRIMARY KEY,
                deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        `);

        const remoteList = await fetchRemoteReviews(`${RENDER_BACKEND_URL}/api/reviews`);
        if (!remoteList.length) return;

        for (const item of remoteList) {
            const rawId = String(item.id || item._id || '');
            if (rawId) {
                const deletedCheck = await query('SELECT review_id FROM deleted_review_ids WHERE review_id = $1', [rawId]);
                if (deletedCheck.rows.length) continue;
            }

            const username = item.username || item.userName || item.user_name || item.customer_name || item.name || 'Anonymous';
            const email = item.email || item.customer_email || item.user_email || null;
            const module_type = item.module_type || item.moduleType || item.category || 'Blog';
            const title = item.title || item.subject || 'General Feedback';
            const feedback = item.feedback || item.comment || item.message || '';
            const rating = parseInt(item.rating || 5, 10);
            const date = item.date || item.created_at || new Date().toISOString();
            const status = item.status || 'Pending';

            if (!feedback) continue;

            const existing = await query('SELECT id FROM reviews WHERE (username = $1 OR customer_name = $1) AND (feedback = $2 OR comment = $2)', [username, feedback]);
            if (!existing.rows.length) {
                await query(
                    `INSERT INTO reviews (username, customer_name, email, customer_email, module_type, title, feedback, comment, rating, date, created_at, status)
                     VALUES ($1, $1, $2, $2, $3, $4, $5, $5, $6, $7, $7, $8)`,
                    [username, email, module_type, title, feedback, rating, date, status]
                );
            }
        }
    } catch (err) {
        console.error('syncIncomingReviews error:', err.message);
    }
};

exports.getReviews = async (req, res) => {
  try {
    await syncIncomingReviews();
    const result = await query(
      `SELECT id, 
              COALESCE(username, customer_name, 'Anonymous') AS username, 
              COALESCE(email, customer_email, 'N/A') AS email, 
              COALESCE(module_type, 'Blog') AS module_type, 
              COALESCE(title, 'General Feedback') AS title, 
              COALESCE(feedback, comment, '') AS feedback, 
              COALESCE(rating, 5) AS rating, 
              COALESCE(date, created_at, NOW()) AS date, 
              COALESCE(status, 'Pending') AS status
       FROM reviews
       ORDER BY COALESCE(date, created_at) DESC, id DESC`
    );
    return res.json({ success: true, reviews: result.rows });
  } catch (err) {
    console.error("getReviews error:", err);
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
    await query(`INSERT INTO deleted_review_ids (review_id) VALUES ($1) ON CONFLICT DO NOTHING`, [String(id)]);
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
