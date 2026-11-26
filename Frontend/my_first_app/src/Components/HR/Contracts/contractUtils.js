// Contract labels and formatting for the Contracts tab.

// Values match EmploymentContract.ContractType / ContractStatus in backend/apps/hr/models.py
export const CONTRACT_TYPES = [
  { value: "permanent", label: "Permanent" },
  { value: "fixed_term", label: "Fixed term" },
  { value: "temporary", label: "Temporary" },
  { value: "intern", label: "Intern" },
  { value: "contractor", label: "Contractor" },
];

export const CONTRACT_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "running", label: "Running" },
  { value: "expired", label: "Expired" },
  { value: "terminated", label: "Terminated" },
];

// The backend stores a 3-letter currency code (default EGP)
export const CURRENCIES = ["EGP", "USD", "EUR", "GBP", "SAR", "AED"].map((c) => ({ value: c, label: c }));

const STATUS_TONES = { running: "present", expired: "late", draft: "muted", terminated: "absent" };

export const labelOf = (list, value) => list.find((o) => o.value === value)?.label || value || "—";

export const statusTone = (status) => STATUS_TONES[status] || "muted";

/** "2024-08-12" -> "Aug 12, 2024" */
export const formatDate = (iso) => {
  if (!iso) return "—";
  const [y, m, d] = String(iso).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

/** (128000, "USD") -> "$128,000" ; (30000, "EGP") -> "EGP 30,000" */
export const formatMoney = (amount, currency) => {
  const value = Number(amount);
  if (!Number.isFinite(value)) return "—";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "EGP", maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(value);
  } catch {
    return `${value.toLocaleString("en-US")} ${currency || ""}`.trim();
  }
};

/** Running contract first, then newest start date first */
export const sortContracts = (list) =>
  [...list].sort((a, b) => {
    if ((a.status === "running") !== (b.status === "running")) return a.status === "running" ? -1 : 1;
    return a.start_date < b.start_date ? 1 : a.start_date > b.start_date ? -1 : 0;
  });

/**
 * There is no positions / schedules endpoint, so the choices come from the
 * position and schedule names already attached to contracts.
 */
export const collectChoices = (contracts) => {
  const positions = new Map();
  const schedules = new Map();
  contracts.forEach((c) => {
    if (c.position_id && c.position__title) positions.set(c.position_id, c.position__title);
    if (c.schedule_id && c.schedule__name) schedules.set(c.schedule_id, c.schedule__name);
  });
  const toOptions = (map) =>
    [...map.entries()].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
  return { positions: toOptions(positions), schedules: toOptions(schedules) };
};
