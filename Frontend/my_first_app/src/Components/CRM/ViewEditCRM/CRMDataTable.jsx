import React, { useEffect, useState, useCallback, useMemo } from "react";
import CRMEditPopup from "./CRMEditPopup";
import { authFetch, API } from "../../../Services/authFetch";

const EMPTY_DATA = [];

const API_CONFIG = {
  campaigns: {
    endpoint: `${API}/crm/lead_sources/`,
    responseKey: "LeadSources",
    idKey: "source_id",
  },
  customers: {
    endpoint: `${API}/crm/customers/`,
    responseKey: "Customers",
    idKey: "customer_code",
  },
  contacts: {
    endpoint: `${API}/crm/contacts/`,
    responseKey: "Contacts",
    idKey: "contact_id",
  },
  opportunities: {
    endpoint: `${API}/crm/opportunities/`,
    responseKey: "opportunities",
    idKey: "opportunity_id",
  },
};

const CRMDataTable = ({
  title,
  description,
  columns,
  initialData = EMPTY_DATA,
  entityType,
}) => {
  const config = API_CONFIG[entityType];

  const [data, setData] = useState(initialData);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(Boolean(config));
  const [error, setError] = useState("");

  const [customersList, setCustomersList] = useState([]);
  const [employeesList, setEmployeesList] = useState([]);
  const [leadSourcesList, setLeadSourcesList] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const getItemId = (item) => {
    return config ? item[config.idKey] : item.id;
  };

  const readResponse = async (response) => {
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage =
        result.detail ||
        result.message ||
        result.error ||
        (typeof result === "string" ? result : null);

      throw new Error(errorMessage || `Request failed (${response.status})`);
    }

    return result;
  };

  const fetchData = useCallback(async () => {
    if (!config) {
      setData(initialData);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      // CAMPAIGNS
      if (entityType === "campaigns") {
        const response = await authFetch(config.endpoint);
        const result = await readResponse(response);

        if (!Array.isArray(result.LeadSources)) {
          throw new Error("Invalid LeadSources response.");
        }

        setData(result.LeadSources);
        return;
      }

      // CUSTOMERS
      if (entityType === "customers") {
        const [customersResponse, sourcesResponse] = await Promise.all([
          authFetch(config.endpoint),
          authFetch(`${API}/crm/lead_sources/`),
        ]);

        const [customersResult, sourcesResult] = await Promise.all([
          readResponse(customersResponse),
          readResponse(sourcesResponse),
        ]);

        const customers = customersResult.Customers;
        const sources = sourcesResult.LeadSources;

        if (!Array.isArray(customers) || !Array.isArray(sources)) {
          throw new Error("Invalid Customers or LeadSources response.");
        }

        setCustomersList(customers);
        setLeadSourcesList(sources);

        const mappedCustomers = customers.map((customer) => {
          const source = sources.find(
            (item) => String(item.source_id) === String(customer.lead_source_id)
          );

          return {
            ...customer,
            lead_source_name: source?.name || "-",
          };
        });

        setData(mappedCustomers);
        return;
      }

      // CONTACTS
      if (entityType === "contacts") {
        const [contactsResponse, customersResponse] = await Promise.all([
          authFetch(config.endpoint),
          authFetch(`${API}/crm/customers/`),
        ]);

        const [contactsResult, customersResult] = await Promise.all([
          readResponse(contactsResponse),
          readResponse(customersResponse),
        ]);

        const contacts = contactsResult.Contacts;
        const customers = customersResult.Customers;

        if (!Array.isArray(contacts) || !Array.isArray(customers)) {
          throw new Error("Invalid Contacts or Customers response.");
        }

        setCustomersList(customers);

        const mappedContacts = contacts.map((contact) => {
          const customer = customers.find(
            (item) => String(item.customer_id) === String(contact.customer_id)
          );

          return {
            ...contact,
            customer_name: customer
              ? `${customer.first_name || ""} ${
                  customer.last_name || ""
                }`.trim()
              : "-",
            customer_code: customer?.customer_code || "-",
          };
        });

        setData(mappedContacts);
        return;
      }

      // OPPORTUNITIES
      if (entityType === "opportunities") {
        const [opportunitiesResponse, customersResponse, employeesResponse] =
          await Promise.all([
            authFetch(config.endpoint),
            authFetch(`${API}/crm/customers/`),
            authFetch(`${API}/crm/employees/`),
          ]);

        const [opportunitiesResult, customersResult, employeesResult] =
          await Promise.all([
            readResponse(opportunitiesResponse),
            readResponse(customersResponse),
            readResponse(employeesResponse),
          ]);

        const opportunities = opportunitiesResult.opportunities;
        const customers = customersResult.Customers;
        const employees = employeesResult.Employees;

        if (
          !Array.isArray(opportunities) ||
          !Array.isArray(customers) ||
          !Array.isArray(employees)
        ) {
          throw new Error(
            "Invalid Opportunities, Customers, or Employees response."
          );
        }

        setCustomersList(customers);
        setEmployeesList(employees);

        const mappedOpportunities = opportunities.map((opportunity) => {
          const customerDetails = opportunity.customer_details || {};

          const employeeDetails = opportunity.employee_details || {};

          const customerName =
            customerDetails.name ||
            [customerDetails.first_name, customerDetails.last_name]
              .filter(Boolean)
              .join(" ") ||
            opportunity.customer_name ||
            "-";

          const employeeName =
            employeeDetails.name ||
            [employeeDetails.first_name, employeeDetails.last_name]
              .filter(Boolean)
              .join(" ") ||
            opportunity.employee_name ||
            "-";

          return {
            ...opportunity,
            customer_name: customerName,
            employee_name: employeeName,
          };
        });

        setData(mappedOpportunities);
      }
    } catch (err) {
      console.error(`${title} loading error:`, err);
      setError(err.message || `Failed to load ${title}.`);
    } finally {
      setLoading(false);
    }
  }, [config, entityType, initialData, title]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // UPDATE RECORD
  const handleSave = async (updatedItem) => {
    if (!config) {
      setData((currentData) =>
        currentData.map((item) =>
          item.id === updatedItem.id ? updatedItem : item
        )
      );

      setSelectedItem(null);
      return;
    }

    try {
      setError("");

      const itemId = getItemId(selectedItem);

      if (itemId === undefined || itemId === null) {
        throw new Error("Could not identify the selected record.");
      }

      let payload = {};

      // CAMPAIGNS
      if (entityType === "campaigns") {
        payload = {
          source_id: itemId,
          name: updatedItem.name,
          description: updatedItem.description,
          is_active: Boolean(updatedItem.is_active),
        };
      }

      // CUSTOMERS
      if (entityType === "customers") {
        payload = {
          customer_code: itemId,
          first_name: updatedItem.first_name,
          last_name: updatedItem.last_name,
          phone: updatedItem.phone,
          company_name: updatedItem.company_name,
          email: updatedItem.email,
          address: updatedItem.address,
          lead_source_id: updatedItem.lead_source_id || null,
        };
      }

      // CONTACTS
      if (entityType === "contacts") {
        payload = {
          contact_id: itemId,
          customer_id: updatedItem.customer_id,
          name: updatedItem.name,
          job_title: updatedItem.job_title,
          phone: updatedItem.phone,
          email: updatedItem.email,
          is_primary: Boolean(updatedItem.is_primary),
        };
      }

      // OPPORTUNITIES
      if (entityType === "opportunities") {
        payload = {
          opportunity_id: itemId,
          title: updatedItem.title,
          estimated_value: updatedItem.estimated_value,
          currency: updatedItem.currency,
          stage: String(updatedItem.stage || "").toLowerCase(),
          probability:
            updatedItem.probability === ""
              ? null
              : Number(updatedItem.probability),
          expected_close_date: updatedItem.expected_close_date || null,
          status: String(updatedItem.status || "").toLowerCase(),
          lost_reason: updatedItem.lost_reason || "",
          customer_id: updatedItem.customer_id || null,
          employee_id: updatedItem.employee_id || null,
        };
      }

      const response = await authFetch(config.endpoint, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      await readResponse(response);

      await fetchData();
      setSelectedItem(null);
    } catch (err) {
      console.error(`${title} update error:`, err);
      setError(err.message || `Failed to update ${title}.`);
    }
  };

  // DELETE RECORD
  const handleDelete = async (deletedItem) => {
    if (!config) {
      setData((currentData) =>
        currentData.filter((item) => item.id !== deletedItem.id)
      );

      setSelectedItem(null);
      return;
    }

    try {
      setError("");

      const itemId = getItemId(deletedItem);

      if (itemId === undefined || itemId === null) {
        throw new Error("Could not identify the selected record.");
      }

      const payload = {
        [config.idKey]: itemId,
      };

      const response = await authFetch(config.endpoint, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      await readResponse(response);

      await fetchData();
      setSelectedItem(null);
    } catch (err) {
      console.error(`${title} delete error:`, err);
      setError(err.message || `Failed to delete ${title}.`);
    }
  };

  const SEARCH_FIELDS = {
    opportunities: ["title"],
    contacts: ["customer_name", "name", "job_title", "phone", "email"],
    customers: [
      "customer_code",
      "first_name",
      "last_name",
      "phone",
      "company_name",
      "email",
      "address",
      "lead_source_name",
    ],
    campaigns: ["name", "description"],
  };

  const filteredData = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) return data;

    const fields = SEARCH_FIELDS[entityType] || [];

    return data.filter((item) =>
      fields.some((field) =>
        String(item[field] ?? "")
          .toLowerCase()
          .includes(search)
      )
    );
  }, [data, searchTerm, entityType]);

  const renderCell = (item, key) => {
    const value = item[key];

    if (key === "probability") {
      return `${value ?? "-"}%`;
    }

    if (key === "is_primary" || key === "is_active" || key === "closed") {
      return value ? "Yes" : "No";
    }

    return value ?? "-";
  };

  return (
    <div className="crm-table-section">
      <div className="crm-table-header">
        <div className="crm-table-heading">
          <div>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>

          <div className="crm-search-container">
            <div className="crm-search-wrapper">
              <input
                type="search"
                className="crm-search-input"
                placeholder={`Search ${title.toLowerCase()}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <span className="crm-record-count">{filteredData.length} Records</span>
      </div>

      {error && <div className="crm-error-message">{error}</div>}

      <div className="crm-table-container">
        <table className="crm-data-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="crm-empty-state">
                  Loading {title.toLowerCase()}...
                </td>
              </tr>
            ) : filteredData.length > 0 ? (
              filteredData.map((item) => (
                <tr
                  key={getItemId(item)}
                  onClick={() => setSelectedItem(item)}
                  className="crm-clickable-row"
                  title="Click to edit"
                >
                  {columns.map((column) => (
                    <td key={column.key}>{renderCell(item, column.key)}</td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="crm-empty-state">
                  {searchTerm.trim()
                    ? `No matching ${title.toLowerCase()} found`
                    : `No ${title.toLowerCase()} found`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedItem && (
        <CRMEditPopup
          entityType={entityType}
          item={selectedItem}
          customers={customersList}
          employeesList={employeesList}
          leadSourcesList={leadSourcesList}
          onClose={() => setSelectedItem(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
};

export default CRMDataTable;
