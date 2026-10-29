import Phaser from 'phaser';
import { gameConfig } from './game/config';
import './styles/main.css';
import { sound } from './game/systems/SoundSystem';
import { network } from './multiplayer/NetworkManager';
import type { NetworkPlayer } from './multiplayer/types';

const menu = document.getElementById('menu');
const winner = document.getElementById('winner');
const hud = document.getElementById('hud');
const controls = document.getElementById('controls');
const playButton = document.getElementById('play-button');
const createButton = document.getElementById('create-button'); const joinButton = document.getElementById('join-button');
const restartButton = document.getElementById('restart-button');
const muteButton = document.getElementById('mute-button');
if (!menu || !winner || !hud || !controls || !playButton || !createButton || !joinButton || !restartButton || !muteButton) throw new Error('Required UI is missing');

const game = new Phaser.Game(gameConfig);
let mode: 'practice' | 'online' = 'practice';
let joinMode = false; let ready = false; let onlineStarted = false;
const byId = <T extends HTMLElement>(id: string): T => { const element = document.getElementById(id); if (!element) throw new Error(`Missing #${id}`); return element as T; };
const connectScreen = byId<HTMLElement>('connect-screen'); const lobby = byId<HTMLElement>('lobby');
const connectForm = byId<HTMLFormElement>('connect-form'); const nicknameInput = byId<HTMLInputElement>('nickname-input');
const codeInput = byId<HTMLInputElement>('room-code-input'); const codeField = byId<HTMLElement>('code-field');
const connectError = byId<HTMLElement>('connect-error');
const connectionWarning = byId<HTMLElement>('connection-warning');

const renderConnection = (): void => {
  const label = network.connectionState.toUpperCase();
  byId('connection-status').textContent = label;
  byId('connection-status').className = `connection connection--${network.connectionState}`;
  const warning = network.connectionState === 'reconnecting' ? 'Connection interrupted — reconnecting…' : network.connectionState === 'disconnected' && mode === 'online' ? 'Disconnected — rejoin the room to continue.' : '';
  connectionWarning.textContent = warning; connectionWarning.classList.toggle('is-hidden', !warning);
  byId('diag-latency').textContent = `PING ${network.latencyMs || '—'}ms`;
  byId('diag-connection').textContent = label; byId('diag-room').textContent = `ROOM ${network.code || '—'}`;
  let playerCount = 0; network.room?.state?.players?.forEach(() => { playerCount += 1; }); byId('diag-players').textContent = `PLAYERS ${playerCount}`;
};

const startGame = (): void => {
  mode = 'practice';
  sound.unlock(); sound.play('button');
  menu.classList.add('is-hidden'); winner.classList.add('is-hidden'); hud.classList.remove('is-hidden'); controls.classList.remove('is-hidden');
  game.scene.stop('MenuScene'); game.scene.start('GameScene');
};

const showMenu = (): void => { mode = 'practice'; menu.classList.remove('is-hidden'); connectScreen.classList.add('is-hidden'); lobby.classList.add('is-hidden'); winner.classList.add('is-hidden'); hud.classList.add('is-hidden'); controls.classList.add('is-hidden'); connectionWarning.classList.add('is-hidden'); };
const showConnect = (joining: boolean): void => {
  joinMode = joining; menu.classList.add('is-hidden'); connectScreen.classList.remove('is-hidden');
  byId('connect-title').textContent = joining ? 'JOIN ROOM' : 'CREATE ROOM'; codeField.classList.toggle('is-hidden', !joining);
  const invited = new URLSearchParams(location.search).get('room'); if (joining && invited) codeInput.value = invited.toUpperCase();
  nicknameInput.focus();
};

const renderLobby = (): void => {
  const room = network.room; if (!room || !room.state?.players) return;
  const local = room.state.players.get(room.sessionId); const players: NetworkPlayer[] = [];
  room.state.players.forEach((player) => players.push(player));
  byId('lobby-code').textContent = network.code;
  byId('lobby-players').innerHTML = players.map((player) => `<div><i style="--player-color:#${player.color.toString(16).padStart(6, '0')}"></i><b>${player.name}</b><span>${player.host ? 'HOST' : player.ready ? 'READY' : 'WAITING'}${player.connected ? '' : ' · OFFLINE'}</span></div>`).join('');
  byId('ready-button').classList.toggle('is-hidden', Boolean(local?.host)); byId('start-button').classList.toggle('is-hidden', !local?.host);
  (byId<HTMLButtonElement>('start-button')).disabled = players.length < 2 || players.some((player) => !player.host && !player.ready);
  byId('ready-button').textContent = local?.ready ? 'NOT READY' : 'READY';
  byId('lobby-hint').textContent = players.length < 2 ? 'Waiting for at least 2 players…' : 'Ready up, then the host can start.';
  if (room.state.phase !== 'WAITING' && !onlineStarted) {
    onlineStarted = true; lobby.classList.add('is-hidden'); hud.classList.remove('is-hidden'); controls.classList.remove('is-hidden');
    game.scene.stop('GameScene'); game.scene.start('MultiplayerScene');
  }
  if (room.state.phase === 'WAITING' && onlineStarted) { onlineStarted = false; game.scene.stop('MultiplayerScene'); winner.classList.add('is-hidden'); hud.classList.add('is-hidden'); controls.classList.add('is-hidden'); lobby.classList.remove('is-hidden'); }
};

playButton.addEventListener('click', startGame);
createButton.addEventListener('click', () => showConnect(false)); joinButton.addEventListener('click', () => showConnect(true));
byId('connect-back').addEventListener('click', showMenu); byId('lobby-back').addEventListener('click', () => { network.leave(); showMenu(); });
connectForm.addEventListener('submit', async (event) => {
  event.preventDefault(); connectError.textContent = ''; const submit = byId<HTMLButtonElement>('connect-submit'); submit.disabled = true; submit.textContent = 'CONNECTING…';
  try {
    sound.unlock(); if (joinMode) await network.join(codeInput.value.trim().toUpperCase(), nicknameInput.value); else await network.create(nicknameInput.value);
    mode = 'online'; ready = false; connectScreen.classList.add('is-hidden'); lobby.classList.remove('is-hidden'); renderLobby();
  } catch (error) { connectError.textContent = error instanceof Error ? error.message : 'Connection failed.'; }
  finally { submit.disabled = false; submit.textContent = 'CONTINUE'; }
});
network.subscribe(() => { renderConnection(); renderLobby(); });
byId('ready-button').addEventListener('click', () => { ready = !ready; network.send('ready', ready); });
byId('start-button').addEventListener('click', () => network.send('start'));
byId('copy-code').addEventListener('click', async () => { await navigator.clipboard.writeText(network.code); byId('copy-code').textContent = 'COPIED!'; });
byId('share-room').addEventListener('click', async () => { const url = `${location.origin}${location.pathname}?room=${network.code}`; if (navigator.share) await navigator.share({ title: 'HOT POTATO', text: `Join my room: ${network.code}`, url }); else await navigator.clipboard.writeText(url); });
restartButton.addEventListener('click', () => { sound.unlock(); sound.play('button'); if (mode === 'online') network.send('return_lobby'); else { game.scene.stop('GameScene'); game.scene.start('GameScene'); } });
muteButton.addEventListener('click', () => { sound.unlock(); sound.setMuted(!sound.isMuted()); muteButton.textContent = sound.isMuted() ? '×' : '♪'; muteButton.setAttribute('aria-label', sound.isMuted() ? 'Unmute sound' : 'Mute sound'); });
window.addEventListener('hotpotato:menu', () => { menu.classList.remove('is-hidden'); hud.classList.add('is-hidden'); controls.classList.add('is-hidden'); });
window.addEventListener('hotpotato:online-finished', ((event: CustomEvent<{ winner?: NetworkPlayer; isHost?: boolean }>) => {
  const name = event.detail.winner?.id === network.room?.sessionId ? 'YOU WIN!' : `${event.detail.winner?.name?.toUpperCase() ?? 'NOBODY'} WINS!`;
  byId('winner-name').textContent = name; restartButton.textContent = event.detail.isHost ? 'RETURN TO LOBBY ↻' : 'WAITING FOR HOST'; restartButton.toggleAttribute('disabled', !event.detail.isHost); controls.classList.add('is-hidden'); winner.classList.remove('is-hidden');
}) as EventListener);
window.addEventListener('hotpotato:network-error', ((event: CustomEvent<string>) => { connectionWarning.textContent = event.detail; connectionWarning.classList.remove('is-hidden'); }) as EventListener);

if (import.meta.env.DEV) {
  const diagnostics = byId<HTMLElement>('diagnostics'); let frames = 0; let sampledAt = performance.now();
  document.addEventListener('keydown', (event) => { if (event.key === 'F3') { event.preventDefault(); diagnostics.classList.toggle('is-hidden'); } });
  const sampleFps = (now: number): void => { frames += 1; if (now - sampledAt >= 500) { byId('diag-fps').textContent = `FPS ${Math.round(frames * 1000 / (now - sampledAt))}`; frames = 0; sampledAt = now; } requestAnimationFrame(sampleFps); };
  requestAnimationFrame(sampleFps);
}
document.addEventListener('visibilitychange', () => { if (document.hidden) game.loop.sleep(); else game.loop.wake(); });
document.addEventListener('contextmenu', (event) => event.preventDefault());
