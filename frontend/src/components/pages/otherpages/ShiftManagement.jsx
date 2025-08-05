import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const ShiftManagement = () => {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [users, setUsers] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const token =
    localStorage.getItem("erp_token") || sessionStorage.getItem("erp_token");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [bulkShiftId, setBulkShiftId] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [shiftsRes, usersRes] = await Promise.all([
          axios.get("/api/hr/shifts/all", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`/api/hr/shifts/assignments?date=${date}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        setShifts(shiftsRes.data.shifts || []);
        setUsers(usersRes.data.users || []);
      } catch {
        setShifts([]);
        setUsers([]);
      }
      setLoading(false);
    };
    fetchData();
    // eslint-disable-next-line
  }, [date]);

  const handleShiftChange = (userId, shiftId) => {
    setUsers((users) =>
      users.map((u) => (u.id === userId ? { ...u, shift_id: shiftId } : u))
    );
  };

  const handleSave = async (userId, shiftId) => {
    setSaving(true);
    try {
      await axios.post(
        "/api/hr/shifts/assign",
        { user_id: userId, shift_id: shiftId, date },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch {}
    setSaving(false);
  };

  // Unique roles and departments for filters
  const uniqueRoles = Array.from(
    new Set(users.map((u) => u.role).filter(Boolean))
  );
  const uniqueDepartments = Array.from(
    new Set(users.map((u) => u.department).filter(Boolean))
  );

  // Filtered users
  let filteredUsers = users;
  if (search.trim()) {
    const s = search.trim().toLowerCase();
    filteredUsers = filteredUsers.filter(
      (u) =>
        (u.name || "").toLowerCase().includes(s) ||
        (u.username || "").toLowerCase().includes(s) ||
        (u.role || "").toLowerCase().includes(s) ||
        (u.department || "").toLowerCase().includes(s)
    );
  }
  if (roleFilter) {
    filteredUsers = filteredUsers.filter((u) => u.role === roleFilter);
  }
  if (departmentFilter) {
    filteredUsers = filteredUsers.filter(
      (u) => u.department === departmentFilter
    );
  }

  // Handle individual checkbox
  const handleCheckboxChange = (userId) => {
    setSelectedUserIds((ids) =>
      ids.includes(userId)
        ? ids.filter((id) => id !== userId)
        : [...ids, userId]
    );
  };
  // Handle select all
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedUserIds(filteredUsers.map((u) => u.id));
    } else {
      setSelectedUserIds([]);
    }
  };

  // Bulk assign handler
  const handleBulkAssign = async () => {
    if (!bulkShiftId) return;
    setSaving(true);
    try {
      await Promise.all(
        filteredUsers
          .filter((user) => selectedUserIds.includes(user.id))
          .map((user) =>
            axios.post(
              "/api/hr/shifts/assign",
              { user_id: user.id, shift_id: bulkShiftId, date },
              { headers: { Authorization: `Bearer ${token}` } }
            )
          )
      );
      setUsers((users) =>
        users.map((u) =>
          selectedUserIds.includes(u.id) ? { ...u, shift_id: bulkShiftId } : u
        )
      );
    } catch {}
    setSaving(false);
  };

  return (
    <div
      style={{
        maxWidth: 1000,
        height: 750,
        margin: "32px auto",
        padding: 24,
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 2px 12px #e3e8f0",
        display: "flex",
        flexDirection: "column",
      }}
    >
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
      <h2 style={{ marginBottom: 24, color: "#174ea6" }}>Shift Management</h2>
      <div
        style={{
          marginBottom: 18,
          display: "flex",
          gap: 12,
          alignItems: "center",
        }}
      >
        <label style={{ fontWeight: 500, marginRight: 8 }}>Date:</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <input
          type="text"
          placeholder="Search by name, username, role, department"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            marginLeft: 16,
            padding: 5,
            borderRadius: 5,
            border: "1px solid #cfd8dc",
            width: 180,
          }}
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={{ padding: 5, borderRadius: 5 }}
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
          style={{ padding: 5, borderRadius: 5 }}
        >
          <option value="">All Departments</option>
          {uniqueDepartments.map((dep) => (
            <option key={dep} value={dep}>
              {dep}
            </option>
          ))}
        </select>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select
            value={bulkShiftId}
            onChange={(e) => setBulkShiftId(e.target.value)}
            style={{ padding: 5, borderRadius: 5 }}
          >
            <option value="">Bulk Assign Shift</option>
            {shifts.map((shift) => (
              <option key={shift.id} value={shift.id}>
                {shift.name} ({shift.start_time.slice(0, 5)} -{" "}
                {shift.end_time.slice(0, 5)})
              </option>
            ))}
          </select>
          <button
            onClick={handleBulkAssign}
            disabled={saving || !bulkShiftId || selectedUserIds.length === 0}
            style={{
              padding: "4px 10px",
              fontSize: 13,
              borderRadius: 5,
              border: "1px solid #2196f3",
              background: "#e3f2fd",
              color: "#174ea6",
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            Bulk Assign
          </button>
        </div>
      </div>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div
          style={{
            flex: 1,
            overflow: "auto",
            border: "1px solid #e3e8f0",
            borderRadius: 8,
            background: "#fafbfc",
          }}
        >
          <table
            style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}
          >
            <thead
              style={{
                position: "sticky",
                top: 0,
                background: "#fff",
                zIndex: 1,
              }}
            >
              <tr>
                <th style={{ padding: 8 }}>
                  <input
                    type="checkbox"
                    checked={
                      filteredUsers.length > 0 &&
                      selectedUserIds.length === filteredUsers.length
                    }
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    style={{ transform: "scale(1.2)" }}
                  />
                </th>
                <th style={{ textAlign: "left", padding: 8 }}>Name</th>
                <th style={{ textAlign: "left", padding: 8 }}>Username</th>
                <th style={{ textAlign: "left", padding: 8 }}>Role</th>
                <th style={{ textAlign: "left", padding: 8 }}>Department</th>
                <th style={{ textAlign: "left", padding: 8 }}>
                  Assigned Shift
                </th>
                <th style={{ textAlign: "left", padding: 8 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7}>No users found.</td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td style={{ padding: 8 }}>
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(user.id)}
                        onChange={() => handleCheckboxChange(user.id)}
                      />
                    </td>
                    <td style={{ padding: 8 }}>{user.name || "-"}</td>
                    <td style={{ padding: 8 }}>{user.username}</td>
                    <td style={{ padding: 8 }}>{user.role}</td>
                    <td style={{ padding: 8 }}>{user.department || "-"}</td>
                    <td style={{ padding: 8 }}>
                      <select
                        value={user.shift_id || ""}
                        onChange={(e) =>
                          handleShiftChange(user.id, e.target.value)
                        }
                        style={{ padding: 5, borderRadius: 5 }}
                      >
                        <option value="">-- Select Shift --</option>
                        {shifts.map((shift) => (
                          <option key={shift.id} value={shift.id}>
                            {shift.name} ({shift.start_time.slice(0, 5)} -{" "}
                            {shift.end_time.slice(0, 5)})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: 8 }}>
                      <button
                        onClick={() => handleSave(user.id, user.shift_id)}
                        disabled={saving || !user.shift_id}
                        style={{
                          padding: "4px 10px",
                          fontSize: 13,
                          borderRadius: 5,
                          border: "1px solid #2196f3",
                          background: "#e3f2fd",
                          color: "#174ea6",
                          cursor: saving ? "not-allowed" : "pointer",
                        }}
                      >
                        Save
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ShiftManagement;
