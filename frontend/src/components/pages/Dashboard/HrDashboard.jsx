import React from "react";
import "../../css/HrDashboard.css";
import { useNavigate } from "react-router-dom";
import { NavLink } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import { useState, useEffect } from "react";

const features = [
  // "Employee List", // Removed from sidebar
];

const HrDashboard = () => {
  const navigate = useNavigate();
  // Get user info from JWT
  let user = { username: "", role: "", id: null };
  let token =
    localStorage.getItem("erp_token") || sessionStorage.getItem("erp_token");
  if (token) {
    try {
      const decoded = jwtDecode(token);
      user.id = decoded.userId || decoded.id || null;
      user.username = decoded.username || decoded.name || decoded.email || "HR";
      user.role = decoded.role || "HR";
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

  // Employee List State
  const [employeeList, setEmployeeList] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [search, setSearch] = useState("");

  // Fetch employee list with attendance
  const fetchEmployees = async (searchValue = "") => {
    setLoadingEmployees(true);
    try {
      let query = "";
      if (searchValue) {
        // Send the same value for all three params
        query = `?name=${encodeURIComponent(
          searchValue
        )}&department=${encodeURIComponent(
          searchValue
        )}&role=${encodeURIComponent(searchValue)}`;
      }
      const res = await axios.get(`/api/admin/attendance/today${query}`);
      setEmployeeList(res.data.attendance || []);
    } catch {
      setEmployeeList([]);
    }
    setLoadingEmployees(false);
  };
  useEffect(() => {
    fetchEmployees(search);
    // eslint-disable-next-line
  }, [search]);

  // Attendance Percentage State
  const [attendancePercent, setAttendancePercent] = useState(null);
  const [overtimeCount, setOvertimeCount] = useState(null);

  // Leave Management State
  const [pendingLeaveCount, setPendingLeaveCount] = useState(null);

  // Shift Request Management State
  const [pendingShiftRequestCount, setPendingShiftRequestCount] =
    useState(null);

  useEffect(() => {
    if (user.id) {
      const token =
        localStorage.getItem("erp_token") ||
        sessionStorage.getItem("erp_token");
      axios
        .get(`/api/hr/attendance/percentage/${user.id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        .then((res) => setAttendancePercent(res.data.attendance_percentage))
        .catch(() => setAttendancePercent(null));

      axios
        .get(`/api/hr/attendance/overtime-count/${user.id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        .then((res) => setOvertimeCount(res.data.overtime_count))
        .catch(() => setOvertimeCount(null));

      // Fetch pending leave requests count
      axios
        .get(`/api/hr/leave-requests/pending-count`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        .then((res) => setPendingLeaveCount(res.data.pendingCount))
        .catch(() => setPendingLeaveCount(null));

      // Fetch pending shift change requests count
      axios
        .get(`/api/shift-requests/pending-count`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        .then((res) => setPendingShiftRequestCount(res.data.count))
        .catch(() => setPendingShiftRequestCount(null));
    }
  }, [user.id]);

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
          <NavLink to="/announcements" className="hr-sidebar-link">
            Announcements
          </NavLink>
          <NavLink to="/messages" className="hr-sidebar-link">
            Messages
          </NavLink>
          <NavLink to="/attendance-tracking" className="hr-sidebar-link">
            Attendance Tracking
          </NavLink>
          <NavLink to="/shift-management" className="hr-sidebar-link">
            Shift Management
          </NavLink>
          <NavLink to="/task-management" className="hr-sidebar-link">
            Task Management
          </NavLink>
          <NavLink to="/leave-management" className="hr-sidebar-link">
            Leave Management
          </NavLink>
          <NavLink to="/shift-request-management" className="hr-sidebar-link">
            Shift Request Management
          </NavLink>
          <NavLink to="/expense-management" className="hr-sidebar-link">
            Expense Management
          </NavLink>
          <NavLink to="/payroll-management" className="hr-sidebar-link">
            Payroll Management
          </NavLink>
          <NavLink to="/payslips" className="hr-sidebar-link">
            View Payslips
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
        {/* Attendance Percentage Widget */}
        <div
          style={{
            maxWidth: 220,
            margin: "0 0 24px 0",
            padding: 18,
            background: "#e3f2fd",
            borderRadius: 10,
            boxShadow: "0 1px 6px #e3e8f0",
            fontWeight: 600,
            fontSize: 18,
            color: "#174ea6",
            display: "inline-block",
          }}
        >
          Attendance This Year:{" "}
          {attendancePercent !== null ? `${attendancePercent}%` : "-"}
          <div
            style={{
              fontSize: 15,
              color: "#d84315",
              fontWeight: 500,
              marginTop: 8,
            }}
          >
            Overtime Shifts: {overtimeCount !== null ? overtimeCount : "-"}
          </div>
        </div>
        <div
          style={{
            maxWidth: 220,
            margin: "0 0 24px 24px",
            padding: 18,
            background: "#fff3e0",
            borderRadius: 10,
            boxShadow: "0 1px 6px #e3e8f0",
            fontWeight: 600,
            fontSize: 18,
            color: "#e65100",
            display: "inline-block",
          }}
        >
          Pending Leave Requests:{" "}
          {pendingLeaveCount !== null ? pendingLeaveCount : "-"}
        </div>
        <div
          style={{
            maxWidth: 220,
            margin: "0 0 24px 24px",
            padding: 18,
            background: "#e8f5e8",
            borderRadius: 10,
            boxShadow: "0 1px 6px #e3e8f0",
            fontWeight: 600,
            fontSize: 18,
            color: "#2e7d32",
            display: "inline-block",
          }}
        >
          Pending Shift Requests:{" "}
          {pendingShiftRequestCount !== null ? pendingShiftRequestCount : "-"}
        </div>
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
        </div>
        <h1 className="hr-dashboard-title">HR Dashboard</h1>
        <div className="hr-widgets">
          <div className="hr-widget">
            <h3 className="hr-widget-title">Employee List</h3>
            {/* Employee List Implementation */}
            <div className="employee-list-search-bar">
              <input
                type="text"
                placeholder="Search by name, department, or role"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ marginRight: 8, width: 260 }}
              />
            </div>
            {loadingEmployees ? (
              <div>Loading employees...</div>
            ) : (
              <table className="employee-list-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Department</th>
                    <th>Role</th>
                    <th>Attendance</th>
                    <th>Time In</th>
                  </tr>
                </thead>
                <tbody>
                  {employeeList.length === 0 ? (
                    <tr>
                      <td colSpan={7}>No employees found.</td>
                    </tr>
                  ) : (
                    employeeList.map((emp) => (
                      <tr key={emp.id}>
                        <td>{emp.name || "-"}</td>
                        <td>{emp.username}</td>
                        <td>{emp.email}</td>
                        <td>{emp.department || "-"}</td>
                        <td>{emp.role}</td>
                        <td>
                          {emp.attendance_status === "Present" ? (
                            <span style={{ color: "green", fontWeight: 600 }}>
                              Present
                            </span>
                          ) : (
                            <span style={{ color: "#b71c1c", fontWeight: 600 }}>
                              Absent
                            </span>
                          )}
                        </td>
                        <td>{emp.time_in ? emp.time_in.slice(0, 5) : "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
          <div className="hr-widget">
            <h3 className="hr-widget-title">Shift Management</h3>
            <div className="hr-widget-placeholder">[Widget Placeholder]</div>
          </div>
          <div className="hr-widget">
            <h3 className="hr-widget-title">Leave Requests</h3>
            <div className="hr-widget-placeholder">[Widget Placeholder]</div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HrDashboard;
