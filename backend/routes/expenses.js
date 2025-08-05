const express = require("express");

module.exports = (db) => {
  const router = express.Router();

  // Middleware to require authentication
  const requireAuth = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "No token provided." });
    }
    try {
      const jwt = require("jsonwebtoken");
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      // Ensure user.id is available (handle both userId and id)
      if (!req.user.id && req.user.userId) {
        req.user.id = req.user.userId;
      }
      req.db = db; // Add db to request object
      next();
    } catch (error) {
      return res.status(401).json({ error: "Invalid token." });
    }
  };

  // Middleware to require Finance role
  const requireFinance = (req, res, next) => {
    if (req.user.role.toLowerCase() !== "finance") {
      return res
        .status(403)
        .json({ error: "Access denied. Finance role required." });
    }
    next();
  };

  // Get all expense claims (with filters)
  router.get("/claims", requireAuth, async (req, res) => {
    try {
      const { status, category_id, user_id, start_date, end_date, search } =
        req.query;
      let query = `
        SELECT 
          ec.*,
          u.username as user_name,
          u.email as user_email,
          exc.name as category_name,
          a.username as approver_name
        FROM expense_claims ec
        LEFT JOIN users u ON ec.user_id = u.id
        LEFT JOIN expense_categories exc ON ec.category_id = exc.id
        LEFT JOIN users a ON ec.approved_by = a.id
        WHERE 1=1
      `;
      const params = [];

      // Apply filters
      if (status) {
        query += " AND ec.status = ?";
        params.push(status);
      }
      if (category_id) {
        query += " AND ec.category_id = ?";
        params.push(category_id);
      }
      if (user_id) {
        query += " AND ec.user_id = ?";
        params.push(user_id);
      }
      if (start_date) {
        query += " AND ec.expense_date >= ?";
        params.push(start_date);
      }
      if (end_date) {
        query += " AND ec.expense_date <= ?";
        params.push(end_date);
      }
      if (search) {
        query +=
          " AND (ec.title LIKE ? OR ec.description LIKE ? OR u.username LIKE ?)";
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      // If not Finance role, only show user's own claims
      if (req.user.role.toLowerCase() !== "finance") {
        query += " AND ec.user_id = ?";
        params.push(req.user.id);
      }

      query += " ORDER BY ec.created_at DESC";

      const [claims] = await req.db.query(query, params);
      res.json({ claims });
    } catch (error) {
      console.error("Error fetching expense claims:", error);
      res.status(500).json({ error: "Failed to fetch expense claims." });
    }
  });

  // Get specific expense claim
  router.get("/claims/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const query = `
        SELECT 
          ec.*,
          u.username as user_name,
          u.email as user_email,
          exc.name as category_name,
          a.username as approver_name
        FROM expense_claims ec
        LEFT JOIN users u ON ec.user_id = u.id
        LEFT JOIN expense_categories exc ON ec.category_id = exc.id
        LEFT JOIN users a ON ec.approved_by = a.id
        WHERE ec.id = ?
      `;

      const [claims] = await req.db.query(query, [id]);
      if (claims.length === 0) {
        return res.status(404).json({ error: "Expense claim not found." });
      }

      const claim = claims[0];

      // Check if user has permission to view this claim
      if (
        req.user.role.toLowerCase() !== "finance" &&
        claim.user_id !== req.user.id
      ) {
        return res.status(403).json({ error: "Access denied." });
      }

      res.json({ claim });
    } catch (error) {
      console.error("Error fetching expense claim:", error);
      res.status(500).json({ error: "Failed to fetch expense claim." });
    }
  });

  // Create new expense claim
  router.post("/claims", requireAuth, async (req, res) => {
    try {
      const {
        category_id,
        title,
        description,
        amount,
        currency,
        expense_date,
        receipt_url,
        notes,
      } = req.body;

      // Validate required fields
      if (!category_id || !title || !amount || !expense_date) {
        return res.status(400).json({
          error:
            "Missing required fields: category_id, title, amount, expense_date",
        });
      }

      const query = `
        INSERT INTO expense_claims (
          user_id, category_id, title, description, amount, currency, 
          expense_date, receipt_url, notes, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')
      `;

      const [result] = await req.db.query(query, [
        req.user.id,
        category_id,
        title,
        description || null,
        amount,
        currency || "USD",
        expense_date,
        receipt_url || null,
        notes || null,
      ]);

      res.status(201).json({
        message: "Expense claim created successfully.",
        claim_id: result.insertId,
      });
    } catch (error) {
      console.error("Error creating expense claim:", error);
      res.status(500).json({ error: "Failed to create expense claim." });
    }
  });

  // Update expense claim
  router.put("/claims/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const {
        category_id,
        title,
        description,
        amount,
        currency,
        expense_date,
        receipt_url,
        notes,
      } = req.body;

      // Check if claim exists and user has permission
      const [existing] = await req.db.query(
        "SELECT * FROM expense_claims WHERE id = ?",
        [id]
      );

      if (existing.length === 0) {
        return res.status(404).json({ error: "Expense claim not found." });
      }

      const claim = existing[0];

      // Only allow updates if claim is pending or user is finance
      if (
        claim.status !== "Pending" &&
        req.user.role.toLowerCase() !== "finance"
      ) {
        return res.status(403).json({
          error: "Cannot update claim that is not pending.",
        });
      }

      // Only allow users to update their own claims unless they're finance
      if (
        claim.user_id !== req.user.id &&
        req.user.role.toLowerCase() !== "finance"
      ) {
        return res.status(403).json({ error: "Access denied." });
      }

      const query = `
        UPDATE expense_claims SET
          category_id = ?, title = ?, description = ?, amount = ?, 
          currency = ?, expense_date = ?, receipt_url = ?, notes = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      await req.db.query(query, [
        category_id || claim.category_id,
        title || claim.title,
        description || claim.description,
        amount || claim.amount,
        currency || claim.currency,
        expense_date || claim.expense_date,
        receipt_url || claim.receipt_url,
        notes || claim.notes,
        id,
      ]);

      res.json({ message: "Expense claim updated successfully." });
    } catch (error) {
      console.error("Error updating expense claim:", error);
      res.status(500).json({ error: "Failed to update expense claim." });
    }
  });

  // Delete expense claim
  router.delete("/claims/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;

      // Check if claim exists and user has permission
      const [existing] = await req.db.query(
        "SELECT * FROM expense_claims WHERE id = ?",
        [id]
      );

      if (existing.length === 0) {
        return res.status(404).json({ error: "Expense claim not found." });
      }

      const claim = existing[0];

      // Only allow deletion if claim is pending or user is finance
      if (
        claim.status !== "Pending" &&
        req.user.role.toLowerCase() !== "finance"
      ) {
        return res.status(403).json({
          error: "Cannot delete claim that is not pending.",
        });
      }

      // Only allow users to delete their own claims unless they're finance
      if (
        claim.user_id !== req.user.id &&
        req.user.role.toLowerCase() !== "finance"
      ) {
        return res.status(403).json({ error: "Access denied." });
      }

      await req.db.query("DELETE FROM expense_claims WHERE id = ?", [id]);
      res.json({ message: "Expense claim deleted successfully." });
    } catch (error) {
      console.error("Error deleting expense claim:", error);
      res.status(500).json({ error: "Failed to delete expense claim." });
    }
  });

  // Approve expense claim (Finance only)
  router.put(
    "/claims/:id/approve",
    requireAuth,
    requireFinance,
    async (req, res) => {
      try {
        const { id } = req.params;
        const { notes } = req.body;

        const [existing] = await req.db.query(
          "SELECT * FROM expense_claims WHERE id = ?",
          [id]
        );

        if (existing.length === 0) {
          return res.status(404).json({ error: "Expense claim not found." });
        }

        const claim = existing[0];

        if (claim.status !== "Pending") {
          return res.status(400).json({
            error: "Can only approve pending claims.",
          });
        }

        await req.db.query(
          `
        UPDATE expense_claims SET
          status = 'Approved', approved_by = ?, approved_at = CURRENT_TIMESTAMP,
          notes = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
          [req.user.id, notes || claim.notes, id]
        );

        res.json({ message: "Expense claim approved successfully." });
      } catch (error) {
        console.error("Error approving expense claim:", error);
        res.status(500).json({ error: "Failed to approve expense claim." });
      }
    }
  );

  // Reject expense claim (Finance only)
  router.put(
    "/claims/:id/reject",
    requireAuth,
    requireFinance,
    async (req, res) => {
      try {
        const { id } = req.params;
        const { rejection_reason } = req.body;

        if (!rejection_reason) {
          return res.status(400).json({
            error: "Rejection reason is required.",
          });
        }

        const [existing] = await req.db.query(
          "SELECT * FROM expense_claims WHERE id = ?",
          [id]
        );

        if (existing.length === 0) {
          return res.status(404).json({ error: "Expense claim not found." });
        }

        const claim = existing[0];

        if (claim.status !== "Pending") {
          return res.status(400).json({
            error: "Can only reject pending claims.",
          });
        }

        await req.db.query(
          `
        UPDATE expense_claims SET
          status = 'Rejected', approved_by = ?, approved_at = CURRENT_TIMESTAMP,
          rejection_reason = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
          [req.user.id, rejection_reason, id]
        );

        res.json({ message: "Expense claim rejected successfully." });
      } catch (error) {
        console.error("Error rejecting expense claim:", error);
        res.status(500).json({ error: "Failed to reject expense claim." });
      }
    }
  );

  // Mark expense claim as paid (Finance only)
  router.put(
    "/claims/:id/mark-paid",
    requireAuth,
    requireFinance,
    async (req, res) => {
      try {
        const { id } = req.params;
        const { payment_date } = req.body;

        const [existing] = await req.db.query(
          "SELECT * FROM expense_claims WHERE id = ?",
          [id]
        );

        if (existing.length === 0) {
          return res.status(404).json({ error: "Expense claim not found." });
        }

        const claim = existing[0];

        if (claim.status !== "Approved") {
          return res.status(400).json({
            error: "Can only mark approved claims as paid.",
          });
        }

        await req.db.query(
          `
        UPDATE expense_claims SET
          status = 'Paid', payment_date = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
          [payment_date || new Date(), id]
        );

        res.json({ message: "Expense claim marked as paid successfully." });
      } catch (error) {
        console.error("Error marking expense claim as paid:", error);
        res
          .status(500)
          .json({ error: "Failed to mark expense claim as paid." });
      }
    }
  );

  // Get all expense categories
  router.get("/categories", requireAuth, async (req, res) => {
    try {
      const [categories] = await req.db.query(
        "SELECT * FROM expense_categories ORDER BY name"
      );
      res.json({ categories });
    } catch (error) {
      console.error("Error fetching expense categories:", error);
      res.status(500).json({ error: "Failed to fetch expense categories." });
    }
  });

  // Create new expense category (Finance only)
  router.post("/categories", requireAuth, requireFinance, async (req, res) => {
    try {
      const { name, description, budget_limit } = req.body;

      if (!name) {
        return res.status(400).json({
          error: "Category name is required.",
        });
      }

      const [result] = await req.db.query(
        `
        INSERT INTO expense_categories (name, description, budget_limit)
        VALUES (?, ?, ?)
      `,
        [name, description || null, budget_limit || null]
      );

      res.status(201).json({
        message: "Expense category created successfully.",
        category_id: result.insertId,
      });
    } catch (error) {
      console.error("Error creating expense category:", error);
      res.status(500).json({ error: "Failed to create expense category." });
    }
  });

  // Update expense category (Finance only)
  router.put(
    "/categories/:id",
    requireAuth,
    requireFinance,
    async (req, res) => {
      try {
        const { id } = req.params;
        const { name, description, budget_limit } = req.body;

        const [existing] = await req.db.query(
          "SELECT * FROM expense_categories WHERE id = ?",
          [id]
        );

        if (existing.length === 0) {
          return res.status(404).json({ error: "Expense category not found." });
        }

        await req.db.query(
          `
        UPDATE expense_categories SET
          name = ?, description = ?, budget_limit = ?
        WHERE id = ?
      `,
          [name, description || null, budget_limit || null, id]
        );

        res.json({ message: "Expense category updated successfully." });
      } catch (error) {
        console.error("Error updating expense category:", error);
        res.status(500).json({ error: "Failed to update expense category." });
      }
    }
  );

  // Delete expense category (Finance only)
  router.delete(
    "/categories/:id",
    requireAuth,
    requireFinance,
    async (req, res) => {
      try {
        const { id } = req.params;

        // Check if category is being used by any claims
        const [claims] = await req.db.query(
          "SELECT COUNT(*) as count FROM expense_claims WHERE category_id = ?",
          [id]
        );

        if (claims[0].count > 0) {
          return res.status(400).json({
            error:
              "Cannot delete category that is being used by expense claims.",
          });
        }

        await req.db.query("DELETE FROM expense_categories WHERE id = ?", [id]);
        res.json({ message: "Expense category deleted successfully." });
      } catch (error) {
        console.error("Error deleting expense category:", error);
        res.status(500).json({ error: "Failed to delete expense category." });
      }
    }
  );

  // Get expense reports
  router.get("/reports", requireAuth, requireFinance, async (req, res) => {
    try {
      const { start_date, end_date, category_id, user_id } = req.query;

      let whereClause = "WHERE 1=1";
      const params = [];

      if (start_date) {
        whereClause += " AND expense_date >= ?";
        params.push(start_date);
      }
      if (end_date) {
        whereClause += " AND expense_date <= ?";
        params.push(end_date);
      }
      if (category_id) {
        whereClause += " AND category_id = ?";
        params.push(category_id);
      }
      if (user_id) {
        whereClause += " AND user_id = ?";
        params.push(user_id);
      }

      // Summary statistics
      const [summary] = await req.db.query(
        `
        SELECT 
          COUNT(*) as total_claims,
          SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending_claims,
          SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) as approved_claims,
          SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) as rejected_claims,
          SUM(CASE WHEN status = 'Paid' THEN 1 ELSE 0 END) as paid_claims,
          SUM(CASE WHEN status IN ('Approved', 'Paid') THEN amount ELSE 0 END) as total_approved_amount,
          SUM(CASE WHEN status = 'Pending' THEN amount ELSE 0 END) as total_pending_amount
        FROM expense_claims
        ${whereClause}
      `,
        params
      );

      // Category-wise breakdown
      const [categoryBreakdown] = await req.db.query(
        `
        SELECT 
          exc.name as category_name,
          COUNT(*) as claim_count,
          SUM(ec.amount) as total_amount,
          SUM(CASE WHEN ec.status IN ('Approved', 'Paid') THEN ec.amount ELSE 0 END) as approved_amount
        FROM expense_claims ec
        LEFT JOIN expense_categories exc ON ec.category_id = exc.id
        ${whereClause}
        GROUP BY ec.category_id, exc.name
        ORDER BY total_amount DESC
      `,
        params
      );

      // Monthly breakdown
      const [monthlyBreakdown] = await req.db.query(
        `
        SELECT 
          DATE_FORMAT(expense_date, '%Y-%m') as month,
          COUNT(*) as claim_count,
          SUM(amount) as total_amount,
          SUM(CASE WHEN status IN ('Approved', 'Paid') THEN amount ELSE 0 END) as approved_amount
        FROM expense_claims
        ${whereClause}
        GROUP BY DATE_FORMAT(expense_date, '%Y-%m')
        ORDER BY month DESC
      `,
        params
      );

      res.json({
        summary: summary[0],
        categoryBreakdown,
        monthlyBreakdown,
      });
    } catch (error) {
      console.error("Error generating expense reports:", error);
      res.status(500).json({ error: "Failed to generate expense reports." });
    }
  });

  return router;
};
