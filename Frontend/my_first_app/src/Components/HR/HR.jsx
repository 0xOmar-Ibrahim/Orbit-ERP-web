
import React, { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import "./HR.css";
import { contracts, employeeSeed } from "./hrData";

const TABS = [
  { label: "Overview", to: "/hr", end: true },
  { label: "Contracts", to: "/hr/contracts" },
  { label: "Documents", to: "/hr/documents" },
  { label: "History", to: "/hr/history" },
  { label: "Skills", to: "/hr/skills" },
  { label: "Attendance", to: "/hr/attendance" },
];

export default function HR() {
  const navigate = useNavigate();
  const location = useLocation();

  const pageRef = useRef(null);
  const searchRef = useRef(null);

  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState(employeeSeed);
  const [draft, setDraft] = useState(employeeSeed);
  const [formError, setFormError] = useState("");

  const runningContract = contracts.some(
    (item) => item.status === "Running"
  );

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();

    if (!term) return true;

    return [
      profile.name,
      profile.title,
      profile.department,
      profile.location,
      profile.employeeId,
    ]
      .join(" ")
      .toLowerCase()
      .includes(term);
  }, [profile, query]);

  useEffect(() => {
    pageRef.current?.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") {
        setEditing(false);
      }
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, []);


  const openEditor = () => {
    setDraft(profile);
    setFormError("");
    setEditing(true);
  };

  const saveProfile = (event) => {
    event.preventDefault();

    if (!draft.name.trim()) {
      setFormError("Name is required.");
      return;
    }

    setProfile({
      name: draft.name.trim(),
      title: draft.title.trim() || profile.title,
      department: draft.department.trim() || profile.department,
      location: draft.location.trim() || profile.location,
      employeeId: draft.employeeId.trim() || profile.employeeId,
    });

    setEditing(false);
  };



  return (
    <div className="hr-page" ref={pageRef}>

      {/* Search Section */}
      <div className="hr-search-row">
        <label className="hr-search">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.2-3.2" />
          </svg>

          <input
            ref={searchRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search employee records"
            aria-label="Search employee records"
          />
        </label>
      </div>

      {matches ? (
        <>
          {/* Employee Profile Header */}
          <header className="hr-profile">

            <div className="hr-identity">
              <div className="hr-employee-info">

                <div className="hr-name-line">
                  <h1>{profile.name}</h1>

                  <span className="hr-contract-pill">
                    <i />
                    {runningContract
                      ? "Contract running"
                      : "No running contract"}
                  </span>
                </div>

                <p className="hr-role">
                  {profile.title}
                  <span> · </span>
                  {profile.department}
                </p>

                <p className="hr-meta">
                  {profile.location}
                  <span> · </span>
                  {profile.employeeId}
                </p>

              </div>
            </div>

            {/* Profile Actions */}
          
<div className="hr-profile-actions">

  <button
    type="button"
    className="hr-btn hr-btn-ghost"
  >
    More actions

    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 6l6 6-6 6" />
    </svg>
  </button>

  <button
    type="button"
    className="hr-btn hr-btn-primary"
    onClick={openEditor}
  >
    Edit profile
  </button>

</div>  
          </header>

          {/* Navigation Tabs */}
          <nav className="hr-tabs" aria-label="Employee records">
            {TABS.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  `hr-tab${isActive ? " active" : ""}`
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>

          {/* Tab Content */}
          <div className="hr-tab-panel">
            <Outlet context={{ profile }} />
          </div>
        </>
      ) : (
        <div className="hr-empty">
          <h2>No employee records</h2>
          <p>Nothing matches “{query.trim()}”.</p>
        </div>
      )}

     
{/* Edit Profile Modal */}
{editing && (
  <div
    className="hr-modal-backdrop"
    onClick={() => setEditing(false)}
  >
    <form
      className="hr-modal"
      onClick={(event) => event.stopPropagation()}
      onSubmit={saveProfile}
    >
      {/* Header */}
      <div className="hr-modal-head">
        <div>
          <h2>Edit Profile</h2>
          <p>Update employee information.</p>
        </div>

        <button
          type="button"
          className="hr-modal-close"
          onClick={() => setEditing(false)}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {/* Form Fields */}
      <div className="hr-modal-grid">

        <label className="hr-modal-field">
          <span>Name <span className="hr-required">*</span></span>
          <input
            type="text"
            value={draft.name}
            onChange={(event) =>
              setDraft({ ...draft, name: event.target.value })
            }
            placeholder="Enter employee name"
          />
        </label>

        <label className="hr-modal-field">
          <span>Title</span>
          <input
            type="text"
            value={draft.title}
            onChange={(event) =>
              setDraft({ ...draft, title: event.target.value })
            }
            placeholder="Enter job title"
          />
        </label>

        <label className="hr-modal-field">
          <span>Department</span>
          <input
            type="text"
            value={draft.department}
            onChange={(event) =>
              setDraft({ ...draft, department: event.target.value })
            }
            placeholder="Enter department"
          />
        </label>

        <label className="hr-modal-field">
          <span>Location</span>
          <input
            type="text"
            value={draft.location}
            onChange={(event) =>
              setDraft({ ...draft, location: event.target.value })
            }
            placeholder="Enter location"
          />
        </label>

        <label className="hr-modal-field hr-modal-field-full">
          <span>Employee ID</span>
          <input
            type="text"
            value={draft.employeeId}
            onChange={(event) =>
              setDraft({ ...draft, employeeId: event.target.value })
            }
            placeholder="Enter employee ID"
          />
        </label>

      </div>

      {formError && (
        <p className="hr-form-error">{formError}</p>
      )}

      {/* Actions */}
      <div className="hr-modal-actions">
        <button
          type="button"
          className="hr-modal-cancel"
          onClick={() => setEditing(false)}
        >
          Cancel
        </button>

        <button
          type="submit"
          className="hr-modal-save"
        >
          Save Changes
        </button>
      </div>

    </form>
  </div>
)}
    </div>
  );
}
