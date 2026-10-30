# AuraSense AI: Smart Room Monitoring and Automation Dashboard

A modern, responsive, and cybernetic IoT web dashboard for **AI-Powered Smart Room Monitoring and Autonomous Appliance Automation**. The system monitors ambient room temperature, humidity, and daylight, tracks continuous electrical appliance operating durations, provides remote toggle controls with hardware feedback confirmation, and autonomously automates devices using explainable AI rules.

---

## 🌟 Key Features

### 1. Real-Time Room Monitoring
- **Climate Telemetry**: Live room temperature (°C/°F), relative humidity (% RH), and ambient daylight levels (Lux and % sunlight).
- **Power & Energy Metering**: Instant wattage draw (W), cumulative electricity consumption today (kWh), and real-time cost estimation based on configurable electricity tariffs (₹/$, etc.).
- **Live Visual Distinction**: Clear indicator for **Demo Simulated Data** vs **Physical ESP32 Edge Connected**.
- **Interactive Spline Charts**: 24-hour dual-axis temperature & humidity history with comfort bands.

### 2. Electrical Appliance Monitoring & Control
- **Appliances Included**: Ceiling Fan, Smart Air Conditioner, Ambient Ceiling Lights, Smart OLED TV, HEPA Air Purifier, and Bathroom Water Heater.
- **Continuous Operating Duration Timers**: Live ticking timer for every running appliance formatted as `Xh Ym Zs`, with daily accumulated duration preserved.
- **Remote Controls**:
  - Individual ON/OFF switches with simulated hardware acknowledgement (`ACK`) latency to clearly distinguish between requested command and confirmed hardware state.
  - Granular parameters: Fan speed (1-5), AC cooling setpoint (16-30°C), and Light brightness.
- **Safety Overrun Guards**: Configurable continuous runtime limits to prevent fire hazards and power surges.

### 3. AI-Based Automatic Room Control
- **Thermal Fan Regulation**: Automatically switches the ceiling fan ON when room temperature exceeds the user-configured threshold (e.g. 28.0°C), and turns it OFF below the hysteresis floor (e.g. 25.5°C). Includes debounce intervals to protect relays.
- **Smart Daylight Light Automation**: Uses ambient light sensor readings to detect if room lights are left ON unnecessarily during daytime, automatically switching them OFF after a configurable duration (e.g. 30 minutes).
- **Extreme Heat AC Assist**: Automatically powers on the AC when extreme temperatures are reached.
- **Explainable AI (XAI)**: Every autonomous action displays a human-readable explanation and logs the exact telemetry values and thresholds that triggered the decision.
- **Energy-Saving Intelligence**: Detects wasteful patterns and provides actionable suggestions with one-click "Apply Now" buttons.

### 4. Operating Modes & Priority Engine
- **Manual Mode**: User has complete control. AI runs in advisory mode (recommends optimizations but never automatically changes appliance states).
- **AI Automatic Mode**: Autonomous execution of all active AI rules with full explanation logs.
- **Scheduled Mode**: Runs time-of-day routines for weekdays and weekends.
- **Manual Override Hold**: If a user manually toggles a switch while in AI or Scheduled mode, that device is temporarily locked under user control (preventing the AI from fighting user intent).

### 5. Backend & Hardware Integration (ESP32 / ESP8266)
- **Node.js & Express REST API** + **WebSockets (`ws`)** for real-time bidirectional communication.
- **Production-Ready ESP32 Firmware**: Complete Arduino C++ sketch in `hardware/esp32_smart_room.ino` ready to flash to ESP32 DevKit boards.
- **Sensors & Actuators Supported**:
  - DHT22 (Temperature & Humidity on GPIO 4)
  - LDR / Ambient Light Sensor (Analog ADC on GPIO 34)
  - 4-Channel Optocoupler Relays (GPIO 26, 27, 14, 33)
- **Interactive Hardware Playground**: Built-in sliders to simulate temperature spikes, daylight changes, and sensor faults directly from the dashboard.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- Modern web browser (Chrome, Edge, Firefox, Safari)

### Quick Start
1. **Clone or open the repository**:
   ```bash
   cd "PROJECT"
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the server**:
   ```bash
   npm start
   ```

4. **Access the Dashboard**:
   Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

---

## 📡 REST API & WebSocket Specifications

### Dashboard & Telemetry APIs
- `GET /api/state`: Full system state snapshot (sensors, devices, rules, logs, schedules).
- `POST /api/devices/:id/control`: Toggle appliance state or change speed/setpoint:
  ```json
  { "state": "ON", "speed": 4 }
  ```
- `POST /api/system/mode`: Switch operating mode (`"manual"`, `"ai"`, `"scheduled"`).
- `POST /api/ai/rules`: Update AI rule thresholds, hysteresis, and debounce times.
- `GET /api/schedules` & `POST /api/schedules`: Read and create schedules.
- `GET /api/logs` & `POST /api/logs/clear`: Retrieve audit logs or reset.

### Hardware Edge APIs (ESP32 Integration)
- `POST /api/hardware/telemetry`: Microcontroller telemetry intake (called every 2s by ESP32):
  ```json
  {
    "hardwareId": "ESP32-MASTER-01",
    "temperature": 28.5,
    "humidity": 58.0,
    "lux": 750
  }
  ```
  **Response**:
  ```json
  {
    "success": true,
    "relays": { "fan": 1, "ac": 0, "lights": 1, "geyser": 0 }
  }
  ```

- `POST /api/hardware/confirm`: Microcontroller relay state feedback confirmation:
  ```json
  {
    "deviceId": "fan",
    "confirmedState": "ON"
  }
  ```

---

## 🔌 Hardware Wiring & Pinout Guide

| Component | Pin on Component | ESP32 GPIO Pin | Function |
| :--- | :--- | :--- | :--- |
| **DHT22** | DATA / OUT | **GPIO 4** | Temp & Humidity Input |
| **LDR Sensor** | A0 / Analog Out | **GPIO 34** | Light / Lux Analog Input |
| **Relay 1** (Fan) | IN1 | **GPIO 26** | Active LOW Digital Output |
| **Relay 2** (AC) | IN2 | **GPIO 27** | Active LOW Digital Output |
| **Relay 3** (Lights) | IN3 | **GPIO 14** | Active LOW Digital Output |
| **Relay 4** (Heater) | IN4 | **GPIO 33** | Active LOW Digital Output (16A) |
| **Status LED** | Onboard | **GPIO 2** | WiFi Heartbeat Indicator |

See [hardware/circuit_diagram.md](file:///c:/Users/jaswa/Downloads/Gp%20July/PROJECT/hardware/circuit_diagram.md) for full schematics and high-voltage electrical safety guidelines.

---

## 📂 Project Structure

```
PROJECT/
├── server.js                      # Express & WebSocket Backend Server + AI Engine
├── package.json                   # Project scripts and dependencies
├── public/
│   ├── index.html                 # Responsive Cybernetic Dashboard UI
│   ├── css/
│   │   ├── style.css              # Theme tokens, glassmorphism, responsive grid
│   │   └── components.css         # Device cards, timers, switches, charts, tables
│   └── js/
│       ├── app.js                 # App controller & DOM event orchestrator
│       ├── state.js               # Reactive state store & duration formatters
│       ├── simulation.js          # Thermal, daylight & live ticking physics loop
│       ├── ai-engine.js           # Autonomous decision engine & explainability
│       ├── charts.js              # Chart.js climate & energy visualizers
│       ├── hardware.js            # WebSocket / REST client & testing injector
│       └── audio.js               # Web Audio API micro-interaction sound synth
└── hardware/
    ├── esp32_smart_room.ino       # Production Arduino C++ firmware sketch
    ├── circuit_diagram.md         # Pinout specification & safety notes
    └── mqtt_schema.json           # MQTT topic and payload specs
```

---

## 🛡️ Safety & Reliability Precautions
1. **Anti-Cycling Hysteresis**: Prevents rapid toggling near thresholds by requiring separate activation and deactivation temperatures.
2. **Compressor & Relay Protection**: Minimum switching delays (debounce intervals) safeguard compressor motors and relays from rapid power cycles.
3. **Manual Override Safety**: Ensures user manual actions take precedence over automated AI or scheduled triggers without immediate counter-toggling.
4. **Offline Failsafe**: Firmware in `esp32_smart_room.ino` includes an offline thermostat safety routine so the room remains protected even if Wi-Fi or server connectivity is interrupted.
