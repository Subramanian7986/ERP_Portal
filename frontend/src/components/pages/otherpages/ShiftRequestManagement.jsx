import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import "../../css/ShiftRequestManagement.css";

const ShiftRequestManagement = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

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
    if (user.id) {
      fetchRequests();
    }
  }, [user.id]);

  const fetchRequests = async () => {
    try {
      let url = "/api/shift-requests/all";
      const params = new URLSearchParams();

      if (filterStatus) params.append("status", filterStatus);
      if (filterUser) params.append("user_id", filterUser);

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await axios.get(url, { headers });
      setRequests(response.data.requests || []);
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (
    requestId,
    status,
    rejectionReason = ""
  ) => {
    try {
      const payload = { status };
      if (status === "Rejected" && rejectionReason) {
        payload.rejection_reason = rejectionReason;
      }

      await axios.put(`/api/shift-requests/${requestId}/status`, payload, {
        headers,
      });
      alert(`Request ${status.toLowerCase()} successfully!`);
      fetchRequests(); // Refresh the list
    } catch (error) {
      console.error("Error updating request status:", error);
      alert(error.response?.data?.error || "Error updating request status");
    }
  };

  const handleReject = (requestId) => {
    const reason = prompt("Please provide a reason for rejection:");
    if (reason !== null) {
      handleStatusUpdate(requestId, "Rejected", reason);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Approved":
        return "#388e3c";
      case "Rejected":
        return "#d32f2f";
      case "Pending":
        return "#f57c00";
      default:
        return "#757575";
    }
  };

  const filteredRequests = requests.filter((request) => {
    const matchesSearch =
      searchTerm === "" ||
      request.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.department?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="shift-request-management-container">
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

      <div className="shift-request-management-content">
        <div className="shift-request-management-header">
          <h1>Shift Change Request Management</h1>
        </div>

        <div className="filters-section">
          <div className="search-filter">
            <input
              type="text"
              placeholder="Search by name, username, or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filter-controls">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select"
            >
              <option value="">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>

            <button onClick={fetchRequests} className="refresh-btn">
              Refresh
            </button>
          </div>
        </div>

        {filteredRequests.length === 0 ? (
          <div className="no-requests">
            <p>No shift change requests found.</p>
          </div>
        ) : (
          <div className="requests-table">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Request Date</th>
                  <th>Current Shift</th>
                  <th>Requested Shift</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Applied On</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((request) => (
                  <tr key={request.id}>
                    <td>
                      <div className="employee-info">
                        <span className="employee-name">
                          {request.name || request.username}
                        </span>
                        <span className="employee-username">
                          @{request.username}
                        </span>
                      </div>
                    </td>
                    <td>{request.department || "-"}</td>
                    <td>
                      {new Date(request.request_date).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="shift-info">
                        <span className="shift-name">
                          {request.current_shift_name}
                        </span>
                        <span className="shift-time">
                          {request.current_start_time} -{" "}
                          {request.current_end_time}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="shift-info">
                        <span className="shift-name">
                          {request.requested_shift_name}
                        </span>
                        <span className="shift-time">
                          {request.requested_start_time} -{" "}
                          {request.requested_end_time}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="reason-cell">{request.reason || "-"}</div>
                    </td>
                    <td>
                      <span
                        className="status-badge"
                        style={{
                          backgroundColor: getStatusColor(request.status),
                        }}
                      >
                        {request.status}
                      </span>
                    </td>
                    <td>{new Date(request.created_at).toLocaleDateString()}</td>
                    <td>
                      {request.status === "Pending" && (
                        <div className="action-buttons">
                          <button
                            onClick={() =>
                              handleStatusUpdate(request.id, "Approved")
                            }
                            className="btn-approve"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(request.id)}
                            className="btn-reject"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {request.status !== "Pending" && (
                        <span className="processed-by">
                          by {request.approved_by_name || "Unknown"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShiftRequestManagement;
