// Attendance API client — uses the existing Django endpoint as it is:
//   GET/POST/PATCH/DELETE  /hr/attendance/
import { authFetch, API } from "../../../Services/authFetch";

const ATTENDANCE_URL = `${API}/hr/attendance/`;

/** Turns a DRF error body into a readable message + per-field errors. */
function toError(data, status) {
  const fields = {};
  let message = "";

  if (data && typeof data === "object") {
    message = data.message || data.error || data.detail || "";
    Object.entries(data).forEach(([key, value]) => {
      if (["message", "error", "detail"].includes(key)) return;
      fields[key] = Array.isArray(value) ? value.join(" ") : String(value);
    });
  }

  if (!message) {
    message =
      fields.non_field_errors ||
      (Object.keys(fields).length ? "Please check the highlighted fields." : "") ||
      "Request failed. Please try again.";
  }

  const error = new Error(message);
  error.status = status;
  error.fields = fields;
  return error;
}

async function send(url, { method = "GET", body } = {}) {
  const options = { method, headers: { Accept: "application/json" } };

  if (body) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  const res = await authFetch(url, options);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) throw toError(data, res.status);
  return data;
}

/**
 * All attendance records of one employee.
 * The endpoint is paginated (max 100 per page) and has no date-range filter,
 * so every page is loaded and the month is filtered on the client.
 */
export async function fetchAttendance(employeeId) {
  const url = new URL(ATTENDANCE_URL);
  url.searchParams.set("employee_id", employeeId);
  url.searchParams.set("page_size", 100);

  const records = [];
  let next = url.toString();

  while (next) {
    const data = await send(next);
    records.push(...(Array.isArray(data.results) ? data.results : []));
    next = data.next || null;
  }

  return records;
}

export const createAttendance = (payload) => send(ATTENDANCE_URL, { method: "POST", body: payload });

export const updateAttendance = (payload) => send(ATTENDANCE_URL, { method: "PATCH", body: payload });

export const deleteAttendance = (attendanceId) =>
  send(ATTENDANCE_URL, { method: "DELETE", body: { attendance_id: attendanceId } });
