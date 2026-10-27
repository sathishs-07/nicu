// =============================================================
// PatientBedCard.jsx — Modern High-Tech Clinical Vital Station Card
// Redesigned with Glassmorphism, Signature Vital Indicator Tiles,
// Dynamic Waveform Viewport, and Real-Time Telemetry Freshness.
// =============================================================

import { useState } from "react";
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
  BedDouble,
  Activity,
  Plus,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import MedicalPPGWaveform from "./MedicalPPGWaveform";
import { useApp } from "../context/AppContext";

export default function PatientBedCard({ bed, onAcknowledgeAlert, onAssignDevice }) {
  const navigate = useNavigate();
  const { devices, sanitizeBed } = useApp();
  const [isSanitizing, setIsSanitizing] = useState(false);

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
      <div className="flex flex-col justify-between p-5 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/80 dark:bg-slate-900/40 backdrop-blur-md hover:border-blue-500/60 dark:hover:border-blue-500/40 hover:shadow-lg transition-all duration-300 min-h-[380px] group">
        <div>
          {/* Top Status Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {bed.bedId}
              </span>
              <span className="text-[11px] font-medium text-slate-400">
                {bed.unitType || "Incubator Bay"}
              </span>
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Standby / Free
            </span>
          </div>

          {/* Central Vacancy Illustration & Info */}
          <div className="py-8 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20 border border-blue-200/60 dark:border-blue-800/40 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-3 shadow-inner group-hover:scale-105 transition-transform duration-300">
              <BedDouble size={28} />
            </div>

            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Station Ready for Admission
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-[230px] leading-relaxed">
              Sterilized &amp; decontaminated. No patient currently occupying this station.
            </p>

            {/* Hardware Status Tag */}
            <div className="mt-4 flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300">
              <Cpu size={14} className="text-blue-600 dark:text-blue-400" />
              <span>Node: {bed.deviceId || "Unassigned"}</span>
              <span className={`w-2 h-2 rounded-full ${isLiveOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
            </div>
          </div>
        </div>

        {/* Footer Admit & Turnover Actions */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2">
          <a
            href={`/patients?admitBed=${bed.bedId}`}
            className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus size={15} />
            <span>Admit Neonate</span>
          </a>
          <button
            type="button"
            onClick={async () => {
              setIsSanitizing(true);
              try {
                await sanitizeBed(bed.bedId, { notes: "Fast UV-C Bed Card Verification" });
              } finally {
                setTimeout(() => setIsSanitizing(false), 900);
              }
            }}
            disabled={isSanitizing}
            className="py-2.5 px-3 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-700 dark:text-blue-300 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Re-run terminal disinfection & verify station sterility"
          >
            <Sparkles size={14} className={isSanitizing ? "animate-spin text-blue-600" : "text-blue-500"} />
            <span>{isSanitizing ? "Sterilizing..." : "UV-C Cycle"}</span>
          </button>
        </div>
      </div>
    );
  }

  // ── Derive Status for Admitted Patient Bed ──
  const hasAlerts = bed.activeAlerts && bed.activeAlerts.length > 0;
  const hasUrgentAlert = hasAlerts && bed.activeAlerts.some((a) => a.priority === "Urgent" || a.priority === "High");

  let statusBadge = {
    label: "LIVE TELEMETRY",
    bg: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    dot: "bg-emerald-500 animate-pulse",
  };

  if (hasUrgentAlert) {
    statusBadge = {
      label: "CRITICAL ALERT",
      bg: "bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-200 border-rose-300 dark:border-rose-800 animate-pulse",
      dot: "bg-rose-600 animate-ping",
    };
  } else if (hasAlerts) {
    statusBadge = {
      label: "PHYSIO WARNING",
      bg: "bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-200 border-amber-300 dark:border-amber-800",
      dot: "bg-amber-500 animate-bounce",
    };
  } else if (!isLiveOnline) {
    statusBadge = {
      label: "SENSOR OFFLINE",
      bg: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700",
      dot: "bg-slate-400",
    };
  }

  // Battery Icon
  const pct = (effectiveDeviceId && linkedDevice?.batteryPercent !== undefined)
    ? linkedDevice.batteryPercent
    : (bed.batteryPercent || 100);
  let batteryIcon = <Battery size={14} className="text-emerald-600 dark:text-emerald-400" />;
  if (pct <= 25) {
    batteryIcon = <BatteryWarning size={14} className="text-amber-500 animate-bounce" />;
  }

  return (
    <div
      className={`flex flex-col justify-between p-5 rounded-3xl border transition-all duration-300 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-md hover:shadow-xl relative overflow-hidden group ${
        hasUrgentAlert
          ? "border-rose-400 dark:border-rose-700 ring-2 ring-rose-500/20 shadow-rose-500/10"
          : hasAlerts
          ? "border-amber-400 dark:border-amber-700 ring-2 ring-amber-500/20"
          : "border-slate-200/90 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600"
      }`}
    >
      {/* Top Accent Stripe */}
      <div
        className={`absolute top-0 left-0 right-0 h-1 ${
          hasUrgentAlert
            ? "bg-rose-500"
            : hasAlerts
            ? "bg-amber-500"
            : isLiveOnline
            ? "bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400"
            : "bg-slate-400"
        }`}
      />

      {/* ── Top Header: Station ID, Baby Identity, Live Status ── */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex items-start gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-sm shadow-sm shrink-0">
              {bed.babyName ? bed.babyName.charAt(0).toUpperCase() : "B"}
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                  {bed.bedId}
                </span>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
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
          </div>

          {/* Status Badge */}
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-mono font-extrabold border shadow-2xs shrink-0 ${statusBadge.bg}`}
          >
            <span className={`w-2 h-2 rounded-full ${statusBadge.dot}`} />
            <span>{statusBadge.label}</span>
          </div>
        </div>

        {/* ── Arterial PPG Waveform Canvas ── */}
        <div className="my-2.5 rounded-2xl overflow-hidden border border-slate-800 bg-[#070e22] shadow-inner">
          <div className="px-3 py-1 flex items-center justify-between text-[10px] font-mono border-b border-slate-800/80 bg-slate-950/70">
            <span className="flex items-center gap-1.5 text-cyan-300 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              CONTINUOUS ARTERIAL PPG
            </span>
            <span className="text-slate-400">
              {isLiveOnline ? `${bed.hr || 140} BPM · 1 Hz STREAM` : "OFFLINE / STANDBY"}
            </span>
          </div>
          <MedicalPPGWaveform
            heartRate={bed.hr || 140}
            spo2={bed.spo2 || 98}
            isLive={isLiveOnline}
            height={55}
            showControls={false}
            strokeColor="#38bdf8"
            fillColor="rgba(56, 189, 248, 0.15)"
            backgroundColor="#070e22"
          />
        </div>

        {/* ── Center: Vital Signs 3-Col Modern Tiles ── */}
        <div className="grid grid-cols-3 gap-2 my-2.5">
          {/* Heart Rate Tile */}
          <div
            className={`p-3 rounded-2xl border flex flex-col justify-between transition-all ${
              !isLiveOnline
                ? "bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-400"
                : bed.hr < 100 || bed.hr > 180
                ? "bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800/80 shadow-xs ring-1 ring-rose-500/20"
                : "bg-slate-50/70 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-700/60"
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Heart size={13} className={isLiveOnline ? "text-rose-500 animate-pulse" : "text-slate-400"} />
                HR
              </span>
              <span className="font-mono text-[10px]">bpm</span>
            </div>
            <div className="my-1">
              <div
                className={`text-2xl sm:text-3xl font-black font-mono tracking-tight leading-none ${
                  !isLiveOnline
                    ? "text-slate-400"
                    : bed.hr < 100 || bed.hr > 180
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-slate-900 dark:text-slate-100"
                }`}
              >
                {!isLiveOnline ? "--" : bed.hr}
              </div>
            </div>
            <div className="text-[10px] font-mono text-slate-400 flex justify-between">
              <span>{isLiveOnline ? "100-180" : "Offline"}</span>
            </div>
          </div>

          {/* SpO2 Tile */}
          <div
            className={`p-3 rounded-2xl border flex flex-col justify-between transition-all ${
              !isLiveOnline
                ? "bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-400"
                : bed.spo2 < 90
                ? "bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800/80 shadow-xs ring-1 ring-rose-500/20"
                : "bg-slate-50/70 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-700/60"
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Droplets size={13} className={isLiveOnline ? "text-cyan-500" : "text-slate-400"} />
                SpO₂
              </span>
              <span className="font-mono text-[10px]">%</span>
            </div>
            <div className="my-1">
              <div
                className={`text-2xl sm:text-3xl font-black font-mono tracking-tight leading-none ${
                  !isLiveOnline
                    ? "text-slate-400"
                    : bed.spo2 < 90
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-slate-900 dark:text-slate-100"
                }`}
              >
                {!isLiveOnline ? "--" : `${bed.spo2}%`}
              </div>
            </div>
            <div className="text-[10px] font-mono text-slate-400 flex justify-between">
              <span>{isLiveOnline ? "≥90%" : "Offline"}</span>
            </div>
          </div>

          {/* Temperature Tile */}
          <div
            className={`p-3 rounded-2xl border flex flex-col justify-between transition-all ${
              !isLiveOnline
                ? "bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-400"
                : bed.temperature < 36.2 || bed.temperature > 37.5
                ? "bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/80 shadow-xs ring-1 ring-amber-500/20"
                : "bg-slate-50/70 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-700/60"
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Thermometer size={13} className={isLiveOnline ? "text-amber-500" : "text-slate-400"} />
                Temp
              </span>
              <span className="font-mono text-[10px]">°C</span>
            </div>
            <div className="my-1">
              <div
                className={`text-2xl sm:text-3xl font-black font-mono tracking-tight leading-none ${
                  !isLiveOnline
                    ? "text-slate-400"
                    : bed.temperature < 36.2 || bed.temperature > 37.5
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-slate-900 dark:text-slate-100"
                }`}
              >
                {!isLiveOnline ? "--" : `${bed.temperature}°`}
              </div>
            </div>
            <div className="text-[10px] font-mono text-slate-400 flex justify-between">
              <span>{isLiveOnline ? "36.2-37.5" : "Offline"}</span>
            </div>
          </div>
        </div>

        {/* ── Metadata: Clinician, Hardware Node, Battery, Diagnostics ── */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5 text-xs">
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
              Sensor Node:
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onAssignDevice) onAssignDevice(bed);
              }}
              className="font-mono text-[11px] font-semibold flex items-center gap-1 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-blue-400 transition-colors cursor-pointer"
            >
              <span>{effectiveDeviceId || "Unassigned"}</span>
              <span className="text-[10px] opacity-75">
                {isLiveOnline ? "· Live" : "· Offline"}
              </span>
            </button>
          </div>

          {effectiveDeviceId && (
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Sensor Battery:
              </span>
              <div className="flex items-center gap-1 font-mono text-xs">
                {batteryIcon}
                <span className="text-slate-700 dark:text-slate-300 font-semibold">{pct}%</span>
              </div>
            </div>
          )}

          {/* Alarm / Stability Status Banner */}
          <div className="pt-1">
            {hasAlerts ? (
              <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[11px] font-semibold animate-pulse">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle size={13} className="text-rose-600" />
                  {bed.activeAlerts[0].type} ({bed.activeAlerts[0].value})
                </span>
                <span className="font-mono text-[10px]">
                  {bed.activeAlerts[0].duration || "Active"}
                </span>
              </div>
            ) : !isLiveOnline ? (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 px-1 font-medium">
                <AlertCircle size={13} className="text-slate-400" />
                Hardware Disconnected · Awaiting Telemetry
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 px-1 font-semibold">
                <CheckCircle2 size={13} />
                Physiological Vitals Stable · Within Range
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Card Footer Actions: Monitor / Alerts ── */}
      <div className="flex items-center gap-2 pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80">
        <button
          onClick={() => navigate(`/patients/${bed.patientId}`)}
          className="flex-1 py-2 px-3.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>Open Clinical Monitor</span>
          <ChevronRight size={14} />
        </button>
        <button
          onClick={() => navigate(`/alerts?bed=${bed.bedId}`)}
          className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
            hasAlerts
              ? "border-rose-300 bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300"
              : "border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
          }`}
        >
          Alerts {hasAlerts && `(${bed.activeAlerts.length})`}
        </button>
        <button
          onClick={async () => {
            if (window.confirm(`Perform routine bedside surface sanitization & bacterial filter inspection for Bed ${bed.bedId}? Patient ${bed.babyName} will remain actively admitted with uninterrupted vital telemetry.`)) {
              setIsSanitizing(true);
              try {
                await sanitizeBed(bed.bedId, { notes: "Bed card routine bedside surface wipe" });
              } finally {
                setIsSanitizing(false);
              }
            }
          }}
          disabled={isSanitizing}
          className="p-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-600 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer disabled:opacity-50"
          title="Routine Bedside Sanitization (Patient remains admitted & monitored)"
        >
          <Sparkles size={14} className={isSanitizing ? "animate-spin text-amber-600" : "text-amber-500"} />
        </button>
      </div>
    </div>
  );
}
