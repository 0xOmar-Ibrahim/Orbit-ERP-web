
import React from "react";
import "./History.css";
import { history } from "../hrData";

export default function History() {
  return (
    <section className="hr-history">
      <div className="hr-history-heading">
        <span className="hr-section-eyebrow">
          AUDIT TRAIL
        </span>

        <h2>History</h2>

        <p>
          A read-only timeline of changes to this employee profile.
        </p>
      </div>

      <div className="hr-history-panel">
        {history.length > 0 ? (
          <ol className="hr-history-list">
            {history.map((item, index) => (
              <li
                className="hr-history-item"
                key={item.id || `${item.date}-${item.title}-${index}`}
              >
                <div className="hr-history-date">
                  {item.date}
                </div>

                <div className="hr-history-timeline">
                  <span className="hr-history-mark" />
                </div>

                <div className="hr-history-content">
                  <div className="hr-history-info">
                    <span className="hr-history-badge">
                      {item.title}
                    </span>

                    {item.recordedBy && (
                      <span className="hr-history-recorder">
                        Recorded by {item.recordedBy}
                      </span>
                    )}
                  </div>

                  <p className="hr-history-detail">
                    {item.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="hr-history-empty">
            No history records available.
          </p>
        )}
      </div>
    </section>
  );
}
