import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import "./Login.css";
import logo from "../images/logo.png";

const LoginPage = () => {
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usernameOrEmail,
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed. Please try again.");
      } else if (data.mfaRequired) {
        navigate("/otp");
      } else if (data.success) {
        if (data.token) {
          if (rememberMe) {
            localStorage.setItem("erp_token", data.token);
          } else {
            sessionStorage.setItem("erp_token", data.token);
          }
        }
        switch (data.role) {
          case "Admin":
            navigate("/dashboard/admin");
            break;
          case "HR":
          case "HR Manager":
            navigate("/dashboard/hr");
            break;
          case "PM":
          case "Project Manager":
            navigate("/dashboard/pm");
            break;
          case "Developer":
          case "Employee":
            navigate("/dashboard/employee");
            break;
          case "Finance":
          case "Finance Officer":
            navigate("/dashboard/finance");
            break;
          case "CRM":
          case "CRM Executive":
            navigate("/dashboard/crm");
            break;
          case "Client":
            navigate("/dashboard/client");
            break;
          case "Procurement":
          case "Procurement Officer":
            navigate("/dashboard/procurement");
            break;
          case "IT":
          case "IT/Asset Manager":
            navigate("/dashboard/it");
            break;
          default:
            navigate("/dashboard");
        }
      } else {
        setError(data.error || "Login failed. Please try again.");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <img src={logo} alt="Company Logo" className="logo" />
      <h2>ERP Portal Login</h2>
      <form onSubmit={handleLogin}>
        <input
          type="text"
          placeholder="Username or Email"
          value={usernameOrEmail}
          onChange={(e) => setUsernameOrEmail(e.target.value)}
          required
        />
        <div className="input-with-eye">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <span role="img" aria-label="Hide">
                🙈
              </span>
            ) : (
              <span role="img" aria-label="Show">
                👁️
              </span>
            )}
          </button>
        </div>
        <div className="form-row">
          <label>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={() => setRememberMe((v) => !v)}
            />
            Remember Me
          </label>
          <a href="/forgot-password">Forgot Password?</a>
        </div>
        {error && <ErrorMessage message={error} />}
        <button type="submit" disabled={loading}>
          {loading ? <LoadingSpinner /> : "Login"}
        </button>
      </form>
      <footer>Powered by [Company Name]</footer>
    </div>
  );
};

export default LoginPage;
