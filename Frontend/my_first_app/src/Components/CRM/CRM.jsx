import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./CRM.css";

import NewOpportunity from "./NewOpportunity";
import NewCustomer from "./NewCustomer";
import NewContact from "./NewContact";
import NewLeadSource from "./NewLeadSource";
import OpportunityDetails from "./OpportunityDetails";
import { authFetch, API } from "../../Utils/authFetch";

const CRM_URL = `${API}/crm`;

const STAGES = ["Lead", "Qualified", "Proposal", "Negotiation", "Closed"];

const cap = (s = "") => s.charAt(0).toUpperCase() + s.slice(1);

const ACTIVITY_FROM_API = {
  call: "Call",
  email: "Mail",
  meeting: "Meeting",
};

const ACTIVITY_TO_API = {
  Call: "call",
  Mail: "email",
  Meeting: "meeting",
};

async function call(path, { method = "GET", body } = {}) {
  const res = await authFetch(`${CRM_URL}/${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });

  

  const responseText = await res.text();

  let data = null;

  try {
    data = responseText ? JSON.parse(responseText) : null;
  } catch {
    data = responseText;
  }

  if (!res.ok) {
    let message = "";

    if (data && typeof data === "object") {
      if (data.detail) {
        message = data.detail;
      } else if (data.error) {
        message = data.error;
      } else {
        message = Object.entries(data)
          .map(([field, errors]) => {
            const errorText = Array.isArray(errors)
              ? errors.join(", ")
              : typeof errors === "object"
              ? JSON.stringify(errors)
              : String(errors);

            return `${field}: ${errorText}`;
          })
          .join(" | ");
      }
    } else if (typeof data === "string") {
      message = data;
    }

    throw new Error(message || `Server error (${res.status}).`);
  }

  return data;
}
async function callAuth(path) {
  const res = await authFetch(`${API}/api/auth/${path}`);

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data?.detail || data?.error || "Unable to load employees."
    );
  }

  return data;
}

const toUiOpportunity = (o) => ({
  id: o.opportunity_id,
  name: o.title,
  description: o.customer_details
    ? `Customer: ${
        o.customer_details.company_name || o.customer_details.name || ""
      }`
    : "",
  stage: cap(o.stage),
  status: cap(o.status),
  value: Number(o.estimated_value) || 0,
  revenue: Number(o.estimated_value) || 0,
  probability: o.probability,
  contactInfo: o.customer_details?.email || o.customer_details?.phone || "",
  salesperson: o.employee_details?.name || "",
  closingDate: o.expected_close_date || "",
  customerId: o.customer_id,
  employeeId: o.employee_id,
  lostReason: o.lost_reason || "",
});

const toUiNotes = (list = []) =>
  [...list]
    .map((n) => ({
      id: n.note_id,
      note: n.note_text,
      createdAt: n.created_at,
    }))
    .reverse();

const toUiActivities = (list = []) =>
  [...list]
    .map((i) => ({
      id: i.interaction_id,
      type: ACTIVITY_FROM_API[i.type] || i.type,
      subject: i.subject,
      description: i.description,
      dateTime: i.interaction_date,
    }))
    .reverse();

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

function CRM() {
  const [opportunities, setOpportunities] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const [view, setView] = useState("cards");
  const [search, setSearch] = useState("");

  const [draggedId, setDraggedId] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);

  const [activeForm, setActiveForm] = useState(null);
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [pendingClose, setPendingClose] = useState(null);
  const [closeStatus, setCloseStatus] = useState("won");
  const [lostReason, setLostReason] = useState("");
  const [closing, setClosing] = useState(false);

  const [selectedOpportunityId, setSelectedOpportunityId] = useState(null);

  const [customers, setCustomers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [leadSources, setLeadSources] = useState([]);
  const [salespeople, setSalespeople] = useState([]);

  const [notes, setNotes] = useState([]);
  const [activities, setActivities] = useState([]);

  const selectedOpportunity = useMemo(
    () =>
      opportunities.find(
        (item) => String(item.id) === String(selectedOpportunityId)
      ) || null,
    [opportunities, selectedOpportunityId]
  );

  const filteredOpportunities = useMemo(() => {
    const query = search.trim().toLowerCase();

    return opportunities.filter((item) =>
      `${item.name || ""} ${item.description || ""} ${item.stage || ""}`
        .toLowerCase()
        .includes(query)
    );
  }, [opportunities, search]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    setActionError("");
    setActionSuccess("");

    try {
      const [opps, custs, cts, sources, employeeResponse] = await Promise.all([
        call("opportunities/?startrange=0&endrange=500"),
        call("customers/"),
        call("contacts/"),
        call("lead-sources/"),
        callAuth("employees/"),
      ]);

      const opportunityList = Array.isArray(opps?.opportunities)
        ? opps.opportunities
        : Array.isArray(opps?.results)
        ? opps.results
        : [];

      // Extract unique employees from opportunity data
      setSalespeople(
        (employeeResponse?.employees || []).map((employee) => ({
          ...employee,
          name: `${employee.first_name || ""} ${
            employee.last_name || ""
          }`.trim(),
        }))
      );

      setOpportunities(opportunityList.map(toUiOpportunity));

      setCustomers(Array.isArray(custs?.Customers) ? custs.Customers : []);

      setContacts(Array.isArray(cts?.Contacts) ? cts.Contacts : []);

      setLeadSources(
        Array.isArray(sources?.LeadSources)
          ? sources.LeadSources.filter((source) => source.is_active)
          : []
      );
    } catch (err) {
      console.error("CRM loading error:", err);
      setLoadError(err.message || "Unable to load CRM data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  /* ---------------------------------------------------------------- */
  /* Load notes and interactions                                       */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (!selectedOpportunity) {
      setNotes([]);
      setActivities([]);
      return;
    }

    let cancelled = false;

    const loadDetails = async () => {
      setActionError("");

      try {
        const [notesResponse, interactionsResponse] = await Promise.all([
          call(`customer-notes/?customer_id=${selectedOpportunity.customerId}`),
          call("interactions/"),
        ]);

        if (cancelled) return;

        setNotes(toUiNotes(notesResponse?.notes || []));

        // Filter interactions in the frontend instead of assuming
        // the backend supports an opportunity_id query parameter.
        const opportunityInteractions = (
          interactionsResponse?.Interactions || []
        ).filter(
          (interaction) =>
            String(interaction.opportunity_id) ===
            String(selectedOpportunity.id)
        );

        setActivities(toUiActivities(opportunityInteractions));
      } catch (err) {
        if (!cancelled) {
          setActionError(err.message || "Unable to load opportunity details.");
        }
      }
    };

    loadDetails();

    return () => {
      cancelled = true;
    };
  }, [
    selectedOpportunityId,
    selectedOpportunity?.customerId,
    selectedOpportunity?.id,
  ]);

  /* ---------------------------------------------------------------- */
  /* Opportunity helpers                                               */
  /* ---------------------------------------------------------------- */

  const replaceOpportunity = (updated) => {
    if (!updated) return;

    setOpportunities((previous) =>
      previous.map((item) =>
        String(item.id) === String(updated.id) ? updated : item
      )
    );
  };

  /* ---------------------------------------------------------------- */
  /* Move opportunity                                                  */
  /* ---------------------------------------------------------------- */

  const moveOpportunity = async (id, newStage) => {
    const item = opportunities.find(
      (opportunity) => String(opportunity.id) === String(id)
    );

    if (!item || item.stage === newStage) return;

    setActionError("");
    setActionSuccess("");

    if (newStage === "Closed") {
      setPendingClose({
        id,
        name: item.name,
      });

      setCloseStatus("won");
      setLostReason("");
      return;
    }

    try {
      const data = await call("opportunities/", {
        method: "PATCH",
        body: {
          opportunity_id: id,
          stage: newStage.toLowerCase(),
          status: "open",
        },
      });

      if (data?.opportunity) {
        replaceOpportunity(toUiOpportunity(data.opportunity));
      }

      setActionSuccess("Opportunity stage updated.");
    } catch (err) {
      setActionError(err.message);
    }
  };

  /* ---------------------------------------------------------------- */
  /* Close opportunity                                                 */
  /* ---------------------------------------------------------------- */

  const cancelClose = () => {
    if (closing) return;

    setPendingClose(null);
    setCloseStatus("won");
    setLostReason("");
    setActionError("");
  };

  const confirmClose = async () => {
    if (!pendingClose || closing) return;

    if (closeStatus === "lost" && !lostReason.trim()) {
      setActionError("Please enter the reason for losing this deal.");
      return;
    }

    setClosing(true);
    setActionError("");

    try {
      const body = {
        opportunity_id: pendingClose.id,
        stage: "closed",
        status: closeStatus,
      };

      if (closeStatus === "lost") {
        body.lost_reason = lostReason.trim();
      }

      const data = await call("opportunities/", {
        method: "PATCH",
        body,
      });

      if (data?.opportunity) {
        replaceOpportunity(toUiOpportunity(data.opportunity));
      }

      setPendingClose(null);
      setCloseStatus("won");
      setLostReason("");
      setActionSuccess("Opportunity closed successfully.");
    } catch (err) {
      setActionError(err.message);
    } finally {
      setClosing(false);
    }
  };

  /* ---------------------------------------------------------------- */
  /* Delete opportunity                                                */
  /* ---------------------------------------------------------------- */

  const requestDeleteOpportunity = (item) => {
    setActionError("");
    setActionSuccess("");

    setPendingDelete({
      id: item.id,
      name: item.name,
    });
  };

  const cancelDeleteOpportunity = () => {
    if (deleting) return;
    setPendingDelete(null);
  };

  const confirmDeleteOpportunity = async () => {
    if (!pendingDelete || deleting) return;

    setDeleting(true);
    setActionError("");

    try {
      await call(`opportunities/?opportunity_id=${pendingDelete.id}`, {
        method: "DELETE",
      });

      setOpportunities((previous) =>
        previous.filter((item) => String(item.id) !== String(pendingDelete.id))
      );

      setSelectedOpportunityId((currentId) =>
        String(currentId) === String(pendingDelete.id) ? null : currentId
      );

      setPendingDelete(null);
      setActionSuccess("Opportunity deleted successfully.");
    } catch (err) {
      setActionError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  /* ---------------------------------------------------------------- */
  /* Opportunity details                                               */
  /* ---------------------------------------------------------------- */

  const openOpportunityDetails = (item) => {
    setActionError("");
    setActionSuccess("");
    setSelectedOpportunityId(item.id);
  };

  const closeOpportunityDetails = () => {
    setSelectedOpportunityId(null);
    setNotes([]);
    setActivities([]);
    setActionError("");
  };

  /* ---------------------------------------------------------------- */
  /* Add customer note                                                 */
  /* ---------------------------------------------------------------- */

  const handleAddNote = async ({ opportunity, note }) => {
    setActionError("");
    setActionSuccess("");

    const noteText = note?.trim();

    if (!noteText) {
      throw new Error("Please enter a note.");
    }

    try {
      const data = await call("customer-notes/", {
        method: "POST",
        body: {
          customer_id: opportunity.customerId,
          note_text: noteText,
        },
      });

      if (data?.note) {
        setNotes((previous) => [
          ...previous,
          {
            id: data.note.note_id,
            note: data.note.note_text,
            createdAt: data.note.created_at,
          },
        ]);
      } else {
        const refreshed = await call(
          `customer-notes/?customer_id=${opportunity.customerId}`
        );

        setNotes(toUiNotes(refreshed?.notes || []));
      }

      setActionSuccess("Note added successfully.");
    } catch (err) {
      setActionError(err.message);
      throw err;
    }
  };

  /* ---------------------------------------------------------------- */
  /* Add interaction                                                   */
  /* ---------------------------------------------------------------- */

  const handleAddActivity = async ({
    opportunity,
    type,
    subject,
    description,
    dateTime,
  }) => {
    setActionError("");
    setActionSuccess("");

    const apiType = ACTIVITY_TO_API[type];

    if (!apiType) {
      throw new Error("Invalid interaction type.");
    }

    try {
      await call("interactions/", {
        method: "POST",
        body: {
          type: apiType,
          subject,
          description,
          interaction_date: dateTime,
          customer_id: opportunity.customerId,
          employee_id: opportunity.employeeId,
          opportunity_id: opportunity.id,
        },
      });

      const response = await call("interactions/");

      const opportunityInteractions = (response?.Interactions || []).filter(
        (interaction) =>
          String(interaction.opportunity_id) === String(opportunity.id)
      );

      setActivities(toUiActivities(opportunityInteractions));

      setActionSuccess("Activity added successfully.");
    } catch (err) {
      setActionError(err.message);
      throw err;
    }
  };

  /* ---------------------------------------------------------------- */
  /* Drag and drop                                                     */
  /* ---------------------------------------------------------------- */

  const handleDragStart = (event, id) => {
    setDraggedId(id);

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(id));
  };

  const handleDrop = (event, stage) => {
    event.preventDefault();

    const id = Number(event.dataTransfer.getData("text/plain")) || draggedId;

    if (id !== null) {
      moveOpportunity(id, stage);
    }

    setDraggedId(null);
    setDragOverStage(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverStage(null);
  };

  /* ---------------------------------------------------------------- */
  /* Selected opportunity details page                                 */
  /* ---------------------------------------------------------------- */

  if (selectedOpportunity) {
    return (
      <>
        {actionError && (
          <p className="crm-error-message" role="alert">
            {actionError}
          </p>
        )}

        <OpportunityDetails
          opportunity={{
            ...selectedOpportunity,
            revenue:
              selectedOpportunity.revenue ?? selectedOpportunity.value ?? 0,
          }}
          notes={notes}
          activities={activities}
          onBack={closeOpportunityDetails}
          onAddNote={handleAddNote}
          onAddActivity={handleAddActivity}
        />
      </>
    );
  }

  /* ---------------------------------------------------------------- */
  /* Main page                                                         */
  /* ---------------------------------------------------------------- */

  return (
    <main className="crm-page">
      {/* Header */}
      <header className="crm-header">
        <div className="crm-heading">
          <div className="crm-breadcrumb">WORKSPACE / SALES</div>

          <h1>Opportunities</h1>

          <p>Track and manage your sales pipeline.</p>
        </div>

        <div className="crm-header-actions">
          <div className="crm-create-dropdown">
            <button
              type="button"
              className="crm-button crm-button-primary"
              onClick={() => setShowCreateMenu((previous) => !previous)}
              aria-expanded={showCreateMenu}
            >
              <span className="crm-plus">+</span>
              Create New
              <span
                className={`crm-dropdown-arrow ${showCreateMenu ? "open" : ""}`}
              >
                ▾
              </span>
            </button>

            {showCreateMenu && (
              <div className="crm-create-menu">
                <button
                  type="button"
                  onClick={() => {
                    setActiveForm("opportunity");
                    setShowCreateMenu(false);
                  }}
                >
                  New Opportunity
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveForm("contact");
                    setShowCreateMenu(false);
                  }}
                >
                  New Contact
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveForm("customer");
                    setShowCreateMenu(false);
                  }}
                >
                  New Customer
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            className="crm-button crm-button-primary"
            onClick={() => setActiveForm("leadSource")}
          >
            <span className="crm-plus">+</span>
            New Lead Source
          </button>
        </div>
      </header>

      {/* Loading and error messages */}
      {loading && <p className="crm-results">Loading...</p>}

      {loadError && (
        <p className="crm-error-message" role="alert">
          {loadError}{" "}
          <button type="button" onClick={loadAll}>
            Retry
          </button>
        </p>
      )}

      {actionError && !pendingClose && (
        <p className="crm-error-message" role="alert">
          {actionError}
        </p>
      )}

      {actionSuccess && (
        <p className="crm-success-message" role="status">
          {actionSuccess}
        </p>
      )}

      {/* Toolbar */}
      <section className="crm-toolbar">
        <label className="crm-search">
          <span className="crm-search-icon" aria-hidden="true">
            ⌕
          </span>

          <input
            type="search"
            placeholder="Search opportunities..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search opportunities"
          />
        </label>

        <div className="crm-view-switch" aria-label="Change view">
          <button
            type="button"
            className={view === "cards" ? "active" : ""}
            onClick={() => setView("cards")}
            title="Cards view"
            aria-label="Cards view"
            aria-pressed={view === "cards"}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="4" y="4" width="6" height="6" rx="1" />
              <rect x="14" y="4" width="6" height="6" rx="1" />
              <rect x="4" y="14" width="6" height="6" rx="1" />
              <rect x="14" y="14" width="6" height="6" rx="1" />
            </svg>
          </button>

          <button
            type="button"
            className={view === "rows" ? "active" : ""}
            onClick={() => setView("rows")}
            title="Rows view"
            aria-label="Rows view"
            aria-pressed={view === "rows"}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 5h11M9 12h11M9 19h11" />
              <circle cx="4" cy="5" r="1" />
              <circle cx="4" cy="12" r="1" />
              <circle cx="4" cy="19" r="1" />
            </svg>
          </button>
        </div>
      </section>

      {/* Cards View */}
      {view === "cards" ? (
        <section className="crm-kanban" aria-label="Opportunity stages">
          {STAGES.map((stage, index) => {
            const stageItems = filteredOpportunities.filter(
              (item) => item.stage === stage
            );

            return (
              <div
                className={`crm-column ${
                  dragOverStage === stage ? "drag-over" : ""
                }`}
                key={stage}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setDragOverStage(stage);
                }}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) {
                    setDragOverStage(null);
                  }
                }}
                onDrop={(event) => handleDrop(event, stage)}
              >
                <div className="crm-column-heading">
                  <div className="crm-stage-title">
                    <span className="crm-stage-number">{index + 1}</span>

                    <h2>{stage}</h2>
                  </div>

                  <span className="crm-stage-count">{stageItems.length}</span>
                </div>

                <div className="crm-column-cards">
                  {stageItems.map((item) => (
                    <article
                      className={`crm-opportunity-card ${
                        draggedId === item.id ? "is-dragging" : ""
                      }`}
                      key={item.id}
                      draggable
                      onDragStart={(event) => handleDragStart(event, item.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => openOpportunityDetails(item)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openOpportunityDetails(item);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="crm-card-top">
                        <h3>{item.name}</h3>

                        <div className="crm-card-actions">
                          <button
                            type="button"
                            className="crm-delete-button"
                            title="Delete opportunity"
                            aria-label={`Delete ${item.name}`}
                            onMouseDown={(event) => event.stopPropagation()}
                            onDragStart={(event) => event.preventDefault()}
                            onClick={(event) => {
                              event.stopPropagation();
                              requestDeleteOpportunity(item);
                            }}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M3 6h18" />
                              <path d="M8 6V4h8v2" />
                              <path d="m19 6-1 14H6L5 6" />
                              <path d="M10 11v5M14 11v5" />
                            </svg>
                          </button>

                          <span
                            className="crm-drag-indicator"
                            title="Drag to move"
                            aria-hidden="true"
                          >
                            ⠿
                          </span>
                        </div>
                      </div>

                      <p className="crm-card-description">
                        {item.description || "No description"}
                      </p>

                      <div className="crm-card-footer">
                        <span className="crm-card-stage">{stage}</span>
                      </div>

                      <div className="crm-card-move">
                        <label htmlFor={`move-${item.id}`}>Move to</label>

                        <select
                          id={`move-${item.id}`}
                          value={item.stage}
                          onChange={(event) =>
                            moveOpportunity(item.id, event.target.value)
                          }
                          onMouseDown={(event) => event.stopPropagation()}
                          onClick={(event) => event.stopPropagation()}
                        >
                          {STAGES.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                    </article>
                  ))}

                  {stageItems.length === 0 && (
                    <div className="crm-empty-column">
                      {search
                        ? "No matching opportunities"
                        : "Drop an opportunity here"}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      ) : (
        /* Rows View */
        <section className="crm-table-wrapper">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Opportunity</th>
                <th>Description</th>
                <th>Stage</th>
                <th>Move to</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredOpportunities.map((item) => (
                <tr key={item.id}>
                  <td
                    className="crm-table-name"
                    onClick={() => openOpportunityDetails(item)}
                    style={{ cursor: "pointer" }}
                  >
                    {item.name}
                  </td>

                  <td>{item.description || "—"}</td>

                  <td>
                    <span className="crm-table-stage">{item.stage}</span>
                  </td>

                  <td>
                    <select
                      className="crm-row-select"
                      value={item.stage}
                      onChange={(event) =>
                        moveOpportunity(item.id, event.target.value)
                      }
                      aria-label={`Move ${item.name} to another stage`}
                    >
                      {STAGES.map((stage) => (
                        <option key={stage} value={stage}>
                          {stage}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="crm-table-action">
                    <button
                      type="button"
                      className="crm-delete-button"
                      title="Delete opportunity"
                      aria-label={`Delete ${item.name}`}
                      onClick={() => requestDeleteOpportunity(item)}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M3 6h18" />
                        <path d="M8 6V4h8v2" />
                        <path d="m19 6-1 14H6L5 6" />
                        <path d="M10 11v5M14 11v5" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}

              {filteredOpportunities.length === 0 && (
                <tr>
                  <td colSpan="5" className="crm-table-empty">
                    No opportunities found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      )}

      {/* Results */}
      <footer className="crm-results">
        Showing {filteredOpportunities.length} of {opportunities.length}{" "}
        opportunities
      </footer>

      {/* Delete Confirmation */}
      {pendingDelete && (
        <div className="crm-confirm-backdrop" onClick={cancelDeleteOpportunity}>
          <section
            className="crm-confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="crm-confirm-title"
            aria-describedby="crm-confirm-message"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="crm-confirm-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2" />
                <path d="m19 6-1 14H6L5 6" />
                <path d="M10 11v5M14 11v5" />
              </svg>
            </div>

            <h2 id="crm-confirm-title">Delete opportunity?</h2>

            <p id="crm-confirm-message">
              Are you sure you want to delete{" "}
              <strong>{pendingDelete.name}</strong>? This action cannot be
              undone.
            </p>

            <div className="crm-confirm-actions">
              <button
                type="button"
                className="crm-confirm-cancel"
                onClick={cancelDeleteOpportunity}
                disabled={deleting}
              >
                Cancel
              </button>

              <button
                type="button"
                className="crm-confirm-delete"
                onClick={confirmDeleteOpportunity}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Won / Lost dialog */}
      {pendingClose && (
        <div className="crm-confirm-backdrop" onClick={cancelClose}>
          <section
            className="crm-confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="crm-close-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="crm-close-title">Close “{pendingClose.name}”</h2>

            <p>Was this opportunity won or lost?</p>

            <select
              value={closeStatus}
              onChange={(event) => {
                setCloseStatus(event.target.value);
                setActionError("");
              }}
              disabled={closing}
            >
              <option value="won">Won</option>
              <option value="lost">Lost</option>
            </select>

            {closeStatus === "lost" && (
              <textarea
                rows={3}
                placeholder="Reason for losing this deal"
                value={lostReason}
                onChange={(event) => setLostReason(event.target.value)}
                disabled={closing}
              />
            )}

            {actionError && (
              <p className="crm-error-message" role="alert">
                {actionError}
              </p>
            )}

            <div className="crm-confirm-actions">
              <button
                type="button"
                className="crm-confirm-cancel"
                onClick={cancelClose}
                disabled={closing}
              >
                Cancel
              </button>

              <button
                type="button"
                className="crm-form-save"
                onClick={confirmClose}
                disabled={closing}
              >
                {closing ? "Saving..." : "Close deal"}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* New Opportunity */}
      {activeForm === "opportunity" && (
        <NewOpportunity
          customers={customers}
          salespeople={salespeople}
          onClose={() => setActiveForm(null)}
          onSave={async (form) => {
            setActionError("");
            setActionSuccess("");

            const body = {
              title: form.name,
              customer_id: Number(form.customerId),
              employee_id: Number(form.employeeId),
              estimated_value: form.revenue === "" ? 0 : Number(form.revenue),
              stage: form.stage.toLowerCase(),
              status: form.status.toLowerCase(),
              expected_close_date: form.closingDate || null,
            };

            // Let the backend calculate the stage probability
            // when the user leaves the probability field empty.
            if (
              form.probability !== "" &&
              form.probability !== null &&
              form.probability !== undefined
            ) {
              body.probability = Number(form.probability);
            }

            if (form.lostReason?.trim()) {
              body.lost_reason = form.lostReason.trim();
            }

            try {
              const data = await call("opportunities/", {
                method: "POST",
                body,
              });

              if (!data?.opportunity) {
                throw new Error(
                  "The server did not return the created opportunity."
                );
              }

              setOpportunities((previous) => [
                toUiOpportunity(data.opportunity),
                ...previous,
              ]);

              setActiveForm(null);
              setActionSuccess("Opportunity created successfully.");
            } catch (err) {
              setActionError(err.message);
              throw err;
            }
          }}
        />
      )}

      {/* New Customer */}
      {activeForm === "customer" && (
        <NewCustomer
          leadSources={leadSources}
          onClose={() => setActiveForm(null)}
          onSave={async (form) => {
            setActionError("");
            setActionSuccess("");

            try {
              await call("customers/", {
                method: "POST",
                body: {
                  first_name: form.firstName,
                  last_name: form.lastName,
                  phone: form.phone,
                  company_name: form.companyName,
                  email: form.email,
                  address: form.address,
                  lead_source_id: Number(form.leadSourceId),
                },
              });

              const response = await call("customers/");

              setCustomers(response?.Customers || []);

              setActiveForm(null);
              setActionSuccess("Customer created successfully.");
            } catch (err) {
              setActionError(err.message);
              throw err;
            }
          }}
        />
      )}

      {/* New Contact */}
      {activeForm === "contact" && (
        <NewContact
          customers={customers}
          onClose={() => setActiveForm(null)}
          onSave={async (form) => {
            setActionError("");
            setActionSuccess("");

            try {
              await call("contacts/", {
                method: "POST",
                body: {
                  customer_id: Number(form.customerId),
                  name: form.name,
                  job_title: form.jobTitle,
                  email: form.email,
                  phone: form.phone,
                  is_primary: form.isPrimary,
                },
              });

              const response = await call("contacts/");

              setContacts(response?.Contacts || []);

              setActiveForm(null);
              setActionSuccess("Contact created successfully.");
            } catch (err) {
              setActionError(err.message);
              throw err;
            }
          }}
        />
      )}

      {/* New Lead Source */}
      {activeForm === "leadSource" && (
        <NewLeadSource
          onClose={() => setActiveForm(null)}
          onSave={async (form) => {
            setActionError("");
            setActionSuccess("");

            try {
              await call("lead-sources/", {
                method: "POST",
                body: {
                  name: form.name,
                  description: form.description,
                  is_active: form.isActive,
                },
              });

              const response = await call("lead-sources/");

              setLeadSources(
                (response?.LeadSources || []).filter(
                  (source) => source.is_active
                )
              );

              setActiveForm(null);
              setActionSuccess("Lead source created successfully.");
            } catch (err) {
              setActionError(err.message);
              throw err;
            }
          }}
        />
      )}
    </main>
  );
}

export default CRM;
