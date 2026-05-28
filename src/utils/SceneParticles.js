// SceneParticles.js - Atmospheric particle effects with soft glow textures
class SceneParticles {

  // Soft glow texture: concentric circles with quadratic alpha falloff
  static makeGlowTexture(scene, key, radius, color) {
    if (scene.textures.exists(key)) return;
    const size = radius * 4;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const steps = 8;
    for (let i = steps; i >= 0; i--) {
      const ratio = i / steps;
      const r = radius * (0.3 + 0.7 * ratio);
      const alpha = ratio * ratio * 0.8;
      g.fillStyle(color, alpha);
      g.fillCircle(size / 2, size / 2, r);
    }
    g.generateTexture(key, size, size);
    g.destroy();
  }

  // Bright core glow: soft outer + bright inner dot
  static makeCoreGlowTexture(scene, key, radius, color) {
    if (scene.textures.exists(key)) return;
    const size = radius * 4;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    // Soft outer glow
    const steps = 6;
    for (let i = steps; i >= 0; i--) {
      const ratio = i / steps;
      const r = radius * (0.4 + 0.6 * ratio);
      const alpha = ratio * ratio * 0.6;
      g.fillStyle(color, alpha);
      g.fillCircle(size / 2, size / 2, r);
    }
    // Bright core
    g.fillStyle(0xffffff, 0.7);
    g.fillCircle(size / 2, size / 2, radius * 0.25);
    g.generateTexture(key, size, size);
    g.destroy();
  }

  // Rain streak: elongated ellipse with soft edges
  static makeRainTexture(scene, key) {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    for (let i = 3; i >= 0; i--) {
      const alpha = (3 - i) / 3 * 0.4;
      g.fillStyle(0x8899bb, alpha);
      g.fillEllipse(4, 10, 2.5 - i * 0.4, 18 - i * 2);
    }
    g.generateTexture(key, 8, 20);
    g.destroy();
  }

  // ===================== DUST / ASH =====================
  static addDust(scene, width, height) {
    SceneParticles.makeGlowTexture(scene, 'dust', 3, 0xaaaaaa);
    const particles = scene.add.particles(0, 0, 'dust', {
      x: { min: 0, max: width },
      y: { min: 0, max: height },
      lifespan: { min: 5000, max: 9000 },
      speed: { min: 5, max: 18 },
      angle: { min: 250, max: 290 },
      scale: { min: 0.15, max: 0.5 },
      alpha: { start: 0, end: 0.15, ease: 'Sine.easeInOut' },
      frequency: 400,
      quantity: 1,
    });
    particles.setDepth(5);
    return particles;
  }

  // ===================== EMBER / SPARKS =====================
  static addEmbers(scene, width, height) {
    SceneParticles.makeCoreGlowTexture(scene, 'ember', 3, 0xff6633);
    const particles = scene.add.particles(0, 0, 'ember', {
      x: { min: width * 0.3, max: width * 0.7 },
      y: { min: height * 0.6, max: height },
      lifespan: { min: 2500, max: 5500 },
      speed: { min: 10, max: 35 },
      angle: { min: 240, max: 300 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 0.7, end: 0, ease: 'Sine.easeOut' },
      frequency: 250,
      quantity: 1,
      tint: [0xff4400, 0xff6600, 0xffaa00, 0xff8800],
    });
    particles.setDepth(5);
    return particles;
  }

  // ===================== SMOKE =====================
  static addSmoke(scene, x, y) {
    SceneParticles.makeGlowTexture(scene, 'smoke', 12, 0x444444);
    const particles = scene.add.particles(x, y, 'smoke', {
      lifespan: { min: 3500, max: 7000 },
      speed: { min: 4, max: 12 },
      angle: { min: 250, max: 290 },
      scale: { start: 0.3, end: 1.5 },
      alpha: { start: 0.08, end: 0, ease: 'Sine.easeOut' },
      frequency: 600,
      quantity: 1,
    });
    particles.setDepth(4);
    return particles;
  }

  // ===================== RAIN =====================
  static addRain(scene, width, height) {
    SceneParticles.makeRainTexture(scene, 'rain');
    const particles = scene.add.particles(0, 0, 'rain', {
      x: { min: -50, max: width + 50 },
      y: { min: -50, max: -10 },
      lifespan: { min: 800, max: 1400 },
      speed: { min: 350, max: 550 },
      angle: { min: 85, max: 95 },
      scale: { min: 0.6, max: 1.2 },
      alpha: { start: 0.35, end: 0.05 },
      frequency: 30,
      quantity: 1,
    });
    particles.setDepth(6);
    return particles;
  }

  // ===================== FIREFLY / FLICKER =====================
  static addFireflies(scene, width, height) {
    SceneParticles.makeCoreGlowTexture(scene, 'firefly', 4, 0xffee88);
    const particles = scene.add.particles(0, 0, 'firefly', {
      x: { min: 0, max: width },
      y: { min: height * 0.3, max: height * 0.8 },
      lifespan: { min: 3000, max: 6000 },
      speed: { min: 3, max: 10 },
      angle: { min: 0, max: 360 },
      scale: { min: 0.2, max: 0.6 },
      alpha: { start: 0, end: 0.45, ease: 'Sine.easeInOut' },
      frequency: 700,
      quantity: 1,
    });
    particles.setDepth(5);
    return particles;
  }

  // ===================== BLOOD DRIP =====================
  static addBloodDrip(scene, x, y) {
    SceneParticles.makeGlowTexture(scene, 'blood', 3, 0x990000);
    const particles = scene.add.particles(x, y, 'blood', {
      lifespan: { min: 1500, max: 3000 },
      speed: { min: 10, max: 25 },
      angle: { min: 80, max: 100 },
      scale: { start: 0.6, end: 0.2 },
      alpha: { start: 0.35, end: 0 },
      frequency: 900,
      quantity: 1,
    });
    particles.setDepth(4);
    return particles;
  }

  // ===================== SCENE PRESETS =====================
  static applyForScene(sceneName, scene, width, height) {
    switch (sceneName) {
      case 'apartment':
        SceneParticles.addDust(scene, width, height);
        break;
      case 'gas_station':
        SceneParticles.addEmbers(scene, width, height);
        SceneParticles.addSmoke(scene, width * 0.4, height * 0.45);
        SceneParticles.addDust(scene, width, height);
        break;
      case 'supermarket':
        SceneParticles.addDust(scene, width, height);
        break;
      case 'hospital':
        SceneParticles.addBloodDrip(scene, 200, 30);
        SceneParticles.addBloodDrip(scene, 550, 50);
        SceneParticles.addDust(scene, width, height);
        break;
      case 'highway':
        SceneParticles.addDust(scene, width, height);
        SceneParticles.addEmbers(scene, width, height);
        break;
      case 'mountain':
        SceneParticles.addDust(scene, width, height);
        SceneParticles.addFireflies(scene, width, height);
        break;
      case 'safe_zone':
        SceneParticles.addDust(scene, width, height);
        break;
      default:
        SceneParticles.addDust(scene, width, height);
        break;
    }
  }
}
