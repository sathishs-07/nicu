// =============================================================
// Login.jsx — NICU Command Center Authentication Gate
// Role-based access: Admin, Doctor, Nurse
// =============================================================

import { useState } from "react";
import { Shield, Eye, EyeOff, Activity, Lock, User, AlertCircle, Cpu } from "lucide-react";

const DEMO_ACCOUNTS = [
  { username: "admin", password: "nicu@admin2024", role: "Administrator", label: "Admin" },
  { username: "dr.meera", password: "doctor@1234", role: "Doctor", label: "Doctor" },
  { username: "nurse.priya", password: "nurse@1234", role: "Nurse", label: "Nurse" },
];

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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
        setError(data.error || "Login failed. Please check credentials.");
        return;
      }

      // Persist session
      sessionStorage.setItem("nicu_user", JSON.stringify(data.user));
      onLogin(data.user);
    } catch (err) {
      setError("Cannot connect to backend. Is the server running on port 5000?");
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
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0a1628 0%, #0d2341 40%, #0a1f3a 70%, #071224 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ambient glow effects */}
      <div style={{
        position: "absolute", top: "-20%", left: "-10%",
        width: "600px", height: "600px",
        background: "radial-gradient(circle, rgba(0, 100, 255, 0.08) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: "-20%", right: "-10%",
        width: "500px", height: "500px",
        background: "radial-gradient(circle, rgba(0, 200, 150, 0.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Grid pattern */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `
          linear-gradient(rgba(0, 120, 255, 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 120, 255, 0.03) 1px, transparent 1px)
        `,
        backgroundSize: "60px 60px",
        pointerEvents: "none",
      }} />

      <div style={{ width: "100%", maxWidth: "420px", position: "relative", zIndex: 1 }}>

        {/* Logo / Branding */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: "72px", height: "72px",
            background: "linear-gradient(135deg, #1a6dff, #0a4fcf)",
            borderRadius: "20px",
            marginBottom: "1rem",
            boxShadow: "0 8px 32px rgba(26, 109, 255, 0.4)",
          }}>
            <Activity size={36} color="white" strokeWidth={2.5} />
          </div>
          <h1 style={{
            fontSize: "1.6rem", fontWeight: 800, color: "#ffffff",
            margin: "0 0 0.3rem 0", letterSpacing: "-0.5px",
          }}>
            NICU Command Center
          </h1>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.85rem", margin: 0 }}>
            Continuous Vital Monitoring System
          </p>
        </div>

        {/* Login Card */}
        <div style={{
          background: "rgba(255, 255, 255, 0.04)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "20px",
          padding: "2rem",
          boxShadow: "0 24px 64px rgba(0, 0, 0, 0.5)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
            <Shield size={16} color="#1a6dff" />
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>
              Secure Clinical Login
            </span>
          </div>

          {error && (
            <div style={{
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "10px",
              padding: "0.75rem 1rem",
              marginBottom: "1rem",
              display: "flex",
              alignItems: "flex-start",
              gap: "0.5rem",
            }}>
              <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: "1px" }} />
              <span style={{ color: "#fca5a5", fontSize: "0.85rem" }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Username */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", color: "rgba(255,255,255,0.6)", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.5rem", letterSpacing: "0.03em" }}>
                Username
              </label>
              <div style={{ position: "relative" }}>
                <User size={16} color="rgba(255,255,255,0.3)" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  required
                  autoFocus
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem 0.75rem 2.75rem",
                    background: "rgba(255, 255, 255, 0.07)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "10px",
                    color: "#ffffff",
                    fontSize: "0.9rem",
                    outline: "none",
                    boxSizing: "border-box",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => e.target.style.borderColor = "rgba(26, 109, 255, 0.6)"}
                  onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.12)"}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", color: "rgba(255,255,255,0.6)", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.5rem", letterSpacing: "0.03em" }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <Lock size={16} color="rgba(255,255,255,0.3)" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  style={{
                    width: "100%",
                    padding: "0.75rem 3rem 0.75rem 2.75rem",
                    background: "rgba(255, 255, 255, 0.07)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "10px",
                    color: "#ffffff",
                    fontSize: "0.9rem",
                    outline: "none",
                    boxSizing: "border-box",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => e.target.style.borderColor = "rgba(26, 109, 255, 0.6)"}
                  onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.12)"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  style={{
                    position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer", padding: "4px",
                    color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center",
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: "100%",
                padding: "0.875rem",
                background: isLoading
                  ? "rgba(26, 109, 255, 0.5)"
                  : "linear-gradient(135deg, #1a6dff, #0a4fcf)",
                border: "none",
                borderRadius: "10px",
                color: "white",
                fontSize: "0.95rem",
                fontWeight: 700,
                cursor: isLoading ? "not-allowed" : "pointer",
                boxShadow: isLoading ? "none" : "0 4px 16px rgba(26, 109, 255, 0.4)",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                letterSpacing: "0.02em",
              }}
            >
              {isLoading ? (
                <>
                  <div style={{
                    width: "16px", height: "16px",
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderTopColor: "white",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                  }} />
                  Authenticating...
                </>
              ) : (
                <>
                  <Shield size={16} />
                  Sign In to Command Center
                </>
              )}
            </button>
          </form>

          {/* Quick login shortcuts */}
          <div style={{ marginTop: "1.5rem" }}>
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.75rem", textAlign: "center", marginBottom: "0.75rem" }}>
              Quick Access (Development)
            </p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.username}
                  onClick={() => quickLogin(acc)}
                  style={{
                    flex: 1,
                    padding: "0.5rem 0.25rem",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    color: "rgba(255,255,255,0.6)",
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    letterSpacing: "0.02em",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = "rgba(26, 109, 255, 0.15)";
                    e.target.style.borderColor = "rgba(26, 109, 255, 0.4)";
                    e.target.style.color = "#60a5fa";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = "rgba(255,255,255,0.05)";
                    e.target.style.borderColor = "rgba(255,255,255,0.1)";
                    e.target.style.color = "rgba(255,255,255,0.6)";
                  }}
                >
                  {acc.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <Cpu size={12} color="rgba(255,255,255,0.25)" />
            <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.72rem" }}>
              ESP32 · HiveMQ MQTT · MongoDB Atlas
            </span>
          </div>
          <p style={{ color: "rgba(255,255,255,0.15)", fontSize: "0.7rem", margin: 0 }}>
            NICU Vital Monitoring System v2.0 · Secure Clinical Access
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: rgba(255,255,255,0.2) !important; }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 1000px rgba(10, 22, 40, 0.9) inset !important;
          -webkit-text-fill-color: white !important;
        }
      `}</style>
    </div>
  );
}
