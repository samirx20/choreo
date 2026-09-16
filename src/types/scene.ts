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
  | 'dropIn'
  | 'maskWipe'
  | 'circleReveal';

export interface AnimationConfig {
  preset: AnimationPreset | string;
  start: number; // in seconds
  duration: number; // in seconds
  easing: EasingType;
  bezierPoints?: [number, number, number, number];
  params?: {
    distance?: number;
    initialScale?: number;
    fade?: boolean;
    direction?: 'up' | 'down' | 'left' | 'right';
    blurRadius?: number;
    overshootAmount?: number;
    axis?: 'x' | 'y';
    perspective?: number;
    initialAngle?: number;
    [key: string]: any;
  };
}

export interface LayerAnimation {
  in?: AnimationConfig;
  out?: AnimationConfig;
  emphasis?: AnimationConfig;
  custom?: Record<string, any>;
}

export interface ShadowStyle {
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: string;
  inset?: boolean;
}

export interface LayerStyle {
  x: number;
  y: number;
  width: number | 'auto';
  height: number | 'auto';
  rotation: number; // in degrees
  opacity: number; // 0 to 1
  backgroundColor?: string;
  color?: string; // text fill
  fontSize?: number;
  fontWeight?: string | number;
  fontFamily?: string;
  lineHeight?: number;
  letterSpacing?: string | number;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  borderRadius?: number | [number, number, number, number]; // TL, TR, BR, BL
  borderWidth?: number;
  borderColor?: string;
  borderStyle?: 'solid' | 'dashed' | 'dotted';
  strokeAlign?: 'inside' | 'center' | 'outside';
  shadows?: ShadowStyle[];
  filterBlur?: number; // Layer blur px
  backdropBlur?: number; // Background blur px
  padding?: number | [number, number, number, number]; // T, R, B, L
  customCss?: string;
  tailwindClasses?: string;
}

export interface LayoutConfig {
  display: 'flex' | 'grid' | 'absolute';
  flexDirection: 'row' | 'column';
  flexWrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  gap: number;
  align: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'space-between' | 'space-around';
  justifyContent?: 'start' | 'center' | 'end' | 'space-between' | 'space-around';
}

export interface BaseLayer {
  id: string;
  name: string;
  locked?: boolean;
  hidden?: boolean;
  style: LayerStyle;
  animation?: LayerAnimation;
}

export interface GroupLayer extends BaseLayer {
  type: 'group';
  layout: LayoutConfig;
  autoFit: boolean;
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

export interface ShapeLayer extends BaseLayer {
  type: 'shape';
  shapeType: 'rectangle' | 'circle' | 'star' | 'triangle' | 'line';
}

export interface ImageLayer extends BaseLayer {
  type: 'image';
  src: string;
  objectFit: 'cover' | 'contain' | 'fill';
}

export type Layer = GroupLayer | TextLayer | ChunkLayer | ShapeLayer | ImageLayer;

export interface Screen {
  id: string;
  name: string;
  duration: number; // in seconds
  layers: Layer[];
}

export interface ProjectSettings {
  width: number;
  height: number;
  fps: number;
  duration: number;
  backgroundColor: string;
}

export interface SceneDocument {
  version: string;
  name: string;
  settings: ProjectSettings;
  screens: Screen[];
}
