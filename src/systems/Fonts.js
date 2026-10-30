import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/700.css';

export const PIXEL = '"Pixelify Sans", monospace';
export const SERIF = 'Georgia, "Times New Roman", serif';

export function loadFonts() {
  if (!document.fonts) return Promise.resolve();
  const loads = ['400', '700'].map((weight) => document.fonts.load(`${weight} 16px "Pixelify Sans"`));
  return Promise.race([Promise.all(loads), new Promise((done) => setTimeout(done, 1000))]).catch(() => {});
}
