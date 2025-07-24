import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import LoginPage from "./components/Login";
import ForgotPasswordPage from "./components/ForgotPasswordPage";
import OtpPage from "./components/OtpPage";
import AdminDashboard from "./components/AdminDashboard";
import HrDashboard from "./components/HrDashboard";
import PmDashboard from "./components/PmDashboard";
import EmployeeDashboard from "./components/EmployeeDashboard";
import FinanceDashboard from "./components/FinanceDashboard";
import CrmDashboard from "./components/CrmDashboard";
import ClientDashboard from "./components/ClientDashboard";
import ProcurementDashboard from "./components/ProcurementDashboard";
import ItDashboard from "./components/ItDashboard";
import UserManagementPage from "./components/UserManagementPage";
import RolePermissionManagement from "./components/RolePermissionManagement";
import AdminAnnouncements from "./components/AdminAnnouncements";
import AnnouncementsPage from "./components/AnnouncementsPage";
import MessagingPage from "./components/MessagingPage";
import { jwtDecode } from "jwt-decode";

// Placeholder components for OTP and Forgot Password
const Dashboard = () => <div>Dashboard (role-based redirection target)</div>;

function App() {
  // Get user info from JWT
  let user = { id: null, role: null, username: null };
  let token =
    localStorage.getItem("erp_token") || sessionStorage.getItem("erp_token");
  if (token) {
    try {
      const decoded = jwtDecode(token);
      user.id = decoded.userId || decoded.id || null;
      user.role = decoded.role || null;
      user.username = decoded.username || decoded.name || null;
    } catch {}
  }
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/otp" element={<OtpPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/admin" element={<AdminDashboard />} />
        <Route path="/dashboard/hr" element={<HrDashboard />} />
        <Route path="/dashboard/pm" element={<PmDashboard />} />
        <Route path="/dashboard/employee" element={<EmployeeDashboard />} />
        <Route path="/dashboard/finance" element={<FinanceDashboard />} />
        <Route path="/dashboard/crm" element={<CrmDashboard />} />
        <Route path="/dashboard/client" element={<ClientDashboard />} />
        <Route
          path="/dashboard/procurement"
          element={<ProcurementDashboard />}
        />
        <Route path="/dashboard/it" element={<ItDashboard />} />
        <Route path="/admin/users" element={<UserManagementPage />} />
        <Route
          path="/admin/roles-permissions"
          element={<RolePermissionManagement />}
        />
        <Route path="/admin/announcements" element={<AdminAnnouncements />} />
        <Route
          path="/announcements"
          element={<AnnouncementsPage userId={user.id} role={user.role} />}
        />
        <Route
          path="/messages"
          element={<MessagingPage userId={user.id} username={user.username} />}
        />
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
