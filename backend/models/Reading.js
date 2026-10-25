import mongoose from "mongoose";

const ReadingSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true },
    bedId: { type: String, required: true },
    patientId: { type: String, required: true },
    heartRate: { type: Number, required: true },
    spo2: { type: Number, required: true },
    temperature: { type: Number, required: true },
    batteryPercent: { type: Number, default: 85 },
    rssi: { type: Number, default: -58 },
    signalQuality: { type: String, default: "Good" },
    sequenceNumber: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("Reading", ReadingSchema);
