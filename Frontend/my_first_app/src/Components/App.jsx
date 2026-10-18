import React, { Component } from "react";

import "../Themes/App.css";
import LoginForm from "./AdminLoginPage/LoginForm";

import {  Route, Routes } from "react-router-dom";
import EmoloyeesPage from "./EmployeesManagement/EmployeesPage";
import AddEmployeePage from "./AddEmployee/AddEmployeePage";


class App extends Component {
  render() {
    return (
        <Routes>
          <Route path="/" element={<LoginForm />} />
          <Route path="/employees" element={<EmoloyeesPage />} />
          <Route path="/employees/add" element = {<AddEmployeePage />} />
       </Routes>
    );
  }
}

export default App;
