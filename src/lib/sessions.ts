export interface CustomSession {
  id: string;
  weekStart: string;
  day: string;
  period: "AM" | "PM";
  clinicianId: number;
  sessionType: string;
  location: string;
}

const SESSIONS_KEY = "nhs-custom-sessions";

export function getCustomSessions(weekStart?: string): CustomSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    const all: CustomSession[] = raw ? JSON.parse(raw) : [];
    return weekStart ? all.filter((s) => s.weekStart === weekStart) : all;
  } catch {
    return [];
  }
}

export function addCustomSession(s: Omit<CustomSession, "id">): CustomSession {
  const all = getCustomSessions();
  const entry: CustomSession = { ...s, id: Date.now().toString() };
  localStorage.setItem(SESSIONS_KEY, JSON.stringify([...all, entry]));
  return entry;
}

export function removeCustomSession(id: string): void {
  const all = getCustomSessions().filter((s) => s.id !== id);
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(all));
}

export function updateCustomSession(
  id: string,
  updates: Partial<Omit<CustomSession, "id">>
): CustomSession | null {
  const all = getCustomSessions();
  const idx = all.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...updates };
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(all));
  return all[idx];
}
