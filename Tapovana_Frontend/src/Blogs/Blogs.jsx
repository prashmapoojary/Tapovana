import React, { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./Blogs.css";
import { DUMMY_BLOGS } from "./mockData";
import SearchIcon from "../assets/searchIcon.svg";
import DropdownIcon from "../assets/dropdownIcon.svg";
import { getUser, roleLabel } from "../utils/session";
import { getImageUrl } from "../utils/image";

// Helper to format date
const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

function BlogCard({ blog, onClick, isStaff, isAdmin, onEdit, onDelete, onApprove, onReject }) {
  const isDraft = blog.status === "draft";
  const isPending = blog.status === "pending";
  const isPublished = blog.status === "published";
  const isRemoved = blog.status === "removed";

  return (
    <div className="blog-card" onClick={() => onClick(blog.id)}>
      <div style={{ position: "relative" }}>
        <img
          src={getImageUrl(blog.image)}
          alt={blog.title}
          className="blog-card-image"
          onError={(e) => {
            e.target.src = "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=800";
          }}
        />

        {/* Status badges for staff or admins */}
        {(isStaff || isAdmin) && (
          <div style={{
            position: "absolute",
            top: "12px",
            left: "12px",
            padding: "4px 10px",
            borderRadius: "20px",
            fontSize: "11px",
            fontWeight: 700,
            color: isPublished || isPending ? "#cda751" : isDraft ? "#d4ac0d" : "#c0392b",
            background: isPublished || isPending ? "rgba(205, 167, 81, 0.15)" : isDraft ? "rgba(241, 196, 15, 0.15)" : "rgba(231, 76, 60, 0.15)",
            border: isPublished || isPending ? "1px solid rgba(205, 167, 81, 0.3)" : isDraft ? "1px solid rgba(241, 196, 15, 0.3)" : "1px solid rgba(231, 76, 60, 0.3)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            textTransform: "uppercase",
            letterSpacing: "0.5px"
          }}>
            {isPublished ? "Published" : isPending ? "Pending" : isDraft ? "Draft" : "Removed by Admin"}
          </div>
        )}
      </div>

      <div className="blog-card-content">
        <span className="blog-card-category">{blog.category}</span>
        <h3 className="blog-card-title">{blog.title}</h3>
        <p className="blog-card-summary">{blog.summary}</p>

        <div className="blog-card-meta">
          <div className="blog-card-meta-item">
            <div className="blog-card-author">
              <div className="blog-card-author-avatar">
                {blog.author?.initials || "AU"}
              </div>
              <span>{blog.author?.name || "Anonymous"}</span>
            </div>
          </div>
          <div className="blog-card-meta-item">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {formatDate(blog.date)}
          </div>
          <div className="blog-card-meta-item">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {blog.readTime || "5 min read"}
          </div>
        </div>

        {/* Dynamic Action Buttons inside card footer */}
        <div className="blog-card-footer" onClick={e => e.stopPropagation()} style={{ gap: "8px", flexWrap: "wrap" }}>
          {isPublished && (
            <button className="blog-card-read-more" onClick={() => onClick(blog.id)}>
              Read Article
            </button>
          )}

          {/* Staff specific actions on their own draft / pending articles */}
          {isStaff && (
            <div style={{ display: "flex", gap: "6px", width: "100%", marginTop: "4px" }}>
              {isDraft && (
                <button
                  onClick={() => onEdit(blog)}
                  style={{
                    flex: 1, padding: "6px 12px", background: "white", border: "1px solid #cda751", borderRadius: "4px",
                    color: "#cda751", fontSize: "11px", fontWeight: 700, cursor: "pointer"
                  }}
                >
                  Edit Draft
                </button>
              )}
              {(isDraft || isPending || isRemoved) && (
                <button
                  onClick={() => onDelete(blog.id)}
                  style={{
                    padding: "6px 10px", background: "white", border: "1px solid #cda751", borderRadius: "4px",
                    color: "#cda751", fontSize: "11px", fontWeight: 700, cursor: "pointer"
                  }}
                >
                  Delete
                </button>
              )}
            </div>
          )}

          {/* Admin specific actions for review & moderation */}
          {isAdmin && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%", marginTop: "4px" }}>
              {isPending && (
                <div style={{ display: "flex", gap: "6px", width: "100%" }}>
                  <button
                    onClick={() => onApprove(blog.id)}
                    style={{
                      flex: 2, padding: "8px 12px", background: "#cda751", border: "none", borderRadius: "4px",
                      color: "white", fontSize: "11px", fontWeight: 700, cursor: "pointer"
                    }}
                  >
                    Approve &amp; Publish
                  </button>
                  <button
                    onClick={() => onEdit(blog)}
                    style={{
                      flex: 1, padding: "8px 12px", background: "white", border: "1px solid #cda751", borderRadius: "4px",
                      color: "#cda751", fontSize: "11px", fontWeight: 700, cursor: "pointer"
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onReject(blog.id)}
                    style={{
                      padding: "8px 10px", background: "white", border: "1px solid #cda751", borderRadius: "4px",
                      color: "#cda751", fontSize: "11px", fontWeight: 700, cursor: "pointer"
                    }}
                  >
                    Reject
                  </button>
                </div>
              )}
              {isPublished && (
                <div style={{ display: "flex", gap: "6px", width: "100%" }}>
                  <button
                    onClick={() => onEdit(blog)}
                    style={{
                      flex: 1, padding: "8px 12px", background: "white", border: "1px solid #cda751", borderRadius: "4px",
                      color: "#cda751", fontSize: "11px", fontWeight: 700, cursor: "pointer"
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onReject(blog.id)}
                    style={{
                      flex: 2, padding: "8px 12px", background: "white", border: "1px solid #cda751",
                      borderRadius: "4px", color: "#cda751", fontSize: "11px", fontWeight: 700, cursor: "pointer"
                    }}
                  >
                    Remove / Reject
                  </button>
                  <button
                    onClick={() => onDelete(blog.id)}
                    style={{
                      padding: "8px 10px", background: "white", border: "1px solid #cda751", borderRadius: "4px",
                      color: "#cda751", fontSize: "11px", fontWeight: 700, cursor: "pointer"
                    }}
                  >
                    Delete
                  </button>
                </div>
              )}
              {isRemoved && (
                <div style={{ display: "flex", gap: "6px", width: "100%" }}>
                  <button
                    onClick={() => onApprove(blog.id)}
                    style={{
                      flex: 2, padding: "8px 12px", background: "#cda751", border: "none", borderRadius: "4px",
                      color: "white", fontSize: "11px", fontWeight: 700, cursor: "pointer"
                    }}
                  >
                    Publish / Restore
                  </button>
                  <button
                    onClick={() => onEdit(blog)}
                    style={{
                      flex: 1, padding: "8px 12px", background: "white", border: "1px solid #cda751", borderRadius: "4px",
                      color: "#cda751", fontSize: "11px", fontWeight: 700, cursor: "pointer"
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(blog.id)}
                    style={{
                      padding: "8px 10px", background: "white", border: "1px solid #cda751", borderRadius: "4px",
                      color: "#cda751", fontSize: "11px", fontWeight: 700, cursor: "pointer"
                    }}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RelatedBlogs({ currentBlogId, blogs, onClick }) {
  const related = useMemo(() => {
    return blogs.filter((b) => b.id !== currentBlogId && b.status === "published");
  }, [currentBlogId, blogs]);

  if (related.length === 0) return null;

  return (
    <div className="blog-related">
      <h3 className="blog-related-title">Recommended Readings</h3>
      <div className="blog-related-grid">
        {related.map((blog) => (
          <div
            key={blog.id}
            className="blog-related-card"
            onClick={() => onClick(blog.id)}
          >
            <img
              src={getImageUrl(blog.image)}
              alt={blog.title}
              className="blog-related-card-image"
              onError={(e) => {
                e.target.src = "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=800";
              }}
            />
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

function CreateOrEditBlogModal({ blogToEdit, staffProfile, onClose, onSave }) {
  const [formData, setFormData] = useState({
    title: blogToEdit?.title || "",
    category: blogToEdit?.category || "AYURVEDA",
    summary: blogToEdit?.summary || "",
    body: blogToEdit?.body || "",
  });
  const [coverImage, setCoverImage] = useState(blogToEdit?.image || "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=800");

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Image exceeds 5 MB limit. Please upload a smaller image.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAction = (status) => {
    const titleVal = formData.title.trim();
    const summaryVal = formData.summary.trim();
    const bodyVal = formData.body.trim();

    if (!titleVal || !summaryVal || !bodyVal) {
      alert("Please fill in all fields (Title, Summary, and Content)");
      return;
    }

    if (titleVal.length < 10 || titleVal.length > 100) {
      alert(`Title must be between 10 and 100 characters long (currently ${titleVal.length}).`);
      return;
    }

    if (summaryVal.length < 50 || summaryVal.length > 200) {
      alert(`Summary must be between 50 and 200 characters long (currently ${summaryVal.length}).`);
      return;
    }

    if (bodyVal.length < 100) {
      alert(`Full content must be at least 100 characters long (currently ${bodyVal.length}).`);
      return;
    }

    const calculatedReadTime = `${Math.max(3, Math.ceil(bodyVal.split(/\s+/).length / 200))} min read`;

    const savedBlog = {
      id: blogToEdit?.id || `blog-${Date.now()}`,
      title: titleVal,
      category: formData.category,
      summary: summaryVal,
      body: bodyVal,
      image: coverImage,
      author: blogToEdit?.author || {
        name: `${staffProfile.first_name} ${staffProfile.last_name}`,
        role: roleLabel(staffProfile.role),
        initials: `${staffProfile.first_name[0] || ""}${staffProfile.last_name[0] || ""}`.toUpperCase(),
        userId: staffProfile.user_id || staffProfile.id || "staff-user",
      },
      date: blogToEdit?.date || new Date().toISOString().split("T")[0],
      readTime: calculatedReadTime,
      status: status, // "draft" or "pending" (or preserved)
    };

    onSave(savedBlog);
    onClose();
  };

  return (
    <div className="vedic-modal-overlay" onClick={onClose}>
      <div className="vedic-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "700px" }}>
        <div className="vedic-modal-header">
          <h2 className="vedic-modal-title">
            {blogToEdit ? "Edit Blog Article" : "Create New Blog Article"}
          </h2>
          <button className="vedic-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="vedic-modal-body" style={{ gap: "16px", maxHeight: "72vh", overflowY: "auto" }}>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, color: "#4a5568", fontSize: "13px" }}>Article Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., The Sacred Rhythms of Ayurvedic Dinacharya"
              className="vedic-form-input"
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: (formData.title.length < 10 || formData.title.length > 100) ? "#e74c3c" : "#2ecc71", marginTop: "2px" }}>
              <span>Required length: 10 - 100 characters</span>
              <span>{formData.title.length}/100</span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, color: "#4a5568", fontSize: "13px" }}>Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="vedic-form-select"
              >
                <option value="AYURVEDA">Ayurveda</option>
                <option value="YOGA">Yoga</option>
                <option value="NUTRITION">Nutrition</option>
                <option value="WELLNESS">Wellness</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, color: "#4a5568", fontSize: "13px" }}>Article Cover Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="vedic-form-file-input"
                style={{ marginTop: "4px" }}
              />
            </div>
          </div>

          {coverImage && (
            <div style={{ marginTop: "4px", textAlign: "center" }}>
              <img src={coverImage} alt="Cover Preview" style={{ width: "100%", maxHeight: "180px", objectFit: "cover", borderRadius: "6px", border: "1px solid rgba(205, 167, 81, 0.2)" }} />
            </div>
          )}

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, color: "#4a5568", fontSize: "13px" }}>Short Summary * (Displays on Blog Card)</label>
            <input
              type="text"
              name="summary"
              value={formData.summary}
              onChange={handleChange}
              placeholder="Provide a brief, catchy 1-2 sentence hook..."
              maxLength={200}
              className="vedic-form-input"
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: (formData.summary.length < 50 || formData.summary.length > 200) ? "#e74c3c" : "#2ecc71", marginTop: "2px" }}>
              <span>Required length: 50 - 200 characters</span>
              <span>{formData.summary.length}/200</span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, color: "#4a5568", fontSize: "13px" }}>Full Content / Body * (HTML Supported)</label>
            <textarea
              name="body"
              value={formData.body}
              onChange={handleChange}
              placeholder="Write your comprehensive wellness insights here. You can use standard HTML like <p>, <h2>, <ul> to format..."
              rows="8"
              className="vedic-form-textarea"
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: (formData.body.length < 100) ? "#e74c3c" : "#2ecc71", marginTop: "2px" }}>
              <span>Required length: minimum 100 characters</span>
              <span>{formData.body.length} characters</span>
            </div>
          </div>

        </div>

        <div className="vedic-modal-footer" style={{ borderTop: "1px solid #E8E2D9", paddingTop: "12px", display: "flex", justifyContent: "space-between", gap: "12px" }}>
          <button type="button" className="vedic-btn-cancel" onClick={onClose} style={{ marginRight: "auto" }}>
            Cancel
          </button>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              onClick={() => handleAction("draft")}
              style={{
                padding: "10px 18px", background: "#edf2f7", color: "#4a5568", border: "none", borderRadius: "6px",
                fontWeight: 600, cursor: "pointer", fontSize: "13px"
              }}
            >
              Save as Draft
            </button>
            <button
              type="button"
              className="vedic-btn-allocate"
              onClick={() => handleAction("pending")}
            >
              Submit for Review
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminEditBlogModal({ blogToEdit, onClose, onSave }) {
  const [formData, setFormData] = useState({
    title: blogToEdit?.title || "",
    category: blogToEdit?.category || "AYURVEDA",
    summary: blogToEdit?.summary || "",
    body: blogToEdit?.body || "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    const titleVal = formData.title.trim();
    const summaryVal = formData.summary.trim();
    const bodyVal = formData.body.trim();

    if (!titleVal || !summaryVal || !bodyVal) {
      alert("Please fill in all fields");
      return;
    }

    if (titleVal.length < 10 || titleVal.length > 100) {
      alert(`Title must be between 10 and 100 characters long (currently ${titleVal.length}).`);
      return;
    }

    if (summaryVal.length < 50 || summaryVal.length > 200) {
      alert(`Summary must be between 50 and 200 characters long (currently ${summaryVal.length}).`);
      return;
    }

    if (bodyVal.length < 100) {
      alert(`Full content must be at least 100 characters long (currently ${bodyVal.length}).`);
      return;
    }

    const updatedBlog = {
      ...blogToEdit,
      title: titleVal,
      category: formData.category,
      summary: summaryVal,
      body: bodyVal,
    };

    onSave(updatedBlog);
    onClose();
  };

  return (
    <div className="vedic-modal-overlay" onClick={onClose}>
      <div className="vedic-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "700px" }}>
        <div className="vedic-modal-header">
          <h2 className="vedic-modal-title">Admin formatting &amp; Corrections</h2>
          <button className="vedic-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="vedic-modal-body" style={{ gap: "16px", maxHeight: "70vh", overflowY: "auto" }}>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, color: "#4a5568", fontSize: "13px" }}>Adjust Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="vedic-form-input"
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: (formData.title.length < 10 || formData.title.length > 100) ? "#e74c3c" : "#2ecc71", marginTop: "2px" }}>
              <span>Required length: 10 - 100 characters</span>
              <span>{formData.title.length}/100</span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, color: "#4a5568", fontSize: "13px" }}>Category</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="vedic-form-select"
            >
              <option value="AYURVEDA">Ayurveda</option>
              <option value="YOGA">Yoga</option>
              <option value="NUTRITION">Nutrition</option>
              <option value="WELLNESS">Wellness</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, color: "#4a5568", fontSize: "13px" }}>Summary</label>
            <input
              type="text"
              name="summary"
              value={formData.summary}
              onChange={handleChange}
              className="vedic-form-input"
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: (formData.summary.length < 50 || formData.summary.length > 200) ? "#e74c3c" : "#2ecc71", marginTop: "2px" }}>
              <span>Required length: 50 - 200 characters</span>
              <span>{formData.summary.length}/200</span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, color: "#4a5568", fontSize: "13px" }}>Content / Body (HTML)</label>
            <textarea
              name="body"
              value={formData.body}
              onChange={handleChange}
              rows="8"
              className="vedic-form-textarea"
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: (formData.body.length < 100) ? "#e74c3c" : "#2ecc71", marginTop: "2px" }}>
              <span>Required length: minimum 100 characters</span>
              <span>{formData.body.length} characters</span>
            </div>
          </div>

        </div>

        <div className="vedic-modal-footer" style={{ borderTop: "1px solid #E8E2D9" }}>
          <button type="button" className="vedic-btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="vedic-btn-allocate"
            onClick={handleSave}
          >
            Save Corrections
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Blogs() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Load and persist blogs from local storage (synced globally)
  const [blogs, setBlogs] = useState(() => {
    const saved = localStorage.getItem("tapovana_blogs");
    if (saved) {
      const parsed = JSON.parse(saved);
      let updated = false;
      const healed = parsed.map(blog => {
        const matchingDummy = DUMMY_BLOGS.find(d => d.id === blog.id);
        if (matchingDummy && blog.image !== matchingDummy.image) {
          updated = true;
          return { ...blog, image: matchingDummy.image };
        }
        return blog;
      });
      if (updated) {
        localStorage.setItem("tapovana_blogs", JSON.stringify(healed));
        return healed;
      }
      return parsed;
    }
    const initial = DUMMY_BLOGS.map((b) => ({
      ...b,
      status: "published", // Default mock blogs are pre-approved and published
    }));
    localStorage.setItem("tapovana_blogs", JSON.stringify(initial));
    return initial;
  });

  const currentUser = useMemo(() => getUser(), []);
  const role = currentUser?.role?.toUpperCase() || "";
  const isAdmin = role === "SUPER_ADMIN" || role === "CO_ADMIN";
  const isStaff = role === "DOCTOR" || role === "THERAPIST";

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [activeTab, setActiveTab] = useState(isStaff ? "my_blogs" : "published"); // Default to "my_blogs" for staff, "published" for admin/public

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAdminEditModal, setShowAdminEditModal] = useState(false);

  const [selectedBlog, setSelectedBlog] = useState(null);
  const [toast, setToast] = useState(null);

  // Sync state helpers
  const persistBlogs = (newList) => {
    setBlogs(newList);
    localStorage.setItem("tapovana_blogs", JSON.stringify(newList));
  };

  const showToastMsg = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  // Moderation Logic
  const handleApprove = (blogId) => {
    const blog = blogs.find(b => b.id === blogId);
    if (!blog || !blog.body || !blog.body.trim()) {
      alert("Cannot approve blog: The blog body is empty.");
      return;
    }
    const updated = blogs.map((b) =>
      b.id === blogId
        ? { ...b, status: "published", date: new Date().toISOString().split("T")[0] }
        : b
    );
    persistBlogs(updated);
    showToastMsg("Blog post approved and published successfully!");
  };

  const handleReject = (blogId) => {
    const blog = blogs.find(b => b.id === blogId);
    if (blog && blog.status === "published") {
      const confirmed = window.confirm("Are you sure you want to reject and remove this already PUBLISHED blog post?");
      if (!confirmed) return;
    }
    // Flag as removed, author will see "Removed by Admin" in their "My Blogs" panel
    const updated = blogs.map((b) =>
      b.id === blogId ? { ...b, status: "removed" } : b
    );
    persistBlogs(updated);
    showToastMsg("Article rejected and set to Removed.");
  };

  const handleDelete = (blogId) => {
    if (!window.confirm("Are you sure you want to permanently delete this article?")) return;
    const updated = blogs.filter((b) => b.id !== blogId);
    persistBlogs(updated);
    showToastMsg("Article permanently deleted.");
  };

  const handleSaveBlog = (savedBlog) => {
    const existing = blogs.find((b) => b.id === savedBlog.id);
    if (existing && existing.status === "pending" && savedBlog.status === "pending") {
      alert("This blog is already pending review and cannot be re-submitted.");
      return;
    }
    const exists = blogs.some((b) => b.id === savedBlog.id);
    let updated;
    if (exists) {
      updated = blogs.map((b) => (b.id === savedBlog.id ? savedBlog : b));
      showToastMsg(`Updated article "${savedBlog.title}" successfully!`);
    } else {
      updated = [savedBlog, ...blogs];
      showToastMsg(`Created article "${savedBlog.title}" successfully!`);
    }
    persistBlogs(updated);
  };

  const handleAdminCorrection = (correctedBlog) => {
    const updated = blogs.map((b) => (b.id === correctedBlog.id ? correctedBlog : b));
    persistBlogs(updated);
    showToastMsg("Formatted corrections saved!");
  };

  // Filter & Display Logic
  const filteredBlogs = useMemo(() => {
    return blogs.filter((blog) => {
      // 1. Tab segregation
      if (activeTab === "my_blogs" && isStaff) {
        // Staff sees only their own authored blogs (all states: draft, pending, published, removed)
        const myUserId = currentUser.user_id || currentUser.id || "";
        const authorUserId = blog.author?.userId || "";
        if (authorUserId !== myUserId) return false;
      } else if (activeTab === "pending" && isAdmin) {
        // Admin sees only pending submitted blogs
        if (blog.status !== "pending") return false;
      } else if (activeTab === "all_blogs" && isAdmin) {
        // Admin sees all blogs except drafts (drafts are private to the author until submitted)
        if (blog.status === "draft") return false;
      } else {
        // Default "published" tab: shows ONLY published articles to everyone
        // For staff (Doctor/Therapist), this represents the "Other Blogs" tab, which filters out their own published blogs
        if (blog.status !== "published") return false;
        if (isStaff) {
          const myUserId = currentUser.user_id || currentUser.id || "";
          const authorUserId = blog.author?.userId || "";
          if (authorUserId === myUserId) return false;
        }
      }

      // 2. Search & Category filter
      const matchesSearch =
        blog.title.toLowerCase().includes(search.toLowerCase()) ||
        blog.summary.toLowerCase().includes(search.toLowerCase()) ||
        (blog.author?.name || "").toLowerCase().includes(search.toLowerCase());

      const matchesCategory =
        categoryFilter === "ALL" || blog.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [blogs, search, categoryFilter, activeTab, currentUser, isStaff, isAdmin]);

  const handleCardClick = (blogId) => {
    navigate(`/dashboard/blogs/${blogId}`);
  };

  const handleBackClick = () => {
    navigate("/dashboard/blogs");
  };

  // ── DETAIL VIEW ──
  if (id) {
    const currentBlog = blogs.find((b) => b.id === id);

    // Detail view is only accessible if article is published OR if staff is viewing their own preview OR if admin is reviewing
    const canView = currentBlog && (
      currentBlog.status === "published" ||
      (isStaff && currentBlog.author?.userId === (currentUser.user_id || currentUser.id)) ||
      isAdmin
    );

    if (!canView) {
      return (
        <div className="blog-detail-container">
          <div className="blog-detail-back" onClick={handleBackClick}>
            ← Back to Blogs
          </div>
          <div className="blog-empty">
            <div className="blog-empty-icon"></div>
            <p className="blog-empty-text">Article Not Found</p>
            <p className="blog-empty-subtext">The article you are looking for does not exist, has been removed, or requires approval.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="blog-detail-container">
        <div className="blog-detail-back" onClick={handleBackClick}>
          ← Back to Blogs
        </div>

        <article className="blog-detail-header">
          <img
            src={getImageUrl(currentBlog.image)}
            alt={currentBlog.title}
            className="blog-detail-image"
            onError={(e) => {
              e.target.src = "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=800";
            }}
          />
          <div className="blog-detail-info">
            <span className="blog-detail-category">{currentBlog.category}</span>
            <h1 className="blog-detail-title">{currentBlog.title}</h1>

            <div className="blog-detail-meta">
              <div className="blog-detail-meta-item">
                <div className="blog-detail-author">
                  <div className="blog-detail-author-avatar">
                    {currentBlog.author?.initials || "AU"}
                  </div>
                  <div className="blog-detail-author-info">
                    <h4>{currentBlog.author?.name || "Anonymous"}</h4>
                    <p>{currentBlog.author?.role || "Staff Specialist"}</p>
                  </div>
                </div>
              </div>

              <div className="blog-detail-meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span>Published on {formatDate(currentBlog.date)}</span>
              </div>

              <div className="blog-detail-meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>{currentBlog.readTime || "5 min read"}</span>
              </div>
            </div>
          </div>
        </article>

        <section
          className="blog-detail-body"
          dangerouslySetInnerHTML={{ __html: currentBlog.body }}
        />

        <RelatedBlogs
          currentBlogId={currentBlog.id}
          blogs={blogs}
          onClick={handleCardClick}
        />
      </div>
    );
  }

  // ── LIST VIEW ──
  return (
    <div className="blog-container" style={{ position: "relative" }}>

      {/* Toast Notification Widget */}
      {toast && (
        <div style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          background: "#cda751",
          color: "white",
          padding: "16px 24px",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          zIndex: 999999,
          fontWeight: 600,
          fontSize: "14px",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="blog-header" style={{ alignItems: "center" }}>
        <div className="blog-title">
          <h1>Vedic &amp; Ayurvedic Blogs</h1>
          <p>Read about authentic Ayurveda, Yoga routines, dietary habits, and healthy lifestyles</p>
        </div>

        {/* Create Blog Button shown only to Doctors/Therapists on their My Blogs tab */}
        {isStaff && activeTab === "my_blogs" && (
          <button className="blog-add-btn" onClick={() => { setSelectedBlog(null); setShowCreateModal(true); }}>
            <span>Create Blog</span>
          </button>
        )}
      </div>

      {/* Tab Navigations for Roles */}
      {(isStaff || isAdmin) && (
        <div style={{ display: "flex", borderBottom: "2px solid #e2e8f0", gap: "24px", marginBottom: "8px" }}>

          {/* STAFF TABS */}
          {isStaff && (
            <>
              <button
                onClick={() => setActiveTab("my_blogs")}
                style={{
                  padding: "12px 8px", border: "none", background: "none",
                  fontFamily: "Manrope, sans-serif", fontSize: "14px", fontWeight: 700, cursor: "pointer",
                  color: activeTab === "my_blogs" ? "#cda751" : "#718096",
                  borderBottom: activeTab === "my_blogs" ? "3px solid #cda751" : "3px solid transparent",
                  marginBottom: "-2px", transition: "all 0.2s"
                }}
              >
                My Blogs
              </button>
              <button
                onClick={() => setActiveTab("published")}
                style={{
                  padding: "12px 8px", border: "none", background: "none",
                  fontFamily: "Manrope, sans-serif", fontSize: "14px", fontWeight: 700, cursor: "pointer",
                  color: activeTab === "published" ? "#cda751" : "#718096",
                  borderBottom: activeTab === "published" ? "3px solid #cda751" : "3px solid transparent",
                  marginBottom: "-2px", transition: "all 0.2s"
                }}
              >
                Other Blogs
              </button>
            </>
          )}

          {/* ADMIN TABS */}
          {isAdmin && (
            <>
              <button
                onClick={() => setActiveTab("published")}
                style={{
                  padding: "12px 8px", border: "none", background: "none",
                  fontFamily: "Manrope, sans-serif", fontSize: "14px", fontWeight: 700, cursor: "pointer",
                  color: activeTab === "published" ? "#cda751" : "#718096",
                  borderBottom: activeTab === "published" ? "3px solid #cda751" : "3px solid transparent",
                  marginBottom: "-2px", transition: "all 0.2s"
                }}
              >
                 Published Articles
              </button>
              <button
                onClick={() => setActiveTab("pending")}
                style={{
                  padding: "12px 8px", border: "none", background: "none",
                  fontFamily: "Manrope, sans-serif", fontSize: "14px", fontWeight: 700, cursor: "pointer",
                  color: activeTab === "pending" ? "#cda751" : "#718096",
                  borderBottom: activeTab === "pending" ? "3px solid #cda751" : "3px solid transparent",
                  marginBottom: "-2px", transition: "all 0.2s",
                  display: "flex", alignItems: "center", gap: "6px"
                }}
              >
                 Pending Review
                {blogs.filter(b => b.status === "pending").length > 0 && (
                  <span style={{
                    padding: "1px 6px", background: "rgba(205, 167, 81, 0.15)", color: "#cda751", fontSize: "11px",
                    border: "1px solid rgba(205, 167, 81, 0.3)", borderRadius: "10px", fontWeight: 700
                  }}>
                    {blogs.filter(b => b.status === "pending").length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("all_blogs")}
                style={{
                  padding: "12px 8px", border: "none", background: "none",
                  fontFamily: "Manrope, sans-serif", fontSize: "14px", fontWeight: 700, cursor: "pointer",
                  color: activeTab === "all_blogs" ? "#cda751" : "#718096",
                  borderBottom: activeTab === "all_blogs" ? "3px solid #cda751" : "3px solid transparent",
                  marginBottom: "-2px", transition: "all 0.2s"
                }}
              >
                 All Blogs
              </button>
            </>
          )}

        </div>
      )}

      {/* Filters & Search Control panel */}
      <div className="blog-controls">
        <div className="blog-search-box">
          <img src={SearchIcon} alt="search" />
          <input
            type="text"
            placeholder="Search articles, authors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="blog-filters">
          <div className="blog-filter-dropdown" style={{ padding: 0, position: "relative", display: "flex", alignItems: "center" }}>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                border: "none", outline: "none", background: "transparent",
                fontSize: "14px", color: "#4a5568", padding: "10px 32px 10px 12px",
                cursor: "pointer", appearance: "none", fontWeight: 600,
                width: "100%", height: "100%"
              }}
            >
              <option value="ALL">All Categories</option>
              <option value="AYURVEDA">Ayurveda</option>
              <option value="YOGA">Yoga</option>
              <option value="NUTRITION">Nutrition</option>
              <option value="WELLNESS">Wellness</option>
            </select>
            <img
              src={DropdownIcon}
              alt="dropdown"
              style={{ position: "absolute", right: "12px", pointerEvents: "none", width: "12px", height: "12px" }}
            />
          </div>
        </div>
      </div>

      {/* Articles Grid rendering */}
      {filteredBlogs.length === 0 ? (
        <div className="blog-empty">
          <div className="blog-empty-icon"></div>
          <p className="blog-empty-text">No articles found</p>
          <p className="blog-empty-subtext">
            {activeTab === "pending"
              ? "All submitted blogs have been processed. Great job!"
              : activeTab === "my_blogs"
                ? "You haven't written any drafts or articles yet. Click 'Create Blog' to get started!"
                : activeTab === "all_blogs"
                  ? "No submitted or moderated articles exist in the database yet."
                  : "Try refining your search terms or selecting another category."}
          </p>
        </div>
      ) : (
        <div className="blog-grid">
          {filteredBlogs.map((blog) => (
            <BlogCard
              key={blog.id}
              blog={blog}
              onClick={handleCardClick}
              isStaff={isStaff && activeTab === "my_blogs"}
              isAdmin={isAdmin}
              onEdit={(b) => {
                setSelectedBlog(b);
                if (isAdmin) setShowAdminEditModal(true);
                else setShowEditModal(true);
              }}
              onDelete={handleDelete}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </div>
      )}

      {/* CREATE BLOG MODAL */}
      {showCreateModal && isStaff && (
        <CreateOrEditBlogModal
          staffProfile={currentUser}
          onClose={() => setShowCreateModal(false)}
          onSave={handleSaveBlog}
        />
      )}

      {/* EDIT BLOG MODAL FOR STAFF */}
      {showEditModal && isStaff && selectedBlog && (
        <CreateOrEditBlogModal
          blogToEdit={selectedBlog}
          staffProfile={currentUser}
          onClose={() => {
            setShowEditModal(false);
            setSelectedBlog(null);
          }}
          onSave={handleSaveBlog}
        />
      )}

      {/* EDIT BLOG MODAL FOR ADMIN */}
      {showAdminEditModal && isAdmin && selectedBlog && (
        <AdminEditBlogModal
          blogToEdit={selectedBlog}
          onClose={() => {
            setShowAdminEditModal(false);
            setSelectedBlog(null);
          }}
          onSave={handleAdminCorrection}
        />
      )}

    </div>
  );
}
