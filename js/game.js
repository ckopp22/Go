import { ObstaclePool } from './obstacles.js';
import { COL_X } from './plane.js';
import { Stars } from './stars.js';

const START_SPEED = 10;
const MAX_SPEED = 28;
const SPEED_STEP = 0.35;
const START_SPACING = 2.0; // seconds of travel between waves
const MIN_SPACING = 0.6;
const MOVE_TIME = 0.15; // one lane change
const SPAWN_Z = -80;
const FIRST_Z = -40;
const DESPAWN_Z = 8;
const PLANE_FRONT = -0.7; // collision extent of the plane along z
const PLANE_BACK = 0.5;
const HITSTOP = 0.1;
const GAME_OVER_DELAY = 0.8;

const ROWS = ['low', 'high'];

export class Game {
  constructor(scene, hero) {
    this.hero = hero; // the Plane or Rider being driven
    this.minSpacing = MIN_SPACING;
    this.pool = new ObstaclePool(scene);
    this.stars = new Stars(scene);
    this.starYs = [0.9, 3.1]; // heights stars can appear at (set per mode)
    this.active = [];
    this.onScore = null;
    this.onStar = null;
    this.onCrash = null;
    this.onGameOver = null;
    this.reset();
  }

  // Switches obstacle theme and pacing for a game mode.
  setMode(cfg) {
    this.clear();
    this.pool.setTheme(cfg.world);
    this.minSpacing = cfg.minSpacing ?? MIN_SPACING;
    this.starYs = cfg.starYs;
  }

  // Removes every obstacle from the hallway.
  clear() {
    for (const o of this.active) this.pool.release(o);
    this.active.length = 0;
    this.stars.clear();
  }

  reset() {
    this.clear();
    this.state = 'playing'; // 'playing' | 'crashed' | 'over'
    this.speed = START_SPEED;
    this.scrollSpeed = START_SPEED;
    this.score = 0; // waves cleared + stars collected (what the player sees)
    this.cleared = 0; // waves cleared (drives speed and difficulty)
    this.distance = 0;
    this.crashT = 0;
    this.nextGap = 0;
    this.sinceSpawn = FIRST_Z - SPAWN_Z;
    this.spawnWave(FIRST_Z);
  }

  get frozen() {
    return this.state === 'crashed' && this.crashT < HITSTOP;
  }

  spacingSeconds() {
    const t = Math.min(1, (this.speed - START_SPEED) / (MAX_SPEED - START_SPEED));
    return START_SPACING + (this.minSpacing - START_SPACING) * t;
  }

  // Picks which columns get an obstacle and of what type, easing in complexity as the run goes on.
  pickWave() {
    const n = this.cleared;
    const r = Math.random();
    const count = n < 3 ? 1 : n < 8 ? (r < 0.65 ? 1 : 2) : (r < 0.4 ? 1 : r < 0.8 ? 2 : 3);
    const cols = [0, 1, 2].sort(() => Math.random() - 0.5).slice(0, count);
    const fullIdx = n >= 5 && Math.random() < 0.4 ? 0 : -1;
    return cols.map((col, i) => ({
      col,
      type: i === fullIdx ? 'full' : Math.random() < 0.5 ? 'floor' : 'ceiling',
    }));
  }

  // Worst-case lane changes needed to reach a free cell from any blocked cell.
  movesNeeded(wave) {
    const blocked = new Set();
    for (const { col, type } of wave) {
      if (type !== 'ceiling') blocked.add(`${col},low`);
      if (type !== 'floor') blocked.add(`${col},high`);
    }
    const free = [];
    for (let c = 0; c < 3; c++) for (const r of ROWS) if (!blocked.has(`${c},${r}`)) free.push([c, r]);
    let worst = 0;
    for (const key of blocked) {
      const [c, r] = key.split(',');
      const d = Math.min(...free.map(([fc, fr]) => Math.abs(fc - c) + (fr === r ? 0 : 1)));
      worst = Math.max(worst, d);
    }
    return worst;
  }

  spawnWave(z) {
    const wave = this.pickWave();
    wave.forEach(({ col, type }, i) => {
      const obj = this.pool.acquire(type);
      if (!obj) return;
      obj.position.set(COL_X[col], 0, z);
      obj.userData.col = col;
      obj.userData.lead = i === 0;
      this.active.push(obj);
    });
    const need = this.movesNeeded(wave);
    const gap = Math.max(this.spacingSeconds(), this.minSpacing, 0.3 + MOVE_TIME * need * 2);
    this.nextGap = gap * this.speed;
    this.spawnStars(z - this.nextGap / 2);
  }

  // A short line of stars in one lane, halfway to the next wave.
  spawnStars(zMid) {
    if (Math.random() > 0.7) return;
    const x = COL_X[(Math.random() * 3) | 0];
    const y = this.starYs[(Math.random() * this.starYs.length) | 0];
    for (let k = -1; k <= 1; k++) this.stars.spawn(x, y, zMid + k * 1.4);
  }

  // Is the star close enough to the hero to be picked up?
  grabs(s) {
    const h = this.hero;
    const front = (h.reachFront ?? PLANE_FRONT) - 0.2;
    const back = (h.reachBack ?? PLANE_BACK) + 0.2;
    if (s.position.z < front || s.position.z > back) return false;
    return Math.abs(s.position.x - h.x) < 0.6 && Math.abs(s.position.y - h.y) < 0.7;
  }

  blocks(o) {
    return o.userData.col === this.hero.nearestCell().col && this.hero.hits(o.userData);
  }

  crash() {
    this.state = 'crashed';
    this.crashT = 0;
    this.hero.crash();
    this.onCrash?.();
  }

  update(dt) {
    if (this.state === 'over') return;

    if (this.state === 'crashed') {
      this.crashT += dt;
      if (this.crashT < HITSTOP) return;
      this.scrollSpeed *= Math.exp(-5 * dt);
      if (this.crashT >= GAME_OVER_DELAY) {
        this.state = 'over';
        this.onGameOver?.(this.score);
      }
    } else {
      this.scrollSpeed = this.speed;
    }

    const dz = this.scrollSpeed * dt;
    this.distance += dz;

    if (this.state === 'playing') {
      this.sinceSpawn += dz;
      if (this.sinceSpawn >= this.nextGap) {
        this.sinceSpawn -= this.nextGap;
        this.spawnWave(SPAWN_Z + this.sinceSpawn);
      }
    }

    for (let i = this.active.length - 1; i >= 0; i--) {
      const o = this.active[i];
      o.position.z += dz;
      if (this.state === 'playing') {
        const half = o.userData.depth / 2;
        const front = o.position.z - half;
        const reachBack = this.hero.reachBack ?? PLANE_BACK;
        if (front < reachBack && o.position.z + half > (this.hero.reachFront ?? PLANE_FRONT) && this.blocks(o)) {
          this.crash();
        } else if (!o.userData.passed && front >= reachBack) {
          o.userData.passed = true;
          if (o.userData.lead) {
            this.score++;
            this.cleared++;
            this.speed = Math.min(MAX_SPEED, START_SPEED + SPEED_STEP * this.cleared);
            this.onScore?.(this.score);
          }
        }
      }
      if (o.position.z > DESPAWN_Z) {
        this.active.splice(i, 1);
        this.pool.release(o);
      }
    }

    this.stars.update(dt, this.scrollSpeed, this.state === 'playing' ? (s) => {
      if (!this.grabs(s)) return false;
      this.score++;
      this.onStar?.(s.position);
      return true;
    } : null);
  }
}
