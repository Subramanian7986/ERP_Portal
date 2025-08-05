import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import "../../css/LeaveBalance.css";

const LeaveBalance = () => {
  const navigate = useNavigate();
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [applyForm, setApplyForm] = useState({
    leave_type: "Annual",
    start_date: "",
    end_date: "",
    reason: "",
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
    if (user.id) {
      fetchLeaveData();
    }
  }, [user.id]);

  const fetchLeaveData = async () => {
    try {
      const [balanceResponse, requestsResponse] = await Promise.all([
        axios.get("/api/leave/balance", { headers }),
        axios.get("/api/leave/my-requests", { headers }),
      ]);

      setLeaveBalance(balanceResponse.data.leaveBalance);
      setLeaveRequests(requestsResponse.data.requests || []);
    } catch (error) {
      console.error("Error fetching leave data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();

    try {
      await axios.post("/api/leave/apply", applyForm, { headers });
      alert("Leave request submitted successfully!");
      setShowApplyForm(false);
      setApplyForm({
        leave_type: "Annual",
        start_date: "",
        end_date: "",
        reason: "",
      });
      fetchLeaveData(); // Refresh data
    } catch (error) {
      console.error("Error applying for leave:", error);
      alert(error.response?.data?.error || "Error submitting leave request");
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

  if (loading) {
    return (
      <div className="leave-balance-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="leave-balance-container">
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

      <div className="leave-balance-content">
        <div className="leave-balance-header">
          <h1>Leave Balance</h1>
          <button
            onClick={() => setShowApplyForm(true)}
            disabled={!leaveBalance || leaveBalance.available_leave_days <= 0}
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
            }}
          >
            Apply
          </button>
        </div>

        {leaveBalance && (
          <div className="leave-balance-summary">
            <div className="balance-card">
              <h3>Total Leave Days</h3>
              <div className="balance-number">
                {leaveBalance.total_leave_days}
              </div>
            </div>
            <div className="balance-card">
              <h3>Used Leave Days</h3>
              <div className="balance-number used">
                {leaveBalance.used_leave_days}
              </div>
            </div>
            <div className="balance-card">
              <h3>Pending Leave Days</h3>
              <div className="balance-number pending">
                {leaveBalance.pending_leave_days}
              </div>
            </div>
            <div className="balance-card">
              <h3>Available Leave Days</h3>
              <div className="balance-number available">
                {leaveBalance.available_leave_days}
              </div>
            </div>
          </div>
        )}

        <div className="leave-requests-section">
          <h2>My Leave Requests</h2>
          {leaveRequests.length === 0 ? (
            <div className="no-requests">No leave requests found.</div>
          ) : (
            <div className="requests-table">
              <table>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Days</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Applied On</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveRequests.map((request) => (
                    <tr key={request.id}>
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
                      <td>{request.reason || "-"}</td>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Apply Leave Modal */}
      {showApplyForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Apply for Leave</h2>
              <button
                className="close-btn"
                onClick={() => setShowApplyForm(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleApplyLeave} className="apply-form">
              <div className="form-group">
                <label>Leave Type:</label>
                <select
                  value={applyForm.leave_type}
                  onChange={(e) =>
                    setApplyForm({ ...applyForm, leave_type: e.target.value })
                  }
                  required
                >
                  <option value="Annual">Annual</option>
                  <option value="Sick">Sick</option>
                  <option value="Personal">Personal</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label>Start Date:</label>
                <input
                  type="date"
                  value={applyForm.start_date}
                  onChange={(e) =>
                    setApplyForm({ ...applyForm, start_date: e.target.value })
                  }
                  required
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>

              <div className="form-group">
                <label>End Date:</label>
                <input
                  type="date"
                  value={applyForm.end_date}
                  onChange={(e) =>
                    setApplyForm({ ...applyForm, end_date: e.target.value })
                  }
                  required
                  min={
                    applyForm.start_date ||
                    new Date().toISOString().split("T")[0]
                  }
                />
              </div>

              <div className="form-group">
                <label>Reason:</label>
                <textarea
                  value={applyForm.reason}
                  onChange={(e) =>
                    setApplyForm({ ...applyForm, reason: e.target.value })
                  }
                  rows="3"
                  placeholder="Please provide a reason for your leave request..."
                />
              </div>

              <div className="form-actions">
                <button type="button" onClick={() => setShowApplyForm(false)}>
                  Cancel
                </button>
                <button type="submit">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveBalance;
