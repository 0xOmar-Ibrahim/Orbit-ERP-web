
import React from "react";
import CRMDataTable from "./CRMDataTable";
import { campaignsData } from "./crmMockData";

const columns = [
  { key: "name", label: "Name" },
  { key: "description", label: "Description" },
  { key: "is_active", label: "Is Active" },
];

const Campaigns = () => (
  <CRMDataTable
    title="Campaigns"
    description="View and manage all campaigns"
    columns={columns}
    initialData={campaignsData}
    entityType="campaigns"
  />
);

export default Campaigns;
