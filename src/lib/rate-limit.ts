interface Record { count: number; lockedUntil: number }

const store = new Map<string, Record>();
const MAX = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

export function checkLockoutServer(username: string): { locked: boolean; minutesLeft: number } {
  const rec = store.get(username.toLowerCase());
  if (!rec?.lockedUntil) return { locked: false, minutesLeft: 0 };
  const remaining = rec.lockedUntil - Date.now();
  if (remaining <= 0) { store.delete(username.toLowerCase()); return { locked: false, minutesLeft: 0 }; }
  return { locked: true, minutesLeft: Math.ceil(remaining / 60000) };
}

export function recordFailedServer(username: string): { locked: boolean; attemptsLeft: number } {
  const key = username.toLowerCase();
  const rec = store.get(key) ?? { count: 0, lockedUntil: 0 };
  if (rec.lockedUntil > Date.now()) return { locked: true, attemptsLeft: 0 };
  rec.count++;
  if (rec.count >= MAX) {
    rec.lockedUntil = Date.now() + LOCKOUT_MS;
    rec.count = 0;
  }
  store.set(key, rec);
  return { locked: rec.lockedUntil > Date.now(), attemptsLeft: MAX - rec.count };
}

export function clearAttemptsServer(username: string): void {
  store.delete(username.toLowerCase());
}
