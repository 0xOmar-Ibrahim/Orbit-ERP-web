import {
  FiSettings,
  FiBell,
  FiMoon,
  FiCalendar,
  FiLogOut,
  FiChevronsLeft,
  FiChevronRight,
} from "react-icons/fi";
import { FaUsers } from "react-icons/fa";
import logo from "../../Images/Logo.jpg";
import avatar from "../../Images/avatar.jpg";
import "./EmployeesPage.css";
import { useNavigate } from "react-router-dom";

function SideBar({ collapsed, onToggle, darkMode, onToggleDark }) {
  const navigate = useNavigate();
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");

  const userName =
    user.full_name ||
    user.name ||
    [user.first_name, user.last_name].filter(Boolean).join(" ") ||
    user.email ||
    "User";

  const userRole = user.role_name || user.role || "Employee";
  const handleLogout = async () => {
    const access = sessionStorage.getItem("access_token");

    try {
      await fetch("http://localhost:8000/admin/logout/", {
        method: "POST",
        credentials: "include", 
        headers: {
          "Content-Type": "application/json",
          ...(access && { Authorization: `Bearer ${access}` }),
        },
      });
    } catch (err) {
      console.error("Logout request failed:", err);
    } finally {

      sessionStorage.clear();
      localStorage.removeItem("token");
      navigate("/admin", { replace: true });
    }
  };
  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="sidebar-top">
        <div className="sidebar-logo">
          <img src={logo} alt="" className="sidebar-logo-icon" />
          <span className="sidebar-logo-text">RBIT</span>
        </div>

        <button
          className="collapse-btn"
          onClick={onToggle}
          aria-label="Collapse sidebar"
        >
          <FiChevronsLeft />
        </button>
      </div>

      <hr />

      <nav className="nav-main">
        <a href="#employees" className="nav-item active">
          <FaUsers /> <span>Employees Management</span>
        </a>
      </nav>

      <div className="sidebar-spacer" />
      <hr />

      <nav className="nav-bottom">
        <a href="#settings" className="nav-item">
          <FiSettings /> <span>Settings</span>
        </a>
        <a href="#notifications" className="nav-item">
          <FiBell /> <span>Notifications</span>
        </a>

        <div className="nav-item">
          <FiMoon /> <span>Dark Mode</span>
          <button
            className={`switch ${darkMode ? "on" : ""}`}
            onClick={onToggleDark}
            aria-label="Toggle dark mode"
          >
            <span className="knob" />
          </button>
        </div>

        <a href="#tasks" className="nav-item">
          <FiCalendar /> <span>Tasks</span>
        </a>
      </nav>

      <div className="profile-card">
        <img src={avatar} alt={userName} />

        <div className="profile-info">
          <strong>{userName}</strong>
          <small>{userRole}</small>
        </div>

        <FiChevronRight />
      </div>

      <button className="logout-btn" onClick={handleLogout}>
        <FiLogOut /> <span>Logout</span>
      </button>
    </aside>
  );
}

export default SideBar;
