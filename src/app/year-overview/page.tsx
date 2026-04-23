"use client";

import { useState } from "react";
import { getAllWeekSummaries, getWeekSummary } from "@/data";
import { getSettings } from "@/lib/settings";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatWeekFull(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function computeVariance(weekStart: string): number {
  const s = getWeekSummary(weekStart);
  if (!s || s.totalClinicSlots === 0) return 0;
  const delivered = s.totalClinicSlots - s.totalUnavailable * 5;
  return Math.round(((s.totalClinicSlots - delivered) / s.totalClinicSlots) * 100);
}

interface MonthData {
  year: number;
  month: number;
  weeks: string[];
}

export default function YearOverviewPage() {
  const settings = getSettings();
  const { varianceAmber, varianceRed } = settings;
  const summaries = getAllWeekSummaries();

  // Group weeks by month (by week start date)
  const monthMap = new Map<string, MonthData>();
  for (const s of summaries) {
    const d = new Date(s.weekStart + "T00:00:00");
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!monthMap.has(key)) {
      monthMap.set(key, { year: d.getFullYear(), month: d.getMonth(), weeks: [] });
    }
    monthMap.get(key)!.weeks.push(s.weekStart);
  }

  // Sort months chronologically
  const months = [...monthMap.values()].sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.month - b.month
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Modal state for clicked week
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);

  const cellColor = (variance: number, isPast: boolean) => {
    const opacity = isPast ? "opacity-50" : "";
    if (variance < varianceAmber) return `bg-green-400 ${opacity}`;
    if (variance < varianceRed) return `bg-amber-400 ${opacity}`;
    return `bg-red-400 ${opacity}`;
  };

  const selectedSummary = selectedWeek ? getWeekSummary(selectedWeek) : null;
  const selectedVariance = selectedWeek ? computeVariance(selectedWeek) : 0;
  const selectedDelivered = selectedSummary
    ? selectedSummary.totalClinicSlots - selectedSummary.totalUnavailable * 5
    : 0;

  const totalWeeks = summaries.length;
  const highVarianceCount = summaries.filter((s) => computeVariance(s.weekStart) >= varianceRed).length;
  const onTargetCount = summaries.filter((s) => computeVariance(s.weekStart) < varianceAmber).length;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Year Overview</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          April 2026 – March 2027 · Click any week to see details
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
          <p className="text-4xl font-bold text-slate-800">{totalWeeks}</p>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-1">Total Weeks</p>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-5 text-center">
          <p className="text-4xl font-bold text-green-700">{onTargetCount}</p>
          <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mt-1">On Target</p>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-200 p-5 text-center">
          <p className="text-4xl font-bold text-red-600">{highVarianceCount}</p>
          <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mt-1">High Variance</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-green-400 inline-block" />
          On target (&lt;{varianceAmber}%)
        </span>
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-amber-400 inline-block" />
          Monitor ({varianceAmber}–{varianceRed - 1}%)
        </span>
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-red-400 inline-block" />
          Action needed (≥{varianceRed}%)
        </span>
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-gray-300 inline-block" />
          No data
        </span>
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-blue-400 inline-block ring-2 ring-blue-600" />
          Current week
        </span>
      </div>

      {/* Month grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {months.map(({ year, month, weeks }) => {
          const label = `${MONTH_NAMES[month]} ${year}`;
          return (
            <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <p className="text-sm font-bold text-slate-700 mb-4">{label}</p>
              <div className="flex flex-wrap gap-2">
                {weeks.map((ws) => {
                  const variance = computeVariance(ws);
                  const weekDate = new Date(ws + "T00:00:00");
                  const isPast = weekDate < today;
                  const isCurrentWeek =
                    weekDate <= today &&
                    new Date(weekDate.getTime() + 7 * 24 * 60 * 60 * 1000) > today;

                  const endDate = new Date(weekDate.getTime() + 6 * 24 * 60 * 60 * 1000);
                  const endStr = `${endDate.getDate()} ${MONTH_NAMES[endDate.getMonth()].slice(0, 3)}`;
                  const startStr = `${weekDate.getDate()} ${MONTH_NAMES[weekDate.getMonth()].slice(0, 3)}`;

                  return (
                    <button
                      key={ws}
                      onClick={() => setSelectedWeek(ws === selectedWeek ? null : ws)}
                      title={`${startStr} – ${endStr} · Variance: ${variance}%`}
                      className={`
                        w-10 h-10 rounded-lg transition-all hover:scale-110 hover:shadow-md
                        ${isCurrentWeek ? "ring-2 ring-[#005eb8] ring-offset-1" : ""}
                        ${selectedWeek === ws ? "ring-2 ring-slate-700 ring-offset-1 scale-110" : ""}
                        ${variance === 0 && !isPast ? "bg-gray-200" : cellColor(variance, isPast)}
                      `}
                    />
                  );
                })}
              </div>
              {/* Mini bar: show % of weeks on target */}
              <div className="mt-4 h-1 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full bg-green-400 rounded-full"
                  style={{
                    width: `${Math.round(
                      (weeks.filter((w) => computeVariance(w) < varianceAmber).length / weeks.length) * 100
                    )}%`,
                  }}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {weeks.filter((w) => computeVariance(w) < varianceAmber).length}/{weeks.length} weeks on target
              </p>
            </div>
          );
        })}
      </div>

      {/* Selected week detail panel */}
      {selectedWeek && selectedSummary && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-[#005eb8] flex items-center justify-between">
            <div>
              <p className="text-white font-semibold">Week of {formatWeekFull(selectedWeek)}</p>
              <p className="text-blue-200 text-xs mt-0.5">Detailed breakdown</p>
            </div>
            <button onClick={() => setSelectedWeek(null)} className="text-white/70 hover:text-white transition">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="p-6 grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
            {[
              { label: "Planned", value: selectedSummary.totalClinicSlots },
              { label: "Delivered", value: Math.max(0, selectedDelivered) },
              {
                label: "Variance",
                value: `${selectedVariance}%`,
                color: selectedVariance < varianceAmber ? "text-green-600" : selectedVariance < varianceRed ? "text-amber-600" : "text-red-600",
              },
              { label: "Clinicians", value: selectedSummary.clinicianCount },
              { label: "Unavailable", value: selectedSummary.totalUnavailable },
            ].map((item) => (
              <div key={item.label}>
                <p className={`text-3xl font-bold ${item.color ?? "text-slate-800"}`}>{item.value}</p>
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mt-1">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
