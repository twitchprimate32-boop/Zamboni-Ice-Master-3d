/**
 * Procedural Web Audio API Sound Synthesizer for Zamboni Ice Cleaner
 * Zero external audio files, 100% synthesized sound effects.
 */

class SoundEffects {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  // Persistent engine nodes
  private engineGain: GainNode | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineSubOsc: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;

  // Blade ice cutting noise nodes
  private bladeGain: GainNode | null = null;
  private bladeNoiseNode: AudioNode | null = null;

  // Water spray hiss nodes
  private waterGain: GainNode | null = null;
  private waterNoiseNode: AudioNode | null = null;

  private isInitialized = false;

  public init() {
    if (this.isInitialized) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.setupContinuousSounds();
      this.isInitialized = true;
    } catch {
      // Audio context may require user interaction
    }
  }

  private ensureContext() {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private createNoiseBuffer(duration = 2.0): AudioBuffer | null {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private setupContinuousSounds() {
    if (!this.ctx) return;

    // 1. Engine sound (Diesel / Heavy Electric Hydraulic Motor)
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(140, this.ctx.currentTime);

    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.setValueAtTime(45, this.ctx.currentTime);

    this.engineSubOsc = this.ctx.createOscillator();
    this.engineSubOsc.type = 'triangle';
    this.engineSubOsc.frequency.setValueAtTime(30, this.ctx.currentTime);

    this.engineOsc.connect(this.engineFilter);
    this.engineSubOsc.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);

    this.engineOsc.start();
    this.engineSubOsc.start();

    // 2. Ice scraping blade sound
    const noiseBuffer = this.createNoiseBuffer(2.0);
    if (noiseBuffer) {
      const bladeNoise = this.ctx.createBufferSource();
      bladeNoise.buffer = noiseBuffer;
      bladeNoise.loop = true;

      const bladeFilter = this.ctx.createBiquadFilter();
      bladeFilter.type = 'bandpass';
      bladeFilter.frequency.setValueAtTime(800, this.ctx.currentTime);
      bladeFilter.Q.setValueAtTime(2.0, this.ctx.currentTime);

      this.bladeGain = this.ctx.createGain();
      this.bladeGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

      bladeNoise.connect(bladeFilter);
      bladeFilter.connect(this.bladeGain);
      this.bladeGain.connect(this.ctx.destination);
      bladeNoise.start();
      this.bladeNoiseNode = bladeNoise;

      // 3. Water spray hiss
      const waterNoise = this.ctx.createBufferSource();
      waterNoise.buffer = noiseBuffer;
      waterNoise.loop = true;

      const waterFilter = this.ctx.createBiquadFilter();
      waterFilter.type = 'highpass';
      waterFilter.frequency.setValueAtTime(2400, this.ctx.currentTime);

      this.waterGain = this.ctx.createGain();
      this.waterGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

      waterNoise.connect(waterFilter);
      waterFilter.connect(this.waterGain);
      this.waterGain.connect(this.ctx.destination);
      waterNoise.start();
      this.waterNoiseNode = waterNoise;
    }
  }

  public updateEngine(speedNormalized: number, throttle: number, isBladeDown: boolean) {
    if (!this.ctx || this.isMuted) return;
    this.ensureContext();

    const t = this.ctx.currentTime;
    const baseFreq = 38 + Math.abs(speedNormalized) * 45 + Math.abs(throttle) * 22;
    const filterFreq = 110 + Math.abs(speedNormalized) * 160 + Math.abs(throttle) * 90;

    if (this.engineOsc && this.engineSubOsc && this.engineFilter && this.engineGain) {
      this.engineOsc.frequency.setTargetAtTime(baseFreq, t, 0.08);
      this.engineSubOsc.frequency.setTargetAtTime(baseFreq * 0.75, t, 0.08);
      this.engineFilter.frequency.setTargetAtTime(filterFreq, t, 0.08);
      
      const targetGain = 0.12 + Math.abs(speedNormalized) * 0.14 + (throttle !== 0 ? 0.08 : 0);
      this.engineGain.gain.setTargetAtTime(targetGain, t, 0.06);
    }

    // Blade scraping sound
    if (this.bladeGain) {
      const moving = Math.abs(speedNormalized) > 0.02;
      const bladeTarget = (isBladeDown && moving) ? Math.min(0.25, 0.08 + Math.abs(speedNormalized) * 0.22) : 0.0;
      this.bladeGain.gain.setTargetAtTime(bladeTarget, t, 0.05);
    }

    // Water spray sound
    if (this.waterGain) {
      const moving = Math.abs(speedNormalized) > 0.02;
      const waterTarget = (isBladeDown && moving) ? 0.07 : 0.0;
      this.waterGain.gain.setTargetAtTime(waterTarget, t, 0.1);
    }
  }

  public playHorn() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(370, t); // F#4
    osc2.frequency.setValueAtTime(466, t); // Bb4

    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.28, t + 0.04);
    gain.gain.setValueAtTime(0.28, t + 0.35);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.6);
    osc2.stop(t + 0.6);
  }

  public playStadiumBuzzer() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    // Classic hockey arena goal / intermission siren (low brassy dual tone)
    const tones = [130.81, 164.81, 261.63]; // C3, E3, C4 chord
    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(0.01, t);
    masterGain.gain.linearRampToValueAtTime(0.4, t + 0.05);
    masterGain.gain.setValueAtTime(0.4, t + 1.2);
    masterGain.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
    masterGain.connect(this.ctx.destination);

    tones.forEach((freq) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);
      osc.connect(masterGain);
      osc.start(t);
      osc.stop(t + 1.8);
    });
  }

  public playWhistle() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(2600, t);
    osc2.frequency.setValueAtTime(2680, t);

    // slight warble / vibrato
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.setValueAtTime(24, t);
    lfoGain.gain.setValueAtTime(45, t);
    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);
    lfoGain.connect(osc2.frequency);

    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    lfo.start(t);
    osc1.start(t);
    osc2.start(t);
    lfo.stop(t + 0.45);
    osc1.stop(t + 0.45);
    osc2.stop(t + 0.45);
  }

  public playCrowdCheer() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    const noiseBuffer = this.createNoiseBuffer(2.5);
    if (!noiseBuffer) return;

    const t = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(650, t);
    filter.Q.setValueAtTime(1.2, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.25, t + 0.5);
    gain.gain.setValueAtTime(0.22, t + 1.2);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 2.5);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
    noise.stop(t + 2.5);
  }

  public playConditionerToggle(isLowering: boolean) {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    if (isLowering) {
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.18);
    } else {
      osc.frequency.setValueAtTime(90, t);
      osc.frequency.exponentialRampToValueAtTime(260, t + 0.18);
    }

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.22);
  }

  public playBoardImpact(intensity = 1.0) {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.15);

    const hitVolume = Math.min(0.4, 0.12 + intensity * 0.25);
    gain.gain.setValueAtTime(hitVolume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.22);
  }

  public playSnowDump() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    const noiseBuffer = this.createNoiseBuffer(1.2);
    if (!noiseBuffer) return;

    const t = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(350, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.35, t + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(t);
    noise.stop(t + 1.2);
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted && this.ctx && this.engineGain) {
      this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);
      if (this.bladeGain) this.bladeGain.gain.setValueAtTime(0, this.ctx.currentTime);
      if (this.waterGain) this.waterGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
  }

  public getMuted() {
    return this.isMuted;
  }
}

export const soundEffects = new SoundEffects();
