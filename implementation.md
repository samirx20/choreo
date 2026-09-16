# IMPLEMENTATION.MD: Motion Studio Roadmap & System Specification

This document details the complete technical architecture, component design, data contracts, and milestone roadmap for building **Motion Studio**.

---

## 1. System Architecture

```
                                  [ AI via MCP Server ]
                                            │
                                            ▼ (Reads & Writes)
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 scene.json AST                                         │
│                      (Single Source of Truth / Project State)                          │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ Local WebSocket / State Store
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                          Tauri Desktop App (Web Shell)                                 │
│                                                                                        │
│  ┌───────────────────────┬───────────────────────────────────┬──────────────────────┐  │
│  │ Left Sidebar          │ Center Canvas                     │ Right Inspector      │  │
│  │ - Screens list        │ - @remotion/player                │ - Design: Typography │  │
│  │ - Layer tree          │ - 1920x1080 Viewport              │   Colors, Split Tool │  │
│  │ - Groups & Chunks     │ - Scrubber, Playhead, Loop        │ - Animate: Presets,  │  │
│  │                       │                                   │   Easings, Staggers  │  │
│  ├───────────────────────┴───────────────────────────────────┴──────────────────────┤  │
│  │ Bottom Timeline Track Bar (Animate Mode)                                         │  │
│  │ - Layer rows, Draggable clip bars, Auto-Link 🔗 cascade toggles                  │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
│                                           │                                            │
│                                           ▼                                            │
│                         Rust Backend (Tauri Core)                                      │
│                         - Native file system I/O                                       │
│                         - Bundled FFmpeg binary execution                              │
│                         - High-speed 60fps MP4/WebM render output                      │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core UI & UX Flow

### A. Top Navigation Bar
* **Project Name**: Inline editable text.
* **Mode Switcher**: Segmented toggle `[ Design | Animate ]`.
* **AI Action Button**: Sparkle button `[ ✨ AI Prompt ]` for quick natural language edits.
* **Export Button**: Modal to choose format (`1080p MP4`, `4K MP4`, `9:16 Vertical`, `Transparent WebM`, `GIF`).

### B. Design Mode
1. **Focus**: Creating and laying out the static resting scene (time = 100%).
2. **Canvas**: Displays all text, shapes, backgrounds, and images fully populated.
3. **Typography & Layout**: Standard font picker (Inter, Roboto, Playfair, etc.), font size, line height, flex layout, alignment, padding, background colors, and border radiuses.
4. **The Text Splitter QoL Tool**:
   * With a text box selected, clicking **"Split Selection"** or **"Split into Chunks"**:
     * Automatically converts the text box into a `<Group>` container.
     * The split segments become `<Chunk>` children.
     * Flex wrap and spacing ensure zero visual shift on the canvas.

### C. Animate Mode
1. **Focus**: Sequencing, timing, presets, and easings.
2. **Timeline Panel**: Slides up from the bottom:
   * Header: Timecode (`00:01:15`), Play/Pause (`Space`), Loop toggle, Zoom slider.
   * Tracks: One row per screen layer.
   * Groups display an expandable parent track with nested child tracks for each chunk.
   * **Auto-Link (🔗)**: Enabled by default. Changing Chunk 1 duration automatically offsets subsequent chunks down the timeline.
3. **Inspector Panel**: Switches from layout tools to motion tools:
   * **In Animation**: Dropdown (`Pop`, `Slide Up`, `Fade In`, `Mask Reveal`, `Blur In`, `Drop`, `3D Flip`).
   * **Easing**: Preset selector (`Smooth`, `Bouncy / Elastic`, `Overshoot`, `Snappy`).
   * **Stagger**: Slider to control interval between chunks (e.g. `0.05s` to `0.5s`).
   * **Out Animation**: Optional exit transition.

---

## 3. Data Specification (`scene.json`)

```typescript
interface Project {
  version: string;
  settings: {
    width: number;       // e.g. 1920
    height: number;      // e.g. 1080
    fps: number;         // e.g. 60
    duration: number;    // e.g. 5.0
  };
  screens: Screen[];
}

interface Screen {
  id: string;
  name: string;
  duration: number;
  layers: Layer[];
}

type Layer = TextLayer | GroupLayer | ShapeLayer | ImageLayer;

interface GroupLayer {
  id: string;
  type: "group";
  layout: {
    display: "flex" | "grid" | "absolute";
    flexDirection?: "row" | "column";
    gap?: number;
    alignItems?: "center" | "start" | "end";
    justifyContent?: "center" | "start" | "end" | "space-between";
  };
  autoFit?: boolean; // Enables dynamic resizing via FLIP layout morph
  autoLink?: boolean; // Enables cascade timing across children
  style: Record<string, any>;
  children: Layer[];
}

interface TextLayer {
  id: string;
  type: "text";
  content: string;
  style: {
    fontSize: number;
    fontFamily: string;
    fontWeight: string;
    color: string;
    letterSpacing?: string;
    lineHeight?: number;
  };
  animation?: {
    in?: AnimationAction;
    emphasis?: AnimationAction;
    out?: AnimationAction;
  };
}

interface AnimationAction {
  preset: "pop" | "slideUp" | "slideDown" | "slideLeft" | "slideRight" | 
          "fade" | "blurIn" | "maskUp" | "maskRight" | "flipX" | "drop";
  start: number;       // Start timestamp in seconds
  duration: number;    // Duration in seconds
  easing: "smooth" | "bouncy" | "overshoot" | "snappy" | "linear";
  delay?: number;
}
```

---

## 4. The Preset Engine (8 Atomic Actions)

Presets are defined as declarative property maps evaluated at timestamp $t$:

```typescript
export const PRESETS: Record<string, (progress: number, easingFn: (p: number) => number) => CSSProperties> = {
  pop: (p) => ({
    transform: `scale(${p})`,
    opacity: p < 0.1 ? p * 10 : 1
  }),
  slideUp: (p) => ({
    transform: `translateY(${(1 - p) * 80}px)`,
    opacity: p
  }),
  blurIn: (p) => ({
    filter: `blur(${(1 - p) * 20}px)`,
    opacity: p
  }),
  maskUp: (p) => ({
    clipPath: `inset(${(1 - p) * 100}% 0% 0% 0%)`
  }),
  flipX: (p) => ({
    transform: `perspective(600px) rotateX(${(1 - p) * 90}deg)`,
    opacity: p
  })
};
```

---

## 5. Model Context Protocol (MCP) Server

The MCP server runs locally and connects directly to the project's state.

### Exposed Tools:
1. `get_project_state`:
   - Returns full `scene.json` AST.
2. `update_project_settings({ width, height, fps, duration })`:
   - Updates global composition settings.
3. `create_screen({ name, duration })`:
   - Appends a new screen to the timeline.
4. `add_group({ screenId, layout, autoFit, style })`:
   - Adds a layout group to a screen.
5. `split_text_into_chunks({ textLayerId, chunks, preset, stagger })`:
   - High-level tool: Replaces a text layer with a group of chunks, applying the chosen preset and staggered start times.
6. `apply_preset({ layerId, presetName, easing, start, duration })`:
   - Sets or modifies animation parameters on an element.
7. `render_preview_frame({ timeInSeconds })`:
   - Renders the composition at $t$, captures a PNG, and returns base64 image data for multimodal inspection.
8. `export_video({ format, fps, filename })`:
   - Executes headless Chrome / Remotion FFmpeg render to produce the final video.

---

## 6. Milestones & Implementation Roadmap

### Phase 1: Core Foundation & State Store (Est: 1-2 Days)
- [ ] Initialize React 19 + Vite + Tailwind CSS + **shadcn/ui** project.
- [ ] Configure Zustand store for `scene.json` and `components.json` state management with undo/redo support.
- [ ] Implement the core component renderer (`<Scene>`, `<Group>`, `<Text>`, `<Chunk>`, `<Shape>`).

### Phase 2: Preset Engine & Layout Animations (Est: 1 Day)
- [ ] Implement the 8 atomic animation properties and standard easing curves.
- [ ] Create the preset catalog (In, Out, Emphasis, Custom CSS Animators).
- [ ] Implement Framer Motion `layout` wrapper for reactive auto-expanding backgrounds (FLIP).

### Phase 3: Studio GUI - Canvas & Design Mode (Est: 1-2 Days)
- [ ] Integrate `@remotion/player` for canvas rendering and time scrubbing.
- [ ] Build the Left Sidebar (Screens & Layer Tree with drag-and-drop nesting).
- [ ] Build the Floating Add Toolbar (Text, Shapes, Media, and Custom Components Drawer).
- [ ] Build the Right Sidebar Design Inspector matching [docs/RIGHT_SIDEBAR_SPEC.md](file:///c:/Users/Sam/Documents/CODE/MOTION-STUDIO/docs/RIGHT_SIDEBAR_SPEC.md).
- [ ] Implement Context-Aware **Text Splitting** & **Auto-Grouping** (0px shift guarantee).

### Phase 4: Studio GUI - Timeline & Animate Mode (Est: 1-2 Days)
- [ ] Build the multi-track timeline panel (draggable clip blocks, time rulers, expandable property tracks).
- [ ] Implement the **Auto-Link (🔗)** cascade timing engine.
- [ ] Implement Right Sidebar Animate Inspector ([PRESETS], [CUSTOM], [EFFECTS], and Active Animation Card).
- [ ] Implement Animation Copy/Paste with Replace/Append options.

### Phase 5: Custom Component Library System (Est: 1 Day)
- [ ] Implement "Save as Custom Component" modal (Project vs Global scope).
- [ ] Build Component Drawer with interactive hover animations.
- [ ] Implement stampable instances with optional "Keep Linked to Master" toggle.

### Phase 6: MCP Server & Multimodal Feedback (Est: 1 Day)
- [ ] Build the Node.js MCP server using `@modelcontextprotocol/sdk`.
- [ ] Expose all tools for external AI orchestration.
- [ ] Implement frame snapshot capture for visual AI inspection.

### Phase 7: Video Export Pipeline & Tauri Packaging (Est: 1-2 Days)
- [ ] Set up Remotion headless / Playwright + FFmpeg export script.
- [ ] Initialize **Tauri v2** desktop configuration.
- [ ] Bundle FFmpeg with the desktop app.
- [ ] Test cross-platform build and packaging.

---

## 7. Architectural References

All UI, UX, and behavioral specifications are documented in detail:
* [docs/UI_PANELS_SPEC.md](file:///c:/Users/Sam/Documents/CODE/MOTION-STUDIO/docs/UI_PANELS_SPEC.md) - Layout & UI structure for all panels, headers, canvas, and timeline.
* [docs/RIGHT_SIDEBAR_SPEC.md](file:///c:/Users/Sam/Documents/CODE/MOTION-STUDIO/docs/RIGHT_SIDEBAR_SPEC.md) - Exact input schemas matching screenshots, with full HTML/CSS styling depth.
* [docs/DEFAULT_BEHAVIORS_AND_INTERACTIONS.md](file:///c:/Users/Sam/Documents/CODE/MOTION-STUDIO/docs/DEFAULT_BEHAVIORS_AND_INTERACTIONS.md) - Zero-friction defaults for text splitting, auto-grouping, auto-link, FLIP auto-fit, and custom components.
* [docs/CONTEXT_MENU_MATRIX.md](file:///c:/Users/Sam/Documents/CODE/MOTION-STUDIO/docs/CONTEXT_MENU_MATRIX.md) - Clean separation of concerns between Right-Click context menus and the Right Sidebar.

