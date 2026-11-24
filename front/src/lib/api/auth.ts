import type { Session, User } from "@/types";
import { api, ApiError } from "./client";

/** Current session, or null when logged out. */
export async function getSession(): Promise<Session | null> {
  try {
    return await api<Session>("/auth/me");
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return null;
    throw e;
  }
}

export const registerStudent = (body: {
  name: string;
  email: string;
  password: string;
  acceptTerms: boolean;
}) => api<{ user: User }>("/auth/register/student", { method: "POST", body });

export type CompanySignup = {
  name: string;
  email: string;
  password: string;
  acceptTerms: boolean;
  taxId: string;
  rne?: string;
  claimCompanyId?: string;
  company?: { name: string; city: string; sector: string; description?: string };
};

export const registerCompany = (body: CompanySignup) =>
  api<{ user: User }>("/auth/register/company", { method: "POST", body });

export const login = (body: { email: string; password: string }) =>
  api<{ user: User }>("/auth/login", { method: "POST", body });

export const logout = () => api<void>("/auth/logout", { method: "POST" });

export const forgotPassword = (email: string) =>
  api<{ ok: true }>("/auth/password/forgot", { method: "POST", body: { email } });

export const resetPassword = (body: { email: string; code: string; password: string }) =>
  api<{ ok: true }>("/auth/password/reset", { method: "POST", body });

export const updateProfile = (body: {
  name?: string;
  followedDomains?: string[];
  digestEnabled?: boolean;
}) => api<{ user: User }>("/auth/me", { method: "PATCH", body });

export const deleteAccount = (password: string) =>
  api<void>("/auth/me", { method: "DELETE", body: { password } });
