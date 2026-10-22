// Game modes share the same lane/wave logic; each mode names its own theme and high-score list.
export const MODES = {
  plane: { name: 'Paper Plane', world: 'hall', minSpacing: 0.6, crashText: 'CRASH!', starYs: [0.9, 3.1] },
  wheel: { name: 'One-Wheel', world: 'outdoor', minSpacing: 0.9, crashText: 'WIPEOUT!', starYs: [0.9, 0.9, 0.9, 1.9] },
};
export const DEFAULT_MODE = 'plane';
