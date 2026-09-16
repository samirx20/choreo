# PROJECT_SPEC_AND_STORAGE.MD: Bundle Format, Storage, Fonts, AI & Engine Architecture

This document specifies the technical architecture for file persistence, font management, the AI command workflow, offline video rendering, and canvas performance in **Motion Studio**.

---

## 1. The `.motion` Project Bundle Format

Motion Studio projects are packaged as single, portable, self-contained zip archives with the `.motion` file extension.

### Directory Structure Inside a `.motion` Archive:
```
my-animation.motion (Zip Archive)
├── scene.json             # Core AST: canvas settings, screens, layers, styles, keyframes
├── components.json        # Project-scoped custom component definitions & templates
├── manifest.json          # Bundle metadata: version, title, thumbnail, created/modified timestamps
└── assets/                # Embedded media and fonts (zero broken paths)
    ├── images/
    │   ├── logo.png
    │   └── hero-bg.webp
    ├── videos/
    │   └── clip-intro.mp4
    └── fonts/
        └── CustomBrandFont.woff2
```

### Key Principles:
1. **Self-Contained Portability**: Moving or emailing a `.motion` file to another machine preserves 100% of images, videos, and custom fonts.
2. **Continuous Auto-Save**: In the Tauri desktop app, modifications to the project AST trigger debounced background writes to the `.motion` zip archive on disk. Users never have to manually hit `Ctrl+S` or worry about lost work.
3. **Crash Recovery**: An unzipped working directory is kept in the OS temporary directory (`~/.motion-studio/tmp/<project-id>/`) during editing, serving as an instant crash recovery checkpoint.

---

## 2. In-App AI Assistant: Command Bar (`Ctrl+K`)

Motion Studio embraces a keyboard-first, zero-friction AI assistant model:

```
┌─────────────────────────────────────────────────────────────┐
│ ✨ AI Command Bar                                  [ Esc ]  │
├─────────────────────────────────────────────────────────────┤
│ > Split text into 3 chunks and stagger pop-ins by 0.15s     │
├─────────────────────────────────────────────────────────────┤
│ Suggestions:                                                │
│ • "Add a subtle floating bounce loop to the selected card"  │
│ • "Make entrance 2x faster with bouncy easing"             │
│ • "Convert selected items into a flex-row group"            │
└─────────────────────────────────────────────────────────────┘
```

### Execution & Approval Workflow:
1. **Trigger**: User presses `Ctrl+K` anywhere (or clicks the `[ ✨ AI Prompt ]` button in the top bar).
2. **Natural Language Input**: User types an instruction targeting the selected element(s) or the entire screen.
3. **Instant Deterministic Mutation**:
   * The AI parses the request and directly mutates `scene.json`.
   * Modified elements on the canvas glow briefly with a subtle violet highlight border.
4. **Non-Intrusive Toast with Instant Undo**:
   * A clean notification toast appears at the bottom center of the screen:
     ```
     ┌─────────────────────────────────────────────────────────┐
     │ ✨ AI applied: 3 changes           [ Undo ]   [ Keep ]  │
     └─────────────────────────────────────────────────────────┘
     ```
   * Pressing `Ctrl+Z` or clicking `[ Undo ]` rolls back the changes immediately.
   * If left untouched, the toast auto-dismisses after 5 seconds.

---

## 3. Typography & Font Architecture (Cross-Platform)

Motion Studio employs a three-tier font resolution engine that functions identically across **Windows**, **macOS**, and **Linux**:

```
                        ┌───────────────────────────────┐
                        │   Font Resolution Engine      │
                        └───────────────┬───────────────┘
                                        │
         ┌──────────────────────────────┼──────────────────────────────┐
         ▼                              ▼                              ▼
┌─────────────────┐            ┌─────────────────┐            ┌─────────────────┐
│  Google Fonts   │            │ OS System Fonts │            │ Custom Uploads  │
│ (Curated / Web) │            │ (Rust font-kit) │            │ (.woff2 / .ttf) │
└─────────────────┘            └─────────────────┘            └─────────────────┘
```

1. **Google Fonts Catalog**:
   * Over 1,500 open-source fonts searchable directly inside the Typography dropdown.
   * Dynamically streamed into the canvas and cached locally in `~/.motion-studio/cache/fonts/` for offline use.
2. **Local OS System Fonts (Cross-Platform via `font-kit`)**:
   * Tauri's Rust backend utilizes the Mozilla/Servo **`font-kit`** crate to query the host OS font registry:
     * **Windows**: Queries `DirectWrite`
     * **macOS**: Queries `CoreText` (`CTFontCollection`)
     * **Linux**: Queries `Fontconfig` (`/usr/share/fonts`)
   * Exposes a unified `get_system_fonts()` Tauri command to populate the typography inspector with zero OS-specific frontend logic.
3. **Custom Font Drag & Drop**:
   * Dragging a `.woff2`, `.ttf`, or `.otf` file onto the canvas embeds the font file directly into the `.motion` archive's `assets/fonts/` folder.
   * Injects an `@font-face` definition into the canvas DOM, ensuring identical rendering across any machine.

---

## 4. Video Rendering Pipeline: Unified Cross-Platform FFmpeg Sidecar

Rather than maintaining divergent rendering engines between browser WebCodecs and native binaries, **Motion Studio standardizes on a single, unified FFmpeg Sidecar pipeline across Windows, macOS, and Linux**.

This guarantees **100% pixel-for-pixel parity**, identical color science (`bt709`), and universal support for all export formats on every operating system.

### The Unified Architecture:
```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ TAURI DESKTOP APPLICATION (Windows / macOS / Linux)                                    │
│                                                                                        │
│  ┌───────────────────────────────┐        ┌─────────────────────────────────────────┐  │
│  │ In-Webview Virtual Clock      │        │ Frame Buffer Grabber                    │  │
│  │                               │  Step  │                                         │  │
│  │ Advances frame clock:         │ ─────▶ │ Grabs raw RGBA byte buffer              │  │
│  │ f = 0, 1, 2, ... N            │        │ (Zero frame drops, 100% deterministic)  │  │
│  └───────────────────────────────┘        └───────────────────┬─────────────────────┘  │
│                                                               │                        │
│                                                               │ Binary IPC Stdin Pipe  │
│                                                               ▼                        │
│                                           ┌─────────────────────────────────────────┐  │
│                                           │ Bundled Native FFmpeg Sidecar (Rust)    │  │
│                                           │                                         │  │
│                                           │ • macOS: VideoToolbox (Apple Silicon)   │  │
│                                           │ • Windows: NVENC / QuickSync / AMF      │  │
│                                           │ • Linux: VAAPI / libx264                │  │
│                                           └───────────────────┬─────────────────────┘  │
│                                                               │                        │
│                                                               ▼                        │
│                                                    Final Rendered File:                │
│                                                    • MP4 (H.264/H.265)                 │
│                                                    • WebM (VP9 + Alpha)                │
│                                                    • Apple ProRes 4444                 │
│                                                    • Animated GIF (palettegen)         │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Multi-Target Sidecar Configuration in Tauri v2:
Tauri automatically bundles only the relevant platform binary during release packaging:
* **Windows (x86_64)**: `src-tauri/binaries/ffmpeg-x86_64-pc-windows-msvc.exe`
* **macOS (Apple Silicon M1–M4)**: `src-tauri/binaries/ffmpeg-aarch64-apple-darwin`
* **macOS (Intel x86_64)**: `src-tauri/binaries/ffmpeg-x86_64-apple-darwin`
* **Linux (x86_64)**: `src-tauri/binaries/ffmpeg-x86_64-unknown-linux-gnu`

### Execution Details:
1. **Deterministic Virtual Clock**:
   * The composition mounts in an offscreen container at the chosen target resolution (`1080p`, `4K`, `9:16 Story`).
   * A virtual frame counter advances step-by-step ($f = 0, 1, 2 \dots N$), giving heavy blurs, layout morphs, and shadows all the CPU/GPU time needed to render each frame without dropping frames.
2. **Streaming Frame Bytes**:
   * Each frame's RGBA pixel buffer is extracted and streamed via stdin directly into the running FFmpeg process.
3. **Format Presets**:
   * **Standard MP4 (Web/Social)**:
     ```bash
     ffmpeg -y -f rawvideo -pix_fmt rgba -s 1920x1080 -r 60 -i - -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p output.mp4
     ```
   * **Transparent WebM (Alpha Overlay)**:
     ```bash
     ffmpeg -y -f rawvideo -pix_fmt rgba -s 1920x1080 -r 60 -i - -c:v libvpx-vp9 -pix_fmt yuva420p output.webm
     ```
   * **Broadcast ProRes 4444 (Mastering with Alpha)**:
     ```bash
     ffmpeg -y -f rawvideo -pix_fmt rgba -s 1920x1080 -r 60 -i - -c:v prores_ks -profile:v 4 -pix_fmt yuva444p10le output.mov
     ```
   * **High-Quality GIF**:
     Two-pass palette generation for artifact-free animated GIFs.

---


## 5. Canvas Playback Performance & Adaptive Proxy

Scrubbing and previewing complex scenes with real-time blur filters, drop-shadows, and layout morphs demands high efficiency:

1. **Adaptive Playback Resolution**:
   * While scrubbing or during rapid playback, the canvas dynamically scales to **1/2 Resolution** (`960x540` proxy) if frame drops are detected.
   * The moment the playhead pauses or scrubbing stops, the canvas instantly renders in **100% Full Native Resolution** (`1920x1080`) with pixel-perfect crispness.
2. **Hardware Acceleration**:
   * All CSS transforms (`translate3d`, `scale`, `rotate`) are executed on the GPU layer (`will-change: transform`).
3. **Frame-Dropping Mode**:
   * Playback prioritizes real-time clock velocity over rendering every intermediate frame during preview. Export, by contrast, renders 100% of frames deterministically at 60fps.

---

## 6. Multi-Screen Sequencing & Inter-Screen Transitions

Motion Studio projects consist of one or more sequential "Screens" (scenes):

```
[ Screen 1: Hook (4.0s) ] ──[ Slide Left (0.6s) ]──▶ [ Screen 2: Demo (5.0s) ] ──[ Fade Black (0.5s) ]──▶ [ Screen 3: CTA (3.0s) ]
```

1. **Scene Isolation**:
   * Each screen is an independent canvas with its own layers, layout groups, and local duration.
2. **Master Sequence Playback**:
   * In Animate Mode, the master timeline can play across all screens sequentially.
3. **Inter-Screen Transition Presets**:
   * Clicking the junction between two screens allows selecting a transition preset:
     * `Hard Cut` (Default: 0.0s instant switch).
     * `Slide Left / Slide Right` (Incoming screen pushes outgoing screen).
     * `Fade through Color` (Smooth fade into black or white, then out).
     * `Crossfade / Dissolve` (Blended opacity transition).
     * `Zoom In / Push` (Scale-based transition).

---

## 7. Keyboard Shortcuts Cheat Sheet

All industry-standard hotkeys (inspired by Figma, Jitter, and VSCode). Pressing `?` or `Ctrl+/` opens the in-app interactive shortcuts overlay:

| Keybinding | Action |
| :--- | :--- |
| `Space` | Play / Pause playback |
| `Tab` | Toggle between **Design Mode** and **Animate Mode** |
| `Ctrl+K` | Open AI Assistant Command Bar |
| `Ctrl+Z` / `Ctrl+Shift+Z` | Transactional Undo / Redo |
| `Ctrl+G` / `Ctrl+Shift+G` | Group Selection / Ungroup |
| `Ctrl+D` | Duplicate Selection |
| `Ctrl+Alt+C` / `Ctrl+Alt+V` | Copy Animation / Paste Animation |
| `S` | Split Animation Clip at Playhead |
| `Ctrl+Shift+C` | Split Text into Chunks |
| `Ctrl+Shift+W` | Split Text into Words |
| `V` | Pointer / Select Tool |
| `T` | Text Tool |
| `R` | Rectangle Shape Tool |
| `O` | Ellipse / Circle Shape Tool |
| `Shift + Drag` | Constrain Aspect Ratio (1:1) or Snap Rotation to 15° increments |
| `Space + Drag` | Pan Canvas Viewport |
| `Ctrl + Scroll` | Zoom Canvas Viewport In / Out |
| `Home` / `End` | Jump to Start / Jump to End of Screen |
| `,` / `.` | Step Back 1 Frame / Step Forward 1 Frame |
| `L` | Toggle Timeline Loop Playback |
| `?` or `Ctrl+/` | Open Keyboard Shortcuts Cheat Sheet |
