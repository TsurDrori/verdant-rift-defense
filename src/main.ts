import './style.css';
import { createGame } from './phaser/game';
import { GameController } from './phaser/adapters/GameController';
import { GameUI } from './ui/GameUI';
import { AudioDirector } from './game/audio/AudioDirector';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('Application root was not found.');

app.innerHTML = '<main id="game-shell"><div id="game-root" aria-label="Verdant Rift battlefield"></div><div id="ui-root"></div></main>';
const uiRoot = document.querySelector<HTMLElement>('#ui-root');
if (!uiRoot) throw new Error('UI root was not found.');

const controller = new GameController();
const game = createGame('game-root', controller);
new GameUI(uiRoot, controller);
const audioDirector = new AudioDirector(controller, app);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) controller.discardElapsedTime();
});

const disposeRuntime = (): void => {
  audioDirector.dispose();
  game.destroy(true);
};
window.addEventListener('pagehide', disposeRuntime, { once: true });
const hot = (import.meta as ImportMeta & { hot?: { dispose(callback: () => void): void } }).hot;
if (hot) hot.dispose(disposeRuntime);

declare global { interface Window { __VERDANT_RIFT__?: GameController; __VERDANT_RIFT_GAME__?: ReturnType<typeof createGame>; __VERDANT_RIFT_AUDIO__?: AudioDirector } }
window.__VERDANT_RIFT__ = controller;
window.__VERDANT_RIFT_GAME__ = game;
window.__VERDANT_RIFT_AUDIO__ = audioDirector;
