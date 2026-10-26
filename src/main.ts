import Phaser from 'phaser';
import { gameConfig } from './game/config';
import './styles/main.css';
import { sound } from './game/systems/SoundSystem';

const menu = document.getElementById('menu');
const winner = document.getElementById('winner');
const hud = document.getElementById('hud');
const controls = document.getElementById('controls');
const playButton = document.getElementById('play-button');
const restartButton = document.getElementById('restart-button');
const muteButton = document.getElementById('mute-button');
if (!menu || !winner || !hud || !controls || !playButton || !restartButton || !muteButton) throw new Error('Required UI is missing');

const game = new Phaser.Game(gameConfig);

const startGame = (): void => {
  sound.unlock(); sound.play('button');
  menu.classList.add('is-hidden'); winner.classList.add('is-hidden'); hud.classList.remove('is-hidden'); controls.classList.remove('is-hidden');
  game.scene.stop('MenuScene'); game.scene.start('GameScene');
};

playButton.addEventListener('click', startGame);
restartButton.addEventListener('click', () => { sound.unlock(); sound.play('button'); game.scene.stop('GameScene'); game.scene.start('GameScene'); });
muteButton.addEventListener('click', () => { sound.unlock(); sound.setMuted(!sound.isMuted()); muteButton.textContent = sound.isMuted() ? '×' : '♪'; muteButton.setAttribute('aria-label', sound.isMuted() ? 'Unmute sound' : 'Mute sound'); });
window.addEventListener('hotpotato:menu', () => { menu.classList.remove('is-hidden'); hud.classList.add('is-hidden'); controls.classList.add('is-hidden'); });
document.addEventListener('visibilitychange', () => { if (document.hidden) game.loop.sleep(); else game.loop.wake(); });
document.addEventListener('contextmenu', (event) => event.preventDefault());
