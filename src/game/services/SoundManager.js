/**
 * Web Audio APIを活用したリアルタイム効果音・環境音シンセサイザー
 */
class SoundManagerClass {
  constructor() {
    this.ctx = null;
    this.ambientAudio = null;
    this.channelGains = {};
    this.masterGain = null;
    this.rainLevel = 0;
    this.volumes = this.loadVolumes();
    this.rainIntensity = 0;
    this.rainPlaybackAllowed = false;
    this.rainFadeTimer = null;
    this.gameAudioActive = false;
    this.defaultVolumes = { bgm: 100, se: 100, voice: 100, ambient: 100, master: 100 };
    this.lastClickAt = 0;
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

  getEffectiveVolumes() {
    return this.gameAudioActive ? this.volumes : this.defaultVolumes;
  }

  setGameAudioActive(active) {
    this.gameAudioActive = Boolean(active);
    this.applyVolumes();
    this.syncRainPlayback();
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
    const volumes = this.getEffectiveVolumes();
    const now = this.ctx.currentTime;
    const setGain = (gain, value) => {
      // A zero setting is a hard mute; smoothing can otherwise leave a brief
      // audible tail after the slider reaches zero.
      if (value === 0) {
        gain.cancelScheduledValues(now);
        gain.setValueAtTime(0, now);
      } else {
        gain.setTargetAtTime(value / 100, now, 0.025);
      }
    };
    if (this.masterGain) setGain(this.masterGain.gain, volumes.master);
    for (const [key, node] of Object.entries(this.channelGains)) {
      setGain(node.gain, volumes[key]);
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

  startRain({ fromUserGesture = false } = {}) {
    if (typeof Audio === "undefined") return;
    if (!this.ambientAudio) {
      this.ambientAudio = new Audio("/soft_natural_rain_loop.wav");
      this.ambientAudio.loop = true;
      this.ambientAudio.preload = "auto";
      this.ambientAudio.volume = 0;
    }
    this.init();
    this.syncRainPlayback(fromUserGesture);
  }

  setRainIntensity(intensity) {
    this.rainIntensity = Math.max(0, Math.min(1, intensity));
    this.rainPlaybackAllowed = this.rainIntensity > 0;
    this.startRain();
  }

  stopRain() {
    this.rainIntensity = 0;
    this.rainPlaybackAllowed = false;
    this.rainLevel = 0;
    if (!this.ambientAudio) return;
    this.ambientAudio.volume = 0;
    this.ambientAudio.pause();
  }

  syncRainPlayback(fromUserGesture = false) {
    if (!this.ambientAudio) return;
    const currentVolumes = this.getEffectiveVolumes();
    if (!currentVolumes.ambient || !currentVolumes.master) {
      this.ambientAudio.volume = 0;
      if (this.ambientAudio.paused === false) this.ambientAudio.pause();
      return;
    }
    if (this.rainFadeTimer === null) {
      this.rainFadeTimer = window.setInterval(() => {
        if (!this.ambientAudio) return;
        // Read current values on every tick so slider changes take effect
        // immediately instead of leaving the first volume snapshot in use.
        const volumes = this.getEffectiveVolumes();
        const targetVolume = this.rainIntensity * 0.2;
        const difference = targetVolume - this.rainLevel;
        if (Math.abs(difference) < 0.003) {
          this.rainLevel = targetVolume;
          this.ambientAudio.volume = targetVolume * volumes.ambient / 100 * volumes.master / 100;
          if (targetVolume === 0) this.ambientAudio.pause();
          return;
        }
        this.rainLevel += difference * 0.12;
        this.ambientAudio.volume = this.rainLevel * volumes.ambient / 100 * volumes.master / 100;
      }, 50);
    }
    const volumes = currentVolumes;
    if (this.rainPlaybackAllowed && this.rainIntensity > 0 && volumes.ambient > 0 && volumes.master > 0 && (fromUserGesture || this.ambientAudio.paused)) {
      const audio = this.ambientAudio;
      audio.play().then(() => {
        if (!this.rainPlaybackAllowed || this.rainIntensity === 0) audio.pause();
      }).catch((error) => {
        // A blocked autoplay attempt is retried on the next user gesture.
        if (error?.name !== "NotAllowedError") console.warn("Rain audio could not start:", error);
      });
    }
  }

  // クリック・UI音
  playClick() {
    const now = Date.now();
    if (now - this.lastClickAt < 60) return;
    this.lastClickAt = now;
    this.init();
    const volumes = this.getEffectiveVolumes();
    if (!this.ctx || volumes.se === 0 || volumes.master === 0) return;
    const startAt = this.ctx.currentTime;
    const noiseDuration = 0.012;
    const noiseBuffer = this.ctx.createBuffer(1, Math.ceil(this.ctx.sampleRate * noiseDuration), this.ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let index = 0; index < noiseData.length; index += 1) {
      noiseData[index] = (Math.random() * 2 - 1) * (1 - index / noiseData.length);
    }

    const noise = this.ctx.createBufferSource();
    const highPass = this.ctx.createBiquadFilter();
    const noiseGain = this.ctx.createGain();
    noise.buffer = noiseBuffer;
    highPass.type = "highpass";
    highPass.frequency.setValueAtTime(1500, startAt);
    noiseGain.gain.setValueAtTime(0.12, startAt);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, startAt + noiseDuration);
    noise.connect(highPass);
    highPass.connect(noiseGain);
    noiseGain.connect(this.channelGains.se);
    noise.start(startAt);
    noise.stop(startAt + noiseDuration);

    const thock = this.ctx.createOscillator();
    const thockGain = this.ctx.createGain();
    thock.type = "triangle";
    thock.frequency.setValueAtTime(950, startAt);
    thock.frequency.exponentialRampToValueAtTime(280, startAt + 0.028);
    thockGain.gain.setValueAtTime(0.07, startAt);
    thockGain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.028);
    thock.connect(thockGain);
    thockGain.connect(this.channelGains.se);
    thock.start(startAt);
    thock.stop(startAt + 0.028);
  }

  // 剣攻撃音
  playSlash() {
    this.init();
    const volumes = this.getEffectiveVolumes();
    if (!this.ctx || volumes.se === 0 || volumes.master === 0) return;
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
    const volumes = this.getEffectiveVolumes();
    if (!this.ctx || volumes.se === 0 || volumes.master === 0) return;
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
    const volumes = this.getEffectiveVolumes();
    if (!this.ctx || volumes.se === 0 || volumes.master === 0) return;
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
    const volumes = this.getEffectiveVolumes();
    if (!this.ctx || volumes.se === 0 || volumes.master === 0) return;
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
    const volumes = this.getEffectiveVolumes();
    if (!this.ctx || volumes.se === 0 || volumes.master === 0) return;
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
    const volumes = this.getEffectiveVolumes();
    if (!this.ctx || volumes.se === 0 || volumes.master === 0) return;
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
