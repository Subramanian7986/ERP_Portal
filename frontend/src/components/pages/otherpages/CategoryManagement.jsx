import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import "../../css/CategoryManagement.css";

const CategoryManagement = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    parent_id: "",
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
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get("/api/it-inventory/categories", {
        headers,
      });
      setCategories(response.data.categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
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
      description: "",
      parent_id: "",
    });
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/api/it-inventory/categories", formData, { headers });
      setShowAddModal(false);
      resetForm();
      fetchCategories();
      alert("Category created successfully!");
    } catch (error) {
      console.error("Error creating category:", error);
      alert(
        "Error creating category: " +
          (error.response?.data?.error || error.message)
      );
    }
  };

  const handleUpdateCategory = async (e) => {
    e.preventDefault();
    try {
      await axios.put(
        `/api/it-inventory/categories/${selectedCategory.id}`,
        formData,
        { headers }
      );
      setShowEditModal(false);
      setSelectedCategory(null);
      resetForm();
      fetchCategories();
      alert("Category updated successfully!");
    } catch (error) {
      console.error("Error updating category:", error);
      alert(
        "Error updating category: " +
          (error.response?.data?.error || error.message)
      );
    }
  };

  const handleDeleteCategory = async () => {
    try {
      await axios.delete(
        `/api/it-inventory/categories/${selectedCategory.id}`,
        { headers }
      );
      setShowDeleteModal(false);
      setSelectedCategory(null);
      fetchCategories();
      alert("Category deleted successfully!");
    } catch (error) {
      console.error("Error deleting category:", error);
      alert(
        "Error deleting category: " +
          (error.response?.data?.error || error.message)
      );
    }
  };

  const openEditModal = (category) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      description: category.description || "",
      parent_id: category.parent_id || "",
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (category) => {
    setSelectedCategory(category);
    setShowDeleteModal(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString();
  };

  const getParentName = (parentId) => {
    if (!parentId) return "None";
    const parent = categories.find((c) => c.id === parentId);
    return parent ? parent.name : "Unknown";
  };

  const getCategoryLevel = (category) => {
    let level = 0;
    let current = category;
    while (current.parent_id) {
      level++;
      current = categories.find((c) => c.id === current.parent_id);
      if (!current) break;
    }
    return level;
  };

  const getIndentedName = (category) => {
    const level = getCategoryLevel(category);
    const indent = "  ".repeat(level);
    return indent + category.name;
  };

  const filteredAndSortedCategories = categories
    .filter(
      (category) =>
        category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (category.description &&
          category.description.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "created_at":
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        case "assets_count":
          aValue = a.assets_count || 0;
          bValue = b.assets_count || 0;
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
    return <div className="loading">Loading categories...</div>;
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
    <div className="category-management-container">
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

      <div className="category-management-content">
        <div className="category-management-header">
          <h1>Asset Categories Management</h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="add-category-btn"
          >
            + Add Category
          </button>
        </div>

        {/* Category Statistics */}
        <div className="category-stats">
          <div className="stat-item">
            <span className="stat-number">{categories.length}</span>
            <span className="stat-label">Total Categories</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">
              {categories.filter((c) => !c.parent_id).length}
            </span>
            <span className="stat-label">Root Categories</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">
              {categories.filter((c) => c.parent_id).length}
            </span>
            <span className="stat-label">Sub Categories</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">
              {categories.reduce((sum, c) => sum + (c.assets_count || 0), 0)}
            </span>
            <span className="stat-label">Total Assets</span>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="filters-section">
          <div className="search-group">
            <input
              type="text"
              placeholder="Search categories..."
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
              <option value="created_at">Sort by Date Created</option>
              <option value="assets_count">Sort by Asset Count</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="sort-order-btn"
            >
              {sortOrder === "asc" ? "↑" : "↓"}
            </button>
          </div>
        </div>

        {/* Categories Table */}
        <div className="categories-table-container">
          <table className="categories-table">
            <thead>
              <tr>
                <th>Category Name</th>
                <th>Description</th>
                <th>Parent Category</th>
                <th>Assets Count</th>
                <th>Created Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedCategories.map((category) => (
                <tr key={category.id} className="category-row">
                  <td className="category-name">
                    <span
                      className="category-indent"
                      style={{ marginLeft: getCategoryLevel(category) * 20 }}
                    >
                      {category.name}
                    </span>
                  </td>
                  <td className="description-cell">
                    {category.description || "-"}
                  </td>
                  <td>{getParentName(category.parent_id)}</td>
                  <td>
                    <span className="assets-count">
                      {category.assets_count || 0}
                    </span>
                  </td>
                  <td>{formatDate(category.created_at)}</td>
                  <td className="actions-cell">
                    <button
                      onClick={() => openEditModal(category)}
                      className="edit-btn"
                      title="Edit Category"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => openDeleteModal(category)}
                      className="delete-btn"
                      title="Delete Category"
                      disabled={category.assets_count > 0}
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredAndSortedCategories.length === 0 && (
            <div className="no-categories">
              <p>No categories found matching your criteria.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Category Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Add New Category</h2>
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
            <form onSubmit={handleAddCategory} className="category-form">
              <div className="form-group">
                <label>Category Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Laptops, Monitors, Peripherals"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Describe this category..."
                />
              </div>
              <div className="form-group">
                <label>Parent Category</label>
                <select
                  name="parent_id"
                  value={formData.parent_id}
                  onChange={handleInputChange}
                >
                  <option value="">None (Root Category)</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {getIndentedName(category)}
                    </option>
                  ))}
                </select>
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
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {showEditModal && selectedCategory && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Edit Category: {selectedCategory.name}</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedCategory(null);
                  resetForm();
                }}
                className="close-btn"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleUpdateCategory} className="category-form">
              <div className="form-group">
                <label>Category Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Laptops, Monitors, Peripherals"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Describe this category..."
                />
              </div>
              <div className="form-group">
                <label>Parent Category</label>
                <select
                  name="parent_id"
                  value={formData.parent_id}
                  onChange={handleInputChange}
                >
                  <option value="">None (Root Category)</option>
                  {categories
                    .filter((c) => c.id !== selectedCategory.id)
                    .map((category) => (
                      <option key={category.id} value={category.id}>
                        {getIndentedName(category)}
                      </option>
                    ))}
                </select>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedCategory(null);
                    resetForm();
                  }}
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  Update Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Category Modal */}
      {showDeleteModal && selectedCategory && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Delete Category</h2>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedCategory(null);
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
                  Are you sure you want to delete the category{" "}
                  <strong>"{selectedCategory.name}"</strong>?
                </p>
                {selectedCategory.assets_count > 0 && (
                  <div className="error-message">
                    <p>
                      ❌ This category cannot be deleted because it contains{" "}
                      {selectedCategory.assets_count} assets.
                    </p>
                    <p>
                      Please reassign or delete all assets in this category
                      first.
                    </p>
                  </div>
                )}
                {selectedCategory.assets_count === 0 && (
                  <p>This action cannot be undone.</p>
                )}
              </div>
              <div className="modal-actions">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedCategory(null);
                  }}
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteCategory}
                  className="delete-confirm-btn"
                  disabled={selectedCategory.assets_count > 0}
                >
                  Delete Category
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManagement;
