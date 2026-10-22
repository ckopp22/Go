const PANELS = ['hud', 'countdown', 'menu', 'howto', 'scores', 'pause', 'gameover'];
const $ = (id) => document.getElementById(id);

// Wires data-act buttons to actions[act] and exposes helpers to show screens and update text.
export function createUI(actions) {
  const els = Object.fromEntries(PANELS.map((id) => [id, $(id)]));
  const scoreEl = $('score');
  const countEl = $('countdown-num');
  const listEl = $('score-list');

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (b) actions[b.dataset.act]?.();
  });

  return {
    show(...names) {
      for (const id of PANELS) els[id].hidden = !names.includes(id);
    },

    setScore(n) {
      scoreEl.textContent = n;
    },

    setCountdown(text) {
      if (countEl.textContent === String(text)) return;
      countEl.textContent = text;
      countEl.style.animation = 'none';
      void countEl.offsetWidth;
      countEl.style.animation = '';
    },

    setMode(mode, cfg) {
      $('btn-mode').dataset.mode = mode;
      document.body.dataset.mode = mode;
      $('mode-name').textContent = cfg.name;
      $('char-picker').hidden = mode !== 'wheel';
      $('go-title').textContent = cfg.crashText;
    },

    setCharacter(name) {
      $('char-name').textContent = name;
    },

    setSound(on) {
      for (const b of document.querySelectorAll('[data-sound]')) {
        b.textContent = b.dataset.sound === 'icon' ? (on ? '🔊' : '🔇') : `SOUND: ${on ? 'ON' : 'OFF'}`;
      }
    },

    renderScores(list, recent) {
      listEl.textContent = '';
      if (!list.length) {
        const li = document.createElement('li');
        li.className = 'empty';
        li.textContent = 'No scores yet. Go fly!';
        listEl.append(li);
        return;
      }
      list.forEach((s, i) => {
        const li = document.createElement('li');
        if (recent && s.date === recent.date) li.className = 'recent';
        for (const [cls, text] of [
          ['rank', i + 1],
          ['pts', s.score],
          ['date', new Date(s.date).toLocaleDateString()],
        ]) {
          const span = document.createElement('span');
          span.className = cls;
          span.textContent = text;
          li.append(span);
        }
        listEl.append(li);
      });
    },

    showGameOver({ score, best, isNew }) {
      $('go-score').textContent = score;
      $('go-best').textContent = `Best: ${best}`;
      $('go-new').hidden = !isNew;
    },
  };
}
