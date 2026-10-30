
import React, { Component } from "react";
import "../Themes/App.css";

import {
  Route,
  Routes,
  Navigate,
  Outlet,
} from "react-router-dom";

import LoginForm from "./AdminLoginPage/LoginForm";
import EmoloyeesPage from "./EmployeesManagement/EmployeesPage";
import AddEmployeePage from "./AddEmployee/AddEmployeePage";
import UserForm from "./UserLoginPage/UserForm";
import SignUp from "./SignUpPage/SignUp";
import UserHome from "./UseHomePage/UserHome";
import ChangePassword from "./UserLoginPage/ChangePassword";

import ProjectManagement from "./ProjectManagement/ProjectManagement";
import CRM from "./CRM/CRM";
import AccountingFinance from "./AccountingFinance/AccountingFinance";
import HR from "./HR/HR";
import ReportsAnalytics from "./ReportsAnalytics/ReportsAnalytics";
import Notifications from "./Notifications/Notifications";
import Tasks from "./Tasks/Tasks";
import Settings from "./Settings/Settings";

// Protect pages that require login
function ProtectedRoute() {
  const user = localStorage.getItem("orbitUser");
  const authMethod = sessionStorage.getItem("orbitAuthMethod");

  if (!authMethod) {
    return <Navigate to="/login" replace />;
  }

  if (authMethod === "password" && !user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

class App extends Component {
  render() {
    return (
      <Routes>
        {/* Default page */}
        <Route
          path="/"
          element={<Navigate to="/login" replace />}
        />

        {/* Public pages */}
        <Route path="/login" element={<UserForm />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/admin" element={<LoginForm />} />
        <Route
          path="/change-password"
          element={<ChangePassword />}
        />

        {/* Protected pages with shared Sidebar */}
        <Route element={<ProtectedRoute />}>
          <Route element={<UserHome />}>
            {/* Account Details / Home */}
            <Route
              index
              element={<Navigate to="/home" replace />}
            />
            <Route path="home" element={null} />

            {/* Main modules */}
            <Route
              path="project-management"
              element={<ProjectManagement />}
            />
            <Route path="crm" element={<CRM />} />
            <Route
              path="accounting-finance"
              element={<AccountingFinance />}
            />
            <Route path="hr" element={<HR />} />
            <Route
              path="reports-analytics"
              element={<ReportsAnalytics />}
            />

            {/* Other modules */}
            <Route
              path="notifications"
              element={<Notifications />}
            />
            <Route path="tasks" element={<Tasks />} />
            <Route path="settings" element={<Settings />} />

            {/* Employees pages */}
            <Route
              path="employees"
              element={<EmoloyeesPage />}
            />
            <Route
              path="employees/add"
              element={<AddEmployeePage />}
            />
          </Route>
        </Route>

        {/* Unknown paths */}
        <Route
          path="*"
          element={<Navigate to="/home" replace />}
        />
      </Routes>
    );
  }
}

export default App;
