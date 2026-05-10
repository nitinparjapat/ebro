import axios from "axios";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  timeout: 60000,
});

let authExpiredDispatchInFlight = false;

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    if (status === 401 && typeof window !== "undefined") {
      if (!authExpiredDispatchInFlight) {
        authExpiredDispatchInFlight = true;
        window.dispatchEvent(new CustomEvent("brothersStore:auth-expired"));

        window.setTimeout(() => {
          authExpiredDispatchInFlight = false;
        }, 2000);
      }
    }

    return Promise.reject(error);
  }
);

export const createAuthHeaders = (token) =>
  token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
