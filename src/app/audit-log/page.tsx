"use client";

import { useState, useEffect } from "react";
import { getAuditLog, clearAuditLog, type AuditEntry } from "@/lib/audit";
import { downloadCSV } from "@/lib/export";

const STATIC_ENTRIES: AuditEntry[] = [
  { name: "Planner Lead", timestamp: "06/02/2026, 22:24", action: "3 Sessions Added to Dr Smith Timetable" },
  { name: "Planner Lead", timestamp: "06/02/2026, 23:00", action: "Actual Delivery Data added for Week 8" },
  { name: "Planner Lead", timestamp: "07/02/2026, 09:03", action: "3 Sessions Removed from Dr John" },
  { name: "Planner Lead", timestamp: "07/02/2026, 09:03", action: "3 Additional Sessions Added to Dr Nicky" },
];

function formatTimestamp(ts: string): string {
  return ts;
}

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [search, setSearch] = useState("");
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    const live = getAuditLog();
    setEntries([...live, ...STATIC_ENTRIES]);
  }, []);

  const filtered = entries.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.action.toLowerCase().includes(search.toLowerCase())
  );

  const handleExport = () => {
    downloadCSV(
      filtered.map((e) => ({
        Name: e.name,
        Timestamp: e.timestamp,
        Action: e.action,
      })),
      `audit-log-${new Date().toISOString().split("T")[0]}.csv`
    );
  };

  const handleClear = () => {
    clearAuditLog();
    setEntries(STATIC_ENTRIES);
    setShowClearConfirm(false);
  };

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Audit Log</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {entries.length} recorded actions
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
          <button
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-lg hover:bg-red-100 transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear Log
          </button>
        </div>
      </div>

      {/* Clear confirm */}
      {showClearConfirm && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between gap-4">
          <p className="text-sm text-red-800 font-medium">
            Clear all live audit entries? Static example entries will remain.
          </p>
          <div className="flex gap-2 shrink-0">
            <button onClick={handleClear}
              className="px-3 py-1.5 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition">
              Yes, clear
            </button>
            <button onClick={() => setShowClearConfirm(false)}
              className="px-3 py-1.5 bg-white border border-gray-300 text-slate-700 text-sm rounded-lg hover:bg-gray-50 transition">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or action…"
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 text-slate-800 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#005eb8] focus:border-transparent transition bg-white"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">Action History</h2>
          <span className="text-xs text-slate-400">{filtered.length} entries shown</span>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <svg className="w-10 h-10 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm">No audit entries match your search.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-36">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-44">
                    Timestamp
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#005eb8] flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {row.name[0]?.toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-800 truncate">{row.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
                      {formatTimestamp(row.timestamp)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{row.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
