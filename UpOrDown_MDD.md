# Up or Down: Master Design Document (MDD)

**Version:** 1.0
**Platform:** Web (PWA), installable on iPhone and Android, playable in any modern browser
**Hosting:** GitHub Pages
**Built with:** Claude Code in VS Code
**Tech:** Plain HTML / CSS / JavaScript + three.js (no build step)

---

## 1. Game Overview

**Title:** Up or Down

**Elevator pitch:** You are a paper airplane gliding down an endless hospital hallway. Obstacles come at you, and every one forces a choice: fly **up** or fly **down**. Swipe the right way and you glide on. Swipe the wrong way, or too late, and you crash.

**Genre:** 3D endless runner, one-input reflex game

**Session length:** 30 seconds to 3 minutes per run. Easy to pick up, hard to put down.

**Core fantasy:** A tiny paper plane weaving through a big, busy hospital without touching anything.

**Design pillars**
1. **One decision at a time.** Every obstacle is simply "over" or "under."
2. **Instantly readable.** The player knows the right answer at a glance, so the challenge is speed, not confusion.
3. **One more try.** Crashes are quick, restarts are instant, and the score is always right there to beat.
4. **Small and fast.** Loads in seconds, works offline, tiny file size.

---

## 2. Core Gameplay

### 2.1 The Lane Grid (3 columns x 2 heights = 6 paths)
The plane always occupies one of 6 cells: three columns (LEFT, CENTER, RIGHT) times two heights (HIGH near the ceiling, LOW near the floor). It starts CENTER/LOW and stays at a fixed depth while the hallway scrolls toward it.

### 2.2 Controls
| Input | Action |
|---|---|
| Swipe up / down | Move to the HIGH / LOW lane |
| Swipe left / right | Move one column left / right |
| Keyboard Up / Down or W / S | HIGH / LOW lane (desktop) |
| Keyboard Left / Right or A / D | Column left / right (desktop) |
| Tap (menus) | Select buttons |

Rules:
- A swipe is a drag of about 30px or more along its dominant axis (vertical or horizontal). Fire it on touch-move, not touch-end, so it feels instant.
- Swiping toward an edge you are already at (HIGH, LOW, or the outer columns) does nothing. It does not penalize the player.
- Block page scrolling and pull-to-refresh during play (`touch-action: none`).

### 2.3 Obstacles
Every obstacle sits in one column. Floor and ceiling obstacles block one height in that column, so the safe answer is the other height or another column. Full obstacles block both heights, so the player must change column.

| Type | Blocks | Player must go | Hospital examples |
|---|---|---|---|
| **Floor obstacle** | LOW lane | **UP** (fly over) | Gurney, wheelchair, rolling supply cart, wet floor sign, mop bucket, stack of boxes, IV stand on wheels |
| **Ceiling obstacle** | HIGH lane | **DOWN** (fly under) | Hanging "Radiology" sign, dangling IV bag, drooping ceiling tile, swinging pendant light, hanging banner, ceiling-mounted monitor arm |
| **Full obstacle** | LOW and HIGH in its column | Change **column** | Tall supply shelf, privacy curtain, elevator doors |

Visual rules so players always know the answer:
- Floor obstacles sit on the ground and visibly leave space above.
- Ceiling obstacles hang from the ceiling and visibly leave space below.
- Optional: a subtle arrow decal or color cue (warm color = go over, cool color = go under). Decide during playtesting.

### 2.4 Crash Condition
- Obstacles arrive in waves of 1 to 3, at most one per column, spaced so any blocked cell can be escaped within 2 lane changes. Each wave keeps at least one free cell.
- Each obstacle has a collision zone in its column and height.
- When an obstacle reaches the plane's position, check the plane's current column and height.
- If the plane is in a blocked cell, it **crashes**.
- If the plane is in an open cell, the wave is **cleared** and the player scores.
- Lane changes take about 0.15 s to complete. If the plane is still mid-transition when it reaches an obstacle, collision uses the lane the plane is closest to. This gives the player a tiny grace window.

### 2.5 Crash Sequence
1. Game freezes briefly (about 0.1 s impact pause).
2. Plane tumbles and falls with a small crumple or spin animation.
3. Camera shakes lightly.
4. Crash sound plays (if sound is on).
5. Game Over screen appears after about 0.8 s, showing the final score. The score is logged automatically to high scores.

### 2.6 Scoring
- **+1 point** per obstacle cleared.
- **Distance** is tracked internally as a tiebreaker or display stat, shown in meters.
- **Score = obstacles cleared** (simple and easy to compare).
- "NEW HIGH SCORE!" banner if the run makes the top 10.

### 2.7 Difficulty Curve
- Start at a gentle speed with generous spacing (about 2 seconds between obstacles).
- Speed increases gradually, with a hard cap so it stays fair.
- Spacing tightens as speed rises, never below a minimum reaction time of about 0.6 s.
- Early waves are a single obstacle. Multi-column waves appear after about 3 cleared, and full obstacles after about 5.
- Never spawn an unwinnable pattern. Consecutive obstacles must always leave enough time for a lane change.

Suggested starting values (tune by feel):

| Setting | Value |
|---|---|
| Start speed | 10 units/s |
| Max speed | 28 units/s |
| Speed increase | +0.35 units/s per obstacle cleared |
| Start spacing | about 2.0 s of travel |
| Min spacing | about 0.6 s of travel |
| Lane change time | 0.15 s |

---

## 3. Game Flow and Screens

```
Splash / Load → Main Menu → [Play | How to Play | High Scores | Sound Toggle]
                    │
                    └→ Play → Countdown (3-2-1 or "Swipe to start") → Gameplay
                                                                          │
                                                                  Crash → Game Over
                                                                          │
                                                  [Play Again | Main Menu]
```

### 3.1 Main Menu
- Game logo "**Up or Down**" with the paper plane flying a gentle idle loop in the 3D hallway background (the hallway scrolls slowly behind the menu).
- Buttons:
  - **PLAY**
  - **HOW TO PLAY**
  - **HIGH SCORES**
  - **SOUND: ON/OFF** toggle (speaker icon with label)
- Footer: version number, small credit ("KPP Studio").

### 3.2 How to Play
A short modal or screen with 3 simple panels:
1. **Swipe UP** to fly over things on the floor. (Illustration of plane going over a gurney.)
2. **Swipe DOWN** to fly under things hanging from the ceiling. (Illustration of plane going under a sign.)
3. **Pick wrong and you crash!** Clear as many as you can.

Include a Back button. Optional "Got it" button that returns to the menu. Show automatically on the very first launch (flag in localStorage), then only on demand.

### 3.3 High Scores
- Top 10 scores stored on the device (localStorage).
- Each row: rank, score, date.
- Highlight the player's most recent score if it is in the list.
- "Clear Scores" button with a confirmation prompt.
- Back button.

### 3.4 Sound Toggle
- Single on/off toggle on the main menu. Also available as a small icon on the pause and game over screens.
- Setting persists in localStorage.
- Affects all sound effects and music.

### 3.5 HUD (During Play)
- Score (top center, large).
- Pause button (top right).
- Sound icon (top left, optional).
- No clutter. The hallway is the focus.

### 3.6 Pause
- Pause button, plus auto-pause when the tab or app loses focus (`visibilitychange`).
- Pause menu: Resume, Restart, Main Menu, Sound toggle.

### 3.7 Game Over
- "CRASH!" headline.
- Final score, best score, and "NEW HIGH SCORE!" when applicable.
- Buttons: **Play Again** (primary, big), **Main Menu**.

---

## 4. Art Direction

### 4.1 Style
Clean, bright, low-poly 3D. Flat-shaded or simple materials, no textures required. Friendly and slightly humorous, never scary or graphic. The setting is a hospital but the tone is light.

### 4.2 The Hallway
- Long straight corridor built from repeating **modular segments** (floor, two walls, ceiling) that recycle as the player moves forward.
- Palette: soft white and pale blue walls, light gray floor, a colored stripe along the wall (hospital guide line), bright ceiling light panels at regular intervals.
- Details to repeat on the walls (cheap meshes): doors, room number plates, handrails, framed signs, a few plants.
- Light panels on the ceiling streak past, which helps convey speed.
- Subtle fog at the far end so segments pop in smoothly.

### 4.3 The Paper Airplane
- Simple folded paper-plane shape built from a few triangles (white with slight gray fold shading).
- Idle bob and slight pitch changes: nose tilts up when moving to HIGH, down when moving to LOW.
- Soft shadow or a tiny trailing wisp (optional) for polish.

### 4.4 Obstacles
- Built from simple primitives (boxes, cylinders, spheres) in friendly colors.
- Roughly 6 floor obstacles and 6 ceiling obstacles for variety (list in Section 2.3).
- Each is clearly a floor thing or a ceiling thing at a glance.

### 4.5 Camera
- Behind and slightly above the plane, looking down the hallway.
- Centered perspective camera with a moderate field of view (about 70 degrees).
- Camera follows the plane's lane change smoothly with a small lag, so the move feels fluid.
- Slight FOV widen as speed increases (speed feel).

### 4.6 UI Style
- Big, rounded, touch-friendly buttons (at least 56px tall).
- Clean sans-serif font (system font stack, so no font download).
- Colors that match the hospital palette: white, soft blue, a bright accent (e.g. coral red or teal) for primary buttons.
- Safe-area padding for iPhone notch and home indicator (`env(safe-area-inset-*)`).

---

## 5. Audio

All audio is synthesized or tiny. No large files, offline-friendly.

| Sound | When | Notes |
|---|---|---|
| Whoosh | Lane change | Short, soft swoosh (pitch up for UP, down for DOWN) |
| Clear / ping | Obstacle cleared | Light, pleasant "ding" |
| Crash | Crash | Thud plus paper crumple |
| Menu tap | Button press | Soft click |
| High score | New high score | Short cheerful jingle |
| Ambient (optional) | Gameplay | Quiet, low hum or a soft looped tune |

Implementation notes:
- Use the **Web Audio API** and generate effects procedurally (oscillators and noise bursts), or ship very small compressed files (`.mp3` / `.ogg`).
- iOS requires a user gesture to unlock audio. Create or resume the `AudioContext` on the first tap (the Play button).
- Respect the sound toggle everywhere. When off, never initialize or play anything.

---

## 6. Technical Specification

### 6.1 Stack
- **three.js** for 3D rendering. Load as a local file in the repo, not from a CDN, so the PWA works offline.
- Vanilla JavaScript using ES modules.
- HTML and CSS for all menus and HUD (overlaid on the canvas).
- No bundler or build step. The repo is pushed directly to GitHub Pages.

### 6.2 Suggested File Structure
```
up-or-down/
├── index.html
├── manifest.webmanifest
├── service-worker.js
├── css/
│   └── style.css
├── js/
│   ├── main.js            // boot, state machine, game loop
│   ├── game.js            // core gameplay, spawning, collisions, scoring
│   ├── world.js           // hallway segments, lighting, recycling
│   ├── plane.js           // paper plane model, lane movement, animation
│   ├── obstacles.js       // obstacle builders and pool
│   ├── input.js           // swipe and keyboard handling
│   ├── audio.js           // Web Audio sound manager
│   ├── storage.js         // localStorage (scores, settings)
│   ├── ui.js              // screens, HUD, menus
│   └── lib/
│       └── three.module.min.js
├── icons/
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── icon-maskable-512.png
│   └── apple-touch-icon.png
└── README.md
```

### 6.3 Game State Machine
`LOADING → MENU → COUNTDOWN → PLAYING ⇄ PAUSED → CRASHED → GAME_OVER → (MENU | COUNTDOWN)`

Only one state is active at a time. Each state owns which screens are visible and whether the update loop runs.

### 6.4 Game Loop
- `requestAnimationFrame` with delta-time (`dt`) so speed is frame-rate independent.
- Clamp `dt` (e.g. max 0.05 s) to avoid huge jumps after tab switches.
- Update order: input, world scroll, obstacles, collision, score, render.

### 6.5 Performance
- **Object pooling:** recycle hallway segments and obstacles. Never create and destroy meshes during play.
- Share geometries and materials between obstacles.
- Cap pixel ratio (`Math.min(devicePixelRatio, 2)`).
- Few lights (one ambient or hemisphere plus one directional). Avoid real-time shadows. Use a simple blob shadow if needed.
- Target a steady 60 fps on mid-range phones.

### 6.6 Obstacle Spawning
- Spawner places obstacles ahead of the player at a spawn distance beyond the fog.
- Each spawn picks a type (floor or ceiling), a random model within that type, and a gap to the previous obstacle based on current speed (see 2.7).
- Avoid more than 3 of the same type in a row so the pattern stays varied.
- Obstacles are removed (returned to the pool) after passing behind the camera.

### 6.7 Collision
- No physics engine. Simple lane-based check:
  - Each obstacle stores `blocksLane: "high" | "low"` and its z-position.
  - When `obstacle.z` crosses the plane's z within a small depth window, compare to the plane's current lane (or nearest lane if mid-transition).
  - Match = crash. No match = cleared (once per obstacle).

### 6.8 Data Storage (localStorage)
| Key | Value |
|---|---|
| `uod_highscores` | JSON array of up to 10 `{ score, date }`, sorted descending |
| `uod_sound` | `"on"` or `"off"` (default on) |
| `uod_seen_howto` | `"1"` after the first-run tutorial |

Wrap reads and writes in try/catch (private browsing can throw). Fall back to in-memory values.

---

## 7. PWA Requirements

### 7.1 Manifest (`manifest.webmanifest`)
- `name`: "Up or Down", `short_name`: "Up or Down"
- `start_url`: `"./"` (relative, so it works on a GitHub Pages subpath)
- `scope`: `"./"`
- `display`: `"standalone"`
- `orientation`: `"portrait"`
- `background_color` and `theme_color` matched to the hallway palette
- Icons: 192, 512, and a maskable 512

### 7.2 iOS Support
- `<meta name="apple-mobile-web-app-capable" content="yes">`
- `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`
- `<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">`
- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">`
- Disable text selection, tap highlight, and callout on the game area.

### 7.3 Service Worker (`service-worker.js`)
- Pre-cache the full app shell on install (HTML, CSS, JS, three.js, icons, manifest).
- Cache-first strategy for static assets so the game works fully offline.
- Versioned cache name (e.g. `up-or-down-v1`). Delete old caches on activate.
- Use relative paths throughout so it works under `https://<user>.github.io/<repo>/`.
- Bump the cache version on every release so updates reach players.

### 7.4 Install Experience
- Handle `beforeinstallprompt` (Android and desktop Chrome) with an optional "Install" button on the main menu.
- For iOS Safari, optionally show a tiny one-time hint ("Tap Share, then Add to Home Screen").

---

## 8. Deployment (GitHub Pages)

1. Create a GitHub repo (e.g. `up-or-down`) and push the project to `main`.
2. In the repo, go to **Settings → Pages**, set Source to "Deploy from a branch," choose `main` and `/ (root)`.
3. Game goes live at `https://<username>.github.io/up-or-down/`.
4. All paths in the code must be **relative** (`./js/main.js`, not `/js/main.js`).
5. Test the PWA install and offline mode on a real phone after each deploy.
6. Optional: connect a custom domain via the KPP Studio site later.

---

## 9. Accessibility and Quality

- Works with swipe on mobile and arrow keys or W/S on desktop.
- High-contrast HUD text.
- Honor `prefers-reduced-motion` by reducing camera shake and FOV effects.
- Sound is optional. The game is fully playable on mute.
- No flashing effects.
- Handle window resize and orientation changes without breaking the canvas.

---

## 10. Build Plan for Claude Code (Milestones)

Work in small, testable steps. Commit after each one.

1. **Scaffold:** `index.html`, CSS reset, three.js scene with camera, resize handling, and a spinning cube to confirm rendering.
2. **Hallway:** modular segments that recycle for an endless scrolling corridor, with lighting and fog.
3. **Plane + input:** paper plane model, swipe and keyboard controls, smooth HIGH/LOW lane movement with tilt.
4. **Obstacles:** floor and ceiling builders, pooling, spawner with the difficulty curve.
5. **Collision, crash, scoring:** lane-based collision, crash animation, score counter, speed ramp.
6. **Screens:** state machine, main menu, how to play, high scores, game over, pause, HUD.
7. **Storage + sound:** localStorage scores and settings, Web Audio effects, sound toggle.
8. **PWA:** manifest, icons, service worker, iOS meta tags, install prompt.
9. **Polish:** camera shake, particles on crash, FOV speed effect, menu idle animation, performance pass on a real phone.
10. **Deploy:** push to GitHub Pages, test install and offline on iPhone and Android.

---

## 11. Out of Scope (v1)

- Online leaderboards or accounts
- In-app purchases or ads
- Multiple planes, skins, or levels
- Power-ups
- Multiplayer

Possible later ideas: plane skins (unlocked by score), different wings or floors of the hospital as themes, daily challenge seed, share-your-score button.

---

## 12. Acceptance Criteria

- [ ] Game loads and runs on iPhone Safari, Android Chrome, and desktop.
- [ ] Swipe up and down reliably changes lanes with no page scroll or bounce.
- [ ] Every obstacle is clearly "over" or "under," and no unwinnable patterns appear.
- [ ] Wrong lane triggers a crash and the score is logged to high scores.
- [ ] Main menu, How to Play, High Scores, and Sound toggle all work and persist as described.
- [ ] Holds about 60 fps on a mid-range phone.
- [ ] Installs as a PWA and plays fully offline after the first load.
- [ ] Deployed and working at the GitHub Pages URL.
