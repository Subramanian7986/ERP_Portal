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

// Middleware to require IT role
const requireIT = (req, res, next) => {
  if (!req.user.role || req.user.role.toLowerCase() !== "it") {
    return res.status(403).json({ error: "Access denied. IT role required." });
  }
  next();
};

module.exports = function itInventoryRoutes(db) {
  const router = express.Router();

  // ==================== ASSET CATEGORIES ====================

  // Get all asset categories with asset counts
  router.get("/categories", requireAuth, async (req, res) => {
    try {
      const [categories] = await db.query(`
        SELECT 
          c.*,
          COUNT(a.id) as assets_count
        FROM asset_categories c
        LEFT JOIN it_assets a ON c.id = a.category_id
        GROUP BY c.id
        ORDER BY c.name
      `);
      res.json({ categories });
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  // Create new asset category (IT only)
  router.post("/categories", requireAuth, requireIT, async (req, res) => {
    try {
      const { name, description, parent_id } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Category name is required" });
      }

      const [result] = await db.query(
        "INSERT INTO asset_categories (name, description, parent_id) VALUES (?, ?, ?)",
        [name, description, parent_id || null]
      );

      res.json({
        message: "Category created successfully",
        categoryId: result.insertId,
      });
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ error: "Failed to create category" });
    }
  });

  // Update asset category (IT only)
  router.put("/categories/:id", requireAuth, requireIT, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, parent_id } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Category name is required" });
      }

      // Check if category exists
      const [existing] = await db.query(
        "SELECT id FROM asset_categories WHERE id = ?",
        [id]
      );

      if (existing.length === 0) {
        return res.status(404).json({ error: "Category not found" });
      }

      await db.query(
        "UPDATE asset_categories SET name = ?, description = ?, parent_id = ? WHERE id = ?",
        [name, description, parent_id || null, id]
      );

      res.json({ message: "Category updated successfully" });
    } catch (error) {
      console.error("Error updating category:", error);
      res.status(500).json({ error: "Failed to update category" });
    }
  });

  // Delete asset category (IT only)
  router.delete("/categories/:id", requireAuth, requireIT, async (req, res) => {
    try {
      const { id } = req.params;

      // Check if category has assets
      const [assets] = await db.query(
        "SELECT COUNT(*) as count FROM it_assets WHERE category_id = ?",
        [id]
      );

      if (assets[0].count > 0) {
        return res.status(400).json({
          error:
            "Cannot delete category. It contains assets. Please reassign or delete the assets first.",
        });
      }

      // Check if category has subcategories
      const [subcategories] = await db.query(
        "SELECT COUNT(*) as count FROM asset_categories WHERE parent_id = ?",
        [id]
      );

      if (subcategories[0].count > 0) {
        return res.status(400).json({
          error:
            "Cannot delete category. It has subcategories. Please delete subcategories first.",
        });
      }

      const [result] = await db.query(
        "DELETE FROM asset_categories WHERE id = ?",
        [id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Category not found" });
      }

      res.json({ message: "Category deleted successfully" });
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ error: "Failed to delete category" });
    }
  });

  // ==================== VENDORS ====================

  // Get all vendors
  router.get("/vendors", requireAuth, async (req, res) => {
    try {
      const [vendors] = await db.query("SELECT * FROM vendors ORDER BY name");
      res.json({ vendors });
    } catch (error) {
      console.error("Error fetching vendors:", error);
      res.status(500).json({ error: "Failed to fetch vendors" });
    }
  });

  // Create new vendor (IT only)
  router.post("/vendors", requireAuth, requireIT, async (req, res) => {
    try {
      const { name, contact_person, email, phone, address, rating, notes } =
        req.body;

      if (!name) {
        return res.status(400).json({ error: "Vendor name is required" });
      }

      const [result] = await db.query(
        "INSERT INTO vendors (name, contact_person, email, phone, address, rating, notes) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          name,
          contact_person,
          email,
          phone,
          address,
          rating || null,
          notes || null,
        ]
      );

      res.json({
        message: "Vendor created successfully",
        vendorId: result.insertId,
      });
    } catch (error) {
      console.error("Error creating vendor:", error);
      res.status(500).json({ error: "Failed to create vendor" });
    }
  });

  // Update vendor (IT only)
  router.put("/vendors/:id", requireAuth, requireIT, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, contact_person, email, phone, address, rating, notes } =
        req.body;

      if (!name) {
        return res.status(400).json({ error: "Vendor name is required" });
      }

      // Check if vendor exists
      const [existing] = await db.query("SELECT id FROM vendors WHERE id = ?", [
        id,
      ]);

      if (existing.length === 0) {
        return res.status(404).json({ error: "Vendor not found" });
      }

      await db.query(
        "UPDATE vendors SET name = ?, contact_person = ?, email = ?, phone = ?, address = ?, rating = ?, notes = ? WHERE id = ?",
        [
          name,
          contact_person,
          email,
          phone,
          address,
          rating || null,
          notes || null,
          id,
        ]
      );

      res.json({ message: "Vendor updated successfully" });
    } catch (error) {
      console.error("Error updating vendor:", error);
      res.status(500).json({ error: "Failed to update vendor" });
    }
  });

  // Delete vendor (IT only)
  router.delete("/vendors/:id", requireAuth, requireIT, async (req, res) => {
    try {
      const { id } = req.params;

      // Check if vendor has assets
      const [assets] = await db.query(
        "SELECT COUNT(*) as count FROM it_assets WHERE vendor_id = ?",
        [id]
      );

      if (assets[0].count > 0) {
        return res.status(400).json({
          error:
            "Cannot delete vendor. It has associated assets. Please reassign or delete the assets first.",
        });
      }

      // Check if vendor has maintenance records
      const [maintenance] = await db.query(
        "SELECT COUNT(*) as count FROM maintenance_records WHERE vendor_id = ?",
        [id]
      );

      if (maintenance[0].count > 0) {
        return res.status(400).json({
          error:
            "Cannot delete vendor. It has associated maintenance records. Please update the maintenance records first.",
        });
      }

      const [result] = await db.query("DELETE FROM vendors WHERE id = ?", [id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Vendor not found" });
      }

      res.json({ message: "Vendor deleted successfully" });
    } catch (error) {
      console.error("Error deleting vendor:", error);
      res.status(500).json({ error: "Failed to delete vendor" });
    }
  });

  // ==================== IT ASSETS ====================

  // Get all assets with filters
  router.get("/assets", requireAuth, async (req, res) => {
    try {
      const { status, category_id, search } = req.query;
      let whereClause = "1=1";
      const params = [];

      if (status) {
        whereClause += " AND a.status = ?";
        params.push(status);
      }

      if (category_id) {
        whereClause += " AND a.category_id = ?";
        params.push(category_id);
      }

      if (search) {
        whereClause +=
          " AND (a.name LIKE ? OR a.asset_tag LIKE ? OR a.serial_number LIKE ?)";
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      const [assets] = await db.query(
        `SELECT 
          a.*,
          c.name as category_name,
          v.name as vendor_name,
          u.username as created_by_name,
          aa.assigned_to,
          assigned_user.username as assigned_to_name
         FROM it_assets a
         LEFT JOIN asset_categories c ON a.category_id = c.id
         LEFT JOIN vendors v ON a.vendor_id = v.id
         LEFT JOIN users u ON a.created_by = u.id
         LEFT JOIN asset_assignments aa ON a.id = aa.asset_id AND aa.returned_at IS NULL
         LEFT JOIN users assigned_user ON aa.assigned_to = assigned_user.id
         WHERE ${whereClause}
         ORDER BY a.created_at DESC`,
        params
      );

      res.json({ assets });
    } catch (error) {
      console.error("Error fetching assets:", error);
      res.status(500).json({ error: "Failed to fetch assets" });
    }
  });

  // Get single asset
  router.get("/assets/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;

      const [assets] = await db.query(
        `SELECT 
          a.*,
          c.name as category_name,
          v.name as vendor_name,
          u.username as created_by_name
         FROM it_assets a
         LEFT JOIN asset_categories c ON a.category_id = c.id
         LEFT JOIN vendors v ON a.vendor_id = v.id
         LEFT JOIN users u ON a.created_by = u.id
         WHERE a.id = ?`,
        [id]
      );

      if (assets.length === 0) {
        return res.status(404).json({ error: "Asset not found" });
      }

      res.json({ asset: assets[0] });
    } catch (error) {
      console.error("Error fetching asset:", error);
      res.status(500).json({ error: "Failed to fetch asset" });
    }
  });

  // Create new asset (IT only)
  router.post("/assets", requireAuth, requireIT, async (req, res) => {
    try {
      const {
        asset_tag,
        name,
        category_id,
        model,
        serial_number,
        specifications,
        purchase_date,
        purchase_cost,
        vendor_id,
        warranty_expiry,
        location,
        notes,
      } = req.body;

      if (!asset_tag || !name || !category_id) {
        return res
          .status(400)
          .json({ error: "Asset tag, name, and category are required" });
      }

      const createdBy = req.user.userId || req.user.id;

      const [result] = await db.query(
        `INSERT INTO it_assets 
         (asset_tag, name, category_id, model, serial_number, specifications, 
          purchase_date, purchase_cost, vendor_id, warranty_expiry, location, notes, created_by) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          asset_tag,
          name,
          category_id,
          model,
          serial_number,
          specifications,
          purchase_date,
          purchase_cost,
          vendor_id,
          warranty_expiry,
          location,
          notes,
          createdBy,
        ]
      );

      res.json({
        message: "Asset created successfully",
        assetId: result.insertId,
      });
    } catch (error) {
      console.error("Error creating asset:", error);
      res.status(500).json({ error: "Failed to create asset" });
    }
  });

  // Update asset (IT only)
  router.put("/assets/:id", requireAuth, requireIT, async (req, res) => {
    try {
      const { id } = req.params;
      const {
        name,
        category_id,
        model,
        serial_number,
        specifications,
        purchase_date,
        purchase_cost,
        vendor_id,
        warranty_expiry,
        status,
        location,
        notes,
      } = req.body;

      await db.query(
        `UPDATE it_assets 
         SET name = ?, category_id = ?, model = ?, serial_number = ?, specifications = ?,
             purchase_date = ?, purchase_cost = ?, vendor_id = ?, warranty_expiry = ?, 
             status = ?, location = ?, notes = ?
         WHERE id = ?`,
        [
          name,
          category_id,
          model,
          serial_number,
          specifications,
          purchase_date,
          purchase_cost,
          vendor_id,
          warranty_expiry,
          status,
          location,
          notes,
          id,
        ]
      );

      res.json({ message: "Asset updated successfully" });
    } catch (error) {
      console.error("Error updating asset:", error);
      res.status(500).json({ error: "Failed to update asset" });
    }
  });

  // Delete asset (IT only)
  router.delete("/assets/:id", requireAuth, requireIT, async (req, res) => {
    try {
      const { id } = req.params;

      // Check if asset exists and is not assigned
      const [assetRows] = await db.query(
        "SELECT status FROM it_assets WHERE id = ?",
        [id]
      );

      if (assetRows.length === 0) {
        return res.status(404).json({ error: "Asset not found" });
      }

      if (assetRows[0].status === "Assigned") {
        return res.status(400).json({
          error: "Cannot delete assigned asset. Please return it first.",
        });
      }

      // Check if asset has any assignments
      const [assignmentRows] = await db.query(
        "SELECT id FROM asset_assignments WHERE asset_id = ?",
        [id]
      );

      if (assignmentRows.length > 0) {
        return res.status(400).json({
          error:
            "Cannot delete asset with assignment history. Please contact administrator.",
        });
      }

      // Check if asset has maintenance records
      const [maintenanceRows] = await db.query(
        "SELECT id FROM maintenance_records WHERE asset_id = ?",
        [id]
      );

      if (maintenanceRows.length > 0) {
        return res.status(400).json({
          error:
            "Cannot delete asset with maintenance history. Please contact administrator.",
        });
      }

      // Delete the asset
      await db.query("DELETE FROM it_assets WHERE id = ?", [id]);

      res.json({ message: "Asset deleted successfully" });
    } catch (error) {
      console.error("Error deleting asset:", error);
      res.status(500).json({ error: "Failed to delete asset" });
    }
  });

  // ==================== ASSET ASSIGNMENTS ====================

  // Get asset assignments
  router.get("/assignments", requireAuth, async (req, res) => {
    try {
      const { asset_id, user_id, status } = req.query;
      let whereClause = "1=1";
      const params = [];

      if (asset_id) {
        whereClause += " AND aa.asset_id = ?";
        params.push(asset_id);
      }

      if (user_id) {
        whereClause += " AND aa.assigned_to = ?";
        params.push(user_id);
      }

      if (status === "active") {
        whereClause += " AND aa.returned_at IS NULL";
      } else if (status === "returned") {
        whereClause += " AND aa.returned_at IS NOT NULL";
      }

      const [assignments] = await db.query(
        `SELECT 
          aa.*,
          a.asset_tag,
          a.name as asset_name,
          assigned_user.username as assigned_to_name,
          assigned_user.name as assigned_to_full_name,
          assigned_by_user.username as assigned_by_name
         FROM asset_assignments aa
         JOIN it_assets a ON aa.asset_id = a.id
         JOIN users assigned_user ON aa.assigned_to = assigned_user.id
         JOIN users assigned_by_user ON aa.assigned_by = assigned_by_user.id
         WHERE ${whereClause}
         ORDER BY aa.assigned_at DESC`,
        params
      );

      res.json({ assignments });
    } catch (error) {
      console.error("Error fetching assignments:", error);
      res.status(500).json({ error: "Failed to fetch assignments" });
    }
  });

  // Assign asset to user (IT only)
  router.post("/assignments", requireAuth, requireIT, async (req, res) => {
    try {
      const { asset_id, assigned_to, notes } = req.body;
      const assignedBy = req.user.userId || req.user.id;

      if (!asset_id || !assigned_to) {
        return res
          .status(400)
          .json({ error: "Asset ID and assigned user are required" });
      }

      // Check if asset is available
      const [assetRows] = await db.query(
        "SELECT status FROM it_assets WHERE id = ?",
        [asset_id]
      );

      if (assetRows.length === 0) {
        return res.status(404).json({ error: "Asset not found" });
      }

      if (assetRows[0].status !== "Available") {
        return res
          .status(400)
          .json({ error: "Asset is not available for assignment" });
      }

      // Create assignment
      await db.query(
        "INSERT INTO asset_assignments (asset_id, assigned_to, assigned_by, notes) VALUES (?, ?, ?, ?)",
        [asset_id, assigned_to, assignedBy, notes]
      );

      // Update asset status
      await db.query("UPDATE it_assets SET status = 'Assigned' WHERE id = ?", [
        asset_id,
      ]);

      res.json({ message: "Asset assigned successfully" });
    } catch (error) {
      console.error("Error assigning asset:", error);
      res.status(500).json({ error: "Failed to assign asset" });
    }
  });

  // Return asset (IT only)
  router.put(
    "/assignments/:id/return",
    requireAuth,
    requireIT,
    async (req, res) => {
      try {
        const { id } = req.params;
        const { return_reason, notes } = req.body;

        // Get assignment details
        const [assignmentRows] = await db.query(
          "SELECT asset_id FROM asset_assignments WHERE id = ? AND returned_at IS NULL",
          [id]
        );

        if (assignmentRows.length === 0) {
          return res.status(404).json({ error: "Active assignment not found" });
        }

        const assetId = assignmentRows[0].asset_id;

        // Update assignment
        await db.query(
          "UPDATE asset_assignments SET returned_at = NOW(), return_reason = ?, notes = ? WHERE id = ?",
          [return_reason, notes, id]
        );

        // Update asset status
        await db.query(
          "UPDATE it_assets SET status = 'Available' WHERE id = ?",
          [assetId]
        );

        res.json({ message: "Asset returned successfully" });
      } catch (error) {
        console.error("Error returning asset:", error);
        res.status(500).json({ error: "Failed to return asset" });
      }
    }
  );

  // ==================== MAINTENANCE RECORDS ====================

  // Get maintenance records
  router.get("/maintenance", requireAuth, async (req, res) => {
    try {
      const { asset_id, status } = req.query;
      let whereClause = "1=1";
      const params = [];

      if (asset_id) {
        whereClause += " AND mr.asset_id = ?";
        params.push(asset_id);
      }

      if (status) {
        whereClause += " AND mr.status = ?";
        params.push(status);
      }

      const [records] = await db.query(
        `SELECT 
          mr.*,
          a.asset_tag,
          a.name as asset_name,
          v.name as vendor_name,
          u.username as performed_by_name
         FROM maintenance_records mr
         JOIN it_assets a ON mr.asset_id = a.id
         LEFT JOIN vendors v ON mr.vendor_id = v.id
         JOIN users u ON mr.performed_by = u.id
         WHERE ${whereClause}
         ORDER BY mr.performed_at DESC`,
        params
      );

      res.json({ records });
    } catch (error) {
      console.error("Error fetching maintenance records:", error);
      res.status(500).json({ error: "Failed to fetch maintenance records" });
    }
  });

  // Create maintenance record (IT only)
  router.post("/maintenance", requireAuth, requireIT, async (req, res) => {
    try {
      const {
        asset_id,
        maintenance_type,
        description,
        cost,
        vendor_id,
        next_maintenance_date,
        notes,
      } = req.body;
      const performedBy = req.user.userId || req.user.id;

      if (!asset_id || !maintenance_type || !description) {
        return res.status(400).json({
          error: "Asset ID, maintenance type, and description are required",
        });
      }

      const [result] = await db.query(
        `INSERT INTO maintenance_records 
         (asset_id, maintenance_type, description, performed_by, cost, vendor_id, next_maintenance_date, notes) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          asset_id,
          maintenance_type,
          description,
          performedBy,
          cost,
          vendor_id,
          next_maintenance_date,
          notes,
        ]
      );

      // Update asset status if maintenance type is repair
      if (maintenance_type === "Repair") {
        await db.query(
          "UPDATE it_assets SET status = 'Under Maintenance' WHERE id = ?",
          [asset_id]
        );
      }

      res.json({
        message: "Maintenance record created successfully",
        recordId: result.insertId,
      });
    } catch (error) {
      console.error("Error creating maintenance record:", error);
      res.status(500).json({ error: "Failed to create maintenance record" });
    }
  });

  // Update maintenance status (IT only)
  router.put(
    "/maintenance/:id/status",
    requireAuth,
    requireIT,
    async (req, res) => {
      try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
          return res.status(400).json({ error: "Status is required" });
        }

        await db.query(
          "UPDATE maintenance_records SET status = ? WHERE id = ?",
          [status, id]
        );

        // If maintenance is completed, update asset status
        if (status === "Completed") {
          const [recordRows] = await db.query(
            "SELECT asset_id FROM maintenance_records WHERE id = ?",
            [id]
          );

          if (recordRows.length > 0) {
            await db.query(
              "UPDATE it_assets SET status = 'Available' WHERE id = ?",
              [recordRows[0].asset_id]
            );
          }
        }

        res.json({ message: "Maintenance status updated successfully" });
      } catch (error) {
        console.error("Error updating maintenance status:", error);
        res.status(500).json({ error: "Failed to update maintenance status" });
      }
    }
  );

  // Update maintenance record (IT only)
  router.put("/maintenance/:id", requireAuth, requireIT, async (req, res) => {
    try {
      const { id } = req.params;
      const {
        asset_id,
        maintenance_type,
        description,
        cost,
        vendor_id,
        next_maintenance_date,
        status,
        notes,
      } = req.body;

      if (!asset_id || !maintenance_type || !description) {
        return res.status(400).json({
          error: "Asset ID, maintenance type, and description are required",
        });
      }

      await db.query(
        `UPDATE maintenance_records 
         SET asset_id = ?, maintenance_type = ?, description = ?, cost = ?, 
             vendor_id = ?, next_maintenance_date = ?, status = ?, notes = ?
         WHERE id = ?`,
        [
          asset_id,
          maintenance_type,
          description,
          cost || null,
          vendor_id || null,
          next_maintenance_date || null,
          status || "Scheduled",
          notes || null,
          id,
        ]
      );

      // Update asset status based on maintenance type and status
      if (maintenance_type === "Repair" && status === "In Progress") {
        await db.query(
          "UPDATE it_assets SET status = 'Under Maintenance' WHERE id = ?",
          [asset_id]
        );
      } else if (status === "Completed") {
        await db.query(
          "UPDATE it_assets SET status = 'Available' WHERE id = ?",
          [asset_id]
        );
      }

      res.json({ message: "Maintenance record updated successfully" });
    } catch (error) {
      console.error("Error updating maintenance record:", error);
      res.status(500).json({ error: "Failed to update maintenance record" });
    }
  });

  // ==================== ASSET REQUESTS ====================

  // Get asset requests
  router.get("/requests", requireAuth, async (req, res) => {
    try {
      const { status, requested_by, priority, search } = req.query;
      let whereClause = "1=1";
      const params = [];

      if (status) {
        whereClause += " AND ar.status = ?";
        params.push(status);
      }

      if (requested_by) {
        whereClause += " AND ar.requested_by = ?";
        params.push(requested_by);
      }

      if (priority) {
        whereClause += " AND ar.priority = ?";
        params.push(priority);
      }

      if (search) {
        whereClause += " AND (ar.asset_name LIKE ? OR u.username LIKE ? OR u.name LIKE ?)";
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      const [requests] = await db.query(
        `SELECT 
          ar.*,
          c.name as category_name,
          u.username as requested_by_name,
          u.name as requested_by_full_name,
          a.username as approved_by_name
         FROM asset_requests ar
         JOIN asset_categories c ON ar.category_id = c.id
         JOIN users u ON ar.requested_by = u.id
         LEFT JOIN users a ON ar.approved_by = a.id
         WHERE ${whereClause}
         ORDER BY ar.created_at DESC`,
        params
      );

      res.json({ requests });
    } catch (error) {
      console.error("Error fetching requests:", error);
      res.status(500).json({ error: "Failed to fetch requests" });
    }
  });

  // Create asset request
  router.post("/requests", requireAuth, async (req, res) => {
    try {
      const {
        category_id,
        asset_name,
        quantity,
        priority,
        reason,
        required_by_date,
      } = req.body;
      const requestedBy = req.user.userId || req.user.id;

      if (!category_id || !asset_name || !reason) {
        return res
          .status(400)
          .json({ error: "Category, asset name, and reason are required" });
      }

      const [result] = await db.query(
        `INSERT INTO asset_requests 
         (requested_by, category_id, asset_name, quantity, priority, reason, required_by_date) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          requestedBy,
          category_id,
          asset_name,
          quantity || 1,
          priority || "Medium",
          reason,
          required_by_date,
        ]
      );

      res.json({
        message: "Asset request submitted successfully",
        requestId: result.insertId,
      });
    } catch (error) {
      console.error("Error creating request:", error);
      res.status(500).json({ error: "Failed to create request" });
    }
  });

  // Approve/reject asset request (IT only)
  router.put(
    "/requests/:id/status",
    requireAuth,
    requireIT,
    async (req, res) => {
      try {
        const { id } = req.params;
        const { status, rejection_reason } = req.body;
        const approvedBy = req.user.userId || req.user.id;

        if (
          !status ||
          !["Approved", "Rejected", "Fulfilled"].includes(status)
        ) {
          return res.status(400).json({ error: "Invalid status" });
        }

        const updateData = {
          status,
          approved_by: approvedBy,
          approved_at: new Date(),
        };

        if (status === "Rejected" && rejection_reason) {
          updateData.rejection_reason = rejection_reason;
        }

        await db.query(
          `UPDATE asset_requests 
         SET status = ?, approved_by = ?, approved_at = ?, rejection_reason = ?
         WHERE id = ?`,
          [
            status,
            approvedBy,
            updateData.approved_at,
            updateData.rejection_reason || null,
            id,
          ]
        );

        res.json({ message: `Request ${status.toLowerCase()} successfully` });
      } catch (error) {
        console.error("Error updating request status:", error);
        res.status(500).json({ error: "Failed to update request status" });
      }
    }
  );

  // ==================== DASHBOARD STATS ====================

  // Get dashboard statistics
  router.get("/stats", requireAuth, async (req, res) => {
    try {
      // Total assets
      const [totalAssets] = await db.query(
        "SELECT COUNT(*) as count FROM it_assets"
      );

      // Available assets
      const [availableAssets] = await db.query(
        "SELECT COUNT(*) as count FROM it_assets WHERE status = 'Available'"
      );

      // Assigned assets
      const [assignedAssets] = await db.query(
        "SELECT COUNT(*) as count FROM it_assets WHERE status = 'Assigned'"
      );

      // Under maintenance
      const [maintenanceAssets] = await db.query(
        "SELECT COUNT(*) as count FROM it_assets WHERE status = 'Under Maintenance'"
      );

      // Pending requests
      const [pendingRequests] = await db.query(
        "SELECT COUNT(*) as count FROM asset_requests WHERE status = 'Pending'"
      );

      // Total value
      const [totalValue] = await db.query(
        "SELECT SUM(purchase_cost) as total FROM it_assets WHERE purchase_cost IS NOT NULL"
      );

      res.json({
        stats: {
          totalAssets: totalAssets[0].count,
          availableAssets: availableAssets[0].count,
          assignedAssets: assignedAssets[0].count,
          maintenanceAssets: maintenanceAssets[0].count,
          pendingRequests: pendingRequests[0].count,
          totalValue: totalValue[0].total || 0,
        },
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  return router;
};
