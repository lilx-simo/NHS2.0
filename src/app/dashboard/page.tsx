"use client";

import { useState } from "react";
import { getWeeks, getWeekSummary, getClinicians, getAvailableWeeks } from "@/data";

function formatWeek(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function VarianceChip({ value }: { value: number }) {
  const abs = Math.abs(value);
  if (abs <= 5)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
        On target · {value}%
      </span>
    );
  if (abs <= 10)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
        Monitor · {value}%
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
      Action needed · {value}%
    </span>
  );
}

export default function DashboardPage() {
  const availableWeeks = getAvailableWeeks();
  const clinicians = getClinicians();
  const [weekIdx, setWeekIdx] = useState(0);

  const currentWeekStart = availableWeeks[weekIdx];
  const summary = getWeekSummary(currentWeekStart);
  const weeks = getWeeks();
  const currentWeek = weeks[weekIdx];

  const clinicianRows = clinicians.map((c) => {
    const sessions = currentWeek?.sessions.filter((s) => s.clinicianId === c.id) ?? [];
    const unavailable = currentWeek?.unavailability.filter((u) => u.clinicianId === c.id) ?? [];
    const planned = sessions.length + unavailable.length;
    const adjusted = sessions.length;
    const reduction = planned > 0 ? Math.round(((planned - adjusted) / planned) * 100) : 0;
    return { name: `Clinician ${c.label}`, planned, adjusted, reduction };
  });

  const totalPlanned = summary?.totalClinicSlots ?? 0;
  const totalDelivered = summary
    ? summary.totalClinicSlots - summary.totalUnavailable * 5
    : 0;
  const variance =
    totalPlanned > 0
      ? Math.round(((totalPlanned - totalDelivered) / totalPlanned) * 100)
      : 0;

  const prevWeek = () => setWeekIdx((i) => Math.max(0, i - 1));
  const nextWeek = () =>
    setWeekIdx((i) => Math.min(availableWeeks.length - 1, i + 1));

  const varianceCardStyle =
    Math.abs(variance) <= 5
      ? "bg-green-50 border-green-200"
      : Math.abs(variance) <= 10
      ? "bg-amber-50 border-amber-200"
      : "bg-red-50 border-red-200";

  const varianceTextStyle =
    Math.abs(variance) <= 5
      ? "text-green-700"
      : Math.abs(variance) <= 10
      ? "text-amber-700"
      : "text-red-700";

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Week of {formatWeek(currentWeekStart)}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={prevWeek}
            disabled={weekIdx === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#005eb8] text-white text-sm font-medium rounded-lg hover:bg-[#003d8f] disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Prev Week
          </button>
          <button
            onClick={nextWeek}
            disabled={weekIdx === availableWeeks.length - 1}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#005eb8] text-white text-sm font-medium rounded-lg hover:bg-[#003d8f] disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Next Week
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Primary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
            Planned Capacity
          </p>
          <p className="text-5xl font-bold text-slate-800 mt-2">{totalPlanned}</p>
          <p className="text-xs text-slate-400 mt-2">Total clinic slots this week</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
            Delivered Capacity
          </p>
          <p className="text-5xl font-bold text-slate-800 mt-2">{totalDelivered}</p>
          <p className="text-xs text-slate-400 mt-2">Sessions completed this week</p>
        </div>

        <div className={`rounded-xl shadow-sm border p-6 ${varianceCardStyle}`}>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
            Variance
          </p>
          <p className={`text-5xl font-bold mt-2 ${varianceTextStyle}`}>{variance}%</p>
          <div className="mt-2">
            <VarianceChip value={variance} />
          </div>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-[#005eb8]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Active Clinicians</p>
            <p className="text-2xl font-bold text-slate-800">{summary?.clinicianCount ?? 0}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Additional Sessions</p>
            <p className="text-2xl font-bold text-slate-800">{summary?.totalAdditionalSessions ?? 0}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Unavailable Slots</p>
            <p className="text-2xl font-bold text-slate-800">{summary?.totalUnavailable ?? 0}</p>
          </div>
        </div>
      </div>

      {/* Clinician Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">
            Clinician Capacity Overview
          </h2>
          <span className="text-xs text-slate-400">
            {clinicianRows.filter((r) => r.planned > 0).length} active clinicians
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Clinician", "Planned Sessions", "Adjusted Sessions", "Capacity Reduction"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {clinicianRows.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-800">{row.name}</td>
                  <td className="px-6 py-4 text-slate-600">{row.planned}</td>
                  <td className="px-6 py-4 text-slate-600">{row.adjusted}</td>
                  <td className="px-6 py-4">
                    {row.reduction === 0 ? (
                      <span className="text-green-600 font-medium">0%</span>
                    ) : row.reduction <= 10 ? (
                      <span className="text-amber-600 font-medium">{row.reduction}%</span>
                    ) : (
                      <span className="text-red-600 font-medium">{row.reduction}%</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
