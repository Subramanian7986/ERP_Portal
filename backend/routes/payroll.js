const express = require("express");
const jwt = require("jsonwebtoken");

module.exports = (db) => {
  const router = express.Router();

  // Middleware to require authentication
  const requireAuth = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    console.log(
      "Payroll Auth - Received token:",
      token ? token.substring(0, 20) + "..." : "No token"
    );
    console.log("Payroll Auth - JWT_SECRET exists:", !!process.env.JWT_SECRET);
    console.log(
      "Payroll Auth - JWT_SECRET length:",
      process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0
    );

    if (!token) {
      console.log("Payroll Auth - No token provided");
      return res.status(401).json({ error: "No token provided." });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Payroll Auth - Token decoded successfully:", {
        id: decoded.id,
        role: decoded.role,
      });
      req.user = decoded;
      // Ensure user.id is available (handle both userId and id)
      if (!req.user.id && req.user.userId) {
        req.user.id = req.user.userId;
      }
      req.db = db; // Add db to request object
      next();
    } catch (error) {
      console.log("Payroll Auth - Token verification failed:", error.message);
      console.log("Payroll Auth - Error details:", error);
      return res.status(401).json({ error: "Invalid token." });
    }
  };

  // Middleware to require HR or Finance role
  const requireHRorFinance = (req, res, next) => {
    const role = req.user.role.toLowerCase();
    if (role !== "hr" && role !== "finance") {
      return res.status(403).json({
        error: "Access denied. HR or Finance role required.",
      });
    }
    next();
  };

  // ==================== EMPLOYEE SALARIES ====================

  // Get all employee salaries
  router.get("/salaries", requireAuth, requireHRorFinance, async (req, res) => {
    try {
      const { user_id, active_only } = req.query;
      let query = `
        SELECT 
          es.*,
          u.username,
          u.email,
          u.role,
          u.department
        FROM employee_salaries es
        JOIN users u ON es.user_id = u.id
        WHERE 1=1
      `;
      const params = [];

      if (user_id) {
        query += " AND es.user_id = ?";
        params.push(user_id);
      }

      if (active_only === "true") {
        query += " AND (es.end_date IS NULL OR es.end_date >= CURDATE())";
      }

      query += " ORDER BY es.effective_date DESC";

      const [salaries] = await req.db.query(query, params);
      res.json({ salaries });
    } catch (error) {
      console.error("Error fetching salaries:", error);
      res.status(500).json({ error: "Failed to fetch salaries." });
    }
  });

  // Get current salary for a user
  router.get("/salaries/current/:userId", requireAuth, async (req, res) => {
    try {
      const { userId } = req.params;

      // Check if user can access this salary info
      if (
        req.user.role.toLowerCase() !== "hr" &&
        req.user.role.toLowerCase() !== "finance" &&
        req.user.id != userId
      ) {
        return res.status(403).json({ error: "Access denied." });
      }

      const [salaries] = await req.db.query(
        `
        SELECT 
          es.*,
          u.username,
          u.email,
          u.role,
          u.department
        FROM employee_salaries es
        JOIN users u ON es.user_id = u.id
        WHERE es.user_id = ? 
        AND (es.end_date IS NULL OR es.end_date >= CURDATE())
        ORDER BY es.effective_date DESC
        LIMIT 1
      `,
        [userId]
      );

      res.json({ salary: salaries[0] || null });
    } catch (error) {
      console.error("Error fetching current salary:", error);
      res.status(500).json({ error: "Failed to fetch current salary." });
    }
  });

  // Create/Update employee salary
  router.post(
    "/salaries",
    requireAuth,
    requireHRorFinance,
    async (req, res) => {
      try {
        const {
          user_id,
          base_salary,
          allowances = 0,
          deductions = 0,
          effective_date,
          end_date = null,
          currency = "USD",
        } = req.body;

        if (!user_id || !base_salary || !effective_date) {
          return res.status(400).json({
            error:
              "Missing required fields: user_id, base_salary, effective_date",
          });
        }

        // Check if user exists
        const [users] = await req.db.query(
          "SELECT id FROM users WHERE id = ?",
          [user_id]
        );

        if (users.length === 0) {
          return res.status(404).json({ error: "User not found." });
        }

        // End the previous salary record if it exists
        await req.db.query(
          `
        UPDATE employee_salaries 
        SET end_date = DATE_SUB(?, INTERVAL 1 DAY)
        WHERE user_id = ? AND (end_date IS NULL OR end_date >= ?)
      `,
          [effective_date, user_id, effective_date]
        );

        // Insert new salary record
        const [result] = await req.db.query(
          `
        INSERT INTO employee_salaries (
          user_id, base_salary, allowances, deductions, 
          effective_date, end_date, currency
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
          [
            user_id,
            base_salary,
            allowances,
            deductions,
            effective_date,
            end_date,
            currency,
          ]
        );

        res.status(201).json({
          message: "Salary record created successfully.",
          salary_id: result.insertId,
        });
      } catch (error) {
        console.error("Error creating salary record:", error);
        res.status(500).json({ error: "Failed to create salary record." });
      }
    }
  );

  // ==================== PAYROLL RUNS ====================

  // Get all payroll runs
  router.get("/runs", requireAuth, requireHRorFinance, async (req, res) => {
    try {
      const { status, start_date, end_date } = req.query;
      let query = `
        SELECT 
          pr.*,
          u.username as created_by_name
        FROM payroll_runs pr
        JOIN users u ON pr.created_by = u.id
        WHERE 1=1
      `;
      const params = [];

      if (status) {
        query += " AND pr.status = ?";
        params.push(status);
      }

      if (start_date) {
        query += " AND pr.run_date >= ?";
        params.push(start_date);
      }

      if (end_date) {
        query += " AND pr.run_date <= ?";
        params.push(end_date);
      }

      query += " ORDER BY pr.run_date DESC";

      const [runs] = await req.db.query(query, params);
      res.json({ runs });
    } catch (error) {
      console.error("Error fetching payroll runs:", error);
      res.status(500).json({ error: "Failed to fetch payroll runs." });
    }
  });

  // Get specific payroll run with entries
  router.get("/runs/:id", requireAuth, requireHRorFinance, async (req, res) => {
    try {
      const { id } = req.params;

      // Get payroll run details
      const [runs] = await req.db.query(
        `
        SELECT 
          pr.*,
          u.username as created_by_name
        FROM payroll_runs pr
        JOIN users u ON pr.created_by = u.id
        WHERE pr.id = ?
      `,
        [id]
      );

      if (runs.length === 0) {
        return res.status(404).json({ error: "Payroll run not found." });
      }

      // Get payroll entries
      const [entries] = await req.db.query(
        `
        SELECT 
          pe.*,
          u.username,
          u.email,
          u.role,
          u.department
        FROM payroll_entries pe
        JOIN users u ON pe.user_id = u.id
        WHERE pe.payroll_run_id = ?
        ORDER BY u.username
      `,
        [id]
      );

      res.json({
        run: runs[0],
        entries,
      });
    } catch (error) {
      console.error("Error fetching payroll run:", error);
      res.status(500).json({ error: "Failed to fetch payroll run." });
    }
  });

  // Create new payroll run
  router.post("/runs", requireAuth, requireHRorFinance, async (req, res) => {
    try {
      const { run_date, pay_period_start, pay_period_end } = req.body;

      console.log("Creating payroll run with data:", {
        run_date,
        pay_period_start,
        pay_period_end,
      });

      if (!run_date || !pay_period_start || !pay_period_end) {
        return res.status(400).json({
          error:
            "Missing required fields: run_date, pay_period_start, pay_period_end",
        });
      }

      // Calculate payroll for all active employees
      const [employees] = await req.db.query(
        `
        SELECT 
          u.id,
          u.username,
          u.email,
          u.role,
          u.department,
          COALESCE(es.base_salary, 0) as base_salary,
          COALESCE(es.allowances, 0) as allowances,
          COALESCE(es.deductions, 0) as deductions
        FROM users u
        LEFT JOIN employee_salaries es ON u.id = es.user_id 
          AND (es.end_date IS NULL OR es.end_date >= ?)
        WHERE u.role != 'Admin' AND u.is_active = 1
        ORDER BY u.username
      `,
        [pay_period_start]
      );

      if (employees.length === 0) {
        return res.status(400).json({ error: "No active employees found." });
      }

      // Calculate working days in pay period
      const workingDays = calculateWorkingDays(
        pay_period_start,
        pay_period_end
      );

      // Check if there are working days in the pay period
      if (workingDays === 0) {
        return res.status(400).json({
          error:
            "No working days found in the specified pay period. Please check the date range.",
        });
      }

      let totalGrossPay = 0;
      let totalTax = 0;
      let totalNetPay = 0;

      // Create payroll run
      const [runResult] = await req.db.query(
        `
        INSERT INTO payroll_runs (
          run_date, pay_period_start, pay_period_end, 
          total_employees, total_gross_pay, total_tax, total_net_pay, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          run_date,
          pay_period_start,
          pay_period_end,
          employees.length,
          0,
          0,
          0,
          req.user.id,
        ]
      );

      const payrollRunId = runResult.insertId;

      // Process each employee
      for (const employee of employees) {
        // Get attendance for the period
        const [attendance] = await req.db.query(
          `
          SELECT COUNT(*) as present_days
          FROM attendance 
          WHERE user_id = ? 
          AND date BETWEEN ? AND ?
          AND status = 'Present'
        `,
          [employee.id, pay_period_start, pay_period_end]
        );

        const presentDays = attendance[0].present_days || 0;

        // Get leave days for the period
        const [leaveDays] = await req.db.query(
          `
          SELECT COALESCE(SUM(total_days), 0) as leave_days
          FROM leave_requests 
          WHERE user_id = ? 
          AND start_date BETWEEN ? AND ?
          AND status = 'Approved'
        `,
          [employee.id, pay_period_start, pay_period_end]
        );

        const leaveDaysCount = leaveDays[0].leave_days || 0;

        // Calculate overtime (if any)
        const [overtime] = await req.db.query(
          `
          SELECT COUNT(*) as overtime_days
          FROM attendance 
          WHERE user_id = ? 
          AND date BETWEEN ? AND ?
          AND attendance_type = 'Overtime'
        `,
          [employee.id, pay_period_start, pay_period_end]
        );

        const overtimeDays = overtime[0].overtime_days || 0;
        const overtimeRate = (employee.base_salary / workingDays) * 1.5; // 1.5x for overtime
        const overtimePay = overtimeDays * overtimeRate;

        // Calculate daily rate
        const dailyRate = employee.base_salary / workingDays;

        // Calculate gross pay
        const grossPay =
          presentDays * dailyRate +
          employee.allowances +
          overtimePay -
          employee.deductions;

        // Calculate tax
        const taxAmount = calculateTax(grossPay * 12); // Annual income for tax calculation

        // Calculate net pay
        const netPay = grossPay - taxAmount;

        // Insert payroll entry
        await req.db.query(
          `
          INSERT INTO payroll_entries (
            payroll_run_id, user_id, base_salary, allowances, deductions,
            overtime_pay, bonus, gross_pay, tax_amount, net_pay,
            working_days, attendance_days, leave_days
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
          [
            payrollRunId,
            employee.id,
            employee.base_salary,
            employee.allowances,
            employee.deductions,
            overtimePay,
            0,
            grossPay,
            taxAmount,
            netPay,
            workingDays,
            presentDays,
            leaveDaysCount,
          ]
        );

        totalGrossPay += grossPay;
        totalTax += taxAmount;
        totalNetPay += netPay;
      }

      // Update payroll run totals
      await req.db.query(
        `
        UPDATE payroll_runs 
        SET total_gross_pay = ?, total_tax = ?, total_net_pay = ?
        WHERE id = ?
      `,
        [totalGrossPay, totalTax, totalNetPay, payrollRunId]
      );

      res.status(201).json({
        message: "Payroll run created successfully.",
        payroll_run_id: payrollRunId,
        total_employees: employees.length,
        total_gross_pay: totalGrossPay,
        total_tax: totalTax,
        total_net_pay: totalNetPay,
      });
    } catch (error) {
      console.error("Error creating payroll run:", error);
      console.error("Error details:", error.message);
      console.error("Error stack:", error.stack);
      res.status(500).json({ error: "Failed to create payroll run." });
    }
  });

  // Process payroll run
  router.put(
    "/runs/:id/process",
    requireAuth,
    requireHRorFinance,
    async (req, res) => {
      try {
        const { id } = req.params;

        // Update payroll run status
        await req.db.query(
          `
        UPDATE payroll_runs 
        SET status = 'Completed', processed_at = NOW()
        WHERE id = ?
      `,
          [id]
        );

        res.json({ message: "Payroll run processed successfully." });
      } catch (error) {
        console.error("Error processing payroll run:", error);
        res.status(500).json({ error: "Failed to process payroll run." });
      }
    }
  );

  // ==================== TAX RATES ====================

  // Get tax rates
  router.get(
    "/tax-rates",
    requireAuth,
    requireHRorFinance,
    async (req, res) => {
      try {
        const { tax_year } = req.query;
        let query = "SELECT * FROM tax_rates WHERE 1=1";
        const params = [];

        if (tax_year) {
          query += " AND tax_year = ?";
          params.push(tax_year);
        }

        query += " ORDER BY min_income";

        const [taxRates] = await req.db.query(query, params);
        res.json({ tax_rates: taxRates });
      } catch (error) {
        console.error("Error fetching tax rates:", error);
        res.status(500).json({ error: "Failed to fetch tax rates." });
      }
    }
  );

  // Add tax rate
  router.post(
    "/tax-rates",
    requireAuth,
    requireHRorFinance,
    async (req, res) => {
      try {
        const { tax_year, min_income, max_income, tax_rate, tax_bracket_name } =
          req.body;

        if (!tax_year || !min_income || !tax_rate || !tax_bracket_name) {
          return res.status(400).json({
            error:
              "Missing required fields: tax_year, min_income, tax_rate, tax_bracket_name",
          });
        }

        const [result] = await req.db.query(
          `
        INSERT INTO tax_rates (tax_year, min_income, max_income, tax_rate, tax_bracket_name)
        VALUES (?, ?, ?, ?, ?)
      `,
          [tax_year, min_income, max_income, tax_rate, tax_bracket_name]
        );

        res.status(201).json({
          message: "Tax rate added successfully.",
          tax_rate_id: result.insertId,
        });
      } catch (error) {
        console.error("Error adding tax rate:", error);
        res.status(500).json({ error: "Failed to add tax rate." });
      }
    }
  );

  // ==================== REPORTS ====================

  // Get payroll summary report
  router.get(
    "/reports/summary",
    requireAuth,
    requireHRorFinance,
    async (req, res) => {
      try {
        const { start_date, end_date } = req.query;

        let whereClause = "WHERE pr.status = 'Completed'";
        const params = [];

        if (start_date && end_date) {
          whereClause =
            "WHERE pr.run_date BETWEEN ? AND ? AND pr.status = 'Completed'";
          params.push(start_date, end_date);
        }

        const [summary] = await req.db.query(
          `
        SELECT 
          COUNT(*) as total_runs,
          SUM(total_employees) as total_employees_processed,
          SUM(total_gross_pay) as total_gross_pay,
          SUM(total_tax) as total_tax,
          SUM(total_net_pay) as total_net_pay,
          AVG(total_gross_pay) as avg_gross_pay,
          AVG(total_net_pay) as avg_net_pay
        FROM payroll_runs pr
        ${whereClause}
      `,
          params
        );

        res.json({ summary: summary[0] });
      } catch (error) {
        console.error("Error generating summary report:", error);
        res.status(500).json({ error: "Failed to generate summary report." });
      }
    }
  );

  // Get employee salary history
  router.get(
    "/reports/salary-history/:userId",
    requireAuth,
    async (req, res) => {
      try {
        const { userId } = req.params;

        // Check if user can access this salary history
        if (
          req.user.role.toLowerCase() !== "hr" &&
          req.user.role.toLowerCase() !== "finance" &&
          req.user.id != userId
        ) {
          return res.status(403).json({ error: "Access denied." });
        }

        const [history] = await req.db.query(
          `
        SELECT 
          es.*,
          u.username,
          u.email,
          u.role,
          u.department
        FROM employee_salaries es
        JOIN users u ON es.user_id = u.id
        WHERE es.user_id = ?
        ORDER BY es.effective_date DESC
      `,
          [userId]
        );

        res.json({ salary_history: history });
      } catch (error) {
        console.error("Error fetching salary history:", error);
        res.status(500).json({ error: "Failed to fetch salary history." });
      }
    }
  );

  // ==================== PAYSLIPS ====================

  // Get employee payslips
  router.get("/payslips/:userId", requireAuth, async (req, res) => {
    try {
      const { userId } = req.params;

      // Verify user can only access their own payslips
      if (
        req.user.id != userId &&
        req.user.role.toLowerCase() !== "hr" &&
        req.user.role.toLowerCase() !== "finance"
      ) {
        return res.status(403).json({ error: "Access denied." });
      }

      const query = `
        SELECT 
          pe.id,
          pe.payroll_run_id,
          pe.user_id as employee_id,
          pe.base_salary,
          pe.allowances,
          pe.deductions,
          pe.gross_pay,
          pe.tax_amount,
          pe.net_pay,
          pe.working_days,
          pe.attendance_days,
          pe.created_at as processed_at,
          CONCAT(MONTH(pr.pay_period_start), '/', YEAR(pr.pay_period_start)) as pay_period,
          pr.pay_period_start,
          pr.pay_period_end,
          pr.status,
          CONCAT('Payroll for ', MONTHNAME(pr.pay_period_start), ' ', YEAR(pr.pay_period_start)) as description,
          u.username as employee_name,
          u.department,
          u.role as position
        FROM payroll_entries pe
        JOIN payroll_runs pr ON pe.payroll_run_id = pr.id
        JOIN users u ON pe.user_id = u.id
        WHERE pe.user_id = ?
        ORDER BY pe.created_at DESC
      `;

      const [payslips] = await req.db.query(query, [userId]);
      res.json(payslips);
    } catch (error) {
      console.error("Error fetching payslips:", error);
      res.status(500).json({ error: "Failed to fetch payslips." });
    }
  });

  // Download payslip
  router.get("/payslips/:payslipId/download", requireAuth, async (req, res) => {
    try {
      const { payslipId } = req.params;

      // Get payslip details
      const query = `
        SELECT 
          pe.*,
          CONCAT(MONTH(pr.pay_period_start), '/', YEAR(pr.pay_period_start)) as pay_period,
          pr.pay_period_start,
          pr.pay_period_end,
          u.username as employee_name,
          u.department,
          u.role as position
        FROM payroll_entries pe
        JOIN payroll_runs pr ON pe.payroll_run_id = pr.id
        JOIN users u ON pe.user_id = u.id
        WHERE pe.id = ?
      `;

      const [payslips] = await req.db.query(query, [payslipId]);

      if (payslips.length === 0) {
        return res.status(404).json({ error: "Payslip not found." });
      }

      const payslip = payslips[0];

      // Verify user can only download their own payslips
      if (
        req.user.id != payslip.user_id &&
        req.user.role.toLowerCase() !== "hr" &&
        req.user.role.toLowerCase() !== "finance"
      ) {
        return res.status(403).json({ error: "Access denied." });
      }

      // For now, return JSON data. In a real implementation, you would generate a PDF
      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="payslip-${payslip.pay_period}.json"`
      );
      res.json(payslip);
    } catch (error) {
      console.error("Error downloading payslip:", error);
      res.status(500).json({ error: "Failed to download payslip." });
    }
  });

  // Helper function to calculate working days
  function calculateWorkingDays(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let workingDays = 0;
    let current = new Date(start);

    console.log("Calculating working days from", startDate, "to", endDate);

    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        // Exclude Sunday and Saturday
        workingDays++;
      }
      current.setDate(current.getDate() + 1);
    }

    console.log("Total working days calculated:", workingDays);
    return workingDays;
  }

  // Helper function to calculate tax
  function calculateTax(annualIncome) {
    // This is a simplified tax calculation
    // In a real system, you would use the tax_rates table
    if (annualIncome <= 50000) {
      return (annualIncome * 0.15) / 12; // 15% tax bracket
    } else if (annualIncome <= 100000) {
      return (annualIncome * 0.25) / 12; // 25% tax bracket
    } else {
      return (annualIncome * 0.35) / 12; // 35% tax bracket
    }
  }

  return router;
};
