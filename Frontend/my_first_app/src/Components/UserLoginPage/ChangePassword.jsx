
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import logoDark from "../../assets/dark.png";
import logoLight from "../../assets/light.png";
import "./UserForm.css";

const ChangePassword = () => {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("orbitLoginTheme") === "dark"
  );

  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem(
      "orbitLoginTheme",
      darkMode ? "dark" : "light"
    );
  }, [darkMode]);

  const handleSubmit = (e) => {
    e.preventDefault();

    setErrors({});
    setSuccessMessage("");

    const newErrors = {};
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      newErrors.email = "Email is required.";
    } else if (!/^[^\s@]+@gmail\.com$/i.test(cleanEmail)) {
      newErrors.email = "Enter a valid Gmail address.";
    }

    if (!newPassword) {
      newErrors.newPassword = "New password is required.";
    } else if (newPassword.length < 8) {
      newErrors.newPassword =
        "Password must be at least 8 characters.";
    } else if (!/[A-Z]/.test(newPassword)) {
      newErrors.newPassword =
        "Password must contain at least one uppercase letter.";
    } else if (!/[0-9]/.test(newPassword)) {
      newErrors.newPassword =
        "Password must contain at least one number.";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password.";
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const savedUsers = JSON.parse(
        localStorage.getItem("orbitUsers") || "{}"
      );

      const user = savedUsers[cleanEmail];

      if (!user) {
        setErrors({
          email: "No registered account found with this email.",
        });
        return;
      }

      savedUsers[cleanEmail] = {
        ...user,
        password: newPassword,
      };

      localStorage.setItem("orbitUsers", JSON.stringify(savedUsers));

      setSuccessMessage(
        "Password changed successfully! Redirecting to login..."
      );

      setTimeout(() => {
        navigate("/login");
      }, 1200);
    } catch {
      setErrors({
        general: "Unable to save the new password. Please try again.",
      });
    }
  };

  const togglePassword = (field) => {
    if (field === "new") {
      setShowNewPassword((prev) => !prev);
    } else {
      setShowConfirmPassword((prev) => !prev);
    }
  };

  const renderEye = (visible) => (
    <svg
      viewBox="0 0 24 24"
      width="19"
      height="19"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {visible ? (
        <>
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <>
          <path d="m3 3 18 18" />
          <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
          <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a15 15 0 0 1-3 3.8" />
          <path d="M6.2 6.2C3.5 8 2 12 2 12s3.6 7 10 7a10 10 0 0 0 4-.8" />
        </>
      )}
    </svg>
  );

  return (
    <main
      className={`user-form-page ${
        darkMode ? "dark-mode" : "light-mode"
      }`}
    >
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
            A fresh start,
            <br />
            a more secure orbit.
          </h1>

          <p className="brand-description">
            Update your password and keep your account secure.
          </p>
        </div>

        <div className="brand-glow" />
      </section>

      <section className="login-panel">
        <div className="login-card change-password-card">
          <div className="login-header">
            <p className="account-label">ORBIT ACCOUNT</p>
            <h2>Change password</h2>
            <p>Enter your email and choose your new password.</p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="change-email">Email address</label>

              <div className="input-wrapper">
                <input
                  id="change-email"
                  type="email"
                  placeholder="name@gmail.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrors((prev) => ({
                      ...prev,
                      email: "",
                      general: "",
                    }));
                    setSuccessMessage("");
                  }}
                  autoComplete="email"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={
                    errors.email ? "change-email-error" : undefined
                  }
                />
              </div>

              {errors.email && (
                <p
                  id="change-email-error"
                  className="field-error"
                  role="alert"
                >
                  {errors.email}
                </p>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="new-password">New password</label>

              <div className="input-wrapper">
                <input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setErrors((prev) => ({
                      ...prev,
                      newPassword: "",
                      confirmPassword: "",
                      general: "",
                    }));
                    setSuccessMessage("");
                  }}
                  autoComplete="new-password"
                  aria-invalid={Boolean(errors.newPassword)}
                  aria-describedby={
                    errors.newPassword ? "new-password-error" : undefined
                  }
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => togglePassword("new")}
                  aria-label={
                    showNewPassword ? "Hide password" : "Show password"
                  }
                >
                  {renderEye(showNewPassword)}
                </button>
              </div>

              {errors.newPassword && (
                <p
                  id="new-password-error"
                  className="field-error"
                  role="alert"
                >
                  {errors.newPassword}
                </p>
              )}
            </div>

            <div className="form-group password-group">
              <label htmlFor="confirm-password">Confirm password</label>

              <div className="input-wrapper">
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setErrors((prev) => ({
                      ...prev,
                      confirmPassword: "",
                      general: "",
                    }));
                    setSuccessMessage("");
                  }}
                  autoComplete="new-password"
                  aria-invalid={Boolean(errors.confirmPassword)}
                  aria-describedby={
                    errors.confirmPassword
                      ? "confirm-password-error"
                      : undefined
                  }
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => togglePassword("confirm")}
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirm password"
                      : "Show confirm password"
                  }
                >
                  {renderEye(showConfirmPassword)}
                </button>
              </div>

              {errors.confirmPassword && (
                <p
                  id="confirm-password-error"
                  className="field-error"
                  role="alert"
                >
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            {errors.general && (
              <p className="login-error" role="alert">
                {errors.general}
              </p>
            )}

            {successMessage && (
              <p className="password-success" role="status">
                {successMessage}
              </p>
            )}

            <button
              type="submit"
              className="Sign-In-button change-password-button"
            >
              <span>Change password</span>
              <span className="button-arrow" aria-hidden="true">
                →
              </span>
            </button>

             <div className="auth-divider">
              <span />
              <p>OR</p>
              <span />
            </div>

            <p className="google-login-text">
              Remember your password?{" "}
              <a
                href="/login"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/login");
                }}
              >
                Back to login
              </a>
            </p>
          </form>
        </div>
      </section>
    </main>
  );
};

export default ChangePassword;
