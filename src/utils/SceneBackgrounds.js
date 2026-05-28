// SceneBackgrounds.js - Procedural scene backgrounds
class SceneBackgrounds {

  // Dark night sky with stars
  static drawNightSky(scene, width, height) {
    const bg = scene.add.graphics();
    bg.fillGradientStyle(0x0a0a1a, 0x0a0a1a, 0x0f1528, 0x0f1528, 1);
    bg.fillRect(0, 0, width, height);

    // Stars
    for (let i = 0; i < 60; i++) {
      const sx = Math.random() * width;
      const sy = Math.random() * height * 0.6;
      const size = Math.random() * 2 + 0.5;
      const alpha = Math.random() * 0.6 + 0.2;
      const star = scene.add.graphics();
      star.fillStyle(0xffffff, alpha);
      star.fillCircle(sx, sy, size);
    }
  }

  // Apartment building silhouette background
  static drawApartment(scene, width, height) {
    const bg = scene.add.graphics();
    // Night sky gradient
    bg.fillGradientStyle(0x0a0a1a, 0x0a0a1a, 0x1a1025, 0x1a1025, 1);
    bg.fillRect(0, 0, width, height);

    // Moon
    bg.fillStyle(0xddd8c4, 0.3);
    bg.fillCircle(width - 80, 60, 30);
    bg.fillStyle(0x0a0a1a, 1);
    bg.fillCircle(width - 70, 55, 28);

    // Building silhouettes
    const buildings = [
      { x: 0, w: 120, h: 280 },
      { x: 100, w: 80, h: 350 },
      { x: 160, w: 140, h: 300 },
      { x: 280, w: 100, h: 380 },
      { x: 360, w: 120, h: 320 },
      { x: 460, w: 90, h: 290 },
      { x: 530, w: 130, h: 360 },
      { x: 640, w: 160, h: 310 },
    ];
    for (const b of buildings) {
      bg.fillStyle(0x0d0d1f, 1);
      bg.fillRect(b.x, height - b.h, b.w, b.h);
      // Windows
      for (let wy = height - b.h + 20; wy < height - 40; wy += 35) {
        for (let wx = b.x + 12; wx < b.x + b.w - 12; wx += 25) {
          const lit = Math.random() > 0.6;
          bg.fillStyle(lit ? 0xffcc44 : 0x111122, lit ? 0.4 : 0.3);
          bg.fillRect(wx, wy, 12, 16);
        }
      }
    }

    // Ground
    bg.fillStyle(0x111118, 1);
    bg.fillRect(0, height - 80, width, 80);
    bg.lineStyle(1, 0x222233, 0.5);
    bg.lineBetween(0, height - 80, width, height - 80);
  }

  // Gas station background
  static drawGasStation(scene, width, height) {
    const bg = scene.add.graphics();
    bg.fillGradientStyle(0x1a1520, 0x1a1520, 0x2a1a10, 0x2a1a10, 1);
    bg.fillRect(0, 0, width, height);

    // Stars
    for (let i = 0; i < 30; i++) {
      bg.fillStyle(0xffffff, Math.random() * 0.4 + 0.1);
      bg.fillCircle(Math.random() * width, Math.random() * height * 0.5, Math.random() * 1.5 + 0.5);
    }

    // Gas station canopy
    bg.fillStyle(0x1a1a2a, 1);
    bg.fillRect(250, height - 250, 300, 20);
    bg.fillRect(270, height - 230, 8, 150);
    bg.fillRect(520, height - 230, 8, 150);

    // Pumps
    bg.fillStyle(0x2a2a3a, 1);
    bg.fillRect(320, height - 160, 30, 80);
    bg.fillRect(440, height - 160, 30, 80);
    bg.fillStyle(0xe94560, 0.6);
    bg.fillRect(325, height - 150, 20, 10);
    bg.fillRect(445, height - 150, 20, 10);

    // Ground / road
    bg.fillStyle(0x1a1a18, 1);
    bg.fillRect(0, height - 80, width, 80);
    bg.lineStyle(2, 0x444433, 0.4);
    bg.lineBetween(0, height - 40, width, height - 40);

    // Road dashes
    for (let rx = 20; rx < width; rx += 60) {
      bg.fillStyle(0x555544, 0.3);
      bg.fillRect(rx, height - 42, 30, 4);
    }
  }

  // Supermarket background
  static drawSupermarket(scene, width, height) {
    const bg = scene.add.graphics();
    bg.fillGradientStyle(0x0f0f1a, 0x0f0f1a, 0x151520, 0x151520, 1);
    bg.fillRect(0, 0, width, height);

    // Supermarket shelves (silhouettes)
    for (let sx = 30; sx < width - 30; sx += 130) {
      bg.fillStyle(0x1a1a2a, 0.8);
      bg.fillRect(sx, height - 300, 100, 220);
      // Shelf lines
      for (let sy = height - 280; sy < height - 100; sy += 40) {
        bg.lineStyle(1, 0x2a2a3a, 0.6);
        bg.lineBetween(sx + 5, sy, sx + 95, sy);
      }
    }

    // Floor
    bg.fillStyle(0x18181e, 1);
    bg.fillRect(0, height - 80, width, 80);
    bg.lineStyle(1, 0x2a2a33, 0.5);
    bg.lineBetween(0, height - 80, width, height - 80);

    // Flickering light effect
    for (let lx = 100; lx < width; lx += 250) {
      bg.fillStyle(0xccddff, 0.03);
      bg.fillCircle(lx, 30, 120);
    }
  }

  // Hospital background
  static drawHospital(scene, width, height) {
    const bg = scene.add.graphics();
    bg.fillGradientStyle(0x0a0a15, 0x0a0a15, 0x15101a, 0x15101a, 1);
    bg.fillRect(0, 0, width, height);

    // Hospital corridor walls
    bg.fillStyle(0x16161e, 1);
    bg.fillRect(0, height - 350, width, 350);

    // Corridor perspective lines
    const cx = width / 2;
    const vanishY = height * 0.35;
    const wallColor = 0x1a1a25;
    bg.fillStyle(wallColor, 1);
    // Left wall
    bg.beginPath();
    bg.moveTo(0, height);
    bg.lineTo(0, height - 350);
    bg.lineTo(cx - 60, vanishY);
    bg.lineTo(cx - 20, height);
    bg.closePath();
    bg.fillPath();
    // Right wall
    bg.beginPath();
    bg.moveTo(width, height);
    bg.lineTo(width, height - 350);
    bg.lineTo(cx + 60, vanishY);
    bg.lineTo(cx + 20, height);
    bg.closePath();
    bg.fillPath();

    // Floor
    bg.fillStyle(0x12121a, 1);
    bg.beginPath();
    bg.moveTo(0, height);
    bg.lineTo(cx - 20, height);
    bg.lineTo(cx - 60, vanishY);
    bg.lineTo(cx + 60, vanishY);
    bg.lineTo(cx + 20, height);
    bg.lineTo(width, height);
    bg.closePath();
    bg.fillPath();

    // Ceiling lights (broken)
    bg.fillStyle(0x88aacc, 0.05);
    bg.fillCircle(cx, vanishY + 40, 50);

    // Blood stains
    bg.fillStyle(0x660000, 0.15);
    bg.fillCircle(200, height - 100, 20);
    bg.fillCircle(550, height - 130, 15);
  }

  // Highway background
  static drawHighway(scene, width, height) {
    const bg = scene.add.graphics();

    // Night sky gradient
    bg.fillGradientStyle(0x0a0a18, 0x0a0a18, 0x1a1520, 0x1a1520, 1);
    bg.fillRect(0, 0, width, height);

    // Moon
    bg.fillStyle(0xddd8c4, 0.2);
    bg.fillCircle(650, 60, 28);
    bg.fillStyle(0x0a0a18, 1);
    bg.fillCircle(640, 55, 26);

    // Stars
    for (let i = 0; i < 60; i++) {
      bg.fillStyle(0xffffff, Math.random() * 0.4 + 0.1);
      bg.fillCircle(Math.random() * width, Math.random() * height * 0.35, Math.random() * 1.5 + 0.5);
    }

    // Distant mountains (layered)
    bg.fillStyle(0x0d0d18, 1);
    bg.beginPath();
    bg.moveTo(0, height - 160);
    bg.lineTo(80, height - 240);
    bg.lineTo(180, height - 190);
    bg.lineTo(300, height - 270);
    bg.lineTo(420, height - 210);
    bg.lineTo(550, height - 260);
    bg.lineTo(680, height - 220);
    bg.lineTo(800, height - 190);
    bg.lineTo(800, height - 160);
    bg.closePath();
    bg.fillPath();

    // Nearer hills
    bg.fillStyle(0x12121e, 1);
    bg.beginPath();
    bg.moveTo(0, height - 130);
    bg.lineTo(120, height - 180);
    bg.lineTo(250, height - 150);
    bg.lineTo(400, height - 195);
    bg.lineTo(550, height - 160);
    bg.lineTo(700, height - 185);
    bg.lineTo(800, height - 145);
    bg.lineTo(800, height - 130);
    bg.closePath();
    bg.fillPath();

    // Road surface
    bg.fillStyle(0x1e1e1c, 1);
    bg.beginPath();
    bg.moveTo(0, height);
    bg.lineTo(width, height);
    bg.lineTo(width * 0.65, height - 200);
    bg.lineTo(width * 0.35, height - 200);
    bg.closePath();
    bg.fillPath();

    // Road edge lines
    bg.lineStyle(2, 0x444430, 0.3);
    bg.lineBetween(width * 0.35, height - 200, 0, height);
    bg.lineBetween(width * 0.65, height - 200, width, height);

    // Road center dashed line
    for (let i = 0; i < 10; i++) {
      const t = i / 10;
      const y1 = height - 200 + t * 200;
      const y2 = y1 + 8;
      const x1 = width * 0.5 - t * 0.02 * width;
      const x2 = width * 0.5 - (t + 0.04) * 0.02 * width;
      bg.lineStyle(2, 0x555533, 0.35);
      bg.lineBetween(x1, y1, x2, y2);
    }

    // Guardrail posts (left side)
    for (let i = 0; i < 5; i++) {
      const t = i / 5;
      const x = width * 0.32 - t * 0.05 * width;
      const y = height - 180 + t * 180;
      bg.fillStyle(0x2a2a28, 0.6);
      bg.fillRect(x, y - 20, 3, 20);
    }

    // Abandoned cars (more detailed silhouettes)
    // Car 1 - sedan on the right
    bg.fillStyle(0x161616, 0.8);
    bg.fillRect(150, height - 75, 65, 22);
    bg.fillRect(160, height - 90, 45, 18);
    bg.fillStyle(0x111111, 0.6);
    bg.fillCircle(160, height - 55, 8);
    bg.fillCircle(205, height - 55, 8);

    // Car 2 - van on the left
    bg.fillStyle(0x141414, 0.7);
    bg.fillRect(480, height - 95, 70, 30);
    bg.fillRect(490, height - 110, 50, 18);
    bg.fillStyle(0x111111, 0.6);
    bg.fillCircle(495, height - 65, 9);
    bg.fillCircle(540, height - 65, 9);

    // Car 3 - flipped car (far right)
    bg.fillStyle(0x131313, 0.5);
    bg.fillRect(650, height - 60, 55, 18);
    bg.fillRect(645, height - 50, 65, 12);

    // Smoke wisps from car 2
    bg.fillStyle(0x222222, 0.15);
    bg.fillCircle(510, height - 125, 12);
    bg.fillCircle(520, height - 140, 8);
    bg.fillCircle(505, height - 155, 6);

    // Highway sign (right side)
    bg.fillStyle(0x1a1a2a, 0.7);
    bg.fillRect(700, height - 180, 4, 60);
    bg.fillStyle(0x1a2a1a, 0.6);
    bg.fillRect(680, height - 195, 50, 20);
  }

  // Safe zone / military background
  static drawSafeZone(scene, width, height) {
    const bg = scene.add.graphics();

    // Night sky
    bg.fillGradientStyle(0x080c12, 0x080c12, 0x0f1a18, 0x0f1a18, 1);
    bg.fillRect(0, 0, width, height);

    // Stars
    for (let i = 0; i < 30; i++) {
      bg.fillStyle(0xffffff, Math.random() * 0.25 + 0.05);
      bg.fillCircle(Math.random() * width, Math.random() * height * 0.3, Math.random() * 1.2 + 0.3);
    }

    // Searchlights (sweeping beams)
    bg.fillStyle(0x88aa66, 0.03);
    bg.beginPath();
    bg.moveTo(100, 0);
    bg.lineTo(30, height);
    bg.lineTo(170, height);
    bg.closePath();
    bg.fillPath();
    bg.fillStyle(0x88aa66, 0.03);
    bg.beginPath();
    bg.moveTo(700, 0);
    bg.lineTo(630, height);
    bg.lineTo(770, height);
    bg.closePath();
    bg.fillPath();

    // Main wall
    bg.fillStyle(0x1a2a1a, 1);
    bg.fillRect(0, height - 250, width, 250);

    // Wall texture lines
    bg.lineStyle(1, 0x223322, 0.3);
    for (let wy = height - 240; wy < height; wy += 30) {
      bg.lineBetween(0, wy, width, wy);
    }
    for (let wx = 0; wx < width; wx += 50) {
      bg.lineBetween(wx, height - 250, wx, height);
    }

    // Wall top battlements
    bg.fillStyle(0x223322, 1);
    bg.fillRect(0, height - 260, width, 15);
    for (let bx = 10; bx < width; bx += 40) {
      bg.fillStyle(0x253525, 1);
      bg.fillRect(bx, height - 278, 20, 20);
    }

    // Watchtower (center)
    bg.fillStyle(0x1a2a1a, 1);
    bg.fillRect(340, height - 370, 120, 120);
    // Tower roof
    bg.fillStyle(0x253525, 1);
    bg.fillRect(330, height - 380, 140, 15);
    // Tower window
    bg.fillStyle(0x334433, 0.6);
    bg.fillRect(380, height - 340, 30, 20);
    bg.fillStyle(0xffcc44, 0.15);
    bg.fillRect(382, height - 338, 26, 16);
    // Tower spotlight
    bg.fillStyle(0xffcc44, 0.08);
    bg.fillCircle(395, height - 350, 15);

    // Gate (center)
    bg.fillStyle(0x0f1a0f, 1);
    bg.fillRect(350, height - 180, 100, 180);
    bg.fillStyle(0x1a2a1a, 1);
    bg.fillRect(345, height - 185, 110, 10);
    // Gate bars
    bg.lineStyle(2, 0x2a3a2a, 0.5);
    for (let gx = 360; gx < 445; gx += 12) {
      bg.lineBetween(gx, height - 175, gx, height);
    }

    // Barrels and crates (left)
    bg.fillStyle(0x2a2018, 0.7);
    bg.fillRect(80, height - 55, 25, 25);
    bg.fillRect(110, height - 50, 20, 20);
    bg.fillStyle(0x222018, 0.6);
    bg.fillRect(70, height - 40, 30, 15);

    // Sandbag wall (right)
    bg.fillStyle(0x2a2820, 0.7);
    for (let si = 0; si < 4; si++) {
      bg.fillRect(600 + si * 22, height - 50, 20, 12);
      bg.fillRect(605 + si * 22, height - 38, 18, 12);
    }

    // Ground
    bg.fillStyle(0x121a12, 1);
    bg.fillRect(0, height - 40, width, 40);
    bg.lineStyle(1, 0x1a2a1a, 0.3);
    bg.lineBetween(0, height - 40, width, height - 40);

    // Distant buildings behind wall (visible above wall top)
    bg.fillStyle(0x0f1a0f, 0.5);
    bg.fillRect(50, height - 300, 60, 45);
    bg.fillRect(180, height - 290, 45, 35);
    bg.fillRect(550, height - 310, 70, 55);
    bg.fillRect(680, height - 285, 50, 30);
  }

  // Mountain path background
  static drawMountain(scene, width, height) {
    const bg = scene.add.graphics();
    bg.fillGradientStyle(0x0f1518, 0x0f1518, 0x1a2020, 0x1a2020, 1);
    bg.fillRect(0, 0, width, height);

    // Moon
    bg.fillStyle(0xddd8c4, 0.25);
    bg.fillCircle(650, 70, 25);

    // Mountains
    bg.fillStyle(0x141820, 1);
    bg.beginPath();
    bg.moveTo(0, height - 120);
    bg.lineTo(150, height - 280);
    bg.lineTo(300, height - 180);
    bg.lineTo(450, height - 320);
    bg.lineTo(600, height - 200);
    bg.lineTo(750, height - 260);
    bg.lineTo(800, height - 180);
    bg.lineTo(800, height - 120);
    bg.closePath();
    bg.fillPath();

    // Trees
    for (let tx = 50; tx < width; tx += 80 + Math.random() * 60) {
      const th = 40 + Math.random() * 40;
      bg.fillStyle(0x0a1510, 0.8);
      bg.beginPath();
      bg.moveTo(tx, height - 120 - th);
      bg.lineTo(tx - 15, height - 120);
      bg.lineTo(tx + 15, height - 120);
      bg.closePath();
      bg.fillPath();
    }

    // Path
    bg.fillStyle(0x1a1a18, 0.6);
    bg.beginPath();
    bg.moveTo(0, height);
    bg.lineTo(width, height);
    bg.lineTo(width * 0.6, height - 100);
    bg.lineTo(width * 0.4, height - 100);
    bg.closePath();
    bg.fillPath();
  }

  // Find texture key, trying PNG then JPG
  static findTexture(scene, baseKey) {
    if (scene.textures.exists(`${baseKey}_png`)) return `${baseKey}_png`;
    if (scene.textures.exists(`${baseKey}_jpg`)) return `${baseKey}_jpg`;
    if (scene.textures.exists(baseKey)) return baseKey;
    return null;
  }

  // Draw a loaded background image, stretched to fill the scene
  // Also adds a corner gradient to hide watermarks
  static drawImage(scene, imageKey, width, height) {
    const img = scene.add.image(width / 2, height / 2, imageKey);
    img.setDisplaySize(width, height);
    img.setDepth(-1);

    // Bottom-right watermark cover (dark gradient)
    const cover = scene.add.graphics();
    cover.setDepth(0);
    // Solid dark corner
    cover.fillGradientStyle(0x0a0a0a, 0x0a0a0a, 0x0a0a0a, 0x0a0a0a, 1);
    cover.fillRect(width - 120, height - 50, 120, 50);
    // Gradient fade
    cover.fillGradientStyle(0x0a0a0a, 0x0a0a0a00, 0x0a0a0a, 0x0a0a0a00, 1);
    cover.fillRect(width - 200, height - 50, 80, 50);
    cover.fillGradientStyle(0x0a0a0a00, 0x0a0a0a, 0x0a0a0a00, 0x0a0a0a, 1);
    cover.fillRect(width - 120, height - 100, 120, 50);

    return img;
  }

  // Get background draw function by scene name
  // If a custom image is loaded, use that; otherwise use procedural
  static getBySceneName(sceneName) {
    const proceduralMap = {
      apartment: SceneBackgrounds.drawApartment,
      gas_station: SceneBackgrounds.drawGasStation,
      supermarket: SceneBackgrounds.drawSupermarket,
      hospital: SceneBackgrounds.drawHospital,
      highway: SceneBackgrounds.drawHighway,
      safe_zone: SceneBackgrounds.drawSafeZone,
      mountain: SceneBackgrounds.drawMountain,
    };

    const procedural = proceduralMap[sceneName] || SceneBackgrounds.drawNightSky;

    return function(scene, width, height) {
      const key = SceneBackgrounds.findTexture(scene, `bg_${sceneName}`);
      if (key) {
        SceneBackgrounds.drawImage(scene, key, width, height);
      } else {
        procedural(scene, width, height);
      }
    };
  }
}
