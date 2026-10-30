// charts.js - Chart.js Telemetry, Climate Trends & Energy Visualizations
const DashboardCharts = (function() {
  let climateChart = null;
  let energyBarChart = null;
  let durationDonutChart = null;

  // Chart theme colors
  const colors = {
    tempLine: '#f87171',
    tempFill: 'rgba(239, 68, 68, 0.08)',
    humLine: '#06b6d4',
    humFill: 'rgba(6, 182, 212, 0.08)',
    barEnergy: 'rgba(2, 132, 199, 0.75)',
    barPeak: 'rgba(245, 158, 11, 0.85)',
    gridLines: 'rgba(255, 255, 255, 0.05)',
    axisText: '#94a3b8',
    donut: ['#06b6d4', '#3b82f6', '#facc15', '#a855f7', '#10b981', '#f87171']
  };

  function init() {
    initClimateChart();
    initEnergyBarChart();
    initDurationDonutChart();
  }

  // 1. Climate History Spline Chart (Temperature & Humidity)
  function initClimateChart() {
    const canvas = document.getElementById('climateChart');
    if (!canvas || !window.Chart) return;

    const ctx = canvas.getContext('2d');
    const state = AppState.get();

    // Default seed points if telemetry history is empty
    let history = state.telemetryHistory;
    if (!history || history.length === 0) {
      history = generateInitialHistory();
      state.telemetryHistory = history;
    }

    const labels = history.map(p => p.timeLabel);
    const tempData = history.map(p => p.temperature);
    const humData = history.map(p => p.humidity);

    climateChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Temperature (°C)',
            data: tempData,
            borderColor: colors.tempLine,
            backgroundColor: colors.tempFill,
            borderWidth: 2.5,
            fill: true,
            tension: 0.4,
            pointRadius: 2,
            pointHoverRadius: 6,
            yAxisID: 'yTemp'
          },
          {
            label: 'Humidity (%)',
            data: humData,
            borderColor: colors.humLine,
            backgroundColor: colors.humFill,
            borderWidth: 2,
            borderDash: [4, 4],
            fill: false,
            tension: 0.4,
            pointRadius: 2,
            pointHoverRadius: 6,
            yAxisID: 'yHum'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(13, 19, 38, 0.95)',
            titleColor: '#fff',
            bodyColor: '#cbd5e1',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: function(context) {
                return ` ${context.dataset.label}: ${context.raw}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: colors.gridLines },
            ticks: { color: colors.axisText, font: { size: 10 }, maxRotation: 0 }
          },
          yTemp: {
            type: 'linear',
            position: 'left',
            min: 16,
            max: 38,
            grid: { color: colors.gridLines },
            ticks: {
              color: colors.tempLine,
              font: { size: 10 },
              callback: value => `${value}°C`
            }
          },
          yHum: {
            type: 'linear',
            position: 'right',
            min: 20,
            max: 90,
            grid: { drawOnChartArea: false },
            ticks: {
              color: colors.humLine,
              font: { size: 10 },
              callback: value => `${value}%`
            }
          }
        }
      }
    });
  }

  // 2. Hourly Electricity Consumption Bar Chart
  function initEnergyBarChart() {
    const canvas = document.getElementById('energyBarChart');
    if (!canvas || !window.Chart) return;

    const ctx = canvas.getContext('2d');
    const hours = ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'];
    const energyData = [0.25, 0.18, 0.32, 0.54, 0.88, 1.15, 0.95, 0.72];
    const bgColors = energyData.map((val, idx) => (idx === 5 || idx === 6) ? colors.barPeak : colors.barEnergy);

    energyBarChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: hours,
        datasets: [{
          label: 'Electricity Used (kWh)',
          data: energyData,
          backgroundColor: bgColors,
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(13, 19, 38, 0.95)',
            callbacks: {
              label: context => ` Consumption: ${context.raw} kWh (~${AppState.formatCurrency(context.raw * (AppState.get().system.tariffRate || 8.5))})`
            }
          }
        },
        scales: {
          x: {
            grid: { color: colors.gridLines },
            ticks: { color: colors.axisText, font: { size: 10 } }
          },
          y: {
            grid: { color: colors.gridLines },
            ticks: { color: colors.axisText, font: { size: 10 }, callback: v => `${v} kWh` }
          }
        }
      }
    });
  }

  // 3. Appliance Operating Duration Donut Chart
  function initDurationDonutChart() {
    const canvas = document.getElementById('durationDonutChart');
    if (!canvas || !window.Chart) return;

    const ctx = canvas.getContext('2d');
    const state = AppState.get();

    const deviceLabels = state.devices.map(d => d.name);
    // Convert duration seconds to hours for clean chart values
    const durationHours = state.devices.map(d => parseFloat((d.totalDurationSecondsToday / 3600).toFixed(1)));

    durationDonutChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: deviceLabels,
        datasets: [{
          data: durationHours,
          backgroundColor: colors.donut,
          borderColor: '#0d1326',
          borderWidth: 3,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(13, 19, 38, 0.95)',
            callbacks: {
              label: function(context) {
                const dev = state.devices[context.dataIndex];
                const formatted = AppState.formatDuration(dev.totalDurationSecondsToday);
                return ` ${dev.name}: ${formatted} (${dev.totalKwhToday.toFixed(2)} kWh)`;
              }
            }
          }
        }
      }
    });
  }

  // Push new reading to live Climate spline chart
  function pushTelemetryPoint(point) {
    if (!climateChart) return;
    const labels = climateChart.data.labels;
    const tempData = climateChart.data.datasets[0].data;
    const humData = climateChart.data.datasets[1].data;

    labels.push(point.timeLabel);
    tempData.push(point.temperature);
    humData.push(point.humidity);

    if (labels.length > 25) {
      labels.shift();
      tempData.shift();
      humData.shift();
    }

    climateChart.update('none'); // Update smoothly without full animation glitch
  }

  // Update Donut chart durations
  function updateDurations() {
    if (!durationDonutChart) return;
    const state = AppState.get();
    durationDonutChart.data.datasets[0].data = state.devices.map(d => 
      parseFloat((d.totalDurationSecondsToday / 3600).toFixed(2))
    );
    durationDonutChart.update('none');
  }

  function generateInitialHistory() {
    const list = [];
    const now = Date.now();
    for (let i = 12; i >= 0; i--) {
      const t = new Date(now - (i * 3600 * 1000));
      const h = t.getHours();
      list.push({
        timestamp: t.getTime(),
        timeLabel: `${String(h).padStart(2, '0')}:00`,
        temperature: parseFloat((25 + 4 * Math.sin(((h - 8) / 24) * 2 * Math.PI) + (Math.random() - 0.5) * 0.4).toFixed(1)),
        humidity: parseFloat((65 - 12 * Math.sin(((h - 8) / 24) * 2 * Math.PI) + (Math.random() - 0.5) * 1.5).toFixed(1))
      });
    }
    return list;
  }

  return {
    init,
    pushTelemetryPoint,
    updateDurations
  };
})();
