
import React from "react";
import CRMDataTable from "./CRMDataTable";

const columns = [
  { key: "customer_name", label: "Customer Name" },
  { key: "name", label: "Name" },
  { key: "job_title", label: "Job Title" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "is_primary", label: "Is Primary" },
];

const Contacts = () => {
  return (
    <CRMDataTable
      title="Contacts"
      description="View and manage all contacts"
      columns={columns}
      entityType="contacts"
    />
  );
};

export default Contacts;
