import React from "react";
import CRMDataTable from "./CRMDataTable";

const columns = [
  { key: "customer_code", label: "Customer Code" },
  { key: "first_name", label: "First Name" },
  { key: "last_name", label: "Last Name" },
  { key: "phone", label: "Phone" },
  { key: "company_name", label: "Company Name" },
  { key: "email", label: "Email" },
  { key: "address", label: "Address" },
  { key: "lead_source_name", label: "Lead Source Name" },
];

const Customers = () => {
  return (
    <CRMDataTable
      title="Customers"
      description="View and manage all customers"
      columns={columns}
      entityType="customers"
    />
  );
};

export default Customers;