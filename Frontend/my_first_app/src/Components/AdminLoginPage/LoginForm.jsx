import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../../Images/Logo.jpg";
import "./LoginForm.css";

function LoginForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const validateEmail = (value) => {
    if (!value) return "Email is required";
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(value)) return "Enter a valid email address";
    return "";
  };

  const validatePassword = (value) => {
    if (!value) return "Password is required";
    if (value.length < 6) return "Password must be at least 6 characters";
    return "";
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    if (emailError) setEmailError(validateEmail(value));
  };

  const handleEmailBlur = () => {
    setEmailError(validateEmail(email));
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    if (passwordError) setPasswordError(validatePassword(value));
  };

  const handlePasswordBlur = () => {
    setPasswordError(validatePassword(password));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    setEmailError(eErr);
    setPasswordError(pErr);
    if (eErr || pErr) return;

    setError("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:8000/admin/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
     

      if (!response.ok) {
        setError(
          data.detail ||
            data.non_field_errors?.[0] ||
            "Invalid email or password."
        );
        return;
      }

      if (!data.access_token || !data.user) {
        setError("Invalid login response from the server.");
        return;
      }
      
      sessionStorage.setItem("access_token", data.access_token);
      sessionStorage.setItem("user", JSON.stringify(data.user));

      if (data.user.role_name !== "Admin") {
        sessionStorage.clear();
        setError("You do not have permission to access the Admin Panel.");
        return;
      }

      navigate("/employees");
    } catch (err) {
      setError("Cannot connect to the server. Check that Django is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-logo" aria-label="Orbit">
        <img src={Logo} alt="" className="logo-icon" />
        <span className="logo-text" aria-hidden="true">
          RBIT
        </span>
      </div>

      <form className="login-card" onSubmit={handleSubmit} noValidate>
        <h1 className="login-title">ADMIN PANEL</h1>

        {error && (
          <div className="login-error" role="alert">
            ⚠ {error}
          </div>
        )}

        <label className="field-label" htmlFor="email">
          Email
        </label>
        <div className={`input-wrap ${emailError ? "input-error" : ""}`}>
          <svg
            className="input-icon"
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
          </svg>
          <input
            id="email"
            type="email"
            placeholder="orbit.employee@orbit.org"
            value={email}
            onChange={handleEmailChange}
            onBlur={handleEmailBlur}
          />
        </div>
        {emailError && <p className="field-error">{emailError}</p>}

        <label className="field-label" htmlFor="password">
          Password
        </label>
        <div className={`input-wrap ${passwordError ? "input-error" : ""}`}>
          <svg
            className="input-icon"
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
          </svg>
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="•••••••••••••"
            value={password}
            onChange={handlePasswordChange}
            onBlur={handlePasswordBlur}
          />
          <button
            type="button"
            className="toggle-eye"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                <path d="M1 1l22 22" />
              </svg>
            )}
          </button>
        </div>
        {passwordError && <p className="field-error">{passwordError}</p>}

        <button type="submit" className="login-btn" disabled={loading}>
          {loading ? "LOGGING IN..." : "LOGIN"}
        </button>
      </form>
    </div>
  );
}

export default LoginForm;
