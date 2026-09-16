# DEFAULT_BEHAVIORS_AND_INTERACTIONS.MD: Motion Studio Core Behaviors

This document specifies the default rules, automated behaviors, and zero-friction interactions designed into Motion Studio. These defaults ensure that complex animation workflows—such as breaking text into kinetic chunks or sequencing UI elements—require zero manual alignment math.

---

## 1. Context-Aware Text Splitting

### The Traditional Problem
In traditional motion tools (After Effects, Premiere), breaking a sentence into 3 parts requires duplicating the text layer 3 times, manually deleting words from each layer, and eyeballing horizontal positions to re-create the original sentence layout.

### Motion Studio Default Behavior
When a user selects a Text element and invokes **"Split into Chunks"** or **"Split into Words"**:

```
[ "Hey Team, I've got something big for you, wanna see what it is?" ]
                               │
                               ▼ 1-Click Split
┌─ <Group layout="flex-column" autoLink=true> ──────────────────────────────┐
│  Chunk 1: "Hey Team,"                     [0.00s - 0.80s] (Pop In)         │
│  Chunk 2: "I've got something big for you,"[0.80s - 1.60s] (Slide Up)      │
│  Chunk 3: "wanna see what it is?"         [1.60s - 2.40s] (Blur In)        │
└────────────────────────────────────────────────────────────────────────────┘
```

1. **Automatic Container Transformation**:
   * The original `<TextLayer>` is instantly converted into a `<Group>` container.
   * The text segments become child `<Chunk>` layers inside that group.
2. **Context-Aware Flex Layout**:
   * **Splitting by Sentences / Lines**: Configures the parent group as `flex-direction: column` with `gap` matching original line-height spacing.
   * **Splitting by Words / Custom Spans**: Configures the parent group as `flex-direction: row` with `flex-wrap: wrap` and `column-gap` matching the font's natural space character width.
3. **Zero Visual Shift Guarantee**:
   * Font family, font size, line-height, letter-spacing, and text-align are inherited identically.
   * The visual appearance on the canvas has **0 pixels** of shift before and after splitting.
4. **Instant Animation Cascade**:
   * **Auto-Link (🔗)** is turned **ON** by default on the group's timeline track.
   * A default stagger interval of `0.15s` is applied between consecutive chunks.

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
3. **Modifier Key Constraints**:
   * Holding `Shift` while dragging constrains motion to strict horizontal, vertical, or 45-degree diagonal axes.
   * Holding `Shift` while resizing enforces 1:1 aspect ratio constraint.
   * Holding `Shift` while rotating snaps angles to 15-degree increments (`0°`, `15°`, `30°`, `45°`, `90°`).

---

## 8. Transactional Undo/Redo Engine

To provide a fatigue-free editing experience, the undo/redo stack strictly manages state transactions:

1. **Continuous Slider & Drag Batching**:
   * Dragging a slider (e.g. opacity from `100%` to `40%`) or dragging an element across the canvas generates hundreds of continuous updates.
   * Motion Studio records exactly **one** undo transaction when the user releases the pointer (`pointerup`).
   * Pressing `Ctrl+Z` reverts directly to the value before the drag started, rather than stepping backward pixel-by-pixel.
2. **Viewport & Playhead Exclusion**:
   * Panning the canvas (`Space + Drag`), zooming (`Ctrl + Wheel`), or scrubbing the timeline does **not** push steps to the document undo history.
   * Pressing `Ctrl+Z` strictly undoes changes to the project content and animation parameters, ensuring the user's focus and viewport remain undisturbed.

