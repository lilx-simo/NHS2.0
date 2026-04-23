"use client";

import { useState, useEffect } from "react";
import { getWeeks, getClinicians, getAvailableWeeks, getSessionTypes } from "@/data";
import { downloadCSV } from "@/lib/export";
import { getClosestWeekIdx } from "@/lib/settings";
import { getCustomSessions, addCustomSession, removeCustomSession, type CustomSession } from "@/lib/sessions";
import { addAuditEntry } from "@/lib/audit";

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

function sessionCellStyle(type: string, unavailable?: boolean, isCustom?: boolean): string {
  if (unavailable) return "bg-red-50 border border-red-200 text-red-700";
  if (isCustom) return "bg-violet-50 border border-violet-300 text-violet-800 ring-1 ring-violet-300";
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

type CellInfo = {
  type: string;
  location: string;
  unavailable?: boolean;
  customId?: string;
};

const EMPTY_SESSION_FORM = {
  sessionType: "",
  location: "",
  clinicianId: 0,
  period: "AM" as "AM" | "PM",
  day: "Monday" as typeof DAY_NAMES[number],
};

export default function CapacityPlannerPage() {
  const allWeeks = getWeeks();
  const availableWeeks = getAvailableWeeks();
  const clinicians = getClinicians();
  const sessionTypes = getSessionTypes();

  const [weekIdx, setWeekIdx] = useState(() => getClosestWeekIdx(availableWeeks));
  const [selectedClinicianId, setSelectedClinicianId] = useState<number | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [customSessions, setCustomSessions] = useState<CustomSession[]>([]);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomId, setEditingCustomId] = useState<string | null>(null);
  const [sessionForm, setSessionForm] = useState(EMPTY_SESSION_FORM);
  const [clickedCell, setClickedCell] = useState<{ dayIdx: number; timeIdx: number } | null>(null);

  const currentWeekStart = availableWeeks[weekIdx];
  const currentWeek = allWeeks[weekIdx];
  const weekStartDate = new Date(currentWeekStart + "T00:00:00");
  const days = getWeekDays(weekStartDate);

  useEffect(() => {
    setCustomSessions(getCustomSessions(currentWeekStart));
  }, [currentWeekStart]);

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

  // Overlay custom sessions
  for (const cs of customSessions) {
    const dayIdx = DAY_NAMES.indexOf(cs.day as typeof DAY_NAMES[number]);
    if (dayIdx === -1) continue;
    if (selectedClinicianId && cs.clinicianId !== selectedClinicianId) continue;
    const start = cs.period === "AM" ? 0 : 5;
    for (let t = start; t < start + 5; t++) {
      const key = `${dayIdx}-${t}`;
      if (!sessionMap[key]) {
        sessionMap[key] = { type: cs.sessionType, location: cs.location, customId: cs.id };
        break;
      }
    }
  }

  const prevWeek = () => setWeekIdx((i) => Math.max(0, i - 1));
  const nextWeek = () => setWeekIdx((i) => Math.min(availableWeeks.length - 1, i + 1));

  const handleExport = () => {
    const source = selectedClinicianId
      ? currentWeek?.sessions.filter((s) => s.clinicianId === selectedClinicianId)
      : currentWeek?.sessions;
    const exportData = (source ?? []).map((s) => {
      const c = clinicians.find((c) => c.id === s.clinicianId);
      return {
        Day: s.day,
        Period: s.period,
        "Session Type": s.sessionType,
        Location: s.location,
        Clinician: c?.name ?? `Clinician ${c?.label ?? s.clinicianId}`,
      };
    });
    downloadCSV(exportData, `capacity-planner-${currentWeekStart}.csv`);
  };

  const openAddModal = (dayIdx: number, timeIdx: number) => {
    const period = timeIdx < 5 ? "AM" : "PM";
    setSessionForm({
      ...EMPTY_SESSION_FORM,
      day: DAY_NAMES[dayIdx],
      period,
      clinicianId: selectedClinicianId ?? (clinicians[0]?.id ?? 0),
    });
    setEditingCustomId(null);
    setClickedCell({ dayIdx, timeIdx });
    setModalOpen(true);
  };

  const openEditModal = (customId: string) => {
    const cs = customSessions.find((s) => s.id === customId);
    if (!cs) return;
    setSessionForm({
      sessionType: cs.sessionType,
      location: cs.location,
      clinicianId: cs.clinicianId,
      period: cs.period,
      day: cs.day as typeof DAY_NAMES[number],
    });
    setEditingCustomId(customId);
    setClickedCell(null);
    setModalOpen(true);
  };

  const handleSaveSession = () => {
    if (!sessionForm.sessionType || !sessionForm.clinicianId) return;

    if (editingCustomId) {
      removeCustomSession(editingCustomId);
      const newSession = addCustomSession({ ...sessionForm, weekStart: currentWeekStart });
      addAuditEntry(`Custom session updated: ${sessionForm.sessionType} on ${sessionForm.day} ${sessionForm.period}`);
      setCustomSessions((prev) =>
        prev.filter((s) => s.id !== editingCustomId).concat(newSession)
      );
    } else {
      const newSession = addCustomSession({ ...sessionForm, weekStart: currentWeekStart });
      addAuditEntry(`Custom session added: ${sessionForm.sessionType} on ${sessionForm.day} ${sessionForm.period}`);
      setCustomSessions((prev) => [...prev, newSession]);
    }
    setModalOpen(false);
  };

  const handleDeleteSession = (customId: string) => {
    removeCustomSession(customId);
    addAuditEntry(`Custom session removed`);
    setCustomSessions((prev) => prev.filter((s) => s.id !== customId));
    setModalOpen(false);
  };

  const selectedClinician = clinicians.find((c) => c.id === selectedClinicianId);
  const selectedLabel = selectedClinician
    ? (selectedClinician.name ?? `Clinician ${selectedClinician.label}`)
    : "All Clinicians";

  return (
    <div className="p-4 space-y-4">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3">
        {/* Clinician filter */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-slate-700 hover:bg-gray-100 transition min-w-[180px] justify-between"
          >
            <span className="truncate">{selectedLabel}</span>
            <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {dropdownOpen && (
            <div className="absolute top-full mt-1 left-0 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-30 overflow-hidden">
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
                  {c.name ?? `Clinician ${c.label}`}
                </button>
              ))}
            </div>
          )}
        </div>

        <p className="text-sm font-semibold text-slate-700 hidden sm:block">
          {formatWeek(currentWeekStart)}
        </p>

        <div className="flex gap-2 flex-wrap">
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
          { label: "Custom (click to edit)", style: "bg-violet-50 border border-violet-300 text-violet-800" },
        ].map((item) => (
          <span key={item.label} className={`px-2 py-0.5 rounded font-medium ${item.style}`}>
            {item.label}
          </span>
        ))}
        <span className="px-2 py-0.5 rounded font-medium bg-gray-100 text-gray-500 border border-dashed border-gray-300">
          Empty cell — click to add session
        </span>
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
              <div className="w-20 shrink-0 flex items-center justify-center py-2 border-r border-gray-100">
                <span className="text-xs font-semibold text-slate-500">{time}</span>
              </div>
              {days.map((_, dayIdx) => {
                const cell = sessionMap[`${dayIdx}-${timeIdx}`];
                return (
                  <div
                    key={dayIdx}
                    className="w-32 min-h-[48px] border-r border-gray-50 last:border-r-0 p-1.5"
                  >
                    {cell ? (
                      <div
                        onClick={() => cell.customId ? openEditModal(cell.customId) : undefined}
                        className={`h-full rounded-md px-1.5 py-1 text-xs leading-tight ${sessionCellStyle(cell.type, cell.unavailable, !!cell.customId)} ${cell.customId ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}`}
                      >
                        <p className="font-semibold truncate">{cell.type}</p>
                        {cell.location && (
                          <p className="opacity-75 truncate">{cell.location}</p>
                        )}
                        {cell.customId && (
                          <p className="opacity-50 text-[10px] mt-0.5">custom · click to edit</p>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => openAddModal(dayIdx, timeIdx)}
                        className="h-full w-full rounded-md bg-gray-50/50 hover:bg-blue-50/60 hover:border hover:border-dashed hover:border-blue-200 transition group flex items-center justify-center"
                        title="Add session"
                      >
                        <svg className="w-3 h-3 text-gray-300 group-hover:text-[#005eb8] transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Add/Edit Session Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-[#005eb8] flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">
                  {editingCustomId ? "Edit Custom Session" : "Add Session"}
                </h3>
                {clickedCell && (
                  <p className="text-blue-200 text-xs mt-0.5">
                    {DAY_NAMES[clickedCell.dayIdx]} · {clickedCell.timeIdx < 5 ? "AM" : "PM"}
                  </p>
                )}
              </div>
              <button onClick={() => setModalOpen(false)} className="text-white/70 hover:text-white transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700">Day</label>
                  <select
                    value={sessionForm.day}
                    onChange={(e) => setSessionForm({ ...sessionForm, day: e.target.value as typeof DAY_NAMES[number] })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#005eb8] focus:border-transparent bg-white"
                  >
                    {DAY_NAMES.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700">Period</label>
                  <select
                    value={sessionForm.period}
                    onChange={(e) => setSessionForm({ ...sessionForm, period: e.target.value as "AM" | "PM" })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#005eb8] focus:border-transparent bg-white"
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">Session Type *</label>
                <select
                  value={sessionForm.sessionType}
                  onChange={(e) => setSessionForm({ ...sessionForm, sessionType: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#005eb8] focus:border-transparent bg-white"
                >
                  <option value="">Choose session type</option>
                  {sessionTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">Clinician *</label>
                <select
                  value={sessionForm.clinicianId}
                  onChange={(e) => setSessionForm({ ...sessionForm, clinicianId: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#005eb8] focus:border-transparent bg-white"
                >
                  <option value={0}>Choose clinician</option>
                  {clinicians.map((c) => (
                    <option key={c.id} value={c.id}>{c.name ?? `Clinician ${c.label}`}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">Location</label>
                <input
                  value={sessionForm.location}
                  onChange={(e) => setSessionForm({ ...sessionForm, location: e.target.value })}
                  placeholder="e.g. Clinic A"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#005eb8] focus:border-transparent bg-white"
                />
              </div>
            </div>

            <div className="px-6 pb-6 flex gap-3 flex-wrap">
              <button
                onClick={handleSaveSession}
                disabled={!sessionForm.sessionType || !sessionForm.clinicianId}
                className="px-5 py-2.5 bg-[#005eb8] hover:bg-[#003d8f] text-white text-sm font-semibold rounded-lg transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {editingCustomId ? "Update Session" : "Add Session"}
              </button>
              {editingCustomId && (
                <button
                  onClick={() => handleDeleteSession(editingCustomId)}
                  className="px-5 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-semibold rounded-lg transition border border-red-200"
                >
                  Delete
                </button>
              )}
              <button
                onClick={() => setModalOpen(false)}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-slate-700 text-sm font-medium rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
