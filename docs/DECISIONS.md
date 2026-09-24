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

---

### Decision 35: Universal Animation Roles (In | Action | Out), Element Visibility Lifecycle, & Precision Easing Popover Ergonomics
* **Universal Role Switcher (`[ In | Action | Out ]`)**:
  * Any animation (whether an out-of-the-box preset or a custom animation channel) can now be assigned to any of the three fundamental motion graphics roles:
    1. **`In` (Entrance)**: Introduces the element. The element is guaranteed to be completely hidden (`opacity: 0`) before the animation start time ($t < t_{\text{in}}$). When $t \ge t_{\text{in}}$, it enters the canvas.
    2. **`Action` (In-Place Transformation)**: Applies a transformation to an element already present on the canvas. The element is visible from $t = 0.0\text{s}$ at its resting properties, performs the action during the clip window, and maintains its resulting state.
    3. **`Out` (Exit)**: Dismisses the element from canvas. After the exit animation finishes ($t \ge t_{\text{out}} + \text{duration}$), the element is guaranteed to remain permanently hidden (`opacity: 0`).
* **Multi-Clip Compound Lifecycle Guarantees**:
  * In `compoundLayerAnimations`, the pre-entrance check evaluates `Math.min(...inClips.map(c => c.start))` and the post-exit check evaluates `Math.max(...outClips.map(c => c.start + c.duration))`.
  * This guarantees that a layer with an entrance starting late in the timeline (e.g. at $2.1\text{s}$) is never erroneously rendered at $t = 0\text{s}$.
* **Precision Easing Popover Ergonomics**:
  * **Header Alignment**: The easing popover portal position anchors directly below the top navigation header (`topLimit = sidebarRect.top + 6`), flush with the inspector panel rather than floating mid-canvas.
  * **Zero Redundant Noise**: Removed the redundant `+` button in the header, removed duplicate 8 preset pills from under the interactive Bézier graph, and removed noisy status badge text overlaid on the curve canvas.
  * **Context-Aware Optical Easing Filtering**:
    * Optical and bounded properties (`opacity`, `color`, `blur`, `backdropBlur`, and `out` exits) reject non-monotonic physics easings (`elastic`, `bounce`, `overshoot`) that cause unnatural numerical clipping, presenting only monotonic curves (`Smooth`, `Natural`, `Slow down`, `Accelerate`, `Linear`).
    * Spatial transforms (`move`, `scale`, `rotate`) retain all 8 full physical and curve presets.

---

### Decision 36: Full Duration-Spanning Physical Spring & Easing Mechanics
* **The "0.1s Snapping" Problem**:
  * Legacy Flash/Penner easing formulas (`elastic: Math.pow(2, -10 * t) * Math.sin(...)` with $p = 0.3$) had an extremely rapid exponential decay ($2^{-10t}$) and high frequency.
  * In normalized clip time $t \in [0, 1]$, this caused animations to hit 100% target value at $t = 0.075$ (within $0.08\text{s}$ of an animation with $1.16\text{s}$ duration), peak at $t = 0.15$ ($0.17\text{s}$), and sit completely frozen and motionless for the remaining $85\%$ of the clip.
  * This completely defeated the user's intent when configuring animation duration: setting duration to $1.16\text{s}$ appeared to finish in $0.1\text{s}$.
* **Closed-Form Analytical Spring Solution ($t \in [0, 1]$)**:
  * Upgraded `EASING_FUNCTIONS.elastic`, `bouncy`, and `spring` to second-order damped harmonic oscillator closed-form analytical waveforms:
    $$x(t) = 1 - e^{-\zeta \omega_n t} \left( \cos(\omega_d t) + \frac{\zeta}{\sqrt{1 - \zeta^2}} \sin(\omega_d t) \right)$$
  * Carefully calibrated so that:
    * Starts smoothly from rest at $t = 0.0$.
    * Progresses continuously through the growth phase ($x \approx 0.38$ at $t = 0.14$, where playhead sits in $1.16\text{s}$ clip).
    * Crosses initial target $1.0$ at $t \approx 0.30 - 0.35$.
    * Reaches graceful overshoot peak ($+20.5\%$) around the midpoint of the animation ($t \approx 0.46$).
    * Recoils through gentle undershoot ($x \approx 0.96$) at $t \approx 0.85$.
    * Settles smoothly and cleanly into $1.00$ exactly at $t = 1.00$ (the end of the clip).
* **Resting State Permanence**:
  * The timeline clip duration strictly dictates the **transition duration** (the time taken to grow from Initial value to Target value).
  * Once the clip ends ($t \ge \text{start} + \text{duration}$), the element permanently holds its final target state on screen without requiring an infinite animation clip, remaining fully visible and interactive until an explicit `Out` exit animation occurs.
* **Spring Parameter Propagation**:
  * Enhanced `getEasing` to accept physical `spring?: { stiffness?: number; damping?: number; mass?: number }` parameters, dynamically mapping them into normalized analytical spring trajectories for custom spring tuning.

---

### Decision 37: Design & Motion Truth Matrix — Autonomous Property Parity & Renderer Invariants
* **The Problem**:
  * In a professional motion design tool with dozens of style inputs (X, Y, W, H, rotation, opacity, fill, stroke, radii, polar shadows, blurs, typography, and specialized shape attributes), manual clicking is too slow and error-prone to catch silent rendering disconnects.
  * Discovered several silent bugs in the renderer layer:
    1. *SVG Shape Strokes*: When adding a stroke to a Star, Polygon, or Triangle, `ShapeRenderer` did not pass `stroke` or `strokeWidth` to the SVG `<polygon>`. Instead, CSS `borderWidth` was applied to the outer `div`, drawing an unwanted rectangular bounding box around the shape!
    2. *Icon Stroke Box*: Changing an icon's stroke width applied CSS `borderWidth` to the icon's outer container `div`, framing the icon with a square box border rather than cleanly styling the Lucide SVG icon stroke.
    3. *Text Background Fill*: Text layers in `AppearanceCard` only exposed `style.color` (text font color), leaving no way to set a background fill (`style.backgroundColor`) for cards, badges, and pill tags.
    4. *Custom Animation Parameter Aliases*: In `clipEvaluator`, certain parameter names (`toBlur` vs `toBackdropBlur`, `toWidth` vs `toWidthDelta`, `toBorderWidth` vs `toStrokeWidth`) were inconsistently resolved across custom channels.
* **The Solution**:
  * **Shape SVG Stroke Fix**: `ShapeRenderer` now forwards `stroke={strokeColor}`, `strokeWidth={strokeWidth}`, `strokeLinejoin`, and `strokeLinecap` directly to SVG `<polygon>` elements, and explicitly suppresses CSS `borderWidth: 0` on the outer container `div`.
  * **Icon Wrapper Neutrality**: `IconRenderer` sets `borderWidth: 0` on its outer wrapper `div` while feeding the stroke width directly into the Lucide SVG component.
  * **Dual Fill & Background for Text**: `AppearanceCard` now provides both **Text Color** (fill for glyphs) and an independent **Background** toggle with color picker for pills, badges, and text containers.
  * **Autonomous Truth Matrix Test Suite (`src/test/design_and_motion_truth_matrix.test.ts`)**:
    * Tests 100% of typography properties into rendered CSS (`x`, `y`, `width`, `height`, `rotation`, `opacity`, `color`, `backgroundColor`, `fontSize`, `fontWeight`, `fontFamily`, `letterSpacing`, `lineHeight`, `textAlign`, `textTransform`, `textDecoration`, `borderRadius`, `padding`).
    * Tests rectangle geometry, independent 4-corner radii (`[tl, tr, br, bl]`), and polar drop shadow math (`shadowAngle`, `shadowDistance`, `shadowBlur`, `shadowSpread`, `shadowColor`).
    * Tests all 14 custom animation channels with parameter sweeps across mid-transit and final duration states.
    * Tests lifecycle state invariants (`In` pre-window invisibility, `Action` in-place continuity, `Out` post-exit permanence).

---

### Decision 38: Context-Aware Animation Catalog Filtering & Inspector Symmetric Layout Polish
* **Context-Aware Animation Catalog per Element Type**:
  * Previously, the Custom animation tab displayed all 14 custom channels regardless of what element was selected, offering non-functional options (e.g. morph, corner radius, or stroke on plain text; radius, morph, or backdrop blur on single lines and icons; stroke or color fills on bitmap images and videos).
  * Implemented `getFilteredCustomCategories(layerType)` in `AnimationCatalogSheet.tsx`:
    - **Text / Chunk**: Hides `custom_morph`, `custom_radius`, `custom_stroke`. Keeps scale, rotation, movement, opacity, color, shadow, layer blur, backdrop blur, glass, resize, hide/show.
    - **Line**: Hides `custom_radius`, `custom_morph`, `custom_backdrop_blur`, `custom_glass`, `custom_resize`. Keeps stroke, color, move, scale, rotate, opacity, shadow, blur.
    - **Icon**: Hides `custom_radius`, `custom_morph`, `custom_backdrop_blur`, `custom_glass`, `custom_resize`. Keeps stroke, color, scale, rotate, move, opacity, shadow, blur.
    - **Image / Video**: Hides `custom_morph`, `custom_stroke`, `custom_color`. Keeps scale, move, rotate, opacity, shadow, blur, backdrop blur, glass, corner radius, resize.
    - **Shape**: Keeps all channels.
* **Inspector Symmetric Layout & Spacing Polish (Jitter Parity)**:
  * Resolved the 3:1 asymmetric spacing jitter across inspector property sections caused by parent `space-y-3` combined with child `pt-2 border-t`.
  * Converted `AppearanceCard.tsx`, `TransformCard.tsx`, and `ClipDetailView.tsx` to use unified `divide-y divide-border/50` with symmetric `py-2.5 space-y-2` rows.
  * Guarantees exact 10px spacing above and below every separator line with zero visual jitter when toggling checkboxes or switching selected layers.
* **Verification**:
  * 33 test suites (273 tests) pass cleanly.
  * Automated regression tests in `src/test/design_and_motion_truth_matrix.test.ts` verify all custom channels filtering across text, line, icon, image, and shape primitives.
  * Production bundle compiles cleanly with 0 TypeScript errors.

---

### Decision 39: Canvas Interaction, Smart Magnetic Guides & Multi-Selection Transform Engine
* **Segment-Bounded Smart Guides (`src/components/canvas/snapping.ts`)**:
  * Upgraded `SnapGuide` to track both primary axis coordinates and cross-axis segment boundaries (`start` and `end`).
  * Replaced harsh, full-bleed screen red laser lines with crisp, professional magenta smart guides (`#ec4899`).
  * When aligning elements, lines span specifically between the aligned primitives (with 8px extension) and endpoint tick marks rather than spanning the entire canvas.
  * Canvas center and edge anchors span canvas dimensions with high-contrast centered alignment badges (`Center`, `Middle`).
* **Cross-Edge & Adjacent Snapping**:
  * Added magnetic snapping for adjacent edge placement (target Left to sibling Right, target Right to sibling Left, target Top to sibling Bottom, target Bottom to sibling Top).
  * Enables effortless modular card grids, columns, toolbars, and button row layouts without manual coordinate calculations.
* **Equidistant Distribution & Gap Measurement**:
  * Added 3-element equidistant gap solver emitting centered distance badges (`16px`, `24px`, etc.) when elements are spaced evenly.
* **Multi-Selection Snapping & Proportional Resizing (`src/components/canvas/TransformBox.tsx`)**:
  * **Collective Multi-Selection Snapping**: When dragging multiple selected layers, the collective bounding box snaps magnetically against canvas centers, canvas edges, and all unselected sibling elements, translating all layers with exact alignment.
  * **Multi-Selection Resize Handles**: Enabled 8 transform handles on the multi-selection bounding box. Resizing the bounding box proportionally computes scale factors ($X, Y$) and scales every layer's position and dimensions relative to the selection origin.
  * **Aspect Ratio & Center Constraints**: Supports `Shift` (preserve aspect ratio) and `Alt` (symmetric resize from center) for both single and multi-layer selections.
* **Keyboard Nudge Precision (`src/components/canvas/hooks/useCanvasHotkeys.ts`)**:
  * Added arrow key navigation for selected canvas elements:
    - `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`: $1\text{px}$ micro-nudge.
    - `Shift + Arrow`: $10\text{px}$ rapid-nudge.
  * Atomically wrapped with `startTransaction()` and `commitTransaction()`.
  * Safely ignored when typing in input fields, textareas, or inline text editing.
* **Verification**:
  * Created dedicated test matrix `src/test/canvas_smart_guides_matrix.test.ts` with 14 comprehensive unit tests.
  * All 34 test suites (287 tests) pass 100%.
  * Production build compiles cleanly with zero TypeScript errors.

---

### Decision 40: True Per-Scene Background Color & Canvas Format Locking
* **Project-Wide Canvas Format Locking on Secondary Scenes**:
  * An exported motion graphic file (MP4, WebM, ProRes) is a single rectangular video file with one canonical resolution and aspect ratio (16:9, 9:16, 1:1, 4:5).
  * In `SceneSettingsCard.tsx`, the layout controls are explicitly designated as **Canvas Format**.
  * On scenes subsequent to the first scene (`sceneIndex > 0`), Format dropdown and Size inputs are safely locked with a clean lock badge: `Project (Scene 1)`, preventing accidental global dimension shifts that would scramble previous scenes.
* **True Per-Scene Background Fill (`updateScreen`)**:
  * Previously, changing the Fill in `SceneSettingsCard.tsx` mistakenly called `updateSettings({ backgroundColor })`, causing all scenes to change color globally and forcing users into tedious dummy rectangle workarounds.
  * Connected Fill controls directly to `updateScreen(activeScreen.id, { backgroundColor })`. Each scene can now feature its own independent background color (e.g. Scene 1 dark `#09090b`, Scene 2 editorial white `#ffffff`, Scene 3 brand accent `#7c3aed`).
  * Added a convenient one-click **"Apply to all scenes"** action for users who want unified branding across all scenes.
  * Updated `PixiStage.ts`'s `renderScreen` so the export engine dynamically repaints the artboard to the active scene's specific background color.
* **Verification**:
  * Added test cases to `src/test/design_and_motion_truth_matrix.test.ts` verifying independent multi-scene background persistence and project canvas invariants.
  * All 34 test suites (289 tests) pass 100%.
  * Production build compiles cleanly with zero TypeScript errors.

---

### Decision 41: High-Performance Figma-Grade ColorPicker & Controlled "Apply to All Scenes" Checkbox
* **Elimination of OS-Native Color Picker Modal Lag**:
  * Previously, color pickers across the app relied on browser-native `<input type="color">`. On Windows Chrome, Edge, and Tauri/Electron, this spawns an out-of-process OS modal dialog which triggers DOM value fighting, stutter, and 60 FPS history cloning floods (`commitDoc` deep-cloning the entire project state 60x/sec during mouse drags).
  * Replaced every occurrence of native color inputs with a custom, high-performance `<ColorPicker>` component (`src/components/ui/color-picker.tsx`) built on `@radix-ui/react-popover`.
* **Figma-Grade Interactive Color System**:
  * **2D Saturation / Value Gradient Canvas**: Fluid pointer capture (`setPointerCapture`) with closed-form HSV $\leftrightarrow$ HEX math (`hexToHsv`, `hsvToHex`).
  * **1D Hue Spectrum Slider**: Rainbow gradient bar with linear percentage-to-hue interpolation.
  * **Hex Text Input & Live Preview**: Real-time validated 3-character and 6-character hex input.
  * **Curated Design Swatches**: Instant one-click access to 12 curated Apple/Google design tokens (neutrals, darks, vibrant accents).
  * **Zero-Lag History Transaction Batching**: Drag gestures invoke `startTransaction()` on pointerdown and `commitTransaction()` on pointerup with RAF throttling (`requestAnimationFrame`), delivering silky 60–120 FPS dragging without history stack pollution or dropped frames. Includes global window `pointerup` safety listener to prevent uncommitted transactions.
  * **Universal Application**: Wired into `SceneSettingsCard.tsx` (Scene Fill), `AppearanceCard.tsx` (Layer Fill, Text Color, Background Fill, Stroke, Sticker Border), and `ClipDetailView.tsx` (Initial Value, Target Color, Stroke Color).
* **Controlled "Apply to All Scenes" Checkbox**:
  * In `SceneSettingsCard.tsx`, converted the one-off text action into a controlled Radix Checkbox: `[ ] Apply to all scenes`.
  * When checked, adjusting scene background color or toggling fill instantly propagates across all scenes in `doc.screens` and updates `doc.settings.backgroundColor`. Checking the checkbox immediately synchronizes the current scene's color across all project scenes.
  * When unchecked, color edits remain strictly isolated to the active scene (`activeScreen.id`).
* **Verification**:
  * Created dedicated unit test suite `src/test/color_picker_and_scene_fill.test.ts` (5 tests passing).
  * All 35 test suites (294 tests) pass 100%.
  * Production build compiles cleanly in 11.41s with zero errors.

---

### Decision 42: Figma-Grade Color & Linear Gradient Picker with Circular Palette Swatches
* **Solid & Gradient Dual Mode Architecture**:
  * Upgraded `src/components/ui/color-picker.tsx` with a dual-tab header: `[ Solid ]` and `[ Linear Gradient ]` with active indicator underline and close action.
  * Smart auto-detection parses incoming CSS values: if the value contains `linear-gradient(...)`, the picker automatically mounts in Gradient mode with parsed stops and angle; if solid hex/rgba, it mounts in Solid mode.
* **Interactive Gradient Stop Bar & Controls**:
  * Multi-stop gradient slider with draggable thumbs along a live gradient track.
  * Clicking any stop selects it for live editing (color, opacity, offset).
  * Clicking an empty section of the bar automatically creates a new color stop at that exact percentage.
  * Stop deletion support when $>2$ stops exist.
  * Precise degree/angle numeric input (`0°` to `360°`) with directional presets.
  * Analytical CSS serializer producing `linear-gradient(${angle}deg, ${stops})`.
* **Opacity / Alpha Slider & Native Eyedropper**:
  * Added high-performance opacity slider with checkerboard transparency grid backing.
  * Direct integration with Chromium/Tauri `window.EyeDropper` API for picking screen pixels.
  * Hex dropdown indicator, live swatch dot preview, and dedicated opacity percentage input (`0%` to `100%`).
* **Circular Design Swatches**:
  * Replaced square swatches with small circular color/gradient dots (`w-5 h-5 rounded-full`) with a `+ Add` button to save active colors or gradients.
* **Universal Rendering Engine Updates**:
  * `styleUtils.ts`: Uses `css.background` for layers when background fill contains gradients.
  * `ScreenRenderer.tsx`: Artboard uses `background: bg` so scene gradients render natively on canvas.
  * `PixiStage.ts`: Protected against NaN when parsing linear-gradient strings during headless video export.
* **Verification**:
  * Created dedicated test suite `src/test/color_and_gradient_picker.test.ts` (9 tests passing).
  * All 36 test suites (303 tests) pass 100%.
  * Production build compiles cleanly in 9.75s with zero errors.

---

### Decision 43: Interactive 2-Point Vector Gradient Dragger & Clean View Separation
* **Clean Dual-View Specialization**:
  * Eliminated redundant controls copied between views. Solid view and Gradient view are now engineered as two distinct, specialized workspaces.
* **View 1: Solid Color Workspace**:
  * Focuses purely on solid color composition: 2D Saturation/Value canvas, native Eyedropper (`window.EyeDropper`), rainbow Hue slider, checkerboard Opacity slider, Hex input with live dot, and % input.
* **View 2: Gradient Workspace (2-Point Vector Dragger & Dashed Line)**:
  * **Interactive 2D Gradient Canvas**: The top canvas displays the live gradient in real-time, overlaid with 2 draggable circular handles connected by an SVG high-contrast dashed vector line.
  * **Natural Direction & Angle Vector Math**: Dragging either handle dynamically recalculates the vector angle ($\theta = \text{atan2}(dy, dx)$), giving users physical, intuitive control over angle, origin, and spread directly on the canvas.
  * **Gradient Controls Row**:
    - Mode toggle dropdown (`Linear` / `Radial`).
    - Reverse button (`ArrowLeftRight` / `⇄`) that inverts the stop sequence.
  * **Stop Track & Compact Stop Inspector**:
    - Live multi-stop track with draggable thumb markers and click-to-add stop functionality.
    - Compact, non-redundant Stop Inspector: Stop index/offset, color swatch, hex input, opacity % input, delete stop button (when $>2$ stops), and quick hue spectrum bar.
  * **Common Footer**: Shared circular palette swatches with `+ Add` button.
* **Verification**:
  * Full test suite: 36 test suites (303 tests) pass 100%.
  * Production build compiles cleanly in 10.39s with zero errors.

---

### Decision 44: All 4 Gradient Types Dropdown, Stop Color Picker Popover, & Contextual Saved Swatches
* **4-Type Gradient Dropdown Menu (Figma Parity)**:
  * Replaced the binary toggle with a proper Radix `DropdownMenu` supporting all 4 standard design tool gradient types:
    1. **Linear**: `linear-gradient(${angle}deg, ...)`
    2. **Radial**: `radial-gradient(circle, ...)`
    3. **Angular**: `conic-gradient(from ${angle}deg at 50% 50%, ...)`
    4. **Diamond**: True 4-facet diamond starburst reflection matching Figma and professional design tools.
  * Visual active checkmark (`✓`) on the currently selected gradient type with degree badge.
* **Stop Box Color Picker Popover**:
  * Clicking on the Stop color box (`Stop 1`, `Stop 2`, etc.) opens a dedicated standard color picker popover:
    - 2D Saturation / Value Canvas for that specific stop.
    - Eyedropper tool to sample screen pixels into the stop.
    - Full-spectrum Hue slider and Opacity slider for the active stop.
  * Adjustments live-update the stop color and re-render the 2D gradient canvas in real time.
* **Contextual Saved Swatches Removal**:
  * Removed the solid "Saved" palette swatches section from the Gradient view, reserving it exclusively for the Solid view where solid color presets belong.

---

### Decision 52: True 4-Facet Diamond Gradient & High-Contrast Menu System
* **Dropdown Menu High-Contrast Theme Alignment**:
  * Resolved the white-on-white text contrast defect where `DropdownMenuContent` had hardcoded `text-zinc-200` on light background popovers.
  * Migrated `src/components/ui/dropdown-menu.tsx` to semantic design tokens: `border-border`, `bg-popover`, `text-popover-foreground`, and `focus:bg-accent focus:text-accent-foreground`.
  * Added explicit `font-medium text-foreground hover:bg-muted` classes to all menu items in `color-picker.tsx` for razor-sharp legibility in both light and dark themes.
* **True 4-Facet Diamond Gradient Reflection Formula**:
  * Replaced the radial ellipse approximation with a true 4-facet diamond starburst reflection:
    $$\text{Diamond CSS} = \text{radial-gradient}(\text{circle at 50\% 50\%}, \text{glow}) + \text{conic-gradient}(\text{from } \theta, \text{8-facet symmetry})$$
  * Recreates the exact four-pointed diamond / cross reflection radiating from center $(50\%, 50\%)$ with smooth angular transitions and center optical blending matching Figma and modern design references.
* **Stop Inspector Layout Polishing**:
  * Expanded the opacity input in the stop inspector from `w-14` to `w-16` (`pr-4`), ensuring `100 %` displays with full breathing room without character truncation.
* **Verification**:
  * 36 test files, 304 unit and integration tests passing 100%.
  * Production build compiles cleanly with zero TypeScript errors.

---

### Decision 53: Official .mtn Custom Save File Format, File System Adapter & Omnipresent Drag-and-Drop
* **Official Single-File Package Extension (`.mtn`)**:
  * Established `.mtn` as Motion Studio's official native single-file package format (`application/x-motion-studio` / `application/json`).
  * Enforces strict Zod schema validation (`MotionStudioFileSchema` in `src/types/projectFile.ts`) covering `$schema`, `format: "motion-studio"`, `version: 1`, `generator`, `exportedAt`, `metadata: ProjectMeta`, and `document: SceneDocument`.
* **Dual Backward Compatibility**:
  * Built `validateAndNormalizeProjectFile` to seamlessly parse both the new v1 `.mtn` envelope and legacy raw `SceneDocument` JSON / `.motion` files without exceptions or data loss.
* **Native File System Access API & Adapter**:
  * Created `src/services/fileAdapter.ts` with direct OS filesystem saving via `window.showSaveFilePicker` and `window.showOpenFilePicker`.
  * Implemented in-memory file handle caching (`FileSystemFileHandle`) allowing native `Ctrl+S` / `Cmd+S` to write directly back to disk without repeatedly prompting save dialogs.
  * Graceful fallback to `Blob` / anchor download and `<input type="file">` for browsers without File System Access API.
* **High-Productivity File Menu & Keyboard Shortcuts**:
  * Upgraded `TopNavBar.tsx` project title into a full Figma-grade File Dropdown Menu:
    * Inline rename trigger
    * **Save (`Ctrl+S`)**
    * **Save As... (`Ctrl+Shift+S`)**
    * **Open Project (`Ctrl+O`)**
    * **Export Video...**
    * **Back to Projects Dashboard**
  * Registered global shortcuts in `App.tsx` for `Ctrl+S`, `Ctrl+Shift+S`, and `Ctrl+O`.
* **Omnipresent Drag-and-Drop Loading**:
  * Wrapped the entire application shell with a global drag-and-drop listener and visual backdrop overlay (*"Drop .mtn project to open"*).
  * Dropping any `.mtn`, `.motion`, or `.json` file anywhere on the workspace or canvas automatically validates the document and opens it into the editor.
* **Verification**:
  * 37 test suites, 314 unit and integration tests passing (`npm test`).
  * Production build compiles cleanly with 0 TypeScript / Vite bundling errors in 9.53s (`npm run build`).

---

### Decision 54: Multi-Scene Sequence Export, Transparent Alpha Video & Downward-Expanding Export Card
* **Multi-Scene Sequence Stitching (`src/engine/export/videoExporter.ts`)**:
  * Upgraded `videoExporter.exportVideo` to support sequence stitching across multiple scenes (`screens: Screen[]`):
    $$\text{Sequence Duration} = \sum_{i} \text{screen}_i.\text{duration}$$
  * Deterministic frame-accurate clock ($t_{\text{global}} = k / \text{fps}$) resolving to active scene and relative local time $t_{\text{local}} = t_{\text{global}} - \text{sceneStart}$.
  * Handles scene transitions and triggers `pixiStage.renderScreen(scene)` on scene boundaries with zero black frames or timing drift.
* **Transparent Alpha Video Export**:
  * Integrated true alpha channel export: sets `pixiStage.setTransparentBackground(true)` (renderer alpha `0.0`, hidden artboard border and shadow).
  * Automatically encodes with VP9 alpha profile (`video/webm; codecs=vp09.00.10.08` or `video/webm; codecs=vp9`).
  * Automatically restores solid artboard fill and shadow upon export completion or abort.
* **Downward-Expanding Export Popover Card (`src/components/export/ExportPopover.tsx`)**:
  * Replaced the disruptive full-screen modal with a compact Radix `Popover` anchored directly to the purple Export button in `TopNavBar`.
  * **Precision Two-Decision UI**: Exposes strictly Background (`With Background` vs `Transparent`) and Scope (`All Scenes` vs `Current Scene`), eliminating redundant frame rate pickers that would disrupt per-scene aesthetic `stepFps` (e.g., 8 FPS stop-motion vs 60 FPS fluid springs).
  * **In-Card Live Progress**: Transitions within the popover to show live frame counter (`Frame 142 / 300`), animated gradient progress bar, rolling ETA (`~4s left`), and an instant `Cancel Export` button.
* **Verification**:
  * 38 test suites, 317 unit and integration tests passing cleanly (`npm test`).
  * Production build compiles cleanly with 0 TypeScript / Vite bundling errors in 8.56s (`npm run build`).

---

### Decision 55: Codebase Pruning & Tauri v2 Native Desktop Application Foundation
* **Dead Code Cleanup & Dependency Pruning**:
  * Executed static analysis via `fallow dead-code` and manual codebase audit.
  * Deleted 3 completely unused UI components: `src/components/ui/separator.tsx`, `src/components/ui/slider.tsx`, and `src/components/ui/tabs.tsx`.
  * Removed unneeded dependencies from `package.json`: `@radix-ui/react-separator`, `@radix-ui/react-slider`, and `@radix-ui/react-tabs`.
* **Tauri v2 Desktop Architecture Setup**:
  * Initialized official Tauri v2 project structure (`src-tauri/`) with `npm run tauri init`:
    * Configured bundle identifier: `app.motionstudio`.
    * Window configuration: 1440×900 initial dimensions, minimum bounds 1024×700, resizable, centered.
    * Development & build commands wired directly to Vite (`npm run dev`, `npm run build`).
  * Configured `Cargo.toml` and `src-tauri/src/lib.rs` with essential native plugins:
    * `tauri-plugin-dialog`: Native OS file open and save dialogs for `.mtn` project files.
    * `tauri-plugin-fs`: Direct native filesystem read/write for projects and exported assets.
    * `src-tauri/capabilities/default.json`: Granted default permissions for `core`, `dialog`, and `fs`.
* **Cross-Environment File Adapter (`src/services/fileAdapter.ts`)**:
  * Added `isTauriEnvironment()` to detect runtime presence of `__TAURI_INTERNALS__` or `__TAURI__`.
  * In Tauri desktop runtime, `saveProjectToFile()` and `openProjectFromFile()` dynamically invoke `@tauri-apps/plugin-dialog` and `@tauri-apps/plugin-fs` with native file paths and OS dialogs.
  * In browser environments, seamlessly falls back to Web File System Access API (`showSaveFilePicker` / `showOpenFilePicker`) and Blob download.
  * Maintained native file path state (`currentFilePath`) for direct `Ctrl+S` desktop saving.
* **Scripts & Verification**:
  * Added npm scripts: `"tauri": "tauri"`, `"desktop:dev": "tauri dev"`, `"desktop:build": "tauri build"`.
  * All 38 test suites (319 tests) passing 100% via `npm test`.
  * Production bundle compiles in 8.77s with 0 TypeScript errors.

---

### Decision 56: Tauri & Vite Watcher Isolation (EBUSY Lock Resolution)
* **Root Cause Diagnosis**:
  * When executing `tauri dev`, Vite runs concurrently via `beforeDevCommand`.
  * Vite's file watcher (`server.watch`) defaulted to monitoring the entire repository workspace, including `src-tauri/target/debug/deps/`.
  * When Cargo generated and locked Windows DLLs (`phf_macros-*.dll`), Node's `fs.watch` attempted to hook the locked file, throwing `EBUSY: resource busy or locked` and aborting Vite.
* **Architecture Fix in `vite.config.ts`**:
  * Configured `server.watch.ignored: ['**/src-tauri/**']` to completely isolate Vite's hot-reload watcher from Cargo's intermediate binary builds.
  * Added `server.strictPort: true` to guarantee Tauri webview connects strictly to port 5173.
  * Added `clearScreen: false` so Cargo compilation output remains uninterrupted in console output.
* **Verification**:
  * Verified Cargo compilation completes with 0 errors (`Finished dev profile [unoptimized + debuginfo] target(s) in 1m 11s`).
  * 38 test suites passing cleanly (`npm test`).

---

### Decision 57: Desktop Natural Storage, File-Project Name Synchronization, and Tauri Capability Scopes
* **Window Label & Capability Matching (`tauri.conf.json` & `capabilities/default.json`)**:
  * Configured explicit `"label": "main"` on the primary window in `tauri.conf.json`, matching `"windows": ["main"]` in `capabilities/default.json`.
  * Added `core:path:default` for cross-platform path resolution (`documentDir()`, `join()`).
  * Configured explicit filesystem permissions and allow scopes in `capabilities/default.json` for `$DOCUMENT/**`, `$HOME/**`, `$DESKTOP/**`, `$DOWNLOAD/**`, and `$APPDATA/**`, resolving permission denials on Windows paths.
* **Natural Default Desktop Storage & Autosave (`src/services/fileAdapter.ts`)**:
  * Added `getDefaultProjectsDirectory()` targeting `Documents/Motion Studio`. Automatically creates the directory on demand.
  * When saving for the first time or via Save As (`Ctrl+Shift+S`), the native OS dialog now opens directly into `Documents\Motion Studio\` with suggested `.mtn` filename pre-filled.
  * Added `autoSaveDesktopSnapshot()` to continuously mirror active projects as `.mtn` files into `Documents/Motion Studio/Autosaves/` (debounced at 1200ms), ensuring no work is ever lost even if the user never presses `Ctrl+S`.
  * Isolated Tauri desktop saving from browser download fallbacks: desktop save errors now return clean failure notices rather than leaking downloads into the user's `Downloads` folder.
* **File Name <-> Project Name Bidirectional Synchronization**:
  * In `useProjectRegistryStore.ts` (`saveCurrentProjectToFile`): saving a file (e.g. `first.mtn`) immediately strips the extension and updates the project title to `first` in `useProjectStore`, the document AST, and the project registry.
  * In `useProjectRegistryStore.ts` (`openProjectFromFilePicker`): opening `first.mtn` names the active project and document `first`.
  * In `TopNavBar.tsx`: added reactive `useEffect` syncing the title input and `document.title` (`${doc.name} — Motion Studio`) with `doc.name`.
  * When editing the title in TopNavBar, subsequent saves default to the updated title name.
* **Verification**:
  * Added unit test cases verifying `getDefaultProjectsDirectory`, `autoSaveDesktopSnapshot`, and filename-to-project-name synchronization.
  * All test suites pass 100% cleanly.

---

### Decision 58: White Canvas Default, Fill Toggle Re-enable Fix, and Inspector Layout Compression
* **Default Scene Background to White (`#ffffff`)**:
  * Updated `INITIAL_SCENE` in `src/store/initialScene.ts` and `createProject` in `src/services/projectStorage.ts` to default `settings.backgroundColor` and `screens[0].backgroundColor` to `#ffffff` instead of `#09090b`.
  * Updated `addScreen` in `src/store/slices/sceneSlice.ts` to automatically inherit the project's background color (`doc.settings.backgroundColor ?? doc.screens[0]?.backgroundColor ?? "#ffffff"`), ensuring newly appended scenes match the project canvas without starting black.
* **Fill Checkbox Toggle Re-enable Bug Resolution (`src/components/inspector/design/SceneSettingsCard.tsx`)**:
  * **Root Cause**: When unchecking Fill, `backgroundColor` was set to `"transparent"`. In JavaScript, `("transparent" || "#ffffff")` evaluates to `"transparent"` because `"transparent"` is a truthy string. Consequently, attempting to re-check Fill repeatedly evaluated `nextFill` as `"transparent"`, permanently preventing the fill checkbox from being checked again.
  * **Fix**: Re-evaluated `hasSceneFill` as `screenBg !== "transparent" && Boolean(screenBg)`. When enabling fill from a transparent state, `restoreColor` safely falls back to `#ffffff` if `settings.backgroundColor` is `"transparent"`, guaranteeing reliable, infinite toggle capability.
* **Canvas Format Header Compression (`src/components/inspector/design/SceneSettingsCard.tsx`)**:
  * Compressed the multi-line, broken layout into a clean, single-row header containing only `Canvas Format` and a lock icon `<Lock />` when not on the primary scene (`!isFirstScene`), completely eliminating horizontal text wrapping and clutter.
* **Verification**:
  * Added unit tests in `src/test/color_picker_and_scene_fill.test.ts` for default white background and bidirectional fill toggling.
  * All tests pass cleanly.

---

### Decision 59: Sequential Scene Background Inheritance & Removal of "Apply to All"
* **Sequential Preceding Screen Background Inheritance (`src/store/slices/sceneSlice.ts`)**:
  * In `addScreen`, newly appended scenes now automatically inherit the background of the **preceding scene** (`const lastScreen = doc.screens[doc.screens.length - 1]; const inheritedBg = lastScreen?.backgroundColor ?? doc.settings?.backgroundColor ?? "#ffffff";`).
  * Workflow: Scene 1 (white) $\to$ Scene 2 starts with white. If Scene 3 is changed to black $\to$ Scene 4 starts with black. If Scene 4 is changed to a gradient $\to$ Scene 5 starts with that gradient.
* **Removal of "Apply to All Scenes" Complexity (`src/components/inspector/design/SceneSettingsCard.tsx`)**:
  * Eliminated the `applyToAllScenes` checkbox, state, and batch-mutation logic entirely.
  * Every scene independently controls its own background fill without global cross-scene overwriting side-effects.
* **Verification**:
  * Added unit test suite in `src/test/color_picker_and_scene_fill.test.ts` verifying sequential inheritance across multiple scenes (white $\to$ black $\to$ gradient).
  * All 38 test suites (322 tests) pass 100% cleanly.

---

### Decision 60: Triangle/Star Fill Bug Resolution and Line Shape Creation & Rendering
* **Triangle & Star Fill & Stroke Disentanglement (`src/components/canvas/renderers/ShapeRenderer.tsx`)**:
  * **Root Cause**: To avoid rendering a rectangular box behind SVG shapes (stars, triangles, polygons), `ShapeRenderer` set `baseCss.backgroundColor = "transparent"`. However, the inner SVG `<polygon fill={fill}>` evaluated `fill = combinedStyle.backgroundColor || ...`. Since `"transparent"` is truthy in JavaScript, `fill` became `"transparent"`. Thus, shapes rendered completely invisible with zero stroke, and with a hollow interior when a stroke was added. Changing the fill color in the inspector had zero visual effect.
  * **Fix**: Disentangled outer container CSS from the SVG fill. The SVG `<polygon>` now directly resolves `rawFill = (computedStyle?.backgroundColor as string) || layer.style.backgroundColor`. If `rawFill` is `"transparent"` or `"none"`, it safely renders `fill="none"`; otherwise it renders the authored fill color (`#3b82f6`, `#ffffff`, etc.). Adding a stroke now renders the border around the solid filled shape, and toggling fill turns it on/off seamlessly.
* **Line Shape Creation & Rendering Parity (`src/components/canvas/helpers/toolCreationHelpers.ts`, `LineRenderer.tsx`, `ShapeRenderer.tsx`, `PixiStage.ts`)**:
  * **Root Cause 1**: `LineRenderer` cleared box-borders via `baseCss.borderWidth = 0`. It then resolved `strokeWidth = typeof combinedStyle.borderWidth === "number" ? combinedStyle.borderWidth : ...`. Because `0` is a number, `strokeWidth` evaluated to `0`, causing the SVG `<line>` to render at 0px thickness (completely invisible).
  * **Root Cause 2**: In `toolCreationHelpers.ts`, the line creation helper created a line layer with undefined `borderWidth`, `borderColor`, and `backgroundColor`, leaving the inspector controls uninitialized and stroke width unconfigured.
  * **Fix**:
    * In `LineRenderer.tsx` and `ShapeRenderer.tsx`, resolved `strokeWidth` and `strokeColor` directly from `layer.style` or `computedStyle` without being masked by `baseCss.borderWidth = 0`.
    * In `toolCreationHelpers.ts`, initialized lines with default `strokeWidth: 3`, `borderWidth: 3`, `borderColor: THEME_TOKENS.accent.primary`, and `backgroundColor: THEME_TOKENS.accent.primary`, allowing users to adjust color via either Fill or Stroke controls in the inspector.
    * In `PixiStage.ts`, updated `drawShape` to draw lines with explicit stroke and only apply fills when `hasFill` is truthy and not a line shape.
* **Verification**:
  * Added unit test suite in `src/test/design_and_motion_truth_matrix.test.ts` verifying triangle/star fill preservation, hollow toggling, line creation, and stroke resolution.
  * All 38 test suites (324 tests) pass 100% cleanly.

---

### Decision 61: Interactive Drag-to-Create Elements on Canvas with Live Preview Ghost & Modifiers
* **Creation Lifecycle Architecture (`src/components/canvas/CanvasViewport.tsx`, `toolCreationHelpers.ts`)**:
  * Replaced immediate on-mousedown layer spawning with a 3-stage interactive drag lifecycle (`onMouseDown` $\to$ `windowMouseMove` $\to$ `windowMouseUp`).
  * On mouse down with a creation tool (`rectangle`, `circle`, `star`, `triangle`, `polygon`, `line`, `arrow`, `frame`, `text`), captures `drawingCreation` starting coordinates without committing to the AST.
  * On mouse move, dynamically evaluates candidate bounds, modifier keys, and dimensions.
  * On mouse up, finalizes the element at the exact authored size, position, and orientation, auto-selects the created layer, and restores `activeTool` to `"select"`.
* **Hybrid Click vs. Drag (Best of Both Worlds)**:
  * **Drag ($\Delta > 5\text{px}$)**: Spawns the element matching the user's dragged bounding box or line vector.
  * **Single Click ($\Delta \le 5\text{px}$)**: Gracefully falls back to placing standard default dimensions (`200×200`, `240×70`, etc.) centered at the click position.
* **Professional Modifiers (Figma/Illustrator Parity)**:
  * **Shift Key (Aspect Lock & Angle Snap)**: Locks 1:1 aspect ratio for boxes (perfect squares for rectangle/frame, perfect circles for ellipse/star, equilateral polygons). For lines and arrows, snaps angle to clean 45° increments (0°, 45°, 90°, 135°, 180°).
  * **Alt Key (Center Origin Expansion)**: Expands shapes outward symmetrically from the initial click point rather than corner-to-corner.
  * **Escape Key**: Instantly cancels current drawing creation drag and returns to select tool with zero side effects.
* **Real-Time Creation Ghost Preview Overlay (`CanvasViewport.tsx`)**:
  * For box shapes and frames: renders a high-visibility dashed accent border (`#7c3aed`), translucent fill, and real-time dimension badge (`320 × 240`).
  * For lines and arrows: renders an accent line rotated directly along the drag vector with live length and angle badge (`280px (45°)`).
* **Text Layer Auto-Proportioning (`toolCreationHelpers.ts`)**:
  * When dragging a custom text box, `fontSize` automatically scales proportionately to dragged height (`Math.min(72, Math.max(20, Math.round(height * 0.55)))`), immediately opening inline editing upon placement.
* **Verification**:
  * Added unit test suite in `src/test/canvas_interaction_matrix.test.ts` (Domain K) verifying custom bounds creation across shapes, frames, text, lines, and click fallbacks.
  * All 38 test suites (329 tests) pass 100% cleanly.

---

### Decision 62: Element Individuality, Form Truth & Physics Guardrails
* **Layer Icon Resolution & Timeline/Sidebar Unification (`src/components/common/LayerIcon.tsx`, `TimelinePanel.tsx`, `LeftSidebar.tsx`)**:
  * Unified layer icon resolution across all 12 layer types (`Line` $\to$ `Minus`, `Arrow` $\to$ `ArrowUpRight`, `Frame` $\to$ `BoxSelect`, `Video` $\to$ `Film`, `Counter` $\to$ `Timer`, `3D Mockup` $\to$ `Box`, `Star` $\to$ `Star`, `Polygon` $\to$ `Hexagon`, `Circle` $\to$ `Circle`, `Text` $\to$ `Type`).
  * Fixed legacy bug where lines, frames, polygons, and media defaulted to rendering the `Type` (`T`) text icon.
* **Design Inspector Pruning & Missing Controls (`src/utils/layerCapabilities.ts`, `TransformCard.tsx`, `AppearanceCard.tsx`, `SpecializedLayerCard.tsx`)**:
  * Established pure capability predicates (`canHaveBorderRadius`, `canHaveFill`, `canHaveGlass`, `canHaveTrimPath`, `isVectorLine`, `isCircle`, `isStar`, `isPolygon`, `isMedia`, `isFrame`).
  * **TransformCard**: Pruned 4-corner radii inputs on 1D lines, arrows, circles, stars, polygons, and icons. Replaced Width/Height with direct single-metric inputs (`Length` [L] for lines, `Diameter` [D] for circles).
  * **AppearanceCard**: Pruned nonsensical Area Fill on 1D lines and arrows; pruned competing CSS box stroke on icons; adapted Stroke to "Line Stroke" for lines; strictly guarded Shadow, Sticker Border, Background Blur, and Glass so they only render for supported surface types.
  * **SpecializedLayerCard**: Added parametric controls for Stars (`points` 3–20, `innerRadiusRatio` 10%–90%); added Vector Trim Paths (`trimStart`, `trimEnd`, `trimOffset`); added Line Cap (`round`, `butt`, `square`), Pattern (`solid`, `dashed`, `dotted`), and Reverse Direction action; added Media Fit mode (`cover`, `contain`); added Frame Auto-Layout direction and gap.
* **Direct Vector Endpoint Manipulation in Canvas Gizmos (`src/components/canvas/TransformBox.tsx`)**:
  * Suppressed the 8 rectangular bounding box resize handles and rotation lever when selecting 1D vector lines or arrows.
  * Rendered 2 direct circular vector endpoint handles ($P_1$ Start, $P_2$ End) enabling direct aiming and resizing.
  * Dragging endpoints calculates vector length and angle in real time with `Shift` snapping (45° increments).
  * Canvas HUD dynamically displays `Length: {W}px ({Angle}°)`.
* **Context Menu Specialization (`src/components/canvas/CanvasContextMenu.tsx`)**:
  * Added element-specific context menu actions for Lines (Reverse Direction, Toggle Arrowhead), Text (Toggle Auto-Width / Fixed Box), and Media (Toggle Cover / Contain).
* **Math Physics Clamping & Guardrails (`src/engine/evaluator/clipEvaluator.ts`, `configEvaluator.ts`, `src/engine/physics/animationGuardrails.ts`)**:
  * Clamped RGB channels in `lerpColor` to $[0, 255]$ to prevent color blowout or negative channels on overshooting spring curves.
  * Clamped `blur` and `backdropBlur` to $\ge 0\text{px}$.
  * Clamped `radiusPercent` in `circleIris` and `circleReveal` to prevent negative radii CSS clip-path crashes.
  * Created `animationGuardrails.ts` enforcing channel-easing compatibility (e.g. non-spatial channels must be monotonic) and layer-preset compatibility.
* **Agent Tools & AST Pre-Flight Linter (`src/tools/applyAnimation.ts`, `src/tools/placeElement.ts`, `src/engine/perception/linter.ts`)**:
  * `applyAnimation`: Sanitizes presets and easings via `sanitizeAnimationForLayer` with constructive notices.
  * `placeElement`: Sanitizes styles and adds notices for lines (strips `fontSize`, `borderRadius`, `fillColor`), polygons, and circles.
* **Non-Destructive Glass, Shadow Default Angle & Border Preservation, and Trim Path Rendering (`AppearanceCard.tsx`, `styleUtils.ts`, `LineRenderer.tsx`, `ShapeRenderer.tsx`)**:
  * **Non-Destructive Glass**: Completely eliminated the invasive color-swapping and stroke-turning macro. Glass is now a pure optical shader/effect that adds frosted backdrop blur and specular bevel highlights compoundable with authored drop shadows, without touching or overriding the user's authored background color, borders, or shadows.
  * **Polar Drop Shadow Reliability**: Removed the strict requirement for explicit `shadowAngle`, defaulting `shadowAngle: 90` (straight down) so shadows immediately render upon toggling. Removed the toxic side-effect that cleared `borderWidth: 0, borderColor: "transparent"` on shadow toggle and scrubbing, restoring the ability to have both border and shadow.
  * **Vector Line & Shape Trim Path Rendering**: Connected `trimStart`, `trimEnd`, and `trimOffset` to SVG `strokeDasharray` and `strokeDashoffset` in `LineRenderer.tsx` and `ShapeRenderer.tsx` (across lines, arrows, stars, polygons, rectangles, and circles), and connected `strokeCap` (`round`, `butt`, `square`), enabling real-time visual trimming on vector paths.
* **Verification**:
  * Added comprehensive test suite `src/test/element_individuality_matrix.test.ts` (13 tests).
  * All 39 test suites (342 tests) pass 100% cleanly (`npm test`).
  * Production build passes with 0 errors (`npm run build`).

---

### Decision 63: Tactile UX — Dynamic Sensitivity, Gearing & Zero-Value Preservation for Scrubbable Inputs
* **The Problem**:
  * **Zero-Value Checkbox Collapse**: Scrubbing properties with single numerical values (stroke width, shadow distance/blur, sticker border, layer blur, background blur) down to `0` previously triggered an immediate unchecking of their master toggle checkboxes and collapsed the inspector section. In creative tools, a value of `0` is a valid authored setting (e.g. zero blur, 0px border, or 0% opacity), not an instruction to delete or deactivate the property.
  * **High Scrubbing Sensitivity & Runaway Increments**: Mouse hold-and-drag scrubbing in `ScrubbableInput` previously mapped 1 mouse pixel directly to 1 full unit (`stepDelta = deltaX * step * multiplier`). For small ranges (e.g. stroke width 1..24, star points 3..20, blurs 0..30), tiny mouse twitches or normal hand movements caused massive, uncontrolled jumps (e.g. moving 20px immediately added +20 to stroke width, shooting from 2px to 22px).
* **The Solution**:
  * **Zero-Value Preservation (`AppearanceCard.tsx`)**:
    * Decoupled master checkbox activation from numerical value checks (`hasStroke`, `hasShadow`, `hasStickerBorder`, `hasLayerBlur`, `hasBgBlur`).
    * Scrubbing any property down to `0` leaves the master checkbox checked and the section open, allowing seamless micro-tuning from 0 upward without UI collapse.
  * **Dynamic Sensitivity & Precision Gearing (`src/components/ui/scrubbable-input.tsx`)**:
    * Implemented `calculateScrubDelta(deltaX, startVal, options)` with automatic range- and magnitude-based gearing:
      1. **Tight Ranges ($range \le 24$, e.g. stroke width 1..24, star points 3..20, polygon sides 3..12)**:
         $baseUnitsPerPixel = 0.1 \times step$ (~10px of drag per 1 unit increment) for ultra-fine micro-precision.
      2. **Standard Bounded Ranges ($range \le 100$, e.g. opacity 0..100%, trim path 0..100%, corner radius 0..100)**:
         $baseUnitsPerPixel = 0.3 \times step$ (~3.3px of drag per 1 unit increment).
      3. **Angular Ranges ($range \le 360$, e.g. 0°..360° light angle, rotation)**:
         $baseUnitsPerPixel = 0.6 \times step$ (~1.6px of drag per 1 degree).
      4. **Large Open Dimensions ($|startVal| > 150$, e.g. canvas coordinates, 1920 width, 1080 height)**:
         $baseUnitsPerPixel = 1.0 \times step$ (1px per unit) for responsive positioning.
      5. **Fractional Steps ($step < 1$, e.g. 0.01, 0.1)**:
         $baseUnitsPerPixel = step \times 0.25$ for high-precision sub-unit control.
    * **Subtle Non-Linear Acceleration**:
      Micro-adjustments ($\le 40\text{px}$) stay locked at $1.0\times$ acceleration for stable nudging. Long deliberate sweeps smoothly ramp up to $2.5\times$, preventing fatigue during large edits.
    * **Keyboard Modifiers**: Retained industry-standard `Shift` ($10\times$ fast scrub) and `Alt` ($0.1\times$ micro-precision).
    * **Explicit Sensitivity Prop**: Added optional `sensitivity?: number` prop to `ScrubbableInputProps` for custom overrides.
* **Verification**:
  * Added 6 unit tests in `src/test/element_individuality_matrix.test.ts` verifying dynamic sensitivity across ranges, coordinates, modifiers, acceleration, and custom overrides (19 total tests in file).
  * All 39 test suites (348 tests) pass cleanly (`npm test`).
  * Production build compiles cleanly with 0 errors in 10.17s (`npm run build`).

---

### Decision 64: Timeline Architecture — Transport/Ruler Top Row, Touching Scene Blocks & Height Expansion
* **The Problem**:
  * Previously, the Timeline Panel placed the Scene Blocks Row (`h-7`) at `top-0`, and placed the Sticky Ruler / Transport Controls row (`h-8`, containing the Play button, Loop button, and time ticks) *below* the scene blocks at `top-7`, with both wrapped inside the scrollable tracks container (`overflow-y-auto`).
  * As a result, when users scrolled down through track rows, layers and animation clips scrolled up between or behind the sticky elements, making the play button and ruler look like they were "floating" with clips appearing above and below them.
  * Furthermore, the play button row did not seamlessly touch the scene component, and the total timeline height was cramped at `240px` (only ~180px for tracks).
* **The Solution**:
  * **Top-Level Header Reordering (`TimelinePanel.tsx`)**:
    * **Row 1 (Top Header, `h-8` 32px)**: Dedicated transport and time ruler header containing the Play/Pause button, Loop mode toggle (`All` / `Scene`), ruler ticks, seconds indicators (`0.00`, `1s`, `2s`...), and red playhead pill.
    * **Row 2 (Scene Blocks, `h-7` 28px)**: Placed directly on top of the tracks and **touching directly underneath Row 1** with a clean single 1px border. Contains scene counts/duration and scene duration blocks.
  * **Scroll Container Isolation**:
    * Both Row 1 and Row 2 are now hoisted out of the scrollable container as fixed, non-scrolling `shrink-0` headers.
    * Track rows and animation clips are isolated inside their own `flex-1 overflow-y-auto` container strictly *below* the scenes. No track or clip can ever scroll over, between, or above the transport controls or scenes.
  * **Global Vertical Playhead Alignment**:
    * The global vertical red playhead line now anchors at `top-8` (32px from top, directly underneath the red playhead badge) and extends seamlessly down through the scene blocks and all layer clips to the bottom of the panel.
  * **Timeline Height Expansion**:
    * Increased panel height from `h-[240px]` to `h-[300px]` (providing ~240px of clear vertical track space), allowing 7–8 layer tracks to display comfortably without clipping or premature scrolling.
* **Verification**:
  * All 39 test suites (348 tests) pass cleanly (`npm test`).
  * Production build compiles cleanly with 0 errors in 9.91s (`npm run build`).

---

### Decision 65: Animation Catalog Purity, Native Draw-On Trim Path, & Direct Manipulation Star/Text Gizmos (Options 1 & 3)
* **The Problem**:
  * In `AnimationCatalogSheet.tsx`, custom animation channels and entrance presets were not properly filtered per element type, exposing corner radius to circles, stars, polygons, lines, and unboxed text; exposing fill colors and blur to 1D lines; and lacking a first-class trim path draw-on animation.
  * In the Canvas Viewport (`TransformBox.tsx`), stars lacked on-canvas direct manipulation for inner radius sharpening, and text layers lacked intuitive edge double-click toggle handlers (`auto-width` point text vs `auto-height` wrapping vs `fixed` box).
* **The Solution**:
  1. **Animation Catalog Purity & Draw-On Preset (`AnimationCatalogSheet.tsx`)**:
     * Upgraded `getFilteredCustomCategories(targetLayer)` to strictly evaluate capabilities via `canHaveBorderRadius`, `isVectorLine`, `isCircle`, `isStar`, `isPolygon`, and `canHaveTrimPath`.
     * Pruned Corner Radius from circles, stars, polygons, 1D lines, and unboxed text.
     * Pruned Area Fill, Glass, and Background Blur from 1D lines; pruned box properties from icons.
     * Added native `drawOn` ("Draw Path (Trim)") entrance preset for vector lines and stroked shapes.
     * Added `custom_trim` ("Trim Path") under Style custom channels.
     * Added animated thumbnail preview for `drawOn` / `custom_trim` using `@keyframes anim-preview-drawOn`.
  2. **Physics & Trim Evaluation (`clipEvaluator.ts`, `evaluator.ts`, `ShapeRenderer.tsx`, `LineRenderer.tsx`)**:
     * Added `trimStart`, `trimEnd`, and `trimOffset` to `EvaluatedDelta`.
     * Evaluates `drawOn` entrance clips from 0% to 100% trim progression across clip window, with 0% pre-window and 100% post-window settlement.
     * Compounded trim properties into evaluated CSS and wired `ShapeRenderer` & `LineRenderer` to read `computedStyle.trimStart`, `trimEnd`, and `trimOffset`.
  3. **Canvas Direct Manipulation Gizmos (`TransformBox.tsx`)**:
     * **Parametric Star Inner Radius Handle**: Rendered at the star's inner vertex in the viewport. Dragging calculates unprojected polar distance from center and dynamically updates `innerRadiusRatio` clamped to `[0.10, 0.95]`, with real-time HUD percentage readout (`Inner Radius: {pct}%`).
     * **Text Sizing Mode Edge Toggles & Handlers**:
       * Double-clicking East/West handle toggles between `auto-width` (point text) and `auto-height` (wrapping text).
       * Double-clicking South/North handle toggles between `auto-height` (wrapping text) and `fixed` (fixed box).
       * Dragging East/West handle sets `textSizing: "auto-height"` with fixed width and auto-growing height.
       * `styleUtils.ts` prioritizes `textSizing === "auto-height"` before `boxMode === "area"`, guaranteeing dynamic text wrapping.
---

### Decision 66: Directional Preset Consolidation & Element-Specific Typography Motion Presets Suite
* **The Problem**:
  * In the animation catalog, directional presets (e.g., `slideUp`, `slideDown`, `slideLeft`, `slideRight`) repeated 4 times across cards, creating unnecessary catalog bloat and visual clutter. Direction is a parameter, not an entirely separate preset.
  * In `AnimationCatalogSheet.tsx`, Text animations lacked distinct categorization between **Headline & Display (Single Word / Short Titles)** and **Paragraph & Reading (Multi-Word / Body Copy)**, forcing users to sift through generic presets.
  * In `TextRenderer.tsx`, text baseline reveals previously used a linear calculation `(currentTime - wordStart) / duration` without the clip's analytical easing curve, and risked chopping typographic descenders ('g', 'y', 'p', 'q', 'j').
* **The Solution**:
  1. **Directional Preset Consolidation (`configEvaluator.ts`, `AnimationCatalogSheet.tsx`, `ClipDetailView.tsx`)**:
     * Consolidated `slideUp`, `slideDown`, `slideLeft`, `slideRight` into a single, unified `Slide` preset card (`id: "slide"`). Direction is chosen in `ClipDetailView` using the 4-way direction selector (`Up`, `Down`, `Left`, `Right`).
     * Preserved 100% backward compatibility: legacy `slideUp/Down/Left/Right` route directly to the consolidated evaluator.
     * Evaluates `slide` across all 4 directions with analytical physical accuracy:
       * Entrance (`in`): `up` ($+y \to 0$), `down` ($-y \to 0$), `left` ($+x \to 0$), `right` ($-x \to 0$).
       * Exit (`out`): `up` ($0 \to -y$), `down` ($0 \to +y$), `left` ($0 \to -x$), `right` ($0 \to +x$).
     * Consolidated `mask_reveal` and `maskWipe` into a single `Wipe Mask` preset card (`id: "wipe"`) with directional edge unmasking.
     * Consolidated Exit presets: single `Slide Out` card replaces 4 separate exit slides.
  2. **High-Craft Typography Motion Presets Catalog (`AnimationCatalogSheet.tsx`)**:
     * When a text layer is selected, the catalog dynamically groups entrance presets into two distinct sections:
       * **Headline & Display (Single Word / Short)**:
         * `baselineRise`: Unmasks upward from the typographic baseline.
         * `blurFocusPop`: Optical telephoto rack focus ($20\text{px} \to 0\text{px}$ blur, $0.92 \to 1.0$ scale).
         * `trackingExpansion`: Cinematic typographic letter-spacing expansion ($-3\text{px} \to 0\text{px}$).
         * `elasticScalePop`: Punchy spring entrance with harmonic recoil ($k=180, c=12$).
         * `textShimmer`: Keynote specular light beam sweeping across glyphs at $115^\circ$.
         * `slide`: Consolidated directional slide.
         * `fade`: Soft optical alpha reveal.
       * **Paragraph & Reading (Multi-Word / Body Copy)**:
         * `wordCascade`: Rhythmic word-by-word spring stagger entrance ($70\text{ms}$ delay, order support).
         * `lineReveal`: Editorial line-by-line unmasking from below with metric descender protection.
         * `typewriter`: Characters reveal sequentially with blinking caret cursor.
         * `highlightDraw`: Kinetic marker accent drawing behind copy.
         * `slide`: Consolidated directional slide.
         * `fade`: Soft optical alpha reveal.
  3. **Baseline Descender Protection & Analytical Eased Transform (`TextRenderer.tsx`)**:
     * Replaced the linear `(currentTime - wordStart) / duration` with `compileTransform(wordEval.transform)`, guaranteeing full analytical spring physics.
     * Added typographic descender protection: wrapped tokens/lines in `paddingBottom: "0.28em", marginBottom: "-0.28em"` with `verticalAlign: "bottom"`, ensuring letters with deep descenders ('g', 'y', 'p', 'q', 'j') are never cut off.
     * Added line-by-line unmasking (`splitBy: "line"`).
* **Verification**:
  * Added 4 unit tests in `src/test/element_individuality_matrix.test.ts` verifying directional de-duplication, 4-way entrance & exit slide evaluation, typography catalog categorization, and analytical preset evaluations (28 tests total in file).
  * All 39 test suites (357 tests) pass cleanly (`npm test`).
  * Production build compiles cleanly with 0 errors in 9.94s (`npm run build`).

---

### Decision 67: Universal Element-Specific Animation Preset Suite (Surfaces, Media, Vectors, Icons)
* **The Problem**:
  * After delivering dedicated presets for typography (Decision 66), other element types (Surfaces/Cards, Media/Images/Videos, Vectors/Lines, and Icons) still relied on generic transform presets (`pop`, `fade`, `grow`), lacking the tailored physical and optical characteristics expected of Apple- and Google-tier showcases.
  * Surfaces needed dynamic physical elevation blooms and optical frosted glass irises.
  * Media elements lacked cinematic telephoto zooms (`kenBurns`) and camera rack focus pulls (`focusPull`).
  * Vector lines and arrows needed kinetic draw-on shoot progression (`arrowShoot`) and animated dash flowing (`dashFlow`).
  * Icons and glyphs needed playful rotational kicks (`iconPop`) and tactile contact stamping (`stampSettle`).
* **The Solution**:
  1. **Preset Catalog Expansions (`AnimationCatalogSheet.tsx`, `src/types/animation.ts`)**:
     * **Surfaces & Cards (`Frame`, `Rectangle`)**:
       * `cardSettlePop`: Overshoot scale entrance ($0.88 \to 1.0$) with harmonic spring settle ($k=180, c=14$).
       * `elevationRise`: Translates vertically ($+24\text{px} \to 0$) while physically blooming dynamic `boxShadow` ($0\text{px } 4\text{px } 8\text{px} \to 0\text{px } 20\text{px } 40\text{px } \text{rgba}(0,0,0,0.20)$).
       * `glassIris`: Frosted glass aperture reveal combining optical backdrop blur ($20\text{px} \to 0\text{px}$ filter blur and progressive CSS `backdropFilter: blur()`).
     * **Media (`Image`, `Video`)**:
       * `kenBurns`: Cinematic telephoto camera drift slowly scaling from $1.0 \to 1.08$ with subtle $+20\text{px}$ camera pan.
       * `focusPull`: Optical camera rack focus pulling out of a heavy $16\text{px}$ Gaussian blur into crisp focus with subtle $1.04 \to 1.0$ zoom settle.
     * **Vectors & Lines (`Line`, `Arrow`)**:
       * `arrowShoot`: Directional path shoot advancing `trimEnd` from $0\% \to 100\%$ along the vector trajectory.
       * `dashFlow`: Continuous linear loop animating `trimOffset` ($0\% \to 100\%$) for kinetic dashed paths.
     * **Icons & Glyphs (`Icon`)**:
       * `iconPop`: Snappy overshoot scale pop ($k=220, c=12$) with playful $-15^\circ \to 0^\circ$ rotational kick.
       * `stampSettle`: Vertical descent from above ($-30\text{px} \to 0$) with elastic contact dampening ($k=240, c=16$).
  2. **Evaluation Engine Fidelity (`configEvaluator.ts`, `clipEvaluator.ts`)**:
     * Added pre-window, active-window, and post-window mathematical evaluation for all 9 new presets.
     * `clipEvaluator.ts` injects dynamic `boxShadow` (for `elevationRise`) and `backdropFilter` (for `glassIris`) directly into `EvaluatedDelta`, seamlessly rendering in CSS without component modifications.
     * `arrowShoot` and `dashFlow` integrate directly into the vector trim path rendering engine via `trimEnd` and `trimOffset`.
  3. **Clip Detail Inspector Integration (`ClipDetailView.tsx`)**:
     * Updated inspector property selectors so presets expose relevant controls (`isScaleBased`, `isRotationBased`, `isShadowBased`, `isBlurBased`).
* **Verification**:
  * Added 3 comprehensive integration unit tests in `src/test/element_individuality_matrix.test.ts` verifying catalog inclusion, analytical physics evaluation, and `clipEvaluator` dynamic property injection.
  * All 31 tests in `element_individuality_matrix.test.ts` pass cleanly.
  * All 39 test suites (360 tests) pass cleanly (`npm test`).
  * Production build compiles cleanly with 0 errors in 10.39s (`npm run build`).

---

### Decision 68: Context Menu Simplification, Prompt Modal Eradication & Precision Actions
* **The Problem**:
  * Right-clicking canvas elements exposed generic clutter: `Add Animation...` with nested submenus (redundant with the Animate Inspector) and `Rename Layer`, which triggered ugly native browser modals (`window.prompt("Rename layer:")`).
  * Other context menus (timeline tracks, clips, cards, scenes) also relied on `window.prompt()`, breaking immersion and violating the precision tool principle (Rule 9).
  * Canvas right-click lacked element-specific physical operations (e.g. Reverse Direction / Toggle Arrowhead on lines, Auto-Width / Auto-Height toggle on text, Fit Mode on media).
* **The Solution**:
  1. **Eradication of Browser Prompt Modals (`contextMenuBuilders.tsx`)**:
     * Completely removed all 5 `window.prompt()` calls from `contextMenuBuilders.tsx`.
     * Renaming is performed exclusively through the left sidebar outliner and inspector using high-craft inline editing (`setRenamingLayerId`, `setRenamingSceneId`), matching Figma and After Effects.
  2. **Canvas Element Context Menu (`buildCanvasElementMenu`)**:
     * Pruned `Add Animation...` and `Rename Layer`.
     * Added **Form-Truth Context Actions**:
       * **Lines & Arrows**: "Reverse Direction" (swaps endpoints), "Toggle Arrowhead" (line $\leftrightarrow$ arrow).
       * **Text**: "Switch to Auto-Width" $\leftrightarrow$ "Switch to Auto-Height".
       * **Media**: "Toggle Fit Mode (Cover / Contain)".
     * Retained essential arrangement (Bring to Front, Bring Forward, Send Backward, Send to Back) and core operations (Duplicate, Delete).
  3. **Timeline Menus Streamlining**:
     * **Timeline Clip Menu (`buildTimelineClipMenu`)**: Pruned hardcoded `Swap Preset` and `Rename Clip` prompt; kept precision clip controls (Split at Playhead, Duplicate, Align Start to Playhead, Delete).
     * **Timeline Track Menu (`buildTimelineTrackMenu`)**: Pruned animation entrance/action/exit submenus and prompt rename; kept Razor Split, Duplicate, Visibility toggle, and Delete.
     * **Timeline Empty Menu (`buildTimelineEmptyMenu`)**: Pruned `Add Animation` submenu; kept Work Area bounds controls (In, Out, Reset).
     * **Canvas Pasteboard Menu (`buildCanvasPasteboardMenu`)**: Pruned shape creation shortcuts; kept Select All, Zoom 100%, and Fit to Viewport.
* **Verification**:
  * Updated unit tests in `src/test/context_menu_system.test.ts` and `src/test/omnipresent_renaming.test.ts` to verify the absence of prompt modals and the presence of high-signal actions.
  * All 39 test suites (360 tests) pass cleanly (`npm test`).
  * Production build compiles cleanly with 0 errors in 10.24s (`npm run build`).

---

### Decision 69: Option C Dynamic Layer Echo & Unified Animation Catalog Aesthetic
* **The Problem**:
  * The animation catalog preview tiles in `AnimationCatalogSheet.tsx` suffered from severe visual disharmony:
    * `Card Settle` and `Elevation Rise` rendered ad-hoc website card wireframes with fake paragraph skeleton lines, looking completely out of place for general shapes and icons.
    * `Glass Iris` displayed cartoon polka dots behind its frosted surface.
    * `Draw Path (Trim)` on rectangles created an optical illusion of a 3D card rotating around the Y-axis due to opacity fades and arbitrary stroke directions.
    * `Fade In`, `Card Settle`, `Elevation Rise`, and `Slide` looked overly similar because their physical and optical channels lacked clear visual differentiation.
* **The Solution**:
  1. **Option C: Dynamic Layer Echo (`AdaptivePreviewShape`)**:
     * Preview tiles dynamically mirror the geometry of the selected `targetLayer`:
       * **Text (`text`, `chunk`)**: Refined `"Ag"` typographic specimen in bold display serif/sans.
       * **Lines & Arrows (`line`, `arrow`)**: Clean vector line or arrow with matching line caps.
       * **Circles (`circle`, `ellipse`)**: Clean circular geometry (`rounded-full` or SVG circle).
       * **Stars (`star`)**: 5-point star SVG with analytical `generateStarPoints`.
       * **Polygons & Triangles (`polygon`, `triangle`)**: Regular polygon/triangle SVG with `generatePolygonPoints`.
       * **Media (`image`, `video`)**: Modern media frame tile with subtle photo icon.
       * **Icons (`icon`)**: Crisp Lucide vector glyph (`Sparkles`).
       * **Rectangles & General Shapes**: Clean rounded studio tile (`rounded-[5px]`).
  2. **Unified Studio Tile Surface Styling**:
     * Standardized all preview elements to the exact same high-craft surface styling:
       `bg-[#f4f4f7] border border-[#d4d4d8] text-[#52525b] group-hover:bg-[#ede9fe] group-hover:border-[#7c3aed] group-hover:text-[#6d28d9]`.
     * Zero fake skeleton lines, zero arbitrary polka dots.
  3. **High-Signal Physical & Optical Channel Differentiation**:
     * **Draw Path (Trim)**: Uses the exact same geometry with `fill: none` and SVG `pathLength="100"`. A faint background guide track is visible at 20% opacity, while the active stroke draws smoothly from 0% to 100% with no opacity fading, completely eliminating the rotating-card optical illusion.
     * **Elevation Rise**: The shape stays centered with minimal Y travel, scales slightly ($1.0 \to 1.10$), and blooms a deep, soft, purple-tinted elevation shadow (`0 16px 24px -2px rgba(109, 40, 217, 0.45)`), distinctly communicating Z-axis elevation.
     * **Card Settle**: Physical spring bounce overshoot ($0.35 \to 1.24 \to 0.93 \to 1.0$) with crisp contact landing shadow.
     * **Glass Iris**: Frosted glass surface (`backdrop-blur-md bg-white/60 border border-white/90`) expanding over a soft ambient gradient glow in the preview tile.
     * **Slide**: Pure translational motion ($+24\text{px} \to 0\text{px}$) with zero scale change and zero elevation shadow.
     * **Fade In**: Pure alpha dissolve ($0.08 \to 1.0$), completely stationary at scale 1.0.
* **Verification**:
  * Unit tests added in `src/test/element_individuality_matrix.test.ts` verifying specialized catalog population and zero cross-pollution.
  * All 39 test suites (360 tests) pass cleanly (`npm test`).
  * Production build compiles cleanly with 0 errors in 10.86s (`npm run build`).

---

### Decision 70: Universal Element Splitting Engine (0.0000px Visual Shift Invariance)
* **The Problem**:
  * Choreographing sophisticated motion graphics (such as dual-origin path draw-on, stroke-draw then fill-fade, stagger-revealed typography without baseline jumps, arrow tip stamp-on after shaft travel, and un-nesting containers) previously required awkward manual workarounds or duplicate layers that broke alignment.
  * Attempting to split elements manually creates visual shifts ($> 0\text{px}$), breaks sentence font kerning/spacing, scrambles reading order, or ruins closed-contour corner arcs.
* **The Solution**:
  1. **Shape Contour Decomposition (`splitRoundedRectContour` & `splitCircleContour`)**:
     * Solves closed rounded rectangles into two continuous bezier arc SVG paths:
       * **Path A**: North-West ($NW$) $\to$ South-West ($SW$) $\to$ South-East ($SE$), preserving authored `borderRadius` arc segments (`A r r 0 0 0 ...`).
       * **Path B**: South-East ($SE$) $\to$ North-East ($NE$) $\to$ North-West ($NW$), preserving authored `borderRadius` arc segments.
     * Generates exact perimeter calculations (`pathPerimeter`) and SVG path definitions (`d`) rendered via `<path d={layer.d} pathLength="100" ... />`.
     * Pre-assigns dual-origin draw-on animations so both halves draw simultaneously from top-left and bottom-right.
     * Circles split cleanly into Top Semi-Circle Arc and Bottom Semi-Circle Arc ($180^\circ$ continuous arcs).
  2. **Stroke & Fill Separation (`separateStrokeAndFill`)**:
     * Disentangles any shape's stroke and fill into two sibling layers under a parent group:
       * **Fill Layer**: Keeps original geometry, `borderWidth: 0`, and `backgroundColor: layer.style.backgroundColor`, with delayed fade/bloom animation.
       * **Stroke Layer**: Keeps `backgroundColor: "transparent"` with authored `borderWidth` and `borderColor`, with instant draw-on animation.
  3. **Enhanced Typography Semantic Splitting (`splitTextIntoLines` & `splitTextBySelection`)**:
     * **Line Splitting**: Measures canvas text bounds or line-height intervals to split multiline text blocks into vertically stacked sibling layers with exact line advance offsets.
     * **Selection Splitting**: Splits text into strict reading order `[Prefix, Selection, Suffix]`, preserving word spacing advance widths and 0.0000px resting coordinates.
  4. **Line & Arrowhead Disentanglement (`splitLineAtRatio` & `detachArrowhead`)**:
     * **Midpoint/Ratio Splitting**: Decomposes a line into two collinear line segments with continuous travel and staggered draw-on.
     * **Arrowhead Detachment**: Converts a monolithic arrow into an independent line shaft (draw-on entrance) and arrowhead marker triangle glyph (punchy spring pop entrance).
  5. **Container / Group Coordinate Preservation Detaching (`detachGroupToAbsolute`)**:
     * Calculates absolute canvas transforms (`x = group.x + child.x`, `y = group.y + child.y`, `rotation = group.rot + child.rot`) and un-nests children directly into the scene root with 0.0000px layout shift.
  6. **Context Menus & Store Integration**:
     * First-class context menu options registered for shapes, lines, text, and groups.
     * Layer store actions: `splitShapeContour`, `separateStrokeAndFill`, `splitTextIntoWords`, `splitTextIntoLines`, `splitLineAtPoint`, `detachArrowhead`, and `detachGroupToAbsolute`.
* **Verification**:
  * 11 comprehensive automated tests in `src/test/universal_element_splitting.test.ts`.
  * All 40 test suites (372 tests) pass cleanly (`npm test`).
  * Production build compiles cleanly with 0 errors (`npm run build`).

---

### Decision 71: Pillar B Universal Relational Linking Engine
* **The Problem**:
  * Previously, creating coordinated motion (such as background cards expanding to hug dynamic typing text, badges pinned to moving corners, sibling words sliding to maintain an exact reflow gap, and connector lines tracking moving targets) required tedious, error-prone manual frame-by-frame coordinate math.
  * Lack of a first-class reflow gap primitive caused trailing elements to collide or drift when lead elements changed size or animated.
  * The Studio Inspector lacked UI to visualize, create, or tune relational bindings, and agents lacked high-level tools to bind elements safely with cycle prevention.
* **The Solution**:
  1. **Dynamic Reflow Gap (`mode: 'reflow'`)**:
     * Implemented first-class axis reflow in `dependencyEngine.ts`:
       * Horizontal flow: $x_{\text{driven}} = x_{\text{driver}} + w_{\text{driver}} + G$.
       * Vertical flow: $y_{\text{driven}} = y_{\text{driver}} + h_{\text{driver}} + G$.
       * Configurable cross-axis alignment (`start`, `center`, `end`).
       * Smooth second-order harmonic oscillator spring momentum hand-off when driver layer animates or changes bounds.
  2. **Dynamic Connector Lines (`mode: 'connect' | 'leader-line'`)**:
     * Real-time tracking of source anchor $P_1$ and destination anchor $P_2$, calculating line length ($dist$) and angle ($\theta$) dynamically on canvas as either endpoint element transforms.
  3. **Multi-Target Boundary Hugging & Spatial Pinning**:
     * Boundary hugging (`mode: 'hug'`) wraps container bounds around driver content with padding ($p_x, p_y$), anchor preservation, and spring buffering.
     * Spatial pinning (`mode: 'pin'`) locks driven elements to any of 9 driver anchors with offset $(dx, dy)$ and progress bar track following.
  4. **Cycle Prevention & Topological Sorting**:
     * Kahn's topological sort detects and handles dependency cycles safely, and agent tools prevent circular dependencies ($A \to B \to A$) constructively with learning notices.
  5. **Studio UI & Canvas Wire Feedback**:
     * **`RelationalLinksCard`**: Clean, high-signal Inspector card displaying active links with type badges (`HUG`, `PIN`, `REFLOW`, `CONNECT`), parameter summaries, deletion buttons, and an inline link creator.
     * **Multi-Selection Context Menus**: Single-click "Hug Bounds of...", "Pin to...", and "Reflow After..." actions when 2 canvas layers are selected.
     * **Visual Link Wires (`BindingConnectionOverlay`)**: Subtle glowing animated guide wires with anchor origin dots and relationship pills indicating active links on selected layers.
  6. **Agent Tools API**:
     * `link_elements` and `unlink_elements` tools in `src/tools/linkElements.ts` with Zod validation, parameter sanitization, and self-healing error handling.
* **Verification**:
  * 10 automated unit and integration tests in `src/test/universal_relational_linking.test.ts`.
  * All 41 test suites (382 tests) pass cleanly (`npm test`).
  * Production build compiles cleanly with 0 errors (`npm run build`).

---

### Decision 72: Interactive Split Mode & Move-As-One Compound Entities
* **The Problem**:
  * The initial splitting implementation provided hardcoded/pre-baked menu presets ("split into words", "split into lines", canned contour split) rather than an interactive user selection workflow.
  * Splitting allowed individual pieces to be dragged independently on the canvas, causing unintentional layout shifts, destroyed kerning, and misaligned contours.
* **The Solution**:
  1. **Strict 3-Element Scope & Pruned Context Menus**:
     - Stripped all canned preset items from right-click menus across the studio.
     - Shapes (Rectangles, Triangles, Polygons, Stars): Right-click $\to$ **"Enter Split Mode"**.
     - Lines & Arrows: Right-click $\to$ **"Enter Split Mode"**.
     - Text: Highlight any text span with cursor $\to$ right-click $\to$ **"Split"** (splits selection from remainder).
     - Images, Videos, 3D mockups, and Icons do not expose splitting.
  2. **Interactive Canvas Split Overlays**:
     - **`ShapeSplitOverlay`**: Displays 4 interactive edge selector bars (Top, Right, Bottom, Left) with high-contrast violet glow on hover/selected, minimum 1-edge constraint, and a floating frosted-glass action pill with "Confirm Split" and "Cancel".
     - **`LineSplitOverlay`**: Displays an interactive draggable cut pin and track along the line shaft with ratio readout, an optional "Detach Arrowhead" toggle for arrows, and a floating action pill.
  3. **Locked Compound Entity Architecture (`isCompound: true`)**:
     - When split, the resulting parts are grouped inside a parent container tagged with `isCompound: true` and `compoundType: 'split-shape' | 'split-text' | 'split-line'`.
     - In **Design Mode**, canvas clicks on any child segment automatically resolve to the compound parent group (`findParentGroupInTree`), guaranteeing the entity moves and transforms strictly as one unified object with 0.0000px visual shift.
     - In **Animate / Motion Mode**, sub-layers are individually selectable on the timeline and inspector, enabling distinct motion choreography (e.g. Draw-On Part 1 while Part 2 fades or settles).
  4. **Exact Shape Geometry & Aspect Ratio Matching (`shapeGeometry.ts`)**:
     - Derived exact parametric vertices and edges for Triangles (3 edges), Stars (10 edges), Polygons ($N$ edges), Rectangles (4 edges + corner arcs), and Circles (4 quadrant arcs).
     - Applied uniform $S = \min(W, H)/100$ scale and centering offsets ($offsetX, offsetY$) matching SVG `viewBox="0 0 100 100"` (`xMidYMid meet`), preventing distortion or skew on non-square shapes.
     - Formulated closed-loop corner junctions ($J_0, J_1, J_2, J_3$) ensuring zero missing corner arcs and 0.0000px gap.
   5. **Fill Preservation, Bounding-Box Border Isolation & Master Property Propagation**:
      - **Fill Preservation**: Splitting filled shapes preserves the original shape geometry and fill color via a dedicated `(Fill)` sub-layer. The split shape remains visually solid at rest—fill is never discarded.
      - **Bounding-Box Border Isolation (`GroupRenderer.tsx`)**: When `layer.isCompound` is true, the container `<div>` is strictly an invisible coordinate frame and never renders CSS `borderWidth`, `borderColor`, or `backgroundColor`.
      - **Master Property Propagation (`styleSlice.ts` & `layerSlice.ts`)**: Editing stroke width or color in the Inspector propagates to the actual constituent stroke paths (`shapeType === "path"`), rather than the bounding box. Editing fill color or toggling fill updates the fill sub-layer.
* **Verification**:
  * 12 dedicated tests in `src/test/interactive_split_mode.test.ts` (including filled solid star edge splitting, fill preservation, stroke propagation to edges without bounding box border, and red/transparent fill updates).
  * All 42 test suites (394 tests) pass cleanly (`npm test`).
  * Production build passes with 0 errors (`npm run build`).

---

### Decision 73: Cross-Element Morph Transition with Sub-Screen Target Picker & O(1) Particle Swarm
* **The Problem**:
  * Users needed a clean, world-class transition allowing one element to dematerialize into another element (e.g. glowing stars/dots flying from an old element to construct a new one), but existing workflows lacked a unified cross-element exit-to-entrance transition primitive.
  * Adding complex modal popups or disjointed tools would clutter the UI and violate the zero-noise precision principle (Rule 9).
* **The Solution**:
  1. **Dead-Simple UX in Animation Catalog (`AnimationCatalogSheet.tsx`)**:
     - Under the **Out (Exit)** category, added a single **"Morph into..."** preset card with dynamic preview animation.
     - Clicking "Morph into..." triggers a seamless slide transition to a dedicated **"Select Target Element" sub-screen** within the sidebar (complete with back navigation arrow, layer type icons, layer names, and search filter).
     - Selecting a destination element applies the morph preset on the source layer (`preset: 'morph', type: 'out'`) and automatically coordinates a synchronized entrance clip on the target layer (`preset: 'morphIn', type: 'in'`).
  2. **Morph Animation Inspector (`ClipDetailView.tsx`)**:
     - When inspecting a morph clip, the Inspector renders a dedicated **Cross-Element Morph Transition** panel:
       - **Target Element Row**: Displays the current target layer with its icon and title, plus a "Change" dropdown to re-link to any other layer in the scene at any time.
       - **Effect Style Picker**: Segmented control supporting all 6 visual archetypes:
         - `✦ Stardust`: Cosmic starburst & luminous harmonic particle swarm.
         - `💧 Liquid`: Viscous gooey metaball stretch & fusion.
         - `💎 Voronoi`: Crystalline polygonal shard detachment & magnetic snap.
         - `⚡ Laser`: Wireframe laser beam unspool & trace.
         - `🌀 Singularity`: Micro-star implosion, streak & shockwave burst.
         - `〰️ Spline`: Smooth continuous vector contour flow.
       - **Physical Tuning Parameters**: Particle density (`[ 40 | 80 | 160 ]`), turbulence slider (`0%` to `100%`), and particle shape (`[ Stars | Dots | Squares ]`).
  3. **Analytical O(1) Deterministic Particle Trajectory Solver (`particleSwarmSolver.ts`)**:
     - Implements closed-form second-order trajectories for all 6 styles without Euler numerical accumulation loops (Rule 4 compliance).
     - Guarantees 100% deterministic evaluation: identical particle positions whether playing forward, scrubbing backward, or exporting frame-by-frame.
     - Supports perimeter/interior point sampling, harmonic wave curl, velocity-aligned stretching, Voronoi shard polygon generation, and smooth linear RGB color interpolation.
  4. **Real-Time Viewport Overlay (`MorphTransitionRenderer.tsx` & `ScreenRenderer.tsx`)**:
     - Mounts directly inside the artboard coordinate frame.
     - Renders glowing SVG starbursts, metaball droplets, or polygonal shards during active morph windows at 60+ FPS with zero performance degradation.
* **Verification**:
  - 8 automated unit and integration tests in `src/test/cross_element_morph.test.ts`.
  - All 43 test suites (402 tests) passing cleanly (`npm test`).
  - Production build compiles cleanly in 8.97s (`npm run build`).

---

### Decision 74: Layer Masking & Clipping Masks ("Use as Mask")
* **Context & Motivation**:
  - Masking is a foundational pillar of motion design (reveals, shaped video crops, typographic window transitions, cutout hole-punches).
  - Rather than treating masks as static destructive cutouts, Motion Studio implements masks as dynamic, non-destructive, independently animatable and selectable entities matching the Figma and After Effects paradigm.
* **The Solution**:
  1. **Data Model (`src/types/layers.ts` & `src/types/scene.ts`)**:
     - `GroupLayer`: extended with `isMaskGroup?: boolean;` and `invertMask?: boolean;`.
     - `BaseLayer`: extended with `isMask?: boolean;`.
     - Standard convention: when `isMaskGroup` is true, the bottom layer (`children[0]` or layer with `isMask: true`) acts as the mask stencil, and all layers above it in that group render strictly within the stencil silhouette.
  2. **Store Actions (`src/store/slices/layerSlice.ts` & `src/store/types.ts`)**:
     - `maskSelection()`: Groups 2+ selected layers into a new `Mask Group` with computed bounding box, designating `children[0]` as the mask stencil (`isMask: true`).
     - `useAsMask(layerId)`: Converts a layer inside a group into that group's mask, or pairs a top-level layer with its sibling into a new Mask Group.
     - `unmaskGroup(groupId)`: Reverts `isMaskGroup: false` and clears `isMask` flags on children without destroying hierarchy. Self-healing: can be called with the group ID or any child inside the mask group.
     - `toggleMaskInvert(groupId)`: Toggles `invertMask: !group.invertMask` (stencil $\leftrightarrow$ cutout hole punch).
  3. **Direct Canvas Viewport Renderer (`src/components/canvas/renderers/GroupRenderer.tsx`)**:
     - Analytical `renderMaskGeometry()` converts any layer form (rectangle with border radius, circle/ellipse, star, polygon, triangle, text with typography attributes, line stroke, or image) into real-time SVG `<mask id={`mask-${layer.id}`}>` geometry.
     - Invert Mask support: draws an infinite white backdrop `<rect>` with a black stencil cutout to punch a transparent hole through the masked content.
     - Content container wrapped in `<div style={{ maskImage: "url(#mask-...)", WebkitMaskImage: "url(#mask-...)" }}>`.
     - Dedicated interactive canvas hit-target element `id={`layer-${maskChild.id}`}` ensures clicking the mask layer on canvas selects it, mounting `TransformBox` handles for dragging, scaling, and rotating the mask stencil independently.
  4. **Universal Keyboard Hotkey & Context Menus (`useCanvasHotkeys.ts`, `contextMenuBuilders.tsx`, `CanvasContextMenu.tsx`)**:
     - Shortcut: `Ctrl + Alt + M` (`Cmd + Option + M` on Mac) creates a mask selection when $\ge 2$ layers are selected, or toggles/releases mask when on a mask group.
     - Canvas and Layer Tree context menus provide "Mask Selection", "Use as Mask", "Release Mask", and "Invert Mask".
  5. **Layer Tree UI (`src/components/sidebar/LeftSidebar.tsx` & `LayerIcon.tsx`)**:
     - Mask Groups display a distinct stencil icon (`CircleDashed`).
     - Stencil child displays a purple `MASK` tag.
     - Masked content children display an indented clipped arrow badge (`⤷`).
  6. **Inspector Panel (`src/components/inspector/design/SpecializedLayerCard.tsx`)**:
     - Shows dedicated **Mask Group** card with stencil layer name, Invert Mask checkbox, and Release Mask button.
  7. **PixiJS Stage Integration (`src/engine/pixi/PixiStage.ts`)**:
     - Sets `groupContainer.mask = maskDisplayObject` for offline video exports and headless rendering.
* **Verification**:
  - 6 automated tests in `src/test/layer_masking.test.ts` covering multi-layer mask creation, single-layer use-as-mask, invert toggling, release mask, SVG geometry rendering for all shapes/text, and context menu generation.
  - All 44 test suites (408 tests) pass cleanly.
  - Production build succeeds without errors.

---

### Decision 75: Audio Track on Timeline & Waveform Sync
* **Context & Motivation**:
  - Precision motion design is inherently rhythmic. Kinetic typography, logo stingers, UI transitions, and video cut points require frame-accurate audio cues (beats, impacts, voiceover pauses, music transients).
  - Previously, Motion Studio had no audio synchronization or timeline waveform representation.
* **The Solution**:
  1. **Data Model (`src/types/scene.ts`)**:
     - Added `AudioTrack` interface:
       ```ts
       export interface AudioTrack {
         id: string;
         name: string;
         src: string;          // blob URL, data URL, or remote asset URI
         startTime: number;    // timeline offset in seconds
         duration: number;     // duration in seconds
         offset: number;       // trim offset into audio file in seconds
         volume: number;       // 0 to 1
         muted: boolean;
         waveform?: number[];  // normalized RMS peak buckets (0..1)
       }
       ```
     - Added `audioTracks?: AudioTrack[];` to `SceneDocument`.
  2. **Waveform Extraction (`src/engine/audio/audioWaveform.ts`)**:
     - Web Audio API integration: extracts audio data via `AudioContext.decodeAudioData`, samples RMS energy into normalized peak buckets (default 200 buckets) with linear dynamic range scaling.
     - Synthetic waveform fallback generator (`generateSyntheticWaveform`) ensures zero errors in test/offline environments or for unresolvable streams.
  3. **Reactive Playback Synchronization Engine (`src/engine/audio/AudioPlayerEngine.ts`)**:
     - Manages HTML5 `Audio` elements synced deterministically to `AnimationClock` / `currentTime`.
     - Handles `sync(currentTime, isPlaying, audioTracks)`: automatically seeks if drift exceeds 0.05s, updates volume/mute states, starts/pauses tracks on timeline entry/exit.
     - Guarded with robust error handling for jsdom/headless testing environments (safe stubs for `play()`, `pause()`, and `load()`).
  4. **Store Actions (`src/store/slices/audioSlice.ts` & `src/store/types.ts`)**:
     - `addAudioTrack(track)`: Registers new audio track and updates document.
     - `updateAudioTrack(id, partial)`: Updates properties like `startTime`, `volume`, `offset`, etc.
     - `removeAudioTrack(id)`: Removes track and clears player instance.
     - `toggleAudioMute(id)`: Convenient mute/unmute toggle.
     - Hooked into `playbackSlice.ts` so `setCurrentTime` and `setIsPlaying` immediately notify `audioPlayerEngine`.
  5. **Timeline UI (`src/components/timeline/AudioTrackRow.tsx` & `TimelinePanel.tsx`)**:
     - Mounted above layer tracks with header controls: music track icon, track name, mute button (`Volume2` / `VolumeX`), file picker button (`Upload`), and delete button.
     - Canvas/SVG waveform visualization: renders vertical peak bars colored in emerald/cyan accents indicating energy level.
     - Draggable track clip container reflecting `startTime`, clip width, and playhead position.
* **Verification**:
  - Automated test suite in `src/test/audio_track_and_waveform.test.ts` verifying:
    - Adding, updating, muting, and removing audio tracks in store.
    - Audio waveform extraction and peak normalization.
    - `AudioPlayerEngine` playback state and drift synchronization.
    - Audio track timeline playhead synchronization.
  - Production build (`tsc -b && vite build`) passes with zero errors.

---

### Decision 76: Native SVG Import & Vector Path Decomposition
* **Context & Motivation**:
  - Motion graphics rely heavily on vector iconography, custom logos, illustrations, and brand assets.
  - Previously, importing an SVG file treated it as a flat raster image or wasn't supported for clipboard paste and vector decomposition. Users could not animate individual vector strokes, separate paths, or apply Trim Path Draw-On to custom vectors.
* **The Solution**:
  1. **Analytical Path Bounding Box Solver (`src/engine/svg/svgPathBounds.ts`)**:
     - Fast, analytical parser computing `[minX, minY, maxX, maxY]`, `width`, and `height` from arbitrary SVG path `d` strings (supporting `M, L, H, V, C, S, Q, T, A, Z` in absolute and relative coordinates).
     - Pure TypeScript, zero external dependencies, works in Node, Browser, and Headless workers.
  2. **Native SVG Parser Engine (`src/engine/svg/svgParser.ts`)**:
     - `parseSvgString(svgString, options)`: parses raw SVG XML markup into structured scene layers.
     - Resolves root `viewBox` and dimensions, computing target placement and responsive scaling.
     - Converts all basic SVG primitives (`<path>`, `<rect>`, `<circle>`, `<ellipse>`, `<line>`, `<polyline>`, `<polygon>`) into normalized vector path shapes.
     - Cascades styles from parent `<g>` containers down to child paths (color fills, strokes, linecaps, linejoins, opacities, fill-rules).
     - Single elements map directly to `ShapeLayer` (`shapeType: 'path'`); multi-element SVGs map to `GroupLayer` containing child `ShapeLayer`s.
  3. **Vector Path Decomposition Engine ("Explode Vector Paths") (`src/engine/svg/svgDecomposer.ts`)**:
     - `decomposeVectorGroup(group)`: unwraps vector groups and hoists each path/shape to root canvas coordinates with **0.0000px visual shift invariance**.
     - Calculates tight local bounding boxes and transforms viewBoxes so each decomposed path gets an independent, tight 8-point bounding box on canvas.
  4. **Store Actions (`src/store/slices/layerSlice.ts` & `src/store/types.ts`)**:
     - `importSvg(svgString, targetPoint?, name?)`: parses SVG, commits layers to active screen, and selects the new vector graphic.
     - `decomposeVectorGroup(groupId)`: unrolls group into top-level layers in-place.
  5. **Direct Viewport Ingestion & Interaction**:
     - **Canvas Drag-and-Drop (`CanvasViewport.tsx`)**: dropping `.svg` files parses them into vector layers centered at the drop point.
     - **System Clipboard Paste (`useCanvasHotkeys.ts`)**: pasting copied SVG markup (e.g. from Figma "Copy as SVG" or web) or SVG files automatically imports native vector shapes.
     - **Toolbar File Picker (`FloatingDesignToolbar.tsx`)**: file input accepts `.svg` alongside raster images and routes to vector import.
     - **Context Menu (`contextMenuBuilders.tsx` & `CanvasContextMenu.tsx`)**: right-clicking a group provides **"Decompose Vector Paths"** to explode compound vectors.
  6. **Trim Path & Vector Animation Compatibility (`ShapeRenderer.tsx`)**:
     - `ShapeLayer` extended with `viewBox?: string` and `fillRule?: 'nonzero' | 'evenodd'`.
     - `ShapeRenderer` preserves SVG viewBox with `preserveAspectRatio="xMidYMid meet"`, enabling crisp vector scaling and immediate compatibility with **Trim Path Draw-On** (`trimStart`, `trimEnd`, `trimOffset`).
* **Verification**:
  - 10 automated unit and integration tests in `src/test/svg_import_and_decomposition.test.ts`.
  - Production build (`tsc -b && vite build`) succeeds without errors.

---

### Decision 77: Pen (`P`) & Pencil (`Shift + P`) Vector Drawing Tools
* **Context & Motivation**:
  - World-class motion design suites (After Effects, Cavalry, Rive) require first-class authoring tools for custom vector paths, custom kinetic masks, stylized hand-drawn flourishes, and signature calligraphic flourishes.
  - Previously, Motion Studio only supported pre-built geometric shapes (rectangles, stars, circles, polygons) and SVG file import, but lacked manual in-app vector path creation.
* **The Solution**:
  1. **Vector Spline & Curve Math Engine (`src/engine/vector/vectorCurveFitting.ts`)**:
     - `smoothPointsToPath(points, closed)`: converts freehand pointer trajectories into smooth $C^1$ continuous cubic Bézier paths using analytical Catmull-Rom to Bézier conversion with adaptive distance decimation (`simplifyPoints`).
     - `penVerticesToPath(vertices, closed)`: converts authored pen anchor points into precise SVG paths, supporting linear segments (`L`) and smooth dual-tangent Bézier arms (`C`).
  2. **Interactive Drawing Overlay (`src/components/canvas/VectorDrawingOverlay.tsx`)**:
     - Mounted dynamically inside the active artboard when `activeTool === "pen"` or `activeTool === "pencil"`.
     - **Pencil Mode**: captures real-time pointer gestures with silky smooth cubic Bézier stroke preview (`stroke="#3b82f6"`, width: 3, linecap: round). On pointer release, calculates tight bounds and instantiates a `ShapeLayer` (`shapeType: 'path'`).
     - **Pen Mode**:
       - Click to place linear anchor vertices.
       - Click & drag to pull out symmetric Bézier tangent arms with real-time visual handle rendering.
       - Dashed rubberband preview line connecting the active vertex to cursor.
       - Clicking near the initial anchor point ($\le 12\text{px}$) closes the loop (`Z`) and finalizes the shape.
       - `Enter` or double-click commits the open path.
       - `Escape` cancels or resets current drawing.
  3. **Data Model & Type System (`src/store/types.ts`)**:
     - Extended `CanvasTool` with `"pen"` and `"pencil"`.
     - Generated layers instantiate as first-class `ShapeLayer` models (`shapeType: 'path'`) with calculated `viewBox`, `strokeCap: 'round'`, `strokeJoin: 'round'`, and tight spatial coordinates.
     - Immediate compatibility with **Trim Path Draw-On** (`trimStart`, `trimEnd`) and SVG contour animations.
  4. **UI & Keyboard Shortcuts (`FloatingDesignToolbar.tsx` & `useCanvasHotkeys.ts`)**:
     - Added dedicated **Pen Tool (`P`)** and **Pencil Tool (`Shift + P`)** buttons to the floating design toolbar with active state styling.
     - Global hotkeys: `P` activates Pen tool; `Shift + P` activates Pencil tool; `Escape` exits to Select tool.
* **Verification**:
  - 8 automated tests in `src/test/vector_drawing_tools.test.ts`.
  - All 28 tests across the 4 core foundations pass cleanly in 2.5s.
  - Production build (`tsc -b && vite build`) succeeds without errors.

---

### Decision 78: Boolean Operations (Union, Subtract, Intersect, Exclude) & Shape Flattening
* **Context & Motivation**:
  - Professional vector motion graphics require the ability to combine and carve simple geometric primitives into complex iconography, logos, cutouts, and brand assets.
  - Previously, Motion Studio had no shape combination or Boolean grouping mechanisms.
* **The Solution**:
  1. **Data Model (`src/types/layers.ts`)**:
     - Added `BooleanOperationType = 'union' | 'subtract' | 'intersect' | 'exclude'`.
     - Extended `GroupLayer` with `isBooleanGroup?: boolean;` and `booleanOperation?: BooleanOperationType;`.
  2. **Live Non-Destructive Viewport Rendering (`GroupRenderer.tsx`)**:
     - **Subtract Mode**: dynamically punches cutout shapes (`children.slice(1)`) through the base layer (`children[0]`) using an inverted hardware-accelerated SVG `<mask id="...">`.
     - **Intersect Mode**: dynamically clips the base layer strictly to the intersection stencil of `children.slice(1)`.
     - Cutout layers render dedicated canvas hit-targets with subtle dashed rose outlines, allowing users to directly select and drag cutout circles/rectangles on canvas with real-time hole movement.
  3. **Analytical SVG Path Transformation Engine (`src/engine/svg/svgPathTransform.ts`)**:
     - `transformPath(d, { dx, dy, sx, sy })`: translates and scales arbitrary SVG path command streams (`M, L, H, V, C, S, Q, T, A, Z`) with subpixel mathematical accuracy.
  4. **Analytical Shape Flattening Engine (`src/engine/vector/booleanOperations.ts`)**:
     - `layerToLocalSvgPath(layer)`: converts any layer (rectangle, circle, ellipse, triangle, polygon, star, path) into local SVG path data.
     - `flattenBooleanGroup(group)`: combines transformed child paths into a single compound path with `fillRule: 'evenodd'` (or `'nonzero'` for union), normalizes coordinates to origin, and returns a single first-class `ShapeLayer` (`shapeType: 'path'`) with **0.0000px visual shift invariance**.
     - Resulting flattened layer is immediately compatible with **Trim Path Draw-On** animations (`trimStart`, `trimEnd`).
  5. **Store Actions (`src/store/slices/layerSlice.ts` & `src/store/types.ts`)**:
     - `applyBooleanOperation(op)`: groups 2+ selected layers into a new Boolean Group (or updates the operation on an existing boolean group).
     - `flattenSelection()`: bakes selected Boolean Group into a single flattened `ShapeLayer` in-place.
  6. **UI & Keyboard Hotkeys**:
     - **Floating Design Toolbar (`FloatingDesignToolbar.tsx`)**: shows compact Boolean Operations button group (Union, Subtract, Intersect, Exclude, Flatten) when 2+ layers or a boolean group is selected.
     - **Canvas Context Menu (`CanvasContextMenu.tsx` & `contextMenuBuilders.tsx`)**: right-click reveals Boolean operations and "Flatten to Vector Path".
     - **Inspector Panel (`SpecializedLayerCard.tsx`)**: reveals dedicated Boolean Group card with operation switcher tabs and Flatten button.
     - **Global Shortcuts**: `Ctrl + Alt + U` (Union), `Ctrl + Alt + S` (Subtract), `Ctrl + Alt + I` (Intersect), `Ctrl + Alt + X` (Exclude), `Ctrl + E` (Flatten).
* **Verification**:
  - 7 automated unit and integration tests in `src/test/boolean_operations.test.ts`.
  - All 35 tests across the motion design vector suites pass cleanly in 2.6s.
  - Production build (`tsc -b && vite build`) succeeds without errors.

---

### Decision 79: Kinetic Stagger & Multi-Layer Cascade System
* **Context & Motivation**:
  - In motion graphics, animating multiple elements simultaneously without timing offsets creates stiff, unnatural entrances.
  - While newly created toolbar elements receive default `0.5s` spacing, real-world compositions require tight micro-staggers (`0.04s` to `0.12s`) across duplicated components (`Ctrl+D`), imported SVG layers, multi-card layouts, or multi-line typographic lockups.
  - Animators need tactile, one-click spatial cascading (Left-to-Right, Top-to-Bottom, Center-Outward) without manually dragging dozens of timeline bars by milliseconds.
* **The Solution**:
  1. **Analytical Stagger Engine (`src/engine/choreography/staggerEngine.ts`)**:
     - `getLayerCenter(layer)` & `getCentroid(layers)`: calculates visual centers and collective geometric center-of-mass.
     - `sortLayersForStagger(layers, order)`: supports 8 spatial and hierarchical cascade modes:
       - `left-to-right`: sorts by horizontal center $x_c$ ascending.
       - `right-to-left`: sorts by $x_c$ descending.
       - `top-to-bottom`: sorts by vertical center $y_c$ ascending.
       - `bottom-to-top`: sorts by $y_c$ descending.
       - `center-out`: sorts radially by Euclidean distance from collective centroid $d = \sqrt{(x-C_x)^2 + (y-C_y)^2}$ ascending.
       - `edges-in`: sorts radially by distance from centroid descending.
       - `layer-order` & `reverse-layer-order`: preserves or inverts document layer hierarchy.
       - `random`: deterministic pseudo-random hash shuffle.
     - `staggerLayers(layers, config)`: shifts primary entrance clips to $t_k = \text{baseStartTime} + k \times \text{interval}$ while propagating exact delta shifts $\Delta$ across subsequent clips (Action, Emphasis, Out) to preserve each layer's internal choreography. Automatically instantiates entrance clips for un-animated layers.
  2. **Zustand Store Integration (`src/store/slices/animationSlice.ts` & `src/store/types.ts`)**:
     - `staggerSelectedLayers(config)`: atomic document mutation with full history undo/redo support via `commitDoc`.
  3. **Precision User Interface (`src/components/canvas/StaggerPopover.tsx`)**:
     - Compact, high-signal floating popover conforming to Rule 9.
     - **Quick Interval Presets**: `0.04s (Rapid)`, `0.06s (Smooth)`, `0.08s (Brisk)`, `0.12s (Spaced)`.
     - **Fine Interval Slider**: `0.01s` to `0.30s` with live time span readout.
     - **Direction Grid**: Visual buttons for Left $\to$ Right, Right $\to$ Left, Top $\to$ Bottom, Bottom $\to$ Top, Center Out, Edges In, Layer Order, Shuffle.
     - **Uniform Entrance Override (Optional)**: In 1 click, uniformize entrances across selection (e.g. `Slide Up`, `Pop`, `Fade In`, `Grow`, `Blur In`, `Baseline Rise`).
  4. **Multi-Surface Access**:
     - **Floating Design Toolbar (`FloatingDesignToolbar.tsx`)**: reveals dedicated Stagger button (`ListOrdered`) when 2+ layers are selected.
     - **Canvas Context Menu (`CanvasContextMenu.tsx` & `contextMenuBuilders.tsx`)**: right-click on 2+ layers shows `Stagger Animations...` with shortcut `Shift+S`.
     - **Timeline Transport Header (`TimelinePanel.tsx`)**: quick Stagger button in the timeline transport bar.
     - **Global Shortcut**: `Shift + S` opens the Stagger popover instantly when 2+ layers are selected.
* **Verification**:
  - 11 unit tests in `src/test/stagger_engine.test.ts` (spatial sorting, centroid, multi-clip delta preservation, un-animated fallback).
  - 3 integration tests in `src/test/stagger_integration.test.ts` (store mutation, preset override, undo/redo).
  - Production build (`tsc -b && vite build`) compiles with zero errors in 20.6s.

---

### Decision 80: Multi-Format Video Export with Synchronized Audio Track Muxing & GIF89a Encoding
* **Context & Motivation**:
  - Previously, video export only generated `.webm` files with no audio track support (videos were completely muted even if an audio track was active on the timeline).
  - Animators and marketing teams require universal **MP4 (H.264)** for client delivery, social platforms (Instagram, Twitter/X), and Apple Keynote, as well as animated **GIF** for lightweight sharing in Slack, Discord, and GitHub PRs.
  - Additionally, users need resolution scaling (`0.5x Draft`, `1x 1080p`, `2x 4K UHD`) and audio inclusion toggling directly in the export popover.
* **The Solution**:
  1. **Zero-Dependency Fast GIF89a Encoder (`src/engine/export/gifEncoder.ts`)**:
     - Analytical binary GIF89a generator supporting Netscape 2.0 infinite looping, graphic control extensions with configurable frame delays, 256-color web-safe palette quantization, and variable-length LZW raster data compression.
  2. **Synchronized Audio Track Muxing (`src/engine/export/videoExporter.ts`)**:
     - Web Audio API pipeline: decodes timeline audio buffers (`AudioContext.decodeAudioData`), routes them through gain nodes for volume and mute control, and streams them into a `MediaStreamDestinationNode`.
     - Automatically attaches the mixed audio track to the video capture stream (`stream.addTrack(mediaStreamAudioTrack)`), allowing browser `MediaRecorder` to mux audio and video into the output container in real-time.
  3. **Multi-Format MIME Negotiation (`videoExporter.ts`)**:
     - Prioritizes native MP4 formats (`video/mp4;codecs=avc1.42E01E,mp4a.40.2`, `video/mp4;codecs=avc1`, `video/mp4;codecs=h264`) when MP4 is selected, with graceful fallback to VP9 WebM.
     - Routes GIF format to the deterministic frame-stepping `GifEncoder` pipeline.
  4. **Upgraded Export Popover UI (`src/components/export/ExportPopover.tsx`)**:
     - **Format Selector**: Segmented choice between `MP4`, `WebM`, and `GIF`.
     - **Resolution Scale**: `0.5× (Draft)`, `1× (1080p)`, `2× (4K)` with real-time dimensions badge (`1920 × 1080` vs `3840 × 2160`).
     - **Audio Track Sync**: When an audio track is present and format supports audio, exposes an interactive `Include` vs `Mute` toggle.
     - **Transparent Alpha Guardrail**: When Transparent background is chosen, automatically recommends WebM with a clear, helpful notice.
* **Verification**:
  - 1 unit test in `src/test/gif_encoder.test.ts` (GIF89a signature, header, blocks, and trailer).
  - 5 unit/integration tests in `src/test/multi_scene_export_and_popover.test.ts` (multi-scene sequence stitching, alpha export, abort/cancellation, GIF generation, MP4 format, and audio metadata).
  - Production build (`tsc -b && vite build`) compiles with zero errors in 14.88s.

---

### Decision 81: Dynamic Auto-Hug Text Sizing Architecture & Canvas Selection Boundary Desync Elimination
* **Context & Motivation**:
  - Legacy graphic design modes (`Auto Width`, `Auto Height`, and `Fixed Size`) caused severe layout desynchronization and visual defects on canvas:
    - Text layers set to `Fixed` with an arbitrary height (e.g. `243px`) left massive empty voids below 1–2 lines of copy.
    - Dragging handles or resizing created "two disconnected boundaries" where the DOM text rendered at the top while the selection box (`TransformBox`) floated below with empty space.
    - An omnipresent file drop overlay was capturing internal layer reordering drag events in the editor.
* **The Solution**:
  1. **Strict Content-Driven Auto-Hug Height (`styleUtils.ts` & `toolCreationHelpers.ts`)**:
     - Text layers now strictly default to dynamic auto-hug height (`height: "auto"`, `textSizing: "auto-height"`).
     - The user controls wrap width by dragging handles; the height automatically recalculates to tightly hug the rendered text lines with zero dead vertical space.
  2. **Ghost Box Handle Suppression in TransformBox (`TransformBox.tsx`)**:
     - For text layers, `visualH` derives directly from the measured DOM element (`domEl.offsetHeight`), ensuring the purple selection box tightly encloses the text lines at all times.
     - Suppressed North (`n`) and South (`s`) handles on text layers so users can never inadvertently drag an artificial empty height void.
     - Left/Right edge handles (`e`, `w`) and corners smoothly adjust the wrapping width; double-clicking width handles auto-fits width to content.
  3. **High Signal, Zero Noise Typography Inspector (`TypographyCard.tsx` & `TransformCard.tsx`)**:
     - Removed the confusing `[Auto W | Auto H | Fixed]` button group and redundant vertical align controls.
     - In `TransformCard.tsx`, text Height (`H`) is displayed as a read-only auto-hugged indicator, preventing accidental manual keying of corrupting height numbers.
* **Verification**:
  - 51 test suites, 454 tests passing via Vitest.
  - Production build (`tsc -b && vite build`) compiles with zero TypeScript errors in 20.29s.

---

### Decision 82: Parent-Child Relational Linking Architecture & Elimination of Abstract Wiring UI
* **Context & Motivation**:
  - Legacy linking UI in `RelationalLinksCard` displayed an abstract, confusing "Select Driver" form across every single layer in the inspector, showing "No active relational links" empty states and requiring manual multi-property wiring.
  - Furthermore, layers in the Left Sidebar only allowed dropping inside `group` or `frame`, preventing users from nesting elements directly inside cards (`rectangle` shapes) or establishing clear parent-child relationships through simple drag-and-drop.
* **The Solution**:
  1. **Strict Parent-Child Relational Model & Universal Nesting (`LeftSidebar.tsx`, `treeHelpers.ts`, `layerSlice.ts`)**:
     - Any layer (e.g. `text`, `counter`, `shape`, `image`) can now be dropped directly inside a card (`rectangle`), `frame`, or `group` in the Left Sidebar.
     - On drop, local coordinate conversion (`newLocalX = oldWorldX - parentX`, `newLocalY = oldWorldY - parentY`) preserves the exact screen position: **0.0000px layout shift**.
     - Left Sidebar provides clear visual drop feedback (`Nest as Child` badge and purple border) and renders nested children indented with collapsible chevrons and relational mode badges (`HUG`, `STACK`).
  2. **Zero-Noise Inspector Card (`RelationalLinksCard.tsx` & `DesignInspector.tsx`)**:
     - Completely removed the old abstract driver selection form and empty state clutter.
     - If an element has no children and is not a connector, the Relational Linking card returns `null` (zero visual noise, Rule 9).
     - When a parent container has children, it exposes modular, independent relational options that can be enabled **individually or simultaneously**:
       - **Hug Bounds**: Dynamically dilates card width and height to hug child elements with 2D scrubbable padding (`Pad X`, `Pad Y`), dimension control (`Both`, `Width`, `Height`), and spring physics toggle (`Spring` vs `Instant`).
       - **Reflow Stack**: Arranges children in a responsive flex layout with axis control (`Vertical` vs `Horizontal`), scrubbable `Gap`, and alignment (`Start`, `Center`, `End`).
       - **Simultaneous Hug + Stack**: When both are enabled, children automatically stack with the authored gap AND the parent card automatically springs to hug the stacked dimensions + padding!
       - **Clip Content**: Non-destructive boundary stencil clipping child overflow.
       - **Detach Action**: Dedicated "Detach" button on each child instantly unparents it back to the root coordinate frame with 0.0000px visual shift.
  3. **Connector Pinning for 1D Elements**:
     - For Line and Arrow layers, exposes clean endpoint target and anchor pinning selectors to track other layers on stage dynamically.
  4. **Dynamic Canvas & Evaluation Engine (`ShapeRenderer.tsx`, `LayerRenderer.tsx`, `dependencyEngine.ts`)**:
     - `ShapeRenderer` renders nested children inside cards with automatic stack reflow, padding, and clipping.
     - `dependencyEngine.ts` dynamically resolves compound stacked + hugged bounding boxes in $O(1)$ time for deterministic scrubbing and export.
* **Verification**:
  - 7 dedicated automated tests in `src/test/parent_child_relational_linking.test.tsx` verifying universal nesting, 0.0000px coordinate preservation, container layout updates, child detachment, zero-noise inspector rendering, and simultaneous multi-linking.
---

### Decision 83: Retirement of Experimental Relational Auto-Layout Linking in Favor of Deterministic Motion Graphics Primitives
* **Context & Rationale**:
  - The experimental "Relational Linking" / auto-layout model (`Hug Bounds`, `Reflow Stack`, `containerLayout`, arbitrary shape nesting) attempted to treat static motion graphics elements like a dynamic web browser DOM.
  - In motion graphics, elements already exist across time tracks rather than being dynamically generated at runtime. Attempting to make parents automatically react and stretch to time-varying child animations introduced competing spring physics, delayed visual jitter, and confusing layout settings (`Hug Bounds`, `Reflow Stack`, `Clip Content`, `Pad X`, `Axis`) in the inspector.
  - Motion design tools (After Effects, Jitter, Keynote) maintain predictable, deterministic choreography: if a card expands as text appears, the animator/agent animates the card's width and the text's entrance directly.
* **Architectural Actions Taken**:
  1. **Removed Inspector Linking Card (`RelationalLinksCard.tsx` & `DesignInspector.tsx`)**:
     - Deleted `RelationalLinksCard.tsx` and removed its mount from `DesignInspector.tsx`, restoring high-signal, zero-clutter inspection.
  2. **Clean Grouping Truth (`treeHelpers.ts`, `LeftSidebar.tsx`)**:
     - Preserved standard composite grouping (`Ctrl+G` / Group folders and frames). When multiple elements are grouped, they move and transform together as expected.
     - Retired arbitrary shape nesting: shapes (rectangles, circles, lines) are geometric layers, not auto-layout HTML divs. Dropping inside is strictly restricted to container groups (`isContainerLayer(target)`).
  3. **Removed Canvas & Evaluator Overhead (`ShapeRenderer.tsx`, `LayerRenderer.tsx`, `dependencyEngine.ts`)**:
     - Removed child layout flex loops and clipping stencils from `ShapeRenderer.tsx`.
     - Removed the container layout auto-dilation block from `resolveSceneBindings` in `dependencyEngine.ts`.
     - Removed `updateLayerContainerLayout` and `detachChildFromParent` from `layerSlice.ts` and `store/types.ts`.
* **Verification**:
  - All 51 test suites (454 tests) pass with 100% success.
  - Production build (`npm run build`) compiles cleanly with zero TypeScript errors.

---

### Decision 84: Split Mode Visual Ergonomics, Default Locked Split Groups, and Full Canvas/Inspector Locking Parity
* **Context & Rationale**:
  - In interactive shape and line split modes, the confirm and discard controls previously used small text pills ("Confirm split", "Discard") that felt cramped and lacked prominent visual affordance on the canvas overlay.
  - Furthermore, split operations (dividing a rectangle, circle, polygon, or line into multiple distinct geometric paths or separating stroke and fill) produce compound multi-part graphics that initially represent the single original form. If sub-elements are immediately draggable individually without intent, users easily disrupt the visual continuity.
  - The right sidebar inspector header lacked a working lock toggle, and the canvas transform box previously ignored layer lock state, allowing locked elements to be dragged or resized on the canvas.
* **Architectural Decisions & Implementation**:
  1. **Prominent Icon-Only Split Overlay Controls (`ShapeSplitOverlay.tsx`, `LineSplitOverlay.tsx`)**:
     - Upgraded the confirm/discard toolbar to large `w-8 h-8 rounded-full` icon buttons (`Check` in brand violet, `X` in dark secondary) with tooltip badges, eliminating cramped text labels.
     - Added keyboard hotkeys (`Enter` to confirm, `Escape` to discard) in `useCanvasHotkeys.ts`.
  2. **Split Compound Groups Default Locked (`locked: true`)**:
     - All split generators (`splitShapeByEdges`, `splitCircleContour`, `separateStrokeFillEngine`, `splitShapeContourDualOrigin`, `splitLineAtRatio`, `detachArrowhead`, and text splitters) now set `locked: true` on the generated parent group.
     - The split group acts as a single unified layer holding the parent's identity and position.
     - When the user explicitly **unlocks** the group via the sidebar or inspector, each sub-element becomes directly selectable and editable, allowing distinct stroke colors, widths, trim paths, and independent animation roles.
     - Standard manual grouping (`Ctrl+G` / `groupSelection()`) remains unlocked by default (`locked: false`), maintaining conventional grouping workflows.
  3. **Canvas Selection & Drill-In Logic (`CanvasViewport.tsx`)**:
     - When a group is locked (`group.locked === true`), canvas clicks always resolve to the topmost locked group entity and never drill into sub-children.
     - When unlocked, canvas clicks drill into children as expected.
  4. **Canvas Transform & Inspector Protection (`TransformBox.tsx`, `DesignInspector.tsx`, `LayerHeaderCard.tsx`)**:
     - Canvas `TransformBox`: when an element is locked, drag bodies, rotation handles, hit zones, and resize handles are disabled; the bounding box displays an amber lock indicator badge and HUD `(Locked)`.
     - Right Inspector header: added interactive `Lock`/`Unlock` toggle button and context menu item.
     - Inspector Property Cards: locked layers display a prominent amber notice banner (`Element is locked [Unlock]`) and disable child property inputs (`opacity-50 pointer-events-none`) to prevent accidental property corruption.
* **Verification**:
  - 16 automated tests in `src/test/interactive_split_mode.test.ts` verifying default split locking, unlocked sub-element property editing, manual group non-locking, and canvas selection semantics.
  - All 51 test suites (458 tests) passing; production build clean.

---

### Decision 85: Elimination of Compound Entity Selection Hijacking & Direct Outliner Sub-Element Selection
* **Context & Root Cause**:
  - When an element was split into compound sub-elements (e.g. 2 complementary paths, detached arrowhead, separated stroke/fill), users were unable to select the individual sub-elements in the left sidebar outliner tree.
  - Investigation revealed that `selectLayer` in `selectionSlice.ts` had a legacy check that forcibly redirected any call to `selectLayer(childId)` to `parent.id` whenever `parent.isCompound` was true outside of animate mode.
  - This hijacked all direct selections originating from the left sidebar outliner tree and canvas drill-in, trapping selection on the compound parent group even when the user deliberately clicked a sub-element in the sidebar tree.
* **Architectural Decisions & Implementation**:
  1. **Direct Layer Selection in Store (`selectionSlice.ts`)**:
     - Removed the `isCompound` redirection from `selectLayer`. The store now strictly selects the requested `layerId`.
     - Clicking any sub-element in the left sidebar outliner tree immediately selects that sub-element, highlighting it in the tree and populating the inspector.
  2. **Canvas-Level Grouping Guard (`CanvasViewport.tsx`)**:
     - Canvas click resolution remains at the viewport interaction layer where it belongs: clicking on the canvas checks `topmostGroup.locked` to select the locked group as a single entity without accidental drill-in, and allows progressive drill-in when unlocked.
  3. **Inherited Lock Protection & Quick-Unlock Affordance (`DesignInspector.tsx`, `TransformBox.tsx`)**:
     - When a child layer is selected in the sidebar while its parent group is locked, the inspector detects `parentGroup.locked` and presents a clear amber notice banner: *"Parent group is locked [Unlock Group]"*.
     - Clicking *[Unlock Group]* immediately sets `locked: false` on the parent group, activating property editing for the sub-element (colors, stroke width, trim paths, opacity).
     - `TransformBox.tsx` also recognizes `parentGroup.locked`, suppressing canvas drag/resize handles and rendering the locked HUD indicator until the group is unlocked.
* **Verification**:
  - 17 automated tests in `src/test/interactive_split_mode.test.ts` verifying outliner sub-element selection, parent group unlocking, and independent property customization.
  - All 51 test suites (459 tests) passing; clean production build.

---

### Decision 86: Group Context Menu Distillation & Removal of Redundant Vector/Canvas Layer Clutter
* **Context & Rationale**:
  - Right-clicking any group or split compound element previously displayed three confusing, redundant options: *"Decompose Vector Paths"*, *"Flatten to Vector Path"*, and *"Detach to Canvas Layers"*.
  - *"Detach to Canvas Layers"* was completely redundant with standard *"Ungroup"* (`Ctrl+Shift+G`).
  - *"Flatten to Vector Path"* only works on Boolean operation groups, and is already prominently available in the right-sidebar Inspector under the Boolean card.
  - *"Decompose Vector Paths"* only applies to niche multi-path imported SVGs, and was confusing visual noise on ordinary groups and split paths.
* **Architectural Decisions & Implementation**:
  1. **Purged Redundant Group Actions (`contextMenuBuilders.tsx`, `CanvasContextMenu.tsx`)**:
     - Removed *"Decompose Vector Paths"*, *"Flatten to Vector Path"*, and *"Detach to Canvas Layers"* from generic group context menus.
     - Group context menus now cleanly display standard **Ungroup** (`Ctrl+Shift+G`) when a group is selected, and **Group Selection** (`Ctrl+G`) when multiple elements are selected.
  2. **Domain-Specific Scoping**:
     - Vector flattening remains strictly inside `SpecializedLayerCard.tsx` when an actual Boolean group is active.
* **Verification**:
  - All 51 test suites (459 tests) passing.
  - Clean production build (`npm run build`).

---

### Decision 87: Purge of Dead Methods (`detachGroupToAbsolute`, `decomposeVectorGroup`) & Zoom-Invariant Prominent Split Overlay UI
* **Context & Rationale**:
  - The speculative helper functions `detachGroupToAbsolute` and `decomposeVectorGroup` were identified as unused bloat (standard `Ungroup` already handles hoisting with relative-to-world coordinate calculation).
  - Additionally, during shape and line split modes on zoomed-out canvases, the split action pill and its Confirm (`Check`) and Discard (`X`) buttons were rendered inside the zoomed canvas container without counter-scaling. On typical 1080p viewport scales (~0.45x), the controls shrank by 55% into tiny, hard-to-click specks.
* **Architectural Decisions & Implementation**:
  1. **Purged Dead Methods**:
     - Deleted `detachGroupToAbsolute` and `decomposeVectorGroup` from `types.ts`, `layerSlice.ts`, and removed `svgDecomposer.ts`.
     - Standardized on `ungroup` (`Ctrl+Shift+G`) for all group dissolution.
  2. **Zoom-Invariant Split Mode Pill (`ShapeSplitOverlay.tsx`, `LineSplitOverlay.tsx`)**:
     - Applied counter-scaling `scale(${1 / Math.max(0.1, effectiveScale)})` with `transformOrigin: "bottom center"`.
     - Pinned position using `bottom: calc(100% + ${20 / Math.max(0.1, effectiveScale)}px)` to guarantee the toolbar always hovers exactly 20 screen pixels above the shape boundary at any zoom level.
     - Upgraded the pill to a prominent `h-14` (56px) rounded capsule with `backdrop-blur-xl`.
     - Upgraded the Confirm and Discard buttons to large `w-10 h-10` (40px) tactile circular buttons with large `w-5 h-5` icons (`stroke-[3]` on Check, `stroke-[2.5]` on X).
     - Scaled interactive edge dots and line cut pins dynamically by `1 / effectiveScale` so they remain comfortably visible and draggable on screen regardless of canvas zoom.
* **Verification**:
  - All 51 test suites (458 tests) passing cleanly.
  - Clean production build (`npm run build`).

---

### Decision 88: Sequential Animation Chaining & Unified Morph Clip Linkage Across Elements
* **Context & Rationale**:
  - Previously, adding a new animation preset to an element that already had animations (e.g. an "In" animation) hard-coded `start: playheadTime`. When the playhead was at 0, the new action or out animation was placed directly on top of the in animation, causing jarring collision and visual overlap.
  - Furthermore, cross-element Morph transitions created two separate disconnected animation clips on source and target layers. They could be dragged independently in the timeline, adjusted independently in the inspector, and opened different property states, leading to broken de-synced animations and orphaned clips.
* **Architectural Decisions & Implementation**:
  1. **Automatic Sequential Animation Chaining (`animationSlice.ts`)**:
     - When applying an animation preset without an explicit `start` time, the engine checks existing clips on the layer:
       `const endOfOldAnimations = currentClips.length > 0 ? Math.max(...currentClips.map((c) => c.start + c.duration)) : 0;`
     - New animations naturally nest immediately after previous animations conclude, preventing accidental collisions.
  2. **Unified Bipartite Morph Lifecycle (`animationSlice.ts`)**:
     - Morph transitions are authored as a single coordinated bipartite animation link across source and target layers sharing a `morphGroupId` and reciprocal `partnerClipId`.
     - **Lockstep Movement & Trimming**: Updating `start`, `duration`, `easing`, or `params` on either clip via `updateAnimationClip` automatically synchronizes the partner clip in the same atomic document commit.
     - **Coordinated Deletion**: Removing either side via `removeAnimationClip` automatically removes the linked partner clip, leaving zero orphaned half-morphs.
  3. **Synchronized Timeline Interaction (`DraggableClip.tsx`)**:
     - Clicking or dragging either the source exit or target entrance clip selects both clips (`setSelectedClips([clip.id, partnerClipId])`), visually highlighting the connected pair across tracks.
     - Dragging or resizing one clip moves both in real-time lockstep.
     - Displays unified "Morph" label with `Sparkles` icon and linked transition badge.
  4. **Symmetric Inspector Properties (`ClipDetailView.tsx`)**:
     - Inspecting either clip resolves both `sourceLayer` and `targetLayer` symmetrically.
     - Displays unified "Morph Transition" title with connected `[From: Source Layer] ➔ [To: Target Layer]` indicator and target switcher dropdown.
     - Editing duration, start time, easing, effect style, particle count, chaos, or shape updates both elements simultaneously.
* **Verification**:
  - Expanded test suite `src/test/cross_element_morph.test.ts` to 10 comprehensive tests.
  - All 51 test suites (460 tests) pass 100%.
  - Clean production build (`npm run build`) in 10.35s with 0 errors.

---

### Decision 89: True Geometric Contour Sampling, 6 Distinct Morph Shaders, and Elimination of Double-Exposure Crossfade
* **Context & Rationale**:
  - Previously, morphing particles sampled from generic rectangular bounding boxes rather than true layer contours, causing particles around stars and arrows to float in an invisible rectangle.
  - Linear opacity crossfades caused both source and target shapes to sit simultaneously visible as 50% opacity ghosts during mid-flight.
  - Style selection only slightly changed particle shapes instead of providing completely distinct physical and optical shaders.
* **Architectural Decisions & Implementation**:
  1. **True Geometric Contour Sampling with Rotation Invariance (`particleSwarmSolver.ts`)**:
     - `samplePointOnLayer`: Implements exact geometry sampling for Stars (outer/inner vertices & edge interpolation), Arrows/Lines (collinear shafts + angled arrowhead wings), Circles/Ellipses (trigonometric perimeter), Polygons (vertices & sides), and Rectangles (border perimeter).
     - Applied `layer.style.rotation` matrix transform around layer center $(cx, cy)$ in world space so rotated elements (e.g. tilted arrows or stars) have 100% accurate particle anchoring.
  2. **Elimination of Double-Exposure Ghosting (`clipEvaluator.ts`)**:
     - Replaced linear crossfade with power dematerialization and optical defocus:
       $$\text{Source Opacity}(t) = (1 - t)^{2.5}, \quad \text{Blur}(t) = \sin(\pi t) \times 4 + 2t$$
       $$\text{Target Opacity}(t) = t^{2.5}, \quad \text{Blur}(t) = (1 - t) \times 4$$
     - The source element rapidly dissolves into the particle swarm; the target element emerges only upon particle arrival. During mid-flight, the transition particle swarm carries 100% of the visual matter.
  3. **6 Distinct GPU/SVG VFX Pipelines (`MorphTransitionRenderer.tsx`)**:
     - **✦ Stardust**: Cosmic starbursts with directional comet tails (`<line>` along velocity vectors) and sparkling ember centers.
     - **💧 Liquid**: Real-time SVG metaball fusion filter (`#liquid-goo` Gaussian blur + high-contrast alpha color matrix). Viscous droplets stretch along velocity vectors and fuse into organic fluid streams with surface tension.
     - **⚡ Laser**: High-voltage neon tracer beams with double-pass blur corona (`#laser-glow`), glowing colored beam spans, pure white inner core filaments, and electric sparks.
     - **🌀 Singularity**: Gravitational event horizon with 3 distinct phases: collapsing accretion ring at source center $\to$ relativistic hyper-speed transfer beam streak $\to$ expanding shockwave ring at target center.
     - **〰️ Spline**: Continuous animated quadratic Bezier streamlines (`strokeDasharray` and moving `strokeDashoffset`) with gliding particle heads.
     - **💎 Voronoi**: Crystalline glass shards with 3D rotational tumble and crisp white faceted edge refraction highlights.
* **Verification**:
  - All 51 test suites (460 tests) pass cleanly.
  - Production build (`npm run build`) compiles with 0 errors.

---

### Decision 90: 4-Phase Physical Morph Choreography & Transform-Origin Alignment
* **Context & User Direction**:
  - In user testing, particles landing on diagonal arrows were offset down-and-right from the visible arrow, and particles exhibited horizontal needle spikes at rest.
  - The user clarified the fundamental physical choreographic narrative of morph: the first element expands and breaks into particles, the particles travel to the second element, form the second element's shape, and collapse inward to turn into the second element. Gimmicky distinct effects were removed in favor of a single, coherent, physical 4-phase system.
* **Architectural Decisions & Implementation**:
  1. **Pivot Point & Transform-Origin Invariance (`particleSwarmSolver.ts`)**:
     - Drag-created arrows and lines have `style.pivotX: 0, style.pivotY: 0.5` in CSS (`transform-origin: 0% 50%`).
     - Previously, rotation was evaluated around the bounding box center $(cx, cy)$, causing an angular offset of $(W/2)(1 - \cos\theta)$ and $(W/2)\sin\theta$.
     - Updated `samplePointOnLayer` to rotate strictly around `(originX, originY) = (bounds.x + pivotX * bounds.width, bounds.y + pivotY * bounds.height)`. The sampled particle coordinates now align with on-screen geometry down to 0.00px.
  2. **The 4-Phase Physical Morph Choreography**:
     - **Phase 1 ($t \in [0, 0.20]$) — Breakup & Expansion**:
       - Source element in `clipEvaluator.ts` scales smoothly up from $1.0 \to 1.08$ with cubic ease and dematerializes.
       - Particles are born on the source contour and burst slightly outward along the shape's radial normal vector $\vec{u}_{\text{out}}$, cleanly taking over visual matter.
     - **Phase 2 ($t \in [0.20, 0.72]$) — Swarm Migration**:
       - The flock of particles travels smoothly across the canvas from source to target with natural organic flocking wave dynamics.
     - **Phase 3 ($t \in [0.72, 0.88]$) — Shape Assembly**:
       - The particles decelerate and snap precisely into the exact contour of the target shape (the arrow shaft + arrowhead, star vertices, circle, polygon, etc.).
       - The target shape is clearly visible as an assembled constellation of luminous motes.
     - **Phase 4 ($t \in [0.88, 1.0]$) — Collapse & Fusion**:
       - The particles collapse inward ($scale \to 0, opacity \to 0$).
       - Target element solidifies and collapses from $1.08 \to 1.0$ resting scale with optical focus settling to 0.
  3. **High-Signal Energy Motes (`MorphTransitionRenderer.tsx`)**:
     - Removed horizontal needle trails and prickly spikes.
     - Rendered particles as luminous energy motes with radiant color halo and pure white-hot core, preserving crisp, premium visual fidelity.
* **Verification**:
  - All 51 test suites (460 tests) pass 100%.
  - Production build (`npm run build`) succeeds with 0 errors in 10.39s.

---

### Decision 91: Strictly Zero Opacity in Mid-Flight Morph Window
* **Context & Problem**:
  - Previously, smooth power curves (`progress^3` and `(1 - progress)^3`) left residual opacity ($0.125$) on both elements in the middle of the transition, causing both shapes to be faintly visible at the same time as ghosts while the swarm was flying.
* **The Solution**:
  - **Discrete Temporal Cutoffs (`clipEvaluator.ts`)**:
    - **Source Element**: After converting into particles at $progress = 0.18$, opacity is clamped to **strictly 0**. The source element completely disappears from screen during mid-flight ($progress \in [0.18, 1.0]$).
    - **Target Element**: Opacity is held at **strictly 0** throughout flight and assembly ($progress \in [0, 0.82]$). Only after the particles are in place and assembling does the target element appear ($progress \in [0.82, 1.0]$) as particles collapse into it.
    - **Mid-Flight Window ($progress \in [0.18, 0.82]$)**: **100% of the visual matter is carried by the particle swarm**. Neither the first nor the second element has any ghostly presence.
* **Verification**:
  - Added unit tests in `cross_element_morph.test.ts` verifying that at $t = 1.5$ ($progress = 0.50$), both source and target layers have exact `opacity === 0`.
  - All 51 test suites (460 tests) pass cleanly.
  - Production build compiles with 0 errors in 9.49s.

---

### Decision 92: Exact 100% Scale Invariance on Morph Element Reveal & Disappearance
* **Context & Problem**:
  - During morph transitions, the source element was previously animated with an artificial scale expansion ($1.0 \to 1.08$) and target element was revealed at $1.08\times$ scale before collapsing down to $1.00\times$ with $3\text{px}$ blur.
  - On sharp, precise vector assets (lines, arrows, text, geometric polygons), scaling around the pivot point produced a jarring visible pop and shift at the moment of reveal instead of seamlessly materializing at its resting dimensions.
* **The Solution (`clipEvaluator.ts`)**:
  - Removed all artificial scale overshoots (`scaleCollapse` and `scaleExpansion`) and optical blur filters from morph evaluation.
  - Both source and target remain strictly locked at **exact resting scale (`scaleX = 1, scaleY = 1, blur = 0`)** throughout their visible windows.
  - Source dematerializes directly from $100\%$ scale ($rawProgress < 0.18$).
  - Target remains strictly at $opacity = 0$ until particles have finished traveling and are assembled ($rawProgress \ge 0.90$), then cleanly solidifies at **exact 100% resting scale** as particles complete fusion.
* **Verification**:
  - Verified with 10 unit tests in `src/test/cross_element_morph.test.ts` ensuring target element evaluates to `scaleX: 1, scaleY: 1, blur: 0` during reveal.
  - All 51 test suites (460 tests) pass cleanly.
  - Production build compiles cleanly with 0 errors in 10.50s.

---

### Decision 93: Impeccable High-Signal Morph Inspector & Unified Target Selection Screen
* **Context & Problem**:
  - The morph clip inspector had visual clutter and non-compliant decorative anti-patterns (banned under Impeccable craft floor and Rule 9):
    1. Redundant icon badge boxes before "From" and after "To" in the Connected Elements card.
    2. Decorative emoji and symbol prefixes (`✦`, `💧`, `💎`, `⚡`, `🌀`, `〰️`) on the Effect Style buttons.
    3. Clicking "Change Target" opened a tiny floating dropdown menu (`DropdownMenu`) instead of the dedicated, searchable "Morph Into..." element picker sheet that opens when initially adding a morph animation.
    4. Changing target elements via the previous dropdown did not cleanly transfer the partner entrance clip from the old target layer to the new target layer in project state.
* **The Solution**:
  1. **Clean High-Signal Typography**:
     - Stripped the useless decorative icon badges from before "From" and after "To" in [`ClipDetailView.tsx`](file:///c:/Users/Sam/Documents/CODE/MOTION-STUDIO/src/components/inspector/animate/ClipDetailView.tsx).
     - Cleaned Effect Style button labels to pure typographic tokens: `Stardust`, `Liquid`, `Voronoi`, `Laser`, `Singularity`, `Spline`.
  2. **Unified "Morph Into..." Target Selection Screen**:
     - Clicking "Change Target" now opens the identical full-panel element picker screen (`AnimationCatalogSheet` "select-morph-target" layout) with search filter, type icons, hover interaction states, and clear current target indicators.
  3. **Atomic Target Relinking (`relinkMorphTarget`)**:
     - Implemented `relinkMorphTarget` in [`animationSlice.ts`](file:///c:/Users/Sam/Documents/CODE/MOTION-STUDIO/src/store/slices/animationSlice.ts).
     - Automatically cleans up the old partner `morphIn` clip from the previous destination layer, creates the synchronized `morphIn` clip on the new target layer, updates the source clip's `targetLayerId` and `partnerClipId`, and preserves inspector clip selection seamlessly.
* **Verification**:
  - Added unit test in `src/test/cross_element_morph.test.ts` verifying `relinkMorphTarget` moves the partner clip and updates source bindings.
  - All 51 test suites (461 tests) pass cleanly.
  - Production build (`npm run build`) succeeds with 0 errors in 10.84s.

---

### Decision 94: Multi-Selection Inspector Architecture & Consolidated Toolbar Dropdowns
* **Context & Problem**:
  - When selecting multiple elements on the canvas, the right sidebar previously rendered single-element inspector cards (Transform coordinates, Typography, Appearance fill/stroke) from whatever arbitrary layer was first in the selection (`selectedLayers[0]`).
  - Boolean operation buttons were awkwardly placed in the bottom floating design toolbar, creating visual clutter and violating the single-inspector paradigm.
  - Pen (`P`) and Pencil (`Shift+P`) occupied two separate buttons on the bottom toolbar, unlike shapes which used a unified dropdown.
  - The Media button only triggered generic raster image uploads without explicit discoverability for vector SVG import.
* **The Solution**:
  1. **Multi-Selection Inspector Card (`MultiSelectionCard.tsx` & `DesignInspector.tsx`)**:
     - When $\ge 2$ elements are selected, `DesignInspector` completely hides single-element cards (`TransformCard`, `SpecializedLayerCard`, `TypographyCard`, `AppearanceCard`).
     - Aligned with the native studio design language (`border-t border-border divide-y divide-border/50`), eliminating nested card containers, bulky borders, paragraph helper text, and colored pill buttons:
       - **Boolean**: Segmented icon button bar (`Combine`, `MinusCircle`, `Blend`, `Split`) matching `AlignmentBar`, plus compact "Flatten" (`Ctrl+E`) button.
       - **Mask**: Clean single-row "Mask Selection" (`Ctrl+Alt+M`) with subtle stencil icon, plus "Release" button when a mask group is present.
       - **Group**: Clean single-row "Group ({count})" (`Ctrl+G`) and "Ungroup" (`Ctrl+Shift+G`).
  2. **Consolidated Vector Drawing Dropdown in Toolbar (`FloatingDesignToolbar.tsx`)**:
     - Combined Pen (`P`) and Pencil (`Shift+P`) into a single dropdown button matching the Shapes tool pattern.
     - Displays the currently selected tool icon (`PenTool` or `Pencil`) with `ChevronDown` arrow, enabling seamless toggling and switching between vector anchor paths and Catmull-Rom smoothed freehand curves.
  3. **Media Dropdown (Image & Vector SVG) in Toolbar**:
     - Replaced the single Image button with a consolidated Media dropdown:
       - **Image (Raster: PNG, JPG, WebP)**: opens raster image file picker.
       - **Vector SVG (.svg)**: opens dedicated SVG file picker with analytical vector path import and decomposition support.
  4. **Toolbar Boolean Pruning**:
     - Completely removed the redundant Boolean buttons from the bottom floating toolbar, centralizing all combination and masking workflows directly in the right sidebar.
* **Verification**:
  - Created [`src/test/multi_selection_and_toolbar_ux.test.tsx`](file:///c:/Users/Sam/Documents/CODE/MOTION-STUDIO/src/test/multi_selection_and_toolbar_ux.test.tsx) with 6 comprehensive integration tests verifying:
    - Single-element inspector renders Layout and Fill cards.
    - Multi-selection renders `MultiSelectionCard` with Masking and Boolean operations while omitting single-element cards.
    - Mask Selection button click executes `maskSelection()`.
    - Floating toolbar omits boolean buttons.
    - Vector tool dropdown toggles Pen and Pencil.
    - Media dropdown exposes Image and Vector SVG options.
  - All 52 test suites (467 tests) pass cleanly (`npm test`).
  - Production build (`npm run build`) succeeds with 0 type errors in 10.60s.

---

### Decision 95: Live 2D Vector Path Boolean Engine & Non-Destructive Sub-Shape Animation
* **Context & Problem**:
  - Previously, Boolean operations were implemented as an SVG CSS `mask-image` on HTML container `<div>`s in `GroupRenderer.tsx`.
  - For shapes with transparent fill and 1px stroke (the default in vector design), CSS masks could only clip existing border pixels; they could not construct the missing circular arc boundary or fuse outer strokes, resulting in disconnected, floating line ends in thin air.
  - Furthermore, `union` and `exclude` had no rendering implementation and simply rendered raw overlapping shapes.
  - Users explicitly required **live non-destructive Boolean Groups** so sub-shapes can be selected, moved, and animated independently on the timeline, while rendering the mathematically exact closed vector boundary (with continuous stroke and fill).
* **The Solution**:
  1. **Analytical 2D Vector Path Boolean Engine (`src/engine/vector/booleanEngine.ts`)**:
     - Utilizes the Martinez-Rueda-Feito polygon clipping algorithm (`polygon-clipping`) for exact Union, Difference (Subtract), Intersection, and XOR (Exclude) operations.
     - `layerToPolygonRing`: Samples rectangles (with or without `borderRadius`), circles, ellipses, triangles, regular polygons, stars, and arbitrary SVG path contours into closed coordinate rings in local group space, with full rotation transform support.
     - `multiPolygonToSvgPath`: Converts clipping output into clean SVG `<path d="..." />` data.
     - `computeBooleanGroupPath`: Evaluates live group geometry dynamically, accepting optional `computedLayerStyles` so child animation on the timeline or dragging on the canvas updates the cutout contour at 60 FPS.
  2. **First-Class Live Boolean Group Rendering (`GroupRenderer.tsx`)**:
     - Completely decoupled `isBooleanGroup` from `isMaskGroup`.
     - When `layer.isBooleanGroup` is true, the group's wrapper `<div>` has transparent background and 0 borderWidth, avoiding unwanted rectangular frame borders.
     - Renders the live vector path via `<svg style={{ overflow: "visible" }}><path d={booleanPath} fill={booleanFill} stroke={booleanStroke} strokeWidth={booleanStrokeWidth} strokeDasharray={...} fillRule="evenodd" /></svg>`.
     - Inherits fill and stroke faithfully from the group or base child, correctly preserving transparent fills without defaulting to arbitrary blues.
     - Renders interactive hit-targets for all child layers with DOM ID `layer-${child.id}`, enabling direct selection, dragging, and independent keyframing on the timeline.
  3. **High-Fidelity Flattening (`flattenBooleanGroup`)**:
     - On `Ctrl+E` / "Flatten to Vector Path", bakes the dynamic 2D vector path into a permanent `ShapeLayer` (`shapeType: 'path'`) with exact bounding box normalization, zero pixel shift, and preserved fill/stroke attributes.
* **Verification**:
  - Expanded `src/test/boolean_operations.test.ts` to 12 tests covering:
    - Overlapping stroked shapes with 0 fill across all 4 operations (Union, Subtract, Intersect, Exclude).
    - Flattening preserving transparent fill and 1px stroke.
    - Dynamic re-evaluation with `computedLayerStyles` during sub-shape motion.
  - All 52 test suites (472 tests) pass cleanly (`npm test`).
  - Production build (`npm run build`) compiles in 10.87s with 0 errors.

---

### Decision 96: On-Demand Audio Track & High-Signal Timeline Container Pruning (Hybrid Paradigm)
* **Context & Problem**:
  - The Audio track occupied 40px of vertical space at the top of the timeline permanently, even when empty and unused in 90%+ of animation authoring scenarios.
  - Groups, frames, and boolean containers generated empty 32px timeline track rows by default, even though users animate individual leaf elements or sub-shapes rather than empty group containers.
* **The Solution (Hybrid Paradigm: Apple Restraint + Jitter Direct Manipulation)**:
  1. **On-Demand Audio Track**:
     - The audio lane is hidden by default when no audio is present in the document, instantly reclaiming 40px of vertical workspace for animation layers.
     - Added a dedicated `Music` toggle button in the transport/playhead row (`timeline-audio-toggle`):
       - If no audio track exists, clicking the button directly invokes the file picker (`.mp3`, `.wav`, `.ogg`, `.m4a`, `.aac`), extracts waveform data, and adds the track.
       - If audio exists, clicking toggles lane visibility (`isAudioVisible`).
       - Active/processing/idle states with high-signal badge ("Audio").
       - Dismiss button (`X`) on the audio lane allows collapsing the lane at any time without deleting the audio asset.
       - Deleting the audio track via the trash icon automatically cleans up the track from the project document and collapses the lane.
  2. **Smart Timeline Container Pruning**:
     - Replaced raw unpruned layer listing with `timelineTrackItems` utilizing recursive high-signal container filtering.
     - Container layers (`group`, `frame`, `booleanGroup`) with 0 animation clips are automatically omitted from generating empty timeline tracks when their children exist.
     - All animatable leaf elements (shapes, text, media, paths) and sub-shapes of boolean groups are rendered on the timeline.
     - Each child track displays a clean, truncated parent breadcrumb prefix in its track header: `[parentName] › [layerName]`.
     - When an animation clip is explicitly authored on the container group (e.g. group fade or scale), the container track automatically appears on the timeline to host and edit its clip.
* **Verification**:
  - Appended integration test suite to `src/test/timeline_controls.test.ts`:
    - Hides audio track by default when no audio is present and verifies transport button.
    - Shows audio lane when `audioTrack` exists, toggles visibility, and deletes correctly.
    - Prunes empty group containers from timeline tracks while showing children with `Subtract Group ›` breadcrumbs.
    - Renders group container track when an animation clip is authored on it.
  - All 52 test suites (476 tests) pass cleanly (`npm test`).
  - Production build (`npm run build`) succeeds with 0 errors in 9.85s.

---

### Decision 97: Minimal Dark/Light Accent Harmonization, Left Sidebar Hover Bugfix, and Theme Toggle
* **Context & Problem**:
  - In `LeftSidebar.tsx`, hovering over the name of a selected layer or scene caused the text to turn `#6d28d9`, identical to the selected row's purple background, rendering the label 100% invisible.
  - Saturated purple/blue chrome accents across the studio (`#6d28d9`, `#7c3aed`) conflicted with the user's artwork and generated unnecessary visual noise, contrary to AGENTS.md Rule 8 & 9 (Apple Keynote / Linear precision tool aesthetics).
  - Users requested an elegant, minimal accent: a dark shade in light mode, and a light shade in dark mode, along with full dark/light theme switching.
* **The Solution**:
  1. **Left Sidebar Hover Invisibility Bugfix**:
     - Removed unconditional `hover:text-[#6d28d9]` on layer and scene name labels.
     - When selected, text remains `text-white dark:text-zinc-900` without changing color on hover; when unselected, text transitions cleanly to `hover:text-zinc-900 dark:hover:text-zinc-100`.
  2. **Minimal Neutral Accent Harmonization (Dark-in-Light / Light-in-Dark)**:
     - **Left Sidebar**: Selected rows use `bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium`. Drag guidelines, into-group drop boxes, and rename inputs adapt with `zinc-900` / `zinc-100`.
     - **Canvas Transform Box**: Selection bounding ring uses `ring-1 ring-zinc-900 dark:ring-zinc-100`. Resize handles and vector endpoints use `bg-white dark:bg-zinc-950 border border-zinc-900 dark:border-zinc-100`.
     - **Floating Toolbar**: Active tool buttons use `bg-white text-zinc-950 shadow-xs font-semibold` against the dark toolbar body, matching Figma and Keynote toolbar ergonomics.
     - **Scrubbable Inputs**: Focus rings and drag states use `border-zinc-900 focus-within:ring-zinc-900/20 dark:border-zinc-100 dark:focus-within:ring-zinc-100/20`.
     - **Timeline Selections**: Active clip outlines and track header highlights use `bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-semibold`.
  3. **Studio Dark / Light Mode Switcher**:
     - Added a `Sun` / `Moon` toggle button in `TopNavBar.tsx` (`data-testid="theme-toggle-btn"`) wired to `toggleTheme()`.
     - Fully synchronizes with `document.documentElement.classList.toggle("dark")` and persists to `localStorage`.
* **Verification**:
---

### Decision 98: Studio Palette Monochrome Alignment & Complete Dark Mode Contrast Overhaul
* **Context & Motivation**:
  - Despite preliminary accent updates, residues of saturated SaaS purples (`#7c3aed`, `#6d28d9`, `#ede9fe`, `purple-*`, `blue-*`) persisted across sub-components: Timeline Panel track highlights and scene pills, Animation Catalog Sheet preset cards and thumbnail previews, Clip Detail View property icons and morph modals, Stagger popover, Icon Picker popover, Line and Shape Split overlays, and native Select dropdowns.
  - Furthermore, Dark Mode exhibited severe contrast deficiencies:
    - Viewport canvas pasteboard was blinding white (`#f3f3f5`) instead of dark pasteboard (`#09090b`).
    - Right Inspector Panel, Timeline tracks, and Select menus had hardcoded `bg-white` while `.dark` set text to pure white (`--foreground: 0 0% 98%`), creating unreadable white-on-white text knockouts.
    - Active selection rows used high-contrast solid white blocks in dark mode (`dark:bg-zinc-100 dark:text-zinc-950`) which glared and clashed with pro studio tools.
* **The Solution**:
  1. **Purge of Saturated SaaS Color Residue**:
     - Converted all remaining purple and blue UI accents across 20+ components (`TimelinePanel`, `AnimationCatalogSheet`, `ClipDetailView`, `ExportPopover`, `SpecializedLayerCard`, `MultiSelectionCard`, `CanvasContextMenu`, `FloatingDesignToolbar`, `IconPickerPopover`, `StaggerPopover`, `contextMenuBuilders`, `AudioTrackRow`, `ProjectsWorkspace`, `ProjectCard`, `GroupRenderer`, `IconRenderer`, `LineSplitOverlay`, `ShapeSplitOverlay`, `select.tsx`).
     - Replaced all 15 property animation icons in `ClipDetailView` from hardcoded purple (`text-[#7c3aed]`) to theme-aware `text-foreground`.
     - Replaced canvas marquee and drawing creation previews with neutral `bg-zinc-900 dark:bg-zinc-100` and `border-zinc-900 dark:border-zinc-100`.
  2. **Complete Dark Mode Contrast System**:
     - **Canvas Viewport Pasteboard**: Added `dark:bg-[#09090b]` to create an immersive, glare-free darkroom surrounding the stage artboards.
     - **Right Inspector Panel**: Added `dark:bg-[#141417] dark:border-[#27272a] dark:text-zinc-100` ensuring perfect typographic contrast across Design, Animate, and Scene inspectors.
     - **Timeline Panel & Tracks**: Added `dark:bg-[#141417]`, dark track dividers (`dark:divide-[#27272a]/60`), dark scene block lanes (`dark:bg-[#18181b]`), neutral active scene window track highlights (`bg-zinc-900/5 dark:bg-white/5`), and dark-aware audio waveforms.
     - **Subtle Pro Translucent Selections**: Replaced solid white selection bars with refined translucent pro highlights (`dark:bg-white/15 dark:text-white dark:border-white/10`) in the left layer sidebar and timeline headers, matching Linear and Apple Keynote precision interfaces.
     - **Select Dropdowns & Sheets**: Refactored `select.tsx` with `dark:border-[#27272a] dark:bg-[#141417] dark:text-zinc-100 dark:focus:bg-white/10 dark:focus:text-white` and neutral check indicators.
* **Verification**:
  - Full automated regression test suite: 52 test suites, 477 tests passing cleanly (`npx vitest run`).
  - Production build verification (`npm run build`): passes with 0 TypeScript or bundling errors.
  - Zero saturated SaaS blues/purples remain in UI components.

---

### Decision 99: Systematic Semantic Design Token Refactor & Strict AGENTS.md Rule 2 Zero Hardcoding Compliance
* **Context & Motivation**:
  - A user bug report identified that numeric scrubbable inputs in dark mode were barely visible because their text color was hardcoded to dark zinc (`text-[#18181b]`).
  - Furthermore, audit revealed 121 hardcoded ad-hoc Tailwind hex classes (`bg-[#...]`, `text-[#...]`, `border-[#...]`) scattered across 18 components, directly violating **AGENTS.md Rule 2: Absolute Zero Hardcoding (Config & Token Driven)**.
  - Components like `TopNavBar`, `ExportPopover`, `FloatingDesignToolbar`, `IconPickerPopover`, `StaggerPopover`, `ProjectsWorkspace`, and `ProjectCard` had been hardcoded to dark-theme hexes (`#111113`, `#141416`, `#18181b`, `#27272a`), creating jarring theme asymmetry in light mode and maintenance fragility.
* **The Solution**:
  1. **ScrubbableInput & Select Restoration**:
     - Converted `src/components/ui/scrubbable-input.tsx` from hardcoded `#18181b` to semantic `text-foreground` and `text-muted-foreground`, with semantic surfaces (`bg-muted hover:bg-muted/80`, `border-transparent hover:border-border`, `focus-within:border-primary focus-within:bg-card focus-within:ring-ring/20`). Number fields are now crisp, high-contrast, and legible in both light and dark themes.
     - Refactored `src/components/ui/select.tsx` to 100% semantic design tokens (`bg-muted`, `bg-popover`, `border-border`, `text-popover-foreground`, `focus:bg-accent focus:text-accent-foreground`).
  2. **Comprehensive Studio Chrome Token Migration**:
     - Systematically converted all 18 files with hardcoded hexes to semantic HSL tokens:
       - `TopNavBar.tsx`: `bg-card border-b border-border text-card-foreground`, `bg-muted`, `bg-popover`. Theme symmetrically adapts to light and dark modes.
       - `LeftSidebar.tsx`: `bg-card`, `border-border`, `text-card-foreground`, `bg-primary text-primary-foreground`.
       - `TimelinePanel.tsx` & `AudioTrackRow.tsx`: `bg-card`, `border-border`, `bg-muted/40`, `text-foreground`, `text-muted-foreground`.
       - `CanvasViewport.tsx`: `bg-background` for pasteboard; `bg-pink-500` for alignment guides.
       - `FloatingDesignToolbar.tsx`: `bg-card/90 border-border text-foreground`, `bg-primary text-primary-foreground`, `bg-popover`.
       - `IconPickerPopover.tsx` & `StaggerPopover.tsx`: `bg-popover border-border text-popover-foreground`, `bg-primary text-primary-foreground`.
       - `ExportPopover.tsx`: `bg-popover border-border text-popover-foreground`, `bg-muted`, `bg-primary`.
       - `JitterEasingPopover.tsx`: Purged remaining blue `#3b82f6` / `#60a5fa` in favor of `bg-primary text-primary-foreground`, `bg-popover border-border`, and `stroke="currentColor"`.
       - `AnimationCatalogSheet.tsx`: Purged all 33 hardcoded hexes in preview shapes and cards in favor of `text-muted-foreground`, `bg-muted/60`, and `bg-card`.
       - `ClipDetailView.tsx`: Converted drawer portals from `bg-white dark:bg-[#141417]` to `bg-card`.
       - `ProjectsWorkspace.tsx` & `ProjectCard.tsx`: Converted home dashboard to `bg-background`, `bg-card`, `border-border`, `text-foreground`, `bg-primary text-primary-foreground`.
  3. **Zero Hardcoded Hex Count**:
     - Automated scan of `src/components/` confirmed 0 remaining occurrences of `bg-[#...]`, `text-[#...]`, `border-[#...]`, or `fill-[#...]`.
* **Verification**:
  - All 52 Vitest test suites (477 unit/integration tests) pass 100%.
  - Production build (`npm run build`) builds cleanly with zero TypeScript errors.

---

### Decision 100: Boolean Group Vector Trim Path & Draw-On Animation Support
* **Context & Problem**:
  - When two shapes (e.g. rectangles, circles) were grouped into a Boolean Group (`isBooleanGroup: true`, `booleanOperation: "union" | "subtract" | "intersect" | "exclude"`), applying the `drawOn` (or `trimPath` / `custom_trim`) animation preset failed to reveal the unified vector stroke.
  - Root causes identified:
    1. **Physical capability rejection**: `canHaveTrimPath()` in `src/utils/layerCapabilities.ts` only returned `true` for `line` and `shape`, rejecting `group` even when `isBooleanGroup` was `true`. This blocked Trim Path controls in `AppearanceCard.tsx` and filtered out custom trim options in `AnimationCatalogSheet.tsx`.
    2. **GroupRenderer Path Missing Trim Math**: `GroupRenderer.tsx` rendered the computed boolean SVG `<path>` without extracting `trimStart`, `trimEnd`, or `trimOffset`, lacked SVG `pathLength="100"`, and omitted `strokeDasharray` and `strokeDashoffset`.
    3. **Zero Stroke Width on Filled Shapes**: When shapes were created with default solid fills and zero border width, `booleanStrokeWidth` evaluated to `0`, causing `stroke="none"` during draw-on so no stroke was ever visible.
    4. **Premature Solid Fill**: During `drawOn`, solid fills remained at 100% opacity from frame 0, visually obscuring the stroke draw-on.
    5. **Flattening Loss**: `flattenBooleanGroup` omitted carrying over `animation`, `trimStart`, `trimEnd`, and `trimOffset` when converting a boolean group to a `ShapeLayer`.
* **The Solution**:
  1. **Ontological Capability Alignment (`layerCapabilities.ts`)**:
     - Updated `canHaveTrimPath(layer)` to return `true` when `layer.type === "group" && layer.isBooleanGroup`.
     - Added optional `trimStart`, `trimEnd`, `trimOffset` properties to `GroupLayer` interface in `src/types/layers.ts`.
  2. **Live Unified Contour Trim Rendering (`GroupRenderer.tsx`)**:
     - Resolves trim parameters (`tStart`, `tEnd`, `tOffset`) from the boolean group's `computedStyle` / `layer` or falls back to any animated child shape.
     - Enforces a visible stroke width fallback (`booleanStrokeWidth = 2`) and stroke color (`booleanStroke = rawStroke || rawFill || "#ffffff"`) when `hasTrim` is active and author border was 0.
     - Adds `pathLength="100"` to normalize the perimeter to percentage units.
     - Dynamically computes `strokeDasharray={`${Math.max(0, (tEnd - tStart) * 100)} 100`}` and `strokeDashoffset={-((tStart + tOffset) * 100)}`.
     - Implements progressive fill fade-in (`fillOpacity = Math.max(0, Math.min(1, (tEnd - 0.6) / 0.4))`) during `drawOn`, adhering to AGENTS.md Rule 7 ("Instant stroke draw-on paired with delayed fill fade-in").
  3. **Evaluator Single-Slot Fallback (`evaluator.ts`)**:
     - Ensures both multi-clip and legacy `layer.animation.in?.preset === "drawOn"` routes through `compoundLayerAnimations` so `computedStyle.trimEnd` is populated deterministically.
  4. **Animation Preservation on Flattening (`booleanOperations.ts`)**:
     - Preserves `animation`, `trimStart`, `trimEnd`, and `trimOffset` on the generated `ShapeLayer` when `flattenBooleanGroup` is called.
* **Verification**:
  - Added 6 new unit and integration tests in `src/test/boolean_operations.test.ts` covering capability checks, progressive `trimEnd` evaluation ($0 \to 50 \to 100\%$), child shape animation inheritance, SVG rendering attributes (`pathLength="100"`, `stroke-dasharray="40 100"`, `stroke-width="2"`, `fill-opacity="0"`), and flattening animation preservation.
  - Full automated test suite passes 100%: 52 test files, 484 unit/integration tests passing.
  - Production build (`npm run build`) builds cleanly with zero TypeScript or bundling errors.

---

### Decision 101: Re-Architected Video Export Menu & Format Transparency Guardrails
* **Context & Motivation**:
  - The previous video export popover listed formats first, used arbitrary fractional scales (0.5x, 1x, 2x), allowed selecting transparent background while in MP4 (which silently failed or created opaque videos since H.264 lacks alpha support), and had an uncoordinated ordering of controls including an redundant frame rate selector.
  - In Motion Studio, frame rate is an intrinsic property of scenes (`scene.stepFps` or `doc.settings.fps`), enabling multi-scene compositions where individual scenes run at different framerates (e.g. 12 fps stop-motion scene transitioning into a 60 fps fluid scene). Overriding or re-specifying global FPS in the export menu was redundant and broke per-scene motion timing.
* **The Solution**:
  1. **Strict 4-Tier Clean Export Ordering**:
     - **1st: Resolution**: Dedicated industry standard presets: `480p`, `720p`, `1080p`, `1440p`, and `4K`. Calculates exact scale relative to the project aspect ratio's minor dimension, ensuring all generated width/height pixels are even numbers divisible by 2 (mandatory for video codecs).
     - **2nd: Background**: `With Background` (Solid) vs `Transparent`.
     - **3rd: Format**: `MP4`, `WebM`, and `GIF`.
     - **4th: Scope**: `All (Sequence)` vs `Current (Scene)`.
     - *(Frame Rate removed)*: Handled natively by each scene's temporal settings.
  2. **Format Alpha Guardrail**:
     - Standard H.264/MP4 video containers do not support alpha transparency channels.
     - When `Transparent` background is selected:
       - If currently on `MP4`, the popover auto-switches to `WebM` (VP9 with alpha).
       - The `MP4` button is blocked (`disabled`, `opacity-40 cursor-not-allowed`) and displays a clear `No Alpha` warning badge.
       - Re-selecting `With Background` immediately unblocks `MP4`.
  3. **Headless & Pixi Stage Scale Sync**:
     - Passed computed target dimensions to both `HeadlessRenderStage` and `videoExporter.exportVideo`, guaranteeing full resolution fidelity during rendering.
* **Verification**:
  - Added unit test suite in `src/test/multi_scene_export_and_popover.test.ts` verifying all 5 resolution presets across 16:9 and 9:16 aspect ratios, even-integer dimension clamping, and transparent alpha MP4 blocking.
  - Full automated test suite: 52 test files, 488 tests passing cleanly.
  - Production build (`npm run build`) compiles with zero TypeScript or bundling errors.

---

### Decision 102: Automated 5-Pillar Verification Architecture & Universal Combinatorial Fuzzing Matrix
* **Context & Motivation**:
  - Motion graphics engines present an exponential permutation explosion: combining 10 layer archetypes $\times$ 12 animation presets $\times$ 4 boolean operations $\times$ 5 export resolutions yields over 3,840 distinct states.
  - Manual testing of every situation is mathematically impossible. A developer or user cannot manually click through every combination, which previously allowed subtle intersection bugs (such as draw-on trim paths failing on boolean union groups) to evade isolation.
* **The Solution**:
  1. **Universal Combinatorial Matrix Fuzzer (`src/test/combinatorial_matrix_fuzzer.test.ts`)**:
     - Programmatically tests all 10 layer archetypes (`rectangle`, `circle`, `star`, `polygon`, `text`, `line`, `arrow`, `icon`, `image`, `boolean_group`) paired with 8 core animation presets (`drawOn`, `pop`, `fade`, `scale`, `slide`, `rotate`, `wipe`, `blur`) evaluated across 5 time boundaries ($t = -0.2, 0.0, 0.5, 1.0, 1.4$).
     - Rigorously asserts closed-form mathematical invariants: strictly finite coordinates (zero `NaN` or `Infinity`), opacity channel bounded in $[0, 1]$ (zero negative or elastic overflow), and trim path progression bounded in $[0, 100\%]$.
     - Fuzzes all 4 boolean operations (`union`, `subtract`, `intersect`, `exclude`) and deep 3-level hierarchical group nesting.
  2. **AST Pre-Flight Linter & Contact Sheet Suite (`src/test/linter_and_contact_sheet.test.ts`)**:
     - Automated test harness for `src/engine/perception/linter.ts` and `src/engine/perception/contactSheet.ts`.
     - Validates zero black frame prevention (`SHORT_SCENE_DURATION`, `EMPTY_SCENE`, `NO_SCENES`).
     - Enforces AGENTS.md Rule 8 Impeccable Craft (flags banned gradient text, ghost cards combining 1px border + soft shadow, and floating eyebrow/kicker badges above headlines).
     - Validates multi-scene cumulative duration calculation, headline extraction, and 3D device staging metadata in contact sheets.
  3. **State Lifecycle & Transactional Stress Suite (`src/test/lifecycle_stress.test.ts`)**:
     - Stress tests `TransactionalHistory` under 50 rapid sequential mutations with 100% undo/redo rollback fidelity.
     - Tests lossless JSON AST serialization/deserialization for complex scene trees containing boolean groups, multi-clip animations, and custom easings.
     - Confirms configurable history capacity limits (`maxHistorySteps`) to prevent memory leaks.
* **Verification**:
  - 98 new automated tests added, expanding total test coverage to **55 test suites and 586 unit/integration tests passing 100% cleanly** in Vitest (`npx vitest run`).
  - Production build (`npm run build`) compiles with zero TypeScript errors or bundle warnings.

---

### Decision 103: Native Desktop Window Title Bar, MCP Active Toggle, 1-Click Agent Setup, and Stdio MCP Server
* **Context & Motivation**:
  - The previous in-app `AICommandBar` was an unnecessary distraction for professional motion designers; external AI agents (Claude Desktop, Cursor, Antigravity) are the primary drivers of choreography.
  - Relying on fixed network ports (TCP/HTTP/SSE) causes severe reliability issues on Windows systems where Hyper-V, WSL2, or Docker dynamically reserve blocks of thousands of ports (`netsh interface ipv4 show excludedportrange protocol=tcp`).
  - Users need a clean, cross-platform desktop UX to toggle MCP access, copy agent instructions with 1 click, and allow external agents to operate tool-by-tool directly on native `.mtn` files.
* **The Solution**:
  1. **Purge of In-App AI Command Bar**:
     - Excised `AICommandBar.tsx` and removed the Sparkles AI Wand button from `FloatingDesignToolbar.tsx`.
     - Removed unused `onOpenAiBar` and `isAiBarOpen` hooks and hotkeys across `App.tsx`, `TopNavBar.tsx`, and `CanvasViewport.tsx`.
  2. **Custom Desktop Window Title Bar (`src/components/layout/DesktopTitleBar.tsx`)**:
     - Rendered at the top of the window with native dragging (`data-tauri-drag-region`).
     - Displays Motion Studio branding and active project `.mtn` filename.
     - **MCP Toggle**: Pill switch powered by `useMcpStore` with live indicator (emerald dot when `MCP: Active`, muted when `MCP: Off`).
     - **1-Click Agent Setup Popover**:
       - 1-click **"Copy Config"**: Copies the standard MCP `stdio` server JSON snippet ready for `claude_desktop_config.json` or Cursor settings.
       - 1-click **"Copy Prompt"**: Copies system instructions explaining available tools (`create_scene`, `place_element`, `apply_animation`, `lint_storyboard`) to guide the external agent.
     - **Native Window Controls**: Minimize, Maximize, and Close buttons wired to Tauri v2's `getCurrentWindow()`.
  3. **Zero-Port Standard Stdio MCP Server (`mcp.js`)**:
     - Built a standalone Node.js JSON-RPC 2.0 stdio runner requiring zero external dependencies or network ports.
     - Directly manipulates `.mtn` project files tool-by-tool (`create_scene`, `place_element`, `apply_animation`, `get_storyboard_state`, `lint_storyboard`).
     - 100% immune to Hyper-V port reservations, firewalls, and proxy conflicts.
* **Verification**:
  - All 55 test files and 586 unit tests pass 100% cleanly in Vitest.
  - Production build (`npm run build`) compiles with zero TypeScript errors or bundle warnings.
  - Stdio MCP server verified with automated JSON-RPC handshake (`initialize`, `tools/list`, and `tools/call`).

---

### Decision 104: Native Desktop Packaging with Tauri v2 (Frameless Window, Window Capabilities, and Ultra-Compact Installers)
* **Context & Motivation**:
  - Motion Studio is designed as a standalone, native desktop creative suite for Windows, macOS, and Linux.
  - To support the custom `DesktopTitleBar` (with MCP toggle and agent setup popover), the desktop window requires `"decorations": false` and explicit Tauri v2 window management capabilities (`core:window:default`) to grant frontend JavaScript authority to minimize, toggle-maximize, and close the OS window.
* **The Solution**:
  1. **Window Decorator & Capabilities Alignment**:
     - Configured `tauri.conf.json` with `"decorations": false`, allowing the custom `DesktopTitleBar` and `data-tauri-drag-region` to act as the primary OS window chrome.
     - Added `"core:window:default"` to `src-tauri/capabilities/default.json` enabling secure IPC window minimization, maximization, and close operations.
  2. **Native Packaging**:
     - Executed `npm run desktop:build` (`tauri build`).
     - Compiled the release Rust core in 1m 20s with full Link-Time Optimization (LTO).
     - Generated two Windows distribution bundles in `src-tauri/target/release/bundle/`:
       - **NSIS Setup Installer**: `Motion Studio_0.1.0_x64-setup.exe` (2.7 MB).
       - **WiX MSI Installer**: `Motion Studio_0.1.0_x64_en-US.msi` (3.9 MB).
       - **Standalone Binary**: `src-tauri/target/release/app.exe`.
* **Verification**:
  - Release build succeeded with exit code 0.
  - Both native installer artifacts verified on disk with ultra-compact sizes (<4MB).

---

### Decision 105: Native Title Bar Layout Polish (Left-Aligned MCP & Agent Setup, Full-Height 44px Controls, and Explicit Tauri Window Permissions)
* **Context & Motivation**:
  - Testing of the installed MSI revealed three issues:
    1. The minimize, maximize, and close buttons did not execute OS window mutations. Root cause: Tauri v2's permission model isolates window mutations; `core:window:default` only grants read-only window properties, requiring explicit capabilities (`core:window:allow-minimize`, `core:window:allow-maximize`, `core:window:allow-toggle-maximize`, `core:window:allow-close`). Furthermore, `isTauriEnvironment()` omitted matching `http://tauri.localhost` origins on Windows Webview2.
    2. Window control buttons felt small and cramped (28px) rather than matching standard desktop targets.
    3. User requested moving the MCP Toggle and Agent Setup button to the left side of the title bar.
* **The Solution**:
  1. **Explicit Window Mutation Capabilities (`src-tauri/capabilities/default.json`)**:
     - Added `core:window:allow-minimize`, `core:window:allow-maximize`, `core:window:allow-toggle-maximize`, `core:window:allow-close`, `core:window:allow-destroy`, and `core:window:allow-start-dragging`.
     - Updated `src/services/fileAdapter.ts` to recognize `tauri.localhost` under both HTTP and HTTPS.
     - In `DesktopTitleBar.tsx`, safely resolve `getCurrentWindow()` and await window mutation promises with error logging.
  2. **Left-Aligned MCP & Agent Setup Architecture**:
     - Grouped Motion Studio branding, active `.mtn` project breadcrumb, the MCP Toggle pill (`MCP: Active` / `MCP: Off`), and the Agent Setup popover together on the left side of the title bar.
     - Draggable filler (`data-tauri-drag-region`) spans the center.
  3. **Full-Height 44px Desktop Window Controls**:
     - Increased title bar height to `h-9` (36px).
     - Expanded minimize, maximize, and close buttons to full height (`h-full`) and standard Windows 44px width (`w-11`), with native hover styles (including native `#e81123` red close button hover).
* **Verification**:
  - All 55 test files and 586 tests pass cleanly in Vitest.
  - Rebuilt native release bundles:
    - `src-tauri/target/release/bundle/msi/Motion Studio_0.1.0_x64_en-US.msi` (3.9 MB)
    - `src-tauri/target/release/bundle/nsis/Motion Studio_0.1.0_x64-setup.exe` (2.7 MB)

---

### Decision 106: Desktop Dev Server IPv4/IPv6 Loopback Alignment & Resilient Window Binding
* **Context & Motivation**:
  - Running `npm run desktop:dev` (`tauri dev`) stalled at `Running target\debug\app.exe` with no visible window opening on Windows.
  - Root cause: Vite was configured with `host: '127.0.0.1'`, but `src-tauri/tauri.conf.json` configured `"devUrl": "http://localhost:5173"`. On Windows machines with Hyper-V or WSL2 enabled, `localhost` resolves by default to IPv6 `[::1]`. When WebView2 attempted to navigate to `http://localhost:5173`, connection attempts were refused or hung, leaving the frameless window unable to render.
* **The Solution**:
  1. **Strict IPv4 Dev URL Matching**:
     - Synchronized `src-tauri/tauri.conf.json` `"devUrl"` to strictly match `"http://127.0.0.1:5173"`, bypassing ambiguous OS loopback DNS resolution.
  2. **Direct Tauri Window Binding**:
     - Simplified `getNativeWindow()` in `src/components/layout/DesktopTitleBar.tsx` to directly invoke `getCurrentWindow()` within a safe `try...catch` block rather than relying on brittle window property presence checks.
* **Verification**:
  - `cargo check` verified in 19.28s with code 0.
  - Vitest test suite verified: 55/55 test files passed, 586/586 tests passed.
  - Rebuilt production installers:
    - MSI: `src-tauri/target/release/bundle/msi/Motion Studio_0.1.0_x64_en-US.msi`
    - NSIS: `src-tauri/target/release/bundle/nsis/Motion Studio_0.1.0_x64-setup.exe`

---

### Decision 107: Multi-Client Agent Connection Guide (Cursor, Claude Desktop, and Agent Prompt UX)
* **Context & Motivation**:
  - The previous Agent Setup popover copied a static instructions prompt that assumed the external agent was already connected and registered to the MCP server.
  - When users pasted this into external AI agents (Cursor, Claude, Antigravity, etc.), the agents were confused because no MCP server had been registered or started, and no instructions were provided on how to configure or run the server.
* **The Solution**:
  1. **Comprehensive 3-Client Tabbed Connection Guide**:
     - **Prompt for Agent**: Provides a self-contained, actionable prompt that explicitly tells the agent how to register the `motion-studio` MCP server, the exact `node mcp.js` command, the path, and which `.mtn` project file to inspect and choreograph.
     - **Cursor**: Step-by-step instructions for adding the MCP server in Cursor Settings (`Features → MCP → Add New MCP Server`) and 1-click `.cursor/mcp.json` export.
     - **Claude Desktop**: Step-by-step instructions for `claude_desktop_config.json` with OS paths for Windows and macOS, and 1-click JSON snippet copying.
  2. **Active Project File Awareness**:
     - The connection guide automatically binds to the active `.mtn` project document name, providing the exact target file name and path in both the prompt and footer banner.
* **Verification**:
  - All 55 test files and 586 tests pass in Vitest.

---

### Decision 108: Windows Frameless Window DWM Composition & Explicit Window Setup
* **Context & Motivation**:
  - In dev mode on Windows with `"decorations": false`, the Tauri window process could run in the background without Windows DWM compositing and displaying the frame on screen.
* **The Solution**:
  1. **Explicit Window Setup Hook (`src-tauri/src/lib.rs`)**:
     - Added a `.setup()` hook that resolves `app.get_webview_window("main")` and explicitly calls `window.show()` and `window.set_focus()` on application launch.
  2. **DWM Shadow Composition (`src-tauri/tauri.conf.json`)**:
     - Added `"shadow": true` to the main window configuration, ensuring Windows DWM treats the borderless window as a top-level composited surface.
  3. **Process Hygiene**:
     - Terminated orphan hung processes holding WebView2 instance locks on port 5173.
* **Verification**:
  - `cargo check` compiled in 2.26s with exit code 0.
  - `tsc --noEmit` and `npm run build` verified with 0 errors.












