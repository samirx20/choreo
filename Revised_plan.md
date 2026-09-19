# AI-Driven Motion Graphics Platform: System Architecture Documentation

## 1. System Overview
This document outlines the architecture for a pre-built, desktop-native, AI-assisted motion graphics application. The software provides a "Figma + Jitter" user experience, capable of producing high-fidelity, cinematic motion graphics. 

Because the application infrastructure is already established, this document serves to strictly define how the AI agent interacts with the existing system. The system is designed so the AI agent does the heavy lifting of scene generation and animation blocking, while the native engines handle performance, and the human user tweaks the results via the GUI.

## 2. Technology Stack
*   **Desktop Shell & Backend:** Tauri v2 (Rust backend)
*   **Application Chrome & State Management:** React + Tailwind CSS + Radix UI + Zustand
*   **Rendering Engine (The Canvas):** PixiJS (v8, WebGL/WebGPU)
*   **Figma Interaction Layer:** `react-moveable` (Handles, rotation, magnetic snapping) + `react-selecto` (Marquee multi-select)
*   **Canvas Viewport Navigation:** `pixi-viewport` (Figma-style spacebar pan, cursor-centered zoom)
*   **Animation & Timeline Engine:** Theatre.js (`@theatre/core` + `@theatre/studio`)
*   **Video Encoder:** FFmpeg (Bundled as a Tauri Sidecar)
*   **Agent Interface:** Declarative JSON (Scene Graph & Keyframe State)

## 3. Division of Labor: AI vs. Native Engines & Frameworks (CRITICAL)
The app is built with professional-grade open-source libraries. The AI agent and developers must **leverage the default capabilities** of these engines rather than attempting to recreate them via complex custom math or data structures. 

### A. What Theatre.js Handles Natively (Do Not Re-calculate):
*   **Smoothness & Interpolation:** The agent should **not** generate frame-by-frame data. Theatre.js natively calculates sub-pixel interpolation between keyframes. The agent only provides sparse, high-level keyframes.
*   **Bezier Mathematics:** The agent only needs to provide standard easing string definitions (e.g., specific cubic-bezier coordinates). Theatre.js handles the complex math to ensure buttery-smooth acceleration and deceleration.
*   **Playback Logic & Dope Sheet:** Scrubbing, pausing, playing, loop mechanics, and visual curve editing are entirely handled by Theatre.js.

### B. What PixiJS Handles Natively (Do Not Re-invent):
*   **Hardware Acceleration & Anti-Aliasing:** PixiJS naturally renders via WebGL/WebGPU at 60-120fps. The agent assumes maximum rendering smoothness by default.
*   **Transform Matrices:** Position, pivot, anchor, rotation, scale, and skew calculations executed directly on the GPU.
*   **Compositing & Shaders:** Blending modes and GPU shader effects (bloom, displacement, chromatic aberration, glassmorphism, blurs) are built into the rendering pipeline. The agent only acts as a toggle (e.g., `glassmorphism: true`).
*   **Pixel Extraction:** Direct, synchronous extraction of RGBA frame buffers via `app.renderer.extract.pixels()` for deterministic video encoding.

### C. What the Interaction Layer Handles Out-of-the-Box (`react-moveable` + `react-selecto` + `pixi-viewport`):
*   **Figma-Grade Bounding Boxes & Handles (`react-moveable`):** 8 corner and edge resize handles with live aspect-ratio preservation (`keepRatio={true}`), dedicated rotation lever with 15° Shift-snapping, and angle badges.
*   **Magnetic Snapping & Alignment Guidelines (`snappable={true}`):** Automatically calculates and renders red magnetic alignment guidelines, center guides, and spacing badges across canvas edges, layer centers, and peer elements with zero manual geometry code.
*   **Marquee Multi-Selection (`react-selecto`):** Dragging an empty canvas area creates a rubberband selection box that selects multiple layers and wraps them in a unified group transform box.
*   **Viewport Pan & Zoom (`pixi-viewport`):** Middle-click / Spacebar + LMB drag panning and cursor-centered pinch/wheel zooming.
*   **Figma-Style Inline Text Editing:** Double-clicking a text layer mounts a lightweight, transparent HTML `<textarea>` overlay directly over the layer's screen coordinates. Uses the browser's native text engine for caret blinking, selection, IME, and clipboard, syncing back to the PixiJS layer on blur.

### D. What React Handles Natively:
*   **Application Chrome:** Topbar, inspectors, modals, AI command bar (`Ctrl+K`), and drag-and-drop layer hierarchy in the sidebar.
*   **Asset Management:** File uploading, caching, and state synchronization.

## 4. The AI Agent's Role and Constraints
The AI agent operates strictly as a declarative data generator. It acts as the bridge between human natural language prompts and the application's visual state.

### What the Agent DOES:
*   Parses natural language requests ("Create a spinning phone mockup with a glowing background").
*   Generates a strictly typed, declarative JSON object representing the Scene Graph.
*   Assigns basic initial properties (positions, scales, rotations, colors, asset references).
*   Defines timeline events by placing sparse keyframes on specific properties.

### What the Agent DOES NOT DO:
*   The agent does not write HTML, CSS, or JavaScript.
*   The agent does not calculate 60fps incremental values (leave this to Theatre.js).
*   The agent does not manage the FFmpeg sidecar directly.
*   The agent does not alter the React state outside of submitting the final JSON payload.

## 5. Data Architecture: The JSON Bridge
The entire application relies on a single source of truth: a JSON scene graph schema. The AI agent must structure its output to match this schema perfectly.

### A. The Static Scene Graph (Canvas & Layers)
This defines the physical objects on the screen before any time passes.
*   **Global Settings:** Target frames per second (FPS), total duration in frames or seconds, canvas width, and canvas height.
*   **Layer Tree:** An ordered array of objects (representing z-index).
*   **Layer Properties:** Each layer must define its type (e.g., image, text, vector shape), unique ID, and initial transform states.
*   **Advanced Styling:** Toggles and numerical inputs for built-in PixiJS shaders, drop shadows, and masks.

### B. The Temporal Graph (Animation State)
This defines how the properties of the layers change over time, mapped directly to Theatre.js requirements.
*   **Tracks:** For every layer property that changes, the JSON must define an animation track.
*   **Keyframes:** Within each track, the agent specifies an array of keyframes. Every keyframe must contain a specific timestamp (or frame number) and the target value.
*   **Easings:** The agent must assign an easing function to every keyframe transition to ensure cinematic movement, relying on Theatre.js to execute it smoothly.

## 6. Layered Canvas Architecture & Component Interaction Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│ LAYER 4: Application Chrome (React + Tailwind + Radix UI)              │
│ - Topbar, Layers sidebar, Inspector, AI Command Bar (Ctrl+K)           │
│ - Theatre.js Studio Timeline docked at the bottom                      │
├────────────────────────────────────────────────────────────────────────┤
│ LAYER 3: Interaction & Gizmo Overlay (react-moveable + react-selecto)  │
│ - 8-point bounding box, rotation lever, multi-select marquee           │
│ - Red magnetic snapping guidelines & distance badges                   │
│ - Floating <textarea> overlay for double-click text editing            │
├────────────────────────────────────────────────────────────────────────┤
│ LAYER 2: GPU Canvas (PixiJS v8 - WebGL / WebGPU)                       │
│ - 60-120 FPS scene graph rendering, shaders, glows, masks, blend modes │
│ - Synchronous RGBA buffer extraction for export                        │
├────────────────────────────────────────────────────────────────────────┤
│ LAYER 1: Viewport Controller (pixi-viewport)                           │
│ - Spacebar + drag panning, cursor-centered wheel/pinch zooming         │
└────────────────────────────────────────────────────────────────────────┘
```

### Phase 1: Generation & React Handoff
1.  The user inputs a prompt.
2.  The AI returns the structured JSON Scene Graph.
3.  React validates the JSON and updates the global state.

### Phase 2: Canvas Construction (PixiJS + Viewport)
1.  React maps the Layer Tree onto the PixiJS stage inside `pixi-viewport`.
2.  PixiJS instantiates the objects onto the WebGL canvas, automatically applying anti-aliasing and shader effects.

### Phase 3: Interaction Binding (`react-moveable`)
1.  Selecting an object targets `react-moveable`, instantly mounting the 8-point transformer and rotation lever.
2.  Dragging triggers `snappable`, projecting red guidelines onto peer layer boundaries.

### Phase 4: Timeline Binding (Theatre.js)
1.  React passes the Temporal Graph into Theatre.js.
2.  Theatre.js maps the animation tracks to PixiJS properties, exposing the native timeline, dope sheet, and curve editor to the user for manual adjustments.

## 7. The Rendering and Export Pipeline (FFmpeg)
When the user initiates a video export, the system transitions from a real-time reactive state to a deterministic loop.

1.  **Initialization:** React signals the Tauri Rust backend to spawn the FFmpeg sidecar process, listening via stdin.
2.  **The Stepper Loop:** The frontend enters a synchronous loop from Frame 0 to the final frame.
3.  **Seek & Render:** Theatre.js seeks to the exact mathematical time. PixiJS renders that specific state.
4.  **Buffer Extraction & IPC:** The raw RGBA pixel buffer is extracted from WebGL (`app.renderer.extract.pixels()`) and sent across the Tauri IPC bridge as a raw binary slice (`&[u8]`).
5.  **Encoding:** Rust writes the binary buffer directly into the FFmpeg stdin pipe.
6.  **Finalization:** Once complete, Rust closes the pipe, and FFmpeg finalizes the `.mp4` file.

## 8. Critical Implementation Directives
*   **Theatre.js Production Build:** The `@theatre/studio` package must be explicitly forced to initialize in the production build environment.
*   **Deterministic Clock:** The export loop must never rely on real-time browser clocks. It must strictly use frame-indexed seeking to guarantee zero dropped frames.
*   **Binary IPC Streaming:** Frame data must be transferred to the Tauri backend as raw binary buffers (`&[u8]`), avoiding base64 encoding or JSON serialization overhead.
*   **Security Scopes:** The Tauri command execution capabilities are strictly limited. The AI agent cannot execute arbitrary shell commands.