/**
 * CrowdSystem
 * High-performance InstancedMesh spectator crowd for the hockey arena bowl.
 * Renders 800+ animated spectators with varied team jerseys and beanies
 * in a SINGLE draw call.
 */

import * as THREE from 'three';
import { RinkDimensions } from './RinkTextureManager';

// Module-scope reusables to prevent GC
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

export class CrowdSystem {
  public group: THREE.Group;
  public instancedMesh: THREE.InstancedMesh;
  public totalFans: number;

  // Base positions and offsets for subtle animation
  private basePositions: { x: number; y: number; z: number; baseAngle: number; tier: number }[] = [];
  private crowdTimer = 0;
  private cheerIntensity = 0;

  constructor(rinkDim: RinkDimensions) {
    this.group = new THREE.Group();

    // 1. Create a stylized low-poly seated spectator geometry
    // Combines torso, head, and winter beanie into a single BufferGeometry
    const fanGeo = this.createFanGeometry();

    // Material with vertex coloring
    const fanMat = new THREE.MeshStandardMaterial({
      roughness: 0.8,
      metalness: 0.1,
    });

    // Calculate seating capacity across 4 tiers
    const fanPositions: { x: number; y: number; z: number; yaw: number; tier: number }[] = [];

    // Team jersey color palette
    const jerseyPalette = [
      0x0284c7, // Yeti Electric Ice Blue
      0x0369a1, // Deep Ocean Blue
      0xdc2626, // Blizzard Scarlet Red
      0xb91c1c, // Crimson
      0xfacc15, // Golden Yellow
      0xf8fafc, // Pure White Home Jersey
      0x1e293b, // Dark Navy Winter Coat
      0x475569, // Charcoal Hoodie
      0x059669, // Emerald Green
    ];

    const halfL = rinkDim.length / 2;
    const halfW = rinkDim.width / 2;

    // 4 Seating tiers
    for (let t = 0; t < 4; t++) {
      const offset = 3.6 + t * 2.2;
      const height = 1.45 + t * 1.4;
      const tierL = rinkDim.length + offset * 2;
      const tierW = rinkDim.width + offset * 2;

      // North side seats (facing south: yaw = 0)
      const numNorth = Math.floor(tierL / 1.1);
      for (let i = 0; i < numNorth; i++) {
        // Leave gaps for aisle stairs every 18 seats
        if (i % 16 === 0) continue;
        const x = -tierL / 2 + 1.2 + (i / numNorth) * (tierL - 2.4);
        const z = tierW / 2 + (Math.random() - 0.5) * 0.15;
        // Jitter slightly so it looks organic
        fanPositions.push({
          x: x + (Math.random() - 0.5) * 0.2,
          y: height + (Math.random() - 0.5) * 0.05,
          z,
          yaw: Math.PI, // Facing rink center (-Z)
          tier: t,
        });
      }

      // South side seats (facing north: yaw = 0)
      const numSouth = Math.floor(tierL / 1.1);
      for (let i = 0; i < numSouth; i++) {
        if (i % 16 === 0) continue;
        const x = -tierL / 2 + 1.2 + (i / numSouth) * (tierL - 2.4);
        const z = -tierW / 2 + (Math.random() - 0.5) * 0.15;
        fanPositions.push({
          x: x + (Math.random() - 0.5) * 0.2,
          y: height + (Math.random() - 0.5) * 0.05,
          z,
          yaw: 0, // Facing rink center (+Z)
          tier: t,
        });
      }

      // East end seats (facing west: yaw = -Math.PI / 2)
      const numEast = Math.floor(tierW / 1.2);
      for (let i = 0; i < numEast; i++) {
        if (i % 14 === 0) continue;
        const z = -tierW / 2 + 1.2 + (i / numEast) * (tierW - 2.4);
        fanPositions.push({
          x: tierL / 2,
          y: height,
          z,
          yaw: -Math.PI / 2,
          tier: t,
        });
      }

      // West end seats (facing east: yaw = Math.PI / 2)
      for (let i = 0; i < numEast; i++) {
        if (i % 14 === 0) continue;
        const z = -tierW / 2 + 1.2 + (i / numEast) * (tierW - 2.4);
        fanPositions.push({
          x: -tierL / 2,
          y: height,
          z,
          yaw: Math.PI / 2,
          tier: t,
        });
      }
    }

    this.totalFans = fanPositions.length;
    this.instancedMesh = new THREE.InstancedMesh(fanGeo, fanMat, this.totalFans);
    this.instancedMesh.castShadow = false;
    this.instancedMesh.receiveShadow = false;

    // Initialize matrices and colors
    for (let i = 0; i < this.totalFans; i++) {
      const p = fanPositions[i];
      this.basePositions.push({
        x: p.x,
        y: p.y,
        z: p.z,
        baseAngle: p.yaw,
        tier: p.tier,
      });

      _dummy.position.set(p.x, p.y, p.z);
      _dummy.rotation.set(0, p.yaw + (Math.random() - 0.5) * 0.1, 0);
      const scaleRand = 0.9 + Math.random() * 0.2;
      _dummy.scale.set(scaleRand, scaleRand, scaleRand);
      _dummy.updateMatrix();

      this.instancedMesh.setMatrixAt(i, _dummy.matrix);

      // Random team jersey color
      const colorHex = jerseyPalette[Math.floor(Math.random() * jerseyPalette.length)];
      _color.setHex(colorHex);
      this.instancedMesh.setColorAt(i, _color);
    }

    this.instancedMesh.instanceMatrix.needsUpdate = true;
    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }

    this.group.add(this.instancedMesh);
  }

  /**
   * Procedural merged spectator geometry (torso + head + beanie pom-pom)
   */
  private createFanGeometry(): THREE.BufferGeometry {
    // 1. Torso (winter hockey coat)
    const torsoGeo = new THREE.BoxGeometry(0.5, 0.58, 0.35);
    torsoGeo.translate(0, 0.29, 0);

    // 2. Head
    const headGeo = new THREE.SphereGeometry(0.16, 8, 8);
    headGeo.translate(0, 0.68, 0);

    // 3. Beanie / Cap
    const beanieGeo = new THREE.CylinderGeometry(0.12, 0.17, 0.12, 8);
    beanieGeo.translate(0, 0.8, 0);

    // Merge using standard buffer geometry merging
    const merged = new THREE.BufferGeometry();
    const posList: number[] = [];
    const normList: number[] = [];

    [torsoGeo, headGeo, beanieGeo].forEach((geo) => {
      const pos = geo.attributes.position.array;
      const norm = geo.attributes.normal.array;
      for (let i = 0; i < pos.length; i++) {
        posList.push(pos[i]);
        normList.push(norm[i]);
      }
      geo.dispose();
    });

    merged.setAttribute('position', new THREE.Float32BufferAttribute(posList, 3));
    merged.setAttribute('normal', new THREE.Float32BufferAttribute(normList, 3));
    return merged;
  }

  /**
   * Trigger audience reaction / wave when Zamboni honks or finishes section
   */
  public cheer() {
    this.cheerIntensity = 1.0;
  }

  /**
   * Animate subtle crowd idle bobbing and celebratory wave
   */
  public update(dt: number) {
    this.crowdTimer += dt * 2.2;
    if (this.cheerIntensity > 0.001) {
      this.cheerIntensity = THREE.MathUtils.damp(this.cheerIntensity, 0, 1.8, dt);
    }

    // Only update a slice or subtle wave to keep FPS locked at 60
    const waveFreq = 1.8;
    for (let i = 0; i < this.totalFans; i += 4) {
      const p = this.basePositions[i];
      // Wave propagates around stadium
      const waveOffset = Math.sin(this.crowdTimer * waveFreq + (p.x * 0.15 + p.z * 0.15));
      const jumpY = this.cheerIntensity > 0.05 ? Math.max(0, Math.sin(this.crowdTimer * 6.0 + i)) * 0.45 * this.cheerIntensity : 0;

      _dummy.position.set(p.x, p.y + waveOffset * 0.04 + jumpY, p.z);
      _dummy.rotation.set(0, p.baseAngle, 0);
      _dummy.scale.set(1, 1 + jumpY * 0.3, 1);
      _dummy.updateMatrix();

      this.instancedMesh.setMatrixAt(i, _dummy.matrix);
    }
    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }

  public dispose() {
    this.instancedMesh.geometry.dispose();
    if (Array.isArray(this.instancedMesh.material)) {
      this.instancedMesh.material.forEach((m) => m.dispose());
    } else {
      this.instancedMesh.material.dispose();
    }
  }
}
