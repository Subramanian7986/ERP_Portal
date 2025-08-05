const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const nodemailer = require("nodemailer");

const router = express.Router();

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOtpEmail(to, otp) {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: "Your ERP Portal OTP Code",
    text: `Your OTP code is: ${otp}`,
    html: `<p>Your OTP code is: <b>${otp}</b></p>`,
  });
}

module.exports = (db) => {
  // Rate limit login attempts per IP
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // limit each IP to 20 requests per windowMs
    message: { error: "Too many login attempts. Please try again later." },
  });

  router.post("/login", loginLimiter, async (req, res) => {
    const { usernameOrEmail, password } = req.body;
    if (!usernameOrEmail || !password) {
      return res
        .status(400)
        .json({ error: "Username/email and password are required." });
    }
    try {
      // Find user by username or email
      const [users] = await db.query(
        "SELECT * FROM users WHERE (username = ? OR email = ?) LIMIT 1",
        [usernameOrEmail, usernameOrEmail]
      );
      const user = users[0];
      if (!user) {
        // Log failed attempt (no user found)
        await db.query(
          "INSERT INTO login_attempts (user_id, success, ip_address, user_agent) VALUES (?, 0, ?, ?)",
          [null, req.ip, req.headers["user-agent"]]
        );
        return res.status(401).json({ error: "Invalid credentials." });
      }
      if (!user.is_active) {
        // Log failed attempt (inactive)
        await db.query(
          "INSERT INTO login_attempts (user_id, success, ip_address, user_agent) VALUES (?, 0, ?, ?)",
          [user.id, req.ip, req.headers["user-agent"]]
        );
        return res.status(403).json({ error: "Account is inactive." });
      }
      // Check lockout
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        // Log failed attempt (locked)
        await db.query(
          "INSERT INTO login_attempts (user_id, success, ip_address, user_agent) VALUES (?, 0, ?, ?)",
          [user.id, req.ip, req.headers["user-agent"]]
        );
        return res
          .status(403)
          .json({ error: "Account is locked. Try again later." });
      }
      // Check password
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        // Increment failed_attempts
        let failed = user.failed_attempts + 1;
        let locked_until = null;
        if (failed >= 5) {
          locked_until = new Date(Date.now() + 15 * 60 * 1000); // 15 min lock
        }
        await db.query(
          "UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?",
          [failed, locked_until, user.id]
        );
        // Log failed attempt (wrong password)
        await db.query(
          "INSERT INTO login_attempts (user_id, success, ip_address, user_agent) VALUES (?, 0, ?, ?)",
          [user.id, req.ip, req.headers["user-agent"]]
        );
        return res.status(401).json({ error: "Invalid credentials." });
      }
      // Reset failed_attempts
      await db.query(
        "UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?",
        [user.id]
      );
      // Log successful attempt
      await db.query(
        "INSERT INTO login_attempts (user_id, success, ip_address, user_agent) VALUES (?, 1, ?, ?)",
        [user.id, req.ip, req.headers["user-agent"]]
      );
      // MFA required?
      if (user.mfa_enabled) {
        // Optionally: generate/send OTP here
        return res.json({ mfaRequired: true, userId: user.id });
      }
      // Mark attendance as Present for today
      const today = new Date().toISOString().slice(0, 10);
      const now = new Date();
      const timeIn = now.toTimeString().slice(0, 8); // HH:MM:SS

      // Check assigned shift for today
      let attendanceType = "Normal";
      const [userShiftRows] = await db.query(
        `SELECT s.start_time, s.end_time FROM user_shifts us JOIN shifts s ON us.shift_id = s.id WHERE us.user_id = ? AND us.date = ?`,
        [user.id, today]
      );
      if (userShiftRows.length > 0) {
        const { start_time, end_time } = userShiftRows[0];
        // Handle overnight shifts (end_time < start_time)
        let isNormal = false;
        if (end_time > start_time) {
          isNormal = timeIn >= start_time && timeIn <= end_time;
        } else {
          // Overnight shift (e.g., 21:00 to 05:00)
          isNormal = timeIn >= start_time || timeIn <= end_time;
        }
        attendanceType = isNormal ? "Normal" : "Overtime";
      }

      await db.query(
        `INSERT INTO attendance (user_id, date, status, time_in, attendance_type)
         VALUES (?, ?, 'Present', ?, ?)
         ON DUPLICATE KEY UPDATE status = 'Present', time_in = IFNULL(time_in, VALUES(time_in)), attendance_type = VALUES(attendance_type)`,
        [user.id, today, timeIn, attendanceType]
      );
      // Issue JWT
      const token = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
      );
      res.json({ success: true, role: user.role, token });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error." });
    }
  });

  // --- Forgot Password ---
  router.post("/forgot-password", async (req, res) => {
    const { usernameOrEmail } = req.body;
    if (!usernameOrEmail) {
      return res.status(400).json({ error: "Username or email is required." });
    }
    try {
      const [users] = await db.query(
        "SELECT * FROM users WHERE (username = ? OR email = ?) LIMIT 1",
        [usernameOrEmail, usernameOrEmail]
      );
      const user = users[0];
      if (user) {
        // Generate OTP
        const otp = generateOTP();
        const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 min
        await db.query(
          "INSERT INTO otp_codes (user_id, code, expires_at, used, delivery_method) VALUES (?, ?, ?, ?, ?)",
          [user.id, otp, expires, false, "email"]
        );
        // Send OTP via email
        try {
          await sendOtpEmail(user.email, otp);
        } catch (emailErr) {
          console.error("Failed to send OTP email:", emailErr);
        }
      }
      // Always respond with generic message
      res.json({
        message: "If the account exists, a reset code has been sent.",
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error." });
    }
  });

  // --- Reset Password ---
  router.post("/reset-password", async (req, res) => {
    const { usernameOrEmail, otp, newPassword } = req.body;
    if (!usernameOrEmail || !otp || !newPassword) {
      return res.status(400).json({ error: "All fields are required." });
    }
    try {
      const [users] = await db.query(
        "SELECT * FROM users WHERE (username = ? OR email = ?) LIMIT 1",
        [usernameOrEmail, usernameOrEmail]
      );
      const user = users[0];
      if (!user) {
        return res.status(400).json({ error: "Invalid OTP or user." });
      }
      // Find OTP
      const [otps] = await db.query(
        "SELECT * FROM otp_codes WHERE user_id = ? AND code = ? AND used = 0 AND expires_at > NOW() LIMIT 1",
        [user.id, otp]
      );
      const otpRow = otps[0];
      if (!otpRow) {
        return res.status(400).json({ error: "Invalid or expired OTP." });
      }
      // Update password
      const hash = await bcrypt.hash(newPassword, 10);
      await db.query("UPDATE users SET password_hash = ? WHERE id = ?", [
        hash,
        user.id,
      ]);
      // Mark OTP as used
      await db.query("UPDATE otp_codes SET used = 1 WHERE id = ?", [otpRow.id]);
      res.json({ message: "Password reset successful." });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error." });
    }
  });

  return router;
};
