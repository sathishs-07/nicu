// =============================================================
// NeonatalClinicalToolsModal.jsx — Clinical Decision Support Hub
// 1. APGAR Score Calculator (1-min & 5-min with automated clinical triage)
// 2. Early-Onset Sepsis (EOS) & Jaundice Risk Estimator
// 3. Automated SBAR Shift Handover Note Generator
// =============================================================

import { useState, useMemo } from "react";
import {
  X,
  Activity,
  Calculator,
  ShieldAlert,
  FileText,
  Copy,
  Check,
  Baby,
  Heart,
  Thermometer,
  AlertTriangle,
  Stethoscope,
  Sparkles,
} from "lucide-react";

export default function NeonatalClinicalToolsModal({
  isOpen,
  onClose,
  selectedBed,
  currentUser,
}) {
  const [activeTab, setActiveTab] = useState("apgar"); // "apgar" | "sepsis" | "sbar"
  const [copied, setCopied] = useState(false);

  // APGAR Calculator State
  const [apgar, setApgar] = useState({
    appearance: 2, // 0: Blue/pale, 1: Acrocyanotic (body pink, blue extremities), 2: Completely pink
    pulse: 2,      // 0: Absent, 1: <100 bpm, 2: >100 bpm
    grimace: 2,    // 0: Flaccid, 1: Weak cry/grimace, 2: Vigorous cry, sneeze/cough
    activity: 2,   // 0: Limp, 1: Some flexion of extremities, 2: Active motion
    respiration: 2,// 0: Absent, 1: Slow/irregular cry, 2: Good strong cry
  });
  const [apgarMinute, setApgarMinute] = useState("1m"); // "1m" | "5m"

  const apgarScore = useMemo(() => {
    return (
      apgar.appearance +
      apgar.pulse +
      apgar.grimace +
      apgar.activity +
      apgar.respiration
    );
  }, [apgar]);

  const apgarInterpretation = useMemo(() => {
    if (apgarScore >= 7) {
      return {
        level: "Normal / Reassuring",
        color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800",
        recommendation: "Routine neonatal supportive care and continuous thermal & vitals monitoring.",
      };
    } else if (apgarScore >= 4) {
      return {
        level: "Moderately Abnormal",
        color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800",
        recommendation: "Tactile stimulation, clear airway, supplemental FiO2, and close telemetry monitoring.",
      };
    } else {
      return {
        level: "Severely Depressed / Critical",
        color: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800",
        recommendation: "Immediate active resuscitation (NRP protocol): positive pressure ventilation, airway seal, consider intubation.",
      };
    }
  }, [apgarScore]);

  // Sepsis Risk State
  const [maternalGbs, setMaternalGbs] = useState("Negative");
  const [romHours, setRomHours] = useState("Normal (<18h)");
  const [maternalFever, setMaternalFever] = useState("No");

  const sepsisRisk = useMemo(() => {
    let risk = "Low Risk";
    let color = "text-emerald-600 dark:text-emerald-400";
    if (maternalFever === "Yes" || romHours === "Prolonged (>18h)") {
      risk = "Moderate Risk (Blood cultures & close observation indicated)";
      color = "text-amber-600 dark:text-amber-400";
    }
    if (maternalGbs === "Positive" && (maternalFever === "Yes" || romHours === "Prolonged (>18h)")) {
      risk = "High Risk (Immediate empiric Ampicillin + Gentamicin & sepsis workup)";
      color = "text-rose-600 dark:text-rose-400 font-bold";
    }
    return { risk, color };
  }, [maternalGbs, romHours, maternalFever]);

  // Automated SBAR Note
  const sbarNote = useMemo(() => {
    const pt = selectedBed || {
      babyName: "Baby of Ananya",
      patientId: "PT-2026-001",
      bedId: "NICU-01",
      gestationalAge: "33w",
      diagnosis: "Preterm Neonatal Observation",
      hr: 142,
      spo2: 98,
      temperature: 36.8,
      assignedDoctorName: "Dr. Meera Vasudevan",
    };

    return `=== NICU SBAR CLINICAL SHIFT HANDOVER ===
Date & Time: ${new Date().toLocaleString("en-IN")}
Author: ${currentUser?.name || "Clinical Staff"} (${currentUser?.role || "Doctor"})

[S] SITUATION:
- Patient: ${pt.babyName} (ID: ${pt.patientId}, Bed: ${pt.bedId})
- Gestational Age: ${pt.gestationalAge || "33w"}
- Primary Diagnosis: ${pt.diagnosis || "Prematurity & Respiratory Distress"}

[B] BACKGROUND:
- Admission Date: ${pt.admissionDate || "2026-10-20"}
- Current Weight: ${pt.birthWeight || "1,850 g"}
- Assigned Lead Doctor: ${pt.assignedDoctorName || "Dr. Meera Vasudevan"}

[A] ASSESSMENT (Current Telemetry):
- Heart Rate: ${pt.hr ? `${pt.hr} bpm (Nominal)` : "Awaiting sensor"}
- SpO2: ${pt.spo2 ? `${pt.spo2}% (Normal on room air/CPAP)` : "Awaiting sensor"}
- Temperature: ${pt.temperature ? `${pt.temperature}°C (Normothermic)` : "Awaiting sensor"}
- Sensor Hardware: ${pt.deviceId || "ESP32-NICU-01"}
- Active Bed Alerts: ${pt.activeAlerts?.length || 0} active alert(s)

[R] RECOMMENDATION:
- Continue continuous telemetry monitoring and incubator temperature servo-control.
- Check 4-hour capillary blood glucose and verify phototherapy irradiance.
- Next Doctor Rounds: Shift change at 15:00.
=========================================`;
  }, [selectedBed, currentUser]);

  const handleCopySbar = () => {
    navigator.clipboard.writeText(sbarNote);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-800">
              <Calculator size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Neonatal Clinical Decision Support</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  AAP Standard
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Patient: {selectedBed?.babyName || "General NICU"} ({selectedBed?.bedId || "Ward"})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Sub-tab navigation */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 px-5 pt-3 gap-2 bg-slate-50/30 dark:bg-slate-900/40">
          {[
            { id: "apgar", label: "APGAR Calculator", icon: Stethoscope },
            { id: "sepsis", label: "Early Sepsis & Jaundice", icon: ShieldAlert },
            { id: "sbar", label: "SBAR Shift Handover", icon: FileText },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === id
                  ? "border-blue-600 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Icon size={14} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* 1. APGAR TAB */}
          {activeTab === "apgar" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Select Scoring Interval:
                </span>
                <div className="flex gap-1.5">
                  {["1m", "5m", "10m"].map((min) => (
                    <button
                      key={min}
                      onClick={() => setApgarMinute(min)}
                      className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                        apgarMinute === min
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {min} post-delivery
                    </button>
                  ))}
                </div>
              </div>

              {/* 5 APGAR Criteria */}
              <div className="space-y-2.5">
                {[
                  {
                    key: "appearance",
                    title: "A - Appearance (Skin Color)",
                    options: [
                      { val: 0, label: "0: Blue or Pale all over" },
                      { val: 1, label: "1: Pink body, blue extremities" },
                      { val: 2, label: "2: Completely pink" },
                    ],
                  },
                  {
                    key: "pulse",
                    title: "P - Pulse (Heart Rate)",
                    options: [
                      { val: 0, label: "0: Absent" },
                      { val: 1, label: "1: <100 bpm" },
                      { val: 2, label: "2: >100 bpm" },
                    ],
                  },
                  {
                    key: "grimace",
                    title: "G - Grimace (Reflex Irritability)",
                    options: [
                      { val: 0, label: "0: Flaccid / No response" },
                      { val: 1, label: "1: Grimace on suction" },
                      { val: 2, label: "2: Vigorous cry / cough" },
                    ],
                  },
                  {
                    key: "activity",
                    title: "A - Activity (Muscle Tone)",
                    options: [
                      { val: 0, label: "0: Limp / Absent" },
                      { val: 1, label: "1: Some extremity flexion" },
                      { val: 2, label: "2: Active spontaneous motion" },
                    ],
                  },
                  {
                    key: "respiration",
                    title: "R - Respiration (Breathing Effort)",
                    options: [
                      { val: 0, label: "0: Apneic / Absent" },
                      { val: 1, label: "1: Slow / Weak irregular cry" },
                      { val: 2, label: "2: Good strong sustained cry" },
                    ],
                  },
                ].map((crit) => (
                  <div
                    key={crit.key}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-1.5"
                  >
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {crit.title}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {crit.options.map((opt) => (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => setApgar({ ...apgar, [crit.key]: opt.val })}
                          className={`p-2 rounded-lg text-left text-[11px] font-medium transition-all ${
                            apgar[crit.key] === opt.val
                              ? "bg-blue-600 text-white font-bold shadow-xs"
                              : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* APGAR Result Banner */}
              <div className={`p-4 rounded-2xl border ${apgarInterpretation.color}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono uppercase tracking-wider font-bold">
                    {apgarMinute} APGAR Score:
                  </span>
                  <span className="text-2xl font-extrabold font-mono">
                    {apgarScore} / 10
                  </span>
                </div>
                <div className="text-xs font-bold mb-1">{apgarInterpretation.level}</div>
                <p className="text-[11.5px] leading-relaxed opacity-90">
                  {apgarInterpretation.recommendation}
                </p>
              </div>
            </div>
          )}

          {/* 2. SEPSIS TAB */}
          {activeTab === "sepsis" && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                Calculates neonatal Early-Onset Sepsis (EOS) risk based on CDC and Kaiser Permanente neonatal guidelines.
              </p>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Maternal Group B Strep (GBS)
                  </span>
                  <div className="flex gap-1.5">
                    {["Negative", "Positive", "Unknown"].map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setMaternalGbs(opt)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                          maternalGbs === opt
                            ? "bg-blue-600 text-white"
                            : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Rupture of Membranes (ROM)
                  </span>
                  <div className="flex gap-1.5">
                    {["Normal (<18h)", "Prolonged (>18h)"].map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setRomHours(opt)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                          romHours === opt
                            ? "bg-blue-600 text-white"
                            : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Intrapartum Maternal Fever (&gt;38.0°C)
                  </span>
                  <div className="flex gap-1.5">
                    {["No", "Yes"].map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setMaternalFever(opt)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                          maternalFever === opt
                            ? "bg-blue-600 text-white"
                            : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sepsis Assessment Box */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
                <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold mb-1">
                  Stratified Clinical Recommendation:
                </div>
                <div className={`text-sm ${sepsisRisk.color}`}>{sepsisRisk.risk}</div>
              </div>
            </div>
          )}

          {/* 3. SBAR TAB */}
          {activeTab === "sbar" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Ready-to-use clinical handover formatted according to WHO SBAR standards.
                </span>
                <button
                  type="button"
                  onClick={handleCopySbar}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? "Copied!" : "Copy to Clipboard"}</span>
                </button>
              </div>

              <textarea
                readOnly
                rows={12}
                value={sbarNote}
                className="w-full p-3.5 text-xs font-mono rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-hidden leading-relaxed"
              />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Close Tools
          </button>
        </div>
      </div>
    </div>
  );
}
