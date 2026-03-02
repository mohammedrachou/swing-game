/**
 * player.js
 * ─────────────────────────────────────────────────────
 * Player mesh + grapple rope line visuals.
 * Reads from physics.state — never writes physics data.
 *
 * PUBLIC API
 * ──────────
 * init(scene)              — create and add all meshes
 * update(physicsState, camMode)
 *                          — sync mesh transforms, update rope lines
 * flashAnchor(pos, side)   — quick visual pulse at a grapple attachment point
 */

import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';

// ── Module state ──────────────────────────────────────────────────────────────

let _scene;
let _playerGroup;

// Rope lines — one per grapple side
const _ropeLines = {
  left:  null,
  right: null,
};

// Rope colours
const ROPE_COLORS = {
  left:  0x00ffaa,
  right: 0xff4488,
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Build player mesh and rope lines and add them to the scene.
 * @param {THREE.Scene} scene
 */
export function init(scene) {
  _scene = scene;
  _playerGroup = _buildPlayerMesh();
  scene.add(_playerGroup);

  // Create one line per grapple side
  for (const side of ['left', 'right']) {
    const mat  = new THREE.LineBasicMaterial({
      color:       ROPE_COLORS[side],
      transparent: true,
      opacity:     0.85,
    });
    const geo  = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const line = new THREE.Line(geo, mat);
    line.visible = false;
    scene.add(line);
    _ropeLines[side] = line;
  }
}

/**
 * Sync mesh position/orientation and rope geometry each frame.
 * @param {import('./physics.js').state} physicsState
 * @param {'first'|'third'} camMode
 */
export function update(physicsState, camMode) {
  const { pos, vel, grapple } = physicsState;

  // Sync position
  _playerGroup.position.copy(pos);

  // Orient body toward velocity direction
  if (vel.lengthSq() > 1) {
    _playerGroup.lookAt(pos.clone().add(vel.clone().normalize()));
  }

  // Hide body in first-person
  _playerGroup.visible = camMode !== 'first';

  // Update rope line endpoints
  for (const side of ['left', 'right']) {
    const g    = grapple[side];
    const line = _ropeLines[side];

    if (!g.active) {
      line.visible = false;
      continue;
    }

    line.visible = true;
    line.geometry.setFromPoints([pos.clone(), g.anchor.clone()]);
  }
}

/**
 * Spawn a brief sphere pulse at the grapple attachment point.
 * @param {THREE.Vector3} pos
 * @param {'left'|'right'} side
 */
export function flashAnchor(pos, side) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.6, 6, 4),
    new THREE.MeshBasicMaterial({ color: ROPE_COLORS[side] })
  );
  mesh.position.copy(pos);
  _scene.add(mesh);

  let life = 0.25; // seconds
  const tick = () => {
    life -= 0.016;
    if (life <= 0) { _scene.remove(mesh); return; }
    const t = life / 0.25;
    mesh.scale.setScalar(0.3 + t * 0.7);
    requestAnimationFrame(tick);
  };
  tick();
}

// ── Private helpers ───────────────────────────────────────────────────────────

/** Build a simple capsule-shaped player out of primitive geometries. */
function _buildPlayerMesh() {
  const group = new THREE.Group();

  // Body
  group.add(Object.assign(
    new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.4, 1.0, 8),
      new THREE.MeshPhongMaterial({ color: 0xe84040, emissive: 0x330000, shininess: 80 })
    ),
    { castShadow: true }
  ));

  // Head
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.38, 8, 6),
    new THREE.MeshPhongMaterial({ color: 0xffd0a0, shininess: 60 })
  );
  head.position.y = 0.88;
  head.castShadow = true;
  group.add(head);

  // Legs
  const legMat = new THREE.MeshPhongMaterial({ color: 0x3050c0, shininess: 40 });
  const legGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.8, 6);

  const legL = new THREE.Mesh(legGeo, legMat);
  legL.position.set(-0.22, -0.88, 0);
  group.add(legL);

  const legR = legL.clone();
  legR.position.set(0.22, -0.88, 0);
  group.add(legR);

  return group;
}
