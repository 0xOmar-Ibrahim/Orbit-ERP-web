import React from "react";
import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./EmployeesPage.css";
import EmployeesTable from "./EmployeesTable";
import SideBar from "./SideBar";
import { FiSearch, FiPlus } from "react-icons/fi";
import { FaUsers } from "react-icons/fa";
import banner from "../../Images/banner.jpg";
import { authFetch } from "../../Utils/authFetch";

const STATUS_OPTIONS = ["active", "on_leave", "suspended", "terminated"];
const TYPE_OPTIONS = ["full_time", "part_time", "contract", "intern"];

function EmployeesPage() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("view");
  const [collapsed, setCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({ role: "", status: "", type: "" });
  const filterRef = useRef(null);

  const navigate = useNavigate();

  const options = useMemo(() => {
    const roles = [...new Set(employees.map((e) => e.role).filter(Boolean))].sort();
    return {
      role: roles,
      status: STATUS_OPTIONS,
      type: TYPE_OPTIONS,
    };
  }, [employees]);

  const filtered = employees.filter((emp) => {
    const matchesSearch = `${emp.name} ${emp.workEmail ?? ""} ${emp.id ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase());

    return (
      matchesSearch &&
      (!filters.role || emp.role === filters.role) &&
      (!filters.status || emp.status === filters.status) &&
      (!filters.type || emp.type === filters.type)
    );
  });

  const activeCount = Object.values(filters).filter(Boolean).length;

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => setFilters({ role: "", status: "", type: "" });

  const label = (value) =>
    value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await authFetch("http://127.0.0.1:8000/admin/employee/");

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "Failed to fetch employees.");
        }

        const employeeList = Array.isArray(data)
          ? data
          : data.Employees || data.employees || data.results || [];

        setEmployees(
          employeeList.map((emp) => ({
            id: emp.employee_code,
            name: [emp.first_name, emp.last_name].filter(Boolean).join(" "),
            role: emp.role__role_name,
            status: emp.employment_status,
            type: emp.employment_type,
            workEmail: emp.work_email,
          }))
        );
      } catch (err) {
        setError(err.message || "Cannot connect to Django.");
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  if (error) return <p>{error}</p>;

  return (
    <div className={`app-shell ${darkMode ? "dark" : ""}`}>
      <SideBar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode(!darkMode)}
      />

      <main className="main-content">
        <section className="page-header">
          <div className="page-header-text">
            <FaUsers className="page-header-icon" />
            <div>
              <h1>Employees Management</h1>
              <p>
                Manage your team members and keep track of their information
              </p>
            </div>
          </div>
          <img src={banner} alt="" className="page-header-img" />
        </section>

        <div className="tabs">
          <button
            className={`tab ${activeTab === "view" ? "active" : ""}`}
            onClick={() => setActiveTab("view")}
          >
            View Employees
          </button>
        </div>

        <div className="toolbar">
          <div className="search-box">
            <FiSearch />
            <input
              type="text"
              placeholder="Search by name, email or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          
          <div className="filter-wrap" ref={filterRef}>
            <button
              type="button"
              className="btn-outline"
              onClick={() => setFilterOpen((o) => !o)}
            >
              Filter{activeCount > 0 ? ` (${activeCount})` : ""}
            </button>

            {filterOpen && (
              <div className="filter-menu">
                {[
                  { name: "role", title: "Role" },
                  { name: "status", title: "Status" },
                  { name: "type", title: "Type" },
                ].map(({ name, title }) => (
                  <label key={name} className="filter-item">
                    <span>{title}</span>
                    <select
                      name={name}
                      value={filters[name]}
                      onChange={handleFilterChange}
                    >
                      <option value="">All</option>
                      {options[name].map((opt) => (
                        <option key={opt} value={opt}>
                          {label(opt)}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}

                <button
                  type="button"
                  className="filter-clear"
                  onClick={clearFilters}
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>

          <div className="toolbar-right">
            <button className="btn-export">Export</button>
            <button
              className="btn-primary"
              onClick={() => navigate("/employees/add")}
            >
              <FiPlus /> Add Employee
            </button>
          </div>
        </div>

        {loading && <p>Loading employees...</p>}

        {error && <p className="ae-error">{error}</p>}

        {!loading && !error && <EmployeesTable employees={filtered} />}

        <div className="table-footer">
          <span>
            Showing {filtered.length} of {employees.length} employees
          </span>
        </div>
      </main>
    </div>
  );
}
export default EmployeesPage;
