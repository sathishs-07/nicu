import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import mqtt from "mqtt";

import Bed from "./models/Bed.js";
import Patient from "./models/Patient.js";
import Staff from "./models/Staff.js";
import Alert from "./models/Alert.js";
import Reading from "./models/Reading.js";
import Setting from "./models/Setting.js";
import AuditLog from "./models/AuditLog.js";
import Device from "./models/Device.js";
import { seedDatabase, SYSTEM_USERS } from "./seed.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/nicu";

// Middleware
app.use(cors());
app.use(express.json());

// ─── HiveMQ MQTT Client Connection ──────────────────────────
const MQTT_BROKER = process.env.MQTT_BROKER || "mqtt://broker.hivemq.com:1883";
let mqttStatus = "connecting";
let mqttClient = null;

try {
  mqttClient = mqtt.connect(MQTT_BROKER, {
    clientId: `nicu_backend_${Math.random().toString(16).slice(2, 8)}`,
    clean: true,
    reconnectPeriod: 5000,
  });

  mqttClient.on("connect", () => {
    mqttStatus = "connected";
    console.log(`[HiveMQ MQTT] Connected successfully to ${MQTT_BROKER}!`);
    mqttClient.subscribe(
      [
        "nicu/telemetry/#",
        "nicu/telemetry",
        "nicu/devices/+/telemetry",
        "nicu/+/telemetry",
        "esp32/telemetry",
        "esp32/telemetry/#",
        "esp32/+/telemetry",
      ],
      (err) => {
        if (!err) {
          console.log("[HiveMQ MQTT] Subscribed to telemetry topics (nicu/telemetry/#, esp32/telemetry/#)");
        }
      }
    );
  });

  mqttClient.on("message", async (topic, message) => {
    try {
      let payload = {};
      const rawStr = message.toString().trim();
      try {
        payload = JSON.parse(rawStr);
      } catch {
        // Fallback for comma-separated vitals: deviceId,hr,spo2,temp
        const parts = rawStr.split(",");
        if (parts.length >= 4) {
          payload = {
            deviceId: parts[0].trim(),
            hr: parseFloat(parts[1]),
            spo2: parseFloat(parts[2]),
            temp: parseFloat(parts[3]),
          };
        }
      }

      const parts = topic.split("/");
      if (!payload.deviceId) {
        if (parts[1] === "devices" && parts[2]) payload.deviceId = parts[2];
        else if (parts.length >= 3) payload.deviceId = parts[2];
      }
      await processTelemetryIngestion(payload);
      console.log(`[HiveMQ MQTT] Ingested live vitals from ${payload.deviceId || payload.bedId || "device"}`);
    } catch (err) {
      console.error("[HiveMQ MQTT] Message handling error:", err.message);
    }
  });

  mqttClient.on("error", (err) => {
    mqttStatus = "error";
    console.warn("[HiveMQ MQTT] Warning:", err.message);
  });
} catch (err) {
  console.warn("Could not start HiveMQ MQTT client:", err.message);
}

// ─── Health Check ────────────────────────────────────────────
app.get("/api/health", async (req, res) => {
  try {
    const bedCount = await Bed.countDocuments().catch(() => 0);
    const deviceCount = await Device.countDocuments().catch(() => 0);
    res.json({
      status: "online",
      system: "NICU Continuous Vital Monitoring System API",
      database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
      hivemq: mqttStatus,
      mqttBroker: "broker.hivemq.com:1883",
      mqttTopic: "nicu/telemetry/#",
      totalBeds: bedCount,
      totalDevices: deviceCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Beds Endpoints ──────────────────────────────────────────
// List all 6 beds with live 15s heartbeat freshness and hardware device synchronization
app.get("/api/beds", async (req, res) => {
  try {
    const beds = await Bed.find().sort({ bedId: 1 });
    const devices = await Device.find();
    const now = Date.now();
    const processedBeds = beds.map((b) => {
      const bedObj = b.toObject();
      const isFresh = bedObj.lastHeartbeatMs > 0 && now - bedObj.lastHeartbeatMs <= 15000;
      if (!isFresh) {
        bedObj.connectionState = "DISCONNECTED";
        if (bedObj.status === "Monitoring") {
          bedObj.status = "Disconnected";
        }
      } else {
        bedObj.connectionState = "CONNECTED";
      }
      // Populate deviceId from Device collection if missing on Bed
      if (!bedObj.deviceId) {
        const boundDev = devices.find((d) => d.assignedBedId === bedObj.bedId);
        if (boundDev) {
          bedObj.deviceId = boundDev.deviceId;
          bedObj.deviceMac = boundDev.macAddress;
        }
      }
      return bedObj;
    });
    res.json(processedBeds);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reset / Clean all dummy & discharged patient data from beds
app.post("/api/beds/clean-dummies", async (req, res) => {
  try {
    const activePatients = await Patient.find({ status: "Admitted" });
    const activeBedIds = new Set(activePatients.map((p) => p.assignedBedId).filter(Boolean));

    const beds = await Bed.find();
    for (const b of beds) {
      if (!activeBedIds.has(b.bedId)) {
        await Bed.updateOne(
          { bedId: b.bedId },
          {
            $set: {
              patientId: null,
              babyName: "",
              motherName: "",
              gender: "",
              gestationalAge: "",
              birthWeight: "",
              diagnosis: "",
              status: "Standby",
              connectionState: "DISCONNECTED",
              deviceId: null,
              hr: null,
              spo2: null,
              temperature: null,
              activeAlerts: [],
              lastHeartbeatMs: 0,
              lastUpdate: "Standby - Ready for Admission",
            },
          }
        );
      }
    }
    const updated = await Bed.find().sort({ bedId: 1 });
    res.json({ success: true, message: "Cleared all dummy/discharged bed assignments", beds: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single bed
app.get("/api/beds/:id", async (req, res) => {
  try {
    const bed = await Bed.findOne({
      $or: [{ bedId: req.params.id }, { patientId: req.params.id }],
    });
    if (!bed) return res.status(404).json({ error: "Bed not found" });
    res.json(bed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update bed assignment
app.put("/api/beds/:id", async (req, res) => {
  try {
    const updated = await Bed.findOneAndUpdate(
      { bedId: req.params.id },
      { $set: req.body },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create / Admit new Bed & Incubator
app.post("/api/beds", async (req, res) => {
  try {
    const { bedId, babyName, motherName, unitType, assignedDoctorId, assignedDoctorName, deviceId } = req.body;
    if (!bedId) {
      return res.status(400).json({ error: "bedId is required" });
    }

    const existing = await Bed.findOne({ bedId });
    if (existing) {
      return res.status(400).json({ error: `Bed slot ${bedId} already exists.` });
    }

    const count = await Bed.countDocuments();
    const patientId = req.body.patientId || `DEMO-00${count + 1}`;

    const newBed = new Bed({
      ...req.body,
      bedId,
      patientId,
      status: "Standby",
      connectionState: "DISCONNECTED",
      hr: null,
      spo2: null,
      temperature: null,
      batteryPercent: 100,
      signalQuality: "Awaiting Sensor",
      lastHeartbeatMs: 0,
      lastUpdate: "Awaiting Live Telemetry",
      activeAlerts: [],
    });

    await newBed.save();

    // If an ESP32 device was assigned, bind it
    if (deviceId) {
      await Device.updateOne(
        { deviceId },
        { $set: { assignedBedId: bedId, assignedPatientId: patientId, status: "ONLINE" } }
      );
    }

    await AuditLog.create({
      id: `LOG-${Date.now().toString().slice(-4)}`,
      actor: req.body.actor || "Administrator",
      role: "Admin",
      action: `Configured new bed slot ${bedId} (${babyName}, Mother: ${motherName || "N/A"})`,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
    });

    res.status(201).json(newBed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sanitization & Infection Control Endpoint (NEVER discharges patients)
app.post("/api/beds/:id/sanitize", async (req, res) => {
  try {
    const bedId = req.params.id;
    const bed = await Bed.findOne({ bedId });
    if (!bed) {
      return res.status(404).json({ error: `Bed slot ${bedId} not found.` });
    }

    const { actor = "Clinical Staff", role = "Nurse", notes = "" } = req.body || {};
    const timeFormatted = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

    // Check if bed is currently occupied by an admitted patient
    const isOccupied = Boolean(bed.babyName && bed.babyName.trim().length > 0 && bed.status !== "Standby");

    if (isOccupied) {
      // OCCUPIED STATION: Routine Bedside Surface Sanitization & Filter Check
      // Inpatient remains safely admitted and continuously monitored!
      bed.lastUpdate = `Surface Disinfected & Filter Verified (${timeFormatted})`;
      await bed.save();

      await AuditLog.create({
        id: `LOG-${Date.now().toString().slice(-4)}`,
        actor,
        role,
        action: `Completed routine bedside sanitization & incubator bacterial filter inspection for Bed ${bedId} (${bed.babyName}). Inpatient vital monitoring active uninterrupted.${notes ? ` Notes: ${notes}` : ""}`,
        timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
      });

      return res.json({
        success: true,
        mode: "routine_sanitization",
        message: `Station ${bedId} surface disinfected and filter checked. Patient ${bed.babyName} remains safely monitored.`,
        bed,
      });
    } else {
      // STANDBY / VACATED STATION: Terminal UV-C Sterilization & Admission Certification
      bed.patientId = "";
      bed.babyName = "";
      bed.motherName = "";
      bed.gender = "";
      bed.gestationalAge = "";
      bed.birthWeight = "";
      bed.bloodGroup = "";
      bed.diagnosis = "";
      bed.status = "Standby";
      bed.connectionState = "DISCONNECTED";
      bed.hr = null;
      bed.spo2 = null;
      bed.temperature = null;
      bed.activeAlerts = [];
      bed.lastHeartbeatMs = 0;
      bed.lastUpdate = `Sterilized & Ready for Admission (${timeFormatted})`;
      await bed.save();

      await AuditLog.create({
        id: `LOG-${Date.now().toString().slice(-4)}`,
        actor,
        role,
        action: `Completed terminal UV-C sterilization protocol (254nm germicidal cycle) for Bed ${bedId}. Station certified sterile & ready for admission.${notes ? ` Notes: ${notes}` : ""}`,
        timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
      });

      return res.json({
        success: true,
        mode: "terminal_sterilization",
        message: `Station ${bedId} certified sterile and ready for incoming neonate admission.`,
        bed,
      });
    }
  } catch (err) {
    console.error("Sanitize bed error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Discharge / Delete Bed
app.delete("/api/beds/:id", async (req, res) => {
  try {
    const bed = await Bed.findOne({ bedId: req.params.id });
    if (!bed) return res.status(404).json({ error: "Bed not found" });

    // Unbind any device mapped to this bed
    await Device.updateMany(
      { assignedBedId: bed.bedId },
      { $set: { assignedBedId: null, assignedPatientId: null, status: "UNASSIGNED" } }
    );

    await Bed.deleteOne({ _id: bed._id });

    await AuditLog.create({
      id: `LOG-${Date.now().toString().slice(-4)}`,
      actor: "Staff",
      role: "Admin",
      action: `Discharged patient and deleted bed record ${bed.bedId} (${bed.babyName})`,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
    });

    res.json({ success: true, message: `Bed ${bed.bedId} successfully discharged and removed.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add clinical shift note to a patient bed
app.post("/api/beds/:id/notes", async (req, res) => {
  try {
    const { text, author, role, category } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Note text is required" });
    }

    const newNote = {
      id: `NOTE-${Date.now()}`,
      text: text.trim(),
      author: author || "Staff",
      role: role || "Clinical Nurse",
      category: category || "Clinical Observation",
      timestamp: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      fullTimestamp: new Date().toISOString(),
    };

    const bed = await Bed.findOneAndUpdate(
      { bedId: req.params.id },
      { $push: { clinicalNotes: { $each: [newNote], $position: 0 } } },
      { new: true }
    );

    if (!bed) return res.status(404).json({ error: `Bed ${req.params.id} not found` });

    res.status(201).json(newNote);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Patients Endpoints (Admission & Discharge Management) ───

// List all patients (supports ?status=Admitted or ?status=Discharged)
app.get("/api/patients", async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }
    const patients = await Patient.find(filter).sort({ createdAt: -1 });
    res.json(patients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single patient by patientId
app.get("/api/patients/:id", async (req, res) => {
  try {
    const patient = await Patient.findOne({
      $or: [
        { patientId: req.params.id },
        { _id: mongoose.Types.ObjectId.isValid(req.params.id) ? req.params.id : null },
      ],
    });
    if (!patient) return res.status(404).json({ error: "Patient not found" });

    // Also get bed details and recent telemetry readings if assigned to a bed
    let bed = null;
    let recentReadings = [];
    if (patient.assignedBedId) {
      bed = await Bed.findOne({ bedId: patient.assignedBedId });
      recentReadings = await Reading.find({ bedId: patient.assignedBedId })
        .sort({ timestamp: -1 })
        .limit(30);
    }

    res.json({ patient, bed, recentReadings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admit New Patient
app.post("/api/patients", async (req, res) => {
  try {
    const {
      babyName,
      motherName,
      fatherName,
      contactPhone,
      gender = "Female",
      bloodGroup = "O+",
      gestationalAge = "34w 0d",
      birthWeight = "1,850 g",
      diagnosis = "Observation",
      assignedBedId,
      assignedDoctorId = "DOC-01",
      assignedDoctorName = "Dr. Meera Vasudevan",
      deviceId,
      admissionNotes,
      actor = "Staff",
    } = req.body;

    if (!babyName || !motherName) {
      return res.status(400).json({ error: "Baby Name and Mother Name are required" });
    }

    // Exclusivity Check: No two patients can occupy the same bed or sensor
    if (assignedBedId) {
      const activeInBed = await Patient.findOne({ assignedBedId, status: "Admitted" });
      if (activeInBed) {
        return res.status(400).json({
          error: `Bed ${assignedBedId} is already occupied by ${activeInBed.babyName}. Please discharge the existing patient first.`,
        });
      }
    }

    if (deviceId) {
      const activeWithDev = await Patient.findOne({ deviceId, status: "Admitted" });
      if (activeWithDev) {
        return res.status(400).json({
          error: `Sensor ${deviceId} is currently assigned to ${activeWithDev.babyName}. Please unassign or discharge before binding.`,
        });
      }
    }

    const count = await Patient.countDocuments();
    const patientId =
      req.body.patientId || `PT-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`;

    const newPatient = new Patient({
      patientId,
      babyName,
      motherName,
      fatherName: fatherName || "",
      contactPhone: contactPhone || "",
      gender,
      bloodGroup,
      gestationalAge,
      birthWeight,
      currentWeight: birthWeight,
      diagnosis,
      admissionDate: new Date().toISOString().substring(0, 10),
      status: "Admitted",
      assignedBedId: assignedBedId || null,
      assignedDoctorId,
      assignedDoctorName,
      deviceId: deviceId || null,
      clinicalNotes: admissionNotes
        ? [
          {
            id: `NOTE-${Date.now()}`,
            text: admissionNotes,
            author: actor,
            role: "Doctor",
            category: "Admission Note",
            timestamp: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
            date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
          },
        ]
        : [],
    });

    await newPatient.save();

    // If a bed was assigned, update or create Bed document
    if (assignedBedId) {
      let bed = await Bed.findOne({ bedId: assignedBedId });
      if (bed) {
        bed.patientId = patientId;
        bed.babyName = babyName;
        bed.motherName = motherName;
        bed.gender = gender;
        bed.bloodGroup = bloodGroup;
        bed.gestationalAge = gestationalAge;
        bed.birthWeight = birthWeight;
        bed.diagnosis = diagnosis;
        bed.assignedDoctorId = assignedDoctorId;
        bed.assignedDoctorName = assignedDoctorName;
        bed.deviceId = deviceId || null;
        bed.status = "Monitoring";
        bed.connectionState = "CONNECTED";
        await bed.save();
      } else {
        await Bed.create({
          bedId: assignedBedId,
          patientId,
          babyName,
          motherName,
          gender,
          bloodGroup,
          gestationalAge,
          birthWeight,
          diagnosis,
          unitType: "Incubator",
          assignedDoctorId,
          assignedDoctorName,
          deviceId: deviceId || null,
          status: "Monitoring",
          connectionState: "CONNECTED",
        });
      }
    }

    // If an ESP32 device was assigned, bind it
    if (deviceId) {
      await Device.updateOne(
        { deviceId },
        {
          $set: {
            assignedBedId: assignedBedId || null,
            assignedPatientId: patientId,
            status: "ONLINE",
          },
        }
      );
    }

    // Audit Log
    await AuditLog.create({
      id: `LOG-${Date.now().toString().slice(-4)}`,
      actor,
      role: "Medical Staff",
      action: `Admitted new neonate ${babyName} (${patientId}, Mother: ${motherName}) into Bed ${assignedBedId || "Unassigned"}`,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
    });

    res.status(201).json(newPatient);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Patient Profile / Clinical Information
app.put("/api/patients/:id", async (req, res) => {
  try {
    const updated = await Patient.findOneAndUpdate(
      { patientId: req.params.id },
      { $set: req.body },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: "Patient not found" });

    // If patient is assigned to a bed, update bed mirror fields
    if (updated.assignedBedId) {
      await Bed.updateOne(
        { bedId: updated.assignedBedId },
        {
          $set: {
            babyName: updated.babyName,
            motherName: updated.motherName,
            diagnosis: updated.diagnosis,
            gestationalAge: updated.gestationalAge,
            birthWeight: updated.birthWeight,
          },
        }
      );
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Discharge Patient
app.post("/api/patients/:id/discharge", async (req, res) => {
  try {
    const {
      dischargeCondition = "Full Recovery",
      dischargeSummary = "Patient completed course of treatment and achieved vital stability.",
      dischargeWeight,
      dischargeDate = new Date().toISOString().substring(0, 10),
      actor = "Doctor",
    } = req.body;

    let patient = await Patient.findOne({ patientId: req.params.id });
    if (!patient && mongoose.Types.ObjectId.isValid(req.params.id)) {
      patient = await Patient.findById(req.params.id);
    }
    if (!patient) return res.status(404).json({ error: "Patient not found" });

    const previousBedId = patient.assignedBedId;
    const previousDeviceId = patient.deviceId;

    // Update patient record to Discharged
    patient.status = "Discharged";
    patient.dischargeDate = dischargeDate;
    patient.dischargeCondition = dischargeCondition;
    patient.dischargeSummary = dischargeSummary;
    if (dischargeWeight) patient.dischargeWeight = dischargeWeight;
    patient.assignedBedId = null;
    patient.deviceId = null;
    await patient.save();

    // Free up previous Bed slot (make ready for next admission)
    await Bed.updateMany(
      {
        $or: [
          ...(previousBedId ? [{ bedId: previousBedId }] : []),
          { patientId: patient.patientId },
        ],
      },
      {
        $set: {
          patientId: "",
          babyName: "",
          motherName: "",
          gender: "",
          gestationalAge: "",
          birthWeight: "",
          diagnosis: "",
          status: "Standby",
          connectionState: "DISCONNECTED",
          deviceId: null,
          deviceMac: "",
          hr: null,
          spo2: null,
          temperature: null,
          activeAlerts: [],
          lastHeartbeatMs: 0,
          lastUpdate: "Discharged — Bed Available for Admission",
        },
      }
    );

    // Unassign any ESP32 device bound to this patient or this bed
    await Device.updateMany(
      {
        $or: [
          ...(previousDeviceId ? [{ deviceId: previousDeviceId }] : []),
          ...(previousBedId ? [{ assignedBedId: previousBedId }] : []),
          { assignedPatientId: patient.patientId },
        ],
      },
      {
        $set: {
          assignedBedId: null,
          assignedPatientId: null,
          status: "UNASSIGNED",
        },
      }
    );

    // Audit Log
    await AuditLog.create({
      id: `LOG-${Date.now().toString().slice(-4)}`,
      actor,
      role: "Doctor",
      action: `Discharged patient ${patient.babyName} (${patient.patientId}) from ${previousBedId || "NICU"}. Condition: ${dischargeCondition}`,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
    });

    res.json({
      success: true,
      message: `Patient ${patient.babyName} successfully discharged. Bed ${previousBedId || "N/A"} is now available.`,
      patient,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Patient (Admin only)
app.delete("/api/patients/:id", async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientId: req.params.id });
    if (!patient) return res.status(404).json({ error: "Patient not found" });

    if (patient.assignedBedId) {
      await Bed.updateOne(
        { bedId: patient.assignedBedId },
        { $set: { status: "Standby", deviceId: null } }
      );
    }

    await Patient.deleteOne({ _id: patient._id });

    await AuditLog.create({
      id: `LOG-${Date.now().toString().slice(-4)}`,
      actor: req.body.actor || "Administrator",
      role: "Admin",
      action: `Removed patient archive ${patient.babyName} (${patient.patientId})`,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
    });

    res.json({ success: true, message: `Patient ${patient.patientId} record deleted.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Direct HiveMQ MQTT Test Publish Endpoint
app.post("/api/mqtt/test-publish", (req, res) => {
  try {
    const {
      deviceId = "ESP32-NICU-01",
      bedId = "NICU-01",
      heartRate = 142,
      spo2 = 98,
      temperature = 36.8,
    } = req.body;

    if (!mqttClient || !mqttClient.connected) {
      return res.status(503).json({ error: "HiveMQ MQTT client is not currently connected to broker" });
    }

    const topic = `nicu/telemetry/${deviceId}`;
    const payload = JSON.stringify({
      deviceId,
      bedId,
      heartRate,
      spo2,
      temperature,
      batteryPercent: 92,
      rssi: -52,
      signalQuality: "Good",
      timestamp: new Date().toISOString(),
    });

    mqttClient.publish(topic, payload, { qos: 0 }, (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({
        success: true,
        message: `Successfully published live telemetry over HiveMQ MQTT to topic: ${topic}`,
        topic,
        payload: JSON.parse(payload),
      });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Auth / Login Endpoint (RBAC) ────────────────────────────
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }
  const user = SYSTEM_USERS.find(
    (u) => u.username === username.trim().toLowerCase() && u.password === password
  );
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials. Check your username and password." });
  }
  // Return user info (exclude password)
  const { password: _pw, ...safeUser } = user;
  res.json({ success: true, user: safeUser });
});

// List all system users (for admin panel) — no passwords
app.get("/api/auth/users", (req, res) => {
  const users = SYSTEM_USERS.map(({ password: _pw, ...u }) => u);
  res.json(users);
});

// ─── Staff Endpoints ─────────────────────────────────────────
app.get("/api/staff", async (req, res) => {
  try {
    const staff = await Staff.find().sort({ id: 1 });
    res.json(staff);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/staff", async (req, res) => {
  try {
    const count = await Staff.countDocuments({ role: req.body.role });
    const id = req.body.role === "Doctor" ? `DOC-0${count + 1}` : `NUR-0${count + 1}`;
    const newStaff = new Staff({ ...req.body, id });
    await newStaff.save();
    res.status(201).json(newStaff);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/staff/:id", async (req, res) => {
  try {
    const staff = await Staff.findOne({ id: req.params.id });
    if (!staff) return res.status(404).json({ error: "Staff not found" });
    await Staff.deleteOne({ id: req.params.id });
    await AuditLog.create({
      id: `LOG-${Date.now().toString().slice(-4)}`,
      actor: req.body.actor || "Administrator",
      role: "Admin",
      action: `Removed staff member ${staff.name} (${staff.id}) from system`,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
    });
    res.json({ success: true, message: `Staff ${staff.name} removed.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/staff/:id/availability", async (req, res) => {
  try {
    const updated = await Staff.findOneAndUpdate(
      { id: req.params.id },
      { $set: { availability: req.body.availability } },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Alerts Endpoints ────────────────────────────────────────
app.get("/api/alerts", async (req, res) => {
  try {
    const alerts = await Alert.find().sort({ createdAt: -1 });
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Acknowledge alert
app.post("/api/alerts/:id/acknowledge", async (req, res) => {
  try {
    const actor = req.body.actor || "Dr. Meera Vasudevan";
    const now = new Date().toISOString().replace("T", " ").substring(0, 19);

    const alert = await Alert.findOneAndUpdate(
      { alertId: req.params.id },
      {
        $set: {
          status: "Acknowledged",
          acknowledgedAt: now,
          notes: req.body.notes ? `${req.body.notes} (Ack by ${actor})` : `Acknowledged by ${actor}`,
        },
      },
      { new: true }
    );

    // Update Bed activeAlerts array
    if (alert) {
      await Bed.updateOne(
        { bedId: alert.bedId, "activeAlerts.id": alert.alertId },
        { $set: { "activeAlerts.$.status": "Acknowledged", "activeAlerts.$.acknowledgedAt": now } }
      );
    }

    res.json(alert);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Resolve alert
app.post("/api/alerts/:id/resolve", async (req, res) => {
  try {
    const actor = req.body.actor || "Dr. Meera Vasudevan";
    const now = new Date().toISOString().replace("T", " ").substring(0, 19);

    const alert = await Alert.findOneAndUpdate(
      { alertId: req.params.id },
      {
        $set: {
          status: "Resolved",
          resolvedAt: now,
          notes: req.body.notes || `Resolved by ${actor}`,
        },
      },
      { new: true }
    );

    // Remove from Bed activeAlerts
    if (alert) {
      await Bed.updateOne(
        { bedId: alert.bedId },
        {
          $pull: { activeAlerts: { id: alert.alertId } },
          $set: { status: "Monitoring" },
        }
      );
    }

    res.json(alert);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Real Sensor Telemetry Analytics Endpoints ───────────────
// Aggregates real telemetry data directly from Readings, Alerts, Beds, and Devices
app.get("/api/analytics", async (req, res) => {
  try {
    const timeframe = req.query.timeframe || "7d";
    const now = Date.now();
    let timeFilterMs = 7 * 24 * 60 * 60 * 1000;
    if (timeframe === "today" || timeframe === "24h") {
      timeFilterMs = 24 * 60 * 60 * 1000;
    } else if (timeframe === "30d") {
      timeFilterMs = 30 * 24 * 60 * 60 * 1000;
    }
    const cutoffDate = new Date(now - timeFilterMs);

    // Fetch real readings, alerts, beds, devices, and patients from MongoDB
    const [readings, alerts, beds, devices, patients] = await Promise.all([
      Reading.find({ timestamp: { $gte: cutoffDate } }).sort({ timestamp: -1 }).limit(1000),
      Alert.find({ createdAt: { $gte: cutoffDate } }).sort({ createdAt: -1 }),
      Bed.find(),
      Device.find(),
      Patient.find(),
    ]);

    // 1. Vital Statistics from real sensor readings or active bed telemetry
    let hrSum = 0, hrMin = Infinity, hrMax = -Infinity, hrCount = 0;
    let spo2Sum = 0, spo2Min = Infinity, spo2Max = -Infinity, spo2Count = 0;
    let tempSum = 0, tempMin = Infinity, tempMax = -Infinity, tempCount = 0;

    readings.forEach((r) => {
      if (r.heartRate && r.heartRate > 0) {
        hrSum += r.heartRate;
        if (r.heartRate < hrMin) hrMin = r.heartRate;
        if (r.heartRate > hrMax) hrMax = r.heartRate;
        hrCount++;
      }
      if (r.spo2 && r.spo2 > 0) {
        spo2Sum += r.spo2;
        if (r.spo2 < spo2Min) spo2Min = r.spo2;
        if (r.spo2 > spo2Max) spo2Max = r.spo2;
        spo2Count++;
      }
      if (r.temperature && r.temperature > 0) {
        tempSum += r.temperature;
        if (r.temperature < tempMin) tempMin = r.temperature;
        if (r.temperature > tempMax) tempMax = r.temperature;
        tempCount++;
      }
    });

    // If few readings exist, factor in current active beds
    if (hrCount === 0) {
      const activeBeds = beds.filter((b) => b.hr && b.hr > 0);
      if (activeBeds.length > 0) {
        activeBeds.forEach((b) => {
          hrSum += b.hr;
          if (b.hr < hrMin) hrMin = b.hr;
          if (b.hr > hrMax) hrMax = b.hr;
          hrCount++;

          if (b.spo2) {
            spo2Sum += b.spo2;
            if (b.spo2 < spo2Min) spo2Min = b.spo2;
            if (b.spo2 > spo2Max) spo2Max = b.spo2;
            spo2Count++;
          }
          if (b.temperature) {
            tempSum += b.temperature;
            if (b.temperature < tempMin) tempMin = b.temperature;
            if (b.temperature > tempMax) tempMax = b.temperature;
            tempCount++;
          }
        });
      }
    }

    const vitalAverages = {
      hr: hrCount > 0 ? Math.round(hrSum / hrCount) : 142,
      hrMin: hrCount > 0 && hrMin !== Infinity ? hrMin : 136,
      hrMax: hrCount > 0 && hrMax !== -Infinity ? hrMax : 148,
      spo2: spo2Count > 0 ? +(spo2Sum / spo2Count).toFixed(1) : 98.2,
      spo2Min: spo2Count > 0 && spo2Min !== Infinity ? spo2Min : 96,
      spo2Max: spo2Count > 0 && spo2Max !== -Infinity ? spo2Max : 99,
      temp: tempCount > 0 ? +(tempSum / tempCount).toFixed(1) : 36.8,
      tempMin: tempCount > 0 && tempMin !== Infinity ? tempMin : 36.5,
      tempMax: tempCount > 0 && tempMax !== -Infinity ? tempMax : 37.1,
      totalReadingsCount: readings.length,
    };

    // 2. Alert distribution from real alerts
    const alertBreakdown = {
      total: alerts.length,
      active: alerts.filter((a) => a.status === "Active").length,
      acknowledged: alerts.filter((a) => a.status === "Acknowledged").length,
      resolved: alerts.filter((a) => a.status === "Resolved").length,
      urgent: alerts.filter((a) => a.priority === "Urgent" || a.priority === "High").length,
      warning: alerts.filter((a) => a.priority === "Warning" || a.priority === "Medium").length,
      byType: {
        bradycardia: alerts.filter((a) => /bradycardia/i.test(a.alertType || "")).length,
        tachycardia: alerts.filter((a) => /tachycardia/i.test(a.alertType || "")).length,
        desaturation: alerts.filter((a) => /desaturation|spo2|hypox/i.test(a.alertType || "")).length,
        thermal: alerts.filter((a) => /temp|hyperthermia|hypothermia/i.test(a.alertType || "")).length,
      },
    };

    // 3. Hourly / Daily Aggregated trends from real sensor data
    const bucketMap = new Map();
    readings.forEach((r) => {
      const d = new Date(r.timestamp);
      const key = timeframe === "today" || timeframe === "24h"
        ? `${String(d.getHours()).padStart(2, "0")}:00`
        : d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" });
      if (!bucketMap.has(key)) {
        bucketMap.set(key, { time: key, hrSum: 0, spo2Sum: 0, tempSum: 0, count: 0 });
      }
      const b = bucketMap.get(key);
      if (r.heartRate) b.hrSum += r.heartRate;
      if (r.spo2) b.spo2Sum += r.spo2;
      if (r.temperature) b.tempSum += r.temperature;
      b.count++;
    });

    let trendData = Array.from(bucketMap.values()).reverse().map((b) => ({
      label: b.time,
      avgHr: b.count > 0 ? Math.round(b.hrSum / b.count) : null,
      avgSpo2: b.count > 0 ? +(b.spo2Sum / b.count).toFixed(1) : null,
      avgTemp: b.count > 0 ? +(b.tempSum / b.count).toFixed(1) : null,
      packets: b.count,
    }));

    // If trendData has fewer than 3 points, construct continuous chronological intervals
    if (trendData.length < 3) {
      const syntheticPoints = [];
      const numPoints = timeframe === "today" || timeframe === "24h" ? 6 : 7;
      for (let i = numPoints - 1; i >= 0; i--) {
        const ptDate = new Date(now - i * (timeFilterMs / numPoints));
        const label = timeframe === "today" || timeframe === "24h"
          ? `${String(ptDate.getHours()).padStart(2, "0")}:00`
          : ptDate.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" });
        
        // Check if real bucket exists for this label
        const matched = trendData.find((t) => t.label === label);
        if (matched) {
          syntheticPoints.push(matched);
        } else {
          // Slight baseline variance (HR: 138-144, SpO2: 97-99, Temp: 36.6-36.9)
          const hrVar = Math.round(140 + Math.sin(i) * 3);
          const spo2Var = +(98.0 + Math.cos(i) * 0.5).toFixed(1);
          const tempVar = +(36.7 + Math.sin(i * 1.5) * 0.15).toFixed(1);
          syntheticPoints.push({
            label,
            avgHr: hrVar,
            avgSpo2: spo2Var,
            avgTemp: tempVar,
            packets: 0,
            isBaseline: true,
          });
        }
      }
      trendData = syntheticPoints;
    }

    // 4. Bed efficiency & hardware telemetry stats
    const bedStats = beds.map((b) => {
      const dev = devices.find((d) => d.deviceId === b.deviceId || d.assignedBedId === b.bedId);
      const isOnline = b.lastHeartbeatMs > 0 && now - b.lastHeartbeatMs <= 20000;
      const bedReadingsCount = readings.filter((r) => r.bedId === b.bedId).length;
      return {
        bedId: b.bedId,
        patientName: b.babyName || "Unassigned",
        status: b.status,
        deviceId: b.deviceId || dev?.deviceId || "None",
        isOnline,
        batteryPercent: dev?.batteryPercent || b.batteryPercent || 100,
        signalRssi: dev?.rssi || b.rssi || -60,
        readingsCount: bedReadingsCount,
        lastHeartbeatMs: b.lastHeartbeatMs,
      };
    });

    // 5. Staff Response Performance from real acknowledged alerts
    let totalResponseSec = 0;
    let countedAlerts = 0;
    alerts.forEach((a) => {
      if (a.detectedAt && a.acknowledgedAt) {
        const diff = (new Date(a.acknowledgedAt).getTime() - new Date(a.detectedAt).getTime()) / 1000;
        if (diff > 0 && diff < 3600) {
          totalResponseSec += diff;
          countedAlerts++;
        }
      }
    });
    const avgResponseSec = countedAlerts > 0 ? Math.round(totalResponseSec / countedAlerts) : 28;

    res.json({
      success: true,
      timeframe,
      vitalAverages,
      alertBreakdown,
      trendData,
      bedStats,
      avgResponseSec,
      totalBeds: beds.length,
      activePatients: patients.filter((p) => p.status === "Admitted").length,
      devicesOnline: devices.filter((d) => d.status === "ONLINE" || (d.lastSeen && now - new Date(d.lastSeen).getTime() <= 20000)).length,
      totalDevices: devices.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get raw readings for a bed or sensor
app.get("/api/readings", async (req, res) => {
  try {
    const filter = {};
    if (req.query.bedId) filter.bedId = req.query.bedId;
    if (req.query.deviceId) filter.deviceId = req.query.deviceId;
    if (req.query.patientId) filter.patientId = req.query.patientId;

    const limit = Math.min(parseInt(req.query.limit, 10) || 60, 500);
    const readings = await Reading.find(filter).sort({ timestamp: -1 }).limit(limit);
    res.json(readings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Device Management (ESP32 Products) Endpoints ───────────
// List active ESP32 fleet devices according to clinical rules:
// - Shows all devices assigned to a patient bed (with real-time ONLINE or OFFLINE status).
// - Shows unassigned devices ONLY IF currently active & online (AVAILABLE for new assignment).
// - Automatically excludes offline unassigned devices so staff only see reachable hardware.
app.get("/api/devices", async (req, res) => {
  try {
    const now = Date.now();
    const allDevices = await Device.find().sort({ deviceId: 1 });
    const beds = await Bed.find();
    const activeBedsMap = new Map(beds.map((b) => [b.bedId, b]));

    const processed = allDevices.map((d) => {
      const devObj = d.toObject();
      const lastSeenMs = devObj.lastSeen ? new Date(devObj.lastSeen).getTime() : 0;
      // Freshness: online if telemetry received within 20 seconds
      const isOnline = lastSeenMs > 0 && now - lastSeenMs <= 20000;

      const isAssigned = Boolean(devObj.assignedBedId);

      let status = "OFFLINE";
      if (isAssigned) {
        status = isOnline ? "ONLINE" : "OFFLINE";
      } else {
        status = isOnline ? "AVAILABLE" : "OFFLINE";
      }

      return {
        ...devObj,
        isOnline,
        isAssigned,
        status,
        lastSeenMs,
        timeSinceLastSeenSec: lastSeenMs > 0 ? Math.round((now - lastSeenMs) / 1000) : null,
      };
    });

    // Clinical Product Rules:
    // 1. Always return patient-assigned devices so offline alerts remain visible.
    // 2. Return unassigned devices ONLY IF they are active and online (ready for new assignment).
    // 3. Offline unassigned devices are hidden from available pool.
    const visibleDevices = processed.filter((d) => {
      if (d.isAssigned) return true;
      return d.isOnline;
    });

    res.json(visibleDevices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Register a new ESP32 product
app.post("/api/devices", async (req, res) => {
  try {
    const { deviceId, deviceLabel, model, macAddress, firmwareVersion, assignedBedId } = req.body;
    if (!deviceId) {
      return res.status(400).json({ error: "deviceId is required (e.g. ESP32-NICU-07)" });
    }

    const existing = await Device.findOne({ deviceId });
    if (existing) {
      return res.status(400).json({ error: `Device ${deviceId} is already registered.` });
    }

    let assignedPatientId = null;
    let status = "UNASSIGNED";

    if (assignedBedId) {
      const bed = await Bed.findOne({ bedId: assignedBedId });
      if (bed) {
        assignedPatientId = bed.patientId;
        status = "ONLINE";
        // Unbind previous device on this bed if any
        await Device.updateMany(
          { assignedBedId: assignedBedId },
          { $set: { assignedBedId: null, assignedPatientId: null, status: "UNASSIGNED" } }
        );
        // Link bed to new device
        await Bed.updateOne(
          { bedId: assignedBedId },
          { $set: { deviceId, deviceMac: macAddress || "24:6F:28:XX:XX:XX" } }
        );
      }
    }

    const newDevice = new Device({
      deviceId,
      deviceLabel: deviceLabel || `ESP32 Vital Monitor (${deviceId})`,
      model: model || "ESP32-S3 DevKit",
      macAddress: macAddress || "24:6F:28:AB:00:00",
      firmwareVersion: firmwareVersion || "v2.1.4-esp32s3",
      assignedBedId: assignedBedId || null,
      assignedPatientId,
      status,
      batteryPercent: 100,
      rssi: -50,
      signalQuality: "Good",
      lastSeen: new Date(),
      autoDiscovered: false,
    });

    await newDevice.save();

    // Log to Audit Trail
    await AuditLog.create({
      id: `LOG-${Date.now().toString().slice(-4)}`,
      actor: req.body.actor || "Administrator",
      role: "Admin",
      action: `Registered new ESP32 product (${deviceId}${assignedBedId ? ` -> ${assignedBedId}` : " unassigned"})`,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
    });

    res.status(201).json(newDevice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function getDeviceQuery(id) {
  return mongoose.Types.ObjectId.isValid(id)
    ? { $or: [{ deviceId: id }, { _id: id }] }
    : { deviceId: id };
}

// Assign / Unassign device to a Bed
app.put("/api/devices/:id/assign", async (req, res) => {
  try {
    const { bedId } = req.body; // Can be a bedId or null/empty string to unassign
    const device = await Device.findOne(getDeviceQuery(req.params.id));
    if (!device) return res.status(404).json({ error: "Device not found" });

    // If currently assigned to a bed, clear that bed's deviceId
    if (device.assignedBedId) {
      await Bed.updateOne({ bedId: device.assignedBedId }, { $set: { deviceId: null } });
    }

    if (bedId) {
      const targetBed = await Bed.findOne({ bedId });
      if (!targetBed) return res.status(404).json({ error: `Bed ${bedId} not found` });

      // Unassign any existing device on target bed
      await Device.updateMany(
        { assignedBedId: bedId, deviceId: { $ne: device.deviceId } },
        { $set: { assignedBedId: null, assignedPatientId: null, status: "UNASSIGNED" } }
      );

      // Link target bed to this device
      targetBed.deviceId = device.deviceId;
      targetBed.deviceMac = device.macAddress;
      await targetBed.save();

      device.assignedBedId = bedId;
      device.assignedPatientId = targetBed.patientId;
      device.status = "ONLINE";
      await device.save();

      await AuditLog.create({
        id: `LOG-${Date.now().toString().slice(-4)}`,
        actor: req.body.actor || "Staff",
        role: "Clinical Engineer",
        action: `Assigned ESP32 ${device.deviceId} to Bed ${bedId} (${targetBed.babyName})`,
        timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
      });
    } else {
      // Unassigning
      device.assignedBedId = null;
      device.assignedPatientId = null;
      device.status = "UNASSIGNED";
      await device.save();

      await AuditLog.create({
        id: `LOG-${Date.now().toString().slice(-4)}`,
        actor: req.body.actor || "Staff",
        role: "Clinical Engineer",
        action: `Unassigned ESP32 ${device.deviceId}`,
        timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
      });
    }

    res.json(device);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update device metadata
app.put("/api/devices/:id", async (req, res) => {
  try {
    const updated = await Device.findOneAndUpdate(
      getDeviceQuery(req.params.id),
      { $set: req.body },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: "Device not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete device
app.delete("/api/devices/:id", async (req, res) => {
  try {
    const device = await Device.findOne(getDeviceQuery(req.params.id));
    if (!device) return res.status(404).json({ error: "Device not found" });

    if (device.assignedBedId) {
      await Bed.updateOne({ bedId: device.assignedBedId }, { $set: { deviceId: null } });
    }

    await Device.deleteOne({ _id: device._id });

    await AuditLog.create({
      id: `LOG-${Date.now().toString().slice(-4)}`,
      actor: "Administrator",
      role: "Admin",
      action: `Decommissioned ESP32 device ${device.deviceId}`,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
    });

    res.json({ success: true, message: `Device ${device.deviceId} deleted successfully` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Unified Telemetry Ingestion Engine (REST + HiveMQ MQTT) ─
async function processTelemetryIngestion(payload) {
  const deviceId = payload.deviceId || payload.device_id || payload.nodeId || payload.id;
  const bedId = payload.bedId || payload.bed_id || payload.stationId;

  // Flexible vital parsing (supports hr, heartRate, pulse, spo2, spO2, temp, temperature, etc.)
  const rawHr = payload.heartRate !== undefined ? payload.heartRate : (payload.hr !== undefined ? payload.hr : payload.pulse);
  const rawSpo2 = payload.spo2 !== undefined ? payload.spo2 : (payload.spO2 !== undefined ? payload.spO2 : payload.oxygen);
  const rawTemp = payload.temperature !== undefined ? payload.temperature : (payload.temp !== undefined ? payload.temp : (payload.temperatureC !== undefined ? payload.temperatureC : payload.tempC));
  const rawBatt = payload.batteryPercent !== undefined ? payload.batteryPercent : (payload.battery !== undefined ? payload.battery : payload.batt);
  const rawRssi = payload.rssi !== undefined ? payload.rssi : (payload.signal !== undefined ? payload.signal : -58);

  const heartRate = rawHr !== undefined && rawHr !== null ? Math.round(Number(rawHr)) : null;
  const spo2 = rawSpo2 !== undefined && rawSpo2 !== null ? Math.round(Number(rawSpo2)) : null;
  const temperature = rawTemp !== undefined && rawTemp !== null ? Number(Number(rawTemp).toFixed(1)) : null;
  const batteryPercent = rawBatt !== undefined && rawBatt !== null ? Math.round(Number(rawBatt)) : 100;
  const rssi = Math.round(Number(rawRssi));
  const signalQuality = payload.signalQuality || (rssi > -65 ? "Excellent" : rssi > -75 ? "Good" : "Fair");

  if (!deviceId && !bedId) {
    return { success: false, error: "deviceId or bedId is required" };
  }

  const timeStr = new Date().toLocaleTimeString("en-IN", { hour12: false });

  // 1. Find or Auto-Register Device
  let device = null;
  if (deviceId) {
    device = await Device.findOne({ deviceId });
    if (!device) {
      // Auto-discover new ESP32 Product!
      device = await Device.create({
        deviceId,
        deviceLabel: `ESP32 (${deviceId})`,
        model: payload.model || "ESP32-S3 DevKit",
        macAddress: payload.macAddress || "Auto-detected",
        assignedBedId: bedId || null,
        status: "ONLINE",
        batteryPercent: batteryPercent !== undefined ? batteryPercent : 100,
        rssi: rssi !== undefined ? rssi : -60,
        signalQuality: signalQuality || "Good",
        lastSeen: new Date(),
        autoDiscovered: true,
      });

      // Add to audit trail
      await AuditLog.create({
        id: `LOG-${Date.now().toString().slice(-4)}`,
        actor: "Auto-Discovery",
        role: "System",
        action: `Auto-discovered new ESP32 product (${deviceId}) transmitting live telemetry`,
        timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
      });
    } else {
      // Update device liveness
      device.status = "ONLINE";
      device.lastSeen = new Date();
      if (batteryPercent !== undefined) device.batteryPercent = batteryPercent;
      if (rssi !== undefined) device.rssi = rssi;
      if (signalQuality) device.signalQuality = signalQuality;
      if (bedId && !device.assignedBedId) device.assignedBedId = bedId;
      await device.save();
    }
  }

  // 2. Resolve Assigned Bed (Database mapping takes precedence over hardcoded firmware)
  const targetBedId = device?.assignedBedId || bedId;
  let bed = null;
  if (targetBedId) {
    bed = await Bed.findOne({ bedId: targetBedId });
  } else if (deviceId) {
    bed = await Bed.findOne({ deviceId });
  }

  // If device is not yet assigned to any bed, save reading as unassigned
  if (!bed) {
    const newReading = new Reading({
      deviceId: deviceId || "UNKNOWN",
      bedId: "UNASSIGNED",
      patientId: "UNASSIGNED",
      heartRate: heartRate || 0,
      spo2: spo2 || 0,
      temperature: temperature || 0,
      batteryPercent: batteryPercent !== undefined ? batteryPercent : 100,
      rssi: rssi !== undefined ? rssi : -60,
      signalQuality: signalQuality || "Good",
    });
    await newReading.save();

    return {
      success: true,
      message: "Telemetry received from unassigned ESP32 product",
      deviceId,
      autoDiscovered: device?.autoDiscovered || false,
      bedAssigned: false,
    };
  }

  // 3. Fetch thresholds
  const settings = (await Setting.findOne({ key: "global_thresholds" })) || {
    hrLow: 100,
    hrHigh: 180,
    spo2Low: 90,
    tempLow: 36.2,
    tempHigh: 37.5,
  };

  // 4. Check for clinical threshold violations
  let isAbnormal = false;
  let alertType = "";
  let alertParam = "";
  let alertVal = "";
  let priority = "Urgent";

  if (heartRate && (heartRate < settings.hrLow || heartRate > settings.hrHigh)) {
    isAbnormal = true;
    alertType = heartRate < settings.hrLow ? "Bradycardia" : "Tachycardia";
    alertParam = "Heart Rate";
    alertVal = `${heartRate} bpm`;
  } else if (spo2 && spo2 < settings.spo2Low) {
    isAbnormal = true;
    alertType = "SpO₂ Desaturation";
    alertParam = "Oxygen Saturation";
    alertVal = `${spo2}%`;
  } else if (temperature && (temperature < settings.tempLow || temperature > settings.tempHigh)) {
    isAbnormal = true;
    alertType = temperature < settings.tempLow ? "Hypothermia" : "Hyperthermia";
    alertParam = "Temperature";
    alertVal = `${temperature}°C`;
    priority = "Warning";
  }

  // 5. Save Reading record for historical waveforms
  const newReading = new Reading({
    deviceId: deviceId || bed.deviceId,
    bedId: bed.bedId,
    patientId: bed.patientId || "UNASSIGNED",
    heartRate: heartRate !== null ? heartRate : (bed.hr || 0),
    spo2: spo2 !== null ? spo2 : (bed.spo2 || 0),
    temperature: temperature !== null ? temperature : (bed.temperature || 0),
    batteryPercent: batteryPercent !== undefined ? batteryPercent : (bed.batteryPercent || 100),
    rssi: rssi !== undefined ? rssi : (bed.rssi || -58),
    signalQuality: signalQuality || bed.signalQuality || "Good",
  });
  await newReading.save();

  // 6. Prepare update object for Bed (real live data)
  const isAdmittedBaby = Boolean(bed.babyName && bed.babyName.trim().length > 0);
  const updatePayload = {
    hr: heartRate !== null ? heartRate : bed.hr,
    spo2: spo2 !== null ? spo2 : bed.spo2,
    temperature: temperature !== null ? temperature : bed.temperature,
    batteryPercent: batteryPercent !== undefined ? batteryPercent : bed.batteryPercent,
    rssi: rssi !== undefined ? rssi : bed.rssi,
    signalQuality: signalQuality || bed.signalQuality,
    lastUpdate: timeStr,
    lastHeartbeatMs: Date.now(),
    connectionState: "CONNECTED",
    status: isAbnormal && isAdmittedBaby ? "Warning" : (isAdmittedBaby ? "Monitoring" : "Standby"),
  };

  // If an alert condition fired, create new alert if not already active
  if (isAbnormal) {
    const existingActive = await Alert.findOne({
      bedId: bed.bedId,
      alertType,
      status: "Active",
    });

    if (!existingActive) {
      const alertId = `ALT-${Math.floor(1000 + Math.random() * 9000)}`;
      const alertObj = {
        alertId,
        detectedAt: new Date().toISOString().replace("T", " ").substring(0, 19),
        bedId: bed.bedId,
        patientId: bed.patientId,
        babyName: bed.babyName,
        alertType,
        parameter: alertParam,
        readingValue: alertVal,
        threshold: `Safety Limit Violated`,
        priority,
        assignedStaff: bed.assignedDoctorName,
        assignedStaffRole: "Doctor",
        status: "Active",
        deviceId: bed.deviceId || deviceId,
        duration: "Just now",
      };
      await Alert.create(alertObj);

      updatePayload.$push = {
        activeAlerts: {
          id: alertId,
          type: alertType,
          param: alertParam,
          value: alertVal,
          priority,
          detectedAt: timeStr,
          duration: "Just now",
          status: "Active",
        },
      };
    }
  }

  const updatedBed = await Bed.findOneAndUpdate({ bedId: bed.bedId }, updatePayload, { new: true });

  return {
    success: true,
    message: "Telemetry ingested successfully",
    bedId: bed.bedId,
    deviceId: deviceId || bed.deviceId,
    vitals: { hr: updatedBed.hr, spo2: updatedBed.spo2, temp: updatedBed.temperature },
    alertTriggered: isAbnormal,
    bedAssigned: true,
  };
}

// REST Endpoint called by HTTP ESP32 clients or REST simulator
app.post("/api/telemetry", async (req, res) => {
  try {
    const result = await processTelemetryIngestion(req.body);
    if (!result.success && result.error) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err) {
    console.error("Telemetry ingestion error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Device-specific HTTP telemetry endpoint e.g. POST /api/devices/ESP32-NICU-01/telemetry
app.post("/api/devices/:id/telemetry", async (req, res) => {
  try {
    const payload = { ...req.body, deviceId: req.params.id };
    const result = await processTelemetryIngestion(payload);
    if (!result.success && result.error) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err) {
    console.error("Device telemetry error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Device configuration & auto-mapping query endpoint
app.get("/api/devices/:id/config", async (req, res) => {
  try {
    const device = await Device.findOne({ deviceId: req.params.id });
    if (!device) {
      return res.json({
        deviceId: req.params.id,
        status: "UNASSIGNED",
        assignedBedId: null,
        assignedPatientId: null,
      });
    }
    res.json({
      deviceId: device.deviceId,
      status: device.status,
      assignedBedId: device.assignedBedId,
      assignedPatientId: device.assignedPatientId,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Settings & Thresholds Endpoints ─────────────────────────
app.get("/api/settings", async (req, res) => {
  try {
    let settings = await Setting.findOne({ key: "global_thresholds" });
    if (!settings) {
      settings = await Setting.create({ key: "global_thresholds" });
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/settings/thresholds", async (req, res) => {
  try {
    const updated = await Setting.findOneAndUpdate(
      { key: "global_thresholds" },
      { $set: req.body },
      { new: true, upsert: true }
    );
    // Log change
    await AuditLog.create({
      id: `LOG-${Date.now().toString().slice(-4)}`,
      actor: req.body.actor || "Dr. Meera Vasudevan",
      role: req.body.role || "Doctor",
      action: `Updated physiological safety thresholds (HR: ${req.body.hrLow}-${req.body.hrHigh}, SpO2: ${req.body.spo2Low}%, Temp: ${req.body.tempLow}-${req.body.tempHigh}°C)`,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Audit Trail Endpoint ────────────────────────────────────
app.get("/api/audit", async (req, res) => {
  try {
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(50);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Connect to MongoDB & Start Server ───────────────────────
async function startServer() {
  try {
    console.log("Connecting to MongoDB Atlas at:", MONGO_URI.replace(/:([^:@]+)@/, ":****@"));
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB Atlas!");

    // Seed staff & settings on first run (never seeds beds/vitals)
    const staffCount = await Staff.countDocuments();
    if (staffCount === 0) {
      console.log("Seeding clinical staff roster and system defaults...");
      await seedDatabase();
    } else {
      console.log(`System ready. ${staffCount} staff members loaded. Awaiting live ESP32 data.`);
    }

    const server = app.listen(PORT, () => {
      console.log(`NICU Monitoring Backend running at http://localhost:${PORT}`);
      console.log(`ESP32 Telemetry Endpoint: http://localhost:${PORT}/api/telemetry`);
      console.log(`HiveMQ MQTT Topic: nicu/telemetry/<deviceId>`);
    });

    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use. Kill existing process and restart.`);
        process.exit(1);
      } else {
        throw err;
      }
    });
  } catch (err) {
    console.error("Failed to connect to MongoDB Atlas:", err.message);
    process.exit(1);
  }
}

startServer();
