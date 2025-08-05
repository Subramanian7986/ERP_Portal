import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import "../../css/ExpenseManagement.css";

const ExpenseManagement = () => {
  const navigate = useNavigate();
  const [claims, setClaims] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingClaim, setEditingClaim] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [userRole, setUserRole] = useState("");

  // Filters
  const [filters, setFilters] = useState({
    status: "",
    category_id: "",
    search: "",
    start_date: "",
    end_date: "",
  });

  useEffect(() => {
    // Get user role from token
    const token =
      localStorage.getItem("erp_token") || sessionStorage.getItem("erp_token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUserRole(decoded.role);
      } catch (error) {
        console.error("Error decoding token:", error);
      }
    }

    fetchClaims();
    fetchCategories();
  }, []);

  const fetchClaims = async (customFilters = null) => {
    try {
      setLoading(true);
      const token =
        localStorage.getItem("erp_token") ||
        sessionStorage.getItem("erp_token");
      const params = new URLSearchParams();

      const filtersToUse = customFilters || filters;

      Object.keys(filtersToUse).forEach((key) => {
        if (filtersToUse[key]) {
          params.append(key, filtersToUse[key]);
        }
      });

      const response = await axios.get(`/api/expenses/claims?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setClaims(response.data.claims);
    } catch (error) {
      console.error("Error fetching claims:", error);
      setError("Failed to fetch expense claims");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const token =
        localStorage.getItem("erp_token") ||
        sessionStorage.getItem("erp_token");
      const response = await axios.get("/api/expenses/categories", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCategories(response.data.categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    // Force a re-fetch with current filters
    fetchClaims();
  };

  const clearFilters = () => {
    const clearedFilters = {
      status: "",
      category_id: "",
      search: "",
      start_date: "",
      end_date: "",
    };
    setFilters(clearedFilters);
    // Fetch claims with cleared filters immediately
    fetchClaims(clearedFilters);
  };

  const openModal = (claim = null) => {
    setEditingClaim(claim);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingClaim(null);
  };

  const openApprovalModal = (claim) => {
    setSelectedClaim(claim);
    setShowApprovalModal(true);
  };

  const closeApprovalModal = () => {
    setShowApprovalModal(false);
    setSelectedClaim(null);
  };

  const handleSubmit = async (formData) => {
    try {
      const token =
        localStorage.getItem("erp_token") ||
        sessionStorage.getItem("erp_token");

      if (editingClaim) {
        await axios.put(`/api/expenses/claims/${editingClaim.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post("/api/expenses/claims", formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      closeModal();
      fetchClaims();
    } catch (error) {
      console.error("Error submitting claim:", error);
      alert(error.response?.data?.error || "Failed to submit claim");
    }
  };

  const handleDelete = async (id) => {
    if (
      !window.confirm("Are you sure you want to delete this expense claim?")
    ) {
      return;
    }

    try {
      const token =
        localStorage.getItem("erp_token") ||
        sessionStorage.getItem("erp_token");
      await axios.delete(`/api/expenses/claims/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchClaims();
    } catch (error) {
      console.error("Error deleting claim:", error);
      alert(error.response?.data?.error || "Failed to delete claim");
    }
  };

  const handleApprove = async (id, notes = "") => {
    try {
      const token =
        localStorage.getItem("erp_token") ||
        sessionStorage.getItem("erp_token");
      await axios.put(
        `/api/expenses/claims/${id}/approve`,
        { notes },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      closeApprovalModal();
      fetchClaims();
    } catch (error) {
      console.error("Error approving claim:", error);
      alert(error.response?.data?.error || "Failed to approve claim");
    }
  };

  const handleReject = async (id, rejection_reason) => {
    try {
      const token =
        localStorage.getItem("erp_token") ||
        sessionStorage.getItem("erp_token");
      await axios.put(
        `/api/expenses/claims/${id}/reject`,
        { rejection_reason },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      closeApprovalModal();
      fetchClaims();
    } catch (error) {
      console.error("Error rejecting claim:", error);
      alert(error.response?.data?.error || "Failed to reject claim");
    }
  };

  const handleMarkPaid = async (id) => {
    try {
      const token =
        localStorage.getItem("erp_token") ||
        sessionStorage.getItem("erp_token");
      await axios.put(
        `/api/expenses/claims/${id}/mark-paid`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      fetchClaims();
    } catch (error) {
      console.error("Error marking as paid:", error);
      alert(error.response?.data?.error || "Failed to mark as paid");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Pending":
        return "orange";
      case "Approved":
        return "green";
      case "Rejected":
        return "red";
      case "Paid":
        return "blue";
      default:
        return "gray";
    }
  };

  if (loading) {
    return <div className="expense-loading">Loading...</div>;
  }

  return (
    <div className="expense-management-container">
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

      <div className="expense-header">
        <h1>Expense Management</h1>
        <button className="add-button" onClick={() => openModal()}>
          + Add Expense Claim
        </button>
      </div>

      {/* Filters */}
      <div className="expense-filters">
        <div className="filter-row">
          <input
            type="text"
            placeholder="Search by title, description, or user..."
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
            className="filter-input"
          />
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange("status", e.target.value)}
            className="filter-select"
          >
            <option value="">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Paid">Paid</option>
          </select>
          <select
            value={filters.category_id}
            onChange={(e) => handleFilterChange("category_id", e.target.value)}
            className="filter-select"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-row">
          <input
            type="date"
            value={filters.start_date}
            onChange={(e) => handleFilterChange("start_date", e.target.value)}
            className="filter-input"
            placeholder="Start Date"
          />
          <input
            type="date"
            value={filters.end_date}
            onChange={(e) => handleFilterChange("end_date", e.target.value)}
            className="filter-input"
            placeholder="End Date"
          />
          <button
            className="apply-button"
            onClick={applyFilters}
            disabled={loading}
          >
            {loading ? "Applying..." : "Apply Filters"}
          </button>
          <button
            className="clear-button"
            onClick={clearFilters}
            disabled={loading}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Claims Table */}
      <div className="expense-table-container">
        <table className="expense-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>User</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {claims.map((claim) => (
              <tr key={claim.id}>
                <td>{claim.title}</td>
                <td>{claim.user_name}</td>
                <td>{claim.category_name}</td>
                <td>${claim.amount}</td>
                <td>{new Date(claim.expense_date).toLocaleDateString()}</td>
                <td>
                  <span
                    className={`status-badge status-${getStatusColor(
                      claim.status
                    )}`}
                  >
                    {claim.status}
                  </span>
                </td>
                <td className="action-buttons">
                  {userRole.toLowerCase() === "finance" &&
                    claim.status === "Pending" && (
                      <>
                        <button
                          className="approve-button"
                          onClick={() => openApprovalModal(claim)}
                        >
                          Approve
                        </button>
                        <button
                          className="reject-button"
                          onClick={() => openApprovalModal(claim)}
                        >
                          Reject
                        </button>
                      </>
                    )}
                  {userRole.toLowerCase() === "finance" &&
                    claim.status === "Approved" && (
                      <button
                        className="mark-paid-button"
                        onClick={() => handleMarkPaid(claim.id)}
                      >
                        Mark Paid
                      </button>
                    )}
                  {(claim.user_id ===
                    parseInt(localStorage.getItem("user_id")) ||
                    userRole.toLowerCase() === "finance") &&
                    claim.status === "Pending" && (
                      <>
                        <button
                          className="edit-button"
                          onClick={() => openModal(claim)}
                        >
                          Edit
                        </button>
                        <button
                          className="delete-button"
                          onClick={() => handleDelete(claim.id)}
                        >
                          Delete
                        </button>
                      </>
                    )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <ExpenseForm
          claim={editingClaim}
          categories={categories}
          onSubmit={handleSubmit}
          onClose={closeModal}
        />
      )}

      {/* Approval Modal */}
      {showApprovalModal && (
        <ApprovalModal
          claim={selectedClaim}
          onApprove={handleApprove}
          onReject={handleReject}
          onClose={closeApprovalModal}
        />
      )}
    </div>
  );
};

// Expense Form Component
const ExpenseForm = ({ claim, categories, onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    category_id: claim?.category_id || "",
    title: claim?.title || "",
    description: claim?.description || "",
    amount: claim?.amount || "",
    currency: claim?.currency || "USD",
    expense_date: claim?.expense_date || "",
    receipt_url: claim?.receipt_url || "",
    notes: claim?.notes || "",
  });

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>{claim ? "Edit Expense Claim" : "Add Expense Claim"}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Category *</label>
            <select
              name="category_id"
              value={formData.category_id}
              onChange={handleChange}
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
            <label>Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Amount *</label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                step="0.01"
                min="0"
                required
              />
            </div>
            <div className="form-group">
              <label>Currency</label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleChange}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Expense Date *</label>
            <input
              type="date"
              name="expense_date"
              value={formData.expense_date}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Receipt URL</label>
            <input
              type="url"
              name="receipt_url"
              value={formData.receipt_url}
              onChange={handleChange}
              placeholder="https://..."
            />
          </div>
          <div className="form-group">
            <label>Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
            />
          </div>
          <div className="modal-buttons">
            <button type="submit" className="submit-button">
              {claim ? "Update" : "Submit"}
            </button>
            <button type="button" className="cancel-button" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Approval Modal Component
const ApprovalModal = ({ claim, onApprove, onReject, onClose }) => {
  const [action, setAction] = useState("");
  const [reason, setReason] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (action === "approve") {
      onApprove(claim.id, reason);
    } else if (action === "reject") {
      onReject(claim.id, reason);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Process Expense Claim</h2>
        <div className="claim-details">
          <p>
            <strong>Title:</strong> {claim?.title}
          </p>
          <p>
            <strong>Amount:</strong> ${claim?.amount}
          </p>
          <p>
            <strong>User:</strong> {claim?.user_name}
          </p>
          <p>
            <strong>Category:</strong> {claim?.category_name}
          </p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Action</label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              required
            >
              <option value="">Select Action</option>
              <option value="approve">Approve</option>
              <option value="reject">Reject</option>
            </select>
          </div>
          <div className="form-group">
            <label>
              {action === "reject" ? "Rejection Reason *" : "Notes"}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required={action === "reject"}
            />
          </div>
          <div className="modal-buttons">
            <button type="submit" className="submit-button">
              {action === "approve"
                ? "Approve"
                : action === "reject"
                ? "Reject"
                : "Submit"}
            </button>
            <button type="button" className="cancel-button" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExpenseManagement;
