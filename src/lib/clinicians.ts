import seedData from "@/data/clinicians.json";

export interface ManagedClinician {
  id: number;
  label: string;
  name: string;
  specialty: string;
  email: string;
  active: boolean;
}

const KEY = "nhs-managed-clinicians";

const SEED: ManagedClinician[] = (
  seedData as { id: number; label: string; name?: string }[]
).map((c) => ({
  id: c.id,
  label: c.label,
  name: c.name ?? `Clinician ${c.label}`,
  specialty: "Sexual Health",
  email: "",
  active: true,
}));

export function getManagedClinicians(): ManagedClinician[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      localStorage.setItem(KEY, JSON.stringify(SEED));
      return SEED;
    }
    return JSON.parse(raw) as ManagedClinician[];
  } catch {
    return SEED;
  }
}

function persist(list: ManagedClinician[]): void {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(list));
}

export function addManagedClinician(data: Omit<ManagedClinician, "id" | "label">): ManagedClinician {
  const all = getManagedClinicians();
  const maxId = all.reduce((m, c) => Math.max(m, c.id), 0);
  const entry: ManagedClinician = { ...data, id: maxId + 1, label: String(maxId + 1) };
  persist([...all, entry]);
  return entry;
}

export function updateManagedClinician(
  id: number,
  updates: Partial<Omit<ManagedClinician, "id" | "label">>
): ManagedClinician | null {
  const all = getManagedClinicians();
  const idx = all.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...updates };
  persist(all);
  return all[idx];
}

export function deleteManagedClinician(id: number): void {
  persist(getManagedClinicians().filter((c) => c.id !== id));
}

export const SEED_IDS = new Set(SEED.map((c) => c.id));

export const SPECIALTIES = [
  "Sexual Health",
  "Contraception",
  "HIV & Genitourinary",
  "Nursing",
  "General Practice",
  "Gynaecology",
];
