
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import logoDark from "../../assets/dark.png";
import logoLight from "../../assets/light.png";
import "./SignUp.css";

const API_URL = "http://127.0.0.1:8000/api/auth/signup/";

const SignUp = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("orbitLoginTheme") === "dark"
  );

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem("orbitLoginTheme", darkMode ? "dark" : "light");
  }, [darkMode]);


  const isValidName = (name) => {
  return /^[A-Za-z]+$/.test(name);
};

  const isValidPassword = (value) =>
    value.length >= 8 &&
    /[A-Z]/.test(value) &&
    /[0-9]/.test(value) &&
    /[^A-Za-z0-9\s]/.test(value);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !email.trim() ||
      !password ||
      !confirmPassword
    ) {
      setError("Please fill in all fields.");
      return;
    }

    if (!isValidName(firstName.trim())) {
  setError("First name must contain letters only.");
  return;
}

if (!isValidName(lastName.trim())) {
  setError("Last name must contain letters only.");
  return;
}

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!isValidPassword(password)) {
      setError(
        "Password must be at least 8 characters and include an uppercase letter, a number, and a special character."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          work_email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const messages = Object.entries(data)
          .map(([field, value]) => {
            const message = Array.isArray(value)
              ? value.join(" ")
              : typeof value === "string"
                ? value
                : JSON.stringify(value);

            return `${field}: ${message}`;
          })
          .join(" ");

        throw new Error(
          messages || "Registration failed. Please try again."
        );
      }

      setSuccess(true);
    } catch (err) {
      if (err instanceof TypeError) {
        setError(
          "Unable to connect to the server. Please check that the backend is running."
        );
      } else {
        setError(err.message || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const renderEye = (isOpen) =>
    isOpen ? (
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
        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ) : (
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
        <path d="m3 3 18 18" />
        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
        <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a15 15 0 0 1-3 3.8" />
        <path d="M6.2 6.2C3.5 8 2 12 2 12s3.6 7 10 7a10 10 0 0 0 4-.8" />
      </svg>
    );

  return (
    <main
      className={`user-form-page ${darkMode ? "dark-mode" : "light-mode"}`}
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
        <div className="login-card signup-card">
          <div className="login-header">
            <p className="account-label">ORBIT ACCOUNT</p>
            <h2>Join the orbit</h2>
            <p>Create an account and start exploring.</p>
          </div>

          <div className="auth-tabs">
            <button
              type="button"
              className="auth-tab"
              onClick={() => navigate("/login")}
            >
              Log in
            </button>

            <button type="button" className="auth-tab active">
              Sign up
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="signup-name-row">
              <div className="form-group">
                <label htmlFor="firstName">First Name</label>
                <div className="input-wrapper">
                  <input
                    id="firstName"
                    type="text"
                    placeholder="First name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    autoComplete="given-name"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="lastName">Last Name</label>
                <div className="input-wrapper">
                  <input
                    id="lastName"
                    type="text"
                    placeholder="Last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    autoComplete="family-name"
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="signupEmail">Email</label>
              <div className="input-wrapper">
                <input
                  id="signupEmail"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="signup-name-row">
              <div className="form-group">
                <label htmlFor="signupPassword">Password</label>
                <div className="input-wrapper">
                  <input
                    id="signupPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {renderEye(showPassword)}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <div className="input-wrapper">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setShowConfirmPassword((prev) => !prev)
                    }
                    aria-label={
                      showConfirmPassword ? "Hide password" : "Show password"
                    }
                  >
                    {renderEye(showConfirmPassword)}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <p className="login-error" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="Sign-In-button signup-submit"
              disabled={loading}
            >
              <span>
                {loading ? "Creating account..." : "Create account"}
              </span>
              <span className="button-arrow" aria-hidden="true">
                →
              </span>
            </button>
          </form>
        </div>
      </section>

      {success && (
        <div
          className="signup-success-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="signup-success-title"
        >
          <div className="signup-success-card">
            <div className="signup-success-icon">✓</div>
            <h2 id="signup-success-title">Registration Successful!</h2>
            <p>
              Your registration request has been submitted successfully.
              Your account may require approval before you can log in.
            </p>
            <button
              type="button"
              className="signup-success-button"
              onClick={() => navigate("/login")}
            >
              Go to Login
            </button>
          </div>
        </div>
      )}
    </main>
  );
};

export default SignUp;
