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

## 3. UI/UX Workflow & Key Modes

The application UI mirrors Jitter's clean, dark-mode design with two distinct operational modes:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  [Logo]   Project: Untitled    [ Design | Animate ]               [ AI Assistant ✨ ]  [ Export ] │
├───────────────┬────────────────────────────────────────────────────────┬───────────────┤
│ LAYERS &      │                      CANVAS                            │ INSPECTOR     │
│ SCREENS       │                                                        │               │
│               │   ┌────────────────────────────────────────────────┐   │ [Design Mode] │
│ ▾ Screen 1    │   │                                                │   │ Typography    │
│   ▾ Group 1   │   │     ┌────────────────────────────────────┐     │   │ Colors        │
│     Chunk 1   │   │     │ [Hey Team,]                        │     │   │ Flex Layout   │
│     Chunk 2   │   │     │ [I've got something big for you,]  │     │   │ Auto-Fit Box  │
│     Chunk 3   │   │     │ [wanna see what it is?]            │     │   │               │
│   ▸ Card Shape│   │     └────────────────────────────────────┘     │   │ [Split Tool]  │
│               │   │                                                │   │ - By Chunks   │
│               │   └────────────────────────────────────────────────┘   │ - By Words    │
├───────────────┴────────────────────────────────────────────────────────┴───────────────┤
│ TIMELINE (Animate Mode Only)                                                           │
│ 00:00:00  [Play ▶]  [Loop 🔁]  Zoom [---|---]                                         │
│ ────────────────────────────────────────────────────────────────────────────────────── │
│ ▾ Group 1 🔗 Auto-link [====================================================]          │
│     Chunk 1            [======] (Pop In)                                               │
│     Chunk 2                   [======] (Fade Up)                                       │
│     Chunk 3                          [======] (Blur In)                                │
│   Card Shape 📐 Auto-fit[===================================================]          │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### A. Design Mode (Static Resting State)
* Focuses purely on visual composition (the 100% completed screen).
* Arrange layout, typography, padding, borders, shadows, and colors.
* No timeline is displayed. Elements are static.

### B. Animate Mode (Motion & Timing)
* The bottom timeline panel slides up with timecode, playhead scrubber, and track blocks.
* The right sidebar switches to animation parameters:
  * In / Out / Emphasis preset dropdowns.
  * Easing curves (`Smooth`, `Bouncy / Elastic`, `Overshoot`, `Snappy`).
  * Start offset, duration, and stagger delay.

---

## 4. Special Quality-of-Life (QoL) Features

These are the primary differentiators of Motion Studio:

### 1. One-Click Element Splitting & Auto-Grouping
* **Problem in traditional tools**: Splitting a sentence into 3 parts breaks line wrapping, ruins alignment, and forces manual positioning of 3 separate text boxes.
* **Our Solution**:
  1. Highlight text in a paragraph (or click "Split into Chunks" / "Split into Words").
  2. The original text element is automatically converted into a `<Group>` flex container.
  3. The text inside becomes individual child `<Chunk>` elements.
  4. The layout, line wrap, and visual positioning remain 100% identical.

### 2. Auto-Linking & Cascade Staggers (🔗)
* When elements are grouped or split, **Auto-Link** is enabled by default on the timeline track:
  * Adjusting Chunk 1's duration automatically ripples Chunk 2 and Chunk 3 forward.
  * Setting a preset on the parent group cascades down to all children with a configurable stagger interval (e.g. 0.15s per chunk).
  * Auto-Link can be toggled off if independent timing is desired.

### 3. Auto-Fit Reactive Backgrounds
* When a container or background shape wraps chunks that animate in sequentially, enabling `autoFit: true` uses FLIP / layout animations.
* As Chunk 1 enters $\to$ background fits Chunk 1. As Chunk 2 enters $\to$ background expands smoothly. As Chunk 3 enters $\to$ background reaches full size.

---

## 5. Technology Stack & Packaging

* **Desktop Application**: **Tauri v2** (Rust shell wrapping web frontend; lightweight binary, low memory footprint, handles local OS file access and bundles native FFmpeg).
* **Frontend UI**: **React 19 + Vite** + **shadcn/ui** components + **Tailwind CSS** + **Lucide Icons** + **Radix UI** primitives.
* **Canvas & Playhead**: `@remotion/player` (provides frame-accurate scrubber, play/pause, loop, timecode, and zoom controls out of the box).
* **Preset Library**: Composable animation recipes based on Jitter's 8 atomic properties, inspired by Animate.css and AnimXYZ.
* **Video Rendering Pipeline**: **In-Webview Virtual Clock + Bundled Native FFmpeg Sidecar** (Tauri pipes raw RGBA frames from offscreen Chromium webview directly to bundled `ffmpeg.exe` via stdin; 100% offline, zero separate Puppeteer/Chromium bloat).
* **AI Interface (MCP)**: Node.js/TypeScript or Rust MCP server exposing tool calls for external AI agents.


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
    "duration": 5.0
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

Refer to the dedicated specification files in `docs/` for complete implementation details:
* [docs/HANDOFF.md](file:///c:/Users/Sam/Documents/CODE/MOTION-STUDIO/docs/HANDOFF.md) - Session transition briefing and immediate starting instructions for Phase 1.
* [docs/IMPLEMENTATION_PHASES.md](file:///c:/Users/Sam/Documents/CODE/MOTION-STUDIO/docs/IMPLEMENTATION_PHASES.md) - Detailed 7-phase engineering roadmap with tasks and milestone deliverables.
* [docs/UI_PANELS_SPEC.md](file:///c:/Users/Sam/Documents/CODE/MOTION-STUDIO/docs/UI_PANELS_SPEC.md) - Specifications for all screens, panels, floating toolbars, timeline, and the `Ctrl+K` AI Command Bar.
* [docs/RIGHT_SIDEBAR_SPEC.md](file:///c:/Users/Sam/Documents/CODE/MOTION-STUDIO/docs/RIGHT_SIDEBAR_SPEC.md) - Inspector breakdown for Design & Animate modes, matching the screenshot layouts with full HTML/CSS depth.
* [docs/DEFAULT_BEHAVIORS_AND_INTERACTIONS.md](file:///c:/Users/Sam/Documents/CODE/MOTION-STUDIO/docs/DEFAULT_BEHAVIORS_AND_INTERACTIONS.md) - Zero-friction defaults: text splitting, auto-grouping, auto-link cascade, FLIP auto-fit, animation copy-paste, smart magnetic snapping, and transactional undo/redo.
* [docs/CONTEXT_MENU_MATRIX.md](file:///c:/Users/Sam/Documents/CODE/MOTION-STUDIO/docs/CONTEXT_MENU_MATRIX.md) - Clean separation of concerns between Right-Click context menus and the Right Sidebar.
* [docs/PROJECT_SPEC_AND_STORAGE.md](file:///c:/Users/Sam/Documents/CODE/MOTION-STUDIO/docs/PROJECT_SPEC_AND_STORAGE.md) - `.motion` bundle architecture, font loading (Google Fonts + OS + custom), offline FFmpeg export, and adaptive canvas performance.


---

## 9. Rules for Agents Working in this Repository
1. **Always preserve state determinism**: Time $t$ must always render the exact same frame. Never use non-deterministic timers (`Date.now()`) inside the render loop.
2. **Respect the Single Source of Truth**: Any GUI modification must update `scene.json`, and any MCP tool call must update `scene.json`. Do not introduce divergent state.
3. **Keep Presets Composable**: Avoid writing monolithic hardcoded CSS files for every animation. Build upon the 8 atomic actions and easing curves.
4. **Follow the Design Language**: Use Jitter's dark-mode color palette (zinc-900 backgrounds, zinc-800 cards, crisp typography, clean accent highlights) with **shadcn/ui** components.
5. **Continuous Documentation Synchronization**: Whenever new features, architectural decisions, UI panels, default behaviors, or data models are introduced or modified, the AI agent must immediately update `AGENTS.md` and the relevant specification documents in `docs/`. Documentation must never lag behind the implementation.

