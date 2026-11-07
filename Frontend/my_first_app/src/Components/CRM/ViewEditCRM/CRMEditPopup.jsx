
import React, { useEffect, useState } from "react";
import "./CRMEditPopup.css";
import { authFetch, API } from "../../../Services/authFetch";

const FIELD_CONFIGS = {
  opportunities: [
    { key: "title", label: "Title", type: "text", required: true },
    { key: "estimated_value", label: "Estimated Value", type: "number" },
    {
      key: "currency",
      label: "Currency",
      type: "text",
      maxLength: 3,
    },
    {
      key: "stage",
      label: "Stage",
      type: "select",
      optionsKey: "stages",
    },
    {
      key: "probability",
      label: "Probability (%)",
      type: "number",
      min: 0,
      max: 100,
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
      optionsKey: "statuses",
    },
    {
      key: "lost_reason",
      label: "Lost Reason",
      type: "textarea",
      lostReason: true,
    },
    {
      key: "customer_id",
      label: "Choose Customer",
      type: "lookup",
      lookup: "customers",
      required: true,
    },
    {
      key: "employee_id",
      label: "Choose Employee",
      type: "lookup",
      lookup: "employees",
    },
    {
      key: "created_at",
      label: "Created At",
      type: "readonly",
    },
  ],

  customers: [
    {
      key: "first_name",
      label: "First Name",
      type: "text",
      required: true,
    },
    {
      key: "last_name",
      label: "Last Name",
      type: "text",
      required: true,
    },
    { key: "phone", label: "Phone", type: "tel" },
    { key: "company_name", label: "Company Name", type: "text" },
    { key: "email", label: "Email", type: "email" },
    { key: "address", label: "Address", type: "textarea" },
    {
      key: "lead_source_id",
      label: "Lead Source",
      type: "lookup",
      lookup: "leadSources",
    },
    { key: "created_at", label: "Created At", type: "readonly" },
  ],

  contacts: [
    { key: "customer_name", label: "Customer Name", type: "readonly" },
    { key: "customer_code", label: "Customer Code", type: "readonly" },
    {
      key: "name",
      label: "Contact Name",
      type: "text",
      required: true,
    },
    { key: "job_title", label: "Job Title", type: "text" },
    { key: "phone", label: "Phone", type: "tel" },
    { key: "email", label: "Email", type: "email" },
    {
      key: "is_primary",
      label: "Is Primary",
      type: "select",
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
      boolean: true,
      optionLabels: ["Active", "Inactive"],
    },
  ],
};

const ENTITY_TITLES = {
  opportunities: "Opportunity",
  customers: "Customer",
  contacts: "Contact",
  campaigns: "Campaign",
};

const getOptionValue = (option, lookupType) => {
  if (!option || typeof option !== "object") {
    return option;
  }

  if (lookupType === "customers") return option.customer_id;
  if (lookupType === "employees") return option.employee_id;
  if (lookupType === "leadSources") return option.source_id;

  return option.id;
};

const getOptionLabel = (option, lookupType) => {
  if (!option || typeof option !== "object") {
    return option;
  }

  if (lookupType === "customers") {
    const name = [
      option.first_name,
      option.last_name,
    ].filter(Boolean).join(" ");

    return `${name || "Customer"} (${option.customer_code || option.customer_id})`;
  }

  if (lookupType === "employees") {
    const name = [
      option.first_name,
      option.last_name,
    ].filter(Boolean).join(" ");

    return name || option.employee_code || `Employee ${option.employee_id}`;
  }

  if (lookupType === "leadSources") {
    return option.name;
  }

  return option.name || option.label || option.id;
};

const CRMEditPopup = ({
  entityType,
  item,
  onClose,
  onSave,
  onDelete,
  customers = [],
  employeesList = [],
  leadSourcesList = [],
}) => {
  const [formData, setFormData] = useState(item);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [opportunityOptions, setOpportunityOptions] = useState({
    stages: [],
    statuses: [],
  });

  const [optionsError, setOptionsError] = useState("");
  const [optionsLoading, setOptionsLoading] = useState(false);

  const fields = FIELD_CONFIGS[entityType] || [];

  // Load opportunity choices from Django.
  useEffect(() => {
    if (entityType !== "opportunities") return;

    let isMounted = true;

    const fetchOpportunityOptions = async () => {
      try {
        setOptionsLoading(true);
        setOptionsError("");

        const response = await authFetch(
          `${API}/crm/opportunity-options/`
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.detail ||
            result.error ||
            "Failed to load opportunity options."
          );
        }

        if (
          !Array.isArray(result.stages) ||
          !Array.isArray(result.statuses)
        ) {
          throw new Error("Invalid opportunity options response.");
        }

        if (isMounted) {
          setOpportunityOptions({
            stages: result.stages,
            statuses: result.statuses,
          });
        }
      } catch (error) {
        if (isMounted) {
          setOptionsError(error.message);
        }
      } finally {
        if (isMounted) {
          setOptionsLoading(false);
        }
      }
    };

    fetchOpportunityOptions();

    return () => {
      isMounted = false;
    };
  }, [entityType]);

  useEffect(() => {
    const initialData = { ...item };

    if (entityType === "opportunities") {
      initialData.customer_id =
        item.customer_id ??
        item.customer_details?.customer_id ??
        "";

      initialData.employee_id =
        item.employee_id ??
        item.employee_details?.employee_id ??
        "";
    }

    if (entityType === "customers") {
      initialData.lead_source_id =
        item.lead_source_id ?? "";
    }

    setFormData(initialData);
    setShowDeleteConfirm(false);
  }, [item, entityType]);

  const getLookupOptions = (lookupType) => {
    if (lookupType === "customers") return customers;
    if (lookupType === "employees") return employeesList;
    if (lookupType === "leadSources") return leadSourcesList;

    return [];
  };

  const getFieldOptions = (field) => {
    if (field.optionsKey) {
      return opportunityOptions[field.optionsKey] || [];
    }

    if (field.boolean) {
      return [
        { value: "true", label: field.optionLabels?.[0] || "Yes" },
        { value: "false", label: field.optionLabels?.[1] || "No" },
      ];
    }

    return [];
  };

  const handleChange = (key, value, field) => {
    let newValue = value;

    if (field.boolean) {
      newValue = value === "true";
    }

    if (field.type === "lookup" && value !== "") {
      newValue = Number(value);
    }

    if (key === "currency") {
      newValue = value.toUpperCase();
    }

    setFormData((previous) => {
      const updated = {
        ...previous,
        [key]: newValue,
      };

      if (entityType === "opportunities" && key === "status") {
        if (value === "won" || value === "lost") {
          const closedStage = opportunityOptions.stages.find(
            (stage) => stage.value === "closed"
          );

          if (closedStage) {
            updated.stage = closedStage.value;
          }
        } else if (value === "open" && updated.stage === "closed") {
          const openStage = opportunityOptions.stages.find(
            (stage) => stage.value !== "closed"
          );

          updated.stage = openStage?.value || "";
        }

        if (value !== "lost") {
          updated.lost_reason = "";
        }
      }

      if (entityType === "opportunities" && key === "stage") {
        if (value === "closed" && updated.status === "open") {
          updated.status = "";
        }
      }

      return updated;
    });
  };

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

    if (
      entityType === "opportunities" &&
      !formData.customer_id
    ) {
      alert("Please select a customer.");
      return;
    }

    const updatedItem = { ...formData };

    if (
      entityType === "opportunities" &&
      updatedItem.employee_id === ""
    ) {
      updatedItem.employee_id = null;
    }

    if (entityType === "campaigns") {
      updatedItem.is_active = Boolean(updatedItem.is_active);
    }

    if (entityType === "customers") {
      updatedItem.lead_source_id =
        updatedItem.lead_source_id || null;
    }

    if (entityType === "contacts") {
      updatedItem.is_primary = Boolean(updatedItem.is_primary);
    }

    if (entityType === "opportunities") {
      updatedItem.customer_id = Number(updatedItem.customer_id);

      if (updatedItem.employee_id !== null) {
        updatedItem.employee_id = Number(updatedItem.employee_id);
      }

      if (updatedItem.probability === "") {
        updatedItem.probability = null;
      } else if (updatedItem.probability !== null) {
        updatedItem.probability = Number(updatedItem.probability);
      }

      updatedItem.estimated_value =
        updatedItem.estimated_value === ""
          ? 0
          : Number(updatedItem.estimated_value);
    }

    onSave(updatedItem);
  };

  const renderField = (field) => {
    const value = formData[field.key] ?? "";

    const isLostReason = field.lostReason;
    const isDisabled =
      isLostReason && formData.status !== "lost";

    const isOptionsField = Boolean(field.optionsKey);

    return (
      <div
        className={`crm-popup-field ${
          field.type === "textarea"
            ? "crm-popup-field-full"
            : ""
        }`}
        key={field.key}
      >
        <label>
          {field.label}

          {field.required && (
            <span className="crm-required">*</span>
          )}

          {field.type === "readonly" && (
            <span className="crm-readonly-label">
              Read only
            </span>
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
        ) : field.type === "lookup" ? (
          <select
            value={value === null ? "" : String(value)}
            required={field.required}
            onChange={(e) =>
              handleChange(field.key, e.target.value, field)
            }
          >
            <option value="">
              Select {field.label}
            </option>

            {getLookupOptions(field.lookup).map((option) => {
              const optionValue = getOptionValue(
                option,
                field.lookup
              );

              return (
                <option
                  key={optionValue}
                  value={optionValue}
                >
                  {getOptionLabel(option, field.lookup)}
                </option>
              );
            })}
          </select>
        ) : field.type === "select" ? (
          <select
            value={field.boolean ? String(value) : value}
            required={field.required}
            disabled={isOptionsField && optionsLoading}
            onChange={(e) =>
              handleChange(field.key, e.target.value, field)
            }
          >
            <option value="">
              Select {field.label}
            </option>

            {getFieldOptions(field).map((option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={field.type}
            value={value}
            required={field.required}
            min={field.min}
            max={field.max}
            maxLength={field.maxLength}
            onChange={(e) =>
              handleChange(field.key, e.target.value, field)
            }
          />
        )}
      </div>
    );
  };

  return (
    <div
      className="crm-popup-overlay"
      onMouseDown={onClose}
    >
      <div
        className="crm-edit-popup"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="crm-popup-header">
          <div>
            <h2>
              Edit {ENTITY_TITLES[entityType] || "Record"}
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
          {optionsError && (
            <div className="crm-error-message">
              {optionsError}
            </div>
          )}

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
              disabled={optionsLoading || Boolean(optionsError)}
            >
              Save Changes
            </button>
          </div>

          {showDeleteConfirm && (
            <div className="crm-confirm-backdrop">
              <div className="crm-confirm-dialog">
                <div className="crm-confirm-icon">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
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
