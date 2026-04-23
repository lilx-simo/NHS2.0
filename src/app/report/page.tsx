"use client";

import { useState, useEffect, type ReactNode } from "react";
import { getWeeks, getClinicians, getSessionTypes, getAvailableWeeks, getWeekSummary } from "@/data";
import { getReportEntries, saveReportEntry, type ReportEntry } from "@/lib/store";
import { addAuditEntry } from "@/lib/audit";
import { downloadCSV } from "@/lib/export";

const ROOT_CAUSES = ["Did not attend", "Underutilisation", "Sickness", "Leave"];

function formatWeek(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function VarianceCard({
  value,
  label,
  sub,
}: {
  value: string | number;
  label: string;
  sub: string;
}) {
  const pct = typeof value === "string" ? parseFloat(value) : value;
  const card =
    pct <= 3
      ? "bg-green-50 border-green-200"
      : pct <= 7
      ? "bg-amber-50 border-amber-200"
      : "bg-red-50 border-red-200";
  const text =
    pct <= 3 ? "text-green-700" : pct <= 7 ? "text-amber-700" : "text-red-700";

  return (
    <div className={`rounded-xl border p-5 ${card}`}>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-4xl font-bold mt-1 ${text}`}>{value}{typeof value === "number" || String(value).endsWith("%") ? "" : ""}</p>
      <p className="text-xs text-slate-400 mt-1">{sub}</p>
    </div>
  );
}

const EMPTY_FORM = {
  clinician: "",
  clinicType: "",
  plannedSessions: "",
  sessionsReduction: "",
  deliveredSessions: "",
  rootCause: "",
};

export default function ReportPage() {
  const allWeeks = getWeeks();
  const availableWeeks = getAvailableWeeks();
  const clinicians = getClinicians();
  const sessionTypes = getSessionTypes();

  const [weekIdx, setWeekIdx] = useState(0);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [userEntries, setUserEntries] = useState<ReportEntry[]>([]);
  const [success, setSuccess] = useState(false);
  const [formError, setFormError] = useState("");

  const currentWeekStart = availableWeeks[weekIdx];
  const currentWeek = allWeeks[weekIdx];
  const summary = getWeekSummary(currentWeekStart);

  useEffect(() => {
    setUserEntries(getReportEntries(currentWeekStart));
  }, [currentWeekStart]);

  const totalPlanned = summary?.totalClinicSlots ?? 0;
  const totalDeliveredBase = summary ? summary.totalClinicSlots - summary.totalUnavailable * 5 : 0;

  const userPlanned = userEntries.reduce((s, e) => s + (parseInt(e.plannedSessions) || 0), 0);
  const userDelivered = userEntries.reduce((s, e) => s + (parseInt(e.deliveredSessions) || 0), 0);

  const displayPlanned = userEntries.length > 0 ? userPlanned : totalPlanned;
  const displayDelivered = userEntries.length > 0 ? userDelivered : totalDeliveredBase;
  const displayVariance =
    displayPlanned > 0
      ? ((displayPlanned - displayDelivered) / displayPlanned) * 100
      : 0;

  const capacityReduction = summary
    ? `${Math.round(
        (summary.totalUnavailable / ((summary.totalSessions + summary.totalUnavailable) || 1)) * 100
      )}%`
    : "0%";

  const handleAdd = () => {
    if (!formData.clinician || !formData.clinicType || !formData.deliveredSessions) {
      setFormError("Please fill in Clinician, Clinic Type and Delivered Sessions.");
      return;
    }
    const entry = saveReportEntry({ ...formData, weekStart: currentWeekStart });
    addAuditEntry(
      `Actual delivery data added: ${formData.clinician} — ${formData.clinicType}, Delivered: ${formData.deliveredSessions}`
    );
    setUserEntries((prev) => [...prev, entry]);
    setFormData(EMPTY_FORM);
    setFormError("");
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const handleExport = () => {
    downloadCSV(
      userEntries.map((e) => ({
        Clinician: e.clinician,
        "Clinic Type": e.clinicType,
        "Planned Sessions": e.plannedSessions,
        "Sessions Reduction": e.sessionsReduction,
        "Delivered Sessions": e.deliveredSessions,
        "Root Cause": e.rootCause,
        "Week Start": e.weekStart,
      })),
      `report-${currentWeekStart}.csv`
    );
  };

  const prevWeek = () => setWeekIdx((i) => Math.max(0, i - 1));
  const nextWeek = () => setWeekIdx((i) => Math.min(availableWeeks.length - 1, i + 1));

  const field = (label: string, children: ReactNode) => (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );

  const inputCls =
    "w-full px-3 py-2 rounded-lg border border-gray-300 text-slate-800 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#005eb8] focus:border-transparent transition bg-white";

  const selectCls =
    "w-full px-3 py-2 rounded-lg border border-gray-300 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#005eb8] focus:border-transparent transition bg-white appearance-none cursor-pointer";

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Report</h1>
          <p className="text-slate-500 text-sm mt-0.5">Week of {formatWeek(currentWeekStart)}</p>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Delivered Sessions</p>
          <p className="text-4xl font-bold text-slate-800 mt-1">{displayDelivered}</p>
          <p className="text-xs text-slate-400 mt-1">{formatWeek(currentWeekStart)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Planned Sessions</p>
          <p className="text-4xl font-bold text-slate-800 mt-1">{displayPlanned}</p>
          <p className="text-xs text-slate-400 mt-1">{formatWeek(currentWeekStart)}</p>
        </div>
        <VarianceCard
          value={`${displayVariance.toFixed(1)}%`}
          label="Delivery vs Intended"
          sub={formatWeek(currentWeekStart)}
        />
        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Capacity Reduction</p>
          <p className="text-4xl font-bold text-green-700 mt-1">{capacityReduction}</p>
          <p className="text-xs text-slate-400 mt-1">{formatWeek(currentWeekStart)}</p>
        </div>
      </div>

      {/* Add Actual Data Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="text-base font-semibold text-slate-800">Add Actual Delivered Data</h2>
          <p className="text-xs text-slate-500 mt-0.5">Enter real delivery numbers for this week</p>
        </div>
        <div className="p-6">
          {success && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-3 text-sm mb-4">
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Entry saved successfully.
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
            {field("Clinician Name",
              <select value={formData.clinician} onChange={(e) => setFormData({ ...formData, clinician: e.target.value })} className={selectCls}>
                <option value="">Choose Clinician</option>
                {clinicians.map((c) => (
                  <option key={c.id} value={`Clinician ${c.label}`}>Clinician {c.label}</option>
                ))}
              </select>
            )}
            {field("Clinic Type",
              <select value={formData.clinicType} onChange={(e) => setFormData({ ...formData, clinicType: e.target.value })} className={selectCls}>
                <option value="">Choose Clinic Type</option>
                {sessionTypes.map((ct) => <option key={ct} value={ct}>{ct}</option>)}
              </select>
            )}
            {field("Planned Sessions",
              <input type="number" min="0" value={formData.plannedSessions}
                onChange={(e) => setFormData({ ...formData, plannedSessions: e.target.value })}
                placeholder="Enter number" className={inputCls} />
            )}
            {field("Sessions Reduction",
              <input type="number" min="0" value={formData.sessionsReduction}
                onChange={(e) => setFormData({ ...formData, sessionsReduction: e.target.value })}
                placeholder="Enter number" className={inputCls} />
            )}
            {field("Delivered Sessions *",
              <input type="number" min="0" value={formData.deliveredSessions}
                onChange={(e) => setFormData({ ...formData, deliveredSessions: e.target.value })}
                placeholder="Enter number" className={inputCls} />
            )}
            {field("Root Cause",
              <select value={formData.rootCause} onChange={(e) => setFormData({ ...formData, rootCause: e.target.value })} className={selectCls}>
                <option value="">Choose Root Cause</option>
                {ROOT_CAUSES.map((rc) => <option key={rc} value={rc}>{rc}</option>)}
              </select>
            )}
          </div>

          <div className="mt-5 flex gap-3">
            <button onClick={handleAdd}
              className="px-5 py-2.5 bg-[#005eb8] hover:bg-[#003d8f] text-white text-sm font-semibold rounded-lg transition shadow-sm">
              Add Entry
            </button>
            <button onClick={() => { setFormData(EMPTY_FORM); setFormError(""); }}
              className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-slate-700 text-sm font-medium rounded-lg transition">
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Actual Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">Actual Delivery Entries</h2>
          <span className="text-xs text-slate-400">{userEntries.length} entries</span>
        </div>

        {userEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-slate-400">
            <svg className="w-10 h-10 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm">No entries yet — use the form above to add data.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["Clinician", "Clinic Type", "Planned", "Reduction", "Delivered", "Variance", "Root Cause"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {userEntries.map((row) => {
                  const planned = parseInt(row.plannedSessions) || 0;
                  const delivered = parseInt(row.deliveredSessions) || 0;
                  const varPct = planned > 0 ? ((planned - delivered) / planned) * 100 : 0;
                  const varColor =
                    varPct <= 3 ? "text-green-700" : varPct <= 7 ? "text-amber-700" : "text-red-700";
                  return (
                    <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-800">{row.clinician}</td>
                      <td className="px-4 py-3 text-slate-700">{row.clinicType}</td>
                      <td className="px-4 py-3 text-slate-600">{row.plannedSessions || "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{row.sessionsReduction || "—"}</td>
                      <td className="px-4 py-3 text-slate-700 font-medium">{row.deliveredSessions}</td>
                      <td className={`px-4 py-3 font-semibold ${varColor}`}>{varPct.toFixed(1)}%</td>
                      <td className="px-4 py-3 text-slate-600">{row.rootCause || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
