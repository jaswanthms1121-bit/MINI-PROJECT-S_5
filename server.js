// server.js - AI-Powered Smart Room Monitoring & Automation Backend
const express = require('express');
const http = require('http');
const path = require('path');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// CENTRAL SYSTEM STATE
// ==========================================
const state = {
  system: {
    name: "AuraSense AI Smart Room",
    room: "Master Suite & Study",
    mode: "ai", // 'manual' | 'ai' | 'scheduled'
    status: "online",
    hardwareConnected: false,
    hardwareType: "ESP32-WROOM-32 (Simulated)",
    lastHardwareHeartbeat: null,
    tariffRate: 8.50, // Currency units per kWh
    currency: "₹",
    tempUnit: "C",
    simSpeed: 1, // 1x, 5x, 10x
    soundEnabled: true,
    startTime: Date.now()
  },
  sensors: {
    temperature: 28.4,
    targetComfortTemp: 24.0,
    tempTrend: "rising", // rising, falling, stable
    humidity: 58.0,
    humidityStatus: "Optimal",
    daylightLux: 780, // Lux
    daylightPercent: 78, // %
    isDaytime: true,
    airQualityIndex: 42, // AQI Good
    noiseLevel: 36 // dB
  },
  devices: [
    {
      id: "fan",
      name: "Ceiling Fan",
      type: "fan",
      icon: "fan",
      room: "Master Suite",
      pin: "GPIO 26 (Relay 1)",
      ratedWatts: 75,
      currentWatts: 0,
      state: "OFF", // 'ON' | 'OFF'
      requestedState: "OFF",
      pendingAck: false,
      speed: 3, // 1-5
      currentRunStart: null,
      totalDurationSecondsToday: 5420, // Accumulated run time today
      totalKwhToday: 0.113,
      manualOverride: false,
      overrideUntil: null
    },
    {
      id: "ac",
      name: "Smart Air Conditioner",
      type: "ac",
      icon: "snowflake",
      room: "Master Suite",
      pin: "GPIO 27 (Relay 2)",
      ratedWatts: 1450,
      currentWatts: 0,
      state: "OFF",
      requestedState: "OFF",
      pendingAck: false,
      setpoint: 23,
      mode: "cool",
      currentRunStart: null,
      totalDurationSecondsToday: 7200,
      totalKwhToday: 2.90,
      manualOverride: false,
      overrideUntil: null
    },
    {
      id: "lights",
      name: "Ambient Ceiling Lights",
      type: "light",
      icon: "lightbulb",
      room: "Master Suite",
      pin: "GPIO 14 (Relay 3)",
      ratedWatts: 45,
      currentWatts: 45,
      state: "ON",
      requestedState: "ON",
      pendingAck: false,
      brightness: 80,
      currentRunStart: Date.now() - (45 * 60 * 1000), // 45 minutes ago
      totalDurationSecondsToday: 6800,
      totalKwhToday: 0.085,
      manualOverride: false,
      overrideUntil: null
    },
    {
      id: "tv",
      name: "Smart OLED Television",
      type: "tv",
      icon: "tv",
      room: "Master Suite",
      pin: "GPIO 12 (Smart Plug 1)",
      ratedWatts: 130,
      currentWatts: 0,
      state: "OFF",
      requestedState: "OFF",
      pendingAck: false,
      currentRunStart: null,
      totalDurationSecondsToday: 3600,
      totalKwhToday: 0.130,
      manualOverride: false,
      overrideUntil: null
    },
    {
      id: "purifier",
      name: "HEPA Air Purifier",
      type: "purifier",
      icon: "wind",
      room: "Master Suite",
      pin: "GPIO 13 (Smart Plug 2)",
      ratedWatts: 38,
      currentWatts: 38,
      state: "ON",
      requestedState: "ON",
      pendingAck: false,
      mode: "auto",
      currentRunStart: Date.now() - (120 * 60 * 1000), // 2 hours ago
      totalDurationSecondsToday: 14400,
      totalKwhToday: 0.152,
      manualOverride: false,
      overrideUntil: null
    },
    {
      id: "geyser",
      name: "Bathroom Water Heater",
      type: "heater",
      icon: "flame",
      room: "Attached Bath",
      pin: "GPIO 33 (Relay 4 - 16A)",
      ratedWatts: 2000,
      currentWatts: 0,
      state: "OFF",
      requestedState: "OFF",
      pendingAck: false,
      currentRunStart: null,
      totalDurationSecondsToday: 1800,
      totalKwhToday: 1.00,
      manualOverride: false,
      overrideUntil: null
    }
  ],
  aiRules: {
    fanThermal: {
      id: "fanThermal",
      name: "Thermal Fan Regulation",
      enabled: true,
      triggerHighTemp: 28.0, // °C
      turnOffLowTemp: 25.5,  // °C (hysteresis)
      minCycleSeconds: 30,   // Min time between toggles to protect relay
      lastSwitched: 0,
      description: "Turns ceiling fan ON when room temp > 28°C, and OFF below 25.5°C."
    },
    acComfort: {
      id: "acComfort",
      name: "Extreme Heat AC Assist",
      enabled: true,
      triggerHighTemp: 31.0,
      targetTemp: 24.0,
      minCycleSeconds: 120,  // Protect AC compressor
      lastSwitched: 0,
      description: "Activates AC cooling if temperature exceeds 31°C despite fan running."
    },
    daylightLights: {
      id: "daylightLights",
      name: "Daylight Energy Saver",
      enabled: true,
      luxThreshold: 500, // Lux threshold
      daylightPercentThreshold: 60,
      maxDaytimeMinutes: 30, // Turns off if ON for > 30 mins during daytime
      startTime: "07:00",
      endTime: "18:00",
      lastSwitched: 0,
      description: "Automatically turns lights OFF when sufficient natural daylight is detected and lights have been ON > 30 mins."
    },
    idleEnergyShed: {
      id: "idleEnergyShed",
      name: "Overrun Idle Protection",
      enabled: true,
      maxTvContinuousHours: 4,
      maxGeyserMinutes: 45,
      lastSwitched: 0,
      description: "Detects water heater or entertainment appliances left running unattended and sheds power."
    }
  },
  schedules: [
    {
      id: "sched-1",
      name: "Morning Air Circulation",
      deviceId: "fan",
      action: "ON",
      days: ["mon", "tue", "wed", "thu", "fri"],
      time: "06:30",
      enabled: true
    },
    {
      id: "sched-2",
      name: "Morning Lights Off",
      deviceId: "lights",
      action: "OFF",
      days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
      time: "07:30",
      enabled: true
    },
    {
      id: "sched-3",
      name: "Evening Ambient Lighting",
      deviceId: "lights",
      action: "ON",
      days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
      time: "18:45",
      enabled: true
    },
    {
      id: "sched-4",
      name: "Night AC Cool Down",
      deviceId: "ac",
      action: "ON",
      days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
      time: "22:30",
      enabled: false
    }
  ],
  logs: [
    {
      id: "log-1",
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      timeFormatted: new Date(Date.now() - 3600000 * 2).toLocaleTimeString(),
      appliance: "Air Purifier",
      deviceId: "purifier",
      previousState: "OFF",
      newState: "ON",
      mode: "AI Automatic",
      triggerType: "AI Rule",
      reason: "PM2.5 particulate count rose to 65 µg/m³. Auto air cleaning engaged.",
      status: "Confirmed (ACK)"
    },
    {
      id: "log-2",
      timestamp: new Date(Date.now() - 3600000 * 1.2).toISOString(),
      timeFormatted: new Date(Date.now() - 3600000 * 1.2).toLocaleTimeString(),
      appliance: "Water Heater",
      deviceId: "geyser",
      previousState: "ON",
      newState: "OFF",
      mode: "AI Automatic",
      triggerType: "Safety Overrun",
      reason: "Maximum continuous run timer (30 mins) reached. Auto-cutoff for safety and energy saving.",
      status: "Confirmed (ACK)"
    },
    {
      id: "log-3",
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      timeFormatted: new Date(Date.now() - 1800000).toLocaleTimeString(),
      appliance: "Ceiling Lights",
      deviceId: "lights",
      previousState: "OFF",
      newState: "ON",
      mode: "Manual",
      triggerType: "Manual Control",
      reason: "User turned switch ON via web dashboard.",
      status: "Confirmed (ACK)"
    }
  ],
  recommendations: [
    {
      id: "rec-1",
      title: "Natural Daylight Available",
      message: "Room has 78% natural daylight. Turning off Ambient Lights will save ~0.35 kWh today.",
      savings: "0.35 kWh (~₹2.97)",
      actionType: "turnOff",
      targetDevice: "lights",
      severity: "low"
    },
    {
      id: "rec-2",
      title: "Optimal Pre-Cooling Window",
      message: "Outside temperature rising to 33°C. Keeping fan on level 3 reduces need for heavy AC usage.",
      savings: "1.20 kWh (~₹10.20)",
      actionType: "setSpeed",
      targetDevice: "fan",
      severity: "medium"
    }
  ],
  telemetryHistory: []
};

// Seed 24-point telemetry history for realistic chart visualization
function seedTelemetryHistory() {
  const points = [];
  const now = Date.now();
  for (let i = 24; i >= 0; i--) {
    const t = now - (i * 3600 * 1000);
    const dateObj = new Date(t);
    const hour = dateObj.getHours();
    
    // Day/Night temperature sine wave simulation
    const tempBase = 25 + 5 * Math.sin(((hour - 8) / 24) * 2 * Math.PI);
    const noise = (Math.random() - 0.5) * 0.8;
    const temp = parseFloat((tempBase + noise).toFixed(1));
    
    const humBase = 68 - 14 * Math.sin(((hour - 8) / 24) * 2 * Math.PI);
    const hum = parseFloat((humBase + (Math.random() - 0.5) * 2).toFixed(1));

    // Daylight lux curve
    let lux = 0;
    if (hour >= 6 && hour <= 18) {
      lux = Math.round(1000 * Math.sin(((hour - 6) / 12) * Math.PI) + Math.random() * 80);
    }

    // Hourly energy consumption (kWh)
    const energy = parseFloat((0.2 + (hour >= 18 && hour <= 23 ? 0.7 : hour >= 12 && hour <= 16 ? 0.9 : 0.15) + Math.random() * 0.15).toFixed(2));

    points.push({
      timestamp: t,
      timeLabel: `${String(hour).padStart(2, '0')}:00`,
      temperature: temp,
      humidity: hum,
      lux: lux,
      energyKwh: energy
    });
  }
  state.telemetryHistory = points;
}
seedTelemetryHistory();

// Helper to broadcast state to all connected WebSocket clients
function broadcast(type, payload) {
  const msg = JSON.stringify({ type, payload, timestamp: Date.now() });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

// Add an activity log entry
function addLog({ appliance, deviceId, previousState, newState, mode, triggerType, reason, status = "Confirmed (ACK)" }) {
  const logEntry = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    timeFormatted: new Date().toLocaleTimeString(),
    appliance,
    deviceId,
    previousState,
    newState,
    mode,
    triggerType,
    reason,
    status
  };
  state.logs.unshift(logEntry);
  if (state.logs.length > 100) state.logs.pop(); // Keep last 100
  broadcast('NEW_LOG', logEntry);
  return logEntry;
}

// Execute device state change with simulation ACK latency
function changeDeviceState(deviceId, requestedState, triggerType, reason, options = {}) {
  const device = state.devices.find(d => d.id === deviceId);
  if (!device) return false;

  const previousState = device.state;
  if (previousState === requestedState && !options.force) {
    return false;
  }

  device.requestedState = requestedState;
  device.pendingAck = true;

  // Manual override logic: if manual command while in AI or Schedule mode, set hold
  if (triggerType === "Manual Control" && state.system.mode !== "manual") {
    device.manualOverride = true;
    device.overrideUntil = Date.now() + (30 * 60 * 1000); // 30 mins hold
  } else if (triggerType === "AI Rule" || triggerType === "Schedule") {
    // If override is still active, don't allow AI/Schedule to toggle
    if (device.manualOverride && device.overrideUntil && Date.now() < device.overrideUntil) {
      console.log(`[Safety Hold] Device ${device.name} is under manual override until ${new Date(device.overrideUntil).toLocaleTimeString()}`);
      return false;
    }
    device.manualOverride = false;
    device.overrideUntil = null;
  }

  broadcast('DEVICE_PENDING', { deviceId, requestedState });

  // Simulate realistic hardware ACK latency (150ms - 350ms)
  setTimeout(() => {
    device.state = requestedState;
    device.pendingAck = false;
    
    if (requestedState === "ON") {
      device.currentRunStart = Date.now();
      device.currentWatts = device.ratedWatts;
    } else {
      if (device.currentRunStart) {
        const sessionSeconds = Math.floor((Date.now() - device.currentRunStart) / 1000);
        device.totalDurationSecondsToday += sessionSeconds;
        const sessionKwh = (device.ratedWatts * (sessionSeconds / 3600)) / 1000;
        device.totalKwhToday += sessionKwh;
      }
      device.currentRunStart = null;
      device.currentWatts = 0;
    }

    addLog({
      appliance: device.name,
      deviceId: device.id,
      previousState,
      newState: requestedState,
      mode: state.system.mode.toUpperCase(),
      triggerType,
      reason,
      status: "Confirmed (ACK)"
    });

    broadcast('DEVICE_UPDATED', device);
  }, 250);

  return true;
}

// ==========================================
// SIMULATION & AI ENGINE LOOP (1s tick)
// ==========================================
let simTick = 0;
setInterval(() => {
  simTick++;
  const now = Date.now();

  // 1. Update running device timers & energy
  state.devices.forEach(d => {
    if (d.state === "ON" && d.currentRunStart) {
      // Calculate active session seconds
      const activeSeconds = Math.floor((now - d.currentRunStart) / 1000);
      // Small live power usage increment
      const incrementKwh = (d.currentWatts / 1000) * (1 / 3600) * state.system.simSpeed;
      d.totalKwhToday += incrementKwh;
    }
  });

  // 2. Realistic thermal & ambient physics simulation (if not connected to real hardware)
  if (!state.system.hardwareConnected) {
    const currentHour = new Date().getHours() + (new Date().getMinutes() / 60);

    // Baseline outdoor curve
    const ambientOutdoorTemp = 26 + 6 * Math.sin(((currentHour - 8) / 24) * 2 * Math.PI);

    // Heat contribution from active appliances
    let heatGain = 0;
    const ac = state.devices.find(d => d.id === "ac");
    const fan = state.devices.find(d => d.id === "fan");
    const tv = state.devices.find(d => d.id === "tv");
    const geyser = state.devices.find(d => d.id === "geyser");

    if (tv && tv.state === "ON") heatGain += 0.02;
    if (geyser && geyser.state === "ON") heatGain += 0.05;

    // Cooling effects
    let cooling = 0;
    if (ac && ac.state === "ON") {
      cooling += 0.08 * (state.sensors.temperature - ac.setpoint > 0 ? 1 : 0.2);
    }
    if (fan && fan.state === "ON") {
      cooling += 0.015; // Perceived cooling / airflow dissipation
    }

    // Natural drift towards outdoor ambient + random micro-noise
    const drift = (ambientOutdoorTemp - state.sensors.temperature) * 0.005;
    const noise = (Math.sin(simTick * 0.2) * 0.01);

    let nextTemp = state.sensors.temperature + drift + heatGain - cooling + noise;
    state.sensors.tempTrend = nextTemp > state.sensors.temperature ? "rising" : nextTemp < state.sensors.temperature ? "falling" : "stable";
    state.sensors.temperature = parseFloat(nextTemp.toFixed(2));

    // Humidity drift
    let nextHum = state.sensors.humidity + (cooling > 0 ? -0.02 : 0.01) + (Math.sin(simTick * 0.1) * 0.02);
    state.sensors.humidity = Math.min(85, Math.max(35, parseFloat(nextHum.toFixed(1))));
    state.sensors.humidityStatus = state.sensors.humidity < 40 ? "Dry" : state.sensors.humidity > 65 ? "Humid" : "Ideal";

    // Daylight lux simulation based on hour
    if (currentHour >= 6 && currentHour <= 18.5) {
      const sunRatio = Math.sin(((currentHour - 6) / 12.5) * Math.PI);
      state.sensors.daylightPercent = Math.max(0, Math.min(100, Math.round(sunRatio * 100)));
      state.sensors.daylightLux = Math.round(sunRatio * 1200 + Math.random() * 20);
      state.sensors.isDaytime = true;
    } else {
      state.sensors.daylightPercent = 0;
      state.sensors.daylightLux = Math.round(5 + Math.random() * 5);
      state.sensors.isDaytime = false;
    }
  }

  // 3. AI Automation Evaluation (Runs if in AI Automatic Mode)
  if (state.system.mode === "ai") {
    evaluateAiRules(now);
  } else if (state.system.mode === "scheduled") {
    evaluateSchedules(now);
  }

  // 4. Update Recommendations engine
  evaluateRecommendations();

  // 5. Periodic telemetry broadcast (every 2 seconds)
  if (simTick % 2 === 0) {
    const totalWatts = state.devices.reduce((acc, d) => acc + (d.state === "ON" ? d.currentWatts : 0), 0);
    const totalKwh = state.devices.reduce((acc, d) => acc + d.totalKwhToday, 0);
    const totalCost = totalKwh * state.system.tariffRate;
    const activeCount = state.devices.filter(d => d.state === "ON").length;

    broadcast('TELEMETRY_UPDATE', {
      sensors: state.sensors,
      totalWatts,
      totalKwh: parseFloat(totalKwh.toFixed(3)),
      totalCost: parseFloat(totalCost.toFixed(2)),
      activeCount,
      totalDevices: state.devices.length
    });
  }

  // 6. Push history point every 30 seconds
  if (simTick % 30 === 0) {
    const nowObj = new Date();
    const timeLabel = `${String(nowObj.getHours()).padStart(2, '0')}:${String(nowObj.getMinutes()).padStart(2, '0')}`;
    const point = {
      timestamp: now,
      timeLabel,
      temperature: state.sensors.temperature,
      humidity: state.sensors.humidity,
      lux: state.sensors.daylightLux,
      energyKwh: parseFloat(state.devices.reduce((acc, d) => acc + d.totalKwhToday, 0).toFixed(3))
    };
    state.telemetryHistory.push(point);
    if (state.telemetryHistory.length > 30) state.telemetryHistory.shift();
    broadcast('HISTORY_POINT', point);
  }
}, 1000);

// ==========================================
// AI RULES LOGIC WITH HYSTERESIS & DEBOUNCE
// ==========================================
function evaluateAiRules(now) {
  const { fanThermal, acComfort, daylightLights, idleEnergyShed } = state.aiRules;

  // --- RULE 1: FAN THERMAL AUTOMATION ---
  if (fanThermal.enabled) {
    const fan = state.devices.find(d => d.id === "fan");
    if (fan) {
      const timeSinceLastSwitch = (now - fanThermal.lastSwitched) / 1000;
      const canSwitch = timeSinceLastSwitch >= fanThermal.minCycleSeconds;

      if (state.sensors.temperature >= fanThermal.triggerHighTemp && fan.state === "OFF" && canSwitch) {
        fanThermal.lastSwitched = now;
        changeDeviceState(
          "fan",
          "ON",
          "AI Rule",
          `Room temperature (${state.sensors.temperature}°C) exceeded thermal threshold (${fanThermal.triggerHighTemp}°C). Ceiling fan automatically engaged.`
        );
      } else if (state.sensors.temperature <= fanThermal.turnOffLowTemp && fan.state === "ON" && canSwitch) {
        fanThermal.lastSwitched = now;
        changeDeviceState(
          "fan",
          "OFF",
          "AI Rule",
          `Room temperature (${state.sensors.temperature}°C) cooled below target hysteresis floor (${fanThermal.turnOffLowTemp}°C). Fan switched OFF to conserve power.`
        );
      }
    }
  }

  // --- RULE 2: SMART DAYLIGHT LIGHT AUTOMATION ---
  if (daylightLights.enabled) {
    const lights = state.devices.find(d => d.id === "lights");
    if (lights && lights.state === "ON" && lights.currentRunStart) {
      const runDurationMinutes = (now - lights.currentRunStart) / 60000;
      const timeSinceLastSwitch = (now - daylightLights.lastSwitched) / 1000;

      // If sufficient daylight (> 60% or > 500 lux) and lights have run > maxDaytimeMinutes
      if (state.sensors.daylightPercent >= daylightLights.daylightPercentThreshold &&
          runDurationMinutes >= daylightLights.maxDaytimeMinutes &&
          timeSinceLastSwitch >= 30) {
        daylightLights.lastSwitched = now;
        changeDeviceState(
          "lights",
          "OFF",
          "AI Rule",
          `Abundant natural daylight detected (${state.sensors.daylightPercent}% / ${state.sensors.daylightLux} Lux) and lights ran for ${Math.round(runDurationMinutes)} mins. Lights automatically turned OFF.`
        );
      }
    }
  }

  // --- RULE 3: AC EXTREME HEAT ASSIST ---
  if (acComfort.enabled) {
    const ac = state.devices.find(d => d.id === "ac");
    if (ac) {
      const timeSinceLastSwitch = (now - acComfort.lastSwitched) / 1000;
      if (state.sensors.temperature >= acComfort.triggerHighTemp && ac.state === "OFF" && timeSinceLastSwitch >= acComfort.minCycleSeconds) {
        acComfort.lastSwitched = now;
        changeDeviceState(
          "ac",
          "ON",
          "AI Rule",
          `Severe heat condition: Room temperature (${state.sensors.temperature}°C) surpassed emergency comfort threshold (${acComfort.triggerHighTemp}°C). Smart AC turned ON.`
        );
      }
    }
  }

  // --- RULE 4: IDLE APPLIANCE SHEDDING ---
  if (idleEnergyShed.enabled) {
    const geyser = state.devices.find(d => d.id === "geyser");
    if (geyser && geyser.state === "ON" && geyser.currentRunStart) {
      const geyserMins = (now - geyser.currentRunStart) / 60000;
      if (geyserMins >= idleEnergyShed.maxGeyserMinutes) {
        changeDeviceState(
          "geyser",
          "OFF",
          "Safety Overrun",
          `Water heater continuous operation time (${Math.round(geyserMins)} mins) exceeded maximum safety limit (${idleEnergyShed.maxGeyserMinutes} mins). Cut off for safety and energy saving.`
        );
      }
    }
  }
}

// Evaluate time-of-day schedules
function evaluateSchedules(now) {
  const dateObj = new Date(now);
  const currentHours = String(dateObj.getHours()).padStart(2, '0');
  const currentMins = String(dateObj.getMinutes()).padStart(2, '0');
  const currentTimeStr = `${currentHours}:${currentMins}`;
  const dayNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const currentDay = dayNames[dateObj.getDay()];

  state.schedules.forEach(sched => {
    if (sched.enabled && sched.time === currentTimeStr && sched.days.includes(currentDay)) {
      const device = state.devices.find(d => d.id === sched.deviceId);
      if (device && device.state !== sched.action) {
        // Prevent re-triggering within the same minute
        if (!sched.lastTriggeredTime || (now - sched.lastTriggeredTime > 65000)) {
          sched.lastTriggeredTime = now;
          changeDeviceState(
            sched.deviceId,
            sched.action,
            "Schedule",
            `Scheduled event "${sched.name}" triggered at ${currentTimeStr}.`
          );
        }
      }
    }
  });
}

// Generate smart recommendations
function evaluateRecommendations() {
  const recs = [];
  const lights = state.devices.find(d => d.id === "lights");
  if (lights && lights.state === "ON" && state.sensors.daylightPercent > 65) {
    recs.push({
      id: "rec-daylight",
      title: "Abundant Natural Light Available",
      message: `Room has ${state.sensors.daylightPercent}% daylight (${state.sensors.daylightLux} Lux). Turning off Ambient Lights will save ~0.35 kWh today.`,
      savings: `${(lights.ratedWatts * 0.008).toFixed(2)} kWh/hr`,
      actionType: "turnOff",
      targetDevice: "lights",
      severity: "low"
    });
  }

  const ac = state.devices.find(d => d.id === "ac");
  const fan = state.devices.find(d => d.id === "fan");
  if (ac && ac.state === "ON" && state.sensors.temperature < 23) {
    recs.push({
      id: "rec-ac-overcool",
      title: "AC Overcooling Detected",
      message: `Room temperature is already at ${state.sensors.temperature}°C. Switching to Fan can save ~1.4 kWh/hr.`,
      savings: "1.4 kWh/hr (~₹11.90)",
      actionType: "turnOff",
      targetDevice: "ac",
      severity: "medium"
    });
  }

  if (fan && fan.state === "OFF" && state.sensors.temperature > 27.5 && state.system.mode === "manual") {
    recs.push({
      id: "rec-fan-assist",
      title: "Warm Room - AI Suggests Fan",
      message: `Temperature is ${state.sensors.temperature}°C. Turning on Ceiling Fan will improve air comfort with minimal power (75W).`,
      savings: "Prevents high AC compressor usage",
      actionType: "turnOn",
      targetDevice: "fan",
      severity: "low"
    });
  }

  state.recommendations = recs;
}

// ==========================================
// REST API ROUTES
// ==========================================

// Full dashboard state snapshot
app.get('/api/state', (req, res) => {
  res.json({
    success: true,
    data: state
  });
});

// Device state toggle & control
app.post('/api/devices/:id/control', (req, res) => {
  const { id } = req.params;
  const { state: targetState, speed, setpoint, brightness } = req.body;
  const device = state.devices.find(d => d.id === id);

  if (!device) {
    return res.status(404).json({ success: false, error: "Device not found" });
  }

  // Handle secondary parameters
  if (speed !== undefined) device.speed = Number(speed);
  if (setpoint !== undefined) device.setpoint = Number(setpoint);
  if (brightness !== undefined) device.brightness = Number(brightness);

  if (targetState && (targetState === "ON" || targetState === "OFF")) {
    changeDeviceState(
      id,
      targetState,
      "Manual Control",
      `User initiated ${targetState} command from dashboard.`
    );
  }

  res.json({ success: true, message: `Command queued for ${device.name}`, device });
});

// System mode change (manual, ai, scheduled)
app.post('/api/system/mode', (req, res) => {
  const { mode } = req.body;
  if (!['manual', 'ai', 'scheduled'].includes(mode)) {
    return res.status(400).json({ success: false, error: "Invalid mode. Must be 'manual', 'ai', or 'scheduled'" });
  }

  const prevMode = state.system.mode;
  state.system.mode = mode;

  // Clear manual overrides when switching modes
  state.devices.forEach(d => {
    d.manualOverride = false;
    d.overrideUntil = null;
  });

  addLog({
    appliance: "System",
    deviceId: "system",
    previousState: prevMode.toUpperCase(),
    newState: mode.toUpperCase(),
    mode: mode.toUpperCase(),
    triggerType: "Mode Change",
    reason: `Operating mode changed to ${mode.toUpperCase()} by user.`,
    status: "Confirmed (ACK)"
  });

  broadcast('SYSTEM_UPDATED', state.system);
  res.json({ success: true, mode });
});

// AI Rules update
app.post('/api/ai/rules', (req, res) => {
  const { ruleId, updates } = req.body;
  if (!state.aiRules[ruleId]) {
    return res.status(404).json({ success: false, error: "Rule not found" });
  }

  Object.assign(state.aiRules[ruleId], updates);
  broadcast('RULES_UPDATED', state.aiRules);
  res.json({ success: true, rules: state.aiRules });
});

// Schedules CRUD
app.get('/api/schedules', (req, res) => {
  res.json({ success: true, schedules: state.schedules });
});

app.post('/api/schedules', (req, res) => {
  const newSched = req.body;
  if (!newSched.name || !newSched.deviceId || !newSched.time) {
    return res.status(400).json({ success: false, error: "Missing schedule fields" });
  }
  newSched.id = `sched-${Date.now()}`;
  state.schedules.push(newSched);
  broadcast('SCHEDULES_UPDATED', state.schedules);
  res.json({ success: true, schedule: newSched });
});

app.delete('/api/schedules/:id', (req, res) => {
  const { id } = req.params;
  state.schedules = state.schedules.filter(s => s.id !== id);
  broadcast('SCHEDULES_UPDATED', state.schedules);
  res.json({ success: true, message: "Schedule deleted" });
});

app.patch('/api/schedules/:id/toggle', (req, res) => {
  const { id } = req.params;
  const sched = state.schedules.find(s => s.id === id);
  if (sched) {
    sched.enabled = !sched.enabled;
    broadcast('SCHEDULES_UPDATED', state.schedules);
    res.json({ success: true, schedule: sched });
  } else {
    res.status(404).json({ success: false, error: "Schedule not found" });
  }
});

// Logs API
app.get('/api/logs', (req, res) => {
  res.json({ success: true, logs: state.logs });
});

app.post('/api/logs/clear', (req, res) => {
  state.logs = [];
  broadcast('LOGS_CLEARED', {});
  res.json({ success: true, message: "Logs cleared" });
});

// ==========================================
// HARDWARE / ESP32 INTEGRATION ENDPOINTS
// ==========================================

// Real ESP32 / ESP8266 Telemetry Ingestion (HTTP POST)
// ESP32 sends: { temperature: 28.5, humidity: 56.2, lux: 820, hardwareId: "ESP32-LIVING-01" }
app.post('/api/hardware/telemetry', (req, res) => {
  const { temperature, humidity, lux, hardwareId } = req.body;

  if (temperature !== undefined) state.sensors.temperature = parseFloat(Number(temperature).toFixed(1));
  if (humidity !== undefined) state.sensors.humidity = parseFloat(Number(humidity).toFixed(1));
  if (lux !== undefined) {
    state.sensors.daylightLux = Number(lux);
    state.sensors.daylightPercent = Math.min(100, Math.round((lux / 1000) * 100));
  }

  state.system.hardwareConnected = true;
  state.system.lastHardwareHeartbeat = Date.now();
  if (hardwareId) state.system.hardwareType = hardwareId;

  broadcast('HARDWARE_HEARTBEAT', {
    hardwareConnected: true,
    lastHardwareHeartbeat: state.system.lastHardwareHeartbeat,
    sensors: state.sensors
  });

  // Respond with the currently desired relay states so ESP32 can actuate relays
  const relayStates = {};
  state.devices.forEach(d => {
    relayStates[d.id] = d.state === "ON" ? 1 : 0;
  });

  res.json({
    success: true,
    ack: true,
    relays: relayStates,
    serverTime: Date.now()
  });
});

// Real ESP32 Relay Feedback Confirmation (HTTP POST)
// ESP32 sends: { deviceId: "fan", confirmedState: "ON" }
app.post('/api/hardware/confirm', (req, res) => {
  const { deviceId, confirmedState } = req.body;
  const device = state.devices.find(d => d.id === deviceId);

  if (device) {
    device.state = confirmedState;
    device.pendingAck = false;
    broadcast('DEVICE_UPDATED', device);
    res.json({ success: true, deviceId, confirmedState });
  } else {
    res.status(404).json({ success: false, error: "Device not found" });
  }
});

// Simulated Hardware Trigger for testing (Simulate Temp Spike, Sensor Fail, Button Press)
app.post('/api/simulation/inject', (req, res) => {
  const { temperature, humidity, lux, hardwareConnected } = req.body;
  if (temperature !== undefined) state.sensors.temperature = Number(temperature);
  if (humidity !== undefined) state.sensors.humidity = Number(humidity);
  if (lux !== undefined) {
    state.sensors.daylightLux = Number(lux);
    state.sensors.daylightPercent = Math.min(100, Math.round((lux / 1000) * 100));
  }
  if (hardwareConnected !== undefined) state.system.hardwareConnected = Boolean(hardwareConnected);

  broadcast('TELEMETRY_UPDATE', {
    sensors: state.sensors,
    hardwareConnected: state.system.hardwareConnected
  });

  res.json({ success: true, sensors: state.sensors, hardwareConnected: state.system.hardwareConnected });
});

// Settings update
app.post('/api/settings', (req, res) => {
  const { tariffRate, currency, tempUnit, simSpeed, soundEnabled } = req.body;
  if (tariffRate !== undefined) state.system.tariffRate = Number(tariffRate);
  if (currency !== undefined) state.system.currency = currency;
  if (tempUnit !== undefined) state.system.tempUnit = tempUnit;
  if (simSpeed !== undefined) state.system.simSpeed = Number(simSpeed);
  if (soundEnabled !== undefined) state.system.soundEnabled = Boolean(soundEnabled);

  broadcast('SETTINGS_UPDATED', state.system);
  res.json({ success: true, settings: state.system });
});

// ==========================================
// WEBSOCKET CONNECTION HANDLER
// ==========================================
wss.on('connection', (ws) => {
  console.log('[WebSocket] Client connected.');

  // Send full initial state snapshot immediately
  ws.send(JSON.stringify({
    type: 'INIT_STATE',
    payload: state,
    timestamp: Date.now()
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
      }
    } catch (e) {
      console.error('[WebSocket] Invalid JSON message:', e);
    }
  });

  ws.on('close', () => {
    console.log('[WebSocket] Client disconnected.');
  });
});

// ==========================================
// START HTTP & WEBSOCKET SERVER
// ==========================================
server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Smart Room Monitoring & Automation System Server`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
  console.log(`⚙️ ESP32 Telemetry API: http://localhost:${PORT}/api/hardware/telemetry`);
  console.log(`=======================================================`);
});
