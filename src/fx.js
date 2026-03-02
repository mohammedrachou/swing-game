import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { SETTINGS } from './settings.js';

let _camera;
let _shakeOffset = new THREE.Vector3(0,0,0);

let _slCanvas, _slCtx;

export function init(camera) {
  _camera = camera;
  _slCanvas = document.getElementById('speed-lines-canvas');
  _slCtx = _slCanvas.getContext('2d');
}

export function update(dt, speed) {
  updateFOV(speed);
  updateSpeedLines(speed);
}

export function getShakeOffset() {
  return _shakeOffset;
}

function updateFOV(speed) {

  const t = Math.min(speed / 60, 1);

  const target = 70 + t * 10;

  _camera.fov += (target - _camera.fov) * 0.05;

  _camera.updateProjectionMatrix();
}

function updateSpeedLines(speed) {

  const t = Math.min(speed / 60, 1);

  const W = _slCanvas.width;
  const H = _slCanvas.height;

  _slCtx.clearRect(0,0,W,H);

  if(t < 0.2) return;

  const cx = W/2;
  const cy = H/2;

  for(let i=0;i<t*50;i++){

    const angle = Math.random()*Math.PI*2;

    const dist = 50 + Math.random()*300;

    const x = cx + Math.cos(angle)*dist;
    const y = cy + Math.sin(angle)*dist;

    const len = 40 + Math.random()*60;

    _slCtx.strokeStyle = "rgba(255,255,255,0.8)";

    _slCtx.lineWidth = 2;

    _slCtx.beginPath();

    _slCtx.moveTo(x,y);

    _slCtx.lineTo(
      x + Math.cos(angle)*len,
      y + Math.sin(angle)*len
    );

    _slCtx.stroke();
  }
}
