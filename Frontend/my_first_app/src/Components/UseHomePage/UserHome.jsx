import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import logoDark from "../../assets/dark.png";
import logoLight from "../../assets/light.png";

import projectManagerIcon from "../../assets/projectmanager.svg";
import crmIcon from "../../assets/crm.svg";
import financeIcon from "../../assets/finance.svg";
import hrIcon from "../../assets/hr.svg";
import analyticsIcon from "../../assets/analytics.svg";
import notificationIcon from "../../assets/notification.svg";
import tasksIcon from "../../assets/tasks.svg";
import settingsIcon from "../../assets/settings.svg";
import moonIcon from "../../assets/moon.svg";

import "./UserHome.css";

const API_URL = "http://localhost:8000/api/auth/me/";
const LOGOUT_API_URL = "http://localhost:8000/api/auth/logout/";

const UserHome = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(false);

  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("orbitLoginTheme") === "dark"
  );

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Keep the Home theme synchronized with the saved Login theme.
  useEffect(() => {
    localStorage.setItem(
      "orbitLoginTheme",
      darkMode ? "dark" : "light"
    );
  }, [darkMode]);

  // Apply the saved theme when returning to Home.
  useEffect(() => {
    const savedTheme = localStorage.getItem("orbitLoginTheme");
    setDarkMode(savedTheme === "dark");
  }, [location.key]);

  // Load the authenticated user.
  useEffect(() => {
    let cancelled = false;

    const loadUser = async () => {
      const authMethod = sessionStorage.getItem("orbitAuthMethod");
      const savedUser = localStorage.getItem("orbitUser");

      try {
        if (!authMethod) {
          navigate("/login", { replace: true });
          return;
        }

        // Password login.
        if (authMethod === "password") {
          if (!savedUser) {
            navigate("/login", { replace: true });
            return;
          }

          let parsedUser;

          try {
            parsedUser = JSON.parse(savedUser);
          } catch {
            localStorage.removeItem("orbitUser");
            sessionStorage.removeItem("orbitAuthMethod");
            navigate("/login", { replace: true });
            return;
          }

          if (!parsedUser || typeof parsedUser !== "object") {
            localStorage.removeItem("orbitUser");
            sessionStorage.removeItem("orbitAuthMethod");
            navigate("/login", { replace: true });
            return;
          }

          if (!cancelled) {
            setUser(parsedUser);
          }

          return;
        }

        // Google / SSO login.
        if (authMethod === "sso") {
          const response = await fetch(API_URL, {
            method: "GET",
            credentials: "include",
            headers: {
              Accept: "application/json",
            },
          });

          let data = {};

          try {
            data = await response.json();
          } catch {
            // The response may not contain JSON.
          }

          if (!response.ok) {
            throw new Error(
              data.detail ||
                data.error ||
                `Unable to load user (${response.status})`
            );
          }

          const currentUser = data.user ?? data;

          if (
            !currentUser ||
            typeof currentUser !== "object" ||
            Array.isArray(currentUser)
          ) {
            throw new Error("Invalid user information received.");
          }

          if (cancelled) return;

          setUser(currentUser);

          localStorage.setItem(
            "orbitUser",
            JSON.stringify(currentUser)
          );

          if (data.access_token) {
            localStorage.setItem("access_token", data.access_token);
          }

          return;
        }

        // Unknown authentication method.
        sessionStorage.removeItem("orbitAuthMethod");
        navigate("/login", { replace: true });
      } catch (err) {
        if (cancelled) return;

        console.error("Authentication error:", err);

        localStorage.removeItem("orbitUser");
        sessionStorage.removeItem("orbitAuthMethod");

        navigate("/login", { replace: true });
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadUser();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  // Keep the existing user name and role.
  const fullName = user
    ? [user.first_name, user.last_name]
        .filter(Boolean)
        .join(" ")
    : "";

  const mainModules = [
    {
      name: "Project Management",
      path: "/project-management",
      icon: projectManagerIcon,
    },
    {
      name: "CRM",
      path: "/crm",
      icon: crmIcon,
    },
    {
      name: "Accounting & Finance",
      path: "/accounting-finance",
      icon: financeIcon,
    },
    {
      name: "HR",
      path: "/hr",
      icon: hrIcon,
    },
    {
      name: "Reports & Analytics",
      path: "/reports-analytics",
      icon: analyticsIcon,
    },
  ];

  const otherModules = [
    {
      name: "Notifications",
      path: "/notifications",
      icon: notificationIcon,
    },
    {
      name: "Tasks",
      path: "/tasks",
      icon: tasksIcon,
    },
    {
      name: "Settings",
      path: "/settings",
      icon: settingsIcon,
    },
  ];

  const openModule = (path) => {
    navigate(path);
  };

  const handleLogout = async () => {
    try {
      const accessToken = localStorage.getItem("access_token");

      await fetch(LOGOUT_API_URL, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(accessToken
            ? { Authorization: `Bearer ${accessToken}` }
            : {}),
        },
      });
    } catch (err) {
      console.error("Logout request failed:", err);
    } finally {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("orbitUser");
      sessionStorage.removeItem("orbitAuthMethod");

      navigate("/login", { replace: true });
    }
  };

  const renderModule = (module) => (
    <button
      type="button"
      key={module.path}
      className={`module-link ${
        location.pathname === module.path ? "active" : ""
      }`}
      onClick={() => openModule(module.path)}
      title={collapsed ? module.name : ""}
    >
      <img
        src={module.icon}
        alt=""
        className="nav-icon"
        aria-hidden="true"
      />

      {!collapsed && <span>{module.name}</span>}
    </button>
  );

  if (loading) {
    return (
      <main className={`home-page ${darkMode ? "dark-mode" : ""}`}>
        <div className="home-loading">Loading...</div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className={`home-page ${darkMode ? "dark-mode" : ""}`}>
      <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
       <div className="brand-container">
  <img
    className={`home-logo ${collapsed ? "logo-collapsed" : ""}`}
    src={darkMode ? logoDark : logoLight}
    alt="Orbit logo"
  />

  <button
    className="collapse-button"
    type="button"
    onClick={() => setCollapsed((prev) => !prev)}
    aria-label="Toggle sidebar"
    title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
  >
    {collapsed ? "»" : "«"}
  </button>
</div>
        

        <div className="sidebar-divider" />

        <nav className="sidebar-navigation">
          <div className="main-modules">
            {mainModules.map(renderModule)}
          </div>

          <div className="secondary-modules">
            {otherModules.map(renderModule)}

            <div className="module-link dark-mode-row">
              {!collapsed && (
                <>
                  <img
                    src={moonIcon}
                    alt=""
                    className="nav-icon"
                    aria-hidden="true"
                  />

                  <span>Dark Mode</span>
                </>
              )}

              <button
                type="button"
                className={`dark-toggle ${darkMode ? "enabled" : ""}`}
                onClick={() => setDarkMode((prev) => !prev)}
                aria-label="Toggle dark mode"
                aria-pressed={darkMode}
                title="Toggle dark mode"
              >
                <span />
              </button>
            </div>
          </div>
        </nav>

        {!collapsed && (
          <div className="sidebar-footer">
            <div className="profile-card">
              <div className="profile-info">
                <strong>{fullName || user.username || "User"}</strong>

                <span>
                  {user.role_name || user.role || "Employee"}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="logout-button"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        )}
      </aside>

      <section className="home-content">
        {/* Your page content or nested routes go here. */}
      </section>
    </main>
  );
};

export default UserHome;