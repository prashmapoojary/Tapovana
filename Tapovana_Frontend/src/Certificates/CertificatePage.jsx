import React, { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import "./CertificatePage.css";
import certificateTemplate from "../assets/certificate_template.png";
import tapovanaLogo from "../assets/Tapovana.png";
import html2pdf from "html2pdf.js";

const CertificatePage = () => {
  const { certificateId } = useParams();
  const [searchParams] = useSearchParams();
  const certificateRef = useRef();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [certData, setCertData] = useState({
    participantName: "",
    workshopTitle: "",
    completionDate: "",
    instructorName: "",
    certificateId: ""
  });
  const [toast, setToast] = useState({ show: false, message: "", linkUrl: "" });
  const [loadingDownload, setLoadingDownload] = useState(false);
  const toastTimeoutRef = useRef(null);

  const getSignatureFontSize = (name) => {
    const len = (name || "").length;
    if (len <= 10) return "2.6rem";
    if (len <= 18) return "2rem";
    if (len <= 26) return "1.5rem";
    return "1.2rem";
  };

  useEffect(() => {
    const getApiBase = () => {
      const hostname = window.location.hostname;
      if (
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        /^192\.168\./.test(hostname) ||
        /^10\./.test(hostname)
      ) {
        return `http://${hostname}:5000`;
      }
      return import.meta.env.VITE_API_BASE_URL || "https://tapovana.onrender.com";
    };

    if (certificateId) {
      const fetchCertificate = async () => {
        setLoading(true);
        setError(null);
        try {
          const apiBase = getApiBase();
          const response = await fetch(`${apiBase}/api/certificates/public/${certificateId}`);

          if (!response.ok) {
            throw new Error("Certificate not found or invalid ID.");
          }

          const result = await response.json();
          if (result.success && result.certificate) {
            const cert = result.certificate;
            let formattedDate = cert.completion_date;
            try {
              const d = new Date(cert.completion_date);
              formattedDate = d.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric"
              });
            } catch (e) {
              console.warn("Date formatting error:", e);
            }

            setCertData({
              participantName: cert.participant_name,
              workshopTitle: cert.workshop_name,
              completionDate: formattedDate,
              instructorName: cert.instructor_name || "Workshop Instructor",
              certificateId: cert.certificate_id
            });
            return;
          } else {
            throw new Error("Failed to load certificate data.");
          }
        } catch (err) {
          console.error("Error fetching certificate details:", err);

          const name = searchParams.get("name");
          const workshop = searchParams.get("workshop");
          if (name || workshop) {
            setCertData({
              participantName: name || "Jane Doe",
              workshopTitle: workshop || "Vedic Wellness & Meditation Masterclass",
              completionDate:
                searchParams.get("date") ||
                new Date().toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric"
                }),
              instructorName: searchParams.get("instructor") || "Acharya Tapovan",
              certificateId: certificateId
            });
          } else {
            setError(
              err.message ||
              "Failed to retrieve certificate validation details. Check your network connection."
            );
          }
        } finally {
          setLoading(false);
        }
      };

      fetchCertificate();
    } else {
      const name = searchParams.get("name") || "Jane Doe";
      const workshop = searchParams.get("workshop") || "Vedic Wellness & Meditation Masterclass";
      const date =
        searchParams.get("date") ||
        new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric"
        });
      const instructor = searchParams.get("instructor") || "Acharya Tapovan";
      const certId = searchParams.get("certId") || "CERT-2026-TEST";

      setCertData({
        participantName: name,
        workshopTitle: workshop,
        completionDate: date,
        instructorName: instructor,
        certificateId: certId
      });
    }
  }, [certificateId, searchParams]);

  const handleDownload = () => {
    const element = certificateRef.current;
    if (!element) return;

    setLoadingDownload(true);
    setToast({ show: false, message: "", linkUrl: "" });

    const opt = {
      margin: 0,
      filename: `Tapovana_Certificate_${certData.participantName.replace(/\s+/g, "_")}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: "mm", format: "a4", orientation: "landscape" }
    };

    const worker = html2pdf().set(opt).from(element);
    worker.save().then(() => {
      return worker.output('blob');
    }).then((blob) => {
      const blobUrl = URL.createObjectURL(blob);
      setToast({
        show: true,
        message: "✅ Certificate downloaded successfully!",
        linkUrl: blobUrl
      });
      setLoadingDownload(false);

      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = setTimeout(() => {
        setToast(prev => ({ ...prev, show: false }));
      }, 6000);
    }).catch(err => {
      console.error("PDF generation/download error:", err);
      setLoadingDownload(false);
      setToast({
        show: true,
        message: "❌ Download failed. Please try opening in Chrome or Safari.",
        linkUrl: ""
      });
    });
  };

  if (loading) {
    return (
      <div className="certificate-page-loading">
        <div className="spinner"></div>
        <p>Verifying and loading Tapovana certificate...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="certificate-page-error">
        <h2>Certificate Verification Failed</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()} className="retry-btn">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="certificate-page-container">
      <div className="certificate-viewer">
        <div className="certificate-frame" ref={certificateRef}>
          <img
            src={certificateTemplate}
            alt="Certificate Background Template"
            className="certificate-bg-image"
          />

          <div className="certificate-overlay-content">
            <p className="cert-intro">This is to certify that</p>

            <div className="cert-recipient">
              <h2 className="cert-recipient-name">{certData.participantName}</h2>
              <div className="cert-recipient-line"></div>
            </div>

            {/* Unique Verification ID directly under name line */}
            {certData.certificateId && (
              <div className="cert-id-below-name">
                verification id: {certData.certificateId.toLowerCase()}
              </div>
            )}

            <p className="cert-achievement">has successfully completed</p>
            <h3 className="cert-course-name">{certData.workshopTitle}</h3>

            {/* Bottom Row containing Date, Seal/Branding, and Signature */}
            <div className="cert-footer-row">
              {/* Left: Completion Date */}
              <div className="cert-footer-col col-left">
                <div className="footer-value-text">{certData.completionDate}</div>
                <div className="footer-value-divider"></div>
                <div className="footer-label-text">Date of Completion</div>
              </div>

              {/* Center: Tapovana Logo & Branding */}
              <div className="cert-footer-col col-center">
                <div className="seal-badge-container">
                  <img src={tapovanaLogo} alt="Tapovana Logo" className="seal-logo-img" />
                </div>
                <div className="footer-company-name">TAPOVANA</div>
                <div className="footer-company-tagline">nurturing wisdom through tradition</div>
              </div>

              {/* Right: Signature and Conductor Name */}
              <div className="cert-footer-col col-right">
                <div 
                  className="footer-value-text cursive-sig"
                  style={{ fontSize: getSignatureFontSize(certData.instructorName) }}
                >
                  {certData.instructorName}
                </div>
                <div className="footer-value-divider"></div>
                <div className="footer-label-text">Workshop Instructor</div>
              </div>
            </div>
          </div>
        </div>

        <div className="certificate-actions">
          <p className="validation-note">
            ✓ official tapovana verified certificate. secure and authentic.
          </p>
          <button 
            className="certificate-download-btn" 
            onClick={handleDownload} 
            disabled={loadingDownload}
            style={{ opacity: loadingDownload ? 0.7 : 1 }}
          >
            {loadingDownload ? "generating PDF..." : "download pdf certificate"}
          </button>
        </div>

        {/* Slide-up Toast Notification */}
        <div className={`toast-notification ${toast.show ? "show" : ""}`}>
          <div className="toast-content">
            <span className="toast-text">{toast.message}</span>
            {toast.linkUrl && (
              <a 
                href={toast.linkUrl} 
                target="_blank" 
                rel="noreferrer" 
                className="toast-open-link"
              >
                click here to open
              </a>
            )}
          </div>
          <button 
            className="toast-close-btn" 
            onClick={() => setToast(prev => ({ ...prev, show: false }))}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};

export default CertificatePage;
