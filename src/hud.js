/**
 * hud.js
 * ─────────────────────────────────────────────────────
 * Manages all 2D HUD elements.
 * Pure DOM — no Three.js dependency.
 *
 * PUBLIC API
 * ──────────
 * update(physicsState, camMode)  — call each frame
 * setVisible(bool)               — show/hide entire HUD
 * setCameraMode(mode)            — update camera label text
 */

import { SETTINGS } from './settings.js';

// ── Cached DOM refs (queried once at module load) ─────────────────────────────

const _el = {
  speedValue:     document.getElementById('speed-value'),
  leftDot:        document.getElementById('left-tether-dot'),
  leftLabel:      document.getElementById('left-tether-label'),
  rightDot:       document.getElementById('right-tether-dot'),
  rightLabel:     document.getElementById('right-tether-label'),
  boostBar:       document.getElementById('boost-bar'),
  camMode:        document.getElementById('cam-mode'),
  hud:            document.getElementById('hud'),
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Refresh all HUD elements.
 * @param {import('./physics.js').state} physicsState
 * @param {'first'|'third'} camMode
 */
export function update(physicsState, camMode) {
  _updateSpeed(physicsState.vel.length());
  _updateTethers(physicsState.grapple);
  _updateBoost(physicsState);
  _updateCamMode(camMode);
}

/**
 * @param {boolean} visible
 */
export function setVisible(visible) {
  _el.hud.style.display = visible ? 'block' : 'none';
}

/**
 * @param {'first'|'third'} mode
 */
export function setCameraMode(mode) {
  _el.camMode.textContent = mode === 'third' ? '3RD PERSON' : '1ST PERSON';
}

// ── Private helpers ───────────────────────────────────────────────────────────

function _updateSpeed(speed) {
  const kmh = Math.round(speed * 3.6);
  _el.speedValue.textContent = kmh;

  if      (kmh > 180) _el.speedValue.className = 'ludicrous';
  else if (kmh > 90)  _el.speedValue.className = 'fast';
  else                _el.speedValue.className = '';
}

function _updateTethers(grapple) {
  _setTether(_el.leftDot,  _el.leftLabel,  grapple.left.active);
  _setTether(_el.rightDot, _el.rightLabel, grapple.right.active);
}

function _setTether(dot, label, active) {
  dot.classList.toggle('active', active);
  label.classList.toggle('active', active);
}

function _updateBoost({ boostReady, boostCooldownTimer }) {
  const fill = boostReady ? 1 : 1 - (boostCooldownTimer / SETTINGS.boostCooldown);
  _el.boostBar.style.height     = `${Math.max(0, fill) * 100}%`;
  _el.boostBar.style.background = boostReady ? '#00aaff' : '#224466';
}

function _updateCamMode(mode) {
  _el.camMode.textContent = mode === 'third' ? '3RD PERSON' : '1ST PERSON';
}
