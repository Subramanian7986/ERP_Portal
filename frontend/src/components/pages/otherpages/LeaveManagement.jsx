import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import "../../css/LeaveManagement.css";

const LeaveManagement = () => {
  const navigate = useNavigate();
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [leaveTypeFilter, setLeaveTypeFilter] = useState("");

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
      fetchLeaveRequests();
    }
  }, [user.id]);

  const fetchLeaveRequests = async () => {
    try {
      const response = await axios.get("/api/hr/leave-requests", { headers });
      setLeaveRequests(response.data.requests || []);
    } catch (error) {
      console.error("Error fetching leave requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId) => {
    try {
      await axios.put(
        `/api/leave/${requestId}/status`,
        { status: "Approved" },
        { headers }
      );
      fetchLeaveRequests();
    } catch (error) {
      alert(error.response?.data?.error || "Error approving leave request");
    }
  };

  const handleReject = async (requestId) => {
    const reason = window.prompt("Enter rejection reason:");
    if (!reason) return;
    try {
      await axios.put(
        `/api/leave/${requestId}/status`,
        { status: "Rejected", rejection_reason: reason },
        { headers }
      );
      fetchLeaveRequests();
    } catch (error) {
      alert(error.response?.data?.error || "Error rejecting leave request");
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

  const getLeaveTypeColor = (type) => {
    switch (type) {
      case "Annual":
        return "#1976d2";
      case "Sick":
        return "#d32f2f";
      case "Personal":
        return "#7b1fa2";
      case "Other":
        return "#757575";
      default:
        return "#757575";
    }
  };

  const filteredRequests = leaveRequests.filter((request) => {
    const matchesSearch =
      request.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.department?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || request.status === statusFilter;
    const matchesType =
      !leaveTypeFilter || request.leave_type === leaveTypeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  if (loading) {
    return (
      <div className="leave-management-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="leave-management-container">
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

      <div className="leave-management-content">
        <div className="leave-management-header">
          <h1>Leave Management</h1>
          <div className="header-stats">
            <div className="stat-item">
              <span className="stat-label">Total Requests:</span>
              <span className="stat-value">{leaveRequests.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Pending:</span>
              <span className="stat-value pending">
                {leaveRequests.filter((r) => r.status === "Pending").length}
              </span>
            </div>
          </div>
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
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
            <select
              value={leaveTypeFilter}
              onChange={(e) => setLeaveTypeFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All Types</option>
              <option value="Annual">Annual</option>
              <option value="Sick">Sick</option>
              <option value="Personal">Personal</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
        <div className="requests-table-container">
          {filteredRequests.length === 0 ? (
            <div className="no-requests">No leave requests found.</div>
          ) : (
            <div className="requests-table">
              <table>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Type</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Days</th>
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
                          <div className="employee-name">
                            {request.name || request.username}
                          </div>
                          <div className="employee-username">
                            @{request.username}
                          </div>
                        </div>
                      </td>
                      <td>{request.department || "-"}</td>
                      <td>
                        <span
                          className="leave-type-badge"
                          style={{
                            backgroundColor: getLeaveTypeColor(
                              request.leave_type
                            ),
                          }}
                        >
                          {request.leave_type}
                        </span>
                      </td>
                      <td>
                        {new Date(request.start_date).toLocaleDateString()}
                      </td>
                      <td>{new Date(request.end_date).toLocaleDateString()}</td>
                      <td>{request.total_days}</td>
                      <td className="reason-cell">
                        {request.reason ? (
                          <span title={request.reason}>
                            {request.reason.length > 30
                              ? request.reason.substring(0, 30) + "..."
                              : request.reason}
                          </span>
                        ) : (
                          "-"
                        )}
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
                      <td>
                        {new Date(request.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <div className="action-buttons">
                          {request.status === "Pending" ||
                          request.status === "pending" ||
                          request.status?.toLowerCase() === "pending" ? (
                            <>
                              <button
                                className="btn-approve"
                                onClick={() => handleApprove(request.id)}
                              >
                                Approve
                              </button>
                              <button
                                className="btn-reject"
                                onClick={() => handleReject(request.id)}
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            <div className="processed-info">
                              <div>Processed by:</div>
                              <div className="approver-name">
                                {request.approved_by_name || "System"}
                              </div>
                              {request.approved_at && (
                                <div className="approval-date">
                                  {new Date(
                                    request.approved_at
                                  ).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeaveManagement;
