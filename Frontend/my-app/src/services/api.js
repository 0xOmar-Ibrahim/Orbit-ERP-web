
const API_BASE_URL = "http://127.0.0.1:8000/api";

// A shared function for sending API requests
export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem("access_token");

  const headers = {
    Accept: "application/json",
    ...options.headers,
  };

  // Do not send an old token with a new login request
if (token && endpoint !== "/auth/login/") {
  headers.Authorization = `Bearer ${token}`;
}

  // Set JSON content type when sending a JSON body
  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers["Content-Type"]
  ) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      ...options,
      headers,
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      data.detail ||
      data.error ||
      "Request failed. Please try again."
    );

    error.status = response.status;
    throw error;
  }

  return data;
}

// Normal email and password login
export async function loginUser(email, password) {
  return apiRequest("/auth/login/", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}
