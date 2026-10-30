// ai-engine.js - AI Decision Engine, Hysteresis, Safety Guards & Explainability
const AiEngine = (function() {

  function evaluate(now) {
    const state = AppState.get();
    if (state.system.mode !== "ai") return;

    const { fanThermal, daylightLights, acComfort, idleEnergyShed } = state.aiRules;

    // --- RULE 1: FAN THERMAL AUTOMATION ---
    if (fanThermal && fanThermal.enabled) {
      const fan = state.devices.find(d => d.id === "fan");
      if (fan) {
        const timeSinceLastSwitch = (now - (fanThermal.lastSwitched || 0)) / 1000;
        const canSwitch = timeSinceLastSwitch >= fanThermal.minCycleSeconds;

        // Check if under manual override hold
        const isOverridden = fan.manualOverride && fan.overrideUntil && now < fan.overrideUntil;

        if (!isOverridden && canSwitch) {
          if (state.sensors.temperature >= fanThermal.triggerHighTemp && fan.state === "OFF") {
            fanThermal.lastSwitched = now;
            executeAction(
              "fan",
              "ON",
              "AI Rule",
              `Room temperature (${state.sensors.temperature}°C) exceeded thermal threshold (${fanThermal.triggerHighTemp}°C). Ceiling fan automatically engaged.`
            );
          } else if (state.sensors.temperature <= fanThermal.turnOffLowTemp && fan.state === "ON") {
            fanThermal.lastSwitched = now;
            executeAction(
              "fan",
              "OFF",
              "AI Rule",
              `Room temperature (${state.sensors.temperature}°C) dropped below comfort hysteresis floor (${fanThermal.turnOffLowTemp}°C). Fan switched OFF to conserve electricity.`
            );
          }
        }
      }
    }

    // --- RULE 2: SMART DAYLIGHT LIGHT AUTOMATION ---
    if (daylightLights && daylightLights.enabled) {
      const lights = state.devices.find(d => d.id === "lights");
      if (lights && lights.state === "ON" && lights.currentRunStart) {
        const runMins = (now - lights.currentRunStart) / 60000;
        const timeSinceLastSwitch = (now - (daylightLights.lastSwitched || 0)) / 1000;
        const isOverridden = lights.manualOverride && lights.overrideUntil && now < lights.overrideUntil;

        if (!isOverridden && timeSinceLastSwitch >= 20) {
          if (state.sensors.daylightPercent >= daylightLights.daylightPercentThreshold &&
              runMins >= daylightLights.maxDaytimeMinutes) {
            daylightLights.lastSwitched = now;
            executeAction(
              "lights",
              "OFF",
              "AI Rule",
              `Natural daylight is sufficient (${state.sensors.daylightPercent}% / ${state.sensors.daylightLux} Lux) and lights ran for ${Math.round(runMins)} mins. Automatically switched OFF.`
            );
          }
        }
      }
    }

    // --- RULE 3: EXTREME HEAT AC COMFORT ASSIST ---
    if (acComfort && acComfort.enabled) {
      const ac = state.devices.find(d => d.id === "ac");
      if (ac && ac.state === "OFF") {
        const timeSinceLastSwitch = (now - (acComfort.lastSwitched || 0)) / 1000;
        const isOverridden = ac.manualOverride && ac.overrideUntil && now < ac.overrideUntil;

        if (!isOverridden && timeSinceLastSwitch >= acComfort.minCycleSeconds) {
          if (state.sensors.temperature >= acComfort.triggerHighTemp) {
            acComfort.lastSwitched = now;
            executeAction(
              "ac",
              "ON",
              "AI Rule",
              `Room temperature reached extreme high (${state.sensors.temperature}°C >= ${acComfort.triggerHighTemp}°C). Smart AC engaged for emergency cooling.`
            );
          }
        }
      }
    }

    // --- RULE 4: OVERRUN SHEDDING ---
    if (idleEnergyShed && idleEnergyShed.enabled) {
      const geyser = state.devices.find(d => d.id === "geyser");
      if (geyser && geyser.state === "ON" && geyser.currentRunStart) {
        const geyserMins = (now - geyser.currentRunStart) / 60000;
        if (geyserMins >= idleEnergyShed.maxGeyserMinutes) {
          executeAction(
            "geyser",
            "OFF",
            "Safety Overrun",
            `Water heater continuous run time (${Math.round(geyserMins)} mins) exceeded safety threshold (${idleEnergyShed.maxGeyserMinutes} mins). Cut off for fire safety and energy saving.`
          );
        }
      }
    }
  }

  // Execute AI action with state mutation, logging, audio chime and toast notification
  function executeAction(deviceId, targetState, triggerType, reason) {
    const state = AppState.get();
    const device = state.devices.find(d => d.id === deviceId);
    if (!device) return;

    if (device.state === targetState) return;

    // Send control request to Hardware Bridge / Server if available
    if (window.HardwareBridge) {
      window.HardwareBridge.sendControl(deviceId, targetState, triggerType, reason);
    } else {
      // Local fallback execution
      const prevState = device.state;
      device.state = targetState;
      device.requestedState = targetState;

      if (targetState === "ON") {
        device.currentRunStart = Date.now();
        device.currentWatts = device.ratedWatts;
      } else {
        device.currentRunStart = null;
        device.currentWatts = 0;
      }

      // Add log
      const logEntry = {
        id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        timeFormatted: new Date().toLocaleTimeString(),
        appliance: device.name,
        deviceId: device.id,
        previousState: prevState,
        newState: targetState,
        mode: state.system.mode.toUpperCase(),
        triggerType,
        reason,
        status: "Confirmed (ACK)"
      };
      state.logs.unshift(logEntry);
      if (state.logs.length > 100) state.logs.pop();
    }

    // Sound effect & toast
    if (window.SoundFX) {
      window.SoundFX.playAiChime();
    }

    if (window.App && window.App.showToast) {
      window.App.showToast(
        `AI Automated Action: ${device.name}`,
        reason,
        "ai"
      );
    }

    AppState.emit('AI_ACTION_EXECUTED', { deviceId, targetState, reason });
  }

  return {
    evaluate,
    executeAction
  };
})();

// Attach globally for simulation integration
window.AiEngine = AiEngine;
