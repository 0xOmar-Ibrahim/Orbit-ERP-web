import React, { Component } from "react";

import "../Themes/App.css";
import LoginForm from "./AdminLoginPage/LoginForm";

import { Route, Routes } from "react-router-dom";
import EmoloyeesPage from "./EmployeesManagement/EmployeesPage";
import AddEmployeePage from "./AddEmployee/AddEmployeePage";
import { Navigate } from "react-router-dom";

import UserForm from "./UserLoginPage/UserForm";
import SignUp from "./SignUpPage/SignUp";
import UserHome from "./UseHomePage/UserHome";
import ChangePassword from "./UserLoginPage/ChangePassword";

class App extends Component {
  render() {
    return (
      <Routes>
         <Route path="/" element={<Navigate to="/login" replace />} />
         <Route path="/login" element={<UserForm />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/admin" element={<LoginForm />} />
        <Route path="/home" element={<UserHome />} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/employees" element={<EmoloyeesPage />} />
        <Route path="/employees/add" element={<AddEmployeePage />} />
       
        

        
      </Routes>
    );
  }
}

export default App;
