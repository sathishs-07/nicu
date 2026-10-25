import mongoose from "mongoose";

const AlertSchema = new mongoose.Schema(
  {
    alertId: { type: String, required: true, unique: true }, // e.g. "ALT-1082"
    detectedAt: { type: String, required: true },
    bedId: { type: String, required: true },
    patientId: { type: String, required: true },
    babyName: { type: String, required: true },
    alertType: { type: String, required: true }, // e.g. "HR & SpO2 Desaturation"
    parameter: { type: String, required: true },
    readingValue: { type: String, required: true },
    threshold: { type: String, required: true },
    priority: { type: String, default: "Urgent", enum: ["Urgent", "Warning", "Info"] },
    assignedStaff: { type: String, default: "Dr. Meera" },
    assignedStaffRole: { type: String, default: "Doctor" },
    acknowledgedAt: { type: String, default: null },
    resolvedAt: { type: String, default: null },
    duration: { type: String, default: "Just now" },
    status: { type: String, default: "Active", enum: ["Active", "Acknowledged", "Resolved"] },
    sensorQuality: { type: String, default: "Optical SNR: Good" },
    deviceId: { type: String, default: "ESP32-NICU-01" },
    notificationDelivered: { type: Boolean, default: true },
    notificationChannel: { type: String, default: "Audio Alarm, WebSocket Push" },
    preVitals: [
      {
        time: String,
        hr: Number,
        spo2: Number,
        temp: Number,
      },
    ],
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Alert", AlertSchema);
