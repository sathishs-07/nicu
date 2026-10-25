# Simple Step-by-Step ESP32 Connection Guide for Non-Programmers

> **Who this guide is for:** Anyone (students, doctors, nurses, beginners) who wants to connect an ESP32 board to the NICU monitor without needing deep programming or electronics knowledge.

---

## 🕒 Estimated Time: 3 to 5 Minutes
## 💰 Cost: $0.00 (Completely Free!)

---

## 📋 What You Need
1. An **ESP32 board** (any model: ESP32 DevKit, NodeMCU-32S, ESP32-WROOM, or ESP32-S3).
2. A **Micro-USB or USB-C cable** (must support data transfer, not power-only).
3. A computer with **Arduino IDE** installed (Free download: [arduino.cc/en/software](https://www.arduino.cc/en/software)).
4. Any standard **Wi-Fi connection** (your home Wi-Fi, college Wi-Fi, or phone mobile hotspot).

---

## 🚀 Step 1: Install Arduino IDE and ESP32 Driver (One-Time Setup)

1. Download and open **Arduino IDE 2.x**.
2. Click **Tools → Board → Boards Manager...**
3. In the search box, type: `esp32`
4. Click **Install** on **"esp32 by Espressif Systems"**. Wait 1 minute for it to finish.
5. In Arduino IDE, click **Tools → Manage Libraries...**
6. In the search box, type: `PubSubClient`
7. Click **Install** on **"PubSubClient by Nick O'Leary"**. That's the only library you need!

---

## 📝 Step 2: Open the Code and Change ONLY 4 Lines

1. In Arduino IDE, open this file:
   ```
   nicu/esp32/nicu_esp32_hivemq_transmitter.ino
   ```
2. Look at lines 28 to 35:
   ```cpp
   // ==============================================================================
   // 🟢 STEP 1: CHANGE ONLY THESE 4 LINES (YOUR WIFI & BED ID)
   // ==============================================================================
   const char* WIFI_SSID     = "YOUR_WIFI_NAME";     // <-- Put your Wi-Fi name here
   const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD"; // <-- Put your Wi-Fi password here
   const char* BED_ID        = "NICU-01";            // <-- Bed: NICU-01, NICU-02, etc.
   const char* DEVICE_ID     = "ESP32-NICU-01";      // <-- Device ID
   ```

### Examples of what to type:
- If your phone hotspot is named **`Goutham iPhone`** with password **`secret1234`**, change it to:
  ```cpp
  const char* WIFI_SSID     = "Goutham iPhone";
  const char* WIFI_PASSWORD = "secret1234";
  const char* BED_ID        = "NICU-01";
  const char* DEVICE_ID     = "ESP32-NICU-01";
  ```
- If you are setting up a second device for **Bed 2**, just change `BED_ID` to `"NICU-02"` and `DEVICE_ID` to `"ESP32-NICU-02"`.

> **IMPORTANT:** You do **NOT** need to edit or touch any other line of code! Everything else is pre-programmed to automatically stream data to the free HiveMQ cloud broker (`broker.hivemq.com`).

---

## 🔌 Step 3: Plug the ESP32 into Your Computer and Upload

1. Plug the ESP32 into your computer using your USB cable.
2. In Arduino IDE:
   - Click **Tools → Board → esp32 → ESP32 Dev Module** (or your specific ESP32 model).
   - Click **Tools → Port** and select your port (e.g. `COM3` on Windows, or `/dev/cu.usbserial` on Mac).
3. Click the **Upload** button (the round arrow pointing right `→` at the top left of Arduino IDE).
4. Watch the bottom window. You will see:
   ```
   Writing at 0x00010000... (100 %)
   Leaving...
   Hard resetting via RTS pin...
   Done uploading.
   ```

> 💡 **Troubleshooting Tip:** If you see `Connecting........_____.....` and an error:
> Simply **press and hold the tiny "BOOT" button on your ESP32** for 2 seconds while it says `Connecting...`, then release it.

---

## 📺 Step 4: Open Serial Monitor to Verify

1. In Arduino IDE, click the magnifying glass icon at top-right (or press `Ctrl + Shift + M`) to open the **Serial Monitor**.
2. Make sure the baud rate at top-right of the Serial Monitor is set to **`115200 baud`**.
3. You will immediately see messages like this:
   ```text
   ==========================================================================
        NICU CONTINUOUS VITAL MONITORING SYSTEM — ESP32 TRANSMITTER          
   ==========================================================================
     Device ID : ESP32-NICU-01
     Target Bed: NICU-01
   ==========================================================================
   [Step 1/3] Connecting to Wi-Fi: "Goutham iPhone" ...
     ✓ Wi-Fi Connected Successfully!
     ✓ ESP32 IP Address: 172.20.10.4

   [Step 2/3] Connecting to Free HiveMQ Cloud Broker (broker.hivemq.com)... CONNECTED!
     ✓ Publishing live vitals to topic: nicu/telemetry/ESP32-NICU-01
     ✓ Open your NICU Web Dashboard now to watch live telemetry streaming!
   ==========================================================================
   ✓ [SENT TO BED NICU-01] HR: 142 bpm | SpO2: 98% | Temp: 36.8 °C
   ✓ [SENT TO BED NICU-01] HR: 143 bpm | SpO2: 98% | Temp: 36.8 °C
   ```

---

## 👶 Step 5: See Live Data on the Website!

1. Open your web browser to the NICU web application (e.g. `http://localhost:5173` or your Vercel URL).
2. Go to the **Dashboard** or **Patients** page.
3. Bed **NICU-01** will glow **teal / green** and stream real-time Heart Rate, SpO₂, and Temperature graphs at 1 second intervals!
4. You can also click on Bed 1 to open the **Live Waveform & Patient Details** monitor to watch continuous ECG/PPG traces!

---

## ❓ Frequently Asked Questions (FAQ)

### Q1: Do I need to buy sensors to test this?
**No!** The code has a precision clinical vital engine built right in. As soon as you upload the code, it sends realistic neonatal vital telemetry (140-144 bpm, 98% SpO₂, 36.8°C). When you are ready to wire real hardware, you can connect a MAX30102 sensor to Pin 21 (SDA) and Pin 22 (SCL).

### Q2: How can I connect 2 or more ESP32 devices for different babies?
1. Take your second ESP32 board.
2. In the code, change:
   ```cpp
   const char* BED_ID    = "NICU-02";
   const char* DEVICE_ID = "ESP32-NICU-02";
   ```
3. Upload to the second board.
4. Now **Bed 1 and Bed 2** will both stream independent live telemetry simultaneously! You can add up to dozens of ESP32s for all neonatal incubators.

### Q3: Why HiveMQ instead of traditional Wi-Fi IP?
Because with HiveMQ, the ESP32 communicates over the cloud. You can have the ESP32 in a hospital or university lab in India, and your website running anywhere in the world on Vercel, and they will connect instantly with zero firewall or router configuration!
