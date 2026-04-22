"use client";

import { useState } from "react";
import {
  getWeeks,
  getClinicians,
  getAvailableWeeks,
} from "@/data";

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function TimetablePage() {
  const allWeeks = getWeeks();
  const availableWeeks = getAvailableWeeks();
  const clinicians = getClinicians();

  const [weekIdx, setWeekIdx] = useState(0);
  const [selectedClinicianId, setSelectedClinicianId] = useState<number | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const currentWeekStart = availableWeeks[weekIdx];
  const currentWeek = allWeeks[weekIdx];

  // Filter sessions by clinician if selected
  const sessions = currentWeek
    ? selectedClinicianId
      ? currentWeek.sessions.filter((s) => s.clinicianId === selectedClinicianId)
      : currentWeek.sessions
    : [];

  // Build slot cards from real slot totals
  const slotTotals = currentWeek?.slotTotals ?? {
    NewSRH: 0, Review: 0, NCP: 0, NMWM: 0, Nwash: 0, "Nurse led": 0,
  };

  const slotCards = [
    { label: "NewSRH", value: slotTotals.NewSRH ?? 0, unit: "slots this week" },
    { label: "NCP", value: slotTotals.NCP ?? 0, unit: "slots this week" },
    { label: "Review", value: slotTotals.Review ?? 0, unit: "slots this week" },
    { label: "Nwash", value: slotTotals.Nwash ?? 0, unit: "slots this week" },
    { label: "NMWM", value: slotTotals.NMWM ?? 0, unit: "slots this week" },
    { label: "Nurse Led", value: slotTotals["Nurse led"] ?? 0, unit: "slots this week" },
    { label: "Expected Patients", value: currentWeek?.totalClinicSlots ?? 0, unit: "patients this week" },
    { label: "Total Sessions", value: sessions.length, unit: "sessions this week" },
  ];

  // Build table rows from sessions
  const sessionRows = sessions.map((s) => {
    // Compute the actual date from weekStart + day offset
    const dayIdx = DAY_NAMES.indexOf(s.day);
    const d = new Date(currentWeekStart + "T00:00:00");
    d.setDate(d.getDate() + dayIdx);
    const dateStr = `${d.getDate()} ${d.toLocaleString("en-GB", { month: "short" })}`;

    const clinician = clinicians.find((c) => c.id === s.clinicianId);

    // Determine if this is an "Additional" session (extra types)
    const isAdditional = s.sessionType.toLowerCase().includes("extra");

    return {
      date: dateStr,
      clinicType: s.sessionType,
      location: s.location,
      expectedPatients: "-",
      note: clinician ? `Clinician ${clinician.label}` : "",
      type: isAdditional ? "Additional" : "Core",
    };
  });

  const tableHeaders = [
    "Date",
    "Clinic Type",
    "Location",
    "Expected Patients",
    "Note",
    "Type",
  ];

  const prevWeek = () => setWeekIdx((i) => Math.max(0, i - 1));
  const nextWeek = () => setWeekIdx((i) => Math.min(availableWeeks.length - 1, i + 1));

  const selectedLabel = selectedClinicianId
    ? `Clinician ${clinicians.find((c) => c.id === selectedClinicianId)?.label ?? ""}`
    : "";

  return (
    <div className="p-[10px] overflow-auto">
      {/* Top Controls */}
      <div className="flex items-center justify-between mb-[10px] px-[20px] py-[10px]">
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

      {/* Appointment Type Summary Cards */}
      <div className="flex flex-wrap gap-[26px] justify-center px-[10px] py-[10px]">
        {slotCards.map((card) => (
          <div
            key={card.label}
            className="relative w-[240px] h-[151px] bg-white rounded-[20px] p-[17px]"
          >
            <p className="text-[20px] font-bold text-[#5e5e5e]">
              {card.label}
            </p>
            <p className="text-[75px] font-bold text-black leading-none ">
              {card.value}
            </p>
            <p className="text-[20px] text-black absolute bottom-[17px] left-[17px]">
              {card.unit}
            </p>
          </div>
        ))}
      </div>

      {/* Session Details Table */}
      <div className="px-[10px] py-[10px] mt-[20px]">
        <div className="overflow-hidden rounded-[10px]">
          {/* Table Header */}
          <div className="flex">
            {tableHeaders.map((header) => (
              <div
                key={header}
                className="flex items-center w-[173px] h-[50px] bg-nhs-blue border-[0.4px] border-[#e2e2e2] px-[20px]"
              >
                <span className="text-[15px] text-white">{header}</span>
              </div>
            ))}
          </div>

          {/* Table Rows */}
          {sessionRows.length === 0 ? (
            <div className="flex items-center justify-center h-[50px] bg-[#e2e2e2]">
              <span className="text-[15px] text-[#0f0f0f]">No sessions this week</span>
            </div>
          ) : (
            sessionRows.map((row, i) => (
              <div key={i} className="flex">
                <div className="flex items-center w-[173px] h-[50px] bg-[#e2e2e2] border-[0.4px] border-nhs-blue px-[20px]">
                  <span className="text-[15px] text-[#0f0f0f]">{row.date}</span>
                </div>
                <div className="flex items-center w-[173px] h-[50px] bg-[#e2e2e2] border-[0.4px] border-nhs-blue px-[20px]">
                  <span className="text-[15px] text-[#0f0f0f]">
                    {row.clinicType}
                  </span>
                </div>
                <div className="flex items-center w-[173px] h-[50px] bg-[#e2e2e2] border-[0.4px] border-nhs-blue px-[20px]">
                  <span className="text-[15px] text-[#0f0f0f]">
                    {row.location}
                  </span>
                </div>
                <div className="flex items-center w-[173px] h-[50px] bg-[#e2e2e2] border-[0.4px] border-nhs-blue px-[20px]">
                  <span className="text-[15px] text-[#0f0f0f]">
                    {row.expectedPatients}
                  </span>
                </div>
                <div className="flex items-center w-[173px] h-[50px] bg-[#e2e2e2] border-[0.4px] border-nhs-blue px-[20px]">
                  <span className="text-[15px] text-[#0f0f0f]">{row.note}</span>
                </div>
                <div className="flex items-center w-[173px] h-[50px] bg-[#e2e2e2] border-[0.4px] border-nhs-blue px-[20px]">
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
