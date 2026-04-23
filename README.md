# NHS Weekly Capacity & Demand Planner

A web application for managing and visualising weekly clinic capacity, session planning, staff scheduling, and delivery reporting for NHS sexual health services.

---

## Features

### Dashboard
- Weekly capacity summary cards — Planned, Delivered, and Variance (colour-coded green / amber / red)
- Per-clinician capacity overview table with planned vs adjusted sessions and reduction percentage
- Quick stats: active clinicians, additional sessions, unavailable slots
- Week-by-week navigation across the full planning year

### Capacity Planner
- Interactive 7-day × 17-timeslot calendar grid
- Colour-coded session types (SRH, NCP, Review, MWM, Extra, Nurse-led, Unavailable)
- Filter view by individual clinician
- Export current week's sessions to CSV

### Timetable
- Slot summary cards per appointment type (NewSRH, NCP, Review, Nwash, NMWM, Nurse Led)
- Detailed session table with date, clinic type, location, clinician, and session type badge
- Filter by clinician, navigate by week, export to CSV

### Additional Sessions
- Form to schedule extra clinic sessions (clinician, reason, clinic type, date, expected patients)
- Saved sessions persist across page refreshes via localStorage
- Distinguishes planned (static) sessions from user-added sessions in the table
- Export to CSV

### Report
- Form to enter actual delivery data (planned vs delivered sessions, root cause)
- Summary cards update in real time from entered data (Delivered, Planned, Variance %, Capacity Reduction)
- Variance colour-coded per threshold (≤3 % green, ≤7 % amber, >7 % red)
- All submissions logged to the Audit Log automatically
- Export report data to CSV

### Audit Log
- Automatic tracking of all user actions (form submissions, role changes, profile updates)
- Search by username or action text
- Export to CSV, Clear log button with confirmation

### User Management *(admin only)*
- Role-based user store with five roles: **Admin**, **Planner**, **Doctor**, **Nurse**, **Clinician**
- Staff directory with search and role filter
- Add / edit / delete users via modal form
- Role changes are written to the audit log instantly
- Cannot delete your own account

### Profile
- Edit display name, email, and department
- Change password with current-password verification
- Role displayed as read-only (set by admin)

---

## Default Accounts

| Username | Password | Role |
|---|---|---|
| `admin` | `admin` | Admin |
| `planner` | `planner` | Planner |
| `nurse1` | `nurse1` | Nurse |
| `doctor1` | `doctor1` | Doctor |
| `clinician1` | `clinician1` | Clinician |

> All accounts and user-entered data are stored in the browser's **localStorage** — no backend or database required.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router) |
| Language | TypeScript 5 |
| Styling | [Tailwind CSS 4](https://tailwindcss.com) |
| UI library | [DaisyUI 5](https://daisyui.com) |
| Font | Poppins (Google Fonts via `next/font`) |
| Data | Static JSON fixtures in `src/data/` |
| Persistence | Browser localStorage / sessionStorage |

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                  # Login
│   ├── dashboard/                # Weekly overview
│   ├── capacity-planner/         # Calendar grid
│   ├── timetable/                # Session list
│   ├── additional-sessions/      # Extra session form
│   ├── report/                   # Delivery reporting
│   ├── audit-log/                # Action history
│   ├── profile/                  # User profile editor
│   └── users/                    # Admin user management
├── components/
│   └── AppLayout.tsx             # Shared sidebar + header shell
├── data/
│   ├── weeks.json                # Weekly session & slot data (2026–2027)
│   ├── clinicians.json           # Clinician list
│   ├── sessionTypes.json         # Session type codes
│   └── appointmentTypes.json     # Appointment type definitions
└── lib/
    ├── users.ts                  # User store, auth helpers, role metadata
    ├── audit.ts                  # Audit log read/write
    ├── store.ts                  # Additional sessions & report entry persistence
    └── export.ts                 # CSV download helper
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Install & run

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with one of the default accounts above.

### Other commands

```bash
npm run build   # Production build
npm run start   # Serve production build
npm run lint    # ESLint
```

---

## Data Notes

Session and slot data is sourced from an NHS capacity planning Excel workbook and extracted into JSON fixtures under `src/data/`. The planning year covered is **April 2026 – March 2027**.

Extraction scripts are available in `scripts/` if the source workbook is updated:
- `scripts/extract-data.js` (Node.js / xlsx)
- `scripts/extract-data.py` (Python / xlrd)

---

## Licence

Internal NHS tool — not for public distribution.
