/**
 * security.ts — client-side security utilities
 *
 * Covers: password hashing, input validation, login rate-limiting,
 * session timeout, and CSV-injection sanitisation.
 *
 * NOTE ON PASSWORD HASHING
 * This module uses a deterministic, peppered, MurmurHash3-inspired hash so
 * that passwords are never stored in plaintext.  A client-side hash is NOT
 * a substitute for server-side bcrypt/argon2 — it is the best we can do in a
 * fully-client-side architecture and is clearly labelled as such throughout.
 */

// ── Password hashing ─────────────────────────────────────────────────────────

const PEPPER = "§NHS-CAP-PLAN-2026§";
export const HASH_PREFIX = "$nhsh$";

/**
 * Synchronous MurmurHash3-inspired hash with pepper.
 * Produces a 16-character hex digest prefixed with "$nhsh$".
 * Intended for demonstration; production should use bcrypt/argon2 on the server.
 */
export function hashPassword(password: string): string {
  const input = PEPPER + password + PEPPER.split("").reverse().join("");
  let h1 = 0x9e3779b9;
  let h2 = 0x6c62272e;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = (Math.imul(h1 ^ ch, 2654435761)) >>> 0;
    h2 = (Math.imul(h2 ^ ch, 1597334677)) >>> 0;
  }
  h1 = (Math.imul(h1 ^ (h2 >>> 15), 2246822507) ^ Math.imul(h2 ^ (h1 >>> 13), 3266489909)) >>> 0;
  h2 = (Math.imul(h2 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h2 >>> 11), 3266489909)) >>> 0;
  return HASH_PREFIX + h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
}

export function isHashed(password: string): boolean {
  return password.startsWith(HASH_PREFIX);
}

// ── Input validation ──────────────────────────────────────────────────────────

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

/**
 * Returns an error string if invalid, null if valid.
 * Allows only alphanumeric characters, underscore, and hyphen; 3–50 chars.
 */
export function validateUsername(username: string): string | null {
  if (username.length < 3) return "Username must be at least 3 characters.";
  if (username.length > 50) return "Username must be 50 characters or fewer.";
  if (!/^[a-zA-Z0-9_-]+$/.test(username))
    return "Username may only contain letters, numbers, _ and -.";
  return null;
}

/**
 * Returns an error string if invalid, null if valid.
 * Minimum 8 chars, at least one uppercase letter and one digit.
 */
export function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(password)) return "Password must include at least one uppercase letter.";
  if (!/[0-9]/.test(password)) return "Password must include at least one number.";
  return null;
}

/**
 * Clamp a string to a safe integer in a given range, returning null on invalid input.
 */
export function parsePositiveInt(value: string, max = 9999): number | null {
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 0 || n > max) return null;
  return n;
}

// ── CSV injection sanitisation ────────────────────────────────────────────────

/**
 * Wraps a cell value in double-quotes and prevents spreadsheet formula
 * injection by prefixing formula-triggering characters (=, +, -, @, tab, CR).
 */
export function sanitizeCsvCell(value: string | number | null | undefined): string {
  const str = String(value ?? "").replace(/"/g, '""');
  if (/^[=+\-@\t\r]/.test(str)) return `"'${str}"`;
  return `"${str}"`;
}

// ── Login rate limiting ───────────────────────────────────────────────────────

const RATE_KEY = "nhs-login-attempts";
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

interface AttemptRecord { count: number; lockedUntil: number; }

function getRateRecords(): Record<string, AttemptRecord> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(RATE_KEY) || "{}"); }
  catch { return {}; }
}

export function checkLockout(username: string): { locked: boolean; minutesLeft: number } {
  const rec = getRateRecords()[username.toLowerCase()];
  if (!rec?.lockedUntil) return { locked: false, minutesLeft: 0 };
  const remaining = rec.lockedUntil - Date.now();
  if (remaining <= 0) return { locked: false, minutesLeft: 0 };
  return { locked: true, minutesLeft: Math.ceil(remaining / 60000) };
}

export function recordFailedAttempt(username: string): { locked: boolean; attemptsLeft: number } {
  if (typeof window === "undefined") return { locked: false, attemptsLeft: MAX_ATTEMPTS };
  const records = getRateRecords();
  const key = username.toLowerCase();
  const rec: AttemptRecord = records[key] ?? { count: 0, lockedUntil: 0 };
  if (rec.lockedUntil > Date.now()) return { locked: true, attemptsLeft: 0 };
  rec.count++;
  if (rec.count >= MAX_ATTEMPTS) {
    rec.lockedUntil = Date.now() + LOCKOUT_MS;
    rec.count = 0;
  }
  records[key] = rec;
  localStorage.setItem(RATE_KEY, JSON.stringify(records));
  return { locked: rec.lockedUntil > Date.now(), attemptsLeft: MAX_ATTEMPTS - rec.count };
}

export function clearFailedAttempts(username: string): void {
  if (typeof window === "undefined") return;
  const records = getRateRecords();
  delete records[username.toLowerCase()];
  localStorage.setItem(RATE_KEY, JSON.stringify(records));
}

// ── Session timeout ────────────────────────────────────────────────────────────

const SESSION_EXPIRY_KEY = "nhs-session-expiry";
export const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export function setSessionExpiry(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SESSION_EXPIRY_KEY, (Date.now() + SESSION_TIMEOUT_MS).toString());
}

export function isSessionExpired(): boolean {
  if (typeof window === "undefined") return false;
  const expiry = sessionStorage.getItem(SESSION_EXPIRY_KEY);
  if (!expiry) return true;
  return Date.now() > parseInt(expiry, 10);
}

export function touchSession(): void {
  if (typeof window === "undefined") return;
  if (sessionStorage.getItem(SESSION_EXPIRY_KEY)) setSessionExpiry();
}

export function clearSessionExpiry(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SESSION_EXPIRY_KEY);
}
