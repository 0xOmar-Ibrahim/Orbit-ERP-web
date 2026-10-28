import React, { Component } from "react";

import "../Themes/App.css";

import { Route, Routes, Navigate, Outlet } from "react-router-dom";

import LoginForm from "./AdminLoginPage/LoginForm";
import EmoloyeesPage from "./EmployeesManagement/EmployeesPage";
import AddEmployeePage from "./AddEmployee/AddEmployeePage";
import UserForm from "./UserLoginPage/UserForm";
import SignUp from "./SignUpPage/SignUp";
import UserHome from "./UseHomePage/UserHome";
import ChangePassword from "./UserLoginPage/ChangePassword";

// Protect pages that require login

function ProtectedRoute() {
  const user = localStorage.getItem("orbitUser");
  const authMethod = sessionStorage.getItem("orbitAuthMethod");

  // No authentication method saved.
  if (!authMethod) {
    return <Navigate to="/login" replace />;
  }

  // Password login must already have saved the user.
  if (authMethod === "password" && !user) {
    return <Navigate to="/login" replace />;
  }

  // Allow SSO to reach Home so it can fetch the user from the backend.
  if (authMethod === "sso") {
    return <Outlet />;
  }

  return <Outlet />;
}


class App extends Component {
  render() {
    return (
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Public pages */}
        <Route path="/login" element={<UserForm />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/admin" element={<LoginForm />} />
        <Route path="/change-password" element={<ChangePassword />} />

        {/* Protected pages */}
        <Route element={<ProtectedRoute />}>
          <Route path="/home" element={<UserHome />} />
          <Route path="/employees" element={<EmoloyeesPage />} />
          <Route path="/employees/add" element={<AddEmployeePage />} />
        </Route>
      </Routes>
    );
  }
}

export default App;
