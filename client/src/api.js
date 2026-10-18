const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

export const API_BASE_URL = (
  configuredBaseUrl ||
  (import.meta.env.DEV ? "http://localhost:5000/api" : "/api")
).replace(/\/+$/, "");
