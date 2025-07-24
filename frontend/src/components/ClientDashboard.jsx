import React from "react";
import "./ClientDashboard.css";
import { useNavigate } from "react-router-dom";
import { NavLink } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import AnnouncementsWidget from "./AnnouncementsWidget";

const features = [
  "My Projects",
  "Invoices",
  "Support",
  "Announcements",
  "Files",
  "Project Contacts",
];

const ClientDashboard = () => {
  const navigate = useNavigate();
  let user = { username: "", role: "" };
  let token =
    localStorage.getItem("erp_token") || sessionStorage.getItem("erp_token");
  if (token) {
    try {
      const decoded = jwtDecode(token);
      user.username = decoded.username || decoded.name || "Client";
      user.role = decoded.role || "Client";
    } catch {}
  }
  const [notifications, setNotifications] = React.useState([]);
  const [showDropdown, setShowDropdown] = React.useState(false);
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  React.useEffect(() => {
    const fetchNotifications = () => {
      fetch("/api/client/notifications")
        .then((res) => res.json())
        .then((data) => setNotifications(data.notifications || []));
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAsRead = (id) => {
    console.log("Clicked notification id:", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    fetch(`/api/client/notifications/${id}/read`, { method: "POST" });
  };
  const handleLogout = () => {
    localStorage.removeItem("erp_token");
    sessionStorage.removeItem("erp_token");
    navigate("/login");
  };
  return (
    <div className="client-dashboard-container">
      <aside className="client-sidebar">
        <h2 className="client-sidebar-title">Client</h2>
        <nav className="client-sidebar-nav">
          <NavLink to="/messages" className="client-sidebar-link">
            Messages
          </NavLink>
          {features.map((f) => (
            <a key={f} href="#" className="client-sidebar-link">
              {f}
            </a>
          ))}
        </nav>
        <button
          onClick={handleLogout}
          style={{
            marginTop: "auto",
            background: "linear-gradient(90deg, #2193b0 0%, #6dd5ed 100%)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "0.7rem 0",
            fontSize: "1.08rem",
            fontWeight: "bold",
            letterSpacing: "0.5px",
            cursor: "pointer",
            width: "100%",
            boxShadow: "0 2px 8px rgba(33, 147, 176, 0.10)",
            transition: "background 0.3s, transform 0.2s, box-shadow 0.2s",
            outline: "none",
            textTransform: "capitalize",
          }}
        >
          Logout
        </button>
      </aside>
      <main className="client-main">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 18,
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 600, color: "#174ea6" }}>
            Hello, {user.username}!{" "}
            <span style={{ fontSize: 16, fontWeight: 400, color: "#7a8ca3" }}>
              ({user.role})
            </span>
          </div>
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowDropdown((v) => !v)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                position: "relative",
                fontSize: 24,
              }}
              title="Notifications"
            >
              <span role="img" aria-label="Notifications">
                🔔
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -6,
                    background: "#d32f2f",
                    color: "#fff",
                    borderRadius: "50%",
                    fontSize: 12,
                    width: 18,
                    height: 18,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </button>
            {showDropdown && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: 36,
                  background: "#fff",
                  boxShadow: "0 2px 12px rgba(26,78,138,0.13)",
                  borderRadius: 8,
                  minWidth: 260,
                  zIndex: 20,
                  padding: 10,
                }}
              >
                <div
                  style={{ fontWeight: 600, color: "#174ea6", marginBottom: 8 }}
                >
                  Notifications
                </div>
                {notifications.length === 0 && (
                  <div style={{ color: "#7a8ca3", fontSize: 14 }}>
                    No notifications
                  </div>
                )}
                {notifications.map((n, i) => (
                  <div
                    key={n.id || i}
                    style={{
                      fontSize: 14,
                      color: n.is_read ? "#7a8ca3" : "#174ea6",
                      padding: "6px 0",
                      borderBottom: "1px solid #f0f4fa",
                      cursor: n.is_read ? "default" : "pointer",
                      opacity: n.is_read ? 0.6 : 1,
                    }}
                    onClick={() => !n.is_read && handleMarkAsRead(n.id)}
                  >
                    {n.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <AnnouncementsWidget role={user.role} />
        <h1 className="client-dashboard-title">Client Dashboard</h1>
        <div className="client-widgets">
          <div className="client-widget">
            <h3 className="client-widget-title">My Projects</h3>
            <div className="client-widget-placeholder">
              [Widget Placeholder]
            </div>
          </div>
          <div className="client-widget">
            <h3 className="client-widget-title">Invoices</h3>
            <div className="client-widget-placeholder">
              [Widget Placeholder]
            </div>
          </div>
          <div className="client-widget">
            <h3 className="client-widget-title">Support</h3>
            <div className="client-widget-placeholder">
              [Widget Placeholder]
            </div>
          </div>
          <div className="client-widget">
            <h3 className="client-widget-title">Announcements</h3>
            <div className="client-widget-placeholder">
              [Widget Placeholder]
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ClientDashboard;
