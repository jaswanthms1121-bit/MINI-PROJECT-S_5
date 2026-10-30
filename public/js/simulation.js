// simulation.js - Real-time Physics Engine & Device Operating Timers
const SimulationEngine = (function() {
  let simTimer = null;
  let tickCount = 0;

  function init() {
    if (simTimer) clearInterval(simTimer);

    simTimer = setInterval(() => {
      tick();
    }, 1000);
  }

  function tick() {
    tickCount++;
    const state = AppState.get();
    const now = Date.now();
    const speed = state.system.simSpeed || 1;

    // 1. Ticking timers for all active appliances
    let anyRunning = false;
    let totalInstantWatts = 0;

    state.devices.forEach(dev => {
      if (dev.state === "ON") {
        anyRunning = true;
        totalInstantWatts += dev.currentWatts || dev.ratedWatts;

        // Increment session duration
        dev.totalDurationSecondsToday += (1 * speed);

        // Increment power consumption (kWh)
        const incrementalKwh = ((dev.currentWatts || dev.ratedWatts) / 1000) * (1 / 3600) * speed;
        dev.totalKwhToday = (dev.totalKwhToday || 0) + incrementalKwh;
      }
    });

    // 2. Client-side thermal & ambient physics update
    // (Operates if not connected to real hardware or if server connection drops)
    if (!state.system.hardwareConnected) {
      const nowObj = new Date();
      const currentHour = nowObj.getHours() + (nowObj.getMinutes() / 60) + (nowObj.getSeconds() / 3600);

      // Outdoor solar temperature cycle (peak at 14:00, coolest at 05:00)
      const outdoorTemp = 26 + 6 * Math.sin(((currentHour - 8) / 24) * 2 * Math.PI);

      // Appliance heat/cooling contribution
      let netHeat = 0;
      const ac = state.devices.find(d => d.id === "ac");
      const fan = state.devices.find(d => d.id === "fan");
      const geyser = state.devices.find(d => d.id === "geyser");
      const tv = state.devices.find(d => d.id === "tv");

      if (ac && ac.state === "ON") netHeat -= 0.04;
      if (fan && fan.state === "ON") netHeat -= 0.01;
      if (geyser && geyser.state === "ON") netHeat += 0.03;
      if (tv && tv.state === "ON") netHeat += 0.01;

      // Slight natural drift + thermal micro-variations
      const tempDrift = (outdoorTemp - state.sensors.temperature) * 0.003;
      const microNoise = Math.sin(tickCount * 0.2) * 0.01;
      const nextTemp = state.sensors.temperature + tempDrift + netHeat + microNoise;

      state.sensors.tempTrend = nextTemp > state.sensors.temperature ? "rising" : nextTemp < state.sensors.temperature ? "falling" : "stable";
      state.sensors.temperature = parseFloat(nextTemp.toFixed(2));

      // Ambient Daylight Lux calculation based on time of day
      if (currentHour >= 6 && currentHour <= 18.5) {
        const sunAngle = Math.sin(((currentHour - 6) / 12.5) * Math.PI);
        state.sensors.daylightPercent = Math.max(0, Math.min(100, Math.round(sunAngle * 100)));
        state.sensors.daylightLux = Math.round(sunAngle * 1150 + Math.random() * 20);
        state.sensors.isDaytime = true;
      } else {
        state.sensors.daylightPercent = 0;
        state.sensors.daylightLux = Math.round(5 + Math.random() * 5);
        state.sensors.isDaytime = false;
      }
    }

    // 3. Trigger client AI Evaluation
    if (state.system.mode === "ai" && window.AiEngine) {
      window.AiEngine.evaluate(now);
    }

    // 4. Emit periodic tick update for live UI binding (duration strings, instant watts, etc.)
    AppState.emit('SIM_TICK', {
      now,
      totalInstantWatts,
      devices: state.devices,
      sensors: state.sensors
    });
  }

  return {
    init,
    tick
  };
})();
