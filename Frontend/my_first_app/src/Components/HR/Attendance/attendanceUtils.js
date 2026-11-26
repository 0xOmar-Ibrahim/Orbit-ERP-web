// Formatting helpers for the Attendance page.

// Values match Attendance.AttendanceStatus in backend/apps/hr/models.py
export const STATUS_OPTIONS = [
  { value: "present", label: "Present" },
  { value: "late", label: "Late" },
  { value: "half_day", label: "Half day" },
  { value: "absent", label: "Absent" },
  { value: "on_leave", label: "On leave" },
  { value: "holiday", label: "Holiday" },
];

/** Statuses that count as a day present */
export const PRESENT_STATUSES = ["present", "late", "half_day"];

/** Statuses that have no check-in / check-out */
export const NO_TIME_STATUSES = ["absent", "on_leave", "holiday"];

const TONES = { late: "late", half_day: "late", absent: "absent", on_leave: "muted", holiday: "muted" };

export const statusLabel = (value) => STATUS_OPTIONS.find((o) => o.value === value)?.label || value || "—";

export const statusTone = (value) => TONES[value] || "present";

const pad = (n) => String(n).padStart(2, "0");

/** "2025-06-02" -> local Date (avoids the UTC shift of new Date("2025-06-02")) */
export const parseDay = (iso) => {
  const [y, m, d] = String(iso).split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const toDayKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const todayKey = () => toDayKey(new Date());

/** "2025-06-02" -> "2025-06" */
export const monthKeyOf = (iso) => String(iso).slice(0, 7);

export const currentMonthKey = () => monthKeyOf(todayKey());

/** "2025-06" -> "June 2025" */
export const monthLabel = (key) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

/** "2025-06-02" -> "Mon, Jun 2" */
export const formatDay = (iso) =>
  parseDay(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

const validDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** ISO datetime -> "08:54" in local time */
export const formatClock = (value) => {
  const d = validDate(value);
  return d ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : "—";
};

/** ISO datetime -> minutes after local midnight */
export const clockMinutes = (value) => {
  const d = validDate(value);
  return d ? d.getHours() * 60 + d.getMinutes() : null;
};

export const minutesToClock = (minutes) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

/** 518 -> "8h 38m" */
export const formatDuration = (minutes) => {
  const total = Math.max(0, Math.round(Number(minutes) || 0));
  return `${Math.floor(total / 60)}h ${pad(total % 60)}m`;
};

/** ("2025-06-02", "08:54") -> "2025-06-02T08:54:00+03:00" (local offset of that day) */
export const toDateTime = (day, time) => {
  const [y, m, d] = day.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  const offset = -new Date(y, m - 1, d, h, min).getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const abs = Math.abs(offset);
  return `${day}T${pad(h)}:${pad(min)}:00${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
};

export const employeeName = (employee) =>
  employee ? `${employee.first_name || ""} ${employee.last_name || ""}`.trim() || employee.employee_code || "" : "";
