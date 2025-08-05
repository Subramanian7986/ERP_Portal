const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function checkPassword() {
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

    // Get hr1 user's password hash
    const [users] = await connection.execute(
      "SELECT id, username, password_hash FROM users WHERE username = 'hr1'"
    );
    
    if (users.length > 0) {
      const user = users[0];
      console.log("hr1 user found:");
      console.log("ID:", user.id);
      console.log("Username:", user.username);
      console.log("Password Hash:", user.password_hash);
      
      // Test if Test@1234 matches the hash
      const testPassword = 'Test@1234';
      const isValid = await bcrypt.compare(testPassword, user.password_hash);
      console.log(`Password '${testPassword}' is valid:`, isValid);
      
      // Test other common passwords
      const commonPasswords = ['admin123', 'password', '123456', 'admin'];
      for (const pwd of commonPasswords) {
        const valid = await bcrypt.compare(pwd, user.password_hash);
        console.log(`Password '${pwd}' is valid:`, valid);
      }
    } else {
      console.log("hr1 user not found");
    }

  } catch (error) {
    console.error("❌ Error checking password:", error);
  } finally {
    if (connection) {
      await connection.end();
      console.log("Database connection closed");
    }
  }
}

// Run the script
checkPassword(); 