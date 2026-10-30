
import React, { useMemo, useState } from "react";
import "./CRM.css";

import NewOpportunity from "./NewOpportunity";
import NewCustomer from "./NewCustomer";
import NewContact from "./NewContact";
import NewLeadSource from "./NewLeadSource";
import OpportunityDetails from "./OpportunityDetails";

const STAGES = [
  "Lead",
  "Qualified",
  "Proposal",
  "Negotiation",
  "Closed",
];

const INITIAL_OPPORTUNITIES = [
  {
    id: 1,
    name: "Acme Corp.",
    description: "Website redesign",
    stage: "Lead",
    value: 10000,
    probability: 70,
    contactInfo: "contact@acme.com",
    salesperson: "John Doe",
    status: "Open",
    closingDate: "May 30, 2026",
  },
  {
    id: 2,
    name: "Global Tech",
    description: "CRM integration",
    stage: "Lead",
    value: 18500,
  },
  {
    id: 3,
    name: "Delta Systems",
    description: "Network security",
    stage: "Qualified",
    value: 35000,
  },
  {
    id: 4,
    name: "Visionary Group",
    description: "Cloud migration",
    stage: "Qualified",
    value: 42000,
  },
  {
    id: 5,
    name: "TechWave",
    description: "E-commerce platform",
    stage: "Proposal",
    value: 60000,
  },
  {
    id: 6,
    name: "Smart Solutions",
    description: "Data analytics",
    stage: "Proposal",
    value: 48000,
  },
  {
    id: 7,
    name: "Alpha Dynamics",
    description: "ERP implementation",
    stage: "Negotiation",
    value: 75000,
  },
  {
    id: 8,
    name: "Skyline Corp.",
    description: "Software license",
    stage: "Closed",
    value: 120000,
  },
];

function CRM() {
  const [opportunities, setOpportunities] = useState(
    INITIAL_OPPORTUNITIES
  );

  const [view, setView] = useState("cards");
  const [search, setSearch] = useState("");
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);

  const [activeForm, setActiveForm] = useState(null);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  // Store selected opportunity ID
  const [selectedOpportunityId, setSelectedOpportunityId] =
    useState(null);

  const [customers, setCustomers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [leadSources, setLeadSources] = useState([]);

  // Store Notes and Activities separately
  const [opportunityNotes, setOpportunityNotes] = useState([]);
  const [opportunityActivities, setOpportunityActivities] =
    useState([]);

  // Always get the latest opportunity data
  const selectedOpportunity = useMemo(
    () =>
      opportunities.find(
        (item) => item.id === selectedOpportunityId
      ) || null,
    [opportunities, selectedOpportunityId]
  );

  // Search
  const filteredOpportunities = useMemo(() => {
    const query = search.trim().toLowerCase();

    return opportunities.filter((item) =>
      `${item.name || ""} ${item.description || ""} ${item.stage || ""}`
        .toLowerCase()
        .includes(query)
    );
  }, [opportunities, search]);

  // Move opportunity
  const moveOpportunity = (id, newStage) => {
    setOpportunities((previous) =>
      previous.map((item) =>
        item.id === id
          ? { ...item, stage: newStage }
          : item
      )
    );
  };

  // Delete opportunity and its Logs
  const deleteOpportunity = (id) => {
    setOpportunities((previous) =>
      previous.filter((item) => item.id !== id)
    );

    // Delete its Notes
    setOpportunityNotes((previous) =>
      previous.filter((note) => note.opportunityId !== id)
    );

    // Delete its Activities
    setOpportunityActivities((previous) =>
      previous.filter(
        (activity) => activity.opportunityId !== id
      )
    );

    // Close details if this opportunity is selected
    setSelectedOpportunityId((currentId) =>
      currentId === id ? null : currentId
    );
  };

  const requestDeleteOpportunity = (item) => {
    setPendingDelete({
      id: item.id,
      name: item.name,
    });
  };

  const cancelDeleteOpportunity = () => {
    setPendingDelete(null);
  };

  const confirmDeleteOpportunity = () => {
    if (!pendingDelete) return;

    deleteOpportunity(pendingDelete.id);
    setPendingDelete(null);
  };

  // Open opportunity details
  const openOpportunityDetails = (item) => {
    setSelectedOpportunityId(item.id);
  };

  const closeOpportunityDetails = () => {
    setSelectedOpportunityId(null);
  };

  // Add Note to specific opportunity
  const handleAddNote = ({ opportunity, note }) => {
    if (!opportunity?.id || !note?.trim()) return;

    const newNote = {
      id: Date.now(),
      opportunityId: opportunity.id,
      note: note.trim(),
      createdAt: new Date().toISOString(),
    };

    setOpportunityNotes((previous) => [
      ...previous,
      newNote,
    ]);
  };

  // Add Activity to specific opportunity
  const handleAddActivity = ({ opportunity, ...activity }) => {
    if (!opportunity?.id) return;

    const newActivity = {
      ...activity,
      id: Date.now(),
      opportunityId: opportunity.id,
      createdAt: new Date().toISOString(),
    };

    setOpportunityActivities((previous) => [
      ...previous,
      newActivity,
    ]);
  };

  // Drag and Drop
  const handleDragStart = (event, id) => {
    setDraggedId(id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(id));
  };

  const handleDrop = (event, stage) => {
    event.preventDefault();

    const id =
      Number(event.dataTransfer.getData("text/plain")) ||
      draggedId;

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

  // Opportunity Details Page
  if (selectedOpportunity) {
    return (
      <OpportunityDetails
        opportunity={{
          ...selectedOpportunity,
          revenue:
            selectedOpportunity.revenue ??
            selectedOpportunity.value ??
            0,
        }}

        // Send only this opportunity's Notes
        notes={opportunityNotes.filter(
          (note) =>
            note.opportunityId === selectedOpportunity.id
        )}

        // Send only this opportunity's Activities
        activities={opportunityActivities.filter(
          (activity) =>
            activity.opportunityId === selectedOpportunity.id
        )}

        onBack={closeOpportunityDetails}
        onAddNote={handleAddNote}
        onAddActivity={handleAddActivity}
      />
    );
  }

  return (
    <main className="crm-page">

      {/* Header */}
      <header className="crm-header">
        <div className="crm-heading">
          <div className="crm-breadcrumb">
            WORKSPACE / SALES
          </div>

          <h1>Opportunities</h1>

          <p>Track and manage your sales pipeline.</p>
        </div>

        <div className="crm-header-actions">

          {/* Create New Dropdown */}
          <div className="crm-create-dropdown">
            <button
              type="button"
              className="crm-button crm-button-primary"
              onClick={() =>
                setShowCreateMenu((previous) => !previous)
              }
              aria-expanded={showCreateMenu}
            >
              <span className="crm-plus">+</span>
              Create New

              <span
                className={`crm-dropdown-arrow ${
                  showCreateMenu ? "open" : ""
                }`}
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

          {/* New Lead Source */}
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

      {/* Toolbar */}
      <section className="crm-toolbar">
        <label className="crm-search">
          <span
            className="crm-search-icon"
            aria-hidden="true"
          >
            ⌕
          </span>

          <input
            type="search"
            placeholder="Search opportunities..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            aria-label="Search opportunities"
          />
        </label>

        <div
          className="crm-view-switch"
          aria-label="Change view"
        >
          <button
            type="button"
            className={view === "cards" ? "active" : ""}
            onClick={() => setView("cards")}
            title="Cards view"
            aria-label="Cards view"
            aria-pressed={view === "cards"}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect
                x="4"
                y="4"
                width="6"
                height="6"
                rx="1"
              />
              <rect
                x="14"
                y="4"
                width="6"
                height="6"
                rx="1"
              />
              <rect
                x="4"
                y="14"
                width="6"
                height="6"
                rx="1"
              />
              <rect
                x="14"
                y="14"
                width="6"
                height="6"
                rx="1"
              />
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
        <section
          className="crm-kanban"
          aria-label="Opportunity stages"
        >
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
                  if (
                    !event.currentTarget.contains(
                      event.relatedTarget
                    )
                  ) {
                    setDragOverStage(null);
                  }
                }}
                onDrop={(event) =>
                  handleDrop(event, stage)
                }
              >
                <div className="crm-column-heading">
                  <div className="crm-stage-title">
                    <span className="crm-stage-number">
                      {index + 1}
                    </span>

                    <h2>{stage}</h2>
                  </div>

                  <span className="crm-stage-count">
                    {stageItems.length}
                  </span>
                </div>

                <div className="crm-column-cards">
                  {stageItems.map((item) => (
                    <article
                      className={`crm-opportunity-card ${
                        draggedId === item.id
                          ? "is-dragging"
                          : ""
                      }`}
                      key={item.id}
                      draggable
                      onDragStart={(event) =>
                        handleDragStart(event, item.id)
                      }
                      onDragEnd={handleDragEnd}
                      onClick={() =>
                        openOpportunityDetails(item)
                      }
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" ||
                          event.key === " "
                        ) {
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
                            onMouseDown={(event) =>
                              event.stopPropagation()
                            }
                            onDragStart={(event) =>
                              event.preventDefault()
                            }
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
                        <span className="crm-card-stage">
                          {stage}
                        </span>
                      </div>

                      <div className="crm-card-move">
                        <label htmlFor={`move-${item.id}`}>
                          Move to
                        </label>

                        <select
                          id={`move-${item.id}`}
                          value={item.stage}
                          onChange={(event) =>
                            moveOpportunity(
                              item.id,
                              event.target.value
                            )
                          }
                          onMouseDown={(event) =>
                            event.stopPropagation()
                          }
                          onClick={(event) =>
                            event.stopPropagation()
                          }
                        >
                          {STAGES.map((option) => (
                            <option
                              key={option}
                              value={option}
                            >
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
                    onClick={() =>
                      openOpportunityDetails(item)
                    }
                    style={{ cursor: "pointer" }}
                  >
                    {item.name}
                  </td>

                  <td>{item.description || "—"}</td>

                  <td>
                    <span className="crm-table-stage">
                      {item.stage}
                    </span>
                  </td>

                  <td>
                    <select
                      className="crm-row-select"
                      value={item.stage}
                      onChange={(event) =>
                        moveOpportunity(
                          item.id,
                          event.target.value
                        )
                      }
                      aria-label={`Move ${item.name} to another stage`}
                    >
                      {STAGES.map((stage) => (
                        <option
                          key={stage}
                          value={stage}
                        >
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
                      onClick={() =>
                        requestDeleteOpportunity(item)
                      }
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
                  <td
                    colSpan="5"
                    className="crm-table-empty"
                  >
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
        Showing {filteredOpportunities.length} of{" "}
        {opportunities.length} opportunities
      </footer>

      {/* Delete Confirmation */}
      {pendingDelete && (
        <div
          className="crm-confirm-backdrop"
          onClick={cancelDeleteOpportunity}
        >
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

            <h2 id="crm-confirm-title">
              Delete opportunity?
            </h2>

            <p id="crm-confirm-message">
              Are you sure you want to delete{" "}
              <strong>{pendingDelete.name}</strong>?
              This action cannot be undone.
            </p>

            <div className="crm-confirm-actions">
              <button
                type="button"
                className="crm-confirm-cancel"
                onClick={cancelDeleteOpportunity}
              >
                Cancel
              </button>

              <button
                type="button"
                className="crm-confirm-delete"
                onClick={confirmDeleteOpportunity}
              >
                Delete
              </button>
            </div>
          </section>
        </div>
      )}

      {/* New Opportunity */}
      {activeForm === "opportunity" && (
        <NewOpportunity
          customers={customers}
          onClose={() => setActiveForm(null)}
          onSave={(data) => {
            const newOpportunity = {
              ...data,
              id: data.id ?? Date.now(),
              value: Number(data.value) || 0,
            };

            setOpportunities((previous) => [
              newOpportunity,
              ...previous,
            ]);

            setActiveForm(null);
          }}
        />
      )}

      {/* New Customer */}
      {activeForm === "customer" && (
        <NewCustomer
          onClose={() => setActiveForm(null)}
          onSave={(data) => {
            setCustomers((previous) => [
              ...previous,
              data,
            ]);

            setActiveForm(null);
          }}
        />
      )}

      {/* New Contact */}
      {activeForm === "contact" && (
        <NewContact
          customers={customers}
          onClose={() => setActiveForm(null)}
          onSave={(data) => {
            setContacts((previous) => [
              ...previous,
              data,
            ]);

            setActiveForm(null);
          }}
        />
      )}

      {/* New Lead Source */}
      {activeForm === "leadSource" && (
        <NewLeadSource
          onClose={() => setActiveForm(null)}
          onSave={(data) => {
            setLeadSources((previous) => [
              ...previous,
              data,
            ]);

            setActiveForm(null);
          }}
        />
      )}

    </main>
  );
}

export default CRM;
