"use client";

import { useState } from "react";
import {
  getWeeks,
  getClinicians,
  getAvailableWeeks,
} from "@/data";

const timeSlots = [
  "08:00", "09:00", "10:00", "11:00", "12:00", "13:00",
  "14:00", "15:00", "16:00", "17:00", "18:00", "19:00",
  "20:00", "21:00", "22:00", "23:00", "24:00",
];

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

function getWeekDays(startDate: Date) {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    days.push({
      name: DAY_NAMES[i],
      date: `${d.getDate()} ${d.toLocaleString("en-GB", { month: "short" })}`,
    });
  }
  return days;
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

  // Build session lookup: "dayIndex-timeIndex" -> session info
  // AM sessions go into time slots 0-4 (08:00-12:00), PM into 5-9 (13:00-17:00)
  const sessionMap: Record<string, { type: string; location: string; unavailable?: boolean }> = {};
  if (currentWeek) {
    const sessions = selectedClinicianId
      ? currentWeek.sessions.filter((s) => s.clinicianId === selectedClinicianId)
      : currentWeek.sessions;

    for (const s of sessions) {
      const dayIdx = DAY_NAMES.indexOf(s.day as typeof DAY_NAMES[number]);
      if (dayIdx === -1) continue;
      const timeIdx = s.period === "AM" ? 0 : 5;
      // Find an empty slot starting from the period start
      for (let t = timeIdx; t < timeIdx + 5; t++) {
        const key = `${dayIdx}-${t}`;
        if (!sessionMap[key]) {
          sessionMap[key] = { type: s.sessionType, location: s.location };
          break;
        }
      }
    }

    // Show unavailability
    const unavail = selectedClinicianId
      ? currentWeek.unavailability.filter((u) => u.clinicianId === selectedClinicianId)
      : currentWeek.unavailability;

    for (const u of unavail) {
      const dayIdx = DAY_NAMES.indexOf(u.day as typeof DAY_NAMES[number]);
      if (dayIdx === -1) continue;
      const timeIdx = u.period === "AM" ? 0 : 5;
      for (let t = timeIdx; t < timeIdx + 5; t++) {
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

  const selectedLabel = selectedClinicianId
    ? `Clinician ${clinicians.find((c) => c.id === selectedClinicianId)?.label ?? ""}`
    : "";

  return (
    <div className="p-[10px] overflow-auto">
      {/* Top Controls */}
      <div className="flex items-center justify-between mb-[10px] px-[10px]">
        {/* Clinician Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center justify-between w-[164px] h-[35px] bg-white border border-gray-300 rounded-[10px] px-[13px] text-[12px] text-black cursor-pointer"
          >
            <span>{selectedLabel || "All Clinicians"}</span>
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
              <path d="M1 1L5 5L9 1" stroke="black" strokeWidth="1.5" />
            </svg>
          </button>
          {dropdownOpen && (
            <div className="absolute top-[37px] left-0 w-[182px] bg-[#ededed] z-10 rounded shadow">
              <button
                onClick={() => {
                  setSelectedClinicianId(null);
                  setDropdownOpen(false);
                }}
                className="flex items-center w-full h-[39px] px-[20px] py-[14px] text-[12px] text-black hover:bg-gray-300 cursor-pointer"
              >
                All Clinicians
              </button>
              {clinicians.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedClinicianId(c.id);
                    setDropdownOpen(false);
                  }}
                  className="flex items-center w-full h-[39px] px-[20px] py-[14px] text-[12px] text-black hover:bg-gray-300 cursor-pointer"
                >
                  Clinician {c.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <p className="text-[14px] font-bold text-black">
          Week of {currentWeekStart}
        </p>

        {/* Navigation Buttons */}
        <div className="flex gap-[36px]">
          <button
            onClick={prevWeek}
            disabled={weekIdx === 0}
            className="flex items-center justify-center gap-[2px] w-[100px] h-[35px] bg-nhs-blue rounded-[10px] text-[12px] text-white cursor-pointer disabled:opacity-50"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="white">
              <path d="M7 1L3 5L7 9" stroke="white" strokeWidth="1.5" fill="none" />
            </svg>
            Prev Week
          </button>
          <button
            onClick={nextWeek}
            disabled={weekIdx === availableWeeks.length - 1}
            className="flex items-center justify-center gap-[2px] w-[100px] h-[35px] bg-nhs-blue rounded-[10px] text-[12px] text-white cursor-pointer disabled:opacity-50"
          >
            Next Week
            <svg width="10" height="10" viewBox="0 0 10 10" fill="white">
              <path d="M3 1L7 5L3 9" stroke="white" strokeWidth="1.5" fill="none" />
            </svg>
          </button>
          <button className="flex items-center justify-center w-[100px] h-[35px] bg-nhs-blue rounded-[10px] text-[12px] text-white cursor-pointer">
            Export
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex gap-[10px] p-[10px]">
        {/* Time Column */}
        <div className="flex flex-col gap-[20px] pt-[90px]">
          {timeSlots.map((time) => (
            <div
              key={time}
              className="flex items-center justify-center w-[100px] h-[50px] bg-nhs-blue rounded-[10px] text-[14px] font-bold text-white"
            >
              {time}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="flex flex-col items-center p-[10px]">
          {/* Day Headers */}
          <div className="flex gap-[10px] p-[10px]">
            {days.map((day) => (
              <div
                key={day.name}
                className="flex flex-col items-center justify-center w-[120px] h-[50px] bg-nhs-blue rounded-[10px] text-white"
              >
                <span className="text-[14px] font-bold">{day.name}</span>
                <span className="text-[13px] font-bold">{day.date}</span>
              </div>
            ))}
          </div>

          {/* Session Grid Rows */}
          {timeSlots.map((_, timeIdx) => (
            <div key={timeIdx} className="flex gap-[10px] p-[10px]">
              {days.map((_, dayIdx) => {
                const session = sessionMap[`${dayIdx}-${timeIdx}`];
                return (
                  <div
                    key={dayIdx}
                    className={`flex items-start w-[120px] h-[50px] rounded-[10px] p-[5px] cursor-pointer ${
                      session?.unavailable
                        ? "bg-red-100 hover:bg-red-200"
                        : "bg-white hover:bg-gray-50"
                    }`}
                  >
                    {session && (
                      <div className={`text-[13px] leading-tight ${session.unavailable ? "text-red-600" : "text-black"}`}>
                        <p className="font-medium">{session.type}</p>
                        {session.location && <p>{session.location}</p>}
                      </div>
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
