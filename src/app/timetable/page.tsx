"use client";

import { useState, useEffect } from "react";
import { getWeeks, getAvailableWeeks } from "@/data";
import { downloadCSV } from "@/lib/export";
import { getClosestWeekIdx } from "@/lib/settings";
import { getAdditionalSessions, type AdditionalSessionEntry } from "@/lib/store";
import { getCustomSessions, type CustomSession } from "@/lib/sessions";
import { getManagedClinicians } from "@/lib/clinicians";
import { getUsers } from "@/lib/users";

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Appointment counts per session type, based on the NHS capacity planning formula
const CLINIC_FORMULA: Record<string, Partial<Record<string, number>>> = {
  srh:   { NewSRH: 2, Review: 4 },
  cp:    { NCP: 2, Review: 4 },
  mwm:   { NMWM: 2, Review: 3 },
  wash:  { Nwash: 2, Review: 5 },
  whone: { Nwash: 2, Review: 4 },
  whtwo: { Nwash: 2, Review: 4 },
  mnnew: { NMWM: 6 },
  mwrev: { Review: 5 },
  mwwed: { Review: 1, NMWM: 2 },
  mwfri: { Review: 7 },
  mwmon: { NMWM: 2 },
};

function calcSlotTotals(sessionTypes: string[]) {
  const t: Record<string, number> = { NewSRH: 0, Review: 0, NCP: 0, NMWM: 0, Nwash: 0, "Nurse led": 0 };
  for (const type of sessionTypes) {
    const f = CLINIC_FORMULA[type.toLowerCase()];
    if (f) {
      for (const [k, v] of Object.entries(f)) t[k] = (t[k] ?? 0) + (v as number);
    }
  }
  return t;
}

function formatWeek(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function typeBadge(type: string) {
  if (type === "Additional") return "bg-purple-100 text-purple-800";
  if (type === "Custom") return "bg-violet-100 text-violet-800";
  return "bg-blue-100 text-blue-800";
}

type ClinicianEntry = { name: string; id: number | null };

export default function TimetablePage() {
  const allWeeks = getWeeks();
  const availableWeeks = getAvailableWeeks();

  const [weekIdx, setWeekIdx] = useState(() => getClosestWeekIdx(availableWeeks));
  const [selectedClinician, setSelectedClinician] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [additionalSessions, setAdditionalSessions] = useState<AdditionalSessionEntry[]>([]);
  const [customSessions, setCustomSessions] = useState<CustomSession[]>([]);
  const [clinicianList, setClinicianList] = useState<ClinicianEntry[]>([]);

  useEffect(() => {
    const managed = getManagedClinicians().filter((c) => c.active);
    const users = getUsers().filter((u) => ["doctor", "nurse", "clinician"].includes(u.role));
    const combined: ClinicianEntry[] = [
      ...managed.map((c) => ({ name: c.name, id: c.id })),
      ...users
        .filter((u) => !managed.some((c) => c.name === u.name))
        .map((u) => ({ name: u.name, id: null })),
    ];
    setClinicianList(combined);
  }, []);

  useEffect(() => {
    const max = availableWeeks.length - 1;
    const goP = () => setWeekIdx((i) => Math.max(0, i - 1));
    const goN = () => setWeekIdx((i) => Math.min(max, i + 1));
    window.addEventListener("nhs-prev-week", goP);
    window.addEventListener("nhs-next-week", goN);
    return () => {
      window.removeEventListener("nhs-prev-week", goP);
      window.removeEventListener("nhs-next-week", goN);
    };
  }, [availableWeeks.length]);

  const currentWeekStart = availableWeeks[weekIdx];
  const currentWeek = allWeeks[weekIdx];

  useEffect(() => {
    setAdditionalSessions(getAdditionalSessions(currentWeekStart));
    setCustomSessions(getCustomSessions(currentWeekStart));
  }, [currentWeekStart]);

  // Resolve numeric ID for selected clinician (used to filter static sessions)
  const selectedId = selectedClinician
    ? (clinicianList.find((c) => c.name === selectedClinician)?.id ?? null)
    : null;

  // Static sessions filtered by clinician
  const staticSessions = currentWeek
    ? selectedClinician
      ? selectedId !== null
        ? currentWeek.sessions.filter((s) => s.clinicianId === selectedId)
        : []
      : currentWeek.sessions
    : [];

  // Custom sessions (capacity planner additions) filtered by clinician
  const filteredCustom = selectedClinician
    ? selectedId !== null
      ? customSessions.filter((s) => s.clinicianId === selectedId)
      : []
    : customSessions;

  // Additional sessions filtered by clinician name
  const filteredAdditional = selectedClinician
    ? additionalSessions.filter((s) => s.clinician === selectedClinician)
    : additionalSessions;

  // Build session rows
  const staticRows = staticSessions.map((s) => {
    const dayIdx = DAY_NAMES.indexOf(s.day);
    const d = new Date(currentWeekStart + "T00:00:00");
    d.setDate(d.getDate() + dayIdx);
    const dateStr = `${d.getDate()} ${d.toLocaleString("en-GB", { month: "short" })} ${d.getFullYear()}`;
    const clinician = clinicianList.find((c) => c.id === s.clinicianId);
    return {
      date: dateStr,
      clinicType: s.sessionType,
      location: s.location,
      clinician: clinician?.name ?? `Clinician ${s.clinicianId}`,
      type: s.sessionType.toLowerCase().includes("extra") ? "Additional" : "Core",
    };
  });

  const customRows = filteredCustom.map((s) => {
    const dayIdx = DAY_NAMES.indexOf(s.day);
    const d = new Date(currentWeekStart + "T00:00:00");
    d.setDate(d.getDate() + dayIdx);
    const dateStr = `${d.getDate()} ${d.toLocaleString("en-GB", { month: "short" })} ${d.getFullYear()}`;
    const clinician = clinicianList.find((c) => c.id === s.clinicianId);
    return {
      date: `${dateStr} (${s.period})`,
      clinicType: s.sessionType,
      location: s.location || "—",
      clinician: clinician?.name ?? `Clinician ${s.clinicianId}`,
      type: "Custom",
    };
  });

  const additionalRows = filteredAdditional.map((s) => ({
    date: s.date,
    clinicType: s.clinicType,
    location: "—",
    clinician: s.clinician,
    type: "Additional",
  }));

  const sessionRows = [...staticRows, ...customRows, ...additionalRows];

  // Calculate slot totals using the formula
  const allSessionTypes = [
    ...staticSessions.map((s) => s.sessionType),
    ...filteredCustom.map((s) => s.sessionType),
    ...filteredAdditional.map((s) => s.clinicType),
  ];
  const computed = calcSlotTotals(allSessionTypes);

  // Use formula-computed totals when a clinician is selected or user-added sessions exist;
  // otherwise fall back to pre-calculated weekly totals from static data.
  const hasUserData = selectedClinician !== null || additionalSessions.length > 0 || customSessions.length > 0;
  const slotTotals = hasUserData ? computed : (currentWeek?.slotTotals ?? computed);

  const slotCards = [
    { label: "New SRH",           value: slotTotals.NewSRH ?? 0,          color: "bg-blue-50 border-blue-200 text-blue-800" },
    { label: "NCP",               value: slotTotals.NCP ?? 0,             color: "bg-emerald-50 border-emerald-200 text-emerald-800" },
    { label: "Review",            value: slotTotals.Review ?? 0,          color: "bg-amber-50 border-amber-200 text-amber-800" },
    { label: "Nwash",             value: slotTotals.Nwash ?? 0,           color: "bg-teal-50 border-teal-200 text-teal-800" },
    { label: "NMWM",              value: slotTotals.NMWM ?? 0,            color: "bg-pink-50 border-pink-200 text-pink-800" },
    { label: "Nurse Led",         value: slotTotals["Nurse led"] ?? 0,    color: "bg-indigo-50 border-indigo-200 text-indigo-800" },
    { label: "Additional",        value: filteredAdditional.length,        color: "bg-purple-50 border-purple-200 text-purple-800" },
    { label: "Total Sessions",    value: sessionRows.length,              color: "bg-gray-50 border-gray-200 text-gray-800" },
  ];

  const prevWeek = () => setWeekIdx((i) => Math.max(0, i - 1));
  const nextWeek = () => setWeekIdx((i) => Math.min(availableWeeks.length - 1, i + 1));

  const handleExport = () => {
    downloadCSV(
      sessionRows.map((r) => ({
        Date: r.date,
        "Clinic Type": r.clinicType,
        Location: r.location,
        Clinician: r.clinician,
        Type: r.type,
      })),
      `timetable-${currentWeekStart}.csv`
    );
  };

  return (
    <div className="p-4 space-y-4">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3">
        <div className="relative">
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-slate-700 hover:bg-gray-100 transition min-w-[180px] justify-between"
          >
            <span className="truncate">{selectedClinician ?? "All Clinicians"}</span>
            <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {dropdownOpen && (
            <div className="absolute top-full mt-1 left-0 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-30 overflow-hidden max-h-72 overflow-y-auto">
              <button
                onClick={() => { setSelectedClinician(null); setDropdownOpen(false); }}
                className={`flex items-center w-full px-4 py-2.5 text-sm text-left hover:bg-blue-50 transition ${selectedClinician === null ? "text-[#005eb8] font-semibold" : "text-slate-700"}`}
              >
                All Clinicians
              </button>
              {clinicianList.map((c) => (
                <button
                  key={c.name}
                  onClick={() => { setSelectedClinician(c.name); setDropdownOpen(false); }}
                  className={`flex items-center w-full px-4 py-2.5 text-sm text-left hover:bg-blue-50 transition ${selectedClinician === c.name ? "text-[#005eb8] font-semibold" : "text-slate-700"}`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <p className="text-sm font-semibold text-slate-700 hidden sm:block">
          {formatWeek(currentWeekStart)}
        </p>

        <div className="flex gap-2">
          <button onClick={prevWeek} disabled={weekIdx === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#005eb8] text-white text-sm rounded-lg hover:bg-[#003d8f] disabled:opacity-40 disabled:cursor-not-allowed transition">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Prev
          </button>
          <button onClick={nextWeek} disabled={weekIdx === availableWeeks.length - 1}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#005eb8] text-white text-sm rounded-lg hover:bg-[#003d8f] disabled:opacity-40 disabled:cursor-not-allowed transition">
            Next
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={() => window.print()}
            className="no-print flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-slate-700 text-sm rounded-lg hover:bg-gray-50 transition">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </button>
          <button onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 text-white text-sm rounded-lg hover:bg-slate-800 transition">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
        </div>
      </div>

      {/* Slot Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {slotCards.map((card) => (
          <div key={card.label} className={`rounded-xl border p-4 ${card.color}`}>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{card.label}</p>
            <p className="text-3xl font-bold mt-1">{card.value}</p>
            <p className="text-xs mt-1 opacity-60">
              {selectedClinician ? selectedClinician : "this week"}
            </p>
          </div>
        ))}
      </div>

      {/* Session Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">Session Details</h2>
          <span className="text-xs text-slate-400">{sessionRows.length} sessions</span>
        </div>

        {sessionRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <svg className="w-10 h-10 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm">No sessions this week</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["Date", "Clinic Type", "Location", "Clinician", "Type"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sessionRows.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{row.date}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{row.clinicType}</td>
                    <td className="px-4 py-3 text-slate-600">{row.location}</td>
                    <td className="px-4 py-3 text-slate-600">{row.clinician}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${typeBadge(row.type)}`}>
                        {row.type}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
