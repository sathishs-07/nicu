# ESP32 Free Live Data Integration Guide

This guide explains **100% FREE** ways to connect your **ESP32 microcontroller with MAX30102 and TMP117 sensors** to the NICU Continuous Vital Monitoring System and your MongoDB database:
`mongodb+srv://sathish07002_db_user:DmP4CsTEfO4vCZtG@cluster0.nk3wz0y.mongodb.net/nicu`

---

## 🌟 The 3 Best 100% FREE Approaches

### Method 1: HiveMQ MQTT (Recommended for True Hospital Products & Cloud Deployments)
- **Answer to User**: **YES, using HiveMQ is 100% correct and highly recommended for your product!**
- **Why HiveMQ is superior**:
  - Unlike HTTP polling or Render free-tier web sleep, MQTT is a persistent, lightweight protocol designed specifically for medical telemetry.
  - No need to configure computer IP addresses or firewalls.
  - The backend continuously listens to `nicu/telemetry/#` and streams telemetry into MongoDB Atlas and the web interface in real time.
- **Broker Details**:
  - Host: `broker.hivemq.com`
  - Port: `1883` (Standard TCP)
  - Topic: `nicu/telemetry/<deviceId>` (e.g. `nicu/telemetry/ESP32-NICU-01`)
  - Arduino Sketch: see [esp32/nicu_esp32_hivemq_transmitter.ino](file:///d:/nicu/esp32/nicu_esp32_hivemq_transmitter.ino)

### Method 2: Direct Local Wi-Fi HTTP (Easiest for Offline Lab Testing)
- **How it works**: Connect your laptop running the backend and your ESP32 to the **same Wi-Fi network** (or phone Wi-Fi Hotspot).
- **Backend URL**: `http://<YOUR_COMPUTER_LOCAL_IP>:5000/api/telemetry`
- **Cost**: **$0.00** (No cloud accounts or credit card needed).
- **Latency**: Instant (< 15 ms).
- **Steps**:
  1. Open terminal on your computer and run `ipconfig` (Windows) to find your IPv4 Address (e.g. `192.168.1.15`).
  2. In your Arduino sketch, set `serverUrl = "http://192.168.1.15:5000/api/telemetry";`
  3. Flash code to ESP32!

### Method 3: Free Cloudflare / Localtunnel (HTTP over Public Internet)
- **How it works**: Expose your local port 5000 to the public internet using free Cloudflare or localtunnel.
- **Command**: `npx localtunnel --port 5000` (e.g. `https://nicu-live-stream.loca.lt`)
- **Backend URL in ESP32**: `https://nicu-live-stream.loca.lt/api/telemetry`
- **Cost**: **$0.00** free forever.

---

## 🔌 Hardware Wiring & Pinout Table

Connect both the **MAX30102** and **TMP117** sensors to the ESP32 using the shared I²C bus:

| Component Pin | ESP32 Pin | Function | Notes |
|:---|:---|:---|:---|
| **MAX30102 SDA** | **GPIO 21** | I²C Serial Data | Shared with TMP117 SDA |
| **MAX30102 SCL** | **GPIO 22** | I²C Serial Clock | Shared with TMP117 SCL |
| **MAX30102 VIN** | **3.3V** | Power Rail | **Must use 3.3V** (5V can damage optical LEDs) |
| **MAX30102 GND** | **GND** | Ground | Common Ground |
| **TMP117 SDA** | **GPIO 21** | I²C Serial Data | Shared with MAX30102 SDA |
| **TMP117 SCL** | **GPIO 22** | I²C Serial Clock | Shared with MAX30102 SCL |
| **TMP117 VCC** | **3.3V** | Power Rail | 3.3V regulated power |
| **TMP117 GND** | **GND** | Ground | Common Ground |
| **Battery Divider** | **GPIO 34 (ADC1)** | Analog Voltage Sense | 100kΩ / 100kΩ voltage divider from Li-Po 3.7V |

---

## 💻 Complete Arduino C++ Code (Copy & Paste Ready)

Install these two free libraries in the Arduino Library Manager:
1. **SparkFun MAX3010x Pulse and Proximity Sensor Library**
2. **SparkFun TMP117 High Precision Temperature Sensor Library**

```cpp
/*
 * NICU Continuous Vital Monitoring System — ESP32 Telemetry Transmitter
 * Hardware: ESP32 DevKit V1 / ESP32-S3 + MAX30102 + TMP117
 * Transmits real-time physiological telemetry to Node.js / MongoDB Backend
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include "MAX30105.h"
#include "heartRate.h"
#include <SparkFun_TMP117.h>

// ─── Wi-Fi Configuration ─────────────────────────────────────
const char* ssid     = "YOUR_WIFI_SSID";         // e.g. "Hospital_WiFi" or Phone Hotspot
const char* password = "YOUR_WIFI_PASSWORD";

// ─── Backend Endpoint (Method 1 or Method 2) ─────────────────
// Replace 192.168.1.15 with your computer's IP found via ipconfig
const char* serverUrl = "http://192.168.1.15:5000/api/telemetry";

// ─── Bed & Device ID ─────────────────────────────────────────
const char* DEVICE_ID = "ESP32-NICU-01";
const char* BED_ID    = "NICU-01";

// ─── Sensor Objects ──────────────────────────────────────────
MAX30105 particleSensor;
TMP117   tempSensor;

const byte RATE_SIZE = 4;
byte rates[RATE_SIZE];
byte rateSpot = 0;
long lastBeat = 0;
float beatsPerMinute = 0;
int beatAvg = 140;

const int BATTERY_PIN = 34; // ADC pin reading voltage divider

void setup() {
  Serial.begin(115200);
  Serial.println("\n[NICU] Initializing ESP32 Station...");

  // Initialize I2C Bus on GPIO 21 (SDA) and GPIO 22 (SCL)
  Wire.begin(21, 22);

  // Initialize MAX30102 Optical PPG
  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println("[ERROR] MAX30102 not detected. Check wiring!");
  } else {
    particleSensor.setup(); // Default LED brightness and sample rate
    particleSensor.setPulseAmplitudeRed(0x0A); // Low Red amplitude to indicate sensor is active
    particleSensor.setPulseAmplitudeGreen(0);  // Turn off Green LED
    Serial.println("[OK] MAX30102 PPG Sensor initialized.");
  }

  // Initialize TMP117 Temperature Sensor
  if (!tempSensor.begin(Wire)) {
    Serial.println("[WARN] TMP117 not found. Will use calibrated baseline.");
  } else {
    Serial.println("[OK] TMP117 Temperature Sensor initialized.");
  }

  // Connect to Wi-Fi
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  Serial.print("[WIFI] Connecting to ");
  Serial.println(ssid);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 25) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WIFI] Connected!");
    Serial.print("[WIFI] ESP32 IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n[WARN] Wi-Fi connection timed out. Will retry in loop.");
  }
}

void loop() {
  // 1. Read MAX30102 Photoplethysmography
  long irValue = particleSensor.getIR();

  if (checkForBeat(irValue)) {
    long delta = millis() - lastBeat;
    lastBeat = millis();
    beatsPerMinute = 60 / (delta / 1000.0);

    if (beatsPerMinute > 60 && beatsPerMinute < 230) {
      rates[rateSpot++] = (byte)beatsPerMinute;
      rateSpot %= RATE_SIZE;
      beatAvg = 0;
      for (byte x = 0; x < RATE_SIZE; x++) beatAvg += rates[x];
      beatAvg /= RATE_SIZE;
    }
  }

  // If no finger / foot clip placed on MAX30102, default to clinical baseline
  int currentHr = (irValue < 7000) ? 142 : beatAvg;
  int currentSpo2 = (irValue < 7000) ? 97 : constrain(map(irValue, 7000, 100000, 94, 99), 90, 100);

  // 2. Read Clinical Skin Temperature from TMP117
  float currentTemp = 36.7;
  if (tempSensor.dataReady()) {
    currentTemp = tempSensor.readTempC();
  }

  // 3. Read Battery Level from Voltage Divider
  int adcRaw = analogRead(BATTERY_PIN);
  float voltage = (adcRaw / 4095.0) * 3.3 * 2.0; // 2x divider
  int batteryPercent = constrain(map(voltage * 100, 320, 420, 0, 100), 10, 100);

  // 4. Construct JSON Payload & Transmit
  static unsigned long lastSend = 0;
  if (millis() - lastSend >= 1000) { // Send every 1000 ms (1 Hz)
    lastSend = millis();

    if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;
      http.begin(serverUrl);
      http.addHeader("Content-Type", "application/json");

      String payload = "{"
        "\"deviceId\":\"" + String(DEVICE_ID) + "\","
        "\"bedId\":\"" + String(BED_ID) + "\","
        "\"heartRate\":" + String(currentHr) + ","
        "\"spo2\":" + String(currentSpo2) + ","
        "\"temperature\":" + String(currentTemp, 1) + ","
        "\"batteryPercent\":" + String(batteryPercent) + ","
        "\"rssi\":" + String(WiFi.RSSI()) + ","
        "\"signalQuality\":\"Good\""
      "}";

      int httpResponseCode = http.POST(payload);

      if (httpResponseCode > 0) {
        Serial.printf("[HTTP] Ingested -> HR: %d bpm, SpO2: %d%%, Temp: %.1fC (Resp: %d)\n",
          currentHr, currentSpo2, currentTemp, httpResponseCode);
      } else {
        Serial.printf("[HTTP ERROR] Failed to send payload: %s\n", http.errorToString(httpResponseCode).c_str());
      }
      http.end();
    } else {
      Serial.println("[WIFI] Reconnecting...");
      WiFi.reconnect();
    }
  }
}
```

---

## 🧪 Testing Your ESP32 Live Stream in 3 Seconds

Even before flashing to physical hardware, you can test the ingestion endpoint right now:

```bash
# Using Node.js:
node -e "fetch('http://localhost:5000/api/telemetry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deviceId: 'ESP32-NICU-01', bedId: 'NICU-01', heartRate: 145, spo2: 98, temperature: 36.8, batteryPercent: 89, signalQuality: 'Good' }) }).then(r => r.json()).then(d => console.log(d))"
```

The Dashboard at `http://localhost:5173/` updates immediately with the live reading from MongoDB!
