const mysql = require("mysql2/promise");

async function checkPayslipData() {
  const db = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "",
    database: "erp_portal",
  });

  try {
    console.log("🔍 Checking payslip data...\n");

    // First, let's see the table structure
    console.log("📋 Checking table structure...");
    const [columns] = await db.query("DESCRIBE payroll_entries");
    console.log("Table columns:");
    columns.forEach((col) => console.log(`- ${col.Field}: ${col.Type}`));

    const [rows] = await db.query(`
             SELECT 
         id, 
         user_id,
         base_salary, 
         allowances, 
         deductions,
         gross_pay, 
         tax_amount,
         net_pay,
         working_days
       FROM payroll_entries 
       LIMIT 5
    `);

    console.log("📊 Payslip Data Sample:");
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
      console.log(`Working Days: ${row.working_days}`);
    });

    // Check if gross_pay is NULL or NaN
    const [nullGross] = await db.query(`
      SELECT COUNT(*) as count 
      FROM payroll_entries 
      WHERE gross_pay IS NULL OR gross_pay = 0
    `);

    console.log(`\n⚠️  Payslips with NULL/0 gross_pay: ${nullGross[0].count}`);

    // Calculate what gross_pay should be
    console.log("\n🔧 Calculating what gross_pay should be...");
    rows.forEach((row, index) => {
      const calculatedGross =
        parseFloat(row.base_salary || 0) + parseFloat(row.allowances || 0);
      console.log(
        `Payslip ${index + 1}: ${row.base_salary} + ${
          row.allowances
        } = ${calculatedGross}`
      );
    });
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await db.end();
  }
}

checkPayslipData();
