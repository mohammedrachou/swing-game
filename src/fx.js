/**
 * fx.js
 * ─────────────────────────────────────────────────────
 * Visual effects layer — isolated from physics/world.
 * Reads only `speed` (scalar) and a camera reference.
 *
 * PUBLIC API
 * ──────────
 * init(camera)
 * update(dt, speed)
 * getShakeOffset()   → THREE.Vector3 (kept for compatibility, always zero)
 * onResize()
 *
 * EFFECTS
 * ───────
 * • FOV kick     — widens FOV smoothly as speed increases (capped)
 * • Screen shake — DISABLED (always zero to prevent motion sickness)
 * • Speed lines  — 2D overlay that never blacks out the screen
 */

import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { SETTINGS } from './settings.js';

// ── Module state ──────────────────────────────────────────────────────────────

let _camera;
const _shakeOffset = new THREE.Vector3(0, 0, 0);

// Speed lines canvas
let _slCanvas, _slCtx;

// Cache baseline FOV so we always return to normal
let _baseFov = 70;

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * @param {THREE.PerspectiveCamera} camera
 */
export function init(camera) {
  _camera = camera;

  // Store whatever the camera started with
  _baseFov = typeof _camera.fov === 'number' ? _camera.fov : 70;

  _slCanvas = _createSpeedLinesCanvas();
  _slCtx = _slCanvas.getContext('2d');
}

/**
 * Update all effects.
 * @param {number} dt     Delta-time (seconds)
 * @param {number} speed  Player speed (m/s)
 */
export function update(dt, speed) {
  _updateFOV(dt, speed);
  _updateShakeDisabled();
  _updateSpeedLines(dt, speed);
}

/** @returns {THREE.Vector3} Always zero (shake disabled). */
export function getShakeOffset() {
  return _shakeOffset;
}

/** Re-size the overlay canvas when the window resizes. */
export function onResize() {
  if (_slCanvas) {
    _slCanvas.width = window.innerWidth;
    _slCanvas.height = window.innerHeight;
  }
}

// ── Private helpers ───────────────────────────────────────────────────────────

function _createSpeedLinesCanvas() {
  const canvas = document.getElementById('speed-lines-canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  return canvas;
}

// FOV ─────────────────────────────────────────────────────────────────────────

function _updateFOV(dt, speed) {
  // Use settings if present, but apply safe caps
  const speedFOVThreshold = SETTINGS.speedFOVThreshold ?? 12;
  const speedFOVPeakSpeed = SETTINGS.speedFOVPeakSpeed ?? 40;

  // Hard safety caps to avoid nausea/warping
  const minFov = Math.max(55, SETTINGS.speedFOVMin ?? _baseFov);
  const maxFov = Math.min(82, SETTINGS.speedFOVMax ?? (_baseFov + 8));

  const lerpRate = SETTINGS.speedFOVLerpRate ?? 0.08;

  const t = clamp01((speed - speedFOVThreshold) / Math.max(1e-6, (speedFOVPeakSpeed - speedFOVThreshold)));
  const targetFov = minFov + (maxFov - minFov) * t;

  // Smoothly approach target
  _camera.fov += (targetFov - _camera.fov) * lerpRate;
  _camera.updateProjectionMatrix();
}

// Screen shake (disabled) ──────────────────────────────────────────────────────

function _updateShakeDisabled() {
  // Always zero to prevent motion sickness
  _shakeOffset.set(0, 0, 0);
}

// Speed lines ─────────────────────────────────────────────────────────────────

function _updateSpeedLines(dt, speed) {
  const speedLinesThreshold = SETTINGS.speedLinesThreshold ?? 18;
  const speedLinesMax = SETTINGS.speedLinesMax ?? 55;

  const t = clamp01((speed - speedLinesThreshold) / Math.max(1e-6, (speedLinesMax - speedLinesThreshold)));

  // Opacity scales with speed but stays reasonable
  _slCanvas.style.opacity = String((t * 0.9).toFixed(3));

  const W = _slCanvas.width, H = _slCanvas.height;
  if (t < 0.01) {
    _slCtx.clearRect(0, 0, W, H);
    return;
  }

  const cx = W / 2, cy = H / 2;

  // IMPORTANT: fade previous frame with TRANSPARENT black (not solid),
  // so it never “turns the whole screen black”.
  // Lower alpha = less darkening.
  const fade = 0.10 + (1 - t) * 0.10; // 0.10–0.20
  _slCtx.fillStyle = `rgba(0,0,0,${fade})`;
  _slCtx.fillRect(0, 0, W, H);

  // Draw outward streaks (more streaks at higher speed)
  const numStreaks = Math.floor(12 + t * 40);

  for (let i = 0; i < numStreaks; i++) {
    const angle = Math.random() * Math.PI * 2;

    // Start somewhere around center but not exactly at center
    const r = 30 + Math.random() * Math.min(W, H) * 0.45;

    // Length increases with speed
    const len = (25 + Math.random() * 110) * t;

    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;

    const dx = Math.cos(angle);
    const dy = Math.sin(angle);

    const grad = _slCtx.createLinearGradient(x, y, x + dx * len, y + dy * len);
    // Bright white/blue-ish streaks, but not too strong
    grad.addColorStop(0, `rgba(220,240,255,${0.55 * t})`);
    grad.addColorStop(1, 'rgba(220,240,255,0)');

    _slCtx.strokeStyle = grad;
    _slCtx.lineWidth = 0.8 + Math.random() * 1.2;

    _slCtx.beginPath();
    _slCtx.moveTo(x, y);
    _slCtx.lineTo(x + dx * len, y + dy * len);
    _slCtx.stroke();
  }
}

// Utils ────────────────────────────────────────────────────────────────────────

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}
