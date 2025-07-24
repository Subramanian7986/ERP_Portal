import React from "react";
import "./HrDashboard.css";
import { useNavigate } from "react-router-dom";
import { NavLink } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import AnnouncementsWidget from "./AnnouncementsWidget";

const features = [
  "Employee List",
  "Shift Management",
  "Leave Requests",
  "Announcements",
  "Attendance Tracking",
  "Payroll Overview",
];

const HrDashboard = () => {
  const navigate = useNavigate();
  // Get user info from JWT
  let user = { username: "", role: "" };
  let token =
    localStorage.getItem("erp_token") || sessionStorage.getItem("erp_token");
  if (token) {
    try {
      const decoded = jwtDecode(token);
      user.username = decoded.username || decoded.name || "HR";
      user.role = decoded.role || "HR";
    } catch {}
  }
  // Notification state
  const [notifications, setNotifications] = React.useState([]);
  const [showDropdown, setShowDropdown] = React.useState(false);
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Polling for notifications every 10 seconds
  React.useEffect(() => {
    const fetchNotifications = () => {
      fetch("/api/hr/notifications")
        .then((res) => res.json())
        .then((data) => setNotifications(data.notifications || []));
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  // Mark notification as read
  const handleMarkAsRead = (id) => {
    console.log("Clicked notification id:", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    fetch(`/api/hr/notifications/${id}/read`, { method: "POST" });
  };
  const handleLogout = () => {
    localStorage.removeItem("erp_token");
    sessionStorage.removeItem("erp_token");
    navigate("/login");
  };
  return (
    <div className="hr-dashboard-container">
      <aside className="hr-sidebar">
        <h2 className="hr-sidebar-title">HR Manager</h2>
        <nav className="hr-sidebar-nav">
          <NavLink to="/messages" className="hr-sidebar-link">
            Messages
          </NavLink>
          {features.map((f) => (
            <a key={f} href="#" className="hr-sidebar-link">
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
      <main className="hr-main">
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
        <h1 className="hr-dashboard-title">HR Dashboard</h1>
        <div className="hr-widgets">
          <div className="hr-widget">
            <h3 className="hr-widget-title">Employee List</h3>
            <div className="hr-widget-placeholder">[Widget Placeholder]</div>
          </div>
          <div className="hr-widget">
            <h3 className="hr-widget-title">Shift Management</h3>
            <div className="hr-widget-placeholder">[Widget Placeholder]</div>
          </div>
          <div className="hr-widget">
            <h3 className="hr-widget-title">Leave Requests</h3>
            <div className="hr-widget-placeholder">[Widget Placeholder]</div>
          </div>
          <div className="hr-widget">
            <h3 className="hr-widget-title">Announcements</h3>
            <div className="hr-widget-placeholder">[Widget Placeholder]</div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HrDashboard;
