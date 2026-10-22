const SWIPE_PX = 30;

// Calls onMove('up' | 'down' | 'left' | 'right') on swipes (fired on touchmove) and arrow keys / WASD.
// Touches that start on a button are left alone so menu taps still work.
export function createInput(onMove) {
  let startX = 0;
  let startY = 0;
  let touchId = null;

  const onButton = (e) => e.target.closest && e.target.closest('button');
  const find = (e) => {
    for (const t of e.changedTouches) if (t.identifier === touchId) return t;
    return null;
  };

  window.addEventListener('touchstart', (e) => {
    if (onButton(e)) return;
    e.preventDefault();
    if (touchId !== null) return;
    const t = e.changedTouches[0];
    touchId = t.identifier;
    startX = t.clientX;
    startY = t.clientY;
  }, { passive: false });

  window.addEventListener('touchmove', (e) => {
    if (onButton(e)) return;
    e.preventDefault();
    const t = find(e);
    if (!t) return;
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    if (Math.max(ax, ay) < SWIPE_PX) return;
    onMove(ay >= ax ? (dy < 0 ? 'up' : 'down') : (dx < 0 ? 'left' : 'right'));
    startX = t.clientX;
    startY = t.clientY;
  }, { passive: false });

  const end = (e) => {
    if (onButton(e)) return;
    e.preventDefault();
    if (find(e)) touchId = null;
  };
  window.addEventListener('touchend', end, { passive: false });
  window.addEventListener('touchcancel', end, { passive: false });

  for (const type of ['gesturestart', 'gesturechange', 'contextmenu']) {
    window.addEventListener(type, (e) => e.preventDefault());
  }

  const KEYS = {
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
  };
  window.addEventListener('keydown', (e) => {
    const dir = KEYS[e.code];
    if (!dir || e.repeat) return;
    e.preventDefault();
    onMove(dir);
  });
}
