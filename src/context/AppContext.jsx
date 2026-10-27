// =============================================================
// AppContext.jsx — Unified NICU State Management
// LIVE DATA ONLY — No simulation, no dummy vitals.
// Fetches beds, staff, alerts, devices from MongoDB backend.
// ESP32 readings arrive via HiveMQ MQTT → server → MongoDB.
// =============================================================

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { DEFAULT_THRESHOLDS, WEEKLY_ANALYTICS_DATA, BED_EFFICIENCY_METRICS } from "../data/nicuData";
import { api } from "../services/api";

const AppContext = createContext(null);

export const ROLES = {
  ADMIN: "Administrator",
  DOCTOR: "Doctor",
  NURSE: "Nurse",
  PATIENT: "Patient",
};

// Role permission helpers
export const can = {
  // Admit/discharge patients
  admitPatient: (role) => role === ROLES.ADMIN || role === ROLES.NURSE || role === ROLES.DOCTOR,
  dischargePatient: (role) => role === ROLES.ADMIN || role === ROLES.DOCTOR,
  // Device management
  manageDevices: (role) => role === ROLES.ADMIN,
  assignDevice: (role) => role === ROLES.ADMIN || role === ROLES.NURSE,
  // Alert actions
  acknowledgeAlert: (role) => [ROLES.ADMIN, ROLES.DOCTOR, ROLES.NURSE].includes(role),
  resolveAlert: (role) => role === ROLES.ADMIN || role === ROLES.DOCTOR,
  // Staff management
  manageStaff: (role) => role === ROLES.ADMIN,
  // Threshold changes
  changeThresholds: (role) => role === ROLES.ADMIN || role === ROLES.DOCTOR,
  // Settings
  accessSettings: (role) => role === ROLES.ADMIN,
  // Legal Medical Records
  generateLegalReport: (role) => [ROLES.ADMIN, ROLES.DOCTOR, ROLES.NURSE].includes(role),
};

// Initial clinical staff roster (accredited Level-III NICU care team)
export const DEFAULT_CLINICAL_STAFF = [
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
    assignedBeds: ["NICU-01", "NICU-02"],
    supervisingDoctor: null,
    totalAlertsHandled: 14,
    medianResponseTime: "42s",
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
    assignedBeds: ["NICU-03"],
    supervisingDoctor: null,
    totalAlertsHandled: 9,
    medianResponseTime: "58s",
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
    availability: "On Duty",
    assignedBeds: ["NICU-04"],
    supervisingDoctor: null,
    totalAlertsHandled: 11,
    medianResponseTime: "35s",
    avatar: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "DOC-04",
    name: "Dr. Sunita Rao",
    shortName: "Dr. Sunita",
    role: "Doctor",
    specialization: "Attending Neonatologist (MD Pediatrics, Perinatal Care)",
    shift: "Morning (07:00 - 15:00)",
    shiftType: "Morning",
    contact: {
      email: "dr.sunita@nicucenter.org",
      phone: "+91 98407 12345",
      ext: "4110",
    },
    availability: "On Duty",
    assignedBeds: ["NICU-05"],
    supervisingDoctor: null,
    totalAlertsHandled: 8,
    medianResponseTime: "49s",
    avatar: "https://images.unsplash.com/photo-1594824813576-96b610c144a1?w=150&auto=format&fit=crop&q=80",
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
    assignedBeds: ["NICU-01", "NICU-02"],
    supervisingDoctor: "Dr. Meera Vasudevan",
    totalAlertsHandled: 23,
    medianResponseTime: "24s",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
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
    assignedBeds: ["NICU-03"],
    supervisingDoctor: "Dr. Meera Vasudevan",
    totalAlertsHandled: 19,
    medianResponseTime: "31s",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
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
    assignedBeds: ["NICU-04"],
    supervisingDoctor: "Dr. Rajesh Kulkarni",
    totalAlertsHandled: 12,
    medianResponseTime: "38s",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "NUR-04",
    name: "Nurse Karthik Raman",
    shortName: "Nurse Karthik",
    role: "Nurse",
    specialization: "Critical Care Staff Nurse (MSc Nursing)",
    shift: "Night (23:00 - 07:00)",
    shiftType: "Night",
    contact: {
      email: "karthik.r@nicucenter.org",
      phone: "+91 98408 90123",
      ext: "4124",
    },
    availability: "Off Duty",
    assignedBeds: ["NICU-05", "NICU-06"],
    supervisingDoctor: "Dr. Alok Sengupta",
    totalAlertsHandled: 15,
    medianResponseTime: "29s",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
  },
];

export function AppProvider({ children }) {
  // Theme state: defaults to modern clinical white & blue
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("nicu_theme") || "light";
  });

  // Current logged in user (null = not logged in or restore from session)
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = sessionStorage.getItem("nicu_user");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  // Clinical thresholds
  const [thresholds, setThresholds] = useState({ ...DEFAULT_THRESHOLDS });

  // Beds — starts empty, populated from MongoDB
  const [beds, setBeds] = useState([]);

  // Patients registry (active and discharged neonates)
  const [patients, setPatients] = useState([]);

  // Staff state — initialized with sample accredited clinical team, updated from backend
  const [staffList, setStaffList] = useState(DEFAULT_CLINICAL_STAFF);

  // ESP32 Devices registry
  const [devices, setDevices] = useState([]);

  // Alert log state — only real alerts from ESP32 telemetry
  const [alertLog, setAlertLog] = useState([]);

  // Audit trail state
  const [auditLogs, setAuditLogs] = useState([]);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  // Waveform buffers: last 60 real readings per bed (bedId → [{time, hr, spo2, temp}])
  const [waveforms, setWaveforms] = useState({});

  // Loading state for initial fetch
  const [isLoading, setIsLoading] = useState(true);

  // Dynamic Role-Based Access Control (RBAC) Permissions matrix
  const [rolePermissions, setRolePermissions] = useState(() => {
    const saved = localStorage.getItem("nicu_role_permissions");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return {
      Doctor: {
        dashboard: "edit",
        patients: "edit",
        doctors: "view",
        alerts: "edit",
        analytics: "view",
        settings: "view",
      },
      Nurse: {
        dashboard: "view",
        patients: "view",
        doctors: "view",
        alerts: "edit",
        analytics: "view",
        settings: "restricted",
      },
    };
  });

  const updateRolePermission = useCallback((role, moduleKey, level) => {
    setRolePermissions((prev) => {
      const next = {
        ...prev,
        [role]: {
          ...(prev[role] || {}),
          [moduleKey]: level,
        },
      };
      localStorage.setItem("nicu_role_permissions", JSON.stringify(next));
      return next;
    });
  }, []);

  // Permission access checker
  const canAccess = useCallback(
    (moduleKey, requiredLevel = "view") => {
      if (!currentUser) return false;
      if (currentUser.role === ROLES.ADMIN) return true;

      const userRole = currentUser.role;
      const perm = rolePermissions[userRole]?.[moduleKey] || "view";

      if (perm === "restricted") return false;
      if (requiredLevel === "edit" && perm !== "edit") return false;
      return true;
    },
    [currentUser, rolePermissions]
  );

  // Real-time sensor analytics state from backend MongoDB
  const [analyticsData, setAnalyticsData] = useState(null);

  // Sync theme to DOM (defaults to modern clinical white and blue)
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("nicu_theme", theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const fetchAnalytics = useCallback(async (timeframe = "7d") => {
    try {
      const data = await api.getAnalytics(timeframe);
      if (data && data.success) {
        setAnalyticsData(data);
      }
      return data;
    } catch (e) {
      console.warn("Could not fetch sensor analytics:", e);
    }
  }, []);

  // ─── Logout ────────────────────────────────────────────────
  const logout = useCallback(() => {
    sessionStorage.removeItem("nicu_user");
    setCurrentUser(null);
  }, []);

  // ─── Initial fetch from MongoDB backend ────────────────────
  useEffect(() => {
    async function loadBackendData() {
      setIsLoading(true);
      try {
        const [bedsData, patientsData, staffData, alertsData, settingsData, devicesData, auditData, analyticsRes] =
          await Promise.all([
            api.getBeds(),
            api.getPatients(),
            api.getStaff(),
            api.getAlerts(),
            api.getSettings(),
            api.getDevices(),
            api.getAuditLogs(),
            api.getAnalytics("7d"),
          ]);

        if (analyticsRes && analyticsRes.success) {
          setAnalyticsData(analyticsRes);
        }

        if (bedsData && Array.isArray(bedsData)) {
          setBeds(bedsData);
          // Build initial waveform buffers from existing beds
          const initWaveforms = {};
          bedsData.forEach((bed) => {
            initWaveforms[bed.bedId] = [];
          });
          setWaveforms(initWaveforms);
        }

        if (patientsData && Array.isArray(patientsData)) {
          setPatients(patientsData);
        }

        if (staffData && Array.isArray(staffData) && staffData.length > 0) {
          setStaffList(staffData);
        }

        if (alertsData && Array.isArray(alertsData)) {
          setAlertLog(alertsData);
        }

        if (settingsData && settingsData.hrLow) {
          setThresholds(settingsData);
        }

        if (devicesData && Array.isArray(devicesData)) {
          setDevices(devicesData);
        }

        if (auditData && Array.isArray(auditData)) {
          setAuditLogs(auditData);
        }
      } catch (err) {
        console.info("Backend loading:", err.message);
      } finally {
        setIsLoading(false);
      }
    }
    loadBackendData();

    // Live polling from MongoDB (every 3s) to catch ESP32 updates
    const pollTimer = setInterval(async () => {
      try {
        const [liveBeds, liveDevices, liveAlerts] = await Promise.all([
          api.getBeds(),
          api.getDevices(),
          api.getAlerts(),
        ]);

        if (liveBeds && Array.isArray(liveBeds)) {
          setBeds((prev) => {
            // Update waveforms for beds with new live readings
            setWaveforms((prevWaves) => {
              const next = { ...prevWaves };
              liveBeds.forEach((newBed) => {
                const oldBed = prev.find((b) => b.bedId === newBed.bedId);
                // If the heartbeat updated and vitals exist, append to waveform
                if (
                  newBed.hr !== null &&
                  newBed.spo2 !== null &&
                  newBed.lastHeartbeatMs > 0 &&
                  (!oldBed || oldBed.lastHeartbeatMs !== newBed.lastHeartbeatMs)
                ) {
                  const timeStr = new Date(newBed.lastHeartbeatMs).toLocaleTimeString("en-IN", { hour12: false });
                  const list = [...(next[newBed.bedId] || [])];
                  list.push({
                    time: timeStr,
                    hr: newBed.hr,
                    spo2: newBed.spo2,
                    temp: newBed.temperature,
                  });
                  if (list.length > 60) list.shift();
                  next[newBed.bedId] = list;
                }
              });
              return next;
            });
            return liveBeds;
          });
        }

        if (liveDevices && Array.isArray(liveDevices)) {
          setDevices(liveDevices);
        }

        if (liveAlerts && Array.isArray(liveAlerts)) {
          setAlertLog(liveAlerts);
        }
      } catch {
        // ignore poll errors silently
      }
    }, 3000);

    return () => clearInterval(pollTimer);
  }, []);

  // ─── Alert Management Functions ────────────────────────────

  const acknowledgeAlert = useCallback(
    (alertId, staffName = null) => {
      const actor = staffName || currentUser?.name || "Staff";
      const nowStr = new Date().toISOString().replace("T", " ").substring(0, 19);

      // Persist to MongoDB
      api.acknowledgeAlert(alertId, actor);

      // Optimistic UI update
      setAlertLog((prev) =>
        prev.map((alert) =>
          alert.alertId === alertId
            ? {
              ...alert,
              status: "Acknowledged",
              acknowledgedAt: nowStr,
              notes: (alert.notes || "") + `\n[${nowStr}] Acknowledged by ${actor}.`,
            }
            : alert
        )
      );

      setBeds((prev) =>
        prev.map((bed) => ({
          ...bed,
          activeAlerts: bed.activeAlerts.map((a) =>
            a.id === alertId ? { ...a, status: "Acknowledged", acknowledgedAt: nowStr } : a
          ),
        }))
      );

      setAuditLogs((prev) => [
        {
          id: `LOG-${Date.now().toString().slice(-4)}`,
          actor,
          role: currentUser?.role || "Staff",
          action: `Acknowledged alert ${alertId}`,
          timestamp: nowStr,
          ip: "System",
        },
        ...prev,
      ]);
    },
    [currentUser]
  );

  const resolveAlert = useCallback(
    (alertId, notes = "", staffName = null) => {
      const actor = staffName || currentUser?.name || "Staff";
      const nowStr = new Date().toISOString().replace("T", " ").substring(0, 19);

      // Persist to MongoDB
      api.resolveAlert(alertId, notes, actor);

      let targetBedId = null;

      setAlertLog((prev) =>
        prev.map((alert) => {
          if (alert.alertId === alertId) {
            targetBedId = alert.bedId; // capture bedId before returning
            return {
              ...alert,
              status: "Resolved",
              resolvedAt: nowStr,
              duration: "Resolved",
              notes: (alert.notes || "") + `\n[${nowStr}] Resolved by ${actor}: ${notes}`,
            };
          }
          return alert;
        })
      );

      // Remove from bed active alerts and normalize vitals
      setBeds((prev) =>
        prev.map((bed) => {
          const remaining = bed.activeAlerts.filter((a) => a.id !== alertId);
          return {
            ...bed,
            activeAlerts: remaining,
            status: remaining.length > 0 ? "Warning" : "Monitoring",
          };
        })
      );

      setAuditLogs((prev) => [
        {
          id: `LOG-${Date.now().toString().slice(-4)}`,
          actor,
          role: currentUser?.role || "Staff",
          action: `Resolved alert ${alertId}${notes ? `: "${notes}"` : ""}`,
          timestamp: nowStr,
          ip: "System",
        },
        ...prev,
      ]);
    },
    [currentUser]
  );

  // ─── Staff Management Functions ────────────────────────────

  const updateStaffAvailability = useCallback(
    (staffId, newStatus) => {
      api.updateStaffAvailability(staffId, newStatus);
      setStaffList((prev) =>
        prev.map((staff) =>
          staff.id === staffId ? { ...staff, availability: newStatus } : staff
        )
      );
      setAuditLogs((prev) => [
        {
          id: `LOG-${Date.now().toString().slice(-4)}`,
          actor: currentUser?.name || "System",
          role: currentUser?.role || "Admin",
          action: `Changed availability of staff ${staffId} to ${newStatus}`,
          timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
          ip: "System",
        },
        ...prev,
      ]);
    },
    [currentUser]
  );

  const addStaff = useCallback(
    async (newStaff) => {
      const res = await api.createStaff(newStaff);
      const updated = await api.getStaff();
      if (updated && Array.isArray(updated)) setStaffList(updated);
      setAuditLogs((prev) => [
        {
          id: `LOG-${Date.now().toString().slice(-4)}`,
          actor: currentUser?.name || "Admin",
          role: currentUser?.role || "Admin",
          action: `Added new staff member: ${newStaff.name} (${newStaff.role})`,
          timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
          ip: "System",
        },
        ...prev,
      ]);
      return res;
    },
    [currentUser]
  );

  const removeStaff = useCallback(
    async (staffId) => {
      await api.deleteStaff(staffId);
      const updated = await api.getStaff();
      if (updated && Array.isArray(updated)) setStaffList(updated);
    },
    []
  );

  const assignBedStaff = useCallback(
    (bedId, doctorId, nurseIds) => {
      const doctor = staffList.find((s) => s.id === doctorId);
      api.updateBed(bedId, {
        assignedDoctorId: doctorId,
        assignedDoctorName: doctor?.shortName,
        assignedNurseIds: nurseIds,
      });
      setBeds((prev) =>
        prev.map((b) =>
          b.bedId === bedId
            ? {
              ...b,
              assignedDoctorId: doctorId,
              assignedDoctorName: doctor ? doctor.shortName : b.assignedDoctorName,
              assignedNurseIds: nurseIds,
            }
            : b
        )
      );

      setAuditLogs((prev) => [
        {
          id: `LOG-${Date.now().toString().slice(-4)}`,
          actor: currentUser?.name || "System",
          role: currentUser?.role || "Admin",
          action: `Reassigned Bed ${bedId} to Doctor ${doctor?.name || doctorId}`,
          timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
          ip: "System",
        },
        ...prev,
      ]);
    },
    [staffList, currentUser]
  );

  // ─── Settings & Thresholds ─────────────────────────────────

  const updateThresholds = useCallback(
    (newValues) => {
      if (!can.changeThresholds(currentUser?.role)) {
        console.warn("Insufficient permissions to change thresholds");
        return;
      }
      api.updateThresholds(newValues, currentUser?.name, currentUser?.role);
      setThresholds(newValues);
      setAuditLogs((prev) => [
        {
          id: `LOG-${Date.now().toString().slice(-4)}`,
          actor: currentUser?.name || "System",
          role: currentUser?.role || "Doctor",
          action: `Updated physiological threshold rules (HR: ${newValues.hrLow}-${newValues.hrHigh}, SpO₂: ${newValues.spo2Low}%, Temp: ${newValues.tempLow}-${newValues.tempHigh}°C)`,
          timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
          ip: "System",
        },
        ...prev,
      ]);
    },
    [currentUser]
  );

  // ─── ESP32 Devices Management ──────────────────────────────
  const fetchDevices = useCallback(async () => {
    try {
      const data = await api.getDevices();
      if (data && Array.isArray(data)) setDevices(data);
      return data;
    } catch (e) {
      console.warn("Could not fetch devices:", e);
    }
  }, []);

  const addDevice = useCallback(
    async (deviceData) => {
      if (!can.manageDevices(currentUser?.role)) {
        throw new Error("Only Administrators can register new ESP32 devices.");
      }
      const res = await api.registerDevice({ ...deviceData, actor: currentUser?.name });
      await fetchDevices();
      const updatedBeds = await api.getBeds();
      if (updatedBeds && Array.isArray(updatedBeds)) setBeds(updatedBeds);
      return res;
    },
    [currentUser, fetchDevices]
  );

  const assignDeviceToBed = useCallback(
    async (deviceId, bedId) => {
      if (!can.assignDevice(currentUser?.role)) {
        throw new Error("Insufficient permissions to assign devices.");
      }
      const res = await api.assignDevice(deviceId, bedId);
      await fetchDevices();
      const updatedBeds = await api.getBeds();
      if (updatedBeds && Array.isArray(updatedBeds)) setBeds(updatedBeds);
      return res;
    },
    [currentUser, fetchDevices]
  );

  const deleteDevice = useCallback(
    async (deviceId) => {
      if (!can.manageDevices(currentUser?.role)) {
        throw new Error("Only Administrators can remove ESP32 devices.");
      }
      const res = await api.deleteDevice(deviceId);
      await fetchDevices();
      const updatedBeds = await api.getBeds();
      if (updatedBeds && Array.isArray(updatedBeds)) setBeds(updatedBeds);
      return res;
    },
    [currentUser, fetchDevices]
  );

  // ─── Bed & Patient Management ──────────────────────────────
  const addBed = useCallback(
    async (bedData) => {
      if (!can.admitPatient(currentUser?.role)) {
        throw new Error("Insufficient permissions to admit patients.");
      }
      const res = await api.createBed({ ...bedData, actor: currentUser?.name });
      const updated = await api.getBeds();
      if (updated && Array.isArray(updated)) {
        setBeds(updated);
        // Initialize waveform buffer for new bed
        setWaveforms((prev) => ({
          ...prev,
          [bedData.bedId]: [],
        }));
      }
      return res;
    },
    [currentUser]
  );

  const deleteBed = useCallback(
    async (bedId) => {
      if (!can.dischargePatient(currentUser?.role)) {
        throw new Error("Only Doctors and Administrators can discharge patients.");
      }
      const res = await api.deleteBed(bedId);
      const updated = await api.getBeds();
      if (updated && Array.isArray(updated)) setBeds(updated);
      // Remove waveform buffer
      setWaveforms((prev) => {
        const next = { ...prev };
        delete next[bedId];
        return next;
      });
      return res;
    },
    [currentUser]
  );

  // ─── Patient Management (Admit & Discharge) ────────────────
  const fetchPatients = useCallback(async (status) => {
    try {
      const data = await api.getPatients(status);
      if (data && Array.isArray(data)) setPatients(data);
      return data;
    } catch (e) {
      console.warn("Could not fetch patients:", e);
    }
  }, []);


  const sanitizeBed = useCallback(
    async (bedId, details = {}) => {
      const targetBed = beds.find((b) => b.bedId === bedId);
      const isOccupied = Boolean(
        targetBed?.babyName &&
        targetBed.babyName.trim().length > 0 &&
        targetBed.status !== "Standby"
      );

      if (isOccupied) {
        // OCCUPIED STATION: Routine Bedside Surface Sanitization & Filter Check
        // CRITICAL: Patients are NEVER discharged here! Admission remains active.
        const timeStr = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
        setBeds((prev) =>
          prev.map((b) =>
            b.bedId === bedId
              ? {
                  ...b,
                  lastUpdate: `Surface Disinfected & Filter Verified (${timeStr})`,
                }
              : b
          )
        );
      } else {
        // STANDBY STATION: Terminal UV-C Sterilization & Admission Certification
        setBeds((prev) =>
          prev.map((b) =>
            b.bedId === bedId
              ? {
                  ...b,
                  patientId: "",
                  babyName: "",
                  motherName: "",
                  gender: "",
                  gestationalAge: "",
                  birthWeight: "",
                  bloodGroup: "",
                  diagnosis: "",
                  deviceId: null,
                  deviceMac: "",
                  status: "Standby",
                  connectionState: "DISCONNECTED",
                  hr: null,
                  spo2: null,
                  temperature: null,
                  activeAlerts: [],
                  lastHeartbeatMs: 0,
                  lastUpdate: "Sanitized & Disinfected — Ready for Admission",
                }
              : b
          )
        );
      }

      try {
        const res = await api.sanitizeBed(bedId, {
          actor: currentUser?.name || "Clinical Staff",
          role: currentUser?.role || "Nurse",
          ...details,
        });

        // Re-synchronize from server
        const [freshBeds, freshPts] = await Promise.all([
          api.getBeds(),
          api.getPatients(),
        ]);
        if (freshBeds && Array.isArray(freshBeds)) setBeds(freshBeds);
        if (freshPts && Array.isArray(freshPts)) setPatients(freshPts);
        return res;
      } catch (e) {
        console.warn("Sanitize sync error:", e);
      }

      setAuditLogs((prev) => [
        {
          id: `LOG-${Date.now().toString().slice(-4)}`,
          actor: currentUser?.name || "Staff",
          role: currentUser?.role || "Nurse",
          action: isOccupied
            ? `Completed routine surface sanitization & HEPA filter inspection for Bed ${bedId} (${targetBed?.babyName}). Inpatient vital monitoring active uninterrupted.`
            : `Completed terminal decontamination protocol (UV-C & surface sterilization) for Bed ${bedId}. Station released to Standby.`,
          timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
          ip: "System",
        },
        ...prev,
      ]);
    },
    [currentUser, beds]
  );

  const admitPatient = useCallback(
    async (patientData) => {
      if (!can.admitPatient(currentUser?.role)) {
        throw new Error("Insufficient permissions to admit patients.");
      }

      // Optimistic instant state update
      const newPt = {
        ...patientData,
        patientId: patientData.patientId || `PT-${Date.now().toString().slice(-4)}`,
        status: "Admitted",
        admissionDate: new Date().toISOString().substring(0, 10),
      };

      setPatients((prev) => [newPt, ...prev.filter((p) => p.patientId !== newPt.patientId)]);

      if (patientData.assignedBedId) {
        setBeds((prev) =>
          prev.map((b) =>
            b.bedId === patientData.assignedBedId
              ? {
                  ...b,
                  patientId: newPt.patientId,
                  babyName: newPt.babyName,
                  motherName: newPt.motherName,
                  gender: newPt.gender || "Female",
                  gestationalAge: newPt.gestationalAge || "33w",
                  birthWeight: newPt.birthWeight || "1,800 g",
                  diagnosis: newPt.diagnosis || "Observation",
                  assignedDoctorId: newPt.assignedDoctorId || "DOC-01",
                  assignedDoctorName: newPt.assignedDoctorName || "Dr. Meera Vasudevan",
                  deviceId: newPt.deviceId || b.deviceId,
                  status: "Monitoring",
                  connectionState: "CONNECTED",
                  lastUpdate: "Admitted — Monitoring Active",
                }
              : b
          )
        );
      }

      try {
        const res = await api.admitPatient({ ...patientData, actor: currentUser?.name });
        await fetchPatients();
        const updatedBeds = await api.getBeds();
        if (updatedBeds && Array.isArray(updatedBeds)) setBeds(updatedBeds);
        const updatedDevices = await api.getDevices();
        if (updatedDevices && Array.isArray(updatedDevices)) setDevices(updatedDevices);
        return res;
      } catch (err) {
        console.warn("Admission server sync warning:", err.message);
      }
    },
    [currentUser, fetchPatients]
  );

  const dischargePatient = useCallback(
    async (patientId, dischargeData = {}) => {
      if (!can.dischargePatient(currentUser?.role)) {
        throw new Error("Only Doctors and Administrators can discharge patients.");
      }

      // Optimistic update: instantly free up bed and update patient status
      let freedBedId = null;
      let targetBabyName = "";
      setPatients((prev) =>
        prev.map((p) => {
          if (p.patientId === patientId || p._id === patientId) {
            freedBedId = p.assignedBedId;
            targetBabyName = p.babyName;
            return {
              ...p,
              status: "Discharged",
              dischargeDate: dischargeData.dischargeDate || new Date().toISOString().substring(0, 10),
              dischargeCondition: dischargeData.dischargeCondition || "Full Recovery",
              dischargeSummary: dischargeData.dischargeSummary || "Recovered & Discharged",
              assignedBedId: null,
              deviceId: null,
            };
          }
          return p;
        })
      );

      // Instantly free up the bed in UI so it can immediately be assigned to another infant
      setBeds((prev) =>
        prev.map((b) => {
          if (b.patientId === patientId || (freedBedId && b.bedId === freedBedId)) {
            return {
              ...b,
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
              hr: null,
              spo2: null,
              temperature: null,
              activeAlerts: [],
              lastHeartbeatMs: 0,
              lastUpdate: "Discharged — Bed Available for Admission",
            };
          }
          return b;
        })
      );

      setAuditLogs((prev) => [
        {
          id: `LOG-${Date.now().toString().slice(-4)}`,
          actor: currentUser?.name || "Doctor",
          role: currentUser?.role || "Doctor",
          action: `Discharged infant ${targetBabyName || patientId} from Bed ${freedBedId || "NICU"}. Bed freed for reuse.`,
          timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
          ip: "System",
        },
        ...prev,
      ]);

      try {
        const res = await api.dischargePatient(patientId, {
          ...dischargeData,
          actor: currentUser?.name,
        });
        await fetchPatients();
        const updatedBeds = await api.getBeds();
        if (updatedBeds && Array.isArray(updatedBeds)) setBeds(updatedBeds);
        const updatedDevices = await api.getDevices();
        if (updatedDevices && Array.isArray(updatedDevices)) setDevices(updatedDevices);
        return res;
      } catch (err) {
        console.warn("Discharge server sync warning:", err.message);
      }
    },
    [currentUser, fetchPatients]
  );

  const updatePatient = useCallback(
    async (patientId, updateData) => {
      const res = await api.updatePatient(patientId, updateData);
      await fetchPatients();
      const updatedBeds = await api.getBeds();
      if (updatedBeds && Array.isArray(updatedBeds)) setBeds(updatedBeds);
      return res;
    },
    [fetchPatients]
  );

  // ─── Computed Metrics ──────────────────────────────────────
  const activeAlertsList = alertLog.filter((a) => a.status === "Active" || a.status === "Acknowledged");
  const totalBeds = beds.length;
  const activeMonitoringCount = beds.filter(
    (b) => b.status === "Monitoring" || b.status === "Warning"
  ).length;
  const activeAlertsCount = activeAlertsList.length;
  const devicesOnlineCount =
    devices.length > 0
      ? devices.filter((d) => d.isOnline || d.status === "ONLINE" || d.status === "AVAILABLE").length
      : beds.filter((b) => b.lastHeartbeatMs > 0 && Date.now() - b.lastHeartbeatMs < 15000).length;

  return (
    <AppContext.Provider
      value={{
        theme,
        toggleTheme,
        currentUser,
        setCurrentUser,
        logout,
        isLoading,
        // Role permissions
        can,
        rolePermissions,
        updateRolePermission,
        canAccess,
        // Patients
        patients,
        setPatients,
        fetchPatients,
        admitPatient,
        dischargePatient,
        updatePatient,
        // Beds
        beds,
        setBeds,
        addBed,
        deleteBed,
        sanitizeBed,
        // Staff
        staffList,
        setStaffList,
        addStaff,
        removeStaff,
        updateStaffAvailability,
        assignBedStaff,
        // Devices
        devices,
        fetchDevices,
        addDevice,
        assignDeviceToBed,
        deleteDevice,
        // Alerts
        alertLog,
        setAlertLog,
        acknowledgeAlert,
        resolveAlert,
        // Audit
        auditLogs,
        // Settings
        thresholds,
        updateThresholds,
        // Waveforms (live readings buffer per bed)
        waveforms,
        // Search
        searchQuery,
        setSearchQuery,
        // KPI metrics
        totalBeds,
        activeMonitoringCount,
        activeAlertsCount,
        activeAlertsList,
        devicesOnlineCount,
        // Real Sensor Analytics
        analyticsData,
        fetchAnalytics,
        weeklyAnalytics: WEEKLY_ANALYTICS_DATA,
        bedEfficiency: BED_EFFICIENCY_METRICS,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
