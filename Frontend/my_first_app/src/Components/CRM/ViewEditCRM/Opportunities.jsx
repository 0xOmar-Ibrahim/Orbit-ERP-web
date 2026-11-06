
import React from "react";
import CRMDataTable from "./CRMDataTable";
import { opportunitiesData } from "./crmMockData";

const columns = [
  { key: "title", label: "Title" },
  { key: "estimated_value", label: "Estimated Value" },
  { key: "currency", label: "Currency" },
  { key: "stage", label: "Stage" },
  { key: "probability", label: "Probability" },
  { key: "status", label: "Status" },
  { key: "customer_name", label: "Customer Name" },
  { key: "employee_name", label: "Employee Name" },
];

const Opportunities = () => (
  <CRMDataTable
    title="Opportunities"
    description="View and manage all sales opportunities"
    columns={columns}
    initialData={opportunitiesData}
    entityType="opportunities"
  />
);

export default Opportunities;
