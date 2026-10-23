import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import type { User } from "../types/api";

declare global {
  interface ImportMetaEnv {
    readonly VITE_API_URL: string;
  }
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

let isRefreshing = false;
let currentUser: User | null = null;

export const setCurrentUser = (user: User | null) => {
  currentUser = user;
};

export const getCurrentUser = () => currentUser;

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401 && !isRefreshing) {
      // Clear user on auth failure
      currentUser = null;
      // Redirect to login if not already there
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// Health
export const healthApi = {
  check: () => api.get("/health"),
  ready: () => api.get("/health/ready"),
};

// Auth
export const authApi = {
  login: () => api.get<{ auth_url: string; state: string; nonce: string }>("/auth/login"),
  callback: (code: string, state: string) => api.get("/auth/callback", { params: { code, state } }),
  logout: () => api.post("/auth/logout"),
  me: () => api.get<User>("/auth/me"),
  oidcConfig: () => api.get("/auth/oidc-config"),
};

// Skills
export const skillsApi = {
  list: (params?: { page?: number; page_size?: number; search?: string }) =>
    api.get("/api/skills", { params }),
  get: (id: number) => api.get(`/api/skills/${id}`),
  create: (data: any) => api.post("/api/skills", data),
  update: (id: number, data: any) => api.patch(`/api/skills/${id}`, data),
  delete: (id: number) => api.delete(`/api/skills/${id}`),
};

// Evaluations
export const evaluationsApi = {
  list: (params?: { page?: number; page_size?: number; skill_id?: number; status?: string }) =>
    api.get("/api/evaluations", { params }),
  get: (id: number) => api.get(`/api/evaluations/${id}`),
  create: (data: any) => api.post("/api/evaluations", data),
  run: (id: number) => api.post(`/api/evaluations/${id}/run`),
};

// Capsules
export const capsulesApi = {
  list: (params?: { page?: number; page_size?: number; status?: string }) =>
    api.get("/api/capsules", { params }),
  get: (id: number) => api.get(`/api/capsules/${id}`),
  create: (data: any) => api.post("/api/capsules", data),
  update: (id: number, data: any) => api.patch(`/api/capsules/${id}`, data),
  delete: (id: number) => api.delete(`/api/capsules/${id}`),
  check: (id: number) => api.post(`/api/capsules/${id}/check`),
};