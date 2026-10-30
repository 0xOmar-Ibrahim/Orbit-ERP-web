import React, { useState } from "react";
import "./CRMForms.css";

const STAGES = ["Lead", "Qualified", "Proposal", "Negotiation", "Closed"];
const SALESPEOPLE = ["Ahmed Mohamed", "Sara Ali", "Omar Hassan"];
const STATUSES = ["Open", "Won", "Lost"];

const INITIAL_FORM = {
  name: "",
  customer: "",
  salesperson: "",
  closingDate: "",
  probability: "",
  stage: "",
  status: "",
  revenue: "",
};

export default function NewOpportunity({ onClose, onSave, customers = [] }) {
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [errors, setErrors] = useState({});

  const updateField = (event) => {
    const { name, value } = event.target;

    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleReset = () => {
    setForm({ ...INITIAL_FORM });
    setErrors({});
  };

  const validateForm = () => {
    const newErrors = {};

    // Opportunity Name: required, letters and spaces only
    if (!form.name.trim()) {
      newErrors.name = "Please enter opportunity name.";
    } else if (!/^[\p{L}\s]+$/u.test(form.name.trim())) {
      newErrors.name = "Opportunity name must contain letters only.";
    }

    // Customer: required
    if (!form.customer) {
      newErrors.customer = "Please select a customer.";
    }

    // Sales Person: required
    if (!form.salesperson) {
      newErrors.salesperson = "Please select a sales person.";
    }

   // Closing Date: required, valid date, and not in the past
if (!form.closingDate) {
  newErrors.closingDate = "Please select a closing date.";
} else {
  const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/;
  const match = form.closingDate.match(datePattern);

  if (!match) {
    newErrors.closingDate = "Please enter a valid date.";
  } else {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      newErrors.closingDate = "Please enter a valid calendar date.";
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (date < today) {
        newErrors.closingDate = "Closing date cannot be in the past.";
      }
    }
  }
}

    // Probability: required, numbers only, greater than 0 and up to 100
    if (form.probability === "") {
      newErrors.probability = "Please enter probability.";
    } else if (!/^\d+(\.\d+)?$/.test(form.probability)) {
      newErrors.probability = "Probability must contain numbers only.";
    } else {
      const probability = Number(form.probability);

      if (probability <= 0 || probability > 100) {
        newErrors.probability = "Probability must be greater than 0 and up to 100.";
      }
    }

    // Stage: required
    if (!form.stage) {
      newErrors.stage = "Please select a stage.";
    }

    // Status: required, one option only
    if (!STATUSES.includes(form.status)) {
      newErrors.status = "Please select one status.";
    }

    // Revenue: optional, numbers only, no negative values
    if (form.revenue !== "") {
      if (!/^\d+(\.\d+)?$/.test(form.revenue)) {
        newErrors.revenue = "Revenue must contain numbers only.";
      } else if (Number(form.revenue) < 0) {
        newErrors.revenue = "Revenue cannot be negative.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!validateForm()) return;

    const revenue = form.revenue === "" ? null : Number(form.revenue);

    onSave({
      ...form,
      name: form.name.trim(),
      probability: Number(form.probability),
      revenue,
      value: revenue ?? 0,
      id: Date.now(),
      description: `Customer: ${form.customer}`,
    });
  };

  const customerNames = customers
    .map((customer) => customer.companyName || customer.firstName || customer.name)
    .filter(Boolean);

  const availableCustomers = [
    ...new Set([
      ...customerNames,
      ...(!customerNames.includes("Acme Corp.") ? ["Acme Corp."] : []),
      ...(!customerNames.includes("Global Tech") ? ["Global Tech"] : []),
    ]),
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
        aria-labelledby="opportunity-title"
      >
        <header className="crm-form-header">
          <div>
            <h2 id="opportunity-title">New Opportunity</h2>
            <p>Track and manage sales opportunities.</p>
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

            {/* Opportunity Name */}
            <label className="crm-field">
              <span className="crm-field-label">
                Name of Opportunity <span className="required-mark">*</span>
              </span>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={updateField}
                placeholder="Enter opportunity name"
                maxLength={100}
                aria-invalid={!!errors.name}
              />
              {errors.name && (
                <span className="crm-error-message">{errors.name}</span>
              )}
            </label>

            {/* Customer */}
            <label className="crm-field">
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
                {availableCustomers.map((customerName) => (
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

            {/* Sales Person */}
            <label className="crm-field">
              <span className="crm-field-label">
                Select Sales Person <span className="required-mark">*</span>
              </span>
              <select
                name="salesperson"
                value={form.salesperson}
                onChange={updateField}
                aria-invalid={!!errors.salesperson}
              >
                <option value="">Select sales person</option>
                {SALESPEOPLE.map((person) => (
                  <option key={person} value={person}>
                    {person}
                  </option>
                ))}
              </select>
              {errors.salesperson && (
                <span className="crm-error-message">{errors.salesperson}</span>
              )}
            </label>

           {/* Closing Date */}
<label className="crm-field">
  <span className="crm-field-label">
    Expected Closing Date{" "}
    <span className="required-mark">*</span>
  </span>

  <input
    type="date"
    name="closingDate"
    value={form.closingDate}
    onChange={updateField}
    min={new Date().toLocaleDateString("en-CA")}
    required
    aria-invalid={!!errors.closingDate}
  />

  {errors.closingDate && (
    <span className="crm-error-message">
      {errors.closingDate}
    </span>
  )}
</label>

            {/* Probability */}
            <label className="crm-field">
              <span className="crm-field-label">
                Probability (%) <span className="required-mark">*</span>
              </span>
              <input
                type="number"
                name="probability"
                min="0.01"
                max="100"
                step="any"
                value={form.probability}
                onChange={updateField}
                placeholder="Enter probability (1–100)"
                aria-invalid={!!errors.probability}
              />
              {errors.probability && (
                <span className="crm-error-message">{errors.probability}</span>
              )}
            </label>

            {/* Stage */}
            <label className="crm-field">
              <span className="crm-field-label">
                Stage <span className="required-mark">*</span>
              </span>
              <select
                name="stage"
                value={form.stage}
                onChange={updateField}
                aria-invalid={!!errors.stage}
              >
                <option value="">Select stage</option>
                {STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
              {errors.stage && (
                <span className="crm-error-message">{errors.stage}</span>
              )}
            </label>

            {/* Status */}
            <fieldset className="crm-field crm-status-field crm-field-full">
              <legend className="crm-field-label">
                Status <span className="required-mark">*</span>
              </legend>

              <div className="crm-status-options">
                {STATUSES.map((status) => (
                  <label
                    key={status}
                    className={`crm-status-option ${
                      form.status === status ? "selected" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="status"
                      value={status}
                      checked={form.status === status}
                      onChange={updateField}
                    />
                    <span className="crm-status-square" aria-hidden="true" />
                    <span>{status}</span>
                  </label>
                ))}
              </div>

              {errors.status && (
                <span className="crm-error-message">{errors.status}</span>
              )}
            </fieldset>

            {/* Revenue */}
            <label className="crm-field crm-field-full">
              <span className="crm-field-label">
                Revenue <span className="optional-label">(Optional)</span>
              </span>
              <input
                type="number"
                name="revenue"
                min="0"
                step="any"
                value={form.revenue}
                onChange={updateField}
                placeholder="Enter expected revenue"
                aria-invalid={!!errors.revenue}
              />
              {errors.revenue && (
                <span className="crm-error-message">{errors.revenue}</span>
              )}
            </label>
          </div>

          <footer className="crm-form-actions">
            <button type="submit" className="crm-form-save">
              Submit
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
