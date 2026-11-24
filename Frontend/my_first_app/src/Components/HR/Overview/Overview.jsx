
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./Overview.css";
import { contracts, documents, skills } from "../hrData";

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

export default function Overview() {
  const [contractQuery, setContractQuery] = useState("");

  const current = contracts.find(
    (item) => item.status === "Running"
  );

  const expiring = documents.filter(
    (item) => item.status === "Expiring soon"
  ).length;

  const filteredContracts = useMemo(() => {
    const term = contractQuery.trim().toLowerCase();

    if (!term) return contracts;

    return contracts.filter((item) =>
      [
        item.number,
        item.type,
        item.startDate,
        item.wage,
        item.schedule,
        item.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [contractQuery]);

  return (
    <section className="hr-overview">

      {/* Overview Header */}
      <div className="hr-overview-head">
        <div className="hr-overview-heading">
          <p className="hr-overview-kicker">
            EMPLOYEE RECORDS
          </p>

          <h2>Overview</h2>

          <p className="hr-overview-description">
            Summary of contract, skills and career history.
          </p>
        </div>

        <Link to="/hr/documents" className="hr-overview-docs">
          <FileIcon />
          View documents
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="hr-overview-grid">

        <article className="hr-overview-card">
          <span className="hr-overview-icon blue">
            <BriefcaseIcon />
          </span>

          <span className="hr-overview-copy">
            <span>Current contract</span>
            <strong>{current ? current.status : "None"}</strong>
          </span>
        </article>

        <article className="hr-overview-card">
          <span className="hr-overview-icon blue">
            <PeopleIcon />
          </span>

          <span className="hr-overview-copy">
            <span>Skills</span>
            <strong>{skills.length}</strong>
          </span>
        </article>

        <article className="hr-overview-card">
          <span className="hr-overview-icon amber">
            <FileIcon />
          </span>

          <span className="hr-overview-copy">
            <span>Documents</span>
            <strong>{documents.length}</strong>

            {expiring > 0 && (
              <em>{expiring} expiring soon</em>
            )}
          </span>
        </article>

      </div>

      {/* Current Contract Table */}
      <div className="hr-contracts-table">

        <div className="hr-contracts-table-head">
          <h3>Current contract</h3>

          <label className="hr-contract-search">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.2-3.2" />
            </svg>

            <input
              type="search"
              value={contractQuery}
              onChange={(event) =>
                setContractQuery(event.target.value)
              }
              placeholder="Search contract..."
              aria-label="Search contracts"
            />
          </label>
        </div>

        <div className="hr-contracts-table-scroll">
          <table className="hr-contracts-table-content">

            <thead>
              <tr>
                <th>NUMBER</th>
                <th>TYPE</th>
                <th>START DATE</th>
                <th>WAGE</th>
                <th>SCHEDULE</th>
                <th>STATUS</th>
              </tr>
            </thead>

            <tbody>
              {filteredContracts.length > 0 ? (
                filteredContracts.map((item) => (
                  <tr
                    key={item.number}
                    className={
                      item.status === "Running"
                        ? "running-contract-row"
                        : ""
                    }
                  >
                    <td>
                     <div className="hr-contract-number">
  <strong>{item.number}</strong>
</div>
                    </td>

                    <td>{item.type}</td>
                    <td>{item.startDate}</td>
                    <td>{item.wage}</td>
                    <td>{item.schedule}</td>

                    <td>
                      <span
                        className={`hr-contract-status ${
                          item.status === "Running"
                            ? "status-running"
                            : "status-expired"
                        }`}
                      >
                        <i />
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="6"
                    className="hr-contract-empty"
                  >
                    No contracts found.
                  </td>
                </tr>
              )}
            </tbody>

          </table>
        </div>

        <div className="hr-contracts-table-footer">
          <span>
            Showing {filteredContracts.length} of {contracts.length} contracts
          </span>

          <span>Last updated today at 14:32</span>
        </div>

      </div>

    </section>
  );
}
