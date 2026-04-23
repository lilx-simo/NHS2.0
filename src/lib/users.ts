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

const SEED_USERS: User[] = [
  {
    id: "1",
    username: "admin",
    password: "admin",
    name: "Admin User",
    email: "admin@nhs.net",
    role: "admin",
    department: "Administration",
    createdAt: "2026-01-01",
  },
  {
    id: "2",
    username: "planner",
    password: "planner",
    name: "Planner Lead",
    email: "planner@nhs.net",
    role: "planner",
    department: "Capacity Planning",
    createdAt: "2026-01-01",
  },
  {
    id: "3",
    username: "nurse1",
    password: "nurse1",
    name: "Sarah Johnson",
    email: "s.johnson@nhs.net",
    role: "nurse",
    department: "Sexual Health",
    createdAt: "2026-01-15",
  },
  {
    id: "4",
    username: "doctor1",
    password: "doctor1",
    name: "Dr. Michael Chen",
    email: "m.chen@nhs.net",
    role: "doctor",
    department: "Sexual Health",
    createdAt: "2026-01-15",
  },
  {
    id: "5",
    username: "clinician1",
    password: "clinician1",
    name: "Emma Wilson",
    email: "e.wilson@nhs.net",
    role: "clinician",
    department: "Sexual Health",
    createdAt: "2026-02-01",
  },
];

export function getUsers(): User[] {
  if (typeof window === "undefined") return SEED_USERS;
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) {
      localStorage.setItem(USERS_KEY, JSON.stringify(SEED_USERS));
      return SEED_USERS;
    }
    return JSON.parse(raw) as User[];
  } catch {
    return SEED_USERS;
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
  return getUsers().find((u) => u.username === username && u.password === password) ?? null;
}

export function addUser(data: Omit<User, "id" | "createdAt">): User {
  const users = getUsers();
  const newUser: User = {
    ...data,
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
}

export function getSessionUserId(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("nhs-user-id");
}

export function getCurrentUser(): User | null {
  const id = getSessionUserId();
  if (!id) return null;
  return getUserById(id) ?? null;
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem("nhs-user-id");
  sessionStorage.removeItem("nhs-username");
}

// ── Role metadata ────────────────────────────────────────────────────────────

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  planner: "Planner",
  doctor: "Doctor",
  nurse: "Nurse",
  clinician: "Clinician",
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
  "Administration",
  "Capacity Planning",
  "Sexual Health",
  "Contraception",
  "HIV & Genitourinary",
  "Nursing",
  "General Practice",
];
