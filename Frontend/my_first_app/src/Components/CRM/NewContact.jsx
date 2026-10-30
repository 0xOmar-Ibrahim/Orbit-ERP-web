import React, { useState } from "react";
import "./CRMForms.css";

const INITIAL_FORM = {
  name: "",
  customer: "",
  jobTitle: "",
  email: "",
  phone: "",
  isPrimary: "",
};

export default function NewContact({ onClose, onSave, customers = [] }) {
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [errors, setErrors] = useState({});

  const updateField = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: "" }));
  };

  const handleReset = () => {
    setForm({ ...INITIAL_FORM });
    setErrors({});
  };

  const validateForm = () => {
    const newErrors = {};

   if (!form.name.trim()) {
  newErrors.name = "Please enter contact name.";
} else if (!/^[\p{L}\s]+$/u.test(form.name.trim())) {
  newErrors.name = "Contact name must contain letters only.";
}

    if (!form.customer) {
      newErrors.customer = "Please select a customer.";
    }

    if (!form.jobTitle.trim()) {
  newErrors.jobTitle = "Please enter job title.";
} else if (!/^[\p{L}\s]+$/u.test(form.jobTitle.trim())) {
  newErrors.jobTitle = "Job title must contain letters only.";
}

    if (!form.email.trim()) {
      newErrors.email = "Please enter email address.";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
    ) {
      newErrors.email = "Please enter a valid email address.";
    }

    if (!form.phone.trim()) {
      newErrors.phone = "Please enter phone number.";
    } else if (!/^01\d{9}$/.test(form.phone.trim())) {
      newErrors.phone =
        "Phone number must be exactly 11 digits and start with 01.";
    }

    if (form.isPrimary === "") {
      newErrors.isPrimary = "Please select Yes or No.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!validateForm()) return;

    onSave({
      ...form,
      name: form.name.trim(),
      jobTitle: form.jobTitle.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      isPrimary: form.isPrimary === "true",
      id: Date.now(),
    });
  };

  const customerNames = [
    ...new Set(
      [
        ...customers.map(
          (customer) =>
            customer.companyName || customer.firstName || customer.name
        ),
        "Acme Corp.",
        "Global Tech",
      ].filter(Boolean)
    ),
  ];

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
        aria-labelledby="contact-title"
      >
        <header className="crm-form-header">
          <div>
            <h2 id="contact-title">New Contact</h2>
            <p>Create a contact linked to a customer.</p>
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

        <form onSubmit={handleSubmit} onReset={handleReset} noValidate>
          <div className="crm-form-grid">
            <label className="crm-field crm-field-full">
              <span className="crm-field-label">
                Name <span className="required-mark">*</span>
              </span>
              <input
                name="name"
                value={form.name}
                onChange={updateField}
                placeholder="Enter contact name"
                aria-invalid={!!errors.name}
              />
              {errors.name && (
                <span className="crm-error-message">{errors.name}</span>
              )}
            </label>

            <label className="crm-field crm-field-full">
              <span className="crm-field-label">
                Select Customer <span className="required-mark">*</span>
              </span>
              <select
                name="customer"
                value={form.customer}
                onChange={updateField}
                aria-invalid={!!errors.customer}
              >
                <option value="">Select customer</option>
                {customerNames.map((customerName) => (
                  <option key={customerName} value={customerName}>
                    {customerName}
                    {["Acme Corp.", "Global Tech"].includes(customerName)
                      ? " (Sample)"
                      : ""}
                  </option>
                ))}
              </select>
              {errors.customer && (
                <span className="crm-error-message">{errors.customer}</span>
              )}
            </label>

            <label className="crm-field">
              <span className="crm-field-label">
                Job Title <span className="required-mark">*</span>
              </span>
              <input
                name="jobTitle"
                value={form.jobTitle}
                onChange={updateField}
                placeholder="e.g. Sales Manager"
                aria-invalid={!!errors.jobTitle}
              />
              {errors.jobTitle && (
                <span className="crm-error-message">{errors.jobTitle}</span>
              )}
            </label>

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
                <span className="crm-error-message">{errors.email}</span>
              )}
            </label>

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
                <span className="crm-error-message">{errors.phone}</span>
              )}
            </label>

            <fieldset className="crm-field crm-primary-field">
              <legend className="crm-field-label">
                Is Primary? <span className="required-mark">*</span>
              </legend>

              <div className="crm-primary-options">
                <label
                  className={`crm-primary-option ${
                    form.isPrimary === "true" ? "selected yes" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="isPrimary"
                    value="true"
                    checked={form.isPrimary === "true"}
                    onChange={updateField}
                  />
                  <span className="crm-primary-dot" />
                  <span>Yes</span>
                </label>

                <label
                  className={`crm-primary-option ${
                    form.isPrimary === "false" ? "selected no" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="isPrimary"
                    value="false"
                    checked={form.isPrimary === "false"}
                    onChange={updateField}
                  />
                  <span className="crm-primary-dot" />
                  <span>No</span>
                </label>
              </div>

              {errors.isPrimary && (
                <span className="crm-error-message">{errors.isPrimary}</span>
              )}
            </fieldset>
          </div>

          <footer className="crm-form-actions">
            <button type="submit" className="crm-form-save">
              Save Contact
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