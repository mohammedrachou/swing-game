/**
 * physics.js
 * ─────────────────────────────────────────────────────
 * Player physics and grapple rope constraint.
 * Completely decoupled from rendering — operates only
 * on plain THREE.Vector3 state that other modules read.
 *
 * PUBLIC API
 * ──────────
 * init(buildings)            — pass in the live building array (reference)
 * update(dt, keys, camera)   — advance simulation one step
 *
 * STATE (read by other modules, never write from outside)
 * ──────
 * state.pos     THREE.Vector3  player world position
 * state.vel     THREE.Vector3  player velocity (m/s)
 * state.grapple { left, right }  grapple objects (see GrappleState typedef)
 *
 * ACTIONS (called by game.js in response to input events)
 * ───────
 * fireGrapple(side, camera)   — 'left' | 'right'
 * releaseGrapple(side)
 * tryBoost()
 *
 * INTERNALS
 * ─────────
 * _applyGrappleConstraint — spring + hard-project rope constraint (see comments)
 * _resolveBuildings       — AABB collision response
 */

import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { SETTINGS } from './settings.js';

// ── Shared mutable state ──────────────────────────────────────────────────────

/**
 * @typedef {{ active: boolean, anchor: THREE.Vector3, length: number }} GrappleState
 */
export const state = {
  pos:  new THREE.Vector3(0, 30, 0),
  vel:  new THREE.Vector3(8, 0, 0),

  /** @type {{ left: GrappleState, right: GrappleState }} */
  grapple: {
    left:  { active: false, anchor: new THREE.Vector3(), length: 0 },
    right: { active: false, anchor: new THREE.Vector3(), length: 0 },
  },

  // Boost timers (read by hud.js for the boost bar)
  boostReady:        true,
  boostTimer:        0,    // seconds of boost remaining
  boostCooldownTimer:0,    // seconds until boost reloads
};

// ── Private references ────────────────────────────────────────────────────────

let _buildings = [];  // live reference from world.js

// ── Reusable vectors (avoid GC pressure) ─────────────────────────────────────
const _fwd    = new THREE.Vector3();
const _strafe = new THREE.Vector3();
const _steer  = new THREE.Vector3();
const _toAnchor = new THREE.Vector3();

// ── Init ──────────────────────────────────────────────────────────────────────

/**
 * @param {Array} buildings  Live array from world.js — physics reads AABB data.
 */
export function init(buildings) {
  _buildings = buildings;
}

// ── Actions ───────────────────────────────────────────────────────────────────

/**
 * Attempt to fire the named grapple toward the nearest valid anchor.
 * No-ops if that grapple is already active.
 * @param {'left'|'right'} side
 * @param {THREE.Camera}   camera  Used to determine aim direction.
 * @returns {THREE.Vector3|null}  The anchor point if successful, else null.
 */
export function fireGrapple(side, camera) {
  const g = state.grapple[side];
  if (g.active) return null;

  const anchor = _findAnchor(side, camera);
  if (!anchor) return null;

  g.anchor.copy(anchor);
  g.length = Math.min(anchor.distanceTo(state.pos), SETTINGS.maxRopeLength);
  g.active = true;
  return anchor.clone();
}

/**
 * Detach the named grapple and apply the release momentum boost.
 * @param {'left'|'right'} side
 */
export function releaseGrapple(side) {
  const g = state.grapple[side];
  if (!g.active) return;
  g.active = false;
  state.vel.multiplyScalar(SETTINGS.releaseBoostMult);
}

/**
 * Trigger the space-bar boost if cooled down.
 */
export function tryBoost() {
  if (!state.boostReady) return;
  state.boostReady        = false;
  state.boostTimer        = SETTINGS.boostDuration;
  state.boostCooldownTimer = SETTINGS.boostCooldown;
}

// ── Main update ───────────────────────────────────────────────────────────────

/**
 * Advance physics by dt seconds.
 * @param {number}          dt
 * @param {{ [code]: boolean }} keys   From input.getKeys()
 * @param {THREE.Camera}    camera     For air-steering relative to view direction.
 */
export function update(dt, keys, camera) {
  dt = Math.min(dt, 0.033); // prevent spiral-of-death on tab-switch

  _applyGravity(dt);
  _applyAirDrag(dt);
  _applyAirSteering(dt, keys, camera);
  _applyBoost(dt, keys, camera);
  _applyGrappleConstraint(state.grapple.left,  dt, keys);
  _applyGrappleConstraint(state.grapple.right, dt, keys);
  _integrate(dt);
  _resolveGround();
  _resolveBuildings();
  _validateGrapples();
}

// ── Private physics steps ─────────────────────────────────────────────────────

function _applyGravity(dt) {
  state.vel.y += SETTINGS.gravity * dt;
}

function _applyAirDrag(dt) {
  // Exponential drag: vel *= (1 - drag)^(60*dt) approximated cheaply
  state.vel.multiplyScalar(1 - SETTINGS.airDrag * 60 * dt);
}

function _applyAirSteering(dt, keys, camera) {
  camera.getWorldDirection(_fwd);
  _fwd.y = 0;
  _fwd.normalize();
  _strafe.crossVectors(_fwd, new THREE.Vector3(0, 1, 0));

  _steer.set(0, 0, 0);
  if (keys['KeyW'] || keys['ArrowUp'])    _steer.addScaledVector(_fwd,    1);
  if (keys['KeyS'] || keys['ArrowDown'])  _steer.addScaledVector(_fwd,   -1);
  if (keys['KeyA'] || keys['ArrowLeft'])  _steer.addScaledVector(_strafe, 1);
  if (keys['KeyD'] || keys['ArrowRight']) _steer.addScaledVector(_strafe,-1);

  if (_steer.lengthSq() < 0.001) return;
  _steer.normalize();

  // Only add steering up to the max contribution
  const horizVel = new THREE.Vector3(state.vel.x, 0, state.vel.z);
  const currentInDir = horizVel.dot(_steer);
  if (currentInDir >= SETTINGS.airControlMax) return;

  const force = Math.min(
    SETTINGS.airControlForce * dt,
    SETTINGS.airControlMax - currentInDir
  );
  state.vel.addScaledVector(_steer, force);
}

function _applyBoost(dt, keys, camera) {
  if (state.boostTimer > 0) {
    state.boostTimer -= dt;
    camera.getWorldDirection(_fwd);
    const impulsePerSecond = SETTINGS.boostImpulse / SETTINGS.boostDuration;
    state.vel.addScaledVector(_fwd, impulsePerSecond * dt);
  }

  if (!state.boostReady) {
    state.boostCooldownTimer -= dt;
    if (state.boostCooldownTimer <= 0) {
      state.boostReady = true;
    }
  }
}

/**
 * Rope constraint using a spring + hard position projection.
 *
 * HOW IT WORKS:
 *  1. When the player is further from the anchor than rope length,
 *     apply a spring impulse toward the anchor (proportional to stretch).
 *  2. Also damp the outward velocity component (like rope inelasticity).
 *  3. Hard-project the position back onto the sphere of radius=length
 *     to prevent tunneling at high speed.
 *  4. If swinging downward, add a tiny tangential energy boost (pump assist)
 *     so chains stay alive without the player consciously timing releases.
 *
 * @param {GrappleState} g
 * @param {number}       dt
 * @param {{ [code]: boolean }} keys
 */
function _applyGrappleConstraint(g, dt, keys) {
  if (!g.active) return;

  // Allow the player to reel rope in/out with W/S
  if (keys['KeyW'] && g.length > SETTINGS.minRopeLength)
    g.length -= SETTINGS.ropeShortenSpeed * dt;
  if (keys['KeyS'] && g.length < SETTINGS.maxRopeLength)
    g.length += SETTINGS.ropeExtendSpeed * dt;

  _toAnchor.subVectors(g.anchor, state.pos);
  const dist = _toAnchor.length();
  if (dist < 0.001) return;

  const dir = _toAnchor.clone().divideScalar(dist); // normalised

  // Only constrain when taut
  if (dist <= g.length) return;

  const stretch = dist - g.length;

  // 1. Spring force: pulls player toward anchor proportional to stretch
  const springImpulse = stretch * SETTINGS.ropeStiffness;

  // 2. Velocity damping: reduce the outward (away from anchor) component
  const velAwayFromAnchor = -state.vel.dot(dir); // positive when moving away
  const dampImpulse = Math.max(0, velAwayFromAnchor) * SETTINGS.ropeDamping * 60;

  state.vel.addScaledVector(dir, (springImpulse + dampImpulse) * dt);

  // 3. Hard position projection — keeps player on the sphere surface
  _toAnchor.subVectors(g.anchor, state.pos); // recompute after vel change
  if (_toAnchor.length() > g.length) {
    // Move player to exactly rope length from anchor
    state.pos.copy(g.anchor).addScaledVector(_toAnchor.normalize().negate(), g.length);
    // Remove any remaining outward velocity
    const vr = state.vel.dot(_toAnchor.normalize());
    if (vr < 0) state.vel.addScaledVector(_toAnchor.normalize(), -vr);
  }

  // 4. Swing pump assist — gain energy naturally when swinging downward
  const velNorm = state.vel.clone().normalize();
  const downDot = new THREE.Vector3(0, -1, 0).dot(velNorm);
  if (downDot > 0) {
    state.vel.multiplyScalar(SETTINGS.swingBoostFactor);
  }
}

function _integrate(dt) {
  state.pos.addScaledVector(state.vel, dt);
}

function _resolveGround() {
  const floor = SETTINGS.groundY + 1.4; // 1.4 = half-height of player capsule
  if (state.pos.y < floor) {
    state.pos.y = floor;
    if (state.vel.y < 0) {
      state.vel.y = Math.abs(state.vel.y) * 0.2; // small bounce
      state.vel.x *= 0.7;
      state.vel.z *= 0.7;
    }
  }
}

/** Simple AABB push-out against buildings. */
function _resolveBuildings() {
  const r = 0.5; // player capsule radius

  for (const b of _buildings) {
    const { pos, halfW, halfD, topY } = b;
    const px = state.pos.x, py = state.pos.y, pz = state.pos.z;

    const bx1 = pos.x - halfW - r, bx2 = pos.x + halfW + r;
    const bz1 = pos.z - halfD - r, bz2 = pos.z + halfD + r;
    const by1 = SETTINGS.groundY,  by2 = topY + r;

    // Not inside AABB — skip
    if (px <= bx1 || px >= bx2 || pz <= bz1 || pz >= bz2 || py <= by1 || py >= by2) continue;

    // Find shallowest overlap axis and push out along it
    const ox1 = px - bx1, ox2 = bx2 - px;
    const oz1 = pz - bz1, oz2 = bz2 - pz;
    const oy1 = py - by1, oy2 = by2 - py;

    const minX = Math.min(ox1, ox2);
    const minZ = Math.min(oz1, oz2);
    const minY = Math.min(oy1, oy2);

    if (minY < minX && minY < minZ) {
      // Push vertically
      if (oy1 < oy2) { state.pos.y = by1; state.vel.y = 0; }
      else           { state.pos.y = by2; if (state.vel.y < 0) state.vel.y = 0; }
    } else if (minX < minZ) {
      state.pos.x  = ox1 < ox2 ? bx1 : bx2;
      state.vel.x *= -0.3;
      state.vel.multiplyScalar(0.75); // absorb speed on impact
    } else {
      state.pos.z  = oz1 < oz2 ? bz1 : bz2;
      state.vel.z *= -0.3;
      state.vel.multiplyScalar(0.75);
    }
  }
}

/** Detach any grapple whose anchor has drifted impossibly far. */
function _validateGrapples() {
  for (const side of ['left', 'right']) {
    const g = state.grapple[side];
    if (g.active && g.anchor.distanceTo(state.pos) > SETTINGS.maxRopeLength * 1.5) {
      releaseGrapple(side);
    }
  }
}

// ── Anchor finding ────────────────────────────────────────────────────────────

/**
 * Find the best grapple anchor in the aimed direction.
 * Scores candidates by distance penalised by angular deviation,
 * so the closest building in roughly the right direction wins.
 *
 * @param {'left'|'right'} side
 * @param {THREE.Camera}   camera
 * @returns {THREE.Vector3|null}
 */
function _findAnchor(side, camera) {
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);

  // Slight left/right bias so dual grapples land on different buildings
  const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0,1,0)).normalize();
  dir.addScaledVector(right, side === 'left' ? -0.2 : 0.2).normalize();

  let bestScore = Infinity;
  let bestPoint = null;

  for (const b of _buildings) {
    const top = new THREE.Vector3(b.pos.x, b.topY, b.pos.z);
    const toTop = top.clone().sub(state.pos);
    const dist  = toTop.length();

    if (dist > SETTINGS.grappleRange) continue;

    const dot = dir.dot(toTop.normalize());
    if (dot < 0.1) continue; // behind or sideways — ignore

    // Lower score = better candidate
    const score = dist / (dot * dot + 0.1);
    if (score < bestScore) {
      bestScore = score;
      bestPoint = top;
    }
  }

  return bestPoint;
}
