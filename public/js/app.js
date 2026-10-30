// app.js - Master Application Controller, UI Rendering & Event Handling
const App = (function() {

  // --- INITIALIZATION ---
  function init() {
    setupNavigation();
    setupClock();
    setupModeSelector();
    setupDeviceGrid();
    setupDetailedDevices();
    setupSchedules();
    setupActivityLogs();
    setupEnergyTable();
    setupHardwareSimulator();
    setupSettings();
    setupModals();
    setupStateListeners();

    // Start subsystems
    SimulationEngine.init();
    HardwareBridge.init();
    if (window.DashboardCharts) {
      DashboardCharts.init();
    }

    renderRecommendations();
    loadArduinoSketchPreview();

    console.log('[AuraSense AI] Application initialized successfully.');
  }

  // --- TOP CLOCK & DATE ---
  function setupClock() {
    function update() {
      const now = new Date();
      const clockEl = document.getElementById('navLiveClock');
      const dateEl = document.getElementById('navLiveDate');
      if (clockEl) clockEl.textContent = now.toLocaleTimeString();
      if (dateEl) {
        const options = { month: 'short', day: 'numeric', year: 'numeric' };
        dateEl.textContent = now.toLocaleDateString(undefined, options);
      }
    }
    update();
    setInterval(update, 1000);
  }

  // --- NAVIGATION & TABS ---
  function setupNavigation() {
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item, .link-small');
    const mobileToggle = document.getElementById('mobileToggleBtn');
    const mobileClose = document.getElementById('mobileSidebarClose');
    const sidebar = document.getElementById('sidebar');

    function switchTab(targetTab) {
      document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
      document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => item.classList.remove('active'));

      const targetPanel = document.getElementById(`tab-${targetTab}`);
      if (targetPanel) targetPanel.classList.add('active');

      const activeNavItem = document.querySelector(`.sidebar-nav .nav-item[data-tab="${targetTab}"]`);
      if (activeNavItem) activeNavItem.classList.add('active');

      // Update Top Page Title
      const titleMap = {
        dashboard: { title: "Smart Room Overview", sub: "Live telemetry, appliance automation & AI intelligence" },
        devices: { title: "Appliance Management", sub: "Individual hardware controls, timers, and power ratings" },
        automation: { title: "AI Automation Rules", sub: "Autonomous decision engine thresholds & explainability" },
        energy: { title: "Energy Analytics & Tariffs", sub: "Cumulative electricity tracking, costs & carbon savings" },
        schedules: { title: "Scheduled Automation", sub: "Time-of-day appliance routines and weekly timers" },
        logs: { title: "Audit Trail & AI Log", sub: "Complete historical record of triggers, states, and reasons" },
        hardware: { title: "ESP32 & IoT Bridge", sub: "Microcontroller schematics, MQTT topics, and test injection" },
        settings: { title: "System Preferences", sub: "Localization, tariffs, audio micro-interactions, and speed" }
      };

      if (titleMap[targetTab]) {
        document.getElementById('pageTitle').textContent = titleMap[targetTab].title;
        document.getElementById('pageSubtitle').textContent = titleMap[targetTab].sub;
      }

      // Close mobile sidebar if open
      if (sidebar) sidebar.classList.remove('open');
      window.location.hash = targetTab;
    }

    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        const tab = item.getAttribute('data-tab');
        if (tab) {
          e.preventDefault();
          switchTab(tab);
        }
      });
    });

    if (mobileToggle) {
      mobileToggle.addEventListener('click', () => {
        if (sidebar) sidebar.classList.add('open');
      });
    }

    if (mobileClose) {
      mobileClose.addEventListener('click', () => {
        if (sidebar) sidebar.classList.remove('open');
      });
    }

    // Hash check on load
    const hash = window.location.hash.replace('#', '');
    if (hash && document.getElementById(`tab-${hash}`)) {
      switchTab(hash);
    }
  }

  // --- OPERATING MODE SELECTOR ---
  function setupModeSelector() {
    const modeButtons = document.querySelectorAll('#modeSelectorGroup .mode-btn');

    modeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-mode');
        updateMode(mode);
      });
    });
  }

  function updateMode(mode) {
    const buttons = document.querySelectorAll('#modeSelectorGroup .mode-btn');
    buttons.forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-mode') === mode);
    });

    HardwareBridge.setSystemMode(mode);

    // Audio feedback
    if (SoundFX.isEnabled()) SoundFX.playAiChime();

    const tag = document.getElementById('aiModeHeaderTag');
    const explainer = document.getElementById('currentModeExplainer');
    const statusTitle = document.getElementById('aiStatusTitle');
    const statusReason = document.getElementById('aiStatusReason');

    if (mode === 'manual') {
      if (tag) {
        tag.textContent = "Manual Mode";
        tag.style.background = "rgba(6, 182, 212, 0.2)";
        tag.style.color = "#38bdf8";
        tag.style.borderColor = "rgba(6, 182, 212, 0.35)";
      }
      if (explainer) explainer.textContent = "Current Mode: Manual (User has complete control. AI only suggests actions).";
      if (statusTitle) statusTitle.textContent = "AI Advisory Mode (Manual Active)";
      if (statusReason) statusReason.textContent = "AI will detect conditions and provide recommendations, but will NOT switch appliances automatically.";
      showToast("Operating Mode Switched", "Manual Mode activated. AI automation paused.", "info");
    } else if (mode === 'ai') {
      if (tag) {
        tag.textContent = "AI Auto Active";
        tag.style.background = "rgba(139, 92, 246, 0.2)";
        tag.style.color = "#c084fc";
        tag.style.borderColor = "rgba(139, 92, 246, 0.35)";
      }
      if (explainer) explainer.textContent = "Current Mode: AI Automatic (Autonomous execution with explainability logs).";
      if (statusTitle) statusTitle.textContent = "Autonomous AI Guard Active";
      if (statusReason) statusReason.textContent = "Evaluating thermal sensors, daylight levels, and appliance run times every 1000ms.";
      showToast("Operating Mode Switched", "AI Automatic Mode engaged. Decision rules active.", "ai");
    } else if (mode === 'scheduled') {
      if (tag) {
        tag.textContent = "Scheduled Mode";
        tag.style.background = "rgba(245, 158, 11, 0.2)";
        tag.style.color = "#fbbf24";
        tag.style.borderColor = "rgba(245, 158, 11, 0.35)";
      }
      if (explainer) explainer.textContent = "Current Mode: Scheduled (Appliances follow strict daily schedules).";
      if (statusTitle) statusTitle.textContent = "Schedule Routine Active";
      if (statusReason) statusReason.textContent = "Running configured time-of-day routines for weekdays and weekends.";
      showToast("Operating Mode Switched", "Scheduled Mode active.", "warn");
    }
  }

  // --- DEVICE CARDS GRID (PRIMARY MONITORING) ---
  function setupDeviceGrid() {
    renderDeviceCards();

    // Master All-Off Button
    const masterOffBtn = document.getElementById('masterOffBtn');
    if (masterOffBtn) {
      masterOffBtn.addEventListener('click', () => {
        const state = AppState.get();
        state.devices.forEach(d => {
          if (d.state === "ON") {
            HardwareBridge.sendControl(d.id, "OFF", "Manual Control", "Master All-Off button pressed by user.");
          }
        });
        showToast("Master Control", "Sent OFF commands to all appliances.", "info");
      });
    }

    // Refresh Sync Button
    const refreshBtn = document.getElementById('refreshDevicesBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        renderDeviceCards();
        showToast("Hardware State Synced", "Refreshed live feedback states.", "success");
      });
    }
  }

  function renderDeviceCards() {
    const grid = document.getElementById('devicesGrid');
    if (!grid) return;

    const state = AppState.get();
    grid.innerHTML = '';

    state.devices.forEach(dev => {
      const card = createDeviceCardElement(dev);
      grid.appendChild(card);
    });
  }

  function createDeviceCardElement(dev) {
    const state = AppState.get();
    const card = document.createElement('div');
    card.className = `device-card ${dev.state === 'ON' ? 'is-on' : ''}`;
    card.id = `card-${dev.id}`;

    // Calculate duration string
    const durationFormatted = AppState.formatDuration(dev.totalDurationSecondsToday);
    const costEstimate = AppState.formatCurrency(dev.totalKwhToday * state.system.tariffRate);

    // Override pill
    const overridePill = (dev.manualOverride && dev.overrideUntil && Date.now() < dev.overrideUntil) 
      ? `<span class="override-badge">User Override</span>` : '';

    // Secondary controls template (Speed for Fan, Setpoint for AC, Dimmer for Lights)
    let secondaryControlsHtml = '';
    if (dev.id === 'fan') {
      secondaryControlsHtml = `
        <div class="device-secondary-controls">
          <span class="text-xs text-muted">Fan Speed:</span>
          <div class="speed-stepper">
            ${[1, 2, 3, 4, 5].map(lvl => `
              <button class="speed-btn ${dev.speed === lvl ? 'active' : ''}" data-speed="${lvl}">${lvl}</button>
            `).join('')}
          </div>
        </div>
      `;
    } else if (dev.id === 'ac') {
      secondaryControlsHtml = `
        <div class="device-secondary-controls">
          <span class="text-xs text-muted">Cooling Temp:</span>
          <div class="setpoint-control">
            <button class="setpoint-btn setpoint-down"><i class="fa-solid fa-minus"></i></button>
            <span class="setpoint-value">${dev.setpoint || 23}°C</span>
            <button class="setpoint-btn setpoint-up"><i class="fa-solid fa-plus"></i></button>
          </div>
        </div>
      `;
    }

    card.innerHTML = `
      ${overridePill}
      <div class="card-header-row">
        <div class="device-identity">
          <div class="device-avatar">
            <i class="fa-solid ${dev.icon}"></i>
          </div>
          <div class="device-name-group">
            <h4>${dev.name}</h4>
            <div class="device-meta">
              <span>${dev.room}</span>
              <span class="hw-pin-tag">${dev.pin}</span>
            </div>
          </div>
        </div>

        <div class="switch-control-wrap ${dev.pendingAck ? 'pending' : ''}">
          <i class="fa-solid fa-spinner ack-spinner"></i>
          <label class="switch">
            <input type="checkbox" class="device-toggle-input" ${dev.state === 'ON' ? 'checked' : ''}>
            <span class="slider round"></span>
          </label>
        </div>
      </div>

      <!-- Live Operating Duration Timer -->
      <div class="device-timer-box">
        <div class="timer-label-row">
          <span class="timer-ticking-dot"></span>
          <span>${dev.state === 'ON' ? 'Running Duration:' : 'Operating Today:'}</span>
        </div>
        <div class="timer-live-value" id="timer-val-${dev.id}">${durationFormatted}</div>
      </div>

      ${secondaryControlsHtml}

      <!-- Power & Energy Metrics Footer -->
      <div class="card-metrics-footer">
        <div>
          <span>Draw: </span>
          <strong class="metric-val" id="watts-val-${dev.id}">${dev.state === 'ON' ? dev.currentWatts : 0} W</strong>
          <span class="text-xs text-muted">(${dev.ratedWatts}W Rated)</span>
        </div>
        <div>
          <span>Energy: </span>
          <strong class="metric-val" id="kwh-val-${dev.id}">${dev.totalKwhToday.toFixed(3)} kWh</strong>
          <span class="text-xs text-muted" id="cost-val-${dev.id}">(${costEstimate})</span>
        </div>
      </div>
    `;

    // Bind Toggle Switch
    const toggle = card.querySelector('.device-toggle-input');
    toggle.addEventListener('change', (e) => {
      const targetState = e.target.checked ? "ON" : "OFF";
      
      // Sound effect
      if (targetState === "ON") {
        SoundFX.playSwitchOn();
      } else {
        SoundFX.playSwitchOff();
      }

      HardwareBridge.sendControl(
        dev.id,
        targetState,
        "Manual Control",
        `User manually toggled switch to ${targetState} on dashboard.`
      );
    });

    // Bind Fan Speed Steppers
    if (dev.id === 'fan') {
      const speedBtns = card.querySelectorAll('.speed-btn');
      speedBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const spd = Number(btn.getAttribute('data-speed'));
          dev.speed = spd;
          speedBtns.forEach(b => b.classList.toggle('active', b === btn));
          SoundFX.playSwitchOn();
          fetch(`/api/devices/fan/control`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ speed: spd })
          }).catch(() => {});
        });
      });
    }

    // Bind AC Setpoint Stepper
    if (dev.id === 'ac') {
      const downBtn = card.querySelector('.setpoint-down');
      const upBtn = card.querySelector('.setpoint-up');
      const valEl = card.querySelector('.setpoint-value');

      if (downBtn && upBtn) {
        downBtn.addEventListener('click', () => {
          dev.setpoint = Math.max(16, (dev.setpoint || 23) - 1);
          valEl.textContent = `${dev.setpoint}°C`;
          fetch(`/api/devices/ac/control`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ setpoint: dev.setpoint })
          }).catch(() => {});
        });

        upBtn.addEventListener('click', () => {
          dev.setpoint = Math.min(30, (dev.setpoint || 23) + 1);
          valEl.textContent = `${dev.setpoint}°C`;
          fetch(`/api/devices/ac/control`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ setpoint: dev.setpoint })
          }).catch(() => {});
        });
      }
    }

    return card;
  }

  // Update live card values on tick without redrawing entire DOM
  function updateLiveCardValues() {
    const state = AppState.get();

    state.devices.forEach(dev => {
      const timerEl = document.getElementById(`timer-val-${dev.id}`);
      const wattsEl = document.getElementById(`watts-val-${dev.id}`);
      const kwhEl = document.getElementById(`kwh-val-${dev.id}`);
      const costEl = document.getElementById(`cost-val-${dev.id}`);

      if (timerEl) {
        timerEl.textContent = AppState.formatDuration(dev.totalDurationSecondsToday);
      }
      if (wattsEl) {
        wattsEl.textContent = `${dev.state === 'ON' ? dev.currentWatts : 0} W`;
      }
      if (kwhEl) {
        kwhEl.textContent = `${dev.totalKwhToday.toFixed(3)} kWh`;
      }
      if (costEl) {
        const costStr = AppState.formatCurrency(dev.totalKwhToday * state.system.tariffRate);
        costEl.textContent = `(${costStr})`;
      }
    });

    // Update Top Summary Cards
    const tempEl = document.getElementById('tempValue');
    const humEl = document.getElementById('humidityValue');
    const luxEl = document.getElementById('daylightLuxValue');
    const sunPercentEl = document.getElementById('daylightPercentValue');
    const activeDevEl = document.getElementById('activeDevicesValue');
    const instantWattsEl = document.getElementById('instantWattsValue');
    const totalKwhEl = document.getElementById('totalKwhValue');
    const dailyCostBadge = document.getElementById('dailyCostBadge');
    const activeBadge = document.getElementById('sidebarActiveCount');

    const activeCount = state.devices.filter(d => d.state === 'ON').length;
    const totalWatts = state.devices.reduce((acc, d) => acc + (d.state === 'ON' ? d.currentWatts : 0), 0);
    const totalKwh = state.devices.reduce((acc, d) => acc + d.totalKwhToday, 0);
    const totalCost = totalKwh * state.system.tariffRate;

    if (tempEl) tempEl.textContent = AppState.formatTemp(state.sensors.temperature);
    if (humEl) humEl.textContent = Math.round(state.sensors.humidity);
    if (luxEl) luxEl.textContent = state.sensors.daylightLux;
    if (sunPercentEl) sunPercentEl.textContent = `${state.sensors.daylightPercent}%`;
    if (activeDevEl) activeDevEl.textContent = activeCount;
    if (instantWattsEl) instantWattsEl.textContent = `${totalWatts} W`;
    if (totalKwhEl) totalKwhEl.textContent = totalKwh.toFixed(2);
    if (dailyCostBadge) dailyCostBadge.textContent = `${AppState.formatCurrency(totalCost)} Est.`;
    if (activeBadge) activeBadge.textContent = `${activeCount} ON`;

    // Thermal Status text
    const thermalStatusPill = document.getElementById('thermalStatusPill');
    if (thermalStatusPill) {
      if (state.sensors.temperature >= 28.0) {
        thermalStatusPill.textContent = "Fan Triggered";
        thermalStatusPill.className = "thermal-status-pill warn";
      } else {
        thermalStatusPill.textContent = "Comfort Band";
        thermalStatusPill.className = "thermal-status-pill";
      }
    }
  }

  // --- DETAILED DEVICES TAB (TAB 2) ---
  function setupDetailedDevices() {
    renderDetailedDevices('all');

    const filterBtns = document.querySelectorAll('#tab-devices .filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.getAttribute('data-filter');
        renderDetailedDevices(filter);
      });
    });
  }

  function renderDetailedDevices(filter = 'all') {
    const container = document.getElementById('detailedDevicesContainer');
    if (!container) return;

    const state = AppState.get();
    container.innerHTML = '';

    const filtered = state.devices.filter(d => {
      if (filter === 'on') return d.state === 'ON';
      if (filter === 'off') return d.state === 'OFF';
      return true;
    });

    filtered.forEach(dev => {
      const item = document.createElement('div');
      item.className = 'glass-panel mb-3';
      item.innerHTML = `
        <div class="panel-header" style="margin-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 14px;">
            <div class="device-avatar" style="width: 42px; height: 42px;">
              <i class="fa-solid ${dev.icon}"></i>
            </div>
            <div>
              <h3 style="font-size: 1.05rem;">${dev.name}</h3>
              <p class="panel-sub">${dev.room} &bull; Hardware: <code>${dev.pin}</code></p>
            </div>
          </div>
          <div>
            <span class="status-chip ${dev.state === 'ON' ? 'on' : 'off'}">
              ${dev.state === 'ON' ? '● RUNNING' : '○ STANDBY'}
            </span>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; font-size: 0.8rem;">
          <div><span class="text-muted">Rated Power:</span> <strong>${dev.ratedWatts} W</strong></div>
          <div><span class="text-muted">Today's Duration:</span> <strong>${AppState.formatDuration(dev.totalDurationSecondsToday)}</strong></div>
          <div><span class="text-muted">Accumulated kWh:</span> <strong>${dev.totalKwhToday.toFixed(3)} kWh</strong></div>
          <div><span class="text-muted">Estimated Cost:</span> <strong>${AppState.formatCurrency(dev.totalKwhToday * state.system.tariffRate)}</strong></div>
        </div>
      `;
      container.appendChild(item);
    });
  }

  // --- SCHEDULES (TAB 5) ---
  function setupSchedules() {
    renderSchedules();
  }

  function renderSchedules() {
    const container = document.getElementById('schedulesGridContainer');
    if (!container) return;

    const state = AppState.get();
    container.innerHTML = '';

    state.schedules.forEach(sched => {
      const dev = state.devices.find(d => d.id === sched.deviceId);
      const card = document.createElement('div');
      card.className = 'schedule-card';

      const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
      const daysHtml = days.map(d => `
        <span class="day-badge ${sched.days.includes(d) ? 'active' : ''}">${d.toUpperCase()}</span>
      `).join('');

      card.innerHTML = `
        <div class="sched-header">
          <div>
            <span class="sched-time">${sched.time}</span>
            <span class="sched-action-pill ${sched.action === 'ON' ? 'action-badge-on' : 'action-badge-off'}">${sched.action}</span>
          </div>
          <label class="switch">
            <input type="checkbox" class="sched-toggle-input" ${sched.enabled ? 'checked' : ''}>
            <span class="slider round"></span>
          </label>
        </div>

        <div>
          <h4 style="font-size: 0.95rem; color: #fff;">${sched.name}</h4>
          <p class="text-xs text-muted">Target: <strong>${dev ? dev.name : sched.deviceId}</strong></p>
        </div>

        <div class="sched-days-row">
          ${daysHtml}
        </div>

        <div style="display: flex; justify-content: flex-end; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 10px;">
          <button class="btn btn-xs btn-ghost text-danger delete-sched-btn"><i class="fa-solid fa-trash"></i> Delete</button>
        </div>
      `;

      // Toggle Schedule
      card.querySelector('.sched-toggle-input').addEventListener('change', (e) => {
        sched.enabled = e.target.checked;
        fetch(`/api/schedules/${sched.id}/toggle`, { method: 'PATCH' }).catch(() => {});
        showToast("Schedule Updated", `"${sched.name}" ${sched.enabled ? 'enabled' : 'disabled'}.`, "info");
      });

      // Delete Schedule
      card.querySelector('.delete-sched-btn').addEventListener('click', () => {
        state.schedules = state.schedules.filter(s => s.id !== sched.id);
        fetch(`/api/schedules/${sched.id}`, { method: 'DELETE' }).catch(() => {});
        renderSchedules();
        showToast("Schedule Removed", `Deleted "${sched.name}".`, "info");
      });

      container.appendChild(card);
    });

    const schedCountEl = document.getElementById('sidebarSchedCount');
    if (schedCountEl) schedCountEl.textContent = state.schedules.length;
  }

  // --- ACTIVITY LOGS (TAB 6) ---
  function setupActivityLogs() {
    renderActivityLogs();

    const searchInput = document.getElementById('logSearchInput');
    const filterType = document.getElementById('logFilterType');
    const filterDevice = document.getElementById('logFilterDevice');
    const clearBtn = document.getElementById('clearLogsBtn');
    const exportCsvBtn = document.getElementById('exportLogsCsvBtn');

    if (searchInput) searchInput.addEventListener('input', renderActivityLogs);
    if (filterType) filterType.addEventListener('change', renderActivityLogs);
    if (filterDevice) filterDevice.addEventListener('change', renderActivityLogs);

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        AppState.get().logs = [];
        fetch('/api/logs/clear', { method: 'POST' }).catch(() => {});
        renderActivityLogs();
        showToast("Logs Cleared", "Activity audit log reset.", "info");
      });
    }

    if (exportCsvBtn) {
      exportCsvBtn.addEventListener('click', exportLogsToCsv);
    }
  }

  function renderActivityLogs() {
    const tbody = document.getElementById('logsTableBody');
    const feed = document.getElementById('recentAiActionFeed');
    const state = AppState.get();

    const searchTerm = (document.getElementById('logSearchInput')?.value || '').toLowerCase();
    const typeFilter = document.getElementById('logFilterType')?.value || 'all';
    const devFilter = document.getElementById('logFilterDevice')?.value || 'all';

    const filtered = state.logs.filter(log => {
      if (typeFilter !== 'all' && log.triggerType !== typeFilter) return false;
      if (devFilter !== 'all' && log.deviceId !== devFilter) return false;
      if (searchTerm) {
        const text = `${log.appliance} ${log.reason} ${log.triggerType} ${log.mode}`.toLowerCase();
        if (!text.includes(searchTerm)) return false;
      }
      return true;
    });

    if (tbody) {
      tbody.innerHTML = '';
      if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: 24px;">No matching activity logs found.</td></tr>`;
      } else {
        filtered.forEach(log => {
          const tr = document.createElement('tr');
          const triggerBadgeClass = log.triggerType.includes('AI') ? 'ai' : log.triggerType.includes('Manual') ? 'manual' : 'sched';
          tr.innerHTML = `
            <td><code>${log.timeFormatted || new Date(log.timestamp).toLocaleTimeString()}</code></td>
            <td><strong>${log.appliance}</strong></td>
            <td>
              <span class="status-chip ${log.newState === 'ON' ? 'on' : 'off'}">
                ${log.previousState} &rarr; ${log.newState}
              </span>
            </td>
            <td><span class="text-xs text-muted">${log.mode}</span></td>
            <td><span class="trigger-badge ${triggerBadgeClass}">${log.triggerType}</span></td>
            <td><span style="font-size: 0.78rem; color: #cbd5e1;">${log.reason}</span></td>
            <td><span class="text-xs text-success"><i class="fa-solid fa-circle-check"></i> ${log.status}</span></td>
          `;
          tbody.appendChild(tr);
        });
      }
    }

    // Render Recent AI Actions Feed on Dashboard (Last 4)
    if (feed) {
      feed.innerHTML = '';
      const recent = state.logs.slice(0, 4);
      if (recent.length === 0) {
        feed.innerHTML = `<div class="text-xs text-muted">No recent automated decisions.</div>`;
      } else {
        recent.forEach(log => {
          const item = document.createElement('div');
          item.className = 'action-item';
          item.innerHTML = `
            <div class="action-header-line">
              <span><strong>${log.appliance}</strong> &rarr; <span class="${log.newState === 'ON' ? 'action-badge-on' : 'action-badge-off'}">${log.newState}</span></span>
              <span class="action-time">${log.timeFormatted || new Date(log.timestamp).toLocaleTimeString()}</span>
            </div>
            <div class="action-reason">${log.reason}</div>
          `;
          feed.appendChild(item);
        });
      }
    }
  }

  function exportLogsToCsv() {
    const logs = AppState.get().logs;
    if (logs.length === 0) {
      showToast("Export Notice", "No logs available to export.", "warn");
      return;
    }

    let csv = "Timestamp,Appliance,Previous State,New State,Operating Mode,Trigger Source,Reason,Status\n";
    logs.forEach(l => {
      const cleanReason = `"${(l.reason || '').replace(/"/g, '""')}"`;
      csv += `${l.timestamp},${l.appliance},${l.previousState},${l.newState},${l.mode},${l.triggerType},${cleanReason},${l.status}\n`;
    });

    downloadFile(csv, `aurasense_logs_${Date.now()}.csv`, 'text/csv');
    showToast("CSV Exported", "Activity logs downloaded successfully.", "success");
  }

  // --- ENERGY BREAKDOWN TABLE (TAB 4) ---
  function setupEnergyTable() {
    renderEnergyTable();

    const exportBtn = document.getElementById('exportEnergyCsvBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const state = AppState.get();
        let csv = "Appliance,Rated Watts,Current State,Duration Seconds,Today kWh,Estimated Cost\n";
        state.devices.forEach(d => {
          csv += `${d.name},${d.ratedWatts},${d.state},${d.totalDurationSecondsToday},${d.totalKwhToday.toFixed(3)},${(d.totalKwhToday * state.system.tariffRate).toFixed(2)}\n`;
        });
        downloadFile(csv, `energy_breakdown_${Date.now()}.csv`, 'text/csv');
        showToast("CSV Exported", "Energy table downloaded successfully.", "success");
      });
    }
  }

  function renderEnergyTable() {
    const tbody = document.getElementById('energyTableBody');
    if (!tbody) return;

    const state = AppState.get();
    tbody.innerHTML = '';

    state.devices.forEach(d => {
      const tr = document.createElement('tr');
      const cost = AppState.formatCurrency(d.totalKwhToday * state.system.tariffRate);
      tr.innerHTML = `
        <td><strong>${d.name}</strong></td>
        <td>${d.ratedWatts} W</td>
        <td><span class="status-chip ${d.state === 'ON' ? 'on' : 'off'}">${d.state}</span></td>
        <td>${AppState.formatDuration(d.totalDurationSecondsToday)}</td>
        <td><strong>${d.totalKwhToday.toFixed(3)} kWh</strong></td>
        <td>${cost}</td>
        <td><span class="badge badge-accent">AI Monitored</span></td>
      `;
      tbody.appendChild(tr);
    });

    const statDailyKwh = document.getElementById('statDailyKwh');
    const statDailyCost = document.getElementById('statDailyCost');
    const statMonthlyCost = document.getElementById('statMonthlyCost');

    const totalKwh = state.devices.reduce((acc, d) => acc + d.totalKwhToday, 0);
    const totalCost = totalKwh * state.system.tariffRate;

    if (statDailyKwh) statDailyKwh.textContent = totalKwh.toFixed(2);
    if (statDailyCost) statDailyCost.textContent = AppState.formatCurrency(totalCost);
    if (statMonthlyCost) statMonthlyCost.textContent = AppState.formatCurrency(totalCost * 30);
  }

  // --- RECOMMENDATIONS PANEL ---
  function renderRecommendations() {
    const list = document.getElementById('recommendationsList');
    if (!list) return;

    const recs = AppState.get().recommendations;
    list.innerHTML = '';

    if (recs.length === 0) {
      list.innerHTML = `<div class="text-xs text-muted" style="padding: 6px;">All appliances operating optimally. No energy waste detected.</div>`;
    } else {
      recs.forEach(rec => {
        const item = document.createElement('div');
        item.className = 'rec-item';
        item.innerHTML = `
          <div class="rec-text">
            <strong>${rec.title}</strong>
            <span>${rec.message}</span>
            <div class="rec-savings"><i class="fa-solid fa-leaf"></i> Savings: ${rec.savings}</div>
          </div>
          <button class="rec-apply-btn" data-action="${rec.actionType}" data-target="${rec.targetDevice}">
            Apply Now
          </button>
        `;

        item.querySelector('.rec-apply-btn').addEventListener('click', () => {
          if (rec.actionType === 'turnOff') {
            HardwareBridge.sendControl(rec.targetDevice, "OFF", "Manual Control", `User accepted AI recommendation: ${rec.title}`);
          } else if (rec.actionType === 'turnOn') {
            HardwareBridge.sendControl(rec.targetDevice, "ON", "Manual Control", `User accepted AI recommendation: ${rec.title}`);
          }
          showToast("Recommendation Applied", `Action executed for ${rec.targetDevice}.`, "success");
        });

        list.appendChild(item);
      });
    }

    const badge = document.getElementById('recCountBadge');
    if (badge) badge.textContent = `${recs.length} Found`;
  }

  // --- HARDWARE SIMULATOR & TESTING (TAB 7) ---
  function setupHardwareSimulator() {
    const tempSlider = document.getElementById('simTempSlider');
    const tempBadge = document.getElementById('simTempBadge');
    const luxSlider = document.getElementById('simLuxSlider');
    const luxBadge = document.getElementById('simLuxBadge');

    if (tempSlider && tempBadge) {
      tempSlider.addEventListener('input', (e) => {
        const val = Number(e.target.value);
        tempBadge.textContent = `${val.toFixed(1)}°C`;
        HardwareBridge.injectSimulation({ temperature: val });
      });
    }

    if (luxSlider && luxBadge) {
      luxSlider.addEventListener('input', (e) => {
        const val = Number(e.target.value);
        luxBadge.textContent = `${val} Lux`;
        HardwareBridge.injectSimulation({ lux: val });
      });
    }

    // Quick Preset Temperature Buttons
    document.querySelectorAll('.quick-preset-btns button[data-temp]').forEach(btn => {
      btn.addEventListener('click', () => {
        const t = Number(btn.getAttribute('data-temp'));
        if (tempSlider) tempSlider.value = t;
        if (tempBadge) tempBadge.textContent = `${t.toFixed(1)}°C`;
        HardwareBridge.injectSimulation({ temperature: t });
        showToast("Simulation Injected", `Room temperature forced to ${t}°C`, "info");
      });
    });

    // Quick Preset Lux Buttons
    document.querySelectorAll('.quick-preset-btns button[data-lux]').forEach(btn => {
      btn.addEventListener('click', () => {
        const lx = Number(btn.getAttribute('data-lux'));
        if (luxSlider) luxSlider.value = lx;
        if (luxBadge) luxBadge.textContent = `${lx} Lux`;
        HardwareBridge.injectSimulation({ lux: lx });
        showToast("Simulation Injected", `Daylight Lux forced to ${lx} Lux`, "info");
      });
    });

    // Virtual Edge vs Physical ESP32 Edge toggle
    const btnSetSimulated = document.getElementById('btnSetSimulated');
    const btnSetPhysicalHw = document.getElementById('btnSetPhysicalHw');

    if (btnSetSimulated) {
      btnSetSimulated.addEventListener('click', () => {
        HardwareBridge.injectSimulation({ hardwareConnected: false });
        btnSetSimulated.className = "btn btn-sm btn-primary";
        if (btnSetPhysicalHw) btnSetPhysicalHw.className = "btn btn-sm btn-outline";
        showToast("Edge Mode", "Switched to Virtual Simulation Edge.", "info");
      });
    }

    if (btnSetPhysicalHw) {
      btnSetPhysicalHw.addEventListener('click', () => {
        HardwareBridge.injectSimulation({ hardwareConnected: true });
        btnSetPhysicalHw.className = "btn btn-sm btn-primary";
        if (btnSetSimulated) btnSetSimulated.className = "btn btn-sm btn-outline";
        showToast("Edge Mode", "Listening for live ESP32 HTTP/MQTT packets.", "success");
      });
    }

    // Copy Arduino Code Button
    const copyBtn = document.getElementById('copyArduinoCodeBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const codeEl = document.getElementById('arduinoCodeDisplay');
        if (codeEl) {
          navigator.clipboard.writeText(codeEl.textContent);
          showToast("Copied to Clipboard", "ESP32 firmware code copied.", "success");
        }
      });
    }
  }

  // Load Arduino C++ sketch into preview block
  function loadArduinoSketchPreview() {
    fetch('/hardware/esp32_smart_room.ino')
      .then(res => res.text())
      .then(code => {
        const el = document.getElementById('arduinoCodeDisplay');
        if (el) el.textContent = code;
      })
      .catch(() => {
        const el = document.getElementById('arduinoCodeDisplay');
        if (el) el.textContent = "// ESP32 Firmware available in hardware/esp32_smart_room.ino";
      });
  }

  // --- SETTINGS (TAB 8) ---
  function setupSettings() {
    const saveBtn = document.getElementById('saveSettingsBtn');
    const tempUnitSelect = document.getElementById('tempUnitSelect');
    const currencySelect = document.getElementById('currencySelect');
    const tariffInput = document.getElementById('tariffRateInput');
    const simSpeedSelect = document.getElementById('simSpeedSelect');
    const soundCheckbox = document.getElementById('soundEffectsCheckbox');
    const audioToggleBtn = document.getElementById('audioToggleBtn');

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const state = AppState.get();
        if (tempUnitSelect) state.system.tempUnit = tempUnitSelect.value;
        if (currencySelect) state.system.currency = currencySelect.value;
        if (tariffInput) state.system.tariffRate = Number(tariffInput.value);
        if (simSpeedSelect) state.system.simSpeed = Number(simSpeedSelect.value);
        if (soundCheckbox) {
          state.system.soundEnabled = soundCheckbox.checked;
          SoundFX.setEnabled(soundCheckbox.checked);
        }

        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(state.system)
        }).catch(() => {});

        updateLiveCardValues();
        renderEnergyTable();
        showToast("Settings Saved", "System preferences updated.", "success");
      });
    }

    if (audioToggleBtn) {
      audioToggleBtn.addEventListener('click', () => {
        const cur = SoundFX.isEnabled();
        SoundFX.setEnabled(!cur);
        const icon = document.getElementById('audioIcon');
        if (icon) {
          icon.className = !cur ? "fa-solid fa-volume-high" : "fa-solid fa-volume-xmark";
        }
        showToast("Audio Setting", !cur ? "Sound effects enabled." : "Sound effects muted.", "info");
      });
    }
  }

  // --- MODALS ---
  function setupModals() {
    const openSchedBtn = document.getElementById('openAddScheduleModalBtn');
    const closeSchedBtn = document.getElementById('closeScheduleModalBtn');
    const cancelSchedBtn = document.getElementById('cancelScheduleBtn');
    const saveSchedBtn = document.getElementById('saveScheduleBtn');
    const schedModal = document.getElementById('scheduleModal');

    if (openSchedBtn && schedModal) {
      openSchedBtn.addEventListener('click', () => schedModal.classList.add('open'));
    }

    [closeSchedBtn, cancelSchedBtn].forEach(b => {
      if (b && schedModal) {
        b.addEventListener('click', () => schedModal.classList.remove('open'));
      }
    });

    if (saveSchedBtn && schedModal) {
      saveSchedBtn.addEventListener('click', () => {
        const name = document.getElementById('schedNameInput').value.trim();
        const deviceId = document.getElementById('schedDeviceSelect').value;
        const action = document.getElementById('schedActionSelect').value;
        const time = document.getElementById('schedTimeInput').value;

        const checkedDays = [];
        document.querySelectorAll('input[name="schedDay"]:checked').forEach(cb => {
          checkedDays.push(cb.value);
        });

        if (!name || !time) {
          showToast("Form Incomplete", "Please specify a name and trigger time.", "warn");
          return;
        }

        const newSched = {
          name,
          deviceId,
          action,
          time,
          days: checkedDays.length > 0 ? checkedDays : ["mon", "tue", "wed", "thu", "fri"],
          enabled: true
        };

        fetch('/api/schedules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newSched)
        })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            AppState.get().schedules.push(data.schedule);
            renderSchedules();
            schedModal.classList.remove('open');
            showToast("Schedule Created", `"${name}" added successfully.`, "success");
          }
        })
        .catch(() => {
          // Local fallback
          newSched.id = `sched-${Date.now()}`;
          AppState.get().schedules.push(newSched);
          renderSchedules();
          schedModal.classList.remove('open');
          showToast("Schedule Created", `"${name}" added locally.`, "success");
        });
      });
    }

    // Dismiss Sim Banner Button
    const dismissBtn = document.getElementById('dismissSimBanner');
    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => {
        const banner = document.getElementById('simBanner');
        if (banner) banner.style.display = 'none';
      });
    }

    // Quick open hardware modal button
    const openHwSimModal = document.getElementById('openHwSimModal');
    if (openHwSimModal) {
      openHwSimModal.addEventListener('click', () => {
        const hwNavItem = document.querySelector('.sidebar-nav .nav-item[data-tab="hardware"]');
        if (hwNavItem) hwNavItem.click();
      });
    }
  }

  // --- STATE LISTENERS (REACTIVE BINDING) ---
  function setupStateListeners() {
    AppState.on('SIM_TICK', () => {
      updateLiveCardValues();
      if (window.DashboardCharts) {
        window.DashboardCharts.updateDurations();
      }
    });

    AppState.on('STATE_UPDATED', () => {
      renderDeviceCards();
      renderDetailedDevices();
      renderSchedules();
      renderActivityLogs();
      renderEnergyTable();
      renderRecommendations();
      updateHardwarePills();
    });

    AppState.on('DEVICE_CONFIRMED', (device) => {
      // Hardware state ACK received
      const card = document.getElementById(`card-${device.id}`);
      if (card) {
        card.classList.toggle('is-on', device.state === 'ON');
        const wrap = card.querySelector('.switch-control-wrap');
        if (wrap) wrap.classList.remove('pending');
        const toggle = card.querySelector('.device-toggle-input');
        if (toggle) toggle.checked = (device.state === 'ON');
      }
      updateLiveCardValues();
      renderDetailedDevices();
      renderEnergyTable();
    });

    AppState.on('DEVICE_PENDING_ACK', (payload) => {
      const card = document.getElementById(`card-${payload.deviceId}`);
      if (card) {
        const wrap = card.querySelector('.switch-control-wrap');
        if (wrap) wrap.classList.add('pending');
      }
    });

    AppState.on('LOGS_UPDATED', () => {
      renderActivityLogs();
    });

    AppState.on('HARDWARE_STATUS_CHANGED', () => {
      updateHardwarePills();
    });
  }

  // Update Top & Sidebar Hardware Connection Pills
  function updateHardwarePills() {
    const state = AppState.get();
    const isReal = state.system.hardwareConnected;

    const hwStatusPill = document.getElementById('hardwareStatusPill');
    const hwBadgeText = document.getElementById('hwBadgeText');
    const sidebarTitle = document.getElementById('sidebarHwStatusTitle');
    const sidebarSub = document.getElementById('sidebarHwSub');
    const hwDetailDot = document.getElementById('hwDetailDot');
    const hwDetailText = document.getElementById('hwDetailStatusText');

    if (hwStatusPill) {
      hwStatusPill.classList.toggle('connected', isReal);
      const ping = hwStatusPill.querySelector('.status-ping');
      if (ping) {
        ping.className = `status-ping ${isReal ? 'connected' : 'simulated'}`;
      }
    }

    if (hwBadgeText) {
      hwBadgeText.textContent = isReal ? "ESP32 Hardware Connected" : "Demo Simulated Data";
    }

    if (sidebarTitle) {
      sidebarTitle.textContent = isReal ? "ESP32 Edge Connected" : "Simulation Mode";
    }
    if (sidebarSub) {
      sidebarSub.textContent = isReal ? "Active Telemetry Stream" : "Realistic Virtual Edge";
    }

    if (hwDetailDot && hwDetailText) {
      hwDetailDot.className = `status-indicator-dot ${isReal ? 'online' : 'simulated'}`;
      hwDetailText.textContent = isReal ? "ESP32-WROOM-32 Hardware Online" : "Simulated Edge Controller";
    }
  }

  // --- TOAST NOTIFICATIONS HELPER ---
  function showToast(title, message, type = "info") {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = "fa-circle-info";
    if (type === "success") icon = "fa-circle-check";
    if (type === "warn") icon = "fa-triangle-exclamation";
    if (type === "danger") icon = "fa-circle-exclamation";
    if (type === "ai") icon = "fa-wand-magic-sparkles";

    toast.innerHTML = `
      <i class="fa-solid ${icon}" style="font-size: 1.1rem; margin-top: 2px;"></i>
      <div class="toast-content">
        <h5>${title}</h5>
        <p>${message}</p>
      </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease-out';
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  }

  // CSV download helper
  function downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return {
    init,
    showToast,
    updateMode
  };
})();

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

// Attach globally
window.App = App;
