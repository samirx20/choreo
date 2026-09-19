# Diffusion Studio Architectural Benchmark & Feature Adoptions

This document records the architectural findings from analyzing [Diffusion Studio](https://github.com/diffusionstudio/editor) (cloned in `diffusionstudio/`) and defines the concrete innovations, patterns, and features Motion Studio will adopt into its engineering roadmap.

---

## 1. Architectural Benchmark & System Comparison

| Dimension | **Motion Studio** | **Diffusion Studio** | Architectural Verdict |
| :--- | :--- | :--- | :--- |
| **Product Purpose** | Kinetic Motion Graphics, Explainer UI, Promos, Vector Design (Jitter/Figma) | Video NLE, Footage Cutting, Audio Sync, Captions, GenAI Media (Premiere/CapCut) | Different focuses; Motion Studio expanding into **scoped** video & 3D. |
| **Rendering Engine** | **PixiJS v8 (WebGL / WebGPU)**: GPU batching, shaders, bloom, displacement, readback fences | **Canvas2D (`CanvasRenderingContext2D`)** + Offscreen WebGPU for shader paints | **Motion Studio wins**: Hardware-accelerated GPU pipeline delivers 60–120fps with zero CPU rasterization bottlenecks. |
| **Document Paradigm** | **Declarative JSON AST (`scene.json`)** in `.motion` bundles | **Code-as-Document (`.tsx` on disk)** compiled into Koota ECS | **Motion Studio wins**: JSON AST is 100% deterministic, instant in-memory mutation (1ms), and zero syntax risk. |
| **Bidirectional Sync** | Native Zustand store $\leftrightarrow$ Canvas (zero parsing delay) | `ts-morph` AST rewriting on disk on every drag/trim | **Motion Studio wins**: `ts-morph` file parsing is heavy, slow on scrubs, and can break formatting. |
| **Desktop Shell** | **Tauri v2 + Rust**: ~15MB binary, low RAM, cross-platform native | **Electron 43**: ~300MB bundle, high memory usage, macOS Apple Silicon only | **Motion Studio wins**: Far lighter, faster startup, minimal memory consumption. |
| **Animation & Curves** | **Theatre.js** dope sheet, visual curve editor, damped spring physics ($f_{\text{spring}}$) | Canvas timeline, Anime.js, Koota ECS playback | **Motion Studio wins**: Studio-grade sub-pixel curve manipulation and physics. |
| **Reactive Layout** | **FLIP Layout Morphing (`autoFit: true`)** + 5-Mode Dependency Engine (`pin`, `hug`, `match`, etc.) | Explicit coordinates, basic `<sequence>` tags | **Motion Studio wins**: Deep kinetic layout and dynamic bounding box morphing. |
| **Agent Perception** | Single frame snapshot extraction | Multi-frame contact sheets (`capture`), AST linter (`check`), media probe/waveform | **Diffusion Studio excels**: We must adopt their agent perception & verification tools. |
| **Video Decoding** | Scoped WebCodecs export planned | WebCodecs (`mediabunny`) frame decoder + preview tile cache (`FrameCache`) | **Diffusion Studio excels**: Proven frame-accurate WebCodecs scrubbing architecture. |

---

## 2. Key Features & Patterns Adopted for Motion Studio

### 1. Multi-Frame Contact Sheet Frame Capture (`capture`)
* **The Innovation**: Instead of returning multiple separate images to an AI agent (which consumes excessive context and vision tokens), render single frames offscreen at key timestamps ($t_0, t_1, \dots, t_N$) and merge up to 12 positions into **a single labelled contact sheet PNG**.
* **Cell Metadata**: Each cell is automatically stamped with its timecode (e.g. `01s15f`).
* **Motion Studio Adoption**:
  - Add `capture_contact_sheet` to our MCP server and headless engine.
  - Allows multimodal AI agents to visually evaluate motion rhythm, typography legibility, and layout progression in a single turn.

### 2. Scene Structural Linter (`check`)
* **The Innovation**: A fast AST validation pass that runs *without rendering* to catch common AI generation errors before export or human review:
  - `black-frames`: timeline intervals where no visual layer is active on the artboard.
  - `never-visible`: layers where `opacity == 0` throughout their duration or dimensions are zero.
  - `zero-duration`: elements where $t_{\text{start}} \ge t_{\text{end}}$.
  - `source-error`: missing assets, broken image URLs, or uninstalled fonts.
* **Motion Studio Adoption**:
  - Add `lint_scene` tool to our MCP server.
  - AI agents will automatically run `lint_scene` after generating or modifying a scene to self-correct before presenting to the user.

### 3. Scoped Video Editor via WebCodecs (`mediabunny` / VideoDecoder)
* **The Innovation**: Completely avoid HTML `<video>` elements for scrubbing and rendering. HTML `<video>` is non-deterministic and drops frames during seeks.
* **Implementation Details**:
  - Demux MP4/WebM files using WebCodecs `VideoDecoder` into `VideoFrame` / `OffscreenCanvas`.
  - Maintain a sliding window preview cache (`FrameCache`) around the playhead for zero-lag scrubbing.
* **Motion Studio Adoption (EDITOR Suite)**:
  - Video layers represented as `PIXI.Sprite` with textures updated from decoded video frames.
  - Support `sourceIn`, `sourceOut`, `start`, `duration`, and `playbackRate`.
  - Support video masking, rounded corners, and FLIP auto-fit container wrapping.
  - Playhead Razor Cut (`S`) to split video clips into contiguous halves.
  - Audio waveform peak extraction accelerated via our bundled Tauri Rust/FFmpeg sidecar.

### 4. Scoped 3D Object Animator via Theatre.js & Three.js Offscreen Surfaces
* **The Innovation**: Rather than building a heavyweight 3D DCC, embed an offscreen Three.js WebGL canvas sampled directly as a PixiJS texture layer.
* **Why Motion Studio Excels Here**:
  - Theatre.js was originally architected specifically for Three.js!
  - 3D spatial transforms ($X, Y, Z$), Euler rotations (Pitch/Yaw/Roll), camera orbits, and lighting curves are already natively supported by `@theatre/core`.
* **Motion Studio Adoption (3D Suite)**:
  - `.gltf` / `.glb` model drag-and-drop layer (e.g., iPhone, MacBook, credit card, 3D logo).
  - **Screen Material Projection**: Project any 2D canvas layer or video clip directly onto the 3D model's screen UV texture.
  - 5 declarative 3D camera/orbit presets: *Orbit 360°*, *Isometric Tilt*, *Push-In Dolly*, *Float / Hover Wobble*, *Card Flip*.

### 5. Word-Level Kinetic Captions & Audio Understanding
* **The Innovation**: Generating word-level timed transcripts (millisecond start/end for every spoken word) and rendering them as kinetic captions.
* **Motion Studio Adoption**:
  - Ingest audio/voiceover files, run word-level transcription (Whisper / local speech API).
  - Pipe word timestamps into our `textSplitter.ts` (`Intl.Segmenter`) to automatically create staggered kinetic text chunks with presets (karaoke highlight, pop-in, fade-up).

### 6. Inspectable Template Variables (`@inspect` / Quick Controls)
* **The Innovation**: Exposing key design parameters (headline copy, brand colors, logo URL, padding) at the top of the project.
* **Motion Studio Adoption**:
  - Add a `variables` block to `scene.json`:
    ```json
    {
      "variables": {
        "headline": { "type": "string", "label": "Headline", "value": "Ship Faster." },
        "brandColor": { "type": "color", "label": "Accent Color", "value": "#60A5FA" }
      }
    }
    ```
  - Surface a **Quick Controls** card at the top of the Inspector so users can re-theme an AI-generated template in seconds without digging into nested layer trees.

### 7. Headless CLI & Local HTTP MCP Daemon (`motion-cli`)
* **The Innovation**: The editor runs as a daemon exposing a local HTTP MCP server (`http://127.0.0.1:3274/mcp`) and a companion CLI. External agents (Claude Code, Cursor, OpenCode, terminal scripts) can control the editor headlessly.
* **Motion Studio Adoption**:
  - Expose a lightweight local HTTP MCP endpoint in our Tauri backend.
  - Allow terminal coding agents to query project state, generate motion graphics, and trigger FFmpeg rendering headlessly.

---

## 3. Implementation Roadmap Integration

* **Phase 9.5 (Agent Perception & Linter)**:
  - Implement `capture_contact_sheet` (multi-frame 12-cell contact sheet PNG generator).
  - Implement `check_scene_linter` (AST validator for black frames, 0-opacity, 0-duration, missing assets).
* **Phase 10 (Scoped Video Editor Suite - "EDITOR")**:
  - WebCodecs video frame decoder + playhead tile cache.
  - Video layer in `scene.json` + PixiJS texture integration.
  - Trimming (`sourceIn`, `sourceOut`) and Razor Split (`S`).
  - Rust/FFmpeg audio waveform extraction.
  - Word-level kinetic captions.
* **Phase 11 (Scoped 3D Object Suite - "3D")**:
  - Three.js offscreen surface renderer mapped to PixiJS texture.
  - `.glb` model loading with screen-texture projection.
  - Theatre.js 3D spatial interpolation and camera orbit presets.
