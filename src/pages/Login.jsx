// =============================================================
// Login.jsx — NICU Command Center Clinical Authentication Gate
// Modern Clinical White & Blue Design System
// Role-based clinical flows: Doctor, Nurse, Admin, and Family Portal
// =============================================================

import { useState } from "react";
import { Shield, Eye, EyeOff, Activity, Lock, User, AlertCircle, HeartPulse, Stethoscope, Baby, CheckCircle2 } from "lucide-react";

const DEMO_ACCOUNTS = [
  { username: "dr.meera", password: "doctor@1234", role: "Doctor", label: "Lead Doctor", icon: Stethoscope },
  { username: "nurse.priya", password: "nurse@1234", role: "Nurse", label: "Care Nurse", icon: HeartPulse },
  { username: "admin", password: "nicu@admin2024", role: "Administrator", label: "Administrator", icon: Shield },
  { username: "parent", password: "parent@1234", role: "Patient", label: "Family Portal", icon: Baby },
];

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("dr.meera");
  const [password, setPassword] = useState("doctor@1234");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const API_BASE =
        import.meta.env.VITE_API_BASE_URL ||
        (window.location.hostname !== "localhost" ? "/api" : "http://localhost:5000/api");

      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim().toLowerCase(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed. Please verify credentials.");
        return;
      }

      // Persist session
      sessionStorage.setItem("nicu_user", JSON.stringify(data.user));
      onLogin(data.user);
    } catch (err) {
      // Offline fallback for demo if backend is cold
      const localMatch = DEMO_ACCOUNTS.find(
        (a) => a.username === username.trim().toLowerCase() && a.password === password
      );
      if (localMatch) {
        const fallbackUser = {
          id: localMatch.username === "dr.meera" ? "DOC-01" : localMatch.username === "nurse.priya" ? "NUR-01" : localMatch.username === "parent" ? "PAT-01" : "ADMIN-01",
          name: localMatch.username === "dr.meera" ? "Dr. Meera Vasudevan" : localMatch.username === "nurse.priya" ? "Nurse Priya Thomas" : localMatch.username === "parent" ? "Ramesh & Priya (Family)" : "Administrator",
          shortName: localMatch.label,
          role: localMatch.role,
          username: localMatch.username,
        };
        sessionStorage.setItem("nicu_user", JSON.stringify(fallbackUser));
        onLogin(fallbackUser);
      } else {
        setError("Cannot connect to server. Please check backend connectivity or use quick role selector.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const quickLogin = (account) => {
    setUsername(account.username);
    setPassword(account.password);
    setError("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-sky-100 flex items-center justify-center p-4 sm:p-6 font-sans relative overflow-hidden">
      {/* Subtle modern hospital ambient rings */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-blue-200/40 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-sky-200/40 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        
        {/* Hospital Branding Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-700 to-blue-500 text-white shadow-xl shadow-blue-500/25 mb-3">
            <Activity size={32} strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            NeoCare Command Center
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Continuous Neonatal Telemetry &amp; Critical Care System
          </p>
        </div>

        {/* Clinical Login Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200/80 backdrop-blur-md">
          <div className="flex items-center gap-2 pb-4 mb-5 border-b border-slate-100">
            <Shield size={16} className="text-blue-600" />
            <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500 font-mono">
              Secure Clinical Portal
            </span>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Clinical Username
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. dr.meera"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Secure Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <span>Authenticating Credentials...</span>
              ) : (
                <>
                  <Shield size={15} />
                  <span>Sign In to Clinical Console</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Role Switcher for Seamless Testing & Demonstration */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <span className="block text-[10.5px] uppercase font-bold text-slate-400 tracking-wider mb-2.5 text-center">
              One-Click Role Selection
            </span>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((acc) => {
                const IconComponent = acc.icon;
                const isSelected = username === acc.username;
                return (
                  <button
                    key={acc.username}
                    type="button"
                    onClick={() => quickLogin(acc)}
                    className={`p-2 rounded-xl text-left border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-blue-50 border-blue-400 text-blue-800 shadow-xs ring-1 ring-blue-400"
                        : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg ${isSelected ? "bg-blue-600 text-white" : "bg-white text-slate-500 border border-slate-200"}`}>
                      <IconComponent size={13} />
                    </div>
                    <div className="truncate">
                      <div className="text-[11px] font-bold leading-tight">{acc.label}</div>
                      <div className="text-[9.5px] text-slate-400 font-mono">{acc.username}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Security Badge */}
        <div className="text-center mt-5 text-[11px] text-slate-500 font-medium">
          Protected by AES-256 encrypted MQTT telemetry &amp; HIPAA-compliant audit logs
        </div>
      </div>
    </div>
  );
}
