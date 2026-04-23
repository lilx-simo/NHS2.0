"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getUsers,
  addUser,
  updateUser,
  deleteUser,
  getCurrentUser,
  usernameExists,
  ROLE_LABELS,
  ROLE_COLORS,
  ALL_ROLES,
  DEPARTMENTS,
  type User,
  type UserRole,
} from "@/lib/users";
import { addAuditEntry } from "@/lib/audit";

// ── Types ────────────────────────────────────────────────────────────────────

type ModalState =
  | { mode: "closed" }
  | { mode: "add" }
  | { mode: "edit"; user: User };

const EMPTY_FORM = {
  name: "",
  username: "",
  email: "",
  password: "",
  role: "clinician" as UserRole,
  department: "",
};

// ── Sub-components ───────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${ROLE_COLORS[role]}`}>
      {ROLE_LABELS[role]}
    </span>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-xl border p-4 ${color}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs font-medium mt-0.5 opacity-75">{label}</p>
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2.5 rounded-lg border border-gray-300 text-slate-800 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#005eb8] focus:border-transparent transition bg-white";

const selectCls =
  "w-full px-3 py-2.5 rounded-lg border border-gray-300 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#005eb8] focus:border-transparent transition bg-white";

// ── Main page ────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [modal, setModal] = useState<ModalState>({ mode: "closed" });
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) { router.push("/"); return; }
    if (u.role !== "admin") { router.push("/dashboard"); return; }
    setCurrentUser(u);
    setUsers(getUsers());
  }, [router]);

  const reload = () => setUsers(getUsers());

  const filtered = users.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  // ── Modal handlers ──────────────────────────────────────────────────────

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setFormError("");
    setModal({ mode: "add" });
  };

  const openEdit = (user: User) => {
    setForm({
      name: user.name,
      username: user.username,
      email: user.email,
      password: "",
      role: user.role,
      department: user.department,
    });
    setFormError("");
    setModal({ mode: "edit", user });
  };

  const closeModal = () => { setModal({ mode: "closed" }); setFormError(""); };

  const handleSave = () => {
    if (!form.name.trim()) { setFormError("Name is required."); return; }
    if (!form.username.trim()) { setFormError("Username is required."); return; }

    if (modal.mode === "add") {
      if (!form.password) { setFormError("Password is required for new users."); return; }
      if (usernameExists(form.username.trim())) { setFormError("Username already taken."); return; }
      const newUser = addUser({
        name: form.name.trim(),
        username: form.username.trim().toLowerCase(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        department: form.department,
      });
      addAuditEntry(`New user created: ${newUser.name} (${ROLE_LABELS[newUser.role]})`);
    } else if (modal.mode === "edit") {
      const { user } = modal;
      if (usernameExists(form.username.trim(), user.id)) {
        setFormError("Username already taken."); return;
      }
      const updates: Partial<Omit<User, "id" | "createdAt">> = {
        name: form.name.trim(),
        username: form.username.trim().toLowerCase(),
        email: form.email.trim(),
        role: form.role,
        department: form.department,
      };
      if (form.password) updates.password = form.password;

      const prev = user.role;
      updateUser(user.id, updates);
      if (form.role !== prev) {
        addAuditEntry(
          `Role changed: ${form.name} — ${ROLE_LABELS[prev]} → ${ROLE_LABELS[form.role]}`
        );
      } else {
        addAuditEntry(`User updated: ${form.name}`);
      }
    }

    reload();
    closeModal();
  };

  const handleDelete = (id: string) => {
    const u = users.find((x) => x.id === id);
    if (!u) return;
    deleteUser(id);
    addAuditEntry(`User deleted: ${u.name} (${ROLE_LABELS[u.role]})`);
    reload();
    setDeleteConfirm(null);
  };

  // ── Stats ───────────────────────────────────────────────────────────────

  const counts = {
    total: users.length,
    admin: users.filter((u) => u.role === "admin").length,
    planner: users.filter((u) => u.role === "planner").length,
    doctor: users.filter((u) => u.role === "doctor").length,
    nurse: users.filter((u) => u.role === "nurse").length,
    clinician: users.filter((u) => u.role === "clinician").length,
  };

  if (!currentUser) return null;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">User Management</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Manage staff accounts, roles and access
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#005eb8] hover:bg-[#003d8f] text-white text-sm font-semibold rounded-lg transition shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add User
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        <StatCard label="Total Users" value={counts.total} color="bg-white border-gray-200 text-slate-800" />
        <StatCard label="Admin" value={counts.admin} color="bg-purple-50 border-purple-200 text-purple-800" />
        <StatCard label="Planner" value={counts.planner} color="bg-blue-50 border-blue-200 text-blue-800" />
        <StatCard label="Doctor" value={counts.doctor} color="bg-orange-50 border-orange-200 text-orange-800" />
        <StatCard label="Nurse" value={counts.nurse} color="bg-pink-50 border-pink-200 text-pink-800" />
        <StatCard label="Clinician" value={counts.clinician} color="bg-emerald-50 border-emerald-200 text-emerald-800" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users…"
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 text-slate-800 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#005eb8] focus:border-transparent transition bg-white"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {(["all", ...ALL_ROLES] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r as UserRole | "all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                roleFilter === r
                  ? "bg-[#005eb8] text-white"
                  : "bg-white border border-gray-200 text-slate-600 hover:bg-gray-50"
              }`}
            >
              {r === "all" ? "All Roles" : ROLE_LABELS[r as UserRole]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">Staff Directory</h2>
          <span className="text-xs text-slate-400">{filtered.length} users</span>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <svg className="w-10 h-10 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-sm">No users match your search.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["User", "Role", "Department", "Email", "Joined", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((u) => {
                  const isMe = u.id === currentUser.id;
                  const confirmingDelete = deleteConfirm === u.id;
                  return (
                    <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${isMe ? "bg-blue-50/40" : ""}`}>
                      {/* User */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#005eb8] flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {u.name[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                              {u.name}
                              {isMe && (
                                <span className="text-xs text-[#005eb8] font-normal">(you)</span>
                              )}
                            </p>
                            <p className="text-xs text-slate-400 font-mono">@{u.username}</p>
                          </div>
                        </div>
                      </td>
                      {/* Role */}
                      <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                      {/* Dept */}
                      <td className="px-4 py-3 text-slate-600 text-xs">{u.department || "—"}</td>
                      {/* Email */}
                      <td className="px-4 py-3 text-slate-600 text-xs">{u.email || "—"}</td>
                      {/* Joined */}
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{u.createdAt}</td>
                      {/* Actions */}
                      <td className="px-4 py-3">
                        {confirmingDelete ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-red-700 font-medium">Delete?</span>
                            <button onClick={() => handleDelete(u.id)}
                              className="px-2 py-1 bg-red-600 text-white text-xs rounded-md hover:bg-red-700 transition">
                              Yes
                            </button>
                            <button onClick={() => setDeleteConfirm(null)}
                              className="px-2 py-1 bg-gray-100 text-slate-700 text-xs rounded-md hover:bg-gray-200 transition">
                              No
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEdit(u)}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 text-[#005eb8] text-xs font-medium rounded-lg hover:bg-blue-100 transition"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </button>
                            {!isMe && (
                              <button
                                onClick={() => setDeleteConfirm(u.id)}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 text-red-600 text-xs font-medium rounded-lg hover:bg-red-100 transition"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add / Edit Modal ── */}
      {modal.mode !== "closed" && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Modal header */}
            <div className="bg-[#005eb8] px-6 py-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">
                  {modal.mode === "add" ? "Add New User" : "Edit User"}
                </h3>
                <p className="text-blue-200 text-xs mt-0.5">
                  {modal.mode === "add" ? "Create a new staff account" : `Editing ${modal.user.name}`}
                </p>
              </div>
              <button onClick={closeModal} className="text-white/70 hover:text-white transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal body */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {formError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                  <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">Full Name *</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="Full name" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">Username *</label>
                  <input
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className={modal.mode === "edit" ? `${inputCls} bg-gray-50` : inputCls}
                    placeholder="username"
                    readOnly={modal.mode === "edit"}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">Email</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} placeholder="email@nhs.net" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">
                    {modal.mode === "add" ? "Password *" : "New Password (optional)"}
                  </label>
                  <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputCls} placeholder={modal.mode === "edit" ? "Leave blank to keep current" : "••••••••"} />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">Role *</label>
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })} className={selectCls}>
                    {ALL_ROLES.map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">Department</label>
                  <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className={selectCls}>
                    <option value="">Select department</option>
                    {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              {/* Role preview */}
              <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#005eb8] flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {form.name[0]?.toUpperCase() || "?"}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{form.name || "Name preview"}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_COLORS[form.role]}`}>
                      {ROLE_LABELS[form.role]}
                    </span>
                    <span className="text-xs text-slate-400">{form.department || "No department"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button onClick={closeModal} className="px-4 py-2 bg-white border border-gray-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={handleSave} className="px-4 py-2 bg-[#005eb8] hover:bg-[#003d8f] text-white text-sm font-semibold rounded-lg transition shadow-sm">
                {modal.mode === "add" ? "Create User" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
