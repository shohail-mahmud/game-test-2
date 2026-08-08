import { settingsManager, type AudioSettings } from "./Settings";
import { MusicManager } from "./Music";

type SoundName = "ocean" | "engine" | "discovery" | "click" | "coin" | "crash";

export class AudioManager {
  private ctx: AudioContext | null = null;
  private enabled = false;
  private oceanNode: AudioBufferSourceNode | null = null;
  private oceanGain: GainNode | null = null;
  private engineGain: GainNode | null = null;
  private engineOsc: OscillatorNode | null = null;
  private sfxGain: GainNode | null = null;
  private settings: AudioSettings;
  private unsubscribe: () => void;
  music: MusicManager;

  constructor() {
    this.settings = settingsManager.get().audio;
    this.music = new MusicManager();
    this.unsubscribe = settingsManager.subscribe((s) => {
      this.settings = s.audio;
      this.applySettings();
    });
  }

  enable() {
    if (this.enabled && this.ctx && this.ctx.state !== "closed") {
      if (this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }
      return;
    }
    this.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    this.enabled = true;

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.effectiveSfxVolume;
    this.sfxGain.connect(this.ctx.destination);

    this.startOcean();
    this.startEngine();
    this.music.enable(this.ctx);
    this.applySettings();
  }

  async resumeIfSuspended() {
    if (this.ctx && this.ctx.state === "suspended") {
      await this.ctx.resume();
    }
  }

  private applySettings() {
    if (!this.ctx) return;

    const master = this.settings.masterEnabled ? 1 : 0;

    if (this.oceanGain) {
      this.oceanGain.gain.setTargetAtTime(master * 0.12, this.ctx.currentTime, 0.1);
    }

    if (this.sfxGain) {
      this.sfxGain.gain.setTargetAtTime(this.effectiveSfxVolume, this.ctx.currentTime, 0.1);
    }

    this.music.setEnabled(this.settings.masterEnabled && this.settings.musicEnabled);
    this.music.setVolume(master * this.settings.musicVolume);
  }

  private get effectiveSfxVolume(): number {
    return (this.settings.masterEnabled ? 1 : 0) * (this.settings.sfxEnabled ? 1 : 0) * this.settings.sfxVolume;
  }

  private startOcean() {
    if (!this.ctx || !this.sfxGain) return;
    const bufferSize = 2 * this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.05;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;

    this.oceanGain = this.ctx.createGain();
    this.oceanGain.gain.value = this.effectiveSfxVolume > 0 ? 0.12 : 0;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 300;

    src.connect(filter);
    filter.connect(this.oceanGain);
    this.oceanGain.connect(this.sfxGain);
    src.start();
    this.oceanNode = src;
  }

  private startEngine() {
    if (!this.ctx) return;
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = "sine";
    this.engineOsc.frequency.value = 80;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 400;

    this.engineOsc.connect(filter);
    filter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);
    this.engineOsc.start();
  }

  setEngine(speedRatio: number) {
    if (!this.enabled || !this.engineOsc || !this.engineGain || !this.ctx) return;
    const target = Math.max(0, Math.min(1, speedRatio));
    const now = this.ctx.currentTime;
    const vol = this.effectiveSfxVolume * 0.08;
    this.engineGain.gain.setTargetAtTime(target * vol, now, 0.1);
    this.engineOsc.frequency.setTargetAtTime(70 + target * 40, now, 0.1);
  }

  play(name: SoundName) {
    if (!this.enabled || !this.ctx || !this.sfxGain) return;
    if (this.effectiveSfxVolume <= 0.001) return;

    const baseVolume = 0.12;
    const now = this.ctx.currentTime;

    if (name === "discovery") {
      const osc = this.ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.2);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(baseVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start();
      osc.stop(now + 0.55);
    } else if (name === "coin") {
      const osc = this.ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1400, now + 0.1);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(baseVolume * 0.8, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start();
      osc.stop(now + 0.3);
    } else if (name === "crash") {
      const bufferSize = this.ctx.sampleRate * 0.4;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(baseVolume * 1.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 600;
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      noise.start();
    } else if (name === "click") {
      const osc = this.ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, now);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(baseVolume * 0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start();
      osc.stop(now + 0.12);
    }
  }

  stopOcean() {
    try {
      this.oceanNode?.stop();
    } catch {
      // ignore
    }
  }

  dispose() {
    this.stopOcean();
    this.music.stop();
    this.unsubscribe();
    this.ctx?.close().catch(() => {});
  }
}
