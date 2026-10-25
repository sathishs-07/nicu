import mongoose from "mongoose";

const DeviceSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true, unique: true }, // e.g. "ESP32-NICU-01"
    deviceLabel: { type: String, default: "ESP32 Vital Monitor" },
    model: { type: String, default: "ESP32-S3 DevKit" },
    macAddress: { type: String, default: "24:6F:28:AB:12:01" },
    firmwareVersion: { type: String, default: "v2.1.4-esp32s3" },
    assignedBedId: { type: String, default: null }, // e.g. "NICU-01" or null if unassigned
    assignedPatientId: { type: String, default: null },
    status: { type: String, default: "ONLINE", enum: ["ONLINE", "OFFLINE", "UNASSIGNED", "WARNING"] },
    batteryPercent: { type: Number, default: 85 },
    rssi: { type: Number, default: -58 },
    signalQuality: { type: String, default: "Good" },
    lastSeen: { type: Date, default: Date.now },
    sensors: {
      max30102: { type: Boolean, default: true },
      tmp117: { type: Boolean, default: true },
    },
    autoDiscovered: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Device", DeviceSchema);
