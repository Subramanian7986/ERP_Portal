const express = require("express");
const jwt = require("jsonwebtoken");

// Middleware to require authentication
const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "No token provided." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token." });
  }
};

// Middleware to require HR role
const requireHR = (req, res, next) => {
  if (req.user.role !== "HR") {
    return res.status(403).json({ error: "Access denied. HR role required." });
  }
  next();
};

module.exports = (db) => {
  const router = express.Router();

  // Get leave balance for the logged-in user
  router.get("/balance", requireAuth, async (req, res) => {
    try {
      const userId = req.user.userId || req.user.id;
      const currentYear = new Date().getFullYear();

      // Get or create leave balance for current year
      const [balanceRows] = await db.query(
        `SELECT * FROM leave_balances WHERE user_id = ? AND year = ?`,
        [userId, currentYear]
      );

      let leaveBalance;
      if (balanceRows.length === 0) {
        // Create new leave balance for the year
        await db.query(
          `INSERT INTO leave_balances (user_id, year, total_leave_days) VALUES (?, ?, 30)`,
          [userId, currentYear]
        );
        leaveBalance = {
          user_id: userId,
          year: currentYear,
          total_leave_days: 30,
          used_leave_days: 0,
          pending_leave_days: 0,
          available_leave_days: 30,
        };
      } else {
        leaveBalance = {
          ...balanceRows[0],
          available_leave_days:
            balanceRows[0].total_leave_days -
            balanceRows[0].used_leave_days -
            balanceRows[0].pending_leave_days,
        };
      }

      res.json({ leaveBalance });
    } catch (error) {
      console.error("Error fetching leave balance:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Apply for leave
  router.post("/apply", requireAuth, async (req, res) => {
    try {
      const userId = req.user.userId || req.user.id;
      const { leave_type, start_date, end_date, reason } = req.body;

      // Validate required fields
      if (!start_date || !end_date) {
        return res
          .status(400)
          .json({ error: "Start date and end date are required" });
      }

      // Calculate total days (excluding weekends)
      const start = new Date(start_date);
      const end = new Date(end_date);
      let totalDays = 0;
      let current = new Date(start);

      while (current <= end) {
        const dayOfWeek = current.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          // Exclude Sunday (0) and Saturday (6)
          totalDays++;
        }
        current.setDate(current.getDate() + 1);
      }

      if (totalDays === 0) {
        return res
          .status(400)
          .json({ error: "No working days in the selected date range" });
      }

      // Check leave balance
      const currentYear = new Date().getFullYear();
      const [balanceRows] = await db.query(
        `SELECT * FROM leave_balances WHERE user_id = ? AND year = ?`,
        [userId, currentYear]
      );

      if (balanceRows.length === 0) {
        return res.status(400).json({ error: "Leave balance not found" });
      }

      const balance = balanceRows[0];
      const availableDays =
        balance.total_leave_days -
        balance.used_leave_days -
        balance.pending_leave_days;

      if (totalDays > availableDays) {
        return res.status(400).json({
          error: `Insufficient leave balance. Available: ${availableDays} days, Requested: ${totalDays} days`,
        });
      }

      // Create leave request
      const [result] = await db.query(
        `INSERT INTO leave_requests (user_id, leave_type, start_date, end_date, total_days, reason) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          userId,
          leave_type || "Annual",
          start_date,
          end_date,
          totalDays,
          reason,
        ]
      );

      // Update pending leave days
      await db.query(
        `UPDATE leave_balances SET pending_leave_days = pending_leave_days + ? WHERE user_id = ? AND year = ?`,
        [totalDays, userId, currentYear]
      );

      res.json({
        message: "Leave request submitted successfully",
        requestId: result.insertId,
        totalDays,
      });
    } catch (error) {
      console.error("Error applying for leave:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get user's leave requests
  router.get("/my-requests", requireAuth, async (req, res) => {
    try {
      const userId = req.user.userId || req.user.id;

      const [requests] = await db.query(
        `SELECT lr.*, u.username as approved_by_name 
         FROM leave_requests lr 
         LEFT JOIN users u ON lr.approved_by = u.id 
         WHERE lr.user_id = ? 
         ORDER BY lr.created_at DESC`,
        [userId]
      );

      res.json({ requests });
    } catch (error) {
      console.error("Error fetching leave requests:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // HR: Get all pending leave requests
  router.get("/pending", requireAuth, requireHR, async (req, res) => {
    try {
      const [requests] = await db.query(
        `SELECT lr.*, u.username, u.name, u.department 
         FROM leave_requests lr 
         JOIN users u ON lr.user_id = u.id 
         WHERE lr.status = 'Pending' 
         ORDER BY lr.created_at ASC`
      );

      res.json({ requests });
    } catch (error) {
      console.error("Error fetching pending leave requests:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // HR: Get all leave requests (for HR dashboard)
  router.get("/all", requireAuth, requireHR, async (req, res) => {
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
      console.error("Error fetching all leave requests:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // HR: Approve/Reject leave request
  router.put("/:requestId/status", requireAuth, requireHR, async (req, res) => {
    try {
      const { requestId } = req.params;
      const { status, rejection_reason } = req.body;
      const hrUserId = req.user.userId || req.user.id;

      if (!["Approved", "Rejected"].includes(status)) {
        return res
          .status(400)
          .json({ error: "Invalid status. Must be 'Approved' or 'Rejected'" });
      }

      // Get the leave request
      const [requestRows] = await db.query(
        `SELECT * FROM leave_requests WHERE id = ?`,
        [requestId]
      );

      if (requestRows.length === 0) {
        return res.status(404).json({ error: "Leave request not found" });
      }

      const request = requestRows[0];

      // Make status check case-insensitive and trimmed
      if (
        !request.status ||
        request.status.trim().toLowerCase() !== "pending"
      ) {
        return res
          .status(400)
          .json({ error: "Leave request has already been processed" });
      }

      // Update leave request status
      await db.query(
        `UPDATE leave_requests SET 
         status = ?, 
         approved_by = ?, 
         approved_at = NOW(), 
         rejection_reason = ? 
         WHERE id = ?`,
        [status, hrUserId, rejection_reason || null, requestId]
      );

      // Update leave balance
      const currentYear = new Date().getFullYear();
      if (status === "Approved") {
        // Move from pending to used
        await db.query(
          `UPDATE leave_balances SET 
           pending_leave_days = pending_leave_days - ?, 
           used_leave_days = used_leave_days + ? 
           WHERE user_id = ? AND year = ?`,
          [request.total_days, request.total_days, request.user_id, currentYear]
        );
      } else {
        // Rejected: just remove from pending
        await db.query(
          `UPDATE leave_balances SET 
           pending_leave_days = pending_leave_days - ? 
           WHERE user_id = ? AND year = ?`,
          [request.total_days, request.user_id, currentYear]
        );
      }

      res.json({
        message: `Leave request ${status.toLowerCase()} successfully`,
      });
    } catch (error) {
      console.error("Error updating leave request status:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
};
