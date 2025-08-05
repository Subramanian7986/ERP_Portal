const mysql = require("mysql2/promise");

async function generate2023Payslips() {
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

    // First, let's clear existing 2023 payroll data
    console.log("Clearing existing 2023 payroll data...");
    await connection.execute("DELETE FROM payroll_entries WHERE payroll_run_id IN (SELECT id FROM payroll_runs WHERE YEAR(run_date) = 2023)");
    await connection.execute("DELETE FROM payroll_runs WHERE YEAR(run_date) = 2023");
    await connection.execute("ALTER TABLE payroll_entries AUTO_INCREMENT = 1");
    await connection.execute("ALTER TABLE payroll_runs AUTO_INCREMENT = 1");
    console.log("Cleared existing 2023 payroll data");

    // Get all non-admin users
    const [users] = await connection.execute(
      "SELECT id, username, role, department FROM users WHERE role != 'Admin' AND role != 'Client' ORDER BY id"
    );
    console.log(`Found ${users.length} employees to generate payslips for`);

    // Get admin user ID for created_by field
    const [adminUsers] = await connection.execute(
      "SELECT id FROM users WHERE role = 'Admin' LIMIT 1"
    );
    const adminUserId = adminUsers[0]?.id || 3; // Default to 3 if no admin found

    // Get tax rates for 2023
    const [taxRates] = await connection.execute(
      "SELECT * FROM tax_rates WHERE tax_year = 2023 ORDER BY min_income"
    );
    console.log(`Found ${taxRates.length} tax rate brackets for 2023`);

    // Generate payslips for each month of 2023
    const months = [
      { month: 1, name: "January", days: 31 },
      { month: 2, name: "February", days: 28 }, // 2023 was not a leap year
      { month: 3, name: "March", days: 31 },
      { month: 4, name: "April", days: 30 },
      { month: 5, name: "May", days: 31 },
      { month: 6, name: "June", days: 30 },
      { month: 7, name: "July", days: 31 },
      { month: 8, name: "August", days: 31 },
      { month: 9, name: "September", days: 30 },
      { month: 10, name: "October", days: 31 },
      { month: 11, name: "November", days: 30 },
      { month: 12, name: "December", days: 31 }
    ];

    let totalPayrollRuns = 0;
    let totalPayrollEntries = 0;

    for (const monthData of months) {
      console.log(`\nProcessing ${monthData.name} 2023...`);
      
      const payPeriodStart = `2023-${monthData.month.toString().padStart(2, '0')}-01`;
      const payPeriodEnd = `2023-${monthData.month.toString().padStart(2, '0')}-${monthData.days}`;
      const runDate = `2023-${monthData.month.toString().padStart(2, '0')}-${Math.min(monthData.days, 25)}`; // Payday on 25th or last day of month

      // Calculate working days (excluding weekends)
      const workingDays = calculateWorkingDays(payPeriodStart, payPeriodEnd);
      
      let totalGrossPay = 0;
      let totalTax = 0;
      let totalNetPay = 0;

      // Create payroll run
      const [payrollRunResult] = await connection.execute(
        `INSERT INTO payroll_runs (
          run_date, pay_period_start, pay_period_end, total_employees, 
          total_gross_pay, total_tax, total_net_pay, status, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          runDate,
          payPeriodStart,
          payPeriodEnd,
          users.length,
          0, // Will update after calculating
          0, // Will update after calculating
          0, // Will update after calculating
          "Completed",
          adminUserId
        ]
      );

      const payrollRunId = payrollRunResult.insertId;
      totalPayrollRuns++;

      // Generate payslips for each employee
      for (const user of users) {
        // Get current salary for this user
        const [salaryRecords] = await connection.execute(
          `SELECT * FROM employee_salaries 
           WHERE user_id = ? AND effective_date <= ? 
           AND (end_date IS NULL OR end_date >= ?)
           ORDER BY effective_date DESC LIMIT 1`,
          [user.id, payPeriodStart, payPeriodStart]
        );

        if (salaryRecords.length === 0) {
          console.log(`No salary record found for user ${user.username}, skipping...`);
          continue;
        }

        const salary = salaryRecords[0];
        
        // Calculate attendance days (random between 18-22 working days)
        const attendanceDays = Math.floor(Math.random() * 5) + 18;
        
        // Calculate base salary for this month
        const baseSalary = parseFloat(salary.base_salary);
        const allowances = parseFloat(salary.allowances || 0);
        const deductions = parseFloat(salary.deductions || 0);
        
        // Calculate gross pay (prorated based on attendance)
        const grossPay = (baseSalary / 12) + allowances - deductions;
        
        // Calculate tax based on annual income
        const annualIncome = baseSalary + (allowances * 12) - (deductions * 12);
        const taxAmount = calculateTax(annualIncome, taxRates) / 12;
        
        // Calculate net pay
        const netPay = grossPay - taxAmount;

        // Update totals
        totalGrossPay += grossPay;
        totalTax += taxAmount;
        totalNetPay += netPay;

        // Create payroll entry
        await connection.execute(
          `INSERT INTO payroll_entries (
            payroll_run_id, user_id, base_salary, allowances, deductions,
            gross_pay, tax_amount, net_pay, working_days, attendance_days
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            payrollRunId,
            user.id,
            baseSalary / 12, // Monthly base salary
            allowances,
            deductions,
            grossPay,
            taxAmount,
            netPay,
            workingDays,
            attendanceDays
          ]
        );

        totalPayrollEntries++;
      }

      // Update payroll run totals
      await connection.execute(
        `UPDATE payroll_runs 
         SET total_gross_pay = ?, total_tax = ?, total_net_pay = ?
         WHERE id = ?`,
        [totalGrossPay, totalTax, totalNetPay, payrollRunId]
      );

      console.log(`${monthData.name} 2023: Generated ${users.length} payslips, Total: $${totalGrossPay.toFixed(2)}`);
    }

    console.log(`\n✅ Successfully generated 2023 payslips!`);
    console.log(`📊 Summary:`);
    console.log(`   - Payroll Runs: ${totalPayrollRuns}`);
    console.log(`   - Payroll Entries: ${totalPayrollEntries}`);
    console.log(`   - Employees: ${users.length}`);
    console.log(`   - Period: January 2023 - December 2023`);

  } catch (error) {
    console.error("❌ Error generating 2023 payslips:", error);
  } finally {
    if (connection) {
      await connection.end();
      console.log("Database connection closed");
    }
  }
}

function calculateWorkingDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let workingDays = 0;
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
      workingDays++;
    }
  }
  
  return workingDays;
}

function calculateTax(annualIncome, taxRates) {
  let totalTax = 0;
  let remainingIncome = annualIncome;

  for (const rate of taxRates) {
    if (remainingIncome <= 0) break;
    
    const taxableAmount = Math.min(
      remainingIncome,
      rate.max_income ? rate.max_income - rate.min_income : remainingIncome
    );
    
    totalTax += (taxableAmount * rate.rate) / 100;
    remainingIncome -= taxableAmount;
  }

  return totalTax;
}

// Run the script
generate2023Payslips(); 