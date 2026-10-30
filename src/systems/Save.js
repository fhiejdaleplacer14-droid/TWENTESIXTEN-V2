const KEY = 'twentesixten.save';
const VERSION = 2;

export function loadSave() {
  try {
    const save = JSON.parse(localStorage.getItem(KEY) || 'null');
    return save && save.version === VERSION ? save : null;
  } catch {
    return null;
  }
}

export function writeSave(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ version: VERSION, ...state }));
  } catch {}
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
