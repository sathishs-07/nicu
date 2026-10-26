// =============================================================
// seed.js — NICU System Initialization (clean seed)
// Seeds ONLY: Staff roster + default clinical thresholds
// Beds are created dynamically when patients are admitted
// Alerts are generated only from live ESP32 telemetry
// =============================================================
import mongoose from "mongoose";
import dotenv from "dotenv";
import Staff from "./models/Staff.js";
import Setting from "./models/Setting.js";
import AuditLog from "./models/AuditLog.js";

dotenv.config();

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb+srv://sathish07002_db_user:DmP4CsTEfO4vCZtG@cluster0.nk3wz0y.mongodb.net/nicu?retryWrites=true&w=majority";

// ─── Initial Clinical Staff Roster ────────────────────────────
const INITIAL_STAFF = [
  {
    id: "DOC-01",
    name: "Dr. Meera Vasudevan",
    shortName: "Dr. Meera",
    role: "Doctor",
    specialization: "Lead Neonatologist (MD, DNB Neonatology)",
    shift: "Morning (07:00 - 15:00)",
    shiftType: "Morning",
    contact: {
      email: "dr.meera@nicucenter.org",
      phone: "+91 98401 23456",
      ext: "4102",
    },
    availability: "On Duty",
    assignedBeds: [],
    supervisingDoctor: null,
    totalAlertsHandled: 0,
    medianResponseTime: "—",
    avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "DOC-02",
    name: "Dr. Rajesh Kulkarni",
    shortName: "Dr. Rajesh",
    role: "Doctor",
    specialization: "Senior Pediatric Intensivist (MD, FAAP)",
    shift: "Evening (15:00 - 23:00)",
    shiftType: "Evening",
    contact: {
      email: "dr.rajesh@nicucenter.org",
      phone: "+91 98402 34567",
      ext: "4105",
    },
    availability: "On Call",
    assignedBeds: [],
    supervisingDoctor: null,
    totalAlertsHandled: 0,
    medianResponseTime: "—",
    avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "DOC-03",
    name: "Dr. Alok Sengupta",
    shortName: "Dr. Alok",
    role: "Doctor",
    specialization: "Consultant Neonatologist (DM Neonatology)",
    shift: "Night (23:00 - 07:00)",
    shiftType: "Night",
    contact: {
      email: "dr.alok@nicucenter.org",
      phone: "+91 98403 45678",
      ext: "4108",
    },
    availability: "Off Duty",
    assignedBeds: [],
    supervisingDoctor: null,
    totalAlertsHandled: 0,
    medianResponseTime: "—",
    avatar: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "NUR-01",
    name: "Nurse Priya Thomas",
    shortName: "Nurse Priya",
    role: "Nurse",
    specialization: "Senior NICU Care Specialist (BSc Nursing, NALS Certified)",
    shift: "Morning (07:00 - 15:00)",
    shiftType: "Morning",
    contact: {
      email: "priya.thomas@nicucenter.org",
      phone: "+91 98404 56789",
      ext: "4121",
    },
    availability: "On Duty",
    assignedBeds: [],
    supervisingDoctor: "Dr. Meera Vasudevan",
    totalAlertsHandled: 0,
    medianResponseTime: "—",
    avatar: "https://images.unsplash.com/photo-1594824813576-96b610c144a1?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "NUR-02",
    name: "Nurse Anjali Mohan",
    shortName: "Nurse Anjali",
    role: "Nurse",
    specialization: "Neonatal Resuscitation & Critical Care Nurse",
    shift: "Morning (07:00 - 15:00)",
    shiftType: "Morning",
    contact: {
      email: "anjali.mohan@nicucenter.org",
      phone: "+91 98405 67890",
      ext: "4122",
    },
    availability: "On Duty",
    assignedBeds: [],
    supervisingDoctor: "Dr. Meera Vasudevan",
    totalAlertsHandled: 0,
    medianResponseTime: "—",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "NUR-03",
    name: "Nurse Deepa Chandran",
    shortName: "Nurse Deepa",
    role: "Nurse",
    specialization: "Staff Nurse - Incubator Care & Phototherapy",
    shift: "Evening (15:00 - 23:00)",
    shiftType: "Evening",
    contact: {
      email: "deepa.c@nicucenter.org",
      phone: "+91 98406 78901",
      ext: "4123",
    },
    availability: "On Call",
    assignedBeds: [],
    supervisingDoctor: "Dr. Rajesh Kulkarni",
    totalAlertsHandled: 0,
    medianResponseTime: "—",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "NUR-04",
    name: "Nurse Karthik Raman",
    shortName: "Nurse Karthik",
    role: "Nurse",
    specialization: "Staff Nurse - Continuous Monitoring & Telemetry",
    shift: "Night (23:00 - 07:00)",
    shiftType: "Night",
    contact: {
      email: "karthik.r@nicucenter.org",
      phone: "+91 98407 89012",
      ext: "4124",
    },
    availability: "Off Duty",
    assignedBeds: [],
    supervisingDoctor: "Dr. Alok Sengupta",
    totalAlertsHandled: 0,
    medianResponseTime: "—",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
  },
];

// ─── Default Clinical Safety Thresholds ───────────────────────
const DEFAULT_THRESHOLDS = {
  key: "global_thresholds",
  hrLow: 100,       // bpm - neonatal bradycardia threshold
  hrHigh: 180,      // bpm - neonatal tachycardia threshold
  spo2Low: 90,      // % - minimum acceptable oxygen saturation
  tempLow: 36.2,    // °C - neonatal hypothermia limit
  tempHigh: 37.5,   // °C - neonatal hyperthermia limit
  persistenceSeconds: 5,
};

// ─── RBAC User Accounts ────────────────────────────────────────
// These are the pre-configured login accounts for the system.
// In production, use a proper auth system (JWT + bcrypt).
export const SYSTEM_USERS = [
  {
    id: "ADMIN-01",
    name: "System Administrator",
    shortName: "Admin",
    role: "Administrator",
    username: "admin",
    password: "nicu@admin2024",
    avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "DOC-01",
    name: "Dr. Meera Vasudevan",
    shortName: "Dr. Meera",
    role: "Doctor",
    username: "dr.meera",
    password: "doctor@1234",
    avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "DOC-02",
    name: "Dr. Rajesh Kulkarni",
    shortName: "Dr. Rajesh",
    role: "Doctor",
    username: "dr.rajesh",
    password: "doctor@1234",
    avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "NUR-01",
    name: "Nurse Priya Thomas",
    shortName: "Nurse Priya",
    role: "Nurse",
    username: "nurse.priya",
    password: "nurse@1234",
    avatar: "https://images.unsplash.com/photo-1594824813576-96b610c144a1?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "NUR-02",
    name: "Nurse Anjali Mohan",
    shortName: "Nurse Anjali",
    role: "Nurse",
    username: "nurse.anjali",
    password: "nurse@1234",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "PAT-01",
    name: "Ramesh & Priya (Parents of Baby Ananya)",
    shortName: "Family Portal",
    role: "Patient",
    username: "parent",
    password: "parent@1234",
    avatar: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&auto=format&fit=crop&q=80",
  },
];

// ─── Main Seed Function ────────────────────────────────────────
export async function seedDatabase() {
  try {
    // Seed Staff (only if none exist)
    const staffCount = await Staff.countDocuments();
    if (staffCount === 0) {
      await Staff.insertMany(INITIAL_STAFF);
      console.log(`Seeded ${INITIAL_STAFF.length} clinical staff members.`);
    }

    // Seed default thresholds (upsert)
    await Setting.findOneAndUpdate(
      { key: "global_thresholds" },
      { $setOnInsert: DEFAULT_THRESHOLDS },
      { upsert: true }
    );
    console.log("Clinical thresholds initialized.");

    // Log initialization
    await AuditLog.create({
      id: `LOG-${Date.now().toString().slice(-4)}`,
      actor: "System",
      role: "System",
      action: "NICU Monitoring System initialized. Database ready for live ESP32 telemetry.",
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
    });

    console.log("System initialization complete. Ready to receive live ESP32 data.");
  } catch (err) {
    console.error("Seed error:", err.message);
  }
}

// Run directly if called as: node seed.js
if (process.argv[1].endsWith("seed.js")) {
  mongoose
    .connect(MONGO_URI)
    .then(() => seedDatabase())
    .then(() => mongoose.disconnect())
    .catch(console.error);
}
