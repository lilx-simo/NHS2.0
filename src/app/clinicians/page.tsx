"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/users";
import {
  getManagedClinicians,
  addManagedClinician,
  updateManagedClinician,
  deleteManagedClinician,
  SEED_IDS,
  SPECIALTIES,
  type ManagedClinician,
} from "@/lib/clinicians";
import { addAuditEntry } from "@/lib/audit";

const EMPTY_FORM = { name: "", specialty: "Sexual Health", email: "", active: true };

const inputCls =
  "w-full px-3 py-2.5 rounded-lg border border-gray-300 text-slate-800 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#005eb8] focus:border-transparent transition bg-white";
const selectCls =
  "w-full px-3 py-2.5 rounded-lg border border-gray-300 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#005eb8] focus:border-transparent transition bg-white";

export default function CliniciansPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [clinicians, setClinicians] = useState<ManagedClinician[]>([]);
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  // Delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) { router.push("/"); return; }
    if (user.role !== "admin") { router.push("/dashboard"); return; }
    setClinicians(getManagedClinicians());
    setReady(true);
  }, [router]);

  const refresh = () => setClinicians(getManagedClinicians());

  const filtered = clinicians
    .filter((c) => {
      if (filterActive === "active" && !c.active) return false;
      if (filterActive === "inactive" && c.active) return false;
      const q = search.toLowerCase();
      return !q || c.name.toLowerCase().includes(q) || c.specialty.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
    });

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormError("");
    setModalOpen(true);
  };

  const openEdit = (c: ManagedClinician) => {
    setForm({ name: c.name, specialty: c.specialty, email: c.email, active: c.active });
    setEditingId(c.id);
    setFormError("");
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) { setFormError("Name is required."); return; }
    if (editingId !== null) {
      updateManagedClinician(editingId, { ...form, name: form.name.trim() });
      addAuditEntry(`Clinician updated: ${form.name.trim()}`);
    } else {
      addManagedClinician({ ...form, name: form.name.trim() });
      addAuditEntry(`Clinician added: ${form.name.trim()}`);
    }
    refresh();
    setModalOpen(false);
  };

  const handleToggleActive = (c: ManagedClinician) => {
    updateManagedClinician(c.id, { active: !c.active });
    addAuditEntry(`Clinician ${c.active ? "deactivated" : "reactivated"}: ${c.name}`);
    refresh();
  };

  const handleDelete = (id: number) => {
    const c = clinicians.find((x) => x.id === id);
    deleteManagedClinician(id);
    addAuditEntry(`Clinician deleted: ${c?.name ?? id}`);
    refresh();
    setConfirmDeleteId(null);
  };

  if (!ready) return null;

  const total = clinicians.length;
  const active = clinicians.filter((c) => c.active).length;
  const inactive = total - active;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Clinician Directory</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage clinician profiles and availability status</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#005eb8] hover:bg-[#003d8f] text-white text-sm font-semibold rounded-lg transition shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Clinician
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total", value: total, color: "bg-blue-50 border-blue-200 text-blue-800" },
          { label: "Active", value: active, color: "bg-green-50 border-green-200 text-green-800" },
          { label: "Inactive", value: inactive, color: "bg-slate-50 border-slate-200 text-slate-700" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border p-4 text-center ${s.color}`}>
            <p className="text-3xl font-bold">{s.value}</p>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-70 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, specialty or email…"
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 text-sm text-slate-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#005eb8] focus:border-transparent bg-white"
          />
        </div>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
          {(["all", "active", "inactive"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setFilterActive(v)}
              className={`px-3 py-2 font-medium capitalize transition ${filterActive === v ? "bg-[#005eb8] text-white" : "bg-white text-slate-600 hover:bg-gray-50"}`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">Clinicians</h2>
          <span className="text-xs text-slate-400">{filtered.length} shown</span>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <svg className="w-10 h-10 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-sm">No clinicians match your filter</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["Clinician", "Specialty", "Email", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((c) => (
                  <tr key={c.id} className={`hover:bg-gray-50 transition-colors ${!c.active ? "opacity-50" : ""}`}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#005eb8] flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {c.name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{c.name}</p>
                          <p className="text-xs text-slate-400">ID #{c.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{c.specialty || "—"}</td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">{c.email || "—"}</td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => handleToggleActive(c)}
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold transition ${
                          c.active
                            ? "bg-green-100 text-green-800 hover:bg-green-200"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {c.active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(c)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#005eb8] hover:bg-blue-50 transition"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {!SEED_IDS.has(c.id) && (
                          confirmDeleteId === c.id ? (
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleDelete(c.id)} className="px-2 py-1 text-xs font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
                                Confirm
                              </button>
                              <button onClick={() => setConfirmDeleteId(null)} className="px-2 py-1 text-xs font-medium bg-gray-100 text-slate-600 rounded-lg hover:bg-gray-200 transition">
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(c.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                              title="Delete"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-[#005eb8] flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">
                {editingId !== null ? "Edit Clinician" : "Add New Clinician"}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-white/70 hover:text-white transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {formError && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">{formError}</div>
              )}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">Full Name *</label>
                <input value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setFormError(""); }} className={inputCls} placeholder="Dr. Jane Smith" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">Specialty</label>
                <select value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} className={selectCls}>
                  {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} placeholder="j.smith@nhs.net" />
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setForm({ ...form, active: !form.active })}
                  className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${form.active ? "bg-[#005eb8]" : "bg-gray-300"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.active ? "translate-x-5" : "translate-x-0"}`} />
                </button>
                <span className="text-sm text-slate-700 font-medium">{form.active ? "Active" : "Inactive"}</span>
              </div>
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={handleSave}
                className="px-5 py-2.5 bg-[#005eb8] hover:bg-[#003d8f] text-white text-sm font-semibold rounded-lg transition shadow-sm"
              >
                {editingId !== null ? "Save Changes" : "Add Clinician"}
              </button>
              <button onClick={() => setModalOpen(false)} className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-slate-700 text-sm font-medium rounded-lg transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
