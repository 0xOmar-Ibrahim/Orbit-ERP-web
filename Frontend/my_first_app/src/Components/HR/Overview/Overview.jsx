import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./Overview.css";
import { apiRequest } from "../../../Services/api";

function BriefcaseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7" />
      <path d="M3 12h18" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19c.6-2.6 2.7-4 5.5-4s4.9 1.4 5.5 4" />
      <circle cx="17" cy="9" r="2.2" />
      <path d="M16.2 15c1.8.3 3.2 1.4 3.8 3.2" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 3.5h7l5 5V20a1.5 1.5 0 0 1-1.5 1.5h-10.5A1.5 1.5 0 0 1 5.5 20V5A1.5 1.5 0 0 1 7 3.5z" />
      <path d="M14 3.5V9h5" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export default function Overview() {
  const [contractsList, setContractsList] = useState([]);
  const [documentsList, setDocumentsList] = useState([]);
  const [skillsList, setSkillsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [contractQuery, setContractQuery] = useState("");

  useEffect(() => {
    async function fetchOverviewData() {
      try {
        setLoading(true);
        const [contractsRes, docsRes, skillsRes] = await Promise.allSettled([
          apiRequest("/hr/contracts/"),
          apiRequest("/hr/documents/"),
          apiRequest("/hr/employee-skills/"),
        ]);

        if (contractsRes.status === "fulfilled") {
          const c = contractsRes.value;
          setContractsList(Array.isArray(c) ? c : c.results || c.contracts || []);
        }

        if (docsRes.status === "fulfilled") {
          const d = docsRes.value;
          setDocumentsList(Array.isArray(d) ? d : d.results || d.documents || []);
        }

        if (skillsRes.status === "fulfilled") {
          const s = skillsRes.value;
          setSkillsList(Array.isArray(s) ? s : s.results || s.skills || []);
        }
      } catch (err) {
        console.error("Overview data fetch failed:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchOverviewData();
  }, []);

  // العقد الساري حالياً
  const current = contractsList.find(
    (item) => item.status === "Running" || item.status === "ACTIVE"
  );

  // المستندات التي توشك على الانتهاء
  const expiring = documentsList.filter((item) => {
    if (item.status === "Expiring soon" || item.status === "EXPIRING") return true;
    if (item.expiry_date) {
      const diff = new Date(item.expiry_date) - new Date();
      return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
    }
    return false;
  }).length;

  // فلترة العقود في جدول العقود
  const filteredContracts = useMemo(() => {
    const term = contractQuery.trim().toLowerCase();
    if (!term) return contractsList;

    return contractsList.filter((item) => {
      const searchStr = [
        item.contract_number || item.number,
        item.contract_type || item.type,
        item.start_date || item.startDate,
        item.wage,
        item.schedule,
        item.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchStr.includes(term);
    });
  }, [contractQuery, contractsList]);

  return (
    <section className="hr-overview">
      {/* Overview Head */}
      <div className="hr-overview-head">
        <div className="hr-overview-heading">
          <span className="hr-overview-kicker">EMPLOYEE RECORDS</span>
          <h2>Overview</h2>
          <p className="hr-overview-description">
            Quick snapshot of employment terms, compliance documents, and active profile details.
          </p>
        </div>

        <Link to="/hr/documents" className="hr-overview-docs">
          <FileIcon />
          View Documents
        </Link>
      </div>

           {/* Summary Cards Grid (2 Boxes) */}
           <div className="hr-overview-grid">
        {/* Box 1: Current Contract */}
        <div className="hr-overview-card">
          <div className="hr-overview-icon blue">
            <BriefcaseIcon />
          </div>
          <div className="hr-overview-copy">
            <span>Current contract</span>
            <strong>
              {loading ? "..." : current ? "Running" : "None"}
            </strong>
          </div>
        </div>

        {/* Box 2: Documents */}
        <div className="hr-overview-card">
          <div className="hr-overview-icon amber">
            <FileIcon />
          </div>
          <div className="hr-overview-copy">
            <span>Documents</span>
            <strong>{loading ? "..." : documentsList.length}</strong>
            {expiring > 0 ? (
              <em>{expiring} expiring soon</em>
            ) : (
              <span className="hr-doc-sub">All active</span>
            )}
          </div>
        </div>
      </div>

      {/* Contracts Table */}
      <div className="hr-contracts-table">
        <div className="hr-contracts-table-head">
          <h3>Current Contract</h3>

          <div className="hr-contract-search">
            <SearchIcon />
            <input
              type="text"
              placeholder="Search contracts..."
              value={contractQuery}
              onChange={(e) => setContractQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="hr-contracts-table-scroll">
          <table className="hr-contracts-table-content">
            <thead>
              <tr>
                <th>CONTRACT NUMBER</th>
                <th>TYPE</th>
                <th>START DATE</th>
                <th>WAGE / SALARY</th>
                <th>SCHEDULE</th>
                <th>STATUS</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="hr-contract-empty">
                    Loading contracts from server...
                  </td>
                </tr>
              ) : filteredContracts.length > 0 ? (
                filteredContracts.map((c) => {
                  const isRunning = c.status === "Running" || c.status === "ACTIVE";
                  const statusClass = isRunning ? "status-running" : "status-expired";

                  return (
                    <tr
                      key={c.contract_id || c.id || c.number}
                      className={isRunning ? "running-contract-row" : ""}
                    >
                      <td>
                        <div className="hr-contract-number">
                          <strong>{c.contract_number || c.number || "—"}</strong>
                        </div>
                      </td>

                      <td>{c.contract_type || c.type || "Permanent"}</td>

                      <td>{c.start_date || c.startDate || "—"}</td>

                      <td>{c.wage ? `$${c.wage}` : "—"}</td>

                      <td>{c.schedule || c.work_schedule || "Standard 9–5"}</td>

                      <td>
                        <span className={`hr-contract-status ${statusClass}`}>
                          <i />
                          {c.status || "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="hr-contract-empty">
                    No contracts found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="hr-contracts-table-footer">
          <span>Showing {filteredContracts.length} of {contractsList.length} contracts</span>
          <span>Records synced with Orbit HR Core</span>
        </div>
      </div>
    </section>
  );
}