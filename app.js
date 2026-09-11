/**
 * Kozhi Koo Counter - Main Application Controller
 * Handles UI events, Canvas visualizers, Feather physics,
 * Mascot animations, Milestone progressions, and Certificate generation.
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // 2. State & Storage
  let stats = {
    totalKoos: 0,
    peakDb: 0,
    maxBass: 0,
    history: []
  };

  const stored = localStorage.getItem('kozhi_stats_v1');
  if (stored) {
    try {
      stats = JSON.parse(stored);
      if (!Array.isArray(stats.history)) stats.history = [];
    } catch (e) {
      console.warn('Could not parse stored stats:', e);
    }
  }

  let latestAnalysis = null;
  const engine = new window.KozhiAudioEngine();

  // 3. DOM Elements
  const kooCountVal = document.getElementById('kooCountVal');
  const peakDbVal = document.getElementById('peakDbVal');
  const bassMaxVal = document.getElementById('bassMaxVal');
  const milestoneLabel = document.getElementById('milestoneLabel');
  const milestoneProgress = document.getElementById('milestoneProgress');
  const milestoneBar = document.getElementById('milestoneBar');

  const btnToggleMic = document.getElementById('btnToggleMic');
  const btnMicText = document.getElementById('btnMicText');
  const btnResetCounter = document.getElementById('btnResetCounter');
  const sliderSensitivity = document.getElementById('sliderSensitivity');
  const sensitivityValue = document.getElementById('sensitivityValue');

  const fileDropzone = document.getElementById('fileDropzone');
  const fileInput = document.getElementById('fileInput');

  const liveStatusBadge = document.getElementById('liveStatusBadge');
  const liveDbVal = document.getElementById('liveDbVal');
  const liveBassVal = document.getElementById('liveBassVal');
  const meterFillDb = document.getElementById('meterFillDb');
  const meterFillBass = document.getElementById('meterFillBass');

  const roosterMascot = document.getElementById('roosterMascot');
  const roosterSpeech = document.getElementById('roosterSpeech');
  const roosterBeakLower = document.getElementById('roosterBeakLower');

  // Analysis Card
  const analysisCard = document.getElementById('analysisCard');
  const reportTimestamp = document.getElementById('reportTimestamp');
  const archetypeBanner = document.getElementById('archetypeBanner');
  const archetypeBadge = document.getElementById('archetypeBadge');
  const archetypeName = document.getElementById('archetypeName');
  const archetypeMalayalam = document.getElementById('archetypeMalayalam');
  const archetypeTagline = document.getElementById('archetypeTagline');
  const resPeakDb = document.getElementById('resPeakDb');
  const resBass = document.getElementById('resBass');
  const resDuration = document.getElementById('resDuration');
  const resQuote = document.getElementById('resQuote');
  const resPredictionText = document.getElementById('resPredictionText');
  const historyList = document.getElementById('historyList');
  const logCountBadge = document.getElementById('logCountBadge');

  // Modal
  const certModal = document.getElementById('certModal');
  const btnOpenCert = document.getElementById('btnOpenCert');
  const btnCloseCert = document.getElementById('btnCloseCert');
  const btnDismissCert = document.getElementById('btnDismissCert');
  const btnPrintCert = document.getElementById('btnPrintCert');
  const certTime = document.getElementById('certTime');
  const certArchetype = document.getElementById('certArchetype');
  const certMalayalam = document.getElementById('certMalayalam');
  const certDb = document.getElementById('certDb');
  const certBass = document.getElementById('certBass');
  const certGrade = document.getElementById('certGrade');
  const certQuote = document.getElementById('certQuote');

  // Canvases
  const spectrumCanvas = document.getElementById('spectrumCanvas');
  const specCtx = spectrumCanvas.getContext('2d');
  const featherCanvas = document.getElementById('featherCanvas');
  const featherCtx = featherCanvas.getContext('2d');

  // 4. Milestone Definitions
  const MILESTONES = [
    { threshold: 5, label: '🐣 Level 1: Sleeping Village', desc: 'Wakes up the neighborhood cat.' },
    { threshold: 10, label: '☕ Level 2: Uncle Wakes For Chai', desc: 'Kettle is whistling in harmony.' },
    { threshold: 20, label: '🩴 Level 3: Flying Roof Slippers', desc: 'Neighbor uncle lost patience.' },
    { threshold: 35, label: '🚨 Level 4: Police Complaint Filed', desc: 'Decibel limit violation noticed.' },
    { threshold: 50, label: '👑 Level 5: Panchayath President', desc: 'Rooster elected on waking-up platform.' },
    { threshold: 100, label: '🌌 Level 6: Feathered God of Dawn', desc: 'Sun refuses to rise without permission.' }
  ];

  function updateMilestoneUI() {
    let currentMilestone = MILESTONES[0];
    let prevThreshold = 0;

    for (let i = 0; i < MILESTONES.length; i++) {
      if (stats.totalKoos < MILESTONES[i].threshold) {
        currentMilestone = MILESTONES[i];
        prevThreshold = i > 0 ? MILESTONES[i - 1].threshold : 0;
        break;
      }
      if (i === MILESTONES.length - 1) {
        currentMilestone = MILESTONES[i];
        prevThreshold = MILESTONES[i - 1].threshold;
      }
    }

    milestoneLabel.textContent = currentMilestone.label;
    const needed = currentMilestone.threshold;
    const progress = Math.min(100, Math.round(((stats.totalKoos - prevThreshold) / (needed - prevThreshold)) * 100));
    milestoneBar.style.width = `${Math.max(4, progress)}%`;
    milestoneProgress.textContent = `${stats.totalKoos} / ${needed} Koos`;
  }

  function updateScoreboard() {
    kooCountVal.textContent = stats.totalKoos;
    peakDbVal.textContent = stats.peakDb > 0 ? `${stats.peakDb} dB` : '0 dB';
    bassMaxVal.textContent = stats.maxBass > 0 ? `${stats.maxBass}%` : '0%';
    updateMilestoneUI();
    localStorage.setItem('kozhi_stats_v1', JSON.stringify(stats));
  }

  updateScoreboard();

  // 5. Feather Canvas Particle Physics System
  let feathers = [];
  function resizeFeatherCanvas() {
    featherCanvas.width = window.innerWidth;
    featherCanvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeFeatherCanvas);
  resizeFeatherCanvas();

  class FeatherParticle {
    constructor() {
      this.reset(true);
    }
    reset(initial = false) {
      this.x = Math.random() * featherCanvas.width;
      this.y = initial ? Math.random() * featherCanvas.height : -30;
      this.size = 12 + Math.random() * 16;
      this.vx = (Math.random() - 0.5) * 1.2;
      this.vy = 0.6 + Math.random() * 1.4;
      this.angle = Math.random() * Math.PI * 2;
      this.vAngle = (Math.random() - 0.5) * 0.04;
      this.color = ['#f59e0b', '#d97706', '#ea580c', '#ffffff', '#cbd5e1', '#b45309'][Math.floor(Math.random() * 6)];
      this.alpha = 0.25 + Math.random() * 0.45;
    }
    update(boostY = 0) {
      this.x += this.vx;
      this.y += this.vy - boostY;
      this.angle += this.vAngle;

      if (this.y > featherCanvas.height + 30 || this.x < -40 || this.x > featherCanvas.width + 40) {
        this.reset();
      }
    }
    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      ctx.globalAlpha = this.alpha;
      ctx.fillStyle = this.color;

      // Draw stylized feather shape
      ctx.beginPath();
      ctx.ellipse(0, 0, this.size * 0.4, this.size, 0, 0, Math.PI * 2);
      ctx.fill();

      // Shaft line
      ctx.strokeStyle = '#4a2f1b';
      ctx.lineWidth = 1;
      ctx.globalAlpha = this.alpha * 0.7;
      ctx.beginPath();
      ctx.moveTo(0, -this.size);
      ctx.lineTo(0, this.size);
      ctx.stroke();

      ctx.restore();
    }
  }

  for (let i = 0; i < 28; i++) {
    feathers.push(new FeatherParticle());
  }

  let featherBoost = 0;
  function animateFeathers() {
    featherCtx.clearRect(0, 0, featherCanvas.width, featherCanvas.height);
    featherBoost *= 0.94; // dampening
    for (let f of feathers) {
      f.update(featherBoost);
      f.draw(featherCtx);
    }
    requestAnimationFrame(animateFeathers);
  }
  animateFeathers();

  // 6. Spectrum Visualizer Canvas
  let latestFreqData = null;
  function renderSpectrum() {
    const width = spectrumCanvas.width;
    const height = spectrumCanvas.height;

    specCtx.fillStyle = '#1c1510';
    specCtx.fillRect(0, 0, width, height);

    if (latestFreqData) {
      const bars = 48;
      const barWidth = width / bars;
      const step = Math.floor(latestFreqData.length / bars);

      for (let i = 0; i < bars; i++) {
        let sum = 0;
        for (let j = 0; j < step; j++) {
          sum += latestFreqData[i * step + j];
        }
        const val = sum / step;
        const barHeight = (val / 255) * (height - 20);

        // Color transition: Bass (Deep Red/Amber) -> Mid (Golden Yolk) -> Treble (Pasture Green)
        let fillStyle;
        if (i < 12) {
          fillStyle = `hsl(${15 + i * 2}, 90%, ${45 + (val / 255) * 20}%)`;
        } else if (i < 30) {
          fillStyle = `hsl(${40 + (i - 12) * 2.5}, 95%, ${50 + (val / 255) * 15}%)`;
        } else {
          fillStyle = `hsl(${110 + (i - 30) * 2}, 70%, ${45 + (val / 255) * 20}%)`;
        }

        specCtx.fillStyle = fillStyle;
        const x = i * barWidth;
        const y = height - barHeight;

        // Rounded top bars (with fallback)
        specCtx.beginPath();
        if (specCtx.roundRect) {
          specCtx.roundRect(x + 1.5, y, Math.max(1, barWidth - 3), barHeight, [4, 4, 0, 0]);
        } else {
          specCtx.rect(x + 1.5, y, Math.max(1, barWidth - 3), barHeight);
        }
        specCtx.fill();
      }

      // Draw threshold line
      const thresholdNorm = (engine.sensitivityDb - 30) / (115 - 30);
      const threshY = height - (thresholdNorm * height);
      specCtx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
      specCtx.setLineDash([6, 4]);
      specCtx.lineWidth = 2;
      specCtx.beginPath();
      specCtx.moveTo(0, threshY);
      specCtx.lineTo(width, threshY);
      specCtx.stroke();
      specCtx.setLineDash([]);
    } else {
      // Idle wave
      specCtx.strokeStyle = '#4a382a';
      specCtx.lineWidth = 2;
      specCtx.beginPath();
      for (let x = 0; x < width; x += 10) {
        const y = height / 2 + Math.sin((x + Date.now() * 0.05) * 0.04) * 6;
        if (x === 0) specCtx.moveTo(x, y);
        else specCtx.lineTo(x, y);
      }
      specCtx.stroke();
    }

    requestAnimationFrame(renderSpectrum);
  }
  renderSpectrum();

  // 7. Real-Time Audio Metrics Callback
  engine.onMetricsUpdate = (metrics) => {
    latestFreqData = metrics.frequencyData;

    // Update real-time meters
    liveDbVal.textContent = `${metrics.currentDb} dB`;
    const dbPct = Math.min(100, Math.max(0, ((metrics.currentDb - 30) / (110 - 30)) * 100));
    meterFillDb.style.width = `${dbPct}%`;

    const bassPct = Math.round(metrics.bassRatio * 100);
    liveBassVal.textContent = `${bassPct}%`;
    meterFillBass.style.width = `${bassPct}%`;

    // Visual mascot feedback
    if (metrics.currentDb >= engine.sensitivityDb) {
      triggerMascotCrow(bassPct > 65);
      featherBoost = Math.max(featherBoost, 1.8 + metrics.bassRatio * 3.5);
    }
  };

  // 8. Mascot Expressions
  let crowTimeout = null;
  function triggerMascotCrow(isHeavyBass = false) {
    roosterMascot.classList.remove('idle');
    if (isHeavyBass) {
      roosterMascot.classList.add('bass-rumble');
    } else {
      roosterMascot.classList.add('crowing');
    }

    // Open Beak wide!
    roosterBeakLower.setAttribute('points', '156,76 178,88 156,84');

    if (crowTimeout) clearTimeout(crowTimeout);
    crowTimeout = setTimeout(() => {
      roosterMascot.classList.remove('crowing', 'bass-rumble');
      roosterMascot.classList.add('idle');
      // Close beak
      roosterBeakLower.setAttribute('points', '156,70 178,74 156,76');
    }, 1400);
  }

  // Poking Kozhi Chettan directly
  const POKE_QUOTES = [
    '"Ayyo! Don\'t poke my feathers, crow into the mic instead!"',
    '"Koooo-da-ha! I am a proud Malabar rooster, not a touch screen!"',
    '"Did someone mention Chilly Chicken? *nervous sweating*"',
    '"Bro, wake up early and study instead of poking chickens online."',
    '"Warning: Feather shed rate currently at 120%."'
  ];
  roosterMascot.addEventListener('click', () => {
    triggerMascotCrow(false);
    const quote = POKE_QUOTES[Math.floor(Math.random() * POKE_QUOTES.length)];
    roosterSpeech.textContent = quote;
    featherBoost = 3.5;
    // Play a quick squeak/nadan crow
    engine.playPresetCrow('broken');
  });

  // 9. Crow Detected Handler
  engine.onCrowDetected = (metrics) => {
    // Run algorithmic classification
    const analysis = window.KooClassifier.classifyKoo(metrics);
    latestAnalysis = analysis;

    // Update Stats
    stats.totalKoos++;
    stats.peakDb = Math.max(stats.peakDb, analysis.metrics.db);
    stats.maxBass = Math.max(stats.maxBass, analysis.metrics.bassPct);
    stats.history.unshift(analysis);
    if (stats.history.length > 20) stats.history.pop();

    updateScoreboard();
    displayAnalysisResult(analysis);
    updateHistoryUI();

    // Mascot celebration
    roosterSpeech.textContent = `"${analysis.archetype.name} detected! ${analysis.archetype.tagline}"`;
    featherBoost = 4.0;
  };

  // 10. Display Analysis Result
  function displayAnalysisResult(analysis) {
    reportTimestamp.textContent = `Analyzed at ${analysis.timestamp}`;

    archetypeBadge.textContent = analysis.archetype.badge;
    archetypeBadge.style.backgroundColor = analysis.archetype.color;
    archetypeBadge.style.color = '#ffffff';

    archetypeName.textContent = analysis.archetype.name;
    archetypeMalayalam.textContent = analysis.archetype.malayalam;
    archetypeTagline.textContent = `"${analysis.archetype.tagline}"`;
    archetypeBanner.style.borderLeftColor = analysis.archetype.color;

    resPeakDb.textContent = `${analysis.metrics.db} dB`;
    resBass.textContent = `${analysis.metrics.bassPct}%`;
    resDuration.textContent = `${analysis.metrics.durationSec}s`;

    resQuote.textContent = analysis.quote;
    resPredictionText.textContent = `${analysis.eggPrediction} (${analysis.neighborReaction})`;

    // Highlight card animation
    analysisCard.style.transform = 'scale(1.02)';
    setTimeout(() => {
      analysisCard.style.transform = 'scale(1)';
    }, 250);
  }

  // 11. History List UI
  function updateHistoryUI() {
    logCountBadge.textContent = `${stats.history.length} logged`;

    if (stats.history.length === 0) {
      historyList.innerHTML = `
        <div style="text-align: center; color: #a48c77; font-size: 0.85rem; padding: 18px;">
          No crows recorded yet. Hit a preset crow button or make some noise!
        </div>`;
      return;
    }

    historyList.innerHTML = stats.history.map(item => `
      <div class="history-item">
        <div class="history-item-left">
          <span class="history-item-archetype font-fun">${item.archetype.name}</span>
          <span class="history-item-time">${item.timestamp} • ${item.archetype.malayalam}</span>
        </div>
        <div class="history-item-tags">
          <span class="history-pill" style="background: #fee2e2; color: #991b1b;">${item.metrics.db} dB</span>
          <span class="history-pill" style="background: #e0e7ff; color: #3730a3;">${item.metrics.bassPct}% Bass</span>
        </div>
      </div>
    `).join('');
  }

  if (stats.history.length > 0) {
    displayAnalysisResult(stats.history[0]);
    latestAnalysis = stats.history[0];
    updateHistoryUI();
  }

  // 12. Microphone Toggle
  btnToggleMic.addEventListener('click', async () => {
    if (!engine.isListening) {
      try {
        btnToggleMic.disabled = true;
        btnMicText.textContent = 'Requesting Mic...';
        await engine.startMicrophone();
        btnToggleMic.classList.add('active');
        btnMicText.textContent = 'Stop Listening';
        liveStatusBadge.textContent = '🎙️ Listening...';
        liveStatusBadge.style.backgroundColor = '#dcfce7';
        liveStatusBadge.style.color = '#15803d';
        roosterSpeech.textContent = '"Mic is ON! Make a rooster sound or scream like a broiler chicken!"';
      } catch (err) {
        alert('Microphone access was denied or not found. You can still use the instant Rooster Presets or Upload an audio file!');
        btnMicText.textContent = 'Start Listening (Mic)';
        liveStatusBadge.textContent = 'Mic Blocked ❌';
      } finally {
        btnToggleMic.disabled = false;
      }
    } else {
      engine.stopMicrophone();
      btnToggleMic.classList.remove('active');
      btnMicText.textContent = 'Start Listening (Mic)';
      liveStatusBadge.textContent = 'Idle 💤';
      liveStatusBadge.style.backgroundColor = '';
      liveStatusBadge.style.color = '';
      roosterSpeech.textContent = '"Mic stopped. I am taking a quick power nap."';
    }
  });

  // 13. Sensitivity Slider
  sliderSensitivity.addEventListener('input', (e) => {
    const val = Number(e.target.value);
    engine.sensitivityDb = val;
    sensitivityValue.textContent = `${val} dB`;
  });

  // 14. Reset Counter
  btnResetCounter.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset the Kozhi Koo tally and history?')) {
      stats.totalKoos = 0;
      stats.peakDb = 0;
      stats.maxBass = 0;
      stats.history = [];
      updateScoreboard();
      updateHistoryUI();
      roosterSpeech.textContent = '"Scoreboard wiped! A fresh dawn begins."';
    }
  });

  // 15. Soundboard Preset Buttons
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const preset = btn.getAttribute('data-preset');
      btn.style.transform = 'scale(0.95)';
      setTimeout(() => { btn.style.transform = ''; }, 150);

      // Play preset synthesis
      await engine.playPresetCrow(preset);
      liveStatusBadge.textContent = `Synthesizing ${preset.toUpperCase()} 🔊`;
    });
  });

  // 16. Drag & Drop / File Input
  fileDropzone.addEventListener('click', () => fileInput.click());

  fileDropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileDropzone.classList.add('dragover');
  });

  fileDropzone.addEventListener('dragleave', () => {
    fileDropzone.classList.remove('dragover');
  });

  fileDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    fileDropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      handleAudioFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleAudioFile(e.target.files[0]);
    }
  });

  async function handleAudioFile(file) {
    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|ogg|m4a)$/i)) {
      alert('Please upload a valid audio file (.mp3, .wav, .m4a).');
      return;
    }
    roosterSpeech.textContent = `Analyzing rooster recording: ${file.name}...`;
    try {
      await engine.loadAndAnalyzeFile(file);
    } catch (err) {
      console.error(err);
      alert('Could not decode audio file. Try an .mp3 or .wav file.');
    }
  }

  // 17. Certificate Modal & Printing
  function openCertificate() {
    if (!latestAnalysis) {
      alert('Record or play at least one Koo first before generating a certificate!');
      return;
    }
    certTime.textContent = latestAnalysis.timestamp;
    certArchetype.textContent = latestAnalysis.archetype.name;
    certMalayalam.textContent = latestAnalysis.archetype.malayalam;
    certDb.textContent = `Volume: ${latestAnalysis.metrics.db} dB`;
    certBass.textContent = `Bass Rumble: ${latestAnalysis.metrics.bassPct}%`;
    certGrade.textContent = `Roast Grade: ${latestAnalysis.roastRating}/10`;
    certQuote.textContent = latestAnalysis.quote;

    certModal.classList.add('open');
  }

  function closeCertificate() {
    certModal.classList.remove('open');
  }

  btnOpenCert.addEventListener('click', openCertificate);
  btnCloseCert.addEventListener('click', closeCertificate);
  btnDismissCert.addEventListener('click', closeCertificate);

  certModal.addEventListener('click', (e) => {
    if (e.target === certModal) closeCertificate();
  });

  btnPrintCert.addEventListener('click', () => {
    window.print();
  });

  // Re-run Lucide icons after dynamic insertions
  if (window.lucide) {
    window.lucide.createIcons();
  }
});
