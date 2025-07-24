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
    "Procurement",
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

module.exports = async function seedUsers(db) {
  await seedPermissions(db);
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
    "Procurement",
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
