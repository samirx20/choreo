export type EasingType =
  | 'smooth'
  | 'bouncy'
  | 'overshoot'
  | 'snappy'
  | 'linear'
  | 'natural'
  | 'slowDown'
  | 'accelerate'
  | 'elastic'
  | 'bounce'
  | 'none'
  | 'heavy'
  | 'spring'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'custom';

export type AnimationPreset =
  | 'pop'
  | 'slide'
  | 'slideUp'
  | 'slideDown'
  | 'slideLeft'
  | 'slideRight'
  | 'wipe'
  | 'maskWipe'
  | 'mask_reveal'
  | 'baselineRise'
  | 'baselineReveal'
  | 'blurFocusPop'
  | 'trackingExpansion'
  | 'elasticScalePop'
  | 'textShimmer'
  | 'wordCascade'
  | 'lineReveal'
  | 'highlightDraw'
  | 'fadeIn'
  | 'fadeOut'
  | 'fade'
  | 'grow'
  | 'shrink'
  | 'blurIn'
  | 'spin'
  | 'twist'
  | 'flipX'
  | 'flipY'
  | 'flip3D'
  | 'dropIn'
  | 'circleReveal'
  | 'circleIris'
  | 'typewriter'
  | 'drawOn'
  | 'elasticBounce'
  | 'scaleReveal'
  | 'gravityFall'
  | 'popOut'
  | 'jellySquash'
  | 'glitchDisintegrate'
  | 'cardSettlePop'
  | 'elevationRise'
  | 'glassIris'
  | 'kenBurns'
  | 'focusPull'
  | 'arrowShoot'
  | 'dashFlow'
  | 'iconPop'
  | 'stampSettle'
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
  splitBy?: 'all' | 'word' | 'character' | 'line';
  stagger?: number; // delay between words/characters in seconds (default 0.06s)
  staggerDelay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'cw' | 'ccw' | number;
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
  stepFps?: 'smooth' | number;
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
  splitBy?: 'all' | 'word' | 'character' | 'line';
  stagger?: number; // delay between words/characters in seconds
  staggerDelay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'cw' | 'ccw' | number;
  intensity?: number;
  springStiffness?: number;
  springDamping?: number;
  springMass?: number;
  scaleAmount?: number;
  distance?: number;
  rotationDegrees?: number;
  properties?: Array<'x' | 'y' | 'z' | 'scaleX' | 'scaleY' | 'rotation' | 'opacity' | 'filterBlur' | 'color'>;
  params?: Record<string, any>;
  from?: Record<string, any>;
  disabled?: boolean;
  stepFps?: 'smooth' | number;
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
      id: (animIn as any).id || `${layer.id}_in`,
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
      fillMode: 'none',
    });
  }

  if (animEmp) {
    clips.push({
      id: (animEmp as any).id || `${layer.id}_emp`,
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
      id: (animOut as any).id || `${layer.id}_out`,
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
