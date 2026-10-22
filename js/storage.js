const KEYS = { scores: 'uod_highscores', sound: 'uod_sound', howto: 'uod_seen_howto', iosHint: 'uod_seen_ioshint', mode: 'uod_mode', character: 'uod_character', scoresWheel: 'uod_highscores_wheel' };
const scoresKey = (mode) => (mode === 'wheel' ? KEYS.scoresWheel : KEYS.scores);
const MAX_SCORES = 10;
const memory = {}; // fallback when localStorage throws (private browsing)

function read(key) {
  try {
    const v = localStorage.getItem(key);
    if (v !== null) return v;
  } catch (e) { /* use memory */ }
  return key in memory ? memory[key] : null;
}

function write(key, value) {
  memory[key] = value;
  try { localStorage.setItem(key, value); } catch (e) { /* memory only */ }
}

export function getScores(mode) {
  try {
    const list = JSON.parse(read(scoresKey(mode)) || '[]');
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

// Logs a finished run. Returns the saved entry if it made the top 10, else null.
export function addScore(score, mode) {
  if (score <= 0) return null;
  const entry = { score, date: new Date().toISOString() };
  const list = [...getScores(mode), entry].sort((a, b) => b.score - a.score).slice(0, MAX_SCORES);
  write(scoresKey(mode), JSON.stringify(list));
  return list.includes(entry) ? entry : null;
}

export function clearScores(mode) {
  write(scoresKey(mode), '[]');
}

export const getSound = () => read(KEYS.sound) !== 'off';
export const setSound = (on) => write(KEYS.sound, on ? 'on' : 'off');

export const hasSeenHowto = () => read(KEYS.howto) === '1';
export const setSeenHowto = () => write(KEYS.howto, '1');

export const getMode = () => (read(KEYS.mode) === 'wheel' ? 'wheel' : 'plane');
export const setMode = (mode) => write(KEYS.mode, mode);

export const getCharacter = () => read(KEYS.character) || 'boy';
export const setCharacter = (id) => write(KEYS.character, id);

export const hasSeenInstallHint = () => read(KEYS.iosHint) === '1';
export const setSeenInstallHint = () => write(KEYS.iosHint, '1');
