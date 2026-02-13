import { useState, useEffect } from "react";
import { API_BASE } from "../config";
export default function ActivityLogs({ currentUser }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({ action: "", limit: 50 });

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.action) params.append("action", filter.action);
      params.append("limit", filter.limit);

      const res = await fetch(`${API_BASE}/activity-logs?${params}`, {
        headers: { "x-user-id": currentUser?.id },
      });
      if (!res.ok) throw new Error("Failed to fetch activity logs");
      const data = await res.json();
      setLogs(data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filter]);

  const getActionIcon = (action) => {
    const icons = {
      USER_LOGIN: "🔐",
      USER_REGISTERED: "📝",
      USER_CREATED: "👤",
      USER_UPDATED: "✏️",
      USER_ACTIVATED: "✅",
      USER_DEACTIVATED: "🚫",
      TRUCK_CREATED: "🚛",
      TRUCK_UPDATED: "🔧",
      DRIVER_CREATED: "👨‍✈️",
      BOOKING_CREATED: "📅",
    };
    return icons[action] || "📋";
  };

  const getActionColor = (action) => {
    if (action.includes("LOGIN") || action.includes("ACTIVATED"))
      return "#28a745";
    if (action.includes("DEACTIVATED") || action.includes("DELETED"))
      return "#dc3545";
    if (action.includes("CREATED")) return "#007bff";
    if (action.includes("UPDATED")) return "#ffc107";
    return "#6c757d";
  };

  const formatAction = (action) => {
    return action
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (loading) return <div className="loading">Loading activity logs...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  const uniqueActions = [...new Set(logs.map((l) => l.action))];

  return (
    <div>
      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <h2>📋 Activity Logs</h2>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <select
              value={filter.action}
              onChange={(e) => setFilter({ ...filter, action: e.target.value })}
              style={{
                padding: "0.5rem",
                borderRadius: "4px",
                background: "var(--bg-secondary)",
                color: "var(--text-primary)",
                border: "1px solid var(--border-color)",
              }}
            >
              <option value="">All Actions</option>
              {uniqueActions.map((action) => (
                <option key={action} value={action}>
                  {formatAction(action)}
                </option>
              ))}
            </select>
            <select
              value={filter.limit}
              onChange={(e) =>
                setFilter({ ...filter, limit: parseInt(e.target.value) })
              }
              style={{
                padding: "0.5rem",
                borderRadius: "4px",
                background: "var(--bg-secondary)",
                color: "var(--text-primary)",
                border: "1px solid var(--border-color)",
              }}
            >
              <option value={25}>Last 25</option>
              <option value={50}>Last 50</option>
              <option value={100}>Last 100</option>
            </select>
            <button className="btn" onClick={fetchLogs}>
              🔄 Refresh
            </button>
          </div>
        </div>

        <div style={{ maxHeight: "600px", overflowY: "auto" }}>
          {logs.length === 0 ? (
            <p
              style={{
                textAlign: "center",
                padding: "2rem",
                color: "var(--text-muted)",
              }}
            >
              No activity logs found
            </p>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              {logs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "0.75rem 1rem",
                    background: "var(--bg-tertiary)",
                    borderRadius: "8px",
                    borderLeft: `4px solid ${getActionColor(log.action)}`,
                  }}
                >
                  <span style={{ fontSize: "1.5rem", marginRight: "1rem" }}>
                    {getActionIcon(log.action)}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontWeight: "500",
                        color: "var(--text-primary)",
                      }}
                    >
                      {formatAction(log.action)}
                    </div>
                    <div
                      style={{
                        fontSize: "0.85rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      by {log.users?.name || "Unknown"} (
                      {log.users?.email || "N/A"})
                      {log.entity_type &&
                        ` • ${log.entity_type} #${log.entity_id}`}
                    </div>
                    {log.details && (
                      <div
                        style={{
                          fontSize: "0.8rem",
                          color: "var(--text-muted)",
                          marginTop: "0.25rem",
                        }}
                      >
                        {JSON.stringify(log.details)}
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--text-secondary)",
                      textAlign: "right",
                    }}
                  >
                    <div>{new Date(log.created_at).toLocaleDateString()}</div>
                    <div>{new Date(log.created_at).toLocaleTimeString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
