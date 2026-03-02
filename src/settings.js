/**
 * settings.js
 * ─────────────────────────────────────────────────────
 * SAFE + SMOOTH VERSION
 * Prevents insane acceleration and motion sickness
 * while keeping fast, satisfying swing movement.
 */

export const SETTINGS = {

  // ── Physics ───────────────────────────────────────
  gravity:            -28,

  // MUCH higher drag to prevent runaway speed
  airDrag:            0.045,

  airControlForce:    16,
  airControlMax:      18,

  // HARD SPEED LIMIT
  maxSpeed:           55,


  // ── Rope / Swing ──────────────────────────────────

  // Slightly softer so it doesn't violently accelerate
  ropeStiffness:      5.2,

  ropeDamping:        0.22,

  maxRopeLength:      75,
  minRopeLength:      4,

  ropeShortenSpeed:   12,
  ropeExtendSpeed:    15,

  grappleRange:       140,


  // ── Feel / Assist ─────────────────────────────────

  // CRITICAL FIX: was 1.08 (insanely high)
  swingBoostFactor:   1.005,

  // release boost reduced
  releaseBoostMult:   1.01,

  // boost massively reduced
  boostImpulse:       10,

  boostCooldown:      1.0,
  boostDuration:      0.22,


  // ── Camera ────────────────────────────────────────

  // farther camera = less motion sickness
  thirdPersonDist:    11,

  thirdPersonHeight:  3.6,

  camSpringStiffness: 6.0,
  camSpringDamping:   0.75,

  firstPersonSway:    0.0,

  mouseSensitivity:   0.002,


  // ── Speed Effects ─────────────────────────────────

  // MUCH safer FOV
  speedFOVMin:        70,
  speedFOVMax:        80,

  speedFOVThreshold:  20,
  speedFOVPeakSpeed:  55,

  speedFOVLerpRate:   0.06,

  speedLinesThreshold:   22,
  speedLinesMax:         55,

  // DISABLED SHAKE
  speedShakeThreshold:   999,
  speedShakeMax:         0,
  screenShakeAmount:     0,

  shakeRampUp:           0,
  shakeDecay:            0,


  // ── World ─────────────────────────────────────────

  groundY:               0,

  buildingSpawnRadius:   220,
  buildingDespawnRadius: 300,

  buildingsTarget:       90,
};
