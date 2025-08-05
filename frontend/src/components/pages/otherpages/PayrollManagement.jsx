import React, { useState, useEffect } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import "../../css/PayrollManagement.css";

const PayrollManagement = () => {
  const [activeTab, setActiveTab] = useState("salaries");
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
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
  }, []);

  const renderSalariesTab = () => <SalaryManagement />;
  const renderPayrollRunsTab = () => <PayrollRuns />;
  const renderTaxRatesTab = () => <TaxRates />;
  const renderReportsTab = () => <PayrollReports />;

  return (
    <div className="payroll-management-container">
      <div className="payroll-header">
        <h1>Payroll Management</h1>
        <div className="payroll-tabs">
          <button
            className={`tab-button ${activeTab === "salaries" ? "active" : ""}`}
            onClick={() => setActiveTab("salaries")}
          >
            Employee Salaries
          </button>
          <button
            className={`tab-button ${
              activeTab === "payroll-runs" ? "active" : ""
            }`}
            onClick={() => setActiveTab("payroll-runs")}
          >
            Payroll Runs
          </button>
          <button
            className={`tab-button ${
              activeTab === "tax-rates" ? "active" : ""
            }`}
            onClick={() => setActiveTab("tax-rates")}
          >
            Tax Rates
          </button>
          <button
            className={`tab-button ${activeTab === "reports" ? "active" : ""}`}
            onClick={() => setActiveTab("reports")}
          >
            Reports
          </button>
        </div>
      </div>

      <div className="payroll-content">
        {activeTab === "salaries" && renderSalariesTab()}
        {activeTab === "payroll-runs" && renderPayrollRunsTab()}
        {activeTab === "tax-rates" && renderTaxRatesTab()}
        {activeTab === "reports" && renderReportsTab()}
      </div>
    </div>
  );
};

// Salary Management Component
const SalaryManagement = () => {
  const [salaries, setSalaries] = useState([]);
  const [filteredSalaries, setFilteredSalaries] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSalary, setEditingSalary] = useState(null);
  const [filters, setFilters] = useState({
    search: "",
    role: "",
    status: "",
    minSalary: "",
    maxSalary: "",
    department: "",
  });
  const [formData, setFormData] = useState({
    user_id: "",
    base_salary: "",
    allowances: "0",
    deductions: "0",
    effective_date: "",
    end_date: "",
    currency: "USD",
  });

  useEffect(() => {
    fetchSalaries();
    fetchUsers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [salaries, filters]);

  const applyFilters = () => {
    let filtered = [...salaries];

    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(
        (salary) =>
          salary.username.toLowerCase().includes(searchTerm) ||
          salary.role.toLowerCase().includes(searchTerm) ||
          salary.department?.toLowerCase().includes(searchTerm)
      );
    }

    // Role filter
    if (filters.role) {
      filtered = filtered.filter(
        (salary) => salary.role.toLowerCase() === filters.role.toLowerCase()
      );
    }

    // Status filter
    if (filters.status) {
      if (filters.status === "active") {
        filtered = filtered.filter((salary) => !salary.end_date);
      } else if (filters.status === "inactive") {
        filtered = filtered.filter((salary) => salary.end_date);
      }
    }

    // Department filter
    if (filters.department) {
      filtered = filtered.filter(
        (salary) =>
          salary.department?.toLowerCase() === filters.department.toLowerCase()
      );
    }

    // Salary range filter
    if (filters.minSalary) {
      filtered = filtered.filter(
        (salary) =>
          parseFloat(salary.base_salary) >= parseFloat(filters.minSalary)
      );
    }

    if (filters.maxSalary) {
      filtered = filtered.filter(
        (salary) =>
          parseFloat(salary.base_salary) <= parseFloat(filters.maxSalary)
      );
    }

    setFilteredSalaries(filtered);
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      role: "",
      status: "",
      minSalary: "",
      maxSalary: "",
      department: "",
    });
  };

  const fetchSalaries = async () => {
    try {
      const token =
        localStorage.getItem("erp_token") ||
        sessionStorage.getItem("erp_token");
      if (!token) {
        console.error("No authentication token found");
        return;
      }
      const response = await axios.get(
        "http://localhost:3000/api/payroll/salaries",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSalaries(response.data.salaries);
    } catch (error) {
      console.error("Error fetching salaries:", error);
      if (error.response?.status === 401) {
        console.error("Authentication failed. Please log in again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const token =
        localStorage.getItem("erp_token") ||
        sessionStorage.getItem("erp_token");
      if (!token) {
        console.error("No authentication token found");
        return;
      }
      const response = await axios.get(
        "http://localhost:3000/api/admin/users",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setUsers(response.data.users.filter((user) => user.role !== "Admin"));
    } catch (error) {
      console.error("Error fetching users:", error);
      if (error.response?.status === 401) {
        console.error("Authentication failed. Please log in again.");
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token =
        localStorage.getItem("erp_token") ||
        sessionStorage.getItem("erp_token");
      if (!token) {
        console.error("No authentication token found");
        return;
      }

      // For editing, we create a new salary record with the new effective date
      // The backend will automatically end the previous salary record
      await axios.post("http://localhost:3000/api/payroll/salaries", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setShowModal(false);
      setFormData({
        user_id: "",
        base_salary: "",
        allowances: "0",
        deductions: "0",
        effective_date: "",
        end_date: "",
        currency: "USD",
      });
      fetchSalaries();
    } catch (error) {
      console.error("Error saving salary:", error);
      if (error.response?.status === 401) {
        console.error("Authentication failed. Please log in again.");
      }
    }
  };

  const openModal = (salary = null) => {
    if (salary) {
      setEditingSalary(salary);
      setFormData({
        user_id: salary.user_id,
        base_salary: salary.base_salary,
        allowances: salary.allowances,
        deductions: salary.deductions,
        effective_date: salary.effective_date,
        end_date: salary.end_date || "",
        currency: salary.currency,
      });
    } else {
      setEditingSalary(null);
      setFormData({
        user_id: "",
        base_salary: "",
        allowances: "0",
        deductions: "0",
        effective_date: "",
        end_date: "",
        currency: "USD",
      });
    }
    setShowModal(true);
  };

  if (loading) return <div className="loading">Loading salaries...</div>;

  return (
    <div className="salary-management">
      <div className="section-header">
        <h2>Employee Salaries</h2>
        <button className="add-button" onClick={() => openModal()}>
          + Add Salary Record
        </button>
      </div>

      {/* Filters Section */}
      <div className="filters-section">
        <div className="filters-row">
          <div className="filter-group">
            <input
              type="text"
              placeholder="Search by name, role, or department..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="filter-input"
            />
          </div>
          <div className="filter-group">
            <select
              value={filters.role}
              onChange={(e) => handleFilterChange("role", e.target.value)}
              className="filter-select"
            >
              <option value="">All Roles</option>
              <option value="hr">HR</option>
              <option value="finance">Finance</option>
              <option value="it">IT</option>
              <option value="developer">Developer</option>
              <option value="employee">Employee</option>
              <option value="pm">PM</option>
              <option value="crm">CRM</option>
              <option value="client">Client</option>
            </select>
          </div>
          <div className="filter-group">
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="filter-select"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="filter-group">
            <select
              value={filters.department}
              onChange={(e) => handleFilterChange("department", e.target.value)}
              className="filter-select"
            >
              <option value="">All Departments</option>
              <option value="hr">HR</option>
              <option value="finance">Finance</option>
              <option value="it">IT</option>
              <option value="development">Development</option>
              <option value="marketing">Marketing</option>
              <option value="sales">Sales</option>
            </select>
          </div>
        </div>
        <div className="filters-row">
          <div className="filter-group">
            <input
              type="number"
              placeholder="Min Salary"
              value={filters.minSalary}
              onChange={(e) => handleFilterChange("minSalary", e.target.value)}
              className="filter-input"
            />
          </div>
          <div className="filter-group">
            <input
              type="number"
              placeholder="Max Salary"
              value={filters.maxSalary}
              onChange={(e) => handleFilterChange("maxSalary", e.target.value)}
              className="filter-input"
            />
          </div>
          <div className="filter-group">
            <button onClick={clearFilters} className="clear-filters-btn">
              Clear Filters
            </button>
          </div>
        </div>
        <div className="results-info">
          Showing {filteredSalaries.length} of {salaries.length} salary records
        </div>
      </div>

      <div className="salary-table-container">
        <table className="salary-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Role</th>
              <th>Base Salary</th>
              <th>Allowances</th>
              <th>Deductions</th>
              <th>Effective Date</th>
              <th>End Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSalaries.map((salary) => (
              <tr key={salary.id}>
                <td>{salary.username}</td>
                <td>{salary.role}</td>
                <td>${salary.base_salary}</td>
                <td>${salary.allowances}</td>
                <td>${salary.deductions}</td>
                <td>{new Date(salary.effective_date).toLocaleDateString()}</td>
                <td>
                  {salary.end_date
                    ? new Date(salary.end_date).toLocaleDateString()
                    : "Active"}
                </td>
                <td>
                  <span
                    className={`status-badge ${
                      salary.end_date ? "inactive" : "active"
                    }`}
                  >
                    {salary.end_date ? "Inactive" : "Active"}
                  </span>
                </td>
                <td>
                  <button
                    className="edit-button"
                    onClick={() => openModal(salary)}
                    title="Edit Salary"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>
              {editingSalary
                ? "Update Salary (Creates New Record)"
                : "Add Salary Record"}
            </h2>
            {editingSalary && (
              <p
                style={{
                  color: "#666",
                  fontSize: "14px",
                  marginBottom: "20px",
                }}
              >
                Note: Updating a salary creates a new record with the new
                effective date. The previous salary record will be automatically
                ended.
              </p>
            )}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Employee</label>
                <select
                  value={formData.user_id}
                  onChange={(e) =>
                    setFormData({ ...formData, user_id: e.target.value })
                  }
                  required
                >
                  <option value="">Select Employee</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.username} ({user.role})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Base Salary</label>
                <input
                  type="number"
                  value={formData.base_salary}
                  onChange={(e) =>
                    setFormData({ ...formData, base_salary: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>Allowances</label>
                <input
                  type="number"
                  value={formData.allowances}
                  onChange={(e) =>
                    setFormData({ ...formData, allowances: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label>Deductions</label>
                <input
                  type="number"
                  value={formData.deductions}
                  onChange={(e) =>
                    setFormData({ ...formData, deductions: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label>Effective Date</label>
                <input
                  type="date"
                  value={formData.effective_date}
                  onChange={(e) =>
                    setFormData({ ...formData, effective_date: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>End Date (Optional)</label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) =>
                    setFormData({ ...formData, end_date: e.target.value })
                  }
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="submit-button">
                  {editingSalary ? "Update" : "Create"}
                </button>
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Payroll Runs Component
const PayrollRuns = () => {
  const [runs, setRuns] = useState([]);
  const [filteredRuns, setFilteredRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    startDate: "",
    endDate: "",
    minEmployees: "",
    maxEmployees: "",
  });
  const [formData, setFormData] = useState({
    run_date: "",
    pay_period_start: "",
    pay_period_end: "",
  });

  useEffect(() => {
    fetchRuns();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [runs, filters]);

  const applyFilters = () => {
    let filtered = [...runs];

    // Search filter (by created by name)
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter((run) =>
        run.created_by_name?.toLowerCase().includes(searchTerm)
      );
    }

    // Status filter
    if (filters.status) {
      filtered = filtered.filter(
        (run) => run.status.toLowerCase() === filters.status.toLowerCase()
      );
    }

    // Date range filter
    if (filters.startDate) {
      filtered = filtered.filter(
        (run) => new Date(run.run_date) >= new Date(filters.startDate)
      );
    }

    if (filters.endDate) {
      filtered = filtered.filter(
        (run) => new Date(run.run_date) <= new Date(filters.endDate)
      );
    }

    // Employee count range filter
    if (filters.minEmployees) {
      filtered = filtered.filter(
        (run) => run.total_employees >= parseInt(filters.minEmployees)
      );
    }

    if (filters.maxEmployees) {
      filtered = filtered.filter(
        (run) => run.total_employees <= parseInt(filters.maxEmployees)
      );
    }

    setFilteredRuns(filtered);
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      status: "",
      startDate: "",
      endDate: "",
      minEmployees: "",
      maxEmployees: "",
    });
  };

  const fetchRuns = async () => {
    try {
      const token =
        localStorage.getItem("erp_token") ||
        sessionStorage.getItem("erp_token");
      if (!token) {
        console.error("No authentication token found");
        return;
      }
      const response = await axios.get(
        "http://localhost:3000/api/payroll/runs",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setRuns(response.data.runs);
    } catch (error) {
      console.error("Error fetching payroll runs:", error);
      if (error.response?.status === 401) {
        console.error("Authentication failed. Please log in again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token =
        localStorage.getItem("erp_token") ||
        sessionStorage.getItem("erp_token");
      if (!token) {
        console.error("No authentication token found");
        return;
      }
      await axios.post("http://localhost:3000/api/payroll/runs", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setShowModal(false);
      setFormData({
        run_date: "",
        pay_period_start: "",
        pay_period_end: "",
      });
      fetchRuns();
    } catch (error) {
      console.error("Error creating payroll run:", error);
      if (error.response?.status === 401) {
        console.error("Authentication failed. Please log in again.");
      }
    }
  };

  const processRun = async (runId) => {
    try {
      const token =
        localStorage.getItem("erp_token") ||
        sessionStorage.getItem("erp_token");
      if (!token) {
        console.error("No authentication token found");
        return;
      }
      await axios.put(
        `http://localhost:3000/api/payroll/runs/${runId}/process`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      fetchRuns();
    } catch (error) {
      console.error("Error processing payroll run:", error);
      if (error.response?.status === 401) {
        console.error("Authentication failed. Please log in again.");
      }
    }
  };

  if (loading) return <div className="loading">Loading payroll runs...</div>;

  return (
    <div className="payroll-runs">
      <div className="section-header">
        <h2>Payroll Runs</h2>
        <button className="add-button" onClick={() => setShowModal(true)}>
          + Create Payroll Run
        </button>
      </div>

      {/* Filters Section */}
      <div className="filters-section">
        <div className="filters-row">
          <div className="filter-group">
            <input
              type="text"
              placeholder="Search by creator name..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="filter-input"
            />
          </div>
          <div className="filter-group">
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="filter-select"
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className="filter-group">
            <input
              type="date"
              placeholder="Start Date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange("startDate", e.target.value)}
              className="filter-input"
            />
          </div>
          <div className="filter-group">
            <input
              type="date"
              placeholder="End Date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange("endDate", e.target.value)}
              className="filter-input"
            />
          </div>
        </div>
        <div className="filters-row">
          <div className="filter-group">
            <input
              type="number"
              placeholder="Min Employees"
              value={filters.minEmployees}
              onChange={(e) =>
                handleFilterChange("minEmployees", e.target.value)
              }
              className="filter-input"
            />
          </div>
          <div className="filter-group">
            <input
              type="number"
              placeholder="Max Employees"
              value={filters.maxEmployees}
              onChange={(e) =>
                handleFilterChange("maxEmployees", e.target.value)
              }
              className="filter-input"
            />
          </div>
          <div className="filter-group">
            <button onClick={clearFilters} className="clear-filters-btn">
              Clear Filters
            </button>
          </div>
        </div>
        <div className="results-info">
          Showing {filteredRuns.length} of {runs.length} payroll runs
        </div>
      </div>

      <div className="runs-table-container">
        <table className="runs-table">
          <thead>
            <tr>
              <th>Run Date</th>
              <th>Pay Period</th>
              <th>Employees</th>
              <th>Gross Pay</th>
              <th>Tax</th>
              <th>Net Pay</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRuns.map((run) => (
              <tr key={run.id}>
                <td>{new Date(run.run_date).toLocaleDateString()}</td>
                <td>
                  {new Date(run.pay_period_start).toLocaleDateString()} -
                  {new Date(run.pay_period_end).toLocaleDateString()}
                </td>
                <td>{run.total_employees}</td>
                <td>${run.total_gross_pay}</td>
                <td>${run.total_tax}</td>
                <td>${run.total_net_pay}</td>
                <td>
                  <span
                    className={`status-badge status-${run.status.toLowerCase()}`}
                  >
                    {run.status}
                  </span>
                </td>
                <td>
                  {run.status === "Draft" && (
                    <button
                      className="process-button"
                      onClick={() => processRun(run.id)}
                    >
                      Process
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Create Payroll Run</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Run Date</label>
                <input
                  type="date"
                  value={formData.run_date}
                  onChange={(e) =>
                    setFormData({ ...formData, run_date: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>Pay Period Start</label>
                <input
                  type="date"
                  value={formData.pay_period_start}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pay_period_start: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>Pay Period End</label>
                <input
                  type="date"
                  value={formData.pay_period_end}
                  onChange={(e) =>
                    setFormData({ ...formData, pay_period_end: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="submit-button">
                  Create Run
                </button>
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Tax Rates Component
const TaxRates = () => {
  const [taxRates, setTaxRates] = useState([]);
  const [filteredTaxRates, setFilteredTaxRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    taxYear: "",
    minIncome: "",
    maxIncome: "",
  });
  const [formData, setFormData] = useState({
    tax_year: "",
    min_income: "",
    max_income: "",
    tax_rate: "",
    tax_bracket_name: "",
  });

  useEffect(() => {
    fetchTaxRates();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [taxRates, filters]);

  const applyFilters = () => {
    let filtered = [...taxRates];

    // Search filter (by bracket name)
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter((rate) =>
        rate.tax_bracket_name?.toLowerCase().includes(searchTerm)
      );
    }

    // Tax year filter
    if (filters.taxYear) {
      filtered = filtered.filter(
        (rate) => rate.tax_year.toString() === filters.taxYear
      );
    }

    // Income range filter
    if (filters.minIncome) {
      filtered = filtered.filter(
        (rate) => parseFloat(rate.min_income) >= parseFloat(filters.minIncome)
      );
    }

    if (filters.maxIncome) {
      filtered = filtered.filter(
        (rate) =>
          parseFloat(rate.max_income || 999999999) <=
          parseFloat(filters.maxIncome)
      );
    }

    setFilteredTaxRates(filtered);
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      taxYear: "",
      minIncome: "",
      maxIncome: "",
    });
  };

  const fetchTaxRates = async () => {
    try {
      const token =
        localStorage.getItem("erp_token") ||
        sessionStorage.getItem("erp_token");
      if (!token) {
        console.error("No authentication token found");
        return;
      }
      const response = await axios.get(
        "http://localhost:3000/api/payroll/tax-rates",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setTaxRates(response.data.tax_rates);
    } catch (error) {
      console.error("Error fetching tax rates:", error);
      if (error.response?.status === 401) {
        console.error("Authentication failed. Please log in again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token =
        localStorage.getItem("erp_token") ||
        sessionStorage.getItem("erp_token");
      if (!token) {
        console.error("No authentication token found");
        return;
      }
      await axios.post(
        "http://localhost:3000/api/payroll/tax-rates",
        formData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setShowModal(false);
      setFormData({
        tax_year: "",
        min_income: "",
        max_income: "",
        tax_rate: "",
        tax_bracket_name: "",
      });
      fetchTaxRates();
    } catch (error) {
      console.error("Error adding tax rate:", error);
      if (error.response?.status === 401) {
        console.error("Authentication failed. Please log in again.");
      }
    }
  };

  if (loading) return <div className="loading">Loading tax rates...</div>;

  return (
    <div className="tax-rates">
      <div className="section-header">
        <h2>Tax Rates</h2>
        <button className="add-button" onClick={() => setShowModal(true)}>
          + Add Tax Rate
        </button>
      </div>

      {/* Filters Section */}
      <div className="filters-section">
        <div className="filters-row">
          <div className="filter-group">
            <input
              type="text"
              placeholder="Search by bracket name..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="filter-input"
            />
          </div>
          <div className="filter-group">
            <input
              type="number"
              placeholder="Tax Year"
              value={filters.taxYear}
              onChange={(e) => handleFilterChange("taxYear", e.target.value)}
              className="filter-input"
            />
          </div>
          <div className="filter-group">
            <input
              type="number"
              placeholder="Min Income"
              value={filters.minIncome}
              onChange={(e) => handleFilterChange("minIncome", e.target.value)}
              className="filter-input"
            />
          </div>
          <div className="filter-group">
            <input
              type="number"
              placeholder="Max Income"
              value={filters.maxIncome}
              onChange={(e) => handleFilterChange("maxIncome", e.target.value)}
              className="filter-input"
            />
          </div>
        </div>
        <div className="filters-row">
          <div className="filter-group">
            <button onClick={clearFilters} className="clear-filters-btn">
              Clear Filters
            </button>
          </div>
        </div>
        <div className="results-info">
          Showing {filteredTaxRates.length} of {taxRates.length} tax rates
        </div>
      </div>

      <div className="tax-rates-table-container">
        <table className="tax-rates-table">
          <thead>
            <tr>
              <th>Tax Year</th>
              <th>Bracket Name</th>
              <th>Min Income</th>
              <th>Max Income</th>
              <th>Tax Rate</th>
            </tr>
          </thead>
          <tbody>
            {filteredTaxRates.map((rate) => (
              <tr key={rate.id}>
                <td>{rate.tax_year}</td>
                <td>{rate.tax_bracket_name}</td>
                <td>${rate.min_income}</td>
                <td>{rate.max_income ? `$${rate.max_income}` : "No Limit"}</td>
                <td>{rate.tax_rate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Add Tax Rate</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Tax Year</label>
                <input
                  type="number"
                  value={formData.tax_year}
                  onChange={(e) =>
                    setFormData({ ...formData, tax_year: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>Bracket Name</label>
                <input
                  type="text"
                  value={formData.tax_bracket_name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tax_bracket_name: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>Min Income</label>
                <input
                  type="number"
                  value={formData.min_income}
                  onChange={(e) =>
                    setFormData({ ...formData, min_income: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>Max Income (Optional)</label>
                <input
                  type="number"
                  value={formData.max_income}
                  onChange={(e) =>
                    setFormData({ ...formData, max_income: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label>Tax Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.tax_rate}
                  onChange={(e) =>
                    setFormData({ ...formData, tax_rate: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="submit-button">
                  Add Tax Rate
                </button>
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Payroll Reports Component
const PayrollReports = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start_date: "",
    end_date: "",
  });

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      const token =
        localStorage.getItem("erp_token") ||
        sessionStorage.getItem("erp_token");
      if (!token) {
        console.error("No authentication token found");
        return;
      }
      const params = new URLSearchParams();
      if (dateRange.start_date)
        params.append("start_date", dateRange.start_date);
      if (dateRange.end_date) params.append("end_date", dateRange.end_date);

      const response = await axios.get(
        `http://localhost:3000/api/payroll/reports/summary?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSummary(response.data.summary);
    } catch (error) {
      console.error("Error fetching summary:", error);
      if (error.response?.status === 401) {
        console.error("Authentication failed. Please log in again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = () => {
    fetchSummary();
  };

  if (loading) return <div className="loading">Loading reports...</div>;

  return (
    <div className="payroll-reports">
      <div className="section-header">
        <h2>Payroll Reports</h2>
        <div className="date-filters">
          <input
            type="date"
            value={dateRange.start_date}
            onChange={(e) =>
              setDateRange({ ...dateRange, start_date: e.target.value })
            }
            placeholder="Start Date"
          />
          <input
            type="date"
            value={dateRange.end_date}
            onChange={(e) =>
              setDateRange({ ...dateRange, end_date: e.target.value })
            }
            placeholder="End Date"
          />
          <button onClick={handleDateChange}>Apply Filter</button>
        </div>
      </div>

      {summary && (
        <div className="summary-cards">
          <div className="summary-card">
            <h3>Total Payroll Runs</h3>
            <p>{summary.total_runs || 0}</p>
          </div>
          <div className="summary-card">
            <h3>Employees Processed</h3>
            <p>{summary.total_employees_processed || 0}</p>
          </div>
          <div className="summary-card">
            <h3>Total Gross Pay</h3>
            <p>${summary.total_gross_pay || 0}</p>
          </div>
          <div className="summary-card">
            <h3>Total Tax</h3>
            <p>${summary.total_tax || 0}</p>
          </div>
          <div className="summary-card">
            <h3>Total Net Pay</h3>
            <p>${summary.total_net_pay || 0}</p>
          </div>
          <div className="summary-card">
            <h3>Average Gross Pay</h3>
            <p>${summary.avg_gross_pay || 0}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollManagement;
