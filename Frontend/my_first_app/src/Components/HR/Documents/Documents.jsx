
import React, { useRef, useState } from "react";
import "./Documents.css";

const INITIAL_DOCUMENTS = [
  {
    id: 1,
    name: "National ID",
    type: "Identification",
    expiryDate: "2028-05-20",
    uploaded: "May 8, 2025",
    file: null,
  },
  {
    id: 2,
    name: "Permanent employment contract",
    type: "Contract",
    expiryDate: "",
    uploaded: "Aug 12, 2024",
    file: null,
  },
  {
    id: 3,
    name: "Performance Review 2024",
    type: "Performance",
    expiryDate: "",
    uploaded: "May 28, 2025",
    file: null,
  },
  {
    id: 4,
    name: "Design Leadership Certificate",
    type: "Certificate",
    expiryDate: "2027-09-10",
    uploaded: "Jan 14, 2025",
    file: null,
  },
];

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function Documents() {
  const [documents, setDocuments] = useState(INITIAL_DOCUMENTS);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [documentType, setDocumentType] = useState("");
  const [documentName, setDocumentName] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [errors, setErrors] = useState({});

  const fileRef = useRef(null);

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

  const handleSave = (event) => {
    event.preventDefault();

    const newErrors = {};

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

    const newDocument = {
      id: Date.now(),
      name: documentName.trim(),
      type: documentType,
      expiryDate,
      uploaded: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      file: selectedFile,
    };

    setDocuments((prev) => [...prev, newDocument]);
    closeUpload();
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
    if (!document.file) return;

    const url = URL.createObjectURL(document.file);
    const link = window.document.createElement("a");

    link.href = url;
    link.download = document.file.name;

    window.document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
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
            {documents.length > 0 ? (
              documents.map((document) => (
                <tr key={document.id}>
                  <td>
                    <div className="hr-document-name">

                      <span>{document.name}</span>
                    </div>
                  </td>

                  <td>
                    <span className="hr-document-type">
                      {document.type || "—"}
                    </span>
                  </td>

                  <td>{formatDate(document.expiryDate)}</td>

                  <td>{document.uploaded}</td>

                  <td className="hr-download-cell">
                    <button
                      type="button"
                      className="hr-download-btn"
                      onClick={() => handleDownload(document)}
                      disabled={!document.file}
                      aria-label={`Download ${document.name}`}
                      title={
                        document.file
                          ? "Download document"
                          : "No attached file"
                      }
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 3v12" />
                        <path d="m7 10 5 5 5-5" />
                        <path d="M5 20h14" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))
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
              <label className="hr-upload-field">
                <span>
                  Document type
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
                >
                  <option value="">Select document type</option>
                </select>
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
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="hr-upload-submit"
                >
                  Upload &amp; save
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
