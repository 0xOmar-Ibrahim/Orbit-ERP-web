
import React, { useState } from "react";
import "./CRMForms.css";

const INITIAL_FORM = {
  customerCode: "",
  firstName: "",
  phone: "",
  companyName: "",
  email: "",
  address: "",
  campaign: "",
};

export default function NewCustomer({ onClose, onSave }) {
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

    // Customer Code
if (!form.customerCode.trim()) {
  newErrors.customerCode = "Please enter customer code.";
} else if (!/^CUS-\d{3}$/i.test(form.customerCode.trim())) {
  newErrors.customerCode =
    "Customer code must follow this format: CUS-000.";
}

    // First Name
if (!form.firstName.trim()) {
  newErrors.firstName = "Please enter first name.";
} else if (!/^[\p{L}\s]+$/u.test(form.firstName.trim())) {
  newErrors.firstName = "First name must contain letters only.";
} else if (form.firstName.trim().length < 2) {
  newErrors.firstName =
    "First name must be at least 2 characters.";
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
} else if (!/^[\p{L}\s]+$/u.test(form.companyName.trim())) {
  newErrors.companyName = "Company name must contain letters only.";
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

    // Campaign
    if (!form.campaign) {
      newErrors.campaign = "Please select a campaign.";
    }

    // Address is optional, but limited to 200 characters.
    if (form.address.length > 200) {
      newErrors.address = "Address cannot exceed 200 characters.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!validateForm()) return;

    onSave({
      ...form,
      customerCode: form.customerCode.trim(),
      firstName: form.firstName.trim(),
      phone: form.phone.trim(),
      companyName: form.companyName.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      id: Date.now(),
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
          >
            ×
          </button>
        </header>

        <form onSubmit={handleSubmit} onReset={handleReset} noValidate>
          <div className="crm-form-grid">
            <label className="crm-field">
              <span className="crm-field-label">
                Customer Code <span className="required-mark">*</span>
              </span>
              <input
                name="customerCode"
                value={form.customerCode}
                onChange={updateField}
                placeholder="e.g. CUS-001"
                aria-invalid={!!errors.customerCode}
              />
              {errors.customerCode && (
                <span className="crm-error-message">
                  {errors.customerCode}
                </span>
              )}
            </label>

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
                Campaign <span className="required-mark">*</span>
              </span>
              <select
                name="campaign"
                value={form.campaign}
                onChange={updateField}
                aria-invalid={!!errors.campaign}
              >
                <option value="">Select campaign</option>
                <option value="Website Campaign">
                  Website Campaign (Sample)
                </option>
                <option value="Email Campaign">
                  Email Campaign (Sample)
                </option>
                <option value="Social Media">
                  Social Media (Sample)
                </option>
              </select>
              {errors.campaign && (
                <span className="crm-error-message">
                  {errors.campaign}
                </span>
              )}
            </label>

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

          <footer className="crm-form-actions">
            <button type="submit" className="crm-form-save">
              Save Customer
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
