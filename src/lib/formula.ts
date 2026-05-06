export const APPT_TYPES = ["NewSRH", "Review", "NCP", "NMWM", "Nwash", "Nurse led"] as const;
export type ApptType = (typeof APPT_TYPES)[number];

export const CLINIC_FORMULA: Record<string, Partial<Record<ApptType, number>>> = {
  srh:    { NewSRH: 2, Review: 4 },
  cp:     { NCP: 2, Review: 4 },
  mwm:    { NMWM: 2, Review: 3 },
  wash:   { Nwash: 2, Review: 5 },
  whone:  { Nwash: 2, Review: 4 },
  whtwo:  { Nwash: 2, Review: 4 },
  mnnew:  { NMWM: 6 },
  mwrev:  { Review: 5 },
  mwwed:  { Review: 1, NMWM: 2 },
  mwfri:  { Review: 7 },
  mwmon:  { NMWM: 2 },
};

export function calcApptTotals(
  entries: { clinicType: string; count: number }[]
): Record<ApptType, number> {
  const t = Object.fromEntries(APPT_TYPES.map((k) => [k, 0])) as Record<ApptType, number>;
  for (const { clinicType, count } of entries) {
    const f = CLINIC_FORMULA[clinicType.toLowerCase()];
    if (f) {
      for (const [k, v] of Object.entries(f) as [ApptType, number][]) {
        t[k] += v * count;
      }
    }
  }
  return t;
}
