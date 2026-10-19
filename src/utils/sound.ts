class SoundManager {
  private ctx: AudioContext | null = null;
  private muted = false;

  private getContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    try {
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  public playClick(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(190, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(95, ctx.currentTime + 0.045);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.045);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch {
      // Ignore audio errors
    }
  }

  public playSuccess(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [261.63, 329.63, 392.0].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.055);
        gain.gain.setValueAtTime(0.07, now + idx * 0.055);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.055 + 0.16);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.055);
        osc.stop(now + idx * 0.055 + 0.17);
      });
    } catch {
      // Ignore audio errors
    }
  }

  public playDanger(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(135, now);
      osc.frequency.linearRampToValueAtTime(75, now + 0.22);

      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } catch {
      // Ignore audio errors
    }
  }

  public playShot(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      // Low-end gunshot body
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(48, now + 0.095);

      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.105);

      // Metallic slide snap
      const snap = ctx.createOscillator();
      const snapGain = ctx.createGain();
      snap.type = 'square';
      snap.frequency.setValueAtTime(1150, now + 0.015);
      snap.frequency.exponentialRampToValueAtTime(280, now + 0.055);
      snapGain.gain.setValueAtTime(0.045, now + 0.015);
      snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      snap.connect(snapGain);
      snapGain.connect(ctx.destination);
      snap.start(now + 0.015);
      snap.stop(now + 0.065);
    } catch {
      // Ignore audio errors
    }
  }

  public playEmptyClick(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(920, now);
      osc.frequency.exponentialRampToValueAtTime(310, now + 0.032);

      gain.gain.setValueAtTime(0.075, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.04);
    } catch {
      // Ignore audio errors
    }
  }

  public playReload(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      // Mag insert click + slide rack
      [
        { t: 0, f1: 420, f2: 640 },
        { t: 0.11, f1: 780, f2: 390 },
      ].forEach(({ t, f1, f2 }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f1, now + t);
        osc.frequency.exponentialRampToValueAtTime(f2, now + t + 0.055);
        gain.gain.setValueAtTime(0.07, now + t);
        gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.06);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + t);
        osc.stop(now + t + 0.065);
      });
    } catch {
      // Ignore audio errors
    }
  }

  public playMelee(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(195, now);
      osc.frequency.exponentialRampToValueAtTime(58, now + 0.12);

      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.125);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.13);
    } catch {
      // Ignore audio errors
    }
  }

  public playHit(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(125, now);
      osc.frequency.exponentialRampToValueAtTime(42, now + 0.08);

      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    } catch {
      // Ignore audio errors
    }
  }

  public playLoot(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [330.0, 440.0].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.055);
        gain.gain.setValueAtTime(0.075, now + idx * 0.055);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.055 + 0.11);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.055);
        osc.stop(now + idx * 0.055 + 0.12);
      });
    } catch {
      // Ignore audio errors
    }
  }

  // --- District Ambient Soundscapes & Atmospheric Foley ---
  private currentDistrict: 'residential' | 'commercial' | 'medical' | null = null;
  private currentIsIndoors = false;
  private ambientTimer: number | null = null;

  public setAmbientDistrict(
    district: 'residential' | 'commercial' | 'medical',
    isIndoors: boolean
  ): void {
    if (this.currentDistrict === district && this.currentIsIndoors === isIndoors) {
      return;
    }
    this.currentDistrict = district;
    this.currentIsIndoors = isIndoors;

    if (!this.ambientTimer && typeof window !== 'undefined') {
      this.startAmbientScheduler();
    }
  }

  public stopAmbient(): void {
    if (this.ambientTimer && typeof window !== 'undefined') {
      window.clearInterval(this.ambientTimer);
      this.ambientTimer = null;
    }
    this.currentDistrict = null;
  }

  private startAmbientScheduler(): void {
    if (typeof window === 'undefined') return;
    // Periodic ambient cue trigger every 5.5 seconds with district/indoor personality
    this.ambientTimer = window.setInterval(() => {
      if (this.muted || !this.currentDistrict) return;
      this.triggerAmbientCue(this.currentDistrict, this.currentIsIndoors);
    }, 5500);
  }

  private triggerAmbientCue(
    district: 'residential' | 'commercial' | 'medical',
    isIndoors: boolean
  ): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      if (isIndoors) {
        // Interior ambiance: creaking floorboard or settling metal pipe
        if (Math.random() > 0.4) {
          this.playWoodCreakInternal(ctx, now);
        } else {
          this.playDripInternal(ctx, now);
        }
        return;
      }

      // Exterior District Ambiance
      if (district === 'residential') {
        // Vila Esperança: lonely desolate wind gust
        this.playWindGustInternal(ctx, now);
      } else if (district === 'commercial') {
        // Centro Comercial: distant emergency siren or faint metal shutter rattle
        if (Math.random() > 0.45) {
          this.playDistantSirenInternal(ctx, now);
        } else {
          this.playWindGustInternal(ctx, now, 0.03);
        }
      } else if (district === 'medical') {
        // Complexo Médico: fluorescent capacitor hum burst or metallic resonance
        if (Math.random() > 0.5) {
          this.playFluorescentBuzzInternal(ctx, now);
        } else {
          this.playDripInternal(ctx, now);
        }
      }
    } catch {
      // Ignore audio ambient errors
    }
  }

  // Desolate wind gust (soft low frequency modulation)
  private playWindGustInternal(ctx: AudioContext, now: number, baseVol = 0.045): void {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(55, now);
    osc.frequency.exponentialRampToValueAtTime(88, now + 1.2);
    osc.frequency.exponentialRampToValueAtTime(48, now + 2.8);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(220, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(baseVol, now + 0.9);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + 3.0);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 3.1);
  }

  // Faint distant emergency siren (2km away in ruins)
  private playDistantSirenInternal(ctx: AudioContext, now: number): void {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    // Distant siren waver
    osc.frequency.setValueAtTime(460, now);
    osc.frequency.linearRampToValueAtTime(530, now + 1.1);
    osc.frequency.linearRampToValueAtTime(440, now + 2.2);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(580, now); // Damp high harsh frequencies

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.016, now + 0.6);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + 2.4);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 2.5);
  }

  // Indoor wooden floorboard creak
  private playWoodCreakInternal(ctx: AudioContext, now: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.linearRampToValueAtTime(115, now + 0.16);
    osc.frequency.linearRampToValueAtTime(95, now + 0.28);

    gain.gain.setValueAtTime(0.024, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.34);
  }

  // Leaking water pipe drip
  private playDripInternal(ctx: AudioContext, now: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(840, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.04);

    gain.gain.setValueAtTime(0.028, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  // Medical generator / dying fluorescent tube flicker
  private playFluorescentBuzzInternal(ctx: AudioContext, now: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(60, now);

    gain.gain.setValueAtTime(0.012, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.26);
  }

  // Flashlight click switch
  public playFlashlight(turnOn: boolean): void {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(turnOn ? 850 : 540, now);
      osc.frequency.exponentialRampToValueAtTime(turnOn ? 1400 : 280, now + 0.028);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.032);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.035);
    } catch {
      // Ignore audio errors
    }
  }

  // Bandaging / field healing application rustle
  public playHealingProgress(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.linearRampToValueAtTime(380, now + 0.08);

      gain.gain.setValueAtTime(0.045, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } catch {
      // Ignore audio errors
    }
  }

  public playHealingComplete(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [392.0, 523.25].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);
        gain.gain.setValueAtTime(0.08, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.24);
      });
    } catch {
      // Ignore audio errors
    }
  }

  // Container drawer / hinge squeak on searching
  public playContainerSqueak(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(620, now);
      osc.frequency.linearRampToValueAtTime(740, now + 0.07);
      osc.frequency.exponentialRampToValueAtTime(210, now + 0.16);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
    } catch {
      // Ignore audio errors
    }
  }
}

export const soundFX = new SoundManager();


