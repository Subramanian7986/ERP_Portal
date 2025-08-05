const mysql = require("mysql2/promise");

async function fixNetPay() {
  const db = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "",
    database: "erp_portal",
  });

  try {
    console.log("🔧 Fixing net_pay calculations...\n");

    // Update net_pay for all payroll entries
    const [result] = await db.query(`
      UPDATE payroll_entries 
      SET net_pay = gross_pay - tax_amount - deductions
      WHERE net_pay = 0 OR net_pay IS NULL
    `);

    console.log(`✅ Updated ${result.affectedRows} payroll entries`);

    // Show sample data after fix
    const [rows] = await db.query(`
      SELECT 
        id, 
        user_id,
        base_salary, 
        allowances, 
        deductions,
        gross_pay, 
        tax_amount,
        net_pay
      FROM payroll_entries 
      LIMIT 5
    `);

    console.log("\n📊 Sample data after fix:");
    rows.forEach((row, index) => {
      console.log(`\n--- Payslip ${index + 1} ---`);
      console.log(`ID: ${row.id}`);
      console.log(`User ID: ${row.user_id}`);
      console.log(`Base Salary: ${row.base_salary}`);
      console.log(`Allowances: ${row.allowances}`);
      console.log(`Deductions: ${row.deductions}`);
      console.log(`Gross Pay: ${row.gross_pay}`);
      console.log(`Tax Amount: ${row.tax_amount}`);
      console.log(`Net Pay: ${row.net_pay}`);

      // Verify calculation
      const calculatedNet =
        parseFloat(row.gross_pay) -
        parseFloat(row.tax_amount) -
        parseFloat(row.deductions);
      console.log(`Calculated Net: ${calculatedNet}`);
    });
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await db.end();
  }
}

fixNetPay();
