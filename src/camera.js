/**
 * camera.js
 * ─────────────────────────────────────────────────────
 * Manages first-person and third-person camera modes.
 * Reads player position + velocity from physics.state.
 * Applies screen shake offset computed by fx.js.
 *
 * PUBLIC API
 * ──────────
 * init(threeCamera)           — set the camera to control
 * update(dt, physicsState, mouseDelta, shakeOffset)
 * toggleMode()                — switch 1st ↔ 3rd person
 * getMode()                   → 'first' | 'third'
 * getYaw()                    → current yaw angle (radians)
 */

import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { SETTINGS } from './settings.js';

// ── Module state ──────────────────────────────────────────────────────────────

let _camera;
let _mode = 'third';   // 'first' | 'third'
let _yaw  = 0;         // horizontal rotation (radians)
let _pitch = 0;        // vertical rotation (radians)

// Spring-follow state for third-person camera
const _camPos    = new THREE.Vector3();  // current smoothed position
const _camTarget = new THREE.Vector3();  // desired position

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * @param {THREE.PerspectiveCamera} camera
 */
export function init(camera) {
  _camera = camera;
}

/**
 * Advance camera each frame.
 * @param {number}          dt
 * @param {object}          physicsState   physics.state
 * @param {{ dx, dy }}      mouseDelta     from input.consumeMouseDelta()
 * @param {THREE.Vector3}   shakeOffset    from fx.getShakeOffset()
 */
export function update(dt, physicsState, mouseDelta, shakeOffset) {
  // Mouse look — update yaw/pitch from delta
  _yaw   -= mouseDelta.dx * SETTINGS.mouseSensitivity;
  _pitch -= mouseDelta.dy * SETTINGS.mouseSensitivity;
  _pitch  = Math.max(-1.4, Math.min(1.4, _pitch)); // clamp vertical

  if (_mode === 'third') {
    _updateThirdPerson(dt, physicsState, shakeOffset);
  } else {
    _updateFirstPerson(dt, physicsState, shakeOffset);
  }
}

/** Toggle between first and third person. */
export function toggleMode() {
  _mode = _mode === 'third' ? 'first' : 'third';
}

/** @returns {'first'|'third'} */
export function getMode() {
  return _mode;
}

/** @returns {number} Current yaw in radians. */
export function getYaw() {
  return _yaw;
}

// ── Private helpers ───────────────────────────────────────────────────────────

function _updateThirdPerson(dt, { pos }, shakeOffset) {
  // Compute ideal camera position: behind + above player based on yaw
  const camDirH = new THREE.Vector3(Math.sin(_yaw), 0, Math.cos(_yaw));

  _camTarget
    .copy(pos)
    .addScaledVector(camDirH, -SETTINGS.thirdPersonDist)
    .add(new THREE.Vector3(0, SETTINGS.thirdPersonHeight, 0));

  // Critically-damped spring follow
  const alpha = 1 - Math.exp(-SETTINGS.camSpringStiffness * (1 - SETTINGS.camSpringDamping) * dt);
  _camPos.lerp(_camTarget, alpha);

  _camera.position.copy(_camPos).add(shakeOffset);
  _camera.lookAt(pos.clone().add(new THREE.Vector3(0, 0.8, 0)));

  // Apply partial pitch tilt
  _camera.rotateX(_pitch * 0.4);
}

function _updateFirstPerson(dt, { pos, vel }, shakeOffset) {
  const headPos = pos.clone().add(new THREE.Vector3(0, 0.9, 0));
  _camera.position.copy(headPos).add(shakeOffset);

  // Full yaw + pitch quaternion
  const qYaw   = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), _yaw);
  const qPitch = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), _pitch);
  _camera.quaternion.copy(qYaw).multiply(qPitch);

  // Subtle speed-based head sway (roll only, no pitch to avoid nausea)
  const speed = vel.length();
  const sway  = Math.sin(Date.now() * 0.004) * SETTINGS.firstPersonSway * Math.min(speed / 20, 1);
  _camera.rotateZ(sway * dt * 3);
}
