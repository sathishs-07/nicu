// =============================================================
// nicuData.js — NICU System Constants & Reference Data
// NOTE: INITIAL_BEDS, INITIAL_STAFF, INITIAL_ALERTS_LOG, AUDIT_TRAIL
//       have been removed. All live data comes from MongoDB via backend.
//       Only default thresholds and static analytics reference data remain.
// =============================================================

// ─── Default Clinical Safety Thresholds ───────────────────────
export const DEFAULT_THRESHOLDS = {
  hrLow: 100,      // bpm - neonatal bradycardia limit
  hrHigh: 180,     // bpm - neonatal tachycardia limit
  spo2Low: 90,     // % - neonatal desaturation limit
  tempLow: 28.0,   // °C - lower skin temp limit (started from above 25°C, supports ~30°C sensor)
  tempHigh: 37.5,  // °C - neonatal hyperthermia limit
  persistenceSeconds: 5, // seconds before alert triggers
};

// ─── Weekly Analytics Reference Data ──────────────────────────
// Shown on Analytics page as historical trend reference.
// In production this would come from aggregated MongoDB readings.
export const WEEKLY_ANALYTICS_DATA = [
  { day: "Mon", date: "—", totalAlerts: 0, hrAlerts: 0, spo2Alerts: 0, tempAlerts: 0, sensorFaults: 0, completeness: 0, avgLatencyMs: 0 },
  { day: "Tue", date: "—", totalAlerts: 0, hrAlerts: 0, spo2Alerts: 0, tempAlerts: 0, sensorFaults: 0, completeness: 0, avgLatencyMs: 0 },
  { day: "Wed", date: "—", totalAlerts: 0, hrAlerts: 0, spo2Alerts: 0, tempAlerts: 0, sensorFaults: 0, completeness: 0, avgLatencyMs: 0 },
  { day: "Thu", date: "—", totalAlerts: 0, hrAlerts: 0, spo2Alerts: 0, tempAlerts: 0, sensorFaults: 0, completeness: 0, avgLatencyMs: 0 },
  { day: "Fri", date: "—", totalAlerts: 0, hrAlerts: 0, spo2Alerts: 0, tempAlerts: 0, sensorFaults: 0, completeness: 0, avgLatencyMs: 0 },
  { day: "Sat", date: "—", totalAlerts: 0, hrAlerts: 0, spo2Alerts: 0, tempAlerts: 0, sensorFaults: 0, completeness: 0, avgLatencyMs: 0 },
  { day: "Sun", date: "—", totalAlerts: 0, hrAlerts: 0, spo2Alerts: 0, tempAlerts: 0, sensorFaults: 0, completeness: 0, avgLatencyMs: 0 },
];

// ─── Bed Efficiency Metrics ────────────────────────────────────
// Populated dynamically from live readings in production.
export const BED_EFFICIENCY_METRICS = [];
