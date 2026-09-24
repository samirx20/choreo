import {
  SceneDocument,
  Screen,
  Layer,
  LayerStyle,
  LayerAnimation,
  ProjectSettings,
  ElementLinkBinding,
  AnimationClip,
  AnimationClipType,
  UiMode,
} from "@/types/scene";
import { RazorSplitResult } from "@/engine/video/razorSplit";

export type CanvasTool =
  | "select"
  | "hand"
  | "artboard"
  | "frame"
  | "text"
  | "rectangle"
  | "circle"
  | "star"
  | "triangle"
  | "polygon"
  | "line"
  | "arrow"
  | "media";

export type { UiMode };

export const isMotionMode = (mode: UiMode) => mode === "motion" || mode === "animate";

export interface ModeSavedState {
  pan: { x: number; y: number };
  zoom: number;
  activeScreenId: string;
  selectedLayerIds: string[];
  activeTool: CanvasTool;
  currentTime?: number;
  selectedClipIds?: string[];
  loopMode?: "all" | "scene";
}

export type ShapeEdgeId = string;

export interface SplitModeState {
  layerId: string;
  type: "shape" | "line";
  selectedEdges: ShapeEdgeId[];
  cutRatio: number;
  detachArrowhead: boolean;
}

export interface ScreenTiming {
  screen: Screen;
  startTime: number;
  endTime: number;
  duration: number;
}

export interface ProjectStoreState {
  // Document state (persisted to scene.json)
  document: SceneDocument;

  // Ephemeral UI state (excluded from scene.json)
  activeScreenId: string;
  selectedLayerIds: string[];
  editingLayerId: string | null;
  activeTextSelection: { layerId: string; start: number; end: number; text: string } | null;
  splitModeState: SplitModeState | null;
  activeTool: CanvasTool;
  uiMode: UiMode;
  motionLayerIds: string[] | null;
  currentTime: number;
  isPlaying: boolean;
  isLooping: boolean;
  loopMode: "all" | "scene";
  zoom: number; // 1 = 100%
  pan: { x: number; y: number };
  designModeState: ModeSavedState | null;
  animateModeState: ModeSavedState | null;
  setPan: (pan: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => void;
  canUndo: boolean;
  canRedo: boolean;

  // History Actions
  startTransaction: () => void;
  commitTransaction: () => void;
  cancelTransaction: () => void;
  undo: () => void;
  redo: () => void;

  // UI State Actions (excluded from document history)
  setUiMode: (mode: UiMode) => void;
  sendScreenToMotion: (screenId?: string) => void;
  setCurrentTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setIsLooping: (looping: boolean) => void;
  setLoopMode: (mode: "all" | "scene") => void;
  setZoom: (zoom: number) => void;
  selectScreen: (screenId: string) => void;
  selectLayer: (layerId: string, multi?: boolean) => void;
  deselectAll: () => void;
  setEditingLayerId: (id: string | null) => void;
  setActiveTextSelection: (sel: { layerId: string; start: number; end: number; text: string } | null) => void;
  setTool: (tool: CanvasTool) => void;
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
  toggleTheme: () => void;

  // Document Mutation Actions (recorded in history)
  setDocument: (doc: SceneDocument) => void;
  setProjectName: (name: string) => void;
  updateSettings: (settings: Partial<ProjectSettings>) => void;
  addScreen: (screen?: Partial<Screen>) => void;
  updateScreen: (screenId: string, updates: Partial<Screen>) => void;
  deleteScreen: (screenId: string) => void;
  duplicateScreen: (screenId: string) => void;
  addLayer: (layer: Layer, targetGroupId?: string) => void;
  updateLayer: (layerId: string, updates: Partial<Layer>) => void;
  updateLayerStyle: (layerId: string, styleUpdates: Partial<LayerStyle>) => void;
  updateLayerAnimation: (
    layerId: string,
    animUpdates: Partial<LayerAnimation>,
    options?: { ripple?: boolean }
  ) => void;
  removeLayer: (layerId: string) => void;
  duplicateLayer: (layerId: string) => void;
  duplicateLayerInPlace: (layerId: string) => string;
  nestLayerInGroup: (layerId: string, targetGroupId: string) => void;
  ungroup: (groupId: string) => void;
  reorderLayer: (sourceId: string, targetId: string, position: "before" | "after" | "inside") => void;
  bringToFront: (layerId: string) => void;
  sendToBack: (layerId: string) => void;
  bringForward: (layerId: string) => void;
  sendBackward: (layerId: string) => void;
  groupSelection: () => void;
  maskSelection: () => void;
  useAsMask: (layerId: string) => void;
  unmaskGroup: (groupId: string) => void;
  toggleMaskInvert: (groupId: string) => void;
  splitTextRange: (layerId: string, start: number, end: number) => void;
  splitTextAtCaret: (layerId: string, index: number) => void;
  splitTextIntoWords: (layerId: string) => void;
  splitTextIntoLines: (layerId: string) => void;
  splitShapeContour: (layerId: string) => void;
  separateStrokeAndFill: (layerId: string) => void;
  splitLineAtPoint: (layerId: string, ratio?: number) => void;
  detachArrowhead: (layerId: string) => void;
  detachGroupToAbsolute: (groupId: string) => void;
  mergeChunkWithPrevious: (chunkId: string) => void;
  mergeChunkWithNext: (chunkId: string) => void;

  // Spatial Alignment & Distribution Actions
  alignSelectedLayers: (
    alignment: "left" | "center" | "right" | "top" | "middle" | "bottom",
    relativeTo?: "selection" | "canvas"
  ) => void;
  distributeSpacing: (direction: "horizontal" | "vertical") => void;
  tidyUpSelection: () => void;

  // Timeline Clip Selection
  selectedClipIds: string[];
  setSelectedClips: (ids: string[]) => void;
  toggleClipSelection: (id: string, isMulti?: boolean) => void;

  // Work Area Loop Region
  workArea: { start: number; end: number } | null;
  setWorkArea: (workArea: { start: number; end: number } | null) => void;
  setWorkAreaStart: (time: number) => void;
  setWorkAreaEnd: (time: number) => void;

  // Document Palette Actions
  addPaletteColor: (color: string) => void;
  removePaletteColor: (color: string) => void;

  // Reactive Element Bindings
  addLayerBinding: (layerId: string, binding: ElementLinkBinding) => void;
  updateLayerBinding: (layerId: string, bindingId: string, patch: Partial<ElementLinkBinding>) => void;
  removeLayerBinding: (layerId: string, bindingId: string) => void;

  // Razor Split & Multi-Studio Handoff
  razorSplitLayer: (layerId: string, time?: number) => RazorSplitResult;
  sendTo3D: () => void;
  sendToEditor: () => void;

  // Project Management & Persistence
  loadDocument: (doc: SceneDocument) => void;
  resetProject: () => void;

  // Multi-Animation Clip Actions
  addAnimationClip: (layerId: string, clip: Partial<Omit<AnimationClip, "id">>) => string;
  updateAnimationClip: (
    layerId: string,
    clipId: string,
    updates: Partial<AnimationClip>,
    options?: { ripple?: boolean }
  ) => void;
  removeAnimationClip: (layerId: string, clipId: string) => void;
  duplicateAnimationClip: (layerId: string, clipId: string) => string;
  reorderAnimationClips: (layerId: string, orderedClipIds: string[]) => void;
  splitAnimationClip: (layerId: string, clipId: string, splitTime?: number) => void;

  // Jitter Animation Catalog Sheet State (overlay sheet matching exact right sidebar bounds)
  animationCatalogState: {
    isOpen: boolean;
    selectedClipId: string | null;
  };
  openAnimationCatalog: (selectedClipId?: string | null) => void;
  closeAnimationCatalog: () => void;
  applyAnimationPreset: (
    layerId: string,
    clipId: string | null | undefined,
    preset: {
      id: string;
      name: string;
      type: AnimationClipType;
      duration: number;
      easing: string;
      params?: Record<string, any>;
    }
  ) => string | null;

  // Interactive Split Mode Actions
  enterSplitMode: (layerId: string) => void;
  toggleSplitEdge: (edge: ShapeEdgeId) => void;
  setSplitCutRatio: (ratio: number) => void;
  setSplitDetachArrowhead: (detach: boolean) => void;
  exitSplitMode: () => void;
  confirmSplit: () => void;
}
