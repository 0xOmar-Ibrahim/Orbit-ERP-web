import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "../../Utils/authFetch";
import {
  FiUserPlus,
  FiPhone,
  FiMail,
  FiMapPin,
  FiLock,
  FiEye,
  FiEyeOff,
  FiChevronDown,
  FiDisc,
} from "react-icons/fi";
import { FaVenusMars, FaRegIdCard } from "react-icons/fa";
import "./AddEmployeePage.css";

const THIS_YEAR = new Date().getFullYear();
const range = (from, to) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);

const DAYS = range(1, 31);
const MONTHS = range(1, 12);
const DOB_YEARS = range(THIS_YEAR - 70, THIS_YEAR - 16).reverse();
const HIRE_YEARS = range(THIS_YEAR - 30, THIS_YEAR + 1).reverse();

const GENDERS = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
];

const STATUSES = [
  { label: "Active", value: "active" },
  { label: "On Leave", value: "on_leave" },
  { label: "Suspended", value: "suspended" },
  { label: "Terminated", value: "terminated" },
];

const TYPES = [
  { label: "Full Time", value: "full_time" },
  { label: "Part Time", value: "part_time" },
  { label: "Contract", value: "contract" },
  { label: "Intern", value: "intern" },
];
const ROLES = [
  { role_id: 1, role_name: "Admin" },
  { role_id: 2, role_name: "HR Manager" },
  { role_id: 3, role_name: "Accountant" },
  { role_id: 4, role_name: "Sales Representative" },
  { role_id: 5, role_name: "Regular Staff" },
  { role_id: 6, role_name: "Project Manager" },
  { role_id: 7, role_name: "Inventory Specialist" },
];
const today = new Date();

const INITIAL_FORM = {
  firstName: "",
  lastName: "",
  dobDay: "1",
  dobMonth: "1",
  dobYear: "2000",
  gender: "male",
  nationalId: "",
  phone: "",
  workEmail: "",
  hireDay: String(today.getDate()),
  hireMonth: String(today.getMonth() + 1),
  hireYear: String(today.getFullYear()),
  address: "",
  password: "",
  confirmPassword: "",
  status: "active",
  type: "full_time",
  role: "",
};
function Field({ label, htmlFor, children }) {
  return (
    <div className="ae-field">
      <label className="ae-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}

function SelectBox({ id, name, icon, value, onChange, options }) {
  return (
    <div className="ae-input ae-select">
      {icon && <span className="ae-icon">{icon}</span>}

      <select id={id} name={name} value={value} onChange={onChange}>
        {options.map((opt) => {
          const optionValue = typeof opt === "object" ? opt.value : opt;

          const optionLabel = typeof opt === "object" ? opt.label : opt;

          return (
            <option key={optionValue} value={optionValue}>
              {optionLabel}
            </option>
          );
        })}
      </select>

      <FiChevronDown className="ae-chevron" />
    </div>
  );
}

function DateGroup({ prefix, form, onChange, years }) {
  return (
    <div className="ae-date-group">
      <SelectBox
        name={`${prefix}Day`}
        value={form[`${prefix}Day`]}
        onChange={onChange}
        options={DAYS}
      />
      <SelectBox
        name={`${prefix}Month`}
        value={form[`${prefix}Month`]}
        onChange={onChange}
        options={MONTHS}
      />
      <SelectBox
        name={`${prefix}Year`}
        value={form[`${prefix}Year`]}
        onChange={onChange}
        options={years}
      />
    </div>
  );
}

function PasswordInput({ id, name, value, onChange }) {
  const [show, setShow] = useState(false);

  return (
    <div className="ae-input">
      <span className="ae-icon">
        <FiLock />
      </span>
      <input
        id={id}
        name={name}
        type={show ? "text" : "password"}
        placeholder="••••••••••••••"
        value={value}
        onChange={onChange}
        autoComplete="new-password"
        required
      />
      <button
        type="button"
        className="ae-eye"
        onClick={() => setShow(!show)}
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <FiEyeOff /> : <FiEye />}
      </button>
    </div>
  );
}
function AddEmployeePage() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const roles = ROLES;
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (submitting) return;

    if (form.password !== form.confirmPassword) {
      setError("Password and Confirm Password do not match.");
      return;
    }

    setError("");
    setSubmitting(true);

    const payload = {
      first_name: form.firstName,
      last_name: form.lastName,
      date_of_birth: `${form.dobYear}-${form.dobMonth.padStart(
        2,
        "0"
      )}-${form.dobDay.padStart(2, "0")}`,
      gender: form.gender.toLowerCase(),
      national_id: form.nationalId,
      phone: form.phone,
      work_email: form.workEmail,
      hire_date: `${form.hireYear}-${form.hireMonth.padStart(
        2,
        "0"
      )}-${form.hireDay.padStart(2, "0")}`,
      address: form.address,
      password: form.password,
      employment_status: form.status,
      employment_type: form.type,
      role: Number(form.role),
    };

    try {
      const response = await authFetch(
        "http://127.0.0.1:8000/admin/employee/",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const text = await response.text();
      let data = null;
      try {
        data = JSON.parse(text);
      } catch {
        console.warn("Response was not JSON:", text.slice(0, 200));
      }

      if (!response.ok) {
        const message =
          data && typeof data === "object"
            ? data.detail ||
              Object.entries(data)
                .map(
                  ([field, msgs]) =>
                    `${field}: ${Array.isArray(msgs) ? msgs.join(", ") : msgs}`
                )
                .join(" | ")
            : `Server error (${response.status}). Check the Django terminal.`;

        setError(message);
        return;
      }

      navigate("/employees", { state: { employeeAdded: true } });
    } catch (err) {
      if (err.message === "SESSION_EXPIRED") {
        setError("Your session has expired. Please log in again.");
      } else {
        console.error(err);
        setError("Cannot connect to the server. Check that Django is running.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ae-page">
      <header className="ae-header">
        <FiUserPlus className="ae-header-icon" />
        <div>
          <h1>Add Employee</h1>
          <p>Add your employee specific data</p>
        </div>
      </header>

      <form className="ae-form" onSubmit={handleSubmit}>
        <div className="ae-grid">
          <Field label="First Name" htmlFor="firstName">
            <div className="ae-input">
              <span className="ae-icon ae-letter">A</span>
              <input
                id="firstName"
                name="firstName"
                type="text"
                placeholder="John"
                value={form.firstName}
                onChange={handleChange}
                required
              />
            </div>
          </Field>

          <Field label="Last Name" htmlFor="lastName">
            <div className="ae-input">
              <span className="ae-icon ae-letter">A</span>
              <input
                id="lastName"
                name="lastName"
                type="text"
                placeholder="Doe"
                value={form.lastName}
                onChange={handleChange}
                required
              />
            </div>
          </Field>

          <Field label="Date of Birth">
            <DateGroup
              prefix="dob"
              form={form}
              onChange={handleChange}
              years={DOB_YEARS}
            />
          </Field>

          {/* Row 2 */}
          <Field label="Gender" htmlFor="gender">
            <SelectBox
              id="gender"
              name="gender"
              icon={<FaVenusMars />}
              value={form.gender}
              onChange={handleChange}
              options={GENDERS}
            />
          </Field>

          <Field label="National ID" htmlFor="nationalId">
            <div className="ae-input">
              <span className="ae-icon">
                <FaRegIdCard />
              </span>
              <input
                id="nationalId"
                name="nationalId"
                type="text"
                inputMode="numeric"
                maxLength={14}
                placeholder="xxxxxxxxxxxxxx"
                value={form.nationalId}
                onChange={handleChange}
                required
              />
            </div>
          </Field>

          <Field label="Phone" htmlFor="phone">
            <div className="ae-input">
              <span className="ae-icon">
                <FiPhone />
              </span>
              <input
                id="phone"
                name="phone"
                type="tel"
                placeholder="xxxxxxxxxxxxxx"
                value={form.phone}
                onChange={handleChange}
                required
              />
            </div>
          </Field>

          {/* Row 3 */}
          <Field label="Work Email" htmlFor="workEmail">
            <div className="ae-input">
              <span className="ae-icon">
                <FiMail />
              </span>
              <input
                id="workEmail"
                name="workEmail"
                type="email"
                placeholder="jhondoe@orbit.org"
                value={form.workEmail}
                onChange={handleChange}
                required
              />
            </div>
          </Field>

          <Field label="Hire Date">
            <DateGroup
              prefix="hire"
              form={form}
              onChange={handleChange}
              years={HIRE_YEARS}
            />
          </Field>

          <Field label="Address First Line" htmlFor="address">
            <div className="ae-input">
              <span className="ae-icon">
                <FiMapPin />
              </span>
              <input
                id="address"
                name="address"
                type="text"
                placeholder="My address"
                value={form.address}
                onChange={handleChange}
              />
            </div>
          </Field>

          <Field label="Password" htmlFor="password">
            <PasswordInput
              id="password"
              name="password"
              value={form.password}
              onChange={handleChange}
            />
          </Field>

          <Field label="Confirm Password" htmlFor="confirmPassword">
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
            />
          </Field>

          {/* Row 5 */}
          <Field label="Employment Status" htmlFor="status">
            <SelectBox
              id="status"
              name="status"
              icon={<FiDisc />}
              value={form.status}
              onChange={handleChange}
              options={STATUSES}
            />
          </Field>

          <Field label="Employment Type" htmlFor="type">
            <SelectBox
              id="type"
              name="type"
              icon={<FiDisc />}
              value={form.type}
              onChange={handleChange}
              options={TYPES}
            />
          </Field>

          <Field label="Employee Role" htmlFor="role">
            <div className="ae-input ae-select">
              <span className="ae-icon">
                <FiDisc />
              </span>

              <select
                id="role"
                name="role"
                value={form.role}
                onChange={handleChange}
                required
              >
                <option value="">Select Role</option>

                {roles.map((role) => (
                  <option key={role.role_id} value={role.role_id}>
                    {role.role_name}
                  </option>
                ))}
              </select>

              <FiChevronDown className="ae-chevron" />
            </div>
          </Field>
        </div>

        {error && (
          <p className="ae-error" role="alert">
            {error}
          </p>
        )}

        <div className="ae-actions">
          <button
            type="button"
            className="ae-btn ae-btn-cancel"
            onClick={() => navigate("/employees")}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="ae-btn ae-btn-add"
            disabled={submitting}
          >
            {submitting ? "Adding..." : "Add"}
          </button>
        </div>
      </form>
    </div>
  );
}
export default AddEmployeePage;
