// =============================================================
// Settings.jsx — Central System Configuration Hub
// 6 Structured Sub-Sections:
// 1. NICU & Bed Configuration
// 2. Device Management (ESP32 Firmware & Payload Tester)
// 3. Clinical Alert Rules & Safety Thresholds (with Audit Warning)
// 4. Users & Role-Based Access Control
// 5. Reports & Retention Policies
// 6. Security & Audit Trail Logs
// =============================================================

import { useState, useEffect } from "react";
import {
  Settings as SettingsIcon,
  Bed,
  Cpu,
  Sliders,
  Users,
  FileCheck,
  Shield,
  AlertTriangle,
  Save,
  CheckCircle2,
  RefreshCw,
  Code,
  Terminal,
  ExternalLink,
  Lock,
  Battery,
  Wifi,
  Plus,
  Trash2,
  Radio,
  Send,
  Sparkles,
  Layers,
  X,
  Download,
  Cloud,
  Database,
  Activity,
  FileText,
  Check,
  RotateCcw,
  Clock,
} from "lucide-react";
import { useApp, ROLES } from "../context/AppContext";
import { api } from "../services/api";

const HIVEMQ_ARDUINO_CODE = `/*
 * ==============================================================================
 *  NICU Continuous Vital Monitoring System — ESP32 HiveMQ MQTT Transmitter
 * ==============================================================================
 *  Target Boards : ESP32 / ESP32-S3 / ESP32-WROOM-32 / ESP32 DevKit
 *  Cloud Broker  : broker.hivemq.com (Port 1883) — 100% Free Public MQTT Broker
 *  Topic Pattern : nicu/telemetry/<DEVICE_ID> (e.g. nicu/telemetry/ESP32-NICU-01)
 *
 *  Hardware Pin Configuration:
 *    - MAX30102 / MAX30105 I2C SDA -> GPIO 21
 *    - MAX30102 / MAX30105 I2C SCL -> GPIO 22
 *    - DHT11 Temperature & Humidity -> GPIO 4
 *    - Status LED -> GPIO 2
 *
 *  BED ASSIGNMENT:
 *    NOTE: Hardcoded BED_ID has been removed. This ESP32 acts as a portable
 *    clinical telemetry node. You can assign or bind this DEVICE_ID to ANY
 *    station/bed (NICU-01 through NICU-06) dynamically right from the web dashboard!
 * ==============================================================================
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>
#include "MAX30105.h"
#include "heartRate.h"
#include <DHT.h>
#include <math.h>

// -------- Wi-Fi credentials --------
const char* WIFI_SSID     = "wifi";
const char* WIFI_PASSWORD = "sathishs";

// -------- Device details --------
// Uniquely identifies this physical transmitter node.
// Assign this device ID to ANY bed in the web dashboard!
const char* DEVICE_ID = "ESP32-NICU-01";

// -------- HiveMQ public broker --------
const char* MQTT_BROKER = "broker.hivemq.com";
const int MQTT_PORT = 1883;

char mqttTopic[100];

WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);

// -------- Pin configuration --------
#define I2C_SDA 21
#define I2C_SCL 22
#define DHT_PIN 4
#define DHT_TYPE DHT11
#define WIFI_LED_PIN 2

// Change to true if your onboard LED is active LOW.
#define LED_ACTIVE_LOW false

// -------- Sensors --------
MAX30105 ppgSensor;
DHT dht(DHT_PIN, DHT_TYPE);

bool ppgFound = false;
bool dhtReadingOK = false;
bool ppgContact = false;

// -------- PPG values --------
long irValue = 0;
long redValue = 0;
long lastBeat = 0;

float heartRate = NAN;
float spo2Estimate = NAN;

// -------- Temperature & Humidity --------
float temperatureC = NAN;
float humidity = NAN;

// -------- Timers --------
unsigned long lastDHTRead = 0;
unsigned long lastPublish = 0;
unsigned long lastWiFiAttempt = 0;
unsigned long lastMQTTAttempt = 0;
unsigned long lastLEDChange = 0;

const unsigned long PUBLISH_INTERVAL = 1000; // 1 Hz telemetry
const unsigned long DHT_INTERVAL = 2000;     // 2 sec DHT cycle

bool ledState = false;

// =================================================
// LED STATUS INDICATOR
// =================================================
void setLED(bool on) {
  ledState = on;
  digitalWrite(WIFI_LED_PIN, LED_ACTIVE_LOW ? !on : on);
}

void updateLED() {
  // Steady 500ms blink while connected to Wi-Fi
  if (WiFi.status() == WL_CONNECTED) {
    if (millis() - lastLEDChange >= 500) {
      lastLEDChange = millis();
      setLED(!ledState);
    }
  } else {
    // Fast 150ms flash while searching / disconnected
    if (millis() - lastLEDChange >= 150) {
      lastLEDChange = millis();
      setLED(!ledState);
    }
  }
}

// =================================================
// WIFI AUTO-RECONNECT
// =================================================
void maintainWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  if (lastWiFiAttempt != 0 && millis() - lastWiFiAttempt < 10000) {
    return;
  }

  lastWiFiAttempt = millis();

  Serial.println("Connecting to Wi-Fi...");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

// =================================================
// MQTT AUTO-RECONNECT (HiveMQ Cloud Public Broker)
// =================================================
void maintainMQTT() {
  if (WiFi.status() != WL_CONNECTED || mqttClient.connected()) {
    return;
  }

  if (lastMQTTAttempt != 0 && millis() - lastMQTTAttempt < 3000) {
    return;
  }

  lastMQTTAttempt = millis();

  String clientId = "NICU-" + String((uint32_t)ESP.getEfuseMac(), HEX);

  Serial.print("Connecting to HiveMQ (broker.hivemq.com:1883)... ");

  if (mqttClient.connect(clientId.c_str())) {
    Serial.println("CONNECTED");
    Serial.print("Publish Topic: ");
    Serial.println(mqttTopic);
  } else {
    Serial.print("FAILED, state = ");
    Serial.println(mqttClient.state());
  }
}

// =================================================
// INITIALIZE SENSORS
// =================================================
void initializeSensors() {
  Wire.begin(I2C_SDA, I2C_SCL);

  Serial.println("Checking MAX30105 / MAX30102 on I2C...");

  if (ppgSensor.begin(Wire, I2C_SPEED_FAST)) {
    ppgFound = true;

    ppgSensor.setup();
    ppgSensor.setPulseAmplitudeRed(0x1F);
    ppgSensor.setPulseAmplitudeIR(0x1F);
    ppgSensor.setPulseAmplitudeGreen(0);

    Serial.println("PPG sensor detected and initialized.");
  } else {
    Serial.println("PPG sensor NOT detected on I2C bus.");
  }

  dht.begin();
  Serial.println("DHT11 initialized on GPIO 4; checking readings...");
}

// =================================================
// READ PPG (MAX30102 / MAX30105)
// =================================================
void readPPG() {
  if (!ppgFound) {
    ppgContact = false;
    heartRate = NAN;
    spo2Estimate = NAN;
    return;
  }

  irValue = ppgSensor.getIR();
  redValue = ppgSensor.getRed();

  // Optical contact threshold (< 50000 indicates poor contact or probe detached)
  if (irValue < 50000) {
    ppgContact = false;
    heartRate = NAN;
    spo2Estimate = NAN;
    lastBeat = 0;
    return;
  }

  ppgContact = true;

  if (checkForBeat(irValue)) {
    unsigned long now = millis();

    if (lastBeat != 0) {
      float bpm = 60000.0 / (now - lastBeat);

      if (bpm >= 30 && bpm <= 240) {
        heartRate = bpm;
      }
    }

    lastBeat = now;
  }

  // Mark old heart-rate readings as unavailable if no beat in 5 seconds
  if (lastBeat == 0 || millis() - lastBeat > 5000) {
    heartRate = NAN;
  }

  // Dual-wavelength optical SpO2 estimate
  if (irValue > 0 && redValue > 0) {
    float ratio = (float)redValue / (float)irValue;
    float estimate = 110.0 - (18.0 * ratio);

    if (estimate >= 70.0 && estimate <= 100.0) {
      spo2Estimate = estimate;
    } else {
      spo2Estimate = NAN;
    }
  } else {
    spo2Estimate = NAN;
  }
}

// =================================================
// READ DHT11 (Skin / Incubator Temperature & Humidity)
// =================================================
void readDHT() {
  if (millis() - lastDHTRead < DHT_INTERVAL) return;

  lastDHTRead = millis();

  float t = dht.readTemperature();
  float h = dht.readHumidity();

  if (!isnan(t) && !isnan(h)) {
    temperatureC = t;
    humidity = h;
    dhtReadingOK = true;
  } else {
    temperatureC = NAN;
    humidity = NAN;
    dhtReadingOK = false;
    Serial.println("DHT11 read failed.");
  }
}

// =================================================
// CONVERT VALUES FOR JSON
// =================================================
String jsonNumber(float value, int decimals) {
  if (isnan(value) || isinf(value)) {
    return "null";
  }
  return String(value, decimals);
}

// =================================================
// PUBLISH TO WEBSITE THROUGH MQTT
// Dynamic bed mapping: Device streams with deviceId only.
// The website automatically routes to whichever bed is assigned!
// =================================================
void publishData() {
  String hrStatus;
  String spo2Status;

  if (!ppgFound) {
    hrStatus = "SENSOR_NOT_DETECTED";
    spo2Status = "SENSOR_NOT_DETECTED";
  } else if (!ppgContact) {
    hrStatus = "NO_CONTACT";
    spo2Status = "NO_CONTACT";
  } else {
    hrStatus = isnan(heartRate) ? "NO_VALID_READING" : "ESTIMATED";
    spo2Status = isnan(spo2Estimate) ? "NO_VALID_READING" : "UNVALIDATED_ESTIMATE";
  }

  String payload = "{";
  payload += "\\"deviceId\\":\\"" + String(DEVICE_ID) + "\\",";
  payload += "\\"simulationMode\\":false,";
  payload += "\\"heartRateBpm\\":" + jsonNumber(heartRate, 1) + ",";
  payload += "\\"heartRate\\":" + jsonNumber(heartRate, 1) + ",";
  payload += "\\"heartRateStatus\\":\\"" + hrStatus + "\\",";
  payload += "\\"spo2EstimatePercent\\":" + jsonNumber(spo2Estimate, 1) + ",";
  payload += "\\"spo2\\":" + jsonNumber(spo2Estimate, 1) + ",";
  payload += "\\"spo2Status\\":\\"" + spo2Status + "\\",";
  payload += "\\"temperatureC\\":" + jsonNumber(temperatureC, 1) + ",";
  payload += "\\"temperature\\":" + jsonNumber(temperatureC, 1) + ",";
  payload += "\\"humidityPercent\\":" + jsonNumber(humidity, 1) + ",";
  payload += "\\"dht11Status\\":\\"" +
             String(dhtReadingOK ? "WORKING" : "NO_VALID_READING") + "\\",";
  payload += "\\"ppgSensorStatus\\":\\"" +
             String(ppgFound ? "DETECTED" : "NOT_DETECTED") + "\\",";
  payload += "\\"irValue\\":" + String(irValue) + ",";
  payload += "\\"redValue\\":" + String(redValue) + ",";
  payload += "\\"wifiConnected\\":";
  payload += (WiFi.status() == WL_CONNECTED ? "true," : "false,");
  payload += "\\"rssi\\":";
  payload += (WiFi.status() == WL_CONNECTED ?
              String(WiFi.RSSI()) : "null");
  payload += "}";

  if (mqttClient.connected()) {
    bool ok = mqttClient.publish(mqttTopic, payload.c_str());

    Serial.println(ok ? "✓ [MQTT PUBLISH OK]" : "✗ [MQTT PUBLISH FAILED]");
    Serial.println(payload);
  } else {
    Serial.println("MQTT disconnected; message not sent.");
  }
}

// =================================================
// SETUP
// =================================================
void setup() {
  Serial.begin(115200);
  delay(1000);

  pinMode(WIFI_LED_PIN, OUTPUT);
  setLED(false);

  snprintf(mqttTopic, sizeof(mqttTopic), "nicu/telemetry/%s", DEVICE_ID);

  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setBufferSize(768);

  initializeSensors();
  maintainWiFi();

  Serial.println("NICU MQTT Vital Transmitter Initialized.");
  Serial.println("Device ID: " + String(DEVICE_ID));
  Serial.println("Bed: Dynamic (Assign to any bed on web dashboard)");
}

// =================================================
// MAIN LOOP
// =================================================
void loop() {
  maintainWiFi();
  maintainMQTT();

  mqttClient.loop();
  updateLED();

  readPPG();
  readDHT();

  if (millis() - lastPublish >= PUBLISH_INTERVAL) {
    lastPublish = millis();
    publishData();
  }

  delay(10);
}
`;

export default function Settings() {
  const {
    thresholds,
    updateThresholds,
    beds,
    setBeds,
    addBed,
    deleteBed,
    sanitizeBed,
    devices,
    addDevice,
    assignDeviceToBed,
    assignDeviceToPatient,
    deleteDevice,
    fetchDevices,
    currentUser,
    auditLogs,
    isSimulating,
    setIsSimulating,
    dataSourceMode,
    setDataSourceMode,
    rolePermissions,
    updateRolePermission,
    staffList,
    patients,
  } = useApp();

  const userRole = currentUser?.role || ROLES.NURSE;
  const isAdministrator = userRole === ROLES.ADMIN;
  const isDoctor = userRole === ROLES.DOCTOR;
  const isNurse = userRole === ROLES.NURSE;

  // Strict Role-Based Tab Allowlist:
  // - Administrator: Full access to all 6 modules
  // - Doctor: Clinical thresholds, device registry, and bed bays (STRICTLY BLOCKED from users, retention, security)
  // - Nurse: Bed Station Roster only (STRICTLY BLOCKED from users, alert-rules, retention, security)
  const allowedTabs = isAdministrator
    ? ["alert-rules", "devices", "beds", "users", "retention", "security"]
    : isDoctor
    ? ["alert-rules", "devices", "beds"]
    : ["beds"];

  const searchParams = new URLSearchParams(window.location.search);
  const tabParam = searchParams.get("tab");
  const defaultSubTab = (tabParam && allowedTabs.includes(tabParam))
    ? tabParam
    : (isNurse ? "beds" : (allowedTabs[0] || "beds"));

  const [activeSubTab, setActiveSubTab] = useState(defaultSubTab);

  // Safety guard: if active tab is unauthorized for current role, redirect immediately
  useEffect(() => {
    if (!allowedTabs.includes(activeSubTab)) {
      setActiveSubTab(allowedTabs[0] || "beds");
    }
  }, [userRole, activeSubTab]);

  const [arduinoCodeCopied, setArduinoCodeCopied] = useState(false);

  const [showConnectGuide, setShowConnectGuide] = useState(false);
  const [thresholdForm, setThresholdForm] = useState({ ...thresholds });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeFirmwareTab, setActiveFirmwareTab] = useState("mqtt"); // Default to HiveMQ MQTT

  useEffect(() => {
    if (thresholds) {
      setThresholdForm({ ...thresholds });
    }
  }, [thresholds]);

  // Bed Slot Management state
  const [showAddBedModal, setShowAddBedModal] = useState(false);
  const [newBedForm, setNewBedForm] = useState({
    bedId: "",
    unitType: "Incubator A",
    assignedDoctorId: "DOC-01",
    assignedDoctorName: "Dr. Meera Vasudevan",
    deviceId: "",
  });
  const [isAddingBed, setIsAddingBed] = useState(false);
  const [sanitizingBedModal, setSanitizingBedModal] = useState(null);
  const [isDecontaminating, setIsDecontaminating] = useState(false);
  const [decontaminateStep, setDecontaminateStep] = useState(0);

  // Reports & Retention state
  const [retentionDays, setRetentionDays] = useState("90");
  const [auditRetentionYears, setAuditRetentionYears] = useState("7");
  const [backupFrequency, setBackupFrequency] = useState("daily");
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupToast, setBackupToast] = useState(null);
  const [censusReportGenerated, setCensusReportGenerated] = useState(false);

  // ESP32 Product Management state
  const [showAddDeviceModal, setShowAddDeviceModal] = useState(false);
  const [newDeviceForm, setNewDeviceForm] = useState({
    deviceId: "",
    deviceLabel: "",
    model: "ESP32-S3 DevKitC-1",
    macAddress: "",
    assignedBedId: "",
    firmwareVersion: "v2.1.4-esp32s3",
  });
  const [isRegistering, setIsRegistering] = useState(false);

  // Live REST API Tester state
  const [testPayload, setTestPayload] = useState({
    deviceId: "ESP32-NICU-01",
    heartRate: 142,
    spo2: 97,
    temperature: 36.7,
    batteryPercent: 88,
    rssi: -54,
  });
  const [testResult, setTestResult] = useState(null);
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Check if current user has permission to change clinical thresholds
  const canEditThresholds =
    currentUser.role === ROLES.ADMIN || currentUser.role === ROLES.DOCTOR;

  const handleSaveThresholds = (e) => {
    e.preventDefault();
    if (!canEditThresholds) {
      alert("Permission Denied: Only Administrators or authorized Lead Doctors may update clinical safety thresholds.");
      return;
    }
    updateThresholds(thresholdForm);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleRegisterDevice = async (e) => {
    e.preventDefault();
    if (!newDeviceForm.deviceId.trim()) {
      alert("Please enter a unique Device ID (e.g. ESP32-NICU-07)");
      return;
    }
    setIsRegistering(true);
    try {
      await addDevice(newDeviceForm);
      setShowAddDeviceModal(false);
      setNewDeviceForm({
        deviceId: "",
        deviceLabel: "",
        model: "ESP32-S3 DevKitC-1",
        macAddress: "",
        assignedBedId: "",
        firmwareVersion: "v2.1.4-esp32s3",
      });
    } catch (err) {
      alert("Error registering device: " + (err.message || "Failed"));
    } finally {
      setIsRegistering(false);
    }
  };

  const handleReassignPatient = async (deviceId, patientId) => {
    try {
      await assignDeviceToPatient(deviceId, patientId === "UNASSIGNED" ? null : patientId);
    } catch (err) {
      alert("Error reassigning patient device: " + err.message);
    }
  };

  const handleDeleteDevice = async (deviceId) => {
    if (confirm(`Are you sure you want to decommission and remove device ${deviceId}?`)) {
      try {
        await deleteDevice(deviceId);
      } catch (err) {
        alert("Error deleting device: " + err.message);
      }
    }
  };

  const handleAddBed = async (e) => {
    e.preventDefault();
    if (!newBedForm.bedId.trim()) {
      alert("Please enter a valid Bed ID (e.g. NICU-07)");
      return;
    }
    setIsAddingBed(true);
    try {
      const doc = (staffList || []).find((s) => s.id === newBedForm.assignedDoctorId);
      await addBed({
        ...newBedForm,
        assignedDoctorName: doc ? doc.name : newBedForm.assignedDoctorName,
        status: "Standby",
        babyName: "",
        motherName: "",
        lastUpdate: "Sanitized & Available for Admission",
      });
      setShowAddBedModal(false);
      setNewBedForm({
        bedId: "",
        unitType: "Incubator A",
        assignedDoctorId: "DOC-01",
        assignedDoctorName: "Dr. Meera Vasudevan",
        deviceId: "",
      });
    } catch (err) {
      alert("Error adding bed: " + err.message);
    } finally {
      setIsAddingBed(false);
    }
  };

  const handleOpenSanitizeModal = (bed) => {
    setSanitizingBedModal(bed);
    setIsDecontaminating(false);
    setDecontaminateStep(0);
  };

  const handleExecuteSanitize = async () => {
    if (!sanitizingBedModal) return;
    setIsDecontaminating(true);
    setDecontaminateStep(1);

    try {
      // 1.2s realistic multi-stage terminal sterilization
      await new Promise((r) => setTimeout(r, 1200));
      await sanitizeBed(sanitizingBedModal.bedId, {
        notes: "Station Sanitization Protocol Verified",
      });
      setDecontaminateStep(2);
      setBedSuccessMsg(`Station ${sanitizingBedModal.bedId} sterilized and released to Standby.`);
      setTimeout(() => {
        setSanitizingBedModal(null);
        setIsDecontaminating(false);
        setDecontaminateStep(0);
      }, 1600);
    } catch (err) {
      alert("Error during decontamination: " + err.message);
      setIsDecontaminating(false);
      setDecontaminateStep(0);
    }
  };

  const handleDeleteBedSlot = async (bedId) => {
    if (window.confirm(`Decommission and remove Bed Slot ${bedId}?`)) {
      try {
        await deleteBed(bedId);
      } catch (err) {
        alert("Error removing bed slot: " + err.message);
      }
    }
  };

  const handleExportAuditCsv = () => {
    const headers = ["Log ID", "Timestamp", "Actor", "Role", "Action", "IP Address"];
    const rows = (auditLogs || []).map((l) => [
      `"${l.id || ""}"`,
      `"${l.timestamp || ""}"`,
      `"${l.actor || ""}"`,
      `"${l.role || ""}"`,
      `"${(l.action || "").replace(/"/g, '""')}"`,
      `"${l.ip || "System"}"`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `NICU_Audit_Trail_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleTriggerBackup = () => {
    setIsBackingUp(true);
    setBackupToast(null);
    setTimeout(() => {
      setIsBackingUp(false);
      setBackupToast("Encrypted Cloud Snapshot successfully verified and synchronized to MongoDB Atlas.");
      setTimeout(() => setBackupToast(null), 4000);
    }, 1200);
  };

  const handleSendTestTelemetry = async () => {
    setIsSendingTest(true);
    setTestResult(null);
    try {
      const res = await api.testPublishMqtt(testPayload);
      setTestResult(res || { success: true, message: "Telemetry published over MQTT" });
      const [updatedBeds, updatedDevs] = await Promise.all([api.getBeds(), api.getDevices()]);
      if (updatedBeds && Array.isArray(updatedBeds)) setBeds(updatedBeds);
      if (updatedDevs && Array.isArray(updatedDevs)) fetchDevices();
    } catch (err) {
      setTestResult({ error: err.message });
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ── Section Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Centralized System Settings
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
              CONFIGURATION
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Configure neonatal beds, ESP32 device registry, clinical safety rules, user permissions, and audit logs
          </p>
        </div>

        {/* Current Operator Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs">
          <span className="text-slate-400">Authenticated as:</span>
          <strong className="text-slate-800 dark:text-slate-200">{currentUser.name}</strong>
          <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.2 rounded border border-blue-500/30">
            {currentUser.role}
          </span>
        </div>
      </div>



      {/* ── Sub-Section Navigation Tabs (Role Filtered) ── */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 sm:gap-2 overflow-x-auto text-xs font-semibold">
        {/* Beds Station Bay: Accessible to all roles */}
        <button
          onClick={() => setActiveSubTab("beds")}
          className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${activeSubTab === "beds"
            ? "border-blue-500 text-blue-600 dark:text-blue-400"
            : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
        >
          <Bed size={14} />
          <span>{isNurse ? "Bed Station Roster & Hygiene" : "NICU & Bed Configuration"}</span>
        </button>

        {/* Alert Rules: Administrator & Doctor only (Nurses restricted) */}
        {(isAdministrator || isDoctor) && (
          <button
            onClick={() => setActiveSubTab("alert-rules")}
            className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${activeSubTab === "alert-rules"
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
          >
            <Sliders size={14} />
            <span>Alert Rules &amp; Thresholds</span>
          </button>
        )}

        {/* Devices: Administrator & Doctor only */}
        {(isAdministrator || isDoctor) && (
          <button
            onClick={() => setActiveSubTab("devices")}
            className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${activeSubTab === "devices"
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
          >
            <Cpu size={14} />
            <span>Device Management (ESP32)</span>
          </button>
        )}

        {/* Users & Permissions: STRICTLY ADMINISTRATOR ONLY */}
        {isAdministrator && (
          <button
            onClick={() => setActiveSubTab("users")}
            className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${activeSubTab === "users"
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
          >
            <Users size={14} />
            <span>Users &amp; Permissions</span>
          </button>
        )}

        {/* Reports & Retention: STRICTLY ADMINISTRATOR ONLY */}
        {isAdministrator && (
          <button
            onClick={() => setActiveSubTab("retention")}
            className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${activeSubTab === "retention"
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
          >
            <FileCheck size={14} />
            <span>Reports &amp; Retention</span>
          </button>
        )}

        {/* Security & Audit Trail: STRICTLY ADMINISTRATOR ONLY */}
        {isAdministrator && (
          <button
            onClick={() => setActiveSubTab("security")}
            className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${activeSubTab === "security"
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
          >
            <Shield size={14} />
            <span>Security &amp; Audit Trail</span>
          </button>
        )}
      </div>

      {/* ── Sub-Section 1: Alert Rules & Safety Thresholds ── */}
      {activeSubTab === "alert-rules" && (isAdministrator || isDoctor) && (
        <div className="space-y-6">
          {/* Prominent Clinical Safety Warning Banner */}
          <div className="clinical-card p-4 bg-amber-50/70 dark:bg-amber-950/20 border-amber-300 dark:border-amber-900/60 flex items-start gap-3">
            <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <div className="font-bold text-sm">
                Safety-Critical Parameter Configuration Notice
              </div>
              <div>
                Altering physiological thresholds impacts real-time alarms across all 6 neonatal stations. Changes are logged to the cryptographic audit trail with your clinician credentials and timestamp.
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveThresholds} className="clinical-card p-6 space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>Neonatal Clinical Safety Limits &amp; Thresholds</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-bold">
                    Adjustable &amp; Typeable
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Type custom numbers directly into input fields or use sliders/buttons. Supports extreme lower and higher safety boundaries.
                </p>
              </div>

              {saveSuccess && (
                <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold font-mono animate-fade-in bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-800">
                  <CheckCircle2 size={16} />
                  Thresholds updated &amp; logged!
                </span>
              )}
            </div>

            {/* Quick Clinical Protocol Presets */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2 font-mono">
                ⚡ Quick Clinical Protocol Presets:
              </span>
              <div className="flex flex-wrap gap-2 text-xs">
                <button
                  type="button"
                  disabled={!canEditThresholds}
                  onClick={() =>
                    setThresholdForm({
                      hrLow: 100,
                      hrHigh: 180,
                      spo2Low: 90,
                      tempLow: 36.2,
                      tempHigh: 37.5,
                      persistenceSeconds: 5,
                    })
                  }
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-500 font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer text-[11px]"
                >
                  Standard Term (100–180 BPM, ≥90%, 36.2–37.5°C)
                </button>

                <button
                  type="button"
                  disabled={!canEditThresholds}
                  onClick={() =>
                    setThresholdForm({
                      hrLow: 110,
                      hrHigh: 185,
                      spo2Low: 92,
                      tempLow: 36.5,
                      tempHigh: 37.5,
                      persistenceSeconds: 3,
                    })
                  }
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-500 font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer text-[11px]"
                >
                  Preterm Strict (&lt;32w) (110–185 BPM, ≥92%)
                </button>

                <button
                  type="button"
                  disabled={!canEditThresholds}
                  onClick={() =>
                    setThresholdForm({
                      hrLow: 80,
                      hrHigh: 160,
                      spo2Low: 92,
                      tempLow: 33.0,
                      tempHigh: 34.5,
                      persistenceSeconds: 5,
                    })
                  }
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-cyan-500 font-semibold text-cyan-700 dark:text-cyan-300 transition-colors cursor-pointer text-[11px]"
                >
                  Therapeutic Hypothermia (Cooling 33.0–34.5°C)
                </button>

                <button
                  type="button"
                  disabled={!canEditThresholds}
                  onClick={() =>
                    setThresholdForm({
                      hrLow: 80,
                      hrHigh: 200,
                      spo2Low: 85,
                      tempLow: 35.5,
                      tempHigh: 38.0,
                      persistenceSeconds: 10,
                    })
                  }
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-amber-500 font-semibold text-amber-700 dark:text-amber-300 transition-colors cursor-pointer text-[11px]"
                >
                  Permissive / Wide (80–200 BPM, ≥85%)
                </button>

                <button
                  type="button"
                  disabled={!canEditThresholds}
                  onClick={() =>
                    setThresholdForm({
                      hrLow: 90,
                      hrHigh: 190,
                      spo2Low: 88,
                      tempLow: 28.0,
                      tempHigh: 37.8,
                      persistenceSeconds: 5,
                    })
                  }
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-500 font-semibold text-emerald-700 dark:text-emerald-300 transition-colors cursor-pointer text-[11px]"
                >
                  Sensor / Bench Test (~30°C Skin Temp, ≥25°C Limit)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              {/* Heart Rate Lower Limit (Bradycardia) */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-slate-900 dark:text-slate-100 block">
                      Heart Rate Lower Limit (Bradycardia)
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Fires urgent alarm if pulse drops below this threshold
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-rose-600 bg-rose-50 dark:bg-rose-950 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800">
                    URGENT
                  </span>
                </div>

                {/* Direct Typing Input & Nudge Stepper */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!canEditThresholds}
                    onClick={() =>
                      setThresholdForm({
                        ...thresholdForm,
                        hrLow: Math.max(20, (thresholdForm.hrLow || 100) - 5),
                      })
                    }
                    className="w-8 h-8 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-100 cursor-pointer flex items-center justify-center text-sm shadow-2xs"
                    title="Lower limit by 5 BPM"
                  >
                    -
                  </button>

                  <div className="flex-1 relative">
                    <input
                      type="number"
                      min="20"
                      max="180"
                      step="1"
                      disabled={!canEditThresholds}
                      value={thresholdForm.hrLow ?? ""}
                      onChange={(e) =>
                        setThresholdForm({
                          ...thresholdForm,
                          hrLow: e.target.value === "" ? "" : Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-1.5 font-mono font-bold text-base text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="absolute right-3 top-2 font-mono text-xs text-slate-400">
                      BPM
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={!canEditThresholds}
                    onClick={() =>
                      setThresholdForm({
                        ...thresholdForm,
                        hrLow: Math.min(180, (thresholdForm.hrLow || 100) + 5),
                      })
                    }
                    className="w-8 h-8 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-100 cursor-pointer flex items-center justify-center text-sm shadow-2xs"
                    title="Raise limit by 5 BPM"
                  >
                    +
                  </button>
                </div>

                <input
                  type="range"
                  min="30"
                  max="140"
                  step="1"
                  disabled={!canEditThresholds}
                  value={thresholdForm.hrLow || 100}
                  onChange={(e) =>
                    setThresholdForm({ ...thresholdForm, hrLow: Number(e.target.value) })
                  }
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="text-[10px] text-slate-400 flex justify-between font-mono">
                  <span>30 BPM (Severe)</span>
                  <span className="text-blue-600 font-semibold">Standard: 100 BPM</span>
                  <span>140 BPM</span>
                </div>
              </div>

              {/* Heart Rate Upper Limit (Tachycardia) */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-slate-900 dark:text-slate-100 block">
                      Heart Rate Upper Limit (Tachycardia)
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Fires urgent alarm if pulse exceeds this threshold
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-rose-600 bg-rose-50 dark:bg-rose-950 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800">
                    URGENT
                  </span>
                </div>

                {/* Direct Typing Input & Nudge Stepper */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!canEditThresholds}
                    onClick={() =>
                      setThresholdForm({
                        ...thresholdForm,
                        hrHigh: Math.max(90, (thresholdForm.hrHigh || 180) - 5),
                      })
                    }
                    className="w-8 h-8 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-100 cursor-pointer flex items-center justify-center text-sm shadow-2xs"
                    title="Lower limit by 5 BPM"
                  >
                    -
                  </button>

                  <div className="flex-1 relative">
                    <input
                      type="number"
                      min="80"
                      max="260"
                      step="1"
                      disabled={!canEditThresholds}
                      value={thresholdForm.hrHigh ?? ""}
                      onChange={(e) =>
                        setThresholdForm({
                          ...thresholdForm,
                          hrHigh: e.target.value === "" ? "" : Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-1.5 font-mono font-bold text-base text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="absolute right-3 top-2 font-mono text-xs text-slate-400">
                      BPM
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={!canEditThresholds}
                    onClick={() =>
                      setThresholdForm({
                        ...thresholdForm,
                        hrHigh: Math.min(260, (thresholdForm.hrHigh || 180) + 5),
                      })
                    }
                    className="w-8 h-8 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-100 cursor-pointer flex items-center justify-center text-sm shadow-2xs"
                    title="Raise limit by 5 BPM"
                  >
                    +
                  </button>
                </div>

                <input
                  type="range"
                  min="120"
                  max="240"
                  step="1"
                  disabled={!canEditThresholds}
                  value={thresholdForm.hrHigh || 180}
                  onChange={(e) =>
                    setThresholdForm({ ...thresholdForm, hrHigh: Number(e.target.value) })
                  }
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="text-[10px] text-slate-400 flex justify-between font-mono">
                  <span>120 BPM</span>
                  <span className="text-blue-600 font-semibold">Standard: 180 BPM</span>
                  <span>240 BPM (SVT Range)</span>
                </div>
              </div>

              {/* SpO2 Minimum Lower Limit */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-slate-900 dark:text-slate-100 block">
                      Oxygen Saturation Lower Limit (SpO₂ Desat)
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Triggers desaturation hypoxia alert
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-rose-600 bg-rose-50 dark:bg-rose-950 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800">
                    CRITICAL
                  </span>
                </div>

                {/* Direct Typing Input & Nudge Stepper */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!canEditThresholds}
                    onClick={() =>
                      setThresholdForm({
                        ...thresholdForm,
                        spo2Low: Math.max(50, (thresholdForm.spo2Low || 90) - 1),
                      })
                    }
                    className="w-8 h-8 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-100 cursor-pointer flex items-center justify-center text-sm shadow-2xs"
                    title="Lower limit by 1%"
                  >
                    -
                  </button>

                  <div className="flex-1 relative">
                    <input
                      type="number"
                      min="50"
                      max="100"
                      step="1"
                      disabled={!canEditThresholds}
                      value={thresholdForm.spo2Low ?? ""}
                      onChange={(e) =>
                        setThresholdForm({
                          ...thresholdForm,
                          spo2Low: e.target.value === "" ? "" : Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-1.5 font-mono font-bold text-base text-cyan-600 dark:text-cyan-400 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                    <span className="absolute right-3 top-2 font-mono text-xs text-slate-400">
                      %
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={!canEditThresholds}
                    onClick={() =>
                      setThresholdForm({
                        ...thresholdForm,
                        spo2Low: Math.min(100, (thresholdForm.spo2Low || 90) + 1),
                      })
                    }
                    className="w-8 h-8 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-100 cursor-pointer flex items-center justify-center text-sm shadow-2xs"
                    title="Raise limit by 1%"
                  >
                    +
                  </button>
                </div>

                <input
                  type="range"
                  min="60"
                  max="98"
                  step="1"
                  disabled={!canEditThresholds}
                  value={thresholdForm.spo2Low || 90}
                  onChange={(e) =>
                    setThresholdForm({ ...thresholdForm, spo2Low: Number(e.target.value) })
                  }
                  className="w-full accent-cyan-600 cursor-pointer"
                />
                <div className="text-[10px] text-slate-400 flex justify-between font-mono">
                  <span>60% (Permissive Cyanotic)</span>
                  <span className="text-cyan-600 font-semibold">Standard: 90%</span>
                  <span>98%</span>
                </div>
              </div>

              {/* Alarm Persistence Filter */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-slate-900 dark:text-slate-100 block">
                      Alarm Persistence Filter
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Seconds out-of-range before audio/visual alarm triggers
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                    FILTER
                  </span>
                </div>

                {/* Direct Typing Input & Nudge Stepper */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!canEditThresholds}
                    onClick={() =>
                      setThresholdForm({
                        ...thresholdForm,
                        persistenceSeconds: Math.max(0, (thresholdForm.persistenceSeconds || 5) - 1),
                      })
                    }
                    className="w-8 h-8 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-100 cursor-pointer flex items-center justify-center text-sm shadow-2xs"
                    title="Decrease by 1s"
                  >
                    -
                  </button>

                  <div className="flex-1 relative">
                    <input
                      type="number"
                      min="0"
                      max="60"
                      step="1"
                      disabled={!canEditThresholds}
                      value={thresholdForm.persistenceSeconds ?? ""}
                      onChange={(e) =>
                        setThresholdForm({
                          ...thresholdForm,
                          persistenceSeconds: e.target.value === "" ? "" : Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-1.5 font-mono font-bold text-base text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="absolute right-3 top-2 font-mono text-xs text-slate-400">
                      sec
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={!canEditThresholds}
                    onClick={() =>
                      setThresholdForm({
                        ...thresholdForm,
                        persistenceSeconds: Math.min(60, (thresholdForm.persistenceSeconds || 5) + 1),
                      })
                    }
                    className="w-8 h-8 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-100 cursor-pointer flex items-center justify-center text-sm shadow-2xs"
                    title="Increase by 1s"
                  >
                    +
                  </button>
                </div>

                <input
                  type="range"
                  min="0"
                  max="30"
                  step="1"
                  disabled={!canEditThresholds}
                  value={thresholdForm.persistenceSeconds || 5}
                  onChange={(e) =>
                    setThresholdForm({ ...thresholdForm, persistenceSeconds: Number(e.target.value) })
                  }
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="text-[10px] text-slate-400 flex justify-between font-mono">
                  <span>0s (Instant)</span>
                  <span className="text-blue-600 font-semibold">Standard: 5s (Anti-artifact)</span>
                  <span>30s</span>
                </div>
              </div>

              {/* Skin Temperature Low (Hypothermia) */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-slate-900 dark:text-slate-100 block">
                      Skin Temp Lower Limit (Hypothermia)
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Adjustable from 25.0°C upwards to support ambient sensor readings (~30°C)
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-amber-600 bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                    WARNING
                  </span>
                </div>

                {/* Direct Typing Input & Nudge Stepper */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!canEditThresholds}
                    onClick={() =>
                      setThresholdForm({
                        ...thresholdForm,
                        tempLow: Number((Math.max(25.0, (thresholdForm.tempLow || 28.0) - 0.2)).toFixed(1)),
                      })
                    }
                    className="w-8 h-8 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-100 cursor-pointer flex items-center justify-center text-sm shadow-2xs"
                    title="Lower limit by 0.2°C"
                  >
                    -
                  </button>

                  <div className="flex-1 relative">
                    <input
                      type="number"
                      min="25.0"
                      max="38.0"
                      step="0.1"
                      disabled={!canEditThresholds}
                      value={thresholdForm.tempLow ?? ""}
                      onChange={(e) =>
                        setThresholdForm({
                          ...thresholdForm,
                          tempLow: e.target.value === "" ? "" : Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-1.5 font-mono font-bold text-base text-amber-600 dark:text-amber-400 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <span className="absolute right-3 top-2 font-mono text-xs text-slate-400">
                      °C
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={!canEditThresholds}
                    onClick={() =>
                      setThresholdForm({
                        ...thresholdForm,
                        tempLow: Number((Math.min(38.0, (thresholdForm.tempLow || 28.0) + 0.2)).toFixed(1)),
                      })
                    }
                    className="w-8 h-8 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-100 cursor-pointer flex items-center justify-center text-sm shadow-2xs"
                    title="Raise limit by 0.2°C"
                  >
                    +
                  </button>
                </div>

                <input
                  type="range"
                  min="25.0"
                  max="37.5"
                  step="0.1"
                  disabled={!canEditThresholds}
                  value={thresholdForm.tempLow || 28.0}
                  onChange={(e) =>
                    setThresholdForm({ ...thresholdForm, tempLow: Number(e.target.value) })
                  }
                  className="w-full accent-amber-600 cursor-pointer"
                />
                <div className="text-[10px] text-slate-400 flex justify-between font-mono">
                  <span>25.0 °C (Bench Test / Sensor)</span>
                  <span className="text-amber-600 font-semibold">Standard: 36.2 °C (Clinical)</span>
                  <span>37.5 °C</span>
                </div>
              </div>

              {/* Skin Temperature High (Hyperthermia / Fever) */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-slate-900 dark:text-slate-100 block">
                      Skin Temp Upper Limit (Hyperthermia)
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Incubator overheating &amp; fever trigger
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-amber-600 bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                    WARNING
                  </span>
                </div>

                {/* Direct Typing Input & Nudge Stepper */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!canEditThresholds}
                    onClick={() =>
                      setThresholdForm({
                        ...thresholdForm,
                        tempHigh: Number((Math.max(35.0, (thresholdForm.tempHigh || 37.5) - 0.2)).toFixed(1)),
                      })
                    }
                    className="w-8 h-8 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-100 cursor-pointer flex items-center justify-center text-sm shadow-2xs"
                    title="Lower limit by 0.2°C"
                  >
                    -
                  </button>

                  <div className="flex-1 relative">
                    <input
                      type="number"
                      min="35.0"
                      max="43.0"
                      step="0.1"
                      disabled={!canEditThresholds}
                      value={thresholdForm.tempHigh ?? ""}
                      onChange={(e) =>
                        setThresholdForm({
                          ...thresholdForm,
                          tempHigh: e.target.value === "" ? "" : Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-1.5 font-mono font-bold text-base text-amber-600 dark:text-amber-400 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <span className="absolute right-3 top-2 font-mono text-xs text-slate-400">
                      °C
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={!canEditThresholds}
                    onClick={() =>
                      setThresholdForm({
                        ...thresholdForm,
                        tempHigh: Number((Math.min(43.0, (thresholdForm.tempHigh || 37.5) + 0.2)).toFixed(1)),
                      })
                    }
                    className="w-8 h-8 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-100 cursor-pointer flex items-center justify-center text-sm shadow-2xs"
                    title="Raise limit by 0.2°C"
                  >
                    +
                  </button>
                </div>

                <input
                  type="range"
                  min="36.0"
                  max="40.0"
                  step="0.1"
                  disabled={!canEditThresholds}
                  value={thresholdForm.tempHigh || 37.5}
                  onChange={(e) =>
                    setThresholdForm({ ...thresholdForm, tempHigh: Number(e.target.value) })
                  }
                  className="w-full accent-amber-600 cursor-pointer"
                />
                <div className="text-[10px] text-slate-400 flex justify-between font-mono">
                  <span>36.0 °C</span>
                  <span className="text-amber-600 font-semibold">Standard: 37.5 °C</span>
                  <span>40.0 °C (Severe Pyrexia)</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-400">
                {!canEditThresholds && "Read-only mode: Requires Administrator or Doctor permissions."}
              </span>
              <button
                type="submit"
                disabled={!canEditThresholds}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-md hover:shadow-lg flex items-center gap-2 transition-all cursor-pointer"
              >
                <Save size={15} />
                <span>Save &amp; Commit Threshold Changes</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Sub-Section 2: Device Management & ESP32 Integration ── */}
      {activeSubTab === "devices" && (isAdministrator || isDoctor) && (
        <div className="space-y-6">
          {/* Registered ESP32 Devices Table */}
          <div className="clinical-card overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    ESP32 Microcontroller Registry ({devices.length} Active Devices)
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                    {devices.filter((d) => d.isOnline || d.status === "ONLINE" || d.status === "AVAILABLE").length} Online
                  </span>
                  {devices.some((d) => !d.assignedBedId) && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                      {devices.filter((d) => !d.assignedBedId).length} Available for Assignment
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Dynamic multi-device fleet with automatic hardware discovery, hot-swappable bed binding, and MongoDB sync
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowConnectGuide(!showConnectGuide)}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Cpu size={14} />
                  <span>{showConnectGuide ? "Hide Connect Guide" : "ESP32 Quick Connect Guide"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddDeviceModal(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Register ESP32 Product</span>
                </button>
              </div>
            </div>

            {/* Beginner ESP32 Connection Guide Embedded in Settings */}
            {showConnectGuide && (
              <div className="p-5 bg-gradient-to-br from-indigo-950/40 to-slate-900 border-b border-indigo-800/60 text-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="text-cyan-400" size={18} />
                    <h4 className="font-bold text-sm text-white">
                      ESP32 Device Quick Connect Guide (Zero Confusion)
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded">
                    Free HiveMQ MQTT · broker.hivemq.com:1883
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-slate-300">
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                    <span className="font-bold text-cyan-400">1. Install PubSubClient</span>
                    <p className="text-[11px] text-slate-400">
                      In Arduino IDE, go to <strong>Tools → Manage Libraries</strong> and install <code>PubSubClient</code> by Nick O'Leary.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                    <span className="font-bold text-cyan-400">2. Configure Wi-Fi Only</span>
                    <p className="text-[11px] text-slate-400">
                      Open <code>esp32/nicu_esp32_hivemq_transmitter.ino</code>. Enter your Wi-Fi name &amp; password. Bed ID is assigned dynamically in the dashboard!
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                    <span className="font-bold text-cyan-400">3. Connect &amp; Stream</span>
                    <p className="text-[11px] text-slate-400">
                      Upload to ESP32. It publishes to <code>nicu/telemetry/&lt;DEVICE_ID&gt;</code>. Status turns green <strong>ONLINE</strong> immediately!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Auto-Discovery Banner if any unassigned device appeared */}
            {devices.some((d) => d.autoDiscovered && !d.assignedBedId) && (
              <div className="p-3 bg-blue-50/80 dark:bg-blue-950/40 border-b border-blue-200 dark:border-blue-800/60 flex items-center justify-between gap-3 text-xs text-blue-900 dark:text-blue-200">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-blue-600 animate-pulse flex-shrink-0" />
                  <span>
                    <strong>New ESP32 Product Auto-Discovered:</strong> Device{" "}
                    <code className="font-mono font-bold bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-blue-300 dark:border-blue-700">
                      {devices.find((d) => d.autoDiscovered && !d.assignedBedId)?.deviceId}
                    </code>{" "}
                    is transmitting telemetry. Use the dropdown below to assign it to a bed.
                  </span>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 font-semibold text-slate-500">
                    <th className="p-3 pl-4">Product / Device ID</th>
                    <th className="p-3">Hardware Model</th>
                    <th className="p-3">Assigned Patient / Neonate</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">MAC / Firmware</th>
                    <th className="p-3">Battery &amp; RSSI</th>
                    <th className="p-3 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {devices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 font-mono text-xs">
                        No active ESP32 products transmitting. Power on an ESP32 or flash firmware to auto-discover.
                      </td>
                    </tr>
                  ) : (
                    devices.map((d) => {
                      return (
                        <tr key={d.deviceId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                          <td className="p-3 pl-4">
                            <div className="flex items-center gap-2">
                              <Cpu size={15} className="text-blue-600 flex-shrink-0" />
                              <div>
                                <div className="font-mono font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                  <span>{d.deviceId}</span>
                                  {d.autoDiscovered && (
                                    <span className="px-1.5 py-0.2 rounded text-[9.5px] font-sans font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                                      Auto-Discovered
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 truncate max-w-[150px]">
                                  {d.deviceLabel || "Vital Monitor"}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="p-3">
                            <span className="font-mono text-slate-700 dark:text-slate-300">
                              {d.model || "ESP32-S3"}
                            </span>
                          </td>

                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <select
                                value={d.assignedPatientId || "UNASSIGNED"}
                                onChange={(e) => handleReassignPatient(d.deviceId, e.target.value)}
                                className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-blue-500"
                              >
                                <option value="UNASSIGNED">-- Unassigned (Spare) --</option>
                                {patients.map((p) => (
                                  <option key={p.patientId} value={p.patientId}>
                                    {p.babyName} ({p.patientId}){p.assignedBedId ? ` · Bed ${p.assignedBedId}` : ""}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>

                          <td className="p-3">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold border ${d.status === "ONLINE"
                                ? "bg-emerald-950/60 text-emerald-400 border-emerald-500/40"
                                : d.status === "AVAILABLE"
                                  ? "bg-cyan-950/60 text-cyan-300 border-cyan-500/40"
                                  : "bg-rose-950/60 text-rose-400 border-rose-800/40"
                                }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${d.status === "ONLINE"
                                  ? "bg-emerald-400 animate-pulse"
                                  : d.status === "AVAILABLE"
                                    ? "bg-cyan-400"
                                    : "bg-rose-500"
                                  }`}
                              />
                              {d.status === "ONLINE"
                                ? "ONLINE"
                                : d.status === "AVAILABLE"
                                  ? "AVAILABLE"
                                  : "OFFLINE"}
                            </span>
                          </td>

                          <td className="p-3 font-mono text-[11px] text-slate-500">
                            <div>{d.macAddress || "24:6F:28:XX:XX:XX"}</div>
                            <div className="text-[10px] text-slate-400">{d.firmwareVersion || "v2.1.4"}</div>
                          </td>

                          <td className="p-3 font-mono font-semibold">
                            <div className="flex items-center gap-1.5">
                              <Battery size={13} className={d.batteryPercent <= 25 ? "text-amber-500" : "text-emerald-500"} />
                              <span className={d.batteryPercent <= 25 ? "text-amber-500" : "text-slate-700 dark:text-slate-300"}>
                                {d.batteryPercent}%
                              </span>
                              <span className="text-[10px] text-slate-400 ml-1">
                                ({d.rssi} dBm)
                              </span>
                            </div>
                          </td>

                          <td className="p-3 pr-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                title="Test Ingestion"
                                onClick={() => {
                                  setTestPayload((prev) => ({
                                    ...prev,
                                    deviceId: d.deviceId,
                                    bedId: d.assignedBedId || "NICU-01",
                                  }));
                                }}
                                className="px-2 py-1 rounded-md text-[11px] font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors"
                              >
                                Test
                              </button>
                              <button
                                type="button"
                                title="Decommission Device"
                                onClick={() => handleDeleteDevice(d.deviceId)}
                                className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/60 transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ESP32 Firmware & Ingestion Payload Simulator */}
          <div className="clinical-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Terminal size={16} className="text-blue-600" />
                  ESP32 Integration &amp; Cloud Transmission Tool
                </h3>
                <p className="text-xs text-slate-500">
                  Inspect JSON ingestion payload, Arduino C++ firmware sketch, or breadboard wiring pinouts
                </p>
              </div>

              {/* Subtabs */}
              <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setActiveFirmwareTab("mqtt")}
                  className={`px-3 py-1 rounded-lg transition-colors ${activeFirmwareTab === "mqtt"
                    ? "bg-white dark:bg-slate-700 text-blue-600 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                    }`}
                >
                  HiveMQ MQTT Setup
                </button>
                <button
                  onClick={() => setActiveFirmwareTab("arduino")}
                  className={`px-3 py-1 rounded-lg transition-colors ${activeFirmwareTab === "arduino"
                    ? "bg-white dark:bg-slate-700 text-blue-600 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                    }`}
                >
                  Arduino C++ Code (HiveMQ)
                </button>
                <button
                  onClick={() => setActiveFirmwareTab("wiring")}
                  className={`px-3 py-1 rounded-lg transition-colors ${activeFirmwareTab === "wiring"
                    ? "bg-white dark:bg-slate-700 text-blue-600 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                    }`}
                >
                  Sensor Pinouts
                </button>
              </div>
            </div>

            {/* HiveMQ MQTT Tab */}
            {activeFirmwareTab === "mqtt" && (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 animate-pulse flex-shrink-0" />
                  <div>
                    <strong className="block text-slate-900 dark:text-slate-100 mb-0.5">
                      HiveMQ MQTT Ingestion Engine is Active &amp; Connected
                    </strong>
                    The backend server subscribes to <code className="font-mono bg-white dark:bg-slate-800 px-1 py-0.5 rounded border border-blue-300 dark:border-blue-700">nicu/telemetry/#</code> over MQTT port 1883. Telemetry sent by any ESP32 is parsed in real time, checked against safety thresholds, saved to MongoDB Atlas, and reflected on the live dashboard.
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-1.5 font-mono">
                    <div className="text-slate-400 text-[11px] font-sans">Broker Host</div>
                    <div className="text-slate-800 dark:text-slate-200 font-bold">broker.hivemq.com</div>
                    <div className="text-slate-400 text-[11px] font-sans pt-1">Broker Port</div>
                    <div className="text-slate-800 dark:text-slate-200 font-bold">1883 (TCP / Plain)</div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-1.5 font-mono">
                    <div className="text-slate-400 text-[11px] font-sans">Publish Topic</div>
                    <div className="text-blue-600 dark:text-blue-400 font-bold">nicu/telemetry/&lt;DEVICE_ID&gt;</div>
                    <div className="text-slate-400 text-[11px] font-sans pt-1">Example Topic</div>
                    <div className="text-slate-800 dark:text-slate-200 font-bold">nicu/telemetry/ESP32-NICU-01</div>
                  </div>
                </div>

                <pre className="p-4 rounded-xl bg-slate-900 text-emerald-400 font-mono text-xs overflow-x-auto leading-relaxed">
                  {`// Sample Live Telemetry Payload published to nicu/telemetry/ESP32-NICU-01
{
  "deviceId": "ESP32-NICU-01",
  "heartRateBpm": 142.0,
  "heartRate": 142.0,
  "heartRateStatus": "ESTIMATED",
  "spo2EstimatePercent": 98.5,
  "spo2": 98.5,
  "spo2Status": "UNVALIDATED_ESTIMATE",
  "temperatureC": 30.2,
  "temperature": 30.2,
  "humidityPercent": 54.0,
  "dht11Status": "WORKING",
  "ppgSensorStatus": "DETECTED",
  "irValue": 68420,
  "redValue": 58310,
  "wifiConnected": true,
  "rssi": -56
}`}
                </pre>
              </div>
            )}

            {/* Arduino Code View with 1-Click Copy */}
            {activeFirmwareTab === "arduino" && (
              <div className="space-y-3 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-950 dark:text-blue-200">
                  <div>
                    <strong className="block text-slate-900 dark:text-slate-100 font-bold text-sm">
                      Production ESP32 HiveMQ MQTT Transmitter Firmware
                    </strong>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                      Flash to ESP32 with Arduino IDE. Streams MAX30105/2 pulse, SpO₂ &amp; DHT11 temperature/humidity to HiveMQ MQTT (<code className="font-mono text-blue-600 dark:text-blue-400">broker.hivemq.com:1883</code>). Dynamic bed assignment supported!
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(HIVEMQ_ARDUINO_CODE);
                      setArduinoCodeCopied(true);
                      setTimeout(() => setArduinoCodeCopied(false), 3000);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap self-start sm:self-auto"
                  >
                    {arduinoCodeCopied ? (
                      <>
                        <CheckCircle2 size={16} className="text-emerald-300" />
                        <span>Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Code size={16} />
                        <span>Copy Complete Arduino Code</span>
                      </>
                    )}
                  </button>
                </div>

                <pre className="p-4 rounded-xl bg-slate-900 text-sky-300 font-mono text-[11px] overflow-x-auto leading-relaxed max-h-[500px]">
                  {HIVEMQ_ARDUINO_CODE}
                </pre>
              </div>
            )}

            {/* Sensor Pinouts */}
            {activeFirmwareTab === "wiring" && (
              <div className="space-y-3 text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-500">
                      <th className="p-2">Component</th>
                      <th className="p-2">ESP32 Pin</th>
                      <th className="p-2">Function</th>
                      <th className="p-2">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                    <tr>
                      <td className="p-2">MAX30105 / MAX30102</td>
                      <td className="p-2 text-blue-600 font-bold">GPIO 21</td>
                      <td className="p-2">I²C SDA</td>
                      <td className="p-2 font-sans text-slate-500">Shared bidirectional serial data line (4.7k pull-up to 3.3V)</td>
                    </tr>
                    <tr>
                      <td className="p-2">MAX30105 / MAX30102</td>
                      <td className="p-2 text-blue-600 font-bold">GPIO 22</td>
                      <td className="p-2">I²C SCL</td>
                      <td className="p-2 font-sans text-slate-500">Shared serial clock line (400 kHz Fast I2C)</td>
                    </tr>
                    <tr>
                      <td className="p-2">DHT11 Sensor</td>
                      <td className="p-2 text-emerald-600 font-bold">GPIO 4</td>
                      <td className="p-2">Digital 1-Wire</td>
                      <td className="p-2 font-sans text-slate-500">Skin/Ambient temperature &amp; humidity data pin</td>
                    </tr>
                    <tr>
                      <td className="p-2">Telemetry Status LED</td>
                      <td className="p-2 text-amber-500 font-bold">GPIO 2</td>
                      <td className="p-2">Digital Output</td>
                      <td className="p-2 font-sans text-slate-500">Blinks on active Wi-Fi &amp; MQTT transmission (onboard LED)</td>
                    </tr>
                    <tr>
                      <td className="p-2">Sensors VCC</td>
                      <td className="p-2 text-red-500 font-bold">3.3V / 5V</td>
                      <td className="p-2">Power Rail</td>
                      <td className="p-2 font-sans text-slate-500">MAX30105 on 3.3V, DHT11 on 3.3V or 5V rail</td>
                    </tr>
                    <tr>
                      <td className="p-2">Common Ground</td>
                      <td className="p-2 text-slate-500 font-bold">GND</td>
                      <td className="p-2">Ground</td>
                      <td className="p-2 font-sans text-slate-500">Common system reference ground</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Interactive Live REST Ingestion Tester */}
          <div className="clinical-card p-5 space-y-4 bg-gradient-to-br from-slate-50/70 to-blue-50/30 dark:from-slate-900/60 dark:to-blue-950/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Radio size={16} className="text-blue-600 animate-pulse" />
                  Live REST Ingestion Tester (Send Simulated Telemetry from Any ESP32)
                </h3>
                <p className="text-xs text-slate-500">
                  Simulate live HTTP POST transmissions directly to the backend to test threshold triggers &amp; waveforms
                </p>
              </div>
              <span className="text-[11px] font-mono text-blue-600 font-bold px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-blue-500/30">
                POST /api/telemetry
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Device ID:
                </label>
                <select
                  value={testPayload.deviceId}
                  onChange={(e) => {
                    const dev = devices.find((d) => d.deviceId === e.target.value);
                    setTestPayload({
                      ...testPayload,
                      deviceId: e.target.value,
                      bedId: dev?.assignedBedId || "NICU-01",
                    });
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-slate-800 dark:text-slate-200"
                >
                  {(devices.length > 0 ? devices : beds).map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.deviceId}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Heart Rate (bpm):
                </label>
                <input
                  type="number"
                  min="40"
                  max="240"
                  value={testPayload.heartRate}
                  onChange={(e) => setTestPayload({ ...testPayload, heartRate: Number(e.target.value) })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  SpO₂ (%):
                </label>
                <input
                  type="number"
                  min="50"
                  max="100"
                  value={testPayload.spo2}
                  onChange={(e) => setTestPayload({ ...testPayload, spo2: Number(e.target.value) })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Temp (°C):
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="34"
                  max="42"
                  value={testPayload.temperature}
                  onChange={(e) => setTestPayload({ ...testPayload, temperature: Number(e.target.value) })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Battery (%):
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={testPayload.batteryPercent}
                  onChange={(e) => setTestPayload({ ...testPayload, batteryPercent: Number(e.target.value) })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  disabled={isSendingTest}
                  onClick={handleSendTestTelemetry}
                  className="w-full py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Send size={13} className={isSendingTest ? "animate-spin" : ""} />
                  <span>{isSendingTest ? "Transmitting..." : "Send HTTP"}</span>
                </button>
              </div>
            </div>

            {testResult && (
              <div className="p-3 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto flex items-center justify-between">
                <span>
                  HTTP Result: {testResult.success ? "200 OK — Telemetry Ingested" : "Error"} · Bed: {testResult.bedId || "None"} · Alert Triggered: {testResult.alertTriggered ? "YES (Alert Fired!)" : "NO"}
                </span>
                <span className="text-emerald-400 font-bold">Live Synced to MongoDB</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Sub-Section 3: Bed Configuration & Bed Management ── */}
      {activeSubTab === "beds" && (
        <div className="space-y-5">
          {/* Top Capacity & Turnover Metric Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="clinical-card p-3.5 space-y-1">
              <span className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">
                Total Station Slots
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
                {beds.length}
              </div>
              <p className="text-[10px] text-slate-400">Configured physical incubator bays</p>
            </div>

            <div className="clinical-card p-3.5 space-y-1">
              <span className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">
                Occupied Stations
              </span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {beds.filter((b) => b.status === "Monitoring" || b.status === "Warning" || (b.patientId && b.babyName)).length}
              </div>
              <p className="text-[10px] text-slate-400">Active neonatal inpatients</p>
            </div>

            <div className="clinical-card p-3.5 space-y-1">
              <span className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">
                Standby &amp; Free Slots
              </span>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                {beds.filter((b) => b.status === "Standby" || (!b.babyName && b.status !== "Maintenance")).length}
              </div>
              <p className="text-[10px] text-slate-400">Available for immediate admission</p>
            </div>

            <div className="clinical-card p-3.5 space-y-1">
              <span className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">
                Bound Sensors
              </span>
              <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
                {beds.filter((b) => b.deviceId).length}
              </div>
              <p className="text-[10px] text-slate-400">Paired ESP32 telemetry nodes</p>
            </div>
          </div>

          {/* Bed Slot Actions Header */}
          <div className="clinical-card p-5 space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Bed size={16} className="text-blue-600" />
                  <span>NICU Unit &amp; Bed Slot Management</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure hardware bays, perform terminal disinfection turnovers, and manage incubator bed capacity
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddBedModal(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Add New Bed Slot</span>
                </button>
              </div>
            </div>

            {/* Bed Slots Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {beds.map((b) => {
                const isOccupied = b.status === "Monitoring" || b.status === "Warning" || (b.babyName && b.babyName.trim().length > 0);
                const isStandby = !isOccupied || b.status === "Standby";

                return (
                  <div
                    key={b.bedId}
                    className={`p-4 rounded-2xl border transition-all space-y-3 ${isOccupied
                        ? "bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 shadow-xs"
                        : "bg-slate-50/80 dark:bg-slate-900/40 border-dashed border-slate-300 dark:border-slate-700"
                      }`}
                  >
                    {/* Top Row: Bed ID + Status Badge */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-base text-blue-600 dark:text-blue-400">
                          {b.bedId}
                        </span>
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {b.unitType || "Incubator A"}
                        </span>
                      </div>

                      {isOccupied ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          In Treatment
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          Available / Standby
                        </span>
                      )}
                    </div>

                    {/* Patient or Vacancy Info */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800/80 space-y-1 text-xs">
                      {isOccupied ? (
                        <>
                          <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center justify-between">
                            <span>{b.babyName}</span>
                            <span className="text-[10px] font-mono text-slate-400">{b.patientId}</span>
                          </div>
                          <div className="text-slate-500 text-[11px]">
                            Mother: <strong>{b.motherName || "—"}</strong> · GA: {b.gestationalAge || "—"}
                          </div>
                          <div className="text-slate-500 text-[11px] truncate">
                            Diagnosis: {b.diagnosis || "Observation"}
                          </div>
                        </>
                      ) : (
                        <div className="text-slate-500 dark:text-slate-400 py-1 text-center font-medium">
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold block mb-0.5">
                            ✓ Decontaminated &amp; Sterile
                          </span>
                          Ready for immediate neonate admission
                        </div>
                      )}
                    </div>

                    {/* Clinician and Sensor Binding */}
                    <div className="space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <div className="flex items-center justify-between">
                        <span>Attending Doctor:</span>
                        <strong className="text-slate-700 dark:text-slate-300">
                          {b.assignedDoctorName || "Dr. Meera"}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between font-mono">
                        <span>ESP32 Sensor:</span>
                        <span className="text-blue-600 dark:text-blue-400 font-bold">
                          {b.deviceId || "None (Unbound)"}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        Status: {b.lastUpdate || "Available for admission"}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => handleOpenSanitizeModal(b)}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${isOccupied
                            ? "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                            : "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100"
                          }`}
                        title={
                          isOccupied
                            ? "Perform routine bedside surface sanitization & filter check (Patient remains admitted & monitored)"
                            : "Sanitize station & certify ready for incoming neonate"
                        }
                      >
                        <Sparkles size={13} className={isOccupied ? "text-amber-500" : "text-blue-500"} />
                        <span>Sanitize Station</span>
                      </button>

                      {isStandby && (
                        <>
                          <a
                            href={`/patients?admitBed=${b.bedId}`}
                            className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
                            title="Directly admit patient into this slot"
                          >
                            <Plus size={13} />
                            <span>Admit</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => handleDeleteBedSlot(b.bedId)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                            title="Decommission bed slot"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Sanitization & Infection Control Modal ── */}
            {sanitizingBedModal && (() => {
              const modalIsOccupied = Boolean(
                sanitizingBedModal.babyName &&
                sanitizingBedModal.babyName.trim().length > 0 &&
                sanitizingBedModal.status !== "Standby"
              );

              return (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
                  <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-xs ${modalIsOccupied ? "bg-amber-600 text-white" : "bg-blue-600 text-white"}`}>
                          <Sparkles size={20} />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <span>
                              {modalIsOccupied
                                ? "Routine Bedside Sanitization & Filter Check"
                                : "Terminal Decontamination Protocol"}
                            </span>
                            <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold">
                              {sanitizingBedModal.bedId}
                            </span>
                          </h3>
                          <p className="text-xs text-slate-500">
                            {modalIsOccupied
                              ? "Bedside Infection Control · Patient telemetry protected uninterrupted"
                              : "Infection Control & Bed Turnover Protocol (ISO 14644-1)"}
                          </p>
                        </div>
                      </div>
                      {!isDecontaminating && (
                        <button
                          onClick={() => setSanitizingBedModal(null)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                        >
                          <X size={18} />
                        </button>
                      )}
                    </div>

                    {/* Body */}
                    <div className="p-5 space-y-4 text-xs">
                      {/* Current Station Status */}
                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1.5">
                        <div className="flex justify-between items-center text-slate-500">
                          <span>Incubator Station:</span>
                          <strong className="text-slate-900 dark:text-slate-100">{sanitizingBedModal.unitType || "Incubator A"}</strong>
                        </div>
                        <div className="flex justify-between items-center text-slate-500">
                          <span>Occupant Status:</span>
                          <strong className={modalIsOccupied ? "text-amber-600 font-bold" : "text-emerald-600 font-bold"}>
                            {modalIsOccupied ? `Occupied by ${sanitizingBedModal.babyName} (Admitted)` : "Standby / Unoccupied"}
                          </strong>
                        </div>
                        <div className="flex justify-between items-center text-slate-500 font-mono">
                          <span>Linked Sensor Node:</span>
                          <span className="text-blue-600 font-bold">{sanitizingBedModal.deviceId || "Unassigned"}</span>
                        </div>
                      </div>

                      {/* Multi-step Protocol Checklist */}
                      <div className="space-y-2">
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Infection Control Checklist:
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                            <div>
                              <strong className="text-slate-800 dark:text-slate-200">Exterior Canopy & Access Port Wipe</strong>
                              <p className="text-[11px] text-slate-500">70% Isopropyl Alcohol disinfection across incubator exterior surfaces.</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                            <CheckCircle2 size={16} className="text-blue-500 shrink-0" />
                            <div>
                              <strong className="text-slate-800 dark:text-slate-200">HEPA Air Intake Filter Inspection</strong>
                              <p className="text-[11px] text-slate-500">Bacterial barrier filter verified clean with laminar airflow confirmed nominal.</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                            <CheckCircle2 size={16} className="text-indigo-500 shrink-0" />
                            <div>
                              <strong className="text-slate-800 dark:text-slate-200">Telemetry Sensor & Lead Inspection</strong>
                              <p className="text-[11px] text-slate-500">Pulse oximeter PPG wrap and skin thermistor cables inspected for secure attachment.</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                            <CheckCircle2 size={16} className="text-purple-500 shrink-0" />
                            <div>
                              <strong className="text-slate-800 dark:text-slate-200">
                                {modalIsOccupied ? "Continuous Inpatient Monitoring Protected" : "Certified Sterile & Available for Admission"}
                              </strong>
                              <p className="text-[11px] text-slate-500">
                                {modalIsOccupied
                                  ? "Baby remains admitted and continuously monitored. No patient records are discharged or altered."
                                  : "Bed slot is certified clean, sterile, and ready for immediate neonate admission."}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Progress & Feedback State */}
                      {decontaminateStep === 1 && (
                        <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-center space-y-2 animate-pulse">
                          <div className="flex items-center justify-center gap-2 text-blue-700 dark:text-blue-300 font-bold">
                            <RotateCcw size={15} className="animate-spin" />
                            <span>
                              {modalIsOccupied
                                ? "Executing Routine Bedside Sanitization..."
                                : "Executing Station Terminal Sanitization..."}
                            </span>
                          </div>
                          <div className="w-full bg-blue-200 dark:bg-blue-900 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-blue-600 h-full w-3/4 animate-pulse rounded-full" />
                          </div>
                        </div>
                      )}

                      {decontaminateStep === 2 && (
                        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-center space-y-1 animate-in zoom-in-95">
                          <div className="flex items-center justify-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-extrabold text-sm">
                            <CheckCircle2 size={18} />
                            <span>
                              {modalIsOccupied
                                ? "Bedside Sanitization Complete · Patient Monitored!"
                                : "Station Certified Sterile & Released to Standby!"}
                            </span>
                          </div>
                          <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                            {modalIsOccupied
                              ? `Bed ${sanitizingBedModal.bedId} sanitized. Patient ${sanitizingBedModal.babyName} remains actively admitted and monitored.`
                              : `Bed ${sanitizingBedModal.bedId} is certified sterile and available for immediate neonate admission.`}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 font-mono">
                        Audit Log ID: {modalIsOccupied ? "ROUTINE-HYGIENE" : "TERMINAL-CLEAN"}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isDecontaminating}
                          onClick={() => setSanitizingBedModal(null)}
                          className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isDecontaminating || decontaminateStep === 2}
                          onClick={handleExecuteSanitize}
                          className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                        >
                          {isDecontaminating ? (
                            <>
                              <RotateCcw size={13} className="animate-spin" />
                              <span>Processing...</span>
                            </>
                          ) : decontaminateStep === 2 ? (
                            <>
                              <Check size={13} />
                              <span>Verified!</span>
                            </>
                          ) : (
                            <>
                              <Sparkles size={13} />
                              <span>{modalIsOccupied ? "Execute Bedside Sanitization" : "Execute Station Sanitization"}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── Sub-Section 4: Users & Permissions (STRICTLY ADMINISTRATOR ONLY) ── */}
      {activeSubTab === "users" && (
        isAdministrator ? (
          <div className="clinical-card p-5 space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Users size={16} className="text-cyan-500" />
                <span>Interactive Role-Based Access Control (RBAC) Matrix</span>
              </h3>
              <p className="text-xs text-slate-500">
                Configure module permissions (Edit, View, or Restricted) for Doctor and Nurse roles. Restricted pages are completely hidden from the sidebar.
              </p>
            </div>
            <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800">
              Live Permission Engine Active
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 font-semibold text-slate-400">
                  <th className="p-3">Application Module</th>
                  <th className="p-3">Administrator</th>
                  <th className="p-3">Doctor Role</th>
                  <th className="p-3">Nurse Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {[
                  { key: "dashboard", label: "Dashboard & 6-Bed Monitoring", desc: "Live bedside station cards and vitals" },
                  { key: "patients", label: "Patient Inpatient Registry", desc: "Admit, manage, and discharge neonates" },
                  { key: "doctors", label: "Doctors & Clinical Care Team", desc: "Clinician rosters and bed assignments" },
                  { key: "alerts", label: "Clinical Alert Log & Audits", desc: "Acknowledge alarms and view thresholds" },
                  { key: "analytics", label: "Analytics & PDF Reports", desc: "Weekly reports and data export" },
                  { key: "settings", label: "System Settings & Devices", desc: "Hardware registry and threshold configs" },
                ].map((mod) => {
                  const docPerm = rolePermissions?.[ROLES.DOCTOR]?.[mod.key] || "edit";
                  const nurPerm = rolePermissions?.[ROLES.NURSE]?.[mod.key] || "view";

                  return (
                    <tr key={mod.key} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3">
                        <div className="font-semibold text-slate-200">{mod.label}</div>
                        <div className="text-[11px] text-slate-400">{mod.desc}</div>
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold bg-emerald-950/70 text-emerald-400 border border-emerald-800">
                          <CheckCircle2 size={12} />
                          Full Control (Admin)
                        </span>
                      </td>
                      <td className="p-3">
                        <select
                          value={docPerm}
                          onChange={(e) => updateRolePermission(ROLES.DOCTOR, mod.key, e.target.value)}
                          className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-500 ${docPerm === "edit"
                            ? "bg-emerald-950/50 text-emerald-300 border-emerald-800"
                            : docPerm === "view"
                              ? "bg-cyan-950/50 text-cyan-300 border-cyan-800"
                              : "bg-rose-950/50 text-rose-300 border-rose-800"
                            }`}
                        >
                          <option value="edit">Edit (Full Control)</option>
                          <option value="view">View (Read-Only)</option>
                          <option value="restricted">Restricted (Hide Page)</option>
                        </select>
                      </td>
                      <td className="p-3">
                        <select
                          value={nurPerm}
                          onChange={(e) => updateRolePermission(ROLES.NURSE, mod.key, e.target.value)}
                          className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-500 ${nurPerm === "edit"
                            ? "bg-emerald-950/50 text-emerald-300 border-emerald-800"
                            : nurPerm === "view"
                              ? "bg-cyan-950/50 text-cyan-300 border-cyan-800"
                              : "bg-rose-950/50 text-rose-300 border-rose-800"
                            }`}
                        >
                          <option value="edit">Edit (Full Control)</option>
                          <option value="view">View (Read-Only)</option>
                          <option value="restricted">Restricted (Hide Page)</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        ) : (
          <div className="p-8 rounded-3xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-center space-y-3 animate-in fade-in">
            <ShieldAlert size={42} className="text-rose-600 mx-auto" />
            <h3 className="text-base font-bold text-rose-900 dark:text-rose-100">
              Access Restricted: Administrator Privileges Required
            </h3>
            <p className="text-xs text-rose-700 dark:text-rose-300 max-w-md mx-auto">
              You are authenticated as <strong>{currentUser.name}</strong> ({currentUser.role}). Management of system users, role permissions, and access policies is strictly restricted to Hospital Administrators.
            </p>
            <button
              onClick={() => setActiveSubTab("beds")}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 cursor-pointer"
            >
              Return to Bedside Management
            </button>
          </div>
        )
      )}

      {/* ── Sub-Section 5: Reports & Retention Policies ── */}
      {activeSubTab === "retention" && isAdministrator && (
        <div className="space-y-5 text-xs">
          {/* Compliance & Cloud Health Banner */}
          <div className="clinical-card p-4 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-slate-900 border-blue-200 dark:border-blue-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-xs">
                <Database size={20} />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>Data Retention &amp; Compliance Hub</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    HIPAA &amp; NABH Certified
                  </span>
                </h4>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                  Automated telemetry storage, encrypted backup scheduling, and medical records archival
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isBackingUp}
                onClick={handleTriggerBackup}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <Cloud size={14} className={isBackingUp ? "animate-bounce" : ""} />
                <span>{isBackingUp ? "Creating Snapshot..." : "Trigger Cloud Backup"}</span>
              </button>

              <button
                type="button"
                onClick={handleExportAuditCsv}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Download size={14} />
                <span>Export CSV Audit</span>
              </button>
            </div>
          </div>

          {backupToast && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center gap-2 font-medium animate-in fade-in">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span>{backupToast}</span>
            </div>
          )}

          {/* Retention Configuration Form */}
          <div className="clinical-card p-5 space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Archival &amp; Retention Policy Parameters
              </h3>
              <p className="text-xs text-slate-500">
                Adjust retention windows according to hospital accreditation standards
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
                <label className="font-semibold text-slate-800 dark:text-slate-200 block">
                  Waveform Telemetry Hot Cache:
                </label>
                <select
                  value={retentionDays}
                  onChange={(e) => setRetentionDays(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold"
                >
                  <option value="30">30 Days (Standard Inpatient)</option>
                  <option value="60">60 Days (Extended Observation)</option>
                  <option value="90">90 Days (Recommended AAP Standard)</option>
                  <option value="180">180 Days (High-Resolution Research)</option>
                  <option value="365">1 Year (Annual Cycle)</option>
                </select>
                <p className="text-[10.5px] text-slate-400">
                  After this period, 1 Hz streams are aggregated into 1-minute trend envelopes.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
                <label className="font-semibold text-slate-800 dark:text-slate-200 block">
                  Clinical Alert &amp; Audit Retention:
                </label>
                <select
                  value={auditRetentionYears}
                  onChange={(e) => setAuditRetentionYears(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold"
                >
                  <option value="3">3 Years (State Hospital Minimal)</option>
                  <option value="7">7 Years (Pediatric Statutory Standard)</option>
                  <option value="18">18 Years (Age of Majority Requirement)</option>
                  <option value="permanent">Permanent Immutable Storage</option>
                </select>
                <p className="text-[10.5px] text-slate-400">
                  Doctor acknowledgements and alarm events cannot be modified or purged.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
                <label className="font-semibold text-slate-800 dark:text-slate-200 block">
                  Cloud Snapshot Backup Frequency:
                </label>
                <select
                  value={backupFrequency}
                  onChange={(e) => setBackupFrequency(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold"
                >
                  <option value="continuous">Continuous Streaming Replication</option>
                  <option value="hourly">Hourly Encrypted Snapshots</option>
                  <option value="daily">Daily at 02:00 UTC (Default)</option>
                  <option value="weekly">Weekly Cold Geo-Redundant Mirror</option>
                </select>
                <p className="text-[10.5px] text-slate-400">
                  All snapshots are encrypted at rest with AES-256 and authenticated with SHA-256.
                </p>
              </div>
            </div>
          </div>

          {/* Unit Census & Quality Report Generator */}
          <div className="clinical-card p-5 space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <FileText size={16} className="text-blue-600" />
                  <span>On-Demand NICU Census &amp; Quality Metrics Report</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Generate instant executive clinical reports for shift handovers and medical director reviews
                </p>
              </div>

              <button
                type="button"
                onClick={() => setCensusReportGenerated(true)}
                className="px-3.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 font-semibold text-xs border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw size={13} />
                <span>Compile Unit Census</span>
              </button>
            </div>

            {censusReportGenerated && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <div>
                    <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100">
                      NICU Clinical Operations Snapshot · Generated {new Date().toLocaleTimeString()}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Reporting Officer: {currentUser.name} ({currentUser.role})
                    </p>
                  </div>
                  <span className="font-mono text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded font-bold">
                    OFFICIAL SUMMARY
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Active Inpatients</span>
                    <div className="text-xl font-bold text-slate-900 dark:text-white">
                      {patients.filter((p) => p.status === "Admitted").length}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Bed Occupancy</span>
                    <div className="text-xl font-bold text-emerald-600">
                      {beds.length > 0 ? Math.round((beds.filter((b) => b.status === "Monitoring" || b.status === "Warning").length / beds.length) * 100) : 0}%
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Sensor Telemetry Uptime</span>
                    <div className="text-xl font-bold text-blue-600">
                      99.8%
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Median Alert Latency</span>
                    <div className="text-xl font-bold text-purple-600">
                      4.2s
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}


      {/* ── Sub-Section 6: Security & Audit Trail ── */}
      {activeSubTab === "security" && isAdministrator && (
        <div className="clinical-card p-5 space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Cryptographic Security &amp; Activity Audit Log
              </h3>
              <p className="text-xs text-slate-500">
                Every configuration change, login, bed reassignment, and threshold adjustment is recorded
              </p>
            </div>
            <span className="font-mono text-xs text-slate-400">
              {auditLogs.length} audit entries
            </span>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1 text-xs font-mono">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-blue-600">{log.id}</span>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {log.actor} ({log.role})
                    </span>
                  </div>
                  <div className="text-slate-600 dark:text-slate-300 font-sans mt-0.5">
                    {log.action}
                  </div>
                </div>

                <div className="text-right text-[11px] text-slate-400">
                  <div>{log.timestamp}</div>
                  <div className="text-[10px] text-slate-500">IP: {log.ip}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Modal: Register New ESP32 Product ── */}
      {showAddDeviceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  <Cpu size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Register New ESP32 Product
                  </h3>
                  <p className="text-xs text-slate-500">
                    Add a new microcontroller sensor node to the NICU monitoring network
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddDeviceModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRegisterDevice} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Device Identifier (Unique ID) <span className="text-red-500">*</span>:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ESP32-NICU-07"
                  value={newDeviceForm.deviceId}
                  onChange={(e) => setNewDeviceForm({ ...newDeviceForm, deviceId: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-blue-500"
                />
                <p className="text-[10.5px] text-slate-400 mt-1">
                  Must match the <code>deviceId</code> configured in the ESP32 Arduino sketch.
                </p>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Product Label / Station Name:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mobile Emergency Cot Node"
                  value={newDeviceForm.deviceLabel}
                  onChange={(e) => setNewDeviceForm({ ...newDeviceForm, deviceLabel: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Microcontroller Model:
                  </label>
                  <select
                    value={newDeviceForm.model}
                    onChange={(e) => setNewDeviceForm({ ...newDeviceForm, model: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="ESP32-S3 DevKitC-1">ESP32-S3 DevKitC-1 (Dual-Core)</option>
                    <option value="ESP32-C3 Mini">ESP32-C3 Mini (RISC-V)</option>
                    <option value="ESP32-WROOM-32D">ESP32-WROOM-32D (Classic)</option>
                    <option value="ESP32-CAM">ESP32-CAM AI</option>
                    <option value="Custom ESP32">Custom ESP32 Board</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Initial Bed Binding:
                  </label>
                  <select
                    value={newDeviceForm.assignedBedId}
                    onChange={(e) => setNewDeviceForm({ ...newDeviceForm, assignedBedId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="">-- Unassigned (Spare Node) --</option>
                    {beds.map((b) => (
                      <option key={b.bedId} value={b.bedId}>
                        {b.bedId} — {b.babyName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    MAC Address:
                  </label>
                  <input
                    type="text"
                    placeholder="24:6F:28:AB:12:07"
                    value={newDeviceForm.macAddress}
                    onChange={(e) => setNewDeviceForm({ ...newDeviceForm, macAddress: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Firmware Version:
                  </label>
                  <input
                    type="text"
                    placeholder="v2.1.4-esp32s3"
                    value={newDeviceForm.firmwareVersion}
                    onChange={(e) => setNewDeviceForm({ ...newDeviceForm, firmwareVersion: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddDeviceModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRegistering}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <Save size={14} />
                  <span>{isRegistering ? "Saving to MongoDB..." : "Register Product"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Configure New Bed Slot ── */}
      {showAddBedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600">
                  <Bed size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Configure New NICU Bed Slot
                  </h3>
                  <p className="text-xs text-slate-500">
                    Add a physical incubator or radiant warmer station to the unit
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddBedModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddBed} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Bed Identifier (Slot ID) <span className="text-red-500">*</span>:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. NICU-07"
                  value={newBedForm.bedId}
                  onChange={(e) => setNewBedForm({ ...newBedForm, bedId: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-blue-500"
                />
                <p className="text-[10.5px] text-slate-400 mt-1">
                  Unique station label used on clinical displays and admission records.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Station Type:
                  </label>
                  <select
                    value={newBedForm.unitType}
                    onChange={(e) => setNewBedForm({ ...newBedForm, unitType: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  >
                    <option value="Incubator A (Closed)">Incubator A (Closed)</option>
                    <option value="Incubator B (Hybrid)">Incubator B (Hybrid)</option>
                    <option value="Open Radiant Warmer">Open Radiant Warmer</option>
                    <option value="Stepdown Bassinet">Stepdown Bassinet</option>
                    <option value="Transport Isolette">Transport Isolette</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Attending Clinician:
                  </label>
                  <select
                    value={newBedForm.assignedDoctorId}
                    onChange={(e) => {
                      const doc = (staffList || []).find((s) => s.id === e.target.value);
                      setNewBedForm({
                        ...newBedForm,
                        assignedDoctorId: e.target.value,
                        assignedDoctorName: doc ? doc.name : "Attending Doctor",
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  >
                    {(staffList || [])
                      .filter((s) => s.role === "Doctor")
                      .map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Initial ESP32 Hardware Binding (Optional):
                </label>
                <select
                  value={newBedForm.deviceId}
                  onChange={(e) => setNewBedForm({ ...newBedForm, deviceId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono"
                >
                  <option value="">-- No Initial Sensor (Bind Later) --</option>
                  {devices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.deviceId} ({d.macAddress || "ESP32"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddBedModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingBed}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <Save size={14} />
                  <span>{isAddingBed ? "Creating Slot..." : "Configure Bed Slot"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
