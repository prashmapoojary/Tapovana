const { query } = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, '../../uploads/blog-images');

const ensureUploadsDir = () => {
    if (process.env.NODE_ENV === 'production') return;
    if (!fs.existsSync(UPLOADS_DIR)) {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
};

// ── Ensure blog_audit_log table exists ──────────────────────────────────
query(`
    CREATE TABLE IF NOT EXISTS blog_audit_log (
        id SERIAL PRIMARY KEY,
        blog_id INTEGER NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
        status_change VARCHAR(100) NOT NULL,
        changed_at TIMESTAMPTZ DEFAULT NOW(),
        changed_by UUID REFERENCES team_members(id) ON DELETE SET NULL
    );
`).then(() => console.log('✅ blog_audit_log table verified/created'))
  .catch(err => console.error('Failed to create blog_audit_log table:', err));

// ── Helper: save base64 image ──────────────────────────────────────────
const handleBlogImage = (imageData) => {
    if (!imageData || typeof imageData !== 'string') return null;

    const matches = imageData.match(/^data:(image\/(jpeg|png|webp|gif|svg\+xml));base64,([\s\S]+)$/);
    if (matches && matches.length === 4) {
        if (process.env.NODE_ENV === 'production') {
            return imageData; // store as base64 string in production
        }
        const mime = matches[1];
        const extMap = {
            'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/png': '.png',
            'image/gif': '.gif', 'image/webp': '.webp', 'image/svg+xml': '.svg'
        };
        const ext = extMap[mime] || '.png';
        const buffer = Buffer.from(matches[3].replace(/\s/g, ''), 'base64');
        const filename = uuidv4() + ext;
        ensureUploadsDir();
        fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);
        return '/uploads/blog-images/' + filename;
    }

    if (/^https?:\/\//.test(imageData) || imageData.startsWith('/uploads/')) {
        return imageData;
    }
    return imageData;
};

// ── Helper: generate URL slug ──────────────────────────────────────────
const generateSlug = (title) => {
    let slug = title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 200);
    return slug || 'untitled';
};

const ensureUniqueSlug = async (slug, excludeId = null) => {
    let candidate = slug;
    let suffix = 1;
    while (true) {
        const check = excludeId
            ? await query('SELECT id FROM blogs WHERE slug = $1 AND id != $2', [candidate, excludeId])
            : await query('SELECT id FROM blogs WHERE slug = $1', [candidate]);
        if (check.rows.length === 0) return candidate;
        candidate = `${slug}-${suffix}`;
        suffix++;
        if (suffix > 100) return `${slug}-${Date.now()}`;
    }
};

// ── Helper: get read time ──────────────────────────────────────────────
const getReadTime = (html = '') => {
    const text = html.replace(/<[^>]*>/g, '');
    return Math.max(3, Math.ceil(text.split(/\s+/).length / 200)) + ' min read';
};

// ═══════════════════════════════════════════════════════════════════════
// GET /api/blogs
// ═══════════════════════════════════════════════════════════════════════
const getAllBlogs = async (req, res) => {
    try {
        const { search, category, tag, status, author, page = 1, limit = 50 } = req.query;
        const role = req.user?.role?.toUpperCase() || '';
        const userId = req.user?.id;
        const isAdmin = role === 'SUPER_ADMIN' || role === 'CO_ADMIN';
        const isStaff = role === 'DOCTOR' || role === 'THERAPIST';

        let where = [];
        let params = [];
        let paramIdx = 1;

        // Role-based access
        if (isAdmin) {
            if (status) {
                where.push(`b.status = $${paramIdx++}`);
                params.push(status);
            }
        } else if (isStaff) {
            // Staff see their own blogs (all statuses) + published from others
            if (status === 'my_blogs') {
                where.push(`b.created_by = $${paramIdx++}`);
                params.push(userId);
            } else {
                where.push(`(b.created_by = $${paramIdx++} OR b.status = 'published')`);
                params.push(userId);
            }
        } else {
            // Public: only published
            where.push(`b.status = 'published'`);
        }

        if (search) {
            where.push(`(LOWER(b.title) LIKE $${paramIdx} OR LOWER(b.summary) LIKE $${paramIdx})`);
            params.push(`%${search.toLowerCase()}%`);
            paramIdx++;
        }

        if (category && category !== 'ALL') {
            where.push(`b.category = $${paramIdx++}`);
            params.push(category);
        }

        if (author) {
            where.push(`b.created_by = $${paramIdx++}`);
            params.push(author);
        }

        const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

        const countResult = await query(`SELECT COUNT(*) FROM blogs b ${whereClause}`, params);
        const total = parseInt(countResult.rows[0].count, 10);

        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

        const result = await query(`
            SELECT b.*,
                   tm.first_name AS author_first_name,
                   tm.last_name AS author_last_name,
                   tm.email AS author_email,
                   r.name AS author_role,
                   (SELECT COUNT(*) FROM blog_likes bl WHERE bl.blog_id = b.id) AS like_count,
                   (SELECT COUNT(*) FROM blog_comments bc WHERE bc.blog_id = b.id AND bc.status = 'approved') AS comment_count
            FROM blogs b
            LEFT JOIN team_members tm ON tm.id = b.created_by
            LEFT JOIN roles r ON r.id = tm.role_id
            ${whereClause}
            ORDER BY b.created_at DESC
            LIMIT $${paramIdx++} OFFSET $${paramIdx++}
        `, [...params, parseInt(limit, 10), offset]);

        // Get tags for each blog
        const blogIds = result.rows.map(b => b.id);
        let tagsMap = {};
        if (blogIds.length > 0) {
            const tagsResult = await query(
                `SELECT blog_id, tag FROM blog_tags WHERE blog_id = ANY($1)`,
                [blogIds]
            );
            for (const t of tagsResult.rows) {
                if (!tagsMap[t.blog_id]) tagsMap[t.blog_id] = [];
                tagsMap[t.blog_id].push(t.tag);
            }
        }

        // Check user interactions
        let userLikes = {};
        let userBookmarks = {};
        if (userId && blogIds.length > 0) {
            const likesRes = await query('SELECT blog_id FROM blog_likes WHERE user_id = $1 AND blog_id = ANY($2)', [userId, blogIds]);
            for (const l of likesRes.rows) userLikes[l.blog_id] = true;

            const bookmarksRes = await query('SELECT blog_id FROM blog_bookmarks WHERE user_id = $1 AND blog_id = ANY($2)', [userId, blogIds]);
            for (const b of bookmarksRes.rows) userBookmarks[b.blog_id] = true;
        }

        const blogs = result.rows.map(b => ({
            id: b.id,
            title: b.title,
            slug: b.slug,
            summary: b.summary,
            category: b.category,
            featured_image: b.featured_image,
            status: b.status,
            view_count: b.view_count,
            like_count: parseInt(b.like_count, 10),
            comment_count: parseInt(b.comment_count, 10),
            is_featured: b.is_featured,
            rejection_reason: b.rejection_reason,
            published_at: b.published_at,
            scheduled_publish_at: b.scheduled_publish_at,
            created_at: b.created_at,
            updated_at: b.updated_at,
            read_time: getReadTime(b.content_html),
            tags: tagsMap[b.id] || [],
            user_liked: !!userLikes[b.id],
            user_bookmarked: !!userBookmarks[b.id],
            author: {
                id: b.created_by,
                name: `${b.author_first_name || ''} ${b.author_last_name || ''}`.trim(),
                initials: ((b.author_first_name || '')[0] || '') + ((b.author_last_name || '')[0] || ''),
                role: b.author_role,
                email: b.author_email
            }
        }));

        res.json({ success: true, blogs, total, page: parseInt(page, 10), limit: parseInt(limit, 10) });
    } catch (err) {
        console.error('getAllBlogs error:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch blogs.' });
    }
};

// ═══════════════════════════════════════════════════════════════════════
// GET /api/blogs/:id
// ═══════════════════════════════════════════════════════════════════════
const getBlogById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        const role = req.user?.role?.toUpperCase() || '';
        const isAdmin = role === 'SUPER_ADMIN' || role === 'CO_ADMIN';

        const result = await query(`
            SELECT b.*,
                   tm.first_name AS author_first_name,
                   tm.last_name AS author_last_name,
                   tm.email AS author_email,
                   r.name AS author_role,
                   app.first_name AS approver_first_name,
                   app.last_name AS approver_last_name,
                   (SELECT COUNT(*) FROM blog_likes bl WHERE bl.blog_id = b.id) AS like_count,
                   (SELECT COUNT(*) FROM blog_bookmarks bb WHERE bb.blog_id = b.id) AS bookmark_count
            FROM blogs b
            LEFT JOIN team_members tm ON tm.id = b.created_by
            LEFT JOIN roles r ON r.id = tm.role_id
            LEFT JOIN team_members app ON app.id = b.approved_by
            WHERE b.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Blog not found.' });
        }

        const b = result.rows[0];

        // Access check: public can only see published
        if (!isAdmin && b.created_by !== userId && b.status !== 'published') {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        // Get comments
        const commentsResult = await query(`
            SELECT bc.*, tm.first_name, tm.last_name
            FROM blog_comments bc
            LEFT JOIN team_members tm ON tm.id = bc.user_id
            WHERE bc.blog_id = $1
            ORDER BY bc.created_at DESC
        `, [id]);

        // Get tags
        const tagsResult = await query('SELECT tag FROM blog_tags WHERE blog_id = $1', [id]);

        // Get user interaction status
        let userLiked = false;
        let userBookmarked = false;
        if (userId) {
            const likeCheck = await query('SELECT id FROM blog_likes WHERE blog_id = $1 AND user_id = $2', [id, userId]);
            userLiked = likeCheck.rows.length > 0;
            const bookmarkCheck = await query('SELECT id FROM blog_bookmarks WHERE blog_id = $1 AND user_id = $2', [id, userId]);
            userBookmarked = bookmarkCheck.rows.length > 0;
        }

        // Get version history
        const versionsResult = await query(`
            SELECT bv.version, bv.title, bv.created_at, tm.first_name, tm.last_name
            FROM blog_versions bv
            LEFT JOIN team_members tm ON tm.id = bv.created_by
            WHERE bv.blog_id = $1
            ORDER BY bv.version DESC
        `, [id]);

        const blog = {
            id: b.id,
            title: b.title,
            slug: b.slug,
            content_html: b.content_html,
            content_json: b.content_json,
            summary: b.summary,
            category: b.category,
            featured_image: b.featured_image,
            status: b.status,
            rejection_reason: b.rejection_reason,
            view_count: b.view_count,
            like_count: parseInt(b.like_count, 10),
            bookmark_count: parseInt(b.bookmark_count, 10),
            is_featured: b.is_featured,
            published_at: b.published_at,
            scheduled_publish_at: b.scheduled_publish_at,
            approved_at: b.approved_at,
            created_at: b.created_at,
            updated_at: b.updated_at,
            read_time: getReadTime(b.content_html),
            seo_title: b.seo_title,
            seo_description: b.seo_description,
            seo_keywords: b.seo_keywords,
            tags: tagsResult.rows.map(t => t.tag),
            user_liked: userLiked,
            user_bookmarked: userBookmarked,
            author: {
                id: b.created_by,
                name: `${b.author_first_name || ''} ${b.author_last_name || ''}`.trim(),
                initials: ((b.author_first_name || '')[0] || '') + ((b.author_last_name || '')[0] || ''),
                role: b.author_role,
                email: b.author_email
            },
            approver: b.approved_by ? {
                name: `${b.approver_first_name || ''} ${b.approver_last_name || ''}`.trim()
            } : null,
            comments: commentsResult.rows.map(c => ({
                id: c.id,
                comment: c.comment,
                status: c.status,
                guest_name: c.guest_name,
                guest_email: c.guest_email,
                user_name: c.first_name ? `${c.first_name} ${c.last_name}`.trim() : null,
                user_id: c.user_id,
                created_at: c.created_at
            })),
            versions: versionsResult.rows.map(v => ({
                version: v.version,
                title: v.title,
                editor: v.first_name ? `${v.first_name} ${v.last_name}`.trim() : 'Unknown',
                created_at: v.created_at
            }))
        };

        res.json({ success: true, blog });
    } catch (err) {
        console.error('getBlogById error:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch blog.' });
    }
};

// ═══════════════════════════════════════════════════════════════════════
// POST /api/blogs
// ═══════════════════════════════════════════════════════════════════════
const createBlog = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            title, category = 'AYURVEDA', summary, content_html = '', content_json,
            featured_image, tags, seo_title, seo_description, seo_keywords,
            status = 'draft', scheduled_publish_at
        } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ success: false, message: 'Title is required.' });
        }

        const slug = await ensureUniqueSlug(generateSlug(title));
        const savedImage = handleBlogImage(featured_image);
        const finalStatus = status === 'scheduled' && scheduled_publish_at ? 'scheduled' : status;

        const result = await query(`
            INSERT INTO blogs (title, slug, content_html, content_json, summary, category, featured_image,
                               status, created_by, seo_title, seo_description, seo_keywords, scheduled_publish_at,
                               published_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING id
        `, [
            title.trim(), slug, content_html, content_json || null, summary || null,
            category, savedImage, finalStatus, userId,
            seo_title || null, seo_description || null, seo_keywords || null,
            scheduled_publish_at || null,
            finalStatus === 'published' ? new Date().toISOString() : null
        ]);

        const blogId = result.rows[0].id;

        // Log status change
        await query('INSERT INTO blog_audit_log (blog_id, status_change, changed_by) VALUES ($1, $2, $3)', [blogId, finalStatus, userId]);

        // Save version 1
        await query(`
            INSERT INTO blog_versions (blog_id, version, title, content_html, content_json, summary, featured_image, created_by)
            VALUES ($1, 1, $2, $3, $4, $5, $6, $7)
        `, [blogId, title.trim(), content_html, content_json || null, summary || null, savedImage, userId]);

        // Save tags
        if (tags && Array.isArray(tags)) {
            for (const tag of tags) {
                if (tag && tag.trim()) {
                    await query(
                        'INSERT INTO blog_tags (blog_id, tag) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                        [blogId, tag.trim()]
                    );
                }
            }
        }

        // If submitted for review, email admins
        if (finalStatus === 'pending') {
            try {
                const { sendBlogSubmittedEmail } = require('../services/emailService');
                const admins = await query(`
                    SELECT tm.email, tm.first_name FROM team_members tm
                    JOIN roles r ON r.id = tm.role_id
                    WHERE UPPER(r.name) IN ('SUPER_ADMIN', 'CO_ADMIN') AND tm.status = 'active'
                `);
                const authorName = `${req.user.first_name} ${req.user.last_name}`.trim();
                for (const admin of admins.rows) {
                    sendBlogSubmittedEmail({
                        to: admin.email,
                        adminName: admin.first_name,
                        authorName,
                        blogTitle: title.trim()
                    }).catch(err => console.error('Blog submitted email failed:', err));
                }
            } catch (emailErr) {
                console.error('Blog submitted email error:', emailErr);
            }
        }

        res.status(201).json({ success: true, message: 'Blog created.', blog_id: blogId, slug });
    } catch (err) {
        console.error('createBlog error:', err);
        res.status(500).json({ success: false, message: 'Failed to create blog.' });
    }
};

// ═══════════════════════════════════════════════════════════════════════
// PATCH /api/blogs/:id
// ═══════════════════════════════════════════════════════════════════════
const updateBlog = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const role = req.user.role?.toUpperCase() || '';
        const isAdmin = role === 'SUPER_ADMIN' || role === 'CO_ADMIN';

        const existing = await query('SELECT * FROM blogs WHERE id = $1', [id]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Blog not found.' });
        }

        const blog = existing.rows[0];

        // Check ownership
        if (!isAdmin && blog.created_by !== userId) {
            return res.status(403).json({ success: false, message: 'You can only edit your own blogs.' });
        }

        const {
            title, category, summary, content_html, content_json,
            featured_image, tags, seo_title, seo_description, seo_keywords,
            status, scheduled_publish_at
        } = req.body;

        // Build update
        const updates = [];
        const params = [];
        let paramIdx = 1;

        if (title !== undefined) { updates.push(`title = $${paramIdx++}`); params.push(title.trim()); }
        if (category !== undefined) { updates.push(`category = $${paramIdx++}`); params.push(category); }
        if (summary !== undefined) { updates.push(`summary = $${paramIdx++}`); params.push(summary); }
        if (content_html !== undefined) { updates.push(`content_html = $${paramIdx++}`); params.push(content_html); }
        if (content_json !== undefined) { updates.push(`content_json = $${paramIdx++}`); params.push(content_json); }
        if (seo_title !== undefined) { updates.push(`seo_title = $${paramIdx++}`); params.push(seo_title); }
        if (seo_description !== undefined) { updates.push(`seo_description = $${paramIdx++}`); params.push(seo_description); }
        if (seo_keywords !== undefined) { updates.push(`seo_keywords = $${paramIdx++}`); params.push(seo_keywords); }
        if (scheduled_publish_at !== undefined) { updates.push(`scheduled_publish_at = $${paramIdx++}`); params.push(scheduled_publish_at); }

        if (featured_image !== undefined) {
            const savedImage = handleBlogImage(featured_image);
            updates.push(`featured_image = $${paramIdx++}`);
            params.push(savedImage);
        }

        if (status !== undefined) {
            updates.push(`status = $${paramIdx++}`);
            params.push(status);
            if (status === 'published' && !blog.published_at) {
                updates.push(`published_at = NOW()`);
            }
        }

        // Update slug if title changed
        if (title !== undefined && title.trim() !== blog.title) {
            const newSlug = await ensureUniqueSlug(generateSlug(title.trim()), parseInt(id, 10));
            updates.push(`slug = $${paramIdx++}`);
            params.push(newSlug);
        }

        updates.push('updated_at = NOW()');

        if (updates.length === 1) {
            return res.status(400).json({ success: false, message: 'Nothing to update.' });
        }

        params.push(id);
        await query(`UPDATE blogs SET ${updates.join(', ')} WHERE id = $${paramIdx}`, params);

        // Log status change if updated
        if (status !== undefined && status !== blog.status) {
            await query('INSERT INTO blog_audit_log (blog_id, status_change, changed_by) VALUES ($1, $2, $3)', [id, status, userId]);
        }

        // Save new version
        const versionCount = await query('SELECT MAX(version) AS max_v FROM blog_versions WHERE blog_id = $1', [id]);
        const nextVersion = (parseInt(versionCount.rows[0]?.max_v, 10) || 0) + 1;
        await query(`
            INSERT INTO blog_versions (blog_id, version, title, content_html, content_json, summary, featured_image, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
            id, nextVersion,
            title !== undefined ? title.trim() : blog.title,
            content_html !== undefined ? content_html : blog.content_html,
            content_json !== undefined ? content_json : blog.content_json,
            summary !== undefined ? summary : blog.summary,
            featured_image !== undefined ? handleBlogImage(featured_image) : blog.featured_image,
            userId
        ]);

        // Update tags if provided
        if (tags !== undefined && Array.isArray(tags)) {
            await query('DELETE FROM blog_tags WHERE blog_id = $1', [id]);
            for (const tag of tags) {
                if (tag && tag.trim()) {
                    await query(
                        'INSERT INTO blog_tags (blog_id, tag) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                        [id, tag.trim()]
                    );
                }
            }
        }

        res.json({ success: true, message: 'Blog updated.' });
    } catch (err) {
        console.error('updateBlog error:', err);
        res.status(500).json({ success: false, message: 'Failed to update blog.' });
    }
};

// ═══════════════════════════════════════════════════════════════════════
// DELETE /api/blogs/:id
// ═══════════════════════════════════════════════════════════════════════
const deleteBlog = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const role = req.user.role?.toUpperCase() || '';
        const isAdmin = role === 'SUPER_ADMIN' || role === 'CO_ADMIN';

        const existing = await query('SELECT created_by FROM blogs WHERE id = $1', [id]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Blog not found.' });
        }

        if (!isAdmin && existing.rows[0].created_by !== userId) {
            return res.status(403).json({ success: false, message: 'You can only delete your own blogs.' });
        }

        await query('DELETE FROM blogs WHERE id = $1', [id]);
        res.json({ success: true, message: 'Blog deleted.' });
    } catch (err) {
        console.error('deleteBlog error:', err);
        res.status(500).json({ success: false, message: 'Failed to delete blog.' });
    }
};

// ═══════════════════════════════════════════════════════════════════════
// POST /api/blogs/:id/submit
// ═══════════════════════════════════════════════════════════════════════
const submitBlog = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const existing = await query('SELECT * FROM blogs WHERE id = $1', [id]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Blog not found.' });
        }

        const blog = existing.rows[0];
        if (blog.created_by !== userId) {
            return res.status(403).json({ success: false, message: 'You can only submit your own blogs.' });
        }

        if (!['draft', 'rejected'].includes(blog.status)) {
            return res.status(400).json({ success: false, message: `Cannot submit a blog with status '${blog.status}'.` });
        }

        await query("UPDATE blogs SET status = 'pending', rejection_reason = NULL, updated_at = NOW() WHERE id = $1", [id]);
        await query('INSERT INTO blog_audit_log (blog_id, status_change, changed_by) VALUES ($1, $2, $3)', [id, 'pending', userId]);

        // Email admins
        try {
            const { sendBlogSubmittedEmail } = require('../services/emailService');
            const admins = await query(`
                SELECT tm.email, tm.first_name FROM team_members tm
                JOIN roles r ON r.id = tm.role_id
                WHERE UPPER(r.name) IN ('SUPER_ADMIN', 'CO_ADMIN') AND tm.status = 'active'
            `);
            const authorName = `${req.user.first_name} ${req.user.last_name}`.trim();
            for (const admin of admins.rows) {
                sendBlogSubmittedEmail({
                    to: admin.email,
                    adminName: admin.first_name,
                    authorName,
                    blogTitle: blog.title
                }).catch(err => console.error('Blog submitted email failed:', err));
            }
        } catch (emailErr) {
            console.error('Blog submitted email error:', emailErr);
        }

        res.json({ success: true, message: 'Blog submitted for review.' });
    } catch (err) {
        console.error('submitBlog error:', err);
        res.status(500).json({ success: false, message: 'Failed to submit blog.' });
    }
};

// ═══════════════════════════════════════════════════════════════════════
// POST /api/blogs/:id/approve
// ═══════════════════════════════════════════════════════════════════════
const approveBlog = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const existing = await query('SELECT * FROM blogs WHERE id = $1', [id]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Blog not found.' });
        }

        const blog = existing.rows[0];
        if (blog.status !== 'pending') {
            return res.status(400).json({ success: false, message: `Cannot approve a blog with status '${blog.status}'.` });
        }

        await query(`
            UPDATE blogs SET status = 'published', approved_by = $1, approved_at = NOW(),
                             published_at = NOW(), rejection_reason = NULL, updated_at = NOW()
            WHERE id = $2
        `, [userId, id]);
        await query('INSERT INTO blog_audit_log (blog_id, status_change, changed_by) VALUES ($1, $2, $3)', [id, 'published', userId]);

        // Email author
        try {
            const { sendBlogApprovedEmail } = require('../services/emailService');
            const author = await query('SELECT email, first_name FROM team_members WHERE id = $1', [blog.created_by]);
            if (author.rows.length > 0) {
                sendBlogApprovedEmail({
                    to: author.rows[0].email,
                    authorName: author.rows[0].first_name,
                    blogTitle: blog.title
                }).catch(err => console.error('Blog approved email failed:', err));
            }
        } catch (emailErr) {
            console.error('Blog approved email error:', emailErr);
        }

        res.json({ success: true, message: 'Blog approved and published.' });
    } catch (err) {
        console.error('approveBlog error:', err);
        res.status(500).json({ success: false, message: 'Failed to approve blog.' });
    }
};

// ═══════════════════════════════════════════════════════════════════════
// POST /api/blogs/:id/reject
// ═══════════════════════════════════════════════════════════════════════
const rejectBlog = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason || !reason.trim()) {
            return res.status(400).json({ success: false, message: 'Rejection reason is required.' });
        }

        const existing = await query('SELECT * FROM blogs WHERE id = $1', [id]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Blog not found.' });
        }

        const blog = existing.rows[0];
        if (blog.status !== 'pending') {
            return res.status(400).json({ success: false, message: `Cannot reject a blog with status '${blog.status}'.` });
        }

        await query("UPDATE blogs SET status = 'rejected', rejection_reason = $1, updated_at = NOW() WHERE id = $2", [reason.trim(), id]);
        await query('INSERT INTO blog_audit_log (blog_id, status_change, changed_by) VALUES ($1, $2, $3)', [id, 'rejected', req.user?.id || null]);

        // Email author
        try {
            const { sendBlogRejectedEmail } = require('../services/emailService');
            const author = await query('SELECT email, first_name FROM team_members WHERE id = $1', [blog.created_by]);
            if (author.rows.length > 0) {
                sendBlogRejectedEmail({
                    to: author.rows[0].email,
                    authorName: author.rows[0].first_name,
                    blogTitle: blog.title,
                    reason: reason.trim()
                }).catch(err => console.error('Blog rejected email failed:', err));
            }
        } catch (emailErr) {
            console.error('Blog rejected email error:', emailErr);
        }

        res.json({ success: true, message: 'Blog rejected.' });
    } catch (err) {
        console.error('rejectBlog error:', err);
        res.status(500).json({ success: false, message: 'Failed to reject blog.' });
    }
};

// ═══════════════════════════════════════════════════════════════════════
// POST /api/blogs/:id/archive
// ═══════════════════════════════════════════════════════════════════════
const archiveBlog = async (req, res) => {
    try {
        const { id } = req.params;

        const existing = await query('SELECT status FROM blogs WHERE id = $1', [id]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Blog not found.' });
        }

        if (existing.rows[0].status !== 'published') {
            return res.status(400).json({ success: false, message: 'Only published blogs can be archived.' });
        }

        await query("UPDATE blogs SET status = 'archived', updated_at = NOW() WHERE id = $1", [id]);
        await query('INSERT INTO blog_audit_log (blog_id, status_change, changed_by) VALUES ($1, $2, $3)', [id, 'archived', req.user?.id || null]);
        res.json({ success: true, message: 'Blog archived.' });
    } catch (err) {
        console.error('archiveBlog error:', err);
        res.status(500).json({ success: false, message: 'Failed to archive blog.' });
    }
};

// ═══════════════════════════════════════════════════════════════════════
// POST /api/blogs/:id/view
// ═══════════════════════════════════════════════════════════════════════
const trackBlogView = async (req, res) => {
    try {
        const { id } = req.params;
        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.connection?.remoteAddress || 'unknown';
        const userId = req.user?.id || null;

        // Check for duplicate view in last 24 hours
        const duplicate = await query(`
            SELECT id FROM blog_views
            WHERE blog_id = $1 AND (ip_address = $2 OR ($3::uuid IS NOT NULL AND user_id = $3))
              AND created_at > NOW() - INTERVAL '24 hours'
            LIMIT 1
        `, [id, ip, userId]);

        if (duplicate.rows.length === 0) {
            await query('INSERT INTO blog_views (blog_id, ip_address, user_id) VALUES ($1, $2, $3)', [id, ip, userId]);
            await query('UPDATE blogs SET view_count = view_count + 1 WHERE id = $1', [id]);
        }

        res.json({ success: true });
    } catch (err) {
        console.error('trackBlogView error:', err);
        res.json({ success: true }); // Don't fail on view tracking
    }
};

// ═══════════════════════════════════════════════════════════════════════
// POST /api/blogs/:id/like
// ═══════════════════════════════════════════════════════════════════════
const toggleBlogLike = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const existing = await query('SELECT id FROM blog_likes WHERE blog_id = $1 AND user_id = $2', [id, userId]);
        if (existing.rows.length > 0) {
            await query('DELETE FROM blog_likes WHERE blog_id = $1 AND user_id = $2', [id, userId]);
            res.json({ success: true, liked: false, message: 'Like removed.' });
        } else {
            await query('INSERT INTO blog_likes (blog_id, user_id) VALUES ($1, $2)', [id, userId]);
            res.json({ success: true, liked: true, message: 'Blog liked.' });
        }
    } catch (err) {
        console.error('toggleBlogLike error:', err);
        res.status(500).json({ success: false, message: 'Failed to toggle like.' });
    }
};

// ═══════════════════════════════════════════════════════════════════════
// POST /api/blogs/:id/bookmark
// ═══════════════════════════════════════════════════════════════════════
const toggleBlogBookmark = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const existing = await query('SELECT id FROM blog_bookmarks WHERE blog_id = $1 AND user_id = $2', [id, userId]);
        if (existing.rows.length > 0) {
            await query('DELETE FROM blog_bookmarks WHERE blog_id = $1 AND user_id = $2', [id, userId]);
            res.json({ success: true, bookmarked: false, message: 'Bookmark removed.' });
        } else {
            await query('INSERT INTO blog_bookmarks (blog_id, user_id) VALUES ($1, $2)', [id, userId]);
            res.json({ success: true, bookmarked: true, message: 'Blog bookmarked.' });
        }
    } catch (err) {
        console.error('toggleBlogBookmark error:', err);
        res.status(500).json({ success: false, message: 'Failed to toggle bookmark.' });
    }
};

// ═══════════════════════════════════════════════════════════════════════
// POST /api/blogs/:id/comments
// ═══════════════════════════════════════════════════════════════════════
const addBlogComment = async (req, res) => {
    try {
        const { id } = req.params;
        const { comment, guest_name, guest_email } = req.body;
        const userId = req.user?.id || null;

        if (!comment || !comment.trim()) {
            return res.status(400).json({ success: false, message: 'Comment text is required.' });
        }

        if (!userId && (!guest_name || !guest_name.trim())) {
            return res.status(400).json({ success: false, message: 'Name is required for guest comments.' });
        }

        // Check blog exists
        const blogCheck = await query('SELECT id FROM blogs WHERE id = $1', [id]);
        if (blogCheck.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Blog not found.' });
        }

        const result = await query(`
            INSERT INTO blog_comments (blog_id, user_id, guest_name, guest_email, comment, status)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, created_at
        `, [id, userId, guest_name || null, guest_email || null, comment.trim(), userId ? 'approved' : 'pending']);

        res.status(201).json({
            success: true,
            message: userId ? 'Comment added.' : 'Comment submitted for moderation.',
            comment_id: result.rows[0].id
        });
    } catch (err) {
        console.error('addBlogComment error:', err);
        res.status(500).json({ success: false, message: 'Failed to add comment.' });
    }
};

// ═══════════════════════════════════════════════════════════════════════
// PATCH /api/blogs/:id/comments/:commentId
// ═══════════════════════════════════════════════════════════════════════
const moderateComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const { status } = req.body; // 'approved' or 'rejected'

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Status must be approved or rejected.' });
        }

        const result = await query('UPDATE blog_comments SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id', [status, commentId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Comment not found.' });
        }

        res.json({ success: true, message: `Comment ${status}.` });
    } catch (err) {
        console.error('moderateComment error:', err);
        res.status(500).json({ success: false, message: 'Failed to moderate comment.' });
    }
};

// ═══════════════════════════════════════════════════════════════════════
// POST /api/uploads/blog-image
// ═══════════════════════════════════════════════════════════════════════
const uploadBlogImage = async (req, res) => {
    try {
        const { image } = req.body;
        if (!image) {
            return res.status(400).json({ success: false, message: 'Image data is required.' });
        }

        const savedPath = handleBlogImage(image);
        if (!savedPath) {
            return res.status(400).json({ success: false, message: 'Invalid image data.' });
        }

        res.json({ success: true, url: savedPath });
    } catch (err) {
        console.error('uploadBlogImage error:', err);
        res.status(500).json({ success: false, message: 'Failed to upload image.' });
    }
};

// ═══════════════════════════════════════════════════════════════════════
// Scheduled Publishing Runner (called from server.js setInterval)
// ═══════════════════════════════════════════════════════════════════════
const publishScheduledBlogs = async () => {
    try {
        const result = await query(`
            UPDATE blogs SET status = 'published', published_at = NOW(), updated_at = NOW()
            WHERE status = 'scheduled' AND scheduled_publish_at <= NOW()
            RETURNING id, title, created_by
        `);

        if (result.rows.length > 0) {
            console.log(`[Blog Scheduler] Published ${result.rows.length} scheduled blog(s).`);

            // Notify authors
            try {
                const { sendBlogApprovedEmail } = require('../services/emailService');
                for (const blog of result.rows) {
                    const author = await query('SELECT email, first_name FROM team_members WHERE id = $1', [blog.created_by]);
                    if (author.rows.length > 0) {
                        sendBlogApprovedEmail({
                            to: author.rows[0].email,
                            authorName: author.rows[0].first_name,
                            blogTitle: blog.title
                        }).catch(err => console.error('Scheduled blog publish email failed:', err));
                    }
                }
            } catch (emailErr) {
                console.error('Scheduled blog email error:', emailErr);
            }
        }
    } catch (err) {
        console.error('[Blog Scheduler] Error publishing scheduled blogs:', err);
    }
};

module.exports = {
    getAllBlogs,
    getBlogById,
    createBlog,
    updateBlog,
    deleteBlog,
    submitBlog,
    approveBlog,
    rejectBlog,
    archiveBlog,
    trackBlogView,
    toggleBlogLike,
    toggleBlogBookmark,
    addBlogComment,
    moderateComment,
    uploadBlogImage,
    publishScheduledBlogs
};
