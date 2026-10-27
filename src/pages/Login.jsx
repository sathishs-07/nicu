// =============================================================
// Login.jsx — NICU Command Center Clinical Authentication Gate
// Modern High-Contrast Clinical Design System (Light & Dark Theme)
// Roles: Lead Doctor, Care Nurse, and System Administrator
// =============================================================

import { useState } from "react";
import {
  Shield,
  Eye,
  EyeOff,
  Activity,
  Lock,
  User,
  AlertCircle,
  HeartPulse,
  Stethoscope,
  Sun,
  Moon,
  CheckCircle2,
  Cpu,
  ArrowRight,
} from "lucide-react";
import { api } from "../services/api";

const CLINICAL_ROLES = [
  {
    username: "dr.meera",
    password: "doctor@1234",
    role: "Doctor",
    label: "Lead Doctor",
    desc: "Neonatal Intensivist",
    icon: Stethoscope,
    badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  {
    username: "nurse.priya",
    password: "nurse@1234",
    role: "Nurse",
    label: "Care Nurse",
    desc: "Shift Charge Nurse",
    icon: HeartPulse,
    badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  {
    username: "admin",
    password: "nicu@admin2024",
    role: "Administrator",
    label: "Unit Admin",
    desc: "System Administrator",
    icon: Shield,
    badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  },
];

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("dr.meera");
  const [password, setPassword] = useState("doctor@1234");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isDark, setIsDark] = useState(() => {
    return (
      localStorage.getItem("nicu_theme") === "dark" ||
      document.documentElement.classList.contains("dark") ||
      document.documentElement.getAttribute("data-theme") === "dark"
    );
  });

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("nicu_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.setAttribute("data-theme", "light");
      localStorage.setItem("nicu_theme", "light");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const trimmedUser = username.trim().toLowerCase();

    try {
      // 1. Try real backend login
      const data = await api.login(trimmedUser, password);
      if (data && data.user) {
        sessionStorage.setItem("nicu_user", JSON.stringify(data.user));
        onLogin(data.user);
        return;
      }
    } catch (err) {
      // If server returns explicit credential error (401), report it
      if (err.message && (err.message.includes("Invalid") || err.message.includes("credentials"))) {
        setError(err.message);
        setIsLoading(false);
        return;
      }

      // Offline / disconnected fallback for accredited preset accounts
      const localMatch = CLINICAL_ROLES.find(
        (a) => a.username === trimmedUser && a.password === password
      );

      if (localMatch) {
        const fallbackUser = {
          id:
            localMatch.username === "dr.meera"
              ? "DOC-01"
              : localMatch.username === "nurse.priya"
              ? "NUR-01"
              : "ADMIN-01",
          name:
            localMatch.username === "dr.meera"
              ? "Dr. Meera Vasudevan"
              : localMatch.username === "nurse.priya"
              ? "Nurse Priya Thomas"
              : "System Administrator",
          shortName: localMatch.label,
          role: localMatch.role,
          username: localMatch.username,
          avatar:
            localMatch.username === "dr.meera"
              ? "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80"
              : localMatch.username === "nurse.priya"
              ? "https://images.unsplash.com/photo-1594824813576-96b610c144a1?w=150&auto=format&fit=crop&q=80"
              : "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80",
        };
        sessionStorage.setItem("nicu_user", JSON.stringify(fallbackUser));
        onLogin(fallbackUser);
        return;
      } else {
        setError("Invalid credentials or disconnected. Please select a quick role below to test.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const quickSelectRole = (acc) => {
    setUsername(acc.username);
    setPassword(acc.password);
    setError("");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070b14] text-slate-900 dark:text-slate-100 flex items-center justify-center p-4 sm:p-6 font-sans relative overflow-hidden transition-colors duration-200">
      {/* Ambient background glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-blue-500/10 dark:bg-blue-600/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-cyan-500/10 dark:bg-cyan-600/15 blur-3xl pointer-events-none" />

      {/* Top Controls: Theme Switcher & Status */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shadow-xs cursor-pointer"
          title={`Switch to ${isDark ? "Light Mode" : "Dark Mode"}`}
        >
          {isDark ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} className="text-slate-600" />}
        </button>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Hospital Branding Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-700 to-blue-500 text-white shadow-xl shadow-blue-500/25 mb-3.5">
            <Activity size={32} strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            NeoCare Command Center
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
            Level-III NICU Continuous Telemetry &amp; Critical Care
          </p>
        </div>

        {/* Clinical Authentication Card */}
        <div className="bg-white dark:bg-slate-900/90 rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200/80 dark:border-slate-800 backdrop-blur-md">
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-blue-600 dark:text-blue-400" />
              <span className="text-[11px] font-bold tracking-wider uppercase text-slate-600 dark:text-slate-400 font-mono">
                Staff Authorization
              </span>
            </div>
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Online
            </span>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 animate-shake">
              <AlertCircle size={15} className="flex-shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
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
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Staff Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
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
                <span>Verifying Credentials...</span>
              ) : (
                <>
                  <Shield size={15} />
                  <span>Enter Clinical Command Station</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          {/* Clinical Staff Quick Selector */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
            <span className="block text-[10.5px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider mb-2.5 text-center font-mono">
              Quick Role Testing Selection
            </span>
            <div className="grid grid-cols-3 gap-2">
              {CLINICAL_ROLES.map((acc) => {
                const IconComponent = acc.icon;
                const isSelected = username === acc.username;
                return (
                  <button
                    key={acc.username}
                    type="button"
                    onClick={() => quickSelectRole(acc)}
                    className={`p-2.5 rounded-xl text-center border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-blue-50 dark:bg-blue-900/40 border-blue-400 dark:border-blue-500 text-blue-800 dark:text-blue-300 shadow-xs ring-1 ring-blue-400/50"
                        : "bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        isSelected
                          ? "bg-blue-600 text-white"
                          : "bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-slate-600"
                      }`}
                    >
                      <IconComponent size={14} />
                    </div>
                    <div className="w-full truncate">
                      <div className="text-[11px] font-bold leading-tight truncate">
                        {acc.label}
                      </div>
                      <div className="text-[9px] text-slate-400 dark:text-slate-500 font-mono truncate">
                        {acc.username}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Security Badge */}
        <div className="text-center mt-5 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
          NABH &amp; HIPAA-compliant encrypted hospital telemetry console
        </div>
      </div>
    </div>
  );
}
