import React from "react";
import "../../css/PmDashboard.css";
import { useNavigate } from "react-router-dom";
import { NavLink } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import axios from "axios";

const features = [
  "Project List",
  "Team Overview",
  "Task Board",
  "Deadlines",
  "Reports",
  "Resource Allocation",
];

const PmDashboard = () => {
  const navigate = useNavigate();
  let user = { username: "", role: "", id: null };
  let token =
    localStorage.getItem("erp_token") || sessionStorage.getItem("erp_token");
  if (token) {
    try {
      const decoded = jwtDecode(token);
      user.id = decoded.userId || decoded.id || null;
      user.username = decoded.username || decoded.name || decoded.email || "PM";
      user.role = decoded.role || "PM";
    } catch {}
  }
  const [userInfo, setUserInfo] = React.useState({
    username: user.username,
    role: user.role,
  });
  React.useEffect(() => {
    if (user.id) {
      axios
        .get(`/api/admin/users/${user.id}`)
        .then((res) => {
          const u = res.data.user;
          setUserInfo({
            username: u.username || u.name || u.email || user.username,
            role: u.role || user.role,
          });
        })
        .catch(() => setUserInfo({ username: user.username, role: user.role }));
    }
  }, [user.id]);
  // Remove notification state, API calls, handlers, and UI elements
  const handleLogout = () => {
    localStorage.removeItem("erp_token");
    sessionStorage.removeItem("erp_token");
    navigate("/login");
  };
  return (
    <div className="pm-dashboard-container">
      <aside className="pm-sidebar">
        <h2 className="pm-sidebar-title">Project Manager</h2>
        <nav className="pm-sidebar-nav">
          <NavLink to="/announcements" className="pm-sidebar-link">
            Announcements
          </NavLink>
          <NavLink to="/messages" className="pm-sidebar-link">
            Messages
          </NavLink>
          <NavLink to="/expense-management" className="pm-sidebar-link">
            Expense Management
          </NavLink>
          {features.map((f) => (
            <a key={f} href="#" className="pm-sidebar-link">
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
      <main className="pm-main">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 18,
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 600, color: "#174ea6" }}>
            Hello, {userInfo.username}!{" "}
            <span style={{ fontSize: 16, fontWeight: 400, color: "#7a8ca3" }}>
              ({userInfo.role})
            </span>
          </div>
          {/* Remove notification UI elements */}
        </div>
        <h1 className="pm-dashboard-title">PM Dashboard</h1>
        <div className="pm-widgets">
          <div className="pm-widget">
            <h3 className="pm-widget-title">Project List</h3>
            <div className="pm-widget-placeholder">[Widget Placeholder]</div>
          </div>
          <div className="pm-widget">
            <h3 className="pm-widget-title">Team Overview</h3>
            <div className="pm-widget-placeholder">[Widget Placeholder]</div>
          </div>
          <div className="pm-widget">
            <h3 className="pm-widget-title">Task Board</h3>
            <div className="pm-widget-placeholder">[Widget Placeholder]</div>
          </div>
          <div className="pm-widget">
            <h3 className="pm-widget-title">Deadlines</h3>
            <div className="pm-widget-placeholder">[Widget Placeholder]</div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PmDashboard;
