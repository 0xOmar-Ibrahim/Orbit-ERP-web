import React, { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import "./HR.css";
import { apiRequest } from "../../Services/api";

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
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState({
    name: "Loading...",
    title: "Loading...",
    department: "Loading...",
    location: "Loading...",
    employeeId: "Loading...",
  });

  const [draft, setDraft] = useState({
    name: "",
    title: "",
    department: "",
    location: "",
    employeeId: "",
  });

  const [user, setUser] = useState(null);
  const [hasRunningContract, setHasRunningContract] = useState(false);
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadEmployeeData() {
      try {
        setLoading(true);

        const [profileRes, contractsRes] = await Promise.allSettled([
          apiRequest("/auth/me/"),
          apiRequest("/hr/contracts/"),
        ]);

        if (profileRes.status === "fulfilled" && profileRes.value) {
          const res = profileRes.value;
          const u = res.user || res.employee || res;

          setUser(u);

          const fullName = `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.username || "Employee";

          const mappedProfile = {
            name: fullName,
            title: u.role_name || u.position_title || "HR Manager",
            department: u.department_name || (u.role_name?.includes("HR") ? "Human Resources" : "Administration"),
            location: u.branch_name || "Headquarters",
            employeeId: u.code || (u.id ? `EMP-${u.id}` : "EMP-0000"),
          };

          setProfile(mappedProfile);
          setDraft(mappedProfile);
        }

        if (contractsRes.status === "fulfilled") {
          const contractsData = contractsRes.value;
          const list = Array.isArray(contractsData)
            ? contractsData
            : contractsData.results || contractsData.contracts || [];

          const isRunning = list.some(
            (item) => item.status === "Running" || item.status === "ACTIVE"
          );
          setHasRunningContract(isRunning);
        }
      } catch (err) {
        console.error("Failed to load employee details:", err);
      } finally {
        setLoading(false);
      }
    }

    loadEmployeeData();
  }, []);

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
      .filter(Boolean)
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

  const saveProfile = async (event) => {
    event.preventDefault();

    if (!draft.name.trim()) {
      setFormError("Name is required.");
      return;
    }

    try {
      setIsSaving(true);
      setFormError("");

      const nameParts = draft.name.trim().split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      await apiRequest("/admin/employee/", {
        method: "PATCH",
        body: JSON.stringify({
          employee_code: profile.employeeId,
          first_name: firstName,
          last_name: lastName,
        }),
      });

      setProfile({
        ...profile,
        name: draft.name.trim(),
        title: draft.title.trim() || profile.title,
        department: draft.department.trim() || profile.department,
        location: draft.location.trim() || profile.location,
        employeeId: draft.employeeId.trim() || profile.employeeId,
      });

      setEditing(false);
    } catch (err) {
      console.error("Error saving profile:", err);
      setFormError(err.message || "Failed to update profile on server.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="hr-page" ref={pageRef}>
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
          <header className="hr-profile">
            <div className="hr-identity">
              <div className="hr-avatar-wrap">
                <div className="hr-avatar">
                  {loading
                    ? "..."
                    : profile.name
                    ? profile.name
                        .split(" ")
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((n) => n[0].toUpperCase())
                        .join("")
                    : "MH"}
                </div>
                <span className="hr-avatar-badge" />
              </div>

              <div className="hr-employee-info">
                <div className="hr-name-line">
                  <h1>{loading ? "Loading..." : profile.name}</h1>

                  <span className="hr-contract-pill">
                    <i />
                    {loading
                      ? "Checking contract..."
                      : hasRunningContract
                      ? "Contract running"
                      : "No running contract"}
                  </span>
                </div>

                <p className="hr-role">
                  {loading ? "Loading..." : profile.title}
                  <span> • </span>
                  {loading ? "..." : profile.department}
                </p>

                <p className="hr-meta">
                  {loading ? "Loading..." : profile.location}
                  <span> • </span>
                  {loading ? "..." : profile.employeeId}
                </p>
              </div>
            </div>

            <div className="hr-profile-actions">
              <button
                type="button"
                className="hr-btn hr-btn-ghost"
                disabled={loading}
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
                disabled={loading}
              >
                Edit profile
              </button>
            </div>
          </header>

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

          <div className="hr-tab-panel">
            <Outlet context={{ profile, loading, user }} />
          </div>
        </>
      ) : (
        <div className="hr-empty">
          <h2>No employee records</h2>
          <p>Nothing matches &ldquo;{query.trim()}&rdquo;.</p>
        </div>
      )}

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

            <div className="hr-modal-actions">
              <button
                type="button"
                className="hr-modal-cancel"
                onClick={() => setEditing(false)}
                disabled={isSaving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="hr-modal-save"
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}