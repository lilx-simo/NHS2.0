"use client";

import { useState } from "react";
import { getWeeks, getClinicians, getAvailableWeeks } from "@/data";
import { downloadCSV } from "@/lib/export";

const TIME_SLOTS = [
  "08:00", "09:00", "10:00", "11:00", "12:00", "13:00",
  "14:00", "15:00", "16:00", "17:00", "18:00", "19:00",
  "20:00", "21:00", "22:00", "23:00", "24:00",
];

const DAY_NAMES = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
] as const;

function getWeekDays(startDate: Date) {
  return DAY_NAMES.map((name, i) => {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    return {
      name,
      date: `${d.getDate()} ${d.toLocaleString("en-GB", { month: "short" })}`,
    };
  });
}

function sessionCellStyle(type: string, unavailable?: boolean): string {
  if (unavailable) return "bg-red-50 border border-red-200 text-red-700";
  const t = type.toLowerCase();
  if (t.includes("extra")) return "bg-purple-50 border border-purple-200 text-purple-800";
  if (t.includes("srh")) return "bg-blue-50 border border-blue-200 text-blue-800";
  if (t.includes("ncp")) return "bg-emerald-50 border border-emerald-200 text-emerald-800";
  if (t.includes("rev")) return "bg-amber-50 border border-amber-200 text-amber-800";
  if (t.includes("mwm")) return "bg-pink-50 border border-pink-200 text-pink-800";
  if (t.includes("nurse") || t.includes("nwash")) return "bg-teal-50 border border-teal-200 text-teal-800";
  if (t.includes("cp")) return "bg-indigo-50 border border-indigo-200 text-indigo-800";
  return "bg-slate-50 border border-slate-200 text-slate-700";
}

function formatWeek(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export default function CapacityPlannerPage() {
  const allWeeks = getWeeks();
  const availableWeeks = getAvailableWeeks();
  const clinicians = getClinicians();

  const [weekIdx, setWeekIdx] = useState(0);
  const [selectedClinicianId, setSelectedClinicianId] = useState<number | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const currentWeekStart = availableWeeks[weekIdx];
  const currentWeek = allWeeks[weekIdx];
  const weekStartDate = new Date(currentWeekStart + "T00:00:00");
  const days = getWeekDays(weekStartDate);

  type CellInfo = { type: string; location: string; unavailable?: boolean };
  const sessionMap: Record<string, CellInfo> = {};

  if (currentWeek) {
    const sessions = selectedClinicianId
      ? currentWeek.sessions.filter((s) => s.clinicianId === selectedClinicianId)
      : currentWeek.sessions;

    for (const s of sessions) {
      const dayIdx = DAY_NAMES.indexOf(s.day as typeof DAY_NAMES[number]);
      if (dayIdx === -1) continue;
      const start = s.period === "AM" ? 0 : 5;
      for (let t = start; t < start + 5; t++) {
        const key = `${dayIdx}-${t}`;
        if (!sessionMap[key]) {
          sessionMap[key] = { type: s.sessionType, location: s.location };
          break;
        }
      }
    }

    const unavail = selectedClinicianId
      ? currentWeek.unavailability.filter((u) => u.clinicianId === selectedClinicianId)
      : currentWeek.unavailability;

    for (const u of unavail) {
      const dayIdx = DAY_NAMES.indexOf(u.day as typeof DAY_NAMES[number]);
      if (dayIdx === -1) continue;
      const start = u.period === "AM" ? 0 : 5;
      for (let t = start; t < start + 5; t++) {
        const key = `${dayIdx}-${t}`;
        if (!sessionMap[key]) {
          sessionMap[key] = { type: u.reason, location: "", unavailable: true };
          break;
        }
      }
    }
  }

  const prevWeek = () => setWeekIdx((i) => Math.max(0, i - 1));
  const nextWeek = () => setWeekIdx((i) => Math.min(availableWeeks.length - 1, i + 1));

  const handleExport = () => {
    const source = selectedClinicianId
      ? currentWeek?.sessions.filter((s) => s.clinicianId === selectedClinicianId)
      : currentWeek?.sessions;
    const exportData = (source ?? []).map((s) => ({
      Day: s.day,
      Period: s.period,
      "Session Type": s.sessionType,
      Location: s.location,
      Clinician: `Clinician ${clinicians.find((c) => c.id === s.clinicianId)?.label ?? s.clinicianId}`,
    }));
    downloadCSV(exportData, `capacity-planner-${currentWeekStart}.csv`);
  };

  const selectedLabel = selectedClinicianId
    ? `Clinician ${clinicians.find((c) => c.id === selectedClinicianId)?.label ?? ""}`
    : "All Clinicians";

  return (
    <div className="p-4 space-y-4">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3">
        {/* Clinician filter */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-slate-700 hover:bg-gray-100 transition min-w-[160px] justify-between"
          >
            <span className="truncate">{selectedLabel}</span>
            <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {dropdownOpen && (
            <div className="absolute top-full mt-1 left-0 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-30 overflow-hidden">
              <button
                onClick={() => { setSelectedClinicianId(null); setDropdownOpen(false); }}
                className={`flex items-center w-full px-4 py-2.5 text-sm text-left hover:bg-blue-50 transition ${selectedClinicianId === null ? "text-[#005eb8] font-semibold" : "text-slate-700"}`}
              >
                All Clinicians
              </button>
              {clinicians.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setSelectedClinicianId(c.id); setDropdownOpen(false); }}
                  className={`flex items-center w-full px-4 py-2.5 text-sm text-left hover:bg-blue-50 transition ${selectedClinicianId === c.id ? "text-[#005eb8] font-semibold" : "text-slate-700"}`}
                >
                  Clinician {c.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <p className="text-sm font-semibold text-slate-700 hidden sm:block">
          {formatWeek(currentWeekStart)}
        </p>

        <div className="flex gap-2">
          <button
            onClick={prevWeek}
            disabled={weekIdx === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#005eb8] text-white text-sm rounded-lg hover:bg-[#003d8f] disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Prev
          </button>
          <button
            onClick={nextWeek}
            disabled={weekIdx === availableWeeks.length - 1}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#005eb8] text-white text-sm rounded-lg hover:bg-[#003d8f] disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Next
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 text-white text-sm rounded-lg hover:bg-slate-800 transition"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-xs">
        {[
          { label: "SRH", style: "bg-blue-50 border border-blue-200 text-blue-800" },
          { label: "NCP", style: "bg-emerald-50 border border-emerald-200 text-emerald-800" },
          { label: "Review", style: "bg-amber-50 border border-amber-200 text-amber-800" },
          { label: "MWM", style: "bg-pink-50 border border-pink-200 text-pink-800" },
          { label: "Extra", style: "bg-purple-50 border border-purple-200 text-purple-800" },
          { label: "Nurse/Nwash", style: "bg-teal-50 border border-teal-200 text-teal-800" },
          { label: "Unavailable", style: "bg-red-50 border border-red-200 text-red-700" },
        ].map((item) => (
          <span key={item.label} className={`px-2 py-0.5 rounded font-medium ${item.style}`}>
            {item.label}
          </span>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="overflow-auto bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="min-w-max">
          {/* Day headers */}
          <div className="flex border-b border-gray-100 sticky top-0 bg-white z-10">
            <div className="w-20 shrink-0 border-r border-gray-100" />
            {days.map((day) => (
              <div
                key={day.name}
                className="w-32 flex flex-col items-center justify-center py-3 border-r border-gray-100 last:border-r-0"
              >
                <span className="text-xs font-bold text-[#005eb8] uppercase tracking-wide">
                  {day.name.slice(0, 3)}
                </span>
                <span className="text-sm font-semibold text-slate-700 mt-0.5">{day.date}</span>
              </div>
            ))}
          </div>

          {/* Time rows */}
          {TIME_SLOTS.map((time, timeIdx) => (
            <div key={time} className="flex border-b border-gray-50 last:border-b-0">
              {/* Time label */}
              <div className="w-20 shrink-0 flex items-center justify-center py-2 border-r border-gray-100">
                <span className="text-xs font-semibold text-slate-500">{time}</span>
              </div>
              {/* Day cells */}
              {days.map((_, dayIdx) => {
                const cell = sessionMap[`${dayIdx}-${timeIdx}`];
                return (
                  <div
                    key={dayIdx}
                    className="w-32 min-h-[48px] border-r border-gray-50 last:border-r-0 p-1.5"
                  >
                    {cell ? (
                      <div
                        className={`h-full rounded-md px-1.5 py-1 text-xs leading-tight ${sessionCellStyle(cell.type, cell.unavailable)}`}
                      >
                        <p className="font-semibold truncate">{cell.type}</p>
                        {cell.location && (
                          <p className="opacity-75 truncate">{cell.location}</p>
                        )}
                      </div>
                    ) : (
                      <div className="h-full rounded-md bg-gray-50/50" />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
