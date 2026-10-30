// state.js - Reactive State Store and Data Utilities
const AppState = (function() {
  const listeners = {};

  const state = {
    system: {
      name: "AuraSense AI Smart Room",
      room: "Master Suite & Study",
      mode: "ai", // 'manual' | 'ai' | 'scheduled'
      status: "online",
      hardwareConnected: false,
      hardwareType: "ESP32-WROOM-32 (Simulated)",
      tariffRate: 8.50,
      currency: "₹",
      tempUnit: "C",
      simSpeed: 1,
      soundEnabled: true,
      lastHardwareHeartbeat: null
    },
    sensors: {
      temperature: 28.4,
      targetComfortTemp: 24.0,
      tempTrend: "rising",
      humidity: 58.0,
      humidityStatus: "Optimal",
      daylightLux: 780,
      daylightPercent: 78,
      isDaytime: true,
      airQualityIndex: 42,
      noiseLevel: 36
    },
    devices: [
      {
        id: "fan",
        name: "Ceiling Fan",
        type: "fan",
        icon: "fa-fan",
        room: "Master Suite",
        pin: "GPIO 26 (Relay 1)",
        ratedWatts: 75,
        currentWatts: 0,
        state: "OFF",
        requestedState: "OFF",
        pendingAck: false,
        speed: 3,
        currentRunStart: null,
        totalDurationSecondsToday: 5420,
        totalKwhToday: 0.113,
        manualOverride: false,
        overrideUntil: null
      },
      {
        id: "ac",
        name: "Smart Air Conditioner",
        type: "ac",
        icon: "fa-snowflake",
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
        icon: "fa-lightbulb",
        room: "Master Suite",
        pin: "GPIO 14 (Relay 3)",
        ratedWatts: 45,
        currentWatts: 45,
        state: "ON",
        requestedState: "ON",
        pendingAck: false,
        brightness: 80,
        currentRunStart: Date.now() - (45 * 60 * 1000),
        totalDurationSecondsToday: 6800,
        totalKwhToday: 0.085,
        manualOverride: false,
        overrideUntil: null
      },
      {
        id: "tv",
        name: "Smart OLED Television",
        type: "tv",
        icon: "fa-tv",
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
        icon: "fa-wind",
        room: "Master Suite",
        pin: "GPIO 13 (Smart Plug 2)",
        ratedWatts: 38,
        currentWatts: 38,
        state: "ON",
        requestedState: "ON",
        pendingAck: false,
        mode: "auto",
        currentRunStart: Date.now() - (120 * 60 * 1000),
        totalDurationSecondsToday: 14400,
        totalKwhToday: 0.152,
        manualOverride: false,
        overrideUntil: null
      },
      {
        id: "geyser",
        name: "Bathroom Water Heater",
        type: "heater",
        icon: "fa-fire-burner",
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
        triggerHighTemp: 28.0,
        turnOffLowTemp: 25.5,
        minCycleSeconds: 30,
        lastSwitched: 0
      },
      daylightLights: {
        id: "daylightLights",
        name: "Daylight Energy Saver",
        enabled: true,
        luxThreshold: 500,
        daylightPercentThreshold: 60,
        maxDaytimeMinutes: 30,
        startTime: "07:00",
        endTime: "18:00",
        lastSwitched: 0
      },
      acComfort: {
        id: "acComfort",
        name: "Extreme Heat AC Assist",
        enabled: true,
        triggerHighTemp: 31.0,
        targetTemp: 24.0,
        minCycleSeconds: 120,
        lastSwitched: 0
      },
      idleEnergyShed: {
        id: "idleEnergyShed",
        name: "Overrun Idle Protection",
        enabled: true,
        maxTvContinuousHours: 4,
        maxGeyserMinutes: 45,
        lastSwitched: 0
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
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        timeFormatted: new Date(Date.now() - 7200000).toLocaleTimeString(),
        appliance: "Air Purifier",
        deviceId: "purifier",
        previousState: "OFF",
        newState: "ON",
        mode: "AI AUTOMATIC",
        triggerType: "AI Rule",
        reason: "PM2.5 particulate count rose to 65 µg/m³. Auto air cleaning engaged.",
        status: "Confirmed (ACK)"
      },
      {
        id: "log-2",
        timestamp: new Date(Date.now() - 4320000).toISOString(),
        timeFormatted: new Date(Date.now() - 4320000).toLocaleTimeString(),
        appliance: "Water Heater",
        deviceId: "geyser",
        previousState: "ON",
        newState: "OFF",
        mode: "AI AUTOMATIC",
        triggerType: "Safety Overrun",
        reason: "Maximum continuous run timer (30 mins) reached. Cut off for safety and energy saving.",
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
        mode: "MANUAL",
        triggerType: "Manual Control",
        reason: "User turned switch ON via web dashboard.",
        status: "Confirmed (ACK)"
      }
    ],
    recommendations: [
      {
        id: "rec-daylight",
        title: "Abundant Natural Light Available",
        message: "Room has 78% natural daylight. Turning off Ambient Lights will save ~0.35 kWh today.",
        savings: "0.35 kWh (~₹2.97)",
        actionType: "turnOff",
        targetDevice: "lights",
        severity: "low"
      }
    ],
    telemetryHistory: []
  };

  // Dispatch events to registered subscribers
  function emit(event, data) {
    if (listeners[event]) {
      listeners[event].forEach(fn => fn(data));
    }
  }

  return {
    get() {
      return state;
    },
    on(event, callback) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(callback);
    },
    emit,
    
    // Update whole state from server snapshot
    syncState(newState) {
      if (!newState) return;
      if (newState.system) Object.assign(state.system, newState.system);
      if (newState.sensors) Object.assign(state.sensors, newState.sensors);
      if (newState.devices) state.devices = newState.devices;
      if (newState.aiRules) state.aiRules = newState.aiRules;
      if (newState.schedules) state.schedules = newState.schedules;
      if (newState.logs) state.logs = newState.logs;
      if (newState.recommendations) state.recommendations = newState.recommendations;
      if (newState.telemetryHistory && newState.telemetryHistory.length > 0) {
        state.telemetryHistory = newState.telemetryHistory;
      }
      emit('STATE_UPDATED', state);
    },

    // Format duration in seconds to "1h 42m 15s" or "35m 12s" or "45s"
    formatDuration(totalSeconds) {
      if (!totalSeconds || isNaN(totalSeconds) || totalSeconds < 0) return "0s";
      const s = Math.floor(totalSeconds % 60);
      const m = Math.floor((totalSeconds / 60) % 60);
      const h = Math.floor(totalSeconds / 3600);

      if (h > 0) {
        return `${h}h ${m}m ${s < 10 ? '0' : ''}${s}s`;
      } else if (m > 0) {
        return `${m}m ${s < 10 ? '0' : ''}${s}s`;
      } else {
        return `${s}s`;
      }
    },

    // Convert and format temperature according to unit preference
    formatTemp(celsiusVal) {
      if (celsiusVal === undefined || isNaN(celsiusVal)) return "--";
      if (state.system.tempUnit === "F") {
        const f = (celsiusVal * 9/5) + 32;
        return f.toFixed(1);
      }
      return Number(celsiusVal).toFixed(1);
    },

    // Format currency
    formatCurrency(amount) {
      return `${state.system.currency}${Number(amount || 0).toFixed(2)}`;
    }
  };
})();
