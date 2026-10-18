
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Routes, Route, Navigate } from "react-router-dom";
import logo from "../../assets/logo.svg";
import iconEyeClosed from "../../assets/closed-eye-icon.svg";
import { loginUser } from "../../services/api";
import "./UserForm.css";



const UserForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    setErrors({});
    setServerError("");

    const cleanEmail = email.trim().toLowerCase();
    const newErrors = {};

    // Email validation
    if (!cleanEmail) {
      newErrors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      newErrors.email = "Enter a valid email address.";
    }

    // Password validation
    if (!password) {
      newErrors.password = "Password is required.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);

try {
  const data = await loginUser(cleanEmail, password);

  if (!data.access_token || !data.refresh_token || !data.user) {
    setServerError(
      "Login information is missing. Please contact the administrator."
    );
    return;
  }


  sessionStorage.setItem("orbitAuthMethod", "password");

  localStorage.setItem("access_token", data.access_token);
  localStorage.setItem("refresh_token", data.refresh_token);
  localStorage.setItem("orbitUser", JSON.stringify(data.user));

  navigate("/home");

} catch (error) {
  if (error.status === 401) {
    setServerError("Invalid email or password.");
  } else if (error.status === 403) {
    setServerError("This account is disabled.");
  } else if (error.status === 429) {
    setServerError(
      "Too many login attempts. Please try again later."
    );
  } else if (error.status) {
    setServerError(error.message);
  } else {
    setServerError(
      "Cannot connect to the server. Make sure the backend is running."
    );
  }
} finally {
  setIsLoading(false);
}

  };

  return (
    <main className="user-form-page">
      <div className="user-form-container">
        <div className="user-form-logo">
          <img src={logo} alt="ORBIT Logo" />
          <span className="logo-text">RBIT</span>
        </div>

        <section className="login-card">
          <div className="login-header">
            <h1>Welcome Back</h1>
            <p>Ready to work!</p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {/* Email */}
            <div className="form-group">
              <label htmlFor="email">Email</label>

              <div className="input-wrapper">
                <input
                  id="email"
                  type="email"
                  placeholder="Enter your work email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrors((prev) => ({
                      ...prev,
                      email: "",
                    }));
                    setServerError("");
                  }}
                  autoComplete="username"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={
                    errors.email ? "email-error" : undefined
                  }
                />
              </div>

              {errors.email && (
                <p
                  id="email-error"
                  className="field-error"
                  role="alert"
                >
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="form-group password-group">
              <label htmlFor="password">Password</label>

              <div className="input-wrapper">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors((prev) => ({
                      ...prev,
                      password: "",
                    }));
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
                  onClick={() =>
                    setShowPassword((prev) => !prev)
                  }
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                >
                  <img src={iconEyeClosed} alt="" />
                </button>
              </div>

              {errors.password && (
                <p
                  id="password-error"
                  className="field-error"
                  role="alert"
                >
                  {errors.password}
                </p>
              )}

              <a
                href="/change-password"
                className="forgot-password"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/change-password");
                }}
              >
                Forgot Password?
              </a>
            </div>

            {/* Backend error */}
            {serverError && (
              <p className="login-error" role="alert">
                {serverError}
              </p>
            )}

            <div className="signup-signin-buttons">
              <button
                type="button"
                className="Sign-Up-button"
                onClick={() => navigate("/signup")}
              >
                Sign Up
              </button>

              <button
                type="submit"
                className="Sign-In-button"
                disabled={isLoading}
              >
                {isLoading ? "Signing In..." : "Sign In"}
              </button>
            </div>

            <div className="sso-login">
              <span>Login with SSO</span>

              <button
                type="button"
                className="google-login-button"
                aria-label="Login with Google"
              

                onClick={() => {
  sessionStorage.setItem("orbitAuthMethod", "sso");

  window.location.href =
    "http://localhost:8000/api/auth/sso/";
}}
              >
                <img
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                  alt="Google"
                />
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
};

export default UserForm;
