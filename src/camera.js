/**
 * camera.js — FIRST PERSON ONLY
 * Keeps same API so game.js won’t break.
 */

import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { SETTINGS } from './settings.js';

let _camera;
let _yaw = 0;
let _pitch = 0;

export function init(camera) {
  _camera = camera;
}

export function update(dt, physicsState, mouseDelta, shakeOffset) {
  _yaw   -= mouseDelta.dx * SETTINGS.mouseSensitivity;
  _pitch -= mouseDelta.dy * SETTINGS.mouseSensitivity;

  // tighter clamp to reduce nausea
  _pitch = Math.max(-1.2, Math.min(1.2, _pitch));

  const { pos } = physicsState;

  // head position
  const headPos = pos.clone().add(new THREE.Vector3(0, 0.95, 0));
  _camera.position.copy(headPos); // no shake to avoid sickness

  // aim quaternion
  const qYaw   = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), _yaw);
  const qPitch = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), _pitch);
  _camera.quaternion.copy(qYaw).multiply(qPitch);
}

// keep API (but always first)
export function toggleMode() {}
export function getMode() { return 'first'; }
export function getYaw() { return _yaw; }
