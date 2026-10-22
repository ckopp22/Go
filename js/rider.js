import * as THREE from './lib/three.module.min.js';
import { COL_X } from './plane.js';

const MOVE_TIME = 0.15;
const GRAVITY = 15.5; // floaty jump: ~0.8 s in the air, peak ~1.24
const JUMP_V = 6.2;
const FAST_FALL = -14;
const DUCK_TIME = 0.8;
const WHEEL_S = 0.7; // size of the one-wheel (board + tire) relative to the original
const WHEEL_R = 0.35 * WHEEL_S;
const BODY_Y = 0.76 * WHEEL_S; // where the rider's feet sit on the deck
const TURN_ANGLE = 0.9; // how far he swings toward the new lane (radians)
const TURN_LEAN = 0.45;
const GRACE = 0.15; // forgiveness on collision heights
const SCALE = 0.65; // overall rider size
const BASE_Y = 0.9; // camera focus height when standing (matches the plane's low lane)

const smooth = (t) => t * t * (3 - 2 * t);
const lam = (color) => new THREE.MeshLambertMaterial({ color, flatShading: true });

function part(parent, geom, material, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geom, material);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  parent.add(m);
  return m;
}

export const CHARACTERS = {
  boy: { name: 'Wesley', size: 1, skin: 0xf2c7a5, top: 0xffd23f, pants: 0x3d6fb5, shoes: 0xe8505b },
  girl: { name: 'Kaleyah', size: 1, skin: 0xf5cfb0, top: 0xb48cf2, pants: 0x39424e, shoes: 0xffffff, helmet: 0xff7eb6, hair: 0xf5d76e },
  kid: { name: 'Finley', size: 0.85, skin: 0xd9a47c, top: 0xff8a3d, pants: 0x6b7680, shoes: 0xffffff, helmet: 0x4caf6a },
};
export const CHARACTER_IDS = Object.keys(CHARACTERS);

// One-wheel rider (character picked with setCharacter). Same interface as Plane so Game can drive either one.
export class Rider {
  constructor(scene) {
    this.mesh = new THREE.Group();
    this.lean = new THREE.Group();
    this.lean.scale.setScalar(SCALE);
    this.lean.rotation.order = 'YXZ'; // turn, then pitch, then bank
    this.mesh.add(this.lean);

    // Wheel (spins) and deck
    this.wheel = new THREE.Group();
    this.wheel.scale.setScalar(WHEEL_S);
    this.wheel.position.y = WHEEL_R;
    part(this.wheel, new THREE.CylinderGeometry(0.35, 0.35, 0.26, 16), lam(0x2b2f36), 0, 0, 0, 0, 0, Math.PI / 2);
    part(this.wheel, new THREE.CylinderGeometry(0.22, 0.22, 0.28, 12), lam(0x2a8f9c), 0, 0, 0, 0, 0, Math.PI / 2);
    part(this.wheel, new THREE.BoxGeometry(0.3, 0.06, 0.1), lam(0xffffff), 0, 0.3, 0);
    this.lean.add(this.wheel);
    const dark = lam(0x39424e);
    const teal = lam(0x2a8f9c);
    const deck = new THREE.Group();
    deck.scale.setScalar(WHEEL_S);
    this.lean.add(deck);
    part(deck, new THREE.BoxGeometry(0.34, 0.07, 1.0), dark, 0, 0.72, 0);
    part(deck, new THREE.BoxGeometry(0.34, 0.09, 0.1), teal, 0, 0.75, -0.5);
    part(deck, new THREE.BoxGeometry(0.34, 0.09, 0.1), teal, 0, 0.75, 0.5);

    // Body, standing sideways on the deck and looking forward (-z). Scaled on y to duck.
    this.body = new THREE.Group();
    this.body.position.y = BODY_Y;
    this.lean.add(this.body);
    this.hair = null;
    this.setCharacter('boy');

    scene.add(this.mesh);
    this.reset();
  }

  // Rebuilds the body for a character (colors, helmet, hair, size).
  setCharacter(id) {
    const c = CHARACTERS[id] || CHARACTERS.boy;
    const b = this.body;
    for (const child of [...b.children]) {
      b.remove(child);
      child.traverse((o) => {
        o.geometry?.dispose();
        o.material?.dispose();
      });
    }
    this.size = c.size;
    const skin = lam(c.skin);
    const top = lam(c.top);
    const pants = lam(c.pants);
    const shoe = lam(c.shoes);
    part(b, new THREE.BoxGeometry(0.14, 0.1, 0.28), shoe, 0, 0.05, -0.28);
    part(b, new THREE.BoxGeometry(0.14, 0.1, 0.28), shoe, 0, 0.05, 0.3);
    part(b, new THREE.BoxGeometry(0.13, 0.61, 0.16), pants, 0, 0.37, -0.14, 0.48, 0, 0);
    part(b, new THREE.BoxGeometry(0.13, 0.61, 0.16), pants, 0, 0.37, 0.14, -0.48, 0, 0);
    part(b, new THREE.BoxGeometry(0.2, 0.5, 0.34), top, 0, 0.89, 0);
    part(b, new THREE.BoxGeometry(0.1, 0.45, 0.1), top, 0.05, 0.864, -0.327, 0.6, 0, 0);
    part(b, new THREE.BoxGeometry(0.1, 0.45, 0.1), top, 0.05, 0.864, 0.327, -0.6, 0, 0);
    part(b, new THREE.SphereGeometry(0.06, 8, 6), skin, 0.05, 0.68, -0.454);
    part(b, new THREE.SphereGeometry(0.06, 8, 6), skin, 0.05, 0.68, 0.454);
    part(b, new THREE.CylinderGeometry(0.07, 0.08, 0.1, 6), skin, 0, 1.17, 0);
    part(b, new THREE.SphereGeometry(0.22, 12, 10), skin, 0, 1.35, 0);
    this.hair = null;
    if (c.helmet) {
      part(b, new THREE.SphereGeometry(0.255, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), lam(c.helmet), 0, 1.36, 0);
    } else {
      part(b, new THREE.SphereGeometry(0.05, 6, 6), skin, -0.21, 1.33, 0);
      part(b, new THREE.SphereGeometry(0.05, 6, 6), skin, 0.21, 1.33, 0);
      if (!c.hair) part(b, new THREE.SphereGeometry(0.07, 8, 6), lam(0xfff0e0), 0.05, 1.52, -0.03); // shiny bald spot
    }
    if (c.hair) {
      const blonde = lam(c.hair);
      this.hair = new THREE.Group();
      this.hair.position.set(0, 1.4, 0.12);
      part(this.hair, new THREE.SphereGeometry(0.2, 10, 8), blonde, 0, -0.08, 0.02);
      part(this.hair, new THREE.CylinderGeometry(0.19, 0.1, 0.62, 8), blonde, 0, -0.4, 0.03);
      b.add(this.hair);
    }
    b.scale.set(this.size, this.size * (this.crouch ?? 1), this.size);
  }

  reset() {
    this.x = COL_X[1];
    this.col = 1;
    this.h = 0; // height above the ground
    this.vy = 0;
    this.y = BASE_Y; // camera focus height
    this.tx = { from: this.x, to: this.x, t: 1 };
    this.duckT = 0;
    this.crouch = 1;
    this.pitch = 0;
    this.roll = 0;
    this.yaw = 0;
    this.turnDir = 0;
    this.time = 0;
    this.crashed = false;
    this.idle = false;
    this.body.scale.setScalar(this.size);
    this.lean.rotation.set(0, 0, 0);
    this.mesh.position.set(this.x, 0, 0);
  }

  // Collision depth around the rider (shorter than the plane's, for more forgiveness).
  get reachFront() { return -0.4; }
  get reachBack() { return 0.3; }

  get airborne() {
    return this.h > 0 || this.vy > 0;
  }

  nearestCell() {
    let col = 0;
    for (let i = 1; i < COL_X.length; i++) {
      if (Math.abs(this.x - COL_X[i]) < Math.abs(this.x - COL_X[col])) col = i;
    }
    return { col, row: this.h > 0.5 ? 'high' : 'low' };
  }

  // Jump over floor obstacles, duck under ceiling ones, full ones always hit (same lane).
  hits(ud) {
    if (ud.type === 'full') return true;
    if (ud.type === 'floor') return this.h < ud.top - GRACE;
    const crouch = this.duckT > 0 ? 0.6 : this.crouch; // a duck counts as fully crouched right away
    const headTop = this.h + (BODY_Y + 1.57 * crouch) * SCALE;
    return headTop > ud.bottom + GRACE;
  }

  crash() {
    this.crashed = true;
    this.vyc = 3;
    this.vxc = (Math.random() - 0.5) * 2;
    this.fallDir = Math.random() < 0.5 ? -1 : 1;
    this.fall = 0;
  }

  move(dir) {
    if (this.crashed) return false;
    if (dir === 'up') {
      if (this.airborne) return false;
      this.vy = JUMP_V;
      this.duckT = 0;
      return true;
    }
    if (dir === 'down') {
      if (this.airborne) {
        this.vy = Math.min(this.vy, FAST_FALL);
        return true;
      }
      if (this.duckT > 0) return false;
      this.duckT = DUCK_TIME;
      return true;
    }
    const col = Math.max(0, Math.min(2, this.col + (dir === 'left' ? -1 : 1)));
    if (col === this.col) return false;
    this.col = col;
    this.tx = { from: this.x, to: COL_X[col], t: 0 };
    this.turnDir = dir === 'left' ? 1 : -1; // +yaw swings left
    return true;
  }

  update(dt, speed = 0) {
    this.time += dt;
    this.wheel.rotation.x -= (speed * dt) / WHEEL_R;

    if (this.crashed) {
      this.vyc -= 14 * dt;
      this.h = Math.max(0, this.h + this.vyc * dt);
      this.x = Math.max(-2, Math.min(2, this.x + this.vxc * dt));
      if (this.h === 0) {
        this.vyc = 0;
        this.vxc *= Math.exp(-8 * dt);
      }
      this.fall = Math.min(1, this.fall + dt * 3);
      this.lean.rotation.z = this.fallDir * 1.4 * smooth(this.fall);
      this.lean.rotation.x = -0.3 * this.fall;
      this.mesh.position.set(this.x, this.h, 0);
      this.y = BASE_Y + this.h;
      return;
    }

    let vx = 0;
    if (this.idle) {
      const nx = Math.sin(this.time * 0.7) * 0.9;
      vx = dt > 0 ? (nx - this.x) / dt : 0;
      this.x = nx;
    } else if (this.tx.t < 1) {
      const tw = this.tx;
      const prev = this.x;
      tw.t = Math.min(1, tw.t + dt / MOVE_TIME);
      this.x = tw.from + (tw.to - tw.from) * smooth(tw.t);
      vx = dt > 0 ? (this.x - prev) / dt : 0;
    }

    if (this.airborne) {
      this.vy -= GRAVITY * dt;
      this.h += this.vy * dt;
      if (this.h <= 0) {
        this.h = 0;
        this.vy = 0;
      }
    }

    if (this.duckT > 0) this.duckT -= dt;
    this.crouch += ((this.duckT > 0 ? 0.6 : 1) - this.crouch) * (1 - Math.exp(-30 * dt));
    this.body.scale.set(this.size, this.size * this.crouch, this.size);
    if (this.hair) {
      const flow = 0.1 + Math.min(1, speed / 28) * 0.45;
      this.hair.rotation.x = -flow + Math.sin(this.time * 7) * 0.05 + this.vy * 0.02;
    }

    const k = 1 - Math.exp(-14 * dt);
    const clamp = (v, m) => Math.max(-m, Math.min(m, v));
    if (this.idle) {
      this.roll += (clamp(-vx * 0.05, 0.5) - this.roll) * k;
      this.yaw += (clamp(-vx * 0.04, 0.45) - this.yaw) * k;
    } else {
      // Swing toward the new lane, and straighten out as soon as he gets there.
      const turning = this.tx.t < 1 ? this.turnDir : 0;
      const kt = 1 - Math.exp(-18 * dt);
      this.roll += (turning * TURN_LEAN - this.roll) * kt;
      this.yaw += (turning * TURN_ANGLE - this.yaw) * kt;
    }
    this.pitch += (clamp(this.vy * 0.025, 0.35) - this.pitch) * k;
    this.lean.rotation.z = this.roll;
    this.lean.rotation.x = this.pitch;
    this.lean.rotation.y = this.yaw;

    const bob = this.airborne ? 0 : Math.sin(this.time * 9) * 0.015;
    this.mesh.position.set(this.x, this.h + bob, 0);
    this.y = BASE_Y + this.h;
  }
}
