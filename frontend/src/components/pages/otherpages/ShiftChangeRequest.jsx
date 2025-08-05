import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import "../../css/ShiftChangeRequest.css";

const ShiftChangeRequest = () => {
  const navigate = useNavigate();
  const [shifts, setShifts] = useState([]);
  const [currentShift, setCurrentShift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    request_date: "",
    requested_shift_id: "",
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
      fetchShifts();
    }
  }, [user.id]);

  const fetchShifts = async (date = null) => {
    try {
      let url = "/api/shift-requests/shifts";
      if (date) {
        url += `?date=${date}`;
      }

      const response = await axios.get(url, { headers });
      setShifts(response.data.shifts);
    } catch (error) {
      console.error("Error fetching shifts:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentShift = async (date) => {
    if (!date) {
      setCurrentShift(null);
      return;
    }

    try {
      const response = await axios.get(
        `/api/shift-requests/current-shift/${date}`,
        { headers }
      );
      setCurrentShift(response.data.currentShift);
    } catch (error) {
      console.error("Error fetching current shift:", error);
      setCurrentShift(null);
    }
  };

  const handleDateChange = (e) => {
    const date = e.target.value;
    setFormData((prev) => ({
      ...prev,
      request_date: date,
      requested_shift_id: "",
    }));
    fetchCurrentShift(date);
    fetchShifts(date); // Fetch available shifts for the selected date
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await axios.post("/api/shift-requests/request", formData, { headers });
      alert("Shift change request submitted successfully!");
      setFormData({
        request_date: "",
        requested_shift_id: "",
        reason: "",
      });
      setCurrentShift(null);
    } catch (error) {
      console.error("Error submitting request:", error);
      alert(error.response?.data?.error || "Error submitting request");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="shift-change-request-container">
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

      <div className="shift-change-content">
        <div className="shift-change-header">
          <h1>Request Shift Change</h1>
        </div>

        <form onSubmit={handleSubmit} className="shift-change-form">
          <div className="form-group">
            <label htmlFor="request_date">Request Date:</label>
            <input
              type="date"
              id="request_date"
              value={formData.request_date}
              onChange={handleDateChange}
              required
              min={new Date().toISOString().split("T")[0]}
            />
          </div>

          {currentShift && (
            <div className="current-shift-info">
              <h3>Current Shift for {formData.request_date}:</h3>
              <div className="shift-details">
                <span className="shift-name">{currentShift.name}</span>
                <span className="shift-time">
                  {currentShift.start_time} - {currentShift.end_time}
                </span>
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="requested_shift_id">Requested Shift:</label>
            <select
              id="requested_shift_id"
              value={formData.requested_shift_id}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  requested_shift_id: e.target.value,
                }))
              }
              required
            >
              <option value="">Select a shift</option>
              {shifts.map((shift) => (
                <option key={shift.id} value={shift.id}>
                  {shift.name} ({shift.start_time} - {shift.end_time})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="reason">Reason for Change:</label>
            <textarea
              id="reason"
              value={formData.reason}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, reason: e.target.value }))
              }
              rows="4"
              placeholder="Please provide a reason for the shift change request..."
            />
          </div>

          <div className="form-actions">
            <button type="submit" disabled={submitting} className="submit-btn">
              {submitting ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ShiftChangeRequest;
