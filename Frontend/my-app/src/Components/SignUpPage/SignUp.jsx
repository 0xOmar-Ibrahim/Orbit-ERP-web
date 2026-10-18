
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/logo.svg";
import iconEyeClosed from "../../assets/closed-eye-icon.svg";
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

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const navigate = useNavigate();

  // Password must contain:
  // At least 8 characters, uppercase letter, number, special character
  const isValidPassword = (value) => {
    return (
      value.length >= 8 &&
      /[A-Z]/.test(value) &&
      /[0-9]/.test(value) &&
      /[^A-Za-z0-9\s]/.test(value)
    );
  };

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

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!isValidPassword(password)) {
      setError(
        "Password must be at least 8 characters and include an uppercase letter, a number, and a special character (e.g. !@#$%)."
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
          password: password,
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

      // Show the success modal instead of a browser alert
      setSuccess(true);
    } catch (err) {
      if (err instanceof TypeError) {
        setError(
          "Unable to connect to the server. Please check that the backend is running."
        );
      } else {
        setError(
          err.message || "Something went wrong. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Password visibility icon
  const EyeIcon = ({ open }) =>
    open ? (
      <svg
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ) : (
      <img src={iconEyeClosed} alt="" />
    );

  return (
    <main className="signup-page">
      {/* Success Modal */}
      {success && (
        <div
          className="signup-success-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="signup-success-title"
        >
          <div className="signup-success-card">
            <div className="signup-success-icon">✓</div>

            <h2 id="signup-success-title">
              Registration Successful!
            </h2>

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

      <div className="signup-container">
        {/* Logo */}
        <div className="signup-logo">
          <img src={logo} alt="ORBIT logo" />
          <span className="signup-logo-text">RBIT</span>
        </div>

        {/* Signup Form */}
        <section className="signup-card">
          <header className="signup-header">
            <h1>Create Account</h1>
            <p>Enter your details to get started</p>
          </header>

          <form onSubmit={handleSubmit} noValidate>
            {/* First Name and Last Name */}
            <div className="signup-name-row">
              <div className="signup-field">
                <label htmlFor="firstName">First Name</label>
                <input
                  id="firstName"
                  type="text"
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                  required
                />
              </div>

              <div className="signup-field">
                <label htmlFor="lastName">Last Name</label>
                <input
                  id="lastName"
                  type="text"
                  placeholder="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="signup-field">
              <label htmlFor="signupEmail">Email</label>
              <input
                id="signupEmail"
                type="email"
                placeholder="employee@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            {/* Password */}
            <div className="signup-field">
              <label htmlFor="signupPassword">Password</label>

              <div className="signup-input-wrapper">
                <input
                  id="signupPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />

                <button
                  type="button"
                  className="signup-password-toggle"
                  onClick={() =>
                    setShowPassword((prev) => !prev)
                  }
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="signup-field">
              <label htmlFor="confirmPassword">
                Confirm Password
              </label>

              <div className="signup-input-wrapper">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />

                <button
                  type="button"
                  className="signup-password-toggle"
                  onClick={() =>
                    setShowConfirmPassword((prev) => !prev)
                  }
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirm password"
                      : "Show confirm password"
                  }
                >
                  <EyeIcon open={showConfirmPassword} />
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <p className="signup-error" role="alert">
                {error}
              </p>
            )}

            {/* Submit Button */}
            <div className="signup-actions">
              <button
                type="submit"
                className="Sign-In-button signup-submit"
                disabled={loading}
              >
                {loading ? "Creating Account..." : "Sign Up"}
              </button>
            </div>

            {/* Login Link */}
            <p className="signup-footer">
              Already have an account?{" "}
              <a
                href="/login"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/login");
                }}
              >
                Login
              </a>
            </p>
          </form>
        </section>
      </div>
    </main>
  );
};

export default SignUp;
