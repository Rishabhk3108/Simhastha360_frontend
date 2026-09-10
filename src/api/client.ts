import axios from "axios";
import { decrement, increment } from "./loadingStore";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("s360_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  increment();
  return config;
});

api.interceptors.response.use(
  (response) => {
    decrement();
    return response;
  },
  (error) => {
    decrement();
    if (error.response?.status === 401) {
      localStorage.removeItem("s360_token");
      localStorage.removeItem("s360_role");
      localStorage.removeItem("s360_name");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);
