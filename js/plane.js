import * as THREE from './lib/three.module.min.js';

export const LANE_Y = { high: 3.1, low: 0.9 };
export const COL_X = [-1.35, 0, 1.35];
const LANE_TIME = 0.15;
const MAX_PITCH = 0.6;

const smooth = (t) => t * t * (3 - 2 * t);

function tri(a, b, c) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c], 3));
  g.computeVertexNormals();
  return g;
}

export class Plane {
  constructor(scene) {
    this.row = 'low';
    this.col = 1;
    this.y = LANE_Y.low;
    this.x = COL_X[1];
    this.ty = { from: this.y, to: this.y, t: 1 };
    this.tx = { from: this.x, to: this.x, t: 1 };
    this.pitch = 0;
    this.roll = 0;
    this.time = 0;
    this.crashed = false;
    this.idle = false; // menu mode: drift in a gentle loop

    // Nose points toward -z. Vertices: nose, wing tips, rear ridge, keel bottom.
    const nose = [0, 0, -1.0];
    const lw = [-0.62, 0.1, 0.8];
    const rw = [0.62, 0.1, 0.8];
    const ridge = [0, -0.02, 0.8];
    const keel = [0, -0.3, 0.8];

    const white = new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide, flatShading: true });
    const gray = new THREE.MeshLambertMaterial({ color: 0xc4cad1, side: THREE.DoubleSide, flatShading: true });
    const shade = new THREE.MeshLambertMaterial({ color: 0xe3e7ec, side: THREE.DoubleSide, flatShading: true });

    this.mesh = new THREE.Group();
    this.mesh.add(new THREE.Mesh(tri(nose, lw, ridge), white));
    this.mesh.add(new THREE.Mesh(tri(nose, ridge, rw), shade));
    this.mesh.add(new THREE.Mesh(tri(nose, ridge, keel), gray));
    this.mesh.position.set(this.x, this.y, 0);
    scene.add(this.mesh);
  }

  nearestCell() {
    let col = 0;
    for (let i = 1; i < COL_X.length; i++) {
      if (Math.abs(this.x - COL_X[i]) < Math.abs(this.x - COL_X[col])) col = i;
    }
    return { col, row: this.y > (LANE_Y.high + LANE_Y.low) / 2 ? 'high' : 'low' };
  }

  // Does an obstacle's blocked rows include the row the plane is in?
  hits(ud) {
    return ud.blocks.includes(this.nearestCell().row);
  }

  crash() {
    this.crashed = true;
    this.vyc = 2;
    this.vxc = (Math.random() - 0.5) * 2;
    this.spinX = -6;
    this.spinZ = (Math.random() < 0.5 ? -1 : 1) * 8;
    this.mesh.scale.set(1, 1, 0.8);
  }

  reset() {
    this.row = 'low';
    this.col = 1;
    this.y = LANE_Y.low;
    this.x = COL_X[1];
    this.ty = { from: this.y, to: this.y, t: 1 };
    this.tx = { from: this.x, to: this.x, t: 1 };
    this.pitch = 0;
    this.roll = 0;
    this.crashed = false;
    this.idle = false;
    this.mesh.scale.set(1, 1, 1);
    this.mesh.rotation.set(0, 0, 0);
  }

  move(dir) {
    if (this.crashed) return false;
    if (dir === 'up' || dir === 'down') {
      const row = dir === 'up' ? 'high' : 'low';
      if (row === this.row) return false;
      this.row = row;
      this.ty = { from: this.y, to: LANE_Y[row], t: 0 };
    } else {
      const col = Math.max(0, Math.min(2, this.col + (dir === 'left' ? -1 : 1)));
      if (col === this.col) return false;
      this.col = col;
      this.tx = { from: this.x, to: COL_X[col], t: 0 };
    }
    return true;
  }

  // Advances a tween and returns [value, velocity].
  step(tw, dt) {
    if (tw.t >= 1) return [tw.to, 0];
    const prev = tw.from + (tw.to - tw.from) * smooth(tw.t);
    tw.t = Math.min(1, tw.t + dt / LANE_TIME);
    const v = tw.from + (tw.to - tw.from) * smooth(tw.t);
    return [v, dt > 0 ? (v - prev) / dt : 0];
  }

  update(dt) {
    if (this.crashed) {
      this.vyc -= 14 * dt;
      this.y = Math.max(0.12, this.y + this.vyc * dt);
      this.x = Math.max(-2, Math.min(2, this.x + this.vxc * dt));
      if (this.y <= 0.12) {
        const damp = Math.exp(-8 * dt);
        this.vyc = 0;
        this.vxc *= damp;
        this.spinX *= damp;
        this.spinZ *= damp;
      }
      this.mesh.position.set(this.x, this.y, 0);
      this.mesh.rotation.x += this.spinX * dt;
      this.mesh.rotation.z += this.spinZ * dt;
      return;
    }
    this.time += dt;
    let vy, vx;
    if (this.idle) {
      const nx = Math.sin(this.time * 0.7) * 0.9;
      const ny = 2 + Math.sin(this.time * 1.1) * 0.7;
      vx = dt > 0 ? (nx - this.x) / dt : 0;
      vy = dt > 0 ? (ny - this.y) / dt : 0;
      this.x = nx;
      this.y = ny;
    } else {
      [this.y, vy] = this.step(this.ty, dt);
      [this.x, vx] = this.step(this.tx, dt);
    }

    const k = 1 - Math.exp(-18 * dt);
    const clamp = (v) => Math.max(-MAX_PITCH, Math.min(MAX_PITCH, v));
    this.pitch += (clamp(vy * 0.03) - this.pitch) * k;
    this.roll += (clamp(-vx * 0.05) - this.roll) * k;

    const bob = Math.sin(this.time * 3) * 0.04;
    this.mesh.position.set(this.x, this.y + bob, 0);
    this.mesh.rotation.x = this.pitch + Math.sin(this.time * 2.2) * 0.03;
    this.mesh.rotation.z = this.roll + Math.sin(this.time * 1.7) * 0.05;
  }
}
