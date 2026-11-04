
import React, { useState } from "react";
import "./CRMForms.css";

const INITIAL_FORM = {
  firstName: "",
  lastName: "",
  phone: "",
  companyName: "",
  email: "",
  address: "",
  leadSourceId: "",
};

export default function NewCustomer({
  onClose,
  onSave,
  leadSources = [],
}) {
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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

    setSubmitError("");
  };

  const handleReset = () => {
    if (isSaving) return;

    setForm({ ...INITIAL_FORM });
    setErrors({});
    setSubmitError("");
  };

  const validateForm = () => {
    const newErrors = {};

    // First Name
    if (!form.firstName.trim()) {
      newErrors.firstName = "Please enter first name.";
    } else if (!/^[\p{L}\s]+$/u.test(form.firstName.trim())) {
      newErrors.firstName = "First name must contain letters only.";
    } else if (form.firstName.trim().length < 2) {
      newErrors.firstName =
        "First name must be at least 2 characters.";
    }

    // Last Name
    if (!form.lastName.trim()) {
      newErrors.lastName = "Please enter last name.";
    } else if (!/^[\p{L}\s]+$/u.test(form.lastName.trim())) {
      newErrors.lastName = "Last name must contain letters only.";
    } else if (form.lastName.trim().length < 2) {
      newErrors.lastName =
        "Last name must be at least 2 characters.";
    }

    // Phone
    if (!form.phone.trim()) {
      newErrors.phone = "Please enter phone number.";
    } else if (!/^01[0125]\d{8}$/.test(form.phone.trim())) {
      newErrors.phone =
        "Phone number must be exactly 11 digits and start with 01.";
    }

    // Company Name
    if (!form.companyName.trim()) {
      newErrors.companyName = "Please enter company name.";
    } else if (form.companyName.trim().length < 2) {
      newErrors.companyName =
        "Company name must be at least 2 characters.";
    }

    // Email
    if (!form.email.trim()) {
      newErrors.email = "Please enter email address.";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
    ) {
      newErrors.email = "Please enter a valid email address.";
    }

    // Lead Source
    if (!form.leadSourceId) {
      newErrors.leadSourceId = "Please select a lead source.";
    }

    // Address is optional
    if (form.address.length > 200) {
      newErrors.address = "Address cannot exceed 200 characters.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isSaving || !validateForm()) return;

    setIsSaving(true);
    setSubmitError("");

    try {
      await onSave({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        companyName: form.companyName.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        leadSourceId: Number(form.leadSourceId),
      });

      // The parent component closes the modal after successful creation.
    } catch (error) {
      setSubmitError(
        error.message || "Unable to create customer. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="crm-form-overlay"
      onMouseDown={(event) => {
        if (
          !isSaving &&
          event.target === event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <section
        className="crm-form-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-title"
      >
        <header className="crm-form-header">
          <div>
            <h2 id="customer-title">New Customer</h2>
            <p>Add a new customer to your system.</p>
          </div>

          <button
            type="button"
            className="crm-form-close"
            onClick={onClose}
            aria-label="Close form"
            disabled={isSaving}
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
            {/* First Name */}
            <label className="crm-field">
              <span className="crm-field-label">
                First Name <span className="required-mark">*</span>
              </span>

              <input
                name="firstName"
                value={form.firstName}
                onChange={updateField}
                placeholder="Enter first name"
                aria-invalid={!!errors.firstName}
              />

              {errors.firstName && (
                <span className="crm-error-message">
                  {errors.firstName}
                </span>
              )}
            </label>

            {/* Last Name */}
            <label className="crm-field">
              <span className="crm-field-label">
                Last Name <span className="required-mark">*</span>
              </span>

              <input
                name="lastName"
                value={form.lastName}
                onChange={updateField}
                placeholder="Enter last name"
                aria-invalid={!!errors.lastName}
              />

              {errors.lastName && (
                <span className="crm-error-message">
                  {errors.lastName}
                </span>
              )}
            </label>

            {/* Phone */}
            <label className="crm-field">
              <span className="crm-field-label">
                Phone <span className="required-mark">*</span>
              </span>

              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={updateField}
                placeholder="01012345678"
                maxLength={11}
                inputMode="numeric"
                aria-invalid={!!errors.phone}
              />

              {errors.phone && (
                <span className="crm-error-message">
                  {errors.phone}
                </span>
              )}
            </label>

            {/* Company Name */}
            <label className="crm-field">
              <span className="crm-field-label">
                Company Name <span className="required-mark">*</span>
              </span>

              <input
                name="companyName"
                value={form.companyName}
                onChange={updateField}
                placeholder="Enter company name"
                aria-invalid={!!errors.companyName}
              />

              {errors.companyName && (
                <span className="crm-error-message">
                  {errors.companyName}
                </span>
              )}
            </label>

            {/* Email */}
            <label className="crm-field">
              <span className="crm-field-label">
                Email <span className="required-mark">*</span>
              </span>

              <input
                type="email"
                name="email"
                value={form.email}
                onChange={updateField}
                placeholder="name@example.com"
                aria-invalid={!!errors.email}
              />

              {errors.email && (
                <span className="crm-error-message">
                  {errors.email}
                </span>
              )}
            </label>

            {/* Lead Source */}
            <label className="crm-field">
              <span className="crm-field-label">
                Lead Source <span className="required-mark">*</span>
              </span>

              <select
                name="leadSourceId"
                value={form.leadSourceId}
                onChange={updateField}
                aria-invalid={!!errors.leadSourceId}
              >
                <option value="">Select lead source</option>

                {leadSources.map((source) => (
                  <option
                    key={source.source_id}
                    value={source.source_id}
                  >
                    {source.name}
                  </option>
                ))}
              </select>

              {leadSources.length === 0 && (
                <span className="optional-label">
                  No active lead sources available. Create a lead source first.
                </span>
              )}

              {errors.leadSourceId && (
                <span className="crm-error-message">
                  {errors.leadSourceId}
                </span>
              )}
            </label>

            {/* Address */}
            <label className="crm-field crm-field-full">
              <span className="crm-field-label">
                Address <span className="optional-label">(Optional)</span>
              </span>

              <textarea
                name="address"
                value={form.address}
                onChange={updateField}
                placeholder="Enter customer address (max 200 characters)"
                maxLength={200}
                rows={3}
                aria-invalid={!!errors.address}
              />

              <span className="optional-label">
                {form.address.length}/200 characters
              </span>

              {errors.address && (
                <span className="crm-error-message">
                  {errors.address}
                </span>
              )}
            </label>
          </div>

          {/* API Error */}
          {submitError && (
            <p className="crm-error-message" role="alert">
              {submitError}
            </p>
          )}

          <footer className="crm-form-actions">
            <button
              type="submit"
              className="crm-form-save"
              disabled={isSaving || leadSources.length === 0}
            >
              {isSaving ? "Saving..." : "Save Customer"}
            </button>

            <button
              type="reset"
              className="crm-form-reset"
              disabled={isSaving}
            >
              Reset
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
