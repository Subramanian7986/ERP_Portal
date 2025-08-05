const express = require("express");
const router = express.Router();

// Middleware to restrict access to HR role only
function requireHR(req, res, next) {
  // Assume JWT is sent in Authorization header as 'Bearer <token>'
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ error: "No token provided." });
  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Invalid token." });
  try {
    const jwt = require("jsonwebtoken");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "HR")
      return res.status(403).json({ error: "Access denied. HR only." });
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token." });
  }
}

// All routes below require HR role
router.use(requireHR);

// Leave Requests
router.get("/leave-requests", async (req, res) => {
  // TODO: Implement fetching all leave requests
  res.json({ message: "Leave requests endpoint (HR only)" });
});

// Payroll Overview
router.get("/payroll", async (req, res) => {
  // TODO: Implement payroll overview
  res.json({ message: "Payroll overview endpoint (HR only)" });
});

// Attendance Tracking
router.get("/attendance-tracking", async (req, res) => {
  // TODO: Implement attendance analytics
  res.json({ message: "Attendance tracking endpoint (HR only)" });
});

// Shift Management
router.get("/shifts", async (req, res) => {
  // TODO: Implement shift management
  res.json({ message: "Shift management endpoint (HR only)" });
});

module.exports = (db) => {
  const router = express.Router();

  // Apply HR middleware to all routes
  router.use(requireHR);

  // Attendance Percentage for a user (HR only)
  router.get("/attendance/percentage/:userId", async (req, res) => {
    const userId = req.params.userId;
    try {
      const [[result]] = await db.query(
        `
        SELECT IFNULL(ROUND(100 * COUNT(*) / NULLIF((SELECT COUNT(*) FROM company_calendar c2 WHERE c2.is_working_day = 1 AND YEAR(c2.date) = YEAR(CURDATE()) AND c2.date <= CURDATE()), 0)), 0) AS attendance_percentage
        FROM attendance att
        JOIN company_calendar c ON att.date = c.date
        WHERE att.user_id = ? AND att.status = 'Present' AND c.is_working_day = 1 AND YEAR(att.date) = YEAR(CURDATE())
      `,
        [userId]
      );
      res.json({ attendance_percentage: result.attendance_percentage });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error." });
    }
  });

  // Attendance Overtime Count for a user (HR only)
  router.get("/attendance/overtime-count/:userId", async (req, res) => {
    const userId = req.params.userId;
    try {
      const [[result]] = await db.query(
        `
        SELECT COUNT(*) AS overtime_count
        FROM attendance att
        WHERE att.user_id = ? AND att.attendance_type = 'Overtime' AND YEAR(att.date) = YEAR(CURDATE())
      `,
        [userId]
      );
      res.json({ overtime_count: result.overtime_count });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error." });
    }
  });

  // Get all shifts
  router.get("/shifts/all", async (req, res) => {
    try {
      const [shifts] = await db.query("SELECT * FROM shifts");
      res.json({ shifts });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error." });
    }
  });

  // Get all users (except Admins) and their assigned shift for a date
  router.get("/shifts/assignments", async (req, res) => {
    const date = req.query.date;
    if (!date) return res.status(400).json({ error: "Date is required." });
    try {
      const [users] = await db.query(
        `
        SELECT u.id, u.username, u.name, u.role, u.department, us.shift_id, s.name AS shift_name
        FROM users u
        LEFT JOIN user_shifts us ON u.id = us.user_id AND us.date = ?
        LEFT JOIN shifts s ON us.shift_id = s.id
        WHERE u.role <> 'Admin'
        ORDER BY u.username
      `,
        [date]
      );
      res.json({ users });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error." });
    }
  });

  // Assign or update a user's shift for a date
  router.post("/shifts/assign", async (req, res) => {
    const { user_id, shift_id, date } = req.body;
    if (!user_id || !shift_id || !date)
      return res
        .status(400)
        .json({ error: "user_id, shift_id, and date are required." });
    try {
      await db.query(
        `INSERT INTO user_shifts (user_id, shift_id, date) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE shift_id = VALUES(shift_id)`,
        [user_id, shift_id, date]
      );
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error." });
    }
  });

  // ===== TASK MANAGEMENT ENDPOINTS =====

  // Get all tasks with assignments
  router.get("/tasks", async (req, res) => {
    try {
      const [tasks] = await db.query(`
        SELECT 
          t.*,
          c.username as created_by_name,
          COUNT(ta.id) as assignment_count,
          GROUP_CONCAT(DISTINCT u.username) as assigned_developers
        FROM tasks t
        LEFT JOIN users c ON t.created_by = c.id
        LEFT JOIN task_assignments ta ON t.id = ta.task_id
        LEFT JOIN users u ON ta.assigned_to = u.id
        GROUP BY t.id
        ORDER BY t.created_at DESC
      `);
      res.json({ tasks });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error." });
    }
  });

  // Get a specific task with its assignments
  router.get("/tasks/:taskId", async (req, res) => {
    const taskId = req.params.taskId;
    try {
      const [[task]] = await db.query(
        `
        SELECT 
          t.*,
          c.username as created_by_name
        FROM tasks t
        LEFT JOIN users c ON t.created_by = c.id
        WHERE t.id = ?
      `,
        [taskId]
      );

      if (!task) {
        return res.status(404).json({ error: "Task not found." });
      }

      const [assignments] = await db.query(
        `
        SELECT 
          ta.*,
          u.username as assigned_to_name,
          a.username as assigned_by_name
        FROM task_assignments ta
        LEFT JOIN users u ON ta.assigned_to = u.id
        LEFT JOIN users a ON ta.assigned_by = a.id
        WHERE ta.task_id = ?
        ORDER BY ta.assigned_at DESC
      `,
        [taskId]
      );

      res.json({ task, assignments });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error." });
    }
  });

  // Create a new task
  router.post("/tasks", async (req, res) => {
    const { title, description, priority, due_date } = req.body;
    if (!title) {
      return res.status(400).json({ error: "Title is required." });
    }

    try {
      const [result] = await db.query(
        `INSERT INTO tasks (title, description, priority, due_date, created_by) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          title,
          description || null,
          priority || "Medium",
          due_date || null,
          req.user.userId || req.user.id,
        ]
      );

      res.json({
        success: true,
        task_id: result.insertId,
        message: "Task created successfully.",
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error." });
    }
  });

  // Update a task
  router.put("/tasks/:taskId", async (req, res) => {
    const taskId = req.params.taskId;
    const { title, description, priority, status, due_date } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Title is required." });
    }

    try {
      await db.query(
        `UPDATE tasks 
         SET title = ?, description = ?, priority = ?, status = ?, due_date = ?
         WHERE id = ?`,
        [
          title,
          description || null,
          priority || "Medium",
          status || "Pending",
          due_date || null,
          taskId,
        ]
      );

      res.json({ success: true, message: "Task updated successfully." });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error." });
    }
  });

  // Delete a task
  router.delete("/tasks/:taskId", async (req, res) => {
    const taskId = req.params.taskId;

    try {
      await db.query("DELETE FROM tasks WHERE id = ?", [taskId]);
      res.json({ success: true, message: "Task deleted successfully." });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error." });
    }
  });

  // Get all developers (users with role 'Developer')
  router.get("/developers", async (req, res) => {
    try {
      const [developers] = await db.query(
        "SELECT id, username, name, email, department FROM users WHERE role = 'Developer' ORDER BY username"
      );
      res.json({ developers });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error." });
    }
  });

  // Assign a task to a developer
  router.post("/tasks/:taskId/assign", async (req, res) => {
    const taskId = req.params.taskId;
    const { assigned_to, notes } = req.body;

    if (!assigned_to) {
      return res.status(400).json({ error: "assigned_to is required." });
    }

    try {
      await db.query(
        `INSERT INTO task_assignments (task_id, assigned_to, assigned_by, notes) 
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE notes = VALUES(notes)`,
        [taskId, assigned_to, req.user.userId || req.user.id, notes || null]
      );

      res.json({ success: true, message: "Task assigned successfully." });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error." });
    }
  });

  // Bulk assign tasks to developers
  router.post("/tasks/bulk-assign", async (req, res) => {
    const { task_ids, developer_ids, notes } = req.body;

    if (!task_ids || !Array.isArray(task_ids) || task_ids.length === 0) {
      return res.status(400).json({ error: "task_ids array is required." });
    }

    if (
      !developer_ids ||
      !Array.isArray(developer_ids) ||
      developer_ids.length === 0
    ) {
      return res
        .status(400)
        .json({ error: "developer_ids array is required." });
    }

    try {
      const assignments = [];
      for (const taskId of task_ids) {
        for (const developerId of developer_ids) {
          assignments.push([
            taskId,
            developerId,
            req.user.userId || req.user.id,
            notes || null,
          ]);
        }
      }

      if (assignments.length > 0) {
        const values = assignments.map(() => "(?, ?, ?, ?)").join(", ");
        await db.query(
          `INSERT INTO task_assignments (task_id, assigned_to, assigned_by, notes) 
           VALUES ${values}
           ON DUPLICATE KEY UPDATE notes = VALUES(notes)`,
          assignments.flat()
        );
      }

      res.json({
        success: true,
        message: `Bulk assignment completed. ${assignments.length} assignments created.`,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error." });
    }
  });

  // Bulk assign developers to a task
  router.post("/tasks/:taskId/bulk-assign-developers", async (req, res) => {
    const taskId = req.params.taskId;
    const { developer_ids, notes } = req.body;

    if (
      !developer_ids ||
      !Array.isArray(developer_ids) ||
      developer_ids.length === 0
    ) {
      return res
        .status(400)
        .json({ error: "developer_ids array is required." });
    }

    try {
      const assignments = developer_ids.map((developerId) => [
        taskId,
        developerId,
        req.user.userId || req.user.id,
        notes || null,
      ]);

      const values = assignments.map(() => "(?, ?, ?, ?)").join(", ");
      await db.query(
        `INSERT INTO task_assignments (task_id, assigned_to, assigned_by, notes) 
         VALUES ${values}
         ON DUPLICATE KEY UPDATE notes = VALUES(notes)`,
        assignments.flat()
      );

      res.json({
        success: true,
        message: `Task assigned to ${assignments.length} developers.`,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error." });
    }
  });

  // Remove task assignment
  router.delete(
    "/tasks/:taskId/assignments/:assignmentId",
    async (req, res) => {
      const { taskId, assignmentId } = req.params;

      try {
        await db.query(
          "DELETE FROM task_assignments WHERE id = ? AND task_id = ?",
          [assignmentId, taskId]
        );
        res.json({
          success: true,
          message: "Assignment removed successfully.",
        });
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error." });
      }
    }
  );

  // Get task assignments for a specific task
  router.get("/tasks/:taskId/assignments", async (req, res) => {
    const taskId = req.params.taskId;

    try {
      const [assignments] = await db.query(
        `
        SELECT 
          ta.*,
          u.username as assigned_to_name,
          u.name as assigned_to_full_name,
          a.username as assigned_by_name
        FROM task_assignments ta
        LEFT JOIN users u ON ta.assigned_to = u.id
        LEFT JOIN users a ON ta.assigned_by = a.id
        WHERE ta.task_id = ?
        ORDER BY ta.assigned_at DESC
      `,
        [taskId]
      );

      res.json({ assignments });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error." });
    }
  });

  // Leave Management Endpoints for HR Dashboard

  // Get all leave requests for HR dashboard
  router.get("/leave-requests", async (req, res) => {
    try {
      const [requests] = await db.query(
        `SELECT lr.*, u.username, u.name, u.department, 
                approver.username as approved_by_name 
         FROM leave_requests lr 
         JOIN users u ON lr.user_id = u.id 
         LEFT JOIN users approver ON lr.approved_by = approver.id 
         ORDER BY lr.created_at DESC`
      );

      res.json({ requests });
    } catch (error) {
      console.error("Error fetching leave requests:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get pending leave requests count for HR dashboard widget
  router.get("/leave-requests/pending-count", async (req, res) => {
    try {
      const [result] = await db.query(
        `SELECT COUNT(*) as count FROM leave_requests WHERE status = 'Pending'`
      );
      res.json({ pendingCount: result[0].count });
    } catch (error) {
      console.error("Error fetching pending leave count:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
};
