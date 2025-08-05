import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import "../../css/AssetAssignment.css";

const AssetAssignment = () => {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [assets, setAssets] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [formData, setFormData] = useState({
    asset_id: "",
    assigned_to: "",
    notes: "",
  });
  const [returnData, setReturnData] = useState({
    return_reason: "",
    notes: "",
  });

  // Get user token and info
  const token =
    localStorage.getItem("erp_token") || sessionStorage.getItem("erp_token");
  const headers = { Authorization: `Bearer ${token}` };

  let user = { id: null, role: null, username: null };
  if (token) {
    try {
      const decoded = jwtDecode(token);
      user.id = decoded.userId || decoded.id || null;
      user.role = decoded.role || null;
      user.username = decoded.username || decoded.name || null;
    } catch {}
  }

  const isITUser = user.role && user.role.toLowerCase() === "it";

  useEffect(() => {
    fetchAssignments();
    fetchAvailableAssets();
    fetchUsers();
  }, []);

  const fetchAssignments = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (statusFilter) params.append("status", statusFilter);

      const response = await axios.get(
        `/api/it-inventory/assignments?${params}`,
        { headers }
      );
      setAssignments(response.data.assignments);
    } catch (error) {
      console.error("Error fetching assignments:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableAssets = async () => {
    try {
      const response = await axios.get(
        "/api/it-inventory/assets?status=Available",
        { headers }
      );
      setAssets(response.data.assets);
    } catch (error) {
      console.error("Error fetching available assets:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get("/api/admin/users", { headers });
      // Filter out admin users for assignment
      const nonAdminUsers = response.data.users.filter(
        (u) => u.role !== "Admin"
      );
      setUsers(nonAdminUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [searchTerm, statusFilter]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleReturnInputChange = (e) => {
    const { name, value } = e.target;
    setReturnData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setFormData({
      asset_id: "",
      assigned_to: "",
      notes: "",
    });
  };

  const resetReturnForm = () => {
    setReturnData({
      return_reason: "",
      notes: "",
    });
  };

  const handleAssignAsset = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/api/it-inventory/assignments", formData, { headers });
      setShowAssignModal(false);
      resetForm();
      fetchAssignments();
      fetchAvailableAssets(); // Refresh available assets
    } catch (error) {
      console.error("Error assigning asset:", error);
      alert(
        "Error assigning asset: " +
          (error.response?.data?.error || error.message)
      );
    }
  };

  const handleReturnAsset = async (e) => {
    e.preventDefault();
    try {
      await axios.put(
        `/api/it-inventory/assignments/${selectedAssignment.id}/return`,
        returnData,
        { headers }
      );
      setShowReturnModal(false);
      setSelectedAssignment(null);
      resetReturnForm();
      fetchAssignments();
      fetchAvailableAssets(); // Refresh available assets
    } catch (error) {
      console.error("Error returning asset:", error);
      alert(
        "Error returning asset: " +
          (error.response?.data?.error || error.message)
      );
    }
  };

  const openReturnModal = (assignment) => {
    setSelectedAssignment(assignment);
    setShowReturnModal(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return (
      new Date(dateString).toLocaleDateString() +
      " " +
      new Date(dateString).toLocaleTimeString()
    );
  };

  const getStatusBadgeClass = (returnedAt) => {
    return returnedAt ? "status-returned" : "status-active";
  };

  if (loading) {
    return <div className="loading">Loading assignments...</div>;
  }

  return (
    <div className="asset-assignment-container">
      <button
        onClick={() => navigate(-1)}
        style={{
          width: 80,
          height: 32,
          padding: 0,
          fontSize: 14,
          borderRadius: 5,
          border: "1px solid #b0bec5",
          background: "#fff",
          color: "#174ea6",
          cursor: "pointer",
          boxShadow: "0 1px 4px #e3e8f0",
          overflow: "hidden",
          whiteSpace: "nowrap",
          textAlign: "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
        }}
      >
        ← Back
      </button>

      <div className="asset-assignment-content">
        <div className="asset-assignment-header">
          <h1>Asset Assignments</h1>
          {isITUser && (
            <button
              onClick={() => setShowAssignModal(true)}
              className="assign-asset-btn"
            >
              + Assign Asset
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="filters-section">
          <div className="filter-group">
            <input
              type="text"
              placeholder="Search assignments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="filter-group">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="returned">Returned</option>
            </select>
          </div>
        </div>

        {/* Assignments Table */}
        <div className="assignments-table-container">
          <table className="assignments-table">
            <thead>
              <tr>
                <th>Asset Tag</th>
                <th>Asset Name</th>
                <th>Assigned To</th>
                <th>Assigned By</th>
                <th>Assigned Date</th>
                <th>Returned Date</th>
                <th>Status</th>
                <th>Notes</th>
                {isITUser && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {assignments.map((assignment) => (
                <tr key={assignment.id} className="assignment-row">
                  <td className="asset-tag">{assignment.asset_tag}</td>
                  <td className="asset-name">{assignment.asset_name}</td>
                  <td>{assignment.assigned_to_name}</td>
                  <td>{assignment.assigned_by_name}</td>
                  <td>{formatDate(assignment.assigned_at)}</td>
                  <td>{formatDate(assignment.returned_at)}</td>
                  <td>
                    <span
                      className={`status-badge ${getStatusBadgeClass(
                        assignment.returned_at
                      )}`}
                    >
                      {assignment.returned_at ? "Returned" : "Active"}
                    </span>
                  </td>
                  <td className="notes-cell">{assignment.notes || "-"}</td>
                  {isITUser && (
                    <td className="actions-cell">
                      {!assignment.returned_at && (
                        <button
                          onClick={() => openReturnModal(assignment)}
                          className="return-btn"
                          title="Return Asset"
                        >
                          📦
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {assignments.length === 0 && (
            <div className="no-assignments">
              <p>No assignments found matching your criteria.</p>
            </div>
          )}
        </div>
      </div>

      {/* Assign Asset Modal */}
      {showAssignModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Assign Asset</h2>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  resetForm();
                }}
                className="close-btn"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAssignAsset} className="assignment-form">
              <div className="form-group">
                <label>Asset *</label>
                <select
                  name="asset_id"
                  value={formData.asset_id}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select Asset</option>
                  {assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.asset_tag} - {asset.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Assign To *</label>
                <select
                  name="assigned_to"
                  value={formData.assigned_to}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select User</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.username} ({user.name || user.role})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Optional notes about this assignment..."
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowAssignModal(false);
                    resetForm();
                  }}
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button type="submit" className="save-btn">
                  Assign Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Return Asset Modal */}
      {showReturnModal && selectedAssignment && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Return Asset: {selectedAssignment.asset_tag}</h2>
              <button
                onClick={() => {
                  setShowReturnModal(false);
                  setSelectedAssignment(null);
                  resetReturnForm();
                }}
                className="close-btn"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleReturnAsset} className="return-form">
              <div className="return-info">
                <p>
                  <strong>Asset:</strong> {selectedAssignment.asset_name}
                </p>
                <p>
                  <strong>Assigned To:</strong>{" "}
                  {selectedAssignment.assigned_to_name}
                </p>
                <p>
                  <strong>Assigned Date:</strong>{" "}
                  {formatDate(selectedAssignment.assigned_at)}
                </p>
              </div>
              <div className="form-group">
                <label>Return Reason</label>
                <select
                  name="return_reason"
                  value={returnData.return_reason}
                  onChange={handleReturnInputChange}
                  required
                >
                  <option value="">Select Reason</option>
                  <option value="No longer needed">No longer needed</option>
                  <option value="Upgraded to new equipment">
                    Upgraded to new equipment
                  </option>
                  <option value="Employee left">Employee left</option>
                  <option value="Maintenance required">
                    Maintenance required
                  </option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  name="notes"
                  value={returnData.notes}
                  onChange={handleReturnInputChange}
                  rows="3"
                  placeholder="Additional notes about the return..."
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowReturnModal(false);
                    setSelectedAssignment(null);
                    resetReturnForm();
                  }}
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button type="submit" className="save-btn">
                  Return Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetAssignment;
