import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./RolePermissionManagement.css";

const RolePermissionManagement = () => {
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selectedRole, setSelectedRole] = useState("");
  const [rolePermissions, setRolePermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Fetch roles and permissions on mount
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/admin/roles").then((res) => res.json()),
      fetch("/api/admin/permissions").then((res) => res.json()),
    ])
      .then(([rolesData, permsData]) => {
        setRoles(rolesData.roles || []);
        setPermissions(permsData.permissions || []);
        if (rolesData.roles && rolesData.roles.length > 0) {
          setSelectedRole(rolesData.roles[0]);
        }
      })
      .catch(() => setError("Failed to load roles or permissions."))
      .finally(() => setLoading(false));
  }, []);

  // Fetch permissions for selected role
  useEffect(() => {
    if (!selectedRole) return;
    setLoading(true);
    fetch(`/api/admin/roles/${selectedRole}/permissions`)
      .then((res) => res.json())
      .then((data) =>
        setRolePermissions((data.permissions || []).map((p) => p.id))
      )
      .catch(() => setError("Failed to load role permissions."))
      .finally(() => setLoading(false));
  }, [selectedRole]);

  const handleCheckbox = (permId) => {
    setRolePermissions((prev) =>
      prev.includes(permId)
        ? prev.filter((id) => id !== permId)
        : [...prev, permId]
    );
  };

  const handleSave = () => {
    setSaving(true);
    setError("");
    setSuccess("");
    fetch(`/api/admin/roles/${selectedRole}/permissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissionIds: rolePermissions }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setSuccess("Permissions updated successfully.");
        else setError(data.error || "Failed to update permissions.");
      })
      .catch(() => setError("Failed to update permissions."))
      .finally(() => setSaving(false));
  };

  return (
    <div className="role-permission-mgmt-container">
      <button
        className="rpm-back-btn"
        onClick={() => navigate("/dashboard/admin")}
        style={{ marginBottom: 18 }}
      >
        ← Back to Dashboard
      </button>
      <h2>Role & Permission Management</h2>
      {error && <div className="rpm-error">{error}</div>}
      {success && <div className="rpm-success">{success}</div>}
      {loading ? (
        <div className="rpm-loading">Loading...</div>
      ) : (
        <>
          <div className="rpm-role-select">
            <label htmlFor="role-select">Select Role:</label>
            <select
              id="role-select"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
          <div className="rpm-permissions-list">
            <h3>Permissions</h3>
            <ul>
              {permissions.map((perm) => (
                <li key={perm.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={rolePermissions.includes(perm.id)}
                      onChange={() => handleCheckbox(perm.id)}
                      disabled={saving}
                    />
                    <span className="rpm-perm-name">{perm.name}</span>
                    <span className="rpm-perm-desc">{perm.description}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
          <button
            className="rpm-save-btn"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Permissions"}
          </button>
        </>
      )}
    </div>
  );
};

export default RolePermissionManagement;
