/**
 * ParticleSystem
 * High-performance pooled particle system for:
 * - Shaved ice snow particles flying into the snow tank hopper
 * - Wet water mist droplets trailing the rear squeegee
 * - Diesel engine exhaust steam puffs
 * Zero dynamic garbage collection per frame.
 */

import * as THREE from 'three';

interface Particle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  color: THREE.Color;
  active: boolean;
}

export class ParticleSystem {
  public group: THREE.Group;

  private maxSnowParticles = 300;
  private snowPool: Particle[] = [];
  private snowGeo: THREE.BufferGeometry;
  private snowPositions: Float32Array;
  private snowColors: Float32Array;
  private snowPoints: THREE.Points;

  private maxMistParticles = 200;
  private mistPool: Particle[] = [];
  private mistGeo: THREE.BufferGeometry;
  private mistPositions: Float32Array;
  private mistPoints: THREE.Points;

  constructor() {
    this.group = new THREE.Group();

    // 1. Snow Particles Setup
    this.snowPositions = new Float32Array(this.maxSnowParticles * 3);
    this.snowColors = new Float32Array(this.maxSnowParticles * 3);

    for (let i = 0; i < this.maxSnowParticles; i++) {
      this.snowPool.push({
        pos: new THREE.Vector3(0, -100, 0),
        vel: new THREE.Vector3(0, 0, 0),
        life: 0,
        maxLife: 1.0,
        size: 0.1,
        color: new THREE.Color(0xffffff),
        active: false,
      });
      this.snowPositions[i * 3 + 1] = -100;
      this.snowColors[i * 3] = 1.0;
      this.snowColors[i * 3 + 1] = 1.0;
      this.snowColors[i * 3 + 2] = 1.0;
    }

    this.snowGeo = new THREE.BufferGeometry();
    this.snowGeo.setAttribute('position', new THREE.BufferAttribute(this.snowPositions, 3));
    this.snowGeo.setAttribute('color', new THREE.BufferAttribute(this.snowColors, 3));

    const snowMat = new THREE.PointsMaterial({
      size: 0.16,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    this.snowPoints = new THREE.Points(this.snowGeo, snowMat);
    this.group.add(this.snowPoints);

    // 2. Water Mist Particles Setup
    this.mistPositions = new Float32Array(this.maxMistParticles * 3);
    for (let i = 0; i < this.maxMistParticles; i++) {
      this.mistPool.push({
        pos: new THREE.Vector3(0, -100, 0),
        vel: new THREE.Vector3(0, 0, 0),
        life: 0,
        maxLife: 0.8,
        size: 0.12,
        color: new THREE.Color(0xaae5ff),
        active: false,
      });
      this.mistPositions[i * 3 + 1] = -100;
    }

    this.mistGeo = new THREE.BufferGeometry();
    this.mistGeo.setAttribute('position', new THREE.BufferAttribute(this.mistPositions, 3));

    const mistMat = new THREE.PointsMaterial({
      size: 0.22,
      color: 0x93e1fc,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    });
    this.mistPoints = new THREE.Points(this.mistGeo, mistMat);
    this.group.add(this.mistPoints);
  }

  /**
   * Emit shaved ice snow from auger chute
   */
  public emitSnow(originX: number, originY: number, originZ: number, count = 3) {
    let emitted = 0;
    for (let i = 0; i < this.maxSnowParticles && emitted < count; i++) {
      const p = this.snowPool[i];
      if (!p.active) {
        p.active = true;
        p.life = 0;
        p.maxLife = 0.5 + Math.random() * 0.4;
        p.pos.set(
          originX + (Math.random() - 0.5) * 0.3,
          originY + (Math.random() - 0.5) * 0.2,
          originZ + (Math.random() - 0.5) * 0.3
        );
        p.vel.set(
          (Math.random() - 0.5) * 1.5,
          1.8 + Math.random() * 2.2,
          (Math.random() - 0.5) * 1.5
        );
        emitted++;
      }
    }
  }

  /**
   * Emit water mist behind conditioner squeegee
   */
  public emitMist(originX: number, originZ: number, yaw: number, count = 2) {
    let emitted = 0;
    for (let i = 0; i < this.maxMistParticles && emitted < count; i++) {
      const p = this.mistPool[i];
      if (!p.active) {
        p.active = true;
        p.life = 0;
        p.maxLife = 0.4 + Math.random() * 0.3;
        // Spread along wide conditioner width
        const spread = (Math.random() - 0.5) * 3.6;
        const cosYaw = Math.cos(yaw);
        const sinYaw = Math.sin(yaw);

        p.pos.set(
          originX + cosYaw * spread,
          0.05 + Math.random() * 0.1,
          originZ - sinYaw * spread
        );
        p.vel.set(
          (Math.random() - 0.5) * 0.3,
          0.2 + Math.random() * 0.4,
          (Math.random() - 0.5) * 0.3
        );
        emitted++;
      }
    }
  }

  /**
   * Update all particle physics
   */
  public update(dt: number) {
    // 1. Update Snow Particles
    for (let i = 0; i < this.maxSnowParticles; i++) {
      const p = this.snowPool[i];
      if (p.active) {
        p.life += dt;
        if (p.life >= p.maxLife) {
          p.active = false;
          p.pos.y = -100;
        } else {
          // Gravity
          p.vel.y -= 9.8 * dt;
          p.pos.x += p.vel.x * dt;
          p.pos.y += p.vel.y * dt;
          p.pos.z += p.vel.z * dt;

          if (p.pos.y < 0.05) {
            p.pos.y = 0.05;
            p.vel.y = 0;
          }
        }

        this.snowPositions[i * 3] = p.pos.x;
        this.snowPositions[i * 3 + 1] = p.pos.y;
        this.snowPositions[i * 3 + 2] = p.pos.z;
      }
    }
    this.snowGeo.attributes.position.needsUpdate = true;

    // 2. Update Mist Particles
    for (let i = 0; i < this.maxMistParticles; i++) {
      const p = this.mistPool[i];
      if (p.active) {
        p.life += dt;
        if (p.life >= p.maxLife) {
          p.active = false;
          p.pos.y = -100;
        } else {
          p.pos.x += p.vel.x * dt;
          p.pos.y += p.vel.y * dt;
          p.pos.z += p.vel.z * dt;
        }

        this.mistPositions[i * 3] = p.pos.x;
        this.mistPositions[i * 3 + 1] = p.pos.y;
        this.mistPositions[i * 3 + 2] = p.pos.z;
      }
    }
    this.mistGeo.attributes.position.needsUpdate = true;
  }

  public dispose() {
    this.snowGeo.dispose();
    this.mistGeo.dispose();
  }
}
