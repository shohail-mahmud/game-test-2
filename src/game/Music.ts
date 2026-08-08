export class MusicManager {
  private ctx: AudioContext | null = null;
  private enabled = false;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private intervals: number[] = [];
  private nextNoteTime = 0;
  private tempo = 0.35; // slow ambient tempo
  private scale = [196.0, 220.0, 246.94, 293.66, 329.63, 392.0, 440.0];
  private currentRoot = 0;

  constructor() {}

  enable(ctx: AudioContext) {
    if (this.enabled) return;
    this.ctx = ctx;
    this.enabled = true;

    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0.25;
    this.masterGain.connect(ctx.destination);

    this.musicGain = ctx.createGain();
    this.musicGain.gain.value = 0;
    this.musicGain.connect(this.masterGain);

    this.nextNoteTime = ctx.currentTime + 0.1;
    this.scheduleLoop();
  }

  setEnabled(enabled: boolean) {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;
    const target = enabled ? 0.35 : 0;
    this.musicGain.gain.setTargetAtTime(target, now, 0.3);
  }

  setVolume(volume: number) {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(volume * 0.35, now, 0.1);
  }

  private scheduleLoop() {
    if (!this.ctx) return;
    const scheduleAhead = 0.5;
    while (this.nextNoteTime < this.ctx.currentTime + scheduleAhead) {
      this.playAmbientNote(this.nextNoteTime);
      this.nextNoteTime += this.tempo * (Math.random() > 0.7 ? 2 : 1) * (Math.random() > 0.85 ? 2 : 1);
    }
    const id = window.setTimeout(() => this.scheduleLoop(), 250);
    this.intervals.push(id);
  }

  private playAmbientNote(time: number) {
    if (!this.ctx || !this.musicGain) return;

    // Occasionally shift root for variation
    if (Math.random() > 0.92) {
      this.currentRoot = Math.floor(Math.random() * (this.scale.length - 3));
    }

    const index = this.currentRoot + Math.floor(Math.random() * 4);
    const freq = this.scale[index % this.scale.length];
    const oscType = Math.random() > 0.5 ? "sine" : "triangle";

    const osc = this.ctx.createOscillator();
    osc.type = oscType;
    osc.frequency.value = freq;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.05, time + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 3.0);

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 800;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + 3);
  }

  stop() {
    for (const id of this.intervals) {
      window.clearTimeout(id);
    }
    this.intervals = [];
  }
}
