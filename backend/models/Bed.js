import mongoose from "mongoose";

const BedSchema = new mongoose.Schema(
  {
    bedId: { type: String, required: true, unique: true }, // e.g. "NICU-01"
    patientId: { type: String, default: "" }, // e.g. "DEMO-001"
    babyName: { type: String, default: "" },
    motherName: { type: String, default: "" },
    gender: { type: String, default: "Female" },
    admissionDate: { type: String, default: "20 Oct 2026" },
    gestationalAge: { type: String, default: "32w 4d" },
    birthWeight: { type: String, default: "1,680 g" },
    bloodGroup: { type: String, default: "O+" },
    diagnosis: { type: String, default: "Prematurity, Respiratory Distress Syndrome" },
    unitType: { type: String, default: "Incubator A" },
    assignedDoctorId: { type: String, default: "DOC-01" },
    assignedDoctorName: { type: String, default: "Dr. Meera" },
    assignedNurseIds: { type: [String], default: [] },
    deviceId: { type: String, default: null }, // e.g. "ESP32-NICU-01" or null
    deviceMac: { type: String, default: "" },
    firmwareVersion: { type: String, default: "v2.1.4-esp32s3" },
    batteryPercent: { type: Number, default: 100 },
    signalQuality: { type: String, default: "Awaiting Sensor" },
    rssi: { type: Number, default: 0 },
    status: { type: String, default: "Standby" }, // Monitoring | Warning | Standby | Disconnected
    hr: { type: Number, default: null },
    spo2: { type: Number, default: null },
    temperature: { type: Number, default: null },
    lastUpdate: { type: String, default: "Awaiting Live Telemetry" },
    lastHeartbeatMs: { type: Number, default: 0 },
    connectionState: { type: String, default: "DISCONNECTED" },
    activeAlerts: { type: Array, default: [] },
    clinicalNotes: { type: Array, default: [] },
  },
  { timestamps: true }
);

export default mongoose.model("Bed", BedSchema);
