import type { Logger } from '../core/Logger';
import type { Rarity } from '../domain/types';

export type Sfx = 'tap' | 'collect' | 'goal' | 'saved' | 'levelUp' | 'claim' | 'error' | 'whistle';

const RARITY_PITCH: Readonly<Record<Rarity, number>> = { common: 1, rare: 1.15, epic: 1.3, legendary: 1.5 };

/**
 * Procedurally synthesised SFX and crowd ambience (Web Audio) — no licensed audio files needed.
 * The AudioContext is created lazily on the first user gesture, as mobile browsers require.
 */
export class AudioService {
  private ctx: AudioContext | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private ambience: AudioBufferSourceNode | null = null;
  private sfxVolume = 0.8;
  private musicVolume = 0.6;

  constructor(private readonly logger: Logger) {}

  /** Call from a user-gesture handler. Safe to call repeatedly. */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => undefined);
      return;
    }
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.sfxGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain.connect(this.ctx.destination);
      this.musicGain.connect(this.ctx.destination);
      this.applyVolumes();
      this.startAmbience();
    } catch (err) {
      this.logger.warn('Audio unavailable', err);
      this.ctx = null;
    }
  }

  setVolumes(sfx: number, music: number): void {
    this.sfxVolume = sfx;
    this.musicVolume = music;
    this.applyVolumes();
  }

  /** Background/foreground handling — never play audio while the app is hidden. */
  suspend(): void { void this.ctx?.suspend().catch(() => undefined); }
  resume(): void { void this.ctx?.resume().catch(() => undefined); }

  play(sfx: Sfx, rarity: Rarity = 'common'): void {
    const ctx = this.ctx;
    const out = this.sfxGain;
    if (!ctx || !out || this.sfxVolume <= 0) return;
    const t = ctx.currentTime;
    switch (sfx) {
      case 'tap': this.tone(440, 0.05, 'triangle', 0.25, t); break;
      case 'collect': {
        const p = RARITY_PITCH[rarity];
        [523, 659, 784, 1047].forEach((f, i) => this.tone(f * p, 0.14, 'triangle', 0.35, t + i * 0.07));
        if (rarity === 'legendary' || rarity === 'epic') this.tone(1568 * p, 0.4, 'sine', 0.2, t + 0.3);
        break;
      }
      case 'goal':
        this.noise(0.9, 0.35, t, 900);
        [392, 523, 659].forEach((f, i) => this.tone(f, 0.25, 'square', 0.12, t + i * 0.09));
        break;
      case 'saved': this.tone(196, 0.3, 'sawtooth', 0.18, t); this.tone(147, 0.35, 'sawtooth', 0.15, t + 0.12); break;
      case 'levelUp': [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.18, 'square', 0.15, t + i * 0.08)); break;
      case 'claim': [784, 988, 1175].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.3, t + i * 0.06)); break;
      case 'error': this.tone(180, 0.18, 'square', 0.15, t); break;
      case 'whistle': this.tone(2400, 0.35, 'sine', 0.18, t); this.tone(2600, 0.2, 'sine', 0.12, t + 0.05); break;
    }
  }

  private applyVolumes(): void {
    if (!this.ctx) return;
    this.sfxGain?.gain.setTargetAtTime(this.sfxVolume, this.ctx.currentTime, 0.02);
    this.musicGain?.gain.setTargetAtTime(this.musicVolume * 0.25, this.ctx.currentTime, 0.1);
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, at: number): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(vol, at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(g).connect(this.sfxGain!);
    osc.start(at);
    osc.stop(at + dur + 0.02);
  }

  private noise(dur: number, vol: number, at: number, cutoff: number): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(dur);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(filter).connect(g).connect(this.sfxGain!);
    src.start(at);
  }

  private noiseBuffer(seconds: number): AudioBuffer {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  /** Soft looping crowd murmur, controlled by the music volume. */
  private startAmbience(): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(4);
    src.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 500;
    band.Q.value = 0.7;
    src.connect(band).connect(this.musicGain!);
    src.start();
    this.ambience = src;
  }

  dispose(): void {
    this.ambience?.stop();
    void this.ctx?.close().catch(() => undefined);
    this.ctx = null;
  }
}
