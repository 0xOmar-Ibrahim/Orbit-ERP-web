import { apiRequest } from "./api";

export async function getEmployeeHistory(employeeId) {
  const query = employeeId ? `?employee_id=${employeeId}` : "";
  return await apiRequest(`/hr/employee-history/${query}`);
}

export async function getEmployeeDocuments(employeeId) {
  const query = employeeId ? `?employee_id=${employeeId}` : "";
  return await apiRequest(`/hr/documents/${query}`);
}

export async function uploadEmployeeDocument(formData) {
  const token = localStorage.getItem("access_token");
  const response = await fetch("http://localhost:8000/api/hr/documents/", {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.detail || "Upload failed");
  }
  return await response.json();
}

export async function deleteEmployeeDocument(documentId) {
  return await apiRequest(`/hr/documents/?document_id=${documentId}`, {
    method: "DELETE",
  });
}

export async function getEmploymentContracts(employeeId) {
  const query = employeeId ? `?employee_id=${employeeId}` : "";
  return await apiRequest(`/hr/contracts/${query}`);
}