# AGENTS.MD: Motion Studio (AI-Native Motion Graphics)

Welcome to **Motion Studio**. This document is the primary briefing file for AI agents working in this repository. Read this file carefully before taking any action.

---

## 1. Project Overview & Vision

**Motion Studio** is an AI-orchestrated, desktop-packaged motion graphics application inspired by **Jitter.video**, but built specifically for an AI-human co-creation workflow.

### The Core Philosophy: "AI Scaffolding + Human Taste"
* **AI does 0% to 80% (The Grunt Work)**: Reading copy/scripts, structuring visual hierarchy, breaking paragraphs into semantic chunks, choosing appropriate entrance/exit animation presets, aligning layout containers, cascading stagger timings, and keyframing layers.
* **Human does 80% to 100% (The Taste & Polish)**: Opening a sleek, lightweight GUI to scrub the timeline, nudge timings by 0.1s, swap a preset from a dropdown, adjust a color or font, and add artistic nuance.
* **Single Source of Truth**: Both the AI (via Model Context Protocol - MCP) and the Human (via the Web/Tauri GUI) read and write to the exact same declarative project state (`scene.json`).

---

## 2. The Architectural Secret (Don't Reinvent the Wheel)

We do **not** write a low-level graphics or physics engine from scratch. 90% of the required technology already exists in modern web standards:

### Jitter's Combinatorial Architecture
In Jitter.video, there are not hundreds of individual physics algorithms. Under the hood, Jitter presets are built on **8 atomic properties**:
1. `Move` ($X, Y$ position)
2. `Scale` (Uniform or $X, Y$)
3. `Rotate` (2D angle or 3D tilt $X, Y$)
4. `Opacity` (0% to 100%)
5. `Blur` (Filter blur radius)
6. `Color / Fill` (Hex / RGB / Opacity)
7. `Shadow` (Offset, blur, color)
8. `Mask / Clip` (Bounds / Inset clip-path)

Every "preset" (e.g. *Pop In*, *Slide Up*, *Mask Reveal*, *Drop In*, *Pulse*, *3D Flip*) is simply a **declarative JSON recipe** combining 1 to 3 atomic properties with an easing curve (`smooth`, `elastic/bouncy`, `overshoot`, `linear`).

### Web Layout as a Superpower
* **HTML/Tailwind handles all typography and layout**: Font shaping, multi-line text wrapping, flexbox alignment, and responsive scaling are handled natively by the browser.
* **Layout Animations (FLIP)**: In After Effects, getting a background box to resize as text reveals requires complex `sourceRectAtTime()` expressions. In web motion (using Framer Motion / Motion.dev or CSS `fit-content`), the background box automatically morphs and expands smoothly on the GPU as child chunks appear!
* **Zero Audio Clutter**: Motion Studio focuses 100% on motion graphics visuals and design elegance. Audio mixing and sound design are intentionally delegated to dedicated NLEs.

### The .motion Project Bundle Architecture
* **Self-Contained Portability**: Projects are saved as `.motion` zip archives containing `scene.json` (the AST), `components.json` (custom component templates), and an `assets/` directory (imported images, videos, and embedded `.woff2` custom fonts).
* **Continuous Auto-Save**: State changes are continuously persisted to disk without dirty-state anxiety.


---

## 3. UI/UX Workflow: The 4 Operational Studios

Motion Studio unifies modern motion storytelling into **4 Specialized Operational Studios**:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  [Logo]   Project: Untitled   [ DESIGN | MOTION | 3D | EDITOR ]   [Action]   [Export 🚀] │
├───────────────┬────────────────────────────────────────────────────────┬───────────────┤
│ LEFT SIDEBAR  │                      CENTER VIEWPORT                   │ RIGHT SIDEBAR │
│ (Mode-Adaptive│  - DESIGN: 2D Infinite Pasteboard + Artboard Camera    │ (Contextual   │
│  Tree/Assets) │  - MOTION: 75% Camera Frustum Matte + Motion Trajectory│  Inspectors)  │
│               │  - 3D: Three.js Spatial Viewport + Orbit Controls      │               │
│               │  - EDITOR: Master Program Monitor + Safe Guides        │               │
├───────────────┴────────────────────────────────────────────────────────┴───────────────┤
│ BOTTOM SEQUENCER / TIMELINE                                                            │
│ (DESIGN: Hidden | MOTION: Shot Dope Sheet | 3D: Camera Track | EDITOR: Multi-Track NLE)│
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### A. DESIGN Studio ("Vector Staging & Kinetic Motion Graphics Engine")
* **Video-Native Motion Graphics Staging**: Purged of all static Web/Figma UI baggage (no CSS Flexbox Auto Layout, no DOM text-flow auto-width/auto-height, no CSS string injections).
* **Kinetic Typography Engine**: Point Text (unconstrained single/multi-line anchored at invariant pivot) vs. Area Box (fixed boundary wrapping box); typography pass order (`fillOverStroke` vs. `strokeOverFill` for bold broadcast subtitles); tracking/letter-spacing, leading/line-height, vertical alignment (`top`, `middle`, `bottom`), and uppercase/lowercase transforms.
* **9-Point Transform Pivot Matrix**: Interactive $3 \times 3$ anchor grid (`pivotX`, `pivotY` $\in \{0, 0.5, 1\}$) driving invariant spatial centers for scaling and rotations; Scale X% / Scale Y% with aspect lock; Proportional dimension scrubbing ($W, H$).
* **Vector Path & Shape Engine**: SVG Trim Paths (`trimStart`, `trimEnd`, `trimOffset` from 0% to 100%) for radial donut rings and animated vector strokes; Apple G2 Squircle continuous curvature geometry.
* **Polar Coordinate Drop Shadows**: Video-grade directional lighting controls (Angle $\angle^\circ$, Distance $d$, Blur $\sigma$, Spread, Color, Opacity) mathematically projected to $dx = d \cdot \cos(\theta), dy = d \cdot \sin(\theta)$.
* **Smart Primitives & Media Staging**: Dedicated video playback inspectors (in-point, out-point, loop, audio volume, speed) and kinetic odometer/counter inspectors (start/end value, prefix, suffix, decimals).
* **Spatial Pre-comp Containers**: Absolute spatial grouping and clipping containers replacing CSS auto-layout flexboxes.
* **Video Safe Zones**: Action Safe 90%, Title Safe 80%, 9:16 Social UI overlays (TikTok / Reels / Shorts safe zones).
* **Pasteboard ("Green Room")**: Infinite canvas workspace for staging off-screen assets and graphic elements.
* Primary action: **`Send to Motion 🎬`**.

### B. MOTION Studio ("Kinetic Motion Choreographer")
* 75% dark camera matte frames the artboard 1:1.
* In / Out / Emphasis presets with **Snappy Quintic Curve** (`0.16, 1, 0.3, 1`) and **Golden Spring** ($\zeta=0.72, \omega_n=14$).
* Timeline panel slides up with transient clock, work area loop brackets (`B`/`N`), and ripple drag.
* Primary actions: **`Send to 3D 🧊`** and **`Send to Editor 🎞️`**.

### C. 3D Studio ("Spatial Device Mockups & Staging")
* High-fidelity PBR rendering of tech hardware (iPhone 16 Pro, MacBook Pro, Smart Card).
* **Screen-as-Texture Projection**: Live 2D screen or video texture projected dynamically onto 3D screen UVs.
* 5 Declarative Camera Presets: `orbit360`, `isometric`, `dollyIn`, `hover`, and `cardFlip`.
* Primary actions: **`Send to Editor 🎞️`** and **`Send to Motion 🎬`** (2D HUD annotations).

### D. EDITOR Studio ("Multi-Track Video NLE & Master Sequencer")
* Multi-track timeline ($V_1\text{--}V_3$, $A_1\text{--}A_3$) with audio waveforms.
* **Razor Cut Tool (`S`)**: Instant sub-frame slicing of video/graphic clips.
* **Kinetic Captions**: Word-level Whisper transcript clustering into phrase cards (`Spotlight`, `Hormozi`, `Cascade`, `Dynamic Island`).
* Primary action: **`Export Video 🚀`**.

---

## 4. Special Quality-of-Life (QoL) Features

These are the primary differentiators of Motion Studio:

### 1. Precision Selection Splitting (2-Element Paradigm)
* **The Paradigm**: Highlight any portion of an element on the canvas or in text, right-click, and click **Split** (`Ctrl+Shift+S`).
* **The Result**: The element is automatically transformed into a `<Group>` flex container holding **exactly two elements**:
  1. **Element 1**: Exactly what was selected.
  2. **Element 2**: Everything that was not selected (the remainder).
* 1-click artificial split buttons are intentionally banished in favor of direct user-directed selection.

### 2. Universal Reactive State Dependency & Linking System (🔗)
* **Driver-Driven Engine (`dependencyEngine.ts`)**: Any element (`text`, `chunk`, `shape`, `group`, `image`) can be linked to another element so that state changes dynamically propagate across layers in a cycle-free DAG.
* **5 Core Linking Modes**:
  1. **📍 Spatial Pin (`pin`)**: Locks a target anchor (`top-left`, `center`, `top-right`, `bottom-left`, etc.) to a driver anchor with configurable $[dx, dy]$ offset.
  2. **📐 Size Hug (`hug`)**: Automatically resizes target dimensions to envelope driver bounds plus customizable padding ($[padX, padY]$ or $[T, R, B, L]$):
     - **Active-Token Bounding**: In typewriter and word-by-word reveal animations, the bounding box continuously measures active characters/words at time $t$.
     - **Tail Anchor Invariance (`hugAnchor`)**: Locks a specified anchor point (e.g., `bottom-left` for messaging tails) in world space so that $(x, y+h)$ remains strictly invariant while the bubble dynamically inflates upward and outward.
     - **Closed-Form Spring Expansion (`expansionPhysics: 'spring'`)**: Applies deterministic damped harmonic spring easing ($\zeta=0.72, \omega_n=220$) to container expansion without frame accumulation or state leakage.
     - **Dimension Clamps**: Configurable `minWidth`, `minHeight`, `maxWidth`, `maxHeight` boundaries.
  3. **🔗 Property Match (`match`)**: Drives any target property from a driver property ($\text{Target} = \text{Driver} \times \text{multiplier} + \text{offset}$), with optional `clampToTrack: true` for progress bar leading-edge indicator badges.
  4. **🎚️ Range Remap (`remap`)**: Maps driver range $[s_{\min}, s_{\max}] \to$ target range $[t_{\min}, t_{\max}]$ with easing curves.
  5. **🌊 Fluid Lag / Inertia (`lag`)**: Organic trailing follower tracking driver state with temporal delay or spring inertia.
* **Visual Canvas Indicators (`BindingConnectionOverlay.tsx`)**: Glowing cyan dashed bezier curves with relationship badges connect driver and driven elements on the canvas.

### 3. Auto-Linking & Cascade Staggers (🔗)
* When elements are grouped or split, **Auto-Link** is enabled by default on the timeline track:
  * Adjusting Chunk 1's duration automatically ripples Chunk 2 forward.
  * Setting a preset on the parent group cascades down to all children with a configurable stagger interval (e.g. 0.15s per chunk).

### 4. Auto-Fit Reactive Backgrounds
* When a container or background shape wraps chunks that animate in sequentially, enabling `autoFit: true` uses FLIP / layout animations.
* As Chunk 1 enters $\to$ background fits Chunk 1. As Chunk 2 enters $\to$ background expands smoothly.

### 5. Autonomous Agent Perception & Multi-Frame Verification
* **Multi-Frame Contact Sheet (`planSheet` / `planSheetSizes`)**: Merges up to 12 chronological preview frames into a single composite PNG image matching multimodal LLM token patch budgets ($2576 \times 1456$, exactly $92 \times 52$ patches of 28px). Delivers a **91.6% vision token reduction** with high-contrast dual-pass timecode badges (`01s15f`).
* **Scene Structural Linter (`lintScreen`)**: Sub-2ms zero-GPU static AST validator running 8 diagnostic passes (`black-frames`, `no-visuals`, `never-visible`, `zero-duration`, `transparent`, `source-error`, `broken-binding`, `stagger-collision`).

### 6. Scoped Video & 3D Mockup Systems
* **Scoped Video Engine (`videoDecoder.ts` & `razorSplit.ts`)**: Keyframe indexing ($O(\log K)$ floor PTS lookup), sliding-window tile caching (`FrameCache`), rapid scrub (< 4ms) vs exact settle, sub-frame razor splitting (`S`), RMS audio waveform generation, and Whisper phrase clustering for kinetic captions (`Spotlight`, `Hormozi`, `Cascade`, `Dynamic Island`).
* **Scoped 3D Mockup Studio (`ThreeStage.ts` & `ThreeCameraPresets.ts`)**: Three.js WebGL spatial stage isolated from PixiJS context via `ThreeRendererPool` ($\le 3$ active contexts), OLED physical screen materials with emissive self-illumination (0.85) and clearcoat glass reflections, dynamic Screen-as-Texture UV projection, and 5 declarative camera presets (`orbit360`, `isometric`, `dollyIn`, `hover`, `cardFlip`).

---

## 5. Technology Stack & Packaging (Revised Architecture)

Refer to [Revised_plan.md](file:///c:/Users/Sam/Documents/CODE/MOTION-STUDIO/Revised_plan.md) for the detailed system architecture.

* **Desktop Application**: **Tauri v2** (Rust shell wrapping web frontend; lightweight binary, low memory footprint, handles local OS file access and bundles native FFmpeg sidecar).
* **Frontend UI & Chrome**: **React 19 + Vite** + **shadcn/ui** components + **Tailwind CSS** + **Lucide Icons** + **Radix UI** primitives + **Zustand**.
* **UI/UX Architecture ("Creative Desktop Tool" Standard)**:
  - **Light Mode First-Class Default**: High-readability neutral slate palette (`#0f172a` primary, `#e2e8f0` borders, `#f8fafc` surfaces, `#f1f5f9` card backgrounds). Zero purple/bluish/indigo SaaS accents. Neutral dark mode available via top bar toggle.
  - **Consistent Corner Rounding Hierarchy**: `rounded-[20px]` (`1.25rem`) for docks, floating toolbars, and floating zoom widgets; `rounded-[12px]` for modular cards; `rounded-[8px]` for inputs, micro-buttons, and badges.
  - **40px Clean Header (`TopNavBar.tsx`)**: Minimal wordmark "CHOREO", inline project rename, Undo/Redo, centered `DESIGN | MOTION` toggle, zoom pill, Sun/Moon theme toggle, AI trigger (`Cmd+K`), and quiet neutral `Export` button. "Send to Motion" and informal emojis completely purged.
  - **Comfortable Floating Toolbar (`FloatingToolbar.tsx`)**: 44px tall pill (`h-11`, `rounded-[20px]`) with labeled buttons (`Select`, `Hand`, `Text` + dropdown, `Rectangle` + dropdown, `Media` + dropdown, `Components`). Unobstructed canvas workflow—floating editing pills over canvas selections are banished; all properties live cleanly in the right inspector.
  - **Left Sidebar Screens Manager (`LeftSidebar.tsx`)**: Prominent dedicated **Screens** manager at top (Screen 1, Screen 2...) with duration pills and `+ Add` button; Layers outliner below with Artboard vs Pasteboard separation.
  - **High-Density Micro-Components (`src/components/ui/`)**: `ScrubbableInput` (pointer lock horizontal dragging, Shift 10x, Alt 0.1x, inline math parser `1080/2`), `PropertyRow`, `CompactSegmentedControl`, `PopoverColorPicker`, `MinimalSection`.
  - **Decomposed Modular Inspector (`src/components/inspector/design/`)**: Modular components (`CanvasSettingsCard`, `MultiSelectionCard`, `TransformSection`, `TypographySection`, `AppearanceSection`, `EffectsSection`, `MediaSection`, `CounterSection`) replacing monolithic inspector files. All inspectors respond dynamically to theme tokens.
* **Rendering Engine (The Canvas)**: **PixiJS v8** (WebGL / WebGPU hardware-accelerated 2D/3D graphics, real-time shaders, bloom, displacement, glow, async GPU pixel buffer extraction with readback fences, and deterministic `seek(t)` state updates).
* **Spatial & Viewport Matrix**: **`ViewportMatrix.ts`** (Pure 2D Affine transformation engine providing forward and inverse coordinate projections between world, viewport, and screen spaces with zoom-invariant handle scaling and snapping).
* **Figma Interaction Layer**: **`TransformBox.tsx`** (Invariant world anchor $A_{\text{world}}$, local delta unprojection $R(-\theta)$, window pointer capture, dual-mode text scaling, rotated cursor tracking) + **`CanvasViewport.tsx`** (LMB rubberband marquee multi-selection with synthetic post-drag click suppression, real-time coordinate tracking, and automatic tool reset) + **`BindingConnectionOverlay.tsx`** (live visual dashed bezier connection curves with relationship badges) + Figma-style inline `<textarea>` overlay for double-click text editing.
* **Reactive Dependency Engine**: **`dependencyEngine.ts`** (DAG topological sort with cycle breaking, 9-point anchor solvers, 5 linking modes [`pin`, `hug`, `match`, `remap`, `lag`], deterministic `resolveSceneBindings` evaluation in `evaluator.ts`).
* **Perception & Linter Engine**: **`contactSheet.ts` + `linter.ts` + `timestampStamper.ts`** (12-cell patch-budgeted contact sheet generator, dual-pass contrast timecode badges, and 8-rule static AST linter).
* **Scoped Video Engine**: **`videoDecoder.ts` + `audioWaveformExtractor.ts` + `razorSplit.ts` + `kineticCaptions.ts`** (Keyframe indexing, tile cache atlas, playhead razor cut `S`, RMS waveforms, and Whisper subtitle cards).
* **Scoped 3D Mockup Engine**: **`ThreeStage.ts` + `ThreeCameraPresets.ts` + `ScreenTextureProjector.ts` + `ThreeRendererPool.ts`** (Procedural hardware models, 3-point studio lighting rig, OLED UV projection, 5 camera presets, and LRU context limiter $\le 3$).
* **Canvas Viewport**: **`pixi-viewport`** (Spacebar + drag pan, cursor-centered pinch/wheel zoom).
* **Animation & Timeline Engine**: **`AnimationClock.ts`** (High-performance pub/sub transient clock driving 60fps playhead movement and timecode readouts without VDOM re-render thrashing; immutable baseline snapshot ripple drag in `DraggableClip.tsx`) + **Theatre.js** (headless `@theatre/core` for deterministic background sequencing and sheet evaluation, decoupled from `@theatre/studio` with on-demand curve editor docking).
* **Motion Presets & Curves**: **`evaluator.ts` + `easings.ts`** (8 atomic properties, second-order damped harmonic spring solver $f_{\text{spring}}$, 360° polar coordinate slides with trigonometric projection, 10 kinetic physics presets, Snappy quintic curve `cubic-bezier(0.16, 1, 0.3, 1)`, Golden Spring profile $\zeta=0.72, \omega_n=14$, and unicode-safe `Intl.Segmenter` text splitting).
* **Video Rendering Pipeline**: **Deterministic Frame Stepper + Bundled Native FFmpeg Sidecar / WebCodecs Fallback** (Advances virtual clock frame-by-frame, extracts WebGL RGBA frame buffers via `pixiRegistry.ts`, and streams directly to `ffmpeg` stdin or client-side encoder; 100% offline, zero dropped frames).
* **AI Interface (MCP)**: Native Streamable HTTP server daemon on `127.0.0.1:3274/mcp` and CLI proxy with JSON Schema 2020-12 compliance and inline base64 contact sheets.


---

## 6. Declarative Data Model (`scene.json`)

The single source of truth format:

```json
{
  "version": "1.0",
  "settings": {
    "width": 1920,
    "height": 1080,
    "fps": 60,
    "duration": 5.0,
    "palette": ["#000000", "#ffffff", "#e8c547", "#f5f0e8", "#ef4444", "#34d399", "#60a5fa", "#a855f7"]
  },
  "screens": [
    {
      "id": "screen_1",
      "name": "Hook Scene",
      "duration": 5.0,
      "layers": [
        {
          "id": "group_hero",
          "type": "group",
          "layout": { "display": "flex", "flexDirection": "column", "gap": 12, "align": "center" },
          "autoFit": true,
          "style": { "backgroundColor": "#18181b", "padding": 32, "borderRadius": 24 },
          "children": [
            {
              "id": "chunk_1",
              "type": "text",
              "content": "Hey Team,",
              "style": { "fontSize": 72, "fontWeight": "800", "color": "#FFFFFF" },
              "animation": {
                "in": { "preset": "pop", "start": 0.0, "duration": 0.6, "easing": "bouncy" }
              }
            },
            {
              "id": "chunk_2",
              "type": "text",
              "content": "I've got something big for you all,",
              "style": { "fontSize": 72, "fontWeight": "800", "color": "#60A5FA" },
              "animation": {
                "in": { "preset": "slideUp", "start": 0.8, "duration": 0.6, "easing": "smooth" }
              }
            },
            {
              "id": "chunk_3",
              "type": "text",
              "content": "wanna see what it is?",
              "style": { "fontSize": 72, "fontWeight": "800", "color": "#FACC15" },
              "animation": {
                "in": { "preset": "blurIn", "start": 1.6, "duration": 0.8, "easing": "smooth" }
              }
            }
          ]
        }
      ]
    }
  ]
}
```

---

## 7. MCP Tools Specification (For AI Agents)

AI communicates with Motion Studio via the following MCP tools:
1. `get_project_state()`: Reads current `scene.json`.
2. `create_screen({ name, duration })`: Creates a new scene/screen.
3. `add_group({ screenId, layout, autoFit, style })`: Inserts a layout container.
4. `split_text_into_chunks({ textLayerId, chunks, preset, stagger })`: Performs semantic text splitting and auto-groups children with staggered timings.
5. `apply_preset({ layerId, presetName, easing, start, duration })`: Applies or updates an animation preset.
6. `render_preview_frame({ timeInSeconds })`: Returns a base64 snapshot image for visual inspection.
7. `export_video({ format, fps, filename })`: Triggers FFmpeg rendering pipeline.

---

## 8. Detailed Architectural Documentation

Refer to the primary architectural and implementation documents:
* [docs/HANDOFF.md](file:///c:/Users/Sam/Documents/CODE/MOTION-STUDIO/docs/HANDOFF.md) - Next Session Handoff Briefing & 8-Agent Deep Research Swarm Blueprint.
* [docs/DIFFUSION_STUDIO_ANALYSIS_AND_ADOPTIONS.md](file:///c:/Users/Sam/Documents/CODE/MOTION-STUDIO/docs/DIFFUSION_STUDIO_ANALYSIS_AND_ADOPTIONS.md) - Architectural Benchmark vs Diffusion Studio, Feature Adoptions, Scoped Video (WebCodecs) & 3D (Theatre.js/Three.js) Roadmap.
* [Revised_plan.md](file:///c:/Users/Sam/Documents/CODE/MOTION-STUDIO/Revised_plan.md) - System Architecture Documentation covering Tauri v2, PixiJS v8, `react-moveable` + `react-selecto`, `pixi-viewport`, Theatre.js, and deterministic FFmpeg rendering.
* [docs/IMPLEMENTATION_PLAN.md](file:///c:/Users/Sam/Documents/CODE/MOTION-STUDIO/docs/IMPLEMENTATION_PLAN.md) - Engineering Roadmap detailing all phases, milestones, and architectural verification steps.
* [docs/research/AGENT_PERCEPTION_AND_LINTER.md](file:///c:/Users/Sam/Documents/CODE/MOTION-STUDIO/docs/research/AGENT_PERCEPTION_AND_LINTER.md) - Autonomous AI Agent Perception, Multi-Frame Contact Sheets (`capture`), Scene Structural Linter (`check`), and Model Context Protocol (MCP) Blueprint.
* [docs/WORKFLOWS_AND_INTERACTIONS_MAP.md](file:///c:/Users/Sam/Documents/CODE/MOTION-STUDIO/docs/WORKFLOWS_AND_INTERACTIONS_MAP.md) - Comprehensive specification of all canvas interactions, screen format switcher, default states, and workflows.


---

## 9. Rules for Agents Working in this Repository
1. **Always preserve state determinism**: Time $t$ must always render the exact same frame. Never use non-deterministic timers (`Date.now()`) inside the render loop.
2. **Respect the Single Source of Truth**: Any GUI modification must update `scene.json`, and any MCP tool call must update `scene.json`. Do not introduce divergent state.
3. **Keep Presets Composable**: Avoid writing monolithic hardcoded CSS files for every animation. Build upon the 8 atomic actions and easing curves.
4. **Follow the Design Language**: Creative Desktop Tool standards—Light Mode first-class default with neutral slate surfaces, clean border contrasts, `rounded-[20px]` docks and `rounded-[12px]` cards, no loud SaaS gradients. Neutral dark mode available via top-bar toggle.
5. **Continuous Documentation Synchronization**: Whenever new features, architectural decisions, UI panels, default behaviors, or data models are introduced or modified, the AI agent must immediately update `AGENTS.md` and the relevant specification documents in `docs/`. Documentation must never lag behind the implementation.
6. **Implementation Plan Mirroring**: Any implementation plan or phased technical roadmap produced during development must always be saved and kept updated directly in `docs/IMPLEMENTATION_PLAN.md` with clear phase breakdowns and verification milestones.
7. **Continuous & Frequent Git Commits (Software Engineering Fundamentals)**:
   - **Commit Early & Often**: Never accumulate large backlogs of uncommitted code across multiple turns.
   - **Atomic Semantic Commits**: As soon as a logical unit of work passes verification (e.g. a feature phase, bugfix, refactor, or test suite addition), create an atomic commit with conventional commit format (`feat:`, `fix:`, `refactor:`, `test:`, `chore:`).
   - **Always Push to Remote**: After completing a task or milestone, immediately push your commits to GitHub (`git push origin <branch>`). Do not leave commits unpushed.
8. **Forensic Codebase Hygiene & Dead-Code Prevention**:
   - Never commit or leave temporary scratch scripts (e.g. `reproduce_*.js`, `verify_*.js`), debug logs, or root screenshot dumps on disk.
   - Run `npx fallow dead-code` to guarantee zero unused files, zero unreferenced dependencies, zero circular dependencies, and zero dead exports.

