import mongoose from "mongoose";

const SettingSchema = new mongoose.Schema(
  {
    key: { type: String, default: "global_thresholds", unique: true },
    hrLow: { type: Number, default: 100 },
    hrHigh: { type: Number, default: 180 },
    spo2Low: { type: Number, default: 90 },
    tempLow: { type: Number, default: 28.0 },
    tempHigh: { type: Number, default: 37.5 },
    persistenceSeconds: { type: Number, default: 5 },
    unitName: { type: String, default: "NICU Continuous Vital Monitoring System — Ward 3B" },
    lastUpdatedBy: { type: String, default: "Administrator" },
  },
  { timestamps: true }
);

export default mongoose.model("Setting", SettingSchema);
