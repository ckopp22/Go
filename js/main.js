import * as THREE from './lib/three.module.min.js';
import { World } from './world.js';
import { Plane, LANE_Y } from './plane.js';
import { Rider, CHARACTERS, CHARACTER_IDS } from './rider.js';
import { createInput } from './input.js';
import { Game } from './game.js';
import { createUI } from './ui.js';
import * as storage from './storage.js';
import * as audio from './audio.js';
import { Particles } from './particles.js';
import { Trail } from './trail.js';
import { MODES } from './modes.js';
import { initPWA, promptInstall } from './pwa.js';

const MAX_DT = 0.05;
const SHAKE_TIME = 0.5;
const MENU_SPEED = 4;
const COUNT_SPEED = 8;
const COUNT_STEP = 0.8; // seconds per countdown number

const canvas = document.getElementById('game');
// MSAA is wasted on high-DPI screens, so only enable it at DPR < 2.
const renderer = new THREE.WebGLRenderer({ canvas, antialias: (window.devicePixelRatio || 1) < 2, powerPreference: 'high-performance' });
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 120);
camera.position.set(0, 2.6, 5.5);

const world = new World(scene);
const plane = new Plane(scene);
const game = new Game(scene, plane);
const particles = new Particles(scene);
const sparkles = new Particles(scene); // star pickup bursts
const rider = new Rider(scene);
const trail = new Trail(scene);
let hero = plane; // whoever the player controls in the current mode

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let shakeT = 0;
let lastEntry = null;
let mode = storage.getMode();
let charId = CHARACTERS[storage.getCharacter()] ? storage.getCharacter() : 'boy';

// LOADING -> MENU -> COUNTDOWN -> PLAYING <-> PAUSED -> CRASHED -> GAME_OVER -> (MENU | COUNTDOWN)
let state = 'loading';
let countdownT = 0;

function setState(next) {
  state = next;
  switch (next) {
    case 'menu':
      game.clear();
      hero.reset();
      hero.idle = true;
      ui.show('menu');
      break;
    case 'countdown':
      game.clear();
      hero.reset();
      countdownT = COUNT_STEP * 3;
      ui.setScore(0);
      ui.show('hud', 'countdown');
      break;
    case 'playing':
      ui.show('hud');
      break;
    case 'paused':
      ui.show('hud', 'pause');
      break;
    case 'gameover':
      ui.show('gameover');
      break;
  }
}

function pause() {
  if (state === 'playing' && game.state === 'playing') setState('paused');
}

function cycleCharacter(step) {
  const n = CHARACTER_IDS.length;
  charId = CHARACTER_IDS[(CHARACTER_IDS.indexOf(charId) + step + n) % n];
  storage.setCharacter(charId);
  rider.setCharacter(charId);
  ui.setCharacter(CHARACTERS[charId].name);
}

const toggleSound = () => {
  const on = !storage.getSound();
  storage.setSound(on);
  audio.setEnabled(on);
  ui.setSound(on);
};

const ui = createUI({
  play: () => setState('countdown'),
  again: () => setState('countdown'),
  restart: () => setState('countdown'),
  menu: () => setState('menu'),
  home: () => ui.show('menu'),
  howto: () => ui.show('howto'),
  gotit: () => {
    storage.setSeenHowto();
    ui.show('menu');
  },
  scores: () => {
    ui.renderScores(storage.getScores(mode), lastEntry);
    ui.show('scores');
  },
  clear: () => {
    if (!confirm('Clear all high scores?')) return;
    storage.clearScores(mode);
    lastEntry = null;
    ui.renderScores([], null);
  },
  pause,
  resume: () => setState('playing'),
  sound: toggleSound,
  'char-prev': () => cycleCharacter(-1),
  'char-next': () => cycleCharacter(1),
  mode: () => {
    mode = mode === 'plane' ? 'wheel' : 'plane';
    storage.setMode(mode);
    lastEntry = null;
    ui.setMode(mode, MODES[mode]);
    applyMode();
  },
  install: promptInstall,
  hint: () => { document.getElementById('ios-hint').hidden = true; },
});
initPWA(document.getElementById('btn-install'), document.getElementById('ios-hint'));
ui.setSound(storage.getSound());
ui.setMode(mode, MODES[mode]);
rider.setCharacter(charId);
ui.setCharacter(CHARACTERS[charId].name);
audio.setEnabled(storage.getSound());

// Any button press unlocks audio (iOS needs a gesture) and plays a click.
document.addEventListener('click', (e) => {
  if (!e.target.closest('button')) return;
  audio.unlock();
  audio.play('tap');
});

game.onScore = (score) => {
  ui.setScore(score);
  audio.play('ping');
};
game.onCrash = () => {
  state = 'crashed';
  audio.play('crash');
  particles.burst(hero.x, hero.y, 0);
  shakeT = reduceMotion ? 0 : SHAKE_TIME;
};
game.onStar = (p) => {
  ui.setScore(game.score);
  audio.play('star');
  sparkles.burst(p.x, p.y, p.z);
};
game.onGameOver = (score) => {
  lastEntry = storage.addScore(score, mode);
  if (lastEntry) audio.play('highscore');
  ui.showGameOver({ score, best: storage.getScores(mode)[0]?.score ?? score, isNew: !!lastEntry });
  setState('gameover');
};

createInput((dir) => {
  if ((state === 'countdown' || state === 'playing') && hero.move(dir)) audio.play('whoosh', dir);
});

window.addEventListener('keydown', (e) => {
  if (e.code !== 'Escape' && e.code !== 'KeyP') return;
  if (state === 'playing') pause();
  else if (state === 'paused') setState('playing');
});
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

let baseFov = 70;
let fovBoost = 0;
let camFocusY = LANE_Y.low;
let camFocusX = 0;

const FOV_BOOST_MAX = 8; // extra degrees at top speed

function applyMode() {
  hero = mode === 'wheel' ? rider : plane;
  plane.mesh.visible = hero === plane;
  rider.mesh.visible = hero === rider;
  game.hero = hero;
  trail.mesh.visible = hero === rider;
  trail.clear();
  game.setMode(MODES[mode]);
  world.setTheme(MODES[mode].world);
  hero.reset();
  hero.idle = true;
  camFocusX = hero.x;
  camFocusY = hero.y;
}

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  baseFov = camera.aspect < 1 ? 78 : 70; // wider vertical FOV in portrait so the walls stay in view
  camera.fov = baseFov + fovBoost;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);
resize();

function updateCamera(dt) {
  const k = 1 - Math.exp(-6 * dt);
  camFocusY += (hero.y - camFocusY) * k;
  camFocusX += (hero.x - camFocusX) * k;
  const running = state === 'playing' || state === 'crashed' || state === 'gameover';
  const boostTarget = running && !reduceMotion ? Math.max(0, Math.min(1, (game.scrollSpeed - 10) / 18)) * FOV_BOOST_MAX : 0;
  const prevFov = camera.fov;
  fovBoost += (boostTarget - fovBoost) * k;
  camera.fov = baseFov + fovBoost;
  if (Math.abs(camera.fov - prevFov) > 0.001) camera.updateProjectionMatrix();
  camera.position.x = camFocusX * 0.6;
  camera.position.y = 2.6 + (camFocusY - 2) * 0.35;
  if (shakeT > 0 && !game.frozen) {
    shakeT = Math.max(0, shakeT - dt);
    const amp = 0.15 * (shakeT / SHAKE_TIME);
    camera.position.x += (Math.random() - 0.5) * amp;
    camera.position.y += (Math.random() - 0.5) * amp;
  }
  camera.lookAt(camFocusX * 0.8, 2 + (camFocusY - 2) * 0.8, -15);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, MAX_DT);
  last = now;

  let sdt = dt; // scene delta; 0 freezes the scene (pause, impact pause)
  if (state === 'menu' || state === 'countdown') {
    world.update(dt, state === 'menu' ? MENU_SPEED : COUNT_SPEED);
    const s = state === 'menu' ? MENU_SPEED : COUNT_SPEED;
    hero.update(dt, s);
    if (hero === rider) trail.update(dt, s, rider.x, true);
    if (state === 'countdown') {
      countdownT -= dt;
      if (countdownT <= 0) {
        game.reset();
        setState('playing');
      } else {
        ui.setCountdown(Math.ceil(countdownT / COUNT_STEP));
      }
    }
  } else if (state === 'paused') {
    sdt = 0;
  } else if (state !== 'loading') {
    game.update(dt);
    sdt = game.frozen ? 0 : dt;
    world.update(sdt, game.scrollSpeed);
    hero.update(sdt, game.scrollSpeed);
    if (hero === rider) trail.update(sdt, game.scrollSpeed, rider.x, !rider.airborne && !rider.crashed);
    particles.update(sdt, game.scrollSpeed);
    sparkles.update(sdt, game.scrollSpeed);
  }
  updateCamera(sdt);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

applyMode();
setState('menu');
if (!storage.hasSeenHowto()) {
  storage.setSeenHowto();
  ui.show('howto');
}
