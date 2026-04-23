"use client";

import { useState, useEffect, type ReactNode } from "react";
import { getWeeks, getClinicians, getSessionTypes, getAvailableWeeks } from "@/data";
import { getAdditionalSessions, saveAdditionalSession, type AdditionalSessionEntry } from "@/lib/store";
import { addAuditEntry } from "@/lib/audit";
import { downloadCSV } from "@/lib/export";
import { getClosestWeekIdx } from "@/lib/settings";

const REASONS = ["Cover for leave", "Back Log", "RTT Action", "Extra Capacity"];
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function formatWeek(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

const EMPTY_FORM = {
  clinician: "",
  reason: "",
  clinicType: "",
  date: "",
  expectedPatients: "",
};

export default function AdditionalSessionsPage() {
  const allWeeks = getWeeks();
  const availableWeeks = getAvailableWeeks();
  const clinicians = getClinicians();
  const sessionTypes = getSessionTypes();

  const [weekIdx, setWeekIdx] = useState(() => getClosestWeekIdx(availableWeeks));
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [savedSessions, setSavedSessions] = useState<AdditionalSessionEntry[]>([]);
  const [success, setSuccess] = useState(false);
  const [formError, setFormError] = useState("");

  const currentWeekStart = availableWeeks[weekIdx];
  const currentWeek = allWeeks[weekIdx];

  useEffect(() => {
    setSavedSessions(getAdditionalSessions(currentWeekStart));
  }, [currentWeekStart]);

  // Base extra sessions from static data
  const baseExtra = (currentWeek?.sessions ?? [])
    .filter((s) => s.sessionType.toLowerCase().includes("extra"))
    .map((s) => {
      const dayIdx = DAY_NAMES.indexOf(s.day);
      const d = new Date(currentWeekStart + "T00:00:00");
      d.setDate(d.getDate() + dayIdx);
      const dateStr = `${d.getDate()} / ${d.getMonth() + 1} / ${d.getFullYear()}`;
      const clinician = clinicians.find((c) => c.id === s.clinicianId);
      return {
        clinician: clinician ? (clinician.name ?? `Clinician ${clinician.label}`) : `#${s.clinicianId}`,
        clinicType: s.sessionType,
        date: dateStr,
        expectedPatients: "—",
        reason: "Extra Capacity",
      };
    });

  // User-added sessions
  const userRows = savedSessions.map((s) => ({
    clinician: s.clinician,
    clinicType: s.clinicType,
    date: s.date,
    expectedPatients: s.expectedPatients || "—",
    reason: s.reason,
  }));

  const allRows = [...baseExtra, ...userRows];

  const handleSave = () => {
    if (!formData.clinician || !formData.clinicType || !formData.date) {
      setFormError("Please fill in Clinician, Clinic Type and Date.");
      return;
    }
    const entry = saveAdditionalSession({ ...formData, weekStart: currentWeekStart });
    addAuditEntry(
      `Additional session added: ${formData.clinician} — ${formData.clinicType} on ${formData.date}`
    );
    setSavedSessions((prev) => [...prev, entry]);
    setFormData(EMPTY_FORM);
    setFormError("");
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const handleExport = () => {
    downloadCSV(
      allRows.map((r) => ({
        Clinician: r.clinician,
        "Clinic Type": r.clinicType,
        Date: r.date,
        "Expected Patients": r.expectedPatients,
        Reason: r.reason,
      })),
      `additional-sessions-${currentWeekStart}.csv`
    );
  };

  const prevWeek = () => setWeekIdx((i) => Math.max(0, i - 1));
  const nextWeek = () => setWeekIdx((i) => Math.min(availableWeeks.length - 1, i + 1));

  const inputCls =
    "w-full px-3 py-2 rounded-lg border border-gray-300 text-slate-800 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#005eb8] focus:border-transparent transition bg-white";

  const selectCls =
    "w-full px-3 py-2 rounded-lg border border-gray-300 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#005eb8] focus:border-transparent transition bg-white appearance-none cursor-pointer";

  const field = (label: string, children: ReactNode) => (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Additional Sessions</h1>
          <p className="text-slate-500 text-sm mt-0.5">Week of {formatWeek(currentWeekStart)} · {allRows.length} sessions</p>
        </div>
        <div className="flex gap-2">
          <button onClick={prevWeek} disabled={weekIdx === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#005eb8] text-white text-sm font-medium rounded-lg hover:bg-[#003d8f] disabled:opacity-40 disabled:cursor-not-allowed transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Prev Week
          </button>
          <button onClick={nextWeek} disabled={weekIdx === availableWeeks.length - 1}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#005eb8] text-white text-sm font-medium rounded-lg hover:bg-[#003d8f] disabled:opacity-40 disabled:cursor-not-allowed transition">
            Next Week
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button onClick={handleExport}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
        </div>
      </div>

      {/* Add Session Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-[#005eb8]">
          <h2 className="text-base font-semibold text-white">Add New Session</h2>
          <p className="text-blue-200 text-xs mt-0.5">Schedule an additional clinic session</p>
        </div>
        <div className="p-6">
          {success && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-3 text-sm mb-4">
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Session saved successfully.
            </div>
          )}
          {formError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {field("Clinician Name *",
              <select value={formData.clinician} onChange={(e) => setFormData({ ...formData, clinician: e.target.value })} className={selectCls}>
                <option value="">Choose Clinician</option>
                {clinicians.map((c) => (
                  <option key={c.id} value={c.name ?? `Clinician ${c.label}`}>{c.name ?? `Clinician ${c.label}`}</option>
                ))}
              </select>
            )}
            {field("Reason for Addition",
              <select value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} className={selectCls}>
                <option value="">Choose Reason</option>
                {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            )}
            {field("Clinic Type *",
              <select value={formData.clinicType} onChange={(e) => setFormData({ ...formData, clinicType: e.target.value })} className={selectCls}>
                <option value="">Choose Clinic Type</option>
                {sessionTypes.map((ct) => <option key={ct} value={ct}>{ct}</option>)}
              </select>
            )}
            {field("Date *",
              <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className={inputCls} />
            )}
            {field("Expected Patients",
              <input type="number" min="0" value={formData.expectedPatients}
                onChange={(e) => setFormData({ ...formData, expectedPatients: e.target.value })}
                placeholder="Enter number" className={inputCls} />
            )}
          </div>

          <div className="mt-5 flex gap-3">
            <button onClick={handleSave}
              className="px-5 py-2.5 bg-[#005eb8] hover:bg-[#003d8f] text-white text-sm font-semibold rounded-lg transition shadow-sm">
              Save Session
            </button>
            <button onClick={() => { setFormData(EMPTY_FORM); setFormError(""); }}
              className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-slate-700 text-sm font-medium rounded-lg transition">
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">Additional Sessions This Week</h2>
          <span className="text-xs text-slate-400">{allRows.length} total</span>
        </div>

        {allRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-slate-400">
            <svg className="w-10 h-10 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm">No additional sessions this week.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["Clinician", "Clinic Type", "Date", "Expected Patients", "Reason", "Source"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {baseExtra.map((row, i) => (
                  <tr key={`base-${i}`} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{row.clinician}</td>
                    <td className="px-4 py-3 text-slate-700">{row.clinicType}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{row.date}</td>
                    <td className="px-4 py-3 text-slate-600">{row.expectedPatients}</td>
                    <td className="px-4 py-3 text-slate-600">{row.reason}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">Planned</span>
                    </td>
                  </tr>
                ))}
                {userRows.map((row, i) => (
                  <tr key={`user-${i}`} className="hover:bg-purple-50 transition-colors bg-purple-50/30">
                    <td className="px-4 py-3 font-medium text-slate-800">{row.clinician}</td>
                    <td className="px-4 py-3 text-slate-700">{row.clinicType}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{row.date}</td>
                    <td className="px-4 py-3 text-slate-600">{row.expectedPatients}</td>
                    <td className="px-4 py-3 text-slate-600">{row.reason}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">Added</span>
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
