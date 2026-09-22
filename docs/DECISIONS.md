# Motion Studio: Architecture & Design Decisions
> **Status:** Working Draft — Pending refinement and alignment with Core Philosophy.  
> **Last Updated:** September 20, 2026

---

## 1. Executive Context & Motivation

### The Problem with Existing AI Motion Graphics
Programmatic video creation engines like Remotion force an AI agent to write low-level code (React, TSX, CSS, frame interpolation math). This forces the agent to simultaneously act as:
1. **A Graphic Designer** (guessing typography, paddings, colors without spatial vision).
2. **A Layout Engine** (hallucinating pixel coordinates, causing text overlaps and clipping).
3. **A Frame Counter** (mental clock drift across multiple elements and sequences, producing black frames and broken transitions).
4. **A Physics Solver** (guessing cubic-bezier control points, producing stiff PowerPoint-like or floaty, rubber-band animations).

### The Working Thesis
* **Figma's model is wrong for this domain**: Figma is optimized for static UI design and screen flows, not temporal motion graphics.
* **Jitter's model is the right foundation**: An element is a visual object at rest, and multiple animation actions (`In`, `Emphasis`, `Out`) are applied to it.
* **The Evolution**: To reach Apple and Google product showcase quality, Jitter's model must be elevated with **state-based storyboards**, **modular video grids**, **continuous momentum conservation ($C^1$ continuity)**, **G2 continuous curvature (squircles)**, and **telephoto 3D camera staging**.

---

## 2. Agreed Architectural Decisions (Summary of Working Consensus)

### Decision 1: AI Abstraction Model — State-Based Storyboard & Step-by-Step Tool Calling
* **Storyboarding by Beats**: The video is structured as a sequence of high-impact **Beats / States** (e.g., Beat 1: Intro Hero, Beat 2: Zoom to Screen, Beat 3: Split-Screen Specs, Beat 4: Outro).
* **Magic Move by ID**: Elements sharing the same `id` across consecutive beats automatically morph and transition their properties (position, scale, rotation, color, camera angle) using spring physics.
  * Elements present only in the target beat animate in via their `enter` preset.
  * Elements absent in the target beat animate out via their `exit` preset.
* **Step-by-Step Tool Calling**: The AI interacts with the engine via atomic, schema-validated tool calls (`create_beat`, `place_element`, `update_element`, `get_contact_sheet`) rather than dumping a massive, error-prone JSON document in a single prompt.
* **Two-Stage Generation Pipeline**:
  1. *Stage 1 (Director AI)*: Develops the narrative beat sheet, copy, theme, and staging intent.
  2. *Stage 2 (Choreographer AI)*: Calls tools step-by-step to construct the beats and elements.

---

### Decision 2: Spatial Layout — Aspect-Ratio Matched Modular Video Grid
* **No Raw Pixel Coordinates**: Eliminate coordinate hallucinations (`x: 742px, y: 384px`) by adopting a discrete video grid:
  * **16:9 Widescreen**: $16 \times 9$ modular grid (1 unit = 1 aspect block).
  * **9:16 Vertical (Reels/Shorts)**: $9 \times 16$ modular grid.
  * **1:1 Square**: $12 \times 12$ modular grid.
* **Box-Fit & Auto-Scaling**:
  * Elements occupy integer grid cells (e.g., `col: 2, row: 2, colSpan: 12, rowSpan: 4`).
  * Typography and cards automatically fit and scale within their assigned grid cells.
  * If text is long, it auto-scales down or wraps cleanly. Zero overflow, zero clipping, zero collisions.
* **Safe Margins**: 1-unit outer margins inherently protect content from social media overlays (TikTok/Reels UI) and broadcast safe zones.

---

### Decision 3: Motion & Physics Pipeline — Analytical Springs & Momentum
* **Closed-Form Second-Order Harmonic Oscillators**:
  $$\ddot{x}(t) + 2\zeta\omega_0 \dot{x}(t) + \omega_0^2 x(t) = 0$$
  * Deterministic and scrubbable in $O(1)$ constant time at any timestamp $t$.
  * Frame-rate independent (identical behavior at 24fps, 30fps, 60fps, 120fps).
* **Golden Showcase Defaults**:
  * Damping ratio $\zeta = 0.72$ (Butterworth underdamped profile), delivering a snappy response with $+3.8\%$ subtle overshoot.
* **Velocity Inheritance ($C^1$ Continuity)**:
  * When a transition interrupts an existing movement, the initial velocity $\dot{x}(0) = v_{\text{prev}}$ is preserved, preventing jarring stops or velocity resets.
* **Parametric Overrides**:
  * AI can use semantic tokens (`snappy`, `bouncy`, `smooth`, `heavy`) or pass explicit spring parameters: `{ stiffness: 220, damping: 20, mass: 1.2 }`.

---

### Decision 4: Cinematography & Camera Staging
* **Beat-Level Camera Framing**:
  * Each beat defines camera parameters (e.g., target grid region, 3D tilt `[15, -20, 0]`, zoom `1.2`).
  * The camera springs smoothly between beats using damped quaternion spherical interpolation (`slerp`).
* **Telephoto Showcase Standard**:
  * Virtual cameras use long focal lengths ($50\text{mm}-85\text{mm}$ equivalent, FOV $\approx 28^\circ-39^\circ$).
  * Compresses depth, eliminates fisheye distortion, and preserves parallel chamfers on device models.

---

### Decision 5: Optical & Typographic Hierarchy
* **Direct Border Radius & Corner Shaping**:
  * Clean, intentional corner radius controlled directly via standard `borderRadius` (uniform or per-corner), avoiding artificial superellipse SVG overlay wrappers or redundant G2 options.
* **Metric-Aligned Baseline Mask Reveals**:
  * Text reveals clip strictly along font metric baselines and descenders (using parsed glyph metrics), ensuring letters emerge cleanly without clipping descenders ("g", "y", "p").
* **Dual Elevation Shadows**:
  * Tight ambient contact shadow ($2-4\text{px}$ blur, $30-40\%$ opacity) + dispersed elevation shadow ($30-60\text{px}$ blur, $10-15\%$ opacity, color-tinted).

---

### Decision 6: Rendering Engine Architecture
* **Hybrid 2D + 3D Compositing**:
  * **2D Canvas (Pixi.js v8)**: High-performance 2D vector graphics, text, G2 squircle geometry, and GPU filters.
  * **3D Stage (Three.js)**: Device mockups (iPhone 16 Pro, MacBook Pro, iPad Pro, glass cards) with PBR materials, dynamic specular lighting, and telephoto camera.
  * **FBO Texture Projection**: The 2D screen design from Pixi is rendered into an off-screen Framebuffer Object and mapped directly to the 3D model's screen geometry in real time.

---

### Decision 7: Studio UI Transformation — Storyboard Strip
* **Retire Micro-Keyframe Timeline**: Replace multi-track timeline dragging with a **Storyboard Strip (Beat Strip)** inspired by Apple Keynote and Pitch.
* **Beat Thumbnails & Transition Pills**:
  * Each beat is a card showing resting visuals.
  * Interactive transition pills between cards display spring curves and durations.
  * Scrubbing between cards previews the 60fps Magic Move transition.

---

### Decision 8: Guardrails, Validation, & Perceptual Feedback
* **Real-Time Auto-Correction**:
  * If the AI specifies out-of-bounds coordinates (e.g., `col: 14, colSpan: 5` on a 16-col grid), the tool auto-clamps to valid bounds and returns a constructive diagnostic message.
* **Contact Sheet Generation**:
  * The AI can invoke `get_contact_sheet()` to receive a visual multi-beat image grid, allowing multimodal inspection of balance, contrast, and layout.
* **Pre-Flight AST Linter**:
  * Static analyzer checks for black frames, invisible layers, and duration overflows before rendering.

---

### Decision 9: Visual Properties — Checkbox (Single Property Once) vs. Plus Stack
* **Enforce Checkbox Model (Jitter-style)**:
  * Visual properties are single, toggleable properties (`[x] Fill`, `[x] Stroke`, `[x] Shadow`, `[x] Layer blur`, `[x] Background blur`, `[x] Glass`).
  * Figma's `+` model (stacking multiple fills, strokes, and shadows on a single layer) is rejected.
* **Why this is critical for AI Agents**:
  * **Zero Animation Ambiguity**: When an animation targets `color` or `stroke`, it has an unambiguous 1:1 target property on the element. No array indexing (`fills[2]`) or blend mode hallucinations.
  * **Flat, Unbreakable Schema**: A flat property schema (`fillColor`, `strokeWeight`, `shadowBlur`) is significantly easier for AI agents to generate and modify without schema truncation.
  * **Multiple Animations Supported**: Elements support an array of timeline animation actions (`In`, `Custom`, `Out`), each cleanly targeting one of the element's distinct single properties.
* **Smart Shadows**: For high-end dual elevation shadows (tight contact + dispersed ambient), the single `shadow` property internally renders dual-component shadows using an `elevation` parameter.

#### Decision 10: Motion-First Reactive Layout & Container Hugging
* **The Motion-First Imperative**:
  * In static UI (Figma), elements are placed at rest. In video motion graphics, content is constantly in flux (text typing out word-by-word, numeric counters rolling, media loading).
  * Manually keyframing background containers to expand alongside animated content is tedious, brittle, and impossible for AI agents to guess accurately.
* **Reactive Container Hugging (`mode: 'hug'`)**:
  * Containers (e.g. chat bubbles, search bars, modal panels) can declare `mode: 'hug'` tied to a child or target driver element (e.g., `textLayerId`).
  * **Design at Rest (Final State)**: The composition is designed at its final resting state (full text written, container at full size).
  * **Dynamic Expansion Envelope**: As the text types out, the container's bounds dynamically expand to match the content's instantaneous measured bounding box, plus padding.
  * **Spring-Filtered Cushioned Expansion**: To prevent harsh, rigid jumps on every character or word, the container's width/height adjusts via a closed-form second-order harmonic oscillator spring ($\zeta \approx 0.72, \omega_0 \approx 20\text{ rad/s}$), providing a fluid, organic cushion.
  * **Anchor Locking**: Containers expand relative to an invariant anchor (`top-left`, `bottom-left`, `center`, etc.) so the origin remains visually grounded.

---

### Decision 11: Smart Typographic Choreography & Invariant Splitting
* **The Descender & Metric Problem**:
  * Naive clipping masks placed along font baselines chop descenders ("g", "y", "p", "q", "j").
  * Splitting a paragraph into words using arbitrary spacing (e.g. `fontSize * 0.28`) causes layout shift, broken kerning, and line wrapping discrepancies compared to the unsplit text.
* **0.0px Visual Shift Guarantee**:
  * Converting a static `TextLayer` into an animated split group (by word, sentence, or line) must produce zero visual drift ($< 0.01\text{px}$) in the resting state.
  * **True Font Space Advance**: Inter-word spacing uses the exact space character (`U+0020`) advance width measured from the canvas font metrics, never hardcoded percentages.
  * **Punctuation Binding Rule**: Punctuation delimiters (`,`, `.`, `!`, `?`, `:`, `;`) are strictly bound to the preceding word chunk, preventing orphan punctuation on wrapped lines.
* **Metric-Aligned Baseline Mask Reveals**:
  * Line-box clipping masks derive their height from true font metrics: $\text{ascent} + |\text{descent}| + 2 L_{\text{half}}$ (half-leading).
  * Text slides up from behind the baseline with snappy spring physics ($\zeta = 0.72$) while descenders remain 100% visible and unclipped at rest.
* **Word Replacement / Morphing with Spring Reflow**:
  * For rotating headlines (`"The [Fastest / Smartest / Most Powerful] platform"`), words enter/exit (flip, roll, scale-fade) while trailing text (suffix) smoothly reflows horizontally using the same analytical spring physics, eliminating abrupt layout snapping.
* **Typewriter with Dynamic Cursor Follower**:
  * An animated caret/cursor tracks the active typing tip across proportional fonts and multi-line wrapping using precomputed cumulative glyph advance tables.

---

### Decision 12: Relational Motion Primitives
* **Connected Leader Lines (`mode: 'leader-line'`)**:
  * Dynamic arrows or lines that connect two moving elements (e.g., a technical annotation pointing to a 3D device or moving UI element).
  * As either element moves, scales, or rotates, the leader line dynamically re-solves its start and end anchor points with optional animated dash flows.
* **Dynamic Pins with Inertia Lag (`mode: 'pin'`)**:
  * Auxiliary callouts pinned to a parent element.
  * Includes an optional physical inertia lag (`expansionPhysics: 'spring'`) so callouts drag slightly behind fast movements and settle into place with natural overshoot.
* **Value-Driven Remapping (`mode: 'remap'`)**:
  * A numeric driver directly drives visual properties of other elements (e.g., progress bar width or gauge sweep angle) through a normalized transfer function $[v_{\min}, v_{\max}] \to [y_{\min}, y_{\max}]$.

---

### Decision 13: Impeccable Craft & Anti-Pattern Floor
Per the repository's design standards, the engine and AI choreography pipelines strictly ban lazy UI tropes, SaaS cliches, and decorative gimmicks:
* **ABSOLUTE BAN: Eyebrows, Kickers, & Category Badges**:
  * Never place an eyebrow label or category kicker above a headline (e.g., no "AI POWERED", "FEATURE", or pill tags floating above titles). Headings carry their own weight; delete the label and let the heading speak.
* **NO DECORATIVE GIMMICKS**:
  * **No Gradient Text**: Text emphasis comes from weight or scale, never rainbow/metallic text gradients.
  * **No Hacker/Scramble Decrypt**: Monospace character scrambling is a costume, not content.
  * **No Gratuitous 3D Grid Floors**: Backgrounds are surfaces textured only from the subject's world; never throw in a 3D floor grid or cyber lines as generic filler.
  * **No Fake Sparklines or Empty Activity Rings**: Data visualizations must represent real data, never stand in as generic decoration.
  * **Single Elevation System**: Never combine a 1px border under a wide soft shadow ("ghost card"). Declare elevation once: clean border OR physical shadow.
* **MOTION DISCIPLINE: One Authored Moment**:
  * Showcase motion graphics must have **one authored moment per beat**, not a scattershot of ten competing entrances, pulses, and floating pills.

---

### Decision 14: Literal Jitter UI & Layout Architecture
To ensure intuitive, distraction-free motion choreography and 1:1 visual familiarity with modern motion tools:
* **Literal Jitter Chrome & Spatial Layout**:
  * **Top Navigation Bar (`#111113`, 48px)**: Dark charcoal bar hosting only real, supported tools: Back, Play/Pause, Text `T`, Rectangle `□`, Ellipse `○`, Star `☆`, Image `🖼`, and AI `✦` (unsupported placeholder tools like Audio, Pen, and Comment are excluded). Centered project title dropdown, right zoom `100% ▾` and purple export pill button (`#7c3aed`).
  * **Left Layers Sidebar (`#ffffff`, 240px)**: Clean outliner with top `▶ Scene 1` banner (solid purple `#6d28d9` when selected) and indented layer rows (`□`, `○`, `T`, `🖼`) with purple selection highlight.
  * **Center Canvas Viewport (`#f3f3f5`)**: Soft light gray backdrop, centered pure white artboard with subtle drop shadow, purple selection border (`#7c3aed`), and top artboard header `▶ Scene 1 · 4s` and sparkle `✦`. No floating canvas toolbars or floating zoom widgets.
  * **Right Inspector Panel (`#ffffff`, 280px)**: Full-width top segmented switcher `[ Design | Animate ]` with solid black `#111113` active tab.
    * *Design Tab*: Layer header, 6 alignment icons, `Layout` (`Position`, `Size`, `Angle`), `Opacity`, `Corner`, and single-property checkbox stack (`Fill`, `Stroke`, `Shadow`, `Layer blur`, `Background blur`, `Glass`).
    * *Animate Tab*: Two-mode hierarchical architecture (see Decision 15).
  * **Bottom Timeline Panel (`#ffffff`)**: Clean white timeline with left play `▶` and loop `🔁` controls, red playhead pill `0.00` with vertical red playhead line, and clean second ticks (`1s`, `2s`, `3s`...).

---

### Decision 15: Animation Inspector & Timeline Selection Architecture
* **Two-Mode Hierarchical Animate Inspector**:
  1. **Focused Animation Properties Inspector (`selectedClipIds.length > 0`)**:
     * Clicking an animation in the timeline or choosing "All Animation Properties" in the applied list switches directly to this view.
     * Displays **only animation properties**:
       * Breadcrumb header: `← Back to Element`, type badge (`In`, `Action`, `Exit`), duplicate and delete actions.
       * **Timing**: Start time and Duration (`ScrubbableInput` with drag-to-scrub).
       * **Dynamics & Easing**: Curve preview, 5 primary profiles (`smooth`, `snappy`, `bouncy`, `linear`, `spring`), and harmonic spring solvers (Stiffness, Damping, Mass).
       * **Motion / Transform Parameters**: Direction (Up, Down, Left, Right), Distance (px), Scale Amount (x), Rotation (°), Loop toggle, and Intensity.
       * **Kinetic Typography**: If text layer, Split By (`Whole Block`, `By Word`, `By Character`) and Stagger delay (s).
  2. **Element Animate Overview (`selectedClipIds.length === 0` && layer selected)**:
     * Shows layer header and purple `+ New Animation` button opening presets drawer.
     * **Applied Animations List**:
       * Renders distinct, normalized clips via `getLayerClips` (zero duplicates).
       * **Expandable Collapsed Cards by Default**: Each animation renders as a sleek collapsed row (`[ ✨ Pop · 0.6s  ▾  🗑 ]`).
       * Clicking row header expands it to show quick timing inputs and easing pills, plus an `All Animation Properties →` button to navigate to the focused inspector.
     * If 0 animations applied: Shows Jitter `Idea → Motion` AI card with `Animate with AI` button.
* **Timeline Integration**:
  * Clicking or interacting with any clip in `DraggableClip.tsx` automatically switches `uiMode` to `"animate"` and sets `selectedClipIds: [clip.id]`.

### Decision 16: Canvas Text Centering, Native Inline Selection, & Typography Inspector Architecture
* **Canvas Text Box Centering & Sizing**:
  * New text layers land with snug initial dimensions (`width: 240, height: 70`) and centered alignment (`textAlign: "center"`, `verticalAlign: "middle"`).
  * Resizing the bounding box to any dimension (e.g. 918 × 496) automatically transitions to `boxMode: "area"` and `textSizing: "fixed"`, respecting explicit width and height in `styleUtils.ts` and centering text both horizontally and vertically via `display: flex; align-items: center; justify-content: center; text-align: center`.
* **Native Canvas Text Selection & Editing**:
  * Double-clicking text enters edit mode.
  * During editing, `TransformBox` disables all border grab edges, rotation controls, and resize handles (`pointerEvents: "none"`), ensuring 100% of pointer events reach the text editor.
  * Pointer and mousedown events stop bubbling (`e.stopPropagation()`), preventing canvas marquee selection from cancelling text selection.
  * Caret placement, substring selection, word double-clicking, and paragraph multiline editing work natively without selecting all text or forcing retyping.
* **Typography Inspector (Sidebar)**:
  * **Removed text content input from sidebar**: Text is edited directly on canvas.
  * Full typographic controls:
    * Font Family dropdown (`Inter`, `Roboto`, `SF Pro`, `Poppins`, `Montserrat`, `Playfair Display`, `Space Grotesk`, `Plus Jakarta Sans`, `Fira Code`, `Georgia`, `System`).
    * Font Weight dropdown (Light 300 to Black 900).
    * Font Size and Line Height (`ScrubbableInput`).
    * Letter Spacing (`ScrubbableInput`) and Sizing Mode (`Auto W`, `Auto H`, `Fixed`).
    * Text Alignment (Left, Center, Right, Justify).
    * Vertical Alignment (Top, Middle, Bottom).
    * Text Case (None, `AA`, `aa`, `Aa`).
### Decision 17: Canvas Artboards, Dedicated Timeline, & 1:1 Jitter Animation Inspector
* **Top Navigation Bar Alignment**:
  * Removed Play/Pause button from top creation toolbar. Playback belongs strictly in the timeline.
  * Added **Artboard Tool** (`LayoutGrid` icon) as tool #2 in the toolbar: `[ Select (V), Artboard (A), Text (T), Rectangle (R), Ellipse (O), Star, Image (🖼), AI (✦) ]`.
* **Canvas Artboard Interaction & Multi-Artboard Architecture**:
  * Artboards (`Screen`) have explicit coordinates (`x`, `y`), dimensions (`width`, `height`), and `backgroundColor`.
  * Artboards can be selected by clicking their header (`▶ Scene 1 · 4s`) or artboard frame.
  * Dragging the header moves the artboard across the canvas with real-time feedback.
  * Clicking with the Artboard tool on the canvas instantiates a new artboard at that location (`x: canvasX, y: canvasY`).
  * In Design Inspector: when an artboard is selected, Position `X` and `Y` are editable via `ScrubbableInput`.
* **Dedicated Timeline**:
  * Removed the Storyboard strip and toggle button completely from `TimelinePanel.tsx`.
  * Preserved a 100% clean, dedicated timeline with ruler, playhead, play/pause transport, loop, and track rows.
  * When an animation clip is selected:
    * The left track header turns vibrant purple (`#6d28d9` / text-white) showing `⚡ {layer.name} · {clip.name || clip.preset}`.
    * The clip pill in `DraggableClip.tsx` renders in vibrant purple (`bg-[#6d28d9] text-white border-[#5b21b6] shadow-sm`), matching Jitter screenshot `media_1789878344443.png`.
* **1:1 Jitter Animation Inspector (`media_1789878344443.png`)**:
  * **Header**: `⚡ {preset}` + `Change` button (opens preset drawer to swap preset) + `···` dropdown menu (Duplicate, Delete).
  * **Mode**: Segmented control `[ In | Out ]` toggling entrance vs exit mode.
  * **Text animation Section**:
    * `Apply effect to`: dropdown (`Letters`, `Words`, `Lines`, `All`).
    * `Order`: dropdown (`Forward`, `Backward`, `Random`, `From center`, `To center`).
    * `Delay`: scrubbable ms input (e.g. `150ms`).
    * `Smoothing`: dropdown or click-to-open 6-card Jitter Easing Popover.
  * **6-Card Easing Popover**:
    * Top tabs: `[ ∿ Curve | ⊞ Grid ]` and `+` custom curve button.
    * 6 curve cards:
      1. `+ Custom` (with cubic bezier curve edit)
      2. `∿ Smooth`
      3. `■ Natural`
      4. `⌒ Slow down`
      5. `ノ Accelerate`
      6. `∿ Elastic`
      7. `∿ Bounce`
      8. `∿ Overshoot`
      9. `╱ None` (highlighted bright blue `#3b82f6` with white line and white text when active).
    * **Interactive Curve & Physics Tab (`[ ∿ Curve | ⊞ Grid ]`)**:
      * Includes interactive SVG Bézier curve editor with draggable handles (`cp1`, `cp2`) and coordinate inputs.
      * Includes Spring Dynamics controls (`Stiffness`, `Damping`, `Mass`) allowing complete fine-tuning of any ease setting.
      * Each card in the Grid features a quick configure sliders button (`Sliders`) to directly edit its curve and physics.

---

### Decision 12: Unified Multi-Artboard Canvas, TransformBox Pasteboard Overflow & Inspector Polish
* **Multi-Artboard Coordinate Architecture**:
  * Screens/Artboards are positioned in World/Pasteboard space (`screenX = screen.x ?? idx * (width + 120)`).
  * Element visual styles (`style.x`, `style.y`) are strictly Artboard-Local coordinates.
  * `ScreenRenderer` uses `overflow: hidden` to clip element artwork at the artboard boundaries.
  * `TransformBox` is rendered at Canvas Frame level with `screenOffset={{ x: screenX, y: screenY }}`. When an element is moved partially outside an artboard, its artwork is clipped by the artboard canvas, but its purple selection box and resize handles extend into the pasteboard and remain completely visible and interactive.
  * Selection state bug resolved: `ScreenRenderer` receives explicit `isSelected={isActive && selectedLayerIds.length === 0}`, preventing inactive artboards from showing purple rings when no layers are selected.
  * Artboard dragging uses non-stale absolute session displacements (`initialPos + totalDx`) rather than incremental deltas, preventing jitter, skipping, and closure staleness.
* **Creation Tool Hit-Testing**:
  * Clicking on the canvas with shape or text tools hit-tests which artboard is under the pointer, activates that artboard, and computes local coordinates for that specific artboard.
  * Clicking with the Artboard tool computes world pasteboard coordinates, ensuring new artboards are created at the clicked position without overlapping existing artboards.
* **Inspector & Property Control Hardening**:
  * **AnimateInspector**: Flat clickable cards replace nested accordions; clicking a card opens full properties with working `Change` button; recursive layer lookup for group children; breadcrumb back button in View 1; easing popover now stays open while dragging Bézier curves or spring sliders.
  * **ScrubbableInput**: Precision is derived from `step` string (e.g. `0.5` $\to$ 1 decimal), preventing unwanted integer rounding; horizontal scrubbing is linear and reversible; unit suffixes (`px`, `deg`, `%`, `s`, `ms`) are stripped during math expression evaluation.
  * **DesignInspector**: Text layers inspect `style.color` for fill state instead of `style.backgroundColor`, preserving authored text colors; individual corner radiuses (`TL`, `TR`, `BR`, `BL`) are fully interactive when expanded.

### Decision 13: Multi-Artboard Collision Auto-Healing, Direct Toolbar Creation & Unified Drag Affordance
* **Collision Auto-Healing (`normalizeScreens`)**:
  * Any project containing colliding or overlapping screens (e.g. loaded from localStorage or imported) is automatically healed on load.
  * Every subsequent artboard is ensured a minimum 120px separation gap (`x >= prevRight + 120, y = 0`).
* **Direct Toolbar Creation & Non-Colliding Duplication**:
  * Clicking the Artboard button in `TopNavBar` immediately appends a new Scene side-by-side at `rightmostX + 120, y: 0`, eliminating error-prone click-to-drop coordinates.
  * `duplicateScreen` places copies at `rightmostX + 120`, preventing duplicated screens from landing on top of existing artboards.
* **Canvas Frame Centering & Viewport Anchor**:
  * The canvas frame container enforces fixed dimensions `doc.settings.width` $\times$ `doc.settings.height`, preventing it from collapsing to $0 \times 0$ when multiple absolute screens exist.
  * This guarantees Screen 0 remains stably centered at the canvas origin without shifting or jumping when adding subsequent screens.
* **Unified Artboard Dragging Affordance**:
  * Users can drag an artboard to reposition it either by its header label or by clicking and dragging anywhere on its empty background frame (`e.target === e.currentTarget`).
  * Explicit `cursor-grab` / `cursor-grabbing` cursor styling provides immediate visual affordance that the artboard is movable.
* **Camera Panning (Hand Tool) vs. Object Moving (Select Tool)**:
  * Hand tool (H or Middle Click or Spacebar) pans the canvas camera viewport (moving all artboards together).
  * Select tool (V) translates individual artboards and elements.

### Decision 14: Jitter Animation Catalog Sheet Overlay Architecture, Two-Row Header, Live Hover Previews & Element-Specific Palettes
* **Dedicated Two-Row Header**:
  * **Row 1**: `← Back` navigation button, dynamic Title (`Change Animation` when editing existing clip vs `New Animation` when creating), and `✕ Close` button.
  * **Row 2**: Full-width 3-column segmented pill tab switcher (`[ Presets | Custom | Effects ]`), completely eliminating the cramped single-row overflow where `EFFECTS` was truncated.
* **Exact Right Sidebar Overlay Sheet Model**:
  * The animation catalog is rendered as an overlay sheet (`absolute inset-0 z-40 bg-white flex flex-col`) directly inside `RightInspectorPanel`.
  * Spans the exact 280px width and full height of the right sidebar right down to the timeline ruler.
  * **Zero State Destruction**: The underlying `DesignInspector` and `AnimateInspector` remain mounted underneath. Selecting an animation or closing the sheet (`←`, `✕`, or `Escape`) instantly reveals the default inspector with its form values, scroll position, and selection state completely preserved.
* **Unified Full Preview Window Card (Continuous 60fps Animation)**:
  * Eliminated nested "box inside another box" hierarchy.
  * Each card consists of a single large rounded preview window (`w-full h-[76px] bg-[#f8f8fa] border rounded-xl`).
  * Micro-animations play **continuously all the time** (`infinite ease-in-out`), allowing users to visually inspect every animation at a glance across the grid without needing to hover.
  * Card title/name is positioned in smaller clean typography **outside the preview box** (`text-[11px] font-medium text-[#71717a] text-center mt-1.5 truncate`).
* **Docked Easing Popover Positioning**:
  * Docked cleanly to the left edge of the right inspector sidebar (`left: sidebarRect.left - 276px`), anchored at **eye level beside the active easing selector button** (`top: buttonCenterY - popoverHeight / 2`).
  * Dynamically clamped between the top navigation bar (`topLimit = 56px`) and the bottom timeline panel (`bottomLimit = timelineTop - 8px` in Motion mode or `window.innerHeight - 8px` in Design mode).
  * Completely eliminates popover cut-offs by the timeline or clipping off the top/bottom of the viewport.
* **Grid First, Curve Second Easing Selector**:
  * Switcher tabs ordered as `[ ⊞ Grid | ∿ Curve ]` with **Grid** as the default landing view (defaulting to Curve only when a custom curve is already active).
* **Interactive Bézier Curve Canvas (Zero Raw Property Clutter)**:
  * Completely removed confusing numeric inputs (`BÉZIER COORDINATES`, `SPRING DYNAMICS` text boxes).
  * Rendered a spacious interactive SVG curve canvas ($236 \times 170\text{px}$) with scaled coordinate mapping ($y=0 \to 138\text{px}, y=1 \to 48\text{px}$) accommodating both baseline, ceiling, and overshoot peaks up to $1.36\times$.
  * Strict bounds clamping for CP1 and CP2 dragging to valid bounds $[0, 1]$ across both time ($x$) and progression ($y$).
  * Attached `window` pointer event listeners during dragging (`pointermove`, `pointerup`), delivering buttery-smooth 60fps real-time curve recalculation and store updating without handle dropouts.
  * Arranged 8 standardized curve preset pills in a 2-column grid (`grid grid-cols-2 gap-1.5`) below the graph (`Smooth`, `Natural`, `Slow down`, `Accelerate`, `Elastic`, `Bounce`, `Overshoot`, `Linear`) with `whitespace-nowrap`.

---

### Decision 15: Clean Animate Inspector, Timeline 8s Ruler Synchronization & Multi-Curve Grid
* **Removal of "Animate with AI" Clutter**:
  * Removed the promotional blue `Idea → Motion` / `Animate with AI` card from `AnimateInspector.tsx` when an element has 0 clips.
  * Preserved an uncluttered, distraction-free layer view with the clean `+ New Animation` action button.
* **Timeline Scrubber & 8-Second Ruler Calibration ($1:1$ Precision)**:
  * Resolved timeline scrubber desync where ruler marks spanned 8 seconds but scrubbing compressed or clamped prematurely.
  * Standardized `maxSec = Math.max(8, Math.ceil(duration))` across:
    1. Ruler ticks: generated across `maxSec` (`1s`, `2s`, `3s`... up to 8s).
    2. Shaded scene duration span: `(duration / maxSec) * 100%`.
    3. Scrubber dragging: `targetTime = pct * maxSec`, ensuring that dragging to the `2s` mark accurately evaluates to 2.00s instead of compressing to a fraction of scene length.
    4. Playhead pub/sub line & badge: `(t / maxSec) * 100%`, perfectly aligning the vertical red line and red timestamp pill with the mouse cursor and clip positions.
    5. Canvas playback loop: clamped `deltaSec` to $\le 100\text{ms}$ to prevent time jumps on tab defocus.
* **Two-Column 8-Preset Grid Layout & Extended Easing Architecture**:
  * Formatted presets into a symmetrical 2-column grid (`grid grid-cols-2 gap-2`):
    - Row 1: `Smooth` & `Natural`
    - Row 2: `Slow down` & `Accelerate`
    - Row 3: `Elastic` & `Bounce`
    - Row 4: `Overshoot` & `Linear`
  * Each card features comfortable dimensions (`h-[88px]`), live SVG curve thumbnails (eliminating the square placeholder for Natural), `whitespace-nowrap` on labels to prevent awkward wrapping on "Slow down", and quick-edit sliders.
  * **Real Analytical Physics Curves for Elastic and Bounce**:
    - When `Elastic` is active, the curve graph samples the true analytical damped harmonic oscillation ($\sin(t) \cdot 2^{-10t} + 1$), plotting the 1.35x overshoot peak, undershoot valley, and fluid settling ripples.
    - When `Bounce` is active, the curve graph samples the true gravitational parabolic impact rebounds (first impact at $t \approx 0.36$, second bounce at $t = 0.5$, third micro-bounce, and settling).
    - Tangent lines and control points are dynamically hidden during physics curves, replaced by a status badge (`⚡ Elastic Damped Oscillation` or `⚡ Gravitational Impact Bounce`).
    - Selecting Elastic or Bounce properly clears stale `bezierPoints` on the animation clip, ensuring the runtime evaluation engine executes the true analytical waveform without falling back to stale Bézier curves.

---

### Decision 16: Comprehensive Elimination of Legacy Pre-Jitter Inspectors & Obsolete Scrape Code
* **Context & Motivation**:
  * Following the migration to the unified Jitter Studio UI (`RightInspectorPanel.tsx` hosting `DesignInspector.tsx`, `AnimateInspector.tsx`, and `AnimationCatalogSheet.tsx`), the pre-existing modular inspector components, obsolete Radix wrappers, old beat strip, and scrape scripts were left unreferenced.
  * An automated `npx fallow` static analysis and dependency audit identified 37 dead files, unneeded npm dependencies, and unused exports.
* **Actions Taken**:
  * **Eliminated 19 Old Inspector Files**: Deleted `MotionInspector.tsx`, `ShotDynamicsCard.tsx`, `MotionStackCard.tsx`, `ClipParameterInspector.tsx`, `MultiLayerCascadeCard.tsx`, `DynamicsCurveEditor.tsx`, `PolarDirectionDial.tsx`, `PresetPickerSheet.tsx`, `KineticTypographySection.tsx`, `BindingsSection.tsx`, `AppearanceSection.tsx`, `CanvasSettingsCard.tsx`, `CounterSection.tsx`, `EffectsSection.tsx`, `MediaSection.tsx`, `MultiSelectionCard.tsx`, `TransformSection.tsx`, `TypographySection.tsx`, and `ColorPickerPopover.tsx`.
  * **Eliminated 4 Obsolete UI Primitives**: Deleted `compact-segmented-control.tsx`, `minimal-section.tsx`, `popover-color-picker.tsx`, and `popover.tsx`. Uninstalled `@radix-ui/react-popover` from `package.json`.
  * **Eliminated Obsolete Canvas & Timeline Artifacts**: Deleted `FloatingToolbar.tsx` and `StoryboardStrip.tsx`. Cleaned up unreferenced imports in `CanvasViewport.tsx`.
  * **Purged 7 Reverse-Engineering Scripts & 5 Minified Dumps**: Removed temporary capture/scrape scripts in `scripts/` and minified client code in `docs/jitter-reference/assets/`.
  * **Result**: Verified with `npx fallow dead-code` (0 unused files remaining) and validated `npm run build` cleanly in 52s.

---

### Decision 17: Retirement of Theatre.js and Orphan Experimental Engines
* **Context & Motivation**:
  * Live animation playback and scrubbing are powered deterministically by `src/engine/evaluator.ts` (`evaluateSceneAtTime`) + `src/engine/easings.ts`, while video exporting is handled by `src/engine/export/` via headless Pixi.js.
  * Theatre.js was an early prototype for a keyframe timeline that remained dormant (sheets initialized but never read or rendered).
  * Earlier experimental prototypes (viewport affine matrix, Keynote integer grid solver, beat solver, perception linter, and audio waveform/caption decoders) were isolated in unit tests without integration into the unified studio.
* **Actions Taken**:
  * **Removed Theatre.js Completely**: Deleted `TheatreStudioHost.tsx` and `TheatreController.ts`. Unmounted from `App.tsx` and unimported from `videoExporter.ts`. Removed Theatre.js rules from `index.css`. Uninstalled `@theatre/core` and `@theatre/studio`.
  * **Cleaned CSS Keyframe Residue**: Purged 100 lines of dead `@keyframes preview-*` and `.anim-preview-*` classes from `index.css`.
  * **Removed Orphaned Experimental Modules**: Deleted `ViewportMatrix.ts`, `gridSolver.ts`, `beatSolver.ts`, `src/engine/perception/` (4 files), `src/utils/color.ts`, and unintegrated video NLE files (`audioWaveformExtractor.ts`, `kineticCaptions.ts`, `videoDecoder.ts`), while preserving `razorSplit.ts` and Three.js 3D mockup infrastructure.
  * **Build Performance**: Production build time plummeted from 52.7s down to **9.03s** (an 83% speedup). Vitest runs 165/165 tests cleanly in 5.9s.

---

## 3. First-Class Showcase Primitives

The engine provides first-class, motion-first reactive primitives for each element type, detailed in full in [`docs/MOTION_PRIMITIVES.md`](file:///c:/Users/Sam/Documents/CODE/MOTION-STUDIO/docs/MOTION_PRIMITIVES.md):
1. `mockup3d`: 3D device models (iPhone, MacBook, iPad) with PBR materials, specular light sweeps, screen-to-world Z-elevation, and telephoto follow-cam.
2. `text`: Metric-aligned baseline reveals, auto-fit scaling, 0.0px invariant splitting, word replacement morphing, and variable font weight breathing.
3. `card`: G2 squircle cards with physical elevation shadows, reactive container hugging (`mode: 'hug'`), and bento grid reflow.
4. `counter`: Mechanical odometer digit rolls and format-preserving interpolation with value-driven remapping (no fake sparklines or rings).
5. `media`: Video and image containers with `cover` / `contain` auto-fit, focal-locked scaling, kinetic viewport scroll, and playhead sync.
6. `cursor`: Target-snapped ballistic navigation and choreographed click sequences (no cartoonish halos or floating badges).
7. `leaderLine`: Relational connecting lines with self-healing orthogonal routing and data packet flow.

---

### Decision 15: Canvas Viewport World Transform Layer & Deterministic Screen Arrangement
* **The Problem**:
  * The canvas container relied on CSS Flexbox centering (`display: flex; justify-content: center; align-items: center`) around a 1920x1080 canvas frame.
  * Because flex items default to `flex-shrink: 1`, flexbox squeezed the unscaled canvas frame down to container width.
  * This corrupted `transformOrigin: "center center"`, shifting screens to the right, leaving large gaps on the left, and hiding the right side of artboards behind the 280px `RightInspectorPanel`.
  * Legacy documents stored arbitrary offsets (e.g. `x: -388`) from earlier freeform drag experiments.
* **The Solution**:
  * **0x0 Centered World Container**: Placed the world transform layer at `left: 50%, top: 50%, width: 0, height: 0` with `transformOrigin: "0 0"`. Its origin is mathematically anchored at the exact center of the visible viewport container without triggering flexbox layout shifts.
  * **Symmetric Margins**: `focusScreen` and `updateAutoFit` compute scale and pan using `(clientWidth - 80) / screenWidth`, centering the active artboard with equal, guaranteed $\ge 40\text{px}$ breathing room on both sides.
  * **Strict Side-by-Side Arrangement**: Screens are strictly arranged linearly with a 120px gap (`idx * (width + 120)`). Freeform dragging of screens is disabled in favor of structured scenes.
  * **Scene Lifecycle & Global Context Menus**: Added full scene context menu (Fit, Duplicate, Rename, Delete), custom dropdown menu actions, delete shortcuts (`Delete`/`Backspace`), and global browser context menu suppression for native desktop app behavior.
* **Status**: 100% verified. All 23 test suites and 166 unit tests pass cleanly, with zero TypeScript warnings.

---

### Decision 16: Timeline Single-Click Selection & Playback Loop Synchronization
* **The Problem**:
  1. *Clip Selection Lost on Click Release*: `DraggableClip` handled `onPointerDown` which selected the clip, but lacked `onClick`. When the user released the mouse, the unhandled DOM `click` event bubbled to the parent track lane's `onClick`, which immediately ran `setSelectedClips([])`, deselecting the clip upon release. Users had to hold the mouse down to keep properties visible.
  2. *Playback Looping at 1 Second*: `CanvasViewport`'s playback loop was calculating `screenDuration = Math.max(activeScreen?.duration || 4.0, 1.0)`. If a scene's duration was low (e.g. 0.5s or 1.0s), the loop cut off at 1.0s and jumped back to 0s, despite the timeline ruler displaying an 8-second track. Users could not play or scrub beyond 1.0s.
* **The Solution**:
  1. *Single-Click Selection Persistence*: Added an `onClick` handler with `e.stopPropagation()` to `DraggableClip` and guarded the track lane's `onClick` with `e.target === e.currentTarget`. Clicking an animation clip once selects it cleanly and persists its properties in the right inspector.
  2. *Unified Timeline Playback Scope*: Synchronized `CanvasViewport` and `TimelinePanel` to compute `timelineMaxSec = Math.max(8, Math.ceil(effectiveDuration))`, spanning the full 8-second scale (or longer if clips extend). Playback plays smoothly across the entire timeline ruler without premature truncation.
* **Status**: 100% verified. All 23 test suites and 167 unit tests pass with zero TypeScript errors.

---

### Decision 17: Dual-Mode Architecture — Design Mode (Staging Board) vs. Animate Mode (Video Theater)
* **The Problem**:
  * In earlier iterations, multiple screens were always displayed side-by-side in both Design and Animate modes.
  * In Animate mode, having multiple screens visible broke the mental model of a video player: the user was animating and watching playback on an infinite multi-screen canvas rather than viewing a focused, frame-locked video theater.
  * Zooming out below 100% in Animate mode caused the player frame to float ambiguously in empty canvas space.
* **The Solution**:
  * **Design Mode (Staging Board)**:
    * All screens sit side-by-side linearly with a 120px gap (`idx * (width + 120)`).
    * Full zoom-out capability (from 20% to 400%) and 2D panning to easily layout, stage, and organize elements across scenes.
    * Alt-key smart distance guides and cross-artboard visual inspection.
  * **Animate Mode (Video Theater)**:
    * The viewport locks onto the single active video screen rendered at origin `(0, 0)`.
    * Non-active staging screens are hidden, focusing the user completely on the motion graphics video presentation.
    * Zoom-out below 100% fit is blocked (`minZoom = 1.0`), fixing the video frame securely in the viewport while still allowing zoom-in ($\ge 100\%$) for micro-detail inspection.
    * Top navigation bar zoom dropdown hides 50% and 75% options when in Animate mode.
    * All overlays (TransformBox, magnetic snap guides, marquee selection, reactive binding curves) calculate coordinates directly against the focused video screen at `(0, 0)`.
* **Status**: 100% verified. All 23 test suites and 167 unit tests pass cleanly, and the production build (`npm run build`) succeeds in under 10 seconds.

---

### Decision 18: Sequential Hybrid Architecture — Scene Blocks Timeline & Multi-Scene Video Theater
* **The Problem**:
  * In a multi-screen video (e.g. Screen 1 = 3s, Screen 2 = 4s), animation tools face a dilemma:
    1. *Isolated Per-Screen Mode*: Editing each screen in isolation feels like disconnected PowerPoint slides; the user cannot scrub across cuts or feel the video's rhythm.
    2. *Giant Stacked Timeline*: Displaying all 50 layers across all scenes on one timeline produces a cluttered, unmanageable After Effects headache.
  * In Animate mode, the viewport needs to act as a fixed 100% video monitor playing the entire sequential video across all scenes, rather than only looping the active screen in isolation.
* **The Solution**:
  * **Scene Blocks Timeline Bar**:
    * Rendered at the top of the timeline ruler (`[ Screen 1: 3.0s ] [ Scene 2: 4.5s ]`).
    * Proportional width matching `(duration / totalDuration) * 100%`.
    * Active scene is highlighted in brand purple with duration pill.
    * Drag handle on the right edge allows dragging to interactively resize scene durations.
    * Clicking a scene block selects that scene and jumps the playhead to its start time.
  * **Global Timeline Ruler & Focused Layer Tracks**:
    * Ruler spans `totalDuration` ($\sum \text{screen.duration}$).
    * The layer tracks below focus cleanly on the active scene's elements.
    * Active scene window is highlighted on the ruler and tracks with subtle shading and borders (`[screenStartTime, screenEndTime]`).
    * Animation clips are positioned at `screenStartTime + clip.start`, so the playhead visually sweeps over clips at their exact global time.
  * **Automatic Active Scene Sync & Local Time Evaluation**:
    * `setCurrentTime` automatically detects which scene the playhead is on and updates `activeScreenId`, keeping the left sidebar, right inspector, and tracks in 100% sync.
    * The viewport evaluates layer styles at `localTime = currentTime - screenStartTime`.
    * The fixed viewport monitor seamlessly displays Screen 1 (0s–3s), transitions at 3s, and displays Screen 2 (3s–7.5s).
  * **Flexible Looping Options (Loop All vs. Loop Scene)**:
    * The transport loop button toggles between `Loop All` (entire film from 0s to total duration) and `Loop Scene` (loops only active scene `[screenStartTime, screenEndTime]`).
* **Status**: 100% verified. All 24 test suites and 172 unit tests pass cleanly, and the production build (`npm run build`) succeeds in 9.35s with 0 errors.

---

### Decision 19: Mode-Aware Layout Restructuring — Center Mode Switcher, Left File Header, & Floating Bottom Design Bar
* **The Problem**:
  * Shape creation tools (Artboard, Text, Rect, Circle, Star, Media, AI) in the top navbar made no conceptual sense in Animate mode, where the user is animating existing elements rather than authoring new static shapes.
  * The `[ Design | Animate ]` mode switcher was previously tucked into the top of the right inspector panel (`RightInspectorPanel.tsx`), eating valuable vertical space and crowding property controls.
  * The project name was centered in the top header, which is standard territory for primary mode switching in desktop creative suites (e.g. Figma / Framer).
* **The Solution**:
  * **Top Navigation Bar Restructuring (`TopNavBar.tsx`)**:
    * **Left**: Back button and File/Project Name (`doc.name` with click-to-rename input and dropdown chevron) positioned cleanly on the left.
    * **Center**: Primary `[ Design | Animate ]` segmented switcher centered with high visual prominence (`absolute left-1/2 -translate-x-1/2`), styled with subtle dark border and purple active pill (`bg-[#7c3aed]`).
    * **Right**: Viewport zoom level dropdown and purple Export pill button.
  * **Floating Bottom Design Toolbar (`FloatingDesignToolbar.tsx`)**:
    * Element creation tools (`[ ↖ Select (V) | ⊞ Scene (A) | T Text (T) | □ Rect (R) | ○ Circle (O) | ☆ Star | 🖼 Media | ✦ AI ]`) moved to a bottom floating pill toolbar on the canvas (`absolute bottom-6 left-1/2 -translate-x-1/2`).
    * Encapsulates all shape generation, artboard instantiation, direct image upload, and AI command bar invocation.
    * **Strict Mode Isolation**: The floating toolbar is rendered **only in Design mode** (`!isMotionMode(uiMode)`). In Animate mode, it is completely hidden, leaving the canvas unobstructed and dedicating the bottom area exclusively to the multi-scene sequential timeline.
  * **Full-Height Inspector (`RightInspectorPanel.tsx`)**:
    * With the mode switcher relocated to the global header, the inspector dedicates 100% of its vertical height to property inspection (`DesignInspector` or `AnimateInspector`).
* **Status**: 100% verified. All 24 test suites and 172 unit tests pass, and `npm run build` succeeds with 0 errors.

---

### Decision 20: Independent Mode State Preservation — Viewport Camera, Selections, and Timeline Isolation
* **The Problem**:
  * Switching between Design Mode and Animate Mode previously shared mutable canvas viewport state (`pan` and `zoom`) and selection states.
  * When entering Animate Mode, the viewport auto-centered onto origin `(0, 0)` to display the video theater monitor, completely overwriting the user's canvas pan and zoom.
  * When switching back to Design Mode, the canvas remained at origin `(0, 0)`, displacing the user's staged artboards and losing their active screen focus, zoom, and selected layer.
  * Furthermore, switching back and forth lost the playhead position (`currentTime`), selected animation clips (`selectedClipIds`), and active timeline track highlight.
* **The Solution**:
  * **Store-Level Mode State Stashing (`useProjectStore.ts`)**:
    * Defined `ModeSavedState` interface preserving `pan`, `zoom`, `activeScreenId`, `selectedLayerIds`, `activeTool`, `currentTime`, `selectedClipIds`, and `loopMode`.
    * Promoted `pan: { x: number; y: number }` and `setPan` to first-class store state, ensuring deterministic synchronization between canvas transformations, camera panning, and mode transitions.
    * In `setUiMode`:
      * **Design $\to$ Animate**: Stashes the current Design mode state (`pan`, `zoom`, `activeScreenId`, `selectedLayerIds`, `activeTool`). Restores the previously saved Animate mode state (`pan`, `zoom`, `activeScreenId`, `selectedLayerIds`, `selectedClipIds`, `currentTime`, `loopMode`), or initializes the centered 100% video theater monitor on first visit.
      * **Animate $\to$ Design**: Stashes the current Animate mode state (`pan`, `zoom`, `activeScreenId`, `selectedLayerIds`, `selectedClipIds`, `currentTime`, `loopMode`). Restores the exact Design mode canvas pan, zoom, active artboard, and selected layers, resetting `activeTool` to `"select"`.
  * **Viewport Auto-Fit Protection (`CanvasViewport.tsx`)**:
    * `updateAutoFit` checks for existing mode states. It computes `viewportScale` on container/window resizes without overwriting preserved mode pan or zoom.
  * **Status**: 100% verified. All 25 test suites and 175 unit tests pass cleanly, and the production build (`npm run build`) succeeds with 0 errors.

---

### Decision 21: Omnipresent Multi-Path Scene & Layer Renaming and Menu Parity
* **The Problem**:
  * Users were previously restricted to a single rigid path for renaming scenes: right-clicking the scene item in the left sidebar.
  * In the right inspector panel (`DesignInspector` and `AnimateInspector`), clicking or double-clicking the scene name or layer name was inert because titles were static `<span>` elements.
  * Multiple `···` options buttons (such as the layer header in `DesignInspector`, and the scene and layer headers in `AnimateInspector`) were completely non-functional dead elements with no attached menus.
  * In `LeftSidebar.tsx`, double-clicking scene and layer items did nothing.
  * On the canvas artboard headers and in the timeline scene blocks bar, scene names were read-only.
* **The Solution**:
  * **Right Inspector Omnipresent Renaming (`DesignInspector.tsx` & `AnimateInspector.tsx`)**:
    * **Scene Header**: Double-clicking the scene title activates inline autofocus text input with purple focus border (`Enter` or `onBlur` saves, `Escape` cancels). The `···` dropdown menu includes a dedicated **Rename Scene** action alongside Duplicate, Fit in Viewport, and Delete.
    * **Layer Header**: Double-clicking any selected layer title activates inline autofocus editing. Replaced dead `···` buttons with full `DropdownMenu` providing **Rename Layer**, **Duplicate Layer**, and **Delete Layer**.
  * **Left Sidebar Double-Click Parity (`LeftSidebar.tsx`)**:
    * Added `onDoubleClick` handlers to both scene labels and layer labels, allowing instant inline editing without forcing right-click context menus.
  * **Canvas Artboard Header & Timeline In-Place Renaming (`ScreenRenderer.tsx` & `TimelinePanel.tsx`)**:
    * Double-clicking the scene name text on either the canvas artboard header pill or the sticky timeline scene block opens an inline editor directly in-place.
* **Status**: 100% verified. All 26 test suites and 179 unit tests pass cleanly, and the production build (`npm run build`) succeeds in 8.68s with 0 errors.

---

### Decision 22: Universal Omnipresent In-Place Renaming and Zero-Dead-Button Action Parity Across Every Workspace Element & Asset
* **The Problem**:
  * While initial scene and layer renaming was added to primary inspector headers, renaming across the rest of the workspace remained inconsistent and incomplete:
    1. **Timeline Track Lane Headers**: In `TimelinePanel.tsx`, layer names in track headers were static text and completely lacked context menu support (`onContextMenu`), making track-level renaming or management inaccessible from the timeline.
    2. **Animation Clips**: In both `DraggableClip.tsx` and `AnimateInspector.tsx` View 1 (Focused Clip), clip names were static text showing only raw preset strings; the `···` dropdown lacked a "Rename" action, and clips in the applied list lacked context menu options.
    3. **Canvas Artboard Context Menus**: In `ScreenRenderer.tsx`, the artboard header `···` button failed to trigger rename mode because `onRename` was omitted from `buildSceneContextMenu`.
    4. **Multi-Selection in Inspector**: When multiple layers were selected, `DesignInspector.tsx` displayed the first layer's name rather than a clear multi-selection banner, with no multi-element batch actions (Duplicate All, Delete All).
* **The Solution**:
  * **Timeline Track Headers (`TimelinePanel.tsx`)**:
    * Added `editingTrackLayerId` state. Double-clicking any layer label directly in its timeline track header opens an inline autofocus text input with `Enter`/`onBlur` commit and `Escape` cancel.
    * Attached `onContextMenu` opening `buildTimelineTrackMenu({ layer, store })` with dedicated **Rename Layer**, Razor Split, Duplicate, Visibility Toggle, and Delete actions.
  * **Interactive Animation Clips (`DraggableClip.tsx` & `AnimateInspector.tsx`)**:
    * Double-clicking any animation clip block on the timeline lane directly opens an inline text input to rename the clip in-place, updating custom clip names (`clip.name || clip.preset`).
    * In `AnimateInspector.tsx` View 1, double-clicking the clip header title activates inline editing, and the `···` dropdown menu contains a dedicated **Rename** option with pencil icon.
    * Added `onContextMenu` to applied animation cards in View 2, wired to `buildSidebarCardMenu` with Rename, Duplicate, Reset to Defaults, and Delete.
  * **Universal Context Menu Renaming Builders (`contextMenuBuilders.tsx`)**:
    * Added **Rename** actions across all context menu builders (`buildTimelineClipMenu`, `buildTimelineTrackMenu`, `buildCanvasElementMenu`, `buildSidebarCardMenu`, and `buildSceneContextMenu`), ensuring every asset and element in the application can be renamed from any viewport, menu, or panel.
  * **Multi-Selection Header & Batch Actions (`DesignInspector.tsx`)**:
    * When multiple layers are selected (`selectedLayers.length > 1`), the inspector displays `{N} elements selected` with batch options in the `···` dropdown: **Duplicate All** and **Delete All**.
* **Status**: 100% verified. All 26 test suites and 181 unit tests pass cleanly, and the production build (`npm run build`) compiles in 9.06s with 0 errors.

---

### Decision 23: Multi-Aesthetic Engine — Stepped Frame Rates (6–12 FPS Stop-Motion / Collage) and Tactile Art Styles
* **The Principle**:
  * Motion Studio is designed not only for high-framerate (60 FPS) fluid tech UI product showcases, but equally for **handcrafted, tactile, artistic motion design**: 6–9 FPS paper collage animations, stop-motion cutouts ("on twos"), retro zine print aesthetics, and mixed media art styles.
* **The Solution**:
  1. **Time Posterization / Stepped Evaluator**:
     * In addition to continuous analytical springs, `src/engine/evaluator.ts` supports stepped frame evaluation:
       $$t_{\text{stepped}} = \frac{\lfloor t \times \text{stepFps} \rfloor}{\text{stepFps}}$$
     * Allows project-, scene-, or clip-level frame-rate quantization (`60 fps` smooth, `24 fps` cinematic, `12 fps` cel anime, `8 fps` / `6 fps` tactile paper stop-motion).
  2. **Tactile Collage Primitives**:
     * **Sticker / Die-Cut Border**: Crisp, hard white border surrounding cutout imagery and text.
     * **Hard Brutalist Shadow**: Zero-blur directional offset shadow (`6px 6px 0px #000`) for vintage print and paper cutout depth.
     * **Line Boil / Wiggle Ambient Loop**: Ambient motion cycle with subtle stepped rotation ($\pm 1.5^\circ$) and offset jittering at 6–8 FPS, bringing collage elements to life.
* **Status**: Documented and scheduled for implementation alongside the core primitives in the upcoming session.

---

### Decision 24: Two-Stage AI Generation Pipeline, Aesthetic Compiler & Agent Tool Bridge
* **The Problem**:
  * Programmatic video generation models (e.g. Remotion, raw CSS) fail when driven by LLMs because AI is forced to hallucinate continuous pixel coordinates, leading to text overflows, timing drift, and broken transitions.
* **The Solution**:
  1. **Aesthetic Compiler & Guardian**:
     * The engine enforces physical momentum, safe margins, and modular layouts by construction.
     * Auto-fit typography and G2 squircles prevent ugly layouts and clipping descenders automatically.
  2. **Two-Stage Generation Pipeline**:
     * **Stage 1 (Director AI)**: Generates narrative beat sheet, copy, theme, and aesthetic mood from user prompt.
     * **Stage 2 (Choreographer AI)**: Executes atomic tool calls via `src/tools/` (`create_scene`, `place_element`, `apply_magic_move`).
  3. **Self-Healing Agent Tool Bridge (`src/tools/`)**:
     * All tool inputs validated via Zod.
     * Invalid coordinates or durations are constructively auto-clamped rather than throwing unhandled exceptions.
* **Status**: Architected; scheduled for Milestone 4 following completion of the visual primitives.

---

### Decision 25: Local Lucide Icon Picker Architecture & Tactile Collage Styling
* **Local, Zero-CDN Icon Library**:
  * Shipped locally via `lucide-react` dictionary containing all 1,555 vector icons.
  * 100% offline, zero network requests, instant in-memory search (<1ms) with category filtering (Popular, Arrows, Media, Design, Tech).
  * Layer type `IconLayer` stored with `iconName`, `strokeWidth`, and full `style` support.
  * Rendered cleanly via `IconRenderer.tsx` with dynamic component lookup, preserving SVG scalability for frame-accurate WebCodecs export.
* **Tactile Collage Styling**:
  * **Brutalist Hard Shadow (`shadowMode: 'hard'`)**: Clamps shadow blur to `0px`, enabling authentic print, paper cutout, and zine aesthetics.
  * **Sticker / Die-Cut Outline (`stickerBorder`)**: 8-way directional contour `drop-shadow` filter creating a crisp, physical sticker border around transparent PNGs, icons, text, and vector graphics.
  * **Stop-Motion Line Boil Preset (`preset: "boil"`)**: Ambient loop applying deterministic $O(1)$ pseudo-random rotation ($\pm 1.5^\circ$) and offset ($\pm 2\text{px}$) stepping at 8 FPS, guaranteeing constant-time forward and backward scrubbing without frame accumulation drift.
### Decision 26: Component Library Showcase Modules, Kinetic Counter Controls, & Aesthetic Mood Profiles
* **Pre-Composed Component Modules**:
  * Added `ComponentsDrawer.tsx` accessible from the floating toolbar (`[ ⊞ Components ]`).
  * Features 5 production-grade showcase components:
    1. **Browser Window Frame**: macOS Safari/Chrome window with traffic lights (`#ff5f56`, `#ffbd2e`, `#27c93f`), address bar pill, and clipped `FrameLayer` child viewport.
    2. **iPhone 16 Pro 3D Mockup**: `Mockup3DLayer` with telephoto camera, natural titanium PBR finish, and specular highlight sweep.
    3. **MacBook Pro 3D Mockup**: `Mockup3DLayer` with space black finish.
    4. **Kinetic Rolling Counter**: `CounterLayer` with odometer animation, prefix/suffix support, and smooth count-up.
    5. **Code Block Window**: Dark syntax card with traffic lights and monospace styling.
* **Kinetic Counter Inspector Controls**:
  * Integrated dedicated Inspector controls for `CounterLayer` (start/end value, prefix, suffix, decimals, thousands grouping, counterMode: odometer/smooth/stepped).
  * Extended typography inspector controls to kinetic counter numbers.
* **One-Click Aesthetic Mood Profiles**:
  * Defined `AestheticMood = 'product-showcase' | 'paper-collage' | 'kinetic-editorial' | 'analog-retro'`.
  * Scene Inspector includes a Mood dropdown that automatically syncs the frame rate (`stepFps`), surface shadow mode, and canvas defaults.
* **Status**: 100% verified. All 29 test suites (209 tests) pass cleanly, and the production build compiles in 10.12s with 0 errors.

---

### Decision 27: AI Agent Tool Calling Bridge, Modular Grid Solver, & AST Pre-Flight Linter
* **Modular Video Grid Solver (`src/engine/grid/gridSolver.ts`)**:
  * Implements discrete grid coordinates mapped to aspect ratios (16:9 $\to$ 16x9, 9:16 $\to$ 9x16, 1:1 $\to$ 12x12, 4:5 $\to$ 8x10).
  * Auto-clamps coordinates and resolves box-fit auto-scaling to prevent pixel hallucinations.
* **Perception Engine & AST Pre-Flight Linter (`src/engine/perception/linter.ts`)**:
  * Lints storyboards prior to execution: checks for zero black frames, grid boundaries, text validity, and enforces AGENTS.md Rule 8 banned anti-patterns (no eyebrows/badges, no gradient text, single elevation system, one authored moment per beat).
* **Self-Healing Agent Tool Bridge (`src/tools/`)**:
  * Atomic tools (`createScene`, `placeElement`, `applyAnimation`, `getStoryboardState`, `lintStoryboard`) with Zod validation and constructive error correction.
* **Two-Stage Orchestrator (`src/tools/orchestrator.ts`)**:
  * Connects Director AI (narrative beat sheet, mood, copy) to Choreographer AI (tool calling into project store) for reliable product showcase motion graphics generation.
* **Status**: Implemented and verified with comprehensive unit and integration tests.

---

### Decision 28: Layout De-Cluttering & Universal Migration to shadcn Select Elements
* **Removal of Aesthetic Mood Row in Inspector**:
  * Eliminated the redundant "Aesthetic Mood" dropdown row in `DesignInspector.tsx` to preserve clean, un-cramped inspector hierarchy.
* **Two-Row Frame Rate Selector**:
  * Restructured the Frame Rate control into a clean, two-row vertical block (Row 1: bold label, Row 2: full-width dropdown), eliminating horizontal squeezing and text truncation.
* **Universal Migration from Native `<select>` to shadcn `Select`**:
  * Installed `@radix-ui/react-select` and implemented `src/components/ui/select.tsx` conforming to shadcn specifications.
  * Replaced all default browser `<select>` elements across the entire studio:
    - Scene Layout Format selector (`DesignInspector.tsx`)
    - Scene Frame Rate selector (`DesignInspector.tsx`)
    - Line/Arrow Start and End markers (`DesignInspector.tsx`)
    - Kinetic Counter Mode (`DesignInspector.tsx`)
    - Typography Font Family & Font Weight (`DesignInspector.tsx`)
    - Text Animation Split By & Order (`AnimateInspector.tsx`)
    - Video Export Resolution (`ExportModal.tsx`)
* **Status**: 100% verified. 0 native select elements remain. All 30 test suites (230 tests) pass cleanly, and production build compiles in 8.85s with 0 errors.

---

### Decision 29: Precision Tool Philosophy & High-Signal UI Architecture
* **Precision Tool Philosophy**:
  * Motion Studio is designed as a professional precision instrument, not a conversational assistant or decorative demo.
  * Every dropdown, select, and input must expose **only the information that is strictly necessary**.
  * Verbose conversational descriptions, mood labels, or decorative suffixes inside selects are prohibited.
* **Compact Single-Row Frame Rate**:
  * In the Scene Inspector, the Frame Rate selector is rendered on a single row aligned with Duration: clean label on the left, compact `w-20` shadcn `Select` on the right.
  * Options are strictly numbers: `60`, `30`, `24`, `12`, `8`, `6`.
* **Modularity Mandate**:
  * Monolithic components (>500 lines) must be systematically decomposed into isolated, single-responsibility domain cards.
  * High-churn inspection surfaces like `DesignInspector.tsx` are to be split into atomic subcomponents under `src/components/inspector/design/` (`SceneSettingsCard`, `TransformSection`, `TypographySection`, `AppearanceSection`, etc.), ensuring localized edits never require multi-thousand-line diffs.

---

### Decision 30: System-Wide True Modularity & Canonical shadcn Primitive Integration
* **Motivation & Architectural Refactoring**:
  * Large, monolithic files (>800–3,000 LOC) were causing blast-radius inflation and high refactoring churn.
  * The entire architecture has been decomposed into high-cohesion, isolated domain modules conforming to single-responsibility principles.
* **Store Decomposition (`src/store/useProjectStore.ts`: 3,021 $\to$ 85 LOC)**:
  * Decomposed into 7 domain slices under `src/store/slices/`:
    - `canvasSlice.ts`: zoom, pan, activeTool, theme, uiModes, history.
    - `playbackSlice.ts`: transport, scrubbing, loopMode, work area bounds.
    - `selectionSlice.ts`: activeScreenId, selectedLayerIds, editingLayerId, activeTextSelection, clip selection.
    - `sceneSlice.ts`: document settings, screen CRUD, color palette, persistence.
    - `layerSlice.ts`: layer CRUD, grouping/ungrouping, tree hierarchies, z-ordering, text split/merge, bindings, razor split.
    - `styleSlice.ts`: layer styling, spatial alignment (left/center/right/top/middle/bottom), distribute spacing, tidy up.
    - `animationSlice.ts`: multi-animation clip CRUD, ripple shifts, catalog state, preset applications.
  * Extracted pure helpers into `src/store/helpers/treeHelpers.ts` and `src/store/helpers/screenTimingHelpers.ts`.
  * Preserved 100% backward compatibility by re-exporting all store selectors, helpers, types, and constants.
* **Inspector Decomposition**:
  * `DesignInspector.tsx` (1,745 $\to$ 48 LOC): Decomposed into 7 atomic domain cards under `src/components/inspector/design/` (`SceneSettingsCard`, `LayerHeaderCard`, `AlignmentBar`, `TransformCard`, `TypographyCard`, `AppearanceCard`, `SpecializedLayerCard`).
  * `AnimateInspector.tsx` (1,134 $\to$ 55 LOC): Decomposed into 3 domain views under `src/components/inspector/animate/` (`ClipDetailView`, `LayerAnimationsView`, `SceneAnimationsView`).
* **Canvas Viewport Decomposition**:
  * Extracted custom hooks: `usePlaybackLoop.ts`, `useSelectionBounds.ts`, `useCanvasHotkeys.ts`.
  * Extracted helpers: `canvasMath.ts`, `toolCreationHelpers.ts`.
* **Engine Evaluator Decomposition (`src/engine/evaluator.ts`: 1,003 $\to$ 217 LOC)**:
  * Extracted `src/engine/evaluator/quantizeTime.ts`.
  * Extracted `src/engine/evaluator/counterEvaluator.ts`.
  * Extracted `src/engine/evaluator/configEvaluator.ts`.
  * Extracted `src/engine/evaluator/clipEvaluator.ts`.
  * Evaluator coordinates scene-level cascading evaluations and re-exports all evaluation primitives.
* **Component Drawer Template Separation**:
  * Extracted 711 lines of hardcoded showcase AST templates out of `ComponentsDrawer.tsx` into `src/components/components/templates/componentTemplates.ts`.
* **Canonical shadcn UI Primitives**:
  * Canonical Radix-backed primitives in `src/components/ui/` (`checkbox.tsx`, `input.tsx`, `select.tsx`, `separator.tsx`, `slider.tsx`, `tabs.tsx`, `popover.tsx`, `dropdown-menu.tsx`, `button.tsx`, `badge.tsx`, `tooltip.tsx`).
  * Zero raw browser inputs (`<input type="checkbox">`, `<select>`).
* **Zero Hardcoded Colors & Tokens**:
  * Replaced ad-hoc raw hex strings with semantic Tailwind tokens (`bg-card`, `text-foreground`, `border-border`, `bg-muted`).
* **Verification**:
  * All 30 test suites (230 tests) pass 100%.
  * Production build compiles cleanly with 0 TypeScript errors.

---

### Decision 31: Multi-Studio Separation & Rendered Video Interchange Architecture
* **Distinct Studio Workflows (Separation at Inception)**:
  * Motion Studio, 3D Studio, and Video Editor represent three fundamentally distinct workflows. Users select the target studio workflow before initiating or opening a project, rather than hot-switching an active document across all three domains.
* **Rendered Video Interchange vs. Heavy Dynamic Linking**:
  * Cross-studio compositing (e.g. 2D motion graphics layered over real-world talking-head video or integrated with 3D elements) will operate via **rendered video interchange with alpha transparency** (e.g. WebM VP9 with alpha, ProRes 4444, PNG sequences).
  * We reject the "heavy dynamic link" trap (live nested project evaluation in the video editor timeline) due to playback stutter, excessive memory overhead, and instability. Pre-rendered video tracks guarantee 60fps real-time playback in the video editor.
* **Standalone Project Extension**:
  * Motion Studio projects use the `.motion` format (neutral, clean, and decoupled from commercial branding).
* **Upcoming Focus**:
  * Next sessions prioritize rigorous bug fixing, user-identified QA findings, and overhauling the export engine to support transparent alpha video renders and format options.

---

### Decision 32: Project Management Workspace (Dashboard / Home), Multi-Project Registry, and Aspect Ratio Presets
* **Transition from Single-Document Auto-Loader to Home Workspace**:
  * Motion Studio now launches into a clean **Projects Workspace (Dashboard / Home)** where users manage, create, open, duplicate, and import/export projects before entering the studio editor.
  * Clicking the Back Arrow (`←`) in `TopNavBar` automatically auto-saves the active project document and returns cleanly to the Projects Workspace.
* **Multi-Project Storage & Registry Engine (`src/services/projectStorage.ts`)**:
  * Registry of projects maintained in `motion_studio_projects_registry_v1` with typed metadata (`ProjectMeta`: `id`, `name`, `width`, `height`, `fps`, `duration`, `screenCount`, `backgroundColor`, `createdAt`, `updatedAt`).
  * Individual project documents stored under `motion_studio_project_doc_<id>`.
  * Real-time mirror sync during active editing ensures no lost changes.
  * **Zero Data Loss Migration**: Detects any existing legacy document (`motion_studio_scene_doc_v2`) on boot and automatically wraps it into the project registry.
* **Standard Aspect Ratio Presets**:
  * First-class format starters for 16:9 Landscape (`1920×1080`), 9:16 Vertical (`1080×1920`), 1:1 Square (`1080×1080`), 4:5 Portrait (`1080×1350`), and Custom dimensions.
  * Option to start from a blank canvas or from the curated Showcase Teaser.
---

### Decision 33: Jitter-Aligned Categorized Custom Animation System & Full Channel Property Editing
* **Clean Categorized List (Zero Preview Box Clutter)**:
  * Only the `PRESETS` and continuous `EFFECTS` tabs display live animated preview window cards.
  * The `CUSTOM` tab is restructured to match Jitter's clean, high-signal list layout across 4 core sections:
    1. **Transform**: `Scale`, `Rotate`, `Move`
    2. **Style**: `Opacity`, `Color`, `Shadow`
    3. **Effects**: `Layer Blur`, `Background Blur`, `Glass`
    4. **Other**: `Hide / Show`, `Resize`, `Morph`, `Corner Radius`, `Stroke`
  * Each item displays its purple Lucide icon, channel label, clean hover highlight, and active selection checkmark without large preview card noise.
* **Full Property Customizability in `ClipDetailView`**:
  * In Custom mode, users can configure any property of the selected animation clip:
    * `Color`: Target color swatch and uppercase hex input (`#RRGGBB`).
    * `Shadow`: Blur (px), Distance (px), and Shadow Color.
    * `Layer Blur`: Optical blur radius (px).
    * `Background Blur`: Backdrop blur radius (px).
    * `Glass`: Combined backdrop blur (px) and opacity (%).
    * `Hide / Show`: Segmented toggle [ Hide | Show ].
    * `Resize`: Width Delta (px) and Height Delta (px).
    * `Morph`: Morph intensity (%).
    * `Corner Radius`: Target corner radius (px).
    * `Stroke`: Stroke Width (px) and Stroke Color.
    * `Transform`: Scale factor, Rotation degrees & direction (CW/CCW), Distance & direction (Up/Down/Left/Right).
* **Deterministic Compounded Evaluation**:
  * All 14 custom channels are evaluated in `evaluateClipDelta` and compounded in `compoundLayerAnimations`.
  * `evaluateSceneAtTime` binds all computed properties (`backgroundColor`, `color`, `borderRadius`, `borderWidth`, `borderColor`, `boxShadow`, `backdropFilter`, `width`, `height`, `opacity`, `transform`) directly to the canvas rendering pipeline for deterministic scrubbing and real-time playback.

---

### Decision 34: Jitter From -> To Parameter Model, Element-Specific Preset Matrix, & Auto-Staggered Creation Defaults
* **From -> To Parameter Transition Model**:
  * Every animatable property in `ClipDetailView` supports an **Initial value** (`from`) with an expandable `+` toggle and a target **To** value (`params`).
  * If no initial value is defined, it defaults to the layer's resting style. When the `+` button is clicked, users can specify an explicit starting value with an `×` reset button to revert to resting defaults.
  * The mathematical evaluator (`applyCustomPresetDelta`) linearly/spring interpolates between `from` and `to` across the clip duration.
* **Symmetric Rhythm & Clean Inspector Layout**:
  * Inspector property rows feature symmetric vertical padding (`py-3`) bounded by clean separator dividers (`border-b border-border/60`), matching professional precision design tools.
  * Misplaced controls (`Mode [In | Out]` and `Loop continuously`) are removed from custom transition clips and only exposed on relevant preset categories.
  * A full-width `+ Add animation` button is anchored at the bottom of the inspector stack to quickly chain multi-channel animations.
* **Element-Specific Animation Presets**:
  * Presets in `AnimationCatalogSheet` are strictly tailored to the selected element type:
    * **Text**: Typography presets (`Typewriter`, `Baseline Reveal`, kinetic slides, and split character/word/line animations).
    * **Shapes & Frames**: Geometric scale, spring pop, mask wipe, and axial rotation presets.
    * **Media (Images & Video)**: Telephoto zoom in/out, cinematic pans, soft focus blur in, and gentle alpha dissolve.
    * **Icons & Glyphs**: Overshoot spring pops, bounce in, axial spins, and rotational wiggle accents.
    * **Lines & Arrows**: Directional draw/path extension, wipe in, and axis scale reveals.
* **Auto-Choreographed Staggered Creation Defaults**:
  * Adding elements on canvas automatically staggers start times sequentially ($N \times 0.5\text{s}$) rather than stacking all animations at $t = 0$.
  * Each tool assigns its element-tailored entrance preset (Text $\to$ `slideUp`, Rect/Frame $\to$ `grow`, Circle/Star $\to$ `pop`, Media $\to$ `fade`, Line/Arrow $\to$ `slideRight`).
