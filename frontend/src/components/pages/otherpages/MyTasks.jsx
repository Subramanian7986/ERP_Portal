import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import "../../css/MyTasks.css";

const MyTasks = () => {
  const navigate = useNavigate();
  const [myTasks, setMyTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");

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
      fetchMyTasks();
    }
  }, [user.id]);

  const fetchMyTasks = async () => {
    try {
      const response = await axios.get(`/api/tasks/my-tasks`, { headers });
      setMyTasks(response.data.tasks || []);
    } catch (error) {
      console.error("Error fetching my tasks:", error);
      setMyTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      await axios.put(
        `/api/tasks/${taskId}/status`,
        { status: newStatus },
        { headers }
      );
      fetchMyTasks(); // Refresh the list
    } catch (error) {
      console.error("Error updating task status:", error);
      alert("Error updating task status");
    }
  };

  const filteredTasks = myTasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.description &&
        task.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = !statusFilter || task.status === statusFilter;
    const matchesPriority = !priorityFilter || task.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "Critical":
        return "#d32f2f";
      case "High":
        return "#f57c00";
      case "Medium":
        return "#1976d2";
      case "Low":
        return "#388e3c";
      default:
        return "#757575";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Completed":
        return "#388e3c";
      case "In Progress":
        return "#1976d2";
      case "On Hold":
        return "#f57c00";
      case "Cancelled":
        return "#d32f2f";
      case "Pending":
        return "#757575";
      default:
        return "#757575";
    }
  };

  if (loading) {
    return <div className="loading">Loading your tasks...</div>;
  }

  return (
    <div className="my-tasks-container">
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

      <div className="my-tasks-content">
        <div className="header-section">
          <h1>My Tasks</h1>
          <div className="task-summary">
            <span>Total: {myTasks.length}</span>
            <span>
              Pending: {myTasks.filter((t) => t.status === "Pending").length}
            </span>
            <span>
              In Progress:{" "}
              {myTasks.filter((t) => t.status === "In Progress").length}
            </span>
            <span>
              Completed:{" "}
              {myTasks.filter((t) => t.status === "Completed").length}
            </span>
          </div>
        </div>

        <div className="filters-section">
          <input
            type="text"
            placeholder="Search my tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">All Status</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="On Hold">On Hold</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
        </div>

        <div className="tasks-table-container">
          {filteredTasks.length === 0 ? (
            <div className="no-tasks">
              <h3>No tasks found</h3>
              <p>You don't have any tasks assigned to you yet.</p>
            </div>
          ) : (
            <table className="tasks-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Due Date</th>
                  <th>Assigned By</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task) => (
                  <tr key={task.id}>
                    <td>
                      <div className="task-title">
                        <strong>{task.title}</strong>
                        {task.description && (
                          <div className="task-description">
                            {task.description.substring(0, 50)}...
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <span
                        className="priority-badge"
                        style={{
                          backgroundColor: getPriorityColor(task.priority),
                        }}
                      >
                        {task.priority}
                      </span>
                    </td>
                    <td>
                      <span
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(task.status) }}
                      >
                        {task.status}
                      </span>
                    </td>
                    <td>
                      {task.due_date
                        ? new Date(task.due_date).toLocaleDateString()
                        : "-"}
                    </td>
                    <td>{task.assigned_by_name || "-"}</td>
                    <td>
                      {task.notes ? (
                        <div className="task-notes" title={task.notes}>
                          {task.notes.length > 30
                            ? `${task.notes.substring(0, 30)}...`
                            : task.notes}
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <select
                          value={task.status}
                          onChange={(e) =>
                            updateTaskStatus(task.id, e.target.value)
                          }
                          className="status-update-select"
                          style={{
                            backgroundColor: getStatusColor(task.status),
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            padding: "4px 8px",
                            fontSize: "11px",
                            cursor: "pointer",
                          }}
                        >
                          <option value="Pending">Pending</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                          <option value="On Hold">On Hold</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyTasks;
