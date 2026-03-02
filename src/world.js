/**
 * world.js
 * ─────────────────────────────────────────────────────
 * Everything that makes up the environment:
 *   • Three.js renderer, scene, lights
 *   • Ground plane + grid
 *   • Procedural sky dome (GLSL gradient + stars)
 *   • Building pool with spawn / despawn logic
 *
 * PUBLIC API
 * ──────────
 * init()                  → { renderer, scene, camera, clock }
 * getBuildings()          → live Array of building data objects
 * updatePool(playerPos)   — call once per frame to manage spawn/despawn
 *
 * BUILDING DATA SHAPE  (consumed by physics.js for collision)
 * ─────────────────────
 * {
 *   mesh:  THREE.Mesh,
 *   pos:   THREE.Vector3,   // centre of building
 *   halfW: number,          // half-width  (X)
 *   halfD: number,          // half-depth  (Z)
 *   topY:  number,          // world-space Y of the roof
 * }
 */

import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { SETTINGS } from './settings.js';

// ── Module-level state ────────────────────────────────────────────────────────

let _scene, _renderer;
const _buildings = [];

// Pre-allocated building materials (shared across all buildings for performance)
const _buildingMaterials = [
  new THREE.MeshPhongMaterial({ color: 0x1a2040, emissive: 0x050810, shininess: 60 }),
  new THREE.MeshPhongMaterial({ color: 0x152030, emissive: 0x050608, shininess: 80 }),
  new THREE.MeshPhongMaterial({ color: 0x203050, emissive: 0x080c14, shininess: 40 }),
  new THREE.MeshPhongMaterial({ color: 0x0d1520, emissive: 0x04080e, shininess: 100 }),
];

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Create and return all Three.js core objects.
 * @returns {{ renderer: THREE.WebGLRenderer, scene: THREE.Scene,
 *             camera: THREE.PerspectiveCamera, clock: THREE.Clock }}
 */
export function init() {
  _renderer = _createRenderer();
  _scene    = _createScene();

  const camera = new THREE.PerspectiveCamera(
    SETTINGS.speedFOVMin,
    window.innerWidth / window.innerHeight,
    0.1, 1000
  );

  const clock = new THREE.Clock();

  _addLights(_scene);
  _buildGround(_scene);
  _buildSky(_scene);

  // Seed the building pool
  const fakePlayerPos = new THREE.Vector3(0, 0, 0);
  for (let i = 0; i < SETTINGS.buildingsTarget; i++) {
    _spawnBuilding(fakePlayerPos);
  }

  return { renderer: _renderer, scene: _scene, camera, clock };
}

/** @returns {Array} Live array of building data (read by physics, renderer). */
export function getBuildings() {
  return _buildings;
}

/**
 * Spawn new buildings ahead of the player and despawn distant ones.
 * Call once per frame.
 * @param {THREE.Vector3} playerPos
 */
export function updatePool(playerPos) {
  // Despawn buildings that are too far behind
  for (let i = _buildings.length - 1; i >= 0; i--) {
    const b = _buildings[i];
    const dx = b.pos.x - playerPos.x;
    const dz = b.pos.z - playerPos.z;
    if (Math.sqrt(dx * dx + dz * dz) > SETTINGS.buildingDespawnRadius) {
      _scene.remove(b.mesh);
      b.mesh.geometry.dispose();
      _buildings.splice(i, 1);
    }
  }

  // Spawn until pool is full
  while (_buildings.length < SETTINGS.buildingsTarget) {
    _spawnBuilding(playerPos);
  }
}

// ── Private helpers ───────────────────────────────────────────────────────────

function _createRenderer() {
  const r = new THREE.WebGLRenderer({ antialias: true });
  r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  r.setSize(window.innerWidth, window.innerHeight);
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.1;

  // Mount canvas behind HUD
  r.domElement.style.cssText = 'position:fixed;top:0;left:0;z-index:1;';
  document.body.appendChild(r.domElement);

  return r;
}

function _createScene() {
  const s = new THREE.Scene();
  s.background = new THREE.Color(0x0a0d1a);
  s.fog = new THREE.FogExp2(0x0a0d1a, 0.006);
  return s;
}

function _addLights(scene) {
  scene.add(new THREE.AmbientLight(0x1a1a2e, 1.2));

  const sun = new THREE.DirectionalLight(0x6699ff, 2.0);
  sun.position.set(50, 100, 30);
  sun.castShadow = true;
  Object.assign(sun.shadow.mapSize, { width: 2048, height: 2048 });
  Object.assign(sun.shadow.camera, { near: 1, far: 500, left: -200, right: 200, top: 200, bottom: -200 });
  scene.add(sun);

  // Rim light for depth
  const rim = new THREE.DirectionalLight(0xff4466, 0.6);
  rim.position.set(-50, 20, -80);
  scene.add(rim);
}

function _buildGround(scene) {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(2000, 2000),
    new THREE.MeshLambertMaterial({ color: 0x0d1117 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = SETTINGS.groundY;
  ground.receiveShadow = true;
  scene.add(ground);

  const grid = new THREE.GridHelper(2000, 100, 0x1a2040, 0x111825);
  grid.position.y = SETTINGS.groundY + 0.05;
  scene.add(grid);
}

function _buildSky(scene) {
  // Gradient sky via a back-face sphere with a GLSL fragment shader
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      topColor:    { value: new THREE.Color(0x020510) },
      bottomColor: { value: new THREE.Color(0x0a1428) },
      horizon:     { value: 0.1 },
    },
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vWorldPos   = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3  topColor;
      uniform vec3  bottomColor;
      uniform float horizon;
      varying vec3  vWorldPos;
      void main() {
        float h = normalize(vWorldPos).y;
        float t = max(0.0, (h + horizon) / (1.0 + horizon));
        gl_FragColor = vec4(mix(bottomColor, topColor, pow(t, 0.5)), 1.0);
      }
    `,
  });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(800, 16, 8), skyMat));

  // Stars as a point cloud
  const positions = [];
  for (let i = 0; i < 2000; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);
    const r     = 700 + Math.random() * 50;
    positions.push(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(theta)
    );
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.8 })));
}

function _spawnBuilding(playerPos) {
  const angle = Math.random() * Math.PI * 2;
  const dist  = 60 + Math.random() * (SETTINGS.buildingSpawnRadius - 60);
  const x     = playerPos.x + Math.cos(angle) * dist;
  const z     = playerPos.z + Math.sin(angle) * dist;
  const w     = 4  + Math.random() * 18;
  const d     = 4  + Math.random() * 18;
  const h     = 15 + Math.random() * 85;

  const mesh = _makeBuildingMesh(w, h, d);
  mesh.position.set(x, h / 2 + SETTINGS.groundY, z);
  _scene.add(mesh);

  _buildings.push({
    mesh,
    pos:   new THREE.Vector3(x, h / 2 + SETTINGS.groundY, z),
    halfW: w / 2,
    halfD: d / 2,
    topY:  SETTINGS.groundY + h,
  });
}

function _makeBuildingMesh(w, h, d) {
  const mat  = _buildingMaterials[Math.floor(Math.random() * _buildingMaterials.length)];
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  // Wireframe overlay gives a "window grid" look cheaply
  mesh.add(new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshBasicMaterial({ color: 0x3060ff, wireframe: true, transparent: true, opacity: 0.08 })
  ));

  // Randomly add a glowing rooftop edge (also serves as visual grapple target)
  if (Math.random() > 0.45) {
    const roofLight = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.9, 0.15, d * 0.9),
      new THREE.MeshBasicMaterial({ color: Math.random() > 0.5 ? 0x0080ff : 0xff2060 })
    );
    roofLight.position.y = h / 2 + 0.08;
    mesh.add(roofLight);
  }

  return mesh;
}
