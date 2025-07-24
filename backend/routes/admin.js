const express = require("express");

module.exports = (db) => {
  const router = express.Router();

  // GET /api/admin/user-stats
  router.get("/user-stats", async (req, res) => {
    try {
      const [rows] = await db.query(
        "SELECT role, COUNT(*) as count FROM users GROUP BY role"
      );
      res.json({ stats: rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error." });
    }
  });

  // GET /api/admin/recent-logins
  router.get("/recent-logins", async (req, res) => {
    try {
      const [rows] = await db.query(
        `SELECT u.username, u.email, u.role, l.timestamp, l.ip_address
         FROM login_attempts l
         JOIN users u ON l.user_id = u.id
         WHERE l.success = 1
         ORDER BY l.timestamp DESC
         LIMIT 10`
      );
      res.json({ logins: rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error." });
    }
  });

  // GET /api/admin/pending-approvals
  router.get("/pending-approvals", async (req, res) => {
    try {
      const [[leave]] = await db.query(
        "SELECT COUNT(*) as count FROM leave_requests WHERE status = 'pending'"
      );
      const [[expense]] = await db.query(
        "SELECT COUNT(*) as count FROM expense_claims WHERE status = 'pending'"
      );
      const [[po]] = await db.query(
        "SELECT COUNT(*) as count FROM purchase_orders WHERE status = 'pending'"
      );
      res.json({
        leaveRequests: leave.count,
        expenseClaims: expense.count,
        purchaseOrders: po.count,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error." });
    }
  });

  // GET /api/admin/module-usage
  router.get("/module-usage", async (req, res) => {
    try {
      const [rows] = await db.query(
        "SELECT module_name, COUNT(*) as count FROM module_usage GROUP BY module_name"
      );
      res.json({ usage: rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error." });
    }
  });

  // GET /api/admin/system-health
  router.get("/system-health", (req, res) => {
    const uptime = process.uptime();
    const memory = process.memoryUsage();
    const nodeVersion = process.version;
    res.json({
      uptime,
      memory: {
        rss: memory.rss,
        heapTotal: memory.heapTotal,
        heapUsed: memory.heapUsed,
        external: memory.external,
      },
      nodeVersion,
    });
  });

  // GET /api/admin/notifications
  router.get("/notifications", async (req, res) => {
    try {
      // Fetch the 10 most recent global or admin role notifications
      const [rows] = await db.query(
        "SELECT id, title, message, type, is_read, created_at FROM notifications WHERE user_id IS NULL ORDER BY created_at DESC LIMIT 10"
      );
      res.json({ notifications: rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error." });
    }
  });

  // Mark notification as read
  router.post("/notifications/:id/read", async (req, res) => {
    try {
      await db.query("UPDATE notifications SET is_read = 1 WHERE id = ?", [
        req.params.id,
      ]);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error." });
    }
  });

  // GET /api/admin/users
  router.get("/users", async (req, res) => {
    try {
      const [rows] = await db.query(
        "SELECT id, username, email, role, is_active, created_at FROM users ORDER BY created_at DESC"
      );
      res.json({ users: rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error." });
    }
  });

  // POST /api/admin/users (Add user)
  router.post("/users", async (req, res) => {
    const { username, email, role, is_active, password } = req.body;
    if (!username || !email || !role || !password) {
      return res.status(400).json({ error: "All fields are required." });
    }
    try {
      const bcrypt = require("bcryptjs");
      const hash = await bcrypt.hash(password, 10);
      await db.query(
        "INSERT INTO users (username, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?)",
        [username, email, hash, role, is_active !== false]
      );
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error." });
    }
  });

  // PUT /api/admin/users/:id (Edit user)
  router.put("/users/:id", async (req, res) => {
    const { username, email, role, is_active } = req.body;
    try {
      await db.query(
        "UPDATE users SET username = ?, email = ?, role = ?, is_active = ? WHERE id = ?",
        [username, email, role, is_active !== false, req.params.id]
      );
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error." });
    }
  });

  // PATCH /api/admin/users/:id/deactivate (Toggle active)
  router.patch("/users/:id/deactivate", async (req, res) => {
    try {
      const [[user]] = await db.query(
        "SELECT is_active FROM users WHERE id = ?",
        [req.params.id]
      );
      if (!user) return res.status(404).json({ error: "User not found." });
      await db.query("UPDATE users SET is_active = ? WHERE id = ?", [
        !user.is_active,
        req.params.id,
      ]);
      res.json({ success: true, is_active: !user.is_active });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error." });
    }
  });

  // DELETE /api/admin/users/:id (Delete user)
  router.delete("/users/:id", async (req, res) => {
    try {
      await db.query("DELETE FROM users WHERE id = ?", [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error." });
    }
  });

  // POST /api/admin/users/:id/reset-password (Reset password to default)
  router.post("/users/:id/reset-password", async (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword)
      return res.status(400).json({ error: "New password required." });
    try {
      const bcrypt = require("bcryptjs");
      const hash = await bcrypt.hash(newPassword, 10);
      await db.query("UPDATE users SET password_hash = ? WHERE id = ?", [
        hash,
        req.params.id,
      ]);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error." });
    }
  });

  // GET /api/admin/roles - List all roles
  router.get("/roles", async (req, res) => {
    // If roles are ENUM in users table, fetch from INFORMATION_SCHEMA
    try {
      const [rows] = await db.query(
        `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'role' AND TABLE_SCHEMA = DATABASE()`
      );
      if (!rows.length) return res.json({ roles: [] });
      const enumStr = rows[0].COLUMN_TYPE;
      const roles = enumStr
        .replace(/^enum\((.*)\)$/i, "$1")
        .split(",")
        .map((v) => v.trim().replace(/^'(.*)'$/, "$1"));
      res.json({ roles });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error." });
    }
  });

  // GET /api/admin/permissions - List all permissions
  router.get("/permissions", async (req, res) => {
    try {
      const [rows] = await db.query("SELECT * FROM permissions");
      res.json({ permissions: rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error." });
    }
  });

  // GET /api/admin/roles/:role/permissions - Get permissions for a role
  router.get("/roles/:role/permissions", async (req, res) => {
    try {
      const [rows] = await db.query(
        `SELECT p.* FROM permissions p
         JOIN role_permissions rp ON rp.permission_id = p.id
         WHERE rp.role = ?`,
        [req.params.role]
      );
      res.json({ permissions: rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error." });
    }
  });

  // POST /api/admin/roles/:role/permissions - Assign permissions to a role (replace all)
  router.post("/roles/:role/permissions", async (req, res) => {
    const { permissionIds } = req.body; // Array of permission IDs
    if (!Array.isArray(permissionIds)) {
      return res.status(400).json({ error: "permissionIds must be an array" });
    }
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query("DELETE FROM role_permissions WHERE role = ?", [
        req.params.role,
      ]);
      if (permissionIds.length > 0) {
        const values = permissionIds.map((pid) => [req.params.role, pid]);
        await conn.query(
          "INSERT INTO role_permissions (role, permission_id) VALUES ?",
          [values]
        );
      }
      await conn.commit();
      res.json({ success: true });
    } catch (err) {
      await conn.rollback();
      console.error(err);
      res.status(500).json({ error: "Server error." });
    } finally {
      conn.release();
    }
  });

  // POST /api/admin/announcements - Create an announcement
  router.post("/announcements", async (req, res) => {
    const { title, message, target_role, created_by } = req.body;
    if (!title || !message || !created_by) {
      return res
        .status(400)
        .json({ error: "Title, message, and created_by are required." });
    }
    try {
      await db.query(
        "INSERT INTO announcements (title, message, created_by, target_role) VALUES (?, ?, ?, ?)",
        [title, message, created_by, target_role || null]
      );
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error." });
    }
  });

  // GET /api/admin/announcements - List announcements (optionally filter by role)
  router.get("/announcements", async (req, res) => {
    const { role } = req.query;
    try {
      let query =
        "SELECT a.*, u.username as creator FROM announcements a JOIN users u ON a.created_by = u.id";
      let params = [];
      if (role) {
        query +=
          " WHERE a.target_role IS NULL OR a.target_role = ? ORDER BY a.created_at DESC";
        params.push(role);
      } else {
        query += " ORDER BY a.created_at DESC";
      }
      const [rows] = await db.query(query, params);
      res.json({ announcements: rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error." });
    }
  });

  // DELETE /api/admin/announcements/:id - Delete an announcement
  router.delete("/announcements/:id", async (req, res) => {
    try {
      await db.query("DELETE FROM announcements WHERE id = ?", [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error." });
    }
  });

  // POST /api/announcements/:id/read - Mark announcement as read for a user
  router.post("/announcements/:id/read", async (req, res) => {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: "user_id required" });
    try {
      await db.query(
        "INSERT IGNORE INTO announcement_reads (announcement_id, user_id) VALUES (?, ?)",
        [req.params.id, user_id]
      );
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error." });
    }
  });

  // GET /api/announcements/reads?user_id= - Get IDs of announcements read by user
  router.get("/announcements/reads", async (req, res) => {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: "user_id required" });
    try {
      const [rows] = await db.query(
        "SELECT announcement_id FROM announcement_reads WHERE user_id = ?",
        [user_id]
      );
      res.json({ readIds: rows.map((r) => r.announcement_id) });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error." });
    }
  });

  // POST /api/messages - Send a message
  router.post("/messages", async (req, res) => {
    const { sender_id, receiver_id, content } = req.body;
    if (!sender_id || !receiver_id || !content) {
      return res
        .status(400)
        .json({ error: "sender_id, receiver_id, and content are required." });
    }
    try {
      await db.query(
        "INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)",
        [sender_id, receiver_id, content]
      );
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error." });
    }
  });

  // GET /api/messages?user1=ID1&user2=ID2 - Get conversation between two users
  router.get("/messages", async (req, res) => {
    const { user1, user2 } = req.query;
    if (!user1 || !user2) {
      return res.status(400).json({ error: "user1 and user2 are required." });
    }
    try {
      const [rows] = await db.query(
        `SELECT * FROM messages WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?) ORDER BY sent_at ASC`,
        [user1, user2, user2, user1]
      );
      res.json({ messages: rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error." });
    }
  });

  // POST /api/messages/:id/read - Mark a message as read
  router.post("/messages/:id/read", async (req, res) => {
    try {
      await db.query("UPDATE messages SET is_read = 1 WHERE id = ?", [
        req.params.id,
      ]);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error." });
    }
  });

  return router;
};
