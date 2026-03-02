/**
 * world.js (DAYTIME VERSION)
 * ─────────────────────────────────────────────────────
 * Environment:
 *   • renderer, scene, lights
 *   • ground + grid
 *   • simple daytime sky (gradient dome)
 *   • building pool spawn/despawn
 */

import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { SETTINGS } from './settings.js';

// ── Module-level state ────────────────────────────────────────────────────────

let _scene, _renderer;
const _buildings = [];

// Brighter building materials (daytime)
const _buildingMaterials = [
  new THREE.MeshPhongMaterial({ color: 0xb9c2cf, emissive: 0x000000, shininess: 35 }),
  new THREE.MeshPhongMaterial({ color: 0xaab4c2, emissive: 0x000000, shininess: 45 }),
  new THREE.MeshPhongMaterial({ color: 0xc6ced9, emissive: 0x000000, shininess: 25 }),
  new THREE.MeshPhongMaterial({ color: 0x9fa9b7, emissive: 0x000000, shininess: 55 }),
];

// ── Public API ────────────────────────────────────────────────────────────────

export function init() {
  _renderer = _createRenderer();
  _scene = _createScene();

  const camera = new THREE.PerspectiveCamera(
    SETTINGS.speedFOVMin,
    window.innerWidth / window.innerHeight,
    0.1, 1500
  );

  const clock = new THREE.Clock();

  _addLights(_scene);
  _buildGround(_scene);
  _buildSky(_scene);

  // Seed building pool
  const fakePlayerPos = new THREE.Vector3(0, 0, 0);
  for (let i = 0; i < SETTINGS.buildingsTarget; i++) {
    _spawnBuilding(fakePlayerPos);
  }

  return { renderer: _renderer, scene: _scene, camera, clock };
}

export function getBuildings() {
  return _buildings;
}

export function updatePool(playerPos) {
  // Despawn far buildings
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

  // Spawn until full
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

  // Daytime: reduce harsh tone mapping
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.25;

  r.domElement.style.cssText = 'position:fixed;top:0;left:0;z-index:1;';
  document.body.appendChild(r.domElement);

  return r;
}

function _createScene() {
  const s = new THREE.Scene();

  // Daytime sky + light fog
  s.background = new THREE.Color(0x87ceeb);           // sky blue
  s.fog = new THREE.FogExp2(0x87ceeb, 0.0012);        // light haze

  return s;
}

function _addLights(scene) {
  // Bright ambient daylight
  scene.add(new THREE.AmbientLight(0xffffff, 0.9));

  // Warm sun
  const sun = new THREE.DirectionalLight(0xfff2d6, 1.2);
  sun.position.set(90, 160, 80);
  sun.castShadow = true;

  Object.assign(sun.shadow.mapSize, { width: 2048, height: 2048 });
  Object.assign(sun.shadow.camera, { near: 1, far: 900, left: -300, right: 300, top: 300, bottom: -300 });

  scene.add(sun);

  // Soft fill light (prevents harsh shadows)
  const fill = new THREE.DirectionalLight(0xffffff, 0.25);
  fill.position.set(-80, 70, -90);
  scene.add(fill);
}

function _buildGround(scene) {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(2400, 2400),
    new THREE.MeshLambertMaterial({ color: 0xd7dde6 }) // bright ground
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = SETTINGS.groundY;
  ground.receiveShadow = true;
  scene.add(ground);

  const grid = new THREE.GridHelper(2400, 120, 0x8fa1b6, 0xbfc9d6);
  grid.position.y = SETTINGS.groundY + 0.05;
  scene.add(grid);
}

function _buildSky(scene) {
  // Simple bright gradient dome (no stars)
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      topColor:    { value: new THREE.Color(0x6bbcff) },
      bottomColor: { value: new THREE.Color(0xcfefff) },
      horizon:     { value: 0.15 },
    },
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vWorldPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float horizon;
      varying vec3 vWorldPos;

      void main() {
        float h = normalize(vWorldPos).y;
        float t = max(0.0, (h + horizon) / (1.0 + horizon));
        vec3 col = mix(bottomColor, topColor, pow(t, 0.7));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });

  scene.add(new THREE.Mesh(new THREE.SphereGeometry(900, 18, 10), skyMat));
}

function _spawnBuilding(playerPos) {
  const angle = Math.random() * Math.PI * 2;
  const dist = 60 + Math.random() * (SETTINGS.buildingSpawnRadius - 60);

  const x = playerPos.x + Math.cos(angle) * dist;
  const z = playerPos.z + Math.sin(angle) * dist;

  const w = 5 + Math.random() * 22;
  const d = 5 + Math.random() * 22;
  const h = 18 + Math.random() * 95;

  const mesh = _makeBuildingMesh(w, h, d);
  mesh.position.set(x, h / 2 + SETTINGS.groundY, z);
  _scene.add(mesh);

  _buildings.push({
    mesh,
    pos: new THREE.Vector3(x, h / 2 + SETTINGS.groundY, z),
    halfW: w / 2,
    halfD: d / 2,
    topY: SETTINGS.groundY + h,
  });
}

function _makeBuildingMesh(w, h, d) {
  const mat = _buildingMaterials[Math.floor(Math.random() * _buildingMaterials.length)];
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);

  mesh.castShadow = true;
  mesh.receiveShadow = true;

  // Light window grid look (subtle, not neon)
  mesh.add(new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.04 })
  ));

  // Rooftop edge marker (still useful as grapple target)
  if (Math.random() > 0.45) {
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.9, 0.18, d * 0.9),
      new THREE.MeshBasicMaterial({ color: 0xffcc66 })
    );
    roof.position.y = h / 2 + 0.09;
    mesh.add(roof);
  }

  return mesh;
}
