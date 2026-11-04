export const API = "http://localhost:8000"; 
const REFRESH_URL = `${API}/api/auth/refresh/`;

const stores = [sessionStorage, localStorage];

const getToken = (key) => {
  for (const store of stores) {
    const value = store.getItem(key);
    if (value) return value;
  }
  return null;
};

const findStore = (key) => stores.find((s) => s.getItem(key)) || sessionStorage;

const clearTokens = () =>
  stores.forEach((s) => {
    s.removeItem("access_token");
    s.removeItem("refresh_token");
  });

  
const loginPath = () =>
  window.location.pathname.startsWith("/employees") ? "/admin" : "/login";

let refreshPromise = null;

async function refreshAccessToken() {
  const refresh = getToken("refresh_token");
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

        const access = data.access ?? data.access_token;
        const newRefresh = data.refresh ?? data.refresh_token;
        if (!access) return null;

        const store = findStore("refresh_token");
        store.setItem("access_token", access);
        if (newRefresh) store.setItem("refresh_token", newRefresh);

        return access; // return what was saved
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

  const token = getToken("access_token");
  let res = token ? await send(token) : null;

  if (!res || res.status === 401) {
    const newToken = await refreshAccessToken();

    if (!newToken) {
      clearTokens();
      window.location.href = loginPath();
      throw new Error("SESSION_EXPIRED");
    }

    res = await send(newToken);
  }

  return res;
}