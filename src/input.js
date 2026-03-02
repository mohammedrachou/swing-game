// input.js — clean pointer lock + input state

let _keys = new Set();
let _mouseDX = 0;
let _mouseDY = 0;
let _locked = false;

export function init(domElementForPointerLock = document.body) {
  // Keyboard
  window.addEventListener('keydown', (e) => _keys.add(e.code));
  window.addEventListener('keyup', (e) => _keys.delete(e.code));

  // Mouse move (only counts when locked)
  window.addEventListener('mousemove', (e) => {
    if (!_locked) return;
    _mouseDX += e.movementX || 0;
    _mouseDY += e.movementY || 0;
  });

  // Pointer lock state
  document.addEventListener('pointerlockchange', () => {
    _locked = document.pointerLockElement === domElementForPointerLock;
  });

  // Click to lock
  domElementForPointerLock.addEventListener('click', () => {
    if (!document.pointerLockElement) domElementForPointerLock.requestPointerLock();
  });

  // ESC unlock helper (browser does this automatically, but we track it)
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') {
      // browser unlocks; pointerlockchange will update _locked
    }
  });
}

export function isDown(code) {
  return _keys.has(code);
}

export function consumeMouseDelta() {
  const dx = _mouseDX;
  const dy = _mouseDY;
  _mouseDX = 0;
  _mouseDY = 0;
  return { dx, dy };
}

export function isPointerLocked() {
  return _locked;
}
