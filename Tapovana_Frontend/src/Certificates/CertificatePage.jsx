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
  const [downloadSuccess, setDownloadSuccess] = useState(false);

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

    setDownloadSuccess(false);

    const opt = {
      margin: 0,
      filename: `Tapovana_Certificate_${certData.participantName.replace(/\s+/g, "_")}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: "mm", format: "a4", orientation: "landscape" }
    };

    html2pdf().set(opt).from(element).save().then(() => {
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 8000);
    }).catch(err => {
      console.error("PDF download failed:", err);
    });
  };

  const handleViewPdf = () => {
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
    const apiBase = getApiBase();
    window.open(`${apiBase}/api/certificates/download/${certificateId || certData.certificateId}?view=true`, "_blank");
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

  const getInstructorNameFontSize = (name) => {
    if (!name) return {};
    if (name.length > 18) return { fontSize: '1.8rem' };
    if (name.length > 12) return { fontSize: '2.4rem' };
    return {};
  };

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
                <div className="footer-value-text cursive-sig" style={getInstructorNameFontSize(certData.instructorName)}>
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
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
            <button className="certificate-download-btn" onClick={handleDownload}>
              download pdf certificate
            </button>
            <button 
              className="certificate-view-btn" 
              onClick={handleViewPdf}
              style={{
                padding: "0.9rem 2.2rem",
                backgroundColor: "transparent",
                color: "#cda751",
                fontSize: "1rem",
                fontWeight: "600",
                border: "2px solid #cda751",
                borderRadius: "6px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                letterSpacing: "0.5px",
                textTransform: "lowercase"
              }}
            >
              view pdf in browser
            </button>
          </div>
          {downloadSuccess && (
            <div className="download-success-message" style={{
              marginTop: "12px",
              padding: "10px 20px",
              backgroundColor: "rgba(34,197,94,0.1)",
              border: "1px solid #22c55e",
              borderRadius: "6px",
              color: "#15803d",
              fontSize: "0.9rem",
              fontWeight: 500,
              textAlign: "center",
              maxWidth: "100%",
              boxSizing: "border-box"
            }}>
              ✓ certificate download initiated. if it didn't start, try the "view pdf in browser" button or open the link directly in chrome/safari.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CertificatePage;
