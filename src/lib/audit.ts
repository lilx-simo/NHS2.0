export interface AuditEntry {
  name: string;
  timestamp: string;
  action: string;
}

const AUDIT_KEY = "nhs-audit-log";

export function getAuditLog(): AuditEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(AUDIT_KEY) || "[]") as AuditEntry[];
  } catch {
    return [];
  }
}

export function addAuditEntry(action: string): void {
  if (typeof window === "undefined") return;
  const name = sessionStorage.getItem("nhs-username") || "Planner Lead";
  const entry: AuditEntry = {
    name,
    timestamp: new Date().toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    action,
  };
  const log = getAuditLog();
  log.unshift(entry);
  localStorage.setItem(AUDIT_KEY, JSON.stringify(log.slice(0, 500)));
}

export function clearAuditLog(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUDIT_KEY);
}
