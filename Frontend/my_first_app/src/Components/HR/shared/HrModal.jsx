import React, { useEffect, useState } from "react";
import Icon from "../Attendance/Icon";
import "../Attendance/Attendance.css";

/** One labelled form field, styled like the design's fields */
export function Field({ label, required, error, full, children }) {
  return (
    <label className={`att-field ${error ? "has-error" : ""} ${full ? "att-field-full" : ""}`}>
      <span>
        {label} {required && <b>*</b>}
      </span>
      <div>{children}</div>
      {error && <small>{error}</small>}
    </label>
  );
}

/** Native <select> with the design's chevron */
export function SelectInput({ value, onChange, options, placeholder }) {
  return (
    <>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={value === "" ? "is-placeholder" : ""}>
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Icon name="chevron" size={16} />
    </>
  );
}

/**
 * The design's modal: eyebrow + title, form body, error box,
 * Cancel / Save changes, and a "Saved successfully" state.
 * onDelete (optional) asks for a second click before it runs.
 */
export default function HrModal({ eyebrow, title, saving, saved, error, onClose, onSubmit, onDelete, children }) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  return (
    <div className="att-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}>
      <div className="att-modal" role="dialog" aria-modal="true" aria-labelledby="hr-modal-title">
        <div className="att-modal-head">
          <div>
            <p className="att-eyebrow">{eyebrow}</p>
            <h2 id="hr-modal-title">{title}</h2>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} disabled={saving}>
            <Icon name="close" />
          </button>
        </div>

        {saved ? (
          <div className="att-saved-state">
            <span>
              <Icon name="check" size={26} />
            </span>
            <h3>Saved successfully</h3>
            <p>The employee profile has been updated.</p>
          </div>
        ) : (
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              setConfirmDelete(false);
              onSubmit();
            }}
          >
            {children}

            {error && <div className="att-form-error">{error}</div>}

            <div className="att-modal-actions">
              {onDelete && (
                <button
                  type="button"
                  className={`att-button danger ${confirmDelete ? "confirm" : ""}`}
                  disabled={saving}
                  onClick={() => (confirmDelete ? onDelete() : setConfirmDelete(true))}
                >
                  <Icon name="trash" size={16} /> {confirmDelete ? "Confirm delete" : "Delete"}
                </button>
              )}
              <button type="button" className="att-button secondary" onClick={onClose} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="att-button primary" disabled={saving}>
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/**
 * Shared form state for the modals: field errors that clear as you type,
 * a form-level error, saving / saved flags, and the close-after-save delay.
 */
export function useModalState(onClose) {
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!saved) return undefined;
    const t = setTimeout(onClose, 750);
    return () => clearTimeout(t);
  }, [saved, onClose]);

  const clearError = (key) =>
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const rest = { ...prev };
      delete rest[key];
      return rest;
    });

  /** Runs an API call with saving/saved/error handling */
  const run = async (fn) => {
    setSaving(true);
    setFormError("");
    try {
      await fn();
      setSaved(true);
    } catch (err) {
      setErrors(err.fields || {});
      setFormError(err.message || "Something went wrong. Please try again.");
      setSaving(false);
    }
  };

  return { errors, setErrors, formError, setFormError, saving, saved, clearError, run };
}
