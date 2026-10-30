
import React, { useState } from "react";
import "./OpportunityDetails.css";
import NewActivity from "./NewActivity";

export default function OpportunityDetails({
  opportunity,
  notes = [],
  activities = [],
  onBack,
  onAddNote,
  onAddActivity,
}) {
  const [activeTab, setActiveTab] = useState("details");
  const [noteText, setNoteText] = useState("");
  const [noteError, setNoteError] = useState("");
  const [showActivityForm, setShowActivityForm] = useState(false);

  // Opportunity Information
  const details = {
    name: opportunity?.name || "Website Redesign",
    probability: opportunity?.probability ?? 70,
    contactInfo: opportunity?.contactInfo || "contact@acme.com",
    stage: opportunity?.stage || "Proposal",
    salesperson: opportunity?.salesperson || "John Doe",
    status: opportunity?.status || "Open",
    closingDate: opportunity?.closingDate || "May 30, 2026",
    revenue: opportunity?.revenue ?? opportunity?.value ?? 50000,
  };

  // Status Style
  const statusClass = {
    open: "status-open",
    won: "status-won",
    lost: "status-lost",
    closed: "status-closed",
  }[String(details.status).toLowerCase()] || "status-open";

  // Format Revenue
  const formatRevenue = (value) => {
    if (typeof value === "number") {
      return `$${value.toLocaleString("en-US")}`;
    }

    return value;
  };

  // Format Date
  const formatDate = (value) => {
    if (!value) return "Date not specified";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  // Add Note
  const handleSaveNote = () => {
    const note = noteText.trim();

    if (!note) {
      setNoteError("Please enter a note.");
      return;
    }

    onAddNote?.({
      opportunity,
      note,
    });

    setNoteText("");
    setNoteError("");
  };

  // Add Activity
  const handleSaveActivity = (activity) => {
    onAddActivity?.({
      opportunity,
      ...activity,
    });

    setShowActivityForm(false);
  };

  return (
    <main className="opportunity-details-page">

      {/* Back Button */}
      <div className="opportunity-back-row">
        <button
          type="button"
          className="opportunity-back-button"
          onClick={onBack}
        >
          <span className="opportunity-back-icon">«</span>
          <span>Back to Opportunities</span>
        </button>
      </div>

      {/* Page Heading */}
      <div className="opportunity-heading-row">

        <div className="opportunity-details-heading">
          <h1>Opportunities Details</h1>

          <p>
            View opportunity details, notes, and scheduled activity.
          </p>
        </div>

        {/* Add Activity Button */}
        {activeTab === "activities" && (
          <div className="opportunity-details-actions">
            <button
              type="button"
              className="opportunity-action-button"
              onClick={() => setShowActivityForm(true)}
            >
              Add Activity
            </button>
          </div>
        )}

      </div>

      {/* Main Card */}
      <section className="opportunity-main-card">

        {/* Tabs */}
        <div className="opportunity-main-tabs">

          {/* Details Tab */}
          <button
            type="button"
            className={`opportunity-main-tab ${
              activeTab === "details" ? "active" : ""
            }`}
            onClick={() => setActiveTab("details")}
          >
            Details
          </button>

          {/* Notes Tab */}
          <button
            type="button"
            className={`opportunity-main-tab ${
              activeTab === "notes" ? "active" : ""
            }`}
            onClick={() => setActiveTab("notes")}
          >
            Note Log
            <span>{notes.length}</span>
          </button>

          {/* Activity Log Tab */}
          <button
            type="button"
            className={`opportunity-main-tab ${
              activeTab === "activities" ? "active" : ""
            }`}
            onClick={() => setActiveTab("activities")}
          >
            Activity Log
            <span>{activities.length}</span>
          </button>

        </div>

        {/* =========================
            DETAILS TAB
        ========================= */}
        {activeTab === "details" && (
          <div className="opportunity-tab-content">

            <div className="opportunity-information-grid">

              <div className="opportunity-info-item">
                <span className="opportunity-info-label">
                  Opportunity name
                </span>

                <strong>{details.name}</strong>
              </div>

              <div className="opportunity-info-item">
                <span className="opportunity-info-label">
                  Probability
                </span>

                <strong>{details.probability}%</strong>
              </div>

              <div className="opportunity-info-item">
                <span className="opportunity-info-label">
                  Contact info
                </span>

                <strong>{details.contactInfo}</strong>
              </div>

              <div className="opportunity-info-item">
                <span className="opportunity-info-label">
                  Stage
                </span>

                <strong>{details.stage}</strong>
              </div>

              <div className="opportunity-info-item">
                <span className="opportunity-info-label">
                  Sales person
                </span>

                <strong>{details.salesperson}</strong>
              </div>

              <div className="opportunity-info-item">
                <span className="opportunity-info-label">
                  Status
                </span>

                <strong>
                  <span
                    className={`opportunity-status ${statusClass}`}
                  >
                    {details.status}
                  </span>
                </strong>
              </div>

              <div className="opportunity-info-item">
                <span className="opportunity-info-label">
                  Expected closing date
                </span>

                <strong>{details.closingDate}</strong>
              </div>

              <div className="opportunity-info-item">
                <span className="opportunity-info-label">
                  Revenue
                </span>

                <strong className="opportunity-revenue">
                  {formatRevenue(details.revenue)}
                </strong>
              </div>

            </div>
          </div>
        )}

        {/* =========================
            NOTES TAB
        ========================= */}
        {activeTab === "notes" && (
          <div className="opportunity-tab-content">

            {/* Add Note Input */}
            <div className="opportunity-add-note">

              <div className="opportunity-note-input-wrapper">
                <textarea
                  value={noteText}
                  onChange={(event) => {
                    setNoteText(event.target.value);
                    setNoteError("");
                  }}
                  placeholder="Write a note..."
                  rows={1}
                  aria-label="Write a note"
                />

                <button
                  type="button"
                  className="opportunity-note-send"
                  onClick={handleSaveNote}
                  aria-label="Send note"
                  title="Add Note"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 2 11 13" />
                    <path d="m22 2-7 20-4-9-9-4 20-7Z" />
                  </svg>
                </button>
              </div>

              {noteError && (
                <span className="opportunity-note-error">
                  {noteError}
                </span>
              )}

            </div>

            {/* Notes Log */}
            <div className="opportunity-log-list">

              {notes.length > 0 ? (
                [...notes].reverse().map((item, index) => (
                  <article
                    className="opportunity-log-item opportunity-note-item"
                    key={item.id || index}
                  >
                    {/* Note Text */}
                    <p className="opportunity-note-text">
                      {item.note}
                    </p>

                    {/* Note Date */}
                    <span className="opportunity-log-date">
                      {formatDate(item.createdAt)}
                    </span>
                  </article>
                ))
              ) : (
                <div className="opportunity-log-empty">
                  No notes added yet.
                </div>
              )}

            </div>

          </div>
        )}

        {/* =========================
            ACTIVITY LOG TAB
        ========================= */}
        {activeTab === "activities" && (
          <div className="opportunity-tab-content">

            <div className="opportunity-log-list">

              {activities.length > 0 ? (
                [...activities].reverse().map((item, index) => {

                  const activityTitle =
                    item.subject ||
                    item.title ||
                    "Activity";

                  const activityDescription =
                    item.description ||
                    item.notes ||
                    "";

                  const activityDate =
                    item.dateTime ||
                    item.scheduledAt ||
                    item.createdAt;

                  const activityType =
                    item.type ||
                    item.activityType ||
                    "";

                  return (
                    <article
                      className="opportunity-log-item opportunity-activity-item"
                      key={item.id || index}
                    >

                      {/* Activity Title and Description */}
                      <div className="opportunity-activity-content">

                        <strong className="opportunity-activity-title">
                          {activityTitle}
                        </strong>

                        {activityDescription && (
                          <p className="opportunity-activity-description">
                            {activityDescription}
                          </p>
                        )}

                      </div>

                      {/* Activity Date and Type */}
                      <div className="opportunity-activity-meta">

                        <span className="opportunity-log-date">
                          {formatDate(activityDate)}
                        </span>

                        {activityType && (
                          <span className="opportunity-activity-type">
                            {activityType}
                          </span>
                        )}

                      </div>

                    </article>
                  );
                })
              ) : (
                <div className="opportunity-log-empty">
                  No activities scheduled yet.
                </div>
              )}

            </div>

          </div>
        )}

      </section>

      {/* New Activity Modal */}
      {showActivityForm && (
        <NewActivity
          onClose={() => setShowActivityForm(false)}
          onSave={handleSaveActivity}
        />
      )}

    </main>
  );
}
