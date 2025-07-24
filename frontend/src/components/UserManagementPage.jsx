import React, { useEffect, useState } from "react";
import LoadingSpinner from "./LoadingSpinner";
import ErrorMessage from "./ErrorMessage";
import { useNavigate } from "react-router-dom";
import "./UserManagementPage.css";

const roleOptions = [
  "Admin",
  "HR",
  "PM",
  "Developer",
  "Employee",
  "Finance",
  "CRM",
  "Client",
  "Procurement",
  "IT",
];

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const navigate = useNavigate();
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    username: "",
    email: "",
    role: "",
    password: "",
    is_active: true,
  });
  const [addError, setAddError] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  // 1. Add edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    id: null,
    username: "",
    email: "",
    role: "",
    is_active: true,
  });
  const [editError, setEditError] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  // 2. Add reset password modal state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetUserId, setResetUserId] = useState(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  // 3. Bulk selection state
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch users");
      setUsers(data.users);
    } catch (err) {
      setError(err.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleActive = async (id) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${id}/deactivate`, {
        method: "PATCH",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update user");
      await fetchUsers();
    } catch (err) {
      alert(err.message || "Failed to update user");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this user? This action cannot be undone."
      )
    )
      return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete user");
      await fetchUsers();
    } catch (err) {
      alert(err.message || "Failed to delete user");
    } finally {
      setActionLoading(false);
    }
  };

  // Edit button handler
  const handleEditClick = (user) => {
    setEditForm({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
    });
    setEditError("");
    setShowEditModal(true);
  };
  // Save edit handler
  const handleEditSave = async () => {
    setEditLoading(true);
    setEditError("");
    try {
      const res = await fetch(`/api/admin/users/${editForm.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: editForm.username,
          email: editForm.email,
          role: editForm.role,
          is_active: editForm.is_active,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update user");
      setShowEditModal(false);
      await fetchUsers();
    } catch (err) {
      setEditError(err.message || "Failed to update user");
    } finally {
      setEditLoading(false);
    }
  };
  // Reset password handlers
  const handleResetClick = (userId) => {
    setResetUserId(userId);
    setResetPassword("");
    setResetError("");
    setShowResetModal(true);
  };
  const handleResetSave = async () => {
    setResetLoading(true);
    setResetError("");
    try {
      const res = await fetch(
        `/api/admin/users/${resetUserId}/reset-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: resetPassword }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset password");
      setShowResetModal(false);
    } catch (err) {
      setResetError(err.message || "Failed to reset password");
    } finally {
      setResetLoading(false);
    }
  };
  // Bulk selection handlers
  const handleSelectUser = (id) => {
    setSelectedUsers((prev) =>
      prev.includes(id) ? prev.filter((uid) => uid !== id) : [...prev, id]
    );
  };
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedUsers([]);
      setSelectAll(false);
    } else {
      setSelectedUsers(users.map((u) => u.id));
      setSelectAll(true);
    }
  };
  const handleBulkDeactivate = async () => {
    for (const id of selectedUsers) {
      await handleToggleActive(id);
    }
    setSelectedUsers([]);
    setSelectAll(false);
  };
  const handleBulkDelete = async () => {
    for (const id of selectedUsers) {
      await handleDelete(id);
    }
    setSelectedUsers([]);
    setSelectAll(false);
  };

  const handleAddUser = async () => {
    setAddLoading(true);
    setAddError("");
    if (
      !addForm.username ||
      !addForm.email ||
      !addForm.role ||
      !addForm.password
    ) {
      setAddError("All fields are required.");
      setAddLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add user");
      setShowAddModal(false);
      await fetchUsers();
    } catch (err) {
      setAddError(err.message || "Failed to add user");
    } finally {
      setAddLoading(false);
    }
  };

  return (
    <>
      <div className="ump-container" style={{ position: "relative" }}>
        {/* Back to Dashboard Button inside container, top left */}
        <div
          style={{
            position: "absolute",
            left: 16,
            top: 16,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            zIndex: 2,
          }}
        >
          <button
            className="ump-fab"
            onClick={() => navigate("/dashboard/admin")}
            title="Back to Dashboard"
          >
            <span role="img" aria-label="Back">
              ⬅️
            </span>
          </button>
          <span className="ump-fab-label">Back</span>
        </div>
        {/* Add User Button inside container, top right */}
        <div
          style={{
            position: "absolute",
            right: 16,
            top: 16,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            zIndex: 2,
          }}
        >
          <button
            className="ump-fab"
            onClick={() => {
              setAddForm({
                username: "",
                email: "",
                role: "",
                password: "",
                is_active: true,
              });
              setAddError("");
              setShowAddModal(true);
            }}
            title="Add User"
          >
            <span role="img" aria-label="Add User">
              👤
            </span>
          </button>
          <span className="ump-fab-label">Add User</span>
        </div>
        {showAddModal && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              background: "rgba(30,40,60,0.18)",
              zIndex: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                background: "#fff",
                borderRadius: 10,
                boxShadow: "0 2px 16px rgba(26,78,138,0.13)",
                padding: 28,
                minWidth: 320,
                maxWidth: 360,
                position: "relative",
              }}
            >
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  position: "absolute",
                  top: 8,
                  right: 10,
                  background: "none",
                  border: "none",
                  fontSize: 18,
                  color: "#888",
                  cursor: "pointer",
                }}
                title="Close"
              >
                ✕
              </button>
              <h3 style={{ color: "#174ea6", marginBottom: 18 }}>Add User</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddUser();
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                    width: 260,
                  }}
                >
                  <label style={{ fontWeight: 500 }}>
                    Username
                    <input
                      type="text"
                      value={addForm.username}
                      onChange={(e) =>
                        setAddForm({ ...addForm, username: e.target.value })
                      }
                      style={{
                        width: "100%",
                        padding: 8,
                        borderRadius: 6,
                        border: "1.5px solid #c7d7ef",
                        marginTop: 4,
                        boxSizing: "border-box",
                      }}
                      required
                    />
                  </label>
                  <label style={{ fontWeight: 500 }}>
                    Email
                    <input
                      type="email"
                      value={addForm.email}
                      onChange={(e) =>
                        setAddForm({ ...addForm, email: e.target.value })
                      }
                      style={{
                        width: "100%",
                        padding: 8,
                        borderRadius: 6,
                        border: "1.5px solid #c7d7ef",
                        marginTop: 4,
                        boxSizing: "border-box",
                      }}
                      required
                    />
                  </label>
                  <label style={{ fontWeight: 500 }}>
                    Role
                    <select
                      value={addForm.role}
                      onChange={(e) =>
                        setAddForm({ ...addForm, role: e.target.value })
                      }
                      style={{
                        width: "100%",
                        padding: 8,
                        borderRadius: 6,
                        border: "1.5px solid #c7d7ef",
                        marginTop: 4,
                        boxSizing: "border-box",
                      }}
                      required
                    >
                      <option value="">Select Role</option>
                      {roleOptions.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={{ fontWeight: 500 }}>
                    Password
                    <input
                      type="password"
                      value={addForm.password}
                      onChange={(e) =>
                        setAddForm({ ...addForm, password: e.target.value })
                      }
                      style={{
                        width: "100%",
                        padding: 8,
                        borderRadius: 6,
                        border: "1.5px solid #c7d7ef",
                        marginTop: 4,
                        boxSizing: "border-box",
                      }}
                      required
                    />
                  </label>
                  <label
                    style={{
                      fontWeight: 500,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    Active
                    <input
                      type="checkbox"
                      checked={addForm.is_active}
                      onChange={(e) =>
                        setAddForm({ ...addForm, is_active: e.target.checked })
                      }
                      style={{ marginLeft: 8 }}
                    />
                  </label>
                </div>
                {addError && (
                  <div style={{ color: "#d32f2f", margin: "10px 0" }}>
                    {addError}
                  </div>
                )}
                <button
                  type="submit"
                  style={{
                    background: "#1976d2",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    padding: "10px 0",
                    fontWeight: 600,
                    fontSize: 15,
                    cursor: "pointer",
                    width: "100%",
                    marginTop: 18,
                  }}
                  disabled={addLoading}
                >
                  {addLoading ? "Adding..." : "Add User"}
                </button>
              </form>
            </div>
          </div>
        )}
        {/* Edit User Modal */}
        {showEditModal && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              background: "rgba(30,40,60,0.18)",
              zIndex: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                background: "#fff",
                borderRadius: 10,
                boxShadow: "0 2px 16px rgba(26,78,138,0.13)",
                padding: 28,
                minWidth: 320,
                maxWidth: 360,
                position: "relative",
              }}
            >
              <button
                onClick={() => setShowEditModal(false)}
                style={{
                  position: "absolute",
                  top: 8,
                  right: 10,
                  background: "none",
                  border: "none",
                  fontSize: 18,
                  color: "#888",
                  cursor: "pointer",
                }}
                title="Close"
              >
                ✕
              </button>
              <h3 style={{ color: "#174ea6", marginBottom: 18 }}>Edit User</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleEditSave();
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                    width: 260,
                  }}
                >
                  <label style={{ fontWeight: 500 }}>
                    Username
                    <input
                      type="text"
                      value={editForm.username}
                      onChange={(e) =>
                        setEditForm({ ...editForm, username: e.target.value })
                      }
                      style={{
                        width: "100%",
                        padding: 8,
                        borderRadius: 6,
                        border: "1.5px solid #c7d7ef",
                        marginTop: 4,
                        boxSizing: "border-box",
                      }}
                      required
                    />
                  </label>
                  <label style={{ fontWeight: 500 }}>
                    Email
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) =>
                        setEditForm({ ...editForm, email: e.target.value })
                      }
                      style={{
                        width: "100%",
                        padding: 8,
                        borderRadius: 6,
                        border: "1.5px solid #c7d7ef",
                        marginTop: 4,
                        boxSizing: "border-box",
                      }}
                      required
                    />
                  </label>
                  <label style={{ fontWeight: 500 }}>
                    Role
                    <select
                      value={editForm.role}
                      onChange={(e) =>
                        setEditForm({ ...editForm, role: e.target.value })
                      }
                      style={{
                        width: "100%",
                        padding: 8,
                        borderRadius: 6,
                        border: "1.5px solid #c7d7ef",
                        marginTop: 4,
                        boxSizing: "border-box",
                      }}
                      required
                    >
                      {roleOptions.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label
                    style={{
                      fontWeight: 500,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    Active
                    <input
                      type="checkbox"
                      checked={editForm.is_active}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          is_active: e.target.checked,
                        })
                      }
                      style={{ marginLeft: 8 }}
                    />
                  </label>
                </div>
                {editError && (
                  <div style={{ color: "#d32f2f", margin: "10px 0" }}>
                    {editError}
                  </div>
                )}
                <button
                  type="submit"
                  style={{
                    background: "#1976d2",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    padding: "10px 0",
                    fontWeight: 600,
                    fontSize: 15,
                    cursor: "pointer",
                    width: "100%",
                    marginTop: 18,
                  }}
                  disabled={editLoading}
                >
                  {editLoading ? "Saving..." : "Save Changes"}
                </button>
              </form>
            </div>
          </div>
        )}
        {/* Reset Password Modal */}
        {showResetModal && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              background: "rgba(30,40,60,0.18)",
              zIndex: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                background: "#fff",
                borderRadius: 10,
                boxShadow: "0 2px 16px rgba(26,78,138,0.13)",
                padding: 28,
                minWidth: 320,
                maxWidth: 360,
                position: "relative",
              }}
            >
              <button
                onClick={() => setShowResetModal(false)}
                style={{
                  position: "absolute",
                  top: 8,
                  right: 10,
                  background: "none",
                  border: "none",
                  fontSize: 18,
                  color: "#888",
                  cursor: "pointer",
                }}
                title="Close"
              >
                ✕
              </button>
              <h3 style={{ color: "#174ea6", marginBottom: 18 }}>
                Reset Password
              </h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleResetSave();
                }}
              >
                <label style={{ display: "block", marginBottom: 16 }}>
                  New Password
                  <input
                    type="password"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    style={{
                      width: "100%",
                      padding: 7,
                      borderRadius: 6,
                      border: "1.5px solid #c7d7ef",
                      marginTop: 2,
                    }}
                    required
                  />
                </label>
                {resetError && (
                  <div style={{ color: "#d32f2f", marginBottom: 8 }}>
                    {resetError}
                  </div>
                )}
                <button
                  type="submit"
                  style={{
                    background: "#1976d2",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    padding: "8px 18px",
                    fontWeight: 600,
                    fontSize: 15,
                    cursor: "pointer",
                    width: "100%",
                  }}
                  disabled={resetLoading}
                >
                  {resetLoading ? "Saving..." : "Reset Password"}
                </button>
              </form>
            </div>
          </div>
        )}
        {/* Bulk action buttons */}
        {selectedUsers.length > 0 && (
          <div
            style={{
              position: "fixed",
              left: "50%",
              bottom: 80,
              transform: "translateX(-50%)",
              zIndex: 15,
              display: "flex",
              gap: 16,
            }}
          >
            <button
              onClick={handleBulkDeactivate}
              style={{
                background: "#ffe082",
                color: "#b26a00",
                border: "none",
                borderRadius: 6,
                padding: "8px 18px",
                fontWeight: 600,
                fontSize: 15,
                cursor: "pointer",
              }}
            >
              Bulk Deactivate
            </button>
            <button
              onClick={handleBulkDelete}
              style={{
                background: "#ff8a80",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "8px 18px",
                fontWeight: 600,
                fontSize: 15,
                cursor: "pointer",
              }}
            >
              Bulk Delete
            </button>
          </div>
        )}
        <div className="ump-filters">
          <label className="ump-role-filter">
            Filter by Role:
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="ump-role-select"
            >
              <option value="">All</option>
              <option value="Admin">Admin</option>
              <option value="HR">HR</option>
              <option value="PM">PM</option>
              <option value="Developer">Developer</option>
              <option value="Employee">Employee</option>
              <option value="Finance">Finance</option>
              <option value="CRM">CRM</option>
              <option value="Client">Client</option>
              <option value="Procurement">Procurement</option>
              <option value="IT">IT</option>
            </select>
          </label>
          <input
            type="text"
            placeholder="Search by username or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ump-search"
          />
        </div>
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <ErrorMessage message={error} />
        ) : (
          <div className="ump-table-container">
            <table className="ump-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Active</th>
                  <th>Created</th>
                  <th style={{ width: 36 }}>Edit</th>
                  <th style={{ width: 36 }}>Reset</th>
                  <th style={{ width: 36 }}>Active/Deactivate</th>
                  <th style={{ width: 36 }}>Delete</th>
                </tr>
              </thead>
              <tbody>
                {users
                  .filter((u) => !roleFilter || u.role === roleFilter)
                  .filter(
                    (u) =>
                      u.username.toLowerCase().includes(search.toLowerCase()) ||
                      u.email.toLowerCase().includes(search.toLowerCase())
                  )
                  .map((u) => (
                    <tr key={u.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(u.id)}
                          onChange={() => handleSelectUser(u.id)}
                        />
                      </td>
                      <td>{u.username}</td>
                      <td>{u.email}</td>
                      <td>{u.role}</td>
                      <td>{u.is_active ? "Yes" : "No"}</td>
                      <td>{new Date(u.created_at).toLocaleDateString()}</td>
                      <td style={{ width: 36 }}>
                        <button
                          onClick={() => handleEditClick(u)}
                          className="ump-action-btn ump-action-icon"
                          title="Edit User"
                        >
                          ✏️
                        </button>
                      </td>
                      <td style={{ width: 36 }}>
                        <button
                          onClick={() => handleResetClick(u.id)}
                          className="ump-action-btn ump-action-icon"
                          title="Reset Password"
                        >
                          🔑
                        </button>
                      </td>
                      <td style={{ width: 36 }}>
                        <button
                          onClick={() => handleToggleActive(u.id)}
                          disabled={actionLoading}
                          className={`ump-action-btn ump-action-icon ${
                            u.is_active ? "deactivate" : "activate"
                          }`}
                          title={u.is_active ? "Deactivate" : "Activate"}
                        >
                          {u.is_active ? "✕" : "✓"}
                        </button>
                      </td>
                      <td style={{ width: 36 }}>
                        <button
                          onClick={() => handleDelete(u.id)}
                          disabled={actionLoading}
                          className="ump-action-btn ump-action-icon delete"
                          title="Delete User"
                        >
                          🗑
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};

export default UserManagementPage;
