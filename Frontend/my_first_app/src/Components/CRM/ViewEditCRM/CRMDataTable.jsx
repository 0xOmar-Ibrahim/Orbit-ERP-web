
import React, { useState } from "react";
import CRMEditPopup from "./CRMEditPopup";

const CRMDataTable = ({
  title,
  description,
  columns,
  initialData,
  entityType,
}) => {
  const [data, setData] = useState(initialData);
  const [selectedItem, setSelectedItem] = useState(null);

  const handleSave = (updatedItem) => {
    setData((currentData) =>
      currentData.map((item) =>
        item.id === updatedItem.id ? updatedItem : item
      )
    );

    setSelectedItem(null);
  };


  const handleDelete = (deletedItem) => {
  setData((currentData) =>
    currentData.filter((item) => item.id !== deletedItem.id)
  );

  setSelectedItem(null);
};

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
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>

        <span className="crm-record-count">
          {data.length} Records
        </span>
      </div>

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
            {data.length > 0 ? (
              data.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="crm-clickable-row"
                  title="Click to edit"
                >
                  {columns.map((column) => (
                    <td key={column.key}>
                      {renderCell(item, column.key)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="crm-empty-state">
                  No {title.toLowerCase()} found
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
    onClose={() => setSelectedItem(null)}
    onSave={handleSave}
    onDelete={handleDelete}
  />
)}
    </div>
  );
};

export default CRMDataTable;
