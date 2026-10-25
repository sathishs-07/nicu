import mongoose from "mongoose";

const PatientSchema = new mongoose.Schema(
  {
    patientId: { type: String, required: true, unique: true }, // e.g. "PT-2026-001" or "DEMO-001"
    babyName: { type: String, required: true },
    motherName: { type: String, required: true },
    fatherName: { type: String, default: "" },
    contactPhone: { type: String, default: "" },
    gender: { type: String, default: "Female", enum: ["Male", "Female", "Other"] },
    bloodGroup: { type: String, default: "O+" },
    gestationalAge: { type: String, default: "32w 4d" },
    birthWeight: { type: String, default: "1,680 g" },
    currentWeight: { type: String, default: "" },
    dischargeWeight: { type: String, default: "" },
    diagnosis: { type: String, default: "Prematurity, Respiratory Distress Syndrome" },
    admissionDate: { type: String, default: () => new Date().toISOString().substring(0, 10) },
    dischargeDate: { type: String, default: null },
    status: {
      type: String,
      default: "Admitted",
      enum: ["Admitted", "Monitoring", "Discharged", "Transferred"],
    },
    dischargeCondition: {
      type: String,
      default: null, // "Full Recovery", "Stable Stepdown", "Home Care", etc.
    },
    dischargeSummary: { type: String, default: "" },
    assignedBedId: { type: String, default: null }, // e.g. "NICU-01" or null if discharged
    assignedDoctorId: { type: String, default: "DOC-01" },
    assignedDoctorName: { type: String, default: "Dr. Meera Vasudevan" },
    assignedNurseIds: { type: [String], default: [] },
    deviceId: { type: String, default: null }, // e.g. "ESP32-NICU-01"
    clinicalNotes: { type: Array, default: [] },
  },
  { timestamps: true }
);

export default mongoose.model("Patient", PatientSchema);
