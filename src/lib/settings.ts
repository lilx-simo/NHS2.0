export interface AppSettings {
  orgName: string;
  varianceAmber: number;
  varianceRed: number;
  autoJumpToCurrentWeek: boolean;
}

const SETTINGS_KEY = "nhs-settings";

const DEFAULTS: AppSettings = {
  orgName: "NHS Sexual Health Services",
  varianceAmber: 5,
  varianceRed: 10,
  autoJumpToCurrentWeek: true,
};

export function getSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function saveSettings(s: Partial<AppSettings>): AppSettings {
  const updated = { ...getSettings(), ...s };
  if (typeof window !== "undefined") {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  }
  return updated;
}

export function getClosestWeekIdx(availableWeeks: string[]): number {
  const settings = getSettings();
  if (!settings.autoJumpToCurrentWeek) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let closest = 0;
  let minDiff = Infinity;
  availableWeeks.forEach((ws, i) => {
    const d = new Date(ws + "T00:00:00");
    const diff = Math.abs(d.getTime() - today.getTime());
    if (diff < minDiff) {
      minDiff = diff;
      closest = i;
    }
  });
  return closest;
}
