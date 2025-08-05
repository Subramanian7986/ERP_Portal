const bcrypt = require("bcryptjs");

async function seedUsers(db) {
  // Check if any users exist
  const [users] = await db.query("SELECT COUNT(*) as count FROM users");
  if (users[0].count > 0) {
    console.log("Users already seeded.");
    return;
  }
  // Hash the password
  const password = "Test@1234";
  const hash = await bcrypt.hash(password, 10);
  // Insert a default admin user
  await db.query(
    "INSERT INTO users (username, email, password_hash, role, is_active, mfa_enabled) VALUES (?, ?, ?, ?, ?, ?)",
    ["admin", "admin@example.com", hash, "Admin", true, false]
  );
  // Insert one user for each role
  const roles = [
    "HR",
    "PM",
    "Developer",
    "Employee",
    "Finance",
    "CRM",
    "Client",

    "IT",
  ];
  for (const role of roles) {
    const username = role.toLowerCase();
    const email = `${username}@example.com`;
    const name = `${role} User`;
    const department =
      role === "HR"
        ? "Human Resources"
        : role === "PM"
        ? "Project Management"
        : role === "Developer"
        ? "Development"
        : role === "Employee"
        ? "General"
        : role === "Finance"
        ? "Finance"
        : role === "CRM"
        ? "Customer Relations"
        : role === "Client"
        ? "External"
        : role === "IT"
        ? "Information Technology"
        : "General";

    await db.query(
      "INSERT INTO users (username, email, password_hash, role, is_active, mfa_enabled, name, department) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [username, email, hash, role, true, false, name, department]
    );
  }
  console.log("Seeded default users for all roles. Password: Test@1234");
}

async function seedPermissions(db) {
  const permissions = [
    { name: "view_users", description: "View user list" },
    { name: "edit_users", description: "Edit user details" },
    { name: "delete_users", description: "Delete users" },
    { name: "add_users", description: "Add new users" },
    { name: "reset_passwords", description: "Reset user passwords" },
    { name: "view_roles", description: "View roles" },
    { name: "edit_roles", description: "Edit roles" },
    { name: "assign_roles", description: "Assign roles to users" },
    { name: "view_permissions", description: "View permissions" },
    { name: "edit_permissions", description: "Edit permissions" },
    {
      name: "approve_requests",
      description: "Approve leave/expense/PO requests",
    },
    { name: "view_reports", description: "View reports and analytics" },
    {
      name: "manage_notifications",
      description: "Create and manage notifications",
    },
    {
      name: "view_system_health",
      description: "View system health and status",
    },
    { name: "manage_settings", description: "Manage system settings" },
  ];
  for (const perm of permissions) {
    const [rows] = await db.query("SELECT id FROM permissions WHERE name = ?", [
      perm.name,
    ]);
    if (rows.length === 0) {
      await db.query(
        "INSERT INTO permissions (name, description) VALUES (?, ?)",
        [perm.name, perm.description]
      );
    }
  }
}

async function seedCompanyCalendar(db) {
  for (let year = 2026; year <= 2045; year++) {
    const start = new Date(`${year}-01-01`);
    const end = new Date(`${year}-12-31`);
    let date = new Date(start);
    while (date <= end) {
      const day = date.getDay(); // 0 = Sunday, 6 = Saturday
      const isWorkingDay = day !== 0 && day !== 6; // Mon-Fri
      let holidayName = null;
      if (day === 0) holidayName = "Weekend";
      await db.query(
        `INSERT IGNORE INTO company_calendar (date, is_working_day, holiday_name) VALUES (?, ?, ?)`,
        [date.toISOString().slice(0, 10), isWorkingDay, holidayName]
      );
      date.setDate(date.getDate() + 1);
    }
    console.log("Company calendar seeded for year", year);
  }
}

async function fillHolidays(db) {
  const holidays = [
    { md: "01-01", name: "New Year's Day" },
    { md: "01-26", name: "Republic Day" },
    { md: "03-08", name: "International Women's Day" },
    { md: "05-01", name: "Labour Day" },
    { md: "08-15", name: "Independence Day" },
    { md: "10-02", name: "Gandhi Jayanti" },
    { md: "12-25", name: "Christmas" },
    { md: "11-14", name: "Children's Day" },
    { md: "09-05", name: "Teacher's Day" },
    { md: "12-31", name: "New Year's Eve" },
    // Add more as needed
  ];

  for (let year = 2026; year <= 2045; year++) {
    for (const holiday of holidays) {
      const date = `${year}-${holiday.md}`;
      await db.query(
        `UPDATE company_calendar SET is_working_day = 0, holiday_name = ? WHERE date = ?`,
        [holiday.name, date]
      );
    }
  }
  console.log("Holidays filled for years 2026-2045");
}

async function seedShifts(db) {
  // 1. Insert standard shifts if not already present
  const shifts = [
    { name: "Morning", start: "09:00:00", end: "17:00:00" },
    { name: "Evening", start: "13:00:00", end: "21:00:00" },
    { name: "Night", start: "21:00:00", end: "05:00:00" },
  ];
  for (const shift of shifts) {
    await db.query(
      `INSERT IGNORE INTO shifts (name, start_time, end_time) VALUES (?, ?, ?)`,
      [shift.name, shift.start, shift.end]
    );
  }

  // 2. Get all non-admin users
  const [users] = await db.query(`SELECT id FROM users WHERE role <> 'Admin'`);
  // 3. Get all shift ids
  const [shiftRows] = await db.query(`SELECT id FROM shifts`);
  const shiftIds = shiftRows.map((s) => s.id);

  // 4. Assign a random shift for today to each user
  const today = new Date().toISOString().slice(0, 10);
  for (const user of users) {
    const shiftId = shiftIds[Math.floor(Math.random() * shiftIds.length)];
    await db.query(
      `INSERT IGNORE INTO user_shifts (user_id, shift_id, date) VALUES (?, ?, ?)`,
      [user.id, shiftId, today]
    );
  }
  console.log("Shifts assigned to all non-admin users for today.");
}

async function seedTasks(db) {
  // Get HR user ID for creating tasks
  const [hrUsers] = await db.query(
    "SELECT id FROM users WHERE role = 'HR' LIMIT 1"
  );
  if (hrUsers.length === 0) {
    console.log("No HR user found for seeding tasks.");
    return;
  }
  const hrUserId = hrUsers[0].id;

  // Get developer user IDs for assignments
  const [developers] = await db.query(
    "SELECT id FROM users WHERE role = 'Developer'"
  );
  if (developers.length === 0) {
    console.log("No developers found for seeding task assignments.");
    return;
  }

  // Sample tasks
  const sampleTasks = [
    {
      title: "Implement User Authentication System",
      description:
        "Create a secure authentication system with JWT tokens, password hashing, and role-based access control.",
      priority: "High",
      status: "In Progress",
      due_date: "2026-02-15",
    },
    {
      title: "Design Database Schema",
      description:
        "Design and implement the database schema for the ERP system with proper relationships and constraints.",
      priority: "Critical",
      status: "Completed",
      due_date: "2026-01-30",
    },
    {
      title: "Create Frontend Dashboard",
      description:
        "Develop responsive dashboard components for different user roles with modern UI/UX design.",
      priority: "Medium",
      status: "Pending",
      due_date: "2026-03-01",
    },
    {
      title: "API Documentation",
      description:
        "Create comprehensive API documentation with examples and testing endpoints.",
      priority: "Low",
      status: "Pending",
      due_date: "2026-03-15",
    },
    {
      title: "Performance Optimization",
      description:
        "Optimize application performance by implementing caching, database indexing, and code optimization.",
      priority: "High",
      status: "On Hold",
      due_date: "2026-02-28",
    },
    {
      title: "Security Audit",
      description:
        "Conduct a comprehensive security audit and implement necessary security measures.",
      priority: "Critical",
      status: "Pending",
      due_date: "2026-02-10",
    },
    {
      title: "Mobile App Development",
      description:
        "Develop a mobile application version of the ERP system for iOS and Android platforms.",
      priority: "Medium",
      status: "Pending",
      due_date: "2026-04-01",
    },
    {
      title: "Integration Testing",
      description:
        "Perform comprehensive integration testing across all modules and systems.",
      priority: "High",
      status: "Pending",
      due_date: "2026-03-20",
    },
  ];

  // Insert tasks
  for (const task of sampleTasks) {
    const [result] = await db.query(
      `INSERT INTO tasks (title, description, priority, status, due_date, created_by) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        task.title,
        task.description,
        task.priority,
        task.status,
        task.due_date,
        hrUserId,
      ]
    );

    const taskId = result.insertId;

    // Assign tasks to random developers
    const numAssignments = Math.floor(Math.random() * 3) + 1; // 1-3 assignments per task
    const shuffledDevelopers = developers.sort(() => 0.5 - Math.random());

    for (let i = 0; i < Math.min(numAssignments, developers.length); i++) {
      const developerId = shuffledDevelopers[i].id;
      const notes = `Assigned by HR for ${task.priority.toLowerCase()} priority task.`;

      await db.query(
        `INSERT INTO task_assignments (task_id, assigned_to, assigned_by, notes) 
         VALUES (?, ?, ?, ?)`,
        [taskId, developerId, hrUserId, notes]
      );
    }
  }

  console.log(`Seeded ${sampleTasks.length} tasks with assignments.`);
}

async function seedLeaveBalances(db) {
  const currentYear = new Date().getFullYear();

  // Get all non-admin users
  const [users] = await db.query("SELECT id FROM users WHERE role != 'Admin'");

  for (const user of users) {
    // Check if leave balance already exists for this user and year
    const [existing] = await db.query(
      "SELECT id FROM leave_balances WHERE user_id = ? AND year = ?",
      [user.id, currentYear]
    );

    if (existing.length === 0) {
      // Create leave balance for the current year
      await db.query(
        "INSERT INTO leave_balances (user_id, year, total_leave_days) VALUES (?, ?, 30)",
        [user.id, currentYear]
      );
    }
  }

  console.log(
    `Seeded leave balances for ${users.length} users for year ${currentYear}.`
  );
}

async function updateExistingUsers(db) {
  // Update existing users with name and department if they don't have them
  const [users] = await db.query(
    "SELECT id, username, role FROM users WHERE name IS NULL OR department IS NULL"
  );

  for (const user of users) {
    const name = `${user.role} User`;
    const department =
      user.role === "HR"
        ? "Human Resources"
        : user.role === "PM"
        ? "Project Management"
        : user.role === "Developer"
        ? "Development"
        : user.role === "Employee"
        ? "General"
        : user.role === "Finance"
        ? "Finance"
        : user.role === "CRM"
        ? "Customer Relations"
        : user.role === "Client"
        ? "External"
        : user.role === "IT"
        ? "Information Technology"
        : user.role === "Admin"
        ? "Administration"
        : "General";

    await db.query("UPDATE users SET name = ?, department = ? WHERE id = ?", [
      name,
      department,
      user.id,
    ]);
  }

  if (users.length > 0) {
    console.log(
      `Updated ${users.length} existing users with name and department.`
    );
  }
}

async function seedShiftChangeRequests(db) {
  // Get non-admin users and shifts
  const [users] = await db.query(
    "SELECT id FROM users WHERE role != 'Admin' LIMIT 5"
  );
  const [shifts] = await db.query("SELECT id FROM shifts");

  if (users.length === 0 || shifts.length === 0) {
    console.log("No users or shifts found for seeding shift change requests");
    return;
  }

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const sampleRequests = [
    {
      user_id: users[0].id,
      current_shift_id: shifts[0].id,
      requested_shift_id: shifts[1].id,
      request_date: tomorrow.toISOString().slice(0, 10),
      reason: "Need to attend a family event in the evening",
      status: "Pending",
    },
    {
      user_id: users[1].id,
      current_shift_id: shifts[1].id,
      requested_shift_id: shifts[2].id,
      request_date: tomorrow.toISOString().slice(0, 10),
      reason: "Medical appointment in the morning",
      status: "Approved",
    },
    {
      user_id: users[2].id,
      current_shift_id: shifts[2].id,
      requested_shift_id: shifts[0].id,
      request_date: tomorrow.toISOString().slice(0, 10),
      reason: "Personal emergency",
      status: "Rejected",
    },
  ];

  for (const request of sampleRequests) {
    // Check if request already exists
    const [existing] = await db.query(
      "SELECT id FROM shift_change_requests WHERE user_id = ? AND request_date = ?",
      [request.user_id, request.request_date]
    );

    if (existing.length === 0) {
      await db.query(
        `INSERT INTO shift_change_requests 
         (user_id, current_shift_id, requested_shift_id, request_date, reason, status) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          request.user_id,
          request.current_shift_id,
          request.requested_shift_id,
          request.request_date,
          request.reason,
          request.status,
        ]
      );
    }
  }

  console.log(`Seeded ${sampleRequests.length} shift change requests.`);
}

async function seedITInventory(db) {
  // Get IT user for creating assets
  const [itUsers] = await db.query(
    "SELECT id FROM users WHERE role = 'IT' LIMIT 1"
  );
  if (itUsers.length === 0) {
    console.log("No IT users found for seeding IT inventory");
    return;
  }
  const itUserId = itUsers[0].id;

  // Seed asset categories
  const categories = [
    { name: "Laptops", description: "Portable computers and laptops" },
    { name: "Desktops", description: "Desktop computers and workstations" },
    { name: "Monitors", description: "Computer monitors and displays" },
    { name: "Printers", description: "Printers and multifunction devices" },
    {
      name: "Network Equipment",
      description: "Routers, switches, and network devices",
    },
    {
      name: "Peripherals",
      description: "Keyboards, mice, and other accessories",
    },
    { name: "Software", description: "Software licenses and applications" },
    {
      name: "Gaming Laptops",
      description: "High-performance gaming laptops",
      parent_id: null,
    },
    {
      name: "Business Laptops",
      description: "Professional business laptops",
      parent_id: null,
    },
    {
      name: "Gaming Desktops",
      description: "High-performance gaming desktops",
      parent_id: null,
    },
    {
      name: "Workstation Desktops",
      description: "Professional workstation desktops",
      parent_id: null,
    },
  ];

  for (const category of categories) {
    const [existing] = await db.query(
      "SELECT id FROM asset_categories WHERE name = ?",
      [category.name]
    );
    if (existing.length === 0) {
      await db.query(
        "INSERT INTO asset_categories (name, description, parent_id) VALUES (?, ?, ?)",
        [category.name, category.description, category.parent_id]
      );
    }
  }

  // Seed vendors
  const vendors = [
    {
      name: "TechCorp Solutions",
      contact_person: "John Smith",
      email: "john@techcorp.com",
      phone: "+1-555-0101",
      address: "123 Tech Street, Silicon Valley, CA 94025",
      rating: 5,
      notes:
        "Excellent service and support. Fast delivery and competitive pricing.",
    },
    {
      name: "Digital Equipment Co.",
      contact_person: "Sarah Johnson",
      email: "sarah@digitalequip.com",
      phone: "+1-555-0102",
      address: "456 Digital Ave, Austin, TX 73301",
      rating: 4,
      notes: "Good quality products. Sometimes delayed shipping.",
    },
    {
      name: "Office Supplies Plus",
      contact_person: "Mike Wilson",
      email: "mike@officesupplies.com",
      phone: "+1-555-0103",
      address: "789 Office Blvd, New York, NY 10001",
      rating: 3,
      notes: "Basic office supplies. Limited IT equipment selection.",
    },
    {
      name: "Premium IT Solutions",
      contact_person: "Lisa Chen",
      email: "lisa@premiumit.com",
      phone: "+1-555-0104",
      address: "321 Premium Way, Seattle, WA 98101",
      rating: 5,
      notes: "Premium quality equipment. Excellent warranty support.",
    },
    {
      name: "Budget Tech Store",
      contact_person: "David Brown",
      email: "david@budgettech.com",
      phone: "+1-555-0105",
      address: "654 Budget Lane, Miami, FL 33101",
      rating: 2,
      notes: "Low prices but inconsistent quality. Limited support.",
    },
  ];

  for (const vendor of vendors) {
    const [existing] = await db.query("SELECT id FROM vendors WHERE name = ?", [
      vendor.name,
    ]);
    if (existing.length === 0) {
      await db.query(
        "INSERT INTO vendors (name, contact_person, email, phone, address, rating, notes) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          vendor.name,
          vendor.contact_person,
          vendor.email,
          vendor.phone,
          vendor.address,
          vendor.rating,
          vendor.notes,
        ]
      );
    }
  }

  // Get category and vendor IDs
  const [categoryRows] = await db.query(
    "SELECT id FROM asset_categories WHERE name IN ('Laptops', 'Desktops', 'Monitors')"
  );
  const [vendorRows] = await db.query("SELECT id FROM vendors LIMIT 1");

  if (categoryRows.length === 0 || vendorRows.length === 0) {
    console.log("No categories or vendors found for seeding assets");
    return;
  }

  // Seed sample assets
  const assets = [
    {
      asset_tag: "LAP001",
      name: "Dell Latitude 5520",
      category_id: categoryRows[0].id,
      model: "Latitude 5520",
      serial_number: "DL123456789",
      specifications: "Intel i7, 16GB RAM, 512GB SSD",
      purchase_date: "2023-01-15",
      purchase_cost: 1200.0,
      vendor_id: vendorRows[0].id,
      warranty_expiry: "2026-01-15",
      status: "Available",
      location: "IT Storage",
    },
    {
      asset_tag: "DESK001",
      name: "HP EliteDesk 800",
      category_id: categoryRows[1].id,
      model: "EliteDesk 800 G5",
      serial_number: "HP987654321",
      specifications: "Intel i5, 8GB RAM, 256GB SSD",
      purchase_date: "2023-02-20",
      purchase_cost: 800.0,
      vendor_id: vendorRows[0].id,
      warranty_expiry: "2026-02-20",
      status: "Assigned",
      location: "Office Floor 2",
    },
    {
      asset_tag: "MON001",
      name: 'Dell 24" Monitor',
      category_id: categoryRows[2].id,
      model: "P2419H",
      serial_number: "DL456789123",
      specifications: '24" Full HD, IPS Panel',
      purchase_date: "2023-03-10",
      purchase_cost: 250.0,
      vendor_id: vendorRows[0].id,
      warranty_expiry: "2026-03-10",
      status: "Available",
      location: "IT Storage",
    },
  ];

  for (const asset of assets) {
    const [existing] = await db.query(
      "SELECT id FROM it_assets WHERE asset_tag = ?",
      [asset.asset_tag]
    );
    if (existing.length === 0) {
      await db.query(
        `INSERT INTO it_assets 
         (asset_tag, name, category_id, model, serial_number, specifications, 
          purchase_date, purchase_cost, vendor_id, warranty_expiry, status, location, created_by) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          asset.asset_tag,
          asset.name,
          asset.category_id,
          asset.model,
          asset.serial_number,
          asset.specifications,
          asset.purchase_date,
          asset.purchase_cost,
          asset.vendor_id,
          asset.warranty_expiry,
          asset.status,
          asset.location,
          itUserId,
        ]
      );
    }
  }

  console.log(
    "Seeded IT inventory data (categories, vendors, and sample assets)."
  );
}

async function seedAssetRequests(db) {
  // Get some users and categories for sample requests
  const [userRows] = await db.query(
    "SELECT id FROM users WHERE role != 'Admin' LIMIT 5"
  );
  const [categoryRows] = await db.query(
    "SELECT id FROM asset_categories LIMIT 3"
  );

  if (userRows.length === 0 || categoryRows.length === 0) {
    console.log("No users or categories found for asset requests seeding.");
    return;
  }

  const requests = [
    {
      requested_by: userRows[0].id,
      category_id: categoryRows[0].id,
      asset_name: "Dell Latitude 5530 Laptop",
      quantity: 1,
      priority: "High",
      reason:
        "Current laptop is 5 years old and frequently crashes during development work",
      required_by_date: "2024-02-15",
      status: "Pending",
    },
    {
      requested_by: userRows[1].id,
      category_id: categoryRows[1].id,
      asset_name: "Logitech MX Master 3 Mouse",
      quantity: 2,
      priority: "Medium",
      reason: "Need ergonomic mice for long coding sessions",
      required_by_date: "2024-03-01",
      status: "Approved",
    },
    {
      requested_by: userRows[2].id,
      category_id: categoryRows[0].id,
      asset_name: "MacBook Pro 16-inch",
      quantity: 1,
      priority: "Critical",
      reason: "Required for iOS development and testing",
      required_by_date: "2024-01-30",
      status: "Rejected",
    },
    {
      requested_by: userRows[3].id,
      category_id: categoryRows[2].id,
      asset_name: "Samsung 27-inch 4K Monitor",
      quantity: 1,
      priority: "Medium",
      reason: "Need higher resolution for design work",
      required_by_date: "2024-02-28",
      status: "Fulfilled",
    },
  ];

  for (const request of requests) {
    const [existing] = await db.query(
      "SELECT id FROM asset_requests WHERE asset_name = ? AND requested_by = ?",
      [request.asset_name, request.requested_by]
    );
    if (existing.length === 0) {
      await db.query(
        `INSERT INTO asset_requests 
         (requested_by, category_id, asset_name, quantity, priority, reason, required_by_date, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          request.requested_by,
          request.category_id,
          request.asset_name,
          request.quantity,
          request.priority,
          request.reason,
          request.required_by_date,
          request.status,
        ]
      );
    }
  }

  console.log("Seeded sample asset requests.");
}

async function seedMaintenanceRecords(db) {
  // Get IT user and some assets for sample maintenance records
  const [itUserRows] = await db.query(
    "SELECT id FROM users WHERE role = 'IT' LIMIT 1"
  );
  const [assetRows] = await db.query("SELECT id FROM it_assets LIMIT 3");
  const [vendorRows] = await db.query("SELECT id FROM vendors LIMIT 2");

  if (itUserRows.length === 0 || assetRows.length === 0) {
    console.log("No IT users or assets found for maintenance records seeding.");
    return;
  }

  const itUserId = itUserRows[0].id;

  const maintenanceRecords = [
    {
      asset_id: assetRows[0].id,
      maintenance_type: "Preventive",
      description: "Regular system cleanup and software updates",
      performed_by: itUserId,
      cost: 0,
      vendor_id: null,
      next_maintenance_date: "2024-04-15",
      status: "Completed",
      notes: "System optimized and all software updated to latest versions",
    },
    {
      asset_id: assetRows[1].id,
      maintenance_type: "Repair",
      description: "Replace faulty keyboard and clean internal components",
      performed_by: itUserId,
      cost: 150.0,
      vendor_id: vendorRows[0].id,
      next_maintenance_date: "2024-06-15",
      status: "In Progress",
      notes: "Keyboard replacement in progress, internal cleaning completed",
    },
    {
      asset_id: assetRows[2].id,
      maintenance_type: "Upgrade",
      description: "Upgrade RAM from 8GB to 16GB and replace SSD",
      performed_by: itUserId,
      cost: 300.0,
      vendor_id: vendorRows[0].id,
      next_maintenance_date: "2025-01-15",
      status: "Scheduled",
      notes: "Scheduled for next week, parts ordered",
    },
  ];

  for (const record of maintenanceRecords) {
    const [existing] = await db.query(
      "SELECT id FROM maintenance_records WHERE asset_id = ? AND description = ?",
      [record.asset_id, record.description]
    );
    if (existing.length === 0) {
      await db.query(
        `INSERT INTO maintenance_records 
         (asset_id, maintenance_type, description, performed_by, cost, vendor_id, next_maintenance_date, status, notes) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          record.asset_id,
          record.maintenance_type,
          record.description,
          record.performed_by,
          record.cost,
          record.vendor_id,
          record.next_maintenance_date,
          record.status,
          record.notes,
        ]
      );
    }
  }

  console.log("Seeded sample maintenance records.");
}

async function seedExpenseCategories(db) {
  const categories = [
    {
      name: "Travel",
      description: "Business travel expenses",
      budget_limit: 5000.0,
    },
    {
      name: "Office Supplies",
      description: "Office equipment and supplies",
      budget_limit: 2000.0,
    },
    {
      name: "Equipment",
      description: "IT equipment and hardware",
      budget_limit: 10000.0,
    },
    {
      name: "Software",
      description: "Software licenses and subscriptions",
      budget_limit: 3000.0,
    },
    {
      name: "Training",
      description: "Professional development and training",
      budget_limit: 2500.0,
    },
    {
      name: "Marketing",
      description: "Marketing and advertising expenses",
      budget_limit: 5000.0,
    },
    {
      name: "Utilities",
      description: "Office utilities and services",
      budget_limit: 1500.0,
    },
    {
      name: "Meals",
      description: "Business meals and entertainment",
      budget_limit: 1000.0,
    },
    {
      name: "Transportation",
      description: "Local transportation costs",
      budget_limit: 800.0,
    },
    {
      name: "Other",
      description: "Miscellaneous expenses",
      budget_limit: 1000.0,
    },
  ];

  for (const category of categories) {
    const [existing] = await db.query(
      "SELECT id FROM expense_categories WHERE name = ?",
      [category.name]
    );
    if (existing.length === 0) {
      await db.query(
        "INSERT INTO expense_categories (name, description, budget_limit) VALUES (?, ?, ?)",
        [category.name, category.description, category.budget_limit]
      );
    }
  }

  console.log("Seeded expense categories.");
}

async function seedExpenseClaims(db) {
  // Get some users and categories for sample data
  const [users] = await db.query(
    "SELECT id FROM users WHERE role != 'Admin' LIMIT 5"
  );
  const [categories] = await db.query(
    "SELECT id FROM expense_categories LIMIT 5"
  );

  if (users.length === 0 || categories.length === 0) {
    console.log("No users or categories found for seeding expense claims");
    return;
  }

  const sampleClaims = [
    {
      user_id: users[0].id,
      category_id: categories[0].id,
      title: "Business Trip to Conference",
      description: "Travel expenses for annual tech conference",
      amount: 1250.0,
      expense_date: "2024-12-15",
      status: "Approved",
    },
    {
      user_id: users[1].id,
      category_id: categories[1].id,
      title: "Office Supplies Purchase",
      description: "Printer paper, pens, and other office supplies",
      amount: 85.5,
      expense_date: "2024-12-10",
      status: "Pending",
    },
    {
      user_id: users[2].id,
      category_id: categories[2].id,
      title: "New Laptop for Development",
      description: "High-performance laptop for software development",
      amount: 2200.0,
      expense_date: "2024-12-05",
      status: "Rejected",
    },
    {
      user_id: users[0].id,
      category_id: categories[3].id,
      title: "Software License Renewal",
      description: "Annual renewal for development tools",
      amount: 450.0,
      expense_date: "2024-12-01",
      status: "Paid",
    },
    {
      user_id: users[1].id,
      category_id: categories[4].id,
      title: "Online Course Subscription",
      description: "Professional development course subscription",
      amount: 299.0,
      expense_date: "2024-11-28",
      status: "Approved",
    },
  ];

  for (const claim of sampleClaims) {
    const [existing] = await db.query(
      "SELECT id FROM expense_claims WHERE user_id = ? AND title = ?",
      [claim.user_id, claim.title]
    );

    if (existing.length === 0) {
      await db.query(
        `INSERT INTO expense_claims 
         (user_id, category_id, title, description, amount, expense_date, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          claim.user_id,
          claim.category_id,
          claim.title,
          claim.description,
          claim.amount,
          claim.expense_date,
          claim.status,
        ]
      );
    }
  }

  console.log("Seeded sample expense claims.");
}

async function seedEmployeeSalaries(db) {
  // Get all non-admin users
  const [users] = await db.query(
    "SELECT id, role FROM users WHERE role != 'Admin' AND is_active = 1"
  );

  const salaryData = [
    { role: "HR", base_salary: 4500, allowances: 500, deductions: 200 },
    { role: "IT", base_salary: 5000, allowances: 600, deductions: 250 },
    { role: "Finance", base_salary: 4800, allowances: 550, deductions: 220 },
    { role: "PM", base_salary: 5200, allowances: 700, deductions: 300 },
    { role: "CRM", base_salary: 4200, allowances: 400, deductions: 180 },
    { role: "Client", base_salary: 3800, allowances: 300, deductions: 150 },
    { role: "Employee", base_salary: 3500, allowances: 250, deductions: 120 },
  ];

  for (const user of users) {
    const salaryInfo =
      salaryData.find((s) => s.role === user.role) ||
      salaryData.find((s) => s.role === "Employee");

    if (salaryInfo) {
      // Check if salary record already exists
      const [existing] = await db.query(
        "SELECT id FROM employee_salaries WHERE user_id = ?",
        [user.id]
      );

      if (existing.length === 0) {
        await db.query(
          `
          INSERT INTO employee_salaries (
            user_id, base_salary, allowances, deductions, 
            effective_date, currency
          ) VALUES (?, ?, ?, ?, CURDATE(), 'USD')
        `,
          [
            user.id,
            salaryInfo.base_salary,
            salaryInfo.allowances,
            salaryInfo.deductions,
          ]
        );
      }
    }
  }

  console.log(`Seeded employee salaries for ${users.length} users.`);
}

async function seedTaxRates(db) {
  const taxRates = [
    {
      tax_year: 2024,
      min_income: 0,
      max_income: 50000,
      tax_rate: 15.0,
      tax_bracket_name: "Basic Rate",
    },
    {
      tax_year: 2024,
      min_income: 50001,
      max_income: 100000,
      tax_rate: 25.0,
      tax_bracket_name: "Higher Rate",
    },
    {
      tax_year: 2024,
      min_income: 100001,
      max_income: null,
      tax_rate: 35.0,
      tax_bracket_name: "Additional Rate",
    },
  ];

  for (const rate of taxRates) {
    const [existing] = await db.query(
      "SELECT id FROM tax_rates WHERE tax_year = ? AND min_income = ?",
      [rate.tax_year, rate.min_income]
    );

    if (existing.length === 0) {
      await db.query(
        `
        INSERT INTO tax_rates (tax_year, min_income, max_income, tax_rate, tax_bracket_name)
        VALUES (?, ?, ?, ?, ?)
      `,
        [
          rate.tax_year,
          rate.min_income,
          rate.max_income,
          rate.tax_rate,
          rate.tax_bracket_name,
        ]
      );
    }
  }

  console.log("Seeded tax rates for 2024.");
}

module.exports = async function seedUsers(db) {
  await seedPermissions(db);
  await seedCompanyCalendar(db);
  await fillHolidays(db);
  await seedShifts(db);
  await seedTasks(db);
  await seedLeaveBalances(db);
  await updateExistingUsers(db);
  await seedShiftChangeRequests(db);
  await seedITInventory(db);
  await seedAssetRequests(db);
  await seedMaintenanceRecords(db);
  await seedExpenseCategories(db);
  await seedExpenseClaims(db);
  await seedEmployeeSalaries(db);
  await seedTaxRates(db);
  // Check if any users exist
  const [users] = await db.query("SELECT COUNT(*) as count FROM users");
  if (users[0].count > 0) {
    console.log("Users already seeded.");
    return;
  }
  // Hash the password
  const password = "Test@1234";
  const hash = await bcrypt.hash(password, 10);
  // Insert a default admin user
  await db.query(
    "INSERT INTO users (username, email, password_hash, role, is_active, mfa_enabled, name, department) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      "admin",
      "admin@example.com",
      hash,
      "Admin",
      true,
      false,
      "Admin User",
      "Administration",
    ]
  );
  // Insert one user for each role
  const roles = [
    "HR",
    "PM",
    "Developer",
    "Employee",
    "Finance",
    "CRM",
    "Client",

    "IT",
  ];
  for (const role of roles) {
    const username = role.toLowerCase();
    const email = `${username}@example.com`;
    await db.query(
      "INSERT INTO users (username, email, password_hash, role, is_active, mfa_enabled) VALUES (?, ?, ?, ?, ?, ?)",
      [username, email, hash, role, true, false]
    );
  }
  console.log("Seeded default users for all roles. Password: Test@1234");
};
