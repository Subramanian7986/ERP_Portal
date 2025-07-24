import React, { useEffect, useState } from "react";
import "./AdminDashboard.css";
import LoadingSpinner from "./LoadingSpinner";
import ErrorMessage from "./ErrorMessage";
import { useNavigate, NavLink } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import AnnouncementsWidget from "./AnnouncementsWidget";

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
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          textAlign: "center",
        }}
      >
        {stats.map((row) => (
          <li
            key={row.role}
            style={{
              marginBottom: 6,
              fontWeight: 500,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              width: "100%",
            }}
          >
            <span style={{ flex: 1, textAlign: "left", paddingLeft: 12 }}>
              {row.role}
            </span>
            <span
              style={{
                color: "#1a4e8a",
                fontWeight: 700,
                minWidth: 40,
                textAlign: "right",
                paddingRight: 12,
              }}
            >
              {row.count}
            </span>
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
    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {logins.map((login, idx) => (
        <li
          key={idx}
          style={{
            marginBottom: 8,
            fontSize: 15,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            borderBottom: "1px solid #e3f0ff",
            paddingBottom: 6,
          }}
        >
          <span style={{ fontWeight: 600, color: "#1a4e8a" }}>
            {login.username}
          </span>
          <span style={{ color: "#7a8ca3", fontSize: 13 }}>
            {login.role} &bull; {new Date(login.timestamp).toLocaleString()}
          </span>
          <span style={{ color: "#b0b0b0", fontSize: 12 }}>
            IP: {login.ip_address}
          </span>
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
    <div style={{ fontSize: 15 }}>
      <div>
        <b>Uptime:</b> {formatUptime(health.uptime)}
      </div>
      <div>
        <b>Node Version:</b> {health.nodeVersion}
      </div>
      <div style={{ marginTop: 8 }}>
        <b>Memory Usage:</b>
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
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
    <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: 15 }}>
      <li>
        <b>Leave Requests:</b>{" "}
        <span style={{ color: "#1a4e8a", fontWeight: 700 }}>
          {approvals.leaveRequests}
        </span>
      </li>
      <li>
        <b>Expense Claims:</b>{" "}
        <span style={{ color: "#1a4e8a", fontWeight: 700 }}>
          {approvals.expenseClaims}
        </span>
      </li>
      <li>
        <b>Purchase Orders:</b>{" "}
        <span style={{ color: "#1a4e8a", fontWeight: 700 }}>
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
    <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: 15 }}>
      {usage.map((row) => (
        <li
          key={row.module_name}
          style={{
            marginBottom: 6,
            fontWeight: 500,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>{row.module_name}</span>
          <span style={{ color: "#1a4e8a", fontWeight: 700 }}>{row.count}</span>
        </li>
      ))}
    </ul>
  );
};

const NotificationsWidget = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchNotifications = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/admin/notifications");
        const data = await res.json();
        if (!res.ok)
          throw new Error(data.error || "Failed to fetch notifications");
        setNotifications(data.notifications);
      } catch (err) {
        setError(err.message || "Failed to fetch notifications");
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!notifications.length) return <div>No notifications.</div>;

  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: 15 }}>
      {notifications.map((n) => (
        <li
          key={n.id}
          style={{
            marginBottom: 10,
            borderBottom: "1px solid #e3f0ff",
            paddingBottom: 6,
          }}
        >
          <div style={{ fontWeight: 600, color: "#1a4e8a" }}>{n.title}</div>
          <div style={{ color: "#7a8ca3", fontSize: 13 }}>{n.message}</div>
          <div style={{ color: "#b0b0b0", fontSize: 12 }}>
            {new Date(n.created_at).toLocaleString()}
          </div>
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
    <div style={{ overflowX: "auto" }}>
      <table
        style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}
      >
        <thead>
          <tr style={{ background: "#f0f4fa" }}>
            <th style={{ padding: "6px 8px", textAlign: "left" }}>Username</th>
            <th style={{ padding: "6px 8px", textAlign: "left" }}>Email</th>
            <th style={{ padding: "6px 8px", textAlign: "left" }}>Role</th>
            <th style={{ padding: "6px 8px", textAlign: "left" }}>Active</th>
            <th style={{ padding: "6px 8px", textAlign: "left" }}>Created</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} style={{ borderBottom: "1px solid #e3f0ff" }}>
              <td style={{ padding: "6px 8px" }}>{u.username}</td>
              <td style={{ padding: "6px 8px" }}>{u.email}</td>
              <td style={{ padding: "6px 8px" }}>{u.role}</td>
              <td style={{ padding: "6px 8px" }}>
                {u.is_active ? "Yes" : "No"}
              </td>
              <td style={{ padding: "6px 8px" }}>
                {new Date(u.created_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  // Get user info from JWT
  let user = { username: "", role: "" };
  let token =
    localStorage.getItem("erp_token") || sessionStorage.getItem("erp_token");
  if (token) {
    try {
      const decoded = jwtDecode(token);
      user.username = decoded.username || decoded.name || "Admin";
      user.role = decoded.role || "Admin";
    } catch {}
  }
  // Notification state
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const unreadCount = notifications.filter((n) => !n.is_read).length;
  useEffect(() => {
    // Fetch notifications (replace with real API if needed)
    fetch("/api/admin/notifications")
      .then((res) => res.json())
      .then((data) => setNotifications(data.notifications || []));
  }, []);
  // Mark notification as read
  const handleMarkAsRead = (id) => {
    console.log("Clicked notification id:", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    fetch(`/api/admin/notifications/${id}/read`, { method: "POST" });
  };
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
            Announcements
          </NavLink>
          <NavLink to="/announcements" className="admin-sidebar-link">
            All Announcements
          </NavLink>
          <NavLink to="/messages" className="admin-sidebar-link">
            Messages
          </NavLink>
        </nav>
        <button
          onClick={handleLogout}
          style={{
            marginTop: "auto",
            background: "linear-gradient(90deg, #2193b0 0%, #6dd5ed 100%)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "0.7rem 0",
            fontSize: "1.08rem",
            fontWeight: "bold",
            letterSpacing: "0.5px",
            cursor: "pointer",
            width: "100%",
            boxShadow: "0 2px 8px rgba(33, 147, 176, 0.10)",
            transition: "background 0.3s, transform 0.2s, box-shadow 0.2s",
            outline: "none",
            textTransform: "capitalize",
          }}
        >
          Logout
        </button>
      </aside>
      {/* Main Content */}
      <main className="admin-main">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 18,
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 600, color: "#174ea6" }}>
            Hello, {user.username}!{" "}
            <span style={{ fontSize: 16, fontWeight: 400, color: "#7a8ca3" }}>
              ({user.role})
            </span>
          </div>
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowDropdown((v) => !v)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                position: "relative",
                fontSize: 24,
              }}
              title="Notifications"
            >
              <span role="img" aria-label="Notifications">
                🔔
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -6,
                    background: "#d32f2f",
                    color: "#fff",
                    borderRadius: "50%",
                    fontSize: 12,
                    width: 18,
                    height: 18,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </button>
            {showDropdown && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: 36,
                  background: "#fff",
                  boxShadow: "0 2px 12px rgba(26,78,138,0.13)",
                  borderRadius: 8,
                  minWidth: 260,
                  zIndex: 20,
                  padding: 10,
                }}
              >
                <div
                  style={{ fontWeight: 600, color: "#174ea6", marginBottom: 8 }}
                >
                  Notifications
                </div>
                {notifications.length === 0 && (
                  <div style={{ color: "#7a8ca3", fontSize: 14 }}>
                    No notifications
                  </div>
                )}
                {notifications.map((n, i) => (
                  <div
                    key={n.id || i}
                    style={{
                      fontSize: 14,
                      color: n.is_read ? "#7a8ca3" : "#174ea6",
                      padding: "6px 0",
                      borderBottom: "1px solid #f0f4fa",
                      cursor: n.is_read ? "default" : "pointer",
                      opacity: n.is_read ? 0.6 : 1,
                    }}
                    onClick={() => !n.is_read && handleMarkAsRead(n.id)}
                  >
                    {n.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <AnnouncementsWidget role={user.role} />
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
          <div className="admin-widget">
            <h3 className="admin-widget-title">Notifications</h3>
            <NotificationsWidget />
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
