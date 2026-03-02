/**
 * input.js
 * ─────────────────────────────────────────────────────
 * Centralised input handler.
 *
 * PUBLIC API
 * ──────────
 * init(domElement)          — attach all listeners
 * getKeys()                 → { [code]: boolean }  snapshot of held keys
 * consumeMouseDelta()       → { dx, dy }  pixels moved since last call (resets after read)
 * onAction(name, callback)  — subscribe to named one-shot actions
 *                             action names: 'grappleLeft', 'grappleRight',
 *                                           'releaseLeft', 'releaseRight',
 *                                           'boost', 'toggleCamera'
 * requestPointerLock()      — convenience wrapper
 */

const _keys = {};              // currently held keys  { KeyCode: true }
let   _dx = 0, _dy = 0;       // accumulated mouse delta (reset on read)
const _listeners = {};         // action → [callback, ...]

// ── Internal helpers ──────────────────────────────────────────────────────────

function _emit(action) {
  (_listeners[action] || []).forEach(cb => cb());
}

function _onKeyDown(e) {
  if (_keys[e.code]) return;   // suppress key-repeat
  _keys[e.code] = true;

  if (e.code === 'KeyV')     _emit('toggleCamera');
  if (e.code === 'Space')  { e.preventDefault(); _emit('boost'); }
  if (e.code === 'KeyQ')     _emit('grappleLeft');
  if (e.code === 'KeyE')     _emit('grappleRight');
}

function _onKeyUp(e) {
  _keys[e.code] = false;

  if (e.code === 'KeyQ') _emit('releaseLeft');
  if (e.code === 'KeyE') _emit('releaseRight');
}

function _onMouseMove(e) {
  if (document.pointerLockElement) {
    _dx += e.movementX;
    _dy += e.movementY;
  }
}

function _onMouseDown(e) {
  if (!document.pointerLockElement) {
    // First click: grab pointer lock instead of firing grapple
    e.target.requestPointerLock();
    return;
  }
  if (e.button === 0) _emit('grappleLeft');
  if (e.button === 2) _emit('grappleRight');
}

function _onMouseUp(e) {
  if (e.button === 0) _emit('releaseLeft');
  if (e.button === 2) _emit('releaseRight');
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Attach all event listeners.
 * @param {HTMLElement} domElement  The renderer's canvas (for pointer lock).
 */
export function init(domElement) {
  window.addEventListener('keydown', _onKeyDown);
  window.addEventListener('keyup',   _onKeyUp);
  window.addEventListener('mousemove', _onMouseMove);
  window.addEventListener('mousedown', _onMouseDown);
  window.addEventListener('mouseup',   _onMouseUp);
  window.addEventListener('contextmenu', e => e.preventDefault());
}

/**
 * Read the current held-key map.
 * Keys use KeyboardEvent.code strings e.g. 'KeyW', 'Space'.
 * @returns {{ [code: string]: boolean }}
 */
export function getKeys() {
  return _keys;
}

/**
 * Read and reset accumulated mouse movement since last call.
 * @returns {{ dx: number, dy: number }}
 */
export function consumeMouseDelta() {
  const result = { dx: _dx, dy: _dy };
  _dx = 0;
  _dy = 0;
  return result;
}

/**
 * Subscribe to a one-shot action event.
 * @param {string}   action    One of the action names listed in the module header.
 * @param {Function} callback
 */
export function onAction(action, callback) {
  if (!_listeners[action]) _listeners[action] = [];
  _listeners[action].push(callback);
}

/** Programmatically request pointer lock (e.g. from a start-screen click). */
export function requestPointerLock(domElement) {
  domElement.requestPointerLock();
}
