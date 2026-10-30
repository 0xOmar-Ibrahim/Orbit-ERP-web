import React, { useState } from "react";
import "./CRMForms.css";

const INITIAL_FORM = {
  name: "",
  description: "",
  isActive: "",
};

export default function NewLeadSource({ onClose, onSave }) {
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [errors, setErrors] = useState({});

  const updateField = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [name]: "",
    }));
  };

  const handleReset = () => {
    setForm({ ...INITIAL_FORM });
    setErrors({});
  };

  const validateForm = () => {
    const newErrors = {};

    // Name validation
    if (!form.name.trim()) {
      newErrors.name = "Please enter lead source name.";
    } else if (!/^[\p{L}\s]+$/u.test(form.name.trim())) {
      newErrors.name = "Name must contain letters only.";
    }

    // Description validation
    if (!form.description.trim()) {
      newErrors.description = "Please enter description.";
    } else if (!/^[\p{L}\s]+$/u.test(form.description.trim())) {
      newErrors.description =
        "Description must contain letters only.";
    }

    // Is Active validation
    if (form.isActive === "") {
      newErrors.isActive = "Please select Yes or No.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!validateForm()) return;

    onSave({
      id: Date.now(),
      name: form.name.trim(),
      description: form.description.trim(),
      isActive: form.isActive === "true",
    });
  };

  return (
    <div
      className="crm-form-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="crm-form-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-source-title"
      >
        <header className="crm-form-header">
          <div>
            <h2 id="lead-source-title">New Lead Source</h2>
            <p>Create a new lead source.</p>
          </div>

          <button
            type="button"
            className="crm-form-close"
            onClick={onClose}
            aria-label="Close form"
          >
            ×
          </button>
        </header>

        <form
          onSubmit={handleSubmit}
          onReset={handleReset}
          noValidate
        >
          <div className="crm-form-grid">
            {/* Name */}
            <label className="crm-field crm-field-full">
              <span className="crm-field-label">
                Name <span className="required-mark">*</span>
              </span>

              <input
                type="text"
                name="name"
                value={form.name}
                onChange={updateField}
                placeholder="Enter lead source name"
                aria-invalid={!!errors.name}
                className={errors.name ? "crm-input-error" : ""}
              />

              {errors.name && (
                <span className="crm-error-message">
                  {errors.name}
                </span>
              )}
            </label>

            {/* Description */}
            <label className="crm-field crm-field-full">
              <span className="crm-field-label">
                Description <span className="required-mark">*</span>
              </span>

              <textarea
                name="description"
                value={form.description}
                onChange={updateField}
                placeholder="Enter description"
                rows={3}
                aria-invalid={!!errors.description}
                className={
                  errors.description ? "crm-input-error" : ""
                }
              />

              {errors.description && (
                <span className="crm-error-message">
                  {errors.description}
                </span>
              )}
            </label>

            {/* Is Active */}
            <fieldset className="crm-field crm-primary-field crm-field-full">
              <legend className="crm-field-label">
                Is Active? <span className="required-mark">*</span>
              </legend>

              <div className="crm-primary-options">
                <label
                  className={`crm-primary-option ${
                    form.isActive === "true"
                      ? "selected yes"
                      : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="isActive"
                    value="true"
                    checked={form.isActive === "true"}
                    onChange={updateField}
                  />

                  <span className="crm-primary-dot" />
                  <span>Yes</span>
                </label>

                <label
                  className={`crm-primary-option ${
                    form.isActive === "false"
                      ? "selected no"
                      : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="isActive"
                    value="false"
                    checked={form.isActive === "false"}
                    onChange={updateField}
                  />

                  <span className="crm-primary-dot" />
                  <span>No</span>
                </label>
              </div>

              {errors.isActive && (
                <span className="crm-error-message">
                  {errors.isActive}
                </span>
              )}
            </fieldset>
          </div>

          <footer className="crm-form-actions">
            <button type="submit" className="crm-form-save">
              Save Lead Source
            </button>

            <button type="reset" className="crm-form-reset">
              Reset
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}