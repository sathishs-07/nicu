// =============================================================
// api.js — Frontend Backend Integration Service
// Communicates with Express & MongoDB Backend
// Returns null/empty arrays on failure (no dummy data fallback).
// =============================================================

export function getApiBaseUrl() {
  if (typeof window !== "undefined") {
    const custom = localStorage.getItem("nicu_api_base_url");
    if (custom) return custom.replace(/\/$/, "");
  }
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace(/\/$/, "");
  }
  if (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
    // Default to production cloud backend on Render
    return "https://ncms-g36g.onrender.com/api";
  }
  return "http://localhost:5000/api";
}

export function setApiBaseUrl(url) {
  if (typeof window !== "undefined") {
    if (url) {
      localStorage.setItem("nicu_api_base_url", url.trim());
      localStorage.setItem("nicu_cloud_backend_url", url.trim());
    } else {
      localStorage.removeItem("nicu_api_base_url");
      localStorage.removeItem("nicu_cloud_backend_url");
    }
  }
}

export function isCloudDeployment() {
  if (typeof window === "undefined") return false;
  return window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1";
}

// Helper for safe fetch with timeout — returns null on failure
async function safeFetch(endpoint, options = {}) {
  try {
    const baseUrl = getApiBaseUrl();
    if (!baseUrl) {
      // Cloud deployment with no backend endpoint configured: use local storage cache gracefully
      return null;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errorJson = await res.json().catch(() => ({}));
      throw new Error(errorJson.error || `HTTP ${res.status}: ${res.statusText}`);
    }

    return await res.json();
  } catch (err) {
    // Surface error for mutations, suppress for polling reads
    if (options.method && options.method !== "GET") {
      throw err;
    }
    return null;
  }
}

export const api = {
  // ─── Auth ──────────────────────────────────────────
  login: async (username, password) => {
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");
    return data;
  },

  // ─── Health ────────────────────────────────────────
  checkHealth: async () => {
    return safeFetch("/health");
  },

  // ─── Patients (Admission & Discharge Management) ───
  getPatients: async (status) => {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    const data = await safeFetch(`/patients${query}`);
    return data || [];
  },

  getPatient: async (patientId) => {
    return safeFetch(`/patients/${encodeURIComponent(patientId)}`);
  },

  admitPatient: async (patientData) => {
    return safeFetch("/patients", {
      method: "POST",
      body: JSON.stringify(patientData),
    });
  },

  updatePatient: async (patientId, updateData) => {
    return safeFetch(`/patients/${encodeURIComponent(patientId)}`, {
      method: "PUT",
      body: JSON.stringify(updateData),
    });
  },

  dischargePatient: async (patientId, dischargeData) => {
    return safeFetch(`/patients/${encodeURIComponent(patientId)}/discharge`, {
      method: "POST",
      body: JSON.stringify(dischargeData),
    });
  },

  deletePatient: async (patientId) => {
    return safeFetch(`/patients/${encodeURIComponent(patientId)}`, {
      method: "DELETE",
    });
  },

  // ─── Beds ──────────────────────────────────────────
  getBeds: async () => {
    const data = await safeFetch("/beds");
    return data || [];
  },

  createBed: async (bedData) => {
    return safeFetch("/beds", {
      method: "POST",
      body: JSON.stringify(bedData),
    });
  },

  updateBed: async (bedId, updateData) => {
    return safeFetch(`/beds/${bedId}`, {
      method: "PUT",
      body: JSON.stringify(updateData),
    });
  },

  deleteBed: async (bedId) => {
    return safeFetch(`/beds/${bedId}`, {
      method: "DELETE",
    });
  },

  sanitizeBed: async (bedId, details = {}) => {
    return safeFetch(`/beds/${bedId}/sanitize`, {
      method: "POST",
      body: JSON.stringify(details),
    });
  },

  addClinicalNote: async (bedId, noteData) => {
    return safeFetch(`/beds/${bedId}/notes`, {
      method: "POST",
      body: JSON.stringify(noteData),
    });
  },

  // ─── MQTT Test Publish ─────────────────────────────
  testPublishMqtt: async (payload) => {
    return safeFetch("/mqtt/test-publish", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // ─── Staff ─────────────────────────────────────────
  getStaff: async () => {
    const data = await safeFetch("/staff");
    return data || [];
  },

  createStaff: async (staffData) => {
    return safeFetch("/staff", {
      method: "POST",
      body: JSON.stringify(staffData),
    });
  },

  deleteStaff: async (staffId) => {
    return safeFetch(`/staff/${staffId}`, {
      method: "DELETE",
    });
  },

  updateStaffAvailability: async (staffId, availability) => {
    return safeFetch(`/staff/${staffId}/availability`, {
      method: "PUT",
      body: JSON.stringify({ availability }),
    });
  },

  // ─── Alerts ────────────────────────────────────────
  getAlerts: async () => {
    const data = await safeFetch("/alerts");
    return data || [];
  },

  acknowledgeAlert: async (alertId, actor) => {
    return safeFetch(`/alerts/${alertId}/acknowledge`, {
      method: "POST",
      body: JSON.stringify({ actor }),
    });
  },

  resolveAlert: async (alertId, notes, actor) => {
    return safeFetch(`/alerts/${alertId}/resolve`, {
      method: "POST",
      body: JSON.stringify({ notes, actor }),
    });
  },

  // ─── ESP32 Telemetry (REST) ────────────────────────
  sendTelemetry: async (payload) => {
    return safeFetch("/telemetry", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // ─── ESP32 Device Registry ─────────────────────────
  getDevices: async () => {
    const data = await safeFetch("/devices");
    return data || [];
  },

  registerDevice: async (deviceData) => {
    return safeFetch("/devices", {
      method: "POST",
      body: JSON.stringify(deviceData),
    });
  },

  assignDevice: async (deviceId, targetId) => {
    return safeFetch(`/devices/${deviceId}/assign`, {
      method: "PUT",
      body: JSON.stringify({ patientId: targetId, bedId: targetId }),
    });
  },

  updateDevice: async (deviceId, updateData) => {
    return safeFetch(`/devices/${deviceId}`, {
      method: "PUT",
      body: JSON.stringify(updateData),
    });
  },

  deleteDevice: async (deviceId) => {
    return safeFetch(`/devices/${deviceId}`, {
      method: "DELETE",
    });
  },

  // ─── Settings & Thresholds ─────────────────────────
  getSettings: async () => {
    return safeFetch("/settings");
  },

  updateThresholds: async (thresholds, actor, role) => {
    return safeFetch("/settings/thresholds", {
      method: "PUT",
      body: JSON.stringify({ ...thresholds, actor, role }),
    });
  },

  // ─── Audit Trail ───────────────────────────────────
  getAuditLogs: async () => {
    const data = await safeFetch("/audit");
    return data || [];
  },

  // ─── Real Sensor Telemetry Analytics & Historical Readings ─
  getAnalytics: async (timeframe = "7d") => {
    return safeFetch(`/analytics?timeframe=${encodeURIComponent(timeframe)}`);
  },

  getReadings: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const data = await safeFetch(`/readings${query ? `?${query}` : ""}`);
    return data || [];
  },
};
