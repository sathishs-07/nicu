// =============================================================
// Dashboard.jsx — Main Command Center Screen
// 4 Computed Summary Cards + 6-Bed Responsive Patient Grid
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
  Plus,
  Baby,
  X,
  Radio,
  UserPlus,
  Save,
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
    addBed,
    deleteBed,
    assignDeviceToBed,
    addDevice,
    currentUser,
    can,
  } = useApp();

  const [showAddBedModal, setShowAddBedModal] = useState(false);
  const [isSubmittingBed, setIsSubmittingBed] = useState(false);
  const [assignModalBed, setAssignModalBed] = useState(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [customDeviceId, setCustomDeviceId] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [mqttPingStatus, setMqttPingStatus] = useState(null);

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
    setMqttPingStatus("Pinging HiveMQ...");
    try {
      await api.testPublishMqtt({
        deviceId: devId || "ESP32-NICU-01",
        bedId: bId || "NICU-01",
        heartRate: 142,
        spo2: 98,
        temperature: 36.8,
      });
      setMqttPingStatus("Success! Telemetry received by HiveMQ & Bed updated");
      setTimeout(() => setMqttPingStatus(null), 4000);
    } catch (err) {
      setMqttPingStatus("Ping failed: " + (err.message || "Error"));
    }
  };
  const [newBedForm, setNewBedForm] = useState({
    bedId: "",
    babyName: "",
    motherName: "",
    gender: "Female",
    admissionDate: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    gestationalAge: "33w 4d",
    birthWeight: "1,850 g",
    bloodGroup: "O+",
    diagnosis: "Prematurity & Respiratory Observation",
    unitType: "Giraffe Incubator",
    assignedDoctorId: "DOC-01",
    assignedDoctorName: "Dr. Meera Vasudevan",
    deviceId: "",
  });

  const handleAddBedSubmit = async (e) => {
    e.preventDefault();
    if (!newBedForm.bedId.trim() || !newBedForm.babyName.trim()) {
      alert("Please provide both a Bed ID (e.g. NICU-07) and Patient Name.");
      return;
    }
    setIsSubmittingBed(true);
    try {
      await addBed(newBedForm);
      setShowAddBedModal(false);
      setNewBedForm({
        bedId: "",
        babyName: "",
        motherName: "",
        gender: "Female",
        admissionDate: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
        gestationalAge: "33w 4d",
        birthWeight: "1,850 g",
        bloodGroup: "O+",
        diagnosis: "Prematurity & Respiratory Observation",
        unitType: "Giraffe Incubator",
        assignedDoctorId: "DOC-01",
        assignedDoctorName: "Dr. Meera Vasudevan",
        deviceId: "",
      });
    } catch (err) {
      alert("Error creating bed: " + err.message);
    } finally {
      setIsSubmittingBed(false);
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
      {/* ── Unit Overview Banner ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
              <span>NeoCare Command Center</span>
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              LIVE TELEMETRY
            </span>
            <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-mono text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 border border-teal-500/30">
              <Radio size={11} className="text-teal-600" />
              HiveMQ MQTT: Online
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Continuous wireless vital monitoring for {totalBeds} neonatal beds · Live ESP32 HiveMQ &amp; REST Ingestion
          </p>
        </div>

        {/* Global Unit Alert Status Indicator & Add Bed Button */}
        <div className="flex items-center gap-2.5">
          <Link
            to="/patients"
            className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
          >
            <Baby size={14} className="text-teal-600 dark:text-teal-400" />
            <span>Patients &amp; Discharge</span>
          </Link>

          <button
            type="button"
            onClick={() => setShowAddBedModal(true)}
            className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus size={14} />
            <span>Admit Baby / Add Bed</span>
          </button>

          {activeAlertsCount > 0 ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-semibold">
              <AlertTriangle size={15} className="text-red-600 animate-bounce" />
              <span>{activeAlertsCount} Active Alert{activeAlertsCount > 1 ? "s" : ""}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-300 dark:border-teal-800 text-teal-700 dark:text-teal-300 text-xs font-semibold">
              <ShieldCheck size={16} className="text-teal-600 dark:text-teal-400" />
              <span>All Beds Nominal</span>
            </div>
          )}
        </div>
      </div>

      {/* ── 3.2 Four Compact Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total Beds */}
        <div className="clinical-card p-4 sm:p-5 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400 flex-shrink-0">
            <Bed size={22} />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Beds
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
              {totalBeds}
            </div>
            <div className="text-[11px] text-teal-600 dark:text-teal-400 font-medium">
              6 configured stations
            </div>
          </div>
        </div>

        {/* Active Monitoring */}
        <div className="clinical-card p-4 sm:p-5 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
            <Activity size={22} />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Active Monitoring
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
              {activeMonitoringCount}
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              Receiving valid readings
            </div>
          </div>
        </div>

        {/* Active Alerts */}
        <div className="clinical-card p-4 sm:p-5 flex items-center gap-3.5">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border ${
              activeAlertsCount > 0
                ? "bg-red-50 dark:bg-red-950/60 border-red-500/30 text-red-600 dark:text-red-400"
                : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400"
            }`}
          >
            <AlertTriangle size={22} />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Active Alerts
            </div>
            <div
              className={`text-2xl font-bold font-mono tracking-tight leading-tight ${
                activeAlertsCount > 0 ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-slate-100"
              }`}
            >
              {activeAlertsCount}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {activeAlertsCount > 0 ? "Requires care attention" : "Zero unresolved alarms"}
            </div>
          </div>
        </div>

        {/* Devices Online */}
        <div className="clinical-card p-4 sm:p-5 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400 flex-shrink-0">
            <Cpu size={22} />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Devices Online
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
              {devicesOnlineCount} / {totalBeds}
            </div>
            <div className="text-[11px] text-sky-600 dark:text-sky-400 font-medium">
              ESP32 telemetry verified
            </div>
          </div>
        </div>
      </div>

      {/* ── Dedicated Dashboard Neonatal Bed Search Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-lg">
        <div className="relative flex-1 max-w-xl">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search baby name, bed ID (NICU-01), patient ID, or attending doctor..."
            className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl border border-slate-700 bg-slate-950 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 font-mono transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-sm px-1"
              title="Clear search"
            >
              ×
            </button>
          )}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 text-xs font-mono text-slate-400">
          <span>Showing <strong>{filteredBeds.length}</strong> of <strong>{beds.length}</strong> Bed Stations</span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-cyan-400 hover:underline font-semibold"
            >
              Clear Filter
            </button>
          )}
        </div>
      </div>

      {/* ── 3.3 Six-Bed Patient Grid (3 cols desktop, 2 tablet, 1 mobile) ── */}
      {filteredBeds.length === 0 ? (
        <div className="clinical-card p-12 text-center">
          <div className="text-slate-400 mb-2">
            <Search size={32} className="mx-auto opacity-50" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            No beds matched your search
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Try searching by bed number (e.g., &ldquo;NICU-01&rdquo;), baby ID (&ldquo;DEMO-001&rdquo;), or mother&apos;s name (&ldquo;Ananya&rdquo;).
          </p>
          <button
            onClick={() => setSearchQuery("")}
            className="mt-4 px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-medium"
          >
            Reset filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredBeds.map((bed) => (
            <PatientBedCard
              key={bed.bedId}
              bed={bed}
              onAcknowledgeAlert={acknowledgeAlert}
              onAssignDevice={(b) => {
                setAssignModalBed(b);
                setSelectedDeviceId(b.deviceId || "UNASSIGN");
                setCustomDeviceId("");
              }}
              waveforms={waveforms[bed.bedId] || []}
            />
          ))}
        </div>
      )}

      {/* ── Quick Telemetry Summary Footer ── */}
      <div className="clinical-card p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
          <span>
            System Telemetry: <strong>Live Ingestion (1 Hz)</strong> · Ingestion: <strong>ESP32 &rarr; HiveMQ MQTT &rarr; Node API &rarr; MongoDB</strong>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            to="/doctors"
            className="text-teal-600 dark:text-teal-400 hover:underline font-medium flex items-center gap-1"
          >
            <span>View Duty Staff Directory</span>
            <ArrowRight size={13} />
          </Link>
          <Link
            to="/analytics"
            className="text-teal-600 dark:text-teal-400 hover:underline font-medium flex items-center gap-1"
          >
            <span>Weekly Analytics</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {/* ── Modal: Admit Neonate & Provision New Bed ── */}
      {showAddBedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                  <UserPlus size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Admit Neonate & Provision Bed Station
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Register a new neonatal bed and bind an ESP32 hardware device
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddBedModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddBedSubmit} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Bed Identifier <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. NICU-07"
                    value={newBedForm.bedId}
                    onChange={(e) => setNewBedForm({ ...newBedForm, bedId: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Assigned ESP32 Hardware ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ESP32-NICU-07 (or leave blank)"
                    value={newBedForm.deviceId}
                    onChange={(e) => setNewBedForm({ ...newBedForm, deviceId: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Neonate Patient Label <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Baby of Ananya"
                    value={newBedForm.babyName}
                    onChange={(e) => setNewBedForm({ ...newBedForm, babyName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mother&apos;s Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ananya Sen"
                    value={newBedForm.motherName}
                    onChange={(e) => setNewBedForm({ ...newBedForm, motherName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Gender
                  </label>
                  <select
                    value={newBedForm.gender}
                    onChange={(e) => setNewBedForm({ ...newBedForm, gender: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Gestational Age
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 32w 3d"
                    value={newBedForm.gestationalAge}
                    onChange={(e) => setNewBedForm({ ...newBedForm, gestationalAge: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Birth Weight
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1,620 g"
                    value={newBedForm.birthWeight}
                    onChange={(e) => setNewBedForm({ ...newBedForm, birthWeight: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Blood Group (Typeable)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. O+, A-, B+, Rh-null"
                    value={newBedForm.bloodGroup}
                    onChange={(e) => setNewBedForm({ ...newBedForm, bloodGroup: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Primary Neonatologist
                  </label>
                  <select
                    value={newBedForm.assignedDoctorName}
                    onChange={(e) => {
                      const doc = (staffList || []).find((s) => s.name === e.target.value);
                      setNewBedForm({
                        ...newBedForm,
                        assignedDoctorName: e.target.value,
                        assignedDoctorId: doc ? doc.id : "DOC-01",
                      });
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {(staffList || [
                      { id: "DOC-01", name: "Dr. Meera Vasudevan" },
                      { id: "DOC-02", name: "Dr. Rajesh Verma" },
                      { id: "DOC-03", name: "Dr. Ananya Roy" },
                    ]).map((s) => (
                      <option key={s.id || s.name} value={s.name}>
                        {s.name} ({s.role || "Doctor"})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs text-teal-800 dark:text-teal-300 flex items-start gap-2">
                <Radio size={16} className="text-teal-600 dark:text-teal-400 mt-0.5 flex-shrink-0" />
                <p>
                  Once admitted, this bed will start in <strong>Standby</strong> state with zero dummy data. When your ESP32 transmits telemetry over <strong>HiveMQ MQTT</strong> or HTTP with this Bed/Device ID, live sensor readings will appear instantly.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddBedModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBed}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white shadow-sm flex items-center gap-1.5 transition-colors"
                >
                  <Save size={14} />
                  <span>{isSubmittingBed ? "Admitting..." : "Admit Neonate & Provision Bed"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Assign / Swap ESP32 Hardware Product ── */}
      {assignModalBed && (
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
                    Bind physical sensor node to Bed {assignModalBed.bedId} ({assignModalBed.babyName})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAssignModalBed(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAssignDeviceSubmit} className="p-6 space-y-4">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Current Station:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                    {assignModalBed.bedId} · {assignModalBed.patientId}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Currently Bound Device:</span>
                  <span className="font-mono font-bold text-teal-600 dark:text-teal-400">
                    {assignModalBed.deviceId || "None (Bed in Standby)"}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select ESP32 Product to Bind:
                </label>
                <select
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="UNASSIGN">-- Unbind / Release Device (Put Bed in Standby) --</option>
                  {(devices || []).map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.deviceId} {d.assignedBedId ? `(Currently on ${d.assignedBedId})` : "(Spare / Available)"} — Battery {d.batteryPercent}%
                    </option>
                  ))}
                  <option value="NEW">➕ Register &amp; Bind a New ESP32 Product ID...</option>
                </select>
              </div>

              {selectedDeviceId === "NEW" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    New ESP32 Device Identifier <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ESP32-NICU-07"
                    value={customDeviceId}
                    onChange={(e) => setCustomDeviceId(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Use this ID in your Arduino firmware sketch as <code>DEVICE_ID</code>.
                  </p>
                </div>
              )}

              {/* HiveMQ Telemetry Info & Ping */}
              {selectedDeviceId !== "UNASSIGN" && (
                <div className="p-3.5 rounded-xl bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs space-y-2">
                  <div className="flex items-center justify-between font-semibold text-teal-900 dark:text-teal-200">
                    <span className="flex items-center gap-1.5">
                      <Radio size={14} className="text-teal-600 animate-pulse" />
                      HiveMQ MQTT Ingestion Topic:
                    </span>
                    <span className="text-[10px] bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-teal-300 dark:border-teal-700 font-mono">
                      broker.hivemq.com:1883
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-900 font-mono text-[11px] text-teal-700 dark:text-teal-300 border border-teal-100 dark:border-teal-900 select-all">
                    nicu/telemetry/{selectedDeviceId === "NEW" ? customDeviceId || "<DEVICE_ID>" : selectedDeviceId || assignModalBed.deviceId || "<DEVICE_ID>"}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-600 dark:text-slate-400">
                      Verify connection over HiveMQ:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleTestMqttPing(selectedDeviceId === "NEW" ? customDeviceId : selectedDeviceId, assignModalBed.bedId)}
                      className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-[10.5px] transition-colors"
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
                  className="px-4 py-2 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAssigning}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white shadow-sm flex items-center gap-1.5 transition-colors"
                >
                  <Save size={14} />
                  <span>{isAssigning ? "Saving..." : "Save Device Assignment"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
