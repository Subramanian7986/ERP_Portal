import React, { useEffect, useState } from "react";
import "../../css/AdminDashboard.css";
import LoadingSpinner from "../otherpages/LoadingSpinner";
import ErrorMessage from "../otherpages/ErrorMessage";
import { useNavigate, NavLink } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import axios from "axios";

const features = [
  "User Management",
  "Role & Permission Management",
  "Communication Tools",
];

const UserStatsWidget = () => {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/admin/user-stats");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch stats");
        setStats(data.stats);
      } catch (err) {
        setError(err.message || "Failed to fetch stats");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!stats.length) return <div>No data available.</div>;

  const total = stats.reduce((sum, row) => sum + row.count, 0);

  return (
    <>
      <ul className="admin-userstats-list">
        {stats.map((row) => (
          <li key={row.role} className="admin-userstats-item">
            <span className="admin-userstats-role">{row.role}</span>
            <span className="admin-userstats-count">{row.count}</span>
          </li>
        ))}
      </ul>
      <div className="admin-widget-total">Total: {total}</div>
    </>
  );
};

const RecentLoginsWidget = () => {
  const [logins, setLogins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchLogins = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/admin/recent-logins");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch logins");
        setLogins(data.logins);
      } catch (err) {
        setError(err.message || "Failed to fetch logins");
      } finally {
        setLoading(false);
      }
    };
    fetchLogins();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!logins.length) return <div>No recent logins.</div>;

  return (
    <ul className="admin-logins-list">
      {logins.map((login, idx) => (
        <li key={idx} className="admin-logins-item">
          <span className="admin-logins-username">{login.username}</span>
          <span className="admin-logins-role">
            {login.role} &bull; {new Date(login.timestamp).toLocaleString()}
          </span>
          <span className="admin-logins-ip">IP: {login.ip_address}</span>
        </li>
      ))}
    </ul>
  );
};

const SystemHealthWidget = () => {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchHealth = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/admin/system-health");
        const data = await res.json();
        if (!res.ok)
          throw new Error(data.error || "Failed to fetch system health");
        setHealth(data);
      } catch (err) {
        setError(err.message || "Failed to fetch system health");
      } finally {
        setLoading(false);
      }
    };
    fetchHealth();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!health) return <div>No data available.</div>;

  function formatUptime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h}h ${m}m ${s}s`;
  }

  return (
    <div className="admin-systemhealth">
      <div>
        <b>Uptime:</b> {formatUptime(health.uptime)}
      </div>
      <div>
        <b>Node Version:</b> {health.nodeVersion}
      </div>
      <div className="admin-systemhealth-mem">
        <b>Memory Usage:</b>
      </div>
      <ul className="admin-systemhealth-list">
        <li>RSS: {(health.memory.rss / 1024 / 1024).toFixed(2)} MB</li>
        <li>
          Heap Total: {(health.memory.heapTotal / 1024 / 1024).toFixed(2)} MB
        </li>
        <li>
          Heap Used: {(health.memory.heapUsed / 1024 / 1024).toFixed(2)} MB
        </li>
        <li>
          External: {(health.memory.external / 1024 / 1024).toFixed(2)} MB
        </li>
      </ul>
    </div>
  );
};

const PendingApprovalsWidget = () => {
  const [approvals, setApprovals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchApprovals = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/admin/pending-approvals");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch approvals");
        setApprovals(data);
      } catch (err) {
        setError(err.message || "Failed to fetch approvals");
      } finally {
        setLoading(false);
      }
    };
    fetchApprovals();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!approvals) return <div>No data available.</div>;

  return (
    <ul className="admin-widget-list">
      <li>
        <b>Leave Requests:</b>{" "}
        <span className="admin-widget-list-count">
          {approvals.leaveRequests}
        </span>
      </li>
      <li>
        <b>Expense Claims:</b>{" "}
        <span className="admin-widget-list-count">
          {approvals.expenseClaims}
        </span>
      </li>
      <li>
        <b>Purchase Orders:</b>{" "}
        <span className="admin-widget-list-count">
          {approvals.purchaseOrders}
        </span>
      </li>
    </ul>
  );
};

const ModuleUsageWidget = () => {
  const [usage, setUsage] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchUsage = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/admin/module-usage");
        const data = await res.json();
        if (!res.ok)
          throw new Error(data.error || "Failed to fetch module usage");
        setUsage(data.usage);
      } catch (err) {
        setError(err.message || "Failed to fetch module usage");
      } finally {
        setLoading(false);
      }
    };
    fetchUsage();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!usage.length) return <div>No data available.</div>;

  return (
    <ul className="admin-widget-list">
      {usage.map((row) => (
        <li key={row.module_name} className="admin-widget-list-item">
          <span>{row.module_name}</span>
          <span className="admin-widget-list-count">{row.count}</span>
        </li>
      ))}
    </ul>
  );
};

const UserManagementWidget = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/admin/users");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch users");
        setUsers(data.users);
      } catch (err) {
        setError(err.message || "Failed to fetch users");
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!users.length) return <div>No users found.</div>;

  return (
    <div className="admin-users-table-container">
      <table className="admin-users-table">
        <thead>
          <tr>
            <th>Username</th>
            <th>Email</th>
            <th>Role</th>
            <th>Active</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="admin-users-table-row">
              <td>{u.username}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>{u.is_active ? "Yes" : "No"}</td>
              <td>{new Date(u.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  let user = { username: "", role: "", id: null };
  let token =
    localStorage.getItem("erp_token") || sessionStorage.getItem("erp_token");
  if (token) {
    try {
      const decoded = jwtDecode(token);
      user.id = decoded.userId || decoded.id || null;
      user.username =
        decoded.username || decoded.name || decoded.email || "Admin";
      user.role = decoded.role || "Admin";
    } catch {}
  }
  const [userInfo, setUserInfo] = useState({
    username: user.username,
    role: user.role,
  });
  useEffect(() => {
    if (user.id) {
      axios
        .get(`/api/admin/users/${user.id}`)
        .then((res) => {
          const u = res.data.user;
          setUserInfo({
            username: u.username || u.name || u.email || user.username,
            role: u.role || user.role,
          });
        })
        .catch(() => setUserInfo({ username: user.username, role: user.role }));
    }
  }, [user.id]);
  // Remove notification state, API calls, handlers, UI elements, widgets, and dropdowns
  const handleLogout = () => {
    localStorage.removeItem("erp_token");
    sessionStorage.removeItem("erp_token");
    navigate("/login");
  };

  return (
    <div className="admin-dashboard-container">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <h2 className="admin-sidebar-title">Admin Panel</h2>
        <nav className="admin-sidebar-nav">
          <NavLink to="/admin/users" className="admin-sidebar-link">
            User Management
          </NavLink>
          <NavLink to="/admin/roles-permissions" className="admin-sidebar-link">
            Role & Permission Management
          </NavLink>
          <NavLink to="/admin/announcements" className="admin-sidebar-link">
            Create Announcement
          </NavLink>
          <NavLink to="/announcements" className="admin-sidebar-link">
            All Announcements
          </NavLink>
          <NavLink to="/messages" className="admin-sidebar-link">
            Messages
          </NavLink>
        </nav>
        <button onClick={handleLogout} className="admin-sidebar-logout-button">
          Logout
        </button>
      </aside>
      {/* Main Content */}
      <main className="admin-main">
        <div className="admin-main-header">
          <div className="admin-main-header-title">
            Hello, {userInfo.username}!{" "}
            <span className="admin-main-header-role">({userInfo.role})</span>
          </div>
          {/* Remove notification state, API calls, handlers, UI elements, widgets, and dropdowns */}
        </div>
        <h1 className="admin-dashboard-title">Admin Dashboard</h1>
        <div className="admin-widgets">
          {/* Dashboard Widgets */}
          <div className="admin-widget">
            <h3 className="admin-widget-title">Total Users by Role</h3>
            <UserStatsWidget />
          </div>
          <div className="admin-widget">
            <h3 className="admin-widget-title">System Health</h3>
            <SystemHealthWidget />
          </div>
          <div className="admin-widget">
            <h3 className="admin-widget-title">Recent Logins</h3>
            <RecentLoginsWidget />
          </div>
          <div className="admin-widget">
            <h3 className="admin-widget-title">Pending Approvals</h3>
            <PendingApprovalsWidget />
          </div>
          <div className="admin-widget">
            <h3 className="admin-widget-title">Module Usage Stats</h3>
            <ModuleUsageWidget />
          </div>
        </div>
        <div className="admin-dashboard-info">
          Select a feature from the sidebar to manage system settings, users,
          roles, and more.
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
