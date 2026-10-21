const API = "http://127.0.0.1:8000";
const REFRESH_URL = `${API}/api/auth/refresh/`;
const LOGIN_PATH = "/login";

let refreshPromise = null; 
async function refreshAccessToken() {
  const refresh = sessionStorage.getItem("refresh_token");
  if (!refresh) return null;

  if (!refreshPromise) {
    refreshPromise = fetch(REFRESH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    })
      .then(async (res) => {
        if (!res.ok) return null;
        const data = await res.json();
        sessionStorage.setItem("access_token", data.access ?? data.access_token);
        if (data.refresh) sessionStorage.setItem("refresh_token", data.refresh);
        return data.access;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

export async function authFetch(url, options = {}) {
  const send = (token) =>
    fetch(url, {
      ...options,
      headers: { ...options.headers, Authorization: `Bearer ${token}` },
    });

  const token = sessionStorage.getItem("access_token");
  let res = token ? await send(token) : null;

  if (!res || res.status === 401) {
    const newToken = await refreshAccessToken();

    if (!newToken) {
      sessionStorage.removeItem("access_token");
      sessionStorage.removeItem("refresh_token");
      window.location.href = LOGIN_PATH;
      throw new Error("SESSION_EXPIRED");
    }

    res = await send(newToken);
  }

  return res;
}