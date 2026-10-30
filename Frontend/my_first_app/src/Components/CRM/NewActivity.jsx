
import React, { useState } from "react";
 import "./NewActivity.css";

const INITIAL_FORM = {
  type: "Call",
  subject: "",
  description: "",
  dateTime: "",
};

const getLocalDateTime = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;

  return new Date(now.getTime() - offset)
    .toISOString()
    .slice(0, 16);
};

export default function NewActivity({ onClose, onSave }) {
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [errors, setErrors] = useState({});

  const updateField = (name, value) => {
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [name]: "",
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!form.subject.trim()) {
      newErrors.subject = "Please enter a subject.";
    }

    if (!form.description.trim()) {
      newErrors.description = "Please enter a description.";
    }

    if (!form.dateTime) {
      newErrors.dateTime = "Please select a date and time.";
    } else {
      const selectedDate = new Date(form.dateTime);

      if (Number.isNaN(selectedDate.getTime())) {
        newErrors.dateTime = "Please enter a valid date and time.";
      } else if (selectedDate <= new Date()) {
        newErrors.dateTime = "Date and time must be in the future.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!validateForm()) return;

    onSave?.({
      type: form.type,
      subject: form.subject.trim(),
      description: form.description.trim(),
      dateTime: new Date(form.dateTime).toISOString(),
    });

    onClose();
  };

  const actionLabel = {
    Call: "Schedule call",
    Mail: "Schedule mail",
    Meeting: "Schedule meeting",
  };

  return (
    <div
      className="activity-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="activity-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="activity-title"
      >
        <header className="activity-header">
          <div>
            <span className="activity-eyebrow">New activity</span>
            <h2 id="activity-title">Schedule an activity</h2>
          </div>

          <button
            type="button"
            className="activity-close"
            onClick={onClose}
            aria-label="Close form"
          >
            ×
          </button>
        </header>

        <form onSubmit={handleSubmit} noValidate>
          <div className="activity-field">
            <span className="activity-label">Activity type</span>

            <div className="activity-types">
              {[
                { name: "Call", icon: "phone" },
                { name: "Mail", icon: "mail" },
                { name: "Meeting", icon: "calendar" },
              ].map((item) => (
                <button
                  key={item.name}
                  type="button"
                  className={`activity-type ${
                    form.type === item.name ? "selected" : ""
                  }`}
                  onClick={() => updateField("type", item.name)}
                  aria-pressed={form.type === item.name}
                >
                  {item.icon === "phone" && (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M5 3h4l2 5-3 2a15 15 0 0 0 6 6l2-3 5 2v4c0 1-1 2-2 2C10 20 4 14 3 5c0-1 1-2 2-2Z" />
                    </svg>
                  )}

                  {item.icon === "mail" && (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <rect x="3" y="5" width="18" height="14" rx="2" />
                      <path d="m4 7 8 6 8-6" />
                    </svg>
                  )}

                  {item.icon === "calendar" && (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <rect x="3" y="5" width="18" height="16" rx="2" />
                      <path d="M16 3v4M8 3v4M3 10h18M8 14h2M14 14h2M8 17h2" />
                    </svg>
                  )}

                  {item.name}
                </button>
              ))}
            </div>
          </div>

          <label className="activity-field">
            <span className="activity-label">
              Subject <span className="activity-required">*</span>
            </span>

            <input
              type="text"
              value={form.subject}
              onChange={(event) =>
                updateField("subject", event.target.value)
              }
              placeholder={`Subject of the ${form.type.toLowerCase()}`}
              aria-invalid={!!errors.subject}
              className={errors.subject ? "activity-input-error" : ""}
            />

            {errors.subject && (
              <span className="activity-error">{errors.subject}</span>
            )}
          </label>

          <label className="activity-field">
            <span className="activity-label">
              Description <span className="activity-required">*</span>
            </span>

            <textarea
              rows={4}
              value={form.description}
              onChange={(event) =>
                updateField("description", event.target.value)
              }
              placeholder="Add context or talking points..."
              aria-invalid={!!errors.description}
              className={errors.description ? "activity-input-error" : ""}
            />

            {errors.description && (
              <span className="activity-error">{errors.description}</span>
            )}
          </label>

          <label className="activity-field">
            <span className="activity-label">
              Date & time <span className="activity-required">*</span>
            </span>

            <input
              type="datetime-local"
              value={form.dateTime}
              min={getLocalDateTime()}
              onChange={(event) =>
                updateField("dateTime", event.target.value)
              }
              aria-invalid={!!errors.dateTime}
              className={errors.dateTime ? "activity-input-error" : ""}
            />

            {errors.dateTime && (
              <span className="activity-error">{errors.dateTime}</span>
            )}
          </label>

          <footer className="activity-actions">
            <button
              type="button"
              className="activity-cancel"
              onClick={onClose}
            >
              Cancel
            </button>

            <button type="submit" className="activity-submit">
              {actionLabel[form.type]}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
