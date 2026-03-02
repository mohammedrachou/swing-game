/**
 * fx.js
 * ─────────────────────────────────────────────────────
 * Visual effects layer — completely isolated from physics/world.
 * Every effect reads only `speed` (a scalar) or a camera reference.
 *
 * PUBLIC API
 * ──────────
 * init(camera)                — pass the Three.js camera once at startup
 * update(dt, speed)           — call each frame with current player speed
 * getShakeOffset()            → THREE.Vector3  (applied by camera.js)
 *
 * EFFECTS
 * ───────
 * • FOV kick    — widens FOV smoothly as speed increases
 * • Screen shake — random offset Vector3 scales with speed
 * • Speed lines — 2D canvas overlay with radial streak particles
 */

import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { SETTINGS } from './settings.js';

// ── Module state ──────────────────────────────────────────────────────────────

let _camera;
let _shakeOffset   = new THREE.Vector3();
let _shakeIntensity = 0;

// Speed lines canvas
let _slCanvas, _slCtx;

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * @param {THREE.PerspectiveCamera} camera
 */
export function init(camera) {
  _camera   = camera;
  _slCanvas = _createSpeedLinesCanvas();
  _slCtx    = _slCanvas.getContext('2d');
}

/**
 * Update all effects.
 * @param {number} dt     Delta-time (seconds)
 * @param {number} speed  Player speed (m/s)
 */
export function update(dt, speed) {
  _updateFOV(speed);
  _updateShake(dt, speed);
  _updateSpeedLines(speed);
}

/** @returns {THREE.Vector3} Shake displacement to add to camera position. */
export function getShakeOffset() {
  return _shakeOffset;
}

/** Re-size the overlay canvas when the window resizes. */
export function onResize() {
  if (_slCanvas) {
    _slCanvas.width  = window.innerWidth;
    _slCanvas.height = window.innerHeight;
  }
}

// ── Private helpers ───────────────────────────────────────────────────────────

function _createSpeedLinesCanvas() {
  const canvas = document.getElementById('speed-lines-canvas');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  return canvas;
}

// FOV ─────────────────────────────────────────────────────────────────────────

function _updateFOV(speed) {
  const { speedFOVMin, speedFOVMax, speedFOVThreshold, speedFOVPeakSpeed, speedFOVLerpRate } = SETTINGS;
  const t   = Math.max(0, Math.min((speed - speedFOVThreshold) / (speedFOVPeakSpeed - speedFOVThreshold), 1));
  const fov = speedFOVMin + (speedFOVMax - speedFOVMin) * t;

  _camera.fov += (fov - _camera.fov) * speedFOVLerpRate;
  _camera.updateProjectionMatrix();
}

// Screen shake ────────────────────────────────────────────────────────────────

function _updateShake(dt, speed) {
  const { speedShakeThreshold, speedShakeMax, screenShakeAmount, shakeRampUp, shakeDecay } = SETTINGS;

  if (speed > speedShakeThreshold) {
    const factor = Math.min((speed - speedShakeThreshold) / 30, 1) * screenShakeAmount;
    _shakeIntensity = Math.min(_shakeIntensity + dt * shakeRampUp, speedShakeMax * factor);
  } else {
    _shakeIntensity *= shakeDecay;
  }

  if (_shakeIntensity > 0.002) {
    _shakeOffset.set(
      (Math.random() - 0.5) * 2 * _shakeIntensity,
      (Math.random() - 0.5) * 2 * _shakeIntensity,
      0
    );
  } else {
    _shakeOffset.set(0, 0, 0);
  }
}

// Speed lines ─────────────────────────────────────────────────────────────────

function _updateSpeedLines(speed) {
  const { speedLinesThreshold, speedLinesMax } = SETTINGS;
  const t = Math.max(0, Math.min((speed - speedLinesThreshold) / (speedLinesMax - speedLinesThreshold), 1));

  _slCanvas.style.opacity = t.toFixed(3);
  if (t < 0.01) {
    _slCtx.clearRect(0, 0, _slCanvas.width, _slCanvas.height);
    return;
  }

  const W = _slCanvas.width, H = _slCanvas.height;
  const cx = W / 2,          cy = H / 2;

  // Partially fade previous frame for a motion trail effect
  _slCtx.fillStyle = `rgba(0,0,0,${0.35 + (1 - t) * 0.3})`;
  _slCtx.fillRect(0, 0, W, H);

  // Draw radial outward streaks
  const numStreaks = Math.floor(t * 40);
  for (let i = 0; i < numStreaks; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r     = 50 + Math.random() * Math.min(W, H) * 0.4;
    const len   = (20 + Math.random() * 80) * t;
    const x     = cx + Math.cos(angle) * r;
    const y     = cy + Math.sin(angle) * r;
    const dx    = (x - cx) / r;   // outward unit vector
    const dy    = (y - cy) / r;

    const grad = _slCtx.createLinearGradient(x, y, x + dx * len, y + dy * len);
    grad.addColorStop(0, `rgba(100,180,255,${t * 0.7})`);
    grad.addColorStop(1, 'rgba(100,180,255,0)');

    _slCtx.strokeStyle = grad;
    _slCtx.lineWidth   = 0.5 + Math.random() * 1.5;
    _slCtx.beginPath();
    _slCtx.moveTo(x, y);
    _slCtx.lineTo(x + dx * len, y + dy * len);
    _slCtx.stroke();
  }
}
