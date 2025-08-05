import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import "../../css/AssetRequestManagement.css";

const AssetRequestManagement = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [approvalData, setApprovalData] = useState({
    status: "Approved",
    notes: "",
  });
  const [rejectionData, setRejectionData] = useState({
    rejection_reason: "",
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
    fetchRequests();
    fetchCategories();
    fetchUsers();
  }, []);

  const fetchRequests = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (statusFilter) params.append("status", statusFilter);
      if (priorityFilter) params.append("priority", priorityFilter);
      if (userFilter) params.append("requested_by", userFilter);

      const response = await axios.get(`/api/it-inventory/requests?${params}`, {
        headers,
      });
      setRequests(response.data.requests);
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  };

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

  const fetchUsers = async () => {
    try {
      const response = await axios.get("/api/admin/users", { headers });
      setUsers(response.data.users);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [searchTerm, statusFilter, priorityFilter, userFilter]);

  const handleApprovalInputChange = (e) => {
    const { name, value } = e.target;
    setApprovalData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRejectionInputChange = (e) => {
    const { name, value } = e.target;
    setRejectionData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetApprovalForm = () => {
    setApprovalData({
      status: "Approved",
      notes: "",
    });
  };

  const resetRejectionForm = () => {
    setRejectionData({
      rejection_reason: "",
    });
  };

  const handleApproveRequest = async (e) => {
    e.preventDefault();
    try {
      await axios.put(
        `/api/it-inventory/requests/${selectedRequest.id}/status`,
        approvalData,
        { headers }
      );
      setShowApprovalModal(false);
      setSelectedRequest(null);
      resetApprovalForm();
      fetchRequests();
    } catch (error) {
      console.error("Error approving request:", error);
      alert(
        "Error approving request: " +
          (error.response?.data?.error || error.message)
      );
    }
  };

  const handleRejectRequest = async (e) => {
    e.preventDefault();
    try {
      const rejectionPayload = {
        status: "Rejected",
        rejection_reason: rejectionData.rejection_reason,
      };
      await axios.put(
        `/api/it-inventory/requests/${selectedRequest.id}/status`,
        rejectionPayload,
        { headers }
      );
      setShowRejectionModal(false);
      setSelectedRequest(null);
      resetRejectionForm();
      fetchRequests();
    } catch (error) {
      console.error("Error rejecting request:", error);
      alert(
        "Error rejecting request: " +
          (error.response?.data?.error || error.message)
      );
    }
  };

  const openApprovalModal = (request) => {
    setSelectedRequest(request);
    setShowApprovalModal(true);
  };

  const openRejectionModal = (request) => {
    setSelectedRequest(request);
    setShowRejectionModal(true);
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

  const getUserName = (userId) => {
    const user = users.find((u) => u.id === userId);
    return user ? user.name || user.username : "Unknown User";
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find((c) => c.id === categoryId);
    return category ? category.name : "Unknown Category";
  };

  if (loading) {
    return <div className="loading">Loading requests...</div>;
  }

  if (!isITUser) {
    return (
      <div className="access-denied">
        <h2>Access Denied</h2>
        <p>You need IT role permissions to access this page.</p>
        <button onClick={() => navigate(-1)} className="back-btn">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="asset-request-management-container">
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

      <div className="asset-request-management-content">
        <div className="asset-request-management-header">
          <h1>Asset Request Management</h1>
          <div className="header-stats">
            <div className="stat-item">
              <span className="stat-number">
                {requests.filter((r) => r.status === "Pending").length}
              </span>
              <span className="stat-label">Pending</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">
                {requests.filter((r) => r.status === "Approved").length}
              </span>
              <span className="stat-label">Approved</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">
                {requests.filter((r) => r.status === "Rejected").length}
              </span>
              <span className="stat-label">Rejected</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-section">
          <div className="filter-group">
            <input
              type="text"
              placeholder="Search requests..."
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
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Fulfilled">Fulfilled</option>
            </select>
          </div>
          <div className="filter-group">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
          <div className="filter-group">
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All Users</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name || user.username}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Requests Table */}
        <div className="requests-table-container">
          <table className="requests-table">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Requested By</th>
                <th>Asset Name</th>
                <th>Category</th>
                <th>Quantity</th>
                <th>Priority</th>
                <th>Required By</th>
                <th>Status</th>
                <th>Requested Date</th>
                <th>Processed By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id} className="request-row">
                  <td className="request-id">#{request.id}</td>
                  <td>{request.requested_by_name}</td>
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
                  <td className="actions-cell">
                    {request.status === "Pending" && (
                      <>
                        <button
                          onClick={() => openApprovalModal(request)}
                          className="approve-btn"
                          title="Approve Request"
                        >
                          ✅
                        </button>
                        <button
                          onClick={() => openRejectionModal(request)}
                          className="reject-btn"
                          title="Reject Request"
                        >
                          ❌
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {requests.length === 0 && (
            <div className="no-requests">
              <p>No requests found matching your criteria.</p>
            </div>
          )}
        </div>
      </div>

      {/* Approval Modal */}
      {showApprovalModal && selectedRequest && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Approve Request #{selectedRequest.id}</h2>
              <button
                onClick={() => {
                  setShowApprovalModal(false);
                  setSelectedRequest(null);
                  resetApprovalForm();
                }}
                className="close-btn"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleApproveRequest} className="approval-form">
              <div className="request-info">
                <p>
                  <strong>Asset:</strong> {selectedRequest.asset_name}
                </p>
                <p>
                  <strong>Requested By:</strong>{" "}
                  {selectedRequest.requested_by_name}
                </p>
                <p>
                  <strong>Category:</strong>{" "}
                  {getCategoryName(selectedRequest.category_id)}
                </p>
                <p>
                  <strong>Quantity:</strong> {selectedRequest.quantity}
                </p>
                <p>
                  <strong>Priority:</strong> {selectedRequest.priority}
                </p>
                <p>
                  <strong>Reason:</strong> {selectedRequest.reason}
                </p>
                <p>
                  <strong>Required By:</strong>{" "}
                  {formatDate(selectedRequest.required_by_date)}
                </p>
              </div>
              <div className="form-group">
                <label>Approval Notes</label>
                <textarea
                  name="notes"
                  value={approvalData.notes}
                  onChange={handleApprovalInputChange}
                  rows="3"
                  placeholder="Optional notes about this approval..."
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowApprovalModal(false);
                    setSelectedRequest(null);
                    resetApprovalForm();
                  }}
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button type="submit" className="approve-confirm-btn">
                  Approve Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectionModal && selectedRequest && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Reject Request #{selectedRequest.id}</h2>
              <button
                onClick={() => {
                  setShowRejectionModal(false);
                  setSelectedRequest(null);
                  resetRejectionForm();
                }}
                className="close-btn"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleRejectRequest} className="rejection-form">
              <div className="request-info">
                <p>
                  <strong>Asset:</strong> {selectedRequest.asset_name}
                </p>
                <p>
                  <strong>Requested By:</strong>{" "}
                  {selectedRequest.requested_by_name}
                </p>
                <p>
                  <strong>Category:</strong>{" "}
                  {getCategoryName(selectedRequest.category_id)}
                </p>
                <p>
                  <strong>Quantity:</strong> {selectedRequest.quantity}
                </p>
                <p>
                  <strong>Priority:</strong> {selectedRequest.priority}
                </p>
                <p>
                  <strong>Reason:</strong> {selectedRequest.reason}
                </p>
                <p>
                  <strong>Required By:</strong>{" "}
                  {formatDate(selectedRequest.required_by_date)}
                </p>
              </div>
              <div className="form-group">
                <label>Rejection Reason *</label>
                <select
                  name="rejection_reason"
                  value={rejectionData.rejection_reason}
                  onChange={handleRejectionInputChange}
                  required
                >
                  <option value="">Select Reason</option>
                  <option value="Budget constraints">Budget constraints</option>
                  <option value="Asset not available">
                    Asset not available
                  </option>
                  <option value="Request not justified">
                    Request not justified
                  </option>
                  <option value="Alternative solution available">
                    Alternative solution available
                  </option>
                  <option value="Timing not appropriate">
                    Timing not appropriate
                  </option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowRejectionModal(false);
                    setSelectedRequest(null);
                    resetRejectionForm();
                  }}
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button type="submit" className="reject-confirm-btn">
                  Reject Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetRequestManagement;
