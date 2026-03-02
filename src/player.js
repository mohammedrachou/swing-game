import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';

let _scene;
let _playerGroup;

const _rope = {
  left:  { mesh: null, mat: null },
  right: { mesh: null, mat: null },
};

// Bright colors (easy to see)
const ROPE_COLORS = {
  left:  0x00ffff,
  right: 0xff00ff,
};

// Thicker 3D rope
const ROPE_RADIUS = 0.10; // <- make bigger if you want (0.12, 0.14)

export function init(scene) {
  _scene = scene;
  _playerGroup = _buildPlayerMesh();
  scene.add(_playerGroup);

  for (const side of ['left', 'right']) {
    const mat = new THREE.MeshBasicMaterial({
      color: ROPE_COLORS[side],
      transparent: true,
      opacity: 1.0,
    });

    // Always visible (not hidden by buildings)
    mat.depthTest = false;
    mat.depthWrite = false;

    // Placeholder geometry
    const geom = _makeRopeGeometry(new THREE.Vector3(), new THREE.Vector3(0, 0.01, 0));
    const mesh = new THREE.Mesh(geom, mat);

    mesh.visible = false;
    mesh.renderOrder = 999;

    scene.add(mesh);
    _rope[side].mesh = mesh;
    _rope[side].mat = mat;
  }
}

export function update(physicsState, camMode) {
  const { pos, vel, grapple } = physicsState;

  _playerGroup.position.copy(pos);

  // Face velocity (3rd person only)
  if (vel.lengthSq() > 1) {
    _playerGroup.lookAt(pos.clone().add(vel.clone().normalize()));
  }

  // Hide body in first-person, BUT keep ropes visible
  _playerGroup.visible = camMode !== 'first';

  for (const side of ['left', 'right']) {
    const g = grapple[side];
    const ropeMesh = _rope[side].mesh;

    if (!g || !g.active) {
      ropeMesh.visible = false;
      continue;
    }

    ropeMesh.visible = true;

    // Rebuild rope geometry each frame (simple + reliable)
    ropeMesh.geometry.dispose();
    ropeMesh.geometry = _makeRopeGeometry(pos.clone(), g.anchor.clone());
  }
}

export function flashAnchor(pos, side) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.8, 10, 8),
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
    mesh.scale.setScalar(0.3 + t * 0.9);
    requestAnimationFrame(tick);
  };
  tick();
}

// ---- helpers ----

function _makeRopeGeometry(a, b) {
  // Slight curve so it looks more “rope-like”
  const mid = a.clone().lerp(b, 0.5);
  mid.y -= 0.3; // tiny sag

  const curve = new THREE.CatmullRomCurve3([a, mid, b]);
  return new THREE.TubeGeometry(curve, 18, ROPE_RADIUS, 10, false);
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
