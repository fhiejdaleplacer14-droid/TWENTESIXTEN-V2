import settings, { saveSettings } from './Settings.js';
import en from '../data/lang/en.json';
import tl from '../data/lang/tl.json';
import ceb from '../data/lang/ceb.json';

const BUNDLES = { en, tl, ceb };
export const LANGS = [
  ['en', 'English'],
  ['tl', 'Tagalog'],
  ['ceb', 'Bisaya'],
];

export function guessLang() {
  const asked = (typeof navigator !== 'undefined' && navigator.languages) || [];
  for (const code of asked) {
    const base = code.toLowerCase().split('-')[0];
    if (base === 'tl' || base === 'fil') return 'tl';
    if (base === 'ceb') return 'ceb';
    if (base === 'en') return 'en';
  }
  return 'en';
}

export function lang() {
  return BUNDLES[settings.lang] ? settings.lang : 'en';
}

export function setLang(code) {
  settings.lang = code;
  saveSettings();
}

const find = (bundle, path) => path.split('.').reduce((at, key) => (at == null ? undefined : at[key]), bundle);
const fill = (text, vars) => (vars ? text.replace(/\{(\w+)\}/g, (all, name) => (name in vars ? vars[name] : all)) : text);

export function t(path, vars) {
  for (const bundle of [BUNDLES[lang()], en]) {
    const found = find(bundle, path);
    if (found !== undefined) return typeof found === 'string' ? fill(found, vars) : found;
  }
  return path;
}

export const nameOf = (id) => t(`names.${id}`);
