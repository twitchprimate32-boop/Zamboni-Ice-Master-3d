/**
 * GameEngine
 * Core 60fps physics, Three.js renderer, vehicle dynamics, collision detection,
 * camera director, and mission tracking for Zamboni Ice Master 3D.
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CameraView, GameMetrics, GameMode, GameStatus, MissionConfig, ZamboniSkin, ZamboniState } from '../types/game';
import { RinkTextureManager } from './RinkTextureManager';
import { ZamboniModel } from './ZamboniModel';
import { ArenaModel } from './ArenaModel';
import { ParticleSystem } from './ParticleSystem';
import { CrowdSystem } from './CrowdSystem';
import { soundEffects } from '../audio/SoundEffects';

// Reusable math vectors to prevent GC allocations in tick
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();

export class GameEngine {
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;

  // Scene entities
  public rinkManager: RinkTextureManager;
  public zamboni: ZamboniModel;
  public arena: ArenaModel;
  public particles: ParticleSystem;
  public crowd: CrowdSystem;

  // State
  public status: GameStatus = 'menu';
  public currentMode: GameMode = 'career';
  public currentConfig: MissionConfig;
  public cameraMode: CameraView = 'chase';

  // Zamboni Physics state
  public state: ZamboniState = {
    x: 0,
    z: -12.0, // Start parked outside Zamboni tunnel
    angle: 0,
    speed: 0,
    steerAngle: 0,
    conditionerDown: false,
    snowTankLevel: 0,
    waterTankLevel: 100,
    hornActive: false,
  };

  // Metrics
  public metrics: GameMetrics = {
    cleanPercentage: 0,
    timeRemaining: 90,
    timeElapsed: 0,
    score: 0,
    starsEarned: 0,
    distanceTraveled: 0,
    boardCollisions: 0,
  };

  // Input states
  public keys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    bladeToggle: false,
    horn: false,
  };

  // Camera damping
  private camPos = new THREE.Vector3(0, 8, -20);
  private camLookAt = new THREE.Vector3(0, 1, 0);
  private titleOrbitAngle = 0;
  private cameraShake = 0;

  // Loop control
  private animFrameId: number | null = null;
  private clock = new THREE.Clock();
  private isDestroyed = false;

  // UI callbacks
  public onMetricsUpdate?: (m: GameMetrics, state: ZamboniState) => void;
  public onGameEnd?: (status: 'victory' | 'game_over', metrics: GameMetrics) => void;

  constructor(canvasContainer: HTMLDivElement, initialSkin?: ZamboniSkin) {
    // 1. Setup Three.js Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    canvasContainer.appendChild(this.renderer.domElement);

    // 2. Scene & Environment
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0e14);
    this.scene.fog = new THREE.FogExp2(0x0a0e14, 0.012);

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 3. Camera
    this.camera = new THREE.PerspectiveCamera(
      52,
      canvasContainer.clientWidth / canvasContainer.clientHeight,
      0.1,
      250
    );
    this.camera.position.set(0, 12, -22);

    // 4. Lighting Rig
    this.setupLighting();

    // 5. Game Objects
    this.rinkManager = new RinkTextureManager();
    this.zamboni = new ZamboniModel(initialSkin);
    this.arena = new ArenaModel(this.rinkManager.rinkDim);
    this.particles = new ParticleSystem();
    this.crowd = new CrowdSystem(this.rinkManager.rinkDim);

    // 1. Pristine Ice Mesh (Layer 0 at Y = 0.0)
    const iceGeo = new THREE.PlaneGeometry(
      this.rinkManager.rinkDim.length,
      this.rinkManager.rinkDim.width,
      32,
      16
    );
    const pristineIceMesh = new THREE.Mesh(iceGeo, this.rinkManager.pristineIceMaterial);
    pristineIceMesh.rotation.x = -Math.PI / 2;
    pristineIceMesh.position.set(0, 0, 0);
    pristineIceMesh.receiveShadow = true;
    this.scene.add(pristineIceMesh);

    // 2. Snow & Frost Alpha Overlay Mesh (Layer 1 at Y = 0.025)
    // The Zamboni erases this alpha layer directly, revealing the pristine ice below!
    const snowOverlayMesh = new THREE.Mesh(iceGeo, this.rinkManager.snowOverlayMaterial);
    snowOverlayMesh.rotation.x = -Math.PI / 2;
    snowOverlayMesh.position.set(0, 0.025, 0);
    this.scene.add(snowOverlayMesh);
    this.scene.add(this.zamboni.group);
    this.scene.add(this.arena.group);
    this.scene.add(this.particles.group);
    this.scene.add(this.crowd.group);

    // Default mission config
    this.currentConfig = {
      id: 'career',
      title: 'Pre-Game Faceoff Resurface',
      subtitle: 'Opening Night vs the Blizzards',
      description: 'The stadium is packed! Resurface at least 90% of the ice sheet before the referee drops the opening puck.',
      timeLimitSeconds: 120,
      targetCleanPercent: 90,
      threeStarPercent: 96,
      initialDirtiness: 0.85,
      snowTankCapacity: 100,
      snowAccumulationRate: 0.04,
      weather: 'indoor',
    };

    // Pre-warm renderer
    this.renderer.compile(this.scene, this.camera);

    // Start loop
    this.clock.start();
    this.animate = this.animate.bind(this);
    this.animFrameId = requestAnimationFrame(this.animate);

    // Window resize handler
    window.addEventListener('resize', this.handleResize);
  }

  private setupLighting() {
    // Cool ambient hemisphere fill
    const hemiLight = new THREE.HemisphereLight(0xe4f2ff, 0x111622, 1.2);
    this.scene.add(hemiLight);

    // Arena Floodlight 1 (Key Sun/Roof Light)
    const keyLight = new THREE.DirectionalLight(0xfffaed, 2.8);
    keyLight.position.set(15, 24, 15);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 5;
    keyLight.shadow.camera.far = 65;
    keyLight.shadow.camera.left = -40;
    keyLight.shadow.camera.right = 40;
    keyLight.shadow.camera.top = 25;
    keyLight.shadow.camera.bottom = -25;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    this.scene.add(keyLight);

    // Arena Floodlight 2 (Opposite Fill Light)
    const fillLight = new THREE.DirectionalLight(0xcce4ff, 1.4);
    fillLight.position.set(-15, 22, -15);
    fillLight.castShadow = false;
    this.scene.add(fillLight);
  }

  public setSkin(skin: ZamboniSkin) {
    this.zamboni.setSkin(skin);
  }

  public setCameraView(view: CameraView) {
    this.cameraMode = view;
  }

  public startMission(config: MissionConfig) {
    this.currentConfig = config;
    this.currentMode = config.id;
    this.status = 'playing';

    // Reset Zamboni state to tunnel starting spot
    this.state.x = 0;
    this.state.z = -12.5;
    this.state.angle = 0; // facing forward (+Z or center ice)
    this.state.speed = 0;
    this.state.steerAngle = 0;
    this.state.conditionerDown = false;
    this.state.snowTankLevel = 0;
    this.state.waterTankLevel = 100;

    // Reset ice scratches
    this.rinkManager.resetScratches(config.initialDirtiness);

    // Reset metrics
    this.metrics = {
      cleanPercentage: this.rinkManager.getCleanPercentage(),
      timeRemaining: config.timeLimitSeconds,
      timeElapsed: 0,
      score: 0,
      starsEarned: 0,
      distanceTraveled: 0,
      boardCollisions: 0,
    };

    soundEffects.playWhistle();
  }

  public togglePause() {
    if (this.status === 'playing') {
      this.status = 'paused';
    } else if (this.status === 'paused') {
      this.status = 'playing';
      this.clock.getDelta(); // prevent delta jump
    }
  }

  public triggerHorn() {
    soundEffects.playHorn();
    this.state.hornActive = true;
    this.crowd.cheer();
    soundEffects.playCrowdCheer();
    setTimeout(() => {
      this.state.hornActive = false;
    }, 400);
  }

  public respawn() {
    // Reposition Zamboni to center ice entrance without resetting clean progress
    this.state.x = 0;
    this.state.z = -12.0;
    this.state.speed = 0;
    this.state.steerAngle = 0;
    this.state.angle = 0;
    soundEffects.playWhistle();
  }

  public toggleConditioner() {
    this.state.conditionerDown = !this.state.conditionerDown;
    soundEffects.playConditionerToggle(this.state.conditionerDown);
  }

  public toggleHighlightMode(): boolean {
    this.rinkManager.setHighlightMode(!this.rinkManager.highlightMode);
    return this.rinkManager.highlightMode;
  }

  /**
   * Main 60fps game loop
   */
  private animate() {
    if (this.isDestroyed) return;

    this.animFrameId = requestAnimationFrame(this.animate);

    const rawDt = this.clock.getDelta();
    const dt = Math.min(rawDt, 0.05); // clamp max delta for stability

    if (this.status === 'playing') {
      this.updatePhysics(dt);
      this.updateCleaning(dt);
      this.updateRules(dt);
    } else if (this.status === 'menu') {
      // Atmospheric title orbit
      this.titleOrbitAngle += dt * 0.25;
    }

    this.particles.update(dt);
    this.crowd.update(dt);
    this.updateCamera(dt);

    // Render
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Zamboni vehicle physics simulation
   */
  private updatePhysics(dt: number) {
    const maxSpeed = 5.2; // ~12 mph max speed for industrial Zamboni
    const maxReverse = -2.4;
    const accelRate = 3.2; // heavy vehicle acceleration
    const brakeRate = 5.5;
    const dragCoeff = 1.1; // ice glide friction
    const maxSteer = 0.58; // radians (~33 deg)
    const steerSpeed = 2.4;

    // 1. Steering input
    let targetSteer = 0;
    if (this.keys.left) targetSteer -= maxSteer;
    if (this.keys.right) targetSteer += maxSteer;

    this.state.steerAngle = THREE.MathUtils.damp(this.state.steerAngle, targetSteer, steerSpeed * 4, dt);

    // 2. Throttle / Brake
    let throttle = 0;
    if (this.keys.forward) throttle += 1;
    if (this.keys.backward) throttle -= 1;

    if (throttle > 0) {
      this.state.speed += accelRate * dt;
      if (this.state.speed > maxSpeed) this.state.speed = maxSpeed;
    } else if (throttle < 0) {
      if (this.state.speed > 0.2) {
        // Braking while moving forward
        this.state.speed -= brakeRate * dt;
      } else {
        // Reversing
        this.state.speed -= accelRate * 0.8 * dt;
        if (this.state.speed < maxReverse) this.state.speed = maxReverse;
      }
    } else {
      // Natural ice coasting drag
      if (this.state.speed > 0) {
        this.state.speed = Math.max(0, this.state.speed - dragCoeff * dt);
      } else if (this.state.speed < 0) {
        this.state.speed = Math.min(0, this.state.speed + dragCoeff * dt);
      }
    }

    // 3. Angular rotation: Zamboni has REAR-WHEEL STEERING!
    // Turning causes the rear to swing out, pivoting around front wheelbase
    const wheelbase = 2.4;
    if (Math.abs(this.state.speed) > 0.02) {
      const angularVel = (this.state.speed / wheelbase) * Math.tan(this.state.steerAngle);
      this.state.angle += angularVel * dt;
    }

    // 4. Position update
    const moveX = Math.sin(this.state.angle) * this.state.speed * dt;
    const moveZ = Math.cos(this.state.angle) * this.state.speed * dt;

    const nextX = this.state.x + moveX;
    const nextZ = this.state.z + moveZ;

    // 5. Board Collision Detection against rounded arena perimeter
    const halfL = this.arena.rinkDim.length / 2 - 1.2; // Zamboni clearance
    const halfW = this.arena.rinkDim.width / 2 - 1.2;
    const rad = this.arena.rinkDim.cornerRad;

    const inside = this.rinkManager.isPointInsideRink(nextX, nextZ, halfL, halfW, rad);

    if (inside) {
      this.state.x = nextX;
      this.state.z = nextZ;
      this.metrics.distanceTraveled += Math.abs(this.state.speed * dt);
    } else {
      // Collision bounce!
      this.metrics.boardCollisions++;
      this.cameraShake = Math.min(0.6, Math.abs(this.state.speed) * 0.12);
      soundEffects.playBoardImpact(Math.abs(this.state.speed) / maxSpeed);

      // Bounce back slightly and slide along board
      this.state.speed = -this.state.speed * 0.35;
    }

    // Check if in Snow Dump Zone
    const distToDump = Math.hypot(this.state.x - this.arena.snowDumpZone.x, this.state.z - this.arena.snowDumpZone.z);
    if (distToDump < this.arena.snowDumpZone.radius && this.state.snowTankLevel > 0) {
      // Empty snow tank!
      this.state.snowTankLevel = Math.max(0, this.state.snowTankLevel - dt * 45);
      if (Math.random() < 0.2) {
        soundEffects.playSnowDump();
      }
    }

    // Update 3D Zamboni Group
    this.zamboni.group.position.set(this.state.x, 0, this.state.z);
    this.zamboni.group.rotation.y = this.state.angle;
    this.zamboni.update(dt, this.state.speed, this.state.steerAngle, this.state.conditionerDown);

    // Update procedural audio engine pitch & sounds
    soundEffects.updateEngine(
      this.state.speed / maxSpeed,
      throttle,
      this.state.conditionerDown && this.state.snowTankLevel < 100
    );
  }

  /**
   * Resurfacing, snow accumulation, and ice clearing calculations
   */
  private updateCleaning(dt: number) {
    // Conditioner only shaves when down, moving, and snow tank is not completely full
    const isMoving = Math.abs(this.state.speed) > 0.1;
    const canClean = this.state.conditionerDown && isMoving && this.state.snowTankLevel < 100;

    if (canClean) {
      // Position of rear conditioner sled in world space
      // In Zamboni local coordinates, conditioner is at Z = -1.95m
      const condOffsetZ = -1.95;
      const condX = this.state.x + Math.sin(this.state.angle) * condOffsetZ;
      const condZ = this.state.z + Math.cos(this.state.angle) * condOffsetZ;

      const { newlyCleaned } = this.rinkManager.cleanAt(
        condX,
        condZ,
        this.state.angle,
        3.8, // wide berth conditioner blade width (generous coverage)
        Math.abs(this.state.speed * dt) + 0.4 // stroke length
      );

      // Accumulate snow
      if (newlyCleaned > 0) {
        this.state.snowTankLevel = Math.min(
          100,
          this.state.snowTankLevel + newlyCleaned * this.currentConfig.snowAccumulationRate
        );
        this.metrics.score += newlyCleaned * 10;
      }

      // Emit snow particles and mist
      this.particles.emitSnow(
        this.state.x + Math.sin(this.state.angle) * 0.8,
        1.8,
        this.state.z + Math.cos(this.state.angle) * 0.8,
        2
      );
      this.particles.emitMist(condX, condZ, this.state.angle, 2);
    }

    // Calculate current clean %
    this.metrics.cleanPercentage = this.rinkManager.getCleanPercentage();
  }

  /**
   * Mission timer, win/loss rules, and Jumbotron scoreboard updates
   */
  private updateRules(dt: number) {
    this.metrics.timeElapsed += dt;

    if (this.currentConfig.timeLimitSeconds > 0) {
      this.metrics.timeRemaining = Math.max(0, this.currentConfig.timeLimitSeconds - this.metrics.timeElapsed);

      // Check time out
      if (this.metrics.timeRemaining <= 0) {
        if (this.metrics.cleanPercentage >= this.currentConfig.targetCleanPercent) {
          this.endGame('victory');
        } else {
          this.endGame('game_over');
        }
        return;
      }
    }

    // Check early victory if threshold is reached
    if (this.metrics.cleanPercentage >= this.currentConfig.threeStarPercent) {
      this.metrics.starsEarned = 3;
    } else if (this.metrics.cleanPercentage >= this.currentConfig.targetCleanPercent + 3) {
      this.metrics.starsEarned = 2;
    } else if (this.metrics.cleanPercentage >= this.currentConfig.targetCleanPercent) {
      this.metrics.starsEarned = 1;
    }

    // Update Jumbotron display
    this.arena.updateJumbotron(
      this.metrics.cleanPercentage,
      this.metrics.timeRemaining,
      this.currentConfig.title.toUpperCase(),
      4,
      2
    );

    // Periodic UI state sync
    if (this.onMetricsUpdate) {
      this.onMetricsUpdate(this.metrics, this.state);
    }
  }

  private endGame(status: 'victory' | 'game_over') {
    this.status = status;
    soundEffects.playStadiumBuzzer();
    if (status === 'victory') {
      soundEffects.playCrowdCheer();
    }
    if (this.onGameEnd) {
      this.onGameEnd(status, this.metrics);
    }
  }

  /**
   * Camera smoothing with camera views & decaying shake
   */
  private updateCamera(dt: number) {
    // Decaying camera shake on collision
    if (this.cameraShake > 0.001) {
      this.cameraShake = THREE.MathUtils.damp(this.cameraShake, 0, 8, dt);
    }

    const shakeX = (Math.random() - 0.5) * this.cameraShake;
    const shakeY = (Math.random() - 0.5) * this.cameraShake;

    if (this.status === 'menu') {
      // Panoramic cinematic orbit around arena
      const orbitRad = 26;
      const camX = Math.cos(this.titleOrbitAngle) * orbitRad;
      const camZ = Math.sin(this.titleOrbitAngle) * orbitRad;
      this.camera.position.set(camX, 10 + Math.sin(this.titleOrbitAngle * 0.5) * 2, camZ);
      this.camera.lookAt(0, 1.5, 0);
      return;
    }

    if (this.cameraMode === 'chase') {
      // Smooth chase camera behind Zamboni
      const followDist = 8.8;
      const height = 4.2;

      // Position behind Zamboni (direction opposite to facing)
      const targetX = this.state.x - Math.sin(this.state.angle) * followDist;
      const targetZ = this.state.z - Math.cos(this.state.angle) * followDist;

      this.camPos.x = THREE.MathUtils.damp(this.camPos.x, targetX, 5.5, dt);
      this.camPos.y = THREE.MathUtils.damp(this.camPos.y, height, 5.5, dt);
      this.camPos.z = THREE.MathUtils.damp(this.camPos.z, targetZ, 5.5, dt);

      // Look slightly ahead of Zamboni
      const lookDist = 4.0;
      const targetLookX = this.state.x + Math.sin(this.state.angle) * lookDist;
      const targetLookZ = this.state.z + Math.cos(this.state.angle) * lookDist;

      this.camLookAt.x = THREE.MathUtils.damp(this.camLookAt.x, targetLookX, 6.0, dt);
      this.camLookAt.y = THREE.MathUtils.damp(this.camLookAt.y, 1.2, 6.0, dt);
      this.camLookAt.z = THREE.MathUtils.damp(this.camLookAt.z, targetLookZ, 6.0, dt);

      this.camera.position.set(this.camPos.x + shakeX, this.camPos.y + shakeY, this.camPos.z);
      this.camera.lookAt(this.camLookAt);
    } else if (this.cameraMode === 'driver') {
      // Elevated driver's seat view (first person cab)
      // Driver seat is at (-0.45, 2.05, -1.0) relative to Zamboni
      const seatOffset = _vec3A.set(-0.45, 2.1, -0.9);
      seatOffset.applyAxisAngle(THREE.Object3D.DEFAULT_UP, this.state.angle);

      const eyeX = this.state.x + seatOffset.x;
      const eyeY = 2.15;
      const eyeZ = this.state.z + seatOffset.z;

      // Look direction forward
      const lookForward = _vec3B.set(0, 0, 8);
      lookForward.applyAxisAngle(THREE.Object3D.DEFAULT_UP, this.state.angle);

      this.camera.position.set(eyeX + shakeX, eyeY + shakeY, eyeZ);
      this.camera.lookAt(eyeX + lookForward.x, eyeY - 0.2, eyeZ + lookForward.z);
    } else if (this.cameraMode === 'top_down') {
      // High broadcast angle viewing whole ice rink
      const targetX = this.state.x * 0.35;
      const targetZ = this.state.z * 0.35;
      this.camera.position.set(targetX, 36, targetZ + 12);
      this.camera.lookAt(targetX, 0, targetZ);
    }
  }

  private handleResize = () => {
    const parent = this.renderer.domElement.parentElement;
    if (!parent) return;
    this.camera.aspect = parent.clientWidth / parent.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(parent.clientWidth, parent.clientHeight);
  };

  public destroy() {
    this.isDestroyed = true;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    window.removeEventListener('resize', this.handleResize);

    this.rinkManager.dispose();
    this.zamboni.dispose();
    this.arena.dispose();
    this.particles.dispose();
    this.crowd.dispose();
    this.renderer.dispose();

    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
