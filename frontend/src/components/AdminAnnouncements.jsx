import React, { useEffect, useState } from "react";
import "./AdminAnnouncements.css";

const AdminAnnouncements = ({ currentUser }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [roles, setRoles] = useState([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Fetch roles and announcements on mount
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/admin/roles").then((res) => res.json()),
      fetch("/api/admin/announcements").then((res) => res.json()),
    ])
      .then(([rolesData, annData]) => {
        setRoles(rolesData.roles || []);
        setAnnouncements(annData.announcements || []);
      })
      .catch(() => setError("Failed to load roles or announcements."))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    fetch("/api/admin/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        message,
        target_role: targetRole || null,
        created_by: 3, // use valid admin user ID
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setSuccess("Announcement created.");
          setTitle("");
          setMessage("");
          setTargetRole("");
          // Refresh announcements
          return fetch("/api/admin/announcements").then((res) => res.json());
        } else {
          throw new Error(data.error || "Failed to create announcement.");
        }
      })
      .then((annData) => setAnnouncements(annData.announcements || []))
      .catch((err) => setError(err.message || "Failed to create announcement."))
      .finally(() => setSaving(false));
  };

  const handleDelete = (id) => {
    if (!window.confirm("Delete this announcement?")) return;
    setSaving(true);
    setError("");
    setSuccess("");
    fetch(`/api/admin/announcements/${id}`, { method: "DELETE" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setSuccess("Announcement deleted.");
          setAnnouncements((prev) => prev.filter((a) => a.id !== id));
        } else {
          throw new Error(data.error || "Failed to delete announcement.");
        }
      })
      .catch((err) => setError(err.message || "Failed to delete announcement."))
      .finally(() => setSaving(false));
  };

  return (
    <div className="admin-announcements-container">
      <h2>Manage Announcements</h2>
      {error && <div className="aa-error">{error}</div>}
      {success && <div className="aa-success">{success}</div>}
      <form className="aa-form" onSubmit={handleCreate}>
        <div className="aa-form-row">
          <label htmlFor="aa-title">Title:</label>
          <input
            id="aa-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            disabled={saving}
          />
        </div>
        <div className="aa-form-row">
          <label htmlFor="aa-message">Message:</label>
          <textarea
            id="aa-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            disabled={saving}
            rows={3}
          />
        </div>
        <div className="aa-form-row">
          <label htmlFor="aa-target-role">Target Role:</label>
          <select
            id="aa-target-role"
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            disabled={saving}
          >
            <option value="">All Roles</option>
            {roles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>
        <button className="aa-create-btn" type="submit" disabled={saving}>
          {saving ? "Creating..." : "Create Announcement"}
        </button>
      </form>
      <h3>Existing Announcements</h3>
      {loading ? (
        <div className="aa-loading">Loading...</div>
      ) : (
        <ul className="aa-list">
          {announcements.map((a) => (
            <li key={a.id} className="aa-item">
              <div className="aa-item-header">
                <span className="aa-title">{a.title}</span>
                <button
                  className="aa-delete-btn"
                  onClick={() => handleDelete(a.id)}
                  disabled={saving}
                  title="Delete announcement"
                >
                  🗑
                </button>
              </div>
              <div className="aa-message">{a.message}</div>
              <div className="aa-meta">
                <span>By: {a.creator}</span>
                {a.target_role && <span> | Role: {a.target_role}</span>}
                <span> | {new Date(a.created_at).toLocaleString()}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AdminAnnouncements;
