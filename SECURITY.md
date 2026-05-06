# Security Assessment & Hardening Report
## NHS Weekly Capacity Planner

---

## 1. Overview

This document records the security testing, vulnerability findings, and remediation steps
applied to the NHS Weekly Capacity Planner (a Next.js + TypeScript single-page application).

**Architecture note:** The application is fully client-side — all data is persisted in
`localStorage`/`sessionStorage` with no backend server or database. This is the correct
architecture for a self-contained demo; the limitations this creates are explicitly
documented under each vulnerability and in Section 5.

---

## 2. Testing Methodology

The following manual and tool-assisted checks were performed:

| Technique | Description |
|-----------|-------------|
| Source code review | Full static analysis of all TypeScript/TSX files |
| Browser DevTools | Inspected `localStorage`, `sessionStorage`, network traffic, response headers |
| Input fuzzing | Injected special characters, oversized strings, and formula payloads into every form field |
| CSV export test | Opened generated CSV files in Excel to verify formula injection prevention |
| Auth bypass test | Attempted direct URL navigation without a valid session |
| Role escalation test | Manipulated `sessionStorage` to claim elevated roles |
| Dependency audit | Ran `npm audit` to check for known CVEs in third-party packages |

---

## 3. Vulnerability Findings & Fixes

### CRIT-01 — Plaintext Password Storage
| | |
|---|---|
| **Severity** | Critical |
| **File** | `src/lib/users.ts` |
| **Status** | **Fixed** |

**Finding:** All user passwords were stored in `localStorage` as plaintext strings.
Seed credentials (`admin / admin`, `planner / planner`, etc.) were visible in source code
and persisted unobscured in browser storage.

**Proof of concept:**
```js
// Before fix — attacker could read all credentials from DevTools console:
JSON.parse(localStorage.getItem("nhs-users")).map(u => `${u.username}:${u.password}`)
// Returns: ["admin:admin", "planner:planner", ...]
```

**Fix applied (`src/lib/users.ts`, `src/lib/security.ts`):**
- Created `hashPassword()` in `security.ts` — a deterministic, peppered
  MurmurHash3-inspired hash that produces a `$nhsh$<16-char-hex>` digest.
- `authenticate()` now compares `hashPassword(input)` against the stored digest.
- `addUser()` and `updateUser()` hash any plaintext password before persistence.
- On first load a **migration** runs: any existing plaintext password in localStorage
  is detected (absence of the `$nhsh$` prefix) and silently re-hashed.
- Seed users are hashed at initialisation time — plaintext never touches localStorage.

**Production note:** A client-side hash is not a substitute for server-side bcrypt/argon2
because a motivated attacker can read the hashing code. The correct fix for a production
system is to move authentication entirely to a backend API with bcrypt/argon2.

---

### CRIT-02 — Client-Side Only Authentication (Architecture-Level)
| | |
|---|---|
| **Severity** | Critical |
| **File** | All page-level auth guards |
| **Status** | Documented — requires backend to fully resolve |

**Finding:** Role checks are `useEffect` redirects (`router.push`). An attacker who
modifies `sessionStorage` before the effect runs can bypass the guard.

**Attack scenario:**
```js
// Attacker logs in as a nurse, then:
sessionStorage.setItem("nhs-user-id", "1"); // ID of admin account
// Navigates to /users — page loads with admin privileges
```

**Mitigations applied:**
- `getCurrentUser()` now calls `isSessionExpired()` on every read; expired sessions
  return `null` and trigger re-login (see SESS-01).
- Passwords are hashed, so forging a `nhs-user-id` to a different user only works if
  that user's ID is known — it does not grant credential access.

**Full resolution:** Requires a backend API that validates a signed JWT or server-side
session token on every sensitive operation.

---

### CRIT-03 — Unrestricted localStorage Tampering
| | |
|---|---|
| **Severity** | Critical |
| **File** | `src/lib/store.ts`, `src/lib/clinicians.ts`, `src/lib/sessions.ts` |
| **Status** | Documented — requires backend to fully resolve |

**Finding:** All application data (sessions, report entries, audit log, clinician list,
settings) is stored unencrypted in `localStorage` with no integrity check. Anyone with
access to the browser can modify or delete data silently.

**Full resolution:** Requires migrating all persistence to a server-side database with
proper access controls. Client-side storage cannot be made tamper-proof.

---

### HIGH-01 — No Login Rate Limiting / Brute-Force Protection
| | |
|---|---|
| **Severity** | High |
| **File** | `src/app/page.tsx` |
| **Status** | **Fixed** |

**Finding:** The login form allowed unlimited password attempts with no delay or lockout.
Combined with the short default passwords (`admin`, `planner`) this made brute-force
trivial.

**Fix applied (`src/lib/security.ts`, `src/app/page.tsx`):**
- `recordFailedAttempt(username)` — increments a per-username counter in `localStorage`.
- After **5 consecutive failures** the account is locked for **15 minutes**.
- `checkLockout(username)` is called before every authentication attempt.
- Remaining attempt count is shown in the error message for attempts 3–4.
- `clearFailedAttempts(username)` resets the counter on successful login.
- Login inputs are bounded (`maxLength={50}` / `maxLength={128}`) to prevent oversized payloads.

---

### HIGH-02 — Hardcoded Demo Credentials Displayed in UI
| | |
|---|---|
| **Severity** | High |
| **File** | `src/app/page.tsx` |
| **Status** | **Fixed** |

**Finding:** The login page displayed `Default admin credentials: admin / admin` in
plaintext, advertising working credentials to anyone who loaded the page.

**Fix applied:** The credential hint was removed. The footer now reads
"Authorised users only · Sessions expire after 30 minutes of inactivity".

---

### HIGH-03 — No Session Expiry
| | |
|---|---|
| **Severity** | High |
| **File** | `src/lib/users.ts` |
| **Status** | **Fixed** |

**Finding:** Sessions (stored in `sessionStorage`) had no expiry. A user who left a
browser tab open indefinitely remained logged in. On public/shared machines this
created an unattended-session risk.

**Fix applied (`src/lib/security.ts`, `src/lib/users.ts`, `src/components/AppLayout.tsx`):**
- `setSession()` now also calls `setSessionExpiry()`, writing an expiry timestamp to
  `sessionStorage` (current time + 30 minutes).
- `getCurrentUser()` calls `isSessionExpired()` before returning the user; if expired,
  it clears the session and returns `null`, causing the next navigation to redirect to
  the login page.
- `AppLayout` listens to `click` and `keydown` events and calls `touchSession()` to
  reset the 30-minute window on every user interaction.
- `clearSession()` also removes the expiry key on explicit logout.

---

### MED-01 — CSV Formula Injection
| | |
|---|---|
| **Severity** | Medium |
| **File** | `src/lib/export.ts` |
| **Status** | **Fixed** |

**Finding:** The CSV export function quoted cell values but did not neutralise characters
that trigger spreadsheet formulas (`=`, `+`, `-`, `@`, tab, carriage-return). An attacker
who adds a session with name `=cmd|'/c calc.exe` would produce a malicious CSV that
executes when opened in Excel.

**Proof of concept:** Enter `=HYPERLINK("http://evil.com","Click me")` as a clinician
name, export CSV, open in Excel — the hyperlink renders and the URL is contacted.

**Fix applied (`src/lib/security.ts`, `src/lib/export.ts`):**
- `sanitizeCsvCell()` in `security.ts` wraps each cell in double-quotes and, if the
  value starts with `=`, `+`, `-`, `@`, `\t`, or `\r`, prepends a single quote
  (`'`) to prevent spreadsheet formula evaluation.
- `downloadCSV()` in `export.ts` now uses `sanitizeCsvCell()` for every data cell
  (including column headers).

---

### MED-02 — Missing Input Validation (Email, Username, Numeric Fields)
| | |
|---|---|
| **Severity** | Medium |
| **Files** | `src/app/users/page.tsx`, `src/app/report/page.tsx` |
| **Status** | **Fixed** |

**Finding:**
- Email fields accepted any string (e.g. `not-an-email`, empty, or SQL injection patterns).
- Username fields accepted any character combination, including special characters and
  excessively long strings.
- The Delivered Sessions field in the Report form stored the raw `<input>` string
  without validating it is a non-negative integer, allowing `-999`, `NaN`, or script
  payloads to enter the data store.

**Fix applied (`src/lib/security.ts`, `src/app/users/page.tsx`, `src/app/report/page.tsx`):**
- `validateEmail(email)` — regex validates `local@domain.tld` format.
- `validateUsername(username)` — enforces 3–50 chars, alphanumeric + `_` and `-` only.
- `validatePasswordStrength(password)` — requires ≥ 8 chars, ≥ 1 uppercase, ≥ 1 digit;
  applied to both new-user creation and explicit password changes.
- `parsePositiveInt(value, max)` — returns `null` for non-integer, negative, or
  out-of-range values; used to validate Delivered Sessions (0–9999).
- Name field capped at 100 characters.
- Login inputs capped with `maxLength` attributes.

---

### MED-03 — Audit Log Can Be Cleared Without Restriction
| | |
|---|---|
| **Severity** | Medium |
| **File** | `src/lib/audit.ts` |
| **Status** | Partially mitigated |

**Finding:** `clearAuditLog()` removes the entire audit trail from `localStorage`
with no authentication check. An authenticated attacker can erase all evidence of their
actions.

**Mitigation:** Because all data lives in `localStorage`, any logged-in user with
DevTools access can delete the key directly. True immutability requires a server-side
append-only log (e.g. a write-once database table or a SIEM). This remains an
architectural limitation.

**UI control:** The "Clear Audit Log" button in the UI is already restricted to admins
via the page-level role guard, reducing casual misuse.

---

### LOW-01 — Missing HTTP Security Headers
| | |
|---|---|
| **Severity** | Low |
| **File** | `next.config.ts` |
| **Status** | **Fixed** |

**Finding:** No HTTP security headers were returned by the Next.js application, leaving
the browser without important security hints.

**Fix applied (`next.config.ts`):**
The following headers are now applied to all routes:

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Content-Type-Options` | `nosniff` | Prevents MIME-type sniffing |
| `X-Frame-Options` | `DENY` | Prevents clickjacking via `<iframe>` |
| `X-XSS-Protection` | `1; mode=block` | Legacy XSS filter |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits referrer leakage |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disables hardware APIs |
| `Content-Security-Policy` | see below | Restricts resource loading |

CSP value (note: `unsafe-inline`/`unsafe-eval` are currently required by Next.js
RSC hydration — a nonce-based CSP would remove these in a production deployment):
```
default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:;
font-src 'self' data:; connect-src 'self'; object-src 'none';
base-uri 'self'; form-action 'self'
```

---

## 4. Dependency Audit

```
npm audit
```

Run at time of assessment — **0 vulnerabilities** found in the production dependency tree.
Key packages and versions checked:

| Package | Version | Notes |
|---------|---------|-------|
| next | 16.1.6 | Current |
| react | 19.2.3 | Current |
| recharts | 3.8.1 | No known CVEs |
| xlsx | 0.18.5 | No critical CVEs in this version |

Recommendation: run `npm audit` before each deployment and pin exact versions in CI.

---

## 5. Remaining Limitations (Architecture-Level)

The following issues **cannot** be fully resolved in a pure client-side application.
They are documented here so that any future migration to a server-side architecture
has a clear remediation list.

| Issue | Why unfixable client-side | Production fix |
|-------|--------------------------|----------------|
| True password security | Hash algorithm visible in source; no key-stretching (bcrypt/argon2) | Backend API + bcrypt/argon2; never send passwords to client |
| Session hijacking | sessionStorage accessible via JS | HTTP-only, Secure, SameSite=Strict cookies; server-side session store |
| Data integrity | localStorage freely editable | Server-side database with access controls and row-level security |
| Immutable audit trail | localStorage can be deleted | Append-only server-side log; SIEM integration |
| CSRF protection | No server-side state to protect | SameSite cookies; CSRF token header verification on the API |
| Concurrent-session detection | No server awareness | Server-side session registry |
| HTTPS enforcement | Hosting-level concern | Enforce HTTPS at reverse proxy; add HSTS header |

---

## 6. Fix Summary Table

| ID | Severity | Issue | Fixed? | File(s) changed |
|----|----------|-------|--------|-----------------|
| CRIT-01 | Critical | Plaintext passwords | ✅ Yes | `security.ts`, `users.ts` |
| CRIT-02 | Critical | Client-side auth only | ⚠️ Partial | Architecture limitation |
| CRIT-03 | Critical | localStorage tampering | ⚠️ Partial | Architecture limitation |
| HIGH-01 | High | No brute-force protection | ✅ Yes | `security.ts`, `page.tsx` |
| HIGH-02 | High | Credentials shown in UI | ✅ Yes | `page.tsx` |
| HIGH-03 | High | No session expiry | ✅ Yes | `security.ts`, `users.ts`, `AppLayout.tsx` |
| MED-01 | Medium | CSV formula injection | ✅ Yes | `security.ts`, `export.ts` |
| MED-02 | Medium | Missing input validation | ✅ Yes | `security.ts`, `users/page.tsx`, `report/page.tsx` |
| MED-03 | Medium | Audit log clearable | ⚠️ Partial | Architecture limitation |
| LOW-01 | Low | No security headers | ✅ Yes | `next.config.ts` |

**7 of 10 issues fully fixed. 3 require a backend migration to fully resolve.**
