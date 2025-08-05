const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const seedUsers = require("./seed");
const http = require("http");
const { Server } = require("socket.io");
const messagesRoutes = require("./routes/messages");
const hrRoutes = require("./routes/hr");
const tasksRoutes = require("./routes/tasks");
const leaveRoutes = require("./routes/leave");
const shiftRequestsRoutes = require("./routes/shiftRequests");
const itInventoryRoutes = require("./routes/itInventory");
const expenseRoutes = require("./routes/expenses");
const payrollRoutes = require("./routes/payroll");

dotenv.config();

async function ensureDatabaseAndTables() {
  // Connect to MySQL server (no DB yet)
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });
  // Create DB if not exists
  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``
  );
  await connection.end();

  // Connect to the DB
  const db = await mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
  });

  // Read and run schema.sql, one statement at a time
  const schemaPath = path.join(__dirname, "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf8");
  const statements = schema
    .split(";")
    .map((stmt) => stmt.trim())
    .filter((stmt) => stmt.length > 0);
  for (const stmt of statements) {
    await db.query(stmt);
  }

  // Fix leave_requests table if needed
  try {
    await db.query("ALTER TABLE leave_requests ADD COLUMN approved_by INT");
    console.log("Added approved_by column to leave_requests table");
  } catch (error) {
    if (error.code === "ER_DUP_FIELDNAME") {
      console.log("approved_by column already exists in leave_requests table");
    } else {
      console.log("Error checking approved_by column:", error.message);
    }
  }

  try {
    await db.query(
      "ALTER TABLE leave_requests ADD FOREIGN KEY (approved_by) REFERENCES users(id)"
    );
    console.log("Added foreign key constraint for approved_by");
  } catch (error) {
    if (error.code === "ER_DUP_KEYNAME" || error.code === "ER_CANNOT_ADD_FK") {
      console.log("Foreign key constraint already exists for approved_by");
    } else {
      console.log("Error adding foreign key constraint:", error.message);
    }
  }

  // Add other missing columns if needed
  try {
    await db.query(
      "ALTER TABLE leave_requests ADD COLUMN approved_at DATETIME"
    );
    console.log("Added approved_at column to leave_requests table");
  } catch (error) {
    if (error.code === "ER_DUP_FIELDNAME") {
      console.log("approved_at column already exists in leave_requests table");
    } else {
      console.log("Error checking approved_at column:", error.message);
    }
  }

  try {
    await db.query(
      "ALTER TABLE leave_requests ADD COLUMN rejection_reason TEXT"
    );
    console.log("Added rejection_reason column to leave_requests table");
  } catch (error) {
    if (error.code === "ER_DUP_FIELDNAME") {
      console.log(
        "rejection_reason column already exists in leave_requests table"
      );
    } else {
      console.log("Error checking rejection_reason column:", error.message);
    }
  }

  try {
    await db.query(
      "ALTER TABLE leave_requests ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
    );
    console.log("Added updated_at column to leave_requests table");
  } catch (error) {
    if (error.code === "ER_DUP_FIELDNAME") {
      console.log("updated_at column already exists in leave_requests table");
    } else {
      console.log("Error checking updated_at column:", error.message);
    }
  }

  // Add missing columns to users table if needed
  try {
    await db.query("ALTER TABLE users ADD COLUMN name VARCHAR(255)");
    console.log("Added name column to users table");
  } catch (error) {
    if (error.code === "ER_DUP_FIELDNAME") {
      console.log("name column already exists in users table");
    } else {
      console.log("Error checking name column:", error.message);
    }
  }

  try {
    await db.query("ALTER TABLE users ADD COLUMN department VARCHAR(100)");
    console.log("Added department column to users table");
  } catch (error) {
    if (error.code === "ER_DUP_FIELDNAME") {
      console.log("department column already exists in users table");
    } else {
      console.log("Error checking department column:", error.message);
    }
  }

  // Add missing columns to asset_categories table
  try {
    await db.query("ALTER TABLE asset_categories ADD COLUMN parent_id INT");
    console.log("Added parent_id column to asset_categories table");
  } catch (error) {
    if (error.code === "ER_DUP_FIELDNAME") {
      console.log("parent_id column already exists in asset_categories table");
    } else {
      console.log("Error checking parent_id column:", error.message);
    }
  }

  // Add missing columns to vendors table
  try {
    await db.query("ALTER TABLE vendors ADD COLUMN rating INT DEFAULT 5");
    console.log("Added rating column to vendors table");
  } catch (error) {
    if (error.code === "ER_DUP_FIELDNAME") {
      console.log("rating column already exists in vendors table");
    } else {
      console.log("Error checking rating column:", error.message);
    }
  }

  try {
    await db.query("ALTER TABLE vendors ADD COLUMN notes TEXT");
    console.log("Added notes column to vendors table");
  } catch (error) {
    if (error.code === "ER_DUP_FIELDNAME") {
      console.log("notes column already exists in vendors table");
    } else {
      console.log("Error checking notes column:", error.message);
    }
  }

  // Ensure shift_change_requests table exists
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS shift_change_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        current_shift_id INT NOT NULL,
        requested_shift_id INT NOT NULL,
        request_date DATE NOT NULL,
        reason TEXT,
        status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
        approved_by INT,
        approved_at DATETIME,
        rejection_reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (current_shift_id) REFERENCES shifts(id),
        FOREIGN KEY (requested_shift_id) REFERENCES shifts(id),
        FOREIGN KEY (approved_by) REFERENCES users(id)
      )
    `);
    console.log("Ensured shift_change_requests table exists");
  } catch (error) {
    console.log("Error ensuring shift_change_requests table:", error.message);
  }

  // Ensure IT Inventory tables exist
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS asset_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("Ensured asset_categories table exists");
  } catch (error) {
    console.log("Error ensuring asset_categories table:", error.message);
  }

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS vendors (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        contact_person VARCHAR(100),
        email VARCHAR(100),
        phone VARCHAR(20),
        address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("Ensured vendors table exists");
  } catch (error) {
    console.log("Error ensuring vendors table:", error.message);
  }

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS it_assets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        asset_tag VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(200) NOT NULL,
        category_id INT NOT NULL,
        model VARCHAR(100),
        serial_number VARCHAR(100),
        specifications TEXT,
        purchase_date DATE,
        purchase_cost DECIMAL(10,2),
        vendor_id INT,
        warranty_expiry DATE,
        status ENUM('Available', 'Assigned', 'Under Maintenance', 'Retired', 'Lost/Stolen') DEFAULT 'Available',
        location VARCHAR(100),
        notes TEXT,
        created_by INT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES asset_categories(id),
        FOREIGN KEY (vendor_id) REFERENCES vendors(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);
    console.log("Ensured it_assets table exists");
  } catch (error) {
    console.log("Error ensuring it_assets table:", error.message);
  }

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS asset_assignments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        asset_id INT NOT NULL,
        assigned_to INT NOT NULL,
        assigned_by INT NOT NULL,
        assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        returned_at DATETIME,
        return_reason TEXT,
        notes TEXT,
        FOREIGN KEY (asset_id) REFERENCES it_assets(id),
        FOREIGN KEY (assigned_to) REFERENCES users(id),
        FOREIGN KEY (assigned_by) REFERENCES users(id)
      )
    `);
    console.log("Ensured asset_assignments table exists");
  } catch (error) {
    console.log("Error ensuring asset_assignments table:", error.message);
  }

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS maintenance_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        asset_id INT NOT NULL,
        maintenance_type ENUM('Preventive', 'Repair', 'Upgrade', 'Inspection') NOT NULL,
        description TEXT NOT NULL,
        performed_by INT NOT NULL,
        performed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        cost DECIMAL(10,2),
        vendor_id INT,
        next_maintenance_date DATE,
        status ENUM('Scheduled', 'In Progress', 'Completed', 'Cancelled') DEFAULT 'Scheduled',
        notes TEXT,
        FOREIGN KEY (asset_id) REFERENCES it_assets(id),
        FOREIGN KEY (performed_by) REFERENCES users(id),
        FOREIGN KEY (vendor_id) REFERENCES vendors(id)
      )
    `);
    console.log("Ensured maintenance_records table exists");
  } catch (error) {
    console.log("Error ensuring maintenance_records table:", error.message);
  }

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS asset_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        requested_by INT NOT NULL,
        category_id INT NOT NULL,
        asset_name VARCHAR(200) NOT NULL,
        quantity INT DEFAULT 1,
        priority ENUM('Low', 'Medium', 'High', 'Critical') DEFAULT 'Medium',
        reason TEXT NOT NULL,
        required_by_date DATE,
        status ENUM('Pending', 'Approved', 'Rejected', 'Fulfilled') DEFAULT 'Pending',
        approved_by INT,
        approved_at DATETIME,
        rejection_reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (requested_by) REFERENCES users(id),
        FOREIGN KEY (category_id) REFERENCES asset_categories(id),
        FOREIGN KEY (approved_by) REFERENCES users(id)
      )
    `);
    console.log("Ensured asset_requests table exists");
  } catch (error) {
    console.log("Error ensuring asset_requests table:", error.message);
  }

  // Payroll Management Tables
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS employee_salaries (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        base_salary DECIMAL(10,2) NOT NULL,
        allowances DECIMAL(10,2) DEFAULT 0.00,
        deductions DECIMAL(10,2) DEFAULT 0.00,
        effective_date DATE NOT NULL,
        end_date DATE NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE KEY unique_user_effective_date (user_id, effective_date)
      )
    `);
    console.log("Ensured employee_salaries table exists");
  } catch (error) {
    console.log("Error ensuring employee_salaries table:", error.message);
  }

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS payroll_runs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        run_date DATE NOT NULL,
        pay_period_start DATE NOT NULL,
        pay_period_end DATE NOT NULL,
        total_employees INT NOT NULL,
        total_gross_pay DECIMAL(12,2) NOT NULL,
        total_tax DECIMAL(12,2) NOT NULL,
        total_net_pay DECIMAL(12,2) NOT NULL,
        status ENUM('Draft', 'Processing', 'Completed', 'Cancelled') DEFAULT 'Draft',
        created_by INT NOT NULL,
        processed_at DATETIME NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);
    console.log("Ensured payroll_runs table exists");
  } catch (error) {
    console.log("Error ensuring payroll_runs table:", error.message);
  }

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS payroll_entries (
        id INT PRIMARY KEY AUTO_INCREMENT,
        payroll_run_id INT NOT NULL,
        user_id INT NOT NULL,
        base_salary DECIMAL(10,2) NOT NULL,
        allowances DECIMAL(10,2) DEFAULT 0.00,
        deductions DECIMAL(10,2) DEFAULT 0.00,
        overtime_pay DECIMAL(10,2) DEFAULT 0.00,
        bonus DECIMAL(10,2) DEFAULT 0.00,
        gross_pay DECIMAL(10,2) NOT NULL,
        tax_amount DECIMAL(10,2) NOT NULL,
        net_pay DECIMAL(10,2) NOT NULL,
        working_days INT NOT NULL,
        attendance_days INT NOT NULL,
        leave_days INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (payroll_run_id) REFERENCES payroll_runs(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    console.log("Ensured payroll_entries table exists");
  } catch (error) {
    console.log("Error ensuring payroll_entries table:", error.message);
  }

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS tax_rates (
        id INT PRIMARY KEY AUTO_INCREMENT,
        tax_year INT NOT NULL,
        min_income DECIMAL(12,2) NOT NULL,
        max_income DECIMAL(12,2) NULL,
        tax_rate DECIMAL(5,2) NOT NULL,
        tax_bracket_name VARCHAR(50) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_tax_bracket (tax_year, min_income)
      )
    `);
    console.log("Ensured tax_rates table exists");
  } catch (error) {
    console.log("Error ensuring tax_rates table:", error.message);
  }

  console.log("Database and tables ensured.");
  return db;
}

(async () => {
  const db = await ensureDatabaseAndTables();
  await seedUsers(db);

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRoutes(db));
  app.use("/api/admin", adminRoutes(db));
  app.use("/api/messages", messagesRoutes(db));
  app.use("/api/hr", hrRoutes(db));
  app.use("/api/tasks", tasksRoutes(db));
  app.use("/api/leave", leaveRoutes(db));
  app.use("/api/shift-requests", shiftRequestsRoutes(db));
  app.use("/api/it-inventory", itInventoryRoutes(db));
  app.use("/api/expenses", expenseRoutes(db));
  app.use("/api/payroll", payrollRoutes(db));

  // Create HTTP server and Socket.IO server
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // Store online users: { userId: socketId }
  const onlineUsers = {};

  io.on("connection", (socket) => {
    // User joins with their userId
    socket.on("join", (userId) => {
      onlineUsers[userId] = socket.id;
      io.emit("online-users", Object.keys(onlineUsers));
    });

    // Handle sending a message
    socket.on("send-message", (data) => {
      // data: { to, from, content, groupId }
      if (data.to) {
        // Direct message
        const toSocket = onlineUsers[data.to];
        if (toSocket) {
          io.to(toSocket).emit("receive-message", data);
        }
      } else if (data.groupId) {
        // Group message: emit to all group members except sender
        // (Group logic to be implemented)
        io.emit("receive-group-message", data);
      }
    });

    // Typing indicator
    socket.on("typing", (data) => {
      // data: { to, from }
      const toSocket = onlineUsers[data.to];
      if (toSocket) {
        io.to(toSocket).emit("typing", data);
      }
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      for (const [userId, sockId] of Object.entries(onlineUsers)) {
        if (sockId === socket.id) {
          delete onlineUsers[userId];
          break;
        }
      }
      io.emit("online-users", Object.keys(onlineUsers));
    });
  });

  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT} (with Socket.IO)`);
  });
})();
