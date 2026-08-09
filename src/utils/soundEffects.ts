/**
 * Web Audio API Sound Synthesizer for Nova AI OS.
 * Generates harmonic earcons, chimes, and acoustic feedback with zero external assets.
 */

class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private isMuted = false;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.ctx) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          this.ctx = new AudioContextClass();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public playTone(freq: number, type: OscillatorType = 'sine', duration = 0.15, gainVal = 0.1): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(gainVal, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio context might be restricted before user gesture
    }
  }

  /**
   * Play an uplifting 3-note harmonic chime (e.g. AI response finished / success)
   */
  public playSuccess(): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'sine', 0.22, 0.08);
      }, idx * 75);
    });
  }

  /**
   * Play a soft listening earcon
   */
  public playListening(): void {
    if (this.isMuted) return;
    const notes = [440, 554.37]; // A4, C#5
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'triangle', 0.14, 0.06);
      }, idx * 60);
    });
  }

  /**
   * Play a subtle stop listening earcon
   */
  public playStopListening(): void {
    if (this.isMuted) return;
    const notes = [554.37, 440]; // C#5, A4
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'triangle', 0.14, 0.05);
      }, idx * 60);
    });
  }

  /**
   * Play an alert chime for reminders and timers
   */
  public playReminder(): void {
    if (this.isMuted) return;
    const notes = [587.33, 880.00, 587.33, 880.00]; // D5, A5, D5, A5
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'sine', 0.18, 0.12);
      }, idx * 110);
    });
  }

  /**
   * Play a soft error tone
   */
  public playError(): void {
    if (this.isMuted) return;
    this.playTone(220, 'sawtooth', 0.25, 0.06);
  }

  /**
   * Play a crisp haptic click
   */
  public playClick(): void {
    if (this.isMuted) return;
    this.playTone(800, 'sine', 0.03, 0.04);
  }
}

export const soundEffects = new SoundSynthesizer();
