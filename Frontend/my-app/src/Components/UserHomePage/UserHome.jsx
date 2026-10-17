
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import logo from "../../assets/logo.svg";

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

const PASSWORD_API_URL =
  "http://127.0.0.1:8000/api/auth/me/";

const SSO_API_URL =
  "http://127.0.0.1:8000/api/auth/me/";

const UserHome = () => {
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const fetchCurrentUser = async () => {
      try {
 
const authMethod = sessionStorage.getItem("orbitAuthMethod");
const isSSO = authMethod === "sso";

const accessToken = isSSO
  ? null
  : localStorage.getItem("access_token");

const apiUrl = isSSO ? SSO_API_URL : PASSWORD_API_URL;

const response = await fetch(apiUrl, {
  method: "GET",
  credentials: "include",
  headers: {
    Accept: "application/json",
    ...(accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : {}),
  },
  signal: controller.signal,
});



        if (response.status === 401 || response.status === 403) {
          navigate("/login", { replace: true });
          return;
        }

        if (!response.ok) {
          throw new Error(
            `Unable to load user information (${response.status})`
          );
        }

        const data = await response.json();

        // Supports either a direct user object or { user: {...} }.
        const currentUser = data.user ?? data;

        if (!currentUser || typeof currentUser !== "object") {
          throw new Error("Invalid user information received.");
        }

        setUser(currentUser);
      } catch (err) {
        if (err.name === "AbortError") return;
        setError(err.message || "Failed to load user information.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchCurrentUser();

    return () => controller.abort();
  }, [navigate]);

  const fullName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(" ")
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

  const openModule = (path) => navigate(path);

  const handleLogout = async () => {
  const accessToken = localStorage.getItem("access_token");
  const refreshToken = localStorage.getItem("refresh_token");

  try {
    if (accessToken && refreshToken) {
      const response = await fetch(
        "http://127.0.0.1:8000/api/auth/logout/",
        {
          method: "POST",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            refresh: refreshToken,
          }),
        }
      );

      if (!response.ok) {
        console.error(
          "Logout API failed:",
          response.status,
          await response.text()
        );
      }
    }
  } catch (error) {
    console.error("Logout request failed:", error);
  } finally {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("orbitUser");
    sessionStorage.removeItem("orbitAuthMethod");

    navigate("/login", { replace: true });
  }
};
  const renderModule = (module, isMain = false) => (
    <button
      type="button"
      key={module.path}
      className={`module-link ${
        isMain && module.name === "Project Management" ? "active" : ""
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

  if (error) {
    return (
      <main className="home-page">
        <p role="alert">{error}</p>
        <button type="button" onClick={() => window.location.reload()}>
          Try again
        </button>
      </main>
    );
  }

  return (
    <main className={`home-page ${darkMode ? "dark-mode" : ""}`}>
      <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
        <div className="brand-container">
          {!collapsed && (
            <>
              <img className="home-logo" src={logo} alt="" />
              <span className="brand-name">RBIT</span>
            </>
          )}

          {collapsed && <img className="home-logo" src={logo} alt="ORBIT" />}

          <button
            className="collapse-button"
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            aria-label="Toggle sidebar"
          >
            {collapsed ? "»" : "«"}
          </button>
        </div>

        <div className="sidebar-divider" />

        <nav className="sidebar-navigation">
          <div className="main-modules">
            {mainModules.map((module) => renderModule(module, true))}
          </div>

          <div className="secondary-modules">
            {otherModules.map((module) => renderModule(module))}

            <div className="module-link dark-mode-row">
              {!collapsed && (
                <>
                  <img src={moonIcon} alt="" className="nav-icon" />
                  <span>Dark Mode</span>
                </>
              )}

              <button
                type="button"
                className={`dark-toggle ${darkMode ? "enabled" : ""}`}
                onClick={() => setDarkMode((prev) => !prev)}
                aria-label="Toggle dark mode"
                aria-pressed={darkMode}
              >
                <span />
              </button>
            </div>
          </div>
        </nav>

        {!collapsed && (
          <div className="sidebar-footer">
            <button
              type="button"
              className="profile-card"
              onClick={() => navigate("/settings")}
            >
              <div className="profile-avatar">
                {fullName ? fullName.charAt(0).toUpperCase() : "U"}
              </div>

              <div className="profile-info">
                <strong>{fullName || "User"}</strong>
                <span>{user?.role_name || user?.role || "Employee"}</span>
              </div>

              <span className="profile-arrow">›</span>
            </button>

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

      {/* <section className="home-content">

        <section className="home-content">
  <h1>
    Welcome{user?.first_name ? `, ${user.first_name}` : ""}
  </h1>

  <div className="user-details">
    <p>
      <strong>First name:</strong>{" "}
      {user?.first_name || "—"}
    </p>

    <p>
      <strong>Last name:</strong>{" "}
      {user?.last_name || "—"}
    </p>

    <p>
      <strong>Email:</strong>{" "}
      {user?.email || "—"}
    </p>

    <p>
      <strong>Role:</strong>{" "}
      {user?.role_name || user?.role || "—"}
    </p>
  </div>
</section>
      </section> */}
    </main>
  );
};

export default UserHome;
