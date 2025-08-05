import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import LoginPage from "./components/pages/otherpages/Login";
import ForgotPasswordPage from "./components/pages/otherpages/ForgotPasswordPage";
import OtpPage from "./components/pages/otherpages/OtpPage";
import AdminDashboard from "./components/pages/Dashboard/AdminDashboard";
import HrDashboard from "./components/pages/Dashboard/HrDashboard";
import PmDashboard from "./components/pages/Dashboard/PmDashboard";
import EmployeeDashboard from "./components/pages/Dashboard/EmployeeDashboard";
import FinanceDashboard from "./components/pages/Dashboard/FinanceDashboard";
import CrmDashboard from "./components/pages/Dashboard/CrmDashboard";
import ClientDashboard from "./components/pages/Dashboard/ClientDashboard";

import ItDashboard from "./components/pages/Dashboard/ItDashboard";
import UserManagementPage from "./components/pages/otherpages/UserManagementPage";
import RolePermissionManagement from "./components/pages/otherpages/RolePermissionManagement";
import AdminAnnouncements from "./components/pages/otherpages/AdminAnnouncements";
import AnnouncementsPage from "./components/pages/otherpages/AnnouncementsPage";
import MessagingPage from "./components/pages/otherpages/MessagingPage";
import AttendanceTracking from "./components/pages/otherpages/AttendanceTracking";
import ShiftManagement from "./components/pages/otherpages/ShiftManagement";
import TaskManagement from "./components/pages/otherpages/TaskManagement";
import MyTasks from "./components/pages/otherpages/MyTasks";
import LeaveBalance from "./components/pages/otherpages/LeaveBalance";
import LeaveManagement from "./components/pages/otherpages/LeaveManagement";
import ShiftChangeRequest from "./components/pages/otherpages/ShiftChangeRequest";
import MyShiftRequests from "./components/pages/otherpages/MyShiftRequests";
import ShiftRequestManagement from "./components/pages/otherpages/ShiftRequestManagement";
import ITInventory from "./components/pages/otherpages/ITInventory";
import AssetManagement from "./components/pages/otherpages/AssetManagement";
import AssetAssignment from "./components/pages/otherpages/AssetAssignment";
import AssetRequestManagement from "./components/pages/otherpages/AssetRequestManagement";
import AssetRequest from "./components/pages/otherpages/AssetRequest";
import MaintenanceManagement from "./components/pages/otherpages/MaintenanceManagement";
import CategoryManagement from "./components/pages/otherpages/CategoryManagement";
import VendorManagement from "./components/pages/otherpages/VendorManagement";
import ExpenseManagement from "./components/pages/otherpages/ExpenseManagement";
import PayrollManagement from "./components/pages/otherpages/PayrollManagement";
import PayslipViewer from "./components/pages/otherpages/PayslipViewer";
import { jwtDecode } from "jwt-decode";

// Placeholder components for OTP and Forgot Password
const Dashboard = () => <div>Dashboard (role-based redirection target)</div>;

// Authentication check function
const isAuthenticated = () => {
  const token = localStorage.getItem("erp_token") || sessionStorage.getItem("erp_token");
  
  if (!token) {
    return false;
  }

  try {
    const decoded = jwtDecode(token);
    const currentTime = Date.now() / 1000;
    
    // Check if token is expired
    if (decoded.exp && decoded.exp < currentTime) {
      // Token is expired, remove it
      localStorage.removeItem("erp_token");
      sessionStorage.removeItem("erp_token");
      return false;
    }
    
    return true;
  } catch (error) {
    // Invalid token, remove it
    localStorage.removeItem("erp_token");
    sessionStorage.removeItem("erp_token");
    return false;
  }
};

// Protected Route component
const ProtectedRoute = ({ children }) => {
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
};

function App() {
  // Get user info from JWT
  let user = { id: null, role: null, username: null };
  let token = localStorage.getItem("erp_token") || sessionStorage.getItem("erp_token");
  
  if (token) {
    try {
      const decoded = jwtDecode(token);
      user.id = decoded.userId || decoded.id || null;
      user.role = decoded.role || null;
      user.username = decoded.username || decoded.name || null;
    } catch (error) {
      // If token is invalid, clear it
      localStorage.removeItem("erp_token");
      sessionStorage.removeItem("erp_token");
    }
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

        <Route path="/dashboard/it" element={<ItDashboard />} />
        <Route path="/admin/users" element={<UserManagementPage />} />
        <Route
          path="/admin/roles-permissions"
          element={<RolePermissionManagement />}
        />
        <Route
          path="/admin/announcements"
          element={
            user.role === "Admin" ? (
              <AdminAnnouncements />
            ) : (
              <Navigate to="/announcements" />
            )
          }
        />
        <Route
          path="/announcements"
          element={<AnnouncementsPage userId={user.id} role={user.role} />}
        />
        <Route
          path="/messages"
          element={<MessagingPage userId={user.id} username={user.username} />}
        />
        <Route path="/attendance-tracking" element={<AttendanceTracking />} />
        <Route path="/shift-management" element={<ShiftManagement />} />
        <Route path="/task-management" element={<TaskManagement />} />
        <Route path="/my-tasks" element={<MyTasks />} />
        <Route path="/leave-balance" element={<LeaveBalance />} />
        <Route path="/leave-management" element={<LeaveManagement />} />
        <Route path="/shift-change-request" element={<ShiftChangeRequest />} />
        <Route path="/my-shift-requests" element={<MyShiftRequests />} />
        <Route
          path="/shift-request-management"
          element={<ShiftRequestManagement />}
        />
        <Route path="/it-inventory" element={<ITInventory />} />
        <Route path="/asset-management" element={<AssetManagement />} />
        <Route path="/asset-assignment" element={<AssetAssignment />} />
        <Route
          path="/asset-request-management"
          element={<AssetRequestManagement />}
        />
        <Route path="/asset-request" element={<AssetRequest />} />
        <Route
          path="/maintenance-management"
          element={<MaintenanceManagement />}
        />
        <Route path="/category-management" element={<CategoryManagement />} />
        <Route path="/vendor-management" element={<VendorManagement />} />
        <Route
          path="/expense-management"
          element={<ProtectedRoute><ExpenseManagement /></ProtectedRoute>}
        />
        <Route
          path="/payroll-management"
          element={<ProtectedRoute><PayrollManagement /></ProtectedRoute>}
        />
        <Route
          path="/payslips"
          element={<ProtectedRoute><PayslipViewer /></ProtectedRoute>}
        />
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
