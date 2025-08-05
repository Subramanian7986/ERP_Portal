const mysql = require('mysql2/promise');

async function checkUsers() {
  let connection;
  try {
    console.log("Connecting to database...");
    connection = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "",
      database: "erp_portal",
    });

    console.log("Connected to erp_portal database");

    // Get users with different roles
    const [users] = await connection.execute(
      "SELECT id, username, role FROM users WHERE role IN ('HR', 'Employee', 'Developer') LIMIT 10"
    );
    
    console.log("Available users:");
    console.log(users);

    // Check if hr1 exists specifically
    const [hr1User] = await connection.execute(
      "SELECT id, username, role FROM users WHERE username = 'hr1'"
    );
    
    if (hr1User.length > 0) {
      console.log("hr1 user found:", hr1User[0]);
    } else {
      console.log("hr1 user not found");
    }

  } catch (error) {
    console.error("❌ Error checking users:", error);
  } finally {
    if (connection) {
      await connection.end();
      console.log("Database connection closed");
    }
  }
}

// Run the script
checkUsers(); 