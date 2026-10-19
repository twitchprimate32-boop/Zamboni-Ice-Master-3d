/**
 * RinkTextureManager
 * Manages two high-fidelity layers for maximum visual clarity:
 * 1. Base Pristine Ice: A deep, crystal-clear, mirror-gloss hockey rink with regulation NHL markings.
 * 2. Snow & Frost Alpha Overlay: An alpha texture layer applied over the entirety of the rink.
 *    As the Zamboni drives over it with the conditioner down, it erases the frosted snow layer,
 *    leaving a razor-sharp, gleaming pristine ice sheet in its wake!
 */

import * as THREE from 'three';

export interface RinkDimensions {
  length: number; // World units along X (70m)
  width: number;  // World units along Z (30m)
  cornerRad: number; // Corner radius (7.5m)
}

export class RinkTextureManager {
  public rinkDim: RinkDimensions = {
    length: 70,
    width: 30,
    cornerRad: 7.5,
  };

  // 1. Base Pristine Ice Canvas & Texture
  private baseCanvas: HTMLCanvasElement;
  private baseCtx: CanvasRenderingContext2D;
  public baseIceTexture: THREE.CanvasTexture;
  public pristineIceMaterial: THREE.MeshPhysicalMaterial;

  // 2. Snow / Frost Alpha Overlay Canvas & Texture
  private snowCanvas: HTMLCanvasElement;
  private snowCtx: CanvasRenderingContext2D;
  public snowAlphaTexture: THREE.CanvasTexture;
  public snowOverlayMaterial: THREE.MeshStandardMaterial;

  // Cleaning progress grid (140 x 60 grid for fast O(1) coverage calculation)
  private gridWidth = 140;
  private gridHeight = 60;
  private dirtyGrid: Uint8Array; // 1 = dirty snow, 0 = cleaned pristine, 2 = outside rink
  private totalCleanableCells = 0;
  private dirtyCellsCount = 0;

  // High-contrast vision toggle (for highlighting missed patches)
  public highlightMode = false;

  // Canvas dimensions
  private readonly texWidth = 1024;
  private readonly texHeight = 512;

  constructor() {
    // 1. Setup Base Pristine Ice Canvas
    this.baseCanvas = document.createElement('canvas');
    this.baseCanvas.width = this.texWidth;
    this.baseCanvas.height = this.texHeight;
    this.baseCtx = this.baseCanvas.getContext('2d')!;

    this.baseIceTexture = new THREE.CanvasTexture(this.baseCanvas);
    this.baseIceTexture.colorSpace = THREE.SRGBColorSpace;
    this.baseIceTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.baseIceTexture.wrapT = THREE.ClampToEdgeWrapping;

    // Pristine Ice: Ultra-glossy, mirror reflections, sharp clearcoat
    this.pristineIceMaterial = new THREE.MeshPhysicalMaterial({
      map: this.baseIceTexture,
      roughness: 0.05,
      metalness: 0.08,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      reflectivity: 0.95,
      ior: 1.31,
    });

    // 2. Setup Snow / Frost Alpha Overlay Canvas
    this.snowCanvas = document.createElement('canvas');
    this.snowCanvas.width = this.texWidth;
    this.snowCanvas.height = this.texHeight;
    this.snowCtx = this.snowCanvas.getContext('2d')!;

    this.snowAlphaTexture = new THREE.CanvasTexture(this.snowCanvas);
    this.snowAlphaTexture.colorSpace = THREE.SRGBColorSpace;
    this.snowAlphaTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.snowAlphaTexture.wrapT = THREE.ClampToEdgeWrapping;

    // Snow Overlay Material: Frosted, matte, non-reflective, transparent alpha mask
    this.snowOverlayMaterial = new THREE.MeshStandardMaterial({
      map: this.snowAlphaTexture,
      transparent: true,
      opacity: 1.0,
      roughness: 0.92,
      metalness: 0.0,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    this.dirtyGrid = new Uint8Array(this.gridWidth * this.gridHeight);

    // Render base pristine markings and initial snow blanket
    this.renderBasePristineRink();
    this.resetScratches(0.85);
  }

  /**
   * Procedural rendering of regulation NHL hockey markings on pristine crystal ice
   */
  private renderBasePristineRink() {
    const ctx = this.baseCtx;
    const w = this.texWidth;
    const h = this.texHeight;

    // Deep cold cyan crystal gradient for pristine ice
    const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 60, w / 2, h / 2, w * 0.58);
    bgGrad.addColorStop(0, '#f8fcff');
    bgGrad.addColorStop(0.5, '#e9f5fd');
    bgGrad.addColorStop(1, '#d0e8f8');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Subtle crystalline refraction noise
    const idata = ctx.getImageData(0, 0, w, h);
    const data = idata.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 6;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise + 1));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise + 3));
    }
    ctx.putImageData(idata, 0, 0);

    // Coordinate conversions: world (-35..35, -15..15) -> canvas (0..w, 0..h)
    const toCanvasX = (wx: number) => ((wx + this.rinkDim.length / 2) / this.rinkDim.length) * w;
    const toCanvasY = (wz: number) => ((wz + this.rinkDim.width / 2) / this.rinkDim.width) * h;

    ctx.save();

    // 1. Center Red Line with alternating diamonds/dashes
    const cx = toCanvasX(0);
    ctx.strokeStyle = '#c9182b';
    ctx.lineWidth = 7;
    ctx.setLineDash([14, 10]);
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, h);
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Blue Lines (X = ±9.5m from center)
    const blueLineX1 = toCanvasX(-9.5);
    const blueLineX2 = toCanvasX(9.5);
    ctx.strokeStyle = '#004fc4';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(blueLineX1, 0);
    ctx.lineTo(blueLineX1, h);
    ctx.moveTo(blueLineX2, 0);
    ctx.lineTo(blueLineX2, h);
    ctx.stroke();

    // 3. Goal Lines (thin red, near the ends, X = ±30m)
    const goalLine1 = toCanvasX(-30);
    const goalLine2 = toCanvasX(30);
    ctx.strokeStyle = '#d62235';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(goalLine1, 0);
    ctx.lineTo(goalLine1, h);
    ctx.moveTo(goalLine2, 0);
    ctx.lineTo(goalLine2, h);
    ctx.stroke();

    // 4. Center Ice Circle (radius 4.5m) & Center Spot
    const cy = toCanvasY(0);
    const circleRad = (4.5 / this.rinkDim.width) * h;

    ctx.strokeStyle = '#004fc4';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx, cy, circleRad, 0, Math.PI * 2);
    ctx.stroke();

    // Center Spot
    ctx.fillStyle = '#004fc4';
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.fill();

    // Team Logo at Center Ice
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = 'rgba(0, 70, 150, 0.28)';
    ctx.beginPath();
    ctx.arc(0, 0, circleRad * 0.74, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(200, 20, 40, 0.75)';
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚡ YETIS ⚡', 0, 0);
    ctx.restore();

    // 5. Four Faceoff Circles (two in each zone: X = ±20.5m, Z = ±7m)
    const faceoffRad = (4.5 / this.rinkDim.width) * h;
    const faceoffXs = [-20.5, 20.5];
    const faceoffZs = [-7, 7];

    faceoffXs.forEach((fx) => {
      faceoffZs.forEach((fz) => {
        const px = toCanvasX(fx);
        const py = toCanvasY(fz);

        // Red outer ring
        ctx.strokeStyle = '#d62235';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(px, py, faceoffRad, 0, Math.PI * 2);
        ctx.stroke();

        // Red center dot
        ctx.fillStyle = '#d62235';
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fill();

        // Referee hash marks on faceoff circle
        ctx.strokeStyle = '#d62235';
        ctx.lineWidth = 3;
        const markOffset = faceoffRad * 0.7;
        ctx.beginPath();
        ctx.moveTo(px - markOffset, py - 9);
        ctx.lineTo(px - markOffset, py + 9);
        ctx.moveTo(px + markOffset, py - 9);
        ctx.lineTo(px + markOffset, py + 9);
        ctx.stroke();
      });
    });

    // 6. Goal Creases (light blue semi-circle bordered in red at both goals)
    const creaseRad = (2.4 / this.rinkDim.width) * h;
    [goalLine1, goalLine2].forEach((gx, idx) => {
      ctx.fillStyle = 'rgba(100, 190, 245, 0.55)';
      ctx.strokeStyle = '#d62235';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      if (idx === 0) {
        ctx.arc(gx, cy, creaseRad, -Math.PI / 2, Math.PI / 2, false);
      } else {
        ctx.arc(gx, cy, creaseRad, Math.PI / 2, (3 * Math.PI) / 2, false);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });

    // 7. Trapezoïds behind goal lines
    ctx.strokeStyle = '#d62235';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(goalLine1, cy - 25);
    ctx.lineTo(toCanvasX(-34.5), cy - 40);
    ctx.moveTo(goalLine1, cy + 25);
    ctx.lineTo(toCanvasX(-34.5), cy + 40);
    ctx.moveTo(goalLine2, cy - 25);
    ctx.lineTo(toCanvasX(34.5), cy - 40);
    ctx.moveTo(goalLine2, cy + 25);
    ctx.lineTo(toCanvasX(34.5), cy + 40);
    ctx.stroke();

    ctx.restore();
    this.baseIceTexture.needsUpdate = true;
  }

  /**
   * Resets the entire snow/frost alpha overlay.
   * Creates a distinct, cloudy, matte snow texture covering the rink.
   */
  public resetScratches(dirtiness = 0.85) {
    const ctx = this.snowCtx;
    const w = this.texWidth;
    const h = this.texHeight;

    ctx.clearRect(0, 0, w, h);

    // 1. Base cloudy snow blanket across the ice
    // High opacity (0.86) to noticeably frost over the lines underneath!
    const snowAlpha = Math.min(0.92, 0.72 + dirtiness * 0.18);
    ctx.fillStyle = `rgba(228, 240, 250, ${snowAlpha})`;
    ctx.fillRect(0, 0, w, h);

    // 2. Micro-frost grain noise
    const idata = ctx.getImageData(0, 0, w, h);
    const data = idata.data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0) {
        const noise = (Math.random() - 0.5) * 16;
        data[i] = Math.min(255, Math.max(200, data[i] + noise));
        data[i + 1] = Math.min(255, Math.max(200, data[i + 1] + noise));
        data[i + 2] = Math.min(255, Math.max(215, data[i + 2] + noise));
      }
    }
    ctx.putImageData(idata, 0, 0);

    ctx.save();

    // 3. Realistic curved skate blade ruts and ice rut cuts (darker gouges & white edges)
    const numScratches = Math.floor(550 * dirtiness);
    for (let i = 0; i < numScratches; i++) {
      const sx = Math.random() * (w - 40) + 20;
      const sy = Math.random() * (h - 30) + 15;
      const len = 18 + Math.random() * 55;
      const angle = (Math.random() - 0.5) * Math.PI * 1.8;
      const curve = (Math.random() - 0.5) * 25;

      // Darker skate rut center
      ctx.strokeStyle = 'rgba(165, 185, 205, 0.85)';
      ctx.lineWidth = 1.5 + Math.random() * 2;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(
        sx + Math.cos(angle) * (len * 0.5) + curve,
        sy + Math.sin(angle) * (len * 0.5) - curve,
        sx + Math.cos(angle) * len,
        sy + Math.sin(angle) * len
      );
      ctx.stroke();

      // White shaved snow ridge adjacent to rut
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(sx + 1, sy + 1);
      ctx.quadraticCurveTo(
        sx + Math.cos(angle) * (len * 0.5) + curve + 1,
        sy + Math.sin(angle) * (len * 0.5) - curve + 1,
        sx + Math.cos(angle) * len + 1,
        sy + Math.sin(angle) * len + 1
      );
      ctx.stroke();
    }

    // 4. Heavy skate stopping snow gouges (dense mounds of white shaved ice snow)
    const numGouges = Math.floor(110 * dirtiness);
    for (let i = 0; i < numGouges; i++) {
      const gx = Math.random() * (w - 80) + 40;
      const gy = Math.random() * (h - 50) + 25;
      const rad = 20 + Math.random() * 22;

      const grad = ctx.createRadialGradient(gx, gy, 2, gx, gy, rad);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
      grad.addColorStop(0.5, 'rgba(240, 248, 255, 0.85)');
      grad.addColorStop(1, 'rgba(230, 242, 252, 0.0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(gx, gy, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. Puck rubber scuff friction marks
    const numPucks = Math.floor(50 * dirtiness);
    for (let i = 0; i < numPucks; i++) {
      const px = Math.random() * (w - 60) + 30;
      const py = Math.random() * (h - 40) + 20;
      ctx.strokeStyle = 'rgba(40, 48, 60, 0.45)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + (Math.random() - 0.5) * 30, py + (Math.random() - 0.5) * 30);
      ctx.stroke();
    }

    ctx.restore();

    // Rebuild coverage grid
    this.totalCleanableCells = 0;
    this.dirtyCellsCount = 0;
    const halfL = this.rinkDim.length / 2;
    const halfW = this.rinkDim.width / 2;
    const rad = this.rinkDim.cornerRad;

    for (let gy = 0; gy < this.gridHeight; gy++) {
      for (let gx = 0; gx < this.gridWidth; gx++) {
        const wx = (gx / this.gridWidth) * this.rinkDim.length - halfL;
        const wz = (gy / this.gridHeight) * this.rinkDim.width - halfW;

        if (this.isPointInsideRink(wx, wz, halfL, halfW, rad)) {
          this.totalCleanableCells++;
          this.dirtyGrid[gy * this.gridWidth + gx] = 1;
          this.dirtyCellsCount++;
        } else {
          this.dirtyGrid[gy * this.gridWidth + gx] = 2; // Outside rink boundary
        }
      }
    }

    this.snowAlphaTexture.needsUpdate = true;
  }

  /**
   * Check if a 2D world coordinate sits inside the rounded rink boundaries
   */
  public isPointInsideRink(
    x: number,
    z: number,
    halfL = this.rinkDim.length / 2,
    halfW = this.rinkDim.width / 2,
    rad = this.rinkDim.cornerRad
  ): boolean {
    const absX = Math.abs(x);
    const absZ = Math.abs(z);

    if (absX > halfL || absZ > halfW) return false;

    const cornerStartX = halfL - rad;
    const cornerStartZ = halfW - rad;

    if (absX > cornerStartX && absZ > cornerStartZ) {
      const dx = absX - cornerStartX;
      const dz = absZ - cornerStartZ;
      return dx * dx + dz * dz <= rad * rad;
    }

    return true;
  }

  /**
   * Called each frame when the Zamboni's conditioner blade is down and moving.
   * Erases the snow/frost alpha texture cleanly to 0, exposing the pristine mirror ice underneath!
   */
  public cleanAt(
    worldX: number,
    worldZ: number,
    yaw: number,
    widthMeters = 3.8,
    lengthMeters = 1.4
  ): { newlyCleaned: number } {
    const halfL = this.rinkDim.length / 2;
    const halfW = this.rinkDim.width / 2;

    const toCanvasX = (wx: number) => ((wx + halfL) / this.rinkDim.length) * this.texWidth;
    const toCanvasY = (wz: number) => ((wz + halfW) / this.rinkDim.width) * this.texHeight;

    const cx = toCanvasX(worldX);
    const cy = toCanvasY(worldZ);

    const canvasWidth = (widthMeters / this.rinkDim.length) * this.texWidth;
    const canvasLength = (lengthMeters / this.rinkDim.width) * this.texHeight;

    // Erase the snow/frost overlay with destination-out!
    const sCtx = this.snowCtx;
    sCtx.save();
    sCtx.globalCompositeOperation = 'destination-out';
    sCtx.translate(cx, cy);
    sCtx.rotate(yaw);

    // Crisp cutting brush with slightly softened squeegee edge
    sCtx.fillStyle = 'rgba(0, 0, 0, 1.0)';
    sCtx.beginPath();
    sCtx.roundRect(-canvasLength / 2, -canvasWidth / 2, canvasLength, canvasWidth, 4);
    sCtx.fill();
    sCtx.restore();

    this.snowAlphaTexture.needsUpdate = true;

    // Update dirty grid
    let newlyCleaned = 0;
    const checkRadiusX = Math.ceil((widthMeters / 2 / this.rinkDim.length) * this.gridWidth);
    const checkRadiusZ = Math.ceil((widthMeters / 2 / this.rinkDim.width) * this.gridHeight);

    const centerGx = Math.floor(((worldX + halfL) / this.rinkDim.length) * this.gridWidth);
    const centerGz = Math.floor(((worldZ + halfW) / this.rinkDim.width) * this.gridHeight);

    const minGx = Math.max(0, centerGx - checkRadiusX);
    const maxGx = Math.min(this.gridWidth - 1, centerGx + checkRadiusX);
    const minGz = Math.max(0, centerGz - checkRadiusZ);
    const maxGz = Math.min(this.gridHeight - 1, centerGz + checkRadiusZ);

    const radSq = (widthMeters / 2) * (widthMeters / 2);

    for (let gz = minGz; gz <= maxGz; gz++) {
      for (let gx = minGx; gx <= maxGx; gx++) {
        const idx = gz * this.gridWidth + gx;
        if (this.dirtyGrid[idx] === 1) {
          const cellWx = (gx / this.gridWidth) * this.rinkDim.length - halfL;
          const cellWz = (gz / this.gridHeight) * this.rinkDim.width - halfW;
          const distSq = (cellWx - worldX) * (cellWx - worldX) + (cellWz - worldZ) * (cellWz - worldZ);

          if (distSq <= radSq) {
            this.dirtyGrid[idx] = 0;
            this.dirtyCellsCount--;
            newlyCleaned++;
          }
        }
      }
    }

    return { newlyCleaned };
  }

  /**
   * Returns current cleaning percentage (0.0 to 100.0)
   */
  public getCleanPercentage(): number {
    if (this.totalCleanableCells === 0) return 100;
    const cleaned = this.totalCleanableCells - this.dirtyCellsCount;
    return Math.min(100, Math.max(0, (cleaned / this.totalCleanableCells) * 100));
  }

  /**
   * For the mini-map HUD: provides the grid state
   */
  public getDirtyGrid(): { grid: Uint8Array; width: number; height: number } {
    return {
      grid: this.dirtyGrid,
      width: this.gridWidth,
      height: this.gridHeight,
    };
  }

  /**
   * Toggle highlight mode (tints uncut snow in electric cyan/blue for high visibility)
   */
  public setHighlightMode(enabled: boolean) {
    this.highlightMode = enabled;
    if (enabled) {
      // Radiant electric cyan tint with neon blue emissive glow
      this.snowOverlayMaterial.color.setHex(0x00f0ff);
      this.snowOverlayMaterial.emissive.setHex(0x0055aa);
      this.snowOverlayMaterial.emissiveIntensity = 0.85;
    } else {
      // Natural frosty white snow
      this.snowOverlayMaterial.color.setHex(0xffffff);
      this.snowOverlayMaterial.emissive.setHex(0x000000);
      this.snowOverlayMaterial.emissiveIntensity = 0.0;
    }
  }

  public dispose() {
    this.baseIceTexture.dispose();
    this.snowAlphaTexture.dispose();
    this.pristineIceMaterial.dispose();
    this.snowOverlayMaterial.dispose();
  }
}
