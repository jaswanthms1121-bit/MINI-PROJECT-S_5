// audio.js - Web Audio API Synthesizer for high-tech micro-interaction sound effects
const SoundFX = (function() {
  let ctx = null;
  let enabled = true;

  function initCtx() {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        ctx = new AudioCtx();
      }
    }
    if (ctx && ctx.state === 'suspended') {
      ctx.resume();
    }
  }

  return {
    setEnabled(val) {
      enabled = Boolean(val);
    },
    isEnabled() {
      return enabled;
    },
    // High-tech switch click (device toggle ON)
    playSwitchOn() {
      if (!enabled) return;
      initCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    },
    // Device toggle OFF
    playSwitchOff() {
      if (!enabled) return;
      initCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(330, ctx.currentTime + 0.09);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    },
    // Futuristic AI decision chime
    playAiChime() {
      if (!enabled) return;
      initCtx();
      if (!ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        const start = ctx.currentTime + (idx * 0.06);
        gain.gain.setValueAtTime(0.04, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.18);
      });
    },
    // Alert / Overrun sound
    playAlert() {
      if (!enabled) return;
      initCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.setValueAtTime(300, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    }
  };
})();
