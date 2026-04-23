"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/users";
import { getSettings, saveSettings, type AppSettings } from "@/lib/settings";
import { addAuditEntry } from "@/lib/audit";

const inputCls =
  "w-full px-3 py-2.5 rounded-lg border border-gray-300 text-slate-800 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#005eb8] focus:border-transparent transition bg-white";

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

export default function SettingsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({
    orgName: "NHS Sexual Health Services",
    varianceAmber: 5,
    varianceRed: 10,
    autoJumpToCurrentWeek: true,
  });
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) { router.push("/"); return; }
    if (user.role !== "admin") { router.push("/dashboard"); return; }
    setSettings(getSettings());
    setReady(true);
  }, [router]);

  const handleSave = () => {
    if (!settings.orgName.trim()) { setError("Organisation name cannot be empty."); return; }
    if (settings.varianceAmber >= settings.varianceRed) {
      setError("Amber threshold must be less than the red threshold.");
      return;
    }
    saveSettings(settings);
    addAuditEntry("App settings updated");
    setError("");
    setSuccess("Settings saved successfully.");
    setTimeout(() => setSuccess(""), 3000);
  };

  const handleReset = () => {
    const defaults: AppSettings = {
      orgName: "NHS Sexual Health Services",
      varianceAmber: 5,
      varianceRed: 10,
      autoJumpToCurrentWeek: true,
    };
    saveSettings(defaults);
    setSettings(defaults);
    addAuditEntry("App settings reset to defaults");
    setSuccess("Settings reset to defaults.");
    setTimeout(() => setSuccess(""), 3000);
  };

  if (!ready) return null;

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
        <p className="text-slate-500 text-sm mt-0.5">Configure application-wide preferences</p>
      </div>

      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-3 text-sm">
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Organisation */}
      <Section title="Organisation" subtitle="Displayed in reports and exports">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700">Organisation Name</label>
          <input
            value={settings.orgName}
            onChange={(e) => setSettings({ ...settings, orgName: e.target.value })}
            className={inputCls}
            placeholder="e.g. NHS Sexual Health Services"
          />
        </div>
      </Section>

      {/* Variance Thresholds */}
      <Section title="Variance Thresholds" subtitle="Controls colour-coding on dashboard and report pages">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">
              <span className="inline-block w-3 h-3 rounded-full bg-amber-400 mr-1.5 align-middle" />
              Amber threshold (%)
            </label>
            <input
              type="number"
              min={1}
              max={99}
              value={settings.varianceAmber}
              onChange={(e) => setSettings({ ...settings, varianceAmber: parseInt(e.target.value) || 0 })}
              className={inputCls}
            />
            <p className="text-xs text-slate-400">Variance at or above this value shows amber</p>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">
              <span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-1.5 align-middle" />
              Red threshold (%)
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={settings.varianceRed}
              onChange={(e) => setSettings({ ...settings, varianceRed: parseInt(e.target.value) || 0 })}
              className={inputCls}
            />
            <p className="text-xs text-slate-400">Variance at or above this value shows red</p>
          </div>
        </div>

        {/* Preview */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Colour Preview</p>
          <div className="flex gap-3 flex-wrap text-xs font-semibold">
            <span className="px-3 py-1 rounded-full bg-green-100 text-green-800">
              0 – {settings.varianceAmber - 1}% · On target
            </span>
            <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800">
              {settings.varianceAmber} – {settings.varianceRed - 1}% · Monitor
            </span>
            <span className="px-3 py-1 rounded-full bg-red-100 text-red-800">
              {settings.varianceRed}%+ · Action needed
            </span>
          </div>
        </div>
      </Section>

      {/* Navigation */}
      <Section title="Navigation" subtitle="Controls how the app behaves on page load">
        <div className="flex items-start gap-3">
          <button
            onClick={() => setSettings({ ...settings, autoJumpToCurrentWeek: !settings.autoJumpToCurrentWeek })}
            className={`relative w-11 h-6 rounded-full transition-colors shrink-0 mt-0.5 ${
              settings.autoJumpToCurrentWeek ? "bg-[#005eb8]" : "bg-gray-300"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                settings.autoJumpToCurrentWeek ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
          <div>
            <p className="text-sm font-medium text-slate-800">Auto-jump to current week</p>
            <p className="text-xs text-slate-500 mt-0.5">
              When enabled, all planning pages open on the week closest to today rather than the first week.
            </p>
          </div>
        </div>
      </Section>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          className="px-5 py-2.5 bg-[#005eb8] hover:bg-[#003d8f] text-white text-sm font-semibold rounded-lg transition shadow-sm"
        >
          Save Settings
        </button>
        <button
          onClick={handleReset}
          className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-slate-700 text-sm font-medium rounded-lg transition"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}
