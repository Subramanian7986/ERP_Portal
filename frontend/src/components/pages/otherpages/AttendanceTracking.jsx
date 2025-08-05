import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const AttendanceTracking = () => {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [attendanceTypeFilter, setAttendanceTypeFilter] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAttendance = async () => {
      setLoading(true);
      try {
        const res = await axios.get("/api/admin/attendance/today");
        setAttendance(res.data.attendance || []);
      } catch {
        setAttendance([]);
      }
      setLoading(false);
    };
    fetchAttendance();
  }, []);

  const total = attendance.length;
  const present = attendance.filter(
    (a) => a.attendance_status === "Present"
  ).length;
  const absent = total - present;
  const percentPresent = total ? Math.round((present / total) * 100) : 0;
  const percentAbsent = total ? Math.round((absent / total) * 100) : 0;
  let absentees = attendance.filter((a) => a.attendance_status !== "Present");

  // Get unique roles and departments for filter dropdowns
  const uniqueRoles = Array.from(
    new Set(attendance.map((emp) => emp.role).filter(Boolean))
  );
  const uniqueDepartments = Array.from(
    new Set(attendance.map((emp) => emp.department).filter(Boolean))
  );

  let filtered = attendance;

  // Apply search input (case-insensitive, partial match)
  if (search.trim()) {
    const s = search.trim().toLowerCase();
    filtered = filtered.filter(
      (emp) =>
        (emp.name || "").toLowerCase().includes(s) ||
        (emp.username || "").toLowerCase().includes(s) ||
        (emp.email || "").toLowerCase().includes(s) ||
        (emp.department || "").toLowerCase().includes(s) ||
        (emp.role || "").toLowerCase().includes(s)
    );
  }
  // Filter by role
  if (roleFilter) {
    filtered = filtered.filter((emp) => emp.role === roleFilter);
  }
  // Filter by department
  if (departmentFilter) {
    filtered = filtered.filter((emp) => emp.department === departmentFilter);
  }
  // Filter by attendance type
  if (attendanceTypeFilter) {
    filtered = filtered.filter(
      (emp) => (emp.attendance_type || "-") === attendanceTypeFilter
    );
  }
  // Sort by attendance_percentage descending
  filtered = filtered.slice().sort((a, b) => {
    const aPct = a.attendance_percentage != null ? a.attendance_percentage : 0;
    const bPct = b.attendance_percentage != null ? b.attendance_percentage : 0;
    return bPct - aPct;
  });

  return (
    <div style={{ minHeight: "100vh", background: "#f5f7fa" }}>
      <button
        onClick={() => navigate(-1)}
        style={{
          position: "fixed",
          top: 18,
          left: 18,
          width: 80,
          height: 32,
          padding: 0,
          fontSize: 14,
          borderRadius: 5,
          border: "1px solid #b0bec5",
          background: "#fff",
          color: "#174ea6",
          cursor: "pointer",
          zIndex: 1000,
          boxShadow: "0 1px 4px #e3e8f0",
          overflow: "hidden",
          whiteSpace: "nowrap",
          textAlign: "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        ← Back
      </button>
      <div
        style={{
          maxWidth: 900,
          height: 600,
          margin: "48px auto 0 auto",
          padding: 24,
          background: "#fff",
          borderRadius: 12,
          boxShadow: "0 2px 12px #e3e8f0",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <h2 style={{ marginBottom: 24, color: "#174ea6" }}>
          Attendance Tracking
        </h2>
        {loading ? (
          <div>Loading attendance data...</div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 32, marginBottom: 32 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 18 }}>
                  Total Employees
                </div>
                <div style={{ fontSize: 22 }}>{total}</div>
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 18, color: "green" }}>
                  Present
                </div>
                <div style={{ fontSize: 22 }}>
                  {present} ({percentPresent}%)
                </div>
              </div>
              <div>
                <div
                  style={{ fontWeight: 600, fontSize: 18, color: "#b71c1c" }}
                >
                  Absent
                </div>
                <div style={{ fontSize: 22 }}>
                  {absent} ({percentAbsent}%)
                </div>
              </div>
            </div>
            <h3 style={{ marginBottom: 12 }}>All Employees</h3>
            <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
              <input
                type="text"
                placeholder="Search by name, username, email, department, or role"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  padding: 6,
                  width: 260,
                  border: "1px solid #cfd8dc",
                  borderRadius: 6,
                }}
              />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                style={{
                  padding: 6,
                  border: "1px solid #cfd8dc",
                  borderRadius: 6,
                }}
              >
                <option value="">All Roles</option>
                {uniqueRoles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                style={{
                  padding: 6,
                  border: "1px solid #cfd8dc",
                  borderRadius: 6,
                }}
              >
                <option value="">All Departments</option>
                {uniqueDepartments.map((dep) => (
                  <option key={dep} value={dep}>
                    {dep}
                  </option>
                ))}
              </select>
              <select
                value={attendanceTypeFilter}
                onChange={(e) => setAttendanceTypeFilter(e.target.value)}
                style={{
                  padding: 6,
                  border: "1px solid #cfd8dc",
                  borderRadius: 6,
                }}
              >
                <option value="">All Types</option>
                <option value="Normal">Normal</option>
                <option value="Overtime">Overtime</option>
              </select>
            </div>
            <div
              style={{
                flex: 1,
                overflow: "auto",
                border: "1px solid #e3e8f0",
                borderRadius: 8,
                background: "#fafbfc",
              }}
            >
              {filtered.length === 0 ? (
                <div style={{ padding: 16 }}>No employees found.</div>
              ) : (
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: 700,
                  }}
                >
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", padding: 8 }}>Name</th>
                      <th style={{ textAlign: "left", padding: 8 }}>
                        Username
                      </th>
                      <th style={{ textAlign: "left", padding: 8 }}>Email</th>
                      <th style={{ textAlign: "left", padding: 8 }}>
                        Department
                      </th>
                      <th style={{ textAlign: "left", padding: 8 }}>Role</th>
                      <th style={{ textAlign: "left", padding: 8 }}>
                        Attendance Type
                      </th>
                      <th style={{ textAlign: "left", padding: 8 }}>
                        Yearly %
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((emp) => (
                      <tr key={emp.id}>
                        <td style={{ padding: 8 }}>{emp.name || "-"}</td>
                        <td style={{ padding: 8 }}>{emp.username}</td>
                        <td style={{ padding: 8 }}>{emp.email}</td>
                        <td style={{ padding: 8 }}>{emp.department || "-"}</td>
                        <td style={{ padding: 8 }}>{emp.role}</td>
                        <td style={{ padding: 8 }}>
                          {emp.attendance_type === "Overtime" ? (
                            <span style={{ color: "#d84315", fontWeight: 700 }}>
                              Overtime
                            </span>
                          ) : emp.attendance_type === "Normal" ? (
                            <span style={{ color: "#388e3c", fontWeight: 600 }}>
                              Normal
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td style={{ padding: 8 }}>
                          {emp.attendance_percentage != null
                            ? emp.attendance_percentage + "%"
                            : "0%"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AttendanceTracking;
