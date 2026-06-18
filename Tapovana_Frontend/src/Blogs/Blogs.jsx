import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import "./Blogs.css";
import SearchIcon from "../assets/searchIcon.svg";
import DropdownIcon from "../assets/dropdownIcon.svg";
import { getUser } from "../utils/session";
import { getImageUrl } from "../utils/image";
import { useAllocations } from "../utils/AllocationContext";
import { apiFetch } from "../api/http";
import MediaPickerModal from "../components/MediaPickerModal";

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

// ─── Quill Editor Component ──────────────────────────────────────────────
function QuillEditor({ value, onChange }) {
  const containerRef = useRef(null);
  const quillRef = useRef(null);
  const isInternalChange = useRef(false);

  useEffect(() => {
    if (containerRef.current && !quillRef.current) {
      quillRef.current = new Quill(containerRef.current, {
        theme: "snow",
        modules: {
          toolbar: [
            [{ header: [1, 2, 3, false] }],
            ["bold", "italic", "underline", "strike"],
            [{ list: "ordered" }, { list: "bullet" }],
            ["blockquote", "link", "image"],
            ["clean"],
          ],
        },
        placeholder: "Write your blog content here...",
      });

      quillRef.current.on("text-change", () => {
        isInternalChange.current = true;
        const html = quillRef.current.root.innerHTML;
        onChange(html === "<p><br></p>" ? "" : html);
      });
    }
  }, []);

  useEffect(() => {
    if (quillRef.current && !isInternalChange.current) {
      const currentHtml = quillRef.current.root.innerHTML;
      if (value !== currentHtml && value !== undefined) {
        quillRef.current.root.innerHTML = value || "";
      }
    }
    isInternalChange.current = false;
  }, [value]);

  return (
    <div className="blog-quill-container">
      <div ref={containerRef} />
    </div>
  );
}

// ─── Blog Card ───────────────────────────────────────────────────────────
function BlogCard({ blog, onClick, isStaff, isAdmin, onEdit, onDelete, onApprove, onReject, onArchive, onRestore }) {
  const isDraft = blog.status === "draft";
  const isPending = blog.status === "pending";
  const isPublished = blog.status === "published";
  const isRejected = blog.status === "rejected";
  const isArchived = blog.status === "archived";

  return (
    <div className="blog-card" onClick={() => onClick(blog.id)} style={{ display: "flex", flexDirection: "column", background: "white", borderRadius: "12px", border: "1px solid rgba(205,167,81,0.2)", overflow: "hidden", transition: "all 0.2s" }}>
      <div className="blog-card-content" style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: "6px", flex: 1 }}>
        
        {/* 1. Category/Discipline */}
        <span className="blog-card-category" style={{ fontSize: "11px", fontWeight: "700", color: "#cda751", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          {blog.category}
        </span>

        {/* 2. Title */}
        <h3 className="blog-card-title" style={{ margin: "0", fontSize: "15px", fontWeight: "700", color: "#1a202c", lineClamp: 2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: "1.3" }}>
          {blog.title}
        </h3>

        {/* 3. Image */}
        <div className="blog-card-image-wrapper" style={{ position: "relative", borderRadius: "8px", overflow: "hidden", border: "1px solid #edf2f7", height: "135px" }}>
          <img
            src={getImageUrl(blog.featured_image)}
            alt={blog.title}
            className="blog-card-image"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => {
              e.target.src = "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=800";
            }}
          />
          {(isStaff || isAdmin) && (
            <div className={"blog-status-badge " + blog.status} style={{ fontSize: "9px", padding: "2px 6px" }}>
              {isPublished ? "Published" : isPending ? "Pending" : isDraft ? "Draft" : isRejected ? "Rejected" : "Archived"}
            </div>
          )}
        </div>

        {/* 4. Author Name & Role */}
        <div style={{ fontSize: "11px", fontWeight: "600", color: "#4a5568", marginTop: "1px" }}>
          By {blog.author?.name || "Anonymous"} <span style={{ color: "#cbd5e0", margin: "0 4px" }}>|</span> <span style={{ textTransform: "uppercase", color: "#cda751", fontWeight: "700" }}>{blog.author?.role || "Specialist"}</span>
        </div>

        {/* 5. Date & Read Time */}
        <div style={{ fontSize: "11px", color: "#718096", marginBottom: "2px" }}>
          {formatDate(blog.published_at || blog.created_at)} · {blog.read_time}
        </div>

        {isRejected && blog.rejection_reason && (
          <div style={{ marginTop: "4px", padding: "4px 8px", backgroundColor: "#fff5f5", border: "1px solid #feb2b2", borderRadius: "6px", fontSize: "11px", color: "#c53030" }}>
            <strong>Reason:</strong> {blog.rejection_reason}
          </div>
        )}

        {/* Actions Footer */}
        <div className="blog-card-footer" onClick={(e) => e.stopPropagation()} style={{ marginTop: "auto", paddingTop: "6px", borderTop: "1px solid #edf2f7", display: "flex", gap: "4px", flexDirection: "column" }}>
          {isStaff && (isDraft || isRejected) && (
            <div className="blog-card-actions" style={{ display: "flex", gap: "6px", width: "100%", marginTop: "2px" }}>
              <button onClick={() => onEdit(blog)} style={{ background: "#cda751", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontWeight: "700", fontSize: "11px", flex: 1, textAlign: "center" }}>Edit</button>
              <button onClick={() => onDelete(blog.id)} style={{ background: "transparent", color: "#cda751", border: "1px solid #cda751", padding: "5px 11px", borderRadius: "6px", cursor: "pointer", fontWeight: "700", fontSize: "11px", flex: 1, textAlign: "center" }}>Delete</button>
            </div>
          )}
          {isAdmin && isPending && (
            <div className="blog-card-actions" style={{ display: "flex", gap: "6px", width: "100%", marginTop: "2px" }}>
              <button onClick={() => onApprove(blog.id)} style={{ background: "#cda751", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontWeight: "700", fontSize: "11px", flex: 1, textAlign: "center" }}>Approve</button>
              <button onClick={() => onReject(blog.id)} style={{ background: "transparent", color: "#cda751", border: "1px solid #cda751", padding: "5px 11px", borderRadius: "6px", cursor: "pointer", fontWeight: "700", fontSize: "11px", flex: 1, textAlign: "center" }}>Reject</button>
            </div>
          )}
          {isAdmin && isArchived && (
            <div className="blog-card-actions" style={{ display: "flex", gap: "6px", width: "100%", marginTop: "2px" }}>
              <button onClick={() => onRestore(blog.id)} style={{ background: "#cda751", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontWeight: "700", fontSize: "11px", flex: 1, textAlign: "center" }}>Restore</button>
              <button onClick={() => onDelete(blog.id)} style={{ background: "transparent", color: "#cda751", border: "1px solid #cda751", padding: "5px 11px", borderRadius: "6px", cursor: "pointer", fontWeight: "700", fontSize: "11px", flex: 1, textAlign: "center" }}>Delete</button>
            </div>
          )}
          {isAdmin && isPublished && (
            <div className="blog-card-actions" style={{ display: "flex", gap: "6px", width: "100%", marginTop: "2px" }}>
              <button onClick={() => onArchive(blog.id)} style={{ background: "#cda751", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontWeight: "700", fontSize: "11px", flex: 1, textAlign: "center" }}>Archive</button>
              <button onClick={() => onDelete(blog.id)} style={{ background: "transparent", color: "#cda751", border: "1px solid #cda751", padding: "5px 11px", borderRadius: "6px", cursor: "pointer", fontWeight: "700", fontSize: "11px", flex: 1, textAlign: "center" }}>Delete</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Related Blogs ───────────────────────────────────────────────────────
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

// ═════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════
export default function Blogs({ mode }) {
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
  const [editingBlogId, setEditingBlogId] = useState(null);
  const [editBlogData, setEditBlogData] = useState({
    title: "", category: "AYURVEDA", summary: "", content_html: "",
    featured_image: "", tags: "", seo_title: "", seo_description: "", seo_keywords: "",
    author_name: "", author_role: "", read_time: ""
  });
  const [rejectionModal, setRejectionModal] = useState({ isOpen: false, blogId: null, reason: "" });
  const [showSeo, setShowSeo] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [savingBlog, setSavingBlog] = useState(false);
  const fileInputRef = useRef(null);


  // Handle initializing edit/create based on URL / mode prop
  useEffect(() => {
    if (mode === "create") {
      if (!isStaff) {
        navigate("/dashboard/blogs");
        return;
      }
      setEditingBlogId(null);
      setEditBlogData({
        title: "", category: "AYURVEDA", summary: "", content_html: "",
        featured_image: "", tags: "", seo_title: "", seo_description: "", seo_keywords: "",
        author_name: `${currentUser?.first_name || ''} ${currentUser?.last_name || ''}`.trim(),
        author_role: currentUser?.role?.toUpperCase() === "DOCTOR" ? "Doctor" : currentUser?.role?.toUpperCase() === "THERAPIST" ? "Therapist" : "",
        read_time: "3 min read"
      });
    }
  }, [mode, isStaff, navigate, currentUser]);

  useEffect(() => {
    if (mode === "edit" && detailBlog) {
      if (detailBlog.status !== "draft" && detailBlog.status !== "rejected") {
        triggerAlert("You can only edit Draft or Rejected blogs.");
        navigate("/dashboard/blogs");
        return;
      }
      setEditingBlogId(detailBlog.id);
      setEditBlogData({
        title: detailBlog.title || "",
        category: detailBlog.category || "AYURVEDA",
        summary: detailBlog.summary || "",
        content_html: detailBlog.content_html || "",
        featured_image: detailBlog.featured_image || "",
        tags: Array.isArray(detailBlog.tags) ? detailBlog.tags.join(", ") : (detailBlog.tags || ""),
        seo_title: detailBlog.seo_title || "",
        seo_description: detailBlog.seo_description || "",
        seo_keywords: detailBlog.seo_keywords || "",
        author_name: detailBlog.author?.name || `${currentUser?.first_name || ''} ${currentUser?.last_name || ''}`.trim(),
        author_role: detailBlog.author?.role || (currentUser?.role?.toUpperCase() === "DOCTOR" ? "Doctor" : currentUser?.role?.toUpperCase() === "THERAPIST" ? "Therapist" : ""),
        read_time: detailBlog.read_time || "3 min read"
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, detailBlog]);

  // ─── Fetch blogs list ──────────────────────────────────────────────
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
    if (!id && !mode) fetchBlogs();
  }, [fetchBlogs, id, mode]);

  // ─── Fetch single blog detail ──────────────────────────────────────
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

  // ─── Filtered blogs for display ────────────────────────────────────
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

  // ─── Handlers ──────────────────────────────────────────────────────
  const handleCardClick = (blogId) => {
    navigate("/dashboard/blogs/" + blogId);
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
      await triggerAlert("Article archived successfully.", true);
      fetchBlogs();
      if (id) {
        navigate("/dashboard/blogs");
      }
    } catch (err) {
      await triggerAlert(err.message || "Failed to archive blog.");
    }
  };

  const handleRestore = async (blogId) => {
    const confirmed = await triggerConfirm("Are you sure you want to restore this archived article to published status?");
    if (!confirmed) return;
    try {
      await apiFetch(`/api/blogs/${blogId}/restore`, { method: "POST" });
      await triggerAlert("Article restored successfully.", true);
      fetchBlogs();
      if (id) {
        navigate("/dashboard/blogs");
      }
    } catch (err) {
      await triggerAlert(err.message || "Failed to restore blog.");
    }
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

  // ─── Image upload ──────────────────────────────────────────────────
  const handleImageFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = await apiFetch("/api/uploads/blog-image", {
          method: "POST",
          body: JSON.stringify({ image: reader.result })
        });
        setEditBlogData(prev => ({ ...prev, featured_image: data.url }));
        triggerAlert("Image uploaded successfully.", true);
      } catch {
        // Fallback: store base64 directly
        setEditBlogData(prev => ({ ...prev, featured_image: reader.result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    handleImageFile(file);
  };

  const handleCancel = () => {
    setEditingBlogId(null);
    navigate("/dashboard/blogs");
  };

  // ─── Editor submit ─────────────────────────────────────────────────
  const handleEditorSubmit = async (targetStatus) => {
    // 1. Title validation: Required, min length 3 chars.
    if (!editBlogData.title || editBlogData.title.trim().length < 3) {
      await triggerAlert("Title is required (minimum 3 characters).");
      return;
    }
    // 2. Category validation: Required.
    if (!editBlogData.category) {
      await triggerAlert("Category is required.");
      return;
    }
    // 3. Author Name validation: Required, alphabets only.
    if (!editBlogData.author_name || !/^[A-Za-z\s]+$/.test(editBlogData.author_name.trim())) {
      await triggerAlert("Author name must contain only alphabets.");
      return;
    }
    // 4. Role validation: Required (Doctor/Therapist).
    const roleVal = editBlogData.author_role?.trim().toLowerCase();
    if (roleVal !== "doctor" && roleVal !== "therapist") {
      await triggerAlert("Please select a valid role (Doctor/Therapist).");
      return;
    }
    // 5. Read Time validation: Required.
    if (!editBlogData.read_time || !editBlogData.read_time.trim()) {
      await triggerAlert("Read time is required.");
      return;
    }
    // 6. Image validation: Required for publishing (status = pending).
    if (targetStatus === "pending" && !editBlogData.featured_image) {
      await triggerAlert("Featured image is required for publishing.");
      return;
    }
    // 7. Description validation: Required, min length 500 chars only for pending
    const textOnly = (editBlogData.content_html || "").replace(/<[^>]*>/g, '').trim();
    if (targetStatus === "pending" && textOnly.length < 500) {
      await triggerAlert("Content must be at least 500 characters.");
      return;
    }

    setSavingBlog(true);
    try {
      const payload = {
        title: editBlogData.title,
        category: editBlogData.category,
        summary: editBlogData.summary,
        content_html: editBlogData.content_html,
        featured_image: editBlogData.featured_image,
        tags: editBlogData.tags ? editBlogData.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
        seo_title: editBlogData.seo_title,
        seo_description: editBlogData.seo_description,
        seo_keywords: editBlogData.seo_keywords,
        author_name: editBlogData.author_name,
        author_role: editBlogData.author_role,
        read_time: editBlogData.read_time
      };

      if (editingBlogId) {
        // First update the blog content (without changing status yet)
        await apiFetch(`/api/blogs/${editingBlogId}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });

        // Then handle status change
        if (targetStatus === "pending") {
          await apiFetch(`/api/blogs/${editingBlogId}/submit`, { method: "POST" });
        } else if (targetStatus === "draft") {
          // If we just want to save as draft, update status separately
          await apiFetch(`/api/blogs/${editingBlogId}`, {
            method: "PATCH",
            body: JSON.stringify({ status: targetStatus })
          });
        }

        setEditingBlogId(null);
        navigate("/dashboard/blogs");
        await triggerAlert("Blog updated successfully.", true);
      } else {
        payload.status = targetStatus;
        await apiFetch("/api/blogs", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        const msg = targetStatus === "draft" ? "Draft saved successfully." : "Blog created and submitted for review.";
        setEditingBlogId(null);
        navigate("/dashboard/blogs");
        await triggerAlert(msg, true);
      }
    } catch (err) {
      await triggerAlert(err.message || "Failed to save blog.");
    } finally {
      setSavingBlog(false);
    }
  };

  // ─── Like / Bookmark ───────────────────────────────────────────────
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

  // ─── Comments ──────────────────────────────────────────────────────
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

  // ═════════════════════════════════════════════════════════════════════
  // DETAIL VIEW
  // ═════════════════════════════════════════════════════════════════════
  if (id && mode !== "edit") {
    if (detailLoading) {
      return <div className="blog-loading"><div className="blog-spinner" /></div>;
    }

    if (!detailBlog) {
      return <div className="blog-empty">Blog not found.</div>;
    }

    return (
      <div className="blog-detail-container" style={{ background: "#fdfbf7", color: "#1a202c", padding: "24px" }}>


        <div className="blog-detail-back" onClick={() => navigate("/dashboard/blogs")} style={{ color: "#cda751", cursor: "pointer", fontWeight: "bold", fontSize: "15px", marginBottom: "20px" }}>
          ← Back to Blogs
        </div>

        {/* Single card wrapping the entire blog */}
        <article className="blog-detail-main" style={{ display: "flex", flexDirection: "column", gap: "16px", background: "#fff", borderRadius: "12px", border: "1px solid rgba(205,167,81,0.25)", padding: "28px", boxShadow: "0 4px 20px rgba(205,167,81,0.08)" }}>
          
          {/* Category/Discipline */}
          <div className="blog-detail-category" style={{ fontSize: "14px", fontWeight: "700", color: "#cda751", textTransform: "uppercase", letterSpacing: "1px" }}>
            {detailBlog.category}
          </div>

          {/* Title */}
          <h1 className="blog-detail-title" style={{ fontSize: "32px", fontWeight: "800", color: "#1a202c", margin: "0" }}>
            {detailBlog.title}
          </h1>

          {/* Image */}
          <div className="blog-detail-image-wrapper" style={{ borderRadius: "10px", overflow: "hidden" }}>
            <img 
              src={getImageUrl(detailBlog.featured_image)} 
              alt={detailBlog.title} 
              style={{ width: "100%", maxHeight: "450px", objectFit: "cover", display: "block" }}
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px", marginTop: "8px", paddingTop: "16px", borderTop: "1px solid #edf2f7", fontSize: "14px", color: "#4a5568" }}>
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
            <div className="blog-admin-decision-actions" style={{ display: "flex", gap: "16px", marginTop: "8px", paddingTop: "16px", borderTop: "1px solid #edf2f7", flexWrap: "wrap" }}>
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

  // ═════════════════════════════════════════════════════════════════════
  // EDITOR VIEW (Full Page)
  // ═════════════════════════════════════════════════════════════════════
  if (mode === "create" || mode === "edit") {
    if (mode === "edit" && detailLoading) {
      return <div className="blog-loading"><div className="blog-spinner" /></div>;
    }

    return (
      <div className="blog-editor-page-container" style={{ background: "#fdfbf7", minHeight: "100vh", padding: "24px" }}>


        <div className="blog-detail-back" onClick={handleCancel} style={{ marginBottom: "20px", color: "#cda751", cursor: "pointer", fontWeight: "bold" }}>
          ← Cancel and Go Back
        </div>

        <div className="blog-editor-card" style={{ background: "white", padding: "30px", borderRadius: "12px", border: "1px solid rgba(205,167,81,0.3)", boxShadow: "0 4px 20px rgba(205,167,81,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "2px solid #cda751", paddingBottom: "12px", marginBottom: "20px" }}>
            <h2 style={{ margin: 0, color: "#1a202c", fontWeight: "800" }}>{mode === "edit" ? "Edit Blog" : "Create New Blog"}</h2>
            {mode === "edit" && detailBlog && (
              <div style={{ 
                background: "#cda751", 
                color: "white", 
                fontWeight: "600", 
                padding: "6px 12px", 
                borderRadius: "6px", 
                fontSize: "13px", 
                textTransform: "capitalize"
              }}>
                {detailBlog.status}
              </div>
            )}
          </div>
          
          <div className="blog-editor-form" style={{ display: "flex", flexDirection: "column", gap: "20px", marginTop: "20px" }}>
            
            {/* 1. Category/Discipline */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "14px", fontWeight: "700", color: "#1a202c" }}>Category/Discipline *</label>
              <select
                value={editBlogData.category}
                onChange={(e) => setEditBlogData(prev => ({ ...prev, category: e.target.value }))}
                style={{ width: "100%", padding: "12px", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "14px", background: "#fff" }}
              >
                <option value="AYURVEDA">Ayurveda</option>
                <option value="YOGA">Yoga</option>
                <option value="NUTRITION">Nutrition</option>
                <option value="WELLNESS">Wellness</option>
              </select>
            </div>

            {/* 2. Title */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "14px", fontWeight: "700", color: "#1a202c" }}>Blog Title * (Min 3 chars)</label>
              <input
                type="text"
                placeholder="Enter blog title..."
                value={editBlogData.title}
                onChange={(e) => setEditBlogData(prev => ({ ...prev, title: e.target.value }))}
                style={{ width: "100%", padding: "12px", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "14px" }}
                required
              />
            </div>

            {/* 3. Short Subtitle/Tagline */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "14px", fontWeight: "700", color: "#1a202c" }}>Short Subtitle/Tagline</label>
              <textarea
                placeholder="Enter short summary or tagline..."
                value={editBlogData.summary}
                onChange={(e) => setEditBlogData(prev => ({ ...prev, summary: e.target.value }))}
                rows={2}
                style={{ width: "100%", padding: "12px", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "14px", fontFamily: "inherit" }}
              />
            </div>

            {/* 4. Author Name */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "14px", fontWeight: "700", color: "#1a202c" }}>Author Name *</label>
              <input
                type="text"
                placeholder="Enter author name..."
                value={editBlogData.author_name}
                onChange={(e) => setEditBlogData(prev => ({ ...prev, author_name: e.target.value }))}
                style={{ width: "100%", padding: "12px", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "14px", background: "#fff" }}
                required
              />
            </div>

            {/* 5. Role */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "14px", fontWeight: "700", color: "#1a202c" }}>Role *</label>
              <select
                value={editBlogData.author_role}
                onChange={(e) => setEditBlogData(prev => ({ ...prev, author_role: e.target.value }))}
                style={{ width: "100%", padding: "12px", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "14px", background: "#fff" }}
              >
                <option value="">Select Role</option>
                <option value="Doctor">Doctor</option>
                <option value="Therapist">Therapist</option>
              </select>
            </div>

            {/* Read Time */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "14px", fontWeight: "700", color: "#1a202c" }}>Read Time *</label>
              <input
                type="text"
                placeholder="e.g. 5 min read"
                value={editBlogData.read_time}
                onChange={(e) => setEditBlogData(prev => ({ ...prev, read_time: e.target.value }))}
                style={{ width: "100%", padding: "12px", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "14px", background: "#fff" }}
                required
              />
            </div>

            {/* 6. Date */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "14px", fontWeight: "700", color: "#718096" }}>Date (Auto-generated, not editable)</label>
              <input
                type="text"
                value={mode === "edit" && detailBlog ? formatDate(detailBlog.created_at) : formatDate(new Date())}
                disabled
                style={{ width: "100%", padding: "12px", border: "1px solid #cbd5e0", borderRadius: "8px", fontSize: "14px", background: "#edf2f7", cursor: "not-allowed", color: "#4a5568" }}
              />
            </div>

            {/* 7. Image */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "4px" }}>
                <label style={{ fontSize: "14px", fontWeight: "700", color: "#1a202c", margin: 0 }}>Featured Image Thumbnail * (Required for publishing)</label>
                <button type="button" className="blog-seo-toggle" style={{ margin: 0, fontSize: "12px", border: "1px solid #cda751", padding: "4px 10px", borderRadius: "6px" }}
                  onClick={(e) => { e.stopPropagation(); setMediaModalOpen(true); }}>
                  📷 Choose from Pexels
                </button>
              </div>
              <div
                className={`blog-image-upload-zone ${dragOver ? "drag-over" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{ border: "2px dashed #cbd5e0", borderRadius: "8px", padding: "20px", textAlign: "center", cursor: "pointer", background: "#fafafa" }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => handleImageFile(e.target.files?.[0])}
                />
                {editBlogData.featured_image ? (
                  <img
                    src={getImageUrl(editBlogData.featured_image)}
                    alt="Preview"
                    className="blog-image-preview"
                    style={{ maxHeight: "200px", maxWidth: "100%", objectFit: "contain", borderRadius: "6px" }}
                  />
                ) : (
                  <p style={{ color: "#718096", margin: 0 }}>📷 Click or drag an image here for featured image</p>
                )}
              </div>
            </div>

            {/* 8. Description/Content */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "14px", fontWeight: "700", color: "#1a202c" }}>Description/Content * (Min 50 chars)</label>
              <QuillEditor
                value={editBlogData.content_html}
                onChange={(html) => setEditBlogData(prev => ({ ...prev, content_html: html }))}
              />
            </div>

            {/* SEO Fields */}
            <button type="button" className="blog-seo-toggle" onClick={() => setShowSeo(!showSeo)} style={{ alignSelf: "flex-start", background: "transparent", border: "none", color: "#cda751", cursor: "pointer", fontWeight: "bold" }}>
              {showSeo ? "▾" : "▸"} SEO Settings
            </button>
            {showSeo && (
              <div className="blog-seo-fields" style={{ display: "flex", flexDirection: "column", gap: "12px", border: "1px solid #edf2f7", padding: "16px", borderRadius: "8px" }}>
                <input type="text" placeholder="SEO Title" value={editBlogData.seo_title} onChange={(e) => setEditBlogData(prev => ({ ...prev, seo_title: e.target.value }))} style={{ padding: "10px", border: "1px solid #e2e8f0", borderRadius: "6px" }} />
                <textarea placeholder="SEO Description" value={editBlogData.seo_description} onChange={(e) => setEditBlogData(prev => ({ ...prev, seo_description: e.target.value }))} rows={2} style={{ padding: "10px", border: "1px solid #e2e8f0", borderRadius: "6px", fontFamily: "inherit" }} />
                <input type="text" placeholder="SEO Keywords (comma separated)" value={editBlogData.seo_keywords} onChange={(e) => setEditBlogData(prev => ({ ...prev, seo_keywords: e.target.value }))} style={{ padding: "10px", border: "1px solid #e2e8f0", borderRadius: "6px" }} />
              </div>
            )}

            <div className="blog-editor-actions" style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "10px", borderTop: "1px solid #edf2f7", paddingTop: "20px" }}>
              <button type="button" onClick={handleCancel} className="blog-editor-cancel">Cancel</button>
              <button
                type="button"
                onClick={() => handleEditorSubmit("draft")}
                className="blog-editor-save blog-editor-save-draft"
                disabled={savingBlog}
              >
                Save Draft
              </button>
              <button
                type="button"
                onClick={() => handleEditorSubmit("pending")}
                className="blog-editor-save blog-editor-submit"
                disabled={savingBlog}
              >
                Send for Approval
              </button>
            </div>
          </div>
        </div>

        <MediaPickerModal 
          isOpen={mediaModalOpen}
          onClose={() => setMediaModalOpen(false)}
          onSelect={(url) => {
            setEditBlogData(prev => ({ ...prev, featured_image: url }));
            setMediaModalOpen(false);
          }}
          allowVideos={false}
          title="Select Pexels Image"
          page_type="blogs"
          category={editBlogData?.category || 'Ayurveda'}
          subcategory="All"
          defaultQuery={(() => {
            const cat = (editBlogData?.category || '').toUpperCase();
            if (cat === 'AYURVEDA') return 'Ayurveda';
            if (cat === 'YOGA') return 'Yoga';
            if (cat === 'WELLNESS') return 'Wellness';
            if (cat === 'NUTRITION') return 'Healthy Lifestyle';
            return 'Wellness';
          })()}
          suggestions={['Ayurveda', 'Yoga', 'Wellness', 'Healthy Lifestyle']}
        />
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════
  // LIST VIEW
  // ═════════════════════════════════════════════════════════════════════
  return (
    <div className="blog-container">


      {/* Rejection Modal */}
      {rejectionModal.isOpen && (
        <div className="blog-editor-modal-overlay">
          <div className="blog-editor-modal" style={{ maxWidth: "400px" }}>
            <h2>Reject Blog</h2>
            <p style={{ color: "#718096", marginBottom: "16px", fontSize: "14px" }}>
              Please provide a reason for rejecting this article. This will be sent to the author.
            </p>
            <textarea
              placeholder="Rejection Reason"
              value={rejectionModal.reason}
              onChange={(e) => setRejectionModal({ ...rejectionModal, reason: e.target.value })}
              className="blog-editor-form-textarea"
              style={{ width: "100%", padding: "12px", border: "1px solid #e2e8f0", borderRadius: "8px", marginBottom: "16px", fontFamily: "inherit", resize: "vertical" }}
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
            style={{ background: "#cda751", color: "white", border: "none", padding: "10px 20px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
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
          setEditBlogData(prev => ({ ...prev, featured_image: url }));
          setMediaModalOpen(false);
        }}
        allowVideos={false}
        title="Select Pexels Image"
        page_type="blogs"
        category={editBlogData?.category || 'Ayurveda'}
        subcategory="All"
        defaultQuery={(() => {
          const cat = (editBlogData?.category || '').toUpperCase();
          if (cat === 'AYURVEDA') return 'Ayurveda';
          if (cat === 'YOGA') return 'Yoga';
          if (cat === 'WELLNESS') return 'Wellness';
          if (cat === 'NUTRITION') return 'Healthy Lifestyle';
          return 'Wellness';
        })()}
        suggestions={['Ayurveda', 'Yoga', 'Wellness', 'Healthy Lifestyle']}
      />
    </div>
  );
}