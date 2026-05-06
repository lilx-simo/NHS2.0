# NHS Weekly Capacity & Demand Planner

A full-stack web application for managing and visualising weekly clinic capacity, session planning, staff scheduling, and delivery reporting for NHS sexual health services.

---

## Features

### Dashboard
- Weekly capacity summary cards — Planned, Delivered, and Variance (colour-coded green / amber / red)
- Per-clinician capacity overview table with planned vs adjusted sessions and reduction %
- Quick stats: active clinicians, additional sessions, unavailable slots
- 8-week trend charts: Planned vs Delivered bar chart, Variance % line chart
- Last reported week summary (actual delivery data vs plan)
- Week-by-week navigation with keyboard shortcuts (← →)
- Print support

### Year Overview
- Full planning year (April 2026 – March 2027) heat map
- Colour-coded weeks by variance (green / amber / red)
- Past weeks shown at reduced opacity
- Current week highlighted with a ring
- Reported weeks marked with a dot indicator
- Click any week for a detail panel (planned, delivered, variance, clinician count, unavailable slots)
- Per-month progress bar and on-target count

### Capacity Planner *(admin / planner)*
- Interactive 7-day × 17-time-slot calendar grid
- Colour-coded session types (SRH, NCP, Review, MWM, Extra, Nurse-led, Unavailable)
- Today's column highlighted
- Click an empty cell to add a custom session; click a custom (violet) session to edit or delete it
- Filter view by individual clinician
- Auto-syncs clinical staff from User Management into the clinician dropdown
- Export current week's sessions to CSV

### Timetable
- Slot summary cards per appointment type (New SRH, NCP, Review, Nwash, NMWM, Nurse Led)
- Detailed session table showing date, clinic type, location, clinician, and type badge (Core / Custom / Additional)
- Combines planned sessions, capacity planner additions, and user-added extra sessions
- Filter by clinician, navigate by week, print, export to CSV

### Additional Sessions *(admin / planner)*
- Form to schedule extra clinic sessions with reason (Cover for Leave, Back Log, RTT Action, Extra Capacity)
- Separate display of planned extra sessions vs user-added sessions
- Export to CSV

### Report *(admin / planner)*
- Form to enter actual delivery data per clinician / clinic type (delivered sessions, root cause)
- Live summary cards: Delivered, Planned, Variance %, Capacity Reduction
- Appointment-type breakdown table (New SRH, NCP, Review, etc.)
- All submissions logged to the Audit Log automatically
- Export report data to CSV

### Audit Log *(admin / planner)*
- Full trail of all user actions: logins, role changes, session adds, settings updates, etc.
- Search by username or action text
- Export to CSV; Clear log with confirmation (admin only)

### User Management *(admin only)*
- Five roles: **Admin**, **Planner**, **Doctor**, **Nurse**, **Clinician**
- Staff directory with search and role filter tabs
- Add / edit / delete users via modal; password hashed server-side with bcrypt
- Role changes recorded in the audit log; cannot delete your own account

### Clinician Directory *(admin only)*
- Managed clinician roster (name, specialty, email, active status)
- Add, edit, toggle active status, delete
- Linked to the capacity planner and timetable dropdowns

### Profile
- Edit display name, email, and department
- Change password (minimum 4 characters)
- Role displayed as read-only (set by admin)
- Account creation date shown

### Settings *(admin only)*
- Organisation name (shown in reports and exports)
- Variance amber and red thresholds (configurable %)
- Live colour-coding preview
- Auto-jump to current week toggle
- Saved to the database; synced to localStorage for client-side page navigation

---

## Default Accounts (seeded)

| Username | Password | Role |
|---|---|---|
| `admin` | `Admin1234` | Admin |
| `planner` | `Planner1234` | Planner |
| `nurse1` | `Nurse1234` | Nurse |
| `doctor1` | `Doctor1234` | Doctor |
| `clinician1` | `Clinician1234` | Clinician |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router, TypeScript) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com) |
| Font | Poppins (Google Fonts via `next/font`) |
| Database | PostgreSQL on [Supabase](https://supabase.com) |
| ORM | [Prisma 7](https://www.prisma.io) (driver adapter: `@prisma/adapter-pg`) |
| Auth | JWT in httpOnly cookie (`jose`), bcrypt password hashing (`bcryptjs`) |
| Charts | [Recharts 3](https://recharts.org) |
| Static data | JSON fixtures in `src/data/` (April 2026 – March 2027 planning year) |

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                  # Login
│   ├── dashboard/page.tsx        # Weekly overview + charts
│   ├── year-overview/page.tsx    # Annual heat map
│   ├── capacity-planner/page.tsx # Calendar grid editor
│   ├── timetable/page.tsx        # Session list viewer
│   ├── additional-sessions/      # Extra session form
│   ├── report/                   # Actual delivery reporting
│   ├── audit-log/                # Action history
│   ├── clinicians/               # Clinician roster (admin)
│   ├── users/                    # User management (admin)
│   ├── settings/                 # App configuration (admin)
│   ├── profile/                  # User profile editor
│   └── api/                      # REST API routes
│       ├── auth/                 # login, logout, me
│       ├── users/                # CRUD
│       ├── clinicians/           # CRUD
│       ├── custom-sessions/      # CRUD
│       ├── additional-sessions/  # CRUD
│       ├── report-entries/       # CRUD
│       ├── audit-log/            # list, add, clear
│       └── settings/             # get, save
├── components/
│   ├── AppLayout.tsx             # Shared sidebar, header, bell alerts, keyboard shortcuts
│   └── WeeklyChart.tsx           # Bar chart + line chart (Recharts)
├── data/
│   ├── weeks.json                # Weekly session & slot data
│   ├── clinicians.json           # Static clinician list
│   ├── sessionTypes.json         # Session type codes
│   ├── appointmentTypes.json     # Appointment type definitions
│   └── types.ts                  # TypeScript types
└── lib/
    ├── api.ts                    # Client-side API wrapper (fetch + credentials)
    ├── auth-server.ts            # JWT sign/verify, requireSession, requireRole
    ├── db.ts                     # Prisma client (pg driver adapter, singleton)
    ├── settings.ts               # localStorage settings + getClosestWeekIdx
    ├── formula.ts                # Appointment type breakdown calculations
    ├── export.ts                 # CSV download with injection sanitisation
    ├── security.ts               # Input validation, parsePositiveInt
    └── rate-limit.ts             # Server-side login rate limiting (5 attempts / 15 min)

prisma/
├── schema.prisma                 # 7 models: User, ManagedClinician, CustomSession,
│                                 #   AdditionalSession, ReportEntry, AuditLog, AppSettings
├── seed.ts                       # Demo seed data
└── migrations/                   # SQL migration history

prisma.config.ts                  # Prisma CLI config (uses DIRECT_URL for migrations)
src/middleware.ts                 # Edge JWT validation on all non-public routes
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- A PostgreSQL database (e.g. [Supabase](https://supabase.com) free tier)

### Environment variables

Create a `.env` file in the project root:

```env
# Pooled connection (used by the app at runtime)
DATABASE_URL="postgresql://USER:PASSWORD@HOST:6543/postgres?pgbouncer=true&connection_limit=1"

# Direct connection (used by Prisma migrations)
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/postgres"

# JWT secret — use a long random string in production
JWT_SECRET="your-secret-here-min-32-chars"
```

### Install, migrate and seed

```bash
# Install dependencies
npm install

# Run database migrations
npx prisma migrate deploy

# Seed demo accounts and sample data
npm run db:seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with one of the default accounts above.

### Other commands

```bash
npm run build        # Production build
npm run start        # Serve production build
npm run lint         # ESLint
npm run db:seed      # Re-seed the database
npx prisma studio    # Browse the database in a GUI
```

---

## Authentication & Access Control

- Credentials are validated server-side; sessions are JWT tokens stored in an **httpOnly cookie** (not accessible to JavaScript).
- The Next.js middleware validates the JWT on every request, redirecting unauthenticated users to the login page.
- Role hierarchy: **Admin** > **Planner** > Doctor / Nurse / Clinician
- Login is rate-limited: 5 failed attempts locks the account for 15 minutes (server-side, in-memory).

---

## Data Notes

Static session and slot data is sourced from an NHS capacity planning workbook and stored as JSON fixtures in `src/data/`. The planning year covered is **April 2026 – March 2027**.

All user-created data (custom sessions, additional sessions, report entries, audit log, settings) is stored in **PostgreSQL** via Prisma.

---

## Licence

Internal NHS tool — not for public distribution.
