import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import BackdropScene from './scenes/BackdropScene.js';
import TitleScene from './scenes/TitleScene.js';
import NeighborhoodScene from './scenes/NeighborhoodScene.js';
import UIScene from './scenes/UIScene.js';
import CreditsScene from './scenes/CreditsScene.js';
import { loadFonts } from './systems/Fonts.js';
import { watchForUpdates } from './systems/Update.js';
import stage from './stage/Stage.js';
import sound from './systems/Sound.js';
import music from './systems/Music.js';

loadFonts().then(() => {
  stage.init(document.getElementById('world'));
  const game = new Phaser.Game({
    type: Phaser.WEBGL,
    parent: 'game',
    width: 960,
    height: 540,
    transparent: true,
    pixelArt: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      fullscreenTarget: document.documentElement,
    },
    input: { gamepad: true, activePointers: 3 },
    physics: {
      default: 'arcade',
      arcade: { gravity: { y: 0 }, debug: false },
    },
    scene: [BootScene, BackdropScene, TitleScene, NeighborhoodScene, UIScene, CreditsScene],
  });
  game.events.on('poststep', (time, delta) => stage.frame(Math.min(delta, 100) / 1000));
  if (new URLSearchParams(location.search).has('debug')) Object.assign(window, { game, stage, sound, music });
});

watchForUpdates();
