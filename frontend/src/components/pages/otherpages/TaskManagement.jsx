import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import "../../css/TaskManagement.css";

const TaskManagement = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");

  // Task creation/editing state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    priority: "Medium",
    due_date: "",
    status: "Pending",
  });

  // Assignment state
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedDevelopers, setSelectedDevelopers] = useState([]);
  const [assignmentNotes, setAssignmentNotes] = useState("");

  // Edit task assignments state
  const [taskAssignments, setTaskAssignments] = useState([]);
  const [editingAssignments, setEditingAssignments] = useState([]);

  // Bulk assignment state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [bulkAssignmentType, setBulkAssignmentType] = useState(
    "tasks-to-developers"
  ); // or 'developers-to-task'
  const [selectedTaskForBulk, setSelectedTaskForBulk] = useState(null);
  // Bulk assignment search/filter state
  const [bulkTaskSearch, setBulkTaskSearch] = useState("");
  const [bulkDeveloperSearch, setBulkDeveloperSearch] = useState("");

  // Get user token
  const token =
    localStorage.getItem("erp_token") || sessionStorage.getItem("erp_token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchTasks();
    fetchDevelopers();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await axios.get("/api/hr/tasks", { headers });
      setTasks(response.data.tasks || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDevelopers = async () => {
    try {
      const response = await axios.get("/api/hr/developers", { headers });
      setDevelopers(response.data.developers || []);
    } catch (error) {
      console.error("Error fetching developers:", error);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/api/hr/tasks", taskForm, { headers });
      setShowCreateModal(false);
      setTaskForm({
        title: "",
        description: "",
        priority: "Medium",
        due_date: "",
        status: "Pending",
      });
      fetchTasks();
    } catch (error) {
      console.error("Error creating task:", error);
      alert("Error creating task");
    }
  };

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    try {
      // Update task details
      await axios.put(`/api/hr/tasks/${editingTask.id}`, taskForm, { headers });

      // Handle assignment changes
      const originalAssignmentIds = taskAssignments
        .map((a) => a.id)
        .filter((id) => !id.toString().startsWith("temp-"));
      const newAssignmentIds = editingAssignments
        .map((a) => a.id)
        .filter((id) => !id.toString().startsWith("temp-"));

      // Remove assignments that were deleted
      const assignmentsToRemove = taskAssignments.filter(
        (a) => !editingAssignments.find((ea) => ea.id === a.id)
      );

      for (const assignment of assignmentsToRemove) {
        await axios.delete(
          `/api/hr/tasks/${editingTask.id}/assignments/${assignment.id}`,
          { headers }
        );
      }

      // Add new assignments
      const newAssignments = editingAssignments.filter((a) =>
        a.id.toString().startsWith("temp-")
      );
      for (const assignment of newAssignments) {
        await axios.post(
          `/api/hr/tasks/${editingTask.id}/assign`,
          {
            assigned_to: assignment.assigned_to,
            notes: assignment.notes,
          },
          { headers }
        );
      }

      setShowCreateModal(false);
      setEditingTask(null);
      setTaskForm({
        title: "",
        description: "",
        priority: "Medium",
        due_date: "",
        status: "Pending",
      });
      setTaskAssignments([]);
      setEditingAssignments([]);
      fetchTasks();
    } catch (error) {
      console.error("Error updating task:", error);
      alert("Error updating task");
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      try {
        await axios.delete(`/api/hr/tasks/${taskId}`, { headers });
        fetchTasks();
      } catch (error) {
        console.error("Error deleting task:", error);
        alert("Error deleting task");
      }
    }
  };

  const handleAssignTask = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `/api/hr/tasks/${selectedTask.id}/assign`,
        {
          assigned_to: selectedDevelopers[0],
          notes: assignmentNotes,
        },
        { headers }
      );
      setShowAssignmentModal(false);
      setSelectedTask(null);
      setSelectedDevelopers([]);
      setAssignmentNotes("");
      fetchTasks();
    } catch (error) {
      console.error("Error assigning task:", error);
      alert("Error assigning task");
    }
  };

  const handleBulkAssign = async (e) => {
    e.preventDefault();
    try {
      if (bulkAssignmentType === "tasks-to-developers") {
        await axios.post(
          "/api/hr/tasks/bulk-assign",
          {
            task_ids: selectedTasks,
            developer_ids: selectedDevelopers,
            notes: assignmentNotes,
          },
          { headers }
        );
      } else {
        await axios.post(
          `/api/hr/tasks/${selectedTaskForBulk.id}/bulk-assign-developers`,
          {
            developer_ids: selectedDevelopers,
            notes: assignmentNotes,
          },
          { headers }
        );
      }
      setShowBulkModal(false);
      setSelectedTasks([]);
      setSelectedDevelopers([]);
      setSelectedTaskForBulk(null);
      setAssignmentNotes("");
      fetchTasks();
    } catch (error) {
      console.error("Error bulk assigning:", error);
      alert("Error bulk assigning");
    }
  };

  const openEditModal = async (task) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      due_date: task.due_date || "",
      status: task.status,
    });

    // Fetch current assignments for this task
    try {
      const response = await axios.get(`/api/hr/tasks/${task.id}/assignments`, {
        headers,
      });
      setTaskAssignments(response.data.assignments || []);
      setEditingAssignments(response.data.assignments || []);
    } catch (error) {
      console.error("Error fetching task assignments:", error);
      setTaskAssignments([]);
      setEditingAssignments([]);
    }

    setShowCreateModal(true);
  };

  const openAssignmentModal = (task) => {
    setSelectedTask(task);
    setShowAssignmentModal(true);
  };

  const openBulkModal = () => {
    setShowBulkModal(true);
  };

  const addDeveloperToEdit = (developerId) => {
    const developer = developers.find((d) => d.id == developerId);
    if (
      developer &&
      !editingAssignments.find((a) => a.assigned_to == developerId)
    ) {
      const newAssignment = {
        id: `temp-${Date.now()}`,
        task_id: editingTask.id,
        assigned_to: developerId,
        assigned_to_name: developer.name || developer.username,
        assigned_by: editingTask.created_by,
        assigned_by_name: editingTask.created_by_name,
        assigned_at: new Date().toISOString(),
        status: "Assigned",
        notes: "",
      };
      setEditingAssignments([...editingAssignments, newAssignment]);
    }
  };

  const removeDeveloperFromEdit = (assignmentId) => {
    setEditingAssignments(
      editingAssignments.filter((a) => a.id !== assignmentId)
    );
  };

  const filteredTasks = tasks.filter((task) => {
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
    return <div className="loading">Loading tasks...</div>;
  }

  return (
    <div className="task-management-container">
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

      <div className="task-management-content">
        <div className="header-section">
          <h1>Task Management</h1>
          <div className="header-actions">
            <button
              className="btn btn-primary"
              onClick={() => setShowCreateModal(true)}
            >
              Create Task
            </button>
            <button className="btn btn-secondary" onClick={openBulkModal}>
              Bulk Assignment
            </button>
          </div>
        </div>

        <div className="filters-section">
          <input
            type="text"
            placeholder="Search tasks..."
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
          <table className="tasks-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Due Date</th>
                <th>Assigned To</th>
                <th>Created By</th>
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
                  <td>{task.due_date || "-"}</td>
                  <td>
                    {task.assigned_developers
                      ? task.assigned_developers
                          .split(",")
                          .map((dev, index) => (
                            <span key={index} className="developer-tag">
                              {dev}
                            </span>
                          ))
                      : "Unassigned"}
                  </td>
                  <td>{task.created_by_name}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn btn-small btn-primary"
                        onClick={() => openEditModal(task)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-small btn-secondary"
                        onClick={() => openAssignmentModal(task)}
                      >
                        Assign
                      </button>
                      <button
                        className="btn btn-small btn-danger"
                        onClick={() => handleDeleteTask(task.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Task Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{editingTask ? "Edit Task" : "Create New Task"}</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingTask(null);
                  setTaskForm({
                    title: "",
                    description: "",
                    priority: "Medium",
                    due_date: "",
                    status: "Pending",
                  });
                }}
              >
                ×
              </button>
            </div>
            <form onSubmit={editingTask ? handleUpdateTask : handleCreateTask}>
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={taskForm.title}
                  onChange={(e) =>
                    setTaskForm({ ...taskForm, title: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={taskForm.description}
                  onChange={(e) =>
                    setTaskForm({ ...taskForm, description: e.target.value })
                  }
                  rows="3"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Priority</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) =>
                      setTaskForm({ ...taskForm, priority: e.target.value })
                    }
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={taskForm.status}
                    onChange={(e) =>
                      setTaskForm({ ...taskForm, status: e.target.value })
                    }
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Due Date</label>
                <input
                  type="date"
                  value={taskForm.due_date}
                  onChange={(e) =>
                    setTaskForm({ ...taskForm, due_date: e.target.value })
                  }
                />
              </div>

              {/* Developer Management Section - Only show when editing */}
              {editingTask && (
                <div className="form-group">
                  <label>Assigned Developers</label>
                  <div className="developer-management-section">
                    {/* Current Assignments */}
                    <div className="current-assignments">
                      <h4>Current Assignments:</h4>
                      {editingAssignments.length === 0 ? (
                        <p style={{ color: "#666", fontStyle: "italic" }}>
                          No developers assigned
                        </p>
                      ) : (
                        <div className="assignment-list">
                          {editingAssignments.map((assignment) => (
                            <div
                              key={assignment.id}
                              className="assignment-item"
                            >
                              <span className="developer-name">
                                {assignment.assigned_to_name}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  removeDeveloperFromEdit(assignment.id)
                                }
                                className="remove-developer-btn"
                                title="Remove developer"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Add New Developer */}
                    <div className="add-developer-section">
                      <h4>Add Developer:</h4>
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            addDeveloperToEdit(e.target.value);
                            e.target.value = "";
                          }
                        }}
                        defaultValue=""
                      >
                        <option value="">Select a developer...</option>
                        {developers
                          .filter(
                            (dev) =>
                              !editingAssignments.find(
                                (a) => a.assigned_to == dev.id
                              )
                          )
                          .map((dev) => (
                            <option key={dev.id} value={dev.id}>
                              {dev.name || dev.username} ({dev.department})
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingTask(null);
                    setTaskForm({
                      title: "",
                      description: "",
                      priority: "Medium",
                      due_date: "",
                      status: "Pending",
                    });
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingTask ? "Update Task" : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      {showAssignmentModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Assign Task: {selectedTask?.title}</h2>
              <button
                onClick={() => {
                  setShowAssignmentModal(false);
                  setSelectedTask(null);
                  setSelectedDevelopers([]);
                  setAssignmentNotes("");
                }}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAssignTask}>
              <div className="form-group">
                <label>Select Developer *</label>
                <select
                  value={selectedDevelopers[0] || ""}
                  onChange={(e) => setSelectedDevelopers([e.target.value])}
                  required
                >
                  <option value="">Choose a developer...</option>
                  {developers.map((dev) => (
                    <option key={dev.id} value={dev.id}>
                      {dev.name || dev.username} ({dev.department})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={assignmentNotes}
                  onChange={(e) => setAssignmentNotes(e.target.value)}
                  rows="3"
                  placeholder="Optional notes for the assignment..."
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowAssignmentModal(false);
                    setSelectedTask(null);
                    setSelectedDevelopers([]);
                    setAssignmentNotes("");
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Assign Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Assignment Modal */}
      {showBulkModal && (
        <div className="modal-overlay">
          <div className="modal modal-large">
            <div className="modal-header">
              <h2>Bulk Assignment</h2>
              <button
                onClick={() => {
                  setShowBulkModal(false);
                  setSelectedTasks([]);
                  setSelectedDevelopers([]);
                  setSelectedTaskForBulk(null);
                  setAssignmentNotes("");
                  setBulkTaskSearch("");
                  setBulkDeveloperSearch("");
                }}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleBulkAssign}>
              <div className="form-group">
                <label>Assignment Type</label>
                <select
                  value={bulkAssignmentType}
                  onChange={(e) => setBulkAssignmentType(e.target.value)}
                >
                  <option value="tasks-to-developers">
                    Assign Multiple Tasks to Developers
                  </option>
                  <option value="developers-to-task">
                    Assign Multiple Developers to a Task
                  </option>
                </select>
              </div>

              {bulkAssignmentType === "tasks-to-developers" ? (
                <div className="form-group">
                  <label>Select Tasks *</label>
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    value={bulkTaskSearch}
                    onChange={(e) => setBulkTaskSearch(e.target.value)}
                    className="search-input"
                    style={{ marginBottom: 8 }}
                  />
                  <div className="checkbox-list">
                    {tasks
                      .filter(
                        (task) =>
                          task.title
                            .toLowerCase()
                            .includes(bulkTaskSearch.toLowerCase()) ||
                          (task.description &&
                            task.description
                              .toLowerCase()
                              .includes(bulkTaskSearch.toLowerCase()))
                      )
                      .map((task) => (
                        <label key={task.id} className="checkbox-item">
                          <input
                            type="checkbox"
                            checked={selectedTasks.includes(task.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedTasks([...selectedTasks, task.id]);
                              } else {
                                setSelectedTasks(
                                  selectedTasks.filter((id) => id !== task.id)
                                );
                              }
                            }}
                          />
                          <span>{task.title}</span>
                        </label>
                      ))}
                  </div>
                </div>
              ) : (
                <div className="form-group">
                  <label>Select Task *</label>
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    value={bulkTaskSearch}
                    onChange={(e) => setBulkTaskSearch(e.target.value)}
                    className="search-input"
                    style={{ marginBottom: 8 }}
                  />
                  <select
                    value={selectedTaskForBulk?.id || ""}
                    onChange={(e) => {
                      const task = tasks.find((t) => t.id == e.target.value);
                      setSelectedTaskForBulk(task);
                    }}
                    required
                  >
                    <option value="">Choose a task...</option>
                    {tasks
                      .filter(
                        (task) =>
                          task.title
                            .toLowerCase()
                            .includes(bulkTaskSearch.toLowerCase()) ||
                          (task.description &&
                            task.description
                              .toLowerCase()
                              .includes(bulkTaskSearch.toLowerCase()))
                      )
                      .map((task) => (
                        <option key={task.id} value={task.id}>
                          {task.title}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label>Select Developers *</label>
                <input
                  type="text"
                  placeholder="Search developers..."
                  value={bulkDeveloperSearch}
                  onChange={(e) => setBulkDeveloperSearch(e.target.value)}
                  className="search-input"
                  style={{ marginBottom: 8 }}
                />
                <div className="checkbox-list">
                  {developers
                    .filter(
                      (dev) =>
                        (dev.name &&
                          dev.name
                            .toLowerCase()
                            .includes(bulkDeveloperSearch.toLowerCase())) ||
                        (dev.username &&
                          dev.username
                            .toLowerCase()
                            .includes(bulkDeveloperSearch.toLowerCase())) ||
                        (dev.department &&
                          dev.department
                            .toLowerCase()
                            .includes(bulkDeveloperSearch.toLowerCase()))
                    )
                    .map((dev) => (
                      <label key={dev.id} className="checkbox-item">
                        <input
                          type="checkbox"
                          checked={selectedDevelopers.includes(dev.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDevelopers([
                                ...selectedDevelopers,
                                dev.id,
                              ]);
                            } else {
                              setSelectedDevelopers(
                                selectedDevelopers.filter((id) => id !== dev.id)
                              );
                            }
                          }}
                        />
                        <span>
                          {dev.name || dev.username} ({dev.department})
                        </span>
                      </label>
                    ))}
                </div>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={assignmentNotes}
                  onChange={(e) => setAssignmentNotes(e.target.value)}
                  rows="3"
                  placeholder="Optional notes for the assignments..."
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowBulkModal(false);
                    setSelectedTasks([]);
                    setSelectedDevelopers([]);
                    setSelectedTaskForBulk(null);
                    setAssignmentNotes("");
                    setBulkTaskSearch("");
                    setBulkDeveloperSearch("");
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={
                    (bulkAssignmentType === "tasks-to-developers" &&
                      selectedTasks.length === 0) ||
                    (bulkAssignmentType === "developers-to-task" &&
                      !selectedTaskForBulk) ||
                    selectedDevelopers.length === 0
                  }
                >
                  {bulkAssignmentType === "tasks-to-developers"
                    ? `Assign ${selectedTasks.length} Tasks to ${selectedDevelopers.length} Developers`
                    : `Assign ${selectedDevelopers.length} Developers to Task`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskManagement;
