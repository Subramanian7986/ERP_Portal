import React from "react";
import "../../css/ItDashboard.css";
import { useNavigate } from "react-router-dom";
import { NavLink } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

import axios from "axios";

const features = [
  { name: "Asset Requests", path: "/asset-request-management" },
  { name: "Vendors", path: "/vendor-management" },
];

const ItDashboard = () => {
  const navigate = useNavigate();
  let user = { username: "", role: "", id: null };
  let token =
    localStorage.getItem("erp_token") || sessionStorage.getItem("erp_token");
  if (token) {
    try {
      const decoded = jwtDecode(token);
      user.id = decoded.userId || decoded.id || null;
      user.username = decoded.username || decoded.name || decoded.email || "IT";
      user.role = decoded.role || "IT";
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
    <div className="it-dashboard-container">
      <aside className="it-sidebar">
        <h2 className="it-sidebar-title">IT/Asset Manager</h2>
        <nav className="it-sidebar-nav">
          <NavLink to="/announcements" className="it-sidebar-link">
            Announcements
          </NavLink>
          <NavLink to="/messages" className="it-sidebar-link">
            Messages
          </NavLink>
          <NavLink to="/my-tasks" className="it-sidebar-link">
            My Tasks
          </NavLink>
          <NavLink to="/shift-change-request" className="it-sidebar-link">
            Request Shift Change
          </NavLink>
          <NavLink to="/my-shift-requests" className="it-sidebar-link">
            My Shift Requests
          </NavLink>
          <NavLink to="/it-inventory" className="it-sidebar-link">
            IT Inventory
          </NavLink>
          <NavLink to="/expense-management" className="it-sidebar-link">
            Expense Management
          </NavLink>
          <NavLink to="/payslips" className="it-sidebar-link">
            My Payslips
          </NavLink>
          {features.map((f) => (
            <NavLink key={f.name} to={f.path} className="it-sidebar-link">
              {f.name}
            </NavLink>
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
      <main className="it-main">
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

        <h1 className="it-dashboard-title">IT Dashboard</h1>
        <div className="it-widgets">
          <div className="it-widget">
            <h3 className="it-widget-title">IT Inventory</h3>
            <div className="it-widget-placeholder">[Widget Placeholder]</div>
          </div>
          <div className="it-widget">
            <h3 className="it-widget-title">Asset Requests</h3>
            <div className="it-widget-placeholder">[Widget Placeholder]</div>
          </div>
          <div className="it-widget">
            <h3 className="it-widget-title">Maintenance</h3>
            <div className="it-widget-placeholder">[Widget Placeholder]</div>
          </div>
          <div className="it-widget">
            <h3 className="it-widget-title">System Health</h3>
            <div className="it-widget-placeholder">[Widget Placeholder]</div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ItDashboard;
