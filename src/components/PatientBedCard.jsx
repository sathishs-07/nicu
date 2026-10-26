// =============================================================
// PatientBedCard.jsx — Responsive Clinical Neonatal Vital Station Card
// Modern White & Blue Clinical Styling, 15s Online/Offline detection,
// Pleth/PPG arterial waveform display, and bedside vital diagnostics.
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
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Cpu,
  UserPlus,
  BedDouble,
  Activity,
} from "lucide-react";
import MedicalPPGWaveform from "./MedicalPPGWaveform";
import { useApp } from "../context/AppContext";

export default function PatientBedCard({ bed, onAcknowledgeAlert, onAssignDevice }) {
  const navigate = useNavigate();
  const { devices } = useApp();

  // Link any device assigned to this bed
  const linkedDevice = (devices || []).find(
    (d) => d.deviceId === bed.deviceId || d.assignedBedId === bed.bedId
  );
  const effectiveDeviceId = bed.deviceId || linkedDevice?.deviceId;

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
      <div className="clinical-card flex flex-col justify-between p-5 relative border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/40 hover:border-blue-400 transition-all duration-200 min-h-[360px]">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-xs text-slate-500 dark:text-slate-400 tracking-wider">
                STATION {bed.bedId}
              </span>
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold">Sanitized</span>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Available
            </span>
          </div>

          <div className="py-10 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-slate-800 border border-blue-100 dark:border-slate-700 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-3 shadow-xs">
              <BedDouble size={26} />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Station Ready for Admission
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-[240px]">
              No infant currently assigned. Go to Patient Registry to admit a neonate.
            </p>

            <div className="mt-4 flex items-center gap-2 text-xs font-mono text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <Cpu size={13} className="text-blue-600 dark:text-blue-400" />
              <span>Sensor: {bed.deviceId || "Unassigned"}</span>
              <span className={`w-2 h-2 rounded-full ${isLiveOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
              <span className={isLiveOnline ? "text-emerald-600 font-bold" : "text-slate-400"}>
                {isLiveOnline ? "ONLINE" : "STANDBY"}
              </span>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Station Sanitized &amp; Standby
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            {bed.unitType || "Incubator Station"}
          </span>
        </div>
      </div>
    );
  }

  // ── Derive Status for Admitted Patient Bed ──
  let statusBadge = {
    label: "ONLINE",
    color: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
    dot: "bg-emerald-500 animate-pulse",
  };

  if (bed.activeAlerts && bed.activeAlerts.length > 0) {
    const hasUrgent = bed.activeAlerts.some((a) => a.priority === "Urgent" || a.priority === "High");
    statusBadge = {
      label: hasUrgent ? "CRITICAL ALERT" : "WARNING",
      color: "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 alert-pulse-red",
      dot: "bg-rose-600 animate-ping",
    };
  } else if (!isLiveOnline) {
    statusBadge = {
      label: "OFFLINE",
      color: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700",
      dot: "bg-slate-400",
    };
  }

  // Battery Icon
  const pct = (effectiveDeviceId && linkedDevice?.batteryPercent !== undefined)
    ? linkedDevice.batteryPercent
    : (bed.batteryPercent || 100);
  let batteryIcon = <Battery size={14} className="text-blue-600 dark:text-blue-400" />;
  let batteryText = "text-slate-700 dark:text-slate-300";
  if (pct <= 25) {
    batteryIcon = <BatteryWarning size={14} className="text-amber-500 animate-bounce" />;
    batteryText = "text-amber-600 font-bold";
  }

  return (
    <div
      className={`clinical-card flex flex-col justify-between p-4 sm:p-5 relative transition-all duration-200 ${
        bed.activeAlerts && bed.activeAlerts.length > 0
          ? "border-rose-300 dark:border-rose-800 ring-2 ring-rose-500/10 bg-rose-50/20 dark:bg-rose-950/10"
          : "hover:border-blue-400"
      }`}
    >
      {/* ── Top Header: Bed ID, Patient ID, Baby Name, Status ── */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-xs text-slate-500 dark:text-slate-400 tracking-wider">
                BED {bed.bedId}
              </span>
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                {bed.patientId}
              </span>
            </div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 tracking-tight leading-snug mt-0.5">
              {bed.babyName}
            </h2>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Mother: {bed.motherName || "Admitted"} · GA: {bed.gestationalAge || "33w"}
            </div>
          </div>

          {/* Status Badge */}
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold border shadow-xs ${statusBadge.color}`}
          >
            <span className={`w-2 h-2 rounded-full ${statusBadge.dot}`} />
            <span>{statusBadge.label}</span>
          </div>
        </div>

        {/* ── Arterial PPG Waveform Canvas ── */}
        <div className="my-2.5 rounded-xl overflow-hidden border border-slate-800 bg-[#070e22] shadow-inner">
          <div className="px-2.5 py-1 flex items-center justify-between text-[10px] font-mono border-b border-slate-800/80 bg-slate-900/60">
            <span className="flex items-center gap-1 text-cyan-300 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block animate-ping" />
              PLETH / PPG WAVEFORM
            </span>
            <span className="text-slate-400">
              {isLiveOnline ? `${bed.hr || 140} bpm · LIVE SENSOR` : "STANDBY / AWAITING STREAM"}
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
                ? "bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-400"
                : bed.hr < 100 || bed.hr > 180
                ? "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800"
                : "bg-blue-50/50 dark:bg-slate-900/60 border-blue-100 dark:border-slate-800"
            }`}
          >
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              <span className="flex items-center gap-1">
                <Heart size={12} className={isLiveOnline ? "text-rose-600 animate-pulse" : "text-slate-400"} />
                HR
              </span>
              <span className="font-mono text-[10px]">bpm</span>
            </div>
            <div className="my-0.5">
              <div
                className={`text-2xl font-extrabold font-mono tracking-tight leading-none ${
                  !isLiveOnline
                    ? "text-slate-400"
                    : bed.hr < 100 || bed.hr > 180
                    ? "text-rose-600 font-extrabold"
                    : "text-slate-900 dark:text-slate-100"
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
                ? "bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-400"
                : bed.spo2 < 90
                ? "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800"
                : "bg-blue-50/50 dark:bg-slate-900/60 border-blue-100 dark:border-slate-800"
            }`}
          >
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              <span className="flex items-center gap-1">
                <Droplets size={12} className={isLiveOnline ? "text-blue-600" : "text-slate-400"} />
                SpO₂
              </span>
              <span className="font-mono text-[10px]">%</span>
            </div>
            <div className="my-0.5">
              <div
                className={`text-2xl font-extrabold font-mono tracking-tight leading-none ${
                  !isLiveOnline
                    ? "text-slate-400"
                    : bed.spo2 < 90
                    ? "text-rose-600 font-extrabold"
                    : "text-slate-900 dark:text-slate-100"
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
                ? "bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-400"
                : bed.temperature < 36.2 || bed.temperature > 37.5
                ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800"
                : "bg-blue-50/50 dark:bg-slate-900/60 border-blue-100 dark:border-slate-800"
            }`}
          >
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              <span className="flex items-center gap-1">
                <Thermometer size={12} className={isLiveOnline ? "text-amber-600" : "text-slate-400"} />
                Temp
              </span>
              <span className="font-mono text-[10px]">°C</span>
            </div>
            <div className="my-0.5">
              <div
                className={`text-2xl font-extrabold font-mono tracking-tight leading-none ${
                  !isLiveOnline
                    ? "text-slate-400"
                    : bed.temperature < 36.2 || bed.temperature > 37.5
                    ? "text-amber-600"
                    : "text-slate-900 dark:text-slate-100"
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
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <User size={13} className="text-blue-600" />
              Attending:
            </span>
            <span className="font-semibold text-[11px] text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
              {bed.assignedDoctorName || "Dr. Meera Vasudevan"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <Cpu size={13} className="text-blue-600" />
              Sensor ID:
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onAssignDevice) onAssignDevice(bed);
              }}
              className={`font-mono text-[11px] font-semibold flex items-center gap-1 px-2 py-0.5 rounded-lg border transition-colors cursor-pointer ${
                effectiveDeviceId
                  ? isLiveOnline
                    ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800"
                    : "text-slate-600 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  : "text-amber-700 bg-amber-50 border-amber-200"
              }`}
              title="Click to assign or rebind online ESP32 hardware"
            >
              <span>{effectiveDeviceId || "Unassigned"}</span>
              <span className="text-[10px] opacity-75">
                {effectiveDeviceId ? (isLiveOnline ? "· Live" : "· Offline") : "· Bind"}
              </span>
            </button>
          </div>

          {effectiveDeviceId && (
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Battery Level:
              </span>
              <div className="flex items-center gap-1 font-mono text-xs" title={`Battery: ${pct}%`}>
                {batteryIcon}
                <span className={batteryText}>{pct}%</span>
              </div>
            </div>
          )}

          {/* Active Alerts Notification */}
          <div className="py-0.5">
            {bed.activeAlerts && bed.activeAlerts.length > 0 ? (
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[11px] font-semibold">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle size={13} className="text-rose-600 animate-bounce" />
                  {bed.activeAlerts[0].type} ({bed.activeAlerts[0].value})
                </span>
                <span className="font-mono text-[10px]">
                  {bed.activeAlerts[0].duration}
                </span>
              </div>
            ) : !isLiveOnline ? (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                <AlertCircle size={13} className="text-slate-400" />
                Sensor Disconnected · Awaiting Hardware Telemetry
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" />
                Vitals Stable · Normal Limits
              </div>
            )}
          </div>

          {/* Timestamp and Signal Quality */}
          <div className="flex items-center justify-between text-[10.5px] font-mono text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>
              {!isLiveOnline
                ? "Offline"
                : `Active (${timeSinceHeartbeatSec}s ago)`}
            </span>
            <span className="flex items-center gap-1">
              {isLiveOnline ? (
                <>
                  <Wifi size={11} className="text-emerald-600" />
                  <span className="text-emerald-600 font-semibold">Online</span>
                </>
              ) : (
                <>
                  <WifiOff size={11} className="text-slate-400" />
                  <span className="text-slate-400">Offline</span>
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* ── Card Footer Actions: View Patient / View Alerts ── */}
      <div className="flex items-center gap-2 pt-3 mt-3 border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={() => navigate(`/patients/${bed.patientId}`)}
          className="flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
        >
          <span>Patient Details &amp; History</span>
          <ChevronRight size={14} />
        </button>
        <button
          onClick={() => navigate(`/alerts?bed=${bed.bedId}`)}
          className="py-1.5 px-3 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
        >
          Alerts
        </button>
      </div>
    </div>
  );
}
