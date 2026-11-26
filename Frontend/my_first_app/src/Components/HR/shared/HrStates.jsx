import React from "react";
import Icon from "../Attendance/Icon";
import "../Attendance/Attendance.css";

export function StatusPill({ tone, children }) {
  return (
    <span className={`att-status ${tone}`}>
      <span className="att-status-dot" />
      {children}
    </span>
  );
}

export function Loading() {
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

export function Empty({ title, copy, action, onAction }) {
  return (
    <section className="att-card att-empty">
      <span>
        <Icon name="search" size={24} />
      </span>
      <h3>{title}</h3>
      <p>{copy}</p>
      {action && (
        <button type="button" className="att-button secondary" onClick={onAction}>
          {action}
        </button>
      )}
    </section>
  );
}

export function ErrorBanner({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="att-banner" role="alert">
      <span>{message}</span>
      {onRetry && (
        <button type="button" className="att-button secondary" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

/** Section heading: eyebrow, title, description and the action buttons */
export function SectionHeading({ eyebrow, title, copy, children }) {
  return (
    <div className="att-heading">
      <div>
        <p className="att-eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p className="att-copy">{copy}</p>
      </div>
      <div className="att-actions">{children}</div>
    </div>
  );
}
