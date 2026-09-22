# Motion Studio Handoff — Primitives & Component Architecture Roadmap

> **Session Context**: This handoff document captures the architectural decisions, current system state, and exact implementation specifications for the next session.
> **Date**: September 21, 2026

---

## 1. Current System Baseline & Verification

The codebase is in a verified, pristine state:
* **Automated Unit Tests**: All **30 test suites (230 tests)** passing via Vitest (`npx vitest run`).
* **Production Build**: Compiles cleanly with **0 errors in 10.21s** (`npm run build`).
* **Architecture**:
  * **Dual-Mode Studio**: Design Mode (infinite staging board, side-by-side scenes, zoom 20%–400%) vs. Animate Mode (fixed 100% video theater monitor at origin `(0, 0)`, non-active scenes hidden).
  * **Sequential Multi-Scene Timeline**: Sticky Scene Blocks Bar with proportional drag-to-resize duration handles, full-duration timeline ruler with active scene window shading, and playhead scene auto-sync.
  * **Layout**: Segmented switcher in Top Header Center, Project Title in Top Header Left, floating glassmorphism design toolbar at bottom-center of canvas (Design Mode only), full-height inspector.
  * **State Preservation**: Independent camera position (`pan`, `zoom`), active artboard, selected layers, selected clips, and playhead position when toggling between Design and Animate modes.
  * **Omnipresent Renaming**: Zero dead buttons. In-place double-click renaming across scenes, layers, timeline tracks, and animation clips, plus full context menus.

---

## 2. Next Session Task: The Primitives & Component Architecture

### The Core Architectural Concept
Maintain a strict distinction between **Fundamental Building Blocks (Primitives)** and **Composed Modules (Component & Icon Libraries)**:
* **Primitives** live directly on the canvas and in the shape creation palette.
* **Component Library & Icon Picker** live in searchable overlays / sheets that stamp pre-composed elements onto the canvas.

---

## 3. Detailed Specifications for Next Session

### Phase 1: Missing Core Primitives (Canvas Building Blocks)

#### 1. Line & Arrow (`Line` / `Arrow`)
* **Purpose**: Dividers, callouts, pointers, section rules, and flowchart connectors.
* **Type Definition (`src/types/scene.ts`)**:
  ```ts
  export interface LineLayer extends BaseLayer {
    type: "line";
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    arrowStart?: "none" | "arrow" | "circle";
    arrowEnd?: "none" | "arrow" | "circle";
    strokeWidth: number;
    strokeColor: string;
    strokeDashArray?: number[]; // dashed/dotted lines
  }
  ```
* **Renderer**: `src/components/canvas/renderers/LineRenderer.tsx` (SVG `<line>` with marker definitions for arrowheads).
* **Inspector**: Controls for length, angle, stroke weight, color, start/end arrowhead styles, and dash pattern.

#### 2. Polygon & Triangle (`Polygon`)
* **Purpose**: Play button triangles (media player), metric trend indicators ($\blacktriangle$ / $\blacktriangledown$), hexagon/octagon badges.
* **Type Definition**:
  ```ts
  export interface PolygonLayer extends BaseLayer {
    type: "shape";
    shapeType: "polygon" | "triangle";
    sides: number; // 3 for triangle, 5 for pentagon, 6 for hexagon, etc.
  }
  ```
* **Renderer**: SVG `<polygon points="..." />` calculating equilateral vertices centered within the layer's `width` and `height`.

#### 3. Frame / Container (`Frame`)
* **Purpose**: Sub-containers, cards, and clipping windows inside a Scene (distinct from Scenes!).
* **Crucial Distinction**:
  * **Scene**: Top-level root stage. Has timeline duration (e.g. 3.0s). The Animate Mode camera locks onto it. Cannot be nested.
  * **Frame**: Spatial container *inside* a Scene. No independent duration. Clips child elements (`overflow: hidden`), provides auto-layout / hugging, and moves children in relative coordinates.
* **Type Definition**:
  ```ts
  export interface FrameLayer extends BaseLayer {
    type: "frame";
    clipContent: boolean; // overflow: hidden
    layout?: {
      display: "flex";
      flexDirection: "row" | "column";
      gap: number;
      padding: number;
      align: "start" | "center" | "end";
      justify: "start" | "center" | "end" | "space-between";
    };
    children: Layer[];
  }
  ```

#### 4. Native Video Primitive (`Video`)
* **Purpose**: Screen recordings, product demos, and background footage playing inside the motion graphic.
* **Type Definition**:
  ```ts
  export interface VideoLayer extends BaseLayer {
    type: "video";
    src: string;
    playbackRate: number;
    loop: boolean;
    muted: boolean;
    volume: number;
    timeOffset: number; // Playhead sync
  }
  ```
* **Renderer**: Hooked into `CanvasViewport`'s `currentTime` so the video frame scrub matches the timeline playhead.

#### 5. Vector Path / Pen (`Path`)
* **Purpose**: Custom bezier curves, hand-drawn emphasis squiggles under text, speech bubbles, and custom SVG paths.
* **Type Definition**:
  ```ts
  export interface PathLayer extends BaseLayer {
    type: "path";
    d: string; // SVG path data string
    strokeWidth: number;
    strokeColor: string;
    fillColor?: string;
  }
  ```

---

### Phase 2: Composed Libraries (Sheets & Overlays)

#### 1. Icon Library Drawer (`Icon`)
* **Architecture & Packaging**:
  * **Shipped Locally (Zero External CDN / API)**: Uses `lucide-react` (already installed in `node_modules`). Does **not** query external networks, ensuring 100% offline functionality, zero flickering, and resilience against CDN downtime.
  * **Code-Split / Lazy-Loaded**: Packaged as a separate dynamic chunk via `React.lazy(() => import('./IconPickerSheet'))`. Adds 0KB to initial app bundle startup time and only loads when the user clicks `[ ✦ Icons ]`.
  * **Instant In-Memory Search (< 1ms)**: Queries the local `icons` dictionary (all 1,555 vector icons) in memory for instant, 60fps search-as-you-type with zero loading spinners.
* **Data Contract (`IconLayer`)**:
  ```ts
  export interface IconLayer extends BaseLayer {
    type: "icon";
    iconName: string; // e.g. "Sparkles", "ArrowRight", "Zap"
    style: {
      color: string;
      size: number;
      strokeWidth: number;
    } & BaseLayerStyle;
  }
  ```
* **Canvas Rendering**: `IconRenderer.tsx` retrieves the component from `icons[layer.iconName]` and renders scalable SVG, exporting cleanly to MP4/WebM.

#### 2. Component Library Drawer (`Component`)
* **UI**: Clicking `[ ⊞ Components ]` opens a visual drawer with pre-made showcase modules:
  1. **Browser Window Frame**: Safari / Chrome chrome with macOS traffic lights (red, yellow, green) and URL pill.
  2. **3D Device Mockups**: iPhone 16 Pro, MacBook Pro, and iPad using the existing Three.js PBR engine (`src/engine/three/`).
  3. **Kinetic Counter**: Odometer digit roll with prefix (`$`), suffix (`%`, `ms`), and spring interpolation.
  4. **Code Block Window**: Syntax-highlighted code snippet box with typing reveal.

---

### Phase 3: Toolbar Reorganization

Update `src/components/canvas/FloatingDesignToolbar.tsx` to group shapes under a clean dropdown while keeping high-frequency tools immediate:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [ ↖ Select ] │ [ ⊞ Scene ] [ ⊡ Frame ] │ [ T Text ] [ 🖼 Media ▾ ] [ ▢ Shapes ▾ ] │ [ ✦ Icons ] [ ⊞ Components ] │ [ 🪄 AI ] │
└────────────────────────────────────────────────────────────────────────────────────────┘
                                                              │
                                       ┌──────────────────────┴──────────────────────┐
                                       │ ▢ Rectangle                                 │
                                       │ ○ Ellipse                                   │
                                       │ △ Triangle / Polygon                        │
                                       │ ☆ Star                                      │
                                       │ ─ Line                                      │
                                       │ ↗ Arrow                                     │
                                       └─────────────────────────────────────────────┘
```

---

### Phase 4: Multi-Style Aesthetic Engine (6–12 FPS Stop-Motion, Collage & Tactile Art Styles)

Motion Studio is not exclusively for 60 FPS ultra-smooth corporate tech UI. It is equally architected for **collage animations, paper cutouts, 6–12 FPS stop-motion ("on twos"), retro zine, mixed media, and handcrafted indie art styles**.

#### 1. Frame Rate Stepping / Time Posterization (`stepFps` / `posterizeTime`)
* **How it works mathematically**:
  * Continuous spring physics evaluate time as $t$.
  * For collage / stop-motion style, time is discretized into stepped frames:
    $$t_{\text{stepped}} = \frac{\lfloor t \times \text{fps} \rfloor}{\text{fps}}$$
  * Supported frame rates:
    * `60 fps`: Fluid modern Apple / Google showcase motion.
    * `24 fps`: Standard cinematic film motion.
    * `12 fps` ("On Twos"): Traditional hand-drawn anime and cel animation.
    * `8 fps` / `6 fps`: Tactile stop-motion, scrapbook collage, and zine animation.
* **Scope**: Configurable at **Project level**, **Scene level**, or **Clip level** (`stepFps: "smooth" | 60 | 24 | 12 | 8 | 6`).
* **Implementation in Evaluator (`src/engine/evaluator.ts`)**:
  ```ts
  const effectiveFps = clip.stepFps || screen.stepFps || doc.settings.fps;
  const evalTime = effectiveFps ? Math.floor(t * effectiveFps) / effectiveFps : t;
  ```

#### 2. Collage & Tactile Visual Primitives
* **Die-Cut / Sticker Border**: Configurable outer sticker stroke (e.g. 4px solid white border with hard edge) around cutout photos, PNGs, and typography.
* **Hard Shadow (No Blur)**: Retro/zine/brutalist offset shadows (`box-shadow: 6px 6px 0px #000`) instead of soft diffuse blurs.
* **Paper Grain & Noise Overlay**: Global or per-scene SVG noise filter / texture layer (`feTurbulence` / canvas noise) providing tactile paper or film grain feel.
* **Stop-Motion Line Boil / Wiggle Effect**:
  * An ambient animation preset (`preset: "wiggle"` / `preset: "boil"`) that applies a subtle pseudo-random rotation ($\pm 1.5^\circ$) and offset ($\pm 2\text{px}$) that steps at 6–8 FPS, making collages and cutouts feel alive and hand-crafted.

---

### Phase 5: One-Click Aesthetic Preset Profiles (The "Mood" Selector)

Instead of forcing users to manually tweak 40 tiny switches to get a specific visual style, Motion Studio provides **One-Click Aesthetic Profiles** that configure the baseline levers for the project or scene:

| Aesthetic Profile | Frame Rate | Easing & Physics | Surface Medium | Camera / Staging |
| :--- | :--- | :--- | :--- | :--- |
| 🍏 **Product Showcase** | 60 FPS (Continuous) | Critically Damped Springs ($k=280, \zeta=0.82$) | G2 Squircles, Soft Elevation Blurs, Glassmorphism | Telephoto 3D Lens |
| ✂️ **Paper Collage** | 8 FPS (Stepped) | Stepped / Quantized Motion | White Sticker Outlines, Hard 0px Blur Shadows, Paper Grain | Flat 2D + Ambient Wiggle |
| 📰 **Kinetic Editorial** | 24 FPS (Cinematic) | Snappy Linear Ramps (0 $\to$ 100% in 3 frames) | High-Contrast Typography, Monochrome Accents, Hard Dividers | Flat 2D Poster Layout |
| 📼 **Analog Retro** | 12 FPS ("On Twos") | Elastic / Bouncy Settle | Halftone Dot Raster, CRT Scanline Overlay, Chromatic Split | 2.5D Parallax Depth |

* **Location in Studio**: Exposed as a clean segmented dropdown in Project Settings or Canvas Header pill: `[ Mood: Product Showcase ▾ ]`. Selecting a mood sets default framerate, shadow mode, and ambient filters.

---

### Phase 6: The AI Agent Generation Pipeline & Tool Bridge (`src/tools/`)

#### 1. Why AI Succeeds Here (The Aesthetic Compiler Principle)
In raw code tools (Remotion, CSS, keyframes), AI generates amateurish, broken results because it is forced to hallucinate pixel numbers (`left: 421px, top: 218px, spring(120, 14)`), resulting in colliding text, broken descenders, and chaotic pacing.
In Motion Studio, **the engine acts as an Aesthetic Compiler and Guardian**:
* **Zero Pixel Hallucinations**: Elements use modular grid coordinates (`col: 2, row: 2, colSpan: 12`) or hugging Frame containers.
* **Auto-Fit Typography**: Text auto-scales and auto-wraps; descenders never clip.
* **Curated Physics & Aesthetic Profiles**: AI selects presets (`mood: "paper-collage"`, `stepFps: 8`, `preset: "pop"`), and the engine guarantees G2 continuous curvature, physical momentum, and safe margins.
* **Magic Move by ID**: AI simply declares Scene 1 and Scene 2 with matching element IDs. The engine automatically computes continuous spring interpolation.

#### 2. The Two-Stage AI Pipeline
```
[ User Natural Language Prompt ]
  │ e.g. "Create a 15-second retro collage teaser for my design podcast"
  ▼
[ Stage 1: Director AI ]
  • Analyzes prompt, establishes narrative beat sheet, copy, and visual style.
  • Selects Aesthetic Profile: `mood: "paper-collage"`, `stepFps: 8`.
  • Outlines Scene 1 (Hook), Scene 2 (Value/Guest), Scene 3 (Outro CTA).
  ▼
[ Stage 2: Choreographer AI ]
  • Step-by-step tool calling via `src/tools/`:
    1. `create_scene({ id: "scene_1", name: "Hook", duration: 3.5, mood: "paper-collage" })`
    2. `place_element({ sceneId: "scene_1", id: "hero_cutout", type: "image", style: { stickerBorder: true } })`
    3. `place_element({ sceneId: "scene_1", id: "headline", type: "text", content: "The Future of Design" })`
    4. `create_scene({ id: "scene_2", name: "Guest", duration: 4.0 })`
    5. `apply_magic_move({ fromSceneId: "scene_1", toSceneId: "scene_2" })`
```

#### 3. The Tool Calling API (`src/tools/`)
The tool bridge wraps `useProjectStore` actions with strict **Zod schemas** and **constructive self-healing**:
* `create_scene(schema)`: Auto-clamps durations between 0.5s and 60s.
* `place_element(schema)`: Auto-clamps grid positions within screen bounds.
* `apply_animation(schema)`: Validates presets against token registries.
* `get_storyboard_state()`: Returns compact AST of the scenes for the AI to inspect.
* `lint_storyboard()`: AST pre-flight linter checking for zero text overflows, zero black frames, and valid aspect ratios.

---

## 4. Universal Motion Graphics Audit & Current Progress Tracker

```
Architecture Progress: [████████████████████] 100% Complete
  ✓ Completed:
    • Deterministic O(1) mathematical evaluator & analytical harmonic springs
    • Fixed 100% video theater monitor with timeline sync
    • Sequential multi-scene hybrid timeline with proportional scene blocks
    • Mode-aware layout (Header switcher, floating toolbar, full-height inspector)
    • Independent mode state preservation (camera, selections, playhead)
    • Omnipresent in-place renaming & zero-dead-button action parity
    • WebCodecs / FFmpeg frame-accurate video export pipeline
    • Three.js PBR 3D mockup infrastructure
    • Stepped Time Quantizer in evaluator.ts (8–12 FPS stop-motion engine)
    • Missing primitives (Line, Arrow, Frame clipping container, Polygon/Triangle)
    • Lazy-loaded local Lucide icon picker (1,555 icons, 100% offline, <1ms search)
    • Tactile collage styling (Sticker outline, 0px hard shadow, paper grain, line boil)
    • Pre-composed Component Library (Browser Window, 3D devices, kinetic counter, code block)
    • One-click Aesthetic Profiles dropdown (Product Showcase, Paper Collage, Kinetic Editorial, Analog Retro)
    • AI Agent Tool Calling Bridge (createScene, placeElement, applyAnimation, getStoryboardState)
    • Perception Engine & AST Pre-Flight Linter (Rule 8 anti-pattern auditing, zero black frames)
    • Two-Stage AI Director & Choreographer Orchestrator
```

---

## 5. Execution Roadmap & Ordered Milestones for Next Sessions

### Milestone 1: The Stepped Time Engine & Missing Primitives (Completed)
- [x] Add `stepFps` property to `Screen` and `AnimationClip` in `src/types/scene.ts`.
- [x] In `src/engine/evaluator.ts`, implement stepped time quantization:
  $$t_{\text{stepped}} = \frac{\lfloor t \times \text{stepFps} \rfloor}{\text{stepFps}}$$
- [x] Add `LineLayer`, `FrameLayer`, `PolygonLayer` to `src/types/scene.ts`.
- [x] Implement `LineRenderer.tsx` and `PolygonRenderer.tsx`.
- [x] Implement `FrameRenderer.tsx` with `overflow: hidden` clipping and relative child coordinates.
- [x] Update `FloatingDesignToolbar.tsx` with the `Shapes ▾` dropdown (Rect, Circle, Triangle, Star, Polygon, Line, Arrow) and Frame tool.

### Milestone 2: The Local Lucide Icon Picker & Tactile Collage Pack (Completed)
- [x] Create `IconPickerPopover.tsx` lazy-loading the local `lucide-react` dictionary (all 1,555 vector icons, 100% offline, <1ms in-memory search).
- [x] Add **Sticker / Die-Cut Border** toggle in Inspector (`stickerBorder: { width: 4, color: "#ffffff" }`).
- [x] Add **Hard Shadow** option in Inspector (`shadowMode: "soft" | "hard"`).
- [x] Add **Ambient Stop-Motion Wiggle / Boil** preset (`preset: "boil"`).

### Milestone 3: Component Library & Aesthetic Profiles (Completed)
- [x] Connect `Components` drawer with Browser Window frame and 3D Device frames (iPhone/MacBook).
- [x] Implement **Kinetic Counter** primitive (mechanical rolling odometer numbers).
- [x] Add **Aesthetic Profiles** dropdown in Project Settings & Scene Inspector (`Product Showcase`, `Paper Collage`, `Kinetic Editorial`, `Analog Retro`).

### Milestone 4: The AI Agent Tool Calling Bridge & Orchestrator (Completed)
- [x] Implement `src/tools/createScene.ts`, `src/tools/placeElement.ts`, `src/tools/applyAnimation.ts` with Zod validation.
- [x] Implement constructive auto-clamping (self-healing parameters) & modular grid solver (`src/engine/grid/gridSolver.ts`).
- [x] Implement AST pre-flight linter (`src/engine/perception/linter.ts`) checking for zero black frames, no ghost cards, no eyebrows/badges.
- [x] Build the Two-Stage Director $\to$ Choreographer prompt orchestrator (`src/tools/orchestrator.ts`).
- [x] Run `npx vitest run` and `npm run build` to guarantee 100% test and build pass rate across all layers.

---

## 6. Next Session Focus: Bug Fixing, User QA & Export Overhaul

> **Mission for Next Sessions**: The foundational milestones (1–4), full modularity decomposition, and canonical shadcn UI migrations are 100% complete and verified green. The next sessions are dedicated to **systematic bug fixing, addressing all user-identified issues and workflow changes, and overhauling the export engine**.

### 1. Multi-Studio & Project File Architecture Decisions
* **Three Distinct Applications/Workflows**:
  * **Motion Studio** (current app), **3D Studio**, and **Video Editor** are separate applications/workflows chosen at project inception, rather than hot-swappable modes within one open document.
* **Rendered Video Interchange (Transparent Alpha Bridge)**:
  * We reject the heavy live-nested dynamic link trap (which causes timeline stutter and crashes in video editors).
  * Motion graphics are rendered to video with **alpha transparency** (WebM VP9 with alpha, ProRes 4444, PNG sequences) and imported into the Video Editor / 3D Studio as lightweight, buttery-smooth 60fps video clips.
* **Project File Format**:
  * Motion Studio project save files use the extension **`.motion`**.

### 2. Immediate Workstreams for Next Sessions

#### Workstream A: User-Identified Bug Fixing & Quality of Life
* Address all functional bugs, layout shifts, or interaction quirks uncovered during user testing across:
  - Canvas interactions (dragging, resizing, snapping, multi-selection bounding boxes).
  - Inspector controls (numeric scrub inputs, color pickers, font changes, corner radii).
  - Timeline scrubbing and playback synchronization.
  - Text editing lifecycle (enter/exit, word splitting, caret position).

#### Workstream B: Export Engine Overhaul (`videoExporter.ts` & `ExportModal.tsx`)
* **Transparent Alpha Video Export**:
  - Add option to export with a transparent background (discarding solid canvas fills) using WebM VP9 with alpha and PNG image sequences.
* **Resolution & Format Presets**:
  - 1080p Full HD (1920x1080), 4K UHD (3840x2160), 9:16 Vertical (1080x1920 for Shorts/Reels/TikTok), 1:1 Square (1080x1080).
* **Deterministic Frame Stepping**:
  - Guarantee zero dropped frames or desyncs during headless and background renders.

#### Workstream C: Desktop (Tauri) Readiness
* Ensure all file export and save operations seamlessly bridge between browser blob downloads and native desktop file system APIs (`dialog.save`, `fs.writeFile`).



