// =============================================================
// PatientBedCard.jsx — Responsive Clinical Neonatal Vital Station Card
// Features: Strict 15s Online/Offline detection, real arterial PPG waveform,
// clean Empty/Standby Bed handling (discharged patients not shown),
// and intuitive bedside vital diagnostics.
// =============================================================

import { useNavigate } from "react-router-dom";
import {
  Heart,
  Droplets,
  Thermometer,
  Battery,
  BatteryWarning,
  Wifi,
  WifiOff,
  User,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Cpu,
  UserPlus,
  BedDouble,
} from "lucide-react";
import MedicalPPGWaveform from "./MedicalPPGWaveform";

export default function PatientBedCard({ bed, onAcknowledgeAlert, onAssignDevice }) {
  const navigate = useNavigate();

  // Strict 15-second freshness rule
  const isHeartbeatPresent = Boolean(bed.lastHeartbeatMs && bed.lastHeartbeatMs > 0);
  const timeSinceHeartbeatSec = isHeartbeatPresent
    ? Math.max(0, Math.round((Date.now() - bed.lastHeartbeatMs) / 1000))
    : 9999;
  const isLiveOnline = isHeartbeatPresent && timeSinceHeartbeatSec <= 15;

  // Check if bed has an active admitted patient
  const hasActivePatient = Boolean(
    bed.babyName &&
    bed.babyName.trim().length > 0 &&
    bed.patientId &&
    bed.patientId.trim().length > 0 &&
    bed.status !== "Standby"
  );

  // ── Render Clean Available Bed Slot if Patient Discharged or Bed Unoccupied ──
  if (!hasActivePatient) {
    return (
      <div className="clinical-card flex flex-col justify-between p-5 relative border-dashed border-slate-700/80 bg-slate-900/30 hover:border-cyan-500/50 transition-all duration-200 min-h-[360px]">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-xs text-slate-400 tracking-wider">
                BED {bed.bedId}
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-xs font-mono text-emerald-400 font-semibold">Ready</span>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-emerald-950/40 text-emerald-400 border border-emerald-800/60">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Available
            </span>
          </div>

          <div className="py-10 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 mb-3 shadow-inner">
              <BedDouble size={26} className="text-cyan-400/80" />
            </div>
            <h3 className="text-sm font-bold text-slate-200">
              Available Bed Slot
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-[220px]">
              No infant currently assigned. Sanitized and ready for admission.
            </p>

            <div className="mt-4 flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-800">
              <Cpu size={13} className="text-cyan-400" />
              <span>Sensor: {bed.deviceId || "Unassigned"}</span>
              <span className={`w-2 h-2 rounded-full ${isLiveOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-600"}`} />
              <span className={isLiveOnline ? "text-emerald-400 font-bold" : "text-slate-500"}>
                {isLiveOnline ? "ONLINE" : "OFFLINE"}
              </span>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
          <button
            onClick={() => navigate(`/patients?admitBed=${bed.bedId}`)}
            className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-950/40 transition-all flex items-center justify-center gap-1.5"
          >
            <UserPlus size={14} />
            <span>+ Admit Neonate to Bed {bed.bedId}</span>
          </button>
        </div>
      </div>
    );
  }

  // ── Derive Status for Admitted Patient Bed ──
  let statusBadge = {
    label: "ONLINE",
    color: "bg-emerald-950/50 text-emerald-400 border-emerald-800/70",
    dot: "bg-emerald-400 animate-pulse",
  };

  if (bed.activeAlerts && bed.activeAlerts.length > 0) {
    const hasUrgent = bed.activeAlerts.some((a) => a.priority === "Urgent" || a.priority === "High");
    statusBadge = {
      label: hasUrgent ? "CRITICAL ALERT" : "WARNING",
      color: "bg-rose-950/60 text-rose-300 border-rose-800 alert-pulse-red",
      dot: "bg-rose-500 animate-ping",
    };
  } else if (!isLiveOnline) {
    statusBadge = {
      label: "OFFLINE",
      color: "bg-rose-950/40 text-rose-400 border-rose-900/60",
      dot: "bg-rose-500",
    };
  }

  // Battery Icon
  const pct = bed.batteryPercent || 100;
  let batteryIcon = <Battery size={14} className="text-cyan-400" />;
  let batteryText = "text-slate-300";
  if (pct <= 25) {
    batteryIcon = <BatteryWarning size={14} className="text-amber-400 animate-bounce" />;
    batteryText = "text-amber-400 font-bold";
  }

  return (
    <div
      className={`clinical-card flex flex-col justify-between p-4 sm:p-5 relative transition-all duration-200 ${
        bed.activeAlerts && bed.activeAlerts.length > 0
          ? "border-rose-800/80 ring-2 ring-rose-500/20 bg-rose-950/10"
          : "hover:border-cyan-500/40"
      }`}
    >
      {/* ── Top Header: Bed ID, Patient ID, Baby Name, Status ── */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-xs text-slate-400 tracking-wider">
                BED {bed.bedId}
              </span>
              <span className="text-slate-600">·</span>
              <span className="font-mono text-xs font-semibold text-cyan-400">
                {bed.patientId}
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-100 tracking-tight leading-snug mt-0.5">
              {bed.babyName}
            </h2>
            <div className="text-[11px] text-slate-400 font-medium">
              Admission: {bed.admissionDate || "Active"}
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

        {/* ── Arterial PPG Waveform Canvas (Matched to Real ICU Monitor photo) ── */}
        <div className="my-2 rounded-lg overflow-hidden border border-slate-800 bg-[#070e22]">
          <div className="px-2.5 py-1 flex items-center justify-between text-[10px] font-mono border-b border-slate-800/60 bg-slate-900/40">
            <span className="flex items-center gap-1 text-cyan-300 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block animate-ping" />
              PLETH / PPG
            </span>
            <span className="text-slate-400">
              {isLiveOnline ? `${bed.hr || 140} bpm · LIVE` : "STANDBY / OFFLINE"}
            </span>
          </div>
          <MedicalPPGWaveform
            heartRate={bed.hr || 140}
            spo2={bed.spo2 || 98}
            isLive={isLiveOnline}
            height={55}
            showControls={false}
            strokeColor="#ffffff"
            fillColor="rgba(255, 255, 255, 0.95)"
            backgroundColor="#0a1023"
          />
        </div>

        {/* ── Center: Vital Signs 3-Col Grid (HR, SpO2, Temperature) ── */}
        <div className="grid grid-cols-3 gap-2 my-2.5">
          {/* Heart Rate */}
          <div
            className={`p-2.5 rounded-xl border flex flex-col justify-between transition-colors ${
              !isLiveOnline
                ? "bg-slate-900/40 border-slate-800/80 text-slate-500"
                : bed.hr < 100 || bed.hr > 180
                ? "bg-rose-950/40 border-rose-800"
                : "bg-slate-900/60 border-slate-800"
            }`}
          >
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span className="flex items-center gap-1">
                <Heart size={12} className={isLiveOnline ? "text-rose-500 animate-pulse" : "text-slate-500"} />
                HR
              </span>
              <span className="font-mono text-[10px]">bpm</span>
            </div>
            <div className="my-0.5">
              <div
                className={`text-2xl font-bold font-mono tracking-tight leading-none ${
                  !isLiveOnline
                    ? "text-slate-600"
                    : bed.hr < 100 || bed.hr > 180
                    ? "text-rose-400 font-extrabold"
                    : "text-slate-100"
                }`}
              >
                {!isLiveOnline ? "--" : bed.hr}
              </div>
            </div>
            <div className="text-[9.5px] font-mono text-slate-500 flex justify-between">
              <span>{isLiveOnline ? "100-180" : "Offline"}</span>
            </div>
          </div>

          {/* SpO2 */}
          <div
            className={`p-2.5 rounded-xl border flex flex-col justify-between transition-colors ${
              !isLiveOnline
                ? "bg-slate-900/40 border-slate-800/80 text-slate-500"
                : bed.spo2 < 90
                ? "bg-rose-950/40 border-rose-800"
                : "bg-slate-900/60 border-slate-800"
            }`}
          >
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span className="flex items-center gap-1">
                <Droplets size={12} className={isLiveOnline ? "text-cyan-400" : "text-slate-500"} />
                SpO₂
              </span>
              <span className="font-mono text-[10px]">%</span>
            </div>
            <div className="my-0.5">
              <div
                className={`text-2xl font-bold font-mono tracking-tight leading-none ${
                  !isLiveOnline
                    ? "text-slate-600"
                    : bed.spo2 < 90
                    ? "text-rose-400 font-extrabold"
                    : "text-slate-100"
                }`}
              >
                {!isLiveOnline ? "--" : `${bed.spo2}%`}
              </div>
            </div>
            <div className="text-[9.5px] font-mono text-slate-500 flex justify-between">
              <span>{isLiveOnline ? "≥90%" : "Offline"}</span>
            </div>
          </div>

          {/* Temperature */}
          <div
            className={`p-2.5 rounded-xl border flex flex-col justify-between transition-colors ${
              !isLiveOnline
                ? "bg-slate-900/40 border-slate-800/80 text-slate-500"
                : bed.temperature < 36.2 || bed.temperature > 37.5
                ? "bg-amber-950/40 border-amber-800"
                : "bg-slate-900/60 border-slate-800"
            }`}
          >
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span className="flex items-center gap-1">
                <Thermometer size={12} className={isLiveOnline ? "text-amber-400" : "text-slate-500"} />
                Temp
              </span>
              <span className="font-mono text-[10px]">°C</span>
            </div>
            <div className="my-0.5">
              <div
                className={`text-2xl font-bold font-mono tracking-tight leading-none ${
                  !isLiveOnline
                    ? "text-slate-600"
                    : bed.temperature < 36.2 || bed.temperature > 37.5
                    ? "text-amber-400"
                    : "text-slate-100"
                }`}
              >
                {!isLiveOnline ? "--" : `${bed.temperature}°`}
              </div>
            </div>
            <div className="text-[9.5px] font-mono text-slate-500 flex justify-between">
              <span>{isLiveOnline ? "36.2-37.5" : "Offline"}</span>
            </div>
          </div>
        </div>

        {/* ── Metadata Row: Doctor, Device, Battery, Alerts ── */}
        <div className="pt-2 border-t border-slate-800/80 space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <User size={13} className="text-cyan-400" />
              Doctor:
            </span>
            <span className="font-semibold text-[11px] text-slate-200 truncate max-w-[150px]">
              {bed.assignedDoctorName || "Unassigned"}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Cpu size={13} className="text-cyan-400" />
              Hardware Device:
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onAssignDevice) onAssignDevice(bed);
              }}
              className="font-mono text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-cyan-950/50 border border-cyan-800/60 transition-colors"
              title="Click to assign or rebind ESP32 hardware"
            >
              <span>{bed.deviceId || "Unassigned"}</span>
              <span className="text-[10px] text-cyan-300 font-normal">⚙️ Swap</span>
            </button>
          </div>

          <div className="flex items-center justify-between text-slate-300">
            <span className="text-[11px] text-slate-400">
              Device Battery Backup:
            </span>
            <div className="flex items-center gap-1 font-mono text-xs" title={`Battery: ${pct}%`}>
              {batteryIcon}
              <span className={batteryText}>{pct}%</span>
            </div>
          </div>

          {/* Active Alerts Notification */}
          <div className="py-0.5">
            {bed.activeAlerts && bed.activeAlerts.length > 0 ? (
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-[11px] font-medium">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle size={13} className="text-rose-500" />
                  {bed.activeAlerts[0].type} ({bed.activeAlerts[0].value})
                </span>
                <span className="font-mono text-[10px]">
                  {bed.activeAlerts[0].duration}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
                <CheckCircle2 size={13} className="text-emerald-400" />
                Vitals Stable · Normal Limits
              </div>
            )}
          </div>

          {/* Timestamp and Signal Quality */}
          <div className="flex items-center justify-between text-[10.5px] font-mono text-slate-400 pt-1 border-t border-slate-800/50">
            <span>
              {!isLiveOnline
                ? "Offline (Sensor Disconnected)"
                : `Active (${timeSinceHeartbeatSec}s ago)`}
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              {isLiveOnline ? (
                <>
                  <Wifi size={11} className="text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">Online</span>
                </>
              ) : (
                <>
                  <WifiOff size={11} className="text-rose-400" />
                  <span className="text-rose-400">Offline</span>
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* ── Card Footer Actions: View Patient / View Alerts ── */}
      <div className="flex items-center gap-2 pt-3 mt-3 border-t border-slate-800">
        <button
          onClick={() => navigate(`/patients/${bed.patientId}`)}
          className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md transition-colors flex items-center justify-center gap-1"
        >
          <span>View Patient</span>
          <ChevronRight size={14} />
        </button>
        <button
          onClick={() => navigate(`/alerts?bed=${bed.bedId}`)}
          className="py-1.5 px-3 rounded-lg text-xs font-medium border border-slate-700 hover:bg-slate-800 text-slate-300 transition-colors"
        >
          View Alerts
        </button>
      </div>
    </div>
  );
}

