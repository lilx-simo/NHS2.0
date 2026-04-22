"use client";

import { useState } from "react";
import {
  getWeeks,
  getClinicians,
  getSessionTypes,
  getAvailableWeeks,
} from "@/data";

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const reasons = ["Cover for leave", "Back Log", "RTT Action", "Extra Capacity"];

const tableHeaders = [
  "Clinician",
  "Clinic Type",
  "Date",
  "Expected Patients",
  "Reason",
  "Type",
];

export default function AdditionalSessionsPage() {
  const allWeeks = getWeeks();
  const availableWeeks = getAvailableWeeks();
  const clinicians = getClinicians();
  const sessionTypes = getSessionTypes();

  const [weekIdx, setWeekIdx] = useState(0);
  const [formData, setFormData] = useState({
    clinician: "",
    reason: "",
    clinicType: "",
    date: "",
    expectedPatients: "",
  });

  const currentWeekStart = availableWeeks[weekIdx];
  const currentWeek = allWeeks[weekIdx];

  // Filter to only "extra/additional" sessions
  const additionalSessions = currentWeek
    ? currentWeek.sessions.filter((s) =>
        s.sessionType.toLowerCase().includes("extra")
      )
    : [];

  const additionalRows = additionalSessions.map((s) => {
    const dayIdx = DAY_NAMES.indexOf(s.day);
    const d = new Date(currentWeekStart + "T00:00:00");
    d.setDate(d.getDate() + dayIdx);
    const dateStr = `${d.getDate()} / ${d.getMonth() + 1} / ${d.getFullYear()}`;
    const clinician = clinicians.find((c) => c.id === s.clinicianId);
    return {
      clinician: clinician ? `Clinician ${clinician.label}` : `#${s.clinicianId}`,
      clinicType: s.sessionType,
      date: dateStr,
      expectedPatients: "-",
      reason: "Extra Capacity",
      type: "Additional",
    };
  });

  const handleSave = () => {
    console.log("Save:", formData);
  };

  const prevWeek = () => setWeekIdx((i) => Math.max(0, i - 1));
  const nextWeek = () => setWeekIdx((i) => Math.min(availableWeeks.length - 1, i + 1));

  return (
    <div className="p-0 overflow-auto">
      {/* Add Session Form */}
      <div className="mx-[19px] mt-[31px] bg-nhs-blue rounded-[10px] px-[20px] pt-[10px] pb-[16px]">
        <div className="grid grid-cols-5 gap-x-[10px] gap-y-[29px]">
          {/* Clinician Name */}
          <div className="flex flex-col gap-[10px] justify-center">
            <label className="text-[16px] text-white font-light">
              Clinician Name
            </label>
            <div className="relative">
              <select
                value={formData.clinician}
                onChange={(e) =>
                  setFormData({ ...formData, clinician: e.target.value })
                }
                className="w-full bg-white rounded-[5px] px-[5px] py-[6px] text-[12px] text-black appearance-none cursor-pointer outline-none pr-[25px]"
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
                <path d="M0 0L5 5L10 0" fill="black" />
              </svg>
            </div>
          </div>

          {/* Reason For Addition */}
          <div className="flex flex-col gap-[10px] justify-center">
            <label className="text-[16px] text-white font-light">
              Reason For Addition
            </label>
            <div className="relative">
              <select
                value={formData.reason}
                onChange={(e) =>
                  setFormData({ ...formData, reason: e.target.value })
                }
                className="w-full bg-white rounded-[5px] px-[5px] py-[6px] text-[12px] text-black appearance-none cursor-pointer outline-none pr-[25px]"
              >
                <option value="">Enter Reason</option>
                {reasons.map((r) => (
                  <option key={r} value={r}>
                    {r}
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
                <path d="M0 0L5 5L10 0" fill="black" />
              </svg>
            </div>
          </div>

          {/* Clinic Type */}
          <div className="flex flex-col gap-[10px] justify-center">
            <label className="text-[16px] text-white font-light">
              Clinic Type
            </label>
            <div className="relative">
              <select
                value={formData.clinicType}
                onChange={(e) =>
                  setFormData({ ...formData, clinicType: e.target.value })
                }
                className="w-full bg-white rounded-[5px] px-[5px] py-[6px] text-[12px] text-black appearance-none cursor-pointer outline-none pr-[25px]"
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
                <path d="M0 0L5 5L10 0" fill="black" />
              </svg>
            </div>
          </div>

          {/* Date */}
          <div className="flex flex-col gap-[10px] justify-center">
            <label className="text-[16px] text-white font-light">Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData({ ...formData, date: e.target.value })
              }
              className="w-full bg-white rounded-[5px] px-[5px] py-[6px] text-[12px] text-black outline-none cursor-pointer"
              placeholder="Choose Date"
            />
          </div>

          {/* Expected Patients */}
          <div className="flex flex-col gap-[10px] justify-center">
            <label className="text-[16px] text-white font-light">
              Expected Patients
            </label>
            <input
              type="number"
              value={formData.expectedPatients}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  expectedPatients: e.target.value,
                })
              }
              className="w-full bg-white rounded-[5px] px-[5px] py-[6px] text-[12px] text-black outline-none"
              placeholder="Enter a number"
            />
          </div>

          {/* Save Button */}
          <div>
            <button
              onClick={handleSave}
              className="w-[98px] h-[30px] bg-white rounded-[5px] text-[16px] text-black text-center cursor-pointer hover:bg-gray-100"
            >
              Save
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between px-[20px] py-[10px] mt-[10px]">
        <p className="text-[14px] font-bold text-black">
          Week of {currentWeekStart} ({additionalRows.length} additional sessions)
        </p>
        <div className="flex gap-[29px]">
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
      </div>

      {/* Additional Sessions Table */}
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

          {additionalRows.length === 0 ? (
            <div className="flex items-center justify-center h-[50px] bg-[#e2e2e2]">
              <span className="text-[15px] text-[#0f0f0f]">No additional sessions this week</span>
            </div>
          ) : (
            additionalRows.map((row, i) => (
              <div key={i} className="flex">
                <div
                  className={`flex items-center w-[173px] h-[50px] bg-[#e2e2e2] border-[0.4px] border-nhs-blue px-[20px] ${
                    i === additionalRows.length - 1 ? "rounded-bl-[10px]" : ""
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
                  <span className="text-[15px] text-[#0f0f0f]">{row.date}</span>
                </div>
                <div className="flex items-center w-[173px] h-[50px] bg-[#e2e2e2] border-[0.4px] border-nhs-blue px-[20px]">
                  <span className="text-[15px] text-[#0f0f0f]">
                    {row.expectedPatients}
                  </span>
                </div>
                <div className="flex items-center w-[173px] h-[50px] bg-[#e2e2e2] border-[0.4px] border-nhs-blue px-[20px]">
                  <span className="text-[15px] text-[#0f0f0f]">
                    {row.reason}
                  </span>
                </div>
                <div
                  className={`flex items-center w-[173px] h-[50px] bg-[#e2e2e2] border-[0.4px] border-nhs-blue px-[20px] ${
                    i === additionalRows.length - 1 ? "rounded-br-[10px]" : ""
                  }`}
                >
                  <span className="text-[15px] text-[#0f0f0f]">{row.type}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
