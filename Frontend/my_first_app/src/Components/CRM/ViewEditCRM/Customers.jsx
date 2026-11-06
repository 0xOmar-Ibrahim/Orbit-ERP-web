
import React from "react";
import CRMDataTable from "./CRMDataTable";
import { customersData } from "./crmMockData";

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

const Customers = () => (
  <CRMDataTable
    title="Customers"
    description="View and manage all customers"
    columns={columns}
    initialData={customersData}
    entityType="customers"
  />
);

export default Customers;
