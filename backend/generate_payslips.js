const mysql = require("mysql2/promise");

async function generatePayslips2024() {
  let db;

  try {
    // Connect to database
    db = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "",
      database: "erp_portal",
    });

    console.log("Connected to database successfully.");

    // Clear existing payslip data
    await db.query("DELETE FROM payroll_entries");
    await db.query("DELETE FROM payroll_runs");
    console.log("Cleared existing payslip data.");

    // Get all non-admin users with their salary information
    const [users] = await db.query(`
      SELECT u.id, u.username, u.role, u.department, u.name,
             es.base_salary, es.allowances, es.deductions
      FROM users u
      LEFT JOIN employee_salaries es ON u.id = es.user_id
      WHERE u.role != 'Admin' AND u.is_active = 1
    `);

    console.log(`Found ${users.length} users for payslip generation.`);

    if (users.length === 0) {
      console.log("No users found for payslip generation.");
      return;
    }

    const months = [
      { name: "January", start: "2024-01-01", end: "2024-01-31" },
      { name: "February", start: "2024-02-01", end: "2024-02-29" },
      { name: "March", start: "2024-03-01", end: "2024-03-31" },
      { name: "April", start: "2024-04-01", end: "2024-04-30" },
      { name: "May", start: "2024-05-01", end: "2024-05-31" },
      { name: "June", start: "2024-06-01", end: "2024-06-30" },
      { name: "July", start: "2024-07-01", end: "2024-07-31" },
      { name: "August", start: "2024-08-01", end: "2024-08-31" },
      { name: "September", start: "2024-09-01", end: "2024-09-30" },
      { name: "October", start: "2024-10-01", end: "2024-10-31" },
      { name: "November", start: "2024-11-01", end: "2024-11-30" },
      { name: "December", start: "2024-12-01", end: "2024-12-31" },
    ];

    let totalPayslips = 0;

    for (const month of months) {
      console.log(`Processing ${month.name} 2024...`);

      // Create payroll run for this month
      const [payrollRun] = await db.query(
        `
        INSERT INTO payroll_runs (
          run_date, pay_period_start, pay_period_end, total_employees, 
          total_gross_pay, total_tax, total_net_pay, status, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          month.start,
          month.start,
          month.end,
          users.length,
          0, // Will be calculated
          0, // Will be calculated
          0, // Will be calculated
          "Completed",
          3, // Admin user ID
        ]
      );

      const payrollRunId = payrollRun.insertId;

      // Generate payslips for all users
      for (const user of users) {
        const baseSalary = parseFloat(user.base_salary) || 3500;
        const allowances = parseFloat(user.allowances) || 250;
        const deductions = parseFloat(user.deductions) || 120;

        // Calculate working days (assuming 22 working days per month)
        const workingDays = 22;

        // Calculate gross salary
        const grossSalary = baseSalary + allowances;

        // Calculate tax (15% for basic rate)
        const annualIncome = grossSalary * 12;
        let taxRate = 15.0; // Default to basic rate

        if (annualIncome > 100000) {
          taxRate = 35.0; // Additional rate
        } else if (annualIncome > 50000) {
          taxRate = 25.0; // Higher rate
        }

        const taxDeduction = Math.round((grossSalary * taxRate) / 100);
        const netSalary = grossSalary - taxDeduction - deductions;

        // Insert payroll entry
        await db.query(
          `
          INSERT INTO payroll_entries (
            payroll_run_id, user_id, base_salary, allowances, deductions,
            gross_pay, tax_amount, net_pay, working_days, attendance_days
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
          [
            payrollRunId,
            user.id,
            baseSalary,
            allowances,
            deductions,
            grossSalary,
            taxDeduction,
            netSalary,
            workingDays,
            workingDays, // attendance_days same as working_days
          ]
        );

        totalPayslips++;
      }
    }

    console.log(
      `✅ Successfully generated ${totalPayslips} payslips for ${users.length} employees for all 12 months of 2024.`
    );

    // Verify the data
    const [payrollRuns] = await db.query(
      "SELECT COUNT(*) as count FROM payroll_runs"
    );
    const [payrollEntries] = await db.query(
      "SELECT COUNT(*) as count FROM payroll_entries"
    );

    console.log(
      `📊 Verification: ${payrollRuns[0].count} payroll runs and ${payrollEntries[0].count} payroll entries created.`
    );
  } catch (error) {
    console.error("❌ Error generating payslips:", error);
  } finally {
    if (db) {
      await db.end();
      console.log("Database connection closed.");
    }
  }
}

// Run the function
generatePayslips2024();
