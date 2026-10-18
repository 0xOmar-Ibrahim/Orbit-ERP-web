function EmployeesTable({ employees }) {
  const statusClass = (status) =>
    status === "active" ? "badge badge-active" : "badge badge-leave";
  
    return (
      <div className="table-wrap">
        <table className="employees-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Status</th>
              <th>Type</th>
              <th>Work-Email</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty">
                  No employees found
                </td>
              </tr>
            ) : (
              employees.map((emp) => (
                <tr key={emp.id}>
                  <td>{emp.name}</td>
                  <td>{emp.role}</td>
                  <td>
                    <span className={statusClass(emp.status)}>{emp.status}</span>
                  </td>
                  <td>{emp.type}</td>
                  <td>{emp.workEmail}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  }
  
  export default EmployeesTable;