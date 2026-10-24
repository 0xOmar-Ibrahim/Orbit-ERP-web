
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/logo.svg";
import iconEyeClosed from "../../assets/closed-eye-icon.svg";
import "./UserForm.css";

const ChangePassword = () => {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");

  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();

    setErrors({});
    setSuccessMessage("");

    const newErrors = {};
    const cleanEmail = email.trim().toLowerCase();

    // Validate email
    if (!cleanEmail) {
      newErrors.email = "Email is required.";
    } else if (!/^[^\s@]+@gmail\.com$/i.test(cleanEmail)) {
      newErrors.email = "Enter a valid Gmail address.";
    }

    // Validate new password
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

    // Validate confirmation
    if (!confirmPassword) {
      newErrors.confirmPassword =
        "Please confirm your password.";
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword =
        "Passwords do not match.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      // Read registered accounts
      const savedUsers = JSON.parse(
        localStorage.getItem("orbitUsers") || "{}"
      );

      // Find the account by email
      const user = savedUsers[cleanEmail];

      if (!user) {
        setErrors({
          email: "No registered account found with this email.",
        });
        return;
      }

      // Save the new password for this account
      savedUsers[cleanEmail] = {
        ...user,
        password: newPassword,
      };

      localStorage.setItem(
        "orbitUsers",
        JSON.stringify(savedUsers)
      );

      setSuccessMessage(
        "Password changed successfully! Redirecting to login..."
      );

      // Return to the UserForm login page
      setTimeout(() => {
        navigate("/login");
      }, 1200);
    } catch (error) {
      setErrors({
        general: "Unable to save the new password. Please try again.",
      });
    }
  };

  return (
    <main className="user-form-page">
      <div className="user-form-container">
        {/* Logo */}
        <div className="user-form-logo">
          <img src={logo} alt="ORBIT Logo" />
          <span className="logo-text">RBIT</span>
        </div>

        {/* Change Password Card */}
        <section className="login-card change-password-card">
          <div className="login-header">
            <h1>Change Password</h1>
            <p>Enter your registered email and new password below</p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {/* Email */}
            <div className="form-group">
              <label htmlFor="change-email">Email</label>

              <div className="input-wrapper">
                <input
                  id="change-email"
                  type="email"
                  placeholder="Enter your registered Gmail"
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
                  required
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

            {/* New Password */}
            <div className="form-group">
              <label htmlFor="new-password">New Password</label>

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
                    errors.newPassword
                      ? "new-password-error"
                      : undefined
                  }
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowNewPassword((prev) => !prev)
                  }
                  aria-label={
                    showNewPassword ? "Hide password" : "Show password"
                  }
                >
                  <img src={iconEyeClosed} alt="" />
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

            {/* Confirm Password */}
            <div className="form-group password-group">
              <label htmlFor="confirm-password">
                Confirm Password
              </label>

              <div className="input-wrapper">
                <input
                  id="confirm-password"
                  type={
                    showConfirmPassword ? "text" : "password"
                  }
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
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowConfirmPassword((prev) => !prev)
                  }
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirm password"
                      : "Show confirm password"
                  }
                >
                  <img src={iconEyeClosed} alt="" />
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

            {/* General error */}
            {errors.general && (
              <p className="field-error" role="alert">
                {errors.general}
              </p>
            )}

            {/* Success message */}
            {successMessage && (
              <p className="password-success" role="status">
                {successMessage}
              </p>
            )}

            {/* Change Password Button */}
            <div className="change-password-actions">
              <button
                type="submit"
                className="Sign-In-button change-password-button"
              >
                Change Password
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
};

export default ChangePassword;
