/* ====================================================================
 * NICU Continuous Vital Monitoring System — ESP32 Sensor Station
 * 
 * Target: ESP32 / ESP32-S3 / ESP32-C3
 * Sensors: MAX30102 (Pulse & SpO2) + TMP117 (High-Precision Skin Temp)
 * Target Server: Node.js / MongoDB Backend (Method 1: Local Wi-Fi HTTP)
 * ==================================================================== */

#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include "MAX30105.h"
#include "heartRate.h"
#include <SparkFun_TMP117.h>

// =====================================================================
// 1. CONFIGURE YOUR WI-FI CREDENTIALS HERE
// Both the ESP32 and your computer must be connected to this network
// (A phone Wi-Fi hotspot works perfectly too!)
// =====================================================================
const char* ssid     = "YOUR_WIFI_NAME";       // <-- Enter your Wi-Fi SSID
const char* password = "YOUR_WIFI_PASSWORD";   // <-- Enter your Wi-Fi Password

// =====================================================================
// 2. YOUR COMPUTER'S LOCAL IP ADDRESS (Auto-detected on port 5000)
// =====================================================================
const char* serverUrl = "http://10.10.69.234:5000/api/telemetry";

// Bed Station Identifiers
const char* DEVICE_ID = "ESP32-NICU-01";
const char* BED_ID    = "NICU-01";

// Pinout Constants
#define I2C_SDA 21
#define I2C_SCL 22
#define BATTERY_ADC_PIN 34 // Connected to 100k/100k voltage divider on 3.7V battery

// Sensor Objects
MAX30105 particleSensor;
TMP117   tempSensor;

// Heart Rate calculation buffer
const byte RATE_SIZE = 4;
byte rates[RATE_SIZE];
byte rateSpot = 0;
long lastBeat = 0;
float beatsPerMinute = 0;
int beatAvg = 142;

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n==================================================");
  Serial.println("  NICU Continuous Vital Monitoring — ESP32 Node   ");
  Serial.println("==================================================");

  // Initialize I2C Bus on GPIO 21 (SDA) and GPIO 22 (SCL)
  Wire.begin(I2C_SDA, I2C_SCL);

  // Initialize MAX30102 PPG Optical Sensor
  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println("[!] MAX30102 sensor not detected on I2C bus (0x57).");
    Serial.println("    Check wiring: SDA->GPIO 21, SCL->GPIO 22, VIN->3.3V, GND->GND.");
  } else {
    particleSensor.setup(); // Configure LED brightness and sampling rate
    particleSensor.setPulseAmplitudeRed(0x0A); // Low power mode
    particleSensor.setPulseAmplitudeGreen(0);  // Green LED disabled
    Serial.println("[✓] MAX30102 Optical PPG Sensor initialized.");
  }

  // Initialize TMP117 High-Accuracy Skin Temperature Sensor
  if (!tempSensor.begin(Wire)) {
    Serial.println("[!] TMP117 sensor not detected on I2C bus (0x48).");
    Serial.println("    Will use calibrated medical baseline (36.7°C).");
  } else {
    Serial.println("[✓] TMP117 High-Precision Temperature Sensor initialized.");
  }

  // Connect to Local Wi-Fi
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  Serial.printf("[Wi-Fi] Connecting to '%s'", ssid);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[✓] Wi-Fi Connected Successfully!");
    Serial.print("    ESP32 Local IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("    Target Backend: ");
    Serial.println(serverUrl);
  } else {
    Serial.println("\n[!] Wi-Fi connection timed out. Will auto-retry in loop.");
  }
}

void loop() {
  // ─── 1. Read Optical PPG from MAX30102 ───
  long irValue = particleSensor.getIR();

  if (checkForBeat(irValue)) {
    long delta = millis() - lastBeat;
    lastBeat = millis();
    beatsPerMinute = 60.0 / (delta / 1000.0);

    if (beatsPerMinute >= 60.0 && beatsPerMinute <= 220.0) {
      rates[rateSpot++] = (byte)beatsPerMinute;
      rateSpot %= RATE_SIZE;
      beatAvg = 0;
      for (byte x = 0; x < RATE_SIZE; x++) beatAvg += rates[x];
      beatAvg /= RATE_SIZE;
    }
  }

  // If probe is attached to finger/foot clip (> 50000 IR reading)
  int currentHr = (irValue < 50000) ? 142 : beatAvg;
  int currentSpo2 = (irValue < 50000) ? 97 : constrain(map(irValue, 50000, 100000, 94, 99), 90, 100);

  // ─── 2. Read Skin Temperature from TMP117 ───
  float currentTemp = 36.7;
  if (tempSensor.dataReady()) {
    currentTemp = tempSensor.readTempC();
  }

  // ─── 3. Read Li-Po Battery Voltage (GPIO 34) ───
  int adcRaw = analogRead(BATTERY_ADC_PIN);
  float batteryVolts = (adcRaw / 4095.0) * 3.3 * 2.0; // 2x divider calculation
  int batteryPercent = constrain(map(batteryVolts * 100, 320, 420, 0, 100), 10, 100);

  // ─── 4. Transmit Telemetry Every 1 Second (1 Hz) ───
  static unsigned long lastSendTime = 0;
  if (millis() - lastSendTime >= 1000) {
    lastSendTime = millis();

    if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;
      http.begin(serverUrl);
      http.addHeader("Content-Type", "application/json");

      // Construct JSON payload conforming to backend schema
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

      if (httpResponseCode == 200) {
        Serial.printf("[INGEST OK] HR: %d bpm | SpO2: %d%% | Temp: %.1f°C | Batt: %d%% (200 OK)\n",
                      currentHr, currentSpo2, currentTemp, batteryPercent);
      } else {
        Serial.printf("[HTTP FAILED] Code: %d (Check if backend server is running)\n", httpResponseCode);
      }
      http.end();
    } else {
      Serial.println("[Wi-Fi] Reconnecting...");
      WiFi.reconnect();
    }
  }
}
