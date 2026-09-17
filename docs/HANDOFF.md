# HANDOFF.MD: Comprehensive Canvas Interaction & Architecture Handoff

> [!CAUTION]
> **CRITICAL MANDATE FOR THE NEXT AGENT / NEXT THREAD**:
> **DO NOT JUMP INTO CODE. DO NOT RUSH TO CODE PATCHES.**
> The user explicitly instructed: *"okay just stop coding for a second, do you not understand whta i'm saying for past few messages ? just write a handoff, for that, you will do that in the next thread"*.
>
> The user's frustration is that past agents have been playing reactive "whack-a-mole"—rushing to write quick code fixes and running test scripts instead of fundamentally stepping back, thinking like a world-class systems designer (Figma / Jitter), and rigorously mapping out the complete interaction matrix, states, visual affordances, and edge cases across the entire canvas first.
>
> **Your first task in the next thread is purely architectural, research-driven, and conceptual alignment.** Do not write code until the complete Interaction & State Matrix is designed, reviewed, and approved by the user.

---

## 1. Context & Why the User Stopped Us

The user is directing this project from mobile, holding high standards for a professional motion graphics tool on par with **Figma** and **Jitter.video**.

When testing basic interactions, critical usability flaws became apparent:
1. Multi-line text was overflowing because fixed pixel heights were accidentally written to the AST during horizontal resizing, causing the yellow selection box to only surround row 1 while rows 2 and 3 overflowed.
2. Clicking inside text or cards failed to drag/move elements because drag handlers were absent on the inner body.
3. The UI had redundant textareas in the right sidebar instead of relying on pure on-canvas typography editing.
4. Canvas elements felt disconnected from a coherent hierarchy and coordinate system.

The agent repeatedly rushed to patch individual symptoms in code and celebrate with automated screenshots, missing the user's fundamental demand: **stop rushing, rethink the entire UX holistically, design for every type of situation and specific case, document it thoroughly, and verify the model with the user first.**

---

## 2. The Core Mission for Next Thread

In the next thread, your goal is to produce and present the **Comprehensive Canvas Interaction & State Matrix**.

You must think through, categorize, and specify:
1. **Every type of canvas element**: Root Text, Chunks inside Flex, Container Cards/Frames, Vector Shapes, Media Images/Videos.
2. **Every interaction mode**: Design Mode (resting state composition) vs. Animate Mode (temporal motion & keyframing).
3. **Every interaction event**: Hover, Click, Double-Click, Pointer Down, Drag, Pointer Up, Right-Click, Marquee Drag, Keyboard Modifiers (`Shift`, `Alt`, `Ctrl`/`Cmd`, `Space`).
4. **Every specific case and edge case**: How each element behaves under those events.

---

## 3. The Required Interaction & State Matrix Checklist

The next agent must map out and present clear answers and specifications for the following domains:

### Domain A: Text Lifecycle & Auto-Sizing Paradigms (Figma Model)
* **Creation (`T`)**: 1-click on canvas vs. click-and-drag bounding box.
* **Auto-Width vs. Auto-Height vs. Fixed Dimensions**:
  * *Auto-Width*: Default for single-click creation. Width grows horizontally as text is typed. Hitting `Enter` adds a newline; width becomes the longest line; height expands.
  * *Auto-Height*: Triggered when user resizes width via East/West handles or inputs a fixed `W`. Text wraps at boundary width; height expands dynamically downward. `height` is strictly `auto`.
  * *Fixed Size*: User explicitly resizes North/South handles. Text overflows or clips.
* **Inline Editing State**:
  * Caret positioning, text selection, and typography mirroring.
  * `Enter`: Inserts newline in multi-line text.
  * `Escape` or Click Outside: Commits text, cleans up ghost/empty layers, returns to selected state.
  * `Ctrl + Enter`: Splits at caret or commits.
  * `Tab`: Advances to next chunk or indents.
* **Semantic Splitting**:
  * Highlight-to-Split: User selects a substring $\to$ HUD displays `[ ✂ Split Selection ]` $\to$ slices into 3 chunks with 0px layout displacement inside a flex group.
  * Split into Words / Chunks: Punctuation and word-boundary tokenization.
* **Reverse Splitting (Notion/Google Docs model)**:
  * `Backspace` at index 0 of Chunk $N$: Merges into Chunk $N-1$.
  * `Delete` at end of Chunk $N$: Merges Chunk $N+1$ into Chunk $N$.
  * Dissolve container: When only 1 chunk remains, automatically unpack group back into a single text layer.

### Domain B: Selection, Hover, & Drag Surfaces
* **Visual States**:
  * *Idle / Unselected*: Clean element rendering, no borders.
  * *Hovered*: Subtle 1px cyan/gold hairline highlight indicating clickability.
  * *Selected (Single)*: Yellow `TransformBox` with 8 resize handles, rotation pin, live dimension badge ($W \times H$), and Contextual HUD docked 10px above.
  * *Selected (Multi)*: Enclosing union bounding box surrounding all selected layers.
  * *Deep Selected*: Clicking inside a group selects the group; double-clicking or `Ctrl+Click` deep-selects the child chunk. `Shift+Enter` ascends to parent.
### Domain B: Selection, Hover, & Drag Surfaces (Default Canvas Behaviors)
* **Default Tool**: Pointer / Move tool (`V`) is active by default.
* **Canvas Event Triad**:
  1. **Select**: Left-clicking any element selects it immediately.
  2. **Move**: Clicking and dragging an element moves it across the canvas with magnetic snapping guides.
  3. **Marquee Multi-Select (Click & Hold Left Drag)**: Clicking on empty canvas and holding left-click while dragging draws a translucent selection box (lasso). All intersecting/enclosed elements become selected together.
  4. **Modifier Keys**: Holding `Shift` enables additive selection (adding/removing elements from current selection). Holding `Space` pans the canvas viewport.
* **Visual States**:
  * *Idle / Unselected*: Clean element rendering, no borders.
  * *Hovered*: Subtle 1px cyan/gold hairline highlight indicating clickability.
  * *Selected (Single)*: Yellow `TransformBox` with 8 resize handles, rotation pin, live dimension badge ($W \times H$), and Contextual HUD docked 10px above.
  * *Selected (Multi)*: Enclosing union bounding box surrounding all selected layers with collective dragging.
  * *Deep Selected*: Clicking inside a group selects the group; double-clicking or `Ctrl+Click` deep-selects the child chunk. `Shift+Enter` ascends to parent.
* **Pointer & Grab Zones**:
  * *Center Body*: `cursor-move`, captures drag, updates $(X, Y)$ with magnetic snapping.
  * *Perimeter Edges*: 4 perimeter strips (5px thickness) for grabbing borders.
  * *8 Resize Handles*:
    * Corner handles (`nw`, `ne`, `se`, `sw`): Proportional scaling (or 1:1 with `Shift`).
    * Side handles (`n`, `s`, `e`, `w`): Directional resizing. For text, `e`/`w` changes width with auto-height reflow.
  * *Rotation Pin*: 24px above top center, allows 360° rotation (15° increments with `Shift`).

### Domain C: Coordinate Systems & Hierarchy
* **Root Canvas vs. Container Group**:
  * Root elements use absolute canvas coordinates $(X, Y)$ relative to canvas $(0, 0)$ (e.g. $1920 \times 1080$).
  * Grouped children use relative flex/layout coordinates.
* **Grouping (`Ctrl+G`) & Ungrouping (`Ctrl+Shift+G`)**:
  * Grouping computes minimal enclosing bounding box $(X_{min}, Y_{min})$, places `<Group>` at $(X_{min}, Y_{min})$, and translates children coordinates:
    $$\Delta X_i = X_i - X_{min}, \quad \Delta Y_i = Y_i - Y_{min}$$
  * Ungrouping reverses the calculation with zero visual jump on canvas.
* **Left Sidebar Drag-and-Drop**:
  * Dragging layers up/down reorders DOM z-index with a visual drop hairline.
  * Dragging onto a group nests the layer inside.

### Domain D: Contextual HUD vs. Right Sidebar Separation (Direct Jitter Reference)
* **Design Philosophy: "Minimal in Layout, Not Color"**:
  * The layout is extremely clean, dense, and uncluttered: no bloated cards, no nested wrappers, no redundant textareas.
  * Labels are placed directly above input pairs (`Position`, `Dimensions`, `Opacity` / `Corner radius`, `Weight`).
  * Dark pill inputs with integrated icons (`X`, `Y`, `W`, `H`, `▦`, `⌜⌟`, `≡`).
* **Right Sidebar Layout (Directly from User Reference Screenshots)**:
  * **Header**: Layer Name (`Rectangle`), `⬚` (Style library), `◑` (Invert), `❏▾` (Duplicate dropdown), `⛶` (Frame bounds).
  * **Position**:
    * Alignment bar: 6 compact icon buttons (`|←`, `╪`, `→|`, `₸`, `╫`, `╨`).
    * Position: `X [-102]` and `Y [-168]` side-by-side dark pill inputs.
    * Rotation: `∠ 0°` plus 3 buttons: Rotate 90° (`↻`), Flip Horizontal (`▷|◁`), Flip Vertical (`▵/▿`).
  * **Layout**:
    * Dimensions: `W [185]` and `H [154]` with Aspect Ratio lock button (`⧉`).
  * **Appearance**:
    * Header icons: `👁` and `💧`.
    * Two columns: `Opacity` (`▦ 100%`) and `Corner radius` (`⌜⌟ 17`) with 4-corner expander button (`⛶`).
  * **Fill**:
    * Swatch square, Hex string (`E64E4E`), Opacity (`100%`), Eye visibility toggle (`👁`), Remove (`—`).
  * **Stroke**:
    * Swatch, Hex (`000000`), Opacity (`100%`), Eye toggle (`👁`), Remove (`—`).
    * Row 2: `Position` dropdown (`Inside ▾`), `Weight` input (`≡ 1`), stroke style settings (`⧉`).
  * **Effects (`+` dropdown)**:
    * 1. `Inner shadow`
    * 2. `Drop shadow`
    * 3. `Layer blur`
    * 4. `Background blur`
    * 5. `Noise`
    * 6. `Texture`
    * 7. `Glass`
    * 8. `Shader` (Beta)
  * **Export (`+`)**: Resolution multipliers and format selector.
* **Contextual HUD (Docked above canvas element)**:
  * Fast micro-actions: Color swatch, Font Family, Font Size, Bold/Italic, Kinetic Split button, Motion preset shortcut.
  * Strict separation: Never duplicate full inspector panels on canvas. Keep it ultra-fast and lightweight.

---

## 4. Current State of the Codebase

* **Repository**: [`samirx20/choreo`](https://github.com/samirx20/choreo.git) on branch `main`.
* **Build**: `npm run build` compiles cleanly with 0 TypeScript errors.
* **Tests**: All 16 Vitest unit tests pass (`npm test`).
* **Recent Patches**:
  * `styleUtils.ts`: Added `isTextOrChunk` height protection (`minHeight` + `height: auto`).
  * `TextRenderer.tsx`: Implemented CSS Grid mirror auto-sizing and `Escape` commit edit.
  * `TransformBox.tsx`: Added interactive center body drag surface and horizontal vs vertical resize protection.
  * `DesignInspector.tsx`: Added 1-click `Auto` height reset badge for text layers.
* **Automated Visual Snapshots Available**:
  * `08_multiline_selection_box.png`: Demonstrates yellow box wrapping all 3 lines of text.
  * `09_dragged_moved_position.png`: Demonstrates element moved across canvas via center drag.
  * `10_fixed_width_350_wrap.png`: Demonstrates fixed width 350 with auto-height reflow.
* **Existing Documentation**:
  * [docs/UI_PANELS_SPEC.md](file:///c:/Users/Sam/Documents/CODE/MOTION-STUDIO/docs/UI_PANELS_SPEC.md)
  * [docs/CANVAS_UX_SPEC.md](file:///c:/Users/Sam/Documents/CODE/MOTION-STUDIO/docs/CANVAS_UX_SPEC.md)
  * [docs/DEFAULT_BEHAVIORS_AND_INTERACTIONS.md](file:///c:/Users/Sam/Documents/CODE/MOTION-STUDIO/docs/DEFAULT_BEHAVIORS_AND_INTERACTIONS.md)
  * [docs/CONTEXT_MENU_MATRIX.md](file:///c:/Users/Sam/Documents/CODE/MOTION-STUDIO/docs/CONTEXT_MENU_MATRIX.md)
  * [walkthrough.md](file:///C:/Users/Sam/.gemini/antigravity/brain/b0d31a8d-1e9b-49f8-96f4-11895821e802/walkthrough.md)

---

## 5. First Action for the Next Thread

When starting the next thread:
1. **Acknowledge the mandate**: Explicitly state to the user that you are not touching code and will not rush.
2. **Present the comprehensive Canvas Interaction & State Matrix**: Lay out every situation, case, and state machine transition for text, containers, selection, and drag/resize.
3. **Align with the user**: Gather their feedback and refine the specification together before any implementation begins.
