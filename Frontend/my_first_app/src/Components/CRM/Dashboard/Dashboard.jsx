import React, { useCallback, useEffect, useMemo, useState } from "react";
import { authFetch, API } from "../../../Services/authFetch";
import "./Dashboard.css";

const OVERVIEW_URL = `${API}/crm/overview/`;
const OPPORTUNITIES_URL = `${API}/crm/opportunities/`;
const CUSTOMERS_URL = `${API}/crm/customers/`;
const EMPLOYEES_URL = `${API}/crm/employees/`;

const STAGES = ["lead", "qualified", "proposal", "negotiation", "closed"];
const STATUSES = ["open", "won", "lost"];

const EMPTY_FORM = {
  title: "",
  customer_id: "",
  employee_id: "",
  estimated_value: "",
  currency: "USD",
  stage: "lead",
  probability: "0",
  expected_close_date: "",
  status: "open",
  lost_reason: "",
};

function trimNumber(value) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function formatMoney(value) {
  const amount = Number(value) || 0;
  const sign = amount < 0 ? "-" : "";
  const absolute = Math.abs(amount);

  if (absolute >= 1_000_000) {
    return `${sign}$${trimNumber(absolute / 1_000_000)}M`;
  }

  if (absolute >= 1_000) {
    return `${sign}$${trimNumber(absolute / 1_000)}K`;
  }

  return `${sign}$${Math.round(absolute).toLocaleString("en-US")}`;
}

function formatOpportunityMoney(value, currency = "USD") {
  const amount = Number(value);

  if (!Number.isFinite(amount)) return "-";

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency || ""} ${amount.toLocaleString("en-US")}`.trim();
  }
}

function formatPercent(value) {
  const amount = Number(value) || 0;
  return `${Number.isInteger(amount) ? amount : amount.toFixed(1)}%`;
}

function formatUpdatedOn(date) {
  return (date || new Date()).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function percentOf(value, max) {
  const amount = Number(value) || 0;
  if (!max || amount <= 0) return 0;
  return Math.max(4, Math.round((amount / max) * 100));
}

function plural(count, singular, pluralLabel = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralLabel}`;
}

function getDisplayName(person) {
  if (!person) return "";

  return (
    person.name ||
    person.full_name ||
    [person.first_name, person.last_name].filter(Boolean).join(" ") ||
    person.employee_name ||
    ""
  );
}

function getCustomerName(opportunity) {
  const customer = opportunity.customer_details || opportunity.customer || {};

  return (
    customer.name ||
    [customer.first_name, customer.last_name].filter(Boolean).join(" ") ||
    opportunity.customer_name ||
    customer.company_name ||
    "-"
  );
}

function getCompanyName(opportunity) {
  const customer = opportunity.customer_details || opportunity.customer || {};

  return (
    customer.company_name ||
    opportunity.company_name ||
    customer.name ||
    ""
  );
}

function getOwnerName(opportunity) {
  const employee = opportunity.employee_details || opportunity.employee || {};

  return (
    getDisplayName(employee) ||
    opportunity.employee_name ||
    opportunity.owner_name ||
    "Unassigned"
  );
}

function getStageLabel(stage) {
  if (!stage) return "-";

  return String(stage)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getStatusLabel(status) {
  if (!status) return "-";

  return String(status)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

/*
 * Supports both a plain array response and common paginated responses:
 * { opportunities: [...] }, { results: [...] }, or { next, results: [...] }.
 */
async function fetchAllRecords(endpoint, possibleKeys) {
  let nextUrl = endpoint;
  let records = [];
  let pageCount = 0;

  while (nextUrl && pageCount < 50) {
    const response = await authFetch(nextUrl);
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        payload.detail ||
          payload.message ||
          payload.error ||
          `Request failed (${response.status}).`
      );
    }

    let pageRecords = [];

    if (Array.isArray(payload)) {
      pageRecords = payload;
      nextUrl = null;
    } else {
      for (const key of [...possibleKeys, "results", "data"]) {
        if (Array.isArray(payload?.[key])) {
          pageRecords = payload[key];
          break;
        }
      }

      nextUrl = payload?.next || null;
    }

    records = records.concat(pageRecords);
    pageCount += 1;
  }

  return records;
}

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [opportunities, setOpportunities] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [opportunitiesLoading, setOpportunitiesLoading] = useState(true);
  const [opportunitiesError, setOpportunitiesError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showNewDeal, setShowNewDeal] = useState(false);
  const [newDeal, setNewDeal] = useState(EMPTY_FORM);
  const [savingDeal, setSavingDeal] = useState(false);
  const [createError, setCreateError] = useState("");

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await authFetch(OVERVIEW_URL);
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload.detail ||
            payload.error ||
            `Unable to load dashboard (${response.status}).`
        );
      }

      setData(payload);
      setUpdatedAt(new Date());
    } catch (err) {
      if (err.message === "SESSION_EXPIRED") return;
      setData(null);
      setError(err.message || "Unable to load dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadOpportunities = useCallback(async () => {
    setOpportunitiesLoading(true);
    setOpportunitiesError("");

    try {
      const [opportunityRecords, customerRecords, employeeRecords] =
        await Promise.all([
          fetchAllRecords(OPPORTUNITIES_URL, ["opportunities", "Opportunities"]),
          fetchAllRecords(CUSTOMERS_URL, ["Customers", "customers"]),
          fetchAllRecords(EMPLOYEES_URL, ["Employees", "employees"]),
        ]);

      setOpportunities(opportunityRecords);
      setCustomers(customerRecords);
      setEmployees(employeeRecords);
    } catch (err) {
      if (err.message === "SESSION_EXPIRED") return;

      setOpportunitiesError(
        err.message || "Unable to load opportunities."
      );
    } finally {
      setOpportunitiesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
    loadOpportunities();
  }, [loadOverview, loadOpportunities]);

  const pipelineMax = useMemo(() => {
    const stages = data?.pipeline_by_stage || [];
    return Math.max(0, ...stages.map((stage) => Number(stage.value) || 0));
  }, [data]);

  const monthMax = useMemo(() => {
    const months = data?.expected_closings_by_month || [];

    return Math.max(
      0,
      ...months.flatMap((month) => [
        Number(month.deal_value) || 0,
        Number(month.weighted_value) || 0,
      ])
    );
  }, [data]);

  const salesMax = useMemo(() => {
    const team = data?.sales_team || [];
    return Math.max(0, ...team.map((member) => Number(member.won_value) || 0));
  }, [data]);

  const opportunityCount =
    (Number(data?.open_pipeline?.count) || 0) +
    (Number(data?.won?.count) || 0) +
    (Number(data?.win_ratio?.lost_count) || 0);

  const openDealCount = Number(data?.open_pipeline?.count) || 0;

  const owners = useMemo(() => {
    return [...new Set(opportunities.map(getOwnerName).filter(Boolean))].sort(
      (a, b) => a.localeCompare(b)
    );
  }, [opportunities]);

  const filteredOpportunities = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return opportunities.filter((opportunity) => {
      const customerName = getCustomerName(opportunity);
      const companyName = getCompanyName(opportunity);
      const ownerName = getOwnerName(opportunity);

      const matchesSearch =
        !search ||
        [
          opportunity.title,
          customerName,
          companyName,
          ownerName,
        ].some((value) => String(value || "").toLowerCase().includes(search));

      const matchesStage =
        stageFilter === "all" ||
        String(opportunity.stage || "").toLowerCase() === stageFilter;

      const matchesOwner =
        ownerFilter === "all" || ownerName === ownerFilter;

      const matchesStatus =
        statusFilter === "all" ||
        String(opportunity.status || "").toLowerCase() === statusFilter;

      return (
        matchesSearch &&
        matchesStage &&
        matchesOwner &&
        matchesStatus
      );
    });
  }, [
    opportunities,
    searchTerm,
    stageFilter,
    ownerFilter,
    statusFilter,
  ]);

  const handleNewDealChange = (event) => {
    const { name, value } = event.target;

    setNewDeal((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleCreateDeal = async (event) => {
    event.preventDefault();
    setCreateError("");

    if (!newDeal.title.trim()) {
      setCreateError("Please enter an opportunity title.");
      return;
    }

    if (!newDeal.customer_id) {
      setCreateError("Please select a customer.");
      return;
    }

    try {
      setSavingDeal(true);

      const payload = {
        title: newDeal.title.trim(),
        customer_id: Number(newDeal.customer_id),
        employee_id: newDeal.employee_id
          ? Number(newDeal.employee_id)
          : null,
        estimated_value:
          newDeal.estimated_value === ""
            ? 0
            : Number(newDeal.estimated_value),
        currency: newDeal.currency,
        stage: newDeal.stage.toLowerCase(),
        probability:
          newDeal.probability === ""
            ? null
            : Number(newDeal.probability),
        expected_close_date: newDeal.expected_close_date || null,
        status: newDeal.status.toLowerCase(),
        lost_reason: newDeal.lost_reason.trim(),
      };

      const response = await authFetch(OPPORTUNITIES_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.detail ||
            result.message ||
            result.error ||
            "Unable to create opportunity."
        );
      }

      setNewDeal(EMPTY_FORM);
      setShowNewDeal(false);

      await Promise.all([loadOpportunities(), loadOverview()]);
    } catch (err) {
      if (err.message === "SESSION_EXPIRED") return;

      setCreateError(err.message || "Unable to create opportunity.");
    } finally {
      setSavingDeal(false);
    }
  };

  return (
    <main className="crm-dashboard">
      <header className="dash-header">
        <div>
          <p className="dash-kicker">CEO MANAGEMENT PLATFORM</p>
          <h1>CRM overview</h1>
          <p className="dash-subtitle">
            {plural(opportunityCount, "opportunity", "opportunities")} · updated{" "}
            {formatUpdatedOn(updatedAt)}
          </p>
        </div>

        <button
          type="button"
          className="dash-refresh"
          onClick={() => {
            loadOverview();
            loadOpportunities();
          }}
          disabled={loading || opportunitiesLoading}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-2.3-6" />
            <path d="M21 3v6h-6" />
          </svg>
          Refresh data
        </button>
      </header>

      {error && (
        <p className="dash-error" role="alert">
          {error}{" "}
          <button type="button" onClick={loadOverview}>
            Retry
          </button>
        </p>
      )}

      <section className="dash-kpis" aria-label="CRM totals">
        <article className="dash-kpi dash-kpi-featured">
          <p>Open pipeline</p>
          <strong>
            {loading ? "—" : formatMoney(data?.open_pipeline?.value)}
          </strong>
          <span>{plural(openDealCount, "open deal")}</span>
        </article>

        <article className="dash-kpi">
          <p>Weighted forecast</p>
          <strong>
            {loading ? "—" : formatMoney(data?.weighted_forecast?.value)}
          </strong>
          <span>Value × probability</span>
        </article>

        <article className="dash-kpi">
          <p>Won</p>
          <strong>{loading ? "—" : formatMoney(data?.won?.value)}</strong>
          <span>{plural(Number(data?.won?.count) || 0, "deal")} closed</span>
        </article>

        <article className="dash-kpi">
          <p>Win ratio</p>
          <strong>
            {loading ? "—" : formatPercent(data?.win_ratio?.percentage)}
          </strong>
          <span>
            {Number(data?.win_ratio?.won_count) || 0} won,{" "}
            {Number(data?.win_ratio?.lost_count) || 0} lost
          </span>
        </article>

        <article className="dash-kpi">
          <p>Past expected close</p>
          <strong className="dash-positive">
            {loading ? "—" : Number(data?.past_expected_close?.count) || 0}
          </strong>
          <span>Open due to update</span>
        </article>
      </section>

      <section className="dash-panels">
        <article className="dash-panel">
          <div className="dash-panel-head">
            <h2>Open pipeline by stage</h2>
            <span>{plural(openDealCount, "deal")}</span>
          </div>

          <div className="dash-pipeline">
            {(data?.pipeline_by_stage || []).length === 0 && !loading ? (
              <p className="dash-empty">No open deals in the pipeline.</p>
            ) : (
              (data?.pipeline_by_stage || []).map((stage) => (
                <div className="dash-pipe-row" key={stage.stage}>
                  <div className="dash-pipe-meta">
                    <strong>{stage.label}</strong>
                    <span>{plural(Number(stage.count) || 0, "deal")}</span>
                  </div>

                  <div className="dash-pipe-track">
                    <div
                      className="dash-pipe-fill"
                      style={{
                        width: `${percentOf(stage.value, pipelineMax)}%`,
                      }}
                    />
                  </div>

                  <span className="dash-pipe-amount">
                    {formatMoney(stage.value)}
                  </span>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="dash-panel">
          <div className="dash-panel-head">
            <h2>Expected closings by month</h2>
            <span className="dash-legend">
              <i className="dash-dot deal" /> Deal value
              <i className="dash-dot weighted" /> Weighted by probability
            </span>
          </div>

          <div
            className="dash-months"
            role="img"
            aria-label="Expected closings by month"
          >
            {(data?.expected_closings_by_month || []).length === 0 &&
            !loading ? (
              <p className="dash-empty">
                No expected closings in this period.
              </p>
            ) : (
              (data?.expected_closings_by_month || []).map((month) => (
                <div className="dash-month" key={month.month}>
                  <span className="dash-month-value">
                    {formatMoney(month.deal_value)}
                  </span>

                  <div className="dash-month-bars">
                    <div
                      className="dash-month-bar deal"
                      style={{
                        height: `${percentOf(month.deal_value, monthMax)}%`,
                      }}
                    />
                    <div
                      className="dash-month-bar weighted"
                      style={{
                        height: `${percentOf(month.weighted_value, monthMax)}%`,
                      }}
                    />
                  </div>

                  <span className="dash-month-label">{month.label}</span>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="dash-panel">
          <div className="dash-panel-head">
            <h2>Sales team</h2>
            <span>Won value</span>
          </div>

          <div className="dash-sales">
            {(data?.sales_team || []).length === 0 && !loading ? (
              <p className="dash-empty">
                No won deals to rank the team yet.
              </p>
            ) : (
              (data?.sales_team || []).map((member) => (
                <div className="dash-sales-row" key={member.employee_id}>
                  <span className="dash-sales-name">
                    {member.employee_name?.trim() || "Unassigned"}
                  </span>

                  <div className="dash-sales-track">
                    <div
                      className="dash-sales-fill"
                      style={{
                        width: `${percentOf(member.won_value, salesMax)}%`,
                      }}
                    />
                  </div>

                  <span className="dash-sales-amount">
                    {formatMoney(member.won_value)}
                  </span>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      {/* OPPORTUNITIES TABLE */}
      <section className="dash-opportunities">
        <div className="dash-opportunities-header">
          <div className="dash-opportunities-title">
            <h2>Opportunities</h2>
            <span>
              {opportunitiesLoading
                ? "Loading deals..."
                : `${filteredOpportunities.length} of ${opportunities.length} deals`}
            </span>
          </div>

          <button
            type="button"
            className="dash-new-deal"
            onClick={() => {
              setCreateError("");
              setNewDeal(EMPTY_FORM);
              setShowNewDeal(true);
            }}
          >
            <span aria-hidden="true">+</span>
            New deal
          </button>
        </div>

        <div className="dash-opportunity-filters">
          <div className="dash-opportunity-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              placeholder="Search title, customer or company"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              aria-label="Search opportunities"
            />
          </div>

          <select
            value={stageFilter}
            onChange={(event) => setStageFilter(event.target.value)}
            aria-label="Filter by stage"
          >
            <option value="all">All stages</option>
            {STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {getStageLabel(stage)}
              </option>
            ))}
          </select>

          <select
            value={ownerFilter}
            onChange={(event) => setOwnerFilter(event.target.value)}
            aria-label="Filter by owner"
          >
            <option value="all">All owners</option>
            {owners.map((owner) => (
              <option key={owner} value={owner}>
                {owner}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {getStatusLabel(status)}
              </option>
            ))}
          </select>
        </div>

        {opportunitiesError && (
          <p className="dash-opportunity-error" role="alert">
            {opportunitiesError}{" "}
            <button type="button" onClick={loadOpportunities}>
              Retry
            </button>
          </p>
        )}

        <div className="dash-opportunity-table-scroll">
          <table className="dash-opportunity-table">
            <thead>
              <tr>
                <th>Opportunity</th>
                <th>Stage</th>
                <th>Value</th>
                <th>Probability</th>
                <th>Expected close</th>
                <th>Owner</th>
                <th>Status</th>
                <th aria-label="Details" />
              </tr>
            </thead>

            <tbody>
              {opportunitiesLoading ? (
                <tr>
                  <td colSpan="8" className="dash-opportunity-empty">
                    Loading opportunities...
                  </td>
                </tr>
              ) : filteredOpportunities.length === 0 ? (
                <tr>
                  <td colSpan="8" className="dash-opportunity-empty">
                    {opportunities.length === 0
                      ? "No opportunities found."
                      : "No opportunities match your search or filters."}
                  </td>
                </tr>
              ) : (
                filteredOpportunities.map((opportunity) => {
                  const probability = Math.min(
                    100,
                    Math.max(0, Number(opportunity.probability) || 0)
                  );

                  const companyName = getCompanyName(opportunity);

                  return (
                    <tr key={opportunity.opportunity_id}>
                      <td>
                        <div className="dash-opportunity-name">
                          <strong>{opportunity.title || "Untitled deal"}</strong>
                          <span>
                            {companyName || getCustomerName(opportunity)}
                          </span>
                        </div>
                      </td>

                      <td>
                        <span
                          className={`dash-stage-badge stage-${String(
                            opportunity.stage || ""
                          ).toLowerCase()}`}
                        >
                          {getStageLabel(opportunity.stage)}
                        </span>
                      </td>

                      <td className="dash-opportunity-value">
                        {formatOpportunityMoney(
                          opportunity.estimated_value,
                          opportunity.currency
                        )}
                      </td>

                      <td>
                        <div className="dash-probability">
                          <div className="dash-probability-track">
                            <span
                              style={{ width: `${probability}%` }}
                            />
                          </div>
                          <span>{formatPercent(probability)}</span>
                        </div>
                      </td>

                      <td>{formatDate(opportunity.expected_close_date)}</td>
                      <td>{getOwnerName(opportunity)}</td>

                      <td>
                        <span
                          className={`dash-status status-${String(
                            opportunity.status || ""
                          ).toLowerCase()}`}
                        >
                          <i />
                          {getStatusLabel(opportunity.status)}
                        </span>
                      </td>

                      <td className="dash-opportunity-arrow">→</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* NEW DEAL FORM */}
      {showNewDeal && (
        <div
          className="dash-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !savingDeal) {
              setShowNewDeal(false);
            }
          }}
        >
          <section
            className="dash-new-deal-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dash-new-deal-title"
          >
            <div className="dash-modal-header">
              <div>
                <h2 id="dash-new-deal-title">Create new deal</h2>
                <p>Add a new opportunity to your sales pipeline.</p>
              </div>

              <button
                type="button"
                onClick={() => setShowNewDeal(false)}
                disabled={savingDeal}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateDeal}>
              <label>
                Opportunity title *
                <input
                  name="title"
                  value={newDeal.title}
                  onChange={handleNewDealChange}
                  placeholder="Enter opportunity title"
                  required
                />
              </label>

              <label>
                Customer *
                <select
                  name="customer_id"
                  value={newDeal.customer_id}
                  onChange={handleNewDealChange}
                  required
                >
                  <option value="">Select customer</option>
                  {customers.map((customer) => {
                    const id = customer.customer_id ?? customer.id;

                    return (
                      <option key={id} value={id}>
                        {getDisplayName(customer) ||
                          customer.company_name ||
                          customer.customer_code ||
                          `Customer ${id}`}
                      </option>
                    );
                  })}
                </select>
              </label>

              <label>
                Owner
                <select
                  name="employee_id"
                  value={newDeal.employee_id}
                  onChange={handleNewDealChange}
                >
                  <option value="">Unassigned</option>
                  {employees.map((employee) => {
                    const id = employee.employee_id ?? employee.id;

                    return (
                      <option key={id} value={id}>
                        {getDisplayName(employee) || `Employee ${id}`}
                      </option>
                    );
                  })}
                </select>
              </label>

              <div className="dash-form-grid">
                <label>
                  Estimated value
                  <input
                    type="number"
                    name="estimated_value"
                    min="0"
                    step="0.01"
                    value={newDeal.estimated_value}
                    onChange={handleNewDealChange}
                    placeholder="0"
                  />
                </label>

                <label>
                  Currency
                  <select
                    name="currency"
                    value={newDeal.currency}
                    onChange={handleNewDealChange}
                  >
                    <option value="USD">USD</option>
                    <option value="EGP">EGP</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </label>
              </div>

              <div className="dash-form-grid">
                <label>
                  Stage
                  <select
                    name="stage"
                    value={newDeal.stage}
                    onChange={handleNewDealChange}
                  >
                    {STAGES.map((stage) => (
                      <option key={stage} value={stage}>
                        {getStageLabel(stage)}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Status
                  <select
                    name="status"
                    value={newDeal.status}
                    onChange={handleNewDealChange}
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {getStatusLabel(status)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="dash-form-grid">
                <label>
                  Probability (%)
                  <input
                    type="number"
                    name="probability"
                    min="0"
                    max="100"
                    value={newDeal.probability}
                    onChange={handleNewDealChange}
                  />
                </label>

                <label>
                  Expected close date
                  <input
                    type="date"
                    name="expected_close_date"
                    value={newDeal.expected_close_date}
                    onChange={handleNewDealChange}
                  />
                </label>
              </div>

              {newDeal.status === "lost" && (
                <label>
                  Lost reason
                  <input
                    name="lost_reason"
                    value={newDeal.lost_reason}
                    onChange={handleNewDealChange}
                    placeholder="Enter reason"
                  />
                </label>
              )}

              {createError && (
                <p className="dash-create-error" role="alert">
                  {createError}
                </p>
              )}

              <div className="dash-modal-actions">
                <button
                  type="button"
                  className="dash-cancel-button"
                  onClick={() => setShowNewDeal(false)}
                  disabled={savingDeal}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="dash-save-button"
                  disabled={savingDeal}
                >
                  {savingDeal ? "Creating..." : "Create deal"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
};

export default Dashboard;