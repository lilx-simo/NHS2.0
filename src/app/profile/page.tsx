"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getCurrentUser,
  updateUser,
  setSession,
  ROLE_LABELS,
  ROLE_COLORS,
  DEPARTMENTS,
  type User,
} from "@/lib/users";
import { addAuditEntry } from "@/lib/audit";

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
        <h2 className="text-base font-semibold text-slate-800">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2.5 rounded-lg border border-gray-300 text-slate-800 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#005eb8] focus:border-transparent transition bg-white";

const selectCls =
  "w-full px-3 py-2.5 rounded-lg border border-gray-300 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#005eb8] focus:border-transparent transition bg-white";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  // Personal info
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [infoSuccess, setInfoSuccess] = useState("");
  const [infoError, setInfoError] = useState("");

  // Password
  const [lastLogin, setLastLogin] = useState<string | null>(null);

  // Password
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const [pwError, setPwError] = useState("");

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) { router.push("/"); return; }
    setUser(u);
    setName(u.name);
    setEmail(u.email);
    setDepartment(u.department);
    const raw = localStorage.getItem(`nhs-last-login-${u.id}`);
    if (raw) setLastLogin(new Date(raw).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }));
  }, [router]);

  const saveInfo = () => {
    if (!user) return;
    if (!name.trim()) { setInfoError("Name cannot be empty."); return; }
    const updated = updateUser(user.id, { name: name.trim(), email: email.trim(), department });
    if (!updated) { setInfoError("Failed to save."); return; }
    setSession(updated);
    setUser(updated);
    addAuditEntry(`Profile updated: ${updated.name}`);
    setInfoError("");
    setInfoSuccess("Profile saved successfully.");
    setTimeout(() => setInfoSuccess(""), 3000);
  };

  const savePassword = () => {
    if (!user) return;
    if (!currentPw) { setPwError("Enter your current password."); return; }
    if (currentPw !== user.password) { setPwError("Current password is incorrect."); return; }
    if (newPw.length < 4) { setPwError("New password must be at least 4 characters."); return; }
    if (newPw !== confirmPw) { setPwError("New passwords do not match."); return; }
    updateUser(user.id, { password: newPw });
    addAuditEntry("Password changed");
    setPwError("");
    setPwSuccess("Password updated successfully.");
    setCurrentPw(""); setNewPw(""); setConfirmPw("");
    setTimeout(() => setPwSuccess(""), 3000);
  };

  if (!user) return null;

  const initial = user.name[0]?.toUpperCase() ?? "U";
  const roleLabel = ROLE_LABELS[user.role];
  const roleColor = ROLE_COLORS[user.role];

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">My Profile</h1>
        <p className="text-slate-500 text-sm mt-0.5">Manage your account details and password</p>
      </div>

      {/* Avatar + role card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-5">
        <div className="w-20 h-20 rounded-full bg-[#005eb8] flex items-center justify-center text-white text-3xl font-bold shrink-0">
          {initial}
        </div>
        <div>
          <p className="text-xl font-bold text-slate-800">{user.name}</p>
          <p className="text-sm text-slate-500 mt-0.5">{user.email || user.username}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${roleColor}`}>
              {roleLabel}
            </span>
            <span className="text-xs text-slate-400">{user.department}</span>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <Section title="Personal Information" subtitle="Update your display name, email and department">
        {infoSuccess && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-3 text-sm mb-4">
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            {infoSuccess}
          </div>
        )}
        {infoError && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">
            {infoError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">Full Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Your full name" />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">Username</label>
            <input value={user.username} readOnly className={`${inputCls} bg-gray-50 text-slate-400 cursor-not-allowed`} />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="your@nhs.net" />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">Department</label>
            <select value={department} onChange={(e) => setDepartment(e.target.value)} className={selectCls}>
              <option value="">Select department</option>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">Role</label>
            <div className={`px-3 py-2.5 rounded-lg border border-gray-100 bg-gray-50 flex items-center gap-2`}>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${roleColor}`}>{roleLabel}</span>
              <span className="text-xs text-slate-400">(managed by admin)</span>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <button onClick={saveInfo} className="px-5 py-2.5 bg-[#005eb8] hover:bg-[#003d8f] text-white text-sm font-semibold rounded-lg transition shadow-sm">
            Save Changes
          </button>
        </div>
      </Section>

      {/* Change Password */}
      <Section title="Change Password" subtitle="Leave blank to keep your current password">
        {pwSuccess && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-3 text-sm mb-4">
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            {pwSuccess}
          </div>
        )}
        {pwError && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">
            {pwError}
          </div>
        )}

        <div className="space-y-4 max-w-sm">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">Current Password</label>
            <input type="password" value={currentPw} onChange={(e) => { setCurrentPw(e.target.value); setPwError(""); }} className={inputCls} placeholder="••••••••" autoComplete="current-password" />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">New Password</label>
            <input type="password" value={newPw} onChange={(e) => { setNewPw(e.target.value); setPwError(""); }} className={inputCls} placeholder="••••••••" autoComplete="new-password" />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">Confirm New Password</label>
            <input type="password" value={confirmPw} onChange={(e) => { setConfirmPw(e.target.value); setPwError(""); }} className={inputCls} placeholder="••••••••" autoComplete="new-password" />
          </div>
        </div>

        <div className="mt-5">
          <button onClick={savePassword} className="px-5 py-2.5 bg-[#005eb8] hover:bg-[#003d8f] text-white text-sm font-semibold rounded-lg transition shadow-sm">
            Update Password
          </button>
        </div>
      </Section>

      {/* Account info */}
      <Section title="Account Details">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">User ID</p>
            <p className="text-slate-800 mt-0.5 font-mono text-xs">{user.id}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Account Created</p>
            <p className="text-slate-800 mt-0.5">{user.createdAt}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Last Login</p>
            <p className="text-slate-800 mt-0.5">{lastLogin ?? "—"}</p>
          </div>
        </div>
      </Section>
    </div>
  );
}
