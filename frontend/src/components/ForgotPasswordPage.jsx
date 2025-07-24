import React, { useState } from "react";
import LoadingSpinner from "./LoadingSpinner";
import ErrorMessage from "./ErrorMessage";
import { useNavigate } from "react-router-dom";
import "./ForgotPasswordPage.css";

const ForgotPasswordPage = () => {
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernameOrEmail: emailOrUsername }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
      } else {
        setSuccess(
          data.message ||
            "If the account exists, a reset link or OTP has been sent."
        );
        setTimeout(() => navigate("/otp"), 1000); // Auto-redirect after 1s
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-page-wrapper">
      <div className="forgot-password-container">
        <h2>Forgot Password</h2>
        <form onSubmit={handleForgotPassword}>
          <input
            type="text"
            placeholder="Email or Username"
            value={emailOrUsername}
            onChange={(e) => setEmailOrUsername(e.target.value)}
            required
          />
          {error && <ErrorMessage message={error} />}
          <button type="submit" disabled={loading}>
            {loading ? <LoadingSpinner /> : "Send Reset Link/OTP"}
          </button>
        </form>
        {success && (
          <div style={{ color: "green", marginTop: 8 }}>{success}</div>
        )}
        <button
          className="back-to-login-btn"
          onClick={() => navigate("/login")}
        >
          Back to Login
        </button>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
