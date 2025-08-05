import React from "react";
import "../../css/ClientDashboard.css";
import { useNavigate } from "react-router-dom";
import { NavLink } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import { useState, useEffect } from "react";

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
  let user = { username: "", role: "", id: null };
  let token =
    localStorage.getItem("erp_token") || sessionStorage.getItem("erp_token");
  if (token) {
    try {
      const decoded = jwtDecode(token);
      user.id = decoded.userId || decoded.id || null;
      user.username =
        decoded.username || decoded.name || decoded.email || "Client";
      user.role = decoded.role || "Client";
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
    <div className="client-dashboard-container">
      <aside className="client-sidebar">
        <h2 className="client-sidebar-title">Client</h2>
        <nav className="client-sidebar-nav">
          <NavLink to="/announcements" className="client-sidebar-link">
            Announcements
          </NavLink>
          <NavLink to="/messages" className="client-sidebar-link">
            Messages
          </NavLink>
          <NavLink to="/expense-management" className="client-sidebar-link">
            Expense Management
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
            Hello, {userInfo.username}!{" "}
            <span style={{ fontSize: 16, fontWeight: 400, color: "#7a8ca3" }}>
              ({userInfo.role})
            </span>
          </div>
          {/* Remove notification UI elements */}
        </div>
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
