/**
 * game.js
 * ─────────────────────────────────────────────────────
 * Top-level orchestrator. Wires modules and runs loop.
 * NO gameplay logic here — just init + update calls.
 */

import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';

import * as Input   from './input.js';
import * as World   from './world.js';
import * as Physics from './physics.js';
import * as Player  from './player.js';
import * as Camera  from './camera.js';
import * as FX      from './fx.js';
import * as HUD     from './hud.js';

let _renderer, _scene, _camera, _clock;
let _started = false;

// ── Init ──────────────────────────────────────────────────────────────────────

function init() {
  const core = World.init();
  _renderer = core.renderer;
  _scene    = core.scene;
  _camera   = core.camera;
  _clock    = core.clock;

  // Input
  Input.init(_renderer.domElement);

  // Systems
  Physics.init(World.getBuildings());
  Player.init(_scene);
  Camera.init(_camera);
  FX.init(_camera);

  // Hook actions (only if your Input module supports onAction)
  // If it doesn't, this won't crash because we guard it.
  if (typeof Input.onAction === 'function') {
    Input.onAction('grappleLeft', () => {
      const anchor = Physics.fireGrapple?.('left', _camera);
      if (anchor) Player.flashAnchor(anchor, 'left');
    });

    Input.onAction('grappleRight', () => {
      const anchor = Physics.fireGrapple?.('right', _camera);
      if (anchor) Player.flashAnchor(anchor, 'right');
    });

    Input.onAction('releaseLeft',  () => Physics.releaseGrapple?.('left'));
    Input.onAction('releaseRight', () => Physics.releaseGrapple?.('right'));
    Input.onAction('boost',        () => Physics.tryBoost?.());
    Input.onAction('toggleCamera', () => Camera.toggleMode?.());
  }

  window.addEventListener('resize', onResize);

  // Draw one frame so the scene shows behind the overlay
  _renderer.render(_scene, _camera);
}

// ── Main loop ─────────────────────────────────────────────────────────────────

function loop() {
  requestAnimationFrame(loop);

  if (!_started) {
    // Still render so it looks alive behind the overlay
    _renderer.render(_scene, _camera);
    return;
  }

  const dt = _clock.getDelta();

  // Support both Input styles:
  // 1) getKeys() returns key state object
  // 2) isDown(code) style (physics may not use it, but we keep keys anyway)
  const keys = (typeof Input.getKeys === 'function') ? Input.getKeys() : {};
  const mouse = (typeof Input.consumeMouseDelta === 'function') ? Input.consumeMouseDelta() : { dx: 0, dy: 0 };

  // Simulation
  Physics.update(dt, keys, _camera);

  // Visuals
  const camMode = (typeof Camera.getMode === 'function') ? Camera.getMode() : 'first';
  Player.update(Physics.state, camMode);
  Camera.update(dt, Physics.state, mouse, FX.getShakeOffset());
  World.updatePool(Physics.state.pos);

  // FX & HUD
  const speed = Physics.state.vel.length();
  FX.update(dt, speed);
  if (typeof HUD.update === 'function') HUD.update(Physics.state, camMode);

  // Render
  _renderer.render(_scene, _camera);
}

// ── Resize ────────────────────────────────────────────────────────────────────

function onResize() {
  _camera.aspect = window.innerWidth / window.innerHeight;
  _camera.updateProjectionMatrix();
  _renderer.setSize(window.innerWidth, window.innerHeight);
  if (typeof FX.onResize === 'function') FX.onResize();
}

// ── Start screen wiring ───────────────────────────────────────────────────────

function getStartOverlay() {
  // Your project uses #loading, but we add fallbacks in case it changed
  return (
    document.getElementById('loading') ||
    document.getElementById('overlay') ||
    document.getElementById('start') ||
    document.querySelector('.overlay') ||
    document.querySelector('[data-start]')
  );
}

function startGame() {
  if (_started) return; // prevent double-start
  _started = true;

  // Show HUD if supported
  if (typeof HUD.setVisible === 'function') HUD.setVisible(true);

  // Request pointer lock (browser requires this inside a user gesture)
  // Use Input helper if it exists; otherwise call DOM API directly.
  try {
    if (typeof Input.requestPointerLock === 'function') {
      Input.requestPointerLock(_renderer.domElement);
    } else if (_renderer?.domElement?.requestPointerLock) {
      _renderer.domElement.requestPointerLock();
    }
  } catch (e) {
    // If school browser blocks it, game still runs without lock
  }
}

document.addEventListener('DOMContentLoaded', () => {
  init();

  const overlay = getStartOverlay();
  if (overlay) {
    overlay.style.cursor = 'pointer';

    overlay.addEventListener('click', () => {
      // Fade out overlay
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.style.display = 'none';
      }, 200);

      startGame();
    }, { once: true });
  } else {
    // No overlay found? Just start.
    startGame();
  }

  // Start RAF loop immediately (renders even before starting)
  loop();
});
