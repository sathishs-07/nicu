import mongoose from "mongoose";

const AuditLogSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    actor: { type: String, required: true },
    role: { type: String, required: true },
    action: { type: String, required: true },
    timestamp: { type: String, required: true },
    ip: { type: String, default: "192.168.1.1" },
  },
  { timestamps: true }
);

export default mongoose.model("AuditLog", AuditLogSchema);
