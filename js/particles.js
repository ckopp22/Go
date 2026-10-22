import * as THREE from './lib/three.module.min.js';

const COUNT = 48;
const GRAVITY = 9;
const LIFE = 1.0;
const PALETTE = [[1, 1, 1], [0.88, 0.9, 0.93], [0.77, 0.8, 0.84], [1, 0.82, 0.25]];

// One fixed pool of paper-scrap points, reused for every crash burst.
export class Particles {
  constructor(scene) {
    this.pos = new Float32Array(COUNT * 3);
    this.vel = new Float32Array(COUNT * 3);
    this.t = LIFE;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3));
    this.material = new THREE.PointsMaterial({ size: 0.16, vertexColors: true, transparent: true, depthWrite: false });
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    this.points.visible = false;
    scene.add(this.points);
  }

  burst(x, y, z) {
    const color = this.points.geometry.attributes.color;
    for (let i = 0; i < COUNT; i++) {
      const k = i * 3;
      this.pos[k] = x;
      this.pos[k + 1] = y;
      this.pos[k + 2] = z;
      const a = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3.5;
      this.vel[k] = Math.cos(a) * speed;
      this.vel[k + 1] = 1 + Math.random() * 4;
      this.vel[k + 2] = Math.sin(a) * speed;
      color.setXYZ(i, ...PALETTE[(Math.random() * PALETTE.length) | 0]);
    }
    color.needsUpdate = true;
    this.t = 0;
    this.material.opacity = 1;
    this.points.visible = true;
  }

  // scroll moves the particles with the hallway so they don't hang in place.
  update(dt, scroll = 0) {
    if (!this.points.visible) return;
    this.t += dt;
    if (this.t >= LIFE) {
      this.points.visible = false;
      return;
    }
    for (let i = 0; i < COUNT; i++) {
      const k = i * 3;
      this.vel[k + 1] -= GRAVITY * dt;
      this.pos[k] += this.vel[k] * dt;
      this.pos[k + 1] = Math.max(0.05, this.pos[k + 1] + this.vel[k + 1] * dt);
      this.pos[k + 2] += this.vel[k + 2] * dt + scroll * dt;
    }
    this.material.opacity = 1 - this.t / LIFE;
    this.points.geometry.attributes.position.needsUpdate = true;
  }
}
