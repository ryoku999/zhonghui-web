import axios from "axios";

declare module "axios" {
  interface AxiosRequestConfig {
    expectedUserId?: string;
  }
}

const baseURL = import.meta.env.VITE_API_BASE_URL || "/api/v1";

export const cookieClient = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 10_000,
});

export const api = axios.create({ baseURL, timeout: 10_000 });
