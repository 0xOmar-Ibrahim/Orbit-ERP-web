// Small client for the existing Django HR endpoints (/api/hr/...).
// Used by the Contracts and Skills tabs. The backend is used exactly as it is.
import { authFetch, API } from "../../../Services/authFetch";

const HR_URL = `${API}/api/hr`;

/** Turns a DRF error body into a readable message + per-field errors */
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
      (status >= 500 ? "Server error. Please try again." : "Request failed. Please try again.");
  }

  const error = new Error(message);
  error.status = status;
  error.fields = fields;
  return error;
}

/** hrRequest("contracts/", { method, body, query }) */
export async function hrRequest(path, { method = "GET", body, query } = {}) {
  const url = new URL(path.startsWith("http") ? path : `${HR_URL}/${path}`);
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
  });

  const options = { method, headers: { Accept: "application/json" } };
  if (body) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await authFetch(url.toString(), options);
  } catch (err) {
    if (err.message === "SESSION_EXPIRED") throw err;
    throw toError({ message: "Can't reach the server. Check your connection and try again." }, 0);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw toError(data, res.status);
  return data;
}

/** Loads every page of a paginated endpoint (page_size max is 100) */
export async function hrFetchAll(path, query = {}) {
  const rows = [];
  let next = null;
  let data = await hrRequest(path, { query: { ...query, page_size: 100 } });

  for (;;) {
    rows.push(...(Array.isArray(data.results) ? data.results : []));
    next = data.next;
    if (!next) break;
    data = await hrRequest(next);
  }

  return rows;
}

/** The signed-in employee from the HR page's outlet context */
export const employeeIdOf = (user) => user?.employee_id ?? user?.id ?? null;

export const fullName = (user) =>
  user ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.code || "Employee" : "Employee";
