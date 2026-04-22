/**
 * NHS Weekly Capacity Planner - Data Loader
 *
 * Exports query functions that provide an API-like interface over the
 * static JSON fixture data. This layer can later be replaced with real
 * API calls without changing consumer code.
 */

import weeksData from "./weeks.json";
import cliniciansData from "./clinicians.json";
import sessionTypesData from "./sessionTypes.json";
import appointmentTypesData from "./appointmentTypes.json";

import type {
  WeekData,
  Clinician,
  Session,
  AppointmentType,
  WeekSummary,
  SlotTotals,
} from "./types";

// Re-export types so consumers can import both data and types from @/data
export type {
  WeekData,
  Clinician,
  Session,
  AppointmentType,
  WeekSummary,
  SlotTotals,
} from "./types";

// Cast imported JSON to typed arrays
const weeks: WeekData[] = weeksData as WeekData[];
const clinicians: Clinician[] = cliniciansData as Clinician[];
const sessionTypes: string[] = sessionTypesData as string[];
const appointmentTypes: AppointmentType[] = appointmentTypesData as AppointmentType[];

/**
 * Get all weeks of data, sorted chronologically.
 */
export function getWeeks(): WeekData[] {
  return weeks;
}

/**
 * Get a single week's data by its start date (YYYY-MM-DD).
 * Returns undefined if the week is not found.
 */
export function getWeek(weekStart: string): WeekData | undefined {
  return weeks.find((w) => w.weekStart === weekStart);
}

/**
 * Get all clinician identifiers.
 */
export function getClinicians(): Clinician[] {
  return clinicians;
}

/**
 * Get a single clinician by ID.
 * Returns undefined if the clinician is not found.
 */
export function getClinician(clinicianId: number): Clinician | undefined {
  return clinicians.find((c) => c.id === clinicianId);
}

/**
 * Get all sessions for a specific clinician in a specific week.
 */
export function getClinicianSessions(
  clinicianId: number,
  weekStart: string
): Session[] {
  const week = getWeek(weekStart);
  if (!week) return [];
  return week.sessions.filter((s) => s.clinicianId === clinicianId);
}

/**
 * Get summary statistics for a given week (for the dashboard view).
 */
export function getWeekSummary(weekStart: string): WeekSummary | null {
  const week = getWeek(weekStart);
  if (!week) return null;

  // Count unique clinicians active this week
  const activeClinicians = new Set<number>();
  for (const s of week.sessions) {
    activeClinicians.add(s.clinicianId);
  }
  for (const u of week.unavailability) {
    activeClinicians.add(u.clinicianId);
  }

  // Aggregate unavailability by reason
  const unavailabilityByReason: Record<string, number> = {};
  for (const u of week.unavailability) {
    unavailabilityByReason[u.reason] =
      (unavailabilityByReason[u.reason] || 0) + 1;
  }

  // Aggregate sessions by type
  const sessionsByType: Record<string, number> = {};
  for (const s of week.sessions) {
    sessionsByType[s.sessionType] =
      (sessionsByType[s.sessionType] || 0) + 1;
  }

  return {
    weekStart: week.weekStart,
    totalClinicSlots: week.totalClinicSlots,
    totalAdditionalSessions: week.totalAdditionalSessions,
    totalSessions: week.sessions.length,
    totalUnavailable: week.unavailability.length,
    slotTotals: week.slotTotals,
    clinicianCount: activeClinicians.size,
    unavailabilityByReason,
    sessionsByType,
  };
}

/**
 * Get all unique session type codes found across all weeks.
 */
export function getSessionTypes(): string[] {
  return sessionTypes;
}

/**
 * Get appointment type definitions.
 */
export function getAppointmentTypes(): AppointmentType[] {
  return appointmentTypes;
}

/**
 * Get a list of all available week start dates (for navigation / selectors).
 */
export function getAvailableWeeks(): string[] {
  return weeks.map((w) => w.weekStart);
}

/**
 * Get week summaries for all weeks (for trend/overview displays).
 */
export function getAllWeekSummaries(): WeekSummary[] {
  return weeks
    .map((w) => getWeekSummary(w.weekStart))
    .filter((s): s is WeekSummary => s !== null);
}
