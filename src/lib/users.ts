import {
  hashPassword,
  isHashed,
  setSessionExpiry,
  isSessionExpired,
  clearSessionExpiry,
} from "@/lib/security";

export type UserRole = "admin" | "planner" | "doctor" | "nurse" | "clinician";

export interface User {
  id: string;
  username: string;
  password: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  createdAt: string;
}

const USERS_KEY = "nhs-users";

// Seed passwords are plaintext here; they are hashed before being persisted.
const SEED_USERS_PLAIN: User[] = [
  {
    id: "1", username: "admin", password: "admin",
    name: "Admin User", email: "admin@nhs.net",
    role: "admin", department: "Administration", createdAt: "2026-01-01",
  },
  {
    id: "2", username: "planner", password: "planner",
    name: "Planner Lead", email: "planner@nhs.net",
    role: "planner", department: "Capacity Planning", createdAt: "2026-01-01",
  },
  {
    id: "3", username: "nurse1", password: "nurse1",
    name: "Sarah Johnson", email: "s.johnson@nhs.net",
    role: "nurse", department: "Sexual Health", createdAt: "2026-01-15",
  },
  {
    id: "4", username: "doctor1", password: "doctor1",
    name: "Dr. Michael Chen", email: "m.chen@nhs.net",
    role: "doctor", department: "Sexual Health", createdAt: "2026-01-15",
  },
  {
    id: "5", username: "clinician1", password: "clinician1",
    name: "Emma Wilson", email: "e.wilson@nhs.net",
    role: "clinician", department: "Sexual Health", createdAt: "2026-02-01",
  },
];

export function getUsers(): User[] {
  if (typeof window === "undefined") return SEED_USERS_PLAIN;
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) {
      // First run: hash all seed passwords before persisting
      const seeded = SEED_USERS_PLAIN.map((u) => ({ ...u, password: hashPassword(u.password) }));
      localStorage.setItem(USERS_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const users = JSON.parse(raw) as User[];
    // Migration: hash any plaintext passwords from before this security update
    const needsMigration = users.some((u) => !isHashed(u.password));
    if (needsMigration) {
      const migrated = users.map((u) =>
        isHashed(u.password) ? u : { ...u, password: hashPassword(u.password) }
      );
      localStorage.setItem(USERS_KEY, JSON.stringify(migrated));
      return migrated;
    }
    return users;
  } catch {
    return SEED_USERS_PLAIN;
  }
}

function persistUsers(users: User[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function getUserById(id: string): User | undefined {
  return getUsers().find((u) => u.id === id);
}

export function authenticate(username: string, password: string): User | null {
  const hashed = hashPassword(password);
  return getUsers().find((u) => u.username === username && u.password === hashed) ?? null;
}

export function addUser(data: Omit<User, "id" | "createdAt">): User {
  const users = getUsers();
  const newUser: User = {
    ...data,
    // Always store a hashed password; caller may pass plaintext or pre-hashed
    password: isHashed(data.password) ? data.password : hashPassword(data.password),
    id: Date.now().toString(),
    createdAt: new Date().toISOString().split("T")[0],
  };
  persistUsers([...users, newUser]);
  return newUser;
}

export function updateUser(id: string, updates: Partial<Omit<User, "id" | "createdAt">>): User | null {
  const users = getUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  // Hash password if a new plaintext one is provided
  if (updates.password && !isHashed(updates.password)) {
    updates = { ...updates, password: hashPassword(updates.password) };
  }
  users[idx] = { ...users[idx], ...updates };
  persistUsers(users);
  return users[idx];
}

export function deleteUser(id: string): void {
  persistUsers(getUsers().filter((u) => u.id !== id));
}

export function usernameExists(username: string, excludeId?: string): boolean {
  return getUsers().some((u) => u.username === username && u.id !== excludeId);
}

// ── Session helpers ──────────────────────────────────────────────────────────

export function setSession(user: User): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem("nhs-user-id", user.id);
  sessionStorage.setItem("nhs-username", user.name);
  setSessionExpiry();
}

export function getSessionUserId(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("nhs-user-id");
}

export function getCurrentUser(): User | null {
  if (isSessionExpired()) {
    clearSession();
    return null;
  }
  const id = getSessionUserId();
  if (!id) return null;
  return getUserById(id) ?? null;
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem("nhs-user-id");
  sessionStorage.removeItem("nhs-username");
  clearSessionExpiry();
}

// ── Role metadata ────────────────────────────────────────────────────────────

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin", planner: "Planner", doctor: "Doctor",
  nurse: "Nurse", clinician: "Clinician",
};

export const ROLE_COLORS: Record<UserRole, string> = {
  admin: "bg-purple-100 text-purple-800",
  planner: "bg-blue-100 text-blue-800",
  doctor: "bg-orange-100 text-orange-800",
  nurse: "bg-pink-100 text-pink-800",
  clinician: "bg-emerald-100 text-emerald-800",
};

export const ALL_ROLES: UserRole[] = ["admin", "planner", "doctor", "nurse", "clinician"];

export const DEPARTMENTS = [
  "Administration", "Capacity Planning", "Sexual Health",
  "Contraception", "HIV & Genitourinary", "Nursing", "General Practice",
];
