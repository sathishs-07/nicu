import mongoose from "mongoose";

const ReadingSchema = new mongoose.Schema(
  {
    deviceId: { type: String, default: "ESP32-SENSOR" },
    bedId: { type: String, default: "UNASSIGNED" },
    patientId: { type: String, default: "UNASSIGNED" },
    heartRate: { type: Number, default: 0 },
    spo2: { type: Number, default: 0 },
    temperature: { type: Number, default: 0 },
    batteryPercent: { type: Number, default: 100 },
    rssi: { type: Number, default: -58 },
    signalQuality: { type: String, default: "Good" },
    sequenceNumber: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("Reading", ReadingSchema);
