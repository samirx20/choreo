# Motion Studio Handoff — Export Pipeline, Custom Save File & Tauri Desktop Architecture

> **Session Context**: This handoff document summarizes the current verified baseline of Motion Studio and outlines the technical roadmap for the upcoming session focusing on the **Export Pipeline**, **Custom Save File Format**, **Tauri Desktop Application**, and **Targeted UI Refinements**.
> **Date**: September 22, 2026
> **Branch**: `main` (Latest commit: `433189f`, pushed to remote)

---

## 1. Current Verified Baseline

The repository is in a clean, fully verified, production-ready state:
* **Automated Unit & Integration Tests**: All **37 test suites (314 tests)** passing via Vitest (`npm test`).
* **Production Build**: Compiles cleanly with **0 TypeScript / Vite bundling errors in 9.53s** (`npm run build`).
* **Git Status**: Clean working tree on `main`.
* **Recent Deliverables Completed**:
  * **Official `.mtn` Custom Save File & File System Adapter**:
    * Strictly validated `MotionStudioFileSchema` (v1) with Zod, wrapping project metadata and `SceneDocument`.
    * Dual-format auto-normalization (`validateAndNormalizeProjectFile`) supporting both `.mtn` packages and legacy raw JSON / `.motion` files with 100% backward compatibility.
    * Native File System Access API integration (`showSaveFilePicker`, `showOpenFilePicker`) with file handle caching for instant `Ctrl+S` disk writes.
    * Upgraded TopNavBar project title into a high-productivity File Dropdown Menu (Save, Save As, Open, Rename, Export, Back).
    * Global keyboard shortcuts (`Ctrl+S`, `Ctrl+Shift+S`, `Ctrl+O`).
    * Omnipresent Drag-and-Drop Dropzone overlay across both Workspace and Canvas Editor.
  * **Dual-View Figma-Grade ColorPicker**:
    * Full 2D Saturation/Value canvas with closed-form HSV coordinates and pointer capture.
    * 1D Rainbow Hue slider + Checkerboard Opacity slider.
    * EyeDropper API integration for live screen pixel sampling.
    * Circular saved swatches palette (Solid mode only).
  * **4-Type Gradient Engine**:
    * Radix Dropdown supporting **Linear**, **Radial**, **Angular**, and **Diamond** with high-contrast theme-aware typography.
    * **True 4-Facet Diamond Gradient**: Implemented using an 8-facet 4-fold angular reflection combined with an optical center highlight.
    * Interactive 2D gradient canvas with 2-point vector draggers, multi-stop slider track, and dedicated stop inspector.
  * **Scene Background Settings**:
    * Controlled "Apply to all scenes" checkbox synchronizing active scene background color across all scenes when enabled.

---

## 2. Next Session Agenda & Technical Roadmaps

### Track 1: Export Pipeline Hardening (WebCodecs & Media Processing)
* **Goal**: Enable professional video exports from the browser and desktop with frame accuracy.
* **Core Components**:
  1. **Frame-Accurate Clock Evaluator**:
     - Ensure $O(1)$ deterministic evaluation: $\text{State}(t) = f(\text{Storyboard}, t)$ stepped frame-by-frame ($1/60\text{s}$, $1/30\text{s}$, $1/24\text{s}$).
     - Zero reliance on `requestAnimationFrame` timing jitter during rendering.
  2. **Multi-Scene Sequence Stitching**:
     - Seamlessly render consecutive scenes into a continuous timeline without black-frame gaps or audio pops.
  3. **Transparent Alpha Video Export**:
     - WebM with VP9 alpha channel (`video/webm; codecs=vp09.00.10.08`).
     - Apple ProRes 4444 export (via native desktop FFmpeg pipeline in Tauri).
  4. **Export Progress UI**:
     - Non-blocking modal with real-time frame progress counter, percentage bar, estimated time remaining (ETA), and instant cancel/abort support.

---

### Track 2: Custom Save File Format (`.motion` / `.choreo`)
* **Goal**: Enable users to save, share, and backup their projects as self-contained files on their local filesystem.
* **Architecture**:
  1. **Format Specification**:
     - Single-file package format (JSON or lightweight ZIP archive if embedded assets are included).
     - Schema structure:
       ```json
       {
         "$schema": "https://motion-studio.app/schemas/v1.json",
         "version": 1,
         "metadata": {
           "id": "proj-uuid",
           "name": "Product Launch",
           "createdAt": 1727000000000,
           "updatedAt": 1727000500000
         },
         "settings": {
           "aspectRatio": "16:9",
           "width": 1920,
           "height": 1080,
           "frameRate": 60
         },
         "screens": [...],
         "timeline": {...},
         "assets": [...]
       }
       ```
  2. **Native Save / Open Workflow**:
     - Web: Native File System Access API (`showOpenFilePicker`, `showSaveFilePicker`) with fallback to standard file download/upload.
     - Desktop (Tauri): Direct native OS file dialogs and seamless `Ctrl+S` / `Cmd+S` auto-saving to local disk.
  3. **Drag-and-Drop File Loading**:
     - Dropping a `.motion` file onto the Canvas or Project Workspace automatically validates the schema and loads the project.

---

### Track 3: Tauri Desktop Application Architecture
* **Goal**: Package Motion Studio as an ultra-fast, cross-platform native desktop app (Windows `.msi`/`.exe`, macOS `.dmg`, Linux `.appimage`).
* **Development Workflow (Confirmed)**:
  * **Instant HMR Development**: `npm run tauri dev` connects the native desktop window directly to the Vite dev server. Edits to React, CSS, Canvas, and Zustand update **instantly in ~50ms** without repackaging or rebuilding.
  * **Repackaging (`npm run tauri build`)**: Only executed when generating the standalone installer/release binary.
* **Native Desktop Capabilities to Integrate**:
  * Direct filesystem access (no browser storage quota limits).
  * True OS-native menu bar and window titlebar controls.
  * Native FFmpeg bridge for ultra-fast ProRes 4444 and hardware-accelerated video rendering.
  * System file association: double-clicking a `.motion` file opens Motion Studio directly.

---

### Track 4: Small UI & UX Refinements
* **Inspector Ergonomics**:
  * Review spacing, padding, and alignment across Design and Animate inspector tabs.
  * Ensure consistent high-contrast typography across all dropdowns, select menus, and number inputs.
* **Canvas Toolbar Fine-Tuning**:
  * Verify keyboard shortcuts (`V` for select, `R` for rectangle, `T` for text, `Space` for pan).
  * Snap-to-grid and alignment guide visual polish.

---

## 3. Engineering Guidelines & Verification Checklist

Before concluding tasks in the next session:
- [ ] Run automated test suite: `npm test` (all tests passing).
- [ ] Run production build: `npm run build` (0 TypeScript / Vite bundling errors).
- [ ] Maintain Documentation Synchronization: Update `docs/DECISIONS.md` and `docs/HANDOFF.md` (AGENTS.md Rule 1).
- [ ] Commit atomically with conventional commit format and push to GitHub (`git push origin main`, AGENTS.md Rule 11).
- [ ] Zero Magic Numbers: All tokens derived from theme registries (AGENTS.md Rule 2).
