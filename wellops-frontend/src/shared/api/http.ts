import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL;
if (!baseURL) throw new Error("VITE_API_BASE_URL is not set");

export const http = axios.create({ baseURL });

http.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("access_token");
      sessionStorage.setItem("auth_error", "expired");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);
