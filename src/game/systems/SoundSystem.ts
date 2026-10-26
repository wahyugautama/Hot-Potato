export type SoundEffect = 'button' | 'dash' | 'transfer' | 'tick' | 'explosion' | 'victory';

const SOUND_SETTINGS: Record<SoundEffect, [number, number, OscillatorType]> = {
  button: [420, 0.05, 'sine'], dash: [180, 0.12, 'sawtooth'], transfer: [660, 0.1, 'square'],
  tick: [880, 0.035, 'sine'], explosion: [90, 0.25, 'sawtooth'], victory: [740, 0.32, 'triangle'],
};

export class SoundSystem {
  private context: AudioContext | null = null;
  private muted = false;

  public unlock(): void {
    this.context ??= new AudioContext();
    if (this.context.state === 'suspended') void this.context.resume();
  }

  public setMuted(muted: boolean): void { this.muted = muted; }
  public isMuted(): boolean { return this.muted; }

  public play(effect: SoundEffect): void {
    if (this.muted || !this.context || this.context.state !== 'running') return;
    const [frequency, duration, type] = SOUND_SETTINGS[effect];
    const oscillator = this.context.createOscillator(); const gain = this.context.createGain();
    oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, this.context.currentTime);
    if (effect === 'dash' || effect === 'explosion') oscillator.frequency.exponentialRampToValueAtTime(55, this.context.currentTime + duration);
    gain.gain.setValueAtTime(effect === 'explosion' ? 0.09 : 0.045, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + duration);
    oscillator.connect(gain).connect(this.context.destination); oscillator.start(); oscillator.stop(this.context.currentTime + duration);
  }
}

export const sound = new SoundSystem();
