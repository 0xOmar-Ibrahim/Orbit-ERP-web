import { Routes, Route, Navigate } from "react-router-dom";

import UserForm from "./Components/UserLoginPage/UserForm";
import SignUp from "./Components/SignUpPage/SignUp";
import UserHome from "./Components/UserHomePage/UserHome";
import ChangePassword from "./Components/UserLoginPage/ChangePassword";


export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<UserForm />} />

      <Route path="/signup" element={<SignUp />} />
      <Route path="/home" element={<UserHome />} />
      <Route path="/change-password" element={<ChangePassword />} />
    </Routes>
  );
}
