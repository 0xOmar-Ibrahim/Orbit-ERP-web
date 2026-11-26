import React, { useEffect, useState } from "react";
import "./History.css";
import { apiRequest } from "../../../Services/api";

export default function History() {
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchHistory() {
      try {
        setLoading(true);
        setError("");

        // جلب سجل الأحداث مباشرة من الباك إند
        const data = await apiRequest("/hr/employee-history/");
        const list = Array.isArray(data)
          ? data
          : data.results || data.history || [];

        setHistoryList(list);
      } catch (err) {
        console.error("Failed to fetch history:", err);
        setError("Failed to load employee history records from server.");
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

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
        {loading ? (
          <p className="hr-history-empty">Loading history from server...</p>
        ) : error ? (
          <p className="hr-history-empty" style={{ color: "red" }}>
            {error}
          </p>
        ) : historyList.length > 0 ? (
          <ol className="hr-history-list">
            {historyList.map((item, index) => {
              const recordId = item.history_id || item.id || index;
              const date = formatDate(
                item.change_date || item.created_at || item.effective_date
              );
              // استخراج نوع التغيير المطابق تماماً للبادج في الصورة
              const badgeType =
                item.change_type ||
                item.change_type_display ||
                item.title ||
                "activity";

              // استخراج التفاصيل أو الملاحظات
              const detail =
                item.notes ||
                item.description ||
                item.detail ||
                (item.new_value
                  ? `Changed to ${item.new_value}`
                  : "Profile activity recorded");

              return (
                <li className="hr-history-item" key={recordId}>
                  <div className="hr-history-date">
                    {date}
                  </div>

                  <div className="hr-history-timeline">
                    <span className="hr-history-mark" />
                  </div>

                  <div className="hr-history-content">
                    <div className="hr-history-info">
                      <span className="hr-history-badge">
                        {badgeType}
                      </span>
                    </div>

                    <p className="hr-history-detail">
                      {detail}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="hr-history-empty">
            No history records available for this employee.
          </p>
        )}
      </div>
    </section>
  );
}