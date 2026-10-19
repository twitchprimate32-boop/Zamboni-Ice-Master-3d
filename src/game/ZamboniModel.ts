/**
 * ZamboniModel
 * Procedural 3D model of a heavy industrial ice resurfacer (Zamboni).
 * Built with 12+ distinct composite parts:
 * - Heavy industrial main chassis and lower drivetrain
 * - Front snow dump tank hopper with hydraulic arms
 * - Driver's elevated cab platform, bucket seat, steering wheel, control levers & instrument dash
 * - Rear conditioner sled assembly (blade housing, water spreader bar, rubber squeegee)
 * - 4 studded heavy rubber tread wheels with chrome hubs (with steerable rear axle)
 * - Dual high-beam headlights with actual Three.js spotlights
 * - Flashing amber safety rotating beacon
 * - Vertical snow auger conveyor tube
 * - Stainless steel exhaust stack & side air intake louvers
 * - Side board brush guide wheel
 */

import * as THREE from 'three';
import { ZamboniSkin } from '../types/game';

export class ZamboniModel {
  public group: THREE.Group;

  // Animatable sub-nodes
  public frontLeftWheel: THREE.Mesh;
  public frontRightWheel: THREE.Mesh;
  public rearLeftWheelGroup: THREE.Group;
  public rearRightWheelGroup: THREE.Group;
  public rearLeftWheel: THREE.Mesh;
  public rearRightWheel: THREE.Mesh;
  public conditionerGroup: THREE.Group;
  public steeringWheel: THREE.Mesh;
  public beaconMesh: THREE.Mesh;
  public beaconLight: THREE.PointLight;
  public headlightLeft: THREE.SpotLight;
  public headlightRight: THREE.SpotLight;
  public headlightTarget: THREE.Object3D;

  // Materials for customizable skins
  private bodyMaterial: THREE.MeshStandardMaterial;
  private accentMaterial: THREE.MeshStandardMaterial;
  private metalMaterial: THREE.MeshStandardMaterial;

  private beaconTimer = 0;

  constructor(skin?: ZamboniSkin) {
    this.group = new THREE.Group();

    // 1. Materials
    const primaryColor = skin?.primaryColor || '#0066cc'; // Classic Zamboni Blue
    const accentColor = skin?.accentColor || '#ffffff';   // Crisp White Trim
    const metalColor = skin?.metalColor || '#22262c';     // Dark Cast Steel

    this.bodyMaterial = new THREE.MeshStandardMaterial({
      color: primaryColor,
      roughness: 0.28,
      metalness: 0.25,
      name: 'zamboni-body',
    });

    this.accentMaterial = new THREE.MeshStandardMaterial({
      color: accentColor,
      roughness: 0.35,
      metalness: 0.1,
      name: 'zamboni-accent',
    });

    this.metalMaterial = new THREE.MeshStandardMaterial({
      color: metalColor,
      roughness: 0.55,
      metalness: 0.85,
      name: 'zamboni-metal',
    });

    const chromeMaterial = new THREE.MeshStandardMaterial({
      color: 0xdddddd,
      roughness: 0.15,
      metalness: 0.95,
      name: 'zamboni-chrome',
    });

    const tireMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.85,
      metalness: 0.05,
      name: 'zamboni-rubber',
    });

    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.8,
      roughness: 0.1,
      ior: 1.5,
      transparent: true,
      opacity: 0.7,
      name: 'zamboni-glass',
    });

    // 2. PRIMARY SILHOUETTE: Main Lower Chassis (0.4m above ground)
    // Real Zamboni: ~4.1m long, ~2.2m wide, ~2.3m high
    const chassisGeo = new THREE.BoxGeometry(1.9, 0.45, 3.8);
    const chassis = new THREE.Mesh(chassisGeo, this.metalMaterial);
    chassis.position.set(0, 0.45, 0);
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    this.group.add(chassis);

    // 3. FRONT HOOD & SNOW DUMP TANK
    // Sloped aerodynamic industrial front tank
    const tankGeo = new THREE.BoxGeometry(1.85, 1.25, 2.2);
    const tank = new THREE.Mesh(tankGeo, this.bodyMaterial);
    tank.position.set(0, 1.2, 0.85);
    tank.castShadow = true;
    tank.receiveShadow = true;
    this.group.add(tank);

    // Front Tank Sloped Lid / Bevel
    const lidGeo = new THREE.BoxGeometry(1.82, 0.2, 2.15);
    const lid = new THREE.Mesh(lidGeo, this.accentMaterial);
    lid.position.set(0, 1.85, 0.85);
    lid.castShadow = true;
    this.group.add(lid);

    // Front Grill & Zamboni Nameplate
    const grillGeo = new THREE.BoxGeometry(1.6, 0.6, 0.1);
    const grill = new THREE.Mesh(grillGeo, this.metalMaterial);
    grill.position.set(0, 0.9, 1.96);
    this.group.add(grill);

    // Hydraulic lift cylinders on snow tank sides
    [-0.96, 0.96].forEach((x) => {
      const pistonCylinder = new THREE.CylinderGeometry(0.04, 0.04, 1.1, 8);
      const piston = new THREE.Mesh(pistonCylinder, chromeMaterial);
      piston.rotation.x = Math.PI / 12;
      piston.position.set(x, 1.1, 0.8);
      this.group.add(piston);
    });

    // 4. OPERATOR CAB & SEATING PLATFORM (Elevated at rear left for visibility)
    const cabFloorGeo = new THREE.BoxGeometry(1.85, 0.15, 1.4);
    const cabFloor = new THREE.Mesh(cabFloorGeo, this.metalMaterial);
    cabFloor.position.set(0, 0.72, -0.95);
    this.group.add(cabFloor);

    // Driver Side Protective Cowling & Rear Engine Cover
    const rearEngineCoverGeo = new THREE.BoxGeometry(1.85, 0.8, 1.3);
    const rearEngineCover = new THREE.Mesh(rearEngineCoverGeo, this.bodyMaterial);
    rearEngineCover.position.set(0, 1.1, -1.0);
    rearEngineCover.castShadow = true;
    this.group.add(rearEngineCover);

    // Elevated Operator Bucket Seat (offset to the left as on real Zambonis for board watching!)
    const seatBaseGeo = new THREE.BoxGeometry(0.5, 0.4, 0.45);
    const seatBase = new THREE.Mesh(seatBaseGeo, this.metalMaterial);
    seatBase.position.set(-0.45, 1.6, -1.0);
    this.group.add(seatBase);

    const seatCushionGeo = new THREE.BoxGeometry(0.52, 0.12, 0.46);
    const seatCushion = new THREE.Mesh(seatCushionGeo, tireMaterial);
    seatCushion.position.set(-0.45, 1.82, -1.0);
    this.group.add(seatCushion);

    const seatBackGeo = new THREE.BoxGeometry(0.52, 0.45, 0.12);
    const seatBack = new THREE.Mesh(seatBackGeo, tireMaterial);
    seatBack.position.set(-0.45, 2.05, -1.2);
    this.group.add(seatBack);

    // Operator Driver (Winter Arena Ice Crew)
    const driverGroup = new THREE.Group();
    driverGroup.position.set(-0.45, 1.88, -0.98);

    // Torso / Heavy Arena Parka
    const parkaMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.8 });
    const torsoGeo = new THREE.BoxGeometry(0.42, 0.48, 0.3);
    const torso = new THREE.Mesh(torsoGeo, parkaMat);
    torso.position.set(0, 0.24, 0);

    // Driver Head & Face
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf5c396, roughness: 0.6 });
    const headGeo = new THREE.SphereGeometry(0.13, 10, 10);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.set(0, 0.58, 0.02);

    // Knit Winter Toque / Beanie with Pom-pom
    const beanieMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.9 });
    const beanieGeo = new THREE.CylinderGeometry(0.1, 0.14, 0.12, 10);
    const beanie = new THREE.Mesh(beanieGeo, beanieMat);
    beanie.position.set(0, 0.68, 0.02);
    const pompomGeo = new THREE.SphereGeometry(0.04, 8, 8);
    const pompom = new THREE.Mesh(pompomGeo, this.accentMaterial);
    pompom.position.set(0, 0.76, 0.02);

    // Winter Work Gloves / Arms resting toward steering wheel
    const gloveMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
    const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.38, 8), parkaMat);
    armL.rotation.x = Math.PI / 3;
    armL.position.set(-0.18, 0.28, 0.16);
    const gloveL = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), gloveMat);
    gloveL.position.set(-0.18, 0.18, 0.32);

    const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.38, 8), parkaMat);
    armR.rotation.x = Math.PI / 3;
    armR.position.set(0.18, 0.28, 0.16);
    const gloveR = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), gloveMat);
    gloveR.position.set(0.18, 0.18, 0.32);

    driverGroup.add(torso, head, beanie, pompom, armL, gloveL, armR, gloveR);
    this.group.add(driverGroup);

    // Operator Safety Roll-bar / Cage Arch
    const rollBarGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.6, 8);
    const rollBarL = new THREE.Mesh(rollBarGeo, chromeMaterial);
    rollBarL.position.set(-0.85, 2.2, -1.0);
    const rollBarR = new THREE.Mesh(rollBarGeo, chromeMaterial);
    rollBarR.position.set(-0.05, 2.2, -1.0);
    const rollBarTopGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.85, 8);
    const rollBarTop = new THREE.Mesh(rollBarTopGeo, chromeMaterial);
    rollBarTop.rotation.z = Math.PI / 2;
    rollBarTop.position.set(-0.45, 3.0, -1.0);
    this.group.add(rollBarL, rollBarR, rollBarTop);

    // Instrument Console & Steering Column
    const dashGeo = new THREE.BoxGeometry(0.55, 0.35, 0.3);
    const dash = new THREE.Mesh(dashGeo, this.metalMaterial);
    dash.position.set(-0.45, 1.7, -0.6);
    this.group.add(dash);

    // Steering Column & Wheel
    const columnGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.4, 8);
    const column = new THREE.Mesh(columnGeo, chromeMaterial);
    column.rotation.x = -Math.PI / 6;
    column.position.set(-0.45, 1.85, -0.68);
    this.group.add(column);

    const steeringWheelGeo = new THREE.TorusGeometry(0.18, 0.025, 8, 20);
    this.steeringWheel = new THREE.Mesh(steeringWheelGeo, tireMaterial);
    this.steeringWheel.rotation.x = Math.PI / 3;
    this.steeringWheel.position.set(-0.45, 2.02, -0.74);
    this.group.add(this.steeringWheel);

    // Control levers (Blade Up/Down, Water Flow, Snow Dump, Throttle)
    const leverGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.22, 6);
    const leverKnobGeo = new THREE.SphereGeometry(0.025, 8, 8);
    const redMat = new THREE.MeshStandardMaterial({ color: 0xdd2222, roughness: 0.3 });
    const blueMat = new THREE.MeshStandardMaterial({ color: 0x2288dd, roughness: 0.3 });

    const lever1 = new THREE.Mesh(leverGeo, chromeMaterial);
    lever1.position.set(-0.25, 1.88, -0.62);
    lever1.rotation.x = -0.2;
    const knob1 = new THREE.Mesh(leverKnobGeo, redMat);
    knob1.position.set(-0.25, 1.98, -0.64);

    const lever2 = new THREE.Mesh(leverGeo, chromeMaterial);
    lever2.position.set(-0.2, 1.88, -0.62);
    lever2.rotation.x = 0.2;
    const knob2 = new THREE.Mesh(leverKnobGeo, blueMat);
    knob2.position.set(-0.2, 1.98, -0.6);

    this.group.add(lever1, knob1, lever2, knob2);

    // 5. SNOW AUGER VERTICAL CHUTE TUBE (Conveys shaved ice to tank)
    const augerGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.5, 12);
    const auger = new THREE.Mesh(augerGeo, this.metalMaterial);
    auger.position.set(0.65, 1.35, -0.45);
    auger.rotation.x = Math.PI / 16;
    this.group.add(auger);

    // Stainless Steel Exhaust Pipe
    const exhaustGeo = new THREE.CylinderGeometry(0.045, 0.045, 1.4, 10);
    const exhaust = new THREE.Mesh(exhaustGeo, chromeMaterial);
    exhaust.position.set(0.82, 2.2, -1.35);
    const exhaustCapGeo = new THREE.CylinderGeometry(0.055, 0.045, 0.15, 10);
    const exhaustCap = new THREE.Mesh(exhaustCapGeo, chromeMaterial);
    exhaustCap.rotation.z = Math.PI / 6;
    exhaustCap.position.set(0.85, 2.92, -1.35);
    this.group.add(exhaust, exhaustCap);

    // 6. REAR CONDITIONER SLED ASSEMBLY (THE BLADE & SQUEEGEE)
    // This is the core Zamboni mechanism that sits on the ice at the back
    this.conditionerGroup = new THREE.Group();
    this.conditionerGroup.position.set(0, 0.22, -1.95);

    // Sled housing (wide berth blade cover: ~3.8m wide)
    const sledHousingGeo = new THREE.BoxGeometry(3.8, 0.28, 0.55);
    const sledHousing = new THREE.Mesh(sledHousingGeo, this.accentMaterial);
    sledHousing.castShadow = true;
    this.conditionerGroup.add(sledHousing);

    // Steel cutting blade edge underneath
    const bladeGeo = new THREE.BoxGeometry(3.75, 0.05, 0.08);
    const bladeMesh = new THREE.Mesh(bladeGeo, chromeMaterial);
    bladeMesh.position.set(0, -0.12, -0.05);
    this.conditionerGroup.add(bladeMesh);

    // Hot water spreader pipe
    const pipeGeo = new THREE.CylinderGeometry(0.035, 0.035, 3.7, 8);
    const pipe = new THREE.Mesh(pipeGeo, chromeMaterial);
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set(0, -0.02, -0.18);
    this.conditionerGroup.add(pipe);

    // Trailing flexible rubber squeegee / cloth towel
    const squeegeeGeo = new THREE.BoxGeometry(3.78, 0.04, 0.22);
    const squeegeeMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const squeegee = new THREE.Mesh(squeegeeGeo, squeegeeMat);
    squeegee.position.set(0, -0.1, -0.32);
    this.conditionerGroup.add(squeegee);

    // Hydraulic mounting arms connecting conditioner to main chassis
    [-1.35, 1.35].forEach((x) => {
      const armGeo = new THREE.BoxGeometry(0.08, 0.12, 0.7);
      const arm = new THREE.Mesh(armGeo, this.metalMaterial);
      arm.position.set(x, 0.1, 0.3);
      this.conditionerGroup.add(arm);
    });

    this.group.add(this.conditionerGroup);

    // 7. SIDE BOARD BRUSH GUIDE WHEEL (on right side to brush ice along dasher boards)
    const brushGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.12, 16);
    const brushMat = new THREE.MeshStandardMaterial({ color: 0xddbb33, roughness: 0.95 });
    const brush = new THREE.Mesh(brushGeo, brushMat);
    brush.position.set(1.92, 0.22, -1.8);
    this.group.add(brush);

    // 8. STUDDED HEAVY RUBBER WHEELS (4 wheels: Front fixed, Rear steerable)
    // Zamboni tires are ~0.75m diameter, studded with ice grips
    const wheelRadius = 0.38;
    const wheelWidth = 0.26;
    const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 18);
    wheelGeo.rotateZ(Math.PI / 2);

    const rimGeo = new THREE.CylinderGeometry(wheelRadius * 0.55, wheelRadius * 0.55, wheelWidth + 0.02, 12);
    rimGeo.rotateZ(Math.PI / 2);

    const createWheel = () => {
      const wGroup = new THREE.Group();
      const tire = new THREE.Mesh(wheelGeo, tireMaterial);
      tire.castShadow = true;
      const rim = new THREE.Mesh(rimGeo, chromeMaterial);
      wGroup.add(tire, rim);
      return { group: wGroup, tire };
    };

    // Front Wheels (fixed orientation, rotate with forward speed)
    const fl = createWheel();
    this.frontLeftWheel = fl.tire;
    fl.group.position.set(-0.95, wheelRadius, 1.15);
    this.group.add(fl.group);

    const fr = createWheel();
    this.frontRightWheel = fr.tire;
    fr.group.position.set(0.95, wheelRadius, 1.15);
    this.group.add(fr.group);

    // Rear Wheels (steerable axle groups for real Zamboni rear-wheel steering!)
    this.rearLeftWheelGroup = new THREE.Group();
    this.rearLeftWheelGroup.position.set(-0.95, wheelRadius, -1.05);
    const rl = createWheel();
    this.rearLeftWheel = rl.tire;
    this.rearLeftWheelGroup.add(rl.group);
    this.group.add(this.rearLeftWheelGroup);

    this.rearRightWheelGroup = new THREE.Group();
    this.rearRightWheelGroup.position.set(0.95, wheelRadius, -1.05);
    const rr = createWheel();
    this.rearRightWheel = rr.tire;
    this.rearRightWheelGroup.add(rr.group);
    this.group.add(this.rearRightWheelGroup);

    // 9. DUAL HEADLIGHTS (Actual Three.js Spotlights + Lenses)
    const lensGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.08, 14);
    lensGeo.rotateX(Math.PI / 2);

    const lensL = new THREE.Mesh(lensGeo, glassMaterial);
    lensL.position.set(-0.65, 0.85, 1.98);
    const lensR = new THREE.Mesh(lensGeo, glassMaterial);
    lensR.position.set(0.65, 0.85, 1.98);
    this.group.add(lensL, lensR);

    // Headlight target object in front of Zamboni
    this.headlightTarget = new THREE.Object3D();
    this.headlightTarget.position.set(0, 0, 15);
    this.group.add(this.headlightTarget);

    this.headlightLeft = new THREE.SpotLight(0xfff4e0, 6.0, 30, Math.PI / 6, 0.4, 1.5);
    this.headlightLeft.position.set(-0.65, 0.85, 2.0);
    this.headlightLeft.target = this.headlightTarget;
    this.headlightLeft.castShadow = false; // keep perf tight
    this.group.add(this.headlightLeft);

    this.headlightRight = new THREE.SpotLight(0xfff4e0, 6.0, 30, Math.PI / 6, 0.4, 1.5);
    this.headlightRight.position.set(0.65, 0.85, 2.0);
    this.headlightRight.target = this.headlightTarget;
    this.headlightRight.castShadow = false;
    this.group.add(this.headlightRight);

    // 10. ROTATING AMBER SAFETY BEACON (on top of roll bar)
    const beaconBaseGeo = new THREE.CylinderGeometry(0.08, 0.09, 0.08, 12);
    const beaconBase = new THREE.Mesh(beaconBaseGeo, this.metalMaterial);
    beaconBase.position.set(-0.45, 3.06, -1.0);
    this.group.add(beaconBase);

    const beaconDomeGeo = new THREE.CylinderGeometry(0.07, 0.08, 0.14, 12);
    const amberGlass = new THREE.MeshPhysicalMaterial({
      color: 0xffaa00,
      emissive: 0xff7700,
      emissiveIntensity: 0.8,
      roughness: 0.1,
      transparent: true,
      opacity: 0.85,
    });
    this.beaconMesh = new THREE.Mesh(beaconDomeGeo, amberGlass);
    this.beaconMesh.position.set(-0.45, 3.17, -1.0);
    this.group.add(this.beaconMesh);

    this.beaconLight = new THREE.PointLight(0xff9900, 2.5, 6);
    this.beaconLight.position.set(-0.45, 3.2, -1.0);
    this.group.add(this.beaconLight);

    // Soft contact shadow plane directly beneath the vehicle (prevents floating look)
    const shadowGeo = new THREE.PlaneGeometry(2.5, 4.4);
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 256;
    const sCtx = shadowCanvas.getContext('2d')!;
    const grad = sCtx.createRadialGradient(64, 128, 10, 64, 128, 60);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
    grad.addColorStop(0.6, 'rgba(0, 0, 0, 0.35)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 128, 256);

    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.set(0, 0.02, 0);
    this.group.add(shadowPlane);
  }

  /**
   * Update animation of sub-parts (wheels, steering angle, conditioner height, beacon light)
   */
  public update(dt: number, speed: number, steerAngle: number, isConditionerDown: boolean) {
    // 1. Wheel rotation proportional to travel distance (v = w * r -> dw = dt * speed / r)
    const wheelRadius = 0.38;
    const deltaRot = (speed * dt) / wheelRadius;
    this.frontLeftWheel.rotation.x += deltaRot;
    this.frontRightWheel.rotation.x += deltaRot;
    this.rearLeftWheel.rotation.x += deltaRot;
    this.rearRightWheel.rotation.x += deltaRot;

    // 2. Rear-wheel steering angle (Zambonis steer with the REAR wheels!)
    // When turning right (steerAngle > 0), rear wheels angle left (-steerAngle)
    const targetRearSteer = -steerAngle * 0.9;
    this.rearLeftWheelGroup.rotation.y = THREE.MathUtils.damp(this.rearLeftWheelGroup.rotation.y, targetRearSteer, 12, dt);
    this.rearRightWheelGroup.rotation.y = THREE.MathUtils.damp(this.rearRightWheelGroup.rotation.y, targetRearSteer, 12, dt);

    // 3. Driver steering wheel animation
    const targetWheelTurn = -steerAngle * 1.8;
    this.steeringWheel.rotation.z = THREE.MathUtils.damp(this.steeringWheel.rotation.z, targetWheelTurn, 10, dt);

    // 4. Conditioner sled up / down animation
    const targetConditionerY = isConditionerDown ? 0.06 : 0.28;
    this.conditionerGroup.position.y = THREE.MathUtils.damp(this.conditionerGroup.position.y, targetConditionerY, 8, dt);

    // 5. Flashing amber beacon strobe
    this.beaconTimer += dt * 7.0;
    const strobe = Math.sin(this.beaconTimer);
    const intensity = strobe > 0.2 ? 2.8 : 0.2;
    this.beaconLight.intensity = intensity;
  }

  public setSkin(skin: ZamboniSkin) {
    this.bodyMaterial.color.set(skin.primaryColor);
    this.accentMaterial.color.set(skin.accentColor);
    this.metalMaterial.color.set(skin.metalColor);
  }

  public dispose() {
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
