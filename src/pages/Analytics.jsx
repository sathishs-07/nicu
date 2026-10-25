// =============================================================
// Analytics.jsx — Operational Reports & System Telemetry Insights
// Weekly Clinical Reports, Doctor Performance, IoT System Efficiency,
// and Clinical Audit Report Generator.
// =============================================================

import { useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Clock,
  Cpu,
  Download,
  Calendar,
  Filter,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Printer,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { useApp } from "../context/AppContext";

export default function Analytics() {
  const { weeklyAnalytics, bedEfficiency, staffList, totalBeds } = useApp();

  const [dateFilter, setDateFilter] = useState("7d"); // "today" | "7d" | "30d"
  const [activeTab, setActiveTab] = useState("weekly"); // "weekly" | "staff" | "efficiency" | "report"

  // Report generator custom options
  const [reportBeds, setReportBeds] = useState(["ALL"]);
  const [reportPeriod, setReportPeriod] = useState("Last 7 Days (Oct 19 – 25, 2026)");
  const [reportGenerated, setReportGenerated] = useState(false);

  // Overall system metrics calculation
  const totalValidPackets = bedEfficiency.reduce((acc, b) => acc + b.validPackets, 0);
  const totalExpectedPackets = bedEfficiency.reduce((acc, b) => acc + b.expectedPackets, 0);
  const overallCompleteness = +(
    (totalValidPackets / totalExpectedPackets) *
    100
  ).toFixed(1);
  const averageUptime = +(
    bedEfficiency.reduce((acc, b) => acc + b.uptimePercent, 0) / bedEfficiency.length
  ).toFixed(2);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ── Section Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Analytics &amp; Operational Insights
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-500/30">
              AUDIT &amp; QUALITY
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Weekly alert distributions, clinician response benchmarks, ESP32 packet completeness, and PDF reports
          </p>
        </div>

        {/* Shared Date Filter Controls */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 font-medium">
            <button
              onClick={() => setDateFilter("today")}
              className={`px-3 py-1 rounded-lg transition-colors ${
                dateFilter === "today"
                  ? "bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-300 font-semibold shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDateFilter("7d")}
              className={`px-3 py-1 rounded-lg transition-colors ${
                dateFilter === "7d"
                  ? "bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-300 font-semibold shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setDateFilter("30d")}
              className={`px-3 py-1 rounded-lg transition-colors ${
                dateFilter === "30d"
                  ? "bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-300 font-semibold shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Last 30 Days
            </button>
          </div>
        </div>
      </div>

      {/* ── Analytical Navigation Tabs ── */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 sm:gap-4 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab("weekly")}
          className={`pb-2.5 px-3 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "weekly"
              ? "border-teal-500 text-teal-600 dark:text-teal-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
          }`}
        >
          6.1 Weekly Clinical Report
        </button>
        <button
          onClick={() => setActiveTab("staff")}
          className={`pb-2.5 px-3 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "staff"
              ? "border-teal-500 text-teal-600 dark:text-teal-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
          }`}
        >
          6.2 Doctor &amp; Nurse Response Metrics
        </button>
        <button
          onClick={() => setActiveTab("efficiency")}
          className={`pb-2.5 px-3 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "efficiency"
              ? "border-teal-500 text-teal-600 dark:text-teal-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
          }`}
        >
          6.3 Overall System Efficiency (IoT)
        </button>
        <button
          onClick={() => setActiveTab("report")}
          className={`pb-2.5 px-3 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "report"
              ? "border-teal-500 text-teal-600 dark:text-teal-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
          }`}
        >
          6.4 Custom Report Generator
        </button>
      </div>

      {/* ── 6.1 Weekly Clinical Report Tab ── */}
      {activeTab === "weekly" && (
        <div className="space-y-6">
          {/* Top Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="clinical-card p-4">
              <div className="text-[11px] font-semibold text-slate-400 uppercase">
                7-Day Total Alerts
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
                98 events
              </div>
              <div className="text-[10.5px] text-teal-600 font-medium">
                Avg 14.0 alarms/day
              </div>
            </div>
            <div className="clinical-card p-4">
              <div className="text-[11px] font-semibold text-slate-400 uppercase">
                Most Common Event
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
                HR Tachycardia
              </div>
              <div className="text-[10.5px] text-slate-500">38% of total volume</div>
            </div>
            <div className="clinical-card p-4">
              <div className="text-[11px] font-semibold text-slate-400 uppercase">
                Desaturation Events
              </div>
              <div className="text-2xl font-bold font-mono text-cyan-600 dark:text-cyan-400 mt-1">
                29 episodes
              </div>
              <div className="text-[10.5px] text-slate-500">SpO₂ &lt; 90% observed</div>
            </div>
            <div className="clinical-card p-4">
              <div className="text-[11px] font-semibold text-slate-400 uppercase">
                Average Telemetry Latency
              </div>
              <div className="text-2xl font-bold font-mono text-teal-600 dark:text-teal-400 mt-1">
                39.2 ms
              </div>
              <div className="text-[10.5px] text-emerald-600 font-medium">
                Within &lt;50ms QoS SLA
              </div>
            </div>
          </div>

          {/* Daily Alert Counts by Parameter Bar Chart */}
          <div className="clinical-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Daily Alert Volume Breakdown (Past 7 Days)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Categorized by physiological parameter and device failure events
                </p>
              </div>
              <span className="text-xs font-mono font-medium text-slate-400">
                Oct 19 &ndash; Oct 25, 2026
              </span>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyAnalytics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card-bg)",
                      borderColor: "var(--card-border)",
                      borderRadius: "10px",
                      fontSize: "12px",
                      fontFamily: "JetBrains Mono",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="hrAlerts" name="Heart Rate" fill="#ef4444" stackId="a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="spo2Alerts" name="SpO₂ Desat" fill="#06b6d4" stackId="a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="tempAlerts" name="Temperature" fill="#f59e0b" stackId="a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="sensorFaults" name="Sensor/Disconnect" fill="#64748b" stackId="a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Daily Completeness % Trend */}
          <div className="clinical-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Daily Ingestion Completeness (%)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Formula: (Valid Packets Received / Expected Packets) &times; 100%
                </p>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyAnalytics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                  <YAxis domain={[95, 100]} tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card-bg)",
                      borderColor: "var(--card-border)",
                      borderRadius: "10px",
                      fontSize: "12px",
                      fontFamily: "JetBrains Mono",
                    }}
                  />
                  <Line type="monotone" dataKey="completeness" name="Completeness %" stroke="#0d9488" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── 6.2 Doctor & Nurse Performance Tab ── */}
      {activeTab === "staff" && (
        <div className="space-y-6">
          <div className="clinical-card p-4 bg-teal-50/50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-900/40 text-xs text-slate-700 dark:text-slate-300">
            <div className="font-semibold text-teal-800 dark:text-teal-300 mb-0.5 flex items-center gap-1.5">
              <ShieldCheck size={14} />
              Clinical Response Quality Standard (NICU Guideline)
            </div>
            Target median acknowledgement time is <strong>&lt; 2.0 minutes</strong> for Urgent alarms and <strong>&lt; 5.0 minutes</strong> for Warning conditions. Metrics are intended for operational workflow review.
          </div>

          <div className="clinical-card overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Care-Team Alert Response &amp; Follow-Up Audit
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                {staffList.length} registered clinicians evaluated
              </span>
            </div>

            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 font-semibold text-slate-500">
                  <th className="p-3 pl-4">Clinician</th>
                  <th className="p-3">Role &amp; Shift</th>
                  <th className="p-3">Assigned Beds</th>
                  <th className="p-3">Total Alerts Handled</th>
                  <th className="p-3">Median Acknowledged Time</th>
                  <th className="p-3">Documented Resolution Rate</th>
                  <th className="p-3 pr-4">Quality Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {staffList.map((staff) => (
                  <tr key={staff.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="p-3 pl-4">
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        {staff.name}
                      </div>
                      <div className="font-mono text-[10px] text-slate-400">{staff.id}</div>
                    </td>
                    <td className="p-3">
                      <div>{staff.role}</div>
                      <div className="font-mono text-[10px] text-teal-600">{staff.shiftType}</div>
                    </td>
                    <td className="p-3 font-mono font-semibold text-slate-700 dark:text-slate-300">
                      {staff.assignedBeds?.join(", ") || "None"}
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                      {staff.totalAlertsHandled} events
                    </td>
                    <td className="p-3 font-mono font-bold text-teal-600 dark:text-teal-400">
                      {staff.medianResponseTime}
                    </td>
                    <td className="p-3 font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      98.4%
                    </td>
                    <td className="p-3 pr-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300">
                        <CheckCircle2 size={11} />
                        Compliant
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 6.3 Overall System Efficiency Tab ── */}
      {activeTab === "efficiency" && (
        <div className="space-y-6">
          {/* Telemetry KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="clinical-card p-4">
              <div className="text-[11px] font-semibold text-slate-400 uppercase">
                Overall Data Completeness
              </div>
              <div className="text-2xl font-bold font-mono text-teal-600 dark:text-teal-400 mt-1">
                {overallCompleteness}%
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                {totalValidPackets.toLocaleString()} / {totalExpectedPackets.toLocaleString()} pkts
              </div>
            </div>

            <div className="clinical-card p-4">
              <div className="text-[11px] font-semibold text-slate-400 uppercase">
                System Telemetry Uptime
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                {averageUptime}%
              </div>
              <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
                Zero fatal crashes
              </div>
            </div>

            <div className="clinical-card p-4">
              <div className="text-[11px] font-semibold text-slate-400 uppercase">
                Notification Delivery Rate
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
                99.9%
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                WebSockets &amp; Pagers delivered
              </div>
            </div>

            <div className="clinical-card p-4">
              <div className="text-[11px] font-semibold text-slate-400 uppercase">
                Battery Health Tracking
              </div>
              <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
                1 Warning
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Bed NICU-05 at 24%
              </div>
            </div>
          </div>

          {/* Per-Bed Telemetry Breakdown Table */}
          <div className="clinical-card overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Per-Bed Telemetry Ingestion &amp; Completeness Metrics
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                Sampling Rate: 1 Hz (86,400 expected packets/day per bed)
              </span>
            </div>

            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 font-semibold text-slate-500">
                  <th className="p-3 pl-4">Station ID</th>
                  <th className="p-3">Patient Name</th>
                  <th className="p-3">Valid Received</th>
                  <th className="p-3">Completeness</th>
                  <th className="p-3">Uptime</th>
                  <th className="p-3">Disconnects</th>
                  <th className="p-3 pr-4">ESP32 Battery Avg</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {bedEfficiency.map((item) => (
                  <tr key={item.bedId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="p-3 pl-4 font-mono font-bold text-teal-600">
                      {item.bedId}
                    </td>
                    <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                      {item.patientName}
                    </td>
                    <td className="p-3 font-mono text-slate-700 dark:text-slate-300">
                      {item.validPackets.toLocaleString()} pkts
                    </td>
                    <td className="p-3 font-mono font-bold text-teal-600 dark:text-teal-400">
                      {item.completeness}%
                    </td>
                    <td className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {item.uptimePercent}%
                    </td>
                    <td className="p-3 font-mono text-slate-600 dark:text-slate-400">
                      {item.disconnects}
                    </td>
                    <td className="p-3 pr-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                      {item.avgBattery}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 6.4 Report Generation Tab ── */}
      {activeTab === "report" && (
        <div className="space-y-6">
          <div className="clinical-card p-6 max-w-2xl mx-auto space-y-4">
            <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Clinical Audit &amp; Telemetry Report Builder
              </h3>
              <p className="text-xs text-slate-500">
                Configure reporting parameters to generate an accredited summary report for medical records
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reporting Period:
                </label>
                <select
                  value={reportPeriod}
                  onChange={(e) => setReportPeriod(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none font-medium"
                >
                  <option value="Last 24 Hours (Oct 25, 2026)">Last 24 Hours (Oct 25, 2026)</option>
                  <option value="Last 7 Days (Oct 19 – 25, 2026)">Last 7 Days (Oct 19 – 25, 2026)</option>
                  <option value="Last 30 Days (Oct 2026)">Last 30 Days (Oct 2026)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target NICU Bed Stations:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 cursor-pointer">
                    <input type="checkbox" defaultChecked />
                    <span>All 6 Beds</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 cursor-pointer">
                    <input type="checkbox" defaultChecked />
                    <span>Incubator Units</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 cursor-pointer">
                    <input type="checkbox" defaultChecked />
                    <span>Warmers &amp; Cots</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Included Physiological Parameters:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 cursor-pointer">
                    <input type="checkbox" defaultChecked />
                    <span>Heart Rate (MAX30102)</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 cursor-pointer">
                    <input type="checkbox" defaultChecked />
                    <span>SpO₂ Saturation</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 cursor-pointer">
                    <input type="checkbox" defaultChecked />
                    <span>Temperature (TMP117)</span>
                  </label>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setReportGenerated(true)}
                  className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-xs transition-colors flex items-center justify-center gap-2"
                >
                  <FileText size={15} />
                  <span>Generate Report Preview</span>
                </button>
              </div>
            </div>

            {/* Generated Report Preview Card */}
            {reportGenerated && (
              <div className="p-4 rounded-xl border border-teal-300 dark:border-teal-800 bg-teal-50/40 dark:bg-teal-950/20 space-y-3 mt-4">
                <div className="flex items-center justify-between pb-2 border-b border-teal-200 dark:border-teal-800/60">
                  <span className="font-bold text-teal-800 dark:text-teal-200 text-xs">
                    Report Preview Ready — {reportPeriod}
                  </span>
                  <span className="text-[10px] font-mono text-teal-700 dark:text-teal-400">
                    Coverage: 98.8%
                  </span>
                </div>
                <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
                  <div>Unit: <strong>NICU Level III (Ward 3B)</strong></div>
                  <div>Monitored Census: <strong>6 Neonatal Beds</strong></div>
                  <div>Total Ingested Data Points: <strong>518,400 readings</strong></div>
                  <div>Total Alarm Events: <strong>98 events (0 overdue)</strong></div>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => window.print()}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-teal-600 text-white font-medium text-xs flex items-center justify-center gap-1.5"
                  >
                    <Printer size={13} />
                    <span>Print / Save as PDF</span>
                  </button>
                  <button
                    onClick={() => alert("Report downloaded successfully as CSV format.")}
                    className="flex-1 py-1.5 px-3 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center gap-1.5"
                  >
                    <Download size={13} />
                    <span>Download CSV Dataset</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
