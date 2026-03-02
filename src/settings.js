export const SETTINGS = {
  // ── Physics ───────────────────────────────────────
  gravity:            -28,
  airDrag:            0.018,   // lower drag = faster
  airControlForce:    26,
  airControlMax:      35,

  // Hard speed cap so it never goes crazy again
  maxSpeed:           80,      // feels fast but not instant 200

  // ── Rope / Swing ──────────────────────────────────
  ropeStiffness:      7.8,
  ropeDamping:        0.12,
  maxRopeLength:      90,
  minRopeLength:      4,
  ropeShortenSpeed:   18,
  ropeExtendSpeed:    20,
  grappleRange:       170,

  // ── Feel / Assist ─────────────────────────────────
  // tiny assist (NOT exponential explosion)
  swingBoostFactor:   1.01,
  releaseBoostMult:   1.02,

  boostImpulse:       16,
  boostCooldown:      0.9,
  boostDuration:      0.18,

  // ── Camera ────────────────────────────────────────
  thirdPersonDist:    11,
  thirdPersonHeight:  3.6,
  camSpringStiffness: 6.0,
  camSpringDamping:   0.75,
  firstPersonSway:    0.0,
  mouseSensitivity:   0.002,

  // ── Speed Effects ─────────────────────────────────
  speedFOVMin:           70,
  speedFOVMax:           80,
  speedFOVThreshold:     25,
  speedFOVPeakSpeed:     80,
  speedFOVLerpRate:      0.06,

  speedLinesThreshold:   999,  // off (you hated black overlay)
  speedLinesMax:         999,

  speedShakeThreshold:   999,  // off
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
