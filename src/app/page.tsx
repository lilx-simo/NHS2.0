"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { authenticate, setSession } from "@/lib/users";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password.");
      return;
    }
    setLoading(true);
    const user = authenticate(username.trim(), password.trim());
    if (!user) {
      setError("Invalid username or password.");
      setLoading(false);
      return;
    }
    setSession(user);
    sessionStorage.setItem("nhs-welcome", user.name);
    localStorage.setItem(`nhs-last-login-${user.id}`, new Date().toISOString());
    router.push("/dashboard");
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(135deg, #003d8f 0%, #005eb8 60%, #0080c8 100%)" }}
    >
      <header className="px-8 py-5 flex items-center">
        <Image src="/nhs-logo.png" alt="NHS Logo" width={80} height={56} priority />
      </header>

      <div className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-[#005eb8] px-8 py-7">
              <h1 className="text-2xl font-bold text-white leading-tight">
                NHS Capacity Planner
              </h1>
              <p className="text-blue-200 text-sm mt-1">
                Sign in to manage weekly capacity &amp; demand
              </p>
            </div>

            <div className="px-8 py-8 space-y-5">
              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                  <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); setError(""); }}
                    placeholder="Enter your username"
                    autoComplete="username"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-slate-800 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#005eb8] focus:border-transparent transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-slate-800 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#005eb8] focus:border-transparent transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#005eb8] hover:bg-[#003d8f] text-white font-semibold rounded-lg transition text-sm shadow-sm disabled:opacity-60"
                >
                  {loading ? "Signing in…" : "Sign In"}
                </button>
              </form>

              <p className="text-xs text-slate-400 text-center pt-1">
                Default admin credentials: <span className="font-mono">admin / admin</span>
              </p>
            </div>
          </div>

          <p className="text-center text-blue-200 text-xs mt-6 opacity-80">
            NHS Weekly Capacity &amp; Demand Planner · Confidential
          </p>
        </div>
      </div>
    </div>
  );
}
