import React from "react";
import "../../css/CrmDashboard.css";
import { useNavigate } from "react-router-dom";
import { NavLink } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import axios from "axios";

const features = [
  "Leads",
  "Opportunities",
  "Client Onboarding",
  "Support Tickets",
  "Campaigns",
  "Sales Reports",
];

const CrmDashboard = () => {
  const navigate = useNavigate();
  let user = { username: "", role: "", id: null };
  let token =
    localStorage.getItem("erp_token") || sessionStorage.getItem("erp_token");
  if (token) {
    try {
      const decoded = jwtDecode(token);
      user.id = decoded.userId || decoded.id || null;
      user.username =
        decoded.username || decoded.name || decoded.email || "CRM";
      user.role = decoded.role || "CRM";
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
    <div className="crm-dashboard-container">
      <aside className="crm-sidebar">
        <h2 className="crm-sidebar-title">CRM Executive</h2>
        <nav className="crm-sidebar-nav">
          <NavLink to="/announcements" className="crm-sidebar-link">
            Announcements
          </NavLink>
          <NavLink to="/messages" className="crm-sidebar-link">
            Messages
          </NavLink>
          <NavLink to="/expense-management" className="crm-sidebar-link">
            Expense Management
          </NavLink>
          {features.map((f) => (
            <a key={f} href="#" className="crm-sidebar-link">
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
      <main className="crm-main">
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
        <h1 className="crm-dashboard-title">CRM Dashboard</h1>
        <div className="crm-widgets">
          <div className="crm-widget">
            <h3 className="crm-widget-title">Leads</h3>
            <div className="crm-widget-placeholder">[Widget Placeholder]</div>
          </div>
          <div className="crm-widget">
            <h3 className="crm-widget-title">Opportunities</h3>
            <div className="crm-widget-placeholder">[Widget Placeholder]</div>
          </div>
          <div className="crm-widget">
            <h3 className="crm-widget-title">Client Onboarding</h3>
            <div className="crm-widget-placeholder">[Widget Placeholder]</div>
          </div>
          <div className="crm-widget">
            <h3 className="crm-widget-title">Support Tickets</h3>
            <div className="crm-widget-placeholder">[Widget Placeholder]</div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CrmDashboard;
