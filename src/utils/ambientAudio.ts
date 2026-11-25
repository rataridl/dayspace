import { AmbientSoundPreset } from '../types/dayspace';

class DayspaceAmbientAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeNodes: AudioNode[] = [];
  private lfoOsc: OscillatorNode | null = null;
  private currentPreset: AmbientSoundPreset = 'none';
  private volume = 0.35;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return null;
      if (!this.ctx) {
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  private stopCurrentNodes() {
    for (const node of this.activeNodes) {
      try {
        if ('stop' in node && typeof (node as AudioScheduledSourceNode).stop === 'function') {
          (node as AudioScheduledSourceNode).stop();
        }
        node.disconnect();
      } catch {
        // Ignore already stopped nodes
      }
    }
    this.activeNodes = [];

    if (this.lfoOsc) {
      try {
        this.lfoOsc.stop();
        this.lfoOsc.disconnect();
      } catch {
        // Ignore
      }
      this.lfoOsc = null;
    }

    if (this.masterGain) {
      try {
        this.masterGain.disconnect();
      } catch {
        // Ignore
      }
      this.masterGain = null;
    }
  }

  private createNoiseBuffer(ctx: AudioContext, type: 'pink' | 'brown'): AudioBuffer {
    const bufferSize = ctx.sampleRate * 3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    if (type === 'brown') {
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i += 1) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.02 * white) / 1.02;
        data[i] = lastOut * 3.2;
      }
    } else {
      let b0 = 0;
      let b1 = 0;
      let b2 = 0;
      let b3 = 0;
      let b4 = 0;
      let b5 = 0;
      let b6 = 0;
      for (let i = 0; i < bufferSize; i += 1) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
    }
    return buffer;
  }

  public setPreset(preset: AmbientSoundPreset, volume: number) {
    this.volume = Math.min(1, Math.max(0, volume));
    if (preset === 'none') {
      this.currentPreset = 'none';
      this.stopCurrentNodes();
      return;
    }

    if (this.currentPreset === preset && this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        this.volume * 0.45,
        this.ctx.currentTime,
        0.08
      );
      return;
    }

    const ctx = this.ensureContext();
    if (!ctx) return;

    this.stopCurrentNodes();
    this.currentPreset = preset;

    const master = ctx.createGain();
    master.gain.setValueAtTime(this.volume * 0.45, ctx.currentTime);
    master.connect(ctx.destination);
    this.masterGain = master;

    if (preset === 'rain') {
      const source = ctx.createBufferSource();
      source.buffer = this.createNoiseBuffer(ctx, 'pink');
      source.loop = true;

      const highpass = ctx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.value = 320;

      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 2800;

      source.connect(highpass);
      highpass.connect(lowpass);
      lowpass.connect(master);
      source.start();
      this.activeNodes.push(source, highpass, lowpass);
    } else if (preset === 'forest-wind') {
      const source = ctx.createBufferSource();
      source.buffer = this.createNoiseBuffer(ctx, 'brown');
      source.loop = true;

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.value = 420;
      bandpass.Q.value = 1.4;

      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.11;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 180;
      lfo.connect(lfoGain);
      lfoGain.connect(bandpass.frequency);
      lfo.start();
      this.lfoOsc = lfo;

      source.connect(bandpass);
      bandpass.connect(master);
      source.start();
      this.activeNodes.push(source, bandpass, lfoGain);
    } else if (preset === 'brown-noise') {
      const source = ctx.createBufferSource();
      source.buffer = this.createNoiseBuffer(ctx, 'brown');
      source.loop = true;

      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 340;

      source.connect(lowpass);
      lowpass.connect(master);
      source.start();
      this.activeNodes.push(source, lowpass);
    } else if (preset === 'singing-bowl') {
      const freqs = [220, 330, 440.8];
      const gains = [0.22, 0.1, 0.06];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const g = ctx.createGain();
        g.gain.value = gains[idx];
        osc.connect(g);
        g.connect(master);
        osc.start();
        this.activeNodes.push(osc, g);
      });
    }
  }

  public setVolume(volume: number) {
    this.volume = Math.min(1, Math.max(0, volume));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        this.volume * 0.45,
        this.ctx.currentTime,
        0.06
      );
    }
  }

  public stop() {
    this.currentPreset = 'none';
    this.stopCurrentNodes();
  }

  public playCompletionChime() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const start = now + index * 0.14;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.14, start + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.9);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.95);
      });
    } catch {
      // Ignore audio errors in restricted contexts
    }
  }
}

export const ambientAudio = new DayspaceAmbientAudioEngine();
