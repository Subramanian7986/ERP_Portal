const axios = require("axios");

async function testPayslipEndpoint() {
  try {
    // First, let's get a valid token by logging in
    console.log("Logging in to get token...");
    const loginResponse = await axios.post(
      "http://localhost:3000/api/auth/login",
      {
        usernameOrEmail: "hr1",
        password: "123456789",
      }
    );

    const token = loginResponse.data.token;
    console.log("Login successful, token received");

    // Decode token to get userId
    const jwt = require("jsonwebtoken");
    const decoded = jwt.decode(token);
    console.log("Decoded token:", decoded);
    console.log("User ID:", decoded.userId);

    // Test the payslip endpoint
    console.log("Testing payslip endpoint...");
    const response = await axios.get(
      `http://localhost:3000/api/payroll/payslips/${decoded.userId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Payslip response status:", response.status);
    console.log("Number of payslips:", response.data.length);

    if (response.data.length > 0) {
      console.log("Sample payslip:", response.data[0]);
    }
  } catch (error) {
    console.error("Error details:");
    console.error("Status:", error.response?.status);
    console.error("Status Text:", error.response?.statusText);
    console.error("Response Data:", error.response?.data);
    console.error("Error Message:", error.message);
  }
}

testPayslipEndpoint();
