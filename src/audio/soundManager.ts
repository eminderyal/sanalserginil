/**
 * Web Audio API procedural sound manager for ancient archaeological outdoor environment.
 * Generates ambient Mediterranean wind breeze, cicadas, stone footsteps, and exhibit chime resonance.
 */

class SoundManager {
  private isMuted: boolean = true;

  constructor() {
    // Audio disabled as requested
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getIsMuted(): boolean {
    return true;
  }

  public startAmbient() {
    // Audio disabled
  }

  public playFootstep() {
    // Audio disabled
  }

  public playExhibitChime() {
    // Audio disabled
  }

  public playTeleport() {
    // Audio disabled
  }

  public speak(_text: string) {
    // Audio disabled
  }

  public stopSpeaking() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}

export const soundManager = new SoundManager();
