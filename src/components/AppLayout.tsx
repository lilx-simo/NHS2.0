"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { getCurrentUser, clearSession, ROLE_LABELS, ROLE_COLORS, type User } from "@/lib/users";
import { getAvailableWeeks, getWeekSummary } from "@/data";
import { getSettings } from "@/lib/settings";

type NavLink = {
  label: string;
  href: string;
  adminOnly?: boolean;
  icon: () => React.ReactNode;
};

const NAV_LINKS: NavLink[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: () => (
      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
      </svg>
    ),
  },
  {
    label: "Capacity Planner",
    href: "/capacity-planner",
    icon: () => (
      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    label: "Timetable",
    href: "/timetable",
    icon: () => (
      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    label: "Additional Sessions",
    href: "/additional-sessions",
    icon: () => (
      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    label: "Report",
    href: "/report",
    icon: () => (
      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    label: "Audit Log",
    href: "/audit-log",
    icon: () => (
      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    label: "User Management",
    href: "/users",
    adminOnly: true,
    icon: () => (
      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    label: "Settings",
    href: "/settings",
    adminOnly: true,
    icon: () => (
      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

function VarianceDot({ variance, amber, red }: { variance: number; amber: number; red: number }) {
  if (variance >= red) return <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />;
  if (variance >= amber) return <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />;
  return <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [variance, setVariance] = useState(0);
  const [amberThreshold, setAmberThreshold] = useState(5);
  const [redThreshold, setRedThreshold] = useState(10);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUser(getCurrentUser());

    // Load settings and calculate current-week variance for the badge
    const settings = getSettings();
    setAmberThreshold(settings.varianceAmber);
    setRedThreshold(settings.varianceRed);

    const weeks = getAvailableWeeks();
    if (weeks.length) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let closest = 0;
      let minDiff = Infinity;
      weeks.forEach((ws, i) => {
        const d = new Date(ws + "T00:00:00");
        const diff = Math.abs(d.getTime() - today.getTime());
        if (diff < minDiff) { minDiff = diff; closest = i; }
      });
      const summary = getWeekSummary(weeks[closest]);
      if (summary && summary.totalClinicSlots > 0) {
        const delivered = summary.totalClinicSlots - summary.totalUnavailable * 5;
        const v = Math.round(((summary.totalClinicSlots - delivered) / summary.totalClinicSlots) * 100);
        setVariance(v);
      }
    }
  }, []);

  // Close profile dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const handleSignOut = () => {
    clearSession();
    router.push("/");
  };

  const visibleLinks = NAV_LINKS.filter(
    (l) => !l.adminOnly || user?.role === "admin"
  );

  const initial = user?.name?.[0]?.toUpperCase() ?? "U";
  const roleLabel = user ? ROLE_LABELS[user.role] : "";
  const roleColor = user ? ROLE_COLORS[user.role] : "";

  const SidebarContent = () => (
    <>
      {/* Nav links */}
      <nav className="flex flex-col p-3 gap-0.5 mt-2 flex-1 overflow-y-auto">
        {visibleLinks.map((link) => {
          const isActive = pathname === link.href;
          const isDashboard = link.href === "/dashboard";
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                isActive
                  ? "bg-[#005eb8] text-white shadow-sm"
                  : "text-slate-600 hover:bg-blue-50 hover:text-[#005eb8]"
              }`}
            >
              {link.icon()}
              <span className="truncate flex-1">{link.label}</span>
              {isDashboard && (
                <VarianceDot variance={variance} amber={amberThreshold} red={redThreshold} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Profile section with dropdown */}
      <div ref={profileRef} className="relative border-t border-gray-200">
        {profileOpen && (
          <div className="absolute bottom-full left-2 right-2 mb-2 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-50">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
              <p className="text-sm font-semibold text-slate-800 truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email || user?.username}</p>
              {user && (
                <span className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-xs font-semibold ${roleColor}`}>
                  {roleLabel}
                </span>
              )}
            </div>
            <div className="p-1.5 space-y-0.5">
              <Link
                href="/profile"
                onClick={() => setProfileOpen(false)}
                className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-blue-50 hover:text-[#005eb8] transition-colors"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Edit Profile
              </Link>

              {user?.role === "admin" && (
                <Link
                  href="/users"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-blue-50 hover:text-[#005eb8] transition-colors"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  User Management
                </Link>
              )}

              <div className="border-t border-gray-100 my-1" />

              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </div>
          </div>
        )}

        <button
          onClick={() => setProfileOpen((o) => !o)}
          className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left"
        >
          <div className="w-9 h-9 rounded-full bg-[#005eb8] flex items-center justify-center text-white text-sm font-bold shrink-0">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-800 truncate">{user?.name ?? "…"}</p>
            <p className="text-xs text-slate-500 truncate">{roleLabel}</p>
          </div>
          <svg
            className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${profileOpen ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    </>
  );

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="w-full h-16 bg-[#005eb8] flex items-center justify-between px-4 sm:px-6 shrink-0 shadow-md z-20 no-print">
        <div className="flex items-center gap-3">
          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition"
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {sidebarOpen ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
          <Image src="/nhs-logo.png" alt="NHS Logo" width={60} height={42} priority />
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <span className={`hidden sm:inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${roleColor}`}>
              {roleLabel}
            </span>
          )}
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-bold">
            {initial}
          </div>
          <span className="text-white text-sm font-medium hidden sm:block">
            {user?.name ?? "…"}
          </span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-20 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar — desktop: always visible; mobile: sliding drawer */}
        <aside
          className={`
            fixed md:static top-0 left-0 h-full md:h-auto
            w-64 md:w-56 bg-white border-r border-gray-200 flex flex-col shadow-sm z-30 md:z-10
            transition-transform duration-200 ease-in-out
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          `}
          style={{ paddingTop: sidebarOpen ? "4rem" : undefined }}
        >
          <SidebarContent />
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}
