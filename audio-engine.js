/**
 * Kozhi Koo Audio Engine
 * Handles Web Audio Context, Microphone Stream, FFT Analysis,
 * Procedural Rooster Synthesizer, File Playback, and Automatic Crow Detection.
 */

class KozhiAudioEngine {
  constructor() {
    this.ctx = null;
    this.analyser = null;
    this.micStream = null;
    this.micSource = null;
    this.fileSource = null;
    this.isListening = false;
    this.isSynthesizing = false;

    // Detection settings
    this.sensitivityDb = 68; // threshold to trigger crow
    this.isCrowing = false;
    this.crowStartTime = 0;
    this.crowPeakDb = 0;
    this.crowBassSum = 0;
    this.crowSampleCount = 0;
    this.lastCrowEndTime = 0;
    this.cooldownMs = 1800; // minimum gap between crows

    // Callbacks
    this.onCrowDetected = null;
    this.onMetricsUpdate = null; // called every frame with real-time stats

    // Animation frame handle
    this.animFrame = null;
  }

  /**
   * Ensure AudioContext is initialized and active
   */
  async ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    if (!this.analyser) {
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 1024;
      this.analyser.smoothingTimeConstant = 0.75;
    }
    return this.ctx;
  }

  /**
   * Start live microphone listening
   */
  async startMicrophone() {
    await this.ensureContext();

    if (this.isListening) return true;

    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      this.micSource = this.ctx.createMediaStreamSource(this.micStream);
      this.micSource.connect(this.analyser);
      // Analyser is not connected to destination (speakers) to prevent feedback howl!

      this.isListening = true;
      this.startAnalysisLoop();
      return true;
    } catch (err) {
      console.error('Microphone access denied or error:', err);
      throw err;
    }
  }

  /**
   * Stop microphone stream
   */
  stopMicrophone() {
    if (this.micStream) {
      this.micStream.getTracks().forEach(track => track.stop());
      this.micStream = null;
    }
    if (this.micSource) {
      this.micSource.disconnect();
      this.micSource = null;
    }
    this.isListening = false;
  }

  /**
   * Main analysis loop running on requestAnimationFrame
   */
  startAnalysisLoop() {
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    const timeData = new Uint8Array(this.analyser.fftSize);

    const checkMetrics = () => {
      if (!this.analyser) return;

      this.analyser.getByteFrequencyData(dataArray);
      this.analyser.getByteTimeDomainData(timeData);

      // 1. Calculate RMS and Decibels
      let sumSquares = 0;
      for (let i = 0; i < timeData.length; i++) {
        const norm = (timeData[i] - 128) / 128;
        sumSquares += norm * norm;
      }
      const rms = Math.sqrt(sumSquares / timeData.length);
      // Map RMS [0..1] to realistic room dB [30..115 dB]
      const db = Math.max(30, Math.min(115, Math.round(30 + rms * 150)));

      // 2. Frequency breakdown: Bass (0..250Hz), Mid (250..2000Hz), Treble (2000..8000Hz)
      const sampleRate = this.ctx ? this.ctx.sampleRate : 44100;
      const binHz = sampleRate / this.analyser.fftSize;

      let bassEnergy = 0, bassCount = 0;
      let midEnergy = 0, midCount = 0;
      let trebleEnergy = 0, trebleCount = 0;
      let totalEnergy = 0;
      let weightedFreqSum = 0;

      for (let i = 0; i < dataArray.length; i++) {
        const val = dataArray[i];
        const freq = i * binHz;
        totalEnergy += val;
        weightedFreqSum += val * freq;

        if (freq <= 280) {
          bassEnergy += val;
          bassCount++;
        } else if (freq <= 2500) {
          midEnergy += val;
          midCount++;
        } else {
          trebleEnergy += val;
          trebleCount++;
        }
      }

      const avgBass = bassCount > 0 ? bassEnergy / (bassCount * 255) : 0;
      const avgMid = midCount > 0 ? midEnergy / (midCount * 255) : 0;
      const avgTreble = trebleCount > 0 ? trebleEnergy / (trebleCount * 255) : 0;
      const bassRatio = (avgBass + 0.01) / (avgBass + avgMid + avgTreble + 0.03);
      const pitchCentroid = totalEnergy > 0 ? Math.round(weightedFreqSum / totalEnergy) : 400;

      // Broadcast real-time metrics
      if (this.onMetricsUpdate) {
        this.onMetricsUpdate({
          currentDb: db,
          bassRatio: Math.min(1, bassRatio),
          avgBass: Math.min(1, avgBass * 1.5),
          frequencyData: dataArray,
          timeData: timeData,
          pitchCentroid
        });
      }

      // 3. Crow Detection Logic with Silence Debounce
      const now = performance.now();
      const isAboveThreshold = db >= this.sensitivityDb;

      if (!this.isCrowing) {
        if (isAboveThreshold && (now - this.lastCrowEndTime > this.cooldownMs)) {
          this.isCrowing = true;
          this.crowStartTime = now;
          this.crowLastLoudTime = now;
          this.crowPeakDb = db;
          this.crowBassSum = bassRatio;
          this.crowSampleCount = 1;
        }
      } else {
        if (isAboveThreshold) {
          this.crowLastLoudTime = now;
          this.crowPeakDb = Math.max(this.crowPeakDb, db);
          this.crowBassSum += bassRatio;
          this.crowSampleCount++;
        }

        const totalElapsed = now - this.crowStartTime;
        const silenceElapsed = now - this.crowLastLoudTime;

        // Finalize crow when:
        // - Silence has lasted > 400ms OR
        // - Crow exceeded maximum duration of 3500ms
        if (silenceElapsed > 400 || totalElapsed > 3500) {
          if (totalElapsed >= 400) {
            this.lastCrowEndTime = now;
            const avgCrowBass = this.crowBassSum / Math.max(1, this.crowSampleCount);

            if (this.onCrowDetected) {
              this.onCrowDetected({
                peakDb: this.crowPeakDb,
                bassRatio: avgCrowBass,
                durationMs: Math.round(totalElapsed - silenceElapsed),
                pitchCentroid: pitchCentroid
              });
            }
          }
          this.isCrowing = false;
        }
      }

      this.animFrame = requestAnimationFrame(checkMetrics);
    };

    if (this.animFrame) cancelAnimationFrame(this.animFrame);
    this.animFrame = requestAnimationFrame(checkMetrics);
  }

  /**
   * Procedural Web Audio Rooster Crow Synthesizer
   * Produces realistic / comedic rooster crows and routes through analyzer.
   * @param {string} preset - 'nadan', 'bass808', 'panic', 'broken', 'opera'
   */
  async playPresetCrow(preset = 'nadan') {
    await this.ensureContext();
    this.startAnalysisLoop();

    const t = this.ctx.currentTime;
    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(0.7, t);

    // Route synthesizer through our analyser AND to destination (speakers)
    masterGain.connect(this.analyser);
    masterGain.connect(this.ctx.destination);

    let presetMetrics = {
      nadan: { peakDb: 79, bassRatio: 0.52, durationMs: 2300, pitchCentroid: 580 },
      bass808: { peakDb: 95, bassRatio: 0.88, durationMs: 2500, pitchCentroid: 140 },
      panic: { peakDb: 99, bassRatio: 0.12, durationMs: 1500, pitchCentroid: 1150 },
      broken: { peakDb: 58, bassRatio: 0.38, durationMs: 1600, pitchCentroid: 420 },
      opera: { peakDb: 86, bassRatio: 0.26, durationMs: 2700, pitchCentroid: 720 }
    }[preset] || { peakDb: 78, bassRatio: 0.5, durationMs: 2000, pitchCentroid: 500 };

    if (preset === 'bass808') {
      this._synthBass808(masterGain, t);
    } else if (preset === 'panic') {
      this._synthPanic(masterGain, t);
    } else if (preset === 'broken') {
      this._synthBroken(masterGain, t);
    } else if (preset === 'opera') {
      this._synthOpera(masterGain, t);
    } else {
      this._synthNadan(masterGain, t);
    }

    // Schedule automated detection event at end of playback
    setTimeout(() => {
      this.lastCrowEndTime = performance.now();
      if (this.onCrowDetected) {
        this.onCrowDetected(presetMetrics);
      }
    }, presetMetrics.durationMs);
  }

  /**
   * Preset: Gramam Nadan Alarm (Classic Rooster Crow)
   * Pattern: "Er-erk-er-ER-KOOOOOOO!"
   */
  _synthNadan(out, t) {
    // 2 Formant Bandpass Filters representing the chicken beak/trachea cavity
    const formant1 = this.ctx.createBiquadFilter();
    formant1.type = 'bandpass';
    formant1.frequency.setValueAtTime(750, t);
    formant1.Q.setValueAtTime(4.0, t);

    const formant2 = this.ctx.createBiquadFilter();
    formant2.type = 'bandpass';
    formant2.frequency.setValueAtTime(1600, t);
    formant2.Q.setValueAtTime(3.5, t);

    // Primary Voice Oscillator (Sawtooth rich in harmonics)
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';

    // Pitch contour for classic "cock-a-doodle-doo"
    // Phase 1 (0.0 - 0.25s): "Er" ~ 320Hz
    // Phase 2 (0.25 - 0.45s): "erk" ~ 360Hz
    // Phase 3 (0.45 - 0.7s): "er" ~ 340Hz
    // Phase 4 (0.7 - 2.2s): "KOOOOOOO!" ~ slides up to 620Hz, holds, then falls to 480Hz
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.linearRampToValueAtTime(360, t + 0.25);
    osc.frequency.linearRampToValueAtTime(340, t + 0.45);
    osc.frequency.exponentialRampToValueAtTime(640, t + 0.75);
    osc.frequency.setValueAtTime(620, t + 1.6);
    osc.frequency.linearRampToValueAtTime(420, t + 2.3);

    // Vibrato LFO
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.setValueAtTime(7.5, t);
    lfoGain.gain.setValueAtTime(0, t);
    lfoGain.gain.setValueAtTime(15, t + 0.8); // vibrato kicks in during long sustained koo
    lfo.connect(osc.frequency);
    lfo.start(t);
    lfo.stop(t + 2.4);

    // Amplitude Envelope
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.001, t);
    // pulse 1
    env.gain.linearRampToValueAtTime(0.5, t + 0.08);
    env.gain.linearRampToValueAtTime(0.1, t + 0.23);
    // pulse 2
    env.gain.linearRampToValueAtTime(0.65, t + 0.28);
    env.gain.linearRampToValueAtTime(0.15, t + 0.43);
    // pulse 3
    env.gain.linearRampToValueAtTime(0.7, t + 0.48);
    env.gain.linearRampToValueAtTime(0.2, t + 0.65);
    // grand kooo!
    env.gain.linearRampToValueAtTime(1.0, t + 0.75);
    env.gain.setValueAtTime(0.9, t + 1.7);
    env.gain.exponentialRampToValueAtTime(0.001, t + 2.35);

    osc.connect(formant1);
    osc.connect(formant2);
    formant1.connect(env);
    formant2.connect(env);
    env.connect(out);

    osc.start(t);
    osc.stop(t + 2.4);
  }

  /**
   * Preset: Subwoofer 808 Desi Machan (Heavy Bass Thump + Deep Rooster)
   */
  _synthBass808(out, t) {
    // 1. Deep Rooster Throat
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.linearRampToValueAtTime(260, t + 0.7);
    osc.frequency.setValueAtTime(240, t + 1.8);
    osc.frequency.linearRampToValueAtTime(160, t + 2.5);

    // Lowpass filter for deep heavy tone
    const lowFilter = this.ctx.createBiquadFilter();
    lowFilter.type = 'lowpass';
    lowFilter.frequency.setValueAtTime(450, t);
    lowFilter.Q.setValueAtTime(5.0, t);

    // 2. Pure 808 Sub-bass Sine underneath
    const sub808 = this.ctx.createOscillator();
    sub808.type = 'sine';
    sub808.frequency.setValueAtTime(75, t);
    sub808.frequency.exponentialRampToValueAtTime(42, t + 2.2);

    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(0.01, t);
    subGain.gain.linearRampToValueAtTime(0.9, t + 0.7);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 2.5);

    sub808.connect(subGain);
    subGain.connect(out);

    // Master envelope for vocal
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.01, t);
    env.gain.linearRampToValueAtTime(0.8, t + 0.2);
    env.gain.linearRampToValueAtTime(1.0, t + 0.7);
    env.gain.setValueAtTime(0.95, t + 1.8);
    env.gain.exponentialRampToValueAtTime(0.001, t + 2.5);

    osc.connect(lowFilter);
    lowFilter.connect(env);
    env.connect(out);

    osc.start(t);
    sub808.start(t);
    osc.stop(t + 2.6);
    sub808.stop(t + 2.6);
  }

  /**
   * Preset: Chilly Chicken Survival Panic (Ultrasonic Screech)
   */
  _synthPanic(out, t) {
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(750, t);
    osc.frequency.linearRampToValueAtTime(1250, t + 0.5);
    osc.frequency.linearRampToValueAtTime(1100, t + 1.4);

    // Highpass filter for zero bass, pure treble
    const hpFilter = this.ctx.createBiquadFilter();
    hpFilter.type = 'highpass';
    hpFilter.frequency.setValueAtTime(800, t);

    // Tremolo LFO (hyperventilating flutter)
    const flutter = this.ctx.createOscillator();
    flutter.frequency.setValueAtTime(18, t);
    const flutterGain = this.ctx.createGain();
    flutterGain.gain.setValueAtTime(0.35, t);

    const vca = this.ctx.createGain();
    vca.gain.setValueAtTime(0.6, t);

    flutter.connect(flutterGain);
    flutterGain.connect(vca.gain);

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.01, t);
    env.gain.linearRampToValueAtTime(0.9, t + 0.1);
    env.gain.setValueAtTime(0.85, t + 1.1);
    env.gain.exponentialRampToValueAtTime(0.001, t + 1.5);

    osc.connect(hpFilter);
    hpFilter.connect(vca);
    vca.connect(env);
    env.connect(out);

    flutter.start(t);
    osc.start(t);
    flutter.stop(t + 1.6);
    osc.stop(t + 1.6);
  }

  /**
   * Preset: Broken Bajaj Carburetor (Stuttering Scooter Crow)
   */
  _synthBroken(out, t) {
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(260, t);
    // Coughing pitch jumps
    osc.frequency.setValueAtTime(320, t + 0.15);
    osc.frequency.setValueAtTime(190, t + 0.35);
    osc.frequency.setValueAtTime(410, t + 0.6);
    osc.frequency.setValueAtTime(220, t + 0.9);

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.0, t);
    // Stutter 1
    env.gain.setValueAtTime(0.8, t + 0.05);
    env.gain.setValueAtTime(0.0, t + 0.15);
    // Stutter 2
    env.gain.setValueAtTime(0.9, t + 0.25);
    env.gain.setValueAtTime(0.0, t + 0.35);
    // Stutter 3
    env.gain.setValueAtTime(0.7, t + 0.5);
    env.gain.setValueAtTime(0.0, t + 0.65);
    // Weak sputtering koo
    env.gain.setValueAtTime(0.85, t + 0.85);
    env.gain.exponentialRampToValueAtTime(0.001, t + 1.6);

    const band = this.ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.setValueAtTime(600, t);
    band.Q.setValueAtTime(2.0, t);

    osc.connect(band);
    band.connect(env);
    env.connect(out);

    osc.start(t);
    osc.stop(t + 1.7);
  }

  /**
   * Preset: Opera Diva Kozhi (Pavarotti Vibrato)
   */
  _synthOpera(out, t) {
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, t); // A4
    osc.frequency.linearRampToValueAtTime(523.25, t + 0.6); // C5
    osc.frequency.linearRampToValueAtTime(659.25, t + 1.2); // E5
    osc.frequency.linearRampToValueAtTime(587.33, t + 2.5); // D5

    // Luscious Opera Vibrato
    const vibrato = this.ctx.createOscillator();
    vibrato.frequency.setValueAtTime(5.8, t);
    const vibGain = this.ctx.createGain();
    vibGain.gain.setValueAtTime(28, t);
    vibrato.connect(osc.frequency);

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.01, t);
    env.gain.linearRampToValueAtTime(0.95, t + 1.2); // Grand operatic swell
    env.gain.setValueAtTime(0.9, t + 2.2);
    env.gain.exponentialRampToValueAtTime(0.001, t + 2.8);

    osc.connect(env);
    env.connect(out);

    vibrato.start(t);
    osc.start(t);
    vibrato.stop(t + 2.9);
    osc.stop(t + 2.9);
  }

  /**
   * Load and play custom audio file (Drag & Drop or File Upload)
   */
  async loadAndAnalyzeFile(file) {
    await this.ensureContext();
    this.startAnalysisLoop();

    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);

    if (this.fileSource) {
      try { this.fileSource.stop(); } catch (e) {}
      this.fileSource.disconnect();
    }

    this.fileSource = this.ctx.createBufferSource();
    this.fileSource.buffer = audioBuffer;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.85;

    this.fileSource.connect(this.analyser);
    this.fileSource.connect(gain);
    gain.connect(this.ctx.destination);

    this.fileSource.start(0);
    return true;
  }
}

// Export to window
if (typeof window !== 'undefined') {
  window.KozhiAudioEngine = KozhiAudioEngine;
}
