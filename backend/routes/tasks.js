const express = require("express");
const router = express.Router();

// Middleware to verify JWT token
function requireAuth(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ error: "No token provided." });
  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Invalid token." });
  try {
    const jwt = require("jsonwebtoken");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token." });
  }
}

module.exports = (db) => {
  const router = express.Router();

  // Apply auth middleware to all routes
  router.use(requireAuth);

  // Get tasks assigned to the current user
  router.get("/my-tasks", async (req, res) => {
    try {
      const userId = req.user.userId || req.user.id;

      const [tasks] = await db.query(
        `
        SELECT 
          t.*,
          c.username as created_by_name,
          ta.assigned_at,
          ta.notes,
          ta.status as assignment_status
        FROM tasks t
        JOIN task_assignments ta ON t.id = ta.task_id
        LEFT JOIN users c ON t.created_by = c.id
        WHERE ta.assigned_to = ?
        ORDER BY t.due_date ASC, t.created_at DESC
      `,
        [userId]
      );

      res.json({ tasks });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error." });
    }
  });

  // Update task status (only for assigned users)
  router.put("/:taskId/status", async (req, res) => {
    const taskId = req.params.taskId;
    const { status } = req.body;
    const userId = req.user.userId || req.user.id;

    if (!status) {
      return res.status(400).json({ error: "Status is required." });
    }

    try {
      // Check if user is assigned to this task
      const [assignments] = await db.query(
        "SELECT id FROM task_assignments WHERE task_id = ? AND assigned_to = ?",
        [taskId, userId]
      );

      if (assignments.length === 0) {
        return res
          .status(403)
          .json({ error: "You are not assigned to this task." });
      }

      // Update task status
      await db.query("UPDATE tasks SET status = ? WHERE id = ?", [
        status,
        taskId,
      ]);

      res.json({ success: true, message: "Task status updated successfully." });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error." });
    }
  });

  // Get task details (only for assigned users)
  router.get("/:taskId", async (req, res) => {
    const taskId = req.params.taskId;
    const userId = req.user.userId || req.user.id;

    try {
      // Check if user is assigned to this task
      const [assignments] = await db.query(
        "SELECT id FROM task_assignments WHERE task_id = ? AND assigned_to = ?",
        [taskId, userId]
      );

      if (assignments.length === 0) {
        return res
          .status(403)
          .json({ error: "You are not assigned to this task." });
      }

      // Get task details
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

      // Get assignment details for this user
      const [[assignment]] = await db.query(
        `
        SELECT 
          ta.*,
          a.username as assigned_by_name
        FROM task_assignments ta
        LEFT JOIN users a ON ta.assigned_by = a.id
        WHERE ta.task_id = ? AND ta.assigned_to = ?
      `,
        [taskId, userId]
      );

      res.json({ task, assignment });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error." });
    }
  });

  return router;
};
