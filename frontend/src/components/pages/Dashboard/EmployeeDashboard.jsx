import React from "react";
import "../../css/EmployeeDashboard.css";
import { useNavigate } from "react-router-dom";
import { NavLink } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import { useState, useEffect } from "react";

const features = ["My Tasks", "Leave Balance"];

const EmployeeDashboard = () => {
  const navigate = useNavigate();
  let user = { username: "", role: "", id: null };
  let token =
    localStorage.getItem("erp_token") || sessionStorage.getItem("erp_token");
  if (token) {
    try {
      const decoded = jwtDecode(token);
      user.id = decoded.userId || decoded.id || null;
      user.username =
        decoded.username || decoded.name || decoded.email || "Employee";
      user.role = decoded.role || "Employee";
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
    <div className="employee-dashboard-container">
      <aside className="employee-sidebar">
        <h2 className="employee-sidebar-title">Employee</h2>
        <nav className="employee-sidebar-nav">
          <NavLink to="/announcements" className="employee-sidebar-link">
            Announcements
          </NavLink>
          <NavLink to="/messages" className="employee-sidebar-link">
            Messages
          </NavLink>
          <NavLink to="/my-tasks" className="employee-sidebar-link">
            My Tasks
          </NavLink>
          <NavLink to="/leave-balance" className="employee-sidebar-link">
            Leave Balance
          </NavLink>
          <NavLink to="/shift-change-request" className="employee-sidebar-link">
            Request Shift Change
          </NavLink>
          <NavLink to="/my-shift-requests" className="employee-sidebar-link">
            My Shift Requests
          </NavLink>
          <NavLink to="/asset-request" className="employee-sidebar-link">
            Asset Requests
          </NavLink>
          <NavLink to="/expense-management" className="employee-sidebar-link">
            Expense Management
          </NavLink>
          <NavLink to="/payslips" className="employee-sidebar-link">
            My Payslips
          </NavLink>
          {features
            .filter((f) => f !== "My Tasks" && f !== "Leave Balance")
            .map((f) => (
              <a key={f} href="#" className="employee-sidebar-link">
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
      <main className="employee-main">
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
        <h1 className="employee-dashboard-title">Employee Dashboard</h1>
        <div className="employee-widgets">
          <div className="employee-widget">
            <h3 className="employee-widget-title">My Tasks</h3>
            <div className="employee-widget-placeholder">
              [Widget Placeholder]
            </div>
          </div>
          <div className="employee-widget">
            <h3 className="employee-widget-title">Timesheet</h3>
            <div className="employee-widget-placeholder">
              [Widget Placeholder]
            </div>
          </div>
          <div className="employee-widget">
            <h3 className="employee-widget-title">Leave Balance</h3>
            <div className="employee-widget-placeholder">
              [Widget Placeholder]
            </div>
          </div>
          <div className="employee-widget">
            <h3 className="employee-widget-title">Announcements</h3>
            <div className="employee-widget-placeholder">
              [Widget Placeholder]
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default EmployeeDashboard;
