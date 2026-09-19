export type EasingType =
  | 'smooth'
  | 'bouncy'
  | 'overshoot'
  | 'snappy'
  | 'linear'
  | 'custom';

export type AnimationPreset =
  | 'pop'
  | 'slideUp'
  | 'slideDown'
  | 'slideLeft'
  | 'slideRight'
  | 'fadeIn'
  | 'fadeOut'
  | 'grow'
  | 'shrink'
  | 'blurIn'
  | 'spin'
  | 'twist'
  | 'flipX'
  | 'flipY'
  | 'flip3D'
  | 'dropIn'
  | 'maskWipe'
  | 'circleReveal'
  | 'typewriter'
  | 'elasticBounce'
  | 'scaleReveal'
  | 'circleIris'
  | 'gravityFall'
  | 'popOut'
  | 'jellySquash'
  | 'glitchDisintegrate'
  | 'wiggle'
  | 'heartbeat';

export interface BezierCurve {
  points: [number, number, number, number]; // [x1, y1, x2, y2]
}

export interface Keyframe<T = number | string | boolean> {
  id?: string;
  time: number; // in seconds
  value: T;
  easing?: EasingType | [number, number, number, number];
}

export interface AnimationTrack {
  id: string;
  property: string; // e.g. "x", "y", "scaleX", "scaleY", "rotation", "opacity", "filterBlur"
  keyframes: Keyframe<number | string>[];
}

export interface AnimationConfig {
  preset: AnimationPreset | string;
  start: number; // in seconds
  duration: number; // in seconds
  easing: EasingType;
  bezierPoints?: [number, number, number, number];
  animateBy?: 'element' | 'word' | 'character' | 'line';
  splitBy?: 'all' | 'word' | 'character';
  stagger?: number; // delay between words/characters in seconds (default 0.06s)
  staggerDelay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | number;
  intensity?: number;
  springStiffness?: number;
  springDamping?: number;
  springMass?: number;
  scaleAmount?: number;
  distance?: number;
  rotationDegrees?: number;
  fillMode?: AnimationFillMode;
  loop?: boolean;
  loopCount?: number;
  id?: string;
  name?: string;
  params?: {
    distance?: number;
    angle?: number; // Polar angle in degrees (0 = right, 90 = down, 180 = left, 270 = up)
    initialScale?: number;
    fade?: boolean;
    direction?: 'up' | 'down' | 'left' | 'right';
    blurRadius?: number;
    overshootAmount?: number;
    axis?: 'x' | 'y';
    perspective?: number;
    initialAngle?: number;
    origin?: string;
    damping?: number;
    stiffness?: number;
    [key: string]: any;
  };
}

export type AnimationClipType = 'in' | 'out' | 'emphasis' | 'action' | 'custom';
export type AnimationFillMode = 'none' | 'forwards' | 'backwards' | 'both';

export interface AnimationClip {
  id: string;
  type: AnimationClipType;
  preset: AnimationPreset | string;
  name?: string;
  label?: string;
  color?: string;
  start: number; // start time in seconds
  duration: number; // duration in seconds
  easing: EasingType;
  bezierPoints?: [number, number, number, number];
  loop?: boolean;
  loopCount?: number;
  iterations?: number;
  fillMode?: AnimationFillMode;
  animateBy?: 'element' | 'word' | 'character' | 'line';
  splitBy?: 'all' | 'word' | 'character';
  stagger?: number; // delay between words/characters in seconds
  staggerDelay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | number;
  intensity?: number;
  springStiffness?: number;
  springDamping?: number;
  springMass?: number;
  scaleAmount?: number;
  distance?: number;
  rotationDegrees?: number;
  properties?: Array<'x' | 'y' | 'z' | 'scaleX' | 'scaleY' | 'rotation' | 'opacity' | 'filterBlur' | 'color'>;
  params?: Record<string, any>;
  disabled?: boolean;
}

export interface LayerAnimation {
  clips?: AnimationClip[];
  in?: AnimationConfig;
  out?: AnimationConfig;
  emphasis?: AnimationConfig;
  custom?: Record<string, any>;
  tracks?: AnimationTrack[]; // Direct Theatre.js keyframe tracks
}

/**
 * Pure normalization helper: converts any layer's animation state into an AnimationClip[] array.
 * Guarantees 100% backward compatibility for legacy projects with { in, out, emphasis }.
 */
export function getLayerClips(layer: { animation?: LayerAnimation; id: string }): AnimationClip[] {
  if (!layer.animation) return [];
  if (Array.isArray(layer.animation.clips) && layer.animation.clips.length > 0) {
    return layer.animation.clips.filter((c) => !c.disabled);
  }

  const clips: AnimationClip[] = [];
  const { in: animIn, out: animOut, emphasis: animEmp } = layer.animation;

  if (animIn) {
    clips.push({
      id: `${layer.id}_in`,
      type: 'in',
      preset: animIn.preset,
      label: `In: ${animIn.preset}`,
      color: '#10b981',
      start: animIn.start,
      duration: animIn.duration,
      easing: animIn.easing,
      bezierPoints: animIn.bezierPoints,
      animateBy: animIn.animateBy,
      stagger: animIn.stagger,
      params: animIn.params,
      fillMode: 'both',
    });
  }

  if (animEmp) {
    clips.push({
      id: `${layer.id}_emphasis`,
      type: 'emphasis',
      preset: animEmp.preset,
      label: `Action: ${animEmp.preset}`,
      color: '#f59e0b',
      start: animEmp.start,
      duration: animEmp.duration,
      easing: animEmp.easing,
      bezierPoints: animEmp.bezierPoints,
      animateBy: animEmp.animateBy,
      stagger: animEmp.stagger,
      params: animEmp.params,
      loop: true,
      fillMode: 'none',
    });
  }

  if (animOut) {
    clips.push({
      id: `${layer.id}_out`,
      type: 'out',
      preset: animOut.preset,
      label: `Out: ${animOut.preset}`,
      color: '#ef4444',
      start: animOut.start,
      duration: animOut.duration,
      easing: animOut.easing,
      bezierPoints: animOut.bezierPoints,
      animateBy: animOut.animateBy,
      stagger: animOut.stagger,
      params: animOut.params,
      fillMode: 'forwards',
    });
  }

  return clips;
}

export interface ShadowStyle {
  x: number;
  y: number;
  blur: number;
  spread?: number;
  color: string;
  alpha?: number;
  inset?: boolean;
}

export interface GlowFilterConfig {
  enabled: boolean;
  distance?: number;
  outerStrength?: number;
  innerStrength?: number;
  color?: string;
}

export interface BloomFilterConfig {
  enabled: boolean;
  strength?: number;
  blur?: number;
  threshold?: number;
}

export type BlendMode =
  | 'normal'
  | 'add'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion';

export interface LayerStyle {
  // Spatial Transforms
  x: number;
  y: number;
  width: number | 'auto';
  height: number | 'auto';
  scaleX?: number; // default 1
  scaleY?: number; // default 1
  rotation: number; // in degrees
  skewX?: number; // in degrees
  skewY?: number; // in degrees
  pivotX?: number; // 0 to 1 or pixel value
  pivotY?: number; // 0 to 1 or pixel value
  opacity: number; // 0 to 1
  zIndex?: number;

  // Colors & Fills
  backgroundColor?: string;
  color?: string; // text fill
  gradient?: {
    type: 'linear' | 'radial';
    colors: string[];
    stops: number[];
    angle?: number;
  };

  // Typography (for Text and Chunks)
  boxMode?: 'point' | 'area';
  fontSize?: number;
  fontWeight?: string | number;
  fontFamily?: string;
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline';
  lineHeight?: number;
  leading?: number; // px baseline distance
  letterSpacing?: string | number;
  tracking?: number; // 1/1000 em
  baselineShift?: number;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  wordWrap?: boolean;
  wordWrapWidth?: number;
  textSizing?: 'auto-width' | 'auto-height' | 'fixed';
  passOrder?: 'fillOverStroke' | 'strokeOverFill';

  // Borders & Corners
  borderRadius?: number | [number, number, number, number]; // TL, TR, BR, BL
  borderWidth?: number;
  borderColor?: string;
  borderStyle?: 'solid' | 'dashed' | 'dotted';
  strokeAlign?: 'inside' | 'center' | 'outside';
  squircleFactor?: number; // 0 to 100 (Apple G2 continuous curvature)

  // GPU Shaders & Visual Effects
  shadows?: ShadowStyle[];
  elevation?: number; // 2.5D elevation height in pixels driving contact + ambient dispersion shadows
  shadowAngle?: number; // Polar drop shadow angle (0..360 deg)
  shadowDistance?: number; // Polar drop shadow distance (px)
  shadowBlur?: number; // Polar drop shadow blur (px)
  shadowSpread?: number; // Polar drop shadow spread (px)
  shadowColor?: string; // Polar drop shadow hex color
  shadowOpacity?: number; // Polar drop shadow opacity (0..1)
  filterBlur?: number; // Layer blur px
  backdropBlur?: number; // Background blur px
  glow?: GlowFilterConfig;
  bloom?: BloomFilterConfig;
  blendMode?: BlendMode;
  motionBlur?: boolean;
  scaleUniform?: boolean;

  // Layout Containers (for flex/groups)
  padding?: number | [number, number, number, number]; // T, R, B, L
  clipContent?: boolean; // Mask overflow
  customCss?: string;
  tailwindClasses?: string;
}

export interface LayoutConfig {
  display?: 'flex' | 'grid' | 'absolute' | 'none';
  flexDirection?: 'row' | 'column';
  flexWrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  gap?: number;
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'space-between' | 'space-around';
  justifyContent?: 'start' | 'center' | 'end' | 'space-between' | 'space-around';
}

export type ConstraintAnchor =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'middle-left'
  | 'center'
  | 'middle-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export type DriverProperty =
  | 'x'
  | 'y'
  | 'width'
  | 'height'
  | 'rotation'
  | 'opacity'
  | 'scale'
  | 'progress';

export type DrivenProperty =
  | 'x'
  | 'y'
  | 'width'
  | 'height'
  | 'rotation'
  | 'opacity'
  | 'scale'
  | 'scaleX'
  | 'scaleY';

export type LinkMode =
  | 'pin'        // Spatial anchor lock (pins target anchor to driver anchor + [dx, dy])
  | 'hug'        // Size hug / reactive envelope with padding
  | 'match'      // Direct 1:1 match with multiplier + offset
  | 'remap'      // Range remap [sMin, sMax] -> [tMin, tMax] with easing
  | 'lag'        // Fluid temporal follower with inertia / delay
  | 'track-word' // Active word token tracking with glide interpolation
  | 'leader-line'; // Dynamic 2-point tangent connector arrow/line

export interface ElementLinkBinding {
  id: string;
  driverLayerId: string;
  targetLayerId?: string; // Optional destination layer (e.g. for 2-point leader lines)
  driverProp: DriverProperty;
  drivenProp: DrivenProperty;
  mode: LinkMode;

  // Offset & Multiplier (match mode & general math)
  offset?: number;
  multiplier?: number;

  // Pin mode configuration
  targetAnchor?: ConstraintAnchor;
  driverAnchor?: ConstraintAnchor;
  offset2D?: [number, number]; // [dx, dy]
  clampToTrack?: boolean; // Follower clamped to track bounds (e.g. progress bars)

  // Hug mode configuration (padding around driver [padX, padY] or [T, R, B, L])
  padding?: [number, number] | [number, number, number, number];
  hugAnchor?: ConstraintAnchor;
  expansionPhysics?: 'instant' | 'spring' | 'smooth';
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;

  // Leader line & arrow configuration
  lineCurve?: 'straight' | 'bezier' | 'orthogonal';
  dashSpeed?: number;
  arrowStart?: boolean;
  arrowEnd?: boolean;

  // Remap mode configuration
  sourceRange?: [number, number];
  targetRange?: [number, number];
  easing?: EasingType;

  // Lag mode configuration
  lagSeconds?: number;
  stiffness?: number;
  damping?: number;
}

export interface BaseLayer {
  id: string;
  name: string;
  locked?: boolean;
  hidden?: boolean;
  style: LayerStyle;
  animation?: LayerAnimation;
  bindings?: ElementLinkBinding[];
}

export interface GroupLayer extends BaseLayer {
  type: 'group';
  layout?: LayoutConfig;
  autoFit?: boolean;
  clipContent?: boolean;
  children: Layer[];
  autoLink?: boolean;
  staggerDelay?: number; // default 0.15s
}

export interface TextLayer extends BaseLayer {
  type: 'text';
  content: string;
}

export interface ChunkLayer extends BaseLayer {
  type: 'chunk';
  content: string;
}

export interface CounterLayer extends BaseLayer {
  type: 'counter';
  startValue: number;
  endValue: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  useGrouping?: boolean;
  odometerRoll?: boolean;
  renderedValue?: string;
}

export interface ShapeLayer extends BaseLayer {
  type: 'shape';
  shapeType: 'rectangle' | 'circle' | 'ellipse' | 'star' | 'triangle' | 'polygon' | 'line' | 'arrow';
  points?: number;
  sides?: number;
  innerRadiusRatio?: number;
  arrowStart?: boolean;
  arrowEnd?: boolean;
  strokeCap?: 'butt' | 'round' | 'square';
  strokeJoin?: 'miter' | 'round' | 'bevel';
  trimStart?: number; // 0 to 100%
  trimEnd?: number; // 0 to 100%
  trimOffset?: number; // 0 to 360 deg
  strokeDashArray?: number[];
  strokeDashOffset?: number;
}

export interface ImageLayer extends BaseLayer {
  type: 'image';
  src: string;
  objectFit: 'cover' | 'contain' | 'fill';
}

export interface VideoLayer extends BaseLayer {
  type: 'video';
  assetId: string;
  sourceUrl?: string;
  sourceIn: number;
  sourceOut: number;
  start: number;
  duration: number;
  playbackRate: number;
  volume: number;
  muted: boolean;
  fit: 'cover' | 'contain' | 'fill';
}

export type MockupModelType = 'iphone' | 'macbook' | 'card' | 'badge' | 'custom';
export type CameraPresetType = 'custom' | 'orbit360' | 'isometric' | 'dollyIn' | 'hover' | 'cardFlip';
export type ScreenSourceType = 'screen' | 'video' | 'image' | 'color';

export interface Mockup3DLayer extends BaseLayer {
  type: 'mockup3d';
  modelType: MockupModelType;
  modelUrl?: string;
  deviceFinish?: string;
  position3D: [number, number, number];
  rotation3D: [number, number, number];
  scale3D?: [number, number, number];
  cameraPreset?: CameraPresetType;
  cameraFov: number;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  screenSlot?: {
    sourceType: ScreenSourceType;
    sourceId: string;
    fitMode?: 'cover' | 'contain' | 'stretch';
    emissiveIntensity?: number;
  };
}

export type Layer =
  | GroupLayer
  | TextLayer
  | ChunkLayer
  | CounterLayer
  | ShapeLayer
  | ImageLayer
  | VideoLayer
  | Mockup3DLayer;

export interface Screen {
  id: string;
  name: string;
  duration: number; // in seconds
  layers: Layer[];
}

export type UiMode = 'design' | 'motion' | '3d' | 'editor' | 'animate';

export interface ThreeDCamera {
  id: string;
  fov: number;
  near: number;
  far: number;
  position: [number, number, number];
  target: [number, number, number];
}

export interface ThreeDModel {
  id: string;
  name: string;
  assetUrl?: string;
  modelType?: MockupModelType;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  screenSlot?: {
    sourceType: ScreenSourceType;
    sourceId: string;
    emissiveIntensity?: number;
  };
}

export interface ThreeDShot {
  id: string;
  name: string;
  duration: number;
  camera: ThreeDCamera;
  models: ThreeDModel[];
}

export interface TimelineClip {
  id: string;
  trackId: string;
  type: 'motion_shot' | 'three_d_shot' | 'video' | 'audio' | 'caption';
  sourceId: string;
  name: string;
  start: number;
  duration: number;
  sourceIn: number;
  sourceOut: number;
  playbackRate: number;
  volume?: number;
  opacity?: number;
}

export interface TimelineTrack {
  id: string;
  name: string;
  kind: 'video' | 'audio';
  index: number;
  muted?: boolean;
  solo?: boolean;
  locked?: boolean;
  volume?: number;
  clips: TimelineClip[];
}

export interface EditorSequence {
  fps: number;
  masterDuration: number;
  tracks: TimelineTrack[];
}

export type SafeZonePreset = 'broadcast' | 'tiktok' | 'reels' | 'shorts' | 'none';

export interface SafeZoneConfig {
  actionSafe: boolean;      // 90% broadcast action safe
  titleSafe: boolean;       // 80% broadcast title safe
  ruleOfThirds: boolean;    // 3x3 grid with crash points
  centerCrosshair: boolean; // Optical dual-contrast reticle
  socialOverlay: 'none' | 'tiktok' | 'reels' | 'shorts';
  socialOverlayOpacity?: number; // 0.0 to 1.0 (default 0.7)
}

export interface ProjectSettings {
  width: number;
  height: number;
  fps: number;
  duration: number;
  backgroundColor: string;
  palette?: string[];
  safeZones?: SafeZoneConfig;
}

export interface SceneDocument {
  version: string;
  name: string;
  settings: ProjectSettings;
  screens: Screen[];
  shots?: any[];
  threeDShots?: ThreeDShot[];
  editor?: EditorSequence;
}

