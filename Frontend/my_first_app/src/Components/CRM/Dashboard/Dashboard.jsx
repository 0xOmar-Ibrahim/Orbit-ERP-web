import React, { useCallback, useEffect, useMemo, useState } from "react";
import { authFetch, API } from "../../../Services/authFetch";
import "./Dashboard.css";

const OVERVIEW_URL = `${API}/crm/overview/`;

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

function percentOf(value, max) {
  const amount = Number(value) || 0;
  if (!max || amount <= 0) return 0;
  return Math.max(4, Math.round((amount / max) * 100));
}

function plural(count, singular, pluralLabel = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralLabel}`;
}

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await authFetch(OVERVIEW_URL);
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload.detail || payload.error || `Unable to load dashboard (${response.status}).`
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

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

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
          onClick={loadOverview}
          disabled={loading}
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
          <strong>{loading ? "—" : formatMoney(data?.open_pipeline?.value)}</strong>
          <span>{plural(openDealCount, "open deal")}</span>
        </article>

        <article className="dash-kpi">
          <p>Weighted forecast</p>
          <strong>{loading ? "—" : formatMoney(data?.weighted_forecast?.value)}</strong>
          <span>Value × probability</span>
        </article>

        <article className="dash-kpi">
          <p>Won</p>
          <strong>{loading ? "—" : formatMoney(data?.won?.value)}</strong>
          <span>{plural(Number(data?.won?.count) || 0, "deal")} closed</span>
        </article>

        <article className="dash-kpi">
          <p>Win ratio</p>
          <strong>{loading ? "—" : formatPercent(data?.win_ratio?.percentage)}</strong>
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
                  <span className="dash-pipe-amount">{formatMoney(stage.value)}</span>
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

          <div className="dash-months" role="img" aria-label="Expected closings by month">
            {(data?.expected_closings_by_month || []).length === 0 && !loading ? (
              <p className="dash-empty">No expected closings in this period.</p>
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
              <p className="dash-empty">No won deals to rank the team yet.</p>
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
    </main>
  );
};

export default Dashboard;
