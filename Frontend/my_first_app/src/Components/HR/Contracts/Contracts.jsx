import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import "../Attendance/Attendance.css";
import "./Contracts.css";
import Icon from "../Attendance/Icon";
import ContractModal from "./ContractModal";
import { Empty, ErrorBanner, Loading, SectionHeading, StatusPill } from "../shared/HrStates";
import { employeeIdOf, fullName, hrFetchAll, hrRequest } from "../shared/hrRequest";
import {
  CONTRACT_STATUSES,
  CONTRACT_TYPES,
  collectChoices,
  formatDate,
  formatMoney,
  labelOf,
  sortContracts,
  statusTone,
} from "./contractUtils";

/** Contracts tab of the employee profile — the signed-in employee's employment agreements */
export default function Contracts() {
  const outlet = useOutletContext() || {};
  const user = outlet.user;
  const employeeId = employeeIdOf(user);

  const [contracts, setContracts] = useState([]);
  const [choices, setChoices] = useState({ positions: [], schedules: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null); // { contract: null | {...} }

  const load = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    setError("");
    try {
      const [mine, all] = await Promise.all([
        hrFetchAll("contracts/", { employee_id: employeeId }),
        // Position / schedule names come from all contracts (there is no list endpoint for them)
        hrFetchAll("contracts/").catch(() => []),
      ]);
      setContracts(sortContracts(mine));
      setChoices(collectChoices([...all, ...mine]));
    } catch (err) {
      if (err.message !== "SESSION_EXPIRED") setError(err.message);
      setContracts([]);
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    load();
  }, [load]);

  const runningId = useMemo(() => contracts.find((c) => c.status === "running")?.contract_id ?? null, [contracts]);

  const save = async (payload, isEdit) => {
    if (isEdit) await hrRequest("contracts/", { method: "PATCH", body: payload });
    else await hrRequest("contracts/", { method: "POST", body: payload });
    load();
  };

  const remove = async (contract) => {
    await hrRequest("contracts/", { method: "DELETE", body: { contract_id: contract.contract_id } });
    load();
  };

  const pageError = user && !employeeId ? "Couldn't identify the signed-in employee." : error;

  return (
    <div className="att-page">
      <div className="att-inner">
        <SectionHeading
          eyebrow="Employment records"
          title="Contracts"
          copy="Review current and previous employment agreements."
        >
          <button type="button" className="att-button primary" onClick={() => setModal({ contract: null })} disabled={!employeeId}>
            <Icon name="plus" size={17} /> Add contract
          </button>
        </SectionHeading>

        <ErrorBanner message={pageError} onRetry={employeeId ? load : undefined} />

        {loading && employeeId ? (
          <Loading />
        ) : !contracts.length ? (
          <Empty title="No contracts found" copy="There are no employment agreements for this employee yet." />
        ) : (
          <section className="att-card att-table-card">
            <div className="att-data-table hr-contracts-table">
              <div className="att-row att-head">
                <span>Contract</span>
                <span>Period</span>
                <span>Annual salary</span>
                <span>Status</span>
                <span />
              </div>

              {contracts.map((c) => {
                const open = () => setModal({ contract: c });
                return (
                  <div
                    key={c.contract_id}
                    className={`att-row att-attendance-row ${c.status === "running" ? "selected" : ""}`}
                    role="button"
                    tabIndex={0}
                    onClick={open}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        open();
                      }
                    }}
                    aria-label={`Open ${c.contract_number}`}
                  >
                    <span data-label="Contract">
                      <b>{c.position__title || "Employment contract"}</b>
                      <small>
                        {c.contract_number} · {labelOf(CONTRACT_TYPES, c.contract_type)}
                      </small>
                    </span>
                    <span data-label="Period">
                      <b>{formatDate(c.start_date)}</b>
                      <small>{c.end_date ? formatDate(c.end_date) : "No end date"}</small>
                    </span>
                    <span data-label="Annual salary">
                      <b>{formatMoney(c.wage, c.currency)}</b>
                      <small>{c.currency} / year</small>
                    </span>
                    <span data-label="Status">
                      <StatusPill tone={statusTone(c.status)}>{labelOf(CONTRACT_STATUSES, c.status)}</StatusPill>
                    </span>
                    <span className="hr-row-action">
                      <button
                        type="button"
                        aria-label={`Open ${c.contract_number}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          open();
                        }}
                      >
                        <Icon name="chevron" />
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {modal && (
        <ContractModal
          employeeLabel={fullName(user)}
          employeeId={Number(employeeId)}
          contract={modal.contract}
          runningId={runningId}
          positions={choices.positions}
          schedules={choices.schedules}
          onClose={() => setModal(null)}
          onSave={save}
          onDelete={remove}
        />
      )}
    </div>
  );
}
