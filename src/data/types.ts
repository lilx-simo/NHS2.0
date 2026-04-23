/**
 * NHS Weekly Capacity Planner - Data Types
 *
 * These types define the structure of the fixture data extracted from the
 * NHS Capacity and Demand Planner Excel workbook.
 */

/** A clinician (or numbered row) found in the timetable */
export interface Clinician {
  id: number;
  label: string;
  name?: string;
}

/** A single session assignment for a clinician in a given week */
export interface Session {
  clinicianId: number;
  day: DayOfWeek;
  period: Period;
  sessionType: string;
  location: string;
}

/** A period of unavailability for a clinician */
export interface Unavailability {
  clinicianId: number;
  day: DayOfWeek;
  period: Period;
  reason: UnavailabilityReason;
}

/** Appointment type slot totals for a week */
export interface SlotTotals {
  NewSRH: number;
  Review: number;
  NCP: number;
  NMWM: number;
  Nwash: number;
  "Nurse led": number;
  [key: string]: number;
}

/** A single week's complete data */
export interface WeekData {
  weekStart: string; // ISO date string YYYY-MM-DD
  sessions: Session[];
  slotTotals: SlotTotals;
  totalClinicSlots: number;
  totalAdditionalSessions: number;
  unavailability: Unavailability[];
}

/** Appointment type definition */
export interface AppointmentType {
  code: string;
  name: string;
  description: string;
}

/** Summary statistics for a week (used by dashboard) */
export interface WeekSummary {
  weekStart: string;
  totalClinicSlots: number;
  totalAdditionalSessions: number;
  totalSessions: number;
  totalUnavailable: number;
  slotTotals: SlotTotals;
  clinicianCount: number;
  unavailabilityByReason: Record<string, number>;
  sessionsByType: Record<string, number>;
}

/** Days of the week */
export type DayOfWeek =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

/** Time periods */
export type Period = "AM" | "PM";

/** Known unavailability reasons */
export type UnavailabilityReason =
  | "Annual Leave"
  | "Study Leave"
  | "SICK"
  | "AUDIT"
  | "Theatre"
  | string;
