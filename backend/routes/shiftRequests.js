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
  if (!req.user.role || req.user.role.toLowerCase() !== "hr") {
    return res.status(403).json({ error: "Access denied. HR role required." });
  }
  next();
};

module.exports = function shiftRequestsRoutes(db) {
  const router = express.Router();

  // Get available shifts for a specific date (for dropdown selection)
  router.get("/shifts", requireAuth, async (req, res) => {
    try {
      const { date } = req.query;
      const userId = req.user.userId || req.user.id;

      if (!date) {
        // If no date provided, return all shifts
        const [shifts] = await db.query("SELECT * FROM shifts ORDER BY name");
        res.json({ shifts });
        return;
      }

      // Get shifts that are available for the specified date
      // Available shifts = all shifts minus shifts already assigned to other users on that date
      const [shifts] = await db.query(
        `SELECT DISTINCT s.* 
         FROM shifts s 
         WHERE s.id NOT IN (
           SELECT us.shift_id 
           FROM user_shifts us 
           WHERE us.date = ? AND us.user_id != ?
         )
         ORDER BY s.name`,
        [date, userId]
      );

      res.json({ shifts });
    } catch (error) {
      console.error("Error fetching available shifts:", error);
      res.status(500).json({ error: "Failed to fetch shifts" });
    }
  });

  // Get user's current shift for a specific date
  router.get("/current-shift/:date", requireAuth, async (req, res) => {
    try {
      const { date } = req.params;
      const userId = req.user.userId || req.user.id;

      const [rows] = await db.query(
        `SELECT s.id, s.name, s.start_time, s.end_time 
         FROM user_shifts us 
         JOIN shifts s ON us.shift_id = s.id 
         WHERE us.user_id = ? AND us.date = ?`,
        [userId, date]
      );

      res.json({ currentShift: rows[0] || null });
    } catch (error) {
      console.error("Error fetching current shift:", error);
      res.status(500).json({ error: "Failed to fetch current shift" });
    }
  });

  // Developer: Submit shift change request
  router.post("/request", requireAuth, async (req, res) => {
    try {
      const { requested_shift_id, request_date, reason } = req.body;
      const userId = req.user.userId || req.user.id;

      if (!requested_shift_id || !request_date) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Get current shift for the requested date
      const [currentShiftRows] = await db.query(
        `SELECT us.shift_id FROM user_shifts us WHERE us.user_id = ? AND us.date = ?`,
        [userId, request_date]
      );

      if (currentShiftRows.length === 0) {
        return res
          .status(400)
          .json({ error: "No current shift found for the specified date" });
      }

      const current_shift_id = currentShiftRows[0].shift_id;

      // Check if request already exists for this date
      const [existingRequest] = await db.query(
        `SELECT id FROM shift_change_requests 
         WHERE user_id = ? AND request_date = ? AND status = 'Pending'`,
        [userId, request_date]
      );

      if (existingRequest.length > 0) {
        return res
          .status(400)
          .json({ error: "A pending request already exists for this date" });
      }

      // Insert the request
      const [result] = await db.query(
        `INSERT INTO shift_change_requests 
         (user_id, current_shift_id, requested_shift_id, request_date, reason) 
         VALUES (?, ?, ?, ?, ?)`,
        [userId, current_shift_id, requested_shift_id, request_date, reason]
      );

      res.json({
        message: "Shift change request submitted successfully",
        requestId: result.insertId,
      });
    } catch (error) {
      console.error("Error submitting shift change request:", error);
      res.status(500).json({ error: "Failed to submit request" });
    }
  });

  // Developer: Get my shift change requests
  router.get("/my-requests", requireAuth, async (req, res) => {
    try {
      const userId = req.user.userId || req.user.id;

      const [requests] = await db.query(
        `SELECT 
          scr.*,
          cs.name as current_shift_name,
          cs.start_time as current_start_time,
          cs.end_time as current_end_time,
          rs.name as requested_shift_name,
          rs.start_time as requested_start_time,
          rs.end_time as requested_end_time,
          a.username as approved_by_name
         FROM shift_change_requests scr
         JOIN shifts cs ON scr.current_shift_id = cs.id
         JOIN shifts rs ON scr.requested_shift_id = rs.id
         LEFT JOIN users a ON scr.approved_by = a.id
         WHERE scr.user_id = ?
         ORDER BY scr.created_at DESC`,
        [userId]
      );

      res.json({ requests });
    } catch (error) {
      console.error("Error fetching shift change requests:", error);
      res.status(500).json({ error: "Failed to fetch requests" });
    }
  });

  // HR: Get all shift change requests
  router.get("/all", requireAuth, requireHR, async (req, res) => {
    try {
      const { status, user_id } = req.query;
      let whereClause = "1=1";
      const params = [];

      if (status) {
        whereClause += " AND scr.status = ?";
        params.push(status);
      }

      if (user_id) {
        whereClause += " AND scr.user_id = ?";
        params.push(user_id);
      }

      const [requests] = await db.query(
        `SELECT 
          scr.*,
          u.username,
          u.name,
          u.department,
          cs.name as current_shift_name,
          cs.start_time as current_start_time,
          cs.end_time as current_end_time,
          rs.name as requested_shift_name,
          rs.start_time as requested_start_time,
          rs.end_time as requested_end_time,
          a.username as approved_by_name
         FROM shift_change_requests scr
         JOIN users u ON scr.user_id = u.id
         JOIN shifts cs ON scr.current_shift_id = cs.id
         JOIN shifts rs ON scr.requested_shift_id = rs.id
         LEFT JOIN users a ON scr.approved_by = a.id
         WHERE ${whereClause}
         ORDER BY scr.created_at DESC`,
        params
      );

      res.json({ requests });
    } catch (error) {
      console.error("Error fetching all shift change requests:", error);
      res.status(500).json({ error: "Failed to fetch requests" });
    }
  });

  // HR: Get pending requests count
  router.get("/pending-count", requireAuth, requireHR, async (req, res) => {
    try {
      const [result] = await db.query(
        "SELECT COUNT(*) as count FROM shift_change_requests WHERE status = 'Pending'"
      );
      res.json({ count: result[0].count });
    } catch (error) {
      console.error("Error fetching pending count:", error);
      res.status(500).json({ error: "Failed to fetch pending count" });
    }
  });

  // HR: Approve/Reject shift change request
  router.put("/:requestId/status", requireAuth, requireHR, async (req, res) => {
    try {
      const { requestId } = req.params;
      const { status, rejection_reason } = req.body;
      const approvedBy = req.user.userId || req.user.id;

      if (!status || !["Approved", "Rejected"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      // Get the request
      const [requestRows] = await db.query(
        "SELECT * FROM shift_change_requests WHERE id = ?",
        [requestId]
      );

      if (requestRows.length === 0) {
        return res.status(404).json({ error: "Request not found" });
      }

      const request = requestRows[0];

      if (request.status !== "Pending") {
        return res
          .status(400)
          .json({ error: "Request has already been processed" });
      }

      // Update the request status
      const updateData = {
        status,
        approved_by: approvedBy,
        approved_at: new Date(),
      };

      if (status === "Rejected" && rejection_reason) {
        updateData.rejection_reason = rejection_reason;
      }

      await db.query(
        `UPDATE shift_change_requests 
         SET status = ?, approved_by = ?, approved_at = ?, rejection_reason = ?
         WHERE id = ?`,
        [
          status,
          approvedBy,
          updateData.approved_at,
          updateData.rejection_reason || null,
          requestId,
        ]
      );

      // If approved, update the user's shift
      if (status === "Approved") {
        await db.query(
          `INSERT INTO user_shifts (user_id, shift_id, date) 
           VALUES (?, ?, ?) 
           ON DUPLICATE KEY UPDATE shift_id = ?`,
          [
            request.user_id,
            request.requested_shift_id,
            request.request_date,
            request.requested_shift_id,
          ]
        );
      }

      res.json({ message: `Request ${status.toLowerCase()} successfully` });
    } catch (error) {
      console.error("Error updating request status:", error);
      res.status(500).json({ error: "Failed to update request status" });
    }
  });

  return router;
};
