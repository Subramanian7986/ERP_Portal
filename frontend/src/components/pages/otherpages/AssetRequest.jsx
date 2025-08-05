import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import "../../css/AssetRequest.css";

const AssetRequest = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [userRequests, setUserRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [formData, setFormData] = useState({
    category_id: "",
    asset_name: "",
    quantity: 1,
    priority: "Medium",
    reason: "",
    required_by_date: "",
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

  useEffect(() => {
    fetchCategories();
    fetchUserRequests();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get("/api/it-inventory/categories", {
        headers,
      });
      setCategories(response.data.categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchUserRequests = async () => {
    try {
      const response = await axios.get(
        `/api/it-inventory/requests?requested_by=${user.id}`,
        { headers }
      );
      setUserRequests(response.data.requests);
    } catch (error) {
      console.error("Error fetching user requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setFormData({
      category_id: "",
      asset_name: "",
      quantity: 1,
      priority: "Medium",
      reason: "",
      required_by_date: "",
    });
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/api/it-inventory/requests", formData, { headers });
      setShowRequestModal(false);
      resetForm();
      fetchUserRequests();
      alert("Asset request submitted successfully!");
    } catch (error) {
      console.error("Error submitting request:", error);
      alert(
        "Error submitting request: " +
          (error.response?.data?.error || error.message)
      );
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return (
      new Date(dateString).toLocaleDateString() +
      " " +
      new Date(dateString).toLocaleTimeString()
    );
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "Pending":
        return "status-pending";
      case "Approved":
        return "status-approved";
      case "Rejected":
        return "status-rejected";
      case "Fulfilled":
        return "status-fulfilled";
      default:
        return "status-default";
    }
  };

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case "Low":
        return "priority-low";
      case "Medium":
        return "priority-medium";
      case "High":
        return "priority-high";
      case "Critical":
        return "priority-critical";
      default:
        return "priority-default";
    }
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find((c) => c.id === categoryId);
    return category ? category.name : "Unknown Category";
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="asset-request-container">
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

      <div className="asset-request-content">
        <div className="asset-request-header">
          <h1>Asset Requests</h1>
          <button
            onClick={() => setShowRequestModal(true)}
            className="new-request-btn"
          >
            + New Request
          </button>
        </div>

        {/* Request Statistics */}
        <div className="request-stats">
          <div className="stat-card">
            <div className="stat-number">{userRequests.length}</div>
            <div className="stat-label">Total Requests</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">
              {userRequests.filter((r) => r.status === "Pending").length}
            </div>
            <div className="stat-label">Pending</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">
              {userRequests.filter((r) => r.status === "Approved").length}
            </div>
            <div className="stat-label">Approved</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">
              {userRequests.filter((r) => r.status === "Rejected").length}
            </div>
            <div className="stat-label">Rejected</div>
          </div>
        </div>

        {/* User's Request History */}
        <div className="request-history-section">
          <h2>My Request History</h2>
          <div className="requests-table-container">
            <table className="requests-table">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Asset Name</th>
                  <th>Category</th>
                  <th>Quantity</th>
                  <th>Priority</th>
                  <th>Required By</th>
                  <th>Status</th>
                  <th>Requested Date</th>
                  <th>Processed By</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {userRequests.map((request) => (
                  <tr key={request.id} className="request-row">
                    <td className="request-id">#{request.id}</td>
                    <td className="asset-name">{request.asset_name}</td>
                    <td>{getCategoryName(request.category_id)}</td>
                    <td>{request.quantity}</td>
                    <td>
                      <span
                        className={`priority-badge ${getPriorityBadgeClass(
                          request.priority
                        )}`}
                      >
                        {request.priority}
                      </span>
                    </td>
                    <td>{formatDate(request.required_by_date)}</td>
                    <td>
                      <span
                        className={`status-badge ${getStatusBadgeClass(
                          request.status
                        )}`}
                      >
                        {request.status}
                      </span>
                    </td>
                    <td>{formatDate(request.created_at)}</td>
                    <td>{request.approved_by_name || "-"}</td>
                    <td className="notes-cell">
                      {request.rejection_reason ? (
                        <span
                          className="rejection-reason"
                          title={request.rejection_reason}
                        >
                          {request.rejection_reason}
                        </span>
                      ) : (
                        request.notes || "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {userRequests.length === 0 && (
              <div className="no-requests">
                <p>You haven't submitted any asset requests yet.</p>
                <button
                  onClick={() => setShowRequestModal(true)}
                  className="new-request-btn"
                >
                  Submit Your First Request
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Request Modal */}
      {showRequestModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Submit Asset Request</h2>
              <button
                onClick={() => {
                  setShowRequestModal(false);
                  resetForm();
                }}
                className="close-btn"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmitRequest} className="request-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Asset Category *</label>
                  <select
                    name="category_id"
                    value={formData.category_id}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Asset Name *</label>
                  <input
                    type="text"
                    name="asset_name"
                    value={formData.asset_name}
                    onChange={handleInputChange}
                    placeholder="e.g., Dell Latitude 5520 Laptop"
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Quantity</label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    min="1"
                    max="10"
                  />
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Required By Date</label>
                <input
                  type="date"
                  name="required_by_date"
                  value={formData.required_by_date}
                  onChange={handleInputChange}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div className="form-group">
                <label>Reason for Request *</label>
                <textarea
                  name="reason"
                  value={formData.reason}
                  onChange={handleInputChange}
                  rows="4"
                  placeholder="Please provide a detailed reason for this asset request..."
                  required
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowRequestModal(false);
                    resetForm();
                  }}
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetRequest;
