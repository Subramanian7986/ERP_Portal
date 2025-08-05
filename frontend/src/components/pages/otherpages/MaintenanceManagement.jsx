import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import "../../css/MaintenanceManagement.css";

const MaintenanceManagement = () => {
  const navigate = useNavigate();
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [assets, setAssets] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [assetFilter, setAssetFilter] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [formData, setFormData] = useState({
    asset_id: "",
    maintenance_type: "Preventive",
    description: "",
    cost: "",
    vendor_id: "",
    next_maintenance_date: "",
    status: "Scheduled",
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
    fetchMaintenanceRecords();
    fetchAssets();
    fetchVendors();
  }, []);

  const fetchMaintenanceRecords = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (statusFilter) params.append("status", statusFilter);
      if (typeFilter) params.append("maintenance_type", typeFilter);
      if (assetFilter) params.append("asset_id", assetFilter);

      const response = await axios.get(
        `/api/it-inventory/maintenance?${params}`,
        { headers }
      );
      setMaintenanceRecords(response.data.maintenance);
    } catch (error) {
      console.error("Error fetching maintenance records:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssets = async () => {
    try {
      const response = await axios.get("/api/it-inventory/assets", { headers });
      setAssets(response.data.assets);
    } catch (error) {
      console.error("Error fetching assets:", error);
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
    fetchMaintenanceRecords();
  }, [searchTerm, statusFilter, typeFilter, assetFilter]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setFormData({
      asset_id: "",
      maintenance_type: "Preventive",
      description: "",
      cost: "",
      vendor_id: "",
      next_maintenance_date: "",
      status: "Scheduled",
      notes: "",
    });
  };

  const handleAddMaintenance = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/api/it-inventory/maintenance", formData, { headers });
      setShowAddModal(false);
      resetForm();
      fetchMaintenanceRecords();
      alert("Maintenance record added successfully!");
    } catch (error) {
      console.error("Error adding maintenance record:", error);
      alert(
        "Error adding maintenance record: " +
          (error.response?.data?.error || error.message)
      );
    }
  };

  const handleUpdateMaintenance = async (e) => {
    e.preventDefault();
    try {
      await axios.put(
        `/api/it-inventory/maintenance/${selectedRecord.id}`,
        formData,
        { headers }
      );
      setShowEditModal(false);
      setSelectedRecord(null);
      resetForm();
      fetchMaintenanceRecords();
      alert("Maintenance record updated successfully!");
    } catch (error) {
      console.error("Error updating maintenance record:", error);
      alert(
        "Error updating maintenance record: " +
          (error.response?.data?.error || error.message)
      );
    }
  };

  const openEditModal = (record) => {
    setSelectedRecord(record);
    setFormData({
      asset_id: record.asset_id,
      maintenance_type: record.maintenance_type,
      description: record.description,
      cost: record.cost || "",
      vendor_id: record.vendor_id || "",
      next_maintenance_date: record.next_maintenance_date || "",
      status: record.status,
      notes: record.notes || "",
    });
    setShowEditModal(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return (
      new Date(dateString).toLocaleDateString() +
      " " +
      new Date(dateString).toLocaleTimeString()
    );
  };

  const formatCurrency = (amount) => {
    if (!amount) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "Scheduled":
        return "status-scheduled";
      case "In Progress":
        return "status-in-progress";
      case "Completed":
        return "status-completed";
      case "Cancelled":
        return "status-cancelled";
      default:
        return "status-default";
    }
  };

  const getTypeBadgeClass = (type) => {
    switch (type) {
      case "Preventive":
        return "type-preventive";
      case "Repair":
        return "type-repair";
      case "Upgrade":
        return "type-upgrade";
      case "Inspection":
        return "type-inspection";
      default:
        return "type-default";
    }
  };

  const getAssetName = (assetId) => {
    const asset = assets.find((a) => a.id === assetId);
    return asset ? `${asset.asset_tag} - ${asset.name}` : "Unknown Asset";
  };

  const getVendorName = (vendorId) => {
    const vendor = vendors.find((v) => v.id === vendorId);
    return vendor ? vendor.name : "Internal";
  };

  if (loading) {
    return <div className="loading">Loading maintenance records...</div>;
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
    <div className="maintenance-management-container">
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

      <div className="maintenance-management-content">
        <div className="maintenance-management-header">
          <h1>Maintenance Management</h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="add-maintenance-btn"
          >
            + Schedule Maintenance
          </button>
        </div>

        {/* Maintenance Statistics */}
        <div className="maintenance-stats">
          <div className="stat-item">
            <span className="stat-number">{maintenanceRecords.length}</span>
            <span className="stat-label">Total Records</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">
              {
                maintenanceRecords.filter((r) => r.status === "Scheduled")
                  .length
              }
            </span>
            <span className="stat-label">Scheduled</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">
              {
                maintenanceRecords.filter((r) => r.status === "In Progress")
                  .length
              }
            </span>
            <span className="stat-label">In Progress</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">
              {
                maintenanceRecords.filter((r) => r.status === "Completed")
                  .length
              }
            </span>
            <span className="stat-label">Completed</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">
              {formatCurrency(
                maintenanceRecords.reduce(
                  (sum, r) => sum + (parseFloat(r.cost) || 0),
                  0
                )
              )}
            </span>
            <span className="stat-label">Total Cost</span>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-section">
          <div className="filter-group">
            <input
              type="text"
              placeholder="Search maintenance records..."
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
              <option value="Scheduled">Scheduled</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          <div className="filter-group">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All Types</option>
              <option value="Preventive">Preventive</option>
              <option value="Repair">Repair</option>
              <option value="Upgrade">Upgrade</option>
              <option value="Inspection">Inspection</option>
            </select>
          </div>
          <div className="filter-group">
            <select
              value={assetFilter}
              onChange={(e) => setAssetFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All Assets</option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.asset_tag} - {asset.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Maintenance Records Table */}
        <div className="maintenance-table-container">
          <table className="maintenance-table">
            <thead>
              <tr>
                <th>Record ID</th>
                <th>Asset</th>
                <th>Type</th>
                <th>Description</th>
                <th>Status</th>
                <th>Performed By</th>
                <th>Performed Date</th>
                <th>Cost</th>
                <th>Vendor</th>
                <th>Next Maintenance</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {maintenanceRecords.map((record) => (
                <tr key={record.id} className="maintenance-row">
                  <td className="record-id">#{record.id}</td>
                  <td className="asset-name">
                    {getAssetName(record.asset_id)}
                  </td>
                  <td>
                    <span
                      className={`type-badge ${getTypeBadgeClass(
                        record.maintenance_type
                      )}`}
                    >
                      {record.maintenance_type}
                    </span>
                  </td>
                  <td className="description-cell">{record.description}</td>
                  <td>
                    <span
                      className={`status-badge ${getStatusBadgeClass(
                        record.status
                      )}`}
                    >
                      {record.status}
                    </span>
                  </td>
                  <td>{record.performed_by_name}</td>
                  <td>{formatDate(record.performed_at)}</td>
                  <td>{formatCurrency(record.cost)}</td>
                  <td>{getVendorName(record.vendor_id)}</td>
                  <td>{formatDate(record.next_maintenance_date)}</td>
                  <td className="actions-cell">
                    <button
                      onClick={() => openEditModal(record)}
                      className="edit-btn"
                      title="Edit Record"
                    >
                      ✏️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {maintenanceRecords.length === 0 && (
            <div className="no-records">
              <p>No maintenance records found matching your criteria.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Maintenance Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Schedule Maintenance</h2>
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
            <form onSubmit={handleAddMaintenance} className="maintenance-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Asset *</label>
                  <select
                    name="asset_id"
                    value={formData.asset_id}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Asset</option>
                    {assets.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.asset_tag} - {asset.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Maintenance Type *</label>
                  <select
                    name="maintenance_type"
                    value={formData.maintenance_type}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="Preventive">Preventive</option>
                    <option value="Repair">Repair</option>
                    <option value="Upgrade">Upgrade</option>
                    <option value="Inspection">Inspection</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Description *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Describe the maintenance work to be performed..."
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Cost</label>
                  <input
                    type="number"
                    name="cost"
                    value={formData.cost}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                  />
                </div>
                <div className="form-group">
                  <label>Vendor</label>
                  <select
                    name="vendor_id"
                    value={formData.vendor_id}
                    onChange={handleInputChange}
                  >
                    <option value="">Internal</option>
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
                  <label>Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Next Maintenance Date</label>
                  <input
                    type="date"
                    name="next_maintenance_date"
                    value={formData.next_maintenance_date}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows="2"
                  placeholder="Additional notes..."
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
                  Schedule Maintenance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Maintenance Modal */}
      {showEditModal && selectedRecord && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Edit Maintenance Record #{selectedRecord.id}</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedRecord(null);
                  resetForm();
                }}
                className="close-btn"
              >
                ×
              </button>
            </div>
            <form
              onSubmit={handleUpdateMaintenance}
              className="maintenance-form"
            >
              <div className="form-row">
                <div className="form-group">
                  <label>Asset *</label>
                  <select
                    name="asset_id"
                    value={formData.asset_id}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Asset</option>
                    {assets.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.asset_tag} - {asset.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Maintenance Type *</label>
                  <select
                    name="maintenance_type"
                    value={formData.maintenance_type}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="Preventive">Preventive</option>
                    <option value="Repair">Repair</option>
                    <option value="Upgrade">Upgrade</option>
                    <option value="Inspection">Inspection</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Description *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Describe the maintenance work to be performed..."
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Cost</label>
                  <input
                    type="number"
                    name="cost"
                    value={formData.cost}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                  />
                </div>
                <div className="form-group">
                  <label>Vendor</label>
                  <select
                    name="vendor_id"
                    value={formData.vendor_id}
                    onChange={handleInputChange}
                  >
                    <option value="">Internal</option>
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
                  <label>Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Next Maintenance Date</label>
                  <input
                    type="date"
                    name="next_maintenance_date"
                    value={formData.next_maintenance_date}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows="2"
                  placeholder="Additional notes..."
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedRecord(null);
                    resetForm();
                  }}
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  Update Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceManagement;
