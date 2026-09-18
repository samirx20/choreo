# Motion Studio: Comprehensive Interaction & Workflow Specification

This document serves as the definitive specification for all user interactions, default states, and behavioral logic across **Design Mode**, **Animate Mode**, the **Canvas Interaction Layer**, the **Sidebars**, and the **AI Assistant**.

---

## 1. Canvas Selection & Hierarchical Drill-Down

```
[Click on Card] ───> Selects Parent Card/Group (8-point Moveable Box)
     │
     └─── [Double-Click Card] (or Cmd/Ctrl + Click) ───> Selects Nested Child (e.g. Text Chunk)
               │
               └─── [Double-Click Text / Press Enter] ───> Inline Textarea Editing (Blinking Caret)
                         │
                         └─── [Press Escape / Click Away] ───> Commits Text, returns to Child Selected
                                   │
                                   └─── [Press Escape] ───> Returns to Parent Card Selected
```

### Direct Behaviors:
* **Single Click**: Selects the topmost layout container (Hero Card/Group). Displays the primary `react-moveable` bounding box.
* **Double-Click on Group**: Drills down into the hovered child layer (Text chunk, shape, or nested container).
* **Cmd / Ctrl + Click**: Deep-selection shortcut; selects the innermost clicked layer immediately, bypassing container hierarchy.
* **Clicking Siblings**: Once drilled into a group, clicking any sibling layer selects that sibling directly without returning to the parent.
* **Deselection & Upward Navigation**: Pressing `Escape` or clicking the empty canvas deselects the current layer or bubbles selection up one level.

---

## 2. Text Lifecycle & Double-Click Inline Editing

* **Trigger**: Double-clicking an already-selected text layer (or selecting it and pressing `Enter`).
* **Editing State**:
  * A transparent, styled `<textarea>` overlay mounts directly over the layer's screen coordinates.
  * Browser native caret, selection highlighting, IME (international input), clipboard (cut/copy/paste), and font rendering are utilized.
  * Text area auto-grows with content (`min-height`, `min-width` match current text dimensions).
* **Commit Actions**:
  * Clicking outside (`onBlur`).
  * Pressing `Enter` (without Shift).
  * Pressing `Escape` commits changes and returns to standard layer selection.
* **Shift + Enter**: Inserts a new line within the text block.

---

## 3. Canvas Transformation & Magnetic Snapping

### Keyboard Modifiers:
* **`Shift` + Drag**: Constrains movement strictly to a single axis (horizontal or vertical).
* **`Shift` + Rotate**: Snaps rotation to 15° increments with live degree tooltip.
* **`Alt` / `Option` + Drag**: Duplicates the layer in-place and drags the new clone.
* **Corner Handle Drag**: Resizes element. Holding `Shift` locks the aspect ratio (`keepRatio`).
* **Outer Corner Rotation Zones**: Hovering 4px–20px outside any of the 4 corner handles displays the high-contrast curved rotation cursor. Clicking and dragging rotates the element smoothly around its center with zero initial jump; holding `Shift` snaps rotation to 15° increments with live HUD readout.
* **On-Canvas Blue Corner Radius Points**: For any rectangle, group/card, or image layer, 4 white circular handles with Figma Blue (`#0d99ff`) rings appear inside the corner vertices. Hovering displays diagonal resize cursors. Dragging inward scrubs `borderRadius` interactively with a live HUD badge, and holding `Alt` overrides a single corner (`[TL, TR, BR, BL]`).
* **Rotated Layer Selection Box Synchronization (Figma Standard)**: Single layer selection bounding boxes follow the layer's unrotated canonical dimensions (`layer.style.width`, `layer.style.height`) and orientation angle (`layer.style.rotation`). Instead of sampling screen-axis-aligned enclosing bounding boxes (`getBoundingClientRect()`) which swap/distort dimensions at 90° or 45°, single selection bounding boxes apply `transform: rotate(θdeg)` around the element's invariant center `(visualX + visualW/2, visualY + visualH/2)`. For multi-layer selection (`N > 1`), an enclosing axis-aligned bounding box (AABB) with `rotation = 0` frames all selected elements collectively.

### Magnetic Snapping Rules (`snappable={true}`):
* **Snap Targets**:
  1. Artboard horizontal and vertical center lines.
  2. Artboard canvas edges (0px boundaries).
  3. Sibling layer boundaries (top, bottom, left, right, and center axes).
* **Visual Guides**: Red magnetic alignment lines project automatically across the canvas during proximity ($< 5\text{px}$).
* **Distance Badges**: Displays numeric spacing indicators (e.g. `24px` ... `24px`) when elements achieve equidistant distribution.

---

## 4. Operational Modes: Design Mode vs. Animate Mode

```
┌────────────────────────────────────────────────────────────────────────────┐
│ MODE SWITCHER: [ Design | Animate ] (Toggle via Tab key)                   │
├─────────────────────────────────────┬──────────────────────────────────────┤
│ DESIGN MODE                         │ ANIMATE MODE                         │
├─────────────────────────────────────┼──────────────────────────────────────┤
│ • Focus: 100% Resting State         │ • Focus: Motion, Timing & Presets    │
│ • Bottom timeline is hidden         │ • Bottom timeline slides up          │
│ • Floating creation toolbar visible │ • Floating creation toolbar hidden   │
│ • Full spatial transforms & layout  │ • Moving canvas layer edits resting  │
│ • Right Inspector: Colors, borders, │   pose; timeline scrub reviews motion│
│   flex layout, typography, auto-fit │ • Right Inspector: Presets (In/Out/  │
│ • Spacebar: Hand pan tool           │   Emphasis), duration, easing pills  │
│                                     │ • Spacebar: Play / Pause toggle      │
└─────────────────────────────────────┴──────────────────────────────────────┘
```

---

## 5. Signature Feature: One-Click Text Splitting & Auto-Link

1. **Splitting Action**: Highlighting text or clicking **"Split into Chunks"** / **"Split into Words"** in the Right Sidebar or Right-Click Context Menu.
2. **Structural Transformation**:
   * The original text layer transforms into an **Auto-Layout Flex Group** (`layout: { display: 'flex', flexDirection: 'column', gap: 20 }`).
   * `autoFit: true` is enabled on the parent background card.
   * Semantic sentences or words become individual child `<Chunk>` layers.
3. **Cinematic Motion Defaults**:
   * **Preset**: `Pop In` (scale $0 \to 1$, opacity $0 \to 1$).
   * **Duration**: `0.6s` per chunk.
   * **Easing**: `bouncy` overshoot spring curve.
   * **Cascade Stagger**: `0.15s` delay increment per chunk.
   * **Auto-Link (🔗)**: Enabled on the parent group track. Adjusting Chunk 1's duration automatically ripples Chunk 2 and Chunk 3 forward.

---

## 5B. Canvas Freeform Grouping (`Ctrl+G`) vs. Auto Layout

* **Default Behavior (Universal Standard)**: Grouping two or more canvas layers via `Ctrl+G` or the toolbar button creates a **Freeform Group** (`layout: { display: 'none' }`, `autoFit: false`).
  - Elements maintain their exact visual canvas positions without shifting, wrapping, or stacking into columns.
  - Group bounding box is derived from the outer envelope of child layers: $x = \min(x_i)$, $y = \min(y_i)$, $w = \max(x_i + w_i) - x$, $h = \max(y_i + h_i) - y$.
  - Child coordinates are converted to relative offsets ($x_{\text{rel}} = x_{\text{world}} - x_{\text{group}}$, $y_{\text{rel}} = y_{\text{world}} - y_{\text{group}}$).
  - Stacking order ($z$-index) is strictly preserved by inserting the new group at the position of the first grouped layer.
* **Auto Layout Toggle**: Users can explicitly convert any freeform group into an Auto-Layout container (Flexbox) in the Design Inspector via `+ Add Auto Layout`, enabling row/column distribution, 9-point alignment, gap spacing, and FLIP auto-fit animations.
* **Auto-Fit Background (HUG)**: When Auto-Fit Background (`autoFit: true`) is active on a flex container, it hugs its children's intrinsic layout dimensions using `max-content` so it never collapses when dragged near artboard edges. FLIP morphing is strictly restricted to Animate Mode during timeline playback when visible chunk counts change, ensuring direct canvas dragging in Design Mode is 100% stable without dimensional glitching or runaway scaling loops.

---

## 6. Bottom Timeline & Theatre.js Engine Integration

* **Default Presentation**: Sleek custom dark-mode multi-track sequencer matching Jitter's clean aesthetics.
  * Timecode display: `00:00:00`, frame counter (`F0 / 300`), total duration.
  * Draggable preset track blocks with left/right trim handles and ripple indicators.
* **Under-the-Hood Motion**: `@theatre/core` performs deterministic cubic-bezier mathematical interpolation and sub-pixel seeking.
* **Power Curve Editor**: Clicking **"Edit Curve"** on an easing pill expands Theatre.js's visual bezier curve graph editor for micro-timing adjustments without cluttering the main timeline.

---

## 7. Right Sidebar (Inspector) Workflows

### Design Mode Inspector:
* **No Selection**: Artboard properties (width, height, FPS, duration, background fill).
* **Shape / Image Selection**: Position, dimensions, aspect ratio lock, appearance, fills, strokes, drop shadows, blur/glow shaders.
* **Text Selection**: Typography (font family, size, weight, line height, letter spacing, alignment), fills, text-shadows, and the **Split Tool**.
* **Group Selection**:
  - **Freeform Groups**: Displays a clean `Auto Layout` header with a `+` button to add Auto Layout (no explanatory cards or clutter).
  - **Auto Layout Groups**: Displays `Auto Layout` header with a `-` button, and flex container controls (Row/Column direction, gap, 4-side padding, 9-point alignment matrix, and **Auto-Fit Background (FLIP)** toggle).

### Animate Mode Inspector (Two-Tiered):
* **Tier 1 (Default)**: High-level preset cards:
  * In / Out / Emphasis preset dropdowns (`Pop In`, `Slide Up`, `Blur In`, `Fade In`, `3D Flip`).
  * Start offset and duration numeric inputs.
  * Easing pills (`Smooth`, `Bouncy`, `Overshoot`, `Snappy`, `Linear`).
  * Direction selectors (`Up`, `Down`, `Left`, `Right`).
  * Stagger interval and Auto-Link toggle.
* **Tier 2 (Power User)**: **"Convert to Keyframes"** button decomposes the preset block into explicit property tracks (`position.x`, `position.y`, `scale`, `rotation`, `opacity`, `filterBlur`) directly editable in Theatre.js.

---

## 8. Left Sidebar: Layers Tree & Screens

* **Smart Auto-Expansion**: Groups automatically expand in the tree when newly created, split, or selected on the canvas.
* **Drag-and-Drop Reordering**: Blue insertion guide line for reordering z-index or nesting layers in/out of layout containers.
* **Hover Controls**: Eye icon (toggle visibility), Lock icon (prevent accidental selection/dragging).
* **Right-Click Context Menu**:
  * Group (`Ctrl+G`) / Ungroup (`Ctrl+Shift+G`)
  * Duplicate (`Ctrl+D`)
  * Rename (`F2`)
  * Split into Chunks / Split into Words
  * Delete (`Delete` / `Backspace`)

---

## 9. AI Command Bar (`Ctrl+K`) & Handoff

* **Activation**: `Ctrl+K` (or `Cmd+K`) from anywhere in the application.
* **Target Context**: Automatically detects selection (`Target: Hero Card` vs `Target: Entire Scene`).
* **Execution Model**: **Instant In-Place Execution with 1-Click Undo**.
  * Emits strictly typed Scene Graph & Keyframe updates.
  * Updates canvas and timeline immediately.
  * Displays floating confirmation toast: `"Applied AI generation [Undo (Ctrl+Z)]"`.
  * Preserves transactional undo/redo stack (`TransactionalHistory`).

---

## 10. Deterministic Video Export Pipeline

* **Trigger**: Click **"Export"** button in top navigation bar.
* **Options Modal**:
  * Format: `.motion` Bundle (100% editable zip) or Video Render (MP4 / WebM).
  * Resolution Presets: 1080p (1920×1080), 4K UHD (3840×2160), 9:16 Vertical (1080×1920).
  * Framerate: 30 fps or 60 fps.
* **Execution**: Frame-by-frame loop ($t = k / \text{fps}$) stepping Theatre.js, rendering WebGL canvas, and streaming raw RGBA buffers directly into bundled `ffmpeg.exe` via Tauri stdin. Zero dropped frames, 100% offline.

---

## 11. Screen Format Switcher & Canvas Settings Inspector

* **Primary Artboard Root**:
  - The canvas operates on a single dedicated Screen artboard (default 1920×1080).
  - The redundant and ambiguous "Frame/Container" tool is removed; all child boxes and cards are shapes (rectangles) or auto-fitting flex groups (`Ctrl+G`).
* **Artboard Header Format Switcher**:
  - Interactive dropdown directly above the canvas for instant 1-click aspect ratio switching:
    - **16:9 Landscape** (1920×1080)
    - **9:16 Portrait** (1080×1920)
    - **1:1 Square** (1080×1080)
    - **4:5 Social** (1080×1350)
* **Canvas Settings Inspector (Empty Selection)**:
  - When no layer is selected on the canvas (`selectedLayerIds: []`), the Right Sidebar switches to **Canvas & Screen Settings**:
    - Aspect ratio preset selection cards with visual icons.
    - Custom width and height inputs with aspect-ratio locking.
    - Canvas background color picker with quick swatches (zinc darks, slate, midnight, studio black).
    - Project FPS (30/60) and duration scrubbers.
* **Clean State Initialization**:
  - New projects launch into a clean, empty canvas (`layers: []`, `selectedLayerIds: []`).
  - Prebuilt components (including the Hero Message Card) are available on-demand from the Components Drawer.
