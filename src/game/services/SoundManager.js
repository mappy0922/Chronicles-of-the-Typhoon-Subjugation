/**
 * Web Audio APIを活用したリアルタイム効果音・環境音シンセサイザー
 */
class SoundManagerClass {
  constructor() {
    this.ctx = null;
    this.ambientAudio = null;
    this.rainSource = null;
    this.rainGain = null;
    this.channelGains = {};
    this.masterGain = null;
    this.rainLevel = 0;
    this.volumes = this.loadVolumes();
    this.rainIntensity = 0;
    this.rainFadeTimer = null;
  }

  loadVolumes() {
    const defaults = { bgm: 100, se: 100, voice: 100, ambient: 100, master: 100 };
    try {
      const saved = JSON.parse(localStorage.getItem("game-audio-volumes") || "{}");
      for (const key of Object.keys(defaults)) {
        if (Number.isFinite(saved[key])) defaults[key] = Math.max(0, Math.min(100, saved[key]));
      }
    } catch {
      // Use default levels when storage is unavailable or invalid.
    }
    return defaults;
  }

  getVolumes() {
    return { ...this.volumes };
  }

  setVolume(channel, value) {
    if (!(channel in this.volumes)) return;
    this.volumes[channel] = Math.max(0, Math.min(100, Number(value) || 0));
    try {
      localStorage.setItem("game-audio-volumes", JSON.stringify(this.volumes));
    } catch {
      // Keep the current session's values even when storage is unavailable.
    }
    this.init();
    this.applyVolumes();
    this.syncRainPlayback();
  }

  applyVolumes() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.masterGain) this.masterGain.gain.setTargetAtTime(this.volumes.master / 100, now, 0.025);
    for (const [key, node] of Object.entries(this.channelGains)) {
      node.gain.setTargetAtTime(this.volumes[key] / 100, now, 0.025);
    }
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
        for (const channel of ["bgm", "se", "voice", "ambient"]) {
          this.channelGains[channel] = this.ctx.createGain();
          this.channelGains[channel].connect(this.masterGain);
        }
        this.applyVolumes();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  startRain() {
    if (typeof Audio === "undefined") return;
    if (!this.ambientAudio) {
      this.ambientAudio = new Audio("/soft_natural_rain.wav");
      this.ambientAudio.loop = true;
      this.ambientAudio.preload = "auto";
      this.ambientAudio.volume = 1;
    }
    this.init();
    if (this.ctx && !this.rainSource) {
      try {
        this.rainSource = this.ctx.createMediaElementSource(this.ambientAudio);
        this.rainGain = this.ctx.createGain();
        this.rainSource.connect(this.rainGain);
        this.rainGain.connect(this.channelGains.ambient);
        this.rainGain.gain.value = this.rainLevel;
      } catch {
        this.rainSource = null;
        this.rainGain = null;
      }
    }
    this.syncRainPlayback();
  }

  setRainIntensity(intensity) {
    this.rainIntensity = Math.max(0, Math.min(1, intensity));
    this.startRain();
  }

  syncRainPlayback() {
    if (!this.ambientAudio) return;
    if (this.rainFadeTimer === null) {
      this.rainFadeTimer = window.setInterval(() => {
        if (!this.ambientAudio) return;
        const targetVolume = this.rainIntensity * 0.2;
        const difference = targetVolume - this.rainLevel;
        if (Math.abs(difference) < 0.003) {
          this.rainLevel = targetVolume;
          if (this.rainGain) this.rainGain.gain.value = targetVolume;
          else this.ambientAudio.volume = targetVolume * this.volumes.ambient / 100 * this.volumes.master / 100;
          if (targetVolume === 0) this.ambientAudio.pause();
          return;
        }
        this.rainLevel += difference * 0.12;
        if (this.rainGain) this.rainGain.gain.value = this.rainLevel;
        else this.ambientAudio.volume = this.rainLevel * this.volumes.ambient / 100 * this.volumes.master / 100;
      }, 50);
    }
    if (this.rainIntensity > 0 && this.volumes.ambient > 0 && this.volumes.master > 0 && this.ambientAudio.paused) {
      this.ambientAudio.play().catch(() => {});
    }
  }

  // クリック・UI音
  playClick() {
    this.init();
    if (!this.ctx || this.volumes.se === 0 || this.volumes.master === 0) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(this.channelGains.se);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  // 剣攻撃音
  playSlash() {
    this.init();
    if (!this.ctx || this.volumes.se === 0 || this.volumes.master === 0) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(this.channelGains.se);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  // 弓矢発射音
  playBow() {
    this.init();
    if (!this.ctx || this.volumes.se === 0 || this.volumes.master === 0) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(this.channelGains.se);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }

  // 盾ガード音
  playShield() {
    this.init();
    if (!this.ctx || this.volumes.se === 0 || this.volumes.master === 0) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(160, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(90, this.ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(this.channelGains.se);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  // 警報サイレン（台風接近時）
  playAlert() {
    this.init();
    if (!this.ctx || this.volumes.se === 0 || this.volumes.master === 0) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(650, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(900, this.ctx.currentTime + 0.3);
    osc.frequency.linearRampToValueAtTime(650, this.ctx.currentTime + 0.6);
    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.6);
    osc.connect(gain);
    gain.connect(this.channelGains.se);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.6);
  }

  // 勝利ファンファーレ
  playVictory() {
    this.init();
    if (!this.ctx || this.volumes.se === 0 || this.volumes.master === 0) return;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.12);
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.12 + 0.35);
      osc.connect(gain);
      gain.connect(this.channelGains.se);
      osc.start(this.ctx.currentTime + idx * 0.12);
      osc.stop(this.ctx.currentTime + idx * 0.12 + 0.35);
    });
  }

  // 収穫音
  playHarvest() {
    this.init();
    if (!this.ctx || this.volumes.se === 0 || this.volumes.master === 0) return;
    const notes = [440, 554.37, 659.25]; // A4, C#5, E5
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.08);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.08 + 0.2);
      osc.connect(gain);
      gain.connect(this.channelGains.se);
      osc.start(this.ctx.currentTime + idx * 0.08);
      osc.stop(this.ctx.currentTime + idx * 0.08 + 0.2);
    });
  }
}

export const SoundManager = new SoundManagerClass();
