import React, { useState } from "react";
import "./ViewEdit.css";

import Opportunities from "./Opportunities";
import Customers from "./Customers";
import Contacts from "./Contacts";
import Compaigns from "./Compaigns";

const TABS = [
  { id: "opportunities", label: "Opportunities" },
  { id: "customers", label: "Customers" },
  { id: "contacts", label: "Contacts" },
  { id: "Compaigns", label: "Compaigns" },
];

const ViewEdit = () => {
  const [activeTab, setActiveTab] = useState("opportunities");

  const renderActiveTab = () => {
    switch (activeTab) {
      case "customers":
        return <Customers />;

      case "contacts":
        return <Contacts />;

      case "Compaigns":
        return <Compaigns />;

      default:
        return <Opportunities />;
    }
  };

  return (
    <div className="view-crm-page">
      <div className="view-crm-header">
        <span className="view-crm-breadcrumb">WORKSPACE / SALES</span>
        <h1>View & Edit CRM</h1>
        <p>Show and Edit your CRM records</p>
      </div>

      <div className="view-crm-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`view-crm-tab ${
              activeTab === tab.id ? "active" : ""
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="view-crm-content">{renderActiveTab()}</div>
    </div>
  );
};

export default ViewEdit;