import * as THREE from './lib/three.module.min.js';

const N = 30; // samples kept
const INTERVAL = 0.03; // seconds between samples
const LIFE = 0.9;
const HALF_WIDTH = 0.07;
const COLOR = [0.45, 0.88, 0.92];

// A fading ribbon laid on the ground behind the one-wheel. It scrolls with the world,
// so lane changes leave a curved track. One fixed geometry, rewritten each frame.
export class Trail {
  constructor(scene) {
    const P = N + 1; // point 0 is the live wheel position
    this.xs = new Float32Array(N);
    this.zs = new Float32Array(N);
    this.ages = new Float32Array(N).fill(LIFE);
    this.vis = new Float32Array(N);
    this.head = 0;
    this.acc = 0;
    this.lastX = null;

    this.pos = new Float32Array(P * 2 * 3);
    this.col = new Float32Array(P * 2 * 4);
    const index = [];
    for (let p = 0; p < P - 1; p++) {
      const a = p * 2;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 4));
    geo.setIndex(index);
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
    this.clear();
  }

  clear() {
    this.ages.fill(LIFE);
    this.lastX = null;
    this.write(0, 0);
  }

  // scroll: world speed (units/s). grounded: only draw while the wheel touches the ground.
  update(dt, scroll, x, grounded) {
    if (this.lastX !== null && Math.abs(x - this.lastX) > 0.6) this.clear(); // teleport (reset)
    this.lastX = x;

    for (let i = 0; i < N; i++) {
      this.ages[i] += dt;
      this.zs[i] += scroll * dt;
    }
    this.acc += dt;
    if (this.acc >= INTERVAL) {
      this.acc = 0;
      this.head = (this.head + 1) % N;
      this.xs[this.head] = x;
      this.zs[this.head] = 0.1;
      this.ages[this.head] = 0;
      this.vis[this.head] = grounded ? 1 : 0;
    }
    this.write(x, grounded ? 1 : 0);
  }

  write(liveX, liveVis) {
    for (let p = 0; p <= N; p++) {
      let x = liveX;
      let z = 0.1;
      let age = 0;
      let vis = liveVis;
      if (p > 0) {
        const i = (this.head - (p - 1) + N) % N;
        x = this.xs[i];
        z = this.zs[i];
        age = this.ages[i];
        vis = this.vis[i];
      }
      const life = Math.max(0, 1 - age / LIFE);
      const alpha = vis * life * 0.75;
      const half = HALF_WIDTH * (0.4 + 0.6 * life);
      for (let s = 0; s < 2; s++) {
        const v = p * 2 + s;
        this.pos[v * 3] = x + (s ? half : -half);
        this.pos[v * 3 + 1] = 0.04;
        this.pos[v * 3 + 2] = z;
        this.col[v * 4] = COLOR[0];
        this.col[v * 4 + 1] = COLOR[1];
        this.col[v * 4 + 2] = COLOR[2];
        this.col[v * 4 + 3] = alpha;
      }
    }
    const g = this.mesh.geometry.attributes;
    g.position.needsUpdate = true;
    g.color.needsUpdate = true;
  }
}
