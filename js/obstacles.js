import * as THREE from './lib/three.module.min.js';
import { HALL_H } from './world.js';

const POOL_PER_MODEL = 4;
const OVERHEAD_SCALE = 0.62; // lowers outdoor overhead obstacles to suit the smaller rider

// Shared geometries and materials (cached by their parameters).
const geoCache = new Map();
const matCache = new Map();
const cached = (map, key, make) => {
  if (!map.has(key)) map.set(key, make());
  return map.get(key);
};
const box = (w, h, d) => cached(geoCache, `b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d));
const cyl = (rt, rb, h, s = 10) => cached(geoCache, `c${rt},${rb},${h},${s}`, () => new THREE.CylinderGeometry(rt, rb, h, s));
const cone = (r, h, sides = 8) => cached(geoCache, `n${r},${h},${sides}`, () => new THREE.ConeGeometry(r, h, sides));
const rockGeo = (r) => cached(geoCache, `i${r}`, () => new THREE.IcosahedronGeometry(r, 0));
const ball = (r) => cached(geoCache, `s${r}`, () => new THREE.SphereGeometry(r, 10, 8));
const mat = (color, opts) => cached(matCache, `${color}${opts ? JSON.stringify(opts) : ''}`, () => new THREE.MeshLambertMaterial({ color, ...opts }));
const glow = (color) => cached(matCache, `g${color}`, () => new THREE.MeshBasicMaterial({ color }));

function add(group, geom, material, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geom, material);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  group.add(m);
  return m;
}

function wheel(g, r, x, y, z) {
  add(g, cyl(r, r, 0.08, 10), mat(0x2b2f36), x, y, z, 0, 0, Math.PI / 2);
}

function signTexture(text, bg) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 96;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 256, 96);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 36px -apple-system, Helvetica, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 50);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---- Floor obstacles (block the LOW lane, player flies UP) ----
const floorModels = [
  function gurney(g) {
    add(g, box(0.7, 0.5, 1.9), mat(0x9aa5b1), 0, 0.35, 0);
    add(g, box(0.95, 0.4, 2.1), mat(0xffffff), 0, 0.75, 0);
    add(g, box(0.97, 0.1, 1.4), mat(0x5b9bd5), 0, 1.0, 0.3);
    add(g, box(0.7, 0.15, 0.4), mat(0xf4f7fa), 0, 1.07, -0.8);
    for (const s of [-1, 1]) {
      add(g, box(0.04, 0.3, 1.6), mat(0xc4cad1), s * 0.5, 1.1, 0);
      wheel(g, 0.12, s * 0.35, 0.12, -0.8);
      wheel(g, 0.12, s * 0.35, 0.12, 0.8);
    }
    return 2.2;
  },
  function wheelchair(g) {
    add(g, box(0.62, 0.5, 0.6), mat(0x39424e), 0, 0.35, 0);
    add(g, box(0.7, 0.1, 0.7), mat(0x2f6fb5), 0, 0.62, 0);
    add(g, box(0.7, 0.8, 0.08), mat(0x2f6fb5), 0, 1.0, 0.35);
    for (const s of [-1, 1]) {
      add(g, box(0.06, 0.06, 0.6), mat(0x39424e), s * 0.36, 0.9, 0.05);
      wheel(g, 0.35, s * 0.42, 0.35, 0.15);
      wheel(g, 0.1, s * 0.3, 0.1, -0.4);
    }
    return 1.1;
  },
  function cart(g) {
    add(g, box(1.0, 0.9, 0.8), mat(0x2fb5a8), 0, 0.75, 0);
    add(g, box(1.05, 0.06, 0.85), mat(0xffffff), 0, 1.23, 0);
    add(g, box(0.3, 0.2, 0.3), mat(0xe8505b), -0.2, 1.36, 0);
    add(g, box(0.9, 0.04, 0.02), mat(0xffffff), 0, 0.9, -0.41);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) wheel(g, 0.1, sx * 0.4, 0.1, sz * 0.3);
    return 1.0;
  },
  function wetFloorSign(g) {
    add(g, box(0.8, 1.3, 0.04), mat(0xffd23f), 0, 0.65, -0.2, 0.3, 0, 0);
    add(g, box(0.8, 1.3, 0.04), mat(0xffd23f), 0, 0.65, 0.2, -0.3, 0, 0);
    add(g, box(0.5, 0.5, 0.02), mat(0x222831), 0, 0.7, -0.27, 0.3, 0, 0);
    add(g, box(0.85, 0.05, 0.7), mat(0xe0b020), 0, 0.03, 0);
    return 0.8;
  },
  function mopBucket(g) {
    add(g, cyl(0.42, 0.32, 0.85, 12), mat(0xffd23f), 0, 0.43, 0);
    add(g, cyl(0.36, 0.36, 0.02, 12), mat(0x6ec6e8), 0, 0.84, 0);
    add(g, cyl(0.03, 0.03, 1.5, 6), mat(0x8d6e63), 0.12, 1.4, 0, 0, 0, -0.2);
    add(g, box(0.4, 0.15, 0.25), mat(0xc4cad1), 0.3, 2.1, 0, 0, 0, -0.2);
    return 0.9;
  },
  function boxes(g) {
    add(g, box(1.1, 0.6, 0.9), mat(0xc9a06b), 0, 0.3, 0);
    add(g, box(0.9, 0.55, 0.8), mat(0xd2ab75), 0.05, 0.88, 0, 0, 0.15, 0);
    add(g, box(0.6, 0.45, 0.6), mat(0xbf935c), -0.05, 1.38, 0, 0, -0.2, 0);
    return 1.2;
  },
];

// ---- Ceiling obstacles (block the HIGH lane, player flies DOWN) ----
const H = HALL_H;
const ceilingModels = [
  function radiologySign(g) {
    const side = mat(0x2a8f9c);
    const front = new THREE.MeshLambertMaterial({ map: signTexture('RADIOLOGY', '#2a8f9c') });
    const board = new THREE.Mesh(box(1.2, 0.6, 0.1), [side, side, side, side, front, side]);
    board.position.set(0, 2.7, 0);
    g.add(board);
    for (const s of [-1, 1]) add(g, box(0.04, 1.0, 0.04), mat(0x9aa5b1), s * 0.45, 3.5, 0);
    return 0.3;
  },
  function ivBag(g) {
    add(g, cyl(0.02, 0.02, 1.2, 6), mat(0x9aa5b1), 0, H - 0.6, 0);
    add(g, box(0.5, 0.8, 0.2), mat(0xbfe3f2, { transparent: true, opacity: 0.85 }), 0, 2.75, 0);
    add(g, box(0.42, 0.5, 0.22), mat(0x7fd0e8), 0, 2.65, 0);
    add(g, box(0.18, 0.08, 0.1), mat(0xe8505b), 0, 3.18, 0);
    add(g, cyl(0.015, 0.015, 0.5, 6), mat(0xdff3fa), 0, 2.1, 0);
    return 0.5;
  },
  function droopingTile(g) {
    add(g, box(1.1, 0.02, 1.1), mat(0x555d66), 0, H - 0.01, 0);
    add(g, box(1.1, 0.05, 1.1), mat(0xeceff2), 0, 3.05, 0, 1.1, 0, 0);
    add(g, box(0.04, 0.3, 0.04), mat(0x9aa5b1), 0.4, 3.85, 0.6);
    return 1.1;
  },
  function pendantLight(g) {
    add(g, cyl(0.015, 0.015, 1.0, 6), mat(0x39424e), 0, 3.5, 0);
    add(g, cyl(0.12, 0.5, 0.45, 12), mat(0xffd23f), 0, 2.85, 0);
    add(g, ball(0.2), glow(0xfff2b0), 0, 2.55, 0);
    return 1.0;
  },
  function banner(g) {
    add(g, box(1.2, 0.9, 0.05), mat(0xff6b6b), 0, 2.95, 0);
    add(g, box(1.0, 0.1, 0.06), mat(0xffffff), 0, 3.05, 0);
    for (const s of [-1, 1]) add(g, box(0.03, 0.6, 0.03), mat(0x9aa5b1), s * 0.5, 3.7, 0);
    return 0.2;
  },
  function monitorArm(g) {
    add(g, cyl(0.1, 0.1, 0.2, 8), mat(0x9aa5b1), 0, 3.9, 0.35);
    add(g, box(0.08, 1.0, 0.08), mat(0xc4cad1), 0, 3.4, 0.35);
    add(g, box(0.08, 0.08, 0.7), mat(0xc4cad1), 0, 2.95, 0.05);
    add(g, box(0.9, 0.6, 0.08), mat(0xf4f7fa), 0, 2.8, -0.3);
    add(g, box(0.8, 0.5, 0.09), mat(0x1e2a38), 0, 2.8, -0.3);
    add(g, box(0.5, 0.04, 0.1), glow(0x5fd0a0), 0, 2.85, -0.3);
    return 0.5;
  },
];

// ---- Full obstacles (block both heights in a column, player must change column) ----
const fullModels = [
  function supplyShelf(g) {
    add(g, box(1.05, 3.8, 0.04), mat(0xe9edf1), 0, 1.9, -0.2);
    for (const sx of [-1, 1]) add(g, box(0.05, 3.8, 0.5), mat(0x9aa5b1), sx * 0.5, 1.9, 0);
    const colors = [0xc9a06b, 0x5b9bd5, 0xe8505b, 0x4caf6a, 0xffd23f];
    for (let i = 0; i < 6; i++) {
      add(g, box(1.05, 0.05, 0.5), mat(0x9aa5b1), 0, 0.3 + i * 0.7, 0);
      add(g, box(0.7, 0.4, 0.4), mat(colors[i % colors.length]), (i % 2 ? 0.15 : -0.15), 0.55 + i * 0.7, 0);
    }
    return 0.5;
  },
  function privacyCurtain(g) {
    add(g, box(1.1, 3.4, 0.06), mat(0x7fc8d6), 0, 2.0, 0);
    for (let i = -2; i <= 2; i++) add(g, box(0.04, 3.4, 0.07), mat(0xffffff), i * 0.22, 2.0, 0);
    add(g, box(1.15, 0.06, 0.08), mat(0xc4cad1), 0, 3.73, 0);
    for (const s of [-1, 1]) {
      add(g, box(0.05, 3.8, 0.05), mat(0xc4cad1), s * 0.55, 1.9, 0);
      add(g, box(0.1, 0.1, 0.5), mat(0x39424e), s * 0.55, 0.05, 0);
    }
    return 0.5;
  },
  function elevator(g) {
    add(g, box(1.2, 3.9, 0.3), mat(0xb8c2cc), 0, 1.95, 0);
    add(g, box(0.52, 3.6, 0.32), mat(0xdde3e9), -0.28, 1.8, 0);
    add(g, box(0.52, 3.6, 0.32), mat(0xdde3e9), 0.28, 1.8, 0);
    add(g, box(0.06, 0.2, 0.34), glow(0xffd23f), 0.52, 1.6, 0.0);
    add(g, box(0.4, 0.2, 0.34), glow(0xe8505b), 0, 3.7, 0);
    return 0.3;
  },
];

// ---- Outdoor obstacles (One-Wheel mode) ----
// floor: jump over (top <= ~0.75). ceiling: duck under (bottom ~1.8). full: change lane.
const outdoorFloor = [
  function trafficCone(g) {
    add(g, box(0.6, 0.05, 0.6), mat(0x39424e), 0, 0.025, 0);
    add(g, cone(0.22, 0.7, 10), mat(0xff7a1a), 0, 0.4, 0);
    add(g, cyl(0.13, 0.15, 0.1, 10), mat(0xffffff), 0, 0.4, 0);
    return 0.6;
  },
  function log(g) {
    add(g, cyl(0.3, 0.3, 1.2, 10), mat(0x8d6e63), 0, 0.3, 0, 0, 0, Math.PI / 2);
    for (const s of [-1, 1]) add(g, cyl(0.27, 0.27, 0.02, 10), mat(0xc9a27a), s * 0.61, 0.3, 0, 0, 0, Math.PI / 2);
    add(g, box(0.08, 0.2, 0.08), mat(0x6d4c41), 0.2, 0.62, 0, 0, 0, 0.5);
    return 0.6;
  },
  function rock(g) {
    add(g, rockGeo(0.45), mat(0x9aa0a6, { flatShading: true }), 0, 0.3, 0).scale.set(1.2, 0.8, 1);
    add(g, rockGeo(0.25), mat(0x80878d, { flatShading: true }), 0.42, 0.15, 0.3);
    return 1.0;
  },
  function hydrant(g) {
    add(g, cyl(0.17, 0.2, 0.55, 10), mat(0xe8505b), 0, 0.275, 0);
    add(g, ball(0.17), mat(0xe8505b), 0, 0.58, 0);
    add(g, box(0.1, 0.08, 0.1), mat(0xffd23f), 0, 0.75, 0);
    add(g, cyl(0.06, 0.06, 0.5, 6), mat(0xffd23f), 0, 0.38, 0, 0, 0, Math.PI / 2);
    return 0.5;
  },
  function bench(g) {
    add(g, box(1.1, 0.08, 0.4), mat(0xc9a27a), 0, 0.32, 0);
    add(g, box(1.1, 0.3, 0.06), mat(0xc9a27a), 0, 0.56, 0.17);
    for (const s of [-1, 1]) add(g, box(0.08, 0.3, 0.4), mat(0x39424e), s * 0.45, 0.15, 0);
    return 0.5;
  },
  function crates(g) {
    add(g, box(0.8, 0.5, 0.8), mat(0xc9a27a), 0, 0.25, 0);
    add(g, box(0.84, 0.06, 0.84), mat(0x8d6e63), 0, 0.1, 0);
    add(g, box(0.84, 0.06, 0.84), mat(0x8d6e63), 0, 0.43, 0);
    return 0.9;
  },
];

const outdoorCeiling = [
  function bannerArch(g) {
    const side = mat(0xff6b6b);
    const front = new THREE.MeshLambertMaterial({ map: signTexture('FUN RUN', '#ff6b6b') });
    const board = new THREE.Mesh(box(1.3, 0.5, 0.06), [side, side, side, side, front, side]);
    board.position.set(0, 2.1, 0);
    g.add(board);
    for (const s of [-1, 1]) add(g, cyl(0.04, 0.04, 2.4, 6), mat(0x9aa5b1), s * 0.62, 1.2, 0);
    return { depth: 0.3, bottom: 1.85 };
  },
  function branch(g) {
    add(g, cyl(0.14, 0.18, 2.6, 7), mat(0x8d6e63), -0.55, 1.3, 0);
    add(g, cyl(0.07, 0.1, 1.2, 6), mat(0x8d6e63), 0.05, 2.05, 0, 0, 0, Math.PI / 2);
    add(g, ball(0.28), mat(0x4caf6a), 0.4, 2.1, 0);
    add(g, ball(0.28), mat(0x66c26a), 0, 2.2, 0.1);
    add(g, ball(0.28), mat(0x4caf6a), -0.3, 2.3, 0);
    return { depth: 0.8, bottom: 1.8 };
  },
  function hangingSign(g) {
    const side = mat(0x2a8f9c);
    const front = new THREE.MeshLambertMaterial({ map: signTexture('OPEN', '#2a8f9c') });
    add(g, cyl(0.06, 0.07, 2.7, 6), mat(0xc9a27a), 0.62, 1.35, 0);
    add(g, box(1.3, 0.07, 0.07), mat(0xc9a27a), 0, 2.55, 0);
    for (const s of [-1, 1]) add(g, box(0.02, 0.5, 0.02), mat(0x9aa5b1), s * 0.35, 2.28, 0);
    const board = new THREE.Mesh(box(0.9, 0.4, 0.05), [side, side, side, side, front, side]);
    board.position.set(0, 1.98, 0);
    g.add(board);
    return { depth: 0.3, bottom: 1.78 };
  },
  function heightBar(g) {
    for (const s of [-1, 1]) add(g, box(0.1, 2.1, 0.1), mat(0xffd23f), s * 0.62, 1.05, 0);
    add(g, box(1.34, 0.16, 0.1), mat(0xffffff), 0, 1.95, 0);
    for (const x of [-0.4, 0, 0.4]) add(g, box(0.2, 0.17, 0.11), mat(0xe8505b), x, 1.95, 0);
    return { depth: 0.3, bottom: 1.87 };
  },
  function clothesline(g) {
    for (const s of [-1, 1]) add(g, cyl(0.04, 0.04, 2.5, 6), mat(0x9aa5b1), s * 0.62, 1.25, 0);
    add(g, box(1.24, 0.02, 0.02), mat(0x39424e), 0, 2.3, 0);
    add(g, box(0.3, 0.45, 0.03), mat(0x5b9bd5), -0.3, 2.07, 0);
    add(g, box(0.3, 0.45, 0.03), mat(0xffd23f), 0.15, 2.07, 0);
    add(g, box(0.12, 0.25, 0.03), mat(0xe8505b), 0.45, 2.17, 0);
    return { depth: 0.3, bottom: 1.84 };
  },
];

const outdoorFull = [
  function parkedCar(g) {
    add(g, box(1.1, 0.5, 2.2), mat(0xe8505b), 0, 0.55, 0);
    add(g, box(0.95, 0.65, 1.2), mat(0xd9444f), 0, 1.13, 0.1);
    add(g, box(0.97, 0.3, 1.0), mat(0x9ed1e8), 0, 1.2, 0.1);
    add(g, box(0.9, 0.12, 0.05), glow(0xfff2b0), 0, 0.6, -1.1);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(g, cyl(0.28, 0.28, 0.18, 12), mat(0x2b2f36), sx * 0.55, 0.28, sz * 0.7, 0, 0, Math.PI / 2);
    return 2.2;
  },
  function boulder(g) {
    add(g, rockGeo(0.7), mat(0x8a9097, { flatShading: true }), 0, 0.8, 0).scale.set(1, 1.25, 1);
    add(g, rockGeo(0.4), mat(0x9aa0a6, { flatShading: true }), 0.35, 0.3, 0.3);
    return 1.4;
  },
  function bigTree(g) {
    add(g, cyl(0.35, 0.42, 3.2, 8), mat(0x8d6e63), 0, 1.6, 0);
    add(g, cone(0.8, 2.4, 7), mat(0x4caf6a), 0, 3.4, 0);
    return 0.9;
  },
];

const MODELS = {
  hall: { floor: floorModels, ceiling: ceilingModels, full: fullModels },
  outdoor: { floor: outdoorFloor, ceiling: outdoorCeiling, full: outdoorFull },
};
const BLOCKS = { floor: ['low'], ceiling: ['high'], full: ['low', 'high'] }; // plane rows

// Pools are built per theme the first time that theme is used.
export class ObstaclePool {
  constructor(scene) {
    this.scene = scene;
    this.free = {};
    this.theme = null;
    this.setTheme('hall');
  }

  setTheme(theme) {
    this.theme = theme;
    if (!this.free[theme]) this.build(theme);
  }

  build(theme) {
    const sets = (this.free[theme] = { floor: [], ceiling: [], full: [] });
    for (const type of Object.keys(sets)) {
      MODELS[theme][type].forEach((builder, model) => {
        sets[type][model] = [];
        for (let i = 0; i < POOL_PER_MODEL; i++) {
          const g = new THREE.Group();
          const r = builder(g);
          if (theme === 'outdoor' && type === 'ceiling') g.scale.y = OVERHEAD_SCALE;
          const bounds = new THREE.Box3().setFromObject(g);
          g.userData = {
            theme, type, model,
            depth: typeof r === 'number' ? r : r.depth,
            blocks: BLOCKS[type],
            top: bounds.max.y,
            bottom: r.bottom !== undefined ? r.bottom * g.scale.y : bounds.min.y,
            col: 1, lead: false, passed: false,
          };
          g.visible = false;
          this.scene.add(g);
          sets[type][model].push(g);
        }
      });
    }
  }

  // Returns a pooled obstacle of the given type, or null if the pool is exhausted.
  acquire(type) {
    const lists = this.free[this.theme][type].filter((l) => l.length);
    if (!lists.length) return null;
    const obj = lists[(Math.random() * lists.length) | 0].pop();
    obj.userData.passed = false;
    obj.visible = true;
    return obj;
  }

  release(obj) {
    const u = obj.userData;
    obj.visible = false;
    this.free[u.theme][u.type][u.model].push(obj);
  }
}
