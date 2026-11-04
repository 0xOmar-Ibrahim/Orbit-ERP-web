import React, { useMemo, useState } from "react";
import "./CRMForms.css";

const STAGES = ["Lead", "Qualified", "Proposal", "Negotiation", "Closed"];
const STATUSES = ["Open", "Won", "Lost"];

const INITIAL_FORM = {
  name: "",
  customerId: "",
  employeeId: "",
  closingDate: "",
  //probability: "",
  stage: "Lead",
  status: "Open",
  revenue: "",
  lostReason: "",
};

const getToday = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getCustomerName = (customer) => {
  if (customer.company_name) return customer.company_name;

  return (
    `${customer.first_name || ""} ${customer.last_name || ""}`.trim() ||
    customer.name ||
    `Customer #${customer.customer_id}`
  );
};

const getEmployeeId = (employee) => employee.employee_id ?? employee.id ?? "";

const getEmployeeName = (employee) =>
  employee.name ||
  `${employee.first_name || ""} ${employee.last_name || ""}`.trim() ||
  employee.full_name ||
  employee.employee_code ||
  `Employee #${getEmployeeId(employee)}`;

export default function NewOpportunity({
  onClose,
  onSave,
  customers = [],
  salespeople = [],
}) {
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const availableCustomers = useMemo(
    () => customers.filter((customer) => customer.customer_id != null),
    [customers]
  );

  const availableSalespeople = useMemo(
    () => salespeople.filter((employee) => getEmployeeId(employee) !== ""),
    [salespeople]
  );

  const updateField = (event) => {
    const { name, value } = event.target;

    setForm((previous) => {
      const updated = { ...previous, [name]: value };

      // A closed opportunity must be Won or Lost.
      if (name === "stage") {
        if (value === "Closed" && updated.status === "Open") {
          updated.status = "Won";
        } else if (value !== "Closed") {
          updated.status = "Open";
        }
      }

      // Won/Lost opportunities must use the Closed stage.
      if (name === "status") {
        if (value === "Won" || value === "Lost") {
          updated.stage = "Closed";
        } else {
          updated.stage = updated.stage === "Closed" ? "Lead" : updated.stage;
        }
      }

      return updated;
    });

    setErrors((previous) => ({
      ...previous,
      [name]: "",
      ...(name === "stage" ? { status: "" } : {}),
      ...(name === "status" ? { stage: "" } : {}),
    }));

    setSaveError("");
  };

  const handleReset = () => {
    setForm({ ...INITIAL_FORM });
    setErrors({});
    setSaveError("");
  };

  const validateForm = () => {
    const newErrors = {};

    if (form.status === "Lost" && !form.lostReason.trim()) {
      newErrors.lostReason =
        "Please provide a reason for losing this opportunity.";
    }

    if (!form.name.trim()) {
      newErrors.name = "Please enter opportunity name.";
    } else if (!/^[\p{L}\p{N}\s&'().,_-]+$/u.test(form.name.trim())) {
      newErrors.name = "Please enter a valid opportunity name.";
    }

    if (!form.customerId) {
      newErrors.customerId = "Please select a customer.";
    }

    if (!form.employeeId) {
      newErrors.employeeId = "Please select a sales person.";
    }

    if (form.closingDate) {
      const selectedDate = new Date(`${form.closingDate}T00:00:00`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (Number.isNaN(selectedDate.getTime())) {
        newErrors.closingDate = "Please enter a valid date.";
      } else if (selectedDate < today) {
        newErrors.closingDate = "Closing date cannot be in the past.";
      }
    }

    if (!STAGES.includes(form.stage)) {
      newErrors.stage = "Please select a valid stage.";
    }

    if (!STATUSES.includes(form.status)) {
      newErrors.status = "Please select a valid status.";
    }

    if (
      (form.status === "Won" || form.status === "Lost") &&
      form.stage !== "Closed"
    ) {
      newErrors.status =
        "Won or Lost opportunities must have the Closed stage.";
    }

    if (form.stage === "Closed" && form.status === "Open") {
      newErrors.stage = "A closed opportunity must be marked Won or Lost.";
    }

    if (form.revenue !== "") {
      const revenue = Number(form.revenue);

      if (
        !Number.isFinite(revenue) ||
        revenue < 0 ||
        !/^\d+(\.\d{1,2})?$/.test(form.revenue)
      ) {
        newErrors.revenue =
          "Revenue must be non-negative and have at most 2 decimal places.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saving || !validateForm()) return;

    setSaving(true);
    setSaveError("");

    try {
      await onSave({
        name: form.name.trim(),
        customerId: Number(form.customerId),
        employeeId: Number(form.employeeId),
        closingDate: form.closingDate || "",
        stage: form.stage,
        status: form.status,
        revenue: form.revenue === "" ? 0 : Number(form.revenue),
        lostReason: form.status === "Lost" ? form.lostReason.trim() : "",
      });
    } catch (error) {
      setSaveError(error.message || "Could not create the opportunity.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="crm-form-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) {
          onClose();
        }
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
            disabled={saving}
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
                name="customerId"
                value={form.customerId}
                onChange={updateField}
                aria-invalid={!!errors.customerId}
              >
                <option value="">Select customer</option>

                {availableCustomers.map((customer) => (
                  <option
                    key={customer.customer_id}
                    value={customer.customer_id}
                  >
                    {getCustomerName(customer)}
                  </option>
                ))}
              </select>

              {availableCustomers.length === 0 && (
                <span className="crm-error-message">
                  No customers available. Create a customer first.
                </span>
              )}

              {errors.customerId && (
                <span className="crm-error-message">{errors.customerId}</span>
              )}
            </label>

            {/* Sales Person */}
            <label className="crm-field">
              <span className="crm-field-label">
                Select Sales Person <span className="required-mark">*</span>
              </span>

              <select
                name="employeeId"
                value={form.employeeId}
                onChange={updateField}
                aria-invalid={!!errors.employeeId}
              >
                <option value="">Select sales person</option>

                {availableSalespeople.map((employee) => (
                  <option
                    key={getEmployeeId(employee)}
                    value={getEmployeeId(employee)}
                  >
                    {getEmployeeName(employee)}
                  </option>
                ))}
              </select>

              {availableSalespeople.length === 0 && (
                <span className="crm-error-message">
                  No employees available. Check the employees API.
                </span>
              )}

              {errors.employeeId && (
                <span className="crm-error-message">{errors.employeeId}</span>
              )}
            </label>

            {/* Closing Date */}
            <label className="crm-field">
              <span className="crm-field-label">
                Expected Closing Date <span className="required-mark">*</span>
              </span>

              <input
                type="date"
                name="closingDate"
                value={form.closingDate}
                onChange={updateField}
                min={getToday()}
                aria-invalid={!!errors.closingDate}
              />

              {errors.closingDate && (
                <span className="crm-error-message">{errors.closingDate}</span>
              )}
            </label>

            {/* Probability
            <label className="crm-field">
              <span className="crm-field-label">
                Probability (%)
                <span className="optional-label"> (Optional)</span>
              </span>

              <input
                type="number"
                name="probability"
                min="0"
                max="100"
                step="1"
                value={form.probability}
                onChange={updateField}
                placeholder="Automatic based on stage"
                aria-invalid={!!errors.probability}
              />

              {errors.probability && (
                <span className="crm-error-message">{errors.probability}</span>
              )}
            </label> */}

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

            {/* Lost Reason - Only shown when Status is Lost */}
            {form.status === "Lost" && (
              <label className="crm-field crm-field-full">
                <span className="crm-field-label">
                  Lost Reason <span className="required-mark">*</span>
                </span>

                <textarea
                  name="lostReason"
                  value={form.lostReason}
                  onChange={updateField}
                  placeholder="Explain why this opportunity was lost"
                  rows={3}
                  aria-invalid={!!errors.lostReason}
                />

                {errors.lostReason && (
                  <span className="crm-error-message">{errors.lostReason}</span>
                )}
              </label>
            )}

            {/* Revenue */}
            <label className="crm-field crm-field-full">
              <span className="crm-field-label">
                Revenue <span className="optional-label">(Optional)</span>
              </span>

              <input
                type="number"
                name="revenue"
                min="0"
                step="0.01"
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

          {saveError && (
            <p className="crm-error-message" role="alert">
              {saveError}
            </p>
          )}

          <footer className="crm-form-actions">
            <button type="submit" className="crm-form-save" disabled={saving}>
              {saving ? "Saving..." : "Submit"}
            </button>

            <button type="reset" className="crm-form-reset" disabled={saving}>
              Reset
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
