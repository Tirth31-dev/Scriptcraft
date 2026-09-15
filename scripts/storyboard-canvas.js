/**
 * ScriptCraft - Storyboard Canvas & Cinematic Sketch Renderer
 * Procedurally generates authentic 16:9 cinematography storyboard sketch drawings
 * with camera angles, perspective, figure silhouettes, lighting, and film metadata.
 */

class StoryboardCanvasRenderer {
  constructor() {
    this.width = 640;
    this.height = 360; // 16:9 cinematic aspect ratio
  }

  /**
   * Render a cinematic storyboard sketch onto an HTML5 Canvas
   * @param {Object} shotInfo - { type, angle, sceneHeading, actionText, character, mood }
   * @returns {string} Data URL of the rendered 16:9 image
   */
  renderShot(shotInfo = {}) {
    const canvas = document.createElement('canvas');
    canvas.width = this.width;
    canvas.height = this.height;
    const ctx = canvas.getContext('2d');

    const type = shotInfo.type || 'WIDE SHOT';
    const angle = shotInfo.angle || 'EYE LEVEL';
    const mood = shotInfo.mood || 'dramatic';
    const heading = shotInfo.sceneHeading || 'EXT. LOCATION - NIGHT';
    const action = shotInfo.actionText || 'Action beat in the scene.';

    // 1. Cinematic Background & Atmosphere
    this.drawBackground(ctx, mood, heading);

    // 2. Perspective & Horizon Lines
    this.drawPerspectiveGrid(ctx, angle, type);

    // 3. Compositional Elements based on Shot Type
    this.drawShotComposition(ctx, type, angle, mood, action);

    // 4. Cinematic Vignette & Grain
    this.drawVignette(ctx);

    // 5. Film Storyboard Overlays (Camera Frame, Crosshair, Aspect Ratio)
    this.drawCameraOverlay(ctx, shotInfo);

    return canvas.toDataURL('image/png');
  }

  /**
   * Background wash and lighting
   */
  drawBackground(ctx, mood, heading) {
    const isNight = heading.includes('NIGHT') || mood === 'noir';
    const isExt = heading.includes('EXT.');

    const grad = ctx.createLinearGradient(0, 0, 0, this.height);
    if (isNight) {
      grad.addColorStop(0, '#0a0f1d');
      grad.addColorStop(0.5, '#141d33');
      grad.addColorStop(1, '#080c16');
    } else if (isExt) {
      grad.addColorStop(0, '#788da6');
      grad.addColorStop(0.6, '#9cb2c9');
      grad.addColorStop(1, '#c5d5e4');
    } else {
      // Interior warm / moody
      grad.addColorStop(0, '#1c1e24');
      grad.addColorStop(0.7, '#2a2d36');
      grad.addColorStop(1, '#15171c');
    }

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  /**
   * Draw subtle perspective grid guidelines standard in storyboard art
   */
  drawPerspectiveGrid(ctx, angle, type) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;

    let horizonY = this.height * 0.55;
    let vpX = this.width * 0.5;

    if (angle === 'LOW ANGLE') horizonY = this.height * 0.75;
    if (angle === 'HIGH ANGLE') horizonY = this.height * 0.35;
    if (angle === 'DUTCH ANGLE') {
      ctx.translate(this.width / 2, this.height / 2);
      ctx.rotate(-0.1);
      ctx.translate(-this.width / 2, -this.height / 2);
    }

    // Horizon line
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    ctx.lineTo(this.width, horizonY);
    ctx.stroke();

    // Vanishing perspective rays
    for (let i = 0; i <= this.width; i += 80) {
      ctx.beginPath();
      ctx.moveTo(vpX, horizonY);
      ctx.lineTo(i, this.height);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Draw silhouettes, figures, and dramatic lighting based on shot type
   */
  drawShotComposition(ctx, type, angle, mood, action) {
    ctx.save();

    if (type.includes('WIDE') || type.includes('ESTABLISHING')) {
      this.drawWideComposition(ctx, action);
    } else if (type.includes('CLOSE') || type.includes('EXTREME CLOSE')) {
      this.drawCloseUpComposition(ctx, action);
    } else if (type.includes('OVER-THE-SHOULDER') || type.includes('OTS')) {
      this.drawOTSComposition(ctx, action);
    } else if (type.includes('DUTCH') || angle === 'DUTCH ANGLE') {
      this.drawDutchComposition(ctx, action);
    } else {
      // Medium / Two-Shot default
      this.drawMediumComposition(ctx, action);
    }

    ctx.restore();
  }

  /**
   * Wide Shot: Architecture / Skyline and small figure silhouette
   */
  drawWideComposition(ctx, action) {
    const horizon = this.height * 0.6;

    // Distant architecture / environment silhouettes
    ctx.fillStyle = '#0e1526';
    ctx.fillRect(40, horizon - 90, 60, 90);
    ctx.fillRect(110, horizon - 130, 80, 130);
    ctx.fillRect(200, horizon - 70, 70, 70);
    ctx.fillRect(380, horizon - 110, 90, 110);
    ctx.fillRect(480, horizon - 80, 80, 80);

    // Architectural lights / windows
    ctx.fillStyle = 'rgba(255, 230, 150, 0.25)';
    for (let x = 120; x < 180; x += 14) {
      for (let y = horizon - 120; y < horizon - 20; y += 18) {
        if (Math.random() > 0.4) ctx.fillRect(x, y, 6, 8);
      }
    }

    // Floor / Ground plane
    ctx.fillStyle = '#060911';
    ctx.fillRect(0, horizon, this.width, this.height - horizon);

    // Figure silhouette in foreground/midground
    const figX = this.width * 0.48;
    const figY = horizon + 30;

    ctx.fillStyle = '#020408';
    // Head
    ctx.beginPath();
    ctx.arc(figX, figY - 45, 6, 0, Math.PI * 2);
    ctx.fill();
    // Coat / Body
    ctx.beginPath();
    ctx.moveTo(figX - 8, figY - 38);
    ctx.lineTo(figX + 8, figY - 38);
    ctx.lineTo(figX + 14, figY);
    ctx.lineTo(figX - 14, figY);
    ctx.closePath();
    ctx.fill();

    // Ground reflection / shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.ellipse(figX, figY + 2, 20, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Close-Up: Intense face silhouette with dramatic rim lighting
   */
  drawCloseUpComposition(ctx, action) {
    const centerX = this.width * 0.45;
    const centerY = this.height * 0.52;

    // Head silhouette
    ctx.fillStyle = '#0a0e1a';
    ctx.beginPath();
    ctx.ellipse(centerX, centerY - 20, 95, 125, 0, 0, Math.PI * 2);
    ctx.fill();

    // Neck & Shoulders
    ctx.beginPath();
    ctx.moveTo(centerX - 60, centerY + 80);
    ctx.lineTo(centerX - 120, this.height);
    ctx.lineTo(centerX + 160, this.height);
    ctx.lineTo(centerX + 60, centerY + 80);
    ctx.closePath();
    ctx.fill();

    // Dramatic Rim Light (Noir key light)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(centerX, centerY - 20, 95, Math.PI * 0.7, Math.PI * 1.35);
    ctx.stroke();

    // Eyeline indicator
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.3)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(centerX - 70, centerY - 30);
    ctx.lineTo(centerX + 70, centerY - 30);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  /**
   * Over-The-Shoulder (OTS): Foreground blurred shoulder, focused opposite subject
   */
  drawOTSComposition(ctx, action) {
    // Foreground silhouette (close to camera)
    ctx.fillStyle = '#020409';
    ctx.beginPath();
    ctx.arc(this.width * 0.18, this.height * 0.38, 55, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, this.height * 0.5);
    ctx.lineTo(this.width * 0.32, this.height * 0.6);
    ctx.lineTo(this.width * 0.32, this.height);
    ctx.lineTo(0, this.height);
    ctx.closePath();
    ctx.fill();

    // Focal subject across the space
    const targetX = this.width * 0.68;
    const targetY = this.height * 0.48;

    ctx.fillStyle = '#101726';
    ctx.beginPath();
    ctx.arc(targetX, targetY - 45, 22, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(targetX - 25, targetY - 20);
    ctx.lineTo(targetX + 25, targetY - 20);
    ctx.lineTo(targetX + 35, targetY + 80);
    ctx.lineTo(targetX - 35, targetY + 80);
    ctx.closePath();
    ctx.fill();

    // Cross-light / tension beam
    const lightBeam = ctx.createLinearGradient(0, 0, this.width, this.height);
    lightBeam.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
    lightBeam.addColorStop(0.7, 'rgba(99, 102, 241, 0.12)');
    lightBeam.addColorStop(1, 'transparent');
    ctx.fillStyle = lightBeam;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  /**
   * Medium Shot / Two Shot
   */
  drawMediumComposition(ctx, action) {
    const leftX = this.width * 0.35;
    const rightX = this.width * 0.65;
    const baseY = this.height * 0.55;

    // Left Character
    ctx.fillStyle = '#0d1322';
    ctx.beginPath();
    ctx.arc(leftX, baseY - 50, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(leftX - 30, baseY - 20, 60, 110);

    // Right Character
    ctx.fillStyle = '#080c16';
    ctx.beginPath();
    ctx.arc(rightX, baseY - 50, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(rightX - 30, baseY - 20, 60, 110);

    // Dramatic floor line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, baseY + 90);
    ctx.lineTo(this.width, baseY + 90);
    ctx.stroke();
  }

  /**
   * Dutch Angle Tension Shot
   */
  drawDutchComposition(ctx, action) {
    ctx.save();
    ctx.translate(this.width / 2, this.height / 2);
    ctx.rotate(-0.15); // Dutch tilt
    ctx.translate(-this.width / 2, -this.height / 2);

    ctx.fillStyle = '#0e1628';
    ctx.fillRect(100, 80, 440, 200);

    // Angled character
    ctx.fillStyle = '#03050a';
    ctx.beginPath();
    ctx.arc(320, 140, 45, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(260, 190, 120, 150);

    ctx.restore();
  }

  /**
   * Vignette
   */
  drawVignette(ctx) {
    const vig = ctx.createRadialGradient(
      this.width / 2, this.height / 2, this.width * 0.25,
      this.width / 2, this.height / 2, this.width * 0.6
    );
    vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vig.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  /**
   * Storyboard Camera Frame, Crosshairs & Metadata Overlays
   */
  drawCameraOverlay(ctx, shotInfo) {
    ctx.save();

    // 1. Frame Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(16, 16, this.width - 32, this.height - 32);

    // 2. Corner Focus Brackets
    const bLen = 14;
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2;

    // Top-Left
    ctx.beginPath();
    ctx.moveTo(24, 24 + bLen); ctx.lineTo(24, 24); ctx.lineTo(24 + bLen, 24);
    ctx.stroke();
    // Top-Right
    ctx.beginPath();
    ctx.moveTo(this.width - 24 - bLen, 24); ctx.lineTo(this.width - 24, 24); ctx.lineTo(this.width - 24, 24 + bLen);
    ctx.stroke();
    // Bottom-Left
    ctx.beginPath();
    ctx.moveTo(24, this.height - 24 - bLen); ctx.lineTo(24, this.height - 24); ctx.lineTo(24 + bLen, this.height - 24);
    ctx.stroke();
    // Bottom-Right
    ctx.beginPath();
    ctx.moveTo(this.width - 24 - bLen, this.height - 24); ctx.lineTo(this.width - 24, this.height - 24); ctx.lineTo(this.width - 24, this.height - 24 - bLen);
    ctx.stroke();

    // 3. Center Crosshair
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    const cx = this.width / 2;
    const cy = this.height / 2;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy); ctx.lineTo(cx + 8, cy);
    ctx.moveTo(cx, cy - 8); ctx.lineTo(cx, cy + 8);
    ctx.stroke();

    // 4. Metadata Badges (Top & Bottom bars)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(20, 20, 220, 24);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 11px Courier, monospace';
    const shotLabel = `${shotInfo.type || 'WIDE SHOT'} | ${shotInfo.angle || 'EYE LEVEL'}`;
    ctx.fillText(shotLabel, 28, 36);

    // Bottom Action / Scene text overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(20, this.height - 44, this.width - 40, 24);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
    const caption = shotInfo.actionText ? shotInfo.actionText.substring(0, 75) + (shotInfo.actionText.length > 75 ? '...' : '') : 'Cinematic Beat';
    ctx.fillText(caption, 28, this.height - 28);

    ctx.restore();
  }
}

if (typeof window !== 'undefined') {
  window.StoryboardCanvasRenderer = StoryboardCanvasRenderer;
}
