import { t } from './Lang.js';

export function watchForUpdates() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  window.addEventListener('load', async () => {
    let reg;
    try {
      reg = await navigator.serviceWorker.register('./sw.js');
    } catch {
      return;
    }
    const offer = (worker) => navigator.serviceWorker.controller && ask(worker);
    if (reg.waiting) offer(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const worker = reg.installing;
      worker.addEventListener('statechange', () => worker.state === 'installed' && offer(worker));
    });
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && reg.update().catch(() => {}));
  });
}

function ask(worker) {
  document.getElementById('update')?.remove();
  const box = document.createElement('div');
  box.id = 'update';
  const text = document.createElement('span');
  text.textContent = t('ui.update.ready');
  const later = document.createElement('button');
  later.textContent = t('ui.update.later');
  later.onclick = () => box.remove();
  const now = document.createElement('button');
  now.className = 'now';
  now.textContent = t('ui.update.now');
  now.onclick = () => {
    now.disabled = later.disabled = true;
    navigator.serviceWorker.addEventListener('controllerchange', () => location.reload());
    worker.postMessage('update');
  };
  box.append(text, later, now);
  document.body.append(box);
}
