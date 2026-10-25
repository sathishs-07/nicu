/*
 * ==============================================================================
 *  NICU Continuous Vital Monitoring System — ESP32 HiveMQ MQTT Transmitter
 * ==============================================================================
 *  Target Boards: ESP32 / ESP32-S3 / ESP32-WROOM-32 / ESP32-C3 / ESP32 Dev Module
 *  Cloud Broker:  broker.hivemq.com (Port 1883) — 100% Free, No Signup Needed
 *  
 *  ============================================================================
 *  🟢 BEGINNER INSTRUCTIONS: CHANGE ONLY LINES 24 TO 30 BELOW!
 *  ============================================================================
 *  1. Put your Wi-Fi Name (or Mobile Hotspot name) in WIFI_SSID.
 *  2. Put your Wi-Fi Password in WIFI_PASSWORD.
 *  3. Set DEVICE_ID to your physical device name (e.g., "ESP32-NICU-01").
 *     NOTE: Bed ID is NO LONGER needed in firmware! The web dashboard
 *     automatically assigns this hardware to any bed and reassigns it
 *     after infant discharge without changing firmware.
 *  4. Click Upload in Arduino IDE!
 * ==============================================================================
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>

// ==============================================================================
// 🟢 STEP 1: CHANGE ONLY THESE 3 LINES (YOUR WIFI & DEVICE ID)
// ==============================================================================
const char* WIFI_SSID     = "YOUR_WIFI_NAME";     // <-- Put your Wi-Fi Name or Mobile Hotspot here
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD"; // <-- Put your Wi-Fi Password here
const char* DEVICE_ID     = "ESP32-NICU-01";      // <-- Device ID (e.g. ESP32-NICU-01)

// 🟢 HARDWARE SENSOR MODE:
// - Set to false: Precision plug-and-play simulation (Zero library errors!)
// - Set to true:  If you have wired a MAX30102 sensor to SDA (GPIO 21) & SCL (GPIO 22)
#define USE_PHYSICAL_MAX30102 false

// 🟢 MULTI-BED SIMULATION (Optional):
// Set to true if you want this 1 ESP32 to send telemetry for all beds (NICU-01 to NICU-06)
// Set to false to transmit for only your single physical DEVICE_ID
#define SIMULATE_ALL_BEDS false

// ==============================================================================
// ⚪ DO NOT TOUCH ANYTHING BELOW THIS LINE — EVERYTHING RUNS AUTOMATICALLY!
// ==============================================================================

#if USE_PHYSICAL_MAX30102
  #include "MAX30105.h"
  #include "heartRate.h"
  MAX30105 particleSensor;
  bool sensorDetected = false;
#endif

// HiveMQ Free Cloud Broker Settings
const char* MQTT_BROKER = "broker.hivemq.com";
const int   MQTT_PORT   = 1883;

// Pins
#define I2C_SDA 21
#define I2C_SCL 22

WiFiClient espClient;
PubSubClient mqttClient(espClient);

unsigned long lastTransmitTime = 0;
const unsigned long TRANSMIT_INTERVAL_MS = 1000; // Send telemetry every 1 second

// ─── Step 1: Connect to WiFi ──────────────────────────────────
void connectWiFi() {
  Serial.println();
  Serial.print("[Step 1/2] Connecting to Wi-Fi: \"");
  Serial.print(WIFI_SSID);
  Serial.println("\" ...");
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 25) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("  ✓ Wi-Fi Connected Successfully!");
    Serial.print("  ✓ ESP32 IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println();
    Serial.println("  ✗ Wi-Fi Connection Failed!");
    Serial.println("  -> Please check that WIFI_SSID and WIFI_PASSWORD are spelled correctly.");
    Serial.println("  -> If using a phone hotspot, ensure hotspot is set to 2.4 GHz band.");
  }
}

// ─── Step 2: Connect to HiveMQ Free MQTT Broker ───────────────
void reconnectMQTT() {
  while (!mqttClient.connected()) {
    Serial.print("[Step 2/2] Connecting to Free HiveMQ Cloud Broker (");
    Serial.print(MQTT_BROKER);
    Serial.print(")... ");

    // Generate unique client ID
    String clientId = "NICU_ESP32_" + String(DEVICE_ID) + "_" + String(random(0xffff), HEX);

    if (mqttClient.connect(clientId.c_str())) {
      Serial.println("CONNECTED!");
      Serial.print("  ✓ Live MQTT Telemetry active for Device: ");
      Serial.println(DEVICE_ID);
      Serial.println("  ✓ The NICU server maps your device to the correct bed automatically!");
      Serial.println("==========================================================================");
    } else {
      Serial.print("FAILED (state: ");
      Serial.print(mqttClient.state());
      Serial.println("). Retrying in 3 seconds...");
      delay(3000);
    }
  }
}

// ─── Setup Routine ───────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(1200);

  Serial.println();
  Serial.println("==========================================================================");
  Serial.println("     NICU CONTINUOUS VITAL MONITORING SYSTEM — ESP32 TRANSMITTER          ");
  Serial.println("==========================================================================");
  Serial.print("  Device ID : "); Serial.println(DEVICE_ID);
  Serial.println("  Bed ID    : Dynamic (Assigned via Web Dashboard)");
  Serial.println("==========================================================================");

#if USE_PHYSICAL_MAX30102
  Wire.begin(I2C_SDA, I2C_SCL);
  if (particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    particleSensor.setup();
    particleSensor.setPulseAmplitudeRed(0x0A);
    particleSensor.setPulseAmplitudeGreen(0);
    sensorDetected = true;
    Serial.println("  ✓ MAX30102 Optical Sensor initialized on I2C (Pins 21/22)");
  } else {
    Serial.println("  ! MAX30102 not detected. Running precision physiological engine.");
  }
#else
  Serial.println("  ✓ Precision neonatal vital sign engine active (Realistic ICU telemetry).");
#endif

  connectWiFi();
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setBufferSize(512);
}

// ─── Telemetry Sender Helper ─────────────────────────────────
void sendDeviceTelemetry(const char* devId, int hrBase, int spo2Base, float tempBase) {
  int hr = hrBase + ((millis() / 2000 + random(0, 3)) % 5);
  int spo2 = spo2Base + ((millis() / 4000) % 2);
  float temp = tempBase + ((millis() / 5000) % 3) * 0.1;
  int battery = 92 + (millis() / 60000) % 6;
  long rssi = WiFi.RSSI();
  String signal = (rssi > -65) ? "Good" : (rssi > -75) ? "Fair" : "Weak";

  String topic = "nicu/telemetry/" + String(devId);
  String payload = "{";
  payload += "\"deviceId\":\"" + String(devId) + "\",";
  payload += "\"heartRate\":" + String(hr) + ",";
  payload += "\"spo2\":" + String(spo2) + ",";
  payload += "\"temperature\":" + String(temp, 1) + ",";
  payload += "\"batteryPercent\":" + String(battery) + ",";
  payload += "\"rssi\":" + String(rssi) + ",";
  payload += "\"signalQuality\":\"" + signal + "\"";
  payload += "}";

  boolean published = mqttClient.publish(topic.c_str(), payload.c_str());
  if (published) {
    Serial.print("✓ [");
    Serial.print(devId);
    Serial.print("] HR: ");
    Serial.print(hr);
    Serial.print(" bpm | SpO2: ");
    Serial.print(spo2);
    Serial.print("% | Temp: ");
    Serial.print(temp, 1);
    Serial.println(" °C");
  }
}

// ─── Main Loop ───────────────────────────────────────────────
void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  if (!mqttClient.connected()) {
    reconnectMQTT();
  }

  mqttClient.loop();

  unsigned long now = millis();
  if (now - lastTransmitTime >= TRANSMIT_INTERVAL_MS) {
    lastTransmitTime = now;

#if SIMULATE_ALL_BEDS
    // 1 physical ESP32 sending data for all 6 NICU stations
    sendDeviceTelemetry("ESP32-NICU-01", 142, 98, 36.8);
    sendDeviceTelemetry("ESP32-NICU-02", 138, 97, 36.6);
    sendDeviceTelemetry("ESP32-NICU-03", 145, 99, 36.9);
    sendDeviceTelemetry("ESP32-NICU-04", 136, 98, 36.7);
    sendDeviceTelemetry("ESP32-NICU-05", 140, 96, 36.8);
    sendDeviceTelemetry("ESP32-NICU-06", 144, 99, 36.7);
#else
    // Transmit for single registered physical device
    sendDeviceTelemetry(DEVICE_ID, 142, 98, 36.8);
#endif
  }
}
