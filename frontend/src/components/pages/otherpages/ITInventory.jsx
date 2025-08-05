import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import "../../css/ITInventory.css";

const ITInventory = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("assets");
  const [stats, setStats] = useState(null);
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
      fetchStats();
    }
  }, [user.id]);

  const fetchStats = async () => {
    try {
      const response = await axios.get("/api/it-inventory/stats", { headers });
      setStats(response.data.stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const isITUser = user.role && user.role.toLowerCase() === "it";

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="it-inventory-container">
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

      <div className="it-inventory-content">
        <div className="it-inventory-header">
          <h1>IT Inventory Management</h1>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">{stats.totalAssets}</div>
              <div className="stat-label">Total Assets</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.availableAssets}</div>
              <div className="stat-label">Available</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.assignedAssets}</div>
              <div className="stat-label">Assigned</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.maintenanceAssets}</div>
              <div className="stat-label">Under Maintenance</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.pendingRequests}</div>
              <div className="stat-label">Pending Requests</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">
                ${stats.totalValue.toLocaleString()}
              </div>
              <div className="stat-label">Total Value</div>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="tabs-container">
          <div className="tabs">
            <button
              className={`tab ${activeTab === "assets" ? "active" : ""}`}
              onClick={() => setActiveTab("assets")}
            >
              Assets
            </button>
            <button
              className={`tab ${activeTab === "assignments" ? "active" : ""}`}
              onClick={() => setActiveTab("assignments")}
            >
              Assignments
            </button>
            <button
              className={`tab ${activeTab === "maintenance" ? "active" : ""}`}
              onClick={() => setActiveTab("maintenance")}
            >
              Maintenance
            </button>
            <button
              className={`tab ${activeTab === "requests" ? "active" : ""}`}
              onClick={() => setActiveTab("requests")}
            >
              Requests
            </button>
            {isITUser && (
              <>
                <button
                  className={`tab ${
                    activeTab === "categories" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("categories")}
                >
                  Categories
                </button>
                <button
                  className={`tab ${activeTab === "vendors" ? "active" : ""}`}
                  onClick={() => setActiveTab("vendors")}
                >
                  Vendors
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === "assets" && (
            <div className="tab-panel">
              <div className="panel-header">
                <h2>Asset Management</h2>
                {isITUser && (
                  <button
                    onClick={() => navigate("/it-inventory/add-asset")}
                    className="add-btn"
                  >
                    Add Asset
                  </button>
                )}
              </div>
              <div className="placeholder-content">
                <p>Asset management interface is now available!</p>
                <button
                  onClick={() => navigate("/asset-management")}
                  className="add-btn"
                  style={{ marginTop: 20 }}
                >
                  Manage Assets
                </button>
              </div>
            </div>
          )}

          {activeTab === "assignments" && (
            <div className="tab-panel">
              <div className="panel-header">
                <h2>Asset Assignments</h2>
                {isITUser && (
                  <button
                    onClick={() => navigate("/it-inventory/assign-asset")}
                    className="add-btn"
                  >
                    Assign Asset
                  </button>
                )}
              </div>
              <div className="placeholder-content">
                <p>Asset assignment interface is now available!</p>
                <button
                  onClick={() => navigate("/asset-assignment")}
                  className="add-btn"
                  style={{ marginTop: 20 }}
                >
                  Manage Assignments
                </button>
              </div>
            </div>
          )}

          {activeTab === "maintenance" && (
            <div className="tab-panel">
              <div className="panel-header">
                <h2>Maintenance Records</h2>
                {isITUser && (
                  <button
                    onClick={() => navigate("/maintenance-management")}
                    className="add-btn"
                  >
                    Manage Maintenance
                  </button>
                )}
              </div>
              <div className="placeholder-content">
                <p>Maintenance management interface is now available!</p>
                <button
                  onClick={() => navigate("/maintenance-management")}
                  className="add-btn"
                  style={{ marginTop: 20 }}
                >
                  Manage Maintenance
                </button>
              </div>
            </div>
          )}

          {activeTab === "requests" && (
            <div className="tab-panel">
              <div className="panel-header">
                <h2>Asset Requests</h2>
                {isITUser && (
                  <button
                    onClick={() => navigate("/asset-request-management")}
                    className="add-btn"
                  >
                    Manage Requests
                  </button>
                )}
              </div>
              <div className="placeholder-content">
                <p>Asset request management interface is now available!</p>
                <button
                  onClick={() => navigate("/asset-request")}
                  className="add-btn"
                  style={{ marginTop: 20 }}
                >
                  Submit Request
                </button>
                {isITUser && (
                  <button
                    onClick={() => navigate("/asset-request-management")}
                    className="add-btn"
                    style={{ marginTop: 10, marginLeft: 10 }}
                  >
                    Manage All Requests
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === "categories" && (
            <div className="tab-panel">
              <div className="panel-header">
                <h2>Asset Categories</h2>
                {isITUser && (
                  <button
                    onClick={() => navigate("/category-management")}
                    className="add-btn"
                  >
                    Manage Categories
                  </button>
                )}
              </div>
              <div className="placeholder-content">
                <p>Category management interface is now available!</p>
                <button
                  onClick={() => navigate("/category-management")}
                  className="add-btn"
                  style={{ marginTop: 20 }}
                >
                  Manage Categories
                </button>
              </div>
            </div>
          )}

          {activeTab === "vendors" && (
            <div className="tab-panel">
              <div className="panel-header">
                <h2>Vendors</h2>
                {isITUser && (
                  <button
                    onClick={() => navigate("/vendor-management")}
                    className="add-btn"
                  >
                    Manage Vendors
                  </button>
                )}
              </div>
              <div className="placeholder-content">
                <p>Vendor management interface is now available!</p>
                <button
                  onClick={() => navigate("/vendor-management")}
                  className="add-btn"
                  style={{ marginTop: 20 }}
                >
                  Manage Vendors
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ITInventory;
