import * as THREE from './lib/three.module.min.js';

const POOL = 40;
const SPIN = 4; // coin-style spin around the vertical axis

function starShape(outer, inner) {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? inner : outer;
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255, 236, 140, 0.9)');
  g.addColorStop(0.4, 'rgba(255, 210, 63, 0.35)');
  g.addColorStop(1, 'rgba(255, 210, 63, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

// Pooled glowing collectible stars. They scroll with the world; the game decides what collects them.
export class Stars {
  constructor(scene) {
    const geo = new THREE.ExtrudeGeometry(starShape(0.17, 0.075), { depth: 0.05, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.012, bevelSegments: 1 });
    geo.center();
    const mat = new THREE.MeshLambertMaterial({ color: 0xffd23f, emissive: 0xb07d00 });
    const glow = new THREE.SpriteMaterial({
      map: glowTexture(),
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });

    this.free = [];
    this.active = [];
    this.time = 0;
    for (let i = 0; i < POOL; i++) {
      const g = new THREE.Group();
      g.userData.mesh = new THREE.Mesh(geo, mat);
      const halo = new THREE.Sprite(glow);
      halo.scale.set(0.8, 0.8, 1);
      g.add(g.userData.mesh, halo);
      g.userData.halo = halo;
      g.visible = false;
      scene.add(g);
      this.free.push(g);
    }
  }

  spawn(x, y, z) {
    const s = this.free.pop();
    if (!s) return;
    s.position.set(x, y, z);
    s.userData.baseY = y;
    s.userData.phase = Math.random() * 6;
    s.visible = true;
    this.active.push(s);
  }

  clear() {
    for (const s of this.active) {
      s.visible = false;
      this.free.push(s);
    }
    this.active.length = 0;
  }

  // collect(star) returns true when the star was picked up (it is then removed).
  update(dt, scroll, collect) {
    this.time += dt;
    for (let i = this.active.length - 1; i >= 0; i--) {
      const s = this.active[i];
      s.position.z += scroll * dt;
      s.userData.mesh.rotation.y += SPIN * dt;
      s.position.y = s.userData.baseY + Math.sin(this.time * 3 + s.userData.phase) * 0.03;
      const pulse = 0.8 + Math.sin(this.time * 5 + s.userData.phase) * 0.08;
      s.userData.halo.scale.set(pulse, pulse, 1);
      if ((collect && collect(s)) || s.position.z > 8) {
        s.visible = false;
        this.active.splice(i, 1);
        this.free.push(s);
      }
    }
  }
}
