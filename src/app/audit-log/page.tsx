"use client";

const sampleRows = [
  {
    name: "Planner Lead",
    timestamp: "6/2/2026 22:24",
    action: "3 Sessions Added to Dr Smith Timetable",
  },
  {
    name: "Planner Lead",
    timestamp: "6/2/2026 23:00",
    action: "Actual Delivery Data added for Week 8",
  },
  {
    name: "Planner Lead",
    timestamp: "7/2/2026 9:03",
    action: "3 Sessions Removed from Dr John",
  },
  {
    name: "Planner Lead",
    timestamp: "7/2/2026 9:03",
    action: "3 Additional Sessions Added to Dr Nicky",
  },
];

const tableHeaders = ["Name", "Timestamp", "Action"];

export default function AuditLogPage() {
  return (
    <div className="p-0 overflow-auto">
      {/* Navigation Buttons */}
      <div className="flex items-center justify-end gap-[29px] px-[20px] py-[10px]">
        <button className="flex items-center justify-center gap-[2px] w-[100px] h-[35px] bg-nhs-blue rounded-[10px] text-[12px] text-white cursor-pointer">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M7 1L3 5L7 9" stroke="white" strokeWidth="1.5" />
          </svg>
          Prev Week
        </button>
        <button className="flex items-center justify-center gap-[2px] w-[100px] h-[35px] bg-nhs-blue rounded-[10px] text-[12px] text-white cursor-pointer">
          Next Week
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M3 1L7 5L3 9" stroke="white" strokeWidth="1.5" />
          </svg>
        </button>
        <button className="flex items-center justify-center w-[100px] h-[35px] bg-nhs-blue rounded-[10px] text-[12px] text-white cursor-pointer">
          Export
        </button>
      </div>

      {/* Audit Log Table */}
      <div className="px-[20px] pb-[20px]">
        <div className="overflow-hidden rounded-[10px]">
          {/* Table Header */}
          <div className="flex">
            <div className="flex items-center w-[173px] h-[50px] bg-nhs-blue border-[0.4px] border-[#e2e2e2] px-[20px] rounded-tl-[10px]">
              <span className="text-[15px] text-white">Name</span>
            </div>
            <div className="flex items-center w-[173px] h-[50px] bg-nhs-blue border-[0.4px] border-[#e2e2e2] px-[20px]">
              <span className="text-[15px] text-white">Timestamp</span>
            </div>
            <div className="flex items-center flex-1 h-[50px] bg-nhs-blue border-[0.4px] border-[#e2e2e2] px-[20px] rounded-tr-[10px]">
              <span className="text-[15px] text-white">Action</span>
            </div>
          </div>

          {/* Table Rows */}
          {sampleRows.map((row, i) => (
            <div key={i} className="flex">
              <div
                className={`flex items-center w-[173px] h-[50px] bg-[#e2e2e2] border-[0.4px] border-nhs-blue px-[20px] ${
                  i === sampleRows.length - 1 ? "rounded-bl-[10px]" : ""
                }`}
              >
                <span className="text-[15px] text-[#0f0f0f]">{row.name}</span>
              </div>
              <div className="flex items-center w-[173px] h-[50px] bg-[#e2e2e2] border-[0.4px] border-nhs-blue px-[20px]">
                <span className="text-[15px] text-[#0f0f0f]">
                  {row.timestamp}
                </span>
              </div>
              <div
                className={`flex items-center flex-1 h-[50px] bg-[#e2e2e2] border-[0.4px] border-nhs-blue px-[20px] ${
                  i === sampleRows.length - 1 ? "rounded-br-[10px]" : ""
                }`}
              >
                <span className="text-[15px] text-[#0f0f0f]">
                  {row.action}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
