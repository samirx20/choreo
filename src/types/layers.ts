import { LayerAnimation, EasingType } from './animation';

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
  fillColor?: string;
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

  // Tactile Collage & Brutalist Effects
  stickerBorder?: {
    width: number;
    color: string;
  };
  shadowMode?: 'soft' | 'hard';

  // Layout Containers (for flex/groups)
  padding?: number | [number, number, number, number]; // T, R, B, L
  clipContent?: boolean; // Mask overflow
  customCss?: string;
  tailwindClasses?: string;

  // Motion-First Primitives
  focalPoint?: [number, number]; // Normalized [x, y] focal anchor for media scaling (0..1)
  scrollTrack?: {
    waypoints: Array<{
      offsetY: number;
      hold: number;
      springProfile?: 'snappy' | 'smooth' | 'bouncy' | 'heavy' | 'linear';
    }>;
  };
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
  | 'scaleX'
  | 'scaleY'
  | 'progress'
  | 'text-progress'
  | 'counter-value'
  | 'cursor-pos';

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
  | 'pin'
  | 'hug'
  | 'reflow'
  | 'match'
  | 'remap'
  | 'lag'
  | 'track-word'
  | 'leader-line'
  | 'connect';

export interface ElementLinkBinding {
  id: string;
  driverLayerId: string;
  targetLayerId?: string;
  driverProp: DriverProperty;
  drivenProp: DrivenProperty;
  mode: LinkMode;

  offset?: number;
  multiplier?: number;

  targetAnchor?: ConstraintAnchor;
  driverAnchor?: ConstraintAnchor;
  offset2D?: [number, number];
  clampToTrack?: boolean;

  padding?: [number, number] | [number, number, number, number];
  hugAnchor?: ConstraintAnchor;
  expansionPhysics?: 'instant' | 'spring' | 'smooth';
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;

  // Dynamic Reflow Gap
  reflowAxis?: 'horizontal' | 'vertical';
  reflowGap?: number;
  reflowAlignment?: 'start' | 'center' | 'end';

  lineCurve?: 'straight' | 'bezier' | 'orthogonal';
  dashSpeed?: number;
  arrowStart?: boolean;
  arrowEnd?: boolean;

  sourceRange?: [number, number];
  targetRange?: [number, number];
  easing?: EasingType;

  lagSeconds?: number;
  stiffness?: number;
  damping?: number;
}

export interface GridCoordinates {
  col: number;
  row: number;
  colSpan: number;
  rowSpan: number;
}

export type ContainerLayoutMode = 'hug' | 'stack' | 'freeform';

export interface HugLinkOptions {
  enabled: boolean;
  dimension?: 'both' | 'width' | 'height';
  paddingX?: number;
  paddingY?: number;
  physics?: 'spring' | 'instant';
  stiffness?: number;
  damping?: number;
}

export interface StackLinkOptions {
  enabled: boolean;
  axis?: 'vertical' | 'horizontal';
  gap?: number;
  align?: 'start' | 'center' | 'end';
  physics?: 'spring' | 'instant';
}

export interface ClipLinkOptions {
  enabled: boolean;
}

export interface PinLinkOptions {
  enabled: boolean;
  anchor?: ConstraintAnchor;
  offsetX?: number;
  offsetY?: number;
}

export interface ContainerLayoutConfig {
  mode?: ContainerLayoutMode;
  paddingX?: number;
  paddingY?: number;
  physics?: 'spring' | 'instant';
  stiffness?: number;
  damping?: number;
  stackAxis?: 'vertical' | 'horizontal';
  stackGap?: number;
  stackAlign?: 'start' | 'center' | 'end';

  // Multi-link modular options (can be just one or multiple simultaneously!)
  hug?: HugLinkOptions;
  stack?: StackLinkOptions;
  clip?: ClipLinkOptions;
  pin?: PinLinkOptions;
}

export interface BaseLayer {
  id: string;
  name: string;
  locked?: boolean;
  hidden?: boolean;
  style: LayerStyle;
  grid?: GridCoordinates;
  animation?: LayerAnimation;
  bindings?: ElementLinkBinding[];
  isCompound?: boolean;
  compoundType?: 'split-shape' | 'split-text' | 'split-line';
  isMask?: boolean;
  children?: Layer[];
  containerLayout?: ContainerLayoutConfig;
}

export type BooleanOperationType = 'union' | 'subtract' | 'intersect' | 'exclude';

export interface GroupLayer extends BaseLayer {
  type: 'group';
  layout?: LayoutConfig;
  autoFit?: boolean;
  clipContent?: boolean;
  isMaskGroup?: boolean;
  invertMask?: boolean;
  isBooleanGroup?: boolean;
  booleanOperation?: BooleanOperationType;
  trimStart?: number;
  trimEnd?: number;
  trimOffset?: number;
  children: Layer[];
  autoLink?: boolean;
  staggerDelay?: number;
  isCompound?: boolean;
  compoundType?: 'split-shape' | 'split-text' | 'split-line';
}

export interface TextLayer extends BaseLayer {
  type: 'text';
  content: string;
  autoFit?: boolean;
  maxFontSize?: number;
  minFontSize?: number;
}

export interface ChunkLayer extends BaseLayer {
  type: 'chunk';
  content: string;
}

export interface CounterLayer extends BaseLayer {
  type: 'counter';
  from?: number;
  to?: number;
  startValue: number;
  endValue: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  counterMode?: 'odometer' | 'smooth' | 'stepped';
  format?: string;
  useGrouping?: boolean;
  odometerRoll?: boolean;
  renderedValue?: string;
}

export interface ShapeLayer extends BaseLayer {
  type: 'shape';
  shapeType: 'rectangle' | 'circle' | 'ellipse' | 'triangle' | 'star' | 'polygon' | 'line' | 'arrow' | 'path';
  d?: string;
  viewBox?: string;
  fillRule?: 'nonzero' | 'evenodd';
  pathPerimeter?: number;
  points?: number;
  sides?: number;
  innerRadiusRatio?: number;
  arrowStart?: boolean;
  arrowEnd?: boolean;
  strokeCap?: 'butt' | 'round' | 'square';
  strokeJoin?: 'miter' | 'round' | 'bevel';
  trimStart?: number;
  trimEnd?: number;
  trimOffset?: number;
  strokeDashArray?: number[];
  strokeDashOffset?: number;
}

export interface ImageLayer extends BaseLayer {
  type: 'image';
  src: string;
  fit?: 'cover' | 'contain' | 'fill';
  objectFit?: 'cover' | 'contain' | 'fill';
}

export interface VideoLayer extends BaseLayer {
  type: 'video';
  src?: string;
  loop?: boolean;
  muted?: boolean;
  fit?: 'cover' | 'contain' | 'fill';
  playhead?: 'beat-synced' | 'independent';
  assetId?: string;
  sourceUrl?: string;
  sourceIn: number;
  sourceOut: number;
  start: number;
  duration: number;
  playbackRate: number;
  volume: number;
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
  specularSweep?: boolean;
  zElevate?: number;
  explode?: number;
  screenSlot?: {
    sourceType: ScreenSourceType;
    sourceId: string;
    fitMode?: 'cover' | 'contain' | 'stretch';
    emissiveIntensity?: number;
  };
}

export interface LineLayer extends BaseLayer {
  type: 'line';
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  arrowStart?: 'none' | 'arrow' | 'circle';
  arrowEnd?: 'none' | 'arrow' | 'circle';
  strokeWidth?: number;
  strokeColor?: string;
  strokeDashArray?: number[];
}

export interface PolygonLayer extends BaseLayer {
  type: 'polygon';
  sides: number;
}

export interface FrameLayer extends BaseLayer {
  type: 'frame';
  clipContent?: boolean;
  layout?: LayoutConfig;
  children: Layer[];
}

export interface IconLayer extends BaseLayer {
  type: 'icon';
  iconName: string;
  strokeWidth?: number;
}

export type Layer =
  | GroupLayer
  | FrameLayer
  | TextLayer
  | ChunkLayer
  | CounterLayer
  | ShapeLayer
  | LineLayer
  | PolygonLayer
  | ImageLayer
  | VideoLayer
  | Mockup3DLayer
  | IconLayer;
