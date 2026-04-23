"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { getCurrentUser, clearSession, ROLE_LABELS, ROLE_COLORS, type User } from "@/lib/users";
import { getAvailableWeeks, getWeekSummary, getAllWeekSummaries } from "@/data";
import { getSettings } from "@/lib/settings";

type NavLink = { label: string; href: string; adminOnly?: boolean; icon: () => React.ReactNode };

const NAV_LINKS: NavLink[] = [
  {
    label: "Dashboard", href: "/dashboard",
    icon: () => <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>,
  },
  {
    label: "Year Overview", href: "/year-overview",
    icon: () => <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h18M3 14h18M10 3v18M14 3v18M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" /></svg>,
  },
  {
    label: "Capacity Planner", href: "/capacity-planner",
    icon: () => <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  },
  {
    label: "Timetable", href: "/timetable",
    icon: () => <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>,
  },
  {
    label: "Additional Sessions", href: "/additional-sessions",
    icon: () => <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  },
  {
    label: "Report", href: "/report",
    icon: () => <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  },
  {
    label: "Audit Log", href: "/audit-log",
    icon: () => <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  },
  {
    label: "User Management", href: "/users", adminOnly: true,
    icon: () => <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
  },
  {
    label: "Clinician Directory", href: "/clinicians", adminOnly: true,
    icon: () => <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
  },
  {
    label: "Settings", href: "/settings", adminOnly: true,
    icon: () => <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  },
];

function VarianceDot({ variance, amber, red }: { variance: number; amber: number; red: number }) {
  if (variance >= red) return <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />;
  if (variance >= amber) return <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />;
  return <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />;
}

function formatWeekShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [variance, setVariance] = useState(0);
  const [amberThreshold, setAmberThreshold] = useState(5);
  const [redThreshold, setRedThreshold] = useState(10);
  const [alerts, setAlerts] = useState<{ weekStart: string; variance: number }[]>([]);
  const [bellOpen, setBellOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUser(getCurrentUser());

    // Dark mode
    const isDark = localStorage.getItem("nhs-dark-mode") === "true";
    setDarkMode(isDark);
    document.documentElement.classList.toggle("dark", isDark);

    // Settings + current-week variance
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
        const diff = Math.abs(new Date(ws + "T00:00:00").getTime() - today.getTime());
        if (diff < minDiff) { minDiff = diff; closest = i; }
      });
      const s = getWeekSummary(weeks[closest]);
      if (s && s.totalClinicSlots > 0) {
        const delivered = s.totalClinicSlots - s.totalUnavailable * 5;
        setVariance(Math.round(((s.totalClinicSlots - delivered) / s.totalClinicSlots) * 100));
      }
    }

    // Notification alerts — upcoming high-variance weeks
    const summaries = getAllWeekSummaries();
    const settings2 = getSettings();
    const today2 = new Date();
    today2.setHours(0, 0, 0, 0);
    const weekAlerts = summaries
      .filter((s) => new Date(s.weekStart + "T00:00:00") >= today2)
      .map((s) => {
        const delivered = s.totalClinicSlots - s.totalUnavailable * 5;
        const v = s.totalClinicSlots > 0
          ? Math.round(((s.totalClinicSlots - delivered) / s.totalClinicSlots) * 100)
          : 0;
        return { weekStart: s.weekStart, variance: v };
      })
      .filter((w) => w.variance >= settings2.varianceRed)
      .slice(0, 8);
    setAlerts(weekAlerts);
  }, []);

  // Bell click-outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close sidebar on route change
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowLeft") window.dispatchEvent(new CustomEvent("nhs-prev-week"));
      if (e.key === "ArrowRight") window.dispatchEvent(new CustomEvent("nhs-next-week"));
      if (e.key === "?") setShortcutsOpen((o) => !o);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("nhs-dark-mode", String(next));
  };

  const handleSignOut = () => { clearSession(); router.push("/"); };

  const visibleLinks = NAV_LINKS.filter((l) => !l.adminOnly || user?.role === "admin");
  const initial = user?.name?.[0]?.toUpperCase() ?? "U";
  const roleLabel = user ? ROLE_LABELS[user.role] : "";
  const roleColor = user ? ROLE_COLORS[user.role] : "";

  const SidebarContent = () => (
    <>
      <nav className="flex flex-col p-3 gap-0.5 mt-2 flex-1 overflow-y-auto">
        {visibleLinks.map((link) => {
          const isActive = pathname === link.href;
          const isDashboard = link.href === "/dashboard";
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                isActive ? "bg-[#005eb8] text-white shadow-sm" : "text-slate-600 hover:bg-blue-50 hover:text-[#005eb8]"
              }`}
            >
              {link.icon()}
              <span className="truncate flex-1">{link.label}</span>
              {isDashboard && <VarianceDot variance={variance} amber={amberThreshold} red={redThreshold} />}
            </Link>
          );
        })}
      </nav>

      {/* Profile row */}
      <div className="border-t border-gray-200 flex items-center gap-2 px-3 py-3">
        <Link
          href="/profile"
          className="flex items-center gap-3 flex-1 min-w-0 rounded-lg px-2 py-1.5 hover:bg-blue-50 transition-colors group"
        >
          <div className="w-9 h-9 rounded-full bg-[#005eb8] flex items-center justify-center text-white text-sm font-bold shrink-0 group-hover:bg-[#003d8f] transition-colors">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-[#005eb8] transition-colors">{user?.name ?? "…"}</p>
            <p className="text-xs text-slate-500 truncate">{roleLabel}</p>
          </div>
        </Link>
        <button
          onClick={handleSignOut}
          title="Sign out"
          className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
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
          <button
            className="md:hidden p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition"
            onClick={() => setSidebarOpen((o) => !o)}
          >
            {sidebarOpen ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            )}
          </button>
          <Link href="/dashboard" title="Dashboard">
            <Image src="/nhs-logo.png" alt="NHS Logo" width={60} height={42} priority />
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {/* Keyboard shortcuts hint */}
          <button
            onClick={() => setShortcutsOpen((o) => !o)}
            title="Keyboard shortcuts (?)"
            className="hidden sm:flex w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 items-center justify-center text-white/80 hover:text-white transition text-xs font-bold"
          >
            ?
          </button>

          {/* Dark mode toggle */}
          <button
            onClick={toggleDark}
            title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition"
          >
            {darkMode ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            )}
          </button>

          {/* Notification bell */}
          <div ref={bellRef} className="relative">
            <button
              onClick={() => setBellOpen((o) => !o)}
              title="Alerts"
              className="relative w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              {alerts.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {alerts.length}
                </span>
              )}
            </button>

            {bellOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">Capacity Alerts</p>
                  <span className="text-xs text-slate-500">{alerts.length} upcoming</span>
                </div>
                {alerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                    <svg className="w-8 h-8 mb-2 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <p className="text-sm">All upcoming weeks on target</p>
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
                    {alerts.map((a) => (
                      <div key={a.weekStart} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition">
                        <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800">Week of {formatWeekShort(a.weekStart)}</p>
                          <p className="text-xs text-slate-500">Variance: {a.variance}% — action needed</p>
                        </div>
                        <Link
                          href="/dashboard"
                          onClick={() => setBellOpen(false)}
                          className="text-xs text-[#005eb8] font-medium hover:underline shrink-0"
                        >
                          View →
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
                <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
                  <p className="text-[10px] text-slate-400">Weeks where variance ≥ {redThreshold}% shown</p>
                </div>
              </div>
            )}
          </div>

          {/* User info */}
          {user && (
            <span className={`hidden sm:inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${roleColor}`}>
              {roleLabel}
            </span>
          )}
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-bold">{initial}</div>
          <span className="text-white text-sm font-medium hidden sm:block">{user?.name ?? "…"}</span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/30 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed md:static top-0 left-0 h-full md:h-auto w-64 md:w-56 bg-white border-r border-gray-200 flex flex-col shadow-sm z-30 md:z-10 transition-transform duration-200 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
          style={{ paddingTop: sidebarOpen ? "4rem" : undefined }}
        >
          <SidebarContent />
        </aside>

        <main className="flex-1 overflow-y-auto bg-gray-50">
          {children}
        </main>
      </div>

      {/* Keyboard shortcuts modal */}
      {shortcutsOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShortcutsOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 bg-[#005eb8] flex items-center justify-between">
              <p className="text-white font-semibold">Keyboard Shortcuts</p>
              <button onClick={() => setShortcutsOpen(false)} className="text-white/70 hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-3">
              {[
                { keys: ["←", "→"], desc: "Navigate weeks (on planning pages)" },
                { keys: ["?"], desc: "Toggle this shortcuts panel" },
              ].map(({ keys, desc }) => (
                <div key={desc} className="flex items-center gap-3">
                  <div className="flex gap-1">
                    {keys.map((k) => (
                      <kbd key={k} className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono font-semibold text-slate-700 shadow-sm">{k}</kbd>
                    ))}
                  </div>
                  <span className="text-sm text-slate-600">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
