// =============================================================
// Patients.jsx — Neonatal Inpatient & Discharge Management
// Full clinical workflow: Patient Admission, Real-Time Bed Binding,
// Continuous Vitals Inspection, and Medical Discharge Protocols.
// =============================================================

import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Baby,
  Users,
  HeartPulse,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  ArrowRight,
  ShieldAlert,
  LogOut,
  Sparkles,
  Cpu,
  BedDouble,
  FileText,
  UserCheck,
  Stethoscope,
  Weight,
  HelpCircle,
  Copy,
  Check,
  Radio,
  ExternalLink,
  ChevronRight,
  X,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { api } from "../services/api";

export default function Patients() {
  const {
    patients,
    beds,
    devices,
    staffList,
    admitPatient,
    dischargePatient,
    updatePatient,
    can,
    currentUser,
  } = useApp();

  // Tab filter: "ADMITTED" | "DISCHARGED" | "ALL" | "WARNING"
  const [activeTab, setActiveTab] = useState("ADMITTED");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState("ALL");

  // Modals state
  const [isAdmitModalOpen, setIsAdmitModalOpen] = useState(false);
  const [isDischargeModalOpen, setIsDischargeModalOpen] = useState(false);
  const [isDeviceGuideOpen, setIsDeviceGuideOpen] = useState(false);
  const [patientToDischarge, setPatientToDischarge] = useState(null);
  const [selectedPatientDetails, setSelectedPatientDetails] = useState(null);

  // Admit Form State
  const [admitForm, setAdmitForm] = useState({
    babyName: "",
    motherName: "",
    fatherName: "",
    contactPhone: "",
    gender: "Female",
    bloodGroup: "O+",
    gestationalAge: "32w 4d",
    birthWeight: "1,750 g",
    diagnosis: "Prematurity, Respiratory Distress Syndrome",
    assignedBedId: "NICU-01",
    assignedDoctorId: "DOC-01",
    assignedDoctorName: "Dr. Meera Vasudevan",
    deviceId: "",
    admissionNotes: "Admitted from labor delivery. Requires continuous SpO2 and thermal monitoring.",
  });

  // Discharge Form State
  const [dischargeForm, setDischargeForm] = useState({
    dischargeCondition: "Full Recovery - Physiological Stability Reached",
    dischargeWeight: "2,250 g",
    dischargeDate: new Date().toISOString().substring(0, 10),
    dischargeSummary:
      "Infant achieved vital sign stability on room air, consistent enteral feeding, and steady weight gain. Discharged home with follow-up in 1 week.",
  });

  // Device Test State for Connection Wizard
  const [isTestingMqtt, setIsTestingMqtt] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Occupied Bed IDs and Device IDs currently assigned to active admitted patients
  const occupiedBedIds = useMemo(() => {
    return (patients || [])
      .filter((p) => p.status === "Admitted" && p.assignedBedId)
      .map((p) => p.assignedBedId);
  }, [patients]);

  const occupiedDeviceIds = useMemo(() => {
    return (patients || [])
      .filter((p) => p.status === "Admitted" && p.deviceId)
      .map((p) => p.deviceId);
  }, [patients]);

  // Available beds for admission (only unoccupied beds)
  const availableBeds = useMemo(() => {
    const allBedIds = beds && beds.length > 0 ? beds.map((b) => b.bedId) : ["NICU-01", "NICU-02", "NICU-03", "NICU-04", "NICU-05", "NICU-06"];
    return allBedIds.filter((bId) => !occupiedBedIds.includes(bId));
  }, [beds, occupiedBedIds]);

  // Available devices (only unassigned or spare devices)
  const availableDevices = useMemo(() => {
    return (devices || []).filter((d) => !occupiedDeviceIds.includes(d.deviceId));
  }, [devices, occupiedDeviceIds]);

  // Doctors list for dropdowns
  const doctorsList = useMemo(() => {
    return staffList.filter((s) => s.role === "Doctor");
  }, [staffList]);

  // Compute Statistics
  const totalCount = patients.length;
  const admittedCount = patients.filter((p) => p.status === "Admitted").length;
  const dischargedCount = patients.filter((p) => p.status === "Discharged").length;
  const activeBedsCount = beds.filter(
    (b) => b.status === "Monitoring" || b.status === "Warning"
  ).length;

  // Filtered Patients
  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      // Tab filter
      if (activeTab === "ADMITTED" && p.status !== "Admitted") return false;
      if (activeTab === "DISCHARGED" && p.status !== "Discharged") return false;
      if (activeTab === "WARNING") {
        const bed = beds.find((b) => b.bedId === p.assignedBedId);
        if (!bed || bed.status !== "Warning") return false;
      }

      // Doctor filter
      if (
        selectedDoctorFilter !== "ALL" &&
        p.assignedDoctorId !== selectedDoctorFilter &&
        p.assignedDoctorName !== selectedDoctorFilter
      ) {
        return false;
      }

      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.babyName?.toLowerCase().includes(q) ||
        p.motherName?.toLowerCase().includes(q) ||
        p.patientId?.toLowerCase().includes(q) ||
        p.assignedBedId?.toLowerCase().includes(q) ||
        p.diagnosis?.toLowerCase().includes(q) ||
        p.assignedDoctorName?.toLowerCase().includes(q)
      );
    });
  }, [patients, activeTab, selectedDoctorFilter, searchQuery, beds]);

  // Handle Admission Submit
  const handleAdmitSubmit = async (e) => {
    e.preventDefault();
    if (!admitForm.babyName || !admitForm.motherName) {
      alert("Baby Name and Mother Name are required.");
      return;
    }

    try {
      const selectedDoc = staffList.find((s) => s.id === admitForm.assignedDoctorId);
      await admitPatient({
        ...admitForm,
        assignedDoctorName: selectedDoc ? selectedDoc.name : admitForm.assignedDoctorName,
      });
      setIsAdmitModalOpen(false);
      // Reset form
      setAdmitForm({
        babyName: "",
        motherName: "",
        fatherName: "",
        contactPhone: "",
        gender: "Female",
        bloodGroup: "O+",
        gestationalAge: "32w 4d",
        birthWeight: "1,750 g",
        diagnosis: "Prematurity, Respiratory Distress Syndrome",
        assignedBedId: "NICU-01",
        assignedDoctorId: "DOC-01",
        assignedDoctorName: "Dr. Meera Vasudevan",
        deviceId: "",
        admissionNotes: "Admitted from delivery ward. Vital telemetry active.",
      });
    } catch (err) {
      alert("Error admitting patient: " + err.message);
    }
  };

  // Open Discharge Modal
  const openDischargeModal = (patient) => {
    setPatientToDischarge(patient);
    setDischargeForm({
      dischargeCondition: "Full Recovery - Physiological Stability Reached",
      dischargeWeight: patient.currentWeight || patient.birthWeight || "2,200 g",
      dischargeDate: new Date().toISOString().substring(0, 10),
      dischargeSummary: `Patient ${patient.babyName} completed active intensive phototherapy and respiratory stabilization. Fully recovered and ready for discharge.`,
    });
    setIsDischargeModalOpen(true);
  };

  // Handle Discharge Submit
  const handleDischargeSubmit = async (e) => {
    e.preventDefault();
    if (!patientToDischarge) return;

    try {
      await dischargePatient(patientToDischarge.patientId, dischargeForm);
      setIsDischargeModalOpen(false);
      setPatientToDischarge(null);
    } catch (err) {
      alert("Error discharging patient: " + err.message);
    }
  };

  // Live MQTT Test Ping
  const handleTestMqtt = async () => {
    setIsTestingMqtt(true);
    setTestResult(null);
    try {
      const res = await api.testPublishMqtt({
        deviceId: "ESP32-NICU-01",
        bedId: "NICU-01",
        heartRate: 145,
        spo2: 99,
        temperature: 36.8,
      });
      setTestResult({
        success: true,
        message: "Live telemetry transmitted via HiveMQ MQTT (broker.hivemq.com:1883)!",
        data: res,
      });
    } catch (err) {
      setTestResult({
        success: false,
        message: "Failed to publish MQTT message: " + err.message,
      });
    } finally {
      setIsTestingMqtt(false);
    }
  };

  // Sample ESP32 Configuration Code Snippet
  const esp32Snippet = `// === STEP 1: CHANGE ONLY THESE 3 LINES IN YOUR ESP32 CODE ===
const char* WIFI_SSID     = "MyHospitalWiFi";    // Put your Wi-Fi or Mobile Hotspot Name
const char* WIFI_PASSWORD = "WiFiPassword123";   // Put your Wi-Fi Password
const char* BED_ID        = "NICU-01";           // Set to Bed: NICU-01, NICU-02, etc.
const char* DEVICE_ID     = "ESP32-NICU-01";     // Set to your ESP32 device ID

// === STEP 2: THAT'S IT! The code connects automatically to HiveMQ broker ===
// Broker: broker.hivemq.com:1883 (FREE, 24/7, No Signup Required)
// Topic:  nicu/telemetry/ESP32-NICU-01`;

  const copySnippet = () => {
    navigator.clipboard.writeText(esp32Snippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ── Page Header & Quick Actions ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-500/20">
              <Baby size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                Neonatal Patient Management
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Inpatient Admission · Bed Assignment · Discharge Protocols · Live Telemetry
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Admit New Patient Button */}
          <button
            onClick={() => {
              if (availableBeds.length === 0) {
                alert("All 6 NICU Beds are currently occupied. Please discharge a patient to release a bed slot.");
                return;
              }
              setAdmitForm((prev) => ({
                ...prev,
                assignedBedId: availableBeds[0] || "NICU-01",
                deviceId: availableDevices[0]?.deviceId || "",
              }));
              setIsAdmitModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm text-white bg-teal-600 hover:bg-teal-700 active:scale-95"
          >
            <Plus size={16} />
            <span>Admit Neonate</span>
          </button>
        </div>
      </div>

      {/* ── KPI Metric Counters ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Admitted Inpatients
            </span>
            <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600">
              <Baby size={18} />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {admittedCount}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Assigned to monitored incubator slots
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Active Monitoring
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
              <HeartPulse size={18} className="animate-pulse" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
            {activeBedsCount}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Transmitting live vital telemetry
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Discharged Archive
            </span>
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {dischargedCount}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Stabilized & safely discharged home
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Managed
            </span>
            <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600">
              <Users size={18} />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {totalCount}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Historical neonate patient records
          </div>
        </div>
      </div>

      {/* ── Search, Tabs & Filters Bar ── */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 overflow-x-auto">
            <button
              onClick={() => setActiveTab("ADMITTED")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === "ADMITTED"
                  ? "bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Admitted Inpatients ({admittedCount})
            </button>
            <button
              onClick={() => setActiveTab("DISCHARGED")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === "DISCHARGED"
                  ? "bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Discharged Archive ({dischargedCount})
            </button>
            <button
              onClick={() => setActiveTab("ALL")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === "ALL"
                  ? "bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              All Records ({totalCount})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search by baby, mother, Bed ID, diagnosis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
            />
          </div>
        </div>
      </div>

      {/* ── Patients Roster List / Cards ── */}
      {filteredPatients.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <Baby size={40} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            No Patient Records Found
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            {searchQuery
              ? `No records match "${searchQuery}". Try clearing search filters.`
              : "No patients currently in this view. Click 'Admit Neonate' to register a new baby."}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setIsAdmitModalOpen(true)}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 shadow-xs"
            >
              Admit First Patient
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {filteredPatients.map((patient) => {
            const isAdmitted = patient.status === "Admitted";
            const assignedBed = beds.find((b) => b.bedId === patient.assignedBedId);
            const hasVitals = assignedBed && assignedBed.hr !== null && assignedBed.hr > 0;

            return (
              <div
                key={patient.patientId || patient._id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-teal-500/40 transition-all"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Neonate Identity Column */}
                  <div className="flex items-start gap-4 min-w-[280px]">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 font-bold text-lg ${
                        isAdmitted
                          ? "bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-500/20"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      <Baby size={24} />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-base text-slate-900 dark:text-white">
                          {patient.babyName}
                        </h3>
                        <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {patient.patientId}
                        </span>
                        {isAdmitted ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-ping" />
                            {patient.assignedBedId || "Bed Slot"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                            <CheckCircle2 size={12} />
                            Discharged
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                        <span>
                          Mother: <strong className="text-slate-700 dark:text-slate-300">{patient.motherName}</strong>
                        </span>
                        <span>•</span>
                        <span>Gender: {patient.gender}</span>
                        <span>•</span>
                        <span>Blood: {patient.bloodGroup || "O+"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Clinical Parameters Column */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-50 dark:bg-slate-950/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Gestational Age
                      </div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                        {patient.gestationalAge || "32w"}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        {isAdmitted ? "Birth Weight" : "Discharge Wt"}
                      </div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                        {isAdmitted
                          ? patient.birthWeight || "1,680 g"
                          : patient.dischargeWeight || patient.birthWeight}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Attending Doctor
                      </div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 truncate max-w-[130px]">
                        {patient.assignedDoctorName || "Dr. Meera"}
                      </div>
                    </div>

                    <div className="col-span-2 sm:col-span-3 pt-1 border-t border-slate-200/50 dark:border-slate-800">
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        <strong>Diagnosis:</strong> {patient.diagnosis || "Premature care observation"}
                      </div>
                    </div>
                  </div>

                  {/* Live Telemetry / Discharge Status */}
                  <div className="min-w-[160px] flex flex-col justify-center">
                    {isAdmitted ? (
                      <div>
                        <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                          Live Vital Telemetry
                        </div>
                        {hasVitals ? (
                          <div className="flex items-center gap-2 mt-1 font-mono text-xs">
                            <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold">
                              HR: {assignedBed.hr}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold">
                              SpO₂: {assignedBed.spo2}%
                            </span>
                            <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-bold">
                              {assignedBed.temperature}°C
                            </span>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400 italic mt-1 flex items-center gap-1.5">
                            <Radio size={13} className="text-slate-400" />
                            <span>{patient.deviceId ? "Device attached - Standby" : "No ESP32 bound"}</span>
                          </div>
                        )}
                        <div className="text-[11px] text-slate-400 mt-1">
                          Admitted: {patient.admissionDate}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                          Discharge Summary
                        </div>
                        <div className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5">
                          {patient.dischargeCondition || "Recovered"}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          Discharged: {patient.dischargeDate || "Completed"}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons Column */}
                  <div className="flex items-center gap-2 self-end lg:self-center">
                    {isAdmitted ? (
                      <>
                        <Link
                          to={`/patients/${patient.patientId}`}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-500/20 hover:bg-teal-100 dark:hover:bg-teal-900/40 transition-colors flex items-center gap-1"
                          title="View live vitals monitor"
                        >
                          <Activity size={14} />
                          <span>Monitor</span>
                        </Link>

                        <button
                          onClick={() => openDischargeModal(patient)}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-500/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors flex items-center gap-1"
                          title="Initiate clinical discharge protocol"
                        >
                          <LogOut size={14} />
                          <span>Discharge</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setSelectedPatientDetails(patient)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1"
                      >
                        <FileText size={14} />
                        <span>Case Record</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Admit Neonate Modal ── */}
      {isAdmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/40">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600">
                  <Baby size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Admit New Neonate Patient
                  </h3>
                  <p className="text-xs text-slate-500">
                    Allocate incubator bed slot, assign medical team and configure ESP32 monitor
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAdmitModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAdmitSubmit} className="p-6 overflow-y-auto space-y-5">
              {/* Section 1: Infant Identity */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 mb-2">
                  1. Infant & Maternal Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Baby Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Baby of Sunita"
                      value={admitForm.babyName}
                      onChange={(e) => setAdmitForm({ ...admitForm, babyName: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Mother Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sunita Devi"
                      value={admitForm.motherName}
                      onChange={(e) => setAdmitForm({ ...admitForm, motherName: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Gender
                    </label>
                    <select
                      value={admitForm.gender}
                      onChange={(e) => setAdmitForm({ ...admitForm, gender: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Blood Group (Typeable)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. O+, A-, B+, Rh-null"
                      value={admitForm.bloodGroup}
                      onChange={(e) => setAdmitForm({ ...admitForm, bloodGroup: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Clinical Parameters */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 mb-2">
                  2. Clinical Parameters
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Gestational Age
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 32w 4d"
                      value={admitForm.gestationalAge}
                      onChange={(e) =>
                        setAdmitForm({ ...admitForm, gestationalAge: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Birth Weight
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1,680 g"
                      value={admitForm.birthWeight}
                      onChange={(e) => setAdmitForm({ ...admitForm, birthWeight: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Primary Clinical Diagnosis
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Prematurity, Respiratory Distress Syndrome"
                      value={admitForm.diagnosis}
                      onChange={(e) => setAdmitForm({ ...admitForm, diagnosis: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Bed & Equipment Binding */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 mb-2">
                  3. Bed Slot & Hardware Binding
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Assign Incubator Bed *
                    </label>
                    <select
                      value={admitForm.assignedBedId}
                      onChange={(e) => setAdmitForm({ ...admitForm, assignedBedId: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono"
                    >
                      {availableBeds.map((bedId) => (
                        <option key={bedId} value={bedId}>
                          {bedId}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Attending Doctor
                    </label>
                    <select
                      value={admitForm.assignedDoctorId}
                      onChange={(e) => {
                        const doc = doctorsList.find((d) => d.id === e.target.value);
                        setAdmitForm({
                          ...admitForm,
                          assignedDoctorId: e.target.value,
                          assignedDoctorName: doc ? doc.name : "Attending Doctor",
                        });
                      }}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                    >
                      {doctorsList.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Assign ESP32 Monitor
                    </label>
                    <select
                      value={admitForm.deviceId}
                      onChange={(e) => setAdmitForm({ ...admitForm, deviceId: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono"
                    >
                      <option value="">-- Connect Later / Standby --</option>
                      {availableDevices.map((d) => (
                        <option key={d.deviceId} value={d.deviceId}>
                          {d.deviceId} ({d.status || "Available"})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 4: Clinical Admission Note */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Initial Clinical Admission Note
                </label>
                <textarea
                  rows={2}
                  value={admitForm.admissionNotes}
                  onChange={(e) => setAdmitForm({ ...admitForm, admissionNotes: e.target.value })}
                  placeholder="Record immediate treatment directives..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              {/* Buttons */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAdmitModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-md"
                >
                  Confirm & Admit Neonate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Discharge Patient Modal ── */}
      {isDischargeModalOpen && patientToDischarge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-amber-50/50 dark:bg-amber-950/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400">
                  <LogOut size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Discharge Protocol: {patientToDischarge.babyName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Patient ID: {patientToDischarge.patientId} · Current Bed:{" "}
                    {patientToDischarge.assignedBedId || "NICU Bed"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDischargeModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleDischargeSubmit} className="p-6 space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300/40 dark:border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400" />
                  Clinical Protocol Notice:
                </div>
                <div>
                  Discharging will release incubator slot{" "}
                  <strong>{patientToDischarge.assignedBedId || "Bed"}</strong> and unassign
                  connected monitoring device{" "}
                  <strong>{patientToDischarge.deviceId || "ESP32"}</strong> for future admissions.
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Discharge Condition *
                </label>
                <select
                  value={dischargeForm.dischargeCondition}
                  onChange={(e) =>
                    setDischargeForm({ ...dischargeForm, dischargeCondition: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                >
                  <option value="Full Recovery - Physiological Stability Reached">
                    Full Recovery - Physiological Stability Reached
                  </option>
                  <option value="Stable - Discharged Home with Outpatient Follow-up">
                    Stable - Discharged Home with Outpatient Follow-up
                  </option>
                  <option value="Transferred to Step-Down Nursery Ward">
                    Transferred to Step-Down Nursery Ward
                  </option>
                  <option value="Transferred to Higher Speciality Surgical Facility">
                    Transferred to Higher Speciality Surgical Facility
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Discharge Weight (g)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2,250 g"
                    value={dischargeForm.dischargeWeight}
                    onChange={(e) =>
                      setDischargeForm({ ...dischargeForm, dischargeWeight: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Discharge Date
                  </label>
                  <input
                    type="date"
                    required
                    value={dischargeForm.dischargeDate}
                    onChange={(e) =>
                      setDischargeForm({ ...dischargeForm, dischargeDate: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Clinical Discharge Summary & Doctor Directives *
                </label>
                <textarea
                  rows={3}
                  required
                  value={dischargeForm.dischargeSummary}
                  onChange={(e) =>
                    setDischargeForm({ ...dischargeForm, dischargeSummary: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsDischargeModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-md"
                >
                  Confirm & Discharge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Case Record Summary Modal (For Discharged) ── */}
      {selectedPatientDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="text-teal-600" size={20} />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Case Record Archive: {selectedPatientDetails.babyName}
                </h3>
              </div>
              <button
                onClick={() => setSelectedPatientDetails(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="text-xs space-y-2.5">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-slate-400">Patient ID:</span>{" "}
                  <strong className="text-slate-800 dark:text-slate-200">{selectedPatientDetails.patientId}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Mother:</span>{" "}
                  <strong className="text-slate-800 dark:text-slate-200">{selectedPatientDetails.motherName}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Admission:</span>{" "}
                  <strong className="text-slate-800 dark:text-slate-200">{selectedPatientDetails.admissionDate}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Discharge:</span>{" "}
                  <strong className="text-slate-800 dark:text-slate-200">{selectedPatientDetails.dischargeDate || "N/A"}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Birth Weight:</span>{" "}
                  <strong className="text-slate-800 dark:text-slate-200">{selectedPatientDetails.birthWeight}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Discharge Weight:</span>{" "}
                  <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {selectedPatientDetails.dischargeWeight || selectedPatientDetails.birthWeight}
                  </strong>
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300">Discharge Outcome:</span>
                <p className="mt-0.5 text-slate-600 dark:text-slate-400 font-semibold text-emerald-600 dark:text-emerald-400">
                  {selectedPatientDetails.dischargeCondition || "Recovered & Discharged"}
                </p>
              </div>

              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300">Clinical Summary:</span>
                <p className="mt-0.5 text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  {selectedPatientDetails.dischargeSummary || "No clinical discharge notes recorded."}
                </p>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedPatientDetails(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
              >
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ESP32 Beginner Device Connection Wizard Modal (Moved to Settings page) ── */}
      {false && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-teal-500/10 to-indigo-500/10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-teal-600 text-white shadow-xs">
                  <Cpu size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                    ESP32 Device Connection Wizard (Beginner Friendly)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Step-by-step instructions so ANYONE can connect real hardware in 3 minutes!
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDeviceGuideOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs sm:text-sm">
              {/* Architecture Overview Banner */}
              <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                    <Sparkles size={16} className="text-teal-600" />
                    How It Works (100% Free & No Setup Required):
                  </div>
                  <p className="text-xs text-teal-800 dark:text-teal-300 mt-1">
                    ESP32 publishes directly to the free cloud broker{" "}
                    <code className="bg-white/80 dark:bg-slate-900 px-1 py-0.5 rounded font-mono font-bold">
                      broker.hivemq.com:1883
                    </code>
                    . The NICU server catches it automatically and streams it right to your screen!
                  </p>
                </div>
              </div>

              {/* Step 1 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center">
                    1
                  </span>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    Open Arduino IDE and Install 2 Free Libraries
                  </h4>
                </div>
                <div className="ml-8 text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
                  <p>In Arduino IDE, click <strong>Tools → Manage Libraries...</strong> and search:</p>
                  <ul className="list-disc list-inside space-y-1 font-mono text-[11px] bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <li>
                      <strong className="text-teal-600 dark:text-teal-400">PubSubClient</strong> by Nick O'Leary (click Install)
                    </li>
                    <li>
                      <strong className="text-teal-600 dark:text-teal-400">SparkFun MAX3010x</strong> (optional, only if sensor is attached)
                    </li>
                  </ul>
                </div>
              </div>

              {/* Step 2 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center">
                    2
                  </span>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    Open the Sketch & Change ONLY These 3 Lines:
                  </h4>
                </div>
                <div className="ml-8 space-y-2">
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Open <code className="font-mono text-teal-600 font-bold">esp32/nicu_esp32_hivemq_transmitter.ino</code> in Arduino IDE. Replace lines 28–35 with your WiFi:
                  </p>

                  <div className="relative rounded-2xl bg-slate-950 p-4 border border-slate-800 text-slate-200 font-mono text-xs overflow-x-auto">
                    <button
                      onClick={copySnippet}
                      className="absolute right-3 top-3 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1.5 transition-colors border border-slate-700"
                    >
                      {copiedCode ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                      <span>{copiedCode ? "Copied!" : "Copy Snippet"}</span>
                    </button>
                    <pre className="text-emerald-400">{esp32Snippet}</pre>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center">
                    3
                  </span>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    Plug USB Cable & Click Upload (Arrow Button)
                  </h4>
                </div>
                <div className="ml-8 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                  <p>• In Arduino IDE, select <strong>Tools → Board → ESP32 Dev Module</strong>.</p>
                  <p>• Select your USB port under <strong>Tools → Port</strong> (e.g. COM3, COM4).</p>
                  <p>• Click the <strong>Upload</strong> (→) button.</p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center">
                    4
                  </span>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    Open Serial Monitor (115200 baud) — You are DONE!
                  </h4>
                </div>
                <div className="ml-8 text-xs text-slate-600 dark:text-slate-400 space-y-2">
                  <p>You will immediately see:</p>
                  <div className="p-3 rounded-xl bg-slate-900 text-emerald-400 font-mono text-[11px] border border-slate-800 space-y-1">
                    <div>[WiFi] Connected! IP Address: 192.168.1.105</div>
                    <div>[HiveMQ] Connected to broker.hivemq.com:1883!</div>
                    <div>[MQTT PUBLISH] {"{"}"deviceId":"ESP32-NICU-01", "bedId":"NICU-01", "heartRate":142, "spo2":98, "temperature":36.8{"}"}</div>
                  </div>
                  <p className="text-slate-500">
                    The NICU Dashboard will automatically glow green and stream this baby's vitals live!
                  </p>
                </div>
              </div>

              {/* Quick MQTT Cloud Simulator Test Tool */}
              <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-300/40 dark:border-indigo-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-bold text-indigo-950 dark:text-indigo-200 text-xs sm:text-sm">
                      Don't have hardware nearby right now? Test Live Cloud Ingestion:
                    </h5>
                    <p className="text-xs text-indigo-800/80 dark:text-indigo-300/80">
                      Send a real MQTT live telemetry packet through HiveMQ directly to verify the pipeline.
                    </p>
                  </div>

                  <button
                    onClick={handleTestMqtt}
                    disabled={isTestingMqtt}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <Radio size={14} className={isTestingMqtt ? "animate-spin" : ""} />
                    <span>{isTestingMqtt ? "Publishing..." : "Send Test Telemetry"}</span>
                  </button>
                </div>

                {testResult && (
                  <div
                    className={`p-3 rounded-xl text-xs font-mono border ${
                      testResult.success
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-500/30"
                        : "bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border-red-500/30"
                    }`}
                  >
                    <div className="font-bold">{testResult.message}</div>
                    {testResult.data && (
                      <div className="mt-1 opacity-90">
                        Topic: {testResult.data.topic} · Payload: {JSON.stringify(testResult.data.payload)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Full documentation in <code className="font-mono">ESP32_FREE_INTEGRATION_GUIDE.md</code>
              </span>
              <button
                onClick={() => setIsDeviceGuideOpen(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-sm"
              >
                Got It, Let's Connect!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
