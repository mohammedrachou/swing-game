/**
 * game.js
 * ─────────────────────────────────────────────────────
 * Top-level orchestrator. Wires up all modules and runs
 * the main loop. This file should contain NO game logic —
 * only the init sequence and the per-frame update calls.
 *
 * MODULE DEPENDENCY MAP
 * ─────────────────────
 *   game.js
 *     ├── settings.js   (constants — imported by all modules)
 *     ├── input.js      (keyboard / mouse events)
 *     ├── world.js      (scene, renderer, buildings)
 *     ├── physics.js    (player pos/vel, grapple constraint)
 *     ├── player.js     (player mesh + rope line visuals)
 *     ├── camera.js     (1st / 3rd person camera)
 *     ├── fx.js         (FOV kick, screen shake, speed lines)
 *     └── hud.js        (DOM speed/tether/boost display)
 */

import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';

import * as Input   from './input.js';
import * as World   from './world.js';
import * as Physics from './physics.js';
import * as Player  from './player.js';
import * as Camera  from './camera.js';
import * as FX      from './fx.js';
import * as HUD     from './hud.js';

// ── Core Three.js objects (set during init, used in loop) ─────────────────────

let _renderer, _scene, _camera, _clock;

// ── Init ──────────────────────────────────────────────────────────────────────

function init() {
  // 1. World creates the renderer, scene, camera, clock and seeds buildings
  const core = World.init();
  _renderer = core.renderer;
  _scene    = core.scene;
  _camera   = core.camera;
  _clock    = core.clock;

  // 2. Input attaches all keyboard/mouse listeners
  Input.init(_renderer.domElement);

  // 3. Physics gets a reference to the live building array for collision
  Physics.init(World.getBuildings());

  // 4. Player mesh + rope lines added to scene
  Player.init(_scene);

  // 5. Camera controller takes ownership of the Three.js camera
  Camera.init(_camera);

  // 6. FX gets the camera for FOV control and sets up the overlay canvas
  FX.init(_camera);

  // 7. Wire input actions to physics/camera actions
  Input.onAction('grappleLeft',   () => {
    const anchor = Physics.fireGrapple('left', _camera);
    if (anchor) Player.flashAnchor(anchor, 'left');
  });
  Input.onAction('grappleRight',  () => {
    const anchor = Physics.fireGrapple('right', _camera);
    if (anchor) Player.flashAnchor(anchor, 'right');
  });
  Input.onAction('releaseLeft',   () => Physics.releaseGrapple('left'));
  Input.onAction('releaseRight',  () => Physics.releaseGrapple('right'));
  Input.onAction('boost',         () => Physics.tryBoost());
  Input.onAction('toggleCamera',  () => Camera.toggleMode());

  // 8. Resize handler
  window.addEventListener('resize', onResize);
}

// ── Main loop ─────────────────────────────────────────────────────────────────

function loop() {
  requestAnimationFrame(loop);

  const dt    = _clock.getDelta();
  const keys  = Input.getKeys();
  const mouse = Input.consumeMouseDelta();
  const speed = Physics.state.vel.length();

  // Simulation
  Physics.update(dt, keys, _camera);

  // Visuals (all read-only access to physics.state)
  Player.update(Physics.state, Camera.getMode());
  Camera.update(dt, Physics.state, mouse, FX.getShakeOffset());
  World.updatePool(Physics.state.pos);

  // Effects & HUD
  FX.update(dt, speed);
  HUD.update(Physics.state, Camera.getMode());

  // Render
  _renderer.render(_scene, _camera);
}

// ── Resize ────────────────────────────────────────────────────────────────────

function onResize() {
  _camera.aspect = window.innerWidth / window.innerHeight;
  _camera.updateProjectionMatrix();
  _renderer.setSize(window.innerWidth, window.innerHeight);
  FX.onResize();
}

// ── Start screen ──────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  init();

  const loading = document.getElementById('loading');

  loading.addEventListener('click', () => {
    // Fade out loading screen
    loading.style.opacity = '0';
    setTimeout(() => {
      loading.style.display = 'none';
      HUD.setVisible(true);
    }, 500);

    // Grab pointer lock so mouse look works
    Input.requestPointerLock(_renderer.domElement);

    // Start game loop (called only once)
    loop();
  });

  // Start the render loop immediately so the scene is visible before clicking
  // (but physics doesn't run until click)
  _renderer.render(_scene, _camera);
});
