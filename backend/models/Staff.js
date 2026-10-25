import mongoose from "mongoose";

const StaffSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true }, // e.g. "DOC-01"
    name: { type: String, required: true },
    shortName: { type: String, required: true },
    role: { type: String, required: true, enum: ["Doctor", "Nurse", "Administrator"] },
    specialization: { type: String, default: "Neonatologist" },
    shift: { type: String, default: "Morning (07:00 - 15:00)" },
    shiftType: { type: String, default: "Morning" },
    contact: {
      email: { type: String, default: "" },
      phone: { type: String, default: "" },
      ext: { type: String, default: "" },
    },
    availability: { type: String, default: "On Duty", enum: ["On Duty", "Off Duty", "On Call"] },
    assignedBeds: [{ type: String }],
    supervisingDoctor: { type: String, default: null },
    totalAlertsHandled: { type: Number, default: 0 },
    medianResponseTime: { type: String, default: "1.4 mins" },
    avatar: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Staff", StaffSchema);
