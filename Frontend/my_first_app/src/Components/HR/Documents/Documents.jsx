import React, { useEffect, useRef, useState } from "react";
import "./Documents.css";
import { apiRequest } from "../../../Services/api";

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

// أنواع المستندات المتوافقة تماماً مع الـ Choices في الباك إند (Django)
const DOCUMENT_TYPE_CHOICES = [
  { value: "national_id", label: "National ID" },
  { value: "passport", label: "Passport" },
  { value: "contract", label: "Contract" },
  { value: "cv", label: "CV" },
  { value: "certificate", label: "Certificate" },
  { value: "other", label: "Other" },
];

export default function Documents() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [currentEmployeeId, setCurrentEmployeeId] = useState(null);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [documentType, setDocumentType] = useState("");
  const [documentName, setDocumentName] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [errors, setErrors] = useState({});

  const fileRef = useRef(null);

  // جلب المستندات والمستخدم الحالي من الباك إند عند فتح الصفحة
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setFetchError("");

      const [docsData, userData] = await Promise.allSettled([
        apiRequest("/hr/documents/"),
        apiRequest("/auth/me/"),
      ]);

      if (docsData.status === "fulfilled") {
        const data = docsData.value;
        const list = Array.isArray(data) ? data : data.results || data.documents || [];
        setDocuments(list);
      } else {
        setFetchError("Failed to load documents from server.");
      }

      if (userData.status === "fulfilled" && userData.value) {
        const res = userData.value;
        const u = res.user || res.employee || res;
        const empId = u.id || u.employee_id || 33;
        setCurrentEmployeeId(empId);
      }
    } catch (err) {
      console.error("Failed to fetch documents:", err);
      setFetchError("Failed to load documents from server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const resetForm = () => {
    setDocumentType("");
    setDocumentName("");
    setExpiryDate("");
    setSelectedFile(null);
    setErrors({});

    if (fileRef.current) {
      fileRef.current.value = "";
    }
  };

  const closeUpload = () => {
    setUploadOpen(false);
    resetForm();
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setSelectedFile(null);
      setErrors((prev) => ({
        ...prev,
        file: "Only PDF, JPG, and PNG files are allowed.",
      }));
      event.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setSelectedFile(null);
      setErrors((prev) => ({
        ...prev,
        file: "File size must not exceed 10 MB.",
      }));
      event.target.value = "";
      return;
    }

    setSelectedFile(file);
    setErrors((prev) => ({
      ...prev,
      file: "",
    }));
  };

  // إرسال المستند للباك إند (POST FormData)
  const handleSave = async (event) => {
    event.preventDefault();

    const newErrors = {};

    if (!documentType) {
      newErrors.documentType = "Please select document type.";
    }

    if (!documentName.trim()) {
      newErrors.documentName = "Please enter document name.";
    }

    if (
      expiryDate &&
      new Date(`${expiryDate}T00:00:00`) <
        new Date(new Date().toDateString())
    ) {
      newErrors.expiryDate = "Expiry date cannot be in the past.";
    }

    if (!selectedFile) {
      newErrors.file = "Please choose a document file.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) return;

    try {
      setIsSubmitting(true);

      // التأكد من وجود employee_id (حسابك الحالي ID = 33)
      let empId = currentEmployeeId;
      if (!empId) {
        try {
          const userRes = await apiRequest("/auth/me/");
          const u = userRes.user || userRes.employee || userRes;
          empId = u.id || u.employee_id || 33;
          setCurrentEmployeeId(empId);
        } catch {
          empId = 33; // Fallback للحساب الحالي المسجل
        }
      }

      const formData = new FormData();
      formData.append("employee_id", empId);
      formData.append("document_type", documentType);
      formData.append("document_name", documentName.trim());
      
      // فقط إذا أدخل المستخدم تاريخ انتهاء نرسله، لو فارغ لا نرسله عشان ميضربش 400
      if (expiryDate && expiryDate.trim()) {
        formData.append("expiry_date", expiryDate.trim());
      }
      formData.append("file", selectedFile);

      const token = localStorage.getItem("access_token");
      const response = await fetch("http://localhost:8000/api/hr/documents/", {
        method: "POST",
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.error("Backend Error Details:", responseData);
        const errorMsg =
          responseData.employee_id?.[0] ||
          responseData.file?.[0] ||
          responseData.document_type?.[0] ||
          responseData.expiry_date?.[0] ||
          responseData.error ||
          responseData.detail ||
          responseData.message ||
          "Failed to upload document.";
        throw new Error(errorMsg);
      }

      // بعد النجاح: قفل المودال وإعادة تحميل البيانات من السيرفر
      closeUpload();
      await fetchDocuments();
    } catch (err) {
      console.error("Upload error:", err);
      setErrors((prev) => ({
        ...prev,
        submit: err.message,
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return "—";

    return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleDownload = (document) => {
    const docId = document.document_id || document.id;
    const token = localStorage.getItem("access_token");

    const downloadUrl = `http://localhost:8000/api/hr/documents/download/?document_id=${docId}&token=${encodeURIComponent(token)}`;

    const link = window.document.createElement("a");
    link.href = downloadUrl;
    link.setAttribute("download", document.document_name || "document");
    window.document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <section className="hr-documents">
      <div className="hr-documents-header">
        <div className="hr-documents-heading">
          <span className="hr-section-eyebrow">
            EMPLOYEE FILES
          </span>

          <h2>Documents</h2>

          <p>
            Manage contracts, identification, and certifications.
          </p>
        </div>

        <button
          type="button"
          className="hr-upload-btn"
          onClick={() => setUploadOpen(true)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 16V4" />
            <path d="m7 9 5-5 5 5" />
            <path d="M5 15v4h14v-4" />
          </svg>

          Upload document
        </button>
      </div>

      <div className="hr-documents-table-wrap">
        <table className="hr-documents-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Expiry Date</th>
              <th>Uploaded</th>
              <th aria-label="Download"></th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="hr-no-documents">
                  Loading documents from server...
                </td>
              </tr>
            ) : fetchError ? (
              <tr>
                <td colSpan="5" className="hr-no-documents" style={{ color: "red" }}>
                  {fetchError}
                </td>
              </tr>
            ) : documents.length > 0 ? (
              documents.map((document) => {
                const docId = document.document_id || document.id;
                const name = document.document_name || document.name;
                const type = document.document_type || document.type;
                const expiry = document.expiry_date || document.expiryDate;
                const uploaded = document.uploaded_at
                  ? new Date(document.uploaded_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : document.uploaded || "—";

                return (
                  <tr key={docId}>
                    <td>
                      <div className="hr-document-name">
                        <span>{name}</span>
                      </div>
                    </td>

                    <td>
                      <span className="hr-document-type">
                        {type || "—"}
                      </span>
                    </td>

                    <td>{formatDate(expiry)}</td>

                    <td>{uploaded}</td>

                    <td className="hr-download-cell">
                      <button
                        type="button"
                        className="hr-download-btn"
                        onClick={() => handleDownload(document)}
                        aria-label={`Download ${name}`}
                        title="Download document"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M12 3v12" />
                          <path d="m7 10 5 5 5-5" />
                          <path d="M5 20h14" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="5" className="hr-no-documents">
                  No documents uploaded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {uploadOpen && (
        <div
          className="hr-upload-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeUpload();
            }
          }}
        >
          <section
            className="hr-upload-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="hr-upload-title"
          >
            <div className="hr-upload-modal-header">
              <div>
                <span className="hr-section-eyebrow">
                  EMPLOYEE DOCUMENTS
                </span>

                <h2 id="hr-upload-title">
                  Upload document
                </h2>
              </div>

              <button
                type="button"
                className="hr-upload-close"
                onClick={closeUpload}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSave} noValidate>
              {errors.submit && (
                <div style={{ color: "red", marginBottom: "1rem", fontSize: "0.875rem" }}>
                  {errors.submit}
                </div>
              )}

              <label className="hr-upload-field">
                <span>
                  Document type <b>*</b>
                </span>

                <select
                  value={documentType}
                  onChange={(event) => {
                    setDocumentType(event.target.value);
                    setErrors((prev) => ({
                      ...prev,
                      documentType: "",
                    }));
                  }}
                  className={errors.documentType ? "has-error" : ""}
                >
                  <option value="">Select document type</option>
                  {DOCUMENT_TYPE_CHOICES.map((choice) => (
                    <option key={choice.value} value={choice.value}>
                      {choice.label}
                    </option>
                  ))}
                </select>

                {errors.documentType && (
                  <small>{errors.documentType}</small>
                )}
              </label>

              <label className="hr-upload-field">
                <span>
                  Document name <b>*</b>
                </span>

                <input
                  type="text"
                  value={documentName}
                  onChange={(event) => {
                    setDocumentName(event.target.value);
                    setErrors((prev) => ({
                      ...prev,
                      documentName: "",
                    }));
                  }}
                  placeholder="e.g. National ID - front & back"
                  className={errors.documentName ? "has-error" : ""}
                />

                {errors.documentName && (
                  <small>{errors.documentName}</small>
                )}
              </label>

              <label className="hr-upload-field">
                <span>Expiry date</span>

                <input
                  type="date"
                  value={expiryDate}
                  onChange={(event) => {
                    setExpiryDate(event.target.value);
                    setErrors((prev) => ({
                      ...prev,
                      expiryDate: "",
                    }));
                  }}
                  className={errors.expiryDate ? "has-error" : ""}
                />

                {errors.expiryDate && (
                  <small>{errors.expiryDate}</small>
                )}
              </label>

              <div className="hr-file-upload">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  id="hr-document-file"
                  hidden
                />

                <label
                  htmlFor="hr-document-file"
                  className="hr-file-upload-label"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 16V4" />
                    <path d="m7 9 5-5 5 5" />
                    <path d="M5 15v4h14v-4" />
                  </svg>

                  <strong>
                    {selectedFile ? selectedFile.name : "Choose a file"}
                  </strong>

                  <span>
                    or drag and drop PDF, JPG or PNG · max 10 MB
                  </span>
                </label>

                {errors.file && (
                  <small className="hr-file-error">
                    {errors.file}
                  </small>
                )}
              </div>

              <div className="hr-upload-actions">
                <button
                  type="button"
                  className="hr-upload-cancel"
                  onClick={closeUpload}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="hr-upload-submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Uploading..." : "Upload & save"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}