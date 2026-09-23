import './dev-raf';
import { ICON } from './ui/icons';
import { App } from './app';

for (const el of document.querySelectorAll<HTMLElement>('[data-icon]')) {
  const name = el.dataset.icon as keyof typeof ICON;
  el.insertAdjacentHTML('afterbegin', ICON[name] ?? '');
}
document.getElementById('menuBtn')!.innerHTML = ICON.menu;
document.getElementById('collapseBtn')!.innerHTML = ICON.chevron;
document.getElementById('menuClose')!.innerHTML = ICON.close;

const setVh = () => document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
setVh();
window.addEventListener('resize', setVh);

const app = new App();
if (import.meta.env.DEV) Object.assign(window, { __app: app });
