/*
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
  payload += "\"deviceId\":\"" + String(DEVICE_ID) + "\",";
  payload += "\"simulationMode\":false,";
  payload += "\"heartRateBpm\":" + jsonNumber(heartRate, 1) + ",";
  payload += "\"heartRate\":" + jsonNumber(heartRate, 1) + ",";
  payload += "\"heartRateStatus\":\"" + hrStatus + "\",";
  payload += "\"spo2EstimatePercent\":" + jsonNumber(spo2Estimate, 1) + ",";
  payload += "\"spo2\":" + jsonNumber(spo2Estimate, 1) + ",";
  payload += "\"spo2Status\":\"" + spo2Status + "\",";
  payload += "\"temperatureC\":" + jsonNumber(temperatureC, 1) + ",";
  payload += "\"temperature\":" + jsonNumber(temperatureC, 1) + ",";
  payload += "\"humidityPercent\":" + jsonNumber(humidity, 1) + ",";
  payload += "\"dht11Status\":\"" +
             String(dhtReadingOK ? "WORKING" : "NO_VALID_READING") + "\",";
  payload += "\"ppgSensorStatus\":\"" +
             String(ppgFound ? "DETECTED" : "NOT_DETECTED") + "\",";
  payload += "\"irValue\":" + String(irValue) + ",";
  payload += "\"redValue\":" + String(redValue) + ",";
  payload += "\"wifiConnected\":";
  payload += (WiFi.status() == WL_CONNECTED ? "true," : "false,");
  payload += "\"rssi\":";
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
