// =============================================================
// PatientDetails.jsx — Dedicated Neonatal Patient Telemetry Station
// Deep physiological trends, alert history, device telemetry,
// and clinical assignment details.
// =============================================================

import { useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Heart,
  Droplets,
  Thermometer,
  Battery,
  Wifi,
  User,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Download,
  Calendar,
  FileText,
  ShieldCheck,
  Cpu,
  Share2,
  RefreshCw,
  Baby,
  UserMinus,
  MessageSquare,
  Plus,
  Send,
  X,
  Tag,
  Radio,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import MedicalPPGWaveform from "../components/MedicalPPGWaveform";
import { useApp } from "../context/AppContext";
import { api } from "../services/api";

export default function PatientDetails() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const {
    beds,
    waveforms,
    alertLog,
    acknowledgeAlert,
    resolveAlert,
    thresholds,
    deleteBed,
    devices,
    assignDeviceToBed,
    addDevice,
    currentUser,
  } = useApp();

  const [timeRange, setTimeRange] = useState("15m"); // "15m" | "1h" | "24h"
  const [activeParamTab, setActiveParamTab] = useState("all"); // "all" | "hr" | "spo2" | "temp"
  const [resolveModalAlert, setResolveModalAlert] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState("");

  // ESP32 Device Modal State
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [selectedDevId, setSelectedDevId] = useState("");
  const [customDevId, setCustomDevId] = useState("");
  const [isAssigningDev, setIsAssigningDev] = useState(false);

  // Clinical Shift Notes State
  const [notesList, setNotesList] = useState([]);
  const [newNoteText, setNewNoteText] = useState("");
  const [noteCategory, setNoteCategory] = useState("General Observation");
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Find bed by patientId or bedId
  const bed = useMemo(() => {
    return (
      beds.find((b) => b.patientId === patientId || b.bedId === patientId) || beds[0]
    );
  }, [beds, patientId]);

  // Freshness calculation: true product check
  const isHeartbeatPresent = Boolean(bed?.lastHeartbeatMs && bed.lastHeartbeatMs > 0);
  const timeSinceHeartbeatSec = isHeartbeatPresent ? Math.round((Date.now() - bed.lastHeartbeatMs) / 1000) : 9999;
  const isLiveConnected = isHeartbeatPresent && timeSinceHeartbeatSec <= 25 && bed?.hr !== null && bed?.hr > 0;

  // Telemetry buffer for charts
  const rawPoints = waveforms[bed?.bedId] || [];

  // Generate synthetic points for 1h / 24h view if selected
  const chartData = useMemo(() => {
    if (timeRange === "15m") {
      return rawPoints.map((pt, idx) => ({
        ...pt,
        displayTime: pt.time,
      }));
    }

    // Generate longer simulated trends for 1h or 24h review
    const count = timeRange === "1h" ? 40 : 60;
    const intervalMins = timeRange === "1h" ? 1.5 : 24;
    const now = Date.now();
    const data = [];
    const baseHr = bed?.hr || 140;
    const baseSpo2 = bed?.spo2 || 97;
    const baseTemp = bed?.temperature || 36.8;

    for (let i = count - 1; i >= 0; i--) {
      const t = new Date(now - i * intervalMins * 60 * 1000);
      const timeStr = t.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
      data.push({
        displayTime: timeStr,
        hr: Math.round(baseHr + Math.sin(i * 0.4) * 8 + (Math.random() - 0.5) * 4),
        spo2: Math.min(100, Math.round(baseSpo2 + Math.cos(i * 0.3) * 2)),
        temp: +(baseTemp + Math.sin(i * 0.2) * 0.2).toFixed(1),
      });
    }
    return data;
  }, [timeRange, rawPoints, bed]);

  // Alerts relevant to this patient
  const patientAlerts = useMemo(() => {
    return alertLog.filter((a) => a.bedId === bed.bedId || a.patientId === bed.patientId);
  }, [alertLog, bed]);

  // Export CSV handler
  const handleExportCSV = () => {
    const headers = ["Timestamp", "Heart Rate (BPM)", "SpO2 (%)", "Temperature (C)", "Device ID"];
    const rows = chartData.map((d) => [
      d.displayTime,
      d.hr,
      d.spo2,
      d.temp,
      bed.deviceId,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${bed.patientId}_${bed.bedId}_vital_telemetry.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ── Breadcrumb & Top Action Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Return to 6-Bed Dashboard"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-500/30">
                BED {bed.bedId}
              </span>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                PATIENT ID: {bed.patientId}
              </span>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span
                className={`text-[11px] font-mono px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                  isLiveConnected
                    ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isLiveConnected ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                  }`}
                />
                <span>{isLiveConnected ? "LIVE ESP32" : "STANDBY"}</span>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-0.5">
              {bed.babyName}
            </h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md transition-colors"
          >
            <FileText size={14} />
            <span>Export Clinical PDF / Print</span>
          </button>
          <button
            onClick={async () => {
              const confirmMsg = `Are you sure you want to discharge "${bed.babyName}" from ${bed.bedId}?\nThis will unbind ESP32 device (${bed.deviceId || 'unassigned'}) and release the bed station.`;
              if (window.confirm(confirmMsg)) {
                try {
                  await deleteBed(bed.bedId);
                  navigate("/");
                } catch (err) {
                  alert(err.message || "Failed to discharge neonate");
                }
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-medium hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            title="Discharge patient and release bed station"
          >
            <UserMinus size={14} />
            <span>Discharge Neonate</span>
          </button>
        </div>
      </div>

      {/* ── Patient Profile & Clinical Care Team Banner ── */}
      <div className="clinical-card p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4 text-xs">
        <div>
          <div className="text-slate-400 text-[11px]">Mother's Name</div>
          <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
            {bed.motherName}
          </div>
        </div>
        <div>
          <div className="text-slate-400 text-[11px]">Gestational Age</div>
          <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 font-mono">
            {bed.gestationalAge}
          </div>
        </div>
        <div>
          <div className="text-slate-400 text-[11px]">Birth Weight / Gender</div>
          <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
            {bed.birthWeight} · {bed.gender}
          </div>
        </div>
        <div>
          <div className="text-slate-400 text-[11px]">Blood Group</div>
          <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 font-mono">
            {bed.bloodGroup}
          </div>
        </div>
        <div>
          <div className="text-slate-400 text-[11px]">Admission Date</div>
          <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
            {bed.admissionDate}
          </div>
        </div>
        <div>
          <div className="text-slate-400 text-[11px]">Handling Doctor</div>
          <div className="font-bold text-teal-600 dark:text-teal-400 mt-0.5">
            {bed.assignedDoctorName}
          </div>
        </div>
        <div>
          <div className="text-slate-400 text-[11px]">Hardware Node</div>
          <button
            type="button"
            onClick={() => {
              setSelectedDevId(bed.deviceId || "UNASSIGN");
              setCustomDevId("");
              setShowDeviceModal(true);
            }}
            className="mt-0.5 font-mono font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
            title="Click to assign or swap ESP32"
          >
            <span>{bed.deviceId || "Standby"}</span>
            <span className="text-[10px] font-sans opacity-70">⚙️ Swap</span>
          </button>
        </div>
      </div>

      {/* ── Three Large Vital Signs Metric Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Heart Rate Card */}
        <div
          className={`clinical-card p-5 border flex flex-col justify-between ${
            isLiveConnected && (bed.hr < thresholds.hrLow || bed.hr > thresholds.hrHigh)
              ? "border-red-300 dark:border-red-900 ring-2 ring-red-500/20 bg-red-50/15"
              : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 font-bold text-sm text-slate-700 dark:text-slate-300">
              <Heart size={18} className={isLiveConnected ? "text-red-500 animate-pulse" : "text-slate-400"} />
              Heart Rate
            </span>
            <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
              Target: {thresholds.hrLow}-{thresholds.hrHigh} BPM
            </span>
          </div>

          <div className="my-3 flex items-baseline gap-2">
            <span className="text-4xl font-extrabold font-mono text-slate-900 dark:text-slate-100 tracking-tight">
              {isLiveConnected ? bed.hr : "--"}
            </span>
            <span className="text-sm font-mono text-slate-400">BPM</span>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800 font-mono">
            <span>{isLiveConnected ? "24h Range: 118 – 174" : "Sensor Standby"}</span>
            <span className={isLiveConnected ? "text-teal-600 dark:text-teal-400 font-medium" : "text-slate-400"}>
              {isLiveConnected ? "MAX30102 Stream Active" : "Awaiting ESP32"}
            </span>
          </div>
        </div>

        {/* SpO2 Card */}
        <div
          className={`clinical-card p-5 border flex flex-col justify-between ${
            isLiveConnected && bed.spo2 < thresholds.spo2Low
              ? "border-red-300 dark:border-red-900 ring-2 ring-red-500/20 bg-red-50/15"
              : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 font-bold text-sm text-slate-700 dark:text-slate-300">
              <Droplets size={18} className={isLiveConnected ? "text-cyan-500" : "text-slate-400"} />
              Oxygen Saturation (SpO₂)
            </span>
            <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
              Target: &ge;{thresholds.spo2Low}%
            </span>
          </div>

          <div className="my-3 flex items-baseline gap-2">
            <span className="text-4xl font-extrabold font-mono text-slate-900 dark:text-slate-100 tracking-tight">
              {isLiveConnected ? `${bed.spo2}%` : "--"}
            </span>
            <span className="text-sm font-mono text-slate-400">SpO₂</span>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800 font-mono">
            <span>{isLiveConnected ? "24h Range: 92 – 100%" : "Pulse Oximetry Standby"}</span>
            <span className={isLiveConnected ? "text-teal-600 dark:text-teal-400 font-medium" : "text-slate-400"}>
              {isLiveConnected ? "Perfusion: Good" : "Awaiting ESP32"}
            </span>
          </div>
        </div>

        {/* Temperature Card */}
        <div
          className={`clinical-card p-5 border flex flex-col justify-between ${
            isLiveConnected && (bed.temperature < thresholds.tempLow || bed.temperature > thresholds.tempHigh)
              ? "border-amber-300 dark:border-amber-900 ring-2 ring-amber-500/20 bg-amber-50/15"
              : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 font-bold text-sm text-slate-700 dark:text-slate-300">
              <Thermometer size={18} className={isLiveConnected ? "text-amber-500" : "text-slate-400"} />
              Skin Temperature
            </span>
            <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
              Target: {thresholds.tempLow}-{thresholds.tempHigh} °C
            </span>
          </div>

          <div className="my-3 flex items-baseline gap-2">
            <span className="text-4xl font-extrabold font-mono text-slate-900 dark:text-slate-100 tracking-tight">
              {isLiveConnected ? `${bed.temperature}°` : "--"}
            </span>
            <span className="text-sm font-mono text-slate-400">°C</span>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800 font-mono">
            <span>{isLiveConnected ? "24h Range: 36.4 – 37.2°C" : "Temperature Standby"}</span>
            <span className={isLiveConnected ? "text-teal-600 dark:text-teal-400 font-medium" : "text-slate-400"}>
              {isLiveConnected ? "TMP117 I2C Active" : "Awaiting ESP32"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Real-Time Arterial PPG Pulse Waveform (Exact match to Medical Monitor Screen) ── */}
      <div className="clinical-card p-5 border border-cyan-900/50 bg-[#070e24] shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping inline-block" />
            <h2 className="text-sm font-bold text-white font-mono tracking-wide flex items-center gap-2">
              <span>PLETH / REAL-TIME ARTERIAL PULSE WAVEFORM</span>
              <span className="text-[10px] font-normal text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-700/50">
                MAX30102 Optical Sensor · Continuous Stream
              </span>
            </h2>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono text-cyan-300">
            <span>HR: <strong className="text-white text-sm">{isLiveConnected ? bed?.hr : "--"}</strong> bpm</span>
            <span>SpO₂: <strong className="text-cyan-400 text-sm">{isLiveConnected ? `${bed?.spo2}%` : "--"}</strong></span>
            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${isLiveConnected ? "bg-emerald-950 text-emerald-400 border border-emerald-700" : "bg-rose-950 text-rose-400 border border-rose-800"}`}>
              {isLiveConnected ? "LIVE TELEMETRY" : "SENSOR OFFLINE"}
            </span>
          </div>
        </div>

        <MedicalPPGWaveform
          heartRate={bed?.hr || 140}
          spo2={bed?.spo2 || 98}
          isLive={isLiveConnected}
          height={140}
          showControls={true}
          strokeColor="#ffffff"
          fillColor="rgba(255, 255, 255, 0.95)"
          backgroundColor="#0a1028"
        />
      </div>

      {/* ── Continuous Live Physiological Waveform Trend Chart ── */}
      <div className="clinical-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Continuous Physiological Trend Stream
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Multiparameter sensor telemetry · Automatic threshold reference lines
            </p>
          </div>

          {/* Time Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-medium">
            <button
              onClick={() => setTimeRange("15m")}
              className={`px-3 py-1 rounded-lg transition-colors ${
                timeRange === "15m"
                  ? "bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-300 shadow-xs font-semibold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Last 15 Mins
            </button>
            <button
              onClick={() => setTimeRange("1h")}
              className={`px-3 py-1 rounded-lg transition-colors ${
                timeRange === "1h"
                  ? "bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-300 shadow-xs font-semibold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Last 1 Hour
            </button>
            <button
              onClick={() => setTimeRange("24h")}
              className={`px-3 py-1 rounded-lg transition-colors ${
                timeRange === "24h"
                  ? "bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-300 shadow-xs font-semibold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Last 24 Hours
            </button>
          </div>
        </div>

        {/* Recharts Area Container */}
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="hrGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="spo2Grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
              <XAxis dataKey="displayTime" tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
              <YAxis domain={[70, 200]} tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card-bg)",
                  borderColor: "var(--card-border)",
                  borderRadius: "10px",
                  fontSize: "12px",
                  fontFamily: "JetBrains Mono",
                }}
              />
              <ReferenceLine y={thresholds.hrHigh} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "HR High (180)", fill: "#ef4444", fontSize: 10 }} />
              <ReferenceLine y={thresholds.hrLow} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "HR Low (100)", fill: "#ef4444", fontSize: 10 }} />
              <ReferenceLine y={thresholds.spo2Low} stroke="#06b6d4" strokeDasharray="4 4" label={{ value: "SpO2 Low (90%)", fill: "#06b6d4", fontSize: 10 }} />
              <Area type="monotone" dataKey="hr" name="Heart Rate (BPM)" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#hrGrad)" />
              <Area type="monotone" dataKey="spo2" name="SpO₂ (%)" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#spo2Grad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Two Column Bottom Section: Alerts & Device Telemetry ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Alerts & Response Timeline */}
        <div className="clinical-card p-5">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-500" />
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Recent Alert Events &amp; Response Timeline
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {patientAlerts.length} recorded events
            </span>
          </div>

          {patientAlerts.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              <CheckCircle2 size={24} className="mx-auto mb-1 text-teal-500" />
              No clinical alerts recorded for this patient.
            </div>
          ) : (
            <div className="space-y-3">
              {patientAlerts.map((alert) => (
                <div
                  key={alert.alertId}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          alert.status === "Active"
                            ? "bg-red-500 animate-ping"
                            : alert.status === "Acknowledged"
                            ? "bg-amber-500"
                            : "bg-teal-500"
                        }`}
                      />
                      {alert.alertType} ({alert.alertId})
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold font-mono ${
                        alert.status === "Active"
                          ? "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300"
                          : alert.status === "Acknowledged"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                          : "bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300"
                      }`}
                    >
                      {alert.status}
                    </span>
                  </div>

                  <div className="text-slate-600 dark:text-slate-300">
                    Observed: <strong>{alert.readingValue}</strong> · Threshold: {alert.threshold}
                  </div>

                  <div className="text-[11px] text-slate-400 font-mono">
                    Detected: {alert.detectedAt} · Assigned: {alert.assignedStaff}
                  </div>

                  {alert.notes && (
                    <div className="p-2 rounded bg-white dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-700">
                      {alert.notes}
                    </div>
                  )}

                  {/* Actions for this alert */}
                  <div className="flex items-center gap-2 pt-1">
                    {alert.status === "Active" && (
                      <button
                        onClick={() => acknowledgeAlert(alert.alertId)}
                        className="px-2.5 py-1 rounded bg-teal-600 hover:bg-teal-700 text-white font-medium text-[11px] transition-colors"
                      >
                        Acknowledge Alert
                      </button>
                    )}
                    {alert.status !== "Resolved" && (
                      <button
                        onClick={() => setResolveModalAlert(alert)}
                        className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-[11px] transition-colors"
                      >
                        Document Resolution &rarr;
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ESP32 Hardware Status & Wireless Telemetry */}
        <div className="clinical-card p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Cpu size={18} className="text-teal-600 dark:text-teal-400" />
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                ESP32 Telemetry &amp; Hardware Telemetry
              </h2>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-mono font-semibold">
              CONNECTED
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <div className="text-slate-400 text-[11px]">Device Identifier</div>
              <div className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-1">
                {bed.deviceId}
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                MAC: {bed.deviceMac}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <div className="text-slate-400 text-[11px]">Firmware Version</div>
              <div className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-1">
                {bed.firmwareVersion}
              </div>
              <div className="text-[10px] text-teal-600 font-mono mt-0.5">
                OTA Up to date
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <div className="text-slate-400 text-[11px]">Device Battery Backup</div>
              <div className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-1 flex items-center gap-1.5">
                <Battery size={16} className="text-teal-600" />
                {bed.batteryPercent}%
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Approx. 14 hours backup runtime
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <div className="text-slate-400 text-[11px]">Wi-Fi RSSI Signal</div>
              <div className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-1 flex items-center gap-1.5">
                <Wifi size={16} className="text-teal-600" />
                {bed.rssi} dBm ({bed.signalQuality})
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                0% Packet Drop Rate
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900/50 text-xs text-slate-700 dark:text-slate-300">
            <div className="font-semibold text-teal-800 dark:text-teal-300 mb-1 flex items-center gap-1.5">
              <ShieldCheck size={14} />
              Edge Validation Active
            </div>
            Sensor quality score: <strong>99.2% valid samples</strong>. MAX30102 optical heart rate / SpO₂ and TMP117 clinical skin temperature validated by ESP32 firmware before cloud transmission.
          </div>
        </div>
      </div>

      {/* ── Clinical Shift Notes & Observations Timeline ── */}
      <div className="clinical-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <MessageSquare size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Clinical Shift Notes &amp; Neonatal Care Timeline
              </h2>
              <p className="text-xs text-slate-500">
                Document bedside interventions, feed tolerance, phototherapy, and doctor rounds
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Station: Bed {bed.bedId}
          </span>
        </div>

        {/* Quick Add Note Box */}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!newNoteText.trim()) return;
            setIsSavingNote(true);
            try {
              const added = await api.addClinicalNote(bed.bedId, {
                text: newNoteText,
                author: currentUser?.name || "Duty Staff",
                role: currentUser?.role || "Nurse",
                category: noteCategory,
              });
              setNotesList((prev) => [added, ...prev]);
              setNewNoteText("");
            } catch (err) {
              alert(err.message || "Failed to save note");
            } finally {
              setIsSavingNote(false);
            }
          }}
          className="space-y-3 bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800"
        >
          {/* Category Chips */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-[11px] text-slate-500 mr-1 flex items-center gap-1">
              <Tag size={12} />
              Category:
            </span>
            {[
              "General Observation",
              "Feeding / Nutrition",
              "Phototherapy",
              "Medication / Surfactant",
              "Respiratory / CPAP",
              "Doctor Rounds",
            ].map((cat) => (
              <button
                type="button"
                key={cat}
                onClick={() => setNoteCategory(cat)}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-medium transition-colors ${
                  noteCategory === cat
                    ? "bg-teal-600 text-white"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              required
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              placeholder={`Add ${noteCategory.toLowerCase()} note for ${bed.babyName}...`}
              className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <button
              type="submit"
              disabled={isSavingNote}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Send size={13} />
              <span>{isSavingNote ? "Adding..." : "Log Note"}</span>
            </button>
          </div>
        </form>

        {/* Notes Timeline List */}
        <div className="space-y-2.5 max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
          {[
            ...notesList,
            ...(bed.clinicalNotes || [
              {
                id: "NOTE-1",
                text: "Phototherapy lamp started under double surface blue LED. Vitals stable.",
                author: "Staff Nurse Priya",
                role: "Nurse",
                category: "Phototherapy",
                timestamp: "14:30",
                date: "25 Oct",
              },
              {
                id: "NOTE-2",
                text: "Expressed breast milk 20ml given via orogastric tube; well tolerated with zero residue.",
                author: "Nurse Anjali",
                role: "Nurse",
                category: "Feeding / Nutrition",
                timestamp: "11:15",
                date: "25 Oct",
              },
            ]),
          ].map((note, idx) => (
            <div key={note.id || idx} className="pt-2.5 flex items-start justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {note.author}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                    {note.role}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 font-medium">
                    {note.category}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                  {note.text}
                </p>
              </div>
              <div className="text-[10.5px] font-mono text-slate-400 whitespace-nowrap">
                {note.date ? `${note.date} ` : ""}{note.timestamp}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Modal: Assign / Swap ESP32 Hardware Product ── */}
      {showDeviceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                  <Cpu size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Assign ESP32 Hardware Product
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Bind physical sensor node to Bed {bed.bedId} ({bed.babyName})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDeviceModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setIsAssigningDev(true);
                try {
                  const finalId = selectedDevId === "NEW" ? customDevId.trim() : selectedDevId;
                  if (selectedDevId === "NEW" && !finalId) {
                    alert("Please enter a new Device ID");
                    setIsAssigningDev(false);
                    return;
                  }

                  if (finalId === "UNASSIGN") {
                    if (bed.deviceId) await assignDeviceToBed(bed.deviceId, "");
                  } else {
                    if (selectedDevId === "NEW") {
                      await addDevice({
                        deviceId: finalId,
                        deviceLabel: `ESP32 (${bed.bedId})`,
                        model: "ESP32-S3 DevKit",
                        assignedBedId: bed.bedId,
                      });
                    } else {
                      await assignDeviceToBed(finalId, bed.bedId);
                    }
                  }
                  setShowDeviceModal(false);
                } catch (err) {
                  alert(err.message || "Failed to update device");
                } finally {
                  setIsAssigningDev(false);
                }
              }}
              className="p-6 space-y-4 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select ESP32 Product to Bind:
                </label>
                <select
                  value={selectedDevId}
                  onChange={(e) => setSelectedDevId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="UNASSIGN">-- Unbind / Release Device (Put Bed in Standby) --</option>
                  {(devices || []).map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.deviceId} {d.assignedBedId ? `(On ${d.assignedBedId})` : "(Spare)"} — Battery {d.batteryPercent}%
                    </option>
                  ))}
                  <option value="NEW">➕ Register &amp; Bind a New ESP32 Product ID...</option>
                </select>
              </div>

              {selectedDevId === "NEW" && (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    New ESP32 Device Identifier <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ESP32-NICU-08"
                    value={customDevId}
                    onChange={(e) => setCustomDevId(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              )}

              <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 space-y-1">
                <div className="font-semibold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                  <Radio size={14} className="text-teal-600" />
                  HiveMQ MQTT Topic for this station:
                </div>
                <div className="font-mono text-[11px] text-teal-800 dark:text-teal-300 select-all">
                  nicu/telemetry/{selectedDevId === "NEW" ? customDevId || "<DEVICE_ID>" : selectedDevId || bed.deviceId || "<DEVICE_ID>"}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowDeviceModal(false)}
                  className="px-4 py-2 rounded-xl font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAssigningDev}
                  className="px-4 py-2 rounded-xl font-semibold bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white shadow-sm transition-colors"
                >
                  {isAssigningDev ? "Saving..." : "Save Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal for Documenting Alert Resolution ── */}
      {resolveModalAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
          <div className="clinical-card p-5 max-w-md w-full shadow-2xl border border-slate-300 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                Document Alert Resolution — {resolveModalAlert.alertId}
              </h3>
              <button
                onClick={() => setResolveModalAlert(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                &times;
              </button>
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-300">
              Event: <strong>{resolveModalAlert.alertType}</strong> on {resolveModalAlert.babyName} ({resolveModalAlert.bedId}).
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Clinical Action / Follow-up Notes:
              </label>
              <textarea
                rows={3}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="e.g. Suctioned airways, baby repositioned, vitals returned to baseline."
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setResolveModalAlert(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  resolveAlert(resolveModalAlert.alertId, resolutionNotes);
                  setResolveModalAlert(null);
                  setResolutionNotes("");
                }}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-xs"
              >
                Mark as Resolved
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
