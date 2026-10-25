# 🏥 Complete Production Deployment & Device Connection Guide
### Vercel (Frontend) + Render (Backend) + MongoDB Atlas + HiveMQ Cloud + ESP32 Fleet

This guide provides the complete, updated procedure for:
1. **Deploying the Backend to Render** (Free Node.js & Express API with MongoDB Atlas & HiveMQ MQTT)
2. **Deploying the Frontend to Vercel** (React 19 SPA with full patient admission/discharge management)
3. **Connecting the ESP32 Device** (Simple 3-minute guide for ordinary users & beginners)
4. **Managing Patients & Discharges** (Admit babies, allocate beds, and discharge them with clinical records)

---

## 🏗️ System Architecture & Data Flow

```text
               +-------------------------------------------------------------+
               |                  ESP32 Microcontroller Unit                 |
               | (WIFI_SSID, WIFI_PASSWORD, BED_ID="NICU-01", DEVICE_ID)     |
               +------------------------------+------------------------------+
                                              |
                                              | MQTT Publish over TCP Port 1883
                                              v
               +-------------------------------------------------------------+
               |           HiveMQ Cloud Public Broker (broker.hivemq.com)    |
               |           Topic: nicu/telemetry/<deviceId>                  |
               +------------------------------+------------------------------+
                                              |
                                              | Real-Time MQTT Ingestion
                                              v
               +-------------------------------------------------------------+
               |             Render Backend (Node.js + Express)              |
               |          Subscribed to: nicu/telemetry/#                    |
               +---------------+------------------------------+--------------+
                               |                              ^
                Saves Vitals   |                              | REST API Requests
                & Alarms       v                              | (/api/patients, /api/beds)
               +---------------+--------------+   +-----------+--------------+
               | MongoDB Atlas Cloud Database |   |     Vercel Frontend      |
               | (nicu cluster)               |   |  (React 19 Clinical UI)  |
               +------------------------------+   +--------------------------+
```

---

## 🚀 Part 1: Deploy Backend to Render (Free Tier)

Render hosts your Node.js Express API that connects to MongoDB Atlas and subscribes to live ESP32 HiveMQ MQTT telemetry.

### Step 1: Push Code to GitHub
Ensure all code in your `nicu` folder is pushed to your GitHub repository:
```bash
git add .
git commit -m "Add patient page, ESP32 beginner connection, and deployment config"
git push origin main
```

### Step 2: Create Web Service on Render
1. Open [render.com](https://render.com) and log in.
2. Click **New +** → **Web Service**.
3. Select your repository: `nicu`.

### Step 3: Configure Render Settings
Fill in these exact values:
* **Name**: `nicu-backend` (or your preferred name)
* **Region**: Choose closest (e.g. *Singapore* or *Frankfurt* or *Oregon*)
* **Branch**: `main`
* **Root Directory**: `backend`  *(⚠️ Important: type `backend`)*
* **Runtime**: `Node`
* **Build Command**: `npm install`
* **Start Command**: `node server.js`
* **Instance Type**: `Free`

### Step 4: Add Environment Variables on Render
Scroll down to the **Environment Variables** section and add:

| Key | Value | Notes |
|:---|:---|:---|
| `MONGO_URI` | `mongodb+srv://sathish07002_db_user:DmP4CsTEfO4vCZtG@cluster0.nk3wz0y.mongodb.net/nicu?retryWrites=true&w=majority` | Your MongoDB Atlas connection URI |
| `MQTT_BROKER` | `mqtt://broker.hivemq.com:1883` | Free HiveMQ broker |
| `PORT` | `10000` | (Or leave default, Render sets this automatically) |

### Step 5: Click "Deploy Web Service"
1. Click **Deploy Web Service**.
2. Wait 2 minutes for Render to build. You will see:
   ```text
   Connected to MongoDB Atlas!
   [HiveMQ MQTT] Connected successfully to mqtt://broker.hivemq.com:1883!
   NICU Monitoring Backend running at http://localhost:10000
   ```
3. Copy your Render backend URL:
   `https://nicu-backend.onrender.com`
4. Test it in your browser: `https://nicu-backend.onrender.com/api/health`  
   *(It will return: `{"status":"online", "database":"connected", "hivemq":"connected"}`)*

---

## ⚡ Part 2: Deploy Frontend to Vercel (Free Tier)

Vercel hosts the React Single Page Application with continuous monitoring dashboards, bed allocations, and patient management.

### Step 1: Import Project to Vercel
1. Open [vercel.com](https://vercel.com) and log in with GitHub.
2. Click **Add New...** → **Project**.
3. Select your `nicu` repository and click **Import**.

### Step 2: Configure Build Settings
* **Framework Preset**: `Vite`
* **Root Directory**: `./` (leave default root)
* **Build Command**: `npm run build`
* **Output Directory**: `dist`

### Step 3: Add Environment Variable for Backend Connection
Under **Environment Variables**, add:

| Key | Value | Notes |
|:---|:---|:---|
| `VITE_API_BASE_URL` | `https://nicu-backend.onrender.com/api` | **Must end with `/api`** (Replace with your actual Render URL from Part 1) |

### Step 4: Click "Deploy"
1. Click **Deploy**. Vercel will build the frontend in ~40 seconds.
2. Your hospital monitoring website is now live worldwide at:
   `https://your-nicu-app.vercel.app`

*(Note: `vercel.json` is already included in the repository so navigating directly to `/patients`, `/doctors`, `/alerts`, or refreshing the page will always work with 0 errors!)*

---

## 🔌 Part 3: How Ordinary Persons Connect the ESP32

To make it as simple as possible, **anyone** can connect the ESP32 in 3 minutes by following these 4 steps:

### Step 1: Open Arduino IDE
1. Download free [Arduino IDE](https://www.arduino.cc/en/software).
2. Install the **esp32** board via **Tools → Board → Boards Manager** (search `esp32` and click Install).
3. Install the **PubSubClient** library via **Tools → Manage Libraries** (search `PubSubClient` and click Install).

### Step 2: Open the Code and Change ONLY 4 Lines
Open `esp32/nicu_esp32_hivemq_transmitter.ino` in Arduino IDE.  
Look at lines 28–35:
```cpp
// ==============================================================================
// 🟢 STEP 1: CHANGE ONLY THESE 4 LINES (YOUR WIFI & BED ID)
// ==============================================================================
const char* WIFI_SSID     = "MyWiFiName";        // <-- Put your Wi-Fi name or phone hotspot here
const char* WIFI_PASSWORD = "MyPassword";        // <-- Put your Wi-Fi password here
const char* BED_ID        = "NICU-01";           // <-- Bed slot: "NICU-01", "NICU-02", etc.
const char* DEVICE_ID     = "ESP32-NICU-01";     // <-- Device name
```
> **You do NOT need to touch any other code!**

### Step 3: Plug USB Cable and Click Upload
1. Plug the ESP32 into your computer.
2. Select **Tools → Board → ESP32 Dev Module**.
3. Select **Tools → Port** (e.g. `COM3` on Windows).
4. Click the **Upload (→)** button.

### Step 4: Open Serial Monitor
1. Press `Ctrl + Shift + M` to open the Serial Monitor (set to `115200 baud`).
2. You will see:
   ```text
   [Step 1/3] Connecting to Wi-Fi ... Connected!
   [Step 2/3] Connecting to Free HiveMQ Cloud Broker ... CONNECTED!
   ✓ [SENT TO BED NICU-01] HR: 142 bpm | SpO2: 98% | Temp: 36.8 °C
   ```
3. Open your Vercel website: **Bed 1 will immediately stream live vitals in real time!**

---

## 👶 Part 4: How to Add & Discharge Patients on the Website

The website now has a dedicated **Patients** section accessible directly from the sidebar (`/patients`):

### 1. Admitting a Neonate:
1. Click **"Patients"** in the sidebar navigation (or click **"Admit Neonate"** on the Dashboard).
2. Fill in:
   - **Baby Name & Mother's Name** (e.g., Baby of Sunita, Sunita Devi)
   - **Gender & Blood Group** (e.g., Female, O+)
   - **Gestational Age & Birth Weight** (e.g., 32w 4d, 1,750 g)
   - **Diagnosis** (e.g., Prematurity, Respiratory Distress)
   - **Assign Incubator Bed** (select from `NICU-01` to `NICU-06`)
   - **Assign Attending Doctor** (e.g., Dr. Meera Vasudevan)
   - **Assign ESP32 Monitor** (select your ESP32 device or attach later)
3. Click **"Confirm & Admit Neonate"**.
4. The baby is instantly registered in MongoDB Atlas, placed in the incubator bed, and live vitals will flow automatically!

### 2. Discharging a Patient:
1. Go to **"Patients"** page.
2. Click the **"Discharge"** button next to any admitted baby.
3. Select the **Discharge Condition**:
   - *Full Recovery - Physiological Stability Reached*
   - *Stable - Discharged Home with Outpatient Follow-up*
   - *Transferred to Step-Down Nursery Ward*
4. Enter the **Discharge Weight** and **Doctor's Discharge Directives**.
5. Click **"Confirm & Discharge"**:
   - The baby's full clinical record is archived in the **"Discharged Archive"** tab for permanent hospital records.
   - The Bed slot (`NICU-01`) is automatically freed and placed in **Standby**, ready for the next admission.
   - The ESP32 device is unassigned and ready for sterilization/reassignment.
   - A timestamped entry is written to the cryptographic **Audit Log**.

---

## 🛡️ Part 5: Pre-Flight Verification Checklist

Before presenting or submitting your project:

- [x] **Backend Running**: Render health check returns `status: online`, `database: connected`, `hivemq: connected`.
- [x] **Frontend Deployed**: Vercel loads the dark/light theme, patient cards, and waveforms.
- [x] **CORS Allowed**: Backend allows incoming API requests from any Vercel domain.
- [x] **Patient Management**: Can admit a baby, allocate a bed, view live telemetry, and discharge.
- [x] **ESP32 Connection**: Tested using HiveMQ Cloud MQTT broker (`broker.hivemq.com:1883`).
- [x] **Zero Build Errors**: `npm run build` succeeds cleanly in < 2 seconds.
