import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import "./Attendance.css";
import Icon from "./Icon";
import AttendanceModal from "./AttendanceModal";
import { createAttendance, deleteAttendance, fetchAttendance, updateAttendance } from "./attendanceApi";
import {
  PRESENT_STATUSES,
  clockMinutes,
  currentMonthKey,
  employeeName,
  formatClock,
  formatDay,
  formatDuration,
  minutesToClock,
  monthKeyOf,
  monthLabel,
  statusLabel,
  statusTone,
  todayKey,
} from "./attendanceUtils";

const COLUMNS = ["Date", "Check in", "Check out", "Worked", "Status", "Notes"];

function Status({ tone, children }) {
  return (
    <span className={`att-status ${tone}`}>
      <span className="att-status-dot" />
      {children}
    </span>
  );
}

function Loading() {
  return (
    <div className="att-loading-grid" aria-label="Loading content">
      {[1, 2, 3].map((x) => (
        <div className="att-skeleton-card" key={x}>
          <i />
          <b />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}

function Empty({ title, copy }) {
  return (
    <section className="att-card att-empty">
      <span>
        <Icon name="search" size={24} />
      </span>
      <h3>{title}</h3>
      <p>{copy}</p>
    </section>
  );
}

function MonthPicker({ months, value, onChange }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const close = () => setOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [open]);

  return (
    <div className="att-menu-anchor">
      <button
        type="button"
        className="att-month-picker"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
      >
        <Icon name="calendar" size={17} /> {monthLabel(value)} <Icon name="chevron" size={15} />
      </button>
      {open && (
        <div className="att-menu" role="listbox" onClick={(e) => e.stopPropagation()}>
          {months.map((m) => (
            <button
              type="button"
              role="option"
              aria-selected={m === value}
              key={m}
              className={m === value ? "selected" : ""}
              onClick={() => {
                onChange(m);
                setOpen(false);
              }}
            >
              {monthLabel(m)}
              {m === value && <Icon name="check" size={15} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Attendance() {
  const outlet = useOutletContext() || {};
  const user = outlet.user;
  const employeeId = user?.employee_id ?? user?.id ?? null;
  const name = employeeName(user);

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [month, setMonth] = useState(null);
  const [modal, setModal] = useState(null);

  const loadRecords = useCallback(
    async ({ keepMonth = false } = {}) => {
      if (!employeeId) return;
      setLoading(true);
      setError("");
      try {
        const list = await fetchAttendance(employeeId);
        setRecords(list);
        if (!keepMonth) {
          const current = currentMonthKey();
          const latest = list.map((r) => monthKeyOf(r.attendance_date)).sort().pop();
          const hasCurrent = list.some((r) => monthKeyOf(r.attendance_date) === current);
          setMonth(hasCurrent || !latest ? current : latest);
        }
      } catch (err) {
        if (err.message !== "SESSION_EXPIRED") setError(err.message);
        setRecords([]);
      } finally {
        setLoading(false);
      }
    },
    [employeeId]
  );

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const selectedMonth = month || currentMonthKey();

  const months = useMemo(() => {
    const keys = new Set([currentMonthKey(), selectedMonth]);
    records.forEach((r) => keys.add(monthKeyOf(r.attendance_date)));
    return [...keys].sort().reverse();
  }, [records, selectedMonth]);

  const shown = useMemo(
    () =>
      records
        .filter((r) => monthKeyOf(r.attendance_date) === selectedMonth)
        .sort((a, b) => (a.attendance_date < b.attendance_date ? -1 : 1)),
    [records, selectedMonth]
  );

  const metrics = useMemo(() => {
    const worked = shown.reduce((sum, r) => sum + (Number(r.worked_minutes) || 0), 0);
    const overtime = shown.reduce((sum, r) => sum + (Number(r.overtime_minutes) || 0), 0);
    const present = shown.filter((r) => PRESENT_STATUSES.includes(r.status)).length;
    const checkIns = shown.map((r) => clockMinutes(r.check_in)).filter((m) => m !== null);
    const average = checkIns.length ? Math.round(checkIns.reduce((a, b) => a + b, 0) / checkIns.length) : null;

    return [
      ["Total worked", formatDuration(worked)],
      ["Overtime", formatDuration(overtime)],
      ["Days present", `${present} / ${shown.length}`],
      ["Average check-in", average === null ? "—" : minutesToClock(average)],
    ];
  }, [shown]);

  const defaultDate = monthKeyOf(todayKey()) === selectedMonth ? todayKey() : `${selectedMonth}-01`;

  const save = async (payload, isEdit) => {
    if (isEdit) await updateAttendance(payload);
    else await createAttendance(payload);
    setMonth(monthKeyOf(payload.attendance_date));
    loadRecords({ keepMonth: true });
  };

  const remove = async (record) => {
    await deleteAttendance(record.attendance_id);
    loadRecords({ keepMonth: true });
  };

  const pageError = !employeeId && user ? "Couldn't identify the signed-in employee." : error;

  return (
    <div className="att-page">
      <div className="att-inner">
        <div className="att-heading">
          <div>
            <p className="att-eyebrow">Time &amp; attendance</p>
            <h2>Attendance</h2>
            <p className="att-copy">Daily work log for {monthLabel(selectedMonth)}.</p>
          </div>

          <div className="att-actions">
            <MonthPicker months={months} value={selectedMonth} onChange={setMonth} />
            <button
              type="button"
              className="att-button primary"
              onClick={() => setModal({ record: null })}
              disabled={!employeeId}
            >
              <Icon name="plus" size={17} /> Add attendance
            </button>
          </div>
        </div>

        {pageError && (
          <div className="att-banner" role="alert">
            <span>{pageError}</span>
            {employeeId && (
              <button type="button" className="att-button secondary" onClick={() => loadRecords({ keepMonth: true })}>
                Try again
              </button>
            )}
          </div>
        )}

        <div className="att-metrics">
          {metrics.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <b>{loading ? "—" : value}</b>
            </div>
          ))}
        </div>

        {loading ? (
          <Loading />
        ) : !shown.length ? (
          <Empty title="No attendance records" copy={`No work logs for ${monthLabel(selectedMonth)}.`} />
        ) : (
          <section className="att-card att-table-card">
            <div className="att-data-table">
              <div className="att-row att-head">
                {COLUMNS.map((c) => (
                  <span key={c}>{c}</span>
                ))}
              </div>
              {shown.map((r) => {
                const open = () => setModal({ record: r });
                const hasTimes = r.check_in && r.check_out;
                return (
                  <div
                    className="att-row att-attendance-row"
                    key={r.attendance_id}
                    role="button"
                    tabIndex={0}
                    onClick={open}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        open();
                      }
                    }}
                    aria-label={`Edit attendance for ${formatDay(r.attendance_date)}`}
                  >
                    <span data-label="Date"><b>{formatDay(r.attendance_date)}</b></span>
                    <span data-label="Check in"><b>{formatClock(r.check_in)}</b></span>
                    <span data-label="Check out"><b>{formatClock(r.check_out)}</b></span>
                    <span data-label="Worked"><b>{hasTimes ? formatDuration(r.worked_minutes) : "—"}</b></span>
                    <span data-label="Status">
                      <Status tone={statusTone(r.status)}>{statusLabel(r.status)}</Status>
                    </span>
                    <span data-label="Notes" className="att-note" title={r.notes || undefined}>
                      <b>{r.notes || "—"}</b>
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {modal && (
        <AttendanceModal
          employeeLabel={name || "Employee"}
          employeeId={Number(employeeId)}
          record={modal.record}
          defaultDate={defaultDate}
          onClose={() => setModal(null)}
          onSave={save}
          onDelete={remove}
        />
      )}
    </div>
  );
}