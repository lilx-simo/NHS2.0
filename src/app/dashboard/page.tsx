"use client";

import { useState } from "react";
import {
  getWeeks,
  getWeekSummary,
  getClinicians,
  getAvailableWeeks,
} from "@/data";
import type { WeekSummary } from "@/data";

function getVarianceColor(variance: number) {
  if (variance <= 5) return "bg-[#00d904]";
  if (variance <= 10) return "bg-amber-400";
  return "bg-red-500";
}

export default function DashboardPage() {
  const availableWeeks = getAvailableWeeks();
  const clinicians = getClinicians();
  const [weekIdx, setWeekIdx] = useState(0);

  const currentWeekStart = availableWeeks[weekIdx];
  const summary = getWeekSummary(currentWeekStart);
  const weeks = getWeeks();
  const currentWeek = weeks[weekIdx];

  // Build per-clinician row data from real sessions
  const clinicianRows = clinicians.map((c) => {
    const sessions = currentWeek
      ? currentWeek.sessions.filter((s) => s.clinicianId === c.id)
      : [];
    const unavailable = currentWeek
      ? currentWeek.unavailability.filter((u) => u.clinicianId === c.id)
      : [];
    const planned = sessions.length + unavailable.length;
    const adjusted = sessions.length;
    const reduction =
      planned > 0 ? Math.round(((planned - adjusted) / planned) * 100) : 0;
    return {
      name: `Clinician ${c.label}`,
      planned,
      adjusted,
      reduction,
    };
  });

  const totalPlanned = summary?.totalClinicSlots ?? 0;
  const totalDelivered = summary
    ? summary.totalClinicSlots - (summary.totalUnavailable * 5)
    : 0;
  const variance =
    totalPlanned > 0
      ? Math.round(((totalPlanned - totalDelivered) / totalPlanned) * 100)
      : 0;

  const prevWeek = () => setWeekIdx((i) => Math.max(0, i - 1));
  const nextWeek = () =>
    setWeekIdx((i) => Math.min(availableWeeks.length - 1, i + 1));

  return (
    <div className="p-0">
      {/* Week Navigation */}
      <div className="flex items-center justify-between px-[75px] pt-[20px]">
        <p className="text-[16px] font-bold text-black">
          Week of {currentWeekStart}
        </p>
        <div className="flex gap-[36px]">
          <button
            onClick={prevWeek}
            disabled={weekIdx === 0}
            className="flex items-center justify-center gap-[2px] w-[100px] h-[35px] bg-nhs-blue rounded-[10px] text-[12px] text-white cursor-pointer disabled:opacity-50"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M7 1L3 5L7 9" stroke="white" strokeWidth="1.5" />
            </svg>
            Prev Week
          </button>
          <button
            onClick={nextWeek}
            disabled={weekIdx === availableWeeks.length - 1}
            className="flex items-center justify-center gap-[2px] w-[100px] h-[35px] bg-nhs-blue rounded-[10px] text-[12px] text-white cursor-pointer disabled:opacity-50"
          >
            Next Week
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M3 1L7 5L3 9" stroke="white" strokeWidth="1.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="flex items-center justify-center gap-[88px] px-[75px] py-[43px]">
        <div className="flex items-center justify-center w-[265px] h-[200px]">
          <div className="flex flex-col items-center justify-center gap-[9px] w-[220px] h-[120px] rounded-[10px] bg-[#f6f5f5] px-[24px] py-[12px]">
            <p className="text-[20px] font-bold text-black w-full">
              Planned Capacity
            </p>
            <p className="text-[36px] font-bold text-black w-full">
              {totalPlanned}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center w-[265px] h-[200px]">
          <div className="flex flex-col items-center justify-center gap-[9px] w-[220px] h-[120px] rounded-[10px] bg-[#f6f5f5] px-[24px] py-[12px]">
            <p className="text-[20px] font-bold text-black w-full">
              Delivered Capacity
            </p>
            <p className="text-[36px] font-bold text-black w-full">
              {totalDelivered}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center w-[265px] h-[200px]">
          <div
            className={`flex flex-col items-center justify-center gap-[9px] w-[220px] h-[120px] rounded-[10px] px-[24px] py-[12px] ${getVarianceColor(Math.abs(variance))}`}
          >
            <p className="text-[20px] font-bold text-black w-full">Variance</p>
            <p className="text-[36px] font-bold text-black w-full">
              {variance}%
            </p>
          </div>
        </div>
      </div>

      {/* Weekly Capacity Table */}
      <div className="flex justify-center px-[75px]">
        <div className="w-[930px] bg-[#f6f5f5] rounded-[10px] px-[35px] py-[26px]">
          <h2 className="text-[24px] font-bold text-black mb-[10px]">
            Weekly Capacity
          </h2>

          <div className="w-full">
            <div className="flex bg-[#d9d9d9] h-[42px] items-center">
              <div className="w-[216px] pl-[20px] text-[15px] font-bold text-black">
                Clinician
              </div>
              <div className="w-[216px] pl-[20px] text-[15px] font-bold text-black">
                Planned Sessions
              </div>
              <div className="w-[216px] pl-[20px] text-[15px] font-bold text-black">
                Adjusted Sessions
              </div>
              <div className="w-[216px] pl-[20px] text-[15px] font-bold text-black">
                Capacity Reduction
              </div>
            </div>

            {clinicianRows.map((row, i) => (
              <div
                key={i}
                className="flex h-[42px] items-center border-b border-gray-200"
              >
                <div className="w-[216px] pl-[20px] text-[15px] text-black">
                  {row.name}
                </div>
                <div className="w-[216px] pl-[20px] text-[15px] text-black">
                  {row.planned}
                </div>
                <div className="w-[216px] pl-[20px] text-[15px] text-black">
                  {row.adjusted}
                </div>
                <div className="w-[216px] pl-[20px] text-[15px] text-black">
                  {row.reduction}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
