
import React from "react";
import CRMDataTable from "./CRMDataTable";

const columns = [
  { key: "name", label: "Name" },
  { key: "description", label: "Description" },
  { key: "is_active", label: "Is Active" },
];

const Campaigns = () => {
  return (
    <CRMDataTable
      title="Campaigns"
      description="View and manage all campaigns"
      columns={columns}
      entityType="campaigns"
    />
  );
};

export default Campaigns;
