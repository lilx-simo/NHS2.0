"use client";

import { useState } from "react";
import {
  getWeeks,
  getClinicians,
  getSessionTypes,
  getAvailableWeeks,
  getWeekSummary,
} from "@/data";

const rootCauses = ["Did not attend", "Underutilisation", "Sickness", "Leave"];

const tableHeaders = [
  "Clinician",
  "Clinic Type",
  "Intended (Adj)",
  "Delivered Sessions",
  "Variance",
  "Root Cause",
];

function getVarianceColor(variancePct: number) {
  if (variancePct <= 3) return "bg-[#00d904]";
  if (variancePct <= 7) return "bg-[#ffbf00]";
  return "bg-red-500";
}

export default function ReportPage() {
  const allWeeks = getWeeks();
  const availableWeeks = getAvailableWeeks();
  const clinicians = getClinicians();
  const sessionTypes = getSessionTypes();

  const [weekIdx, setWeekIdx] = useState(0);
  const [formData, setFormData] = useState({
    clinician: "",
    clinicType: "",
    plannedSessions: "",
    sessionsReduction: "",
    deliveredSessions: "",
    rootCause: "",
  });

  const currentWeekStart = availableWeeks[weekIdx];
  const currentWeek = allWeeks[weekIdx];
  const summary = getWeekSummary(currentWeekStart);

  // Build per-clinician report rows from real data
  const reportRows = clinicians
    .map((c) => {
      const sessions = currentWeek
        ? currentWeek.sessions.filter((s) => s.clinicianId === c.id)
        : [];
      if (sessions.length === 0) return null;

      // Group by session type
      const byType: Record<string, number> = {};
      for (const s of sessions) {
        byType[s.sessionType] = (byType[s.sessionType] || 0) + 1;
      }

      // Return one row per clinician showing their primary type
      const primaryType = Object.entries(byType).sort((a, b) => b[1] - a[1])[0];
      const intended = sessions.length;
      const delivered = intended; // No actual delivery data yet
      const variancePct = intended > 0 ? ((intended - delivered) / intended) * 100 : 0;

      return {
        clinician: `Clinician ${c.label}`,
        clinicType: primaryType[0],
        intended,
        delivered,
        variance: `${variancePct.toFixed(1)}%`,
        variancePct,
        rootCause: variancePct === 0 ? "Null" : "",
      };
    })
    .filter(Boolean) as {
      clinician: string;
      clinicType: string;
      intended: number;
      delivered: number;
      variance: string;
      variancePct: number;
      rootCause: string;
    }[];

  const totalDelivered = summary?.totalClinicSlots ?? 0;
  const totalPlanned = summary?.totalClinicSlots ?? 0;
  const deliveryVariance = totalPlanned > 0
    ? ((totalPlanned - totalDelivered) / totalPlanned * 100).toFixed(1)
    : "0";
  const capacityReduction = summary
    ? `${((summary.totalUnavailable / (summary.totalSessions + summary.totalUnavailable || 1)) * 100).toFixed(0)}%`
    : "0%";

  const handleAdd = () => {
    console.log("Add:", formData);
  };

  const prevWeek = () => setWeekIdx((i) => Math.max(0, i - 1));
  const nextWeek = () => setWeekIdx((i) => Math.min(availableWeeks.length - 1, i + 1));

  return (
    <div className="p-0 overflow-auto">
      {/* Add Actual Delivered Data Form */}
      <div className="flex flex-wrap gap-[20px_24px] mx-[19px] mt-[27px] bg-white rounded-[20px] px-[20px] pt-[10px] pb-[31px]">
        <h1 className="text-[32px] text-black w-full">
          Add Actual Delivered Data
        </h1>

        <div className="flex flex-col gap-[10px] justify-center w-[320px]">
          <label className="text-[14px] text-[#0f0f0f] font-light">
            Clinician Name
          </label>
          <div className="relative">
            <select
              value={formData.clinician}
              onChange={(e) =>
                setFormData({ ...formData, clinician: e.target.value })
              }
              className="w-full bg-nhs-blue rounded-[5px] px-[5px] py-[6px] text-[12px] text-white appearance-none cursor-pointer outline-none pr-[25px]"
            >
              <option value="">Choose Clinician</option>
              {clinicians.map((c) => (
                <option key={c.id} value={`Clinician ${c.label}`}>
                  Clinician {c.label}
                </option>
              ))}
            </select>
            <svg
              className="absolute right-[8px] top-1/2 -translate-y-1/2 pointer-events-none"
              width="10"
              height="5"
              viewBox="0 0 10 5"
              fill="none"
            >
              <path d="M0 0L5 5L10 0" fill="white" />
            </svg>
          </div>
        </div>

        <div className="flex flex-col gap-[10px] justify-center w-[320px]">
          <label className="text-[14px] text-[#0f0f0f] font-light">
            Clinic Type
          </label>
          <div className="relative">
            <select
              value={formData.clinicType}
              onChange={(e) =>
                setFormData({ ...formData, clinicType: e.target.value })
              }
              className="w-full bg-nhs-blue rounded-[5px] px-[5px] py-[6px] text-[12px] text-white appearance-none cursor-pointer outline-none pr-[25px]"
            >
              <option value="">Choose Clinic Type</option>
              {sessionTypes.map((ct) => (
                <option key={ct} value={ct}>
                  {ct}
                </option>
              ))}
            </select>
            <svg
              className="absolute right-[8px] top-1/2 -translate-y-1/2 pointer-events-none"
              width="10"
              height="5"
              viewBox="0 0 10 5"
              fill="none"
            >
              <path d="M0 0L5 5L10 0" fill="white" />
            </svg>
          </div>
        </div>

        <div className="flex flex-col gap-[10px] justify-center w-[320px]">
          <label className="text-[14px] text-[#0f0f0f] font-light">
            Planned Sessions
          </label>
          <input
            type="number"
            value={formData.plannedSessions}
            onChange={(e) =>
              setFormData({ ...formData, plannedSessions: e.target.value })
            }
            className="w-full bg-nhs-blue rounded-[5px] px-[5px] py-[6px] text-[12px] text-white outline-none placeholder-white/70"
            placeholder="Enter Planned Sessions"
          />
        </div>

        <div className="flex flex-col gap-[10px] justify-center w-[320px]">
          <label className="text-[14px] text-[#0f0f0f] font-light">
            Sessions Reduction
          </label>
          <input
            type="number"
            value={formData.sessionsReduction}
            onChange={(e) =>
              setFormData({ ...formData, sessionsReduction: e.target.value })
            }
            className="w-full bg-nhs-blue rounded-[5px] px-[5px] py-[6px] text-[12px] text-white outline-none placeholder-white/70"
            placeholder="Enter Sessions Reduction"
          />
        </div>

        <div className="flex flex-col gap-[10px] justify-center w-[320px]">
          <label className="text-[14px] text-[#0f0f0f] font-light">
            Delivered Sessions
          </label>
          <input
            type="number"
            value={formData.deliveredSessions}
            onChange={(e) =>
              setFormData({ ...formData, deliveredSessions: e.target.value })
            }
            className="w-full bg-nhs-blue rounded-[5px] px-[5px] py-[6px] text-[12px] text-white outline-none placeholder-white/70"
            placeholder="Enter Delivered Sessions"
          />
        </div>

        <div className="flex flex-col gap-[10px] justify-center w-[320px]">
          <label className="text-[14px] text-[#0f0f0f] font-light">
            Choose Root Cause
          </label>
          <div className="relative">
            <select
              value={formData.rootCause}
              onChange={(e) =>
                setFormData({ ...formData, rootCause: e.target.value })
              }
              className="w-full bg-nhs-blue rounded-[5px] px-[5px] py-[6px] text-[12px] text-white appearance-none cursor-pointer outline-none pr-[25px]"
            >
              <option value="">Choose Root Cause</option>
              {rootCauses.map((rc) => (
                <option key={rc} value={rc}>
                  {rc}
                </option>
              ))}
            </select>
            <svg
              className="absolute right-[8px] top-1/2 -translate-y-1/2 pointer-events-none"
              width="10"
              height="5"
              viewBox="0 0 10 5"
              fill="none"
            >
              <path d="M0 0L5 5L10 0" fill="white" />
            </svg>
          </div>
        </div>

        <div className="flex items-end">
          <button
            onClick={handleAdd}
            className="w-[138px] h-[38px] bg-nhs-blue rounded-[5px] text-[16px] font-bold text-white cursor-pointer hover:opacity-90"
          >
            Add
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="flex flex-wrap gap-[10px] justify-center px-[19px] pt-[36px]">
        <div className="flex flex-col w-[260px] h-[178px] bg-white rounded-[20px] pl-[17px] pr-[10px] pt-[4px] pb-[10px]">
          <p className="text-[20px] text-black h-[35px] flex items-center">
            Delivered Session
          </p>
          <p className="text-[64px] font-bold text-black leading-none">
            {totalDelivered}
          </p>
          <p className="text-[20px] text-black h-[35px] flex items-center">
            {currentWeekStart}
          </p>
        </div>

        <div className="flex flex-col w-[260px] h-[178px] bg-white rounded-[20px] pl-[17px] pr-[10px] pt-[4px] pb-[10px]">
          <p className="text-[20px] text-black h-[35px] flex items-center">
            Planned Sessions
          </p>
          <p className="text-[64px] font-bold text-black leading-none">
            {totalPlanned}
          </p>
          <p className="text-[20px] text-black h-[35px] flex items-center">
            {currentWeekStart}
          </p>
        </div>

        <div className={`flex flex-col w-[260px] h-[178px] rounded-[20px] pl-[17px] pr-[10px] pt-[4px] pb-[10px] ${getVarianceColor(parseFloat(deliveryVariance))}`}>
          <p className="text-[20px] text-black h-[35px] flex items-center">
            Delivery vs Intended
          </p>
          <p className="text-[64px] font-bold text-black leading-none">
            {deliveryVariance}%
          </p>
          <p className="text-[20px] text-black h-[35px] flex items-center">
            {currentWeekStart}
          </p>
        </div>

        <div className="flex flex-col w-[260px] h-[178px] bg-[#00d904] rounded-[20px] pl-[17px] pr-[10px] pt-[4px] pb-[10px]">
          <p className="text-[20px] text-black h-[35px] flex items-center">
            Capacity Reduction
          </p>
          <p className="text-[64px] font-bold text-black leading-none">
            {capacityReduction}
          </p>
          <p className="text-[20px] text-black h-[35px] flex items-center">
            {currentWeekStart}
          </p>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-end gap-[29px] px-[20px] py-[10px]">
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
        <button className="flex items-center justify-center w-[100px] h-[35px] bg-nhs-blue rounded-[10px] text-[12px] text-white cursor-pointer">
          Export
        </button>
      </div>

      {/* Report Table */}
      <div className="px-[20px] pb-[20px]">
        <div className="overflow-hidden rounded-[10px]">
          <div className="flex">
            {tableHeaders.map((header, i) => (
              <div
                key={header}
                className={`flex items-center w-[173px] h-[50px] bg-nhs-blue border-[0.4px] border-[#e2e2e2] px-[20px] ${
                  i === 0 ? "rounded-tl-[10px]" : ""
                } ${i === tableHeaders.length - 1 ? "rounded-tr-[10px]" : ""}`}
              >
                <span className="text-[15px] text-white">{header}</span>
              </div>
            ))}
          </div>

          {reportRows.map((row, i) => (
            <div key={i} className="flex">
              <div
                className={`flex items-center w-[173px] h-[50px] bg-[#e2e2e2] border-[0.4px] border-nhs-blue px-[20px] ${
                  i === reportRows.length - 1 ? "rounded-bl-[10px]" : ""
                }`}
              >
                <span className="text-[15px] text-[#0f0f0f]">
                  {row.clinician}
                </span>
              </div>
              <div className="flex items-center w-[173px] h-[50px] bg-[#e2e2e2] border-[0.4px] border-nhs-blue px-[20px]">
                <span className="text-[15px] text-[#0f0f0f]">
                  {row.clinicType}
                </span>
              </div>
              <div className="flex items-center w-[173px] h-[50px] bg-[#e2e2e2] border-[0.4px] border-nhs-blue px-[20px]">
                <span className="text-[15px] text-[#0f0f0f]">
                  {row.intended}
                </span>
              </div>
              <div className="flex items-center w-[173px] h-[50px] bg-[#e2e2e2] border-[0.4px] border-nhs-blue px-[20px]">
                <span className="text-[15px] text-[#0f0f0f]">
                  {row.delivered}
                </span>
              </div>
              <div className="flex items-center w-[173px] h-[50px] bg-[#e2e2e2] border-[0.4px] border-nhs-blue px-[20px]">
                <span className="text-[15px] text-[#0f0f0f]">
                  {row.variance}
                </span>
              </div>
              <div
                className={`flex items-center w-[173px] h-[50px] bg-[#e2e2e2] border-[0.4px] border-nhs-blue px-[20px] ${
                  i === reportRows.length - 1 ? "rounded-br-[10px]" : ""
                }`}
              >
                <span className="text-[15px] text-[#0f0f0f]">
                  {row.rootCause}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
