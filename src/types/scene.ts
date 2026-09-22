import { Layer } from './layers';
import { EasingType } from './animation';

// Re-export animation and layer types for 100% backward compatibility
export * from './animation';
export * from './layers';

export type SceneTransitionType = 'cut' | 'fade' | 'slideLeft' | 'slideRight' | 'slideUp' | 'slideDown' | 'magicMove';

export interface SceneTransition {
  type: SceneTransitionType;
  duration: number; // in seconds, default e.g. 0.5
  easing?: EasingType;
}

export type AestheticMood =
  | 'product-showcase'
  | 'paper-collage'
  | 'kinetic-editorial'
  | 'analog-retro';

export interface AestheticProfile {
  id: AestheticMood;
  name: string;
  emoji: string;
  stepFps?: 'smooth' | number;
  description: string;
  defaultShadowMode?: 'soft' | 'hard';
  defaultEasing?: string;
  surfaceStyle?: {
    backgroundColor?: string;
    stickerBorder?: { width: number; color: string };
  };
}

export const AESTHETIC_PROFILES: Record<AestheticMood, AestheticProfile> = {
  'product-showcase': {
    id: 'product-showcase',
    name: 'Product Showcase',
    emoji: '🍏',
    stepFps: 'smooth',
    description: '60 FPS fluid spring motion, smooth curvature, telephoto 3D staging, and soft elevation blurs.',
    defaultShadowMode: 'soft',
    defaultEasing: 'snappy',
    surfaceStyle: {
      backgroundColor: '#09090b',
    },
  },
  'paper-collage': {
    id: 'paper-collage',
    name: 'Paper Collage',
    emoji: '✂️',
    stepFps: 8,
    description: '8 FPS stop-motion, white die-cut sticker outlines, 0px brutalist hard shadows, and tactile line boil.',
    defaultShadowMode: 'hard',
    defaultEasing: 'linear',
    surfaceStyle: {
      backgroundColor: '#fafaf9',
      stickerBorder: { width: 4, color: '#ffffff' },
    },
  },
  'kinetic-editorial': {
    id: 'kinetic-editorial',
    name: 'Kinetic Editorial',
    emoji: '📰',
    stepFps: 24,
    description: '24 FPS cinematic poster layout, high-contrast typography, monochrome accents, and hard dividers.',
    defaultShadowMode: 'hard',
    defaultEasing: 'snappy',
    surfaceStyle: {
      backgroundColor: '#000000',
    },
  },
  'analog-retro': {
    id: 'analog-retro',
    name: 'Analog Retro',
    emoji: '📼',
    stepFps: 12,
    description: '12 FPS anime on twos, elastic bounce settle, vintage warm palette, and CRT scanline depth.',
    defaultShadowMode: 'soft',
    defaultEasing: 'bouncy',
    surfaceStyle: {
      backgroundColor: '#181412',
    },
  },
};

export interface Screen {
  id: string;
  name: string;
  duration: number; // in seconds
  layers: Layer[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  backgroundColor?: string;
  transition?: SceneTransition;
  stepFps?: 'smooth' | number;
  mood?: AestheticMood;
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
  modelType?: any;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  screenSlot?: {
    sourceType: any;
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
  stepFps?: 'smooth' | number;
  mood?: AestheticMood;
}

export interface SceneDocument {
  version: string;
  name: string;
  settings: ProjectSettings;
  screens: Screen[];
  shots?: any[];
  threeDShots?: ThreeDShot[];
  editor?: EditorSequence;
  storyboard?: StoryboardScene;
}

export type Document = SceneDocument;

// ---------------------------------------------------------------------------
// Modular Video Grid & Storyboard Architecture
// ---------------------------------------------------------------------------

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:5';

export interface GridConfig {
  aspectRatio: AspectRatio;
  cols: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
  margin: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  gutter: number;
}

export interface SpringConfig {
  stiffness: number;
  damping: number;
  mass?: number;
}

export type BeatTransitionProfile = 'snappy' | 'smooth' | 'bouncy' | 'heavy' | 'linear';

export interface BeatTransition {
  duration: number; // Transition duration in seconds (default 0.6)
  profile: BeatTransitionProfile;
  spring?: SpringConfig;
}

export interface BeatCamera {
  targetRegion?: [number, number, number, number]; // [col, row, colSpan, rowSpan] or [x, y, w, h]
  tilt?: [number, number, number]; // [pitch, yaw, roll] in degrees
  zoom?: number; // default 1.0
  fov?: number; // default 35 (telephoto standard)
  tracking?: 'none' | 'smooth';
  targetLayerId?: string;
}

export interface Beat {
  id: string;
  name: string;
  duration: number; // Hold duration in seconds at rest
  transition?: BeatTransition;
  camera?: BeatCamera;
  layers: Layer[];
  notes?: string;
}

export interface StoryboardScene {
  id: string;
  name: string;
  aspectRatio: AspectRatio;
  width: number;
  height: number;
  fps: number;
  beats: Beat[];
  theme?: {
    backgroundColor: string;
    accentColor?: string;
    textColor?: string;
    fontFamily?: string;
  };
}
