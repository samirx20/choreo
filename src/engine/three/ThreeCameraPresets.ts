/**
 * Declarative 3D Camera & Kinetic Motion Presets
 * Formulates the 5 signature 3D tech product animation trajectories:
 * 1. orbit360: 360-degree turntable orbit
 * 2. isometric: Telephoto 35.264° x 45° perspective
 * 3. dollyIn: Snappy quintic push-in into screen UI
 * 4. hover: Dual harmonic anti-gravity floating wobble
 * 5. cardFlip: 180° flip with perspective recoil and damped spring physics
 */

export interface Camera3DTransform {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

export interface Model3DRotation {
  pitch: number; // degrees
  yaw: number;   // degrees
  roll: number;  // degrees
}

export interface HoverState extends Model3DRotation {
  positionY: number;
  shadowScale: number;
  shadowOpacity: number;
}

export interface CardFlipState extends Model3DRotation {
  positionZ: number;
  activeFace: 'front' | 'back';
}

/**
 * 1. 360° Turntable Orbit Preset
 */
export function evaluateOrbit360(
  t: number,
  duration: number,
  startYaw = 0
): Model3DRotation {
  const safeDur = Math.max(0.01, duration);
  const u = Math.min(Math.max(t / safeDur, 0), 1);

  // Smooth cubic ease-in-out
  const ease = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;

  return {
    yaw: startYaw + 360 * ease,
    pitch: 8 * Math.sin(u * Math.PI), // subtle forward bow at midpoint
    roll: 0,
  };
}

/**
 * 2. Isometric Tilt Preset
 */
const ISOMETRIC_PRESET = {
  rotation: { pitch: 35.264, yaw: 45.0, roll: 0.0 } as Model3DRotation,
  camera: {
    position: [0, 0, 11.5] as [number, number, number],
    target: [0, 0, 0] as [number, number, number],
    fov: 22, // Narrow telephoto lens eliminating distortion
  },
};

export function evaluateIsometric(): { rotation: Model3DRotation; camera: Camera3DTransform } {
  return {
    rotation: { ...ISOMETRIC_PRESET.rotation },
    camera: {
      position: [...ISOMETRIC_PRESET.camera.position],
      target: [...ISOMETRIC_PRESET.camera.target],
      fov: ISOMETRIC_PRESET.camera.fov,
    },
  };
}

/**
 * 3. Push-In Dolly Preset
 */
export function evaluateDollyIn(
  t: number,
  duration: number,
  startZ = 6.5,
  endZ = 2.2,
  targetOffset: [number, number] = [0, 0]
): { camera: Camera3DTransform; rotation: Model3DRotation } {
  const safeDur = Math.max(0.01, duration);
  const u = Math.min(Math.max(t / safeDur, 0), 1);

  // Snappy quintic ease-out: 1 - (1 - u)^5
  const ease = 1 - Math.pow(1 - u, 5);

  return {
    camera: {
      position: [0, 0, startZ + (endZ - startZ) * ease],
      target: [targetOffset[0] * ease, targetOffset[1] * ease, 0],
      fov: 45,
    },
    rotation: {
      pitch: 15 * (1 - ease), // Flatten device from 15 deg tilt to 0 deg
      yaw: -20 * (1 - ease),  // Straighten device towards frontal
      roll: 0,
    },
  };
}

/**
 * 4. Float / Hover Wobble Preset
 */
export function evaluateHover(t: number, baseElevation = 0): HoverState {
  // Non-commensurate prime frequency oscillators
  const f1 = 0.65; // elevation frequency
  const f2 = 0.95; // pitch frequency
  const f3 = 0.42; // yaw frequency

  const deltaY = 0.18 * Math.sin(2 * Math.PI * f1 * t);
  const pitch = 3.5 * Math.sin(2 * Math.PI * f2 * t + 0.4);
  const yaw = 4.0 * Math.cos(2 * Math.PI * f3 * t);
  const roll = 1.8 * Math.sin(2 * Math.PI * (f1 * 0.5) * t);

  return {
    positionY: baseElevation + deltaY,
    pitch,
    yaw,
    roll,
    shadowScale: 1.0 + deltaY * 0.8,
    shadowOpacity: Math.max(0.2, 0.65 - deltaY * 1.2),
  };
}

/**
 * 5. Card Flip Preset
 */
export function evaluateCardFlip(t: number, duration: number): CardFlipState {
  const safeDur = Math.max(0.01, duration);
  const u = Math.min(Math.max(t / safeDur, 0), 1);

  // Second-order damped harmonic spring
  const omega = 18.0;
  const zeta = 0.72;
  const springProgress =
    1 - Math.exp(-zeta * omega * u) * Math.cos(omega * Math.sqrt(1 - zeta * zeta) * u);

  const yaw = 180 * springProgress;
  const recoilZ = u === 0 || u >= 1 ? 0 : -0.85 * Math.sin(Math.PI * u); // perspective pop

  return {
    yaw,
    pitch: u === 0 || u >= 1 ? 0 : 12 * Math.sin(Math.PI * u),
    roll: 0,
    positionZ: recoilZ,
    activeFace: yaw < 90 ? 'front' : 'back',
  };
}
