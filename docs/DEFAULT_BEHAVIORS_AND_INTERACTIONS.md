# DEFAULT_BEHAVIORS_AND_INTERACTIONS.MD: Motion Studio Core Behaviors

This document specifies the default rules, automated behaviors, and zero-friction interactions designed into Motion Studio. These defaults ensure that complex animation workflows—such as breaking text into kinetic chunks or sequencing UI elements—require zero manual alignment math.

---

## 1. Universal Element Splitting Paradigms

Splitting is one of Motion Studio's primary differentiators. Rather than an ambiguous generic action, **Split is designed with distinct, predictable semantics for every single element type**:

### A. Text Layer: Highlight-to-Split (The Flagship Workflow)
When a user selects or edits a paragraph and highlights a specific substring with their mouse (e.g., highlighting `"I've got something big"`):

```
Text: [ "Hey Team, " ] + [ HIGHLIGHTED: "I've got something big" ] + [ " for you!" ]
                            │
                            ▼ 1-Click Split Selection (via HUD or Right-Click)
┌─ <Group layout="flex-row wrap" autoLink=true> ────────────────────────────────────────┐
│  Chunk 1: "Hey Team, "                                  [0.00s - 0.80s]               │
│  Chunk 2: "I've got something big"   <-- Selected span! [0.80s - 1.60s] (Stamp Gold)  │
│  Chunk 3: " for you!"                                   [1.60s - 2.40s]               │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

1. **Selection Range Detection**:
   * The browser selection captures $[i_{\text{start}}, i_{\text{end}}]$.
   * Both the Contextual Floating Action Bar (HUD) and Right-Click context menu dynamically surface `[ ✂ Split Selection ]`.
2. **Deterministic 3-Piece Slicing**:
   * Prefix: $S[0 : i_{\text{start}}]$ (omitted if selection starts at index 0).
   * Target Chunk: $S[i_{\text{start}} : i_{\text{end}}]$ (the highlighted text, automatically selected and ready for custom styling or animations).
   * Suffix: $S[i_{\text{end}} : ]$ (omitted if selection reaches the end of the text).
3. **Automatic Container Transformation**:
   * The original `<TextLayer>` is instantly converted into a `<Group>` container with `display: flex`, `flexWrap: wrap`, and `column-gap` / `row-gap` mathematically matching the font's natural space and line metrics.
   * The sliced segments become child `<Chunk>` layers inside that group.
4. **Zero Visual Shift Guarantee**:
   * Font family, font size, line-height, letter-spacing, and alignment are preserved with **0 pixels** of visual displacement before and after splitting.
5. **Instant Animation Cascade & Stagger**:
   * **Auto-Link (🔗)** is turned **ON** by default on the group's timeline track.
   * A default stagger interval of `0.15s` is applied between consecutive chunks.
   * The highlighted chunk can immediately be styled with a contrasting color (e.g. Stamp Gold `#e8c547`) or assigned a unique motion preset (`Pop In`, `Blur In`) while the prefix and suffix stay as resting text.

### B. Text Layer: Split at Caret / Cursor (`Ctrl+Enter`)
* If the user clicks between two words without highlighting a range, pressing `Ctrl+Enter` or selecting "Split at Caret" cuts the text at the cursor into two contiguous chunks (before and after) inside a `<Group>`.

### C. Text Layer: Semantic Chunks (`Ctrl+Shift+C`) & Words (`Ctrl+Shift+W`)
* **Split into Chunks**: Uses punctuation and semantic phrase boundaries to break sentences into natural conversational chunks.
* **Split into Words**: Breaks every word into its own chunk inside a wrapping flex container for kinetic typography / karaoke-style animations.

### D. Group / Container Splitting (Extract & Dissolve)
* **Extract Child from Group (`Ctrl+Shift+E`)**: Slices a child layer out of a `<Group>` flex container onto the root canvas, computing absolute coordinates $(X_{\text{group}} + X_{\text{rel}}, Y_{\text{group}} + Y_{\text{rel}})$ with zero visual jump.
* **Ungroup / Dissolve (`Ctrl+Shift+G`)**: Dissolves the `<Group>` container entirely and promotes all children to independent root canvas layers.

### E. Card / Shape Splitting (Container Column Division)
* **Split Card into Columns (`◫ Split Columns`)**: Divides a container card horizontally into two equal sibling columns (50% / 50% minus gap), ideal for side-by-side comparison cards or split-screen motion designs.

### F. Timeline Clip Splitting (Playhead Razor Cut)
* **Split Clip at Playhead (`Ctrl+K` or `✂`)**: Slices an animation block into two contiguous timing segments at the current playhead time $T_{\text{playhead}}$, allowing different motion curves or speeds before and after the cut.

---

## 2. Auto-Grouping (`Ctrl+G`) & Bounding Box Logic

When a user multi-selects 2 or more canvas layers and presses `Ctrl+G` (or right-clicks -> "Group"):

1. **Union Bounding Box Calculation**:
   * Computes the minimal enclosing rectangle $(X_{min}, Y_{min}, Width, Height)$ enclosing all selected layers.
2. **Relative Coordinate Translation**:
   * The new parent `<Group>` is positioned at $(X_{min}, Y_{min})$ on the canvas.
   * All child elements have their $X, Y$ coordinates translated relative to the group's origin:
     $$\Delta X_i = X_i - X_{min}, \quad \Delta Y_i = Y_i - Y_{min}$$
   * Canvas visual placement remains 100% identical.
3. **Ungrouping (`Ctrl+Shift+G`)**:
   * Converts child relative coordinates back to root canvas absolute coordinates and dissolves the parent group container.

### B. Instant Text Creation & Non-Blocking Inline Caret Editing
1. **1-Click Text Creation**:
   * Clicking "Text" in the bottom toolbar (or pressing `T` and clicking on canvas) creates a text layer initialized with `"Add text"`.
   * Immediately enters `isEditing = true` with `"Add text"` selected/highlighted.
   * A vertical caret blinks; the user's very first keystroke overwrites `"Add text"` immediately.
   * No dropdown or prompt asking for heading/body level.
2. **Contextual Floating Bar (HUD)**:
   * Appears 10px above the active element, providing color swatch, font family, size presets (`Small`, `Medium`, `Large`, etc.), bold, strikethrough, kinetic chunk splitting, alignment, and quick motion preset.
3. **Non-Blocking Transform Box**:
   * The interior of the bounding box has `pointer-events: none` so clicks pass through directly to underlying text layers.
   * Single click selects layer; double click or `Enter` enters inline editing with full native cursor placement and word selection.
   * Blur, `Escape`, or clicking canvas background commits the edit with transactional undo/redo.

---

## 3. Auto-Link (🔗) Cascade Rippling

The **Auto-Link** feature solves timeline maintenance fatigue:

```
Chunk 1: [==== 0.8s ====]
Chunk 2:                 [==== 0.8s ====]
Chunk 3:                                 [==== 0.8s ====]
                               │
            User extends Chunk 1 duration to 1.2s
                               │
                               ▼ (Auto-Rippled)
Chunk 1: [====== 1.2s ======]
Chunk 2:                     [==== 0.8s ====]
Chunk 3:                                     [==== 0.8s ====]
```

### Rules:
1. **Enabled by Default**: Auto-Link is enabled whenever a group is created or text is split.
2. **Forward Ripple**: Extending or shortening Chunk $N$'s duration automatically shifts the start offsets of Chunk $N+1$, $N+2$, etc., maintaining the stagger interval.
3. **Independent Override**: Clicking the 🔗 icon on the track header unlinks tracks, allowing independent drag-and-drop keyframing of any chunk without rippling siblings.

---

## 4. Auto-Fit Reactive Backgrounds (FLIP)

When an element or container has `autoFit: true` enabled (e.g. a dark card wrapping sequential text chunks):

1. **Resting State (Time = 100%)**:
   * The card fits the full text content with specified padding.
2. **Motion State (Time = $t$)**:
   * As Chunk 1 enters $\to$ the background card dimensions dynamically fit Chunk 1.
   * As Chunk 2 enters $\to$ the background card smoothly animates its width and height (using GPU-accelerated layout morphing).
   * As Chunk 3 enters $\to$ the card reaches full size.
3. **No After Effects Expressions Needed**:
   * Handled natively via Web Layout animations (FLIP / Framer Motion / Motion.dev layout transitions).

---

## 5. Animation Copy & Paste System

Allows copying motion recipes between components (e.g. copying a custom button's entrance and hover animation to another button):

### Workflow:
1. **Copy Animation**:
   * User right-clicks a layer or timeline clip block and selects **"Copy Animation"** (`Ctrl+Alt+C`).
   * Serializes the animation recipe:
     ```json
     {
       "type": "scale",
       "mode": "in",
       "parameters": { "initialScale": 0.5, "fade": true },
       "timing": { "duration": 0.8, "easing": "bouncy" }
     }
     ```
2. **Paste Animation**:
   * User selects the target layer or timeline track and presses `Ctrl+Alt+V` (or right-clicks -> "Paste Animation").
3. **Timing Placement Behavior**:
   * The animation is pasted starting at the **current playhead timestamp**.
   * If the target already has active animations at that timestamp, a quick toast appears:
     * `[ Replace Existing ]` (Default: overwrites the conflicting animation block).
     * `[ Append ]` (Places the new animation block immediately after the existing animation).
4. **Group Target Handling**:
   * If pasted onto a Group layer, the user is prompted:
     * `Apply to Container` (animates the whole card/group as one entity).
     * `Cascade to All Children` (applies to each child with the group's current stagger delay).

---

## 6. Custom Components Lifecycle & Reusability

Users can create reusable motion components and stamp them across any screen or project:

```
Select Element (e.g. Neon CTA Button)
        │
        ▼ Right-Click -> "Save as Custom Component"
┌────────────────────────────────────────────────────────┐
│ Modal: Save Component                                 │
│ Name:     [ Neon CTA Button                          ] │
│ Category: [ Buttons ▾ ]                                │
│ Scope:    (•) Project Only    ( ) Global Library       │
└────────────────────────────────────────────────────────┘
        │
        ▼ Saved to components.json / ~/.motion-studio/components
Available in Bottom Floating Toolbar [ 🧩 Components ] -> Drag & Drop onto any Canvas!
```

### Key Defaults:
1. **Stampable Templates (Default)**:
   * Dragging or inserting a custom component creates a standalone, fully editable copy.
   * Modifying this copy does not alter the original template.
2. **Optional "Linked to Master"**:
   * If `Keep Linked to Master` is toggled in the inspector, modifications to the master template in the library automatically propagate to all linked instances across the project.
3. **Dual Scope Support**:
   * **Project Scope**: Saved in the project's local directory. Great for project-specific brand assets.
   * **Global Scope**: Saved in user's OS application data. Accessible across all future projects.

---

## 7. Smart Magnetic Snapping & Dynamic Gap Badges

During element movement and resizing on the canvas:

1. **Alignment Guides (Magenta Snap Lines)**:
   * Snaps automatically to canvas center axes (horizontal and vertical).
   * Snaps to bounding box edges (Left, Center, Right, Top, Middle, Bottom) of sibling layers.
2. **Equal Spacing & Gap Badges**:
   * When dragging an element between or beside sibling elements, Motion Studio detects equidistant spacing.
   * Displays an inline distance badge (e.g. `24px` or `32px`) between elements to guarantee visual harmony without manual nudging.
3. **`Alt` Distance Measurement**:
   * Holding `Alt` while hovering over another layer shows live distance badge arrows ($dX, dY$) between bounding boxes.

---

## 8. Reverse Splitting & Fluid Text Mechanics

To ensure users never feel "trapped" after splitting text into chunks:

1. **Backspace at Index 0 (Merge with Previous)**:
   * When cursor is at index 0 of Chunk $N$ ($N \ge 2$) and user hits `Backspace`, Chunk $N$ is appended to Chunk $N-1$ and deleted. The caret lands at the merge point, and timeline ripple staggers update seamlessly.
2. **Delete at End (Merge with Next)**:
   * Hitting `Delete` at the end of Chunk $N$ pulls Chunk $N+1$ into Chunk $N$.
3. **Auto-Dissolve on Single Child**:
   * If merges or deletions reduce a `<Group>` to only 1 child chunk, the group automatically dissolves back to a root `<TextLayer>` with zero layout jump.
4. **Ghost Layer Cleanup**:
   * If a user leaves a text layer empty and blurs, it is automatically removed from the canvas.

---

## 9. Deep Selection & Canvas Marquee Selection

1. **Deep Selection (`Ctrl + Click`)**:
   * Bypasses parent group containers and directly selects the deepest nested child under the cursor.
   * `Shift + Enter` ascends to select the parent group; `Enter` descends to the first child.
2. **Selection Marquee (Lasso)**:
   * Dragging on empty canvas creates a translucent gold selection box.
   * All enclosed or intersected elements become selected.
   * Holding `Shift` allows additive marquee selection.
3. **Zoom to Selection (`Shift + 2`)**:
   * Centers and scales viewport around selected layers with 50px margin.

---

## 10. Direct Canvas Shape & Card Manipulation

1. **Inner Corner Radius Handles**:
   * 4 subtle circular dots inside the corners of any rectangle or card. Dragging inwards adjusts `borderRadius` interactively with real-time `R: 16px` tooltip.
2. **Corner Rotation Hover Zone**:
   * Hovering 12-28px outside any corner handle shows the curved rotate cursor. Dragging rotates around layer center. Holding `Shift` locks to 15° increments (`0°`, `15°`, `30°`, `45°`, `90°`).
3. **Interactive Container Reparenting**:
   * Dragging any element over an existing Frame or Group highlights the container with a glowing Stamp Gold outline. Dropping automatically nests the element into the container.

---

## 11. Transactional Compound Undo/Redo Engine

To provide a fatigue-free editing experience, the undo/redo stack strictly manages state transactions:

1. **Atomic Compound Actions**:
   * Multi-step operations such as Highlight-to-Split (which deletes 1 layer, creates 1 group, creates 3 chunks, and applies animations) are recorded as a single discrete entry in the undo stack.
   * A single `Ctrl + Z` undoes the entire operation cleanly.
2. **Typing Debounce Batching**:
   * Rapid text typing is debounced at 800ms so each keystroke does not produce a separate undo entry.
3. **Transform Commit on Mouse Up**:
   * Continuous mouse dragging, resizing, or rotating only commits to history on `mouseup`.
4. **Viewport & Playhead Exclusion**:
   * Panning the canvas (`Space + Drag`), zooming (`Ctrl + Wheel`), or scrubbing the timeline does **not** push steps to the document undo history.
   * Pressing `Ctrl+Z` strictly undoes changes to the project content and animation parameters, ensuring the user's focus and viewport remain undisturbed.

---

## 12. External Asset Ingestion

1. **Desktop Drag & Drop**:
   * Dragging image or video files from Windows Explorer / Finder directly onto canvas places them at drop coordinates, auto-scaled to fit within 600px.
2. **Clipboard Paste (`Ctrl + V`)**:
   * Pasting image bitmaps from clipboard instantly creates an image layer.
3. **Double-Click Image Crop Mode**:
   * Double-clicking an image reveals 8 crop handles and a darkened mask overlay. Pressing `Enter` commits the crop.

---

## 13. Multi-Line Text Auto-Height & Canvas Drag Behaviors

1. **Zero-Clip Auto-Height Reflow**:
   * Text layers (`type: "text"` and `type: "chunk"`) dynamically calculate their height from their actual rendered content.
   * Even if a layer previously had an explicit numeric `height` (e.g. from dragging handles), CSS treats it as `min-height`, enforcing `height: auto` so text NEVER clips or overflows outside its boundary.
2. **TransformBox Snug Wrapping**:
   * When multi-line text reflows or line breaks are typed, the visual DOM bounding box is measured in real-time. The yellow `TransformBox` expands to tightly enclose all rows of text.
3. **Horizontal vs Vertical Resize Semantics**:
   * Dragging horizontal handles (`"e"` or `"w"`) updates `width` and locks `height: "auto"`, reflowing lines cleanly.
   * Only explicit vertical dragging (`"n"` or `"s"`) overrides height.
   * The inspector surfaces a 1-click `Auto` badge whenever a text layer has a fixed height, allowing instant return to natural auto-height.
4. **Center-Body Drag Surface**:
   * When a layer is selected and not in inline text-editing mode, its entire inner surface has `cursor-move` and captures pointer events. Users can click and drag anywhere inside the text or card to move it smoothly across the artboard.
   * Double-clicking transitions directly into inline text editing mode. Pressing `Escape` commits text edits and returns to the selected drag-ready state.
