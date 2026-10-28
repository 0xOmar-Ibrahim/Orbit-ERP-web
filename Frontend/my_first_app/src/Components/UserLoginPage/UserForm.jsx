
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import logoDark from "../../assets/dark.png";
import logoLight from "../../assets/light.png";
import { loginUser } from "../../Services/api";
import "./UserForm.css";

const GOOGLE_LOGIN_URL = "http://localhost:8000/api/auth/sso/";

const UserForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  

  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("orbitLoginTheme") === "dark"
  );

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const location = useLocation();

useEffect(() => {
  const params = new URLSearchParams(location.search);
  const message = params.get("message");

  if (message === "registration_pending") {
    setServerError("Your account is pending admin approval.");
  } else if (message === "registration_rejected") {
    setServerError("Your registration request has been rejected.");
  } else if (message === "contact_admin") {
    setServerError("Please contact the administrator to access your account.");
  }

  if (message) {
    navigate("/login", { replace: true });
  }
}, [location.search, navigate]);

  useEffect(() => {
    localStorage.setItem("orbitLoginTheme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setErrors({});
    setServerError("");

    const cleanEmail = email.trim().toLowerCase();
    const newErrors = {};

    if (!cleanEmail) {
      newErrors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      newErrors.email = "Enter a valid email address.";
    }

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

      if (!data?.access_token || !data?.user) {
        setServerError(
          "Login information is missing. Please contact the administrator."
        );
        return;
      }

      sessionStorage.setItem("orbitAuthMethod", "password");
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("orbitUser", JSON.stringify(data.user));

      navigate("/home");

} catch (error) {
  const message = error.message?.toLowerCase() || "";

  if (message.includes("registration is pending")) {
    setServerError(
      "Your account is pending admin approval."
    );
  } else if (message.includes("this account is disabled")) {
    setServerError(
      "This account is disabled."
    );
  } else if (message.includes("account not found")) {
    setServerError(
      "Account not found. Please check your email."
    );
  } else if (
    error.status === 401 &&
    message.includes("invalid email or password")
  ) {
    setServerError(
      "Invalid email or password."
    );
  } else if (error.status === 429) {
    setServerError(
      "Too many login attempts. Please try again later."
    );
  } else if (error.status) {
    setServerError(
      error.message || "Login failed. Please try again."
    );
  } else {
    setServerError(
      "Cannot connect to the server. Make sure the backend is running."
    );
  }
} finally {
  setIsLoading(false);
}

  };

  const handleGoogleLogin = () => {
    sessionStorage.setItem("orbitAuthMethod", "sso");
    window.location.href = GOOGLE_LOGIN_URL;
  };

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
            Everything you
            <br />
            need, all in one orbit.
          </h1>

          <p className="brand-description">
            A focused workspace that keeps your ideas, projects, and team
            in perfect sync.
          </p>
        </div>

        <div className="brand-glow" />
      </section>

      <section className="login-panel">
        <div className="login-card">
          <div className="login-header">
            <p className="account-label">ORBIT ACCOUNT</p>
            <h2>Welcome back</h2>
            <p>Enter your details to continue your journey.</p>
          </div>

          <div className="auth-tabs">
            <button
              type="button"
              className="auth-tab active"
              onClick={() => navigate("/login")}
            >
              Log in
            </button>

            <button
              type="button"
              className="auth-tab"
              onClick={() => navigate("/signup")}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate>
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
                  aria-describedby={
                    errors.email ? "email-error" : undefined
                  }
                />
              </div>

              {errors.email && (
                <p id="email-error" className="field-error" role="alert">
                  {errors.email}
                </p>
              )}
            </div>

            <div className="form-group password-group">
              <label htmlFor="password">Password</label>

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
    // Open eye
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

              <div className="forgot-row">
                <a
                  href="/change-password"
                  className="forgot-password"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("/change-password");
                  }}
                >
                  Forgot password?
                </a>
              </div>
            </div>

            {serverError && (
              <p className="login-error" role="alert">
                {serverError}
              </p>
            )}

            <button
              type="submit"
              className="Sign-In-button"
              disabled={isLoading}
            >
              <span>{isLoading ? "Signing in..." : "Log in to Orbit"}</span>
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
              Prefer Google?{" "}
              <a
                href={GOOGLE_LOGIN_URL}
                onClick={(e) => {
                  e.preventDefault();
                  handleGoogleLogin();
                }}
              >
                Login with Google
              </a>
            </p>
          </form>
        </div>
      </section>
    </main>
  );
};

export default UserForm;
