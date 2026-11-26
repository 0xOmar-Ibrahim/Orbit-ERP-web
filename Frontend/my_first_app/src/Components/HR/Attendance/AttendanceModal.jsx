import React, { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { NO_TIME_STATUSES, STATUS_OPTIONS, formatClock, toDateTime, todayKey } from "./attendanceUtils";

const clockOrEmpty = (value) => {
  const clock = formatClock(value);
  return clock === "—" ? "" : clock;
};

function Field({ label, required, error, children }) {
  return (
    <label className={`att-field ${error ? "has-error" : ""}`}>
      <span>
        {label} {required && <b>*</b>}
      </span>
      <div>{children}</div>
      {error && <small>{error}</small>}
    </label>
  );
}

/**
 * Add (record = null) or edit an attendance record.
 * onSave(payload, isEdit) and onDelete(record) return promises that reject with
 * an Error carrying { message, fields } from the API.
 */
export default function AttendanceModal({ employeeLabel, employeeId, record, defaultDate, onClose, onSave, onDelete }) {
  const editing = Boolean(record);

  // New records are always for today; an existing record keeps its own date
  const date = editing ? record.attendance_date : todayKey();
  const [checkIn, setCheckIn] = useState(clockOrEmpty(record?.check_in));
  const [checkOut, setCheckOut] = useState(clockOrEmpty(record?.check_out));
  const [status, setStatus] = useState(record?.status || "");
  const [notes, setNotes] = useState(record?.notes || "");

  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const closeTimer = useRef(null);

  const needsTime = !NO_TIME_STATUSES.includes(status);
  const orderError =
    needsTime && checkIn && checkOut && checkOut <= checkIn ? "Check-out must be later than check-in" : "";

  /** Updates a field and clears its old error */
  const change = (setter, key) => (value) => {
    setter(value);
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const rest = { ...prev };
      delete rest[key];
      return rest;
    });
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  const finish = () => {
    setSaved(true);
    closeTimer.current = setTimeout(onClose, 750);
  };

  const fail = (err) => {
    setErrors(err.fields || {});
    setFormError(err.message || "Something went wrong. Please try again.");
    setSaving(false);
  };

  const submit = async (e) => {
    e.preventDefault();

    const next = {};
    if (!date) next.attendance_date = "This field is required";
    if (!status) next.status = "This field is required";
    if (needsTime && !checkIn) next.check_in = "This field is required";
    if (needsTime && !checkOut) next.check_out = "This field is required";
    const missing = Object.keys(next).length > 0;
    if (needsTime && checkIn && checkOut && checkOut <= checkIn) next.check_out = "Check-out must be later than check-in";

    setErrors(next);
    setConfirmDelete(false);
    if (Object.keys(next).length) {
      setFormError(missing ? "Please complete all required fields before saving." : "");
      return;
    }
    setFormError("");

    const payload = {
      employee_id: employeeId,
      attendance_date: date,
      check_in: needsTime ? toDateTime(date, checkIn) : null,
      check_out: needsTime ? toDateTime(date, checkOut) : null,
      status,
      notes: notes.trim(),
    };
    if (editing) payload.attendance_id = record.attendance_id;

    setSaving(true);
    try {
      await onSave(payload, editing);
      finish();
    } catch (err) {
      fail(err);
    }
  };

  const remove = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      await onDelete(record);
      finish();
    } catch (err) {
      fail(err);
    }
  };

  return (
    <div className="att-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}>
      <div className="att-modal" role="dialog" aria-modal="true" aria-labelledby="att-modal-title">
        <div className="att-modal-head">
          <div>
            <p className="att-eyebrow">{employeeLabel}</p>
            <h2 id="att-modal-title">{editing ? "Edit attendance" : "Add attendance"}</h2>
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
          <form onSubmit={submit} noValidate>
            <div className="att-form-grid">
              <Field label="Date" required error={errors.attendance_date}>
                <input type="date" value={date} readOnly tabIndex={-1} className="att-locked" title="Attendance is recorded for today's date" />
              </Field>
              <Field label="Status" required error={errors.status}>
                <select
                  value={status}
                  onChange={(e) => change(setStatus, "status")(e.target.value)}
                  className={status ? "" : "is-placeholder"}
                >
                  <option value="" disabled>
                    Select status
                  </option>
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <Icon name="chevron" size={16} />
              </Field>
              <Field label="Check in" required={needsTime} error={errors.check_in}>
                <input
                  type="time"
                  value={needsTime ? checkIn : ""}
                  max={checkOut || undefined}
                  disabled={!needsTime}
                  onChange={(e) => change(setCheckIn, "check_in")(e.target.value)}
                />
              </Field>
              <Field label="Check out" required={needsTime} error={errors.check_out || orderError}>
                <input
                  type="time"
                  value={needsTime ? checkOut : ""}
                  min={checkIn || undefined}
                  disabled={!needsTime}
                  onChange={(e) => change(setCheckOut, "check_out")(e.target.value)}
                />
              </Field>
            </div>

            <Field label="Notes (optional)" error={errors.notes}>
              <textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any context about this attendance record..."
              />
            </Field>

            {formError && <div className="att-form-error">{formError}</div>}

            <div className="att-modal-actions">
              {editing && (
                <button
                  type="button"
                  className={`att-button danger ${confirmDelete ? "confirm" : ""}`}
                  onClick={remove}
                  disabled={saving}
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
