import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AnnouncementsPage.css";

const AnnouncementsPage = ({ userId, role }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [readIds, setReadIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // all, read, unread
  const [expanded, setExpanded] = useState({});
  const [marking, setMarking] = useState({});
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

  const filtered = announcements.filter((a) => {
    const isRead = readIds.includes(a.id);
    if (filter === "read" && !isRead) return false;
    if (filter === "unread" && isRead) return false;
    if (
      search &&
      !(
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        a.message.toLowerCase().includes(search.toLowerCase())
      )
    )
      return false;
    return true;
  });

  return (
    <div className="ann-page-container">
      <button
        className="ann-page-back-btn"
        onClick={() =>
          navigate(`/dashboard/${role ? role.toLowerCase() : "admin"}`)
        }
        style={{ marginBottom: 18 }}
      >
        ← Back to Dashboard
      </button>
      <h2>All Announcements</h2>
      <div className="ann-page-controls">
        <input
          className="ann-page-search"
          type="text"
          placeholder="Search announcements..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="ann-page-filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All</option>
          <option value="unread">Unread</option>
          <option value="read">Read</option>
        </select>
      </div>
      {loading ? (
        <div className="ann-page-loading">Loading...</div>
      ) : error ? (
        <div className="ann-page-error">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="ann-page-empty">No announcements found.</div>
      ) : (
        <ul className="ann-page-list">
          {filtered.map((a) => {
            const isRead = readIds.includes(a.id);
            const isExpanded = expanded[a.id];
            return (
              <li
                key={a.id}
                className={`ann-page-item${
                  isRead ? " ann-page-item-read" : ""
                }`}
              >
                <div
                  className="ann-page-item-header"
                  style={{ cursor: "pointer" }}
                  onClick={() => handleExpand(a.id)}
                  title={isExpanded ? "Collapse" : "Expand for details"}
                >
                  <span className="ann-page-item-title">{a.title}</span>
                  <span className="ann-page-item-date">
                    {new Date(a.created_at).toLocaleDateString()}
                  </span>
                </div>
                {(isExpanded || a.message.length < 100) && (
                  <div className="ann-page-item-message">{a.message}</div>
                )}
                {isExpanded && (
                  <div className="ann-page-item-meta">
                    By: {a.creator} | {new Date(a.created_at).toLocaleString()}
                  </div>
                )}
                {!isRead && userId && (
                  <button
                    className="ann-page-mark-btn"
                    onClick={() => handleMarkAsRead(a.id)}
                    disabled={marking[a.id]}
                  >
                    {marking[a.id] ? "Marking..." : "Mark as read"}
                  </button>
                )}
                {isRead && <span className="ann-page-read-label">Read</span>}
                {!isExpanded && a.message.length >= 100 && (
                  <button
                    className="ann-page-expand-btn"
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
    </div>
  );
};

export default AnnouncementsPage;
