const KEY = 'twentesixten.settings';
const touch = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

const settings = { volume: 6, textSpeed: 1, effects: touch ? 1 : 2, lang: null };

try {
  Object.assign(settings, JSON.parse(localStorage.getItem(KEY) || '{}'));
} catch {}

export function saveSettings() {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {}
}

export default settings;
