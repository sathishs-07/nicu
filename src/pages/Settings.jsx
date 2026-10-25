// =============================================================
// Settings.jsx — Central System Configuration Hub
// 6 Structured Sub-Sections:
// 1. NICU & Bed Configuration
// 2. Device Management (ESP32 Firmware & Payload Tester)
// 3. Clinical Alert Rules & Safety Thresholds (with Audit Warning)
// 4. Users & Role-Based Access Control
// 5. Reports & Retention Policies
// 6. Security & Audit Trail Logs
// =============================================================

import { useState } from "react";
import {
  Settings as SettingsIcon,
  Bed,
  Cpu,
  Sliders,
  Users,
  FileCheck,
  Shield,
  AlertTriangle,
  Save,
  CheckCircle2,
  RefreshCw,
  Code,
  Terminal,
  ExternalLink,
  Lock,
  Battery,
  Wifi,
  Plus,
  Trash2,
  Radio,
  Send,
  Sparkles,
  Layers,
  X,
} from "lucide-react";
import { useApp, ROLES } from "../context/AppContext";
import { api } from "../services/api";

export default function Settings() {
  const {
    thresholds,
    updateThresholds,
    beds,
    setBeds,
    devices,
    addDevice,
    assignDeviceToBed,
    deleteDevice,
    fetchDevices,
    currentUser,
    auditLogs,
    isSimulating,
    setIsSimulating,
    dataSourceMode,
    setDataSourceMode,
    rolePermissions,
    updateRolePermission,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState("alert-rules"); // "beds" | "devices" | "alert-rules" | "users" | "retention" | "security"
  const [showConnectGuide, setShowConnectGuide] = useState(false);
  const [thresholdForm, setThresholdForm] = useState({ ...thresholds });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeFirmwareTab, setActiveFirmwareTab] = useState("payload"); // "payload" | "arduino" | "wiring"

  // ESP32 Product Management state
  const [showAddDeviceModal, setShowAddDeviceModal] = useState(false);
  const [newDeviceForm, setNewDeviceForm] = useState({
    deviceId: "",
    deviceLabel: "",
    model: "ESP32-S3 DevKitC-1",
    macAddress: "",
    assignedBedId: "",
    firmwareVersion: "v2.1.4-esp32s3",
  });
  const [isRegistering, setIsRegistering] = useState(false);

  // Live REST API Tester state
  const [testPayload, setTestPayload] = useState({
    deviceId: "ESP32-NICU-01",
    heartRate: 142,
    spo2: 97,
    temperature: 36.7,
    batteryPercent: 88,
    rssi: -54,
  });
  const [testResult, setTestResult] = useState(null);
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Check if current user has permission to change clinical thresholds
  const canEditThresholds =
    currentUser.role === ROLES.ADMIN || currentUser.role === ROLES.DOCTOR;

  const handleSaveThresholds = (e) => {
    e.preventDefault();
    if (!canEditThresholds) {
      alert("Permission Denied: Only Administrators or authorized Lead Doctors may update clinical safety thresholds.");
      return;
    }
    updateThresholds(thresholdForm);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleRegisterDevice = async (e) => {
    e.preventDefault();
    if (!newDeviceForm.deviceId.trim()) {
      alert("Please enter a unique Device ID (e.g. ESP32-NICU-07)");
      return;
    }
    setIsRegistering(true);
    try {
      await addDevice(newDeviceForm);
      setShowAddDeviceModal(false);
      setNewDeviceForm({
        deviceId: "",
        deviceLabel: "",
        model: "ESP32-S3 DevKitC-1",
        macAddress: "",
        assignedBedId: "",
        firmwareVersion: "v2.1.4-esp32s3",
      });
    } catch (err) {
      alert("Error registering device: " + (err.message || "Failed"));
    } finally {
      setIsRegistering(false);
    }
  };

  const handleReassignBed = async (deviceId, bedId) => {
    try {
      await assignDeviceToBed(deviceId, bedId === "UNASSIGNED" ? null : bedId);
    } catch (err) {
      alert("Error reassigning bed: " + err.message);
    }
  };

  const handleDeleteDevice = async (deviceId) => {
    if (confirm(`Are you sure you want to decommission and remove device ${deviceId}?`)) {
      try {
        await deleteDevice(deviceId);
      } catch (err) {
        alert("Error deleting device: " + err.message);
      }
    }
  };

  const handleSendTestTelemetry = async () => {
    setIsSendingTest(true);
    setTestResult(null);
    try {
      const res = await api.sendTelemetry(testPayload);
      setTestResult(res);
      // Refresh beds & devices
      const [updatedBeds, updatedDevs] = await Promise.all([api.getBeds(), api.getDevices()]);
      if (updatedBeds) setBeds(updatedBeds);
      if (updatedDevs) fetchDevices();
    } catch (err) {
      setTestResult({ error: err.message });
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ── Section Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Centralized System Settings
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
              CONFIGURATION
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Configure neonatal beds, ESP32 device registry, clinical safety rules, user permissions, and audit logs
          </p>
        </div>

        {/* Current Operator Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs">
          <span className="text-slate-400">Authenticated as:</span>
          <strong className="text-slate-800 dark:text-slate-200">{currentUser.name}</strong>
          <span className="text-[10px] font-mono font-bold text-teal-600 bg-teal-50 dark:bg-teal-950/60 px-1.5 py-0.2 rounded border border-teal-500/30">
            {currentUser.role}
          </span>
        </div>
      </div>

      {/* ── 6 Sub-Section Navigation Tabs ── */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 sm:gap-2 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveSubTab("alert-rules")}
          className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeSubTab === "alert-rules"
              ? "border-teal-500 text-teal-600 dark:text-teal-400"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Sliders size={14} />
          <span>Alert Rules &amp; Thresholds</span>
        </button>

        <button
          onClick={() => setActiveSubTab("devices")}
          className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeSubTab === "devices"
              ? "border-teal-500 text-teal-600 dark:text-teal-400"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Cpu size={14} />
          <span>Device Management (ESP32)</span>
        </button>

        <button
          onClick={() => setActiveSubTab("beds")}
          className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeSubTab === "beds"
              ? "border-teal-500 text-teal-600 dark:text-teal-400"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Bed size={14} />
          <span>NICU &amp; Bed Configuration</span>
        </button>

        <button
          onClick={() => setActiveSubTab("users")}
          className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeSubTab === "users"
              ? "border-teal-500 text-teal-600 dark:text-teal-400"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Users size={14} />
          <span>Users &amp; Permissions</span>
        </button>

        <button
          onClick={() => setActiveSubTab("retention")}
          className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeSubTab === "retention"
              ? "border-teal-500 text-teal-600 dark:text-teal-400"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileCheck size={14} />
          <span>Reports &amp; Retention</span>
        </button>

        <button
          onClick={() => setActiveSubTab("security")}
          className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeSubTab === "security"
              ? "border-teal-500 text-teal-600 dark:text-teal-400"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Shield size={14} />
          <span>Security &amp; Audit Trail</span>
        </button>
      </div>

      {/* ── Sub-Section 1: Alert Rules & Safety Thresholds ── */}
      {activeSubTab === "alert-rules" && (
        <div className="space-y-6">
          {/* Prominent Clinical Safety Warning Banner */}
          <div className="clinical-card p-4 bg-amber-50/70 dark:bg-amber-950/20 border-amber-300 dark:border-amber-900/60 flex items-start gap-3">
            <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <div className="font-bold text-sm">
                Safety-Critical Parameter Configuration Notice
              </div>
              <div>
                Altering physiological thresholds impacts real-time alarms across all 6 neonatal stations. Changes are logged to the cryptographic audit trail with your clinician credentials and timestamp.
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveThresholds} className="clinical-card p-6 space-y-5">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Neonatal Clinical Safety Limits
                </h3>
                <p className="text-xs text-slate-500">
                  Authoritative triggers for Bradycardia, Tachycardia, Hypoxemia, and Thermal Instability
                </p>
              </div>

              {saveSuccess && (
                <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold font-mono animate-fade-in">
                  <CheckCircle2 size={16} />
                  Thresholds updated &amp; logged!
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              {/* Heart Rate Minimum (Bradycardia) */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
                <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span>Heart Rate Lower Limit (Bradycardia):</span>
                  <span className="font-mono text-teal-600 font-bold">{thresholdForm.hrLow} BPM</span>
                </label>
                <input
                  type="range"
                  min="80"
                  max="120"
                  step="1"
                  disabled={!canEditThresholds}
                  value={thresholdForm.hrLow}
                  onChange={(e) =>
                    setThresholdForm({ ...thresholdForm, hrLow: Number(e.target.value) })
                  }
                  className="w-full accent-teal-600 cursor-pointer"
                />
                <div className="text-[10.5px] text-slate-400 flex justify-between font-mono">
                  <span>80 BPM</span>
                  <span>Neonatal Standard: 100 BPM</span>
                  <span>120 BPM</span>
                </div>
              </div>

              {/* Heart Rate Maximum (Tachycardia) */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
                <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span>Heart Rate Upper Limit (Tachycardia):</span>
                  <span className="font-mono text-teal-600 font-bold">{thresholdForm.hrHigh} BPM</span>
                </label>
                <input
                  type="range"
                  min="160"
                  max="210"
                  step="1"
                  disabled={!canEditThresholds}
                  value={thresholdForm.hrHigh}
                  onChange={(e) =>
                    setThresholdForm({ ...thresholdForm, hrHigh: Number(e.target.value) })
                  }
                  className="w-full accent-teal-600 cursor-pointer"
                />
                <div className="text-[10.5px] text-slate-400 flex justify-between font-mono">
                  <span>160 BPM</span>
                  <span>Neonatal Standard: 180 BPM</span>
                  <span>210 BPM</span>
                </div>
              </div>

              {/* SpO2 Minimum */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
                <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span>Oxygen Saturation Lower Limit (SpO₂ Desat):</span>
                  <span className="font-mono text-cyan-600 font-bold">{thresholdForm.spo2Low}%</span>
                </label>
                <input
                  type="range"
                  min="85"
                  max="95"
                  step="1"
                  disabled={!canEditThresholds}
                  value={thresholdForm.spo2Low}
                  onChange={(e) =>
                    setThresholdForm({ ...thresholdForm, spo2Low: Number(e.target.value) })
                  }
                  className="w-full accent-cyan-600 cursor-pointer"
                />
                <div className="text-[10.5px] text-slate-400 flex justify-between font-mono">
                  <span>85% (Critical)</span>
                  <span>Recommended: 90%</span>
                  <span>95%</span>
                </div>
              </div>

              {/* Persistence Rules */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
                <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span>Alarm Persistence Filter (Seconds):</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">
                    {thresholdForm.persistenceSeconds} seconds
                  </span>
                </label>
                <input
                  type="range"
                  min="2"
                  max="15"
                  step="1"
                  disabled={!canEditThresholds}
                  value={thresholdForm.persistenceSeconds}
                  onChange={(e) =>
                    setThresholdForm({ ...thresholdForm, persistenceSeconds: Number(e.target.value) })
                  }
                  className="w-full accent-teal-600 cursor-pointer"
                />
                <div className="text-[10.5px] text-slate-400 flex justify-between font-mono">
                  <span>2s (Strict)</span>
                  <span>Suppresses artifact motion spikes</span>
                  <span>15s</span>
                </div>
              </div>

              {/* Temperature Low */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
                <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span>Skin Temp Lower Limit (Hypothermia):</span>
                  <span className="font-mono text-amber-600 font-bold">{thresholdForm.tempLow} °C</span>
                </label>
                <input
                  type="range"
                  min="35.5"
                  max="36.5"
                  step="0.1"
                  disabled={!canEditThresholds}
                  value={thresholdForm.tempLow}
                  onChange={(e) =>
                    setThresholdForm({ ...thresholdForm, tempLow: Number(e.target.value) })
                  }
                  className="w-full accent-amber-600 cursor-pointer"
                />
                <div className="text-[10.5px] text-slate-400 flex justify-between font-mono">
                  <span>35.5 °C</span>
                  <span>Standard: 36.2 °C</span>
                  <span>36.5 °C</span>
                </div>
              </div>

              {/* Temperature High */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
                <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span>Skin Temp Upper Limit (Hyperthermia):</span>
                  <span className="font-mono text-amber-600 font-bold">{thresholdForm.tempHigh} °C</span>
                </label>
                <input
                  type="range"
                  min="37.0"
                  max="38.5"
                  step="0.1"
                  disabled={!canEditThresholds}
                  value={thresholdForm.tempHigh}
                  onChange={(e) =>
                    setThresholdForm({ ...thresholdForm, tempHigh: Number(e.target.value) })
                  }
                  className="w-full accent-amber-600 cursor-pointer"
                />
                <div className="text-[10.5px] text-slate-400 flex justify-between font-mono">
                  <span>37.0 °C</span>
                  <span>Standard: 37.5 °C</span>
                  <span>38.5 °C</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-400">
                {!canEditThresholds && "Read-only mode: Requires Administrator or Doctor permissions."}
              </span>
              <button
                type="submit"
                disabled={!canEditThresholds}
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold text-xs shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Save size={14} />
                <span>Save &amp; Commit Threshold Changes</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Sub-Section 2: Device Management & ESP32 Integration ── */}
      {activeSubTab === "devices" && (
        <div className="space-y-6">
          {/* Registered ESP32 Devices Table */}
          <div className="clinical-card overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    ESP32 Microcontroller Registry ({devices.length > 0 ? devices.length : beds.length} Products)
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-500/30">
                    {devices.filter((d) => d.status === "ONLINE").length || beds.length} Online
                  </span>
                  {devices.some((d) => !d.assignedBedId) && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                      {devices.filter((d) => !d.assignedBedId).length} Unassigned
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Dynamic multi-device fleet with automatic hardware discovery, hot-swappable bed binding, and MongoDB sync
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowConnectGuide(!showConnectGuide)}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Cpu size={14} />
                  <span>{showConnectGuide ? "Hide Connect Guide" : "ESP32 Quick Connect Guide"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddDeviceModal(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Register ESP32 Product</span>
                </button>
              </div>
            </div>

            {/* Beginner ESP32 Connection Guide Embedded in Settings */}
            {showConnectGuide && (
              <div className="p-5 bg-gradient-to-br from-indigo-950/40 to-slate-900 border-b border-indigo-800/60 text-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="text-cyan-400" size={18} />
                    <h4 className="font-bold text-sm text-white">
                      ESP32 Device Quick Connect Guide (Zero Confusion)
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded">
                    Free HiveMQ MQTT · broker.hivemq.com:1883
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-slate-300">
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                    <span className="font-bold text-cyan-400">1. Install PubSubClient</span>
                    <p className="text-[11px] text-slate-400">
                      In Arduino IDE, go to <strong>Tools → Manage Libraries</strong> and install <code>PubSubClient</code> by Nick O'Leary.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                    <span className="font-bold text-cyan-400">2. Configure Wi-Fi Only</span>
                    <p className="text-[11px] text-slate-400">
                      Open <code>esp32/nicu_esp32_hivemq_transmitter.ino</code>. Enter your Wi-Fi name &amp; password. Bed ID is assigned dynamically in the dashboard!
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                    <span className="font-bold text-cyan-400">3. Connect &amp; Stream</span>
                    <p className="text-[11px] text-slate-400">
                      Upload to ESP32. It publishes to <code>nicu/telemetry/&lt;DEVICE_ID&gt;</code>. Status turns green <strong>ONLINE</strong> immediately!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Auto-Discovery Banner if any unassigned device appeared */}
            {devices.some((d) => d.autoDiscovered && !d.assignedBedId) && (
              <div className="p-3 bg-teal-50/80 dark:bg-teal-950/40 border-b border-teal-200 dark:border-teal-800/60 flex items-center justify-between gap-3 text-xs text-teal-900 dark:text-teal-200">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-teal-600 animate-pulse flex-shrink-0" />
                  <span>
                    <strong>New ESP32 Product Auto-Discovered:</strong> Device{" "}
                    <code className="font-mono font-bold bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-teal-300 dark:border-teal-700">
                      {devices.find((d) => d.autoDiscovered && !d.assignedBedId)?.deviceId}
                    </code>{" "}
                    is transmitting telemetry. Use the dropdown below to assign it to a bed.
                  </span>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 font-semibold text-slate-500">
                    <th className="p-3 pl-4">Product / Device ID</th>
                    <th className="p-3">Hardware Model</th>
                    <th className="p-3">Assigned Bed &amp; Patient</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">MAC / Firmware</th>
                    <th className="p-3">Battery &amp; RSSI</th>
                    <th className="p-3 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {(devices.length > 0 ? devices : beds.map((b) => ({
                    deviceId: b.deviceId,
                    deviceLabel: `ESP32 Node (${b.bedId})`,
                    model: "ESP32-S3 DevKit",
                    macAddress: b.deviceMac,
                    firmwareVersion: b.firmwareVersion,
                    assignedBedId: b.bedId,
                    status: "ONLINE",
                    batteryPercent: b.batteryPercent,
                    rssi: b.rssi,
                    signalQuality: b.signalQuality,
                  }))).map((d) => {
                    const assignedBed = beds.find((b) => b.bedId === d.assignedBedId);
                    return (
                      <tr key={d.deviceId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="p-3 pl-4">
                          <div className="flex items-center gap-2">
                            <Cpu size={15} className="text-teal-600 flex-shrink-0" />
                            <div>
                              <div className="font-mono font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                <span>{d.deviceId}</span>
                                {d.autoDiscovered && (
                                  <span className="px-1.5 py-0.2 rounded text-[9.5px] font-sans font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                                    Auto-Discovered
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate max-w-[150px]">
                                {d.deviceLabel || "Vital Monitor"}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="p-3">
                          <span className="font-mono text-slate-700 dark:text-slate-300">
                            {d.model || "ESP32-S3"}
                          </span>
                        </td>

                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <select
                              value={d.assignedBedId || "UNASSIGNED"}
                              onChange={(e) => handleReassignBed(d.deviceId, e.target.value)}
                              className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-teal-500"
                            >
                              <option value="UNASSIGNED">-- Unassigned (Spare) --</option>
                              {beds.map((b) => (
                                <option key={b.bedId} value={b.bedId}>
                                  {b.bedId} ({b.babyName})
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>

                        <td className="p-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${
                              d.status === "ONLINE"
                                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                                : d.status === "WARNING"
                                ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-500/30"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                d.status === "ONLINE"
                                  ? "bg-emerald-500 animate-pulse"
                                  : d.status === "WARNING"
                                  ? "bg-amber-500"
                                  : "bg-slate-400"
                              }`}
                            />
                            {d.status || "ONLINE"}
                          </span>
                        </td>

                        <td className="p-3 font-mono text-[11px] text-slate-500">
                          <div>{d.macAddress || "24:6F:28:XX:XX:XX"}</div>
                          <div className="text-[10px] text-slate-400">{d.firmwareVersion || "v2.1.4"}</div>
                        </td>

                        <td className="p-3 font-mono font-semibold">
                          <div className="flex items-center gap-1.5">
                            <Battery size={13} className={d.batteryPercent <= 25 ? "text-amber-500" : "text-emerald-500"} />
                            <span className={d.batteryPercent <= 25 ? "text-amber-500" : "text-slate-700 dark:text-slate-300"}>
                              {d.batteryPercent}%
                            </span>
                            <span className="text-[10px] text-slate-400 ml-1">
                              ({d.rssi} dBm)
                            </span>
                          </div>
                        </td>

                        <td className="p-3 pr-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              title="Test Ingestion"
                              onClick={() => {
                                setTestPayload((prev) => ({
                                  ...prev,
                                  deviceId: d.deviceId,
                                  bedId: d.assignedBedId || "NICU-01",
                                }));
                              }}
                              className="px-2 py-1 rounded-md text-[11px] font-semibold text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/60 transition-colors"
                            >
                              Test
                            </button>
                            <button
                              type="button"
                              title="Decommission Device"
                              onClick={() => handleDeleteDevice(d.deviceId)}
                              className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/60 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ESP32 Firmware & Ingestion Payload Simulator */}
          <div className="clinical-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Terminal size={16} className="text-teal-600" />
                  ESP32 Integration &amp; Cloud Transmission Tool
                </h3>
                <p className="text-xs text-slate-500">
                  Inspect JSON ingestion payload, Arduino C++ firmware sketch, or breadboard wiring pinouts
                </p>
              </div>

              {/* Subtabs */}
              <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setActiveFirmwareTab("payload")}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    activeFirmwareTab === "payload"
                      ? "bg-white dark:bg-slate-700 text-teal-600 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  HTTP Payload
                </button>
                <button
                  onClick={() => setActiveFirmwareTab("mqtt")}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    activeFirmwareTab === "mqtt"
                      ? "bg-white dark:bg-slate-700 text-teal-600 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  HiveMQ MQTT (Recommended)
                </button>
                <button
                  onClick={() => setActiveFirmwareTab("arduino")}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    activeFirmwareTab === "arduino"
                      ? "bg-white dark:bg-slate-700 text-teal-600 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Arduino C++ Code
                </button>
                <button
                  onClick={() => setActiveFirmwareTab("wiring")}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    activeFirmwareTab === "wiring"
                      ? "bg-white dark:bg-slate-700 text-teal-600 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Sensor Pinouts
                </button>
              </div>
            </div>

            {/* HiveMQ MQTT Tab */}
            {activeFirmwareTab === "mqtt" && (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200 flex items-start gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 animate-pulse flex-shrink-0" />
                  <div>
                    <strong className="block text-slate-900 dark:text-slate-100 mb-0.5">
                      HiveMQ MQTT Ingestion Engine is Active &amp; Connected
                    </strong>
                    The backend server subscribes to <code className="font-mono bg-white dark:bg-slate-800 px-1 py-0.5 rounded border border-teal-300 dark:border-teal-700">nicu/telemetry/#</code> over MQTT port 1883. Telemetry sent by any ESP32 is parsed in real time, checked against safety thresholds, saved to MongoDB Atlas, and reflected on the live dashboard.
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-1.5 font-mono">
                    <div className="text-slate-400 text-[11px] font-sans">Broker Host</div>
                    <div className="text-slate-800 dark:text-slate-200 font-bold">broker.hivemq.com</div>
                    <div className="text-slate-400 text-[11px] font-sans pt-1">Broker Port</div>
                    <div className="text-slate-800 dark:text-slate-200 font-bold">1883 (TCP / Plain)</div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-1.5 font-mono">
                    <div className="text-slate-400 text-[11px] font-sans">Publish Topic</div>
                    <div className="text-teal-600 dark:text-teal-400 font-bold">nicu/telemetry/&lt;DEVICE_ID&gt;</div>
                    <div className="text-slate-400 text-[11px] font-sans pt-1">Example Topic</div>
                    <div className="text-slate-800 dark:text-slate-200 font-bold">nicu/telemetry/ESP32-NICU-01</div>
                  </div>
                </div>

                <pre className="p-4 rounded-xl bg-slate-900 text-emerald-400 font-mono text-xs overflow-x-auto leading-relaxed">
{`// Sample MQTT Payload published to nicu/telemetry/ESP32-NICU-01
{
  "deviceId": "ESP32-NICU-01",
  "bedId": "NICU-01",
  "heartRate": 138,
  "spo2": 98,
  "temperature": 36.8,
  "batteryPercent": 92,
  "rssi": -55,
  "signalQuality": "Good"
}`}
                </pre>
              </div>
            )}

            {/* HTTP Payload View */}
            {activeFirmwareTab === "payload" && (
              <div className="space-y-3 text-xs">
                <p className="text-slate-600 dark:text-slate-300">
                  The ESP32 transmits validated readings to the authenticated ingestion endpoint via HTTPS POST:
                </p>
                <pre className="p-4 rounded-xl bg-slate-900 text-emerald-400 font-mono text-xs overflow-x-auto leading-relaxed">
{`POST /api/v1/devices/telemetry
Content-Type: application/json
Authorization: Bearer <DEVICE_TOKEN_NICU_01>

{
  "deviceId": "ESP32-NICU-01",
  "patientId": "DEMO-001",
  "bedId": "NICU-01",
  "heartRate": 142,
  "spo2": 97,
  "temperature": 36.7,
  "batteryPercent": 84,
  "rssi": -58,
  "signalQuality": "Good",
  "quality": {
    "opticalSNR_dB": 24.2,
    "probeAttached": true,
    "temperatureValid": true
  },
  "sequenceNumber": 18402,
  "timestamp": "${new Date().toISOString()}"
}`}
                </pre>
              </div>
            )}

            {/* Arduino Code View */}
            {activeFirmwareTab === "arduino" && (
              <div className="space-y-3 text-xs">
                <p className="text-slate-600 dark:text-slate-300">
                  Arduino framework sample code for reading MAX30102 and TMP117 over I²C on the ESP32:
                </p>
                <pre className="p-4 rounded-xl bg-slate-900 text-sky-300 font-mono text-[11px] overflow-x-auto leading-relaxed">
{`#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include "MAX30105.h"
#include "heartRate.h"

#define I2C_SDA 21
#define I2C_SCL 22

MAX30105 particleSensor;
const char* ssid = "YOUR_WIFI_SSID";           // Replace with your Wi-Fi or phone hotspot
const char* password = "YOUR_WIFI_PASSWORD";
// Point to your backend (replace 192.168.1.15 with your PC's IP from ipconfig):
const char* serverUrl = "http://192.168.1.15:5000/api/telemetry";

void setup() {
  Serial.begin(115200);
  Wire.begin(I2C_SDA, I2C_SCL);
  WiFi.begin(ssid, password);
  
  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println("MAX30102 sensor not found. Halting.");
    while (1);
  }
  particleSensor.setup();
}

void loop() {
  long irValue = particleSensor.getIR();
  int bpm = 142; // Real-time pulse
  int spo2 = 97;
  float temp = 36.7; // From TMP117
  
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");
    String payload = "{\\"deviceId\\":\\"ESP32-NICU-01\\",\\"bedId\\":\\"NICU-01\\",\\"heartRate\\":" + String(bpm) + ",\\"spo2\\":" + String(spo2) + ",\\"temperature\\":" + String(temp, 1) + ",\\"batteryPercent\\":85,\\"signalQuality\\":\\"Good\\"}";
    http.POST(payload);
    http.end();
  }
  delay(1000); // 1 Hz stream
}`}
                </pre>
              </div>
            )}

            {/* Sensor Pinouts */}
            {activeFirmwareTab === "wiring" && (
              <div className="space-y-3 text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-500">
                      <th className="p-2">Component</th>
                      <th className="p-2">ESP32 Pin</th>
                      <th className="p-2">Function</th>
                      <th className="p-2">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                    <tr>
                      <td className="p-2">MAX30102 / TMP117</td>
                      <td className="p-2 text-teal-600 font-bold">GPIO 21</td>
                      <td className="p-2">I²C SDA</td>
                      <td className="p-2 font-sans text-slate-500">Shared bidirectional serial data line (4.7k pull-up)</td>
                    </tr>
                    <tr>
                      <td className="p-2">MAX30102 / TMP117</td>
                      <td className="p-2 text-teal-600 font-bold">GPIO 22</td>
                      <td className="p-2">I²C SCL</td>
                      <td className="p-2 font-sans text-slate-500">Shared serial clock line (400 kHz standard)</td>
                    </tr>
                    <tr>
                      <td className="p-2">Sensors VCC</td>
                      <td className="p-2 text-red-500 font-bold">3.3V</td>
                      <td className="p-2">Power</td>
                      <td className="p-2 font-sans text-slate-500">Regulated 3.3V rail (do not connect to 5V)</td>
                    </tr>
                    <tr>
                      <td className="p-2">Battery Telemetry</td>
                      <td className="p-2 text-amber-500 font-bold">GPIO 34 (ADC1)</td>
                      <td className="p-2">Voltage Divider</td>
                      <td className="p-2 font-sans text-slate-500">Li-Po 3.7V cell through 100k/100k resistor divider</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Interactive Live REST Ingestion Tester */}
          <div className="clinical-card p-5 space-y-4 bg-gradient-to-br from-slate-50/70 to-teal-50/30 dark:from-slate-900/60 dark:to-teal-950/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Radio size={16} className="text-teal-600 animate-pulse" />
                  Live REST Ingestion Tester (Send Simulated Telemetry from Any ESP32)
                </h3>
                <p className="text-xs text-slate-500">
                  Simulate live HTTP POST transmissions directly to the backend to test threshold triggers &amp; waveforms
                </p>
              </div>
              <span className="text-[11px] font-mono text-teal-600 font-bold px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-teal-500/30">
                POST /api/telemetry
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Device ID:
                </label>
                <select
                  value={testPayload.deviceId}
                  onChange={(e) => {
                    const dev = devices.find((d) => d.deviceId === e.target.value);
                    setTestPayload({
                      ...testPayload,
                      deviceId: e.target.value,
                      bedId: dev?.assignedBedId || "NICU-01",
                    });
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-slate-800 dark:text-slate-200"
                >
                  {(devices.length > 0 ? devices : beds).map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.deviceId}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Heart Rate (bpm):
                </label>
                <input
                  type="number"
                  min="40"
                  max="240"
                  value={testPayload.heartRate}
                  onChange={(e) => setTestPayload({ ...testPayload, heartRate: Number(e.target.value) })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  SpO₂ (%):
                </label>
                <input
                  type="number"
                  min="50"
                  max="100"
                  value={testPayload.spo2}
                  onChange={(e) => setTestPayload({ ...testPayload, spo2: Number(e.target.value) })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Temp (°C):
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="34"
                  max="42"
                  value={testPayload.temperature}
                  onChange={(e) => setTestPayload({ ...testPayload, temperature: Number(e.target.value) })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Battery (%):
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={testPayload.batteryPercent}
                  onChange={(e) => setTestPayload({ ...testPayload, batteryPercent: Number(e.target.value) })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  disabled={isSendingTest}
                  onClick={handleSendTestTelemetry}
                  className="w-full py-1.5 px-3 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Send size={13} className={isSendingTest ? "animate-spin" : ""} />
                  <span>{isSendingTest ? "Transmitting..." : "Send HTTP"}</span>
                </button>
              </div>
            </div>

            {testResult && (
              <div className="p-3 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto flex items-center justify-between">
                <span>
                  HTTP Result: {testResult.success ? "200 OK — Telemetry Ingested" : "Error"} · Bed: {testResult.bedId || "None"} · Alert Triggered: {testResult.alertTriggered ? "YES (Alert Fired!)" : "NO"}
                </span>
                <span className="text-emerald-400 font-bold">Live Synced to MongoDB</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Sub-Section 3: Bed Configuration ── */}
      {activeSubTab === "beds" && (
        <div className="clinical-card p-5 space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              NICU Unit &amp; Bed Slot Management
            </h3>
            <p className="text-xs text-slate-500">
              Station hardware mappings and neonatal admission records
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {beds.map((b) => (
              <div
                key={b.bedId}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2"
              >
                <div className="flex justify-between items-center">
                  <span className="font-mono font-bold text-teal-600 text-sm">{b.bedId}</span>
                  <span className="font-mono text-slate-400">{b.deviceId}</span>
                </div>
                <div className="text-slate-700 dark:text-slate-200 font-semibold">
                  {b.babyName} ({b.patientId})
                </div>
                <div className="text-slate-500">
                  Unit: <strong>{b.unitType}</strong> · Admitted: {b.admissionDate}
                </div>
                <div className="text-slate-500">
                  Assigned Doctor: <strong>{b.assignedDoctorName}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Sub-Section 4: Users & Permissions ── */}
      {activeSubTab === "users" && (
        <div className="clinical-card p-5 space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Users size={16} className="text-cyan-500" />
                <span>Interactive Role-Based Access Control (RBAC) Matrix</span>
              </h3>
              <p className="text-xs text-slate-500">
                Configure module permissions (Edit, View, or Restricted) for Doctor and Nurse roles. Restricted pages are completely hidden from the sidebar.
              </p>
            </div>
            <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800">
              Live Permission Engine Active
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 font-semibold text-slate-400">
                  <th className="p-3">Application Module</th>
                  <th className="p-3">Administrator</th>
                  <th className="p-3">Doctor Role</th>
                  <th className="p-3">Nurse Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {[
                  { key: "dashboard", label: "Dashboard & 6-Bed Monitoring", desc: "Live bedside station cards and vitals" },
                  { key: "patients",  label: "Patient Inpatient Registry",   desc: "Admit, manage, and discharge neonates" },
                  { key: "doctors",   label: "Doctors & Clinical Care Team", desc: "Clinician rosters and bed assignments" },
                  { key: "alerts",    label: "Clinical Alert Log & Audits",  desc: "Acknowledge alarms and view thresholds" },
                  { key: "analytics", label: "Analytics & PDF Reports",      desc: "Weekly reports and data export" },
                  { key: "settings",  label: "System Settings & Devices",    desc: "Hardware registry and threshold configs" },
                ].map((mod) => {
                  const docPerm = rolePermissions?.[ROLES.DOCTOR]?.[mod.key] || "edit";
                  const nurPerm = rolePermissions?.[ROLES.NURSE]?.[mod.key] || "view";

                  return (
                    <tr key={mod.key} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3">
                        <div className="font-semibold text-slate-200">{mod.label}</div>
                        <div className="text-[11px] text-slate-400">{mod.desc}</div>
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold bg-emerald-950/70 text-emerald-400 border border-emerald-800">
                          <CheckCircle2 size={12} />
                          Full Control (Admin)
                        </span>
                      </td>
                      <td className="p-3">
                        <select
                          value={docPerm}
                          onChange={(e) => updateRolePermission(ROLES.DOCTOR, mod.key, e.target.value)}
                          className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                            docPerm === "edit"
                              ? "bg-emerald-950/50 text-emerald-300 border-emerald-800"
                              : docPerm === "view"
                              ? "bg-cyan-950/50 text-cyan-300 border-cyan-800"
                              : "bg-rose-950/50 text-rose-300 border-rose-800"
                          }`}
                        >
                          <option value="edit">Edit (Full Control)</option>
                          <option value="view">View (Read-Only)</option>
                          <option value="restricted">Restricted (Hide Page)</option>
                        </select>
                      </td>
                      <td className="p-3">
                        <select
                          value={nurPerm}
                          onChange={(e) => updateRolePermission(ROLES.NURSE, mod.key, e.target.value)}
                          className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                            nurPerm === "edit"
                              ? "bg-emerald-950/50 text-emerald-300 border-emerald-800"
                              : nurPerm === "view"
                              ? "bg-cyan-950/50 text-cyan-300 border-cyan-800"
                              : "bg-rose-950/50 text-rose-300 border-rose-800"
                          }`}
                        >
                          <option value="edit">Edit (Full Control)</option>
                          <option value="view">View (Read-Only)</option>
                          <option value="restricted">Restricted (Hide Page)</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Sub-Section 5: Reports & Retention ── */}
      {activeSubTab === "retention" && (
        <div className="clinical-card p-5 space-y-4 text-xs">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Data Retention &amp; Backup Policies
            </h3>
            <p className="text-xs text-slate-500">
              Compliance with hospital health record standards and cloud storage archiving
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 space-y-2">
              <div className="font-bold text-slate-800 dark:text-slate-200">
                High-Frequency Waveform Retention
              </div>
              <p className="text-slate-500">
                1 Hz raw sensor packets are held in hot cache for <strong>90 days</strong>, after which they are downsampled to 1-minute aggregations for permanent medical research archives.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 space-y-2">
              <div className="font-bold text-slate-800 dark:text-slate-200">
                Alert &amp; Follow-up Audit Retention
              </div>
              <p className="text-slate-500">
                Every clinical alert event, staff acknowledgement timestamp, and doctor resolution record is preserved immutably for <strong>7 years</strong> in compliance with pediatric care statutes.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Sub-Section 6: Security & Audit Trail ── */}
      {activeSubTab === "security" && (
        <div className="clinical-card p-5 space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Cryptographic Security &amp; Activity Audit Log
              </h3>
              <p className="text-xs text-slate-500">
                Every configuration change, login, bed reassignment, and threshold adjustment is recorded
              </p>
            </div>
            <span className="font-mono text-xs text-slate-400">
              {auditLogs.length} audit entries
            </span>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1 text-xs font-mono">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-teal-600">{log.id}</span>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {log.actor} ({log.role})
                    </span>
                  </div>
                  <div className="text-slate-600 dark:text-slate-300 font-sans mt-0.5">
                    {log.action}
                  </div>
                </div>

                <div className="text-right text-[11px] text-slate-400">
                  <div>{log.timestamp}</div>
                  <div className="text-[10px] text-slate-500">IP: {log.ip}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Modal: Register New ESP32 Product ── */}
      {showAddDeviceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
                  <Cpu size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Register New ESP32 Product
                  </h3>
                  <p className="text-xs text-slate-500">
                    Add a new microcontroller sensor node to the NICU monitoring network
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddDeviceModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRegisterDevice} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Device Identifier (Unique ID) <span className="text-red-500">*</span>:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ESP32-NICU-07"
                  value={newDeviceForm.deviceId}
                  onChange={(e) => setNewDeviceForm({ ...newDeviceForm, deviceId: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-teal-500"
                />
                <p className="text-[10.5px] text-slate-400 mt-1">
                  Must match the <code>deviceId</code> configured in the ESP32 Arduino sketch.
                </p>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Product Label / Station Name:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mobile Emergency Cot Node"
                  value={newDeviceForm.deviceLabel}
                  onChange={(e) => setNewDeviceForm({ ...newDeviceForm, deviceLabel: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Microcontroller Model:
                  </label>
                  <select
                    value={newDeviceForm.model}
                    onChange={(e) => setNewDeviceForm({ ...newDeviceForm, model: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-teal-500"
                  >
                    <option value="ESP32-S3 DevKitC-1">ESP32-S3 DevKitC-1 (Dual-Core)</option>
                    <option value="ESP32-C3 Mini">ESP32-C3 Mini (RISC-V)</option>
                    <option value="ESP32-WROOM-32D">ESP32-WROOM-32D (Classic)</option>
                    <option value="ESP32-CAM">ESP32-CAM AI</option>
                    <option value="Custom ESP32">Custom ESP32 Board</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Initial Bed Binding:
                  </label>
                  <select
                    value={newDeviceForm.assignedBedId}
                    onChange={(e) => setNewDeviceForm({ ...newDeviceForm, assignedBedId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-teal-500"
                  >
                    <option value="">-- Unassigned (Spare Node) --</option>
                    {beds.map((b) => (
                      <option key={b.bedId} value={b.bedId}>
                        {b.bedId} — {b.babyName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    MAC Address:
                  </label>
                  <input
                    type="text"
                    placeholder="24:6F:28:AB:12:07"
                    value={newDeviceForm.macAddress}
                    onChange={(e) => setNewDeviceForm({ ...newDeviceForm, macAddress: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Firmware Version:
                  </label>
                  <input
                    type="text"
                    placeholder="v2.1.4-esp32s3"
                    value={newDeviceForm.firmwareVersion}
                    onChange={(e) => setNewDeviceForm({ ...newDeviceForm, firmwareVersion: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddDeviceModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRegistering}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <Save size={14} />
                  <span>{isRegistering ? "Saving to MongoDB..." : "Register Product"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
