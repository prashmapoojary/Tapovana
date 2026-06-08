import React, { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./Blogs.css";
import { DUMMY_BLOGS } from "./mockData";
import SearchIcon from "../assets/searchIcon.svg";
import DropdownIcon from "../assets/dropdownIcon.svg";
import { getUser, roleLabel } from "../utils/session";
import { getImageUrl } from "../utils/image";
import { useAllocations } from "../utils/AllocationContext";

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const getReadTime = (text = "") => {
  return Math.max(3, Math.ceil(text.split(/\s+/).length / 200)) + " min read";
};

function BlogCard({ blog, onClick, isStaff, isAdmin, onEdit, onDelete, onApprove, onReject }) {
  const isDraft = blog.status === "draft";
  const isPending = blog.status === "pending";
  const isPublished = blog.status === "published";
  const isRejected = blog.status === "rejected";
  const isArchived = blog.status === "archived";

  return (
    <div className="blog-card" onClick={() => onClick(blog.id)}>
      <div className="blog-card-image-wrapper">
        <img
          src={getImageUrl(blog.image)}
          alt={blog.title}
          className="blog-card-image"
          onError={(e) => {
            e.target.src = "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=800";
          }}
        />

        {(isStaff || isAdmin) && (
          <div className={"blog-status-badge " + blog.status}>
            {isPublished ? "Published" : isPending ? "Pending" : isDraft ? "Draft" : isRejected ? "Rejected" : "Archived"}
          </div>
        )}
      </div>

      <div className="blog-card-content">
        <span className="blog-card-category">{blog.category}</span>
        <h3 className="blog-card-title">{blog.title}</h3>
        <p className="blog-card-summary">{blog.summary}</p>

        {isRejected && blog.rejectionReason && (
          <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#fff5f5', border: '1px solid #feb2b2', borderRadius: '6px', fontSize: '12px', color: '#c53030' }}>
            <strong style={{ display: 'block', marginBottom: '4px' }}>Rejection Reason:</strong>
            {blog.rejectionReason}
          </div>
        )}

        <div className="blog-card-meta">
          <div className="blog-card-author">
            <div className="blog-card-author-avatar">{blog.author?.initials || "AU"}</div>
            <span>{blog.author?.name || "Anonymous"}</span>
          </div>
          <div className="blog-card-meta-item">{formatDate(blog.date)}</div>
          <div className="blog-card-meta-item">{blog.readTime}</div>
        </div>

        <div className="blog-card-footer" onClick={(e) => e.stopPropagation()}>
          {isPublished && (
            <button className="blog-card-read-more" onClick={() => onClick(blog.id)}>
              Read Article
            </button>
          )}

          {isStaff && (isDraft || isRejected) && (
            <div className="blog-card-actions">
              <button onClick={() => onEdit(blog)}>Edit</button>
              <button onClick={() => onDelete(blog.id)}>Delete</button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function RelatedBlogs({ currentBlogId, blogs, onClick }) {
  const relatedBlogs = useMemo(() => {
    return blogs
      .filter((blog) => blog.id !== currentBlogId && blog.status === "published")
      .slice(0, 4);
  }, [blogs, currentBlogId]);

  if (relatedBlogs.length === 0) return null;

  return (
    <div className="blog-related">
      <h3 className="blog-related-title">Recommended Readings</h3>
      <div className="blog-related-grid">
        {relatedBlogs.map((blog) => (
          <div key={blog.id} className="blog-related-card" onClick={() => onClick(blog.id)}>
            <img src={getImageUrl(blog.image)} alt={blog.title} className="blog-related-card-image" />
            <div className="blog-related-card-content">
              <h4 className="blog-related-card-title">{blog.title}</h4>
              <p className="blog-related-card-date">{formatDate(blog.date)} · {blog.readTime}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Blogs() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { triggerAlert, triggerConfirm } = useAllocations();

  const [blogs, setBlogs] = useState(() => {
    const savedBlogs = localStorage.getItem("tapovana_blogs");
    if (savedBlogs) {
      return JSON.parse(savedBlogs);
    }
    const initialBlogs = DUMMY_BLOGS.map((blog) => ({
      ...blog,
      status: "published",
    }));
    localStorage.setItem("tapovana_blogs", JSON.stringify(initialBlogs));
    return initialBlogs;
  });

  const currentUser = useMemo(() => getUser(), []);
  const role = currentUser?.role?.toUpperCase() || "";
  const isAdmin = role === "SUPER_ADMIN" || role === "CO_ADMIN";
  const isStaff = role === "DOCTOR" || role === "THERAPIST";

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [activeTab, setActiveTab] = useState(isStaff ? "my_blogs" : isAdmin ? "published" : "published");
  const [selectedBlog, setSelectedBlog] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editBlogData, setEditBlogData] = useState({ title: "", category: "AYURVEDA", summary: "", body: "", image: "" });
  const [rejectionModal, setRejectionModal] = useState({ isOpen: false, blogId: null, reason: "" });
  const [toast, setToast] = useState(null);

  const persistBlogs = (updatedBlogs) => {
    setBlogs(updatedBlogs);
    localStorage.setItem("tapovana_blogs", JSON.stringify(updatedBlogs));
  };

  const showToastMsg = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 4000);
  };

  const handleApprove = (blogId) => {
    triggerConfirm("Are you sure you want to approve and publish this blog?", () => {
      const updatedBlogs = blogs.map((blog) =>
        blog.id === blogId ? { ...blog, status: "published", date: blog.status === "published" ? blog.date : new Date().toISOString().split("T")[0] } : blog
      );
      persistBlogs(updatedBlogs);
      showToastMsg("Blog approved and published successfully.");
    });
  };

  const handleReject = (blogId, isArchiveAction = false) => {
    if (isArchiveAction) {
      triggerConfirm("Are you sure you want to archive this published article?", () => {
        const updatedBlogs = blogs.map((b) => (b.id === blogId ? { ...b, status: "archived" } : b));
        persistBlogs(updatedBlogs);
        showToastMsg("Article archived successfully.");
      });
    } else {
      setRejectionModal({ isOpen: true, blogId, reason: "" });
    }
  };

  const submitRejection = () => {
    if (!rejectionModal.reason.trim()) {
      triggerAlert("Please provide a rejection reason.");
      return;
    }
    const updatedBlogs = blogs.map((b) => (b.id === rejectionModal.blogId ? { ...b, status: "rejected", rejectionReason: rejectionModal.reason } : b));
    persistBlogs(updatedBlogs);
    showToastMsg("Article rejected and notification sent to author.");
    setRejectionModal({ isOpen: false, blogId: null, reason: "" });
  };

  const handleDelete = (blogId) => {
    triggerConfirm("Are you sure you want to permanently delete this article?", () => {
      const updatedBlogs = blogs.filter((blog) => blog.id !== blogId);
      persistBlogs(updatedBlogs);
      showToastMsg("Article permanently deleted.");
    });
  };

  const handleSaveBlog = (savedBlog) => {
    const existingBlog = blogs.find((blog) => blog.id === savedBlog.id);

    if (existingBlog && existingBlog.status === "pending" && savedBlog.status === "pending") {
      triggerAlert("This blog is already pending review.");
      return;
    }

    const blogExists = blogs.some((blog) => blog.id === savedBlog.id);
    let updatedBlogs = [];

    if (blogExists) {
      updatedBlogs = blogs.map((blog) => (blog.id === savedBlog.id ? savedBlog : blog));
      showToastMsg(savedBlog.status === "draft" ? "Draft updated successfully." : "Blog updated successfully. It is now pending admin approval.");
    } else {
      updatedBlogs = [savedBlog, ...blogs];
      showToastMsg(savedBlog.status === "draft" ? "Draft saved successfully." : "Blog created successfully. It is now pending admin approval.");
    }

    persistBlogs(updatedBlogs);
  };

  const handleEditorSubmit = (e, targetStatus) => {
    if (e) e.preventDefault();
    const newBlog = {
      id: selectedBlog ? selectedBlog.id : Date.now().toString(),
      title: editBlogData.title,
      category: editBlogData.category,
      summary: editBlogData.summary,
      body: editBlogData.body,
      image: editBlogData.image || "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=800",
      status: targetStatus,
      author: currentUser ? { name: currentUser.name, userId: currentUser.user_id || currentUser.id, initials: currentUser.name ? currentUser.name[0] : "AU", role: currentUser.role } : { name: "Doctor", initials: "D", role: "Doctor", userId: "123" },
      date: new Date().toISOString().split("T")[0],
      readTime: getReadTime(editBlogData.body),
    };
    handleSaveBlog(newBlog);
    setShowEditor(false);
  };

  const filteredBlogs = useMemo(() => {
    return blogs.filter((blog) => {
      // Role-based status filtering
      if (!isAdmin && !isStaff && blog.status !== "published") return false;
      
      if (isAdmin) {
        if (activeTab === "pending" && blog.status !== "pending") return false;
        if (activeTab === "published" && blog.status !== "published") return false;
        if (activeTab === "archived" && blog.status !== "archived") return false;
      }

      // Staff specific tabs
      if (isStaff) {
        const myUserId = currentUser?.user_id || currentUser?.id;
        if (activeTab === "my_blogs" && blog.author?.userId !== myUserId) return false;
        if (activeTab === "other_blogs") {
          if (blog.author?.userId === myUserId) return false;
          if (blog.status !== "published") return false;
        }
      }

      const matchesSearch = blog.title.toLowerCase().includes(search.toLowerCase()) || blog.summary.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === "ALL" || blog.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [blogs, search, categoryFilter, activeTab, currentUser, isStaff, isAdmin]);

  const handleCardClick = (blogId) => {
    navigate("/dashboard/blogs/" + blogId);
  };

  if (id) {
    const currentBlog = blogs.find((blog) => blog.id === id);
    if (!currentBlog) {
      return <div className="blog-empty">Blog not found.</div>;
    }

    return (
      <div className="blog-detail-container">
        <div className="blog-detail-back" onClick={() => navigate("/dashboard/blogs")}>
          ← Back to Blogs
        </div>
        <article className="blog-detail-header">
          <img src={getImageUrl(currentBlog.image)} alt={currentBlog.title} className="blog-detail-image" />
          <div className="blog-detail-info">
            <span className="blog-detail-category">{currentBlog.category}</span>
            <h1 className="blog-detail-title">{currentBlog.title}</h1>
            <div className="blog-detail-meta">
              <div className="blog-detail-author">
                <div className="blog-detail-author-avatar">{currentBlog.author?.initials}</div>
                <div className="blog-detail-author-info">
                  <h4>{currentBlog.author?.name}</h4>
                  <p>{currentBlog.author?.role}</p>
                </div>
              </div>
              <div>Published on {formatDate(currentBlog.date)}</div>
              <div>{currentBlog.readTime}</div>
            </div>
          </div>
        </article>
        <section className="blog-detail-body" dangerouslySetInnerHTML={{ __html: currentBlog.body }} />
        <RelatedBlogs currentBlogId={currentBlog.id} blogs={blogs} onClick={handleCardClick} />
      </div>
    );
  }

  return (
    <div className="blog-container">
      {toast && <div className="blog-toast">{toast}</div>}

      {rejectionModal.isOpen && (
        <div className="blog-editor-modal-overlay">
          <div className="blog-editor-modal" style={{ maxWidth: '400px' }}>
            <h2>Reject Blog</h2>
            <p style={{ color: '#718096', marginBottom: '16px', fontSize: '14px' }}>Please provide a reason for rejecting this article. This will be sent to the author.</p>
            <textarea
              placeholder="Rejection Reason"
              value={rejectionModal.reason}
              onChange={(e) => setRejectionModal({ ...rejectionModal, reason: e.target.value })}
              className="blog-editor-form-textarea"
              style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '16px', fontFamily: 'inherit', resize: 'vertical' }}
              rows={4}
              required
            />
            <div className="blog-editor-actions">
              <button type="button" onClick={() => setRejectionModal({ isOpen: false, blogId: null, reason: "" })} className="blog-editor-cancel">Cancel</button>
              <button type="button" onClick={submitRejection} className="blog-editor-save" style={{ background: '#e53e3e' }}>Reject Article</button>
            </div>
          </div>
        </div>
      )}

      {showEditor && (
        <div className="blog-editor-modal-overlay">
          <div className="blog-editor-modal">
            <h2>{selectedBlog ? "Edit Blog" : "Create New Blog"}</h2>
            <form onSubmit={(e) => { e.preventDefault(); handleEditorSubmit(e, e.nativeEvent.submitter.name === 'draft' ? 'draft' : 'pending'); }} className="blog-editor-form">
              <input type="text" placeholder="Blog Title" value={editBlogData.title} onChange={(e) => setEditBlogData({ ...editBlogData, title: e.target.value })} required />
              <select value={editBlogData.category} onChange={(e) => setEditBlogData({ ...editBlogData, category: e.target.value })} required>
                <option value="AYURVEDA">Ayurveda</option>
                <option value="YOGA">Yoga</option>
                <option value="NUTRITION">Nutrition</option>
                <option value="WELLNESS">Wellness</option>
              </select>
              <textarea placeholder="Short Summary" value={editBlogData.summary} onChange={(e) => setEditBlogData({ ...editBlogData, summary: e.target.value })} required rows={2} />
              <textarea placeholder="Full Content (HTML supported)" value={editBlogData.body} onChange={(e) => setEditBlogData({ ...editBlogData, body: e.target.value })} required rows={6} />
              <input type="text" placeholder="Image URL (e.g. filename from /uploads or absolute URL)" value={editBlogData.image} onChange={(e) => setEditBlogData({ ...editBlogData, image: e.target.value })} />
              
              <div className="blog-editor-actions">
                <button type="button" onClick={() => setShowEditor(false)} className="blog-editor-cancel">Cancel</button>
                <button type="submit" name="draft" className="blog-editor-save" style={{background: '#718096', border: '1px solid #718096'}}>Save Draft</button>
                <button type="submit" name="pending" className="blog-editor-save">Submit for Review</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="blog-header">
        <div className="blog-title">
          <h1>Vedic & Ayurvedic Blogs</h1>
          <p>Read about Ayurveda, Yoga, Wellness and Healthy Lifestyle</p>
        </div>
        {isStaff && activeTab === "my_blogs" && (
          <button style={{ background: '#cda751', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => {
            setEditBlogData({ title: "", category: "AYURVEDA", summary: "", body: "", image: "" });
            setSelectedBlog(null);
            setShowEditor(true);
          }}>
            + Create Blog
          </button>
        )}
      </div>

      {isStaff && (
        <div className="blog-tabs" style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
          <button
            style={{ background: 'none', border: 'none', padding: '8px 12px', fontSize: '15px', fontWeight: '600', color: activeTab === 'my_blogs' ? '#cda751' : '#718096', borderBottom: activeTab === 'my_blogs' ? '2px solid #cda751' : '2px solid transparent', cursor: 'pointer', transition: '0.2s' }}
            onClick={() => setActiveTab("my_blogs")}
          >
            My Blogs
          </button>
          <button
            style={{ background: 'none', border: 'none', padding: '8px 12px', fontSize: '15px', fontWeight: '600', color: activeTab === 'other_blogs' ? '#cda751' : '#718096', borderBottom: activeTab === 'other_blogs' ? '2px solid #cda751' : '2px solid transparent', cursor: 'pointer', transition: '0.2s' }}
            onClick={() => setActiveTab("other_blogs")}
          >
            Other Blogs
          </button>
        </div>
      )}


      <div className="blog-controls">
        <div className="blog-search-box">
          <img src={SearchIcon} alt="search" />
          <input type="text" placeholder="Search blogs..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="blog-filter-dropdown">
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="ALL">All Categories</option>
            <option value="AYURVEDA">Ayurveda</option>
            <option value="YOGA">Yoga</option>
            <option value="NUTRITION">Nutrition</option>
            <option value="WELLNESS">Wellness</option>
          </select>
          <img src={DropdownIcon} alt="dropdown" />
        </div>
      </div>

      <div className="blog-grid">
        {filteredBlogs.map((blog) => (
          <BlogCard
            key={blog.id}
            blog={blog}
            onClick={handleCardClick}
            isStaff={isStaff && activeTab === "my_blogs"}
            isAdmin={isAdmin}
            onEdit={(blog) => {
              setSelectedBlog(blog);
              setEditBlogData({
                title: blog.title || "",
                category: blog.category || "AYURVEDA",
                summary: blog.summary || "",
                body: blog.body || "",
                image: blog.image || ""
              });
              setShowEditor(true);
            }}
            onDelete={handleDelete}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        ))}
      </div>
    </div>
  );
}