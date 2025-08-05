import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import "../../css/VendorManagement.css";

const VendorManagement = () => {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    contact_person: "",
    email: "",
    phone: "",
    address: "",
    rating: 5,
    notes: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");

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
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const response = await axios.get("/api/it-inventory/vendors", {
        headers,
      });
      setVendors(response.data.vendors);
    } catch (error) {
      console.error("Error fetching vendors:", error);
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
      name: "",
      contact_person: "",
      email: "",
      phone: "",
      address: "",
      rating: 5,
      notes: "",
    });
  };

  const handleAddVendor = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/api/it-inventory/vendors", formData, { headers });
      setShowAddModal(false);
      resetForm();
      fetchVendors();
      alert("Vendor created successfully!");
    } catch (error) {
      console.error("Error creating vendor:", error);
      alert(
        "Error creating vendor: " +
          (error.response?.data?.error || error.message)
      );
    }
  };

  const handleUpdateVendor = async (e) => {
    e.preventDefault();
    try {
      await axios.put(
        `/api/it-inventory/vendors/${selectedVendor.id}`,
        formData,
        { headers }
      );
      setShowEditModal(false);
      setSelectedVendor(null);
      resetForm();
      fetchVendors();
      alert("Vendor updated successfully!");
    } catch (error) {
      console.error("Error updating vendor:", error);
      alert(
        "Error updating vendor: " +
          (error.response?.data?.error || error.message)
      );
    }
  };

  const handleDeleteVendor = async () => {
    try {
      await axios.delete(`/api/it-inventory/vendors/${selectedVendor.id}`, {
        headers,
      });
      setShowDeleteModal(false);
      setSelectedVendor(null);
      fetchVendors();
      alert("Vendor deleted successfully!");
    } catch (error) {
      console.error("Error deleting vendor:", error);
      alert(
        "Error deleting vendor: " +
          (error.response?.data?.error || error.message)
      );
    }
  };

  const openEditModal = (vendor) => {
    setSelectedVendor(vendor);
    setFormData({
      name: vendor.name,
      contact_person: vendor.contact_person || "",
      email: vendor.email || "",
      phone: vendor.phone || "",
      address: vendor.address || "",
      rating: vendor.rating || 5,
      notes: vendor.notes || "",
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (vendor) => {
    setSelectedVendor(vendor);
    setShowDeleteModal(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString();
  };

  const getRatingStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} className={`star ${i <= rating ? "filled" : "empty"}`}>
          ★
        </span>
      );
    }
    return stars;
  };

  const getRatingClass = (rating) => {
    if (rating >= 4) return "rating-excellent";
    if (rating >= 3) return "rating-good";
    if (rating >= 2) return "rating-fair";
    return "rating-poor";
  };

  const filteredAndSortedVendors = vendors
    .filter(
      (vendor) =>
        vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (vendor.contact_person &&
          vendor.contact_person
            .toLowerCase()
            .includes(searchTerm.toLowerCase())) ||
        (vendor.email &&
          vendor.email.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "rating":
          aValue = a.rating || 0;
          bValue = b.rating || 0;
          break;
        case "created_at":
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  if (loading) {
    return <div className="loading">Loading vendors...</div>;
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
    <div className="vendor-management-container">
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

      <div className="vendor-management-content">
        <div className="vendor-management-header">
          <h1>Vendor Management</h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="add-vendor-btn"
          >
            + Add Vendor
          </button>
        </div>

        {/* Vendor Statistics */}
        <div className="vendor-stats">
          <div className="stat-item">
            <span className="stat-number">{vendors.length}</span>
            <span className="stat-label">Total Vendors</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">
              {vendors.filter((v) => (v.rating || 0) >= 4).length}
            </span>
            <span className="stat-label">Excellent (4+ Stars)</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">
              {
                vendors.filter(
                  (v) => (v.rating || 0) >= 3 && (v.rating || 0) < 4
                ).length
              }
            </span>
            <span className="stat-label">Good (3-4 Stars)</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">
              {vendors.filter((v) => (v.rating || 0) < 3).length}
            </span>
            <span className="stat-label">Needs Improvement</span>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="filters-section">
          <div className="search-group">
            <input
              type="text"
              placeholder="Search vendors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="sort-group">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="name">Sort by Name</option>
              <option value="rating">Sort by Rating</option>
              <option value="created_at">Sort by Date Created</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="sort-order-btn"
            >
              {sortOrder === "asc" ? "↑" : "↓"}
            </button>
          </div>
        </div>

        {/* Vendors Table */}
        <div className="vendors-table-container">
          <table className="vendors-table">
            <thead>
              <tr>
                <th>Vendor Name</th>
                <th>Contact Person</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Rating</th>
                <th>Created Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedVendors.map((vendor) => (
                <tr key={vendor.id} className="vendor-row">
                  <td className="vendor-name">{vendor.name}</td>
                  <td>{vendor.contact_person || "-"}</td>
                  <td className="email-cell">
                    {vendor.email ? (
                      <a href={`mailto:${vendor.email}`} className="email-link">
                        {vendor.email}
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>
                    {vendor.phone ? (
                      <a href={`tel:${vendor.phone}`} className="phone-link">
                        {vendor.phone}
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>
                    <div
                      className={`rating-display ${getRatingClass(
                        vendor.rating || 0
                      )}`}
                    >
                      {getRatingStars(vendor.rating || 0)}
                      <span className="rating-text">
                        ({vendor.rating || 0}/5)
                      </span>
                    </div>
                  </td>
                  <td>{formatDate(vendor.created_at)}</td>
                  <td className="actions-cell">
                    <button
                      onClick={() => openEditModal(vendor)}
                      className="edit-btn"
                      title="Edit Vendor"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => openDeleteModal(vendor)}
                      className="delete-btn"
                      title="Delete Vendor"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredAndSortedVendors.length === 0 && (
            <div className="no-vendors">
              <p>No vendors found matching your criteria.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Vendor Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Add New Vendor</h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="close-btn"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAddVendor} className="vendor-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Vendor Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., Dell Technologies, HP Inc."
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Contact Person</label>
                  <input
                    type="text"
                    name="contact_person"
                    value={formData.contact_person}
                    onChange={handleInputChange}
                    placeholder="e.g., John Smith"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="contact@vendor.com"
                  />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Address</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Full address..."
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Rating</label>
                  <select
                    name="rating"
                    value={formData.rating}
                    onChange={handleInputChange}
                  >
                    <option value="5">5 Stars - Excellent</option>
                    <option value="4">4 Stars - Very Good</option>
                    <option value="3">3 Stars - Good</option>
                    <option value="2">2 Stars - Fair</option>
                    <option value="1">1 Star - Poor</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Additional notes about this vendor..."
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  Create Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Vendor Modal */}
      {showEditModal && selectedVendor && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Edit Vendor: {selectedVendor.name}</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedVendor(null);
                  resetForm();
                }}
                className="close-btn"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleUpdateVendor} className="vendor-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Vendor Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., Dell Technologies, HP Inc."
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Contact Person</label>
                  <input
                    type="text"
                    name="contact_person"
                    value={formData.contact_person}
                    onChange={handleInputChange}
                    placeholder="e.g., John Smith"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="contact@vendor.com"
                  />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Address</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Full address..."
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Rating</label>
                  <select
                    name="rating"
                    value={formData.rating}
                    onChange={handleInputChange}
                  >
                    <option value="5">5 Stars - Excellent</option>
                    <option value="4">4 Stars - Very Good</option>
                    <option value="3">3 Stars - Good</option>
                    <option value="2">2 Stars - Fair</option>
                    <option value="1">1 Star - Poor</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Additional notes about this vendor..."
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedVendor(null);
                    resetForm();
                  }}
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  Update Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Vendor Modal */}
      {showDeleteModal && selectedVendor && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Delete Vendor</h2>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedVendor(null);
                }}
                className="close-btn"
              >
                ×
              </button>
            </div>
            <div className="delete-confirmation">
              <div className="warning-message">
                <h3>⚠️ Warning</h3>
                <p>
                  Are you sure you want to delete the vendor{" "}
                  <strong>"{selectedVendor.name}"</strong>?
                </p>
                <p>This action cannot be undone.</p>
              </div>
              <div className="modal-actions">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedVendor(null);
                  }}
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteVendor}
                  className="delete-confirm-btn"
                >
                  Delete Vendor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorManagement;
