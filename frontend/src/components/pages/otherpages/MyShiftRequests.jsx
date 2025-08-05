import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import "../../css/MyShiftRequests.css";

const MyShiftRequests = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

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
      const response = await axios.get("/api/shift-requests/my-requests", {
        headers,
      });
      setRequests(response.data.requests || []);
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
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

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="my-shift-requests-container">
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

      <div className="my-shift-requests-content">
        <div className="my-shift-requests-header">
          <h1>My Shift Change Requests</h1>
          <button
            onClick={() => navigate("/shift-change-request")}
            className="new-request-btn"
          >
            New Request
          </button>
        </div>

        {requests.length === 0 ? (
          <div className="no-requests">
            <p>No shift change requests found.</p>
            <button
              onClick={() => navigate("/shift-change-request")}
              className="create-first-btn"
            >
              Create Your First Request
            </button>
          </div>
        ) : (
          <div className="requests-table">
            <table>
              <thead>
                <tr>
                  <th>Request Date</th>
                  <th>Current Shift</th>
                  <th>Requested Shift</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Applied On</th>
                  <th>Processed By</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id}>
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
                    <td>{request.approved_by_name || "-"}</td>
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

export default MyShiftRequests;
