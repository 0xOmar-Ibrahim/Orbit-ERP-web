
import React, { useEffect, useState } from "react";
import { employees, leadSources } from "./crmMockData";
import "./CRMEditPopup.css";

const FIELD_CONFIGS = {
  opportunities: [
    { key: "title", label: "Title", type: "text", required: true },
    { key: "estimated_value", label: "Estimated Value", type: "number" },
    {
      key: "currency",
      label: "Currency",
      type: "select",
      options: ["EGP", "USD"],
    },
    {
      key: "stage",
      label: "Stage",
      type: "select",
      options: ["Lead", "Qualified", "Proposal", "Negotiation", "Closed"],
    },
    {
      key: "probability",
      label: "Probability",
      type: "select",
      options: ["10", "30", "50", "75", "100"],
    },
    {
      key: "expected_close_date",
      label: "Expected Close Date",
      type: "date",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: ["open", "won", "lost"],
    },
    {
      key: "lost_reason",
      label: "Lost Reason",
      type: "textarea",
      lostReason: true,
    },
    {
      key: "closed",
      label: "Closed",
      type: "select",
      options: ["true", "false"],
      boolean: true,
    },
    {
      key: "employee",
      label: "Choose Employee",
      type: "select",
      options: employees,
    },
    {
      key: "created_at",
      label: "Created At",
      type: "readonly",
    },
  ],

  customers: [
    { key: "first_name", label: "First Name", type: "text", required: true },
    { key: "last_name", label: "Last Name", type: "text", required: true },
    { key: "phone", label: "Phone", type: "tel" },
    { key: "company_name", label: "Company Name", type: "text" },
    { key: "email", label: "Email", type: "email" },
    { key: "address", label: "Address", type: "textarea" },
    {
      key: "lead_source_name",
      label: "Lead Source Name",
      type: "select",
      options: leadSources,
    },
    { key: "created_at", label: "Created At", type: "readonly" },
    { key: "last_modified", label: "Last Modified", type: "readonly" },
  ],

  contacts: [
    { key: "customer_name", label: "Customer Name", type: "readonly" },
    { key: "customer_code", label: "Customer Code", type: "readonly" },
    { key: "name", label: "Contact Name", type: "text", required: true },
    { key: "job_title", label: "Job Title", type: "text" },
    { key: "phone", label: "Phone", type: "tel" },
    { key: "email", label: "Email", type: "email" },
    {
      key: "is_primary",
      label: "Is Primary",
      type: "select",
      options: ["true", "false"],
      boolean: true,
    },
  ],

  campaigns: [
    { key: "name", label: "Name", type: "text", required: true },
    { key: "description", label: "Description", type: "textarea" },
    {
      key: "is_active",
      label: "Status",
      type: "select",
      options: ["true", "false"],
      optionLabels: ["Active", "Inactive"],
      boolean: true,
    },
  ],
};

const CRMEditPopup = ({ entityType, item, onClose, onSave, onDelete }) => {
      const [formData, setFormData] = useState(item);

  const fields = FIELD_CONFIGS[entityType] || [];

  useEffect(() => {
    setFormData(item);
  }, [item]);

  const handleChange = (key, value, field) => {
    let newValue = value;

    if (field.boolean) {
      newValue = value === "true";
    }

    setFormData((previous) => {
      const updated = { ...previous, [key]: newValue };

      // Keep the closed field synchronized with the opportunity status.
      if (entityType === "opportunities" && key === "status") {
        updated.closed = value === "won" || value === "lost";

        if (value !== "lost") {
          updated.lost_reason = "";
        }
      }

      return updated;
    });
  };

 const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

const handleDelete = () => {
  setShowDeleteConfirm(true);
};

const confirmDelete = () => {
  onDelete(item);
  setShowDeleteConfirm(false);
};

const cancelDelete = () => {
  setShowDeleteConfirm(false);
};

  const handleSubmit = (event) => {
    event.preventDefault();

    if (
      entityType === "opportunities" &&
      formData.status === "lost" &&
      !formData.lost_reason?.trim()
    ) {
      alert("Please enter the lost reason.");
      return;
    }

    const updatedItem = { ...formData };

    if (entityType === "opportunities") {
      updatedItem.employee_name = updatedItem.employee;
    }

    if (entityType === "customers") {
      updatedItem.last_modified = new Date()
        .toISOString()
        .slice(0, 16)
        .replace("T", " ");
    }

    onSave(updatedItem);
  };

  const renderField = (field) => {
    const value = formData[field.key] ?? "";

    const isLostReason = field.lostReason;
    const isDisabled =
      isLostReason && formData.status !== "lost";

    return (
      <div
  className={`crm-popup-field ${
    field.type === "textarea" ? "crm-popup-field-full" : ""
  }`}
  key={field.key}
>
        <label>
          {field.label}
          {field.required && <span className="crm-required">*</span>}
          {field.type === "readonly" && (
            <span className="crm-readonly-label">Read only</span>
          )}
        </label>

        {field.type === "readonly" ? (
          <input
            type="text"
            value={value}
            readOnly
            className="crm-readonly-input"
          />
        ) : field.type === "textarea" ? (
          <textarea
            value={value}
            disabled={isDisabled}
            required={isLostReason && !isDisabled}
            onChange={(e) =>
              handleChange(field.key, e.target.value, field)
            }
            rows={3}
          />
        ) : field.type === "select" ? (
          <select
            value={field.boolean ? String(value) : value}
            onChange={(e) =>
              handleChange(field.key, e.target.value, field)
            }
          >
            <option value="">Select {field.label}</option>
            {field.options.map((option, index) => (
              <option key={option} value={option}>
                {field.optionLabels?.[index] || option}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={field.type}
            value={value}
            required={field.required}
            onChange={(e) =>
              handleChange(field.key, e.target.value, field)
            }
          />
        )}
      </div>
    );
  };

  return (
    <div className="crm-popup-overlay" onMouseDown={onClose}>
      <div
        className="crm-edit-popup"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="crm-popup-header">
          <div>
            <h2>Edit {entityType === "opportunities"
              ? "Opportunity"
              : entityType === "customers"
              ? "Customer"
              : entityType === "contacts"
              ? "Contact"
              : "Campaign"}
            </h2>
            <p>Update the record information</p>
          </div>

          <button
            type="button"
            className="crm-popup-close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="crm-popup-fields">
            {fields.map(renderField)}
          </div>


          <div className="crm-popup-actions">
  <button
    type="button"
    className="crm-popup-delete"
    onClick={handleDelete}
  >
    Delete
  </button>

  <button
    type="submit"
    className="crm-popup-save"
  >
    Save Changes
  </button>
</div>

{showDeleteConfirm && (
  <div className="crm-confirm-backdrop">
    <div className="crm-confirm-dialog">
      <div className="crm-confirm-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14M10 11v5M14 11v5"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <h2>Delete Record?</h2>

      <p>
        Are you sure you want to delete this record?
        <br />
        This action cannot be undone.
      </p>

      <div className="crm-confirm-actions">
        <button
          type="button"
          className="crm-confirm-cancel"
          onClick={cancelDelete}
        >
          Cancel
        </button>

        <button
          type="button"
          className="crm-confirm-delete"
          onClick={confirmDelete}
        >
          Delete
        </button>
      </div>
    </div>
  </div>
)}

        </form>
      </div>
    </div>
  );
};

export default CRMEditPopup;
