import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { apiFetch, getUser } from "../utils/api";
import { getImageUrl } from "../utils/image";
import { useAllocations } from "../utils/AllocationContext";
import MediaPickerModal from "../components/MediaPickerModal";
import SearchIcon from "../assets/searchIcon.svg";
import DropdownIcon from "../assets/dropdownIcon.svg";

// --- Utility Functions ---

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  } catch {
    return "";
  }
};

// --- Components ---
function BlogCard({ blog, onClick, onEdit, onDelete, onApprove, onReject, onArchive, onRestore, isStaff, isAdmin }) {
  const isDraft = blog.status === "draft";
  const isPending = blog.status === "pending";
  const isRejected = blog.status === "rejected";
  const isArchived = blog.status === "archived";

  return (
    <div className="blog-card" onClick={() => onClick(blog.id)} style={{
      background: "#fff",
      borderRadius: "12px",
      overflow: "hidden",
      boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
      border: "1px solid #edf2f7",
      cursor: "pointer",
      display: "flex",
      flexDirection: "column"
    }}>
      <div style={{ position: "relative" }}>
        <img
          src={getImageUrl(blog.featured_image)}
          alt={blog.title}
          style={{
            width: "100%",
            height: "200px",
            objectFit: "cover"
          }}
          onError={(e) => {
            e.target.src = "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=800";
          }}
        />
        <div style={{
          position: "absolute",
          top: "12px",
          left: "12px",
          background: isDraft ? "#e2e8f0" : isPending ? "#fef3c7" : isRejected ? "#fee2e2" : isArchived ? "#e2e8f0" : "#cda751",
          color: isDraft ? "#4a5568" : isPending ? "#78350f" : isRejected ? "#7f1d1d" : isArchived ? "#4a5568" : "#fff",
          padding: "4px 10px",
          borderRadius: "6px",
          fontSize: "11px",
          fontWeight: "600",
          textTransform: "uppercase",
          letterSpacing: "0.5px"
        }}>
          {blog.status}
        </div>
        <div style={{
          position: "absolute",
          top: "12px",
          right: "12px",
          background: "#cda751",
          color: "white",
          padding: "4px 10px",
          borderRadius: "6px",
          fontSize: "11px",
          fontWeight: "600",
          textTransform: "uppercase"
        }}>
          {blog.category}
        </div>
      </div>

      <div style={{ padding: "16px", flex: 1, display: "flex", flexDirection: "column" }}>
        <h3 style={{
          margin: "0 0 8px 0",
          color: "#1a202c",
          fontSize: "18px",
          fontWeight: "700",
          lineHeight: "1.3"
        }}>
          {blog.title}
        </h3>

        {blog.summary && (
          <p style={{
            margin: "0 0 12px 0",
            color: "#4a5568",
            fontSize: "13px",
            lineHeight: "1.5",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden"
          }}>
            {blog.summary}
          </p>
        )}

        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "8px",
          marginTop: "auto"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: "#cda751",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "12px",
              fontWeight: "700"
            }}>
              {blog.author?.name ? blog.author.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "?"}
            </div>
            <div>
              <p style={{
                margin: 0,
                color: "#1a202c",
                fontSize: "12px",
                fontWeight: "600"
              }}>
                {blog.author?.name || "Anonymous"}
              </p>
              <p style={{
                margin: 0,
                color: "#718096",
                fontSize: "11px"
              }}>
                {blog.author?.role || "Specialist"}
              </p>
            </div>
          </div>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            color: "#718096",
            fontSize: "11px"
          }}>
            <span>📅 {formatDate(blog.published_at || blog.created_at)}</span>
            <span>⏱️ {blog.read_time || "3 min read"}</span>
          </div>
        </div>

        {isRejected && blog.rejection_reason && (
          <div style={{
            marginTop: "4px",
            padding: "4px 8px",
            backgroundColor: "#fff5f5",
            border: "1px solid #feb2b2",
            borderRadius: "6px",
            fontSize: "11px",
            color: "#c53030"
          }}>
            <strong>Reason:</strong> {blog.rejection_reason}
          </div>
        )}

        {/* Actions Footer */}
        <div className="blog-card-footer" onClick={(e) => e.stopPropagation()} style={{
          marginTop: "auto",
          paddingTop: "6px",
          borderTop: "1px solid #edf2f7",
          display: "flex",
          gap: "4px",
          flexDirection: "column"
        }}>
          {isStaff && (isDraft || isRejected) && (
            <div className="blog-card-actions" style={{
              display: "flex",
              gap: "6px",
              width: "100%",
              marginTop: "2px"
            }}>
              <button onClick={() => onEdit(blog)} style={{
                background: "#cda751",
                color: "#fff",
                border: "none",
                padding: "6px 12px",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "700",
                fontSize: "11px",
                flex: 1,
                textAlign: "center"
              }}>Edit</button>
              <button onClick={() => onDelete(blog.id)} style={{
                background: "transparent",
                color: "#cda751",
                border: "1px solid #cda751",
                padding: "5px 11px",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "700",
                fontSize: "11px",
                flex: 1,
                textAlign: "center"
              }}>Delete</button>
            </div>
          )}
          {isAdmin && isPending && (
            <div className="blog-card-actions" style={{
              display: "flex",
              gap: "6px",
              width: "100%",
              marginTop: "2px"
            }}>
              <button onClick={() => onApprove(blog.id)} style={{
                background: "#cda751",
                color: "#fff",
                border: "none",
                padding: "6px 12px",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "700",
                fontSize: "11px",
                flex: 1,
                textAlign: "center"
              }}>Approve</button>
              <button onClick={() => onReject(blog.id)} style={{
                background: "transparent",
                color: "#cda751",
                border: "1px solid #cda751",
                padding: "5px 11px",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "700",
                fontSize: "11px",
                flex: 1,
                textAlign: "center"
              }}>Reject</button>
            </div>
          )}
          {isAdmin && isArchived && (
            <div className="blog-card-actions" style={{
              display: "flex",
              gap: "6px",
              width: "100%",
              marginTop: "2px"
            }}>
              <button onClick={() => onRestore(blog.id)} style={{
                background: "#cda751",
                color: "#fff",
                border: "none",
                padding: "6px 12px",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "700",
                fontSize: "11px",
                flex: 1,
                textAlign: "center"
              }}>Restore</button>
              <button onClick={() => onDelete(blog.id)} style={{
                background: "transparent",
                color: "#cda751",
                border: "1px solid #cda751",
                padding: "5px 11px",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "700",
                fontSize: "11px",
                flex: 1,
                textAlign: "center"
              }}>Delete</button>
            </div>
          )}
          {isAdmin && blog.status === "published" && (
            <div className="blog-card-actions" style={{
              display: "flex",
              gap: "6px",
              width: "100%",
              marginTop: "2px"
            }}>
              <button onClick={() => onArchive(blog.id)} style={{
                background: "#cda751",
                color: "#fff",
                border: "none",
                padding: "6px 12px",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "700",
                fontSize: "11px",
                flex: 1,
                textAlign: "center"
              }}>Archive</button>
              <button onClick={() => onDelete(blog.id)} style={{
                background: "transparent",
                color: "#cda751",
                border: "1px solid #cda751",
                padding: "5px 11px",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "700",
                fontSize: "11px",
                flex: 1,
                textAlign: "center"
              }}>Delete</button>
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
            <img src={getImageUrl(blog.featured_image)} alt={blog.title} className="blog-related-card-image" />
            <div className="blog-related-card-content">
              <h4 className="blog-related-card-title">{blog.title}</h4>
              <p className="blog-related-card-date">{formatDate(blog.published_at || blog.created_at)} · {blog.read_time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Main Component ---
export default function Blogs() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { triggerAlert, triggerConfirm } = useAllocations();
  const [mediaModalOpen, setMediaModalOpen] = useState(false);

  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailBlog, setDetailBlog] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const currentUser = useMemo(() => getUser(), []);
  const role = currentUser?.role?.toUpperCase() || "";
  const isAdmin = role === "SUPER_ADMIN" || role === "CO_ADMIN";
  const isStaff = role === "DOCTOR" || role === "THERAPIST";

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [activeTab, setActiveTab] = useState(() => {
    const status = searchParams.get("status");
    if (status === "pending" && isAdmin) return "pending";
    if (status === "published") return "published";
    if (status === "archived") return "archived";
    return isStaff ? "my_blogs" : "published";
  });

  // Sync activeTab with status search param when it changes
  useEffect(() => {
    const status = searchParams.get("status");
    if (status === "pending" && isAdmin) setActiveTab("pending");
    else if (status === "published") setActiveTab("published");
    else if (status === "archived") setActiveTab("archived");
  }, [searchParams, isAdmin]);
  const [rejectionModal, setRejectionModal] = useState({ isOpen: false, blogId: null, reason: "" });

  // Fetch blogs list
  const fetchBlogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (categoryFilter !== "ALL") params.set("category", categoryFilter);
      if (search) params.set("search", search);

      if (isAdmin) {
        if (activeTab === "pending") params.set("status", "pending");
        else if (activeTab === "published") params.set("status", "published");
        else if (activeTab === "archived") params.set("status", "archived");
      } else if (isStaff && activeTab === "my_blogs") {
        params.set("status", "my_blogs");
      }

      const data = await apiFetch(`/api/blogs?${params.toString()}`);
      setBlogs(data.blogs || []);
    } catch (err) {
      console.error("Failed to fetch blogs:", err);
      setBlogs([]);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, search, activeTab, isAdmin, isStaff]);

  useEffect(() => {
    if (!id) fetchBlogs();
  }, [fetchBlogs, id]);

  // Fetch single blog detail
  const fetchBlogDetail = useCallback(async (blogId) => {
    try {
      setDetailLoading(true);
      const data = await apiFetch(`/api/blogs/${blogId}`);
      setDetailBlog(data.blog);

      // Track view
      apiFetch(`/api/blogs/${blogId}/view`, { method: "POST" }).catch(() => {});
    } catch (err) {
      console.error("Failed to fetch blog detail:", err);
      setDetailBlog(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (id) fetchBlogDetail(id);
    else setDetailBlog(null);
  }, [id, fetchBlogDetail]);

  // Filtered blogs for display
  const filteredBlogs = useMemo(() => {
    return blogs.filter((blog) => {
      if (isStaff && activeTab === "other_blogs") {
        const myUserId = currentUser?.user_id || currentUser?.id;
        if (blog.author?.id === myUserId) return false;
        if (blog.status !== "published") return false;
      }
      return true;
    });
  }, [blogs, activeTab, currentUser, isStaff]);

  // --- Handlers ---
  const handleCardClick = (blogId) => {
    navigate("/dashboard/blogs/" + blogId);
  };

  const handleEdit = (blog) => {
    navigate(`/dashboard/blogs/${blog.id}/edit`);
  };

  const handleDelete = async (blogId) => {
    const confirmed = await triggerConfirm("Are you sure you want to permanently delete this article?");
    if (!confirmed) return;
    try {
      await apiFetch(`/api/blogs/${blogId}`, { method: "DELETE" });
      await triggerAlert("Blog deleted successfully.", true);
      fetchBlogs();
    } catch (err) {
      await triggerAlert(err.message || "Failed to delete blog.");
    }
  };

  const handleApprove = async (blogId) => {
    const confirmed = await triggerConfirm("Are you sure you want to approve and publish this blog?");
    if (!confirmed) return;
    try {
      await apiFetch(`/api/blogs/${blogId}/approve`, { method: "POST" });
      await triggerAlert("Blog approved and published successfully.", true);
      fetchBlogs();
      if (id) fetchBlogDetail(id);
    } catch (err) {
      await triggerAlert(err.message || "Failed to approve blog.");
    }
  };

  const handleReject = (blogId) => {
    setRejectionModal({ isOpen: true, blogId, reason: "" });
  };

  const submitRejection = async () => {
    if (!rejectionModal.reason.trim()) {
      await triggerAlert("Please provide a rejection reason.");
      return;
    }
    try {
      await apiFetch(`/api/blogs/${rejectionModal.blogId}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason: rejectionModal.reason })
      });
      setRejectionModal({ isOpen: false, blogId: null, reason: "" });
      await triggerAlert("Blog rejected.");
      fetchBlogs();
      if (id) fetchBlogDetail(id);
    } catch (err) {
      await triggerAlert(err.message || "Failed to reject blog.");
    }
  };

  const handleArchive = async (blogId) => {
    const confirmed = await triggerConfirm("Are you sure you want to archive this published article?");
    if (!confirmed) return;
    try {
      await apiFetch(`/api/blogs/${blogId}/archive`, { method: "POST" });
      await triggerAlert("Blog archived successfully.", true);
      fetchBlogs();
      if (id) fetchBlogDetail(id);
    } catch (err) {
      await triggerAlert(err.message || "Failed to archive blog.");
    }
  };

  const handleRestore = async (blogId) => {
    const confirmed = await triggerConfirm("Are you sure you want to restore this archived article?");
    if (!confirmed) return;
    try {
      await apiFetch(`/api/blogs/${blogId}/restore`, { method: "POST" });
      await triggerAlert("Blog restored successfully.", true);
      fetchBlogs();
      if (id) fetchBlogDetail(id);
    } catch (err) {
      await triggerAlert(err.message || "Failed to restore blog.");
    }
  };

  // --- Like / Bookmark ---
  const handleToggleLike = async () => {
    if (!currentUser) return;
    try {
      const data = await apiFetch(`/api/blogs/${detailBlog.id}/like`, { method: "POST" });
      setDetailBlog(prev => ({
        ...prev,
        user_liked: data.liked,
        like_count: data.liked ? prev.like_count + 1 : prev.like_count - 1
      }));
    } catch (err) {
      console.error("Like error:", err);
    }
  };

  const handleToggleBookmark = async () => {
    if (!currentUser) return;
    try {
      const data = await apiFetch(`/api/blogs/${detailBlog.id}/bookmark`, { method: "POST" });
      setDetailBlog(prev => ({
        ...prev,
        user_bookmarked: data.bookmarked,
        bookmark_count: data.bookmarked ? prev.bookmark_count + 1 : prev.bookmark_count - 1
      }));
    } catch (err) {
      console.error("Bookmark error:", err);
    }
  };

  // --- Comments ---
  const [commentText, setCommentText] = useState("");

  const handleSubmitComment = async () => {
    if (!commentText.trim()) return;
    try {
      await apiFetch(`/api/blogs/${detailBlog.id}/comments`, {
        method: "POST",
        body: JSON.stringify({ comment: commentText })
      });
      setCommentText("");
      await triggerAlert("Comment added.", true);
      fetchBlogDetail(detailBlog.id);
    } catch (err) {
      await triggerAlert(err.message || "Failed to add comment.");
    }
  };

  const handleModerateComment = async (commentId, status) => {
    try {
      await apiFetch(`/api/blogs/${detailBlog.id}/comments/${commentId}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      await triggerAlert(`Comment ${status}.`, true);
      fetchBlogDetail(detailBlog.id);
    } catch (err) {
      await triggerAlert(err.message || "Failed to moderate comment.");
    }
  };

  // --- Detail View ---
  if (id) {
    if (detailLoading) {
      return <div className="blog-loading"><div className="blog-spinner" /></div>;
    }

    if (!detailBlog) {
      return <div className="blog-empty">Blog not found.</div>;
    }

    return (
      <div className="blog-detail-container" style={{ background: "#fdfbf7", color: "#1a202c", padding: "24px" }}>
        <div className="blog-detail-back" onClick={() => navigate("/dashboard/blogs")} style={{
          color: "#cda751",
          cursor: "pointer",
          fontWeight: "bold",
          fontSize: "15px",
          marginBottom: "20px"
        }}>
          ← Back to Blogs
        </div>

        {/* Single card wrapping the entire blog */}
        <article className="blog-detail-main" style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          background: "#fff",
          borderRadius: "12px",
          border: "1px solid rgba(205,167,81,0.25)",
          padding: "28px",
          boxShadow: "0 4px 20px rgba(205,167,81,0.08)"
        }}>
          {/* Category/Discipline */}
          <div className="blog-detail-category" style={{
            fontSize: "14px",
            fontWeight: "700",
            color: "#cda751",
            textTransform: "uppercase",
            letterSpacing: "1px"
          }}>
            {detailBlog.category}
          </div>

          {/* Title */}
          <h1 className="blog-detail-title" style={{
            fontSize: "32px",
            fontWeight: "800",
            color: "#1a202c",
            margin: "0"
          }}>
            {detailBlog.title}
          </h1>

          {/* Image */}
          <div className="blog-detail-image-wrapper" style={{ borderRadius: "10px", overflow: "hidden" }}>
            <img
              src={getImageUrl(detailBlog.featured_image)}
              alt={detailBlog.title}
              style={{
                width: "100%",
                maxHeight: "450px",
                objectFit: "cover",
                display: "block"
              }}
              onError={(e) => {
                e.target.src = "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=800";
              }}
            />
          </div>

          {/* Description/Content */}
          <section
            className="blog-detail-body"
            style={{ fontSize: "17px", lineHeight: "1.8", color: "#2d3748" }}
            dangerouslySetInnerHTML={{ __html: detailBlog.content_html }}
          />

          {/* Meta Details: 2 rows, 2 columns — no separate box */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px 16px",
            marginTop: "8px",
            paddingTop: "16px",
            borderTop: "1px solid #edf2f7",
            fontSize: "14px",
            color: "#4a5568"
          }}>
            <div>
              <strong style={{ color: "#1a202c" }}>Author:</strong> {detailBlog.author?.name || "Anonymous"}
            </div>
            <div>
              <strong style={{ color: "#1a202c" }}>Role:</strong> {detailBlog.author?.role || "Specialist"}
            </div>
            <div>
              <strong style={{ color: "#1a202c" }}>Date:</strong> {formatDate(detailBlog.published_at || detailBlog.created_at)}
            </div>
            <div>
              <strong style={{ color: "#1a202c" }}>Read Time:</strong> {detailBlog.read_time || "3 min read"}
            </div>
          </div>

          {/* Action Buttons for Admins only (no staff edit/delete here) */}
          {isAdmin && (
            <div className="blog-admin-decision-actions" style={{
              display: "flex",
              gap: "16px",
              marginTop: "8px",
              paddingTop: "16px",
              borderTop: "1px solid #edf2f7",
              flexWrap: "wrap"
            }}>
              {detailBlog.status === "pending" && (
                <>
                  <button
                    className="blog-btn-accept"
                    onClick={() => handleApprove(detailBlog.id)}
                  >
                    Accept
                  </button>
                  <button
                    className="blog-btn-reject"
                    onClick={() => handleReject(detailBlog.id)}
                  >
                    Reject
                  </button>
                </>
              )}
              {detailBlog.status === "published" && (
                <button
                  className="blog-btn-archive"
                  onClick={() => handleArchive(detailBlog.id)}
                >
                  Archive Article
                </button>
              )}
              {detailBlog.status === "archived" && (
                <button
                  className="blog-btn-accept"
                  onClick={() => handleRestore(detailBlog.id)}
                >
                  Restore Article
                </button>
              )}
            </div>
          )}
        </article>
      </div>
    );
  }

  // --- List View ---
  return (
    <div className="blog-container">
      {/* Rejection Modal */}
      {rejectionModal.isOpen && (
        <div className="blog-editor-modal-overlay">
          <div className="blog-editor-modal" style={{ maxWidth: "400px" }}>
            <h2>Reject Blog</h2>
            <p style={{
              color: "#718096",
              marginBottom: "16px",
              fontSize: "14px"
            }}>
              Please provide a reason for rejecting this article. This will be sent to the author.
            </p>
            <textarea
              placeholder="Rejection Reason"
              value={rejectionModal.reason}
              onChange={(e) => setRejectionModal({ ...rejectionModal, reason: e.target.value })}
              className="blog-editor-form-textarea"
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                marginBottom: "16px",
                fontFamily: "inherit",
                resize: "vertical"
              }}
              rows={4}
              required
            />
            <div className="blog-editor-actions">
              <button type="button" onClick={() => setRejectionModal({ isOpen: false, blogId: null, reason: "" })} className="blog-editor-cancel">Cancel</button>
              <button type="button" onClick={submitRejection} className="blog-btn-reject">Reject Article</button>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="blog-header">
        <div className="blog-title">
          <h1>Vedic & Ayurvedic Blogs</h1>
          <p>Read about Ayurveda, Yoga, Wellness and Healthy Lifestyle</p>
        </div>
        {isStaff && (
          <button
            style={{
              background: "#cda751",
              color: "white",
              border: "none",
              padding: "10px 20px",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold"
            }}
            onClick={() => navigate("/dashboard/blogs/create")}
          >
            + Create Blog
          </button>
        )}
      </div>

      {/* Tabs */}
      {isAdmin && (
        <div className="blog-tabs">
          {["published", "pending", "archived"].map(tab => (
            <button
              key={tab}
              className={`blog-tab-btn ${activeTab === tab ? "active" : ""}`}
              onClick={() => {
                setActiveTab(tab);
                setSearchParams({ status: tab });
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      )}

      {isStaff && (
        <div className="blog-tabs">
          {["my_blogs", "other_blogs"].map(tab => (
            <button
              key={tab}
              className={`blog-tab-btn ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "my_blogs" ? "My Blogs" : "Other Blogs"}
            </button>
          ))}
        </div>
      )}

      {/* Search & Filter Controls */}
      <div className="blog-controls">
        <div className="blog-search-box">
          <img src="https://cdn-icons-png.flaticon.com/512/64/64673.png" alt="search" style={{ width: "16px", height: "16px", opacity: "0.5" }} />
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
          <img src="https://cdn-icons-png.flaticon.com/512/25/25243.png" alt="dropdown" style={{ width: "12px", height: "12px" }} />
        </div>
      </div>

      {/* Blog Grid */}
      {loading ? (
        <div className="blog-loading"><div className="blog-spinner" /></div>
      ) : filteredBlogs.length === 0 ? (
        <div className="blog-empty">
          <p style={{ fontSize: "16px", color: "#718096" }}>No blogs found.</p>
        </div>
      ) : (
        <div className="blog-grid">
          {filteredBlogs.map((blog) => (
            <BlogCard
              key={blog.id}
              blog={blog}
              onClick={handleCardClick}
              isStaff={isStaff}
              isAdmin={isAdmin}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onApprove={handleApprove}
              onReject={handleReject}
              onArchive={handleArchive}
              onRestore={handleRestore}
            />
          ))}
        </div>
      )}

      <MediaPickerModal
        isOpen={mediaModalOpen}
        onClose={() => setMediaModalOpen(false)}
        onSelect={(url) => {
          setMediaModalOpen(false);
        }}
        allowVideos={false}
        title="Select Pexels Image"
        page_type="blogs"
        category="Ayurveda"
        subcategory="All"
        defaultQuery="Wellness"
        suggestions={['Ayurveda', 'Yoga', 'Wellness', 'Healthy Lifestyle']}
      />
    </div>
  );
}
