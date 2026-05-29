// SoundManager.js - 音效管理器，支持文件和代码生成音效
class SoundManager {
  static _bgmKey = null;
  static _bgmSound = null;
  static _bgmPlaying = false;
  static _sfxVolume = 0.5;
  static _bgmVolume = 0.3;
  static _audioCtx = null;

  static _getAudioCtx() {
    if (!SoundManager._audioCtx) {
      SoundManager._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return SoundManager._audioCtx;
  }

  // 生成简单音效并注册到 Phaser 缓存
  static _generateSFX(scene, key, type) {
    if (scene.cache.audio.exists(key)) return;

    const ctx = SoundManager._getAudioCtx();
    const sampleRate = ctx.sampleRate;
    let duration, buffer;

    switch (type) {
      case 'click':
        duration = 0.08;
        buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
        const clickData = buffer.getChannelData(0);
        for (let i = 0; i < clickData.length; i++) {
          const t = i / sampleRate;
          clickData[i] = Math.sin(2 * Math.PI * 800 * t) * Math.exp(-t * 40) * 0.4;
        }
        break;

      case 'hit':
        duration = 0.15;
        buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
        const hitData = buffer.getChannelData(0);
        for (let i = 0; i < hitData.length; i++) {
          const t = i / sampleRate;
          hitData[i] = (Math.sin(2 * Math.PI * 200 * t) * 0.5 + (Math.random() - 0.5) * 0.5) * Math.exp(-t * 15) * 0.5;
        }
        break;

      case 'heal':
        duration = 0.4;
        buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
        const healData = buffer.getChannelData(0);
        for (let i = 0; i < healData.length; i++) {
          const t = i / sampleRate;
          const freq = 400 + t * 600;
          healData[i] = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 5) * 0.3;
        }
        break;

      case 'victory':
        duration = 0.8;
        buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
        const vicData = buffer.getChannelData(0);
        const notes = [523, 659, 784, 1047];
        for (let i = 0; i < vicData.length; i++) {
          const t = i / sampleRate;
          const noteIdx = Math.min(Math.floor(t * 6), notes.length - 1);
          const noteT = t - noteIdx / 6;
          vicData[i] = Math.sin(2 * Math.PI * notes[noteIdx] * t) * Math.exp(-noteT * 4) * 0.3;
        }
        break;

      case 'defeat':
        duration = 0.6;
        buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
        const defData = buffer.getChannelData(0);
        for (let i = 0; i < defData.length; i++) {
          const t = i / sampleRate;
          const freq = 300 - t * 200;
          defData[i] = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 4) * 0.3;
        }
        break;

      case 'dialogue':
        duration = 0.04;
        buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
        const diaData = buffer.getChannelData(0);
        for (let i = 0; i < diaData.length; i++) {
          const t = i / sampleRate;
          diaData[i] = (Math.random() - 0.5) * Math.exp(-t * 60) * 0.15;
        }
        break;

      case 'reward':
        duration = 0.3;
        buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
        const rewData = buffer.getChannelData(0);
        for (let i = 0; i < rewData.length; i++) {
          const t = i / sampleRate;
          rewData[i] = (Math.sin(2 * Math.PI * 880 * t) * 0.5 + Math.sin(2 * Math.PI * 1100 * t) * 0.3) * Math.exp(-t * 8) * 0.3;
        }
        break;

      case 'alert':
        duration = 0.25;
        buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
        const alertData = buffer.getChannelData(0);
        for (let i = 0; i < alertData.length; i++) {
          const t = i / sampleRate;
          const freq = 600 + Math.sin(t * 30) * 200;
          alertData[i] = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 6) * 0.35;
        }
        break;

      default:
        return;
    }

    // 转为 Phaser 可用的音频并注册
    try {
      const wavBlob = SoundManager._bufferToWav(buffer);
      const url = URL.createObjectURL(wavBlob);
      scene.cache.audio.add(key, { data: buffer, url: url });
      // 用 Phaser 的方式注册
      scene.sound.decodeAudio(key, url);
    } catch (e) {
      // fallback: 直接用 Web Audio API 播放
    }
  }

  // AudioBuffer 转 WAV Blob
  static _bufferToWav(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitsPerSample = 16;
    const dataLength = buffer.length * numChannels * bitsPerSample / 8;
    const headerLength = 44;
    const totalLength = headerLength + dataLength;
    const arrayBuffer = new ArrayBuffer(totalLength);
    const view = new DataView(arrayBuffer);

    const writeString = (offset, str) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };

    writeString(0, 'RIFF');
    view.setUint32(4, totalLength - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * bitsPerSample / 8, true);
    view.setUint16(32, numChannels * bitsPerSample / 8, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(36, 'data');
    view.setUint32(40, dataLength, true);

    const channelData = buffer.getChannelData(0);
    let offset = 44;
    for (let i = 0; i < channelData.length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  // 加载所有音频（在 BootScene preload 中调用）
  static preloadAll(scene) {
    const audioFiles = [
      { key: 'bgm_menu', file: 'assets/audio/bgm_menu.mp3' },
      { key: 'bgm_map', file: 'assets/audio/bgm_map.mp3' },
      { key: 'bgm_battle', file: 'assets/audio/bgm_battle.mp3' },
      { key: 'bgm_campfire', file: 'assets/audio/bgm_campfire.mp3' },
      { key: 'sfx_click', file: 'assets/audio/click.mp3' },
      { key: 'sfx_hit', file: 'assets/audio/hit.mp3' },
      { key: 'sfx_heal', file: 'assets/audio/heal.mp3' },
      { key: 'sfx_victory', file: 'assets/audio/victory.mp3' },
      { key: 'sfx_defeat', file: 'assets/audio/defeat.mp3' },
      { key: 'sfx_dialogue', file: 'assets/audio/dialogue.mp3' },
      { key: 'sfx_reward', file: 'assets/audio/reward.mp3' },
      { key: 'sfx_alert', file: 'assets/audio/alert.mp3' },
      { key: 'sfx_boss_intro', file: 'assets/audio/boss_intro.mp3' },
    ];

    audioFiles.forEach(a => {
      scene.load.audio(a.key, a.file);
    });

    scene.load.on('loaderror', (file) => {
      if (file.type === 'audio') {
        scene.cache.audio.remove(file.key);
      }
    });
  }

  // 生成缺失的音效（在 BootScene create 中调用）
  static generateMissing(scene) {
    const sfxMap = {
      sfx_click: 'click',
      sfx_hit: 'hit',
      sfx_heal: 'heal',
      sfx_victory: 'victory',
      sfx_defeat: 'defeat',
      sfx_dialogue: 'dialogue',
      sfx_reward: 'reward',
      sfx_alert: 'alert',
    };

    Object.entries(sfxMap).forEach(([key, type]) => {
      if (!scene.cache.audio.exists(key)) {
        SoundManager._generateSFX(scene, key, type);
      }
    });
  }

  // 播放背景音乐
  static playBGM(scene, key) {
    if (SoundManager._bgmKey === key && SoundManager._bgmPlaying) return;
    SoundManager.stopBGM();

    if (!scene.cache.audio.exists(key)) return;

    try {
      const bgm = scene.sound.add(key, { loop: true, volume: SoundManager._bgmVolume });
      bgm.play();
      SoundManager._bgmKey = key;
      SoundManager._bgmSound = bgm;
      SoundManager._bgmPlaying = true;
    } catch (e) {}
  }

  // 停止背景音乐
  static stopBGM() {
    if (SoundManager._bgmSound) {
      try { SoundManager._bgmSound.stop(); SoundManager._bgmSound.destroy(); } catch (e) {}
      SoundManager._bgmSound = null;
    }
    SoundManager._bgmKey = null;
    SoundManager._bgmPlaying = false;
  }

  // 播放音效（优先用文件，没有则用生成的）
  static playSFX(scene, key) {
    if (!scene.cache.audio.exists(key)) {
      // 尝试用 Web Audio API 直接播放生成的音效
      SoundManager._playGeneratedFallback(scene, key);
      return;
    }

    try {
      const sfx = scene.sound.add(key, { volume: SoundManager._sfxVolume });
      sfx.play();
      sfx.once('complete', () => sfx.destroy());
    } catch (e) {
      SoundManager._playGeneratedFallback(scene, key);
    }
  }

  // Web Audio API 直接播放（fallback）
  static _playGeneratedFallback(scene, key) {
    const typeMap = {
      sfx_click: 'click', sfx_hit: 'hit', sfx_heal: 'heal',
      sfx_victory: 'victory', sfx_defeat: 'defeat', sfx_dialogue: 'dialogue',
      sfx_reward: 'reward', sfx_alert: 'alert',
    };
    const type = typeMap[key];
    if (!type) return;

    const ctx = SoundManager._getAudioCtx();
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.value = SoundManager._sfxVolume * 0.3;

    const now = ctx.currentTime;
    switch (type) {
      case 'click':
        osc.frequency.value = 800;
        osc.type = 'sine';
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now); osc.stop(now + 0.08);
        break;
      case 'hit':
        osc.frequency.value = 200;
        osc.type = 'sawtooth';
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now); osc.stop(now + 0.15);
        break;
      case 'heal':
        osc.frequency.value = 500;
        osc.type = 'sine';
        osc.frequency.exponentialRampToValueAtTime(1000, now + 0.4);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now); osc.stop(now + 0.4);
        break;
      case 'victory':
        osc.frequency.value = 523;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523, now);
        osc.frequency.setValueAtTime(659, now + 0.15);
        osc.frequency.setValueAtTime(784, now + 0.3);
        osc.frequency.setValueAtTime(1047, now + 0.45);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
        osc.start(now); osc.stop(now + 0.7);
        break;
      case 'defeat':
        osc.frequency.value = 300;
        osc.type = 'sine';
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.6);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.start(now); osc.stop(now + 0.6);
        break;
      case 'dialogue':
        osc.frequency.value = 600 + Math.random() * 200;
        osc.type = 'sine';
        gain.gain.value = SoundManager._sfxVolume * 0.08;
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        osc.start(now); osc.stop(now + 0.03);
        break;
      case 'reward':
        osc.frequency.value = 880;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.setValueAtTime(1100, now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now); osc.stop(now + 0.3);
        break;
      case 'alert':
        osc.frequency.value = 600;
        osc.type = 'square';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.setValueAtTime(800, now + 0.08);
        osc.frequency.setValueAtTime(600, now + 0.16);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now); osc.stop(now + 0.25);
        break;
      default:
        osc.stop(now);
    }
  }

  static setVolume(sfx, bgm) {
    if (sfx !== undefined) SoundManager._sfxVolume = sfx;
    if (bgm !== undefined) SoundManager._bgmVolume = bgm;
  }
}
