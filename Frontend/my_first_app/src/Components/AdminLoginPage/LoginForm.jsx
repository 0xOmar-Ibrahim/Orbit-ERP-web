import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../../Images/logo.jpeg";
import logoDark from "../../assets/dark.png";
import logoLight from "../../assets/light.png";
import "./LoginForm.css";

function LoginForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("orbitLoginTheme") === "dark"
  );

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

    setErrors({
      email: eErr,
      password: pErr,
    });

    if (eErr || pErr) return;

    setServerError("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:8000/admin/login/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setServerError(
          data.detail ||
            data.message ||
            data.non_field_errors?.[0] ||
            "Invalid email or password."
        );
        return;
      }

      if (!data.access_token || !data.user) {
        setServerError("Invalid login response from the server.");
        return;
      }

      if (data.user.role_name !== "Admin") {
        setServerError("You do not have permission to access the Admin Panel.");
        return;
      }

      sessionStorage.setItem("access_token", data.access_token);
      sessionStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("orbitUser", JSON.stringify(data.user));
      sessionStorage.setItem("orbitAuthMethod", "password");

      navigate("/employees");
    } catch (err) {
      console.error("Login error:", err);

      setServerError(
        "Cannot connect to the server. Check that Django is running."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={`user-form-page ${darkMode ? "dark-mode" : "light-mode"}`}>
      <button
        type="button"
        className="theme-toggle"
        onClick={() => setDarkMode((prev) => !prev)}
        aria-label={`Switch to ${darkMode ? "light" : "dark"} mode`}
        title={`Switch to ${darkMode ? "light" : "dark"} mode`}
      >
        {darkMode ? "☀" : "☾"}
      </button>

      <section className="brand-panel">
        <div className="user-form-logo">
          <img
            src={darkMode ? logoDark : logoLight}
            alt="Orbit logo"
            className="logo-image"
          />
        </div>

        <div className="brand-content">
          <p className="brand-eyebrow">
            <span className="eyebrow-line" />
            CEO MANAGEMENT PLATFORM
          </p>

          <h1>
            Everything you
            <br />
            need, all in one orbit.
          </h1>

          <p className="brand-description">
            A focused workspace that keeps your ideas, projects, and team in
            perfect sync.
          </p>
        </div>

        <div className="brand-glow" />
      </section>

      <section className="login-panel">
        <div className="login-card">
          <div className="login-header">
            <p>Welcome in Admin Login Page Please Fill All Data .</p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <h1 className="login-title">ADMIN PANEL</h1>
            <div className="form-group">
              <label htmlFor="email">Email address</label>
              <div className="input-wrapper">
                <input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrors((prev) => ({ ...prev, email: "" }));
                    setServerError("");
                  }}
                  autoComplete="username"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? "email-error" : undefined}
                />
              </div>
              {errors.email && (
                <p id="email-error" className="field-error" role="alert">
                  {errors.email}
                </p>
              )}
            </div>

            <div className="form-group password-group">
              <label className="field-label" htmlFor="password">
                Password
              </label>
              <div className="input-wrapper">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors((prev) => ({ ...prev, password: "" }));
                    setServerError("");
                  }}
                  autoComplete="current-password"
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={
                    errors.password ? "password-error" : undefined
                  }
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg
                      viewBox="0 0 24 24"
                      width="19"
                      height="19"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  ) : (
                    // Closed eye
                    <svg
                      viewBox="0 0 24 24"
                      width="19"
                      height="19"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m3 3 18 18" />
                      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                      <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a15 15 0 0 1-3 3.8" />
                      <path d="M6.2 6.2C3.5 8 2 12 2 12s3.6 7 10 7a10 10 0 0 0 4-.8" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="field-error" role="alert">
                  {errors.password}
                </p>
              )}
            </div>
            {serverError && (
              <p className="login-error" role="alert">
                {serverError}
              </p>
            )}

            <button type="submit" className="Sign-In-button" disabled={loading}>
              <span>{loading ? "Signing in..." : "Log in to Admin"}</span>
              <span className="button-arrow" aria-hidden="true">
                →
              </span>
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

export default LoginForm;
