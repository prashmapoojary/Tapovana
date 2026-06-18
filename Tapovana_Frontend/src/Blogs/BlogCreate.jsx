import React, { useState, useRef, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Quill from "quill";
import "quill/dist/quill.snow.css";
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

export default function BlogCreate() {
  const navigate = useNavigate();
  const { triggerAlert } = useAllocations();
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [showSeo, setShowSeo] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [savingBlog, setSavingBlog] = useState(false);
  const fileInputRef = useRef(null);

  const currentUser = useMemo(() => getUser(), []);

  const [blogData, setBlogData] = useState({
    title: "",
    category: "AYURVEDA",
    summary: "",
    content_html: "",
    featured_image: "",
    tags: "",
    seo_title: "",
    seo_description: "",
    seo_keywords: "",
    author_name: `${currentUser?.first_name || ""} ${currentUser?.last_name || ""}`.trim(),
    author_role:
      currentUser?.role?.toUpperCase() === "DOCTOR"
        ? "Doctor"
        : currentUser?.role?.toUpperCase() === "THERAPIST"
        ? "Therapist"
        : "",
  });

  const handleImageFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setBlogData((prev) => ({ ...prev, featured_image: e.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.[0]) {
      handleImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleEditorSubmit = async (targetStatus) => {
    if (!blogData.title || blogData.title.trim().length < 3) {
      await triggerAlert("Title is required (minimum 3 characters).");
      return;
    }
    if (!blogData.category) {
      await triggerAlert("Category is required.");
      return;
    }
    if (!blogData.author_name || !/^[A-Za-z\s]+$/.test(blogData.author_name.trim())) {
      await triggerAlert("Author name must contain only alphabets.");
      return;
    }
    const roleVal = blogData.author_role?.trim().toLowerCase();
    if (roleVal !== "doctor" && roleVal !== "therapist") {
      await triggerAlert("Please select a valid role (Doctor/Therapist).");
      return;
    }
    if (targetStatus === "pending" && !blogData.featured_image) {
      await triggerAlert("Featured image is required for publishing.");
      return;
    }
    const textOnly = (blogData.content_html || "").replace(/<[^>]*>/g, "").trim();
    if (targetStatus === "pending" && textOnly.length < 500) {
      await triggerAlert("Content must be at least 500 characters.");
      return;
    }

    setSavingBlog(true);
    try {
      const payload = {
        ...blogData,
        tags: blogData.tags
          ? blogData.tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
        status: targetStatus,
      };

      await apiFetch("/api/blogs", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const msg =
        targetStatus === "draft"
          ? "Draft saved successfully."
          : "Blog created and submitted for review.";
      navigate("/dashboard/blogs");
      await triggerAlert(msg, true);
    } catch (err) {
      await triggerAlert(err.message || "Failed to save blog.");
    } finally {
      setSavingBlog(false);
    }
  };

  const handleCancel = () => {
    navigate("/dashboard/blogs");
  };

  return (
    <div style={{ background: "#fdfbf7", minHeight: "100vh", padding: "24px" }}>
      <div
        onClick={handleCancel}
        style={{
          marginBottom: "20px",
          color: "#cda751",
          cursor: "pointer",
          fontWeight: "bold",
        }}
      >
        ← Cancel and Go Back
      </div>

      <div
        style={{
          background: "white",
          padding: "30px",
          borderRadius: "12px",
          border: "1px solid rgba(205,167,81,0.3)",
          boxShadow: "0 4px 20px rgba(205,167,81,0.05)",
        }}
      >
        <h2
          style={{
            borderBottom: "2px solid #cda751",
            paddingBottom: "12px",
            color: "#1a202c",
            fontWeight: "800",
          }}
        >
          Create New Blog
        </h2>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            marginTop: "20px",
          }}
        >
          {/* Category */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "14px", fontWeight: "700", color: "#1a202c" }}>
              Category/Discipline *
            </label>
            <select
              value={blogData.category}
              onChange={(e) =>
                setBlogData((prev) => ({ ...prev, category: e.target.value }))
              }
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                fontSize: "14px",
                background: "#fff",
              }}
            >
              <option value="AYURVEDA">Ayurveda</option>
              <option value="YOGA">Yoga</option>
              <option value="NUTRITION">Nutrition</option>
              <option value="WELLNESS">Wellness</option>
            </select>
          </div>

          {/* Title */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "14px", fontWeight: "700", color: "#1a202c" }}>
              Blog Title * (Min 3 chars)
            </label>
            <input
              type="text"
              placeholder="Enter blog title..."
              value={blogData.title}
              onChange={(e) =>
                setBlogData((prev) => ({ ...prev, title: e.target.value }))
              }
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                fontSize: "14px",
              }}
              required
            />
          </div>

          {/* Summary */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "14px", fontWeight: "700", color: "#1a202c" }}>
              Short Subtitle/Tagline
            </label>
            <textarea
              placeholder="Enter short summary or tagline..."
              value={blogData.summary}
              onChange={(e) =>
                setBlogData((prev) => ({ ...prev, summary: e.target.value }))
              }
              rows={2}
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                fontSize: "14px",
                fontFamily: "inherit",
              }}
            />
          </div>

          {/* Author Name */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "14px", fontWeight: "700", color: "#1a202c" }}>
              Author Name * (Alphabets only)
            </label>
            <input
              type="text"
              placeholder="Enter author name..."
              value={blogData.author_name}
              onChange={(e) =>
                setBlogData((prev) => ({ ...prev, author_name: e.target.value }))
              }
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                fontSize: "14px",
              }}
              required
            />
          </div>

          {/* Role */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "14px", fontWeight: "700", color: "#1a202c" }}>
              Role * (Doctor/Therapist)
            </label>
            <select
              value={blogData.author_role}
              onChange={(e) =>
                setBlogData((prev) => ({ ...prev, author_role: e.target.value }))
              }
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                fontSize: "14px",
                background: "#fff",
              }}
            >
              <option value="">Select Role</option>
              <option value="Doctor">Doctor</option>
              <option value="Therapist">Therapist</option>
            </select>
          </div>

          {/* Date */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "14px", fontWeight: "700", color: "#718096" }}>
              Date (Auto-generated, not editable)
            </label>
            <input
              type="text"
              value={formatDate(new Date())}
              disabled
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid #cbd5e0",
                borderRadius: "8px",
                fontSize: "14px",
                background: "#edf2f7",
                cursor: "not-allowed",
                color: "#4a5568",
              }}
            />
          </div>

          {/* Image */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div
              style={{
                display: "flex",
                gap: "10px",
                alignItems: "center",
                marginBottom: "4px",
              }}
            >
              <label
                style={{
                  fontSize: "14px",
                  fontWeight: "700",
                  color: "#1a202c",
                  margin: 0,
                }}
              >
                Featured Image Thumbnail * (Required for publishing)
              </label>
              <button
                type="button"
                style={{
                  margin: 0,
                  fontSize: "12px",
                  border: "1px solid #cda751",
                  padding: "4px 10px",
                  borderRadius: "6px",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setMediaModalOpen(true);
                }}
              >
                📷 Choose from Pexels
              </button>
            </div>
            <div
              className={`blog-image-upload-zone ${dragOver ? "drag-over" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: "2px dashed #cbd5e0",
                borderRadius: "8px",
                padding: "20px",
                textAlign: "center",
                cursor: "pointer",
                background: "#fafafa",
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => handleImageFile(e.target.files?.[0])}
              />
              {blogData.featured_image ? (
                <img
                  src={getImageUrl(blogData.featured_image)}
                  alt="Preview"
                  style={{
                    maxHeight: "200px",
                    maxWidth: "100%",
                    objectFit: "contain",
                    borderRadius: "6px",
                  }}
                />
              ) : (
                <p style={{ color: "#718096", margin: 0 }}>
                  📷 Click or drag an image here for featured image
                </p>
              )}
            </div>
          </div>

          {/* Content */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "14px", fontWeight: "700", color: "#1a202c" }}>
              Description/Content * (Min 50 chars)
            </label>
            <QuillEditor
              value={blogData.content_html}
              onChange={(html) =>
                setBlogData((prev) => ({ ...prev, content_html: html }))
              }
            />
          </div>

          {/* SEO Fields */}
          <button
            type="button"
            onClick={() => setShowSeo(!showSeo)}
            style={{
              alignSelf: "flex-start",
              background: "transparent",
              border: "none",
              color: "#cda751",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            {showSeo ? "▾" : "▸"} SEO Settings
          </button>
          {showSeo && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                border: "1px solid #edf2f7",
                padding: "16px",
                borderRadius: "8px",
              }}
            >
              <input
                type="text"
                placeholder="SEO Title"
                value={blogData.seo_title}
                onChange={(e) =>
                  setBlogData((prev) => ({ ...prev, seo_title: e.target.value }))
                }
                style={{
                  padding: "10px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px",
                }}
              />
              <textarea
                placeholder="SEO Description"
                value={blogData.seo_description}
                onChange={(e) =>
                  setBlogData((prev) => ({ ...prev, seo_description: e.target.value }))
                }
                rows={2}
                style={{
                  padding: "10px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px",
                  fontFamily: "inherit",
                }}
              />
              <input
                type="text"
                placeholder="SEO Keywords (comma separated)"
                value={blogData.seo_keywords}
                onChange={(e) =>
                  setBlogData((prev) => ({ ...prev, seo_keywords: e.target.value }))
                }
                style={{
                  padding: "10px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px",
                }}
              />
            </div>
          )}

          <div
            style={{
              display: "flex",
              gap: "12px",
              justifyContent: "flex-end",
              marginTop: "10px",
              borderTop: "1px solid #edf2f7",
              paddingTop: "20px",
            }}
          >
            <button
              type="button"
              onClick={handleCancel}
              style={{
                padding: "8px 16px",
                fontSize: "13px",
                fontWeight: 600,
                background: "transparent",
                color: "#4a5568",
                border: "1px solid #e2e8f0",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleEditorSubmit("draft")}
              disabled={savingBlog}
              style={{
                padding: "8px 16px",
                fontSize: "13px",
                fontWeight: 600,
                background: "#e2e8f0",
                color: "#1a202c",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Save as Draft
            </button>
            <button
              type="button"
              onClick={() => handleEditorSubmit("pending")}
              disabled={savingBlog}
              style={{
                padding: "8px 16px",
                fontSize: "13px",
                fontWeight: 600,
                background: "#cda751",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Submit for Review
            </button>
          </div>
        </div>
      </div>

      <MediaPickerModal
        isOpen={mediaModalOpen}
        onClose={() => setMediaModalOpen(false)}
        onSelect={(url) => {
          setBlogData((prev) => ({ ...prev, featured_image: url }));
          setMediaModalOpen(false);
        }}
        allowVideos={false}
        title="Select Pexels Image"
        page_type="blogs"
        category={blogData?.category || "Ayurveda"}
        subcategory="All"
        defaultQuery={() => {
          const cat = (blogData?.category || "").toUpperCase();
          if (cat === "AYURVEDA") return "Ayurveda";
          if (cat === "YOGA") return "Yoga";
          if (cat === "WELLNESS") return "Wellness";
          if (cat === "NUTRITION") return "Healthy Lifestyle";
          return "Wellness";
        }}
        suggestions={["Ayurveda", "Yoga", "Wellness", "Healthy Lifestyle"]}
      />
    </div>
  );
}
