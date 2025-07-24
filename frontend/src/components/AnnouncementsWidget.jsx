import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AnnouncementsWidget.css";

const AnnouncementsWidget = ({ role, userId }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [readIds, setReadIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [marking, setMarking] = useState({});
  const [expanded, setExpanded] = useState({});
  const [showCount, setShowCount] = useState(5);
  const [visible, setVisible] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    setError("");
    Promise.all([
      fetch(
        `/api/admin/announcements?role=${encodeURIComponent(role || "")}`
      ).then((res) => res.json()),
      userId
        ? fetch(`/api/admin/announcements/reads?user_id=${userId}`).then(
            (res) => res.json()
          )
        : Promise.resolve({ readIds: [] }),
    ])
      .then(([data, reads]) => {
        setAnnouncements(data.announcements || []);
        setReadIds(reads.readIds || []);
      })
      .catch(() => setError("Failed to load announcements."))
      .finally(() => setLoading(false));
  }, [role, userId]);

  const handleMarkAsRead = (id) => {
    if (!userId) return;
    setMarking((prev) => ({ ...prev, [id]: true }));
    fetch(`/api/admin/announcements/${id}/read`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setReadIds((prev) => [...prev, id]);
      })
      .catch(() => {})
      .finally(() => setMarking((prev) => ({ ...prev, [id]: false })));
  };

  const handleExpand = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleShowMore = () => {
    setShowCount((prev) => prev + 5);
  };

  if (!visible) return null;

  return (
    <div className="ann-widget-container">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h3 className="ann-widget-title">Announcements</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button
            className="ann-widget-viewall-btn"
            onClick={() => navigate("/announcements")}
            title="View all announcements"
          >
            View all
          </button>
          <button
            className="ann-widget-hide-btn"
            onClick={() => setVisible(false)}
            title="Hide announcements widget"
          >
            ✕
          </button>
        </div>
      </div>
      {loading ? (
        <div className="ann-widget-loading">Loading...</div>
      ) : error ? (
        <div className="ann-widget-error">{error}</div>
      ) : announcements.length === 0 ? (
        <div className="ann-widget-empty">No announcements.</div>
      ) : (
        <ul className="ann-widget-list">
          {announcements.slice(0, showCount).map((a) => {
            const isRead = readIds.includes(a.id);
            const isExpanded = expanded[a.id];
            return (
              <li
                key={a.id}
                className={`ann-widget-item${
                  isRead ? " ann-widget-item-read" : ""
                }`}
              >
                <div
                  className="ann-widget-item-header"
                  style={{ cursor: "pointer" }}
                  onClick={() => handleExpand(a.id)}
                  title={isExpanded ? "Collapse" : "Expand for details"}
                >
                  <span className="ann-widget-item-title">{a.title}</span>
                  <span className="ann-widget-item-date">
                    {new Date(a.created_at).toLocaleDateString()}
                  </span>
                </div>
                {(isExpanded || a.message.length < 100) && (
                  <div className="ann-widget-item-message">{a.message}</div>
                )}
                {isExpanded && (
                  <div className="ann-widget-item-meta">
                    By: {a.creator} | {new Date(a.created_at).toLocaleString()}
                  </div>
                )}
                {!isRead && userId && (
                  <button
                    className="ann-widget-mark-btn"
                    onClick={() => handleMarkAsRead(a.id)}
                    disabled={marking[a.id]}
                  >
                    {marking[a.id] ? "Marking..." : "Mark as read"}
                  </button>
                )}
                {isRead && <span className="ann-widget-read-label">Read</span>}
                {!isExpanded && a.message.length >= 100 && (
                  <button
                    className="ann-widget-expand-btn"
                    onClick={() => handleExpand(a.id)}
                    title="Expand for details"
                  >
                    More
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {announcements.length > showCount && (
        <button className="ann-widget-showmore-btn" onClick={handleShowMore}>
          Show more
        </button>
      )}
    </div>
  );
};

export default AnnouncementsWidget;
