/**
 * ArenaModel
 * Procedural 3D Hockey Stadium:
 * - Regulation dasher boards with authentic curved corners, yellow kickplates, red cap rails
 * - Protective acrylic safety glass with steel stanchions
 * - 2 regulation hockey goal nets (red posts, white netting, white goal skirts)
 * - 4-sided giant hanging Jumbotron scoreboard with dynamic canvas screens
 * - Stadium seating tiers, arena rafters, and championship banners
 * - Zamboni garage tunnel / snow dump station with green beacon
 */

import * as THREE from 'three';
import { RinkDimensions } from './RinkTextureManager';

export class ArenaModel {
  public group: THREE.Group;
  public rinkDim: RinkDimensions;

  // Zamboni garage / snow dump zone (world coordinates)
  public snowDumpZone = {
    x: 0,
    z: -15.4, // Right at center ice dasher board gate
    radius: 3.5,
  };

  // Interactive Jumbotron screens
  private jumbotronCanvas: HTMLCanvasElement;
  private jumbotronCtx: CanvasRenderingContext2D;
  private jumbotronTexture: THREE.CanvasTexture;

  // Dump hatch indicator light
  public dumpStationLight!: THREE.PointLight;

  constructor(rinkDim: RinkDimensions) {
    this.rinkDim = rinkDim;
    this.group = new THREE.Group();

    // 1. Setup Jumbotron dynamic scoreboard canvas
    this.jumbotronCanvas = document.createElement('canvas');
    this.jumbotronCanvas.width = 512;
    this.jumbotronCanvas.height = 256;
    this.jumbotronCtx = this.jumbotronCanvas.getContext('2d')!;
    this.jumbotronTexture = new THREE.CanvasTexture(this.jumbotronCanvas);
    this.jumbotronTexture.colorSpace = THREE.SRGBColorSpace;

    // 2. Build Rink Dasher Boards with Rounded Corners
    this.buildDasherBoards();

    // 3. Build Hockey Goal Nets
    this.buildGoalNets();

    // 4. Build Stadium Seating Bowl & Arena Structure
    this.buildStadiumBowl();

    // 5. Build Hanging 4-Sided Jumbotron
    this.buildJumbotron();

    // 6. Build Zamboni Tunnel & Snow Dump Hatch
    this.buildZamboniTunnel();

    // 7. Build Player Benches & Stadium LED Ribbon
    this.buildPlayerBenchesAndLED();

    this.updateJumbotron(92.5, 75, 'PERIOD 2', 3, 2);
  }

  /**
   * Generates continuous curved dasher boards & glass using a custom path
   */
  private buildDasherBoards() {
    const halfL = this.rinkDim.length / 2;
    const halfW = this.rinkDim.width / 2;
    const rad = this.rinkDim.cornerRad;

    // Create 2D perimeter path (counter-clockwise)
    const points: THREE.Vector2[] = [];
    const segmentsPerCorner = 14;

    // Start at bottom center: (0, -halfW)
    points.push(new THREE.Vector2(0, -halfW));
    points.push(new THREE.Vector2(halfL - rad, -halfW));

    // Bottom-right corner arc (-halfW, +halfL)
    for (let i = 1; i <= segmentsPerCorner; i++) {
      const angle = -Math.PI / 2 + (Math.PI / 2) * (i / segmentsPerCorner);
      points.push(new THREE.Vector2(halfL - rad + Math.cos(angle) * rad, -halfW + rad + Math.sin(angle) * rad));
    }

    // Right side
    points.push(new THREE.Vector2(halfL, halfW - rad));

    // Top-right corner arc
    for (let i = 1; i <= segmentsPerCorner; i++) {
      const angle = 0 + (Math.PI / 2) * (i / segmentsPerCorner);
      points.push(new THREE.Vector2(halfL - rad + Math.cos(angle) * rad, halfW - rad + Math.sin(angle) * rad));
    }

    // Top side
    points.push(new THREE.Vector2(-halfL + rad, halfW));

    // Top-left corner arc
    for (let i = 1; i <= segmentsPerCorner; i++) {
      const angle = Math.PI / 2 + (Math.PI / 2) * (i / segmentsPerCorner);
      points.push(new THREE.Vector2(-halfL + rad + Math.cos(angle) * rad, halfW - rad + Math.sin(angle) * rad));
    }

    // Left side
    points.push(new THREE.Vector2(-halfL, -halfW + rad));

    // Bottom-left corner arc
    for (let i = 1; i <= segmentsPerCorner; i++) {
      const angle = Math.PI + (Math.PI / 2) * (i / segmentsPerCorner);
      points.push(new THREE.Vector2(-halfL + rad + Math.cos(angle) * rad, -halfW + rad + Math.sin(angle) * rad));
    }

    // Close loop back to bottom center
    points.push(new THREE.Vector2(0, -halfW));

    // Extrude Dasher Board Wall:
    // Bottom kickplate (yellow, 0 to 0.2m)
    // Board panel (white, 0.2m to 1.15m)
    // Cap rail (red, 1.15m to 1.25m)
    const boardWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xf5f5f5,
      roughness: 0.3,
      metalness: 0.05,
    });
    const yellowKickplateMat = new THREE.MeshStandardMaterial({
      color: 0xf2c00f, // NHL gold kickplate
      roughness: 0.4,
    });
    const redCapRailMat = new THREE.MeshStandardMaterial({
      color: 0xd32f2f, // NHL red rail
      roughness: 0.25,
    });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.9,
      roughness: 0.05,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    });

    const boardGroup = new THREE.Group();

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];

      const dx = p2.x - p1.x;
      const dz = p2.y - p1.y;
      const segLength = Math.hypot(dx, dz);
      const angle = Math.atan2(dz, dx);
      const midX = (p1.x + p2.x) / 2;
      const midZ = (p1.y + p2.y) / 2;

      // Skip a small section at center ice bottom for the Zamboni tunnel gate opening!
      const isZamboniGate = Math.abs(midX) < 2.0 && midZ < -halfW + 0.5;

      const segGroup = new THREE.Group();
      segGroup.position.set(midX, 0, midZ);
      segGroup.rotation.y = -angle;

      if (!isZamboniGate) {
        // Kickplate (0.2m high)
        const kickGeo = new THREE.BoxGeometry(segLength, 0.2, 0.1);
        const kick = new THREE.Mesh(kickGeo, yellowKickplateMat);
        kick.position.set(0, 0.1, 0);
        segGroup.add(kick);

        // White board (0.95m high)
        const boardGeo = new THREE.BoxGeometry(segLength, 0.95, 0.1);
        const board = new THREE.Mesh(boardGeo, boardWhiteMat);
        board.position.set(0, 0.675, 0);
        board.castShadow = true;
        board.receiveShadow = true;
        segGroup.add(board);

        // Red cap rail (0.1m high, slightly wider 0.14m)
        const railGeo = new THREE.BoxGeometry(segLength, 0.08, 0.14);
        const rail = new THREE.Mesh(railGeo, redCapRailMat);
        rail.position.set(0, 1.19, 0);
        segGroup.add(rail);

        // Acrylic Glass (1.8m high above rail, 2.4m behind the net goals!)
        const isGoalEnd = Math.abs(midX) > halfL - 10;
        const glassHeight = isGoalEnd ? 2.3 : 1.7;
        const glassGeo = new THREE.BoxGeometry(segLength, glassHeight, 0.03);
        const glass = new THREE.Mesh(glassGeo, glassMat);
        glass.position.set(0, 1.23 + glassHeight / 2, 0);
        segGroup.add(glass);
      }

      boardGroup.add(segGroup);
    }

    this.group.add(boardGroup);
  }

  /**
   * Build 2 regulation hockey goal nets with red tubular posts and mesh
   */
  private buildGoalNets() {
    const postMat = new THREE.MeshStandardMaterial({
      color: 0xd61828, // NHL red goal posts
      roughness: 0.2,
      metalness: 0.6,
    });
    const netMat = new THREE.MeshStandardMaterial({
      color: 0xefefef,
      roughness: 0.8,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
    });

    [-29.8, 29.8].forEach((goalX, idx) => {
      const netGroup = new THREE.Group();
      netGroup.position.set(goalX, 0, 0);
      // Left net faces right (+X), Right net faces left (-X)
      netGroup.rotation.y = idx === 0 ? Math.PI / 2 : -Math.PI / 2;

      // Posts: width 1.83m (6 ft), height 1.22m (4 ft)
      const postRadius = 0.04;
      const postGeo = new THREE.CylinderGeometry(postRadius, postRadius, 1.22, 10);

      // Left post
      const postL = new THREE.Mesh(postGeo, postMat);
      postL.position.set(-0.915, 0.61, 0);
      postL.castShadow = true;

      // Right post
      const postR = new THREE.Mesh(postGeo, postMat);
      postR.position.set(0.915, 0.61, 0);
      postR.castShadow = true;

      // Crossbar
      const crossbarGeo = new THREE.CylinderGeometry(postRadius, postRadius, 1.83, 10);
      crossbarGeo.rotateZ(Math.PI / 2);
      const crossbar = new THREE.Mesh(crossbarGeo, postMat);
      crossbar.position.set(0, 1.22, 0);

      // Base frame (depth 1.0m)
      const baseLGeo = new THREE.CylinderGeometry(postRadius, postRadius, 1.0, 8);
      baseLGeo.rotateX(Math.PI / 2);
      const baseL = new THREE.Mesh(baseLGeo, postMat);
      baseL.position.set(-0.915, postRadius, -0.5);

      const baseR = new THREE.Mesh(baseLGeo, postMat);
      baseR.position.set(0.915, postRadius, -0.5);

      // Net draped surface (wedge geometry)
      const netGeo = new THREE.BufferGeometry();
      // Vertices: TopL, TopR, BottomL, BottomR, BackL, BackR
      const vertices = new Float32Array([
        // Top slope
        -0.915, 1.22, 0,
        0.915, 1.22, 0,
        -0.85, 0.05, -0.95,

        0.915, 1.22, 0,
        0.85, 0.05, -0.95,
        -0.85, 0.05, -0.95,

        // Left side net
        -0.915, 0, 0,
        -0.915, 1.22, 0,
        -0.85, 0.05, -0.95,

        // Right side net
        0.915, 0, 0,
        0.85, 0.05, -0.95,
        0.915, 1.22, 0,
      ]);
      netGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      netGeo.computeVertexNormals();

      const netMesh = new THREE.Mesh(netGeo, netMat);

      netGroup.add(postL, postR, crossbar, baseL, baseR, netMesh);
      this.group.add(netGroup);
    });
  }

  /**
   * Builds spectator arena seating tiers, arena ceiling trusses, championship banners
   */
  private buildStadiumBowl() {
    const bowlGroup = new THREE.Group();

    // Seating tiered steps around perimeter
    const tierMat1 = new THREE.MeshStandardMaterial({ color: 0x182435, roughness: 0.8 }); // Navy seats
    const tierMat2 = new THREE.MeshStandardMaterial({ color: 0x8a1c28, roughness: 0.8 }); // Red seats
    const wallConcrete = new THREE.MeshStandardMaterial({ color: 0x22262e, roughness: 0.9 });

    // Step tiers: 4 tiers expanding outward
    for (let t = 0; t < 5; t++) {
      const offset = 2.5 + t * 2.2;
      const height = 1.0 + t * 1.4;
      const thickness = 2.0;

      const tierL = this.rinkDim.length + offset * 2;
      const tierW = this.rinkDim.width + offset * 2;

      // Outer stadium wall border
      const tierGeo = new THREE.BoxGeometry(tierL, 0.8, thickness);
      const mat = t % 2 === 0 ? tierMat1 : tierMat2;

      // North side seats
      const seatsN = new THREE.Mesh(tierGeo, mat);
      seatsN.position.set(0, height, tierW / 2);
      // South side seats
      const seatsS = new THREE.Mesh(tierGeo, mat);
      seatsS.position.set(0, height, -tierW / 2);

      const sideGeo = new THREE.BoxGeometry(thickness, 0.8, tierW);
      const seatsW = new THREE.Mesh(sideGeo, mat);
      seatsW.position.set(-tierL / 2, height, 0);
      const seatsE = new THREE.Mesh(sideGeo, mat);
      seatsE.position.set(tierL / 2, height, 0);

      bowlGroup.add(seatsN, seatsS, seatsW, seatsE);
    }

    // High arena roof truss girders
    const girderMat = new THREE.MeshStandardMaterial({ color: 0x333b45, metalness: 0.7, roughness: 0.4 });
    [-24, -8, 8, 24].forEach((gx) => {
      const trussGeo = new THREE.BoxGeometry(0.8, 1.2, this.rinkDim.width + 24);
      const truss = new THREE.Mesh(trussGeo, girderMat);
      truss.position.set(gx, 18, 0);
      bowlGroup.add(truss);
    });

    // Championship Banners hanging from rafters
    const bannerColors = [0x0a3f82, 0xa61c28, 0x1f5c3a, 0x5a2d82];
    const bannerNames = ['2024 CHAMPIONS', 'EAST DIVISION', 'PRESIDENTS TROPHY', 'RETIRED #99'];

    [-18, -6, 6, 18].forEach((bx, i) => {
      const bannerGeo = new THREE.PlaneGeometry(2.5, 4.5);
      const bannerMat = new THREE.MeshStandardMaterial({
        color: bannerColors[i % bannerColors.length],
        side: THREE.DoubleSide,
        roughness: 0.8,
      });
      const banner = new THREE.Mesh(bannerGeo, bannerMat);
      banner.position.set(bx, 14.5, 12);
      bowlGroup.add(banner);
    });

    // Outer Stadium enclosure backdrop
    const stadiumWallGeo = new THREE.BoxGeometry(105, 26, 65);
    const outerWallMat = new THREE.MeshStandardMaterial({
      color: 0x11161d,
      roughness: 0.95,
      side: THREE.BackSide,
    });
    const outerWall = new THREE.Mesh(stadiumWallGeo, outerWallMat);
    outerWall.position.set(0, 12, 0);
    bowlGroup.add(outerWall);

    this.group.add(bowlGroup);
  }

  /**
   * Build 4-sided giant hanging Jumbotron scoreboard
   */
  private buildJumbotron() {
    const jumbotronGroup = new THREE.Group();
    jumbotronGroup.position.set(0, 13.5, 0);

    const casingMat = new THREE.MeshStandardMaterial({ color: 0x1a202c, metalness: 0.8, roughness: 0.3 });
    const screenMat = new THREE.MeshBasicMaterial({ map: this.jumbotronTexture });

    // Center octagon housing
    const frameGeo = new THREE.BoxGeometry(8, 4.2, 8);
    const frame = new THREE.Mesh(frameGeo, casingMat);
    jumbotronGroup.add(frame);

    // 4 Display Screens
    const screenGeo = new THREE.PlaneGeometry(6.8, 3.4);
    // Front screen (+Z)
    const screenFront = new THREE.Mesh(screenGeo, screenMat);
    screenFront.position.set(0, 0, 4.02);

    // Back screen (-Z)
    const screenBack = new THREE.Mesh(screenGeo, screenMat);
    screenBack.rotation.y = Math.PI;
    screenBack.position.set(0, 0, -4.02);

    // Left screen (-X)
    const screenLeft = new THREE.Mesh(screenGeo, screenMat);
    screenLeft.rotation.y = -Math.PI / 2;
    screenLeft.position.set(-4.02, 0, 0);

    // Right screen (+X)
    const screenRight = new THREE.Mesh(screenGeo, screenMat);
    screenRight.rotation.y = Math.PI / 2;
    screenRight.position.set(4.02, 0, 0);

    jumbotronGroup.add(screenFront, screenBack, screenLeft, screenRight);

    // Suspension cables going up to rafters
    const cableMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
    [
      [-3.5, 3.5],
      [3.5, 3.5],
      [-3.5, -3.5],
      [3.5, -3.5],
    ].forEach(([cx, cz]) => {
      const cableGeo = new THREE.CylinderGeometry(0.03, 0.03, 5, 6);
      const cable = new THREE.Mesh(cableGeo, cableMat);
      cable.position.set(cx, 4.5, cz);
      jumbotronGroup.add(cable);
    });

    this.group.add(jumbotronGroup);
  }

  /**
   * Build Zamboni garage tunnel opening & snow dump gate
   */
  private buildZamboniTunnel() {
    const tunnelGroup = new THREE.Group();
    tunnelGroup.position.set(this.snowDumpZone.x, 0, this.snowDumpZone.z);

    // Floor ramp & yellow hazard warning stripes
    const rampGeo = new THREE.BoxGeometry(4.5, 0.08, 3.5);
    const rampMat = new THREE.MeshStandardMaterial({ color: 0x2e3540, roughness: 0.9 });
    const ramp = new THREE.Mesh(rampGeo, rampMat);
    ramp.position.set(0, 0.04, -1.5);
    tunnelGroup.add(ramp);

    // Snow Dump Pit Grate (where player empties tank)
    const pitGeo = new THREE.BoxGeometry(3.6, 0.02, 1.8);
    const pitMat = new THREE.MeshStandardMaterial({
      color: 0x11161d,
      roughness: 0.6,
      metalness: 0.9,
    });
    const pit = new THREE.Mesh(pitGeo, pitMat);
    pit.position.set(0, 0.09, -1.4);
    tunnelGroup.add(pit);

    // Tunnel Arch Walls & Signage
    const archMat = new THREE.MeshStandardMaterial({ color: 0x1f2633, roughness: 0.7 });
    const archGeoL = new THREE.BoxGeometry(0.5, 3.2, 3.5);
    const archL = new THREE.Mesh(archGeoL, archMat);
    archL.position.set(-2.25, 1.6, -1.5);

    const archR = new THREE.Mesh(archGeoL, archMat);
    archR.position.set(2.25, 1.6, -1.5);

    const archTopGeo = new THREE.BoxGeometry(5.0, 0.8, 3.5);
    const archTop = new THREE.Mesh(archTopGeo, archMat);
    archTop.position.set(0, 3.2, -1.5);

    tunnelGroup.add(archL, archR, archTop);

    // Overhead illuminated sign: "SNOW DUMP / ZAMBONI GARAGE"
    const signGeo = new THREE.BoxGeometry(4.2, 0.6, 0.15);
    const signMat = new THREE.MeshStandardMaterial({
      color: 0x0f3460,
      emissive: 0x0f3460,
      emissiveIntensity: 0.4,
    });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(0, 2.7, 0.2);
    tunnelGroup.add(sign);

    // Green beacon light above dump station
    this.dumpStationLight = new THREE.PointLight(0x00ff88, 2.0, 8);
    this.dumpStationLight.position.set(0, 2.4, -0.6);
    tunnelGroup.add(this.dumpStationLight);

    this.group.add(tunnelGroup);
  }

  /**
   * Builds player benches, penalty boxes, corner floodlight towers, and arena ribbon boards
   */
  private buildPlayerBenchesAndLED() {
    const halfW = this.rinkDim.width / 2;

    // 1. Home Team Bench (North Side, X = -9 to -1)
    const homeBenchMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.5 });
    const benchShelfMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
    const homeBench = new THREE.Mesh(new THREE.BoxGeometry(8, 0.5, 1.2), benchShelfMat);
    homeBench.position.set(-5, 0.35, halfW + 0.8);
    const homeWall = new THREE.Mesh(new THREE.BoxGeometry(8, 1.3, 0.1), homeBenchMat);
    homeWall.position.set(-5, 0.9, halfW + 1.4);
    this.group.add(homeBench, homeWall);

    // 2. Away Team Bench (North Side, X = 1 to 9)
    const awayBenchMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.5 });
    const awayBench = new THREE.Mesh(new THREE.BoxGeometry(8, 0.5, 1.2), benchShelfMat);
    awayBench.position.set(5, 0.35, halfW + 0.8);
    const awayWall = new THREE.Mesh(new THREE.BoxGeometry(8, 1.3, 0.1), awayBenchMat);
    awayWall.position.set(5, 0.9, halfW + 1.4);
    this.group.add(awayBench, awayWall);

    // 3. Penalty Box & Timekeeper Booth (South Side, X = -4 to 4)
    const penaltyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
    const penaltyBooth = new THREE.Mesh(new THREE.BoxGeometry(6, 0.6, 1.0), penaltyMat);
    penaltyBooth.position.set(0, 0.35, -halfW - 0.8);
    this.group.add(penaltyBooth);

    // 4. Stadium Corner Floodlight Rigs (4 corners)
    const towerGeo = new THREE.CylinderGeometry(0.2, 0.25, 20, 8);
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x2b3340, metalness: 0.8, roughness: 0.3 });
    const lightHeadMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfffaed,
      emissiveIntensity: 1.5,
      roughness: 0.1,
    });

    [
      [-32, -18],
      [32, -18],
      [-32, 18],
      [32, 18],
    ].forEach(([tx, tz]) => {
      const pole = new THREE.Mesh(towerGeo, towerMat);
      pole.position.set(tx, 10, tz);

      // Light bank fixture
      const bank = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 0.8), towerMat);
      bank.position.set(tx, 19.5, tz);
      bank.lookAt(0, 0, 0);

      const lamp = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.9), lightHeadMat);
      lamp.position.set(0, 0, 0.42);
      bank.add(lamp);

      this.group.add(pole, bank);
    });

    // 5. LED Stadium Ribbon Banner along seating fascia
    const ribbonCanvas = document.createElement('canvas');
    ribbonCanvas.width = 1024;
    ribbonCanvas.height = 64;
    const rCtx = ribbonCanvas.getContext('2d')!;
    rCtx.fillStyle = '#050810';
    rCtx.fillRect(0, 0, 1024, 64);
    rCtx.fillStyle = '#00f0ff';
    rCtx.font = 'bold 22px monospace';
    rCtx.fillText('⚡ YETIS ARENA ICE OPS · NHL INTERMISSION RESURFACING · RESPECT THE ICE ⚡', 20, 40);

    const ribbonTex = new THREE.CanvasTexture(ribbonCanvas);
    ribbonTex.wrapS = THREE.RepeatWrapping;
    ribbonTex.repeat.set(4, 1);

    const ribbonMat = new THREE.MeshBasicMaterial({ map: ribbonTex });
    const ribbonGeo = new THREE.BoxGeometry(this.rinkDim.length + 18, 0.9, this.rinkDim.width + 18);
    const ribbonMesh = new THREE.Mesh(ribbonGeo, ribbonMat);
    ribbonMesh.position.set(0, 7.5, 0);
    this.group.add(ribbonMesh);
  }

  /**
   * Update dynamic Jumbotron scoreboard graphics
   */
  public updateJumbotron(cleanPct: number, timeLeftSeconds: number, periodText: string, homeScore = 3, awayScore = 2) {
    const ctx = this.jumbotronCtx;
    const w = this.jumbotronCanvas.width;
    const h = this.jumbotronCanvas.height;

    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, w, h);

    // Grid lines / scoreboard bezel
    ctx.strokeStyle = '#223048';
    ctx.lineWidth = 3;
    ctx.strokeRect(4, 4, w - 8, h - 8);

    // Header bar: Match / Period
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(8, 8, w - 16, 42);

    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`★ NHL INTERMISSION · ${periodText} ★`, w / 2, 35);

    // Team scores: HOME 3 - 2 AWAY
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('YETIS', 30, 95);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 36px monospace';
    ctx.fillText(`${homeScore}`, 145, 98);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('VS', w / 2, 92);

    ctx.fillStyle = '#ff5555';
    ctx.font = 'bold 36px monospace';
    ctx.fillText(`${awayScore}`, w - 165, 98);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('BLIZZARDS', w - 30, 95);

    // Center Box: Rink Resurfacing Progress Gauge
    ctx.fillStyle = '#1e293b';
    ctx.roundRect(24, 120, w - 48, 115, 8);
    ctx.fill();

    // Clean percentage display
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('ICE RESURFACING PROGRESS:', 42, 148);

    ctx.fillStyle = cleanPct >= 90 ? '#4ade80' : '#38bdf8';
    ctx.font = 'bold 36px monospace';
    ctx.fillText(`${cleanPct.toFixed(1)}%`, 42, 190);

    // Target badge
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '13px monospace';
    ctx.fillText('TARGET: ≥90.0%', 42, 218);

    // Countdown Clock display on right
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('CLOCK UNTIL FACEOFF:', w - 42, 148);

    const mins = Math.floor(Math.max(0, timeLeftSeconds) / 60);
    const secs = Math.floor(Math.max(0, timeLeftSeconds) % 60);
    const timeFormatted = `${mins}:${secs.toString().padStart(2, '0')}`;

    ctx.fillStyle = timeLeftSeconds <= 20 && timeLeftSeconds > 0 ? '#ef4444' : '#facc15';
    ctx.font = 'bold 38px monospace';
    ctx.fillText(timeFormatted, w - 42, 192);

    this.jumbotronTexture.needsUpdate = true;
  }

  public dispose() {
    this.jumbotronTexture.dispose();
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material?.dispose();
        }
      }
    });
  }
}
