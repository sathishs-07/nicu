// =============================================================
// PatientBedCard.jsx — 6-Bed Responsive Patient Vital Station Card
// Features exact layout specified: Bed ID, Patient ID, Baby of [Mother],
// Admission, Status Badge, HR, SpO2, Temp, Doctor, Battery %, Signal Quality,
// Freshness check, and View Patient / View Alerts actions.
// =============================================================

import { useNavigate } from "react-router-dom";
import {
  Heart,
  Droplets,
  Thermometer,
  Battery,
  BatteryCharging,
  BatteryWarning,
  Wifi,
  WifiOff,
  User,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
  Activity,
  AlertCircle,
  Cpu,
} from "lucide-react";

export default function PatientBedCard({ bed, onAcknowledgeAlert, onAssignDevice, waveforms = [] }) {
  const navigate = useNavigate();

  // Freshness calculation: true product check — only connected if active stream in last 25s
  const isHeartbeatPresent = Boolean(bed.lastHeartbeatMs && bed.lastHeartbeatMs > 0);
  const timeSinceHeartbeatSec = isHeartbeatPresent ? Math.round((Date.now() - bed.lastHeartbeatMs) / 1000) : 9999;
  const isLiveConnected = isHeartbeatPresent && timeSinceHeartbeatSec <= 25 && bed.hr !== null && bed.hr > 0;
  const isStale = isHeartbeatPresent && timeSinceHeartbeatSec > 18;

  // Derive display status
  let statusBadge = {
    label: "Live Telemetry",
    color: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800",
    dot: "bg-emerald-500 animate-pulse",
  };

  if (bed.activeAlerts && bed.activeAlerts.length > 0) {
    const hasUrgent = bed.activeAlerts.some((a) => a.priority === "Urgent");
    statusBadge = {
      label: hasUrgent ? "Critical Alert" : "Clinical Warning",
      color: "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800",
      dot: "bg-rose-500 animate-ping",
    };
  } else if (!isLiveConnected) {
    statusBadge = {
      label: "Standby — Awaiting ESP32",
      color: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700",
      dot: "bg-slate-400",
    };
  }

  // Mini Sparkline Generator
  const renderSparkline = () => {
    if (!isLiveConnected) {
      return (
        <div className="w-full h-7 flex items-center justify-center my-1 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 text-[10.5px] font-mono text-slate-400 dark:text-slate-500">
          <Activity size={12} className="mr-1.5 opacity-60" />
          Sensor Standby · Connect ESP32
        </div>
      );
    }

    if (!waveforms || waveforms.length < 5) return null;
    const hrs = waveforms.slice(-20).map((w) => w.hr || 140);
    const min = Math.min(...hrs) - 5;
    const max = Math.max(...hrs) + 5;
    const range = max - min || 1;
    const width = 280;
    const height = 28;

    const points = hrs.map((val, idx) => {
      const x = (idx / (hrs.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const isAlert = bed.activeAlerts && bed.activeAlerts.length > 0;
    const strokeColor = isAlert ? "#ef4444" : "#0d9488";

    return (
      <div className="w-full h-7 overflow-hidden my-1">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
          <polyline
            fill="none"
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points.join(" ")}
          />
        </svg>
      </div>
    );
  };

  // Battery Icon selection
  const renderBattery = () => {
    const pct = bed.batteryPercent;
    let icon = <Battery size={15} className="text-teal-600 dark:text-teal-400" />;
    let textCol = "text-slate-700 dark:text-slate-200";

    if (pct <= 25) {
      icon = <BatteryWarning size={15} className="text-amber-500 animate-bounce" />;
      textCol = "text-amber-600 dark:text-amber-400 font-bold";
    }

    return (
      <div className="flex items-center gap-1 font-mono text-xs" title={`ESP32 Battery: ${pct}%`}>
        {icon}
        <span className={textCol}>{pct}%</span>
      </div>
    );
  };

  return (
    <div
      className={`clinical-card flex flex-col justify-between p-4 sm:p-5 relative transition-all duration-200 ${
        bed.activeAlerts && bed.activeAlerts.length > 0
          ? "border-red-300 dark:border-red-900/60 ring-2 ring-red-500/20 bg-red-50/10"
          : "hover:border-teal-500/50"
      }`}
    >
      {/* ── Top Header: Bed ID, Patient ID, Status Badge ── */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-xs text-slate-500 dark:text-slate-400 tracking-wider">
                BED {bed.bedId}
              </span>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span className="font-mono text-xs font-semibold text-teal-600 dark:text-teal-400">
                {bed.patientId}
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 tracking-tight leading-snug mt-0.5">
              {bed.babyName}
            </h2>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Admission: {bed.admissionDate}
            </div>
          </div>

          {/* Status Badge */}
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold border ${statusBadge.color}`}
          >
            <span className={`w-2 h-2 rounded-full ${statusBadge.dot}`} />
            <span>{statusBadge.label}</span>
          </div>
        </div>

        {/* Mini waveform sparkline */}
        {renderSparkline()}

        {/* ── Center: Vital Signs 3-Col Grid (HR, SpO2, Temperature) ── */}
        <div className="grid grid-cols-3 gap-2.5 my-3.5">
          {/* Heart Rate */}
          <div
            className={`p-2.5 rounded-xl border flex flex-col justify-between transition-colors ${
              !isLiveConnected
                ? "bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800"
                : bed.hr < 100 || bed.hr > 180
                ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800"
                : "bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800"
            }`}
          >
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              <span className="flex items-center gap-1">
                <Heart size={12} className={isLiveConnected ? "text-red-500 animate-pulse" : "text-slate-400"} />
                HR
              </span>
              <span className="font-mono text-[10px]">bpm</span>
            </div>
            <div className="my-1">
              <div
                className={`text-2xl font-bold font-mono tracking-tight leading-none ${
                  !isLiveConnected
                    ? "text-slate-400 dark:text-slate-600"
                    : bed.hr < 100 || bed.hr > 180
                    ? "text-rose-600 dark:text-rose-400 font-extrabold"
                    : "text-slate-800 dark:text-slate-100"
                }`}
              >
                {!isLiveConnected ? "--" : bed.hr}
              </div>
            </div>
            <div className="text-[9.5px] font-mono text-slate-400 flex justify-between">
              <span>{isLiveConnected ? "Norm: 100-180" : "Awaiting Sensor"}</span>
            </div>
          </div>

          {/* SpO2 */}
          <div
            className={`p-2.5 rounded-xl border flex flex-col justify-between transition-colors ${
              !isLiveConnected
                ? "bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800"
                : bed.spo2 < 90
                ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800"
                : "bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800"
            }`}
          >
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              <span className="flex items-center gap-1">
                <Droplets size={12} className={isLiveConnected ? "text-cyan-500" : "text-slate-400"} />
                SpO₂
              </span>
              <span className="font-mono text-[10px]">%</span>
            </div>
            <div className="my-1">
              <div
                className={`text-2xl font-bold font-mono tracking-tight leading-none ${
                  !isLiveConnected
                    ? "text-slate-400 dark:text-slate-600"
                    : bed.spo2 < 90
                    ? "text-rose-600 dark:text-rose-400 font-extrabold"
                    : "text-slate-800 dark:text-slate-100"
                }`}
              >
                {!isLiveConnected ? "--" : `${bed.spo2}%`}
              </div>
            </div>
            <div className="text-[9.5px] font-mono text-slate-400 flex justify-between">
              <span>{isLiveConnected ? "Norm: ≥90%" : "Awaiting Sensor"}</span>
            </div>
          </div>

          {/* Temperature */}
          <div
            className={`p-2.5 rounded-xl border flex flex-col justify-between transition-colors ${
              !isLiveConnected
                ? "bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800"
                : bed.temperature < 36.2 || bed.temperature > 37.5
                ? "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800"
                : "bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800"
            }`}
          >
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              <span className="flex items-center gap-1">
                <Thermometer size={12} className={isLiveConnected ? "text-amber-500" : "text-slate-400"} />
                Temp
              </span>
              <span className="font-mono text-[10px]">°C</span>
            </div>
            <div className="my-1">
              <div
                className={`text-2xl font-bold font-mono tracking-tight leading-none ${
                  !isLiveConnected
                    ? "text-slate-400 dark:text-slate-600"
                    : bed.temperature < 36.2 || bed.temperature > 37.5
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-slate-800 dark:text-slate-100"
                }`}
              >
                {!isLiveConnected ? "--" : `${bed.temperature}°`}
              </div>
            </div>
            <div className="text-[9.5px] font-mono text-slate-400 flex justify-between">
              <span>{isLiveConnected ? "Norm: 36.2-37.5" : "Awaiting Sensor"}</span>
            </div>
          </div>
        </div>

        {/* ── Metadata Row: Doctor, Battery, Active Alerts ── */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              <User size={13} className="text-teal-600 dark:text-teal-400" />
              Handling doctor:
            </span>
            <span className="font-semibold text-[11px] text-slate-800 dark:text-slate-200">
              {bed.assignedDoctorName}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              <Cpu size={13} className="text-teal-600 dark:text-teal-400" />
              Hardware Device:
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onAssignDevice) onAssignDevice(bed);
              }}
              className="font-mono text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:text-teal-700 hover:underline flex items-center gap-1 px-2 py-0.5 rounded-lg bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800/60 transition-colors"
              title="Click to assign, swap, or unbind ESP32 hardware"
            >
              <span>{bed.deviceId || "Unassigned"}</span>
              <span className="text-[10px] font-sans text-teal-700 dark:text-teal-300 font-normal">⚙️ Swap</span>
            </button>
          </div>

          <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Device battery:
            </span>
            {renderBattery()}
          </div>

          {/* Active Alerts Bar */}
          <div className="py-1">
            {bed.activeAlerts && bed.activeAlerts.length > 0 ? (
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 text-[11px] font-medium">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle size={13} className="text-red-600" />
                  {bed.activeAlerts[0].type} ({bed.activeAlerts[0].value})
                </span>
                <span className="font-mono text-[10px]">
                  {bed.activeAlerts[0].duration}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[11px] text-teal-700 dark:text-teal-400 font-medium">
                <CheckCircle2 size={13} className="text-teal-600 dark:text-teal-400" />
                No active alerts
              </div>
            )}
          </div>

          {/* Timestamp and Signal Quality */}
          <div className="flex items-center justify-between text-[10.5px] font-mono text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/50">
            <span>Last update: {!isLiveConnected ? "Standby (No Telemetry)" : (isStale ? "Stale (>18s)" : bed.lastUpdate)}</span>
            <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
              <Wifi size={11} className={bed.signalQuality === "Good" ? "text-teal-600" : "text-amber-500"} />
              Signal: {bed.signalQuality}
            </span>
          </div>
        </div>
      </div>

      {/* ── Card Footer Actions: View Patient / View Alerts ── */}
      <div className="flex items-center gap-2 pt-3.5 mt-3 border-t border-slate-100 dark:border-slate-800/80">
        <button
          onClick={() => navigate(`/patients/${bed.patientId}`)}
          className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition-colors flex items-center justify-center gap-1"
        >
          <span>View patient</span>
          <ChevronRight size={14} />
        </button>
        <button
          onClick={() => navigate(`/alerts?bed=${bed.bedId}`)}
          className="py-1.5 px-3 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
        >
          View alerts
        </button>
      </div>
    </div>
  );
}
