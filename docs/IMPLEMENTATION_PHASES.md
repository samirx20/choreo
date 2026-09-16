# IMPLEMENTATION_PHASES.MD: Detailed Engineering Roadmap

This document outlines the step-by-step engineering roadmap for building **Choreo** across 7 modular phases. Each phase is self-contained with explicit technical tasks and concrete testable deliverables.

---

## Phase 1: Foundation, Scaffolding & State Store

### Objectives:
Initialize the application workspace, set up the dark-mode aesthetic with **shadcn/ui**, and implement the declarative `scene.json` state store with transactional undo/redo.

### Tasks:
1. **Scaffold Project**:
   * Initialize React 19 + TypeScript + Vite workspace.
   * Configure Tailwind CSS with the dark-theme color palette (zinc-950 background, zinc-900 panels, zinc-800 borders, violet accent).
   * Install Lucide React and Radix UI primitives.
   * Add core shadcn/ui components (`Button`, `Input`, `Slider`, `ToggleGroup`, `DropdownMenu`, `Dialog`, `Tooltip`, `Popover`, `Tabs`).
2. **Declarative State Store (`src/store/useProjectStore.ts`)**:
   * Implement Zustand store managing the single source of truth `scene.json` AST.
   * Actions: `updateSettings`, `addScreen`, `updateLayer`, `addLayer`, `removeLayer`, `reorderLayers`, `nestLayerInGroup`.
3. **Transactional Undo/Redo Engine (`src/store/history.ts`)**:
   * State snapshot stack (`past`, `present`, `future`).
   * Continuous drag batching: record single transaction on `pointerup`.
   * Viewport pan/zoom and playhead position strictly excluded from history.
4. **Core DOM Layer Renderers (`src/components/canvas/renderers/`)**:
   * `<ScreenRenderer>`: Manages resolution container (`1920x1080` / `9:16`).
   * `<GroupRenderer>`: Supports CSS Flexbox (`row`, `column`, `wrap`, `gap`, `padding`), Grid, and Absolute positioning.
   * `<TextRenderer>`: Typography, line-height, letter-spacing, text-transform.
   * `<ChunkRenderer>`: Kinetic chunk element inside a group.
   * `<ShapeRenderer>`: SVG/CSS Rectangles, Circles, Stars, Borders, Shadows.
   * `<ImageRenderer>`: Media with `object-fit` cover/contain.

### Milestone Deliverable:
A running dark-mode app shell rendering an interactive scene from `scene.json` with working transactional `Ctrl+Z` / `Ctrl+Shift+Z` undo/redo.

---

## Phase 2: The Motion & Preset Engine

### Objectives:
Build the mathematical motion evaluation engine based on Jitter's 8 atomic properties and CSS layout animations (FLIP).

### Tasks:
1. **8 Atomic Property Evaluators (`src/engine/atomics/`)**:
   * `Move`: Transform $X, Y, Z$.
   * `Scale`: Uniform or $X, Y$.
   * `Rotate`: 2D angle or 3D tilt ($X, Y$).
   * `Opacity`: $0.0 \to 1.0$.
   * `Blur`: CSS `filter: blur()`.
   * `Color/Fill`: Hex / RGB / Gradient interpolation.
   * `Shadow`: Box shadow offset, blur, spread, color.
   * `Mask/Clip`: CSS `clip-path` inset, circle, and polygon reveals.
2. **Cubic-Bezier Easing Library (`src/engine/easings.ts`)**:
   * Built-in presets: `Smooth` (Cubic ease-out), `Bouncy / Elastic`, `Overshoot`, `Snappy`, `Linear`.
   * Custom cubic-bezier evaluator: $B(t) = (1-t)^3 P_0 + 3(1-t)^2 t P_1 + 3(1-t) t^2 P_2 + t^3 P_3$.
3. **Preset Recipe Catalog (`src/engine/presets/`)**:
   * **Fade**: `Fade In/Out`, `Slide In/Out` (Up, Down, Left, Right).
   * **Scale**: `Grow`, `Shrink`, `Pop`, `Spin`, `Twist`, `Move & Scale`.
   * **Mask**: `Mask Wipe`, `Mask Reveal`.
   * **3D**: `3D Flip X`, `3D Flip Y`, `Drop In`.
4. **FLIP Reactive Auto-Fit Container (`src/components/canvas/AutoFitContainer.tsx`)**:
   * Measures bounding box of visible child chunks at timestamp $t$.
   * Morphs container dimensions smoothly via GPU-accelerated layout transitions.

### Milestone Deliverable:
Given timestamp $t$, any element or grouped sequence animates deterministically with zero non-deterministic timers.

---

## Phase 3: Studio GUI — Canvas & Design Mode

### Objectives:
Build the complete static visual composition workspace, transform controls, snapping guides, and the Design Inspector matching reference Screenshot 4.

### Tasks:
1. **Canvas Viewport (`src/components/canvas/CanvasViewport.tsx`)**:
   * Pan (`Space + Drag`), Zoom (`Ctrl + Scroll` or Zoom dropdown).
   * Transform Bounding Box: 8 resize handles, rotation pin handle, center drag.
2. **Smart Magnetic Snapping (`src/components/canvas/snapping.ts`)**:
   * Magenta alignment lines for canvas center and sibling layer edges.
   * Dynamic gap measurement badges (e.g. `24px` indicator).
   * `Shift + Drag` constraints (1:1 aspect, 15° rotation increments).
3. **Left Sidebar (`src/components/sidebar/LeftSidebar.tsx`)**:
   * Screens list: add, duplicate, delete, reorder, duration badge.
   * Layers Tree: nested DOM hierarchy, drag-and-drop reordering, z-index, visibility toggle, lock toggle.
4. **Floating Add Toolbar (`src/components/canvas/FloatingToolbar.tsx`)**:
   * Docked at bottom-center: Text, Shapes, Media/Icons, Custom Components.
5. **Right Sidebar Design Inspector (`src/components/inspector/DesignInspector.tsx`)**:
   * Directly implements Screenshot 4: Alignment quick-bar, Layout (X/Y/W/H/Angle), CSS Flex/Auto-Fit settings, Typography, Opacity, 4-corner Radius expander, Fill, Stroke, Shadows, Blurs.
   * Collapsible "Advanced CSS & Tailwind" drawer.
6. **Context-Aware Text Splitting & Auto-Grouping (`src/engine/textSplitter.ts`)**:
   * Splitting sentences $\to$ flex-column `<Group>`.
   * Splitting words $\to$ flex-row wrap `<Group>`.
   * **0px visual shift guarantee**.
   * Auto-Grouping (`Ctrl+G`) with union bounding box calculation.

### Milestone Deliverable:
A full visual design studio where users can create layouts, arrange shapes, split text without visual shift, and inspect CSS attributes.

---

## Phase 4: Studio GUI — Timeline & Animate Mode

### Objectives:
Build the Animate Mode UI, multi-track timeline panel, cascade rippling engine, and the Animate Inspector matching reference Screenshots 1, 2, and 3.

### Tasks:
1. **Mode Switcher**:
   * Segmented toggle `[ Design | Animate ]` with keyboard hotkey `Tab`.
2. **Bottom Multi-Track Timeline (`src/components/timeline/TimelinePanel.tsx`)**:
   * Timecode display (`00:01:15`), current frame (`F75`), zoom slider.
   * Transport controls: Step Back (`,`), Play/Pause (`Space`), Step Forward (`.`), Loop toggle (`L`).
   * Track rows aligned with layer tree. Expandable parent groups with child chunk tracks.
   * Draggable animation clip blocks with trim handles.
   * Expandable property sub-tracks for granular curve tweaking.
3. **Auto-Link (🔗) Cascade Rippling Engine (`src/engine/cascade.ts`)**:
   * Enabled by default on groups and split chunks.
   * Shifting Chunk $N$'s duration automatically cascades subsequent chunks forward by the configured stagger interval.
4. **Right Sidebar Animate Inspector (`src/components/inspector/AnimateInspector.tsx`)**:
   * Top 3 tabs: `[ PRESETS ]` | `[ CUSTOM ]` | `[ EFFECTS ]`.
   * **Presets Tab** (Screenshot 1): 2-column cards for Fade, Scale, Mask, 3D.
   * **Custom Tab** (Screenshot 2): Transform, Style, Effects, Other property tree.
   * **Effects Tab**: Shaders, glitch, typewriter.
   * **Active Animation Card** (Screenshot 3): Header with icon + name + `[Change]` button; Mode toggle `[ In | Out ]`; initial parameters; duration, delay; Easing dropdown + interactive Bézier curve editor popover; cascade stagger slider.
5. **Animation Copy & Paste (`src/engine/animationClipboard.ts`)**:
   * Copy animation (`Ctrl+Alt+C`) $\to$ Paste animation (`Ctrl+Alt+V`).
   * Smart paste at playhead with non-intrusive `Replace Existing` vs `Append` prompt.

### Milestone Deliverable:
Full animation sequencing with frame-accurate scrubbing, multi-track timeline, Jitter-style animation cards, and cascade staggers.

---

## Phase 5: Custom Components & In-App AI Assistant

### Objectives:
Implement the reusable component library and the zero-friction `Ctrl+K` AI assistant workflow.

### Tasks:
1. **Custom Component Library (`src/components/library/ComponentDrawer.tsx`)**:
   * "Save as Custom Component" modal (Project vs Global scope).
   * Component Drawer in floating toolbar: tabs for Project and Global library.
   * Hover preview canvas with animated playback.
   * Stampable standalone copies by default, with optional `Keep Linked to Master` toggle.
2. **AI Command Bar (`src/components/ai/CommandBar.tsx`)**:
   * Centered floating modal activated via `Ctrl+K` or top-bar sparkle button.
   * Natural language input with dynamic suggestion chips.
   * Direct AST mutation on `scene.json`.
   * Canvas diff highlight outline + bottom notification toast: `[✨ AI Applied: 3 changes] [Undo] [Keep]`.
3. **Interactive Keyboard Shortcuts Modal (`src/components/modals/ShortcutsModal.tsx`)**:
   * Opened via `?` or `Ctrl+/`. Clean 2-column hotkey cheat sheet.

### Milestone Deliverable:
Reusable component templates and seamless natural language command execution with instant undo.

---

## Phase 6: Desktop Packaging & Unified Offline Video Export

### Objectives:
Package the app with Tauri v2 and implement the unified cross-platform offline FFmpeg video export pipeline.

### Tasks:
1. **Tauri v2 Initialization (`src-tauri/`)**:
   * Configure `tauri.conf.json` with `"titleBarStyle": "Overlay"` for macOS.
   * Multi-target sidecar configuration for `ffmpeg`:
     * Windows: `binaries/ffmpeg-x86_64-pc-windows-msvc.exe`
     * macOS (ARM): `binaries/ffmpeg-aarch64-apple-darwin`
     * macOS (Intel): `binaries/ffmpeg-x86_64-apple-darwin`
     * Linux: `binaries/ffmpeg-x86_64-unknown-linux-gnu`
2. **In-Webview Virtual Clock & Frame Grabber (`src/engine/export/virtualClock.ts`)**:
   * Evaluates composition at exact frames $f = 0, 1, 2 \dots N$.
   * Extracts raw RGBA pixel byte buffer.
   * Retina/4K normalization: enforces target pixel dimensions without devicePixelRatio bloat.
3. **Rust FFmpeg Stdin Pipe (`src-tauri/src/export.rs`)**:
   * Spawns bundled FFmpeg sidecar and pipes raw RGBA frames directly to stdin.
   * Presets: MP4 (H.264/H.265), transparent WebM (VP9 + Alpha), Apple ProRes 4444, animated GIF (palettegen).
   * Real-time progress events emitted to frontend progress bar.
4. **`.motion` Bundle File Persistence (`src-tauri/src/bundle.rs`)**:
   * Zip packaging packing `scene.json`, `components.json`, and `assets/` (images, videos, embedded fonts).
   * Continuous background auto-save to disk.
5. **Cross-Platform System Font Discovery (`src-tauri/src/fonts.rs`)**:
   * Uses Rust `font-kit` to query Windows DirectWrite, macOS CoreText, and Linux Fontconfig.

### Milestone Deliverable:
Standalone native desktop application (`.exe`, `.dmg`, `.AppImage`) exporting production-ready 60fps MP4 and transparent WebM offline.

---

## Phase 7: Model Context Protocol (MCP) Server

### Objectives:
Expose local MCP tools so external AI models (Cursor, Claude, Antigravity) can inspect and orchestrate Motion Studio projects.

### Tasks:
1. **Node.js/TypeScript MCP Server (`mcp-server/`)**:
   * Uses `@modelcontextprotocol/sdk`.
   * Tools: `get_project_state`, `update_project_settings`, `create_screen`, `add_group`, `split_text_into_chunks`, `apply_preset`, `export_video`, `render_preview_frame`.
2. **Multimodal Visual Feedback**:
   * `render_preview_frame({ timeInSeconds })`: captures base64 PNG frame snapshot for vision inspection.

### Milestone Deliverable:
External AI agents can read and manipulate project scenes via standardized MCP tool calls.
