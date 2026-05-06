// Generic fetch helper — sends cookies automatically
async function apiFetch<T = unknown>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export type UserRole = "admin" | "planner" | "doctor" | "nurse" | "clinician";

export interface ApiUser {
  id: string; username: string; name: string;
  email: string; role: UserRole; department: string; createdAt: string;
}
export interface ApiClinician {
  id: number; name: string; specialty: string; email: string; active: boolean;
}
export interface ApiAdditionalSession {
  id: string; clinician: string; clinicType: string;
  date: string; reason: string; weekStart: string;
}
export interface ApiReportEntry {
  id: string; clinician: string; clinicType: string;
  deliveredSessions: string; rootCause: string; weekStart: string;
}
export interface ApiAuditEntry {
  id: string; name: string; action: string; timestamp: string;
}
export interface ApiCustomSession {
  id: string; clinicianId: number; name: string; weekStart: string;
  day: string; period: string; sessionType: string; location: string;
}
export interface ApiSettings {
  id: string; orgName: string; varianceAmber: number;
  varianceRed: number; autoJumpToCurrentWeek: boolean;
}

export const api = {
  auth: {
    login: (username: string, password: string) =>
      apiFetch<{ user: ApiUser }>("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),
    logout: () => apiFetch("/api/auth/logout", { method: "POST" }),
    me: () => apiFetch<ApiUser>("/api/auth/me"),
  },
  users: {
    list: () => apiFetch<ApiUser[]>("/api/users"),
    create: (data: object) => apiFetch<ApiUser>("/api/users", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: object) => apiFetch<ApiUser>(`/api/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => apiFetch(`/api/users/${id}`, { method: "DELETE" }),
  },
  clinicians: {
    list: (activeOnly = false) =>
      apiFetch<ApiClinician[]>(`/api/clinicians${activeOnly ? "?active=true" : ""}`),
    create: (data: object) => apiFetch<ApiClinician>("/api/clinicians", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: object) => apiFetch<ApiClinician>(`/api/clinicians/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: number) => apiFetch(`/api/clinicians/${id}`, { method: "DELETE" }),
  },
  additionalSessions: {
    list: (weekStart?: string) =>
      apiFetch<ApiAdditionalSession[]>(`/api/additional-sessions${weekStart ? `?weekStart=${weekStart}` : ""}`),
    create: (data: object) => apiFetch<ApiAdditionalSession>("/api/additional-sessions", { method: "POST", body: JSON.stringify(data) }),
    delete: (id: string) => apiFetch(`/api/additional-sessions/${id}`, { method: "DELETE" }),
  },
  reportEntries: {
    list: (weekStart?: string) =>
      apiFetch<ApiReportEntry[]>(`/api/report-entries${weekStart ? `?weekStart=${weekStart}` : ""}`),
    create: (data: object) => apiFetch<ApiReportEntry>("/api/report-entries", { method: "POST", body: JSON.stringify(data) }),
    delete: (id: string) => apiFetch(`/api/report-entries/${id}`, { method: "DELETE" }),
  },
  auditLog: {
    list: () => apiFetch<ApiAuditEntry[]>("/api/audit-log"),
    add: (action: string) => apiFetch<ApiAuditEntry>("/api/audit-log", { method: "POST", body: JSON.stringify({ action }) }),
    clear: () => apiFetch("/api/audit-log", { method: "DELETE" }),
  },
  customSessions: {
    list: (weekStart?: string) =>
      apiFetch<ApiCustomSession[]>(`/api/custom-sessions${weekStart ? `?weekStart=${weekStart}` : ""}`),
    create: (data: object) => apiFetch<ApiCustomSession>("/api/custom-sessions", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: object) => apiFetch<ApiCustomSession>(`/api/custom-sessions/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => apiFetch(`/api/custom-sessions/${id}`, { method: "DELETE" }),
  },
  settings: {
    get: () => apiFetch<ApiSettings>("/api/settings"),
    save: (data: object) => apiFetch<ApiSettings>("/api/settings", { method: "POST", body: JSON.stringify(data) }),
  },
};
