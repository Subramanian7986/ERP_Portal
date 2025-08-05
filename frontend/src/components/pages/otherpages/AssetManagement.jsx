import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import "../../css/AssetManagement.css";

const AssetManagement = () => {
  const navigate = useNavigate();
  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [formData, setFormData] = useState({
    asset_tag: "",
    name: "",
    category_id: "",
    model: "",
    serial_number: "",
    specifications: "",
    purchase_date: "",
    purchase_cost: "",
    vendor_id: "",
    warranty_expiry: "",
    location: "",
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
    fetchAssets();
    fetchCategories();
    fetchVendors();
  }, []);

  const fetchAssets = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (statusFilter) params.append("status", statusFilter);
      if (categoryFilter) params.append("category_id", categoryFilter);

      const response = await axios.get(`/api/it-inventory/assets?${params}`, {
        headers,
      });
      setAssets(response.data.assets);
    } catch (error) {
      console.error("Error fetching assets:", error);
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

  const fetchVendors = async () => {
    try {
      const response = await axios.get("/api/it-inventory/vendors", {
        headers,
      });
      setVendors(response.data.vendors);
    } catch (error) {
      console.error("Error fetching vendors:", error);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [searchTerm, statusFilter, categoryFilter]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setFormData({
      asset_tag: "",
      name: "",
      category_id: "",
      model: "",
      serial_number: "",
      specifications: "",
      purchase_date: "",
      purchase_cost: "",
      vendor_id: "",
      warranty_expiry: "",
      location: "",
      notes: "",
    });
  };

  const handleAddAsset = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/api/it-inventory/assets", formData, { headers });
      setShowAddModal(false);
      resetForm();
      fetchAssets();
    } catch (error) {
      console.error("Error adding asset:", error);
      alert(
        "Error adding asset: " + (error.response?.data?.error || error.message)
      );
    }
  };

  const handleEditAsset = async (e) => {
    e.preventDefault();
    try {
      await axios.put(
        `/api/it-inventory/assets/${selectedAsset.id}`,
        formData,
        { headers }
      );
      setShowEditModal(false);
      setSelectedAsset(null);
      resetForm();
      fetchAssets();
    } catch (error) {
      console.error("Error updating asset:", error);
      alert(
        "Error updating asset: " +
          (error.response?.data?.error || error.message)
      );
    }
  };

  const handleDeleteAsset = async () => {
    try {
      await axios.delete(`/api/it-inventory/assets/${selectedAsset.id}`, {
        headers,
      });
      setShowDeleteModal(false);
      setSelectedAsset(null);
      fetchAssets();
    } catch (error) {
      console.error("Error deleting asset:", error);
      alert(
        "Error deleting asset: " +
          (error.response?.data?.error || error.message)
      );
    }
  };

  const openEditModal = (asset) => {
    setSelectedAsset(asset);
    setFormData({
      asset_tag: asset.asset_tag,
      name: asset.name,
      category_id: asset.category_id,
      model: asset.model || "",
      serial_number: asset.serial_number || "",
      specifications: asset.specifications || "",
      purchase_date: asset.purchase_date || "",
      purchase_cost: asset.purchase_cost || "",
      vendor_id: asset.vendor_id || "",
      warranty_expiry: asset.warranty_expiry || "",
      location: asset.location || "",
      notes: asset.notes || "",
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (asset) => {
    setSelectedAsset(asset);
    setShowDeleteModal(true);
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "Available":
        return "status-available";
      case "Assigned":
        return "status-assigned";
      case "Under Maintenance":
        return "status-maintenance";
      case "Retired":
        return "status-retired";
      case "Lost/Stolen":
        return "status-lost";
      default:
        return "status-default";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount) => {
    if (!amount) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  if (loading) {
    return <div className="loading">Loading assets...</div>;
  }

  return (
    <div className="asset-management-container">
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

      <div className="asset-management-content">
        <div className="asset-management-header">
          <h1>Asset Management</h1>
          {isITUser && (
            <button
              onClick={() => setShowAddModal(true)}
              className="add-asset-btn"
            >
              + Add Asset
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="filters-section">
          <div className="filter-group">
            <input
              type="text"
              placeholder="Search assets..."
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
              <option value="Available">Available</option>
              <option value="Assigned">Assigned</option>
              <option value="Under Maintenance">Under Maintenance</option>
              <option value="Retired">Retired</option>
              <option value="Lost/Stolen">Lost/Stolen</option>
            </select>
          </div>
          <div className="filter-group">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
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
        </div>

        {/* Assets Table */}
        <div className="assets-table-container">
          <table className="assets-table">
            <thead>
              <tr>
                <th>Asset Tag</th>
                <th>Name</th>
                <th>Category</th>
                <th>Model</th>
                <th>Status</th>
                <th>Location</th>
                <th>Purchase Cost</th>
                <th>Warranty</th>
                <th>Assigned To</th>
                {isITUser && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr key={asset.id} className="asset-row">
                  <td className="asset-tag">{asset.asset_tag}</td>
                  <td className="asset-name">{asset.name}</td>
                  <td>{asset.category_name}</td>
                  <td>{asset.model || "-"}</td>
                  <td>
                    <span
                      className={`status-badge ${getStatusBadgeClass(
                        asset.status
                      )}`}
                    >
                      {asset.status}
                    </span>
                  </td>
                  <td>{asset.location || "-"}</td>
                  <td>{formatCurrency(asset.purchase_cost)}</td>
                  <td>{formatDate(asset.warranty_expiry)}</td>
                  <td>{asset.assigned_to_name || "-"}</td>
                  {isITUser && (
                    <td className="actions-cell">
                      <button
                        onClick={() => openEditModal(asset)}
                        className="edit-btn"
                        title="Edit Asset"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => openDeleteModal(asset)}
                        className="delete-btn"
                        title="Delete Asset"
                      >
                        🗑️
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {assets.length === 0 && (
            <div className="no-assets">
              <p>No assets found matching your criteria.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Asset Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Add New Asset</h2>
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
            <form onSubmit={handleAddAsset} className="asset-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Asset Tag *</label>
                  <input
                    type="text"
                    name="asset_tag"
                    value={formData.asset_tag}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Category *</label>
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
                  <label>Model</label>
                  <input
                    type="text"
                    name="model"
                    value={formData.model}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Serial Number</label>
                  <input
                    type="text"
                    name="serial_number"
                    value={formData.serial_number}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>Purchase Date</label>
                  <input
                    type="date"
                    name="purchase_date"
                    value={formData.purchase_date}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Purchase Cost</label>
                  <input
                    type="number"
                    name="purchase_cost"
                    value={formData.purchase_cost}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label>Vendor</label>
                  <select
                    name="vendor_id"
                    value={formData.vendor_id}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Vendor</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Warranty Expiry</label>
                  <input
                    type="date"
                    name="warranty_expiry"
                    value={formData.warranty_expiry}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>Location</label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="form-group full-width">
                <label>Specifications</label>
                <textarea
                  name="specifications"
                  value={formData.specifications}
                  onChange={handleInputChange}
                  rows="3"
                />
              </div>
              <div className="form-group full-width">
                <label>Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows="2"
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
                <button type="submit" className="save-btn">
                  Add Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Asset Modal */}
      {showEditModal && selectedAsset && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Edit Asset: {selectedAsset.asset_tag}</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedAsset(null);
                  resetForm();
                }}
                className="close-btn"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleEditAsset} className="asset-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Asset Tag *</label>
                  <input
                    type="text"
                    name="asset_tag"
                    value={formData.asset_tag}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Category *</label>
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
                  <label>Model</label>
                  <input
                    type="text"
                    name="model"
                    value={formData.model}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Serial Number</label>
                  <input
                    type="text"
                    name="serial_number"
                    value={formData.serial_number}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>Purchase Date</label>
                  <input
                    type="date"
                    name="purchase_date"
                    value={formData.purchase_date}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Purchase Cost</label>
                  <input
                    type="number"
                    name="purchase_cost"
                    value={formData.purchase_cost}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label>Vendor</label>
                  <select
                    name="vendor_id"
                    value={formData.vendor_id}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Vendor</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Warranty Expiry</label>
                  <input
                    type="date"
                    name="warranty_expiry"
                    value={formData.warranty_expiry}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>Location</label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="form-group full-width">
                <label>Specifications</label>
                <textarea
                  name="specifications"
                  value={formData.specifications}
                  onChange={handleInputChange}
                  rows="3"
                />
              </div>
              <div className="form-group full-width">
                <label>Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows="2"
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedAsset(null);
                    resetForm();
                  }}
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button type="submit" className="save-btn">
                  Update Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedAsset && (
        <div className="modal-overlay">
          <div className="modal delete-modal">
            <div className="modal-header">
              <h2>Delete Asset</h2>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedAsset(null);
                }}
                className="close-btn"
              >
                ×
              </button>
            </div>
            <div className="delete-content">
              <p>
                Are you sure you want to delete the asset{" "}
                <strong>
                  {selectedAsset.asset_tag} - {selectedAsset.name}
                </strong>
                ?
              </p>
              <p>This action cannot be undone.</p>
            </div>
            <div className="modal-actions">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedAsset(null);
                }}
                className="cancel-btn"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAsset}
                className="delete-confirm-btn"
              >
                Delete Asset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetManagement;
