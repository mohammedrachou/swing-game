/**
 * settings.js
 * ─────────────────────────────────────────────────────
 * Single source of truth for every tunable constant.
 * Change values here; nothing else needs to be touched.
 *
 * Units: metres, seconds, m/s unless noted.
 */

export const SETTINGS = {

  // ── Physics ───────────────────────────────────────
  gravity:            -28,    // downward acceleration (m/s²)
  airDrag:            0.012,  // fractional velocity loss per frame (0 = frictionless)
  airControlForce:    18,     // WASD steering acceleration while airborne
  airControlMax:      22,     // max speed contribution from air steering

  // ── Rope / Swing ──────────────────────────────────
  ropeStiffness:      6.5,    // spring constant pulling player toward anchor
  ropeDamping:        0.18,   // energy absorbed per constraint solve (0–1)
  maxRopeLength:      80,     // longest allowed tether
  minRopeLength:      4,      // shortest allowed tether (can't reel in past this)
  ropeShortenSpeed:   14,     // reel-in rate when holding W while grappled
  ropeExtendSpeed:    18,     // extend rate when holding S while grappled
  grappleRange:       150,    // max distance to a valid anchor point

  // ── Feel / Assist ─────────────────────────────────
  swingBoostFactor:   1.08,   // energy multiplier per frame while swinging downward
                              // (>1 = "pump assist" so swings don't die out)
  releaseBoostMult:   1.04,   // velocity scalar applied the instant a grapple detaches
  boostImpulse:       22,     // m/s added by the SPACE boost
  boostCooldown:      1.4,    // seconds until boost is ready again
  boostDuration:      0.18,   // seconds the boost force is spread across

  // ── Camera ────────────────────────────────────────
  thirdPersonDist:    9,      // ideal follow distance behind player
  thirdPersonHeight:  3.2,    // height above player in 3rd-person
  camSpringStiffness: 7.0,    // how quickly the 3P camera catches up
  camSpringDamping:   0.72,   // smoothing factor (0 = instant, 1 = frozen)
  firstPersonSway:    0.06,   // head-sway intensity in 1st-person
  mouseSensitivity:   0.002,  // radians per pixel of mouse movement

  // ── Speed Effects ─────────────────────────────────
  speedFOVMin:           68,  // FOV (degrees) at low speed
  speedFOVMax:           95,  // FOV at peak speed
  speedFOVThreshold:     25,  // speed where FOV begins widening
  speedFOVPeakSpeed:     80,  // speed where FOV reaches maximum
  speedFOVLerpRate:      0.08,// how quickly FOV changes (0–1 per frame)

  speedLinesThreshold:   20,  // speed to start showing streak lines
  speedLinesMax:         70,  // speed where streaks are at full intensity

  speedShakeThreshold:   30,  // speed to start screen shake
  speedShakeMax:         0.18,// maximum shake displacement (metres)
  screenShakeAmount:     1.0, // global shake multiplier (set 0 to disable)
  shakeRampUp:           8,   // how fast shake intensity builds (units/s)
  shakeDecay:            0.85,// per-frame multiplier when below threshold

  // ── World ─────────────────────────────────────────
  groundY:               0,   // Y position of the ground plane
  buildingSpawnRadius:   220, // distance from player at which buildings spawn
  buildingDespawnRadius: 300, // distance at which buildings are removed
  buildingsTarget:       90,  // pool size — how many buildings to keep alive
};
