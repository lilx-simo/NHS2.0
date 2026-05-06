"use client";

import { useState, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getWeeks, getSessionTypes, getAvailableWeeks, getWeekSummary } from "@/data";
import { downloadCSV } from "@/lib/export";
import { getClosestWeekIdx } from "@/lib/settings";
import { APPT_TYPES, calcApptTotals } from "@/lib/formula";
import { parsePositiveInt } from "@/lib/security";
import { api, type ApiReportEntry } from "@/lib/api";

const ROOT_CAUSES = ["Did not attend", "Underutilisation", "Sickness", "Leave", "N/A", "Other"];

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
  deliveredSessions: "",
  rootCause: "",
};

export default function ReportPage() {
  const router = useRouter();
  const allWeeks = getWeeks();
  const availableWeeks = getAvailableWeeks();
  const sessionTypes = getSessionTypes();

  const [weekIdx, setWeekIdx] = useState(() => getClosestWeekIdx(availableWeeks));
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [userEntries, setUserEntries] = useState<ApiReportEntry[]>([]);
  const [success, setSuccess] = useState(false);
  const [formError, setFormError] = useState("");
  const [clinicianNames, setClinicianNames] = useState<string[]>([]);

  useEffect(() => {
    async function init() {
      try {
        const user = await api.auth.me();
        if (!user) { router.push("/"); return; }
        if (!["admin", "planner"].includes(user.role)) { router.push("/dashboard"); return; }
        const managed = await api.clinicians.list(true);
        const userDoctors = await api.users.list();
        const doctors = userDoctors.filter((u) => ["doctor", "nurse", "clinician"].includes(u.role));
        setClinicianNames([
          ...managed.map((c) => c.name),
          ...doctors.filter((u) => !managed.some((c) => c.name === u.name)).map((u) => u.name),
        ]);
      } catch {
        router.push("/");
      }
    }
    init();
  }, [router]);

  useEffect(() => {
    const max = availableWeeks.length - 1;
    const goP = () => setWeekIdx((i) => Math.max(0, i - 1));
    const goN = () => setWeekIdx((i) => Math.min(max, i + 1));
    window.addEventListener("nhs-prev-week", goP);
    window.addEventListener("nhs-next-week", goN);
    return () => { window.removeEventListener("nhs-prev-week", goP); window.removeEventListener("nhs-next-week", goN); };
  }, [availableWeeks.length]);

  const currentWeekStart = availableWeeks[weekIdx];
  const currentWeek = allWeeks[weekIdx];
  const summary = getWeekSummary(currentWeekStart);

  useEffect(() => {
    async function loadEntries() {
      try {
        const entries = await api.reportEntries.list(currentWeekStart);
        setUserEntries(entries);
      } catch {
        setUserEntries([]);
      }
    }
    loadEntries();
  }, [currentWeekStart]);

  const totalPlanned = summary?.totalClinicSlots ?? 0;
  const totalDeliveredBase = summary ? summary.totalClinicSlots - summary.totalUnavailable * 5 : 0;

  const userDelivered = userEntries.reduce((s, e) => s + (parseInt(e.deliveredSessions) || 0), 0);

  const displayPlanned = totalPlanned;
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

  const handleAdd = async () => {
    if (!formData.clinician) { setFormError("Clinician is required."); return; }
    if (!formData.clinicType) { setFormError("Clinic Type is required."); return; }
    if (!formData.deliveredSessions) { setFormError("Delivered Sessions is required."); return; }
    const deliveredNum = parsePositiveInt(formData.deliveredSessions, 9999);
    if (deliveredNum === null) { setFormError("Delivered Sessions must be a whole number between 0 and 9999."); return; }
    if (!formData.rootCause) { setFormError("Root Cause is required."); return; }
    try {
      const entry = await api.reportEntries.create({ ...formData, weekStart: currentWeekStart });
      api.auditLog.add(`Actual delivery data added: ${formData.clinician} — ${formData.clinicType}, Delivered: ${formData.deliveredSessions}`);
      setUserEntries((prev) => [...prev, entry]);
      setFormData(EMPTY_FORM);
      setFormError("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to save entry.");
    }
  };

  const handleExport = () => {
    downloadCSV(
      userEntries.map((e) => ({
        Clinician: e.clinician,
        "Clinic Type": e.clinicType,
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
            {field("Clinician Name *",
              <select value={formData.clinician} onChange={(e) => setFormData({ ...formData, clinician: e.target.value })} className={selectCls}>
                <option value="">Choose Clinician</option>
                {clinicianNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            )}
            {field("Clinic Type *",
              <select value={formData.clinicType} onChange={(e) => setFormData({ ...formData, clinicType: e.target.value })} className={selectCls}>
                <option value="">Choose Clinic Type</option>
                {sessionTypes.map((ct) => <option key={ct} value={ct}>{ct}</option>)}
              </select>
            )}
            {field("Delivered Sessions *",
              <input type="number" min="0" value={formData.deliveredSessions}
                onChange={(e) => setFormData({ ...formData, deliveredSessions: e.target.value })}
                placeholder="Enter number" className={inputCls} />
            )}
            {field("Root Cause *",
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
                  {["Clinician", "Clinic Type", "Delivered", "Root Cause"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {userEntries.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{row.clinician}</td>
                    <td className="px-4 py-3 text-slate-700">{row.clinicType}</td>
                    <td className="px-4 py-3 text-slate-700 font-medium">{row.deliveredSessions}</td>
                    <td className="px-4 py-3 text-slate-600">{row.rootCause || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Appointment Type Comparison */}
      {(() => {
        const plannedTotals = summary?.slotTotals ?? null;
        const reportedTotals = calcApptTotals(
          userEntries.map((e) => ({ clinicType: e.clinicType, count: parseInt(e.deliveredSessions) || 0 }))
        );
        const hasAnyPlanned = plannedTotals && APPT_TYPES.some((k) => (plannedTotals[k] ?? 0) > 0);
        const hasAnyReported = APPT_TYPES.some((k) => reportedTotals[k] > 0);
        if (!hasAnyPlanned && !hasAnyReported) return null;
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-slate-50">
              <h2 className="text-base font-semibold text-slate-800">Appointment Type Comparison</h2>
              <p className="text-xs text-slate-500 mt-0.5">Planned appointment slots vs totals derived from reported sessions</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {["Appointment Type", "Planned", "Reported", "Difference"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {APPT_TYPES.map((appt) => {
                    const planned = plannedTotals?.[appt] ?? 0;
                    const reported = reportedTotals[appt];
                    const diff = reported - planned;
                    return (
                      <tr key={appt} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-800">{appt}</td>
                        <td className="px-4 py-3 text-slate-600">{planned}</td>
                        <td className="px-4 py-3 text-slate-600">{reported}</td>
                        <td className="px-4 py-3">
                          {diff === 0 ? (
                            <span className="text-green-600 font-medium">0</span>
                          ) : diff > 0 ? (
                            <span className="text-blue-600 font-medium">+{diff}</span>
                          ) : (
                            <span className="text-red-600 font-medium">{diff}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
