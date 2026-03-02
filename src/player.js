/**
 * player.js
 * ─────────────────────────────────────────────────────
 * Player mesh + grapple rope visuals.
 * Reads from physics.state — never writes physics data.
 *
 * Rope visibility goals:
 * - ALWAYS visible (draw on top of buildings)
 * - Thick + bright (uses TubeGeometry instead of thin Line)
 * - Works in first-person (rope still shows)
 */

import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';

// ── Module state ──────────────────────────────────────────────────────────────

let _scene;
let _playerGroup;

// Rope visuals per side
const _rope = {
  left:  { mesh: null, mat: null },
  right: { mesh: null, mat: null },
};

// Colors (still different per side, but bright)
const ROPE_COLORS = {
  left:  0x7dfff1,
  right: 0xff9ad0,
};

// Rope thickness (world units)
const ROPE_RADIUS = 0.06; // increase if you want thicker (0.08–0.12)

// ── Public API ────────────────────────────────────────────────────────────────

export function init(scene) {
  _scene = scene;
  _playerGroup = _buildPlayerMesh();
  scene.add(_playerGroup);

  // Create rope meshes (TubeGeometry) so thickness works in browsers
  for (const side of ['left', 'right']) {
    const mat = new THREE.MeshBasicMaterial({
      color: ROPE_COLORS[side],
      transparent: true,
      opacity: 0.95,
    });

    // Always visible on top
    mat.depthTest = false;
    mat.depthWrite = false;

    // Start with a tiny rope (will be replaced each frame)
    const geom = _makeRopeGeometry(new THREE.Vector3(), new THREE.Vector3(0, 0.01, 0));
    const mesh = new THREE.Mesh(geom, mat);

    // Draw last
    mesh.renderOrder = 999;
    mesh.visible = false;

    scene.add(mesh);
    _rope[side].mesh = mesh;
    _rope[side].mat = mat;
  }
}

export function update(physicsState, camMode) {
  const { pos, vel, grapple } = physicsState;

  // Sync player body
  _playerGroup.position.copy(pos);

  // Orient body toward velocity direction
  if (vel.lengthSq() > 1) {
    _playerGroup.lookAt(pos.clone().add(vel.clone().normalize()));
  }

  // Hide body in first-person, but DO NOT hide rope
  _playerGroup.visible = camMode !== 'first';

  // Update rope meshes
  for (const side of ['left', 'right']) {
    const g = grapple[side];
    const ropeMesh = _rope[side].mesh;

    if (!g.active) {
      ropeMesh.visible = false;
      continue;
    }

    ropeMesh.visible = true;

    // Replace geometry each frame (simple + reliable)
    ropeMesh.geometry.dispose();
    ropeMesh.geometry = _makeRopeGeometry(pos.clone(), g.anchor.clone());
  }
}

export function flashAnchor(pos, side) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, 8, 6),
    new THREE.MeshBasicMaterial({ color: ROPE_COLORS[side] })
  );
  mesh.position.copy(pos);
  mesh.renderOrder = 999;
  _scene.add(mesh);

  let life = 0.25;
  const tick = () => {
    life -= 0.016;
    if (life <= 0) {
      _scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
      return;
    }
    const t = life / 0.25;
    mesh.scale.setScalar(0.25 + t * 0.9);
    requestAnimationFrame(tick);
  };
  tick();
}

// ── Private helpers ───────────────────────────────────────────────────────────

function _makeRopeGeometry(a, b) {
  // Small curve from a to b
  const curve = new THREE.CatmullRomCurve3([a, b]);
  // segments, radius, radial segments
  return new THREE.TubeGeometry(curve, 12, ROPE_RADIUS, 8, false);
}

function _buildPlayerMesh() {
  const group = new THREE.Group();

  group.add(Object.assign(
    new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.4, 1.0, 8),
      new THREE.MeshPhongMaterial({ color: 0xe84040, emissive: 0x330000, shininess: 80 })
    ),
    { castShadow: true }
  ));

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.38, 8, 6),
    new THREE.MeshPhongMaterial({ color: 0xffd0a0, shininess: 60 })
  );
  head.position.y = 0.88;
  head.castShadow = true;
  group.add(head);

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
