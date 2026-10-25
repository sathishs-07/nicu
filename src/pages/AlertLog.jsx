// =============================================================
// AlertLog.jsx — Event History & Response Tracking Station
// Complete alert lifecycle: Condition detected -> Created ->
// Delivered -> Acknowledged -> Resolved with audit notes.
// =============================================================

import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  Search,
  ShieldAlert,
  Cpu,
  User,
  ArrowRight,
  Download,
  Calendar,
  X,
  Send,
  MessageSquare,
} from "lucide-react";
import { useApp } from "../context/AppContext";

export default function AlertLog() {
  const [searchParams] = useSearchParams();
  const initialBedFilter = searchParams.get("bed") || "ALL";

  const {
    alertLog,
    acknowledgeAlert,
    resolveAlert,
    currentUser,
  } = useApp();

  // Filters state
  const [timeRange, setTimeRange] = useState("all"); // "today" | "24h" | "7d" | "all"
  const [selectedBed, setSelectedBed] = useState(initialBedFilter);
  const [selectedPriority, setSelectedPriority] = useState("ALL"); // ALL | Urgent | Warning | Info
  const [selectedStatus, setSelectedStatus] = useState("ALL"); // ALL | Active | Acknowledged | Resolved
  const [selectedType, setSelectedType] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Drawer / Details modal state
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [resolutionNoteInput, setResolutionNoteInput] = useState("");

  // Filtered Alert List
  const filteredAlerts = useMemo(() => {
    return alertLog.filter((a) => {
      const matchBed = selectedBed === "ALL" || a.bedId === selectedBed;
      const matchPriority = selectedPriority === "ALL" || a.priority === selectedPriority;
      const matchStatus = selectedStatus === "ALL" || a.status === selectedStatus;
      const matchType =
        selectedType === "ALL" ||
        (selectedType === "HR" && a.parameter.includes("Heart Rate")) ||
        (selectedType === "SpO2" && a.parameter.includes("SpO₂")) ||
        (selectedType === "Temp" && a.parameter.includes("Temperature")) ||
        (selectedType === "Sensor" && (a.alertType.includes("Sensor") || a.alertType.includes("Battery") || a.alertType.includes("Disconnect")));

      const matchSearch =
        !searchQuery ||
        a.alertId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.babyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.bedId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.assignedStaff?.toLowerCase().includes(searchQuery.toLowerCase());

      return matchBed && matchPriority && matchStatus && matchType && matchSearch;
    });
  }, [alertLog, selectedBed, selectedPriority, selectedStatus, selectedType, searchQuery]);

  // 5.1 Computed Alert Summary Counts
  const totalCount = filteredAlerts.length;
  const activeCount = filteredAlerts.filter((a) => a.status === "Active").length;
  const unacknowledgedCount = filteredAlerts.filter((a) => !a.acknowledgedAt).length;
  const resolvedCount = filteredAlerts.filter((a) => a.status === "Resolved").length;
  const sensorFailureCount = filteredAlerts.filter(
    (a) => a.alertType.includes("Sensor") || a.alertType.includes("Battery") || a.alertType.includes("Disconnect")
  ).length;

  const handleExportCSV = () => {
    const headers = [
      "Alert ID",
      "Detection Time",
      "Bed",
      "Baby Name",
      "Type",
      "Priority",
      "Reading",
      "Threshold",
      "Assigned Staff",
      "Acknowledged At",
      "Resolved At",
      "Status",
    ];
    const rows = filteredAlerts.map((a) => [
      a.alertId,
      a.detectedAt,
      a.bedId,
      `"${a.babyName}"`,
      `"${a.alertType}"`,
      a.priority,
      `"${a.readingValue}"`,
      `"${a.threshold}"`,
      `"${a.assignedStaff}"`,
      a.acknowledgedAt || "—",
      a.resolvedAt || "—",
      a.status,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `NICU_Alerts_Log_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ── Section Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Alert Log &amp; Response Tracking
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-500/30">
              SAFETY AUDIT
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Historical alarm events, multi-tier priorities, staff acknowledgements, and documented clinical closures
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Download size={14} />
            <span>Export CSV Report</span>
          </button>
        </div>
      </div>

      {/* ── 5.1 Five Alert Summary Metric Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Alerts */}
        <div className="clinical-card p-3.5 sm:p-4">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Alerts
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
            {totalCount}
          </div>
          <div className="text-[10.5px] text-slate-400">In selected filter</div>
        </div>

        {/* Currently Active */}
        <div className="clinical-card p-3.5 sm:p-4">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Active Alarms
          </div>
          <div className="text-2xl font-bold font-mono text-red-600 dark:text-red-400 mt-1">
            {activeCount}
          </div>
          <div className="text-[10.5px] text-red-600 dark:text-red-400 font-medium">
            Immediate attention
          </div>
        </div>

        {/* Unacknowledged */}
        <div className="clinical-card p-3.5 sm:p-4">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Unacknowledged
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
            {unacknowledgedCount}
          </div>
          <div className="text-[10.5px] text-amber-600 dark:text-amber-400 font-medium">
            Pending response
          </div>
        </div>

        {/* Resolved */}
        <div className="clinical-card p-3.5 sm:p-4">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Resolved
          </div>
          <div className="text-2xl font-bold font-mono text-teal-600 dark:text-teal-400 mt-1">
            {resolvedCount}
          </div>
          <div className="text-[10.5px] text-teal-600 dark:text-teal-400 font-medium">
            Documented closures
          </div>
        </div>

        {/* Device & Sensor Faults */}
        <div className="clinical-card p-3.5 sm:p-4">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Hardware Events
          </div>
          <div className="text-2xl font-bold font-mono text-sky-600 dark:text-sky-400 mt-1">
            {sensorFailureCount}
          </div>
          <div className="text-[10.5px] text-sky-600 dark:text-sky-400 font-medium">
            Battery / SNR / Timeout
          </div>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="clinical-card p-4 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Alert ID, Bed, Patient..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Bed Filter */}
          <select
            value={selectedBed}
            onChange={(e) => setSelectedBed(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-mono outline-none"
          >
            <option value="ALL">All Beds</option>
            <option value="NICU-01">NICU-01</option>
            <option value="NICU-02">NICU-02</option>
            <option value="NICU-03">NICU-03</option>
            <option value="NICU-04">NICU-04</option>
            <option value="NICU-05">NICU-05</option>
            <option value="NICU-06">NICU-06</option>
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs outline-none"
          >
            <option value="ALL">All Priorities</option>
            <option value="Urgent">Urgent (High)</option>
            <option value="Warning">Warning (Medium)</option>
            <option value="Info">Low (Info)</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="Active">Active Only</option>
            <option value="Acknowledged">Acknowledged</option>
            <option value="Resolved">Resolved</option>
          </select>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs outline-none"
          >
            <option value="ALL">All Event Types</option>
            <option value="HR">Heart Rate</option>
            <option value="SpO2">SpO₂ Desaturation</option>
            <option value="Temp">Temperature</option>
            <option value="Sensor">Hardware / Battery</option>
          </select>

          {(selectedBed !== "ALL" || selectedPriority !== "ALL" || selectedStatus !== "ALL" || selectedType !== "ALL" || searchQuery) && (
            <button
              onClick={() => {
                setSelectedBed("ALL");
                setSelectedPriority("ALL");
                setSelectedStatus("ALL");
                setSelectedType("ALL");
                setSearchQuery("");
              }}
              className="text-teal-600 dark:text-teal-400 font-semibold hover:underline"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* ── 5.2 Comprehensive Alert Table ── */}
      <div className="clinical-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 font-semibold text-slate-500 dark:text-slate-400">
                <th className="p-3 pl-4">Alert ID</th>
                <th className="p-3">Detected Time</th>
                <th className="p-3">Baby / Bed</th>
                <th className="p-3">Alert Type &amp; Value</th>
                <th className="p-3">Priority</th>
                <th className="p-3">Assigned Staff</th>
                <th className="p-3">Acknowledged</th>
                <th className="p-3">Resolved</th>
                <th className="p-3">Duration</th>
                <th className="p-3">Status</th>
                <th className="p-3 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400 text-xs">
                    No alert events matched the current filter conditions.
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((alert) => (
                  <tr
                    key={alert.alertId}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="p-3 pl-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                      {alert.alertId}
                    </td>
                    <td className="p-3 font-mono text-slate-500 dark:text-slate-400">
                      {alert.detectedAt}
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {alert.babyName}
                      </div>
                      <div className="font-mono text-[11px] text-teal-600 dark:text-teal-400">
                        {alert.bedId}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-700 dark:text-slate-300">
                        {alert.alertType}
                      </div>
                      <div className="font-mono text-red-600 dark:text-red-400 font-bold">
                        {alert.readingValue}
                      </div>
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                          alert.priority === "Urgent"
                            ? "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200"
                            : alert.priority === "Warning"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {alert.priority}
                      </span>
                    </td>
                    <td className="p-3 text-slate-700 dark:text-slate-300">
                      {alert.assignedStaff}
                    </td>
                    <td className="p-3 font-mono text-[11px]">
                      {alert.acknowledgedAt ? (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {alert.acknowledgedAt.split(" ")[1]}
                        </span>
                      ) : (
                        <span className="text-red-500 font-semibold">Pending</span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-[11px]">
                      {alert.resolvedAt ? (
                        <span className="text-slate-500">
                          {alert.resolvedAt.split(" ")[1]}
                        </span>
                      ) : (
                        <span className="text-amber-500">Active</span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-[11px] text-slate-500">
                      {alert.duration}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold font-mono ${
                          alert.status === "Active"
                            ? "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-300"
                            : alert.status === "Acknowledged"
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300"
                            : "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-300"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            alert.status === "Active"
                              ? "bg-red-500 animate-ping"
                              : alert.status === "Acknowledged"
                              ? "bg-amber-500"
                              : "bg-teal-500"
                          }`}
                        />
                        {alert.status}
                      </span>
                    </td>
                    <td className="p-3 pr-4 text-right space-x-1.5">
                      {alert.status === "Active" && (
                        <button
                          onClick={() => acknowledgeAlert(alert.alertId)}
                          className="px-2 py-1 rounded bg-teal-600 hover:bg-teal-700 text-white font-medium text-[11px] transition-colors"
                        >
                          Ack
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedAlert(alert)}
                        className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px] transition-colors"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 5.3 Detailed Alert Side Drawer / Modal ── */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg h-full p-6 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-4 text-xs">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-red-600 dark:text-red-400">
                      {selectedAlert.alertId}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300">
                      {selectedAlert.priority}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
                    {selectedAlert.alertType}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedAlert(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Patient & Detection Context */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Bed Station:</span>
                  <span className="font-mono font-bold text-teal-600">{selectedAlert.bedId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Patient:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedAlert.babyName} ({selectedAlert.patientId})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Detection Timestamp:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {selectedAlert.detectedAt}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Responsible Clinician:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedAlert.assignedStaff}
                  </span>
                </div>
              </div>

              {/* Threshold Comparison */}
              <div className="p-3.5 rounded-xl bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 space-y-2">
                <div className="text-[11px] font-semibold text-red-800 dark:text-red-300 uppercase tracking-wider">
                  Configured Threshold Violation:
                </div>
                <div className="grid grid-cols-2 gap-2 font-mono">
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900">
                    <div className="text-[10px] text-slate-400">Observed Value</div>
                    <div className="text-lg font-bold text-red-600 dark:text-red-400">
                      {selectedAlert.readingValue}
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900">
                    <div className="text-[10px] text-slate-400">Clinical Limit</div>
                    <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                      {selectedAlert.threshold}
                    </div>
                  </div>
                </div>
              </div>

              {/* Pre/Post Event Vitals Sequence */}
              {selectedAlert.preVitals && selectedAlert.preVitals.length > 0 && (
                <div>
                  <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Pre/Post Event Telemetry Sequence:
                  </div>
                  <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 font-mono text-[11px] space-y-1">
                    {selectedAlert.preVitals.map((pv, i) => (
                      <div key={i} className="flex justify-between py-0.5 border-b border-slate-200/50 dark:border-slate-800/50 last:border-0">
                        <span className="text-slate-400">{pv.time}</span>
                        <span className="text-red-500 font-bold">{pv.hr ? `${pv.hr} bpm` : "Fault"}</span>
                        <span className="text-cyan-500 font-bold">{pv.spo2 ? `${pv.spo2}%` : "Fault"}</span>
                        <span className="text-amber-500">{pv.temp ? `${pv.temp}°C` : "—"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Telemetry Hardware Signal & Notification Channel */}
              <div className="space-y-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                <div>Device ID: <strong className="font-mono text-slate-700 dark:text-slate-200">{selectedAlert.deviceId}</strong></div>
                <div>Sensor Status: <strong className="text-slate-700 dark:text-slate-200">{selectedAlert.sensorQuality}</strong></div>
                <div>Notification Channels: <strong className="text-slate-700 dark:text-slate-200">{selectedAlert.notificationChannel}</strong></div>
              </div>

              {/* Audit & Follow-up Notes */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Add Clinical Follow-up Notes / Resolution:
                </label>
                <textarea
                  rows={3}
                  value={resolutionNoteInput}
                  onChange={(e) => setResolutionNoteInput(e.target.value)}
                  placeholder="Document actions taken (e.g. oxygen titrating, probe re-attached, clinician intervention)..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <button
                onClick={() => setSelectedAlert(null)}
                className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs"
              >
                Close Drawer
              </button>

              <div className="flex items-center gap-2">
                {selectedAlert.status === "Active" && (
                  <button
                    onClick={() => {
                      acknowledgeAlert(selectedAlert.alertId);
                      setSelectedAlert({
                        ...selectedAlert,
                        status: "Acknowledged",
                        acknowledgedAt: new Date().toLocaleTimeString(),
                      });
                    }}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs transition-colors"
                  >
                    Acknowledge
                  </button>
                )}

                {selectedAlert.status !== "Resolved" && (
                  <button
                    onClick={() => {
                      resolveAlert(selectedAlert.alertId, resolutionNoteInput);
                      setSelectedAlert(null);
                      setResolutionNoteInput("");
                    }}
                    className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-xs transition-colors"
                  >
                    Mark Resolved
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
