import * as THREE from './lib/three.module.min.js';

export const HALL_W = 4.4;
export const HALL_H = 4;
const SEG_LEN = 8;
const SEG_COUNT = 12;
const RECYCLE_Z = SEG_LEN / 2 + 6; // segment fully behind the camera

const THEMES = {
  hall: { sky: 0xcfe8f5, fogNear: 18, fogFar: 78, hemiSky: 0xffffff, hemiGround: 0xb4c3d0, hemiI: 1.6, sun: 0xffffff, sunI: 1.0 },
  outdoor: { sky: 0xa8dcff, fogNear: 28, fogFar: 88, hemiSky: 0xd6efff, hemiGround: 0x8ab87a, hemiI: 1.5, sun: 0xfff1cf, sunI: 1.4 },
};

const lambert = (color) => new THREE.MeshLambertMaterial({ color });
const mats = {
  floor: lambert(0xd9dde2),
  ceiling: lambert(0xf4f7fa),
  wall: lambert(0xe6f1f8),
  stripeL: lambert(0x3fb8c4),
  stripeR: lambert(0x5b9bd5),
  rail: lambert(0xc9a27a),
  panel: new THREE.MeshBasicMaterial({ color: 0xffffff }),
  door: lambert(0x9ec5d8),
  plate: lambert(0xffffff),
  frame: lambert(0x8d6e63),
  sign: lambert(0xfff3d6),
  pot: lambert(0xc0654a),
  leaf: lambert(0x4caf6a),
};

const geo = {
  floor: new THREE.BoxGeometry(HALL_W, 0.1, SEG_LEN),
  wall: new THREE.BoxGeometry(0.1, HALL_H, SEG_LEN),
  stripe: new THREE.BoxGeometry(0.03, 0.16, SEG_LEN),
  rail: new THREE.BoxGeometry(0.07, 0.07, SEG_LEN),
  panel: new THREE.BoxGeometry(1.4, 0.04, 2.4),
  door: new THREE.BoxGeometry(0.05, 2.3, 1.3),
  plate: new THREE.BoxGeometry(0.03, 0.2, 0.36),
  frame: new THREE.BoxGeometry(0.04, 0.7, 1.0),
  sign: new THREE.BoxGeometry(0.05, 0.56, 0.84),
  pot: new THREE.CylinderGeometry(0.2, 0.15, 0.4, 8),
  leaf: new THREE.IcosahedronGeometry(0.3, 0),
};

function mesh(g, m, x, y, z) {
  const o = new THREE.Mesh(g, m);
  o.position.set(x, y, z);
  return o;
}

function buildSegment(i) {
  const g = new THREE.Group();
  const half = HALL_W / 2;

  g.add(mesh(geo.floor, mats.floor, 0, -0.05, 0));
  g.add(mesh(geo.floor, mats.ceiling, 0, HALL_H + 0.05, 0));
  for (const s of [-1, 1]) {
    g.add(mesh(geo.wall, mats.wall, s * (half + 0.05), HALL_H / 2, 0));
    g.add(mesh(geo.stripe, s < 0 ? mats.stripeL : mats.stripeR, s * (half - 0.015), 1.5, 0));
    g.add(mesh(geo.rail, mats.rail, s * (half - 0.04), 0.95, 0));
  }
  g.add(mesh(geo.panel, mats.panel, 0, HALL_H - 0.02, 0));

  // Wall details alternate sides so the corridor feels varied while still recycling cleanly.
  const side = i % 2 === 0 ? -1 : 1;
  const wallX = side * (half - 0.025);
  g.add(mesh(geo.door, mats.door, wallX, 1.15, -1.2));
  g.add(mesh(geo.plate, mats.plate, wallX, 2.6, -1.2));

  if (i % 3 === 0) {
    const px = -side * (half - 0.35);
    g.add(mesh(geo.pot, mats.pot, px, 0.2, 2.4));
    g.add(mesh(geo.leaf, mats.leaf, px, 0.65, 2.4));
  }
  if (i % 4 === 1) {
    const sx = -side * (half - 0.02);
    g.add(mesh(geo.frame, mats.frame, sx, 2.1, 1.8));
    g.add(mesh(geo.sign, mats.sign, sx + -side * 0.03, 2.1, 1.8));
  }
  return bake(g);
}

// Merges a segment's meshes into one mesh per material to cut draw calls.
function bake(group) {
  const byMat = new Map();
  for (const m of group.children) {
    m.updateMatrix();
    const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
    g.applyMatrix4(m.matrix);
    if (!byMat.has(m.material)) byMat.set(m.material, []);
    byMat.get(m.material).push(g);
  }
  group.clear();
  for (const [material, geos] of byMat) {
    const count = geos.reduce((n, g) => n + g.attributes.position.count, 0);
    const pos = new Float32Array(count * 3);
    const nor = new Float32Array(count * 3);
    let at = 0;
    for (const g of geos) {
      pos.set(g.attributes.position.array, at);
      nor.set(g.attributes.normal.array, at);
      at += g.attributes.position.count * 3;
      g.dispose();
    }
    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    merged.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    group.add(new THREE.Mesh(merged, material));
  }
  return group;
}

// ---- Outdoor theme (One-Wheel mode) ----
const om = {
  path: lambert(0xb9bdc2),
  dash: lambert(0xffffff),
  curb: lambert(0xe3e6e9),
  grassA: lambert(0x7ccf6b),
  grassB: lambert(0x6fc25f),
  trunk: lambert(0x8d6e63),
  leafA: lambert(0x4caf6a),
  leafB: lambert(0x66c26a),
  bush: lambert(0x3f9d5a),
  wood: lambert(0xc9a27a),
  pole: lambert(0x6b7680),
  lamp: new THREE.MeshBasicMaterial({ color: 0xfff2b0 }),
};
const og = {
  path: new THREE.BoxGeometry(HALL_W, 0.1, SEG_LEN),
  grass: new THREE.BoxGeometry(14, 0.1, SEG_LEN),
  curb: new THREE.BoxGeometry(0.2, 0.14, SEG_LEN),
  dash: new THREE.BoxGeometry(0.1, 0.02, 1.4),
  rail: new THREE.BoxGeometry(0.06, 0.08, SEG_LEN),
  post: new THREE.BoxGeometry(0.1, 0.7, 0.1),
  trunk: new THREE.CylinderGeometry(0.18, 0.25, 1.6, 6),
  cone: new THREE.ConeGeometry(1.0, 2.4, 7),
  ball: new THREE.IcosahedronGeometry(0.9, 0),
  bush: new THREE.IcosahedronGeometry(0.45, 0),
  lampPole: new THREE.CylinderGeometry(0.05, 0.07, 3.2, 6),
  lampHead: new THREE.BoxGeometry(0.5, 0.12, 0.3),
};

// Deterministic pseudo-random in [0, 1) so each recycled slot keeps its own look.
const rand = (i, k) => {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

function buildOutdoorSegment(i) {
  const g = new THREE.Group();
  const edge = HALL_W / 2;

  g.add(mesh(og.path, om.path, 0, -0.05, 0));
  for (const s of [-1, 1]) {
    g.add(mesh(og.grass, i % 2 ? om.grassA : om.grassB, s * (edge + 7.2), -0.06, 0));
    g.add(mesh(og.curb, om.curb, s * (edge + 0.1), 0.07, 0));
    g.add(mesh(og.rail, om.wood, s * (edge + 0.7), 0.5, 0));
    g.add(mesh(og.post, om.wood, s * (edge + 0.7), 0.35, -2));
    g.add(mesh(og.post, om.wood, s * (edge + 0.7), 0.35, 2));
  }
  for (const x of [-0.675, 0.675]) g.add(mesh(og.dash, om.dash, x, 0.011, 0));

  [-1, 1].forEach((s, k) => {
    const x = s * (edge + 1.6 + rand(i, k) * 2.4);
    const z = (rand(i, k + 2) - 0.5) * 6;
    const size = 0.8 + rand(i, k + 4) * 0.6;
    const leaf = rand(i, k + 6) < 0.5 ? om.leafA : om.leafB;
    const trunk = mesh(og.trunk, om.trunk, x, 0.8 * size, z);
    trunk.scale.setScalar(size);
    g.add(trunk);
    const crown = mesh(rand(i, k + 8) < 0.5 ? og.cone : og.ball, leaf, x, 2.4 * size, z);
    crown.scale.setScalar(size);
    g.add(crown);
  });

  const bx = (rand(i, 11) < 0.5 ? -1 : 1) * (edge + 1.0 + rand(i, 12));
  g.add(mesh(og.bush, om.bush, bx, 0.35, (rand(i, 13) - 0.5) * 6));

  if (i % 3 === 0) {
    const side = i % 2 ? -1 : 1;
    g.add(mesh(og.lampPole, om.pole, side * (edge + 0.5), 1.6, 3));
    g.add(mesh(og.lampHead, om.lamp, side * (edge + 0.3), 3.2, 3));
  }
  return bake(g);
}

export class World {
  constructor(scene) {
    this.scene = scene;
    scene.background = new THREE.Color();
    scene.fog = new THREE.Fog(0xffffff, 1, 2);

    this.hemi = new THREE.HemisphereLight();
    this.sun = new THREE.DirectionalLight();
    this.sun.position.set(1, 4, 3);
    scene.add(this.hemi, this.sun);

    // Both themes are prebuilt and kept in step; only the active one is visible.
    this.sets = { hall: [], outdoor: [] };
    const builders = { hall: buildSegment, outdoor: buildOutdoorSegment };
    for (const name of Object.keys(this.sets)) {
      for (let i = 0; i < SEG_COUNT; i++) {
        const seg = builders[name](i);
        seg.position.z = SEG_LEN - i * SEG_LEN;
        scene.add(seg);
        this.sets[name].push(seg);
      }
    }
    this.setTheme('hall');
  }

  setTheme(name) {
    const t = THEMES[name];
    for (const [key, segs] of Object.entries(this.sets)) for (const seg of segs) seg.visible = key === name;
    this.scene.background.set(t.sky);
    this.scene.fog.color.set(t.sky);
    this.scene.fog.near = t.fogNear;
    this.scene.fog.far = t.fogFar;
    this.hemi.color.set(t.hemiSky);
    this.hemi.groundColor.set(t.hemiGround);
    this.hemi.intensity = t.hemiI;
    this.sun.color.set(t.sun);
    this.sun.intensity = t.sunI;
  }

  update(dt, speed) {
    const dz = speed * dt;
    for (const segs of Object.values(this.sets)) {
      for (const seg of segs) {
        seg.position.z += dz;
        if (seg.position.z > RECYCLE_Z) seg.position.z -= SEG_COUNT * SEG_LEN;
      }
    }
  }
}
