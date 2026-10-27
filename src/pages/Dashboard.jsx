// =============================================================
// Dashboard.jsx — Main Clinical Command Center Screen
// Multi-Patient Real-Time Telemetry Monitor, Live Vital Tiles,
// PPG Waveform feeds, and Critical Alarm Triage.
// Focused purely on live monitoring (Admissions and Discharges
// are managed exclusively within the Patients Registry).
// =============================================================

import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Bed,
  Activity,
  AlertTriangle,
  Cpu,
  Search,
  CheckCircle2,
  Filter,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Baby,
  X,
  Radio,
  UserCheck,
  Wifi,
  ExternalLink,
} from "lucide-react";
import PatientBedCard from "../components/PatientBedCard";
import { useApp } from "../context/AppContext";
import { api } from "../services/api";

export default function Dashboard() {
  const {
    beds,
    totalBeds,
    activeMonitoringCount,
    activeAlertsCount,
    devicesOnlineCount,
    acknowledgeAlert,
    waveforms,
    searchQuery,
    setSearchQuery,
    devices,
    staffList,
    assignDeviceToBed,
    addDevice,
    currentUser,
    can,
  } = useApp();

  const [assignModalBed, setAssignModalBed] = useState(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [customDeviceId, setCustomDeviceId] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [mqttPingStatus, setMqttPingStatus] = useState(null);

  // Available ESP32 sensors for assignment (includes all registered nodes)
  const availableDevices = useMemo(() => {
    return devices || [];
  }, [devices]);

  const handleAssignDeviceSubmit = async (e) => {
    e.preventDefault();
    if (!assignModalBed) return;
    setIsAssigning(true);
    try {
      const finalDeviceId = selectedDeviceId === "NEW" ? customDeviceId.trim() : selectedDeviceId;
      if (selectedDeviceId === "NEW" && !finalDeviceId) {
        alert("Please enter a new Device ID (e.g. ESP32-NICU-07)");
        setIsAssigning(false);
        return;
      }

      if (finalDeviceId === "UNASSIGN") {
        if (assignModalBed.deviceId) {
          await assignDeviceToBed(assignModalBed.deviceId, "");
        }
      } else {
        if (selectedDeviceId === "NEW") {
          await addDevice({
            deviceId: finalDeviceId,
            deviceLabel: `ESP32 (${assignModalBed.bedId})`,
            model: "ESP32-S3 DevKit",
            assignedBedId: assignModalBed.bedId,
          });
        } else {
          await assignDeviceToBed(finalDeviceId, assignModalBed.bedId);
        }
      }
      setAssignModalBed(null);
      setSelectedDeviceId("");
      setCustomDeviceId("");
    } catch (err) {
      alert(err.message || "Failed to update device assignment");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleTestMqttPing = async (devId, bId) => {
    setMqttPingStatus("Pinging HiveMQ broker...");
    try {
      await api.testPublishMqtt({
        deviceId: devId || "ESP32-NICU-01",
        bedId: bId || "NICU-01",
        heartRate: 142,
        spo2: 98,
        temperature: 36.8,
      });
      setMqttPingStatus("Success! Live sensor telemetry ingested & Bed updated.");
      setTimeout(() => setMqttPingStatus(null), 4000);
    } catch (err) {
      setMqttPingStatus("Ping failed: " + (err.message || "Error"));
    }
  };

  // Filter beds safely based on search query
  const filteredBeds = useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) return beds;
    const q = searchQuery.toLowerCase().trim();
    return (beds || []).filter(
      (b) =>
        b.bedId?.toLowerCase().includes(q) ||
        b.patientId?.toLowerCase().includes(q) ||
        b.babyName?.toLowerCase().includes(q) ||
        b.motherName?.toLowerCase().includes(q) ||
        b.assignedDoctorName?.toLowerCase().includes(q)
    );
  }, [beds, searchQuery]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ── Top Clinical Command Center Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>NeoCare Command Center</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1.5 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              LIVE TELEMETRY
            </span>
            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800">
              <Radio size={12} className="text-blue-600 animate-pulse" />
              HiveMQ MQTT: Online
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Continuous vital monitoring for {totalBeds} neonatal incubator stations · Sensor hardware telemetry
          </p>
        </div>

        {/* Global Unit Alert Status & Link to Patients Registry */}
        <div className="flex items-center gap-3">
          <Link
            to="/patients"
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/10 flex items-center gap-2 transition-all cursor-pointer"
            title="Navigate to Inpatient Registry for patient admission and discharge"
          >
            <Baby size={15} />
            <span>Patients &amp; Inpatient Registry</span>
            <ArrowRight size={13} className="opacity-75" />
          </Link>

          {activeAlertsCount > 0 ? (
            <Link
              to="/alerts"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold shadow-xs hover:bg-rose-100 transition-colors"
            >
              <AlertTriangle size={15} className="text-rose-600 animate-bounce" />
              <span>{activeAlertsCount} Active Alert{activeAlertsCount > 1 ? "s" : ""}</span>
            </Link>
          ) : (
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold shadow-xs">
              <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400" />
              <span>All Beds Nominal</span>
            </div>
          )}
        </div>
      </div>

      {/* ── 4 KPI Summary Cards (Modern Hospital White & Blue Look) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total Beds */}
        <div className="clinical-card p-4 sm:p-5 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
            <Bed size={22} />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Beds
            </div>
            <div className="text-2xl font-extrabold font-mono text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
              {totalBeds}
            </div>
            <div className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
              6 configured stations
            </div>
          </div>
        </div>

        {/* Active Monitoring */}
        <div className="clinical-card p-4 sm:p-5 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
            <Activity size={22} />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Active Monitoring
            </div>
            <div className="text-2xl font-extrabold font-mono text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
              {activeMonitoringCount}
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              Real sensor telemetry active
            </div>
          </div>
        </div>

        {/* Active Alerts */}
        <div className="clinical-card p-4 sm:p-5 flex items-center gap-3.5">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border ${activeAlertsCount > 0
                ? "bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400"
                : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400"
              }`}
          >
            <AlertTriangle size={22} />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Active Alerts
            </div>
            <div
              className={`text-2xl font-extrabold font-mono tracking-tight leading-tight ${activeAlertsCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-slate-100"
                }`}
            >
              {activeAlertsCount}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {activeAlertsCount > 0 ? "Threshold violations detected" : "Zero active alarms"}
            </div>
          </div>
        </div>

        {/* ESP32 Hardware Online */}
        <div className="clinical-card p-4 sm:p-5 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 flex items-center justify-center text-sky-600 dark:text-sky-400 flex-shrink-0">
            <Cpu size={22} />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Sensors Online
            </div>
            <div className="text-2xl font-extrabold font-mono text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
              {devicesOnlineCount} / {devices.length || totalBeds}
            </div>
            <div className="text-[11px] text-sky-600 dark:text-sky-400 font-medium">
              ESP32 hardware connected
            </div>
          </div>
        </div>
      </div>

      {/* ── Search Bar & Filter Strip ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1 max-w-xl">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-600" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search baby name, bed ID (NICU-01), patient ID, or attending doctor..."
            className="w-full pl-10 pr-10 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 font-mono transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white text-sm px-1 cursor-pointer"
              title="Clear search"
            >
              ×
            </button>
          )}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 text-xs font-mono text-slate-500">
          <span>Showing <strong>{filteredBeds.length}</strong> of <strong>{beds.length}</strong> Incubator Stations</span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-blue-600 hover:underline font-semibold cursor-pointer"
            >
              Clear Filter
            </button>
          )}
        </div>
      </div>

      {/* ── 6-Bed Responsive Patient Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredBeds.map((bed) => (
          <PatientBedCard
            key={bed.bedId}
            bed={bed}
            onAcknowledgeAlert={acknowledgeAlert}
            onAssignDevice={(bedToAssign) => {
              setAssignModalBed(bedToAssign);
              setSelectedDeviceId(bedToAssign.deviceId || "UNASSIGN");
            }}
          />
        ))}
      </div>

      {/* ── Modal: Assign Online ESP32 Hardware Product ── */}
      {assignModalBed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Cpu size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Assign Online ESP32 Sensor
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Bind active hardware to Bed {assignModalBed.bedId} ({assignModalBed.babyName || "Station"})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAssignModalBed(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAssignDeviceSubmit} className="p-6 space-y-4">
              <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-slate-800/60 border border-blue-100 dark:border-slate-700 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Selected Station:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                    {assignModalBed.bedId} · {assignModalBed.babyName || "Empty Station"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Currently Bound Sensor:</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                    {assignModalBed.deviceId || "None (Bed in Standby)"}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Select ESP32 Sensor Hardware:
                </label>
                <select
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="UNASSIGN">-- Unbind / Release Device (Put Station in Standby) --</option>
                  {availableDevices.length === 0 ? (
                    <option disabled value="">No ESP32 devices found in registry</option>
                  ) : (
                    availableDevices.map((d) => {
                      const isOnline = Boolean(d.isOnline || d.status === "ONLINE");
                      return (
                        <option key={d.deviceId} value={d.deviceId}>
                          {isOnline ? "🟢 Live: " : "⚪ Standby: "} {d.deviceId}
                          {d.assignedBedId ? ` (Currently on ${d.assignedBedId})` : " (Free / Ready)"}
                          {` · Battery ${d.batteryPercent || 100}%`}
                        </option>
                      );
                    })
                  )}
                  <option value="NEW">➕ Register &amp; Bind a New ESP32 Hardware ID...</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1.5 font-medium">
                  Select any ESP32 hardware device (like <code>ESP32-NICU-01</code>) to stream telemetry to Bed {assignModalBed.bedId}.
                </p>
              </div>

              {selectedDeviceId === "NEW" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    New ESP32 Sensor Hardware ID <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ESP32-NICU-07"
                    value={customDeviceId}
                    onChange={(e) => setCustomDeviceId(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Use this ID in your Arduino firmware sketch as <code>DEVICE_ID</code>.
                  </p>
                </div>
              )}

              {/* HiveMQ Telemetry Ingestion Verify Block */}
              {selectedDeviceId !== "UNASSIGN" && (
                <div className="p-3.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs space-y-2">
                  <div className="flex items-center justify-between font-semibold text-blue-900 dark:text-blue-200">
                    <span className="flex items-center gap-1.5">
                      <Radio size={14} className="text-blue-600 animate-pulse" />
                      HiveMQ MQTT Telemetry Topic:
                    </span>
                    <span className="text-[10px] bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-blue-300 dark:border-blue-700 font-mono">
                      broker.hivemq.com:1883
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-900 font-mono text-[11px] text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900 select-all">
                    nicu/telemetry/{selectedDeviceId === "NEW" ? customDeviceId || "<DEVICE_ID>" : selectedDeviceId || assignModalBed.deviceId || "<DEVICE_ID>"}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-600 dark:text-slate-400">
                      Verify live connection:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleTestMqttPing(selectedDeviceId === "NEW" ? customDeviceId : selectedDeviceId, assignModalBed.bedId)}
                      className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[10.5px] transition-colors cursor-pointer"
                    >
                      Send Test Ping
                    </button>
                  </div>
                  {mqttPingStatus && (
                    <div className="text-[11px] font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      {mqttPingStatus}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setAssignModalBed(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAssigning}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>{isAssigning ? "Saving..." : "Save Sensor Binding"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
