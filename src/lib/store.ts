export interface AdditionalSessionEntry {
  id: string;
  clinician: string;
  clinicType: string;
  date: string;
  expectedPatients: string;
  reason: string;
  weekStart: string;
}

export interface ReportEntry {
  id: string;
  clinician: string;
  clinicType: string;
  plannedSessions: string;
  sessionsReduction: string;
  deliveredSessions: string;
  rootCause: string;
  weekStart: string;
}

const AS_KEY = "nhs-additional-sessions";
const RE_KEY = "nhs-report-entries";

export function getAdditionalSessions(weekStart?: string): AdditionalSessionEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const all = JSON.parse(localStorage.getItem(AS_KEY) || "[]") as AdditionalSessionEntry[];
    return weekStart ? all.filter((s) => s.weekStart === weekStart) : all;
  } catch {
    return [];
  }
}

export function saveAdditionalSession(
  session: Omit<AdditionalSessionEntry, "id">
): AdditionalSessionEntry {
  const all = getAdditionalSessions();
  const entry = { ...session, id: `${Date.now()}` };
  all.push(entry);
  localStorage.setItem(AS_KEY, JSON.stringify(all));
  return entry;
}

export function getReportEntries(weekStart?: string): ReportEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const all = JSON.parse(localStorage.getItem(RE_KEY) || "[]") as ReportEntry[];
    return weekStart ? all.filter((e) => e.weekStart === weekStart) : all;
  } catch {
    return [];
  }
}

export function saveReportEntry(entry: Omit<ReportEntry, "id">): ReportEntry {
  const all = getReportEntries();
  const newEntry = { ...entry, id: `${Date.now()}` };
  all.push(newEntry);
  localStorage.setItem(RE_KEY, JSON.stringify(all));
  return newEntry;
}
