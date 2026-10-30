// hardware.js - WebSocket Sync, Hardware Feedback Bridge & Simulation Injector
const HardwareBridge = (function() {
  let ws = null;
  let isConnected = false;
  let reconnectInterval = 2000;

  function init() {
    connectWebSocket();
  }

  function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host || 'localhost:3000';
    const wsUrl = `${protocol}//${host}`;

    try {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        isConnected = true;
        reconnectInterval = 2000;
        console.log('[HardwareBridge] WebSocket connection established with server.');
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleServerMessage(message);
        } catch (e) {
          console.error('[HardwareBridge] Failed to parse WebSocket message:', e);
        }
      };

      ws.onclose = () => {
        isConnected = false;
        console.warn('[HardwareBridge] WebSocket disconnected. Retrying in', reconnectInterval / 1000, 'seconds...');
        setTimeout(connectWebSocket, reconnectInterval);
        reconnectInterval = Math.min(reconnectInterval * 1.5, 15000);
      };

      ws.onerror = (err) => {
        // Suppress noisy error when server is starting
      };
    } catch (e) {
      console.warn('[HardwareBridge] Standalone mode (no WebSocket server found). Operating in local simulation mode.');
    }
  }

  function handleServerMessage(msg) {
    const { type, payload } = msg;

    switch (type) {
      case 'INIT_STATE':
        AppState.syncState(payload);
        break;

      case 'TELEMETRY_UPDATE':
        if (payload.sensors) {
          Object.assign(AppState.get().sensors, payload.sensors);
        }
        if (payload.totalKwh !== undefined) {
          // Sync server kWh calculation
          const state = AppState.get();
          state.totalKwh = payload.totalKwh;
          state.totalWatts = payload.totalWatts;
          state.totalCost = payload.totalCost;
        }
        if (payload.hardwareConnected !== undefined) {
          AppState.get().system.hardwareConnected = payload.hardwareConnected;
        }
        AppState.emit('TELEMETRY_UPDATED', payload);
        break;

      case 'DEVICE_PENDING':
        // Show pending feedback spinner for this device
        const devPending = AppState.get().devices.find(d => d.id === payload.deviceId);
        if (devPending) {
          devPending.pendingAck = true;
          devPending.requestedState = payload.requestedState;
          AppState.emit('DEVICE_PENDING_ACK', payload);
        }
        break;

      case 'DEVICE_UPDATED':
        // Hardware state confirmed
        const dev = AppState.get().devices.find(d => d.id === payload.id);
        if (dev) {
          Object.assign(dev, payload);
          dev.pendingAck = false;
          AppState.emit('DEVICE_CONFIRMED', dev);
        }
        break;

      case 'NEW_LOG':
        AppState.get().logs.unshift(payload);
        if (AppState.get().logs.length > 100) AppState.get().logs.pop();
        AppState.emit('LOGS_UPDATED', AppState.get().logs);
        break;

      case 'HISTORY_POINT':
        if (window.DashboardCharts) {
          window.DashboardCharts.pushTelemetryPoint(payload);
        }
        break;

      case 'SYSTEM_UPDATED':
        Object.assign(AppState.get().system, payload);
        AppState.emit('SYSTEM_UPDATED', payload);
        break;

      case 'RULES_UPDATED':
        AppState.get().aiRules = payload;
        AppState.emit('RULES_UPDATED', payload);
        break;

      case 'SCHEDULES_UPDATED':
        AppState.get().schedules = payload;
        AppState.emit('SCHEDULES_UPDATED', payload);
        break;

      case 'HARDWARE_HEARTBEAT':
        AppState.get().system.hardwareConnected = payload.hardwareConnected;
        AppState.get().system.lastHardwareHeartbeat = payload.lastHardwareHeartbeat;
        AppState.emit('HARDWARE_STATUS_CHANGED', payload);
        break;
    }
  }

  // Send remote control command to server
  async function sendControl(deviceId, targetState, triggerType = "Manual Control", reason = "") {
    const device = AppState.get().devices.find(d => d.id === deviceId);
    if (!device) return;

    device.pendingAck = true;
    device.requestedState = targetState;
    AppState.emit('DEVICE_PENDING_ACK', { deviceId, requestedState: targetState });

    try {
      const res = await fetch(`/api/devices/${deviceId}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: targetState, triggerType, reason })
      });

      if (!res.ok) throw new Error('Network response was not ok');
      const data = await res.json();
      return data;
    } catch (e) {
      // Local fallback simulation if server is unreachable
      setTimeout(() => {
        device.pendingAck = false;
        device.state = targetState;
        if (targetState === "ON") {
          device.currentRunStart = Date.now();
          device.currentWatts = device.ratedWatts;
        } else {
          device.currentRunStart = null;
          device.currentWatts = 0;
        }

        const logEntry = {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          timeFormatted: new Date().toLocaleTimeString(),
          appliance: device.name,
          deviceId: device.id,
          previousState: targetState === "ON" ? "OFF" : "ON",
          newState: targetState,
          mode: AppState.get().system.mode.toUpperCase(),
          triggerType,
          reason: reason || `User toggled ${device.name} to ${targetState}.`,
          status: "Confirmed (ACK)"
        };
        AppState.get().logs.unshift(logEntry);
        AppState.emit('DEVICE_CONFIRMED', device);
        AppState.emit('LOGS_UPDATED', AppState.get().logs);
      }, 250);
    }
  }

  // Switch Operating Mode
  async function setSystemMode(mode) {
    AppState.get().system.mode = mode;
    AppState.emit('SYSTEM_UPDATED', AppState.get().system);

    try {
      await fetch('/api/system/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      });
    } catch (e) {
      // In local offline mode, state is already updated
    }
  }

  // Inject Simulated Temperature / Lux
  async function injectSimulation(params) {
    const sensors = AppState.get().sensors;
    if (params.temperature !== undefined) sensors.temperature = params.temperature;
    if (params.lux !== undefined) {
      sensors.daylightLux = params.lux;
      sensors.daylightPercent = Math.min(100, Math.round((params.lux / 1000) * 100));
    }
    if (params.hardwareConnected !== undefined) {
      AppState.get().system.hardwareConnected = params.hardwareConnected;
    }

    AppState.emit('TELEMETRY_UPDATED', { sensors, hardwareConnected: AppState.get().system.hardwareConnected });

    try {
      await fetch('/api/simulation/inject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
    } catch (e) {}
  }

  return {
    init,
    sendControl,
    setSystemMode,
    injectSimulation,
    isWsConnected: () => isConnected
  };
})();

// Attach globally
window.HardwareBridge = HardwareBridge;
