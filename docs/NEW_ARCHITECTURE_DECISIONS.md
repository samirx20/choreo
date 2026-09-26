# Next-Gen Motion Architecture Decisions & Specifications

> **Status**: Working RFC & Architectural Log  
> **Context**: Evolution from procedural clip-stacking to pure declarative state reconciliation (Smart Animate / Magic Move across scenes).

---

## Decision Log

### D1: Cross-Scene Element Identity via Shared IDs (Declarative State Reconciliation)

* **Date**: September 26, 2026
* **Status**: Decided

#### 1. Context & The Problem with Procedural Clip Stacking
Previously, creating multi-property animations (e.g., an element moving, resizing, changing opacity, and shifting color) required stacking multiple procedural animation clips (`apply_animation` with `move`, `fade`, `colorShift`), computing transient relative coordinate offsets (`toY: -140px`), and choreographing overlapping start times.
* For humans, this requires complex multi-track timeline management.
* For AI agents (especially smaller/faster models), this requires mental arithmetic and timeline synchronization, leading to timing collisions, coordinate drifts, and high hallucination rates.

#### 2. The Decision
We adopt **Declarative State Reconciliation** as the core architectural paradigm:
1. **Physical State Identity**: An element existing across multiple scenes represents different visual states of the **same physical entity** if and only if it shares the **same persistent `id`**.
2. **Pure Data Model**: Every scene (`Screen`) maintains its own pure, self-contained list of layers (`screen.layers`) describing the element at rest in that scene. There are no fragile pointers, relational dependency webs, or hidden foreign keys.
3. **Engine Reconciliation**: When transitioning from Scene $A$ to Scene $B$ via a state transition (e.g., `magicMove`), the engine matches layers where `layerA.id === layerB.id` and interpolates all diverging properties (position, scale/bounds, opacity, color, rotation, border radius) using spring/easing transition curves.

#### 3. Human GUI Workflows
1. **Scene Duplication (`Ctrl+D` / `Cmd+D`) — Primary Workflow**:
   * Duplicating Scene 1 creates Scene 2 with identical layers that **preserve their original layer IDs**.
   * The user simply moves, resizes, or restyles the element in Scene 2. The engine automatically reconciles the change.
2. **Cross-Scene Copy & Paste**:
   * Pasting within the *same* scene generates a new unique ID (`id-copy`) to prevent same-canvas collisions.
   * Pasting into a *different* scene preserves the original `id`, establishing cross-scene state continuity.
3. **Layer Inspector Identity**:
   * Every layer exposes its semantic ID / name in the inspector.
   * If a user sets or renames an element's ID to match an element in an adjacent scene, the GUI displays a subtle visual indicator confirming it is Magic Move linked across scenes.

#### 4. AI Agent Workflows
1. **Workflow A: Duplicate & Tweak (Recommended for Minimal Tokens & Zero Math)**:
   * `create_scene({ id: "scene-1" })`
   * `place_element({ screenId: "scene-1", id: "hero-card", ... })`
   * `duplicate_scene({ sourceScreenId: "scene-1", newScreenId: "scene-2" })`
   * `update_element({ screenId: "scene-2", id: "hero-card", x: 500, width: 600, color: "#f59e0b" })`
   * The agent only declares what *changes* in Scene 2.
2. **Workflow B: Explicit Multi-Scene Declaration**:
   * The agent defines Scene 1 and Scene 2 declaratively, using consistent semantic IDs (`"hero-card"`, `"headline"`, `"cta-button"`) across both scenes.

#### 5. Architectural Invariants
* An ID must be strictly unique **within** a single scene.
* The same ID can and should appear in multiple scenes to indicate state continuity across time.
* Elements present in Scene $A$ but missing in Scene $B$ are treated as scene exits (out transition).
* Elements missing in Scene $A$ but present in Scene $B$ are treated as scene entrances (in transition).

---

### D2: Spatial Placement & Composition Engine (Aesthetic-Agnostic Precision Primitives)

* **Date**: September 26, 2026
* **Status**: Decided

#### 1. Context & The Core Problem
Motion graphics is not responsive web design; elements do not need browser-style fluid reflow on resize, but rather **intentional, deliberate, and visually balanced composition on an artboard**.
* Currently, AI agents often produce broken layouts (overlapping text, clipping boundaries, off-center cards) when forced to guess raw top-left pixel coordinates (`x: 480, y: 720`).
* Post-facto AST lint checks often fail to fix issues or generate false positives in creative contexts. 
* Rather than relying on reactive linting after placement is already broken, the engine must make placement **robust and correct by construction**, independent of any specific aesthetic or template.

#### 2. The Decision
We define 5 core architectural primitives for the Spatial Placement Engine that empower both AI agents and humans to place elements and groups cleanly in any aesthetic:

1. **Anchors & Normalized Coordinates (Zero-Math Centering)**:
   * Every layer and group supports an `anchor` / `pivot` (`"center"`, `"top-left"`, `"bottom-right"`, etc.).
   * Supports normalized / percentage coordinates (e.g. `x: "50%", y: "50%", anchor: "center"`).
   * Eliminates the need for agents to guess rendered text dimensions to compute center offsets.

2. **True Hierarchical Groups (Parent-Child Local Spaces)**:
   * A `Group` defines an isolated local coordinate origin `(0, 0)`.
   * Children inside the group are positioned relative to the group's local origin or center.
   * Moving, scaling, or animating the parent group moves the entire composition without recalculating individual child positions.

3. **Universal Alignment & Distribution Primitives**:
   * First-class alignment commands matching industry standards (After Effects, Figma):
     * **Align to Canvas / Parent**: `left`, `center-horizontal`, `right`, `top`, `center-vertical`, `bottom`.
     * **Distribute**: Equal spacing along horizontal or vertical axes with an explicit `gap` (e.g. `distribute({ elements: ["c1", "c2", "c3"], gap: 32, align: "center-vertical" })`).
   * Allows agents to compose multi-column or multi-card layouts with mathematical perfection without manual offset loops.

4. **Edge-Relative & Sibling Offsets**:
   * Support for placing elements relative to canvas margins (e.g. `pinned: "top-left", offset: [80, 60]`).
   * Support for snapping to sibling element edges (e.g. subtitle placed `gap: 16px` directly below title's rendered bottom edge).

5. **Accurate Geometry Telemetry**:
   * The engine provides true computed bounding boxes (`{ left, top, right, bottom, width, height, centerX, centerY }`) for all shapes, text layers, and groups based on real font metrics, avoiding blind pixel guesses.

---

### D3: Hierarchical Group Containers & Recursive Transform Reconciliation

* **Date**: September 26, 2026
* **Status**: Decided

#### 1. Context
Motion graphics compositions (cards, badges, complex geometric illustrations, HUD interfaces) are composed of multiple elements that move together as a single unit while maintaining internal relationships.
* Forcing agents or users to manually transform every child layer individually leads to coordinate drift and broken layouts.

#### 2. The Decision
1. **Container Schema**: A `GroupLayer` owns a local `(0, 0)` coordinate space and holds an array of `children: Layer[]`.
2. **Local Coordinates**: Children inside a group specify positions and anchors relative to the group's local origin and bounds, not the canvas viewport.
3. **Recursive Scene Reconciliation**:
   * When a group exists in both Scene 1 and Scene 2 (matching `group.id`), the engine reconciles the group's world-space transform (position, scale, rotation, opacity), moving all children together.
   * Simultaneously, the engine matches child IDs within the group, smoothly interpolating any local coordinate or property deltas.

---

### D4: Unified Anchor Points & Transform Origins

* **Date**: September 26, 2026
* **Status**: Decided

#### 1. Context
When an element's position is decoupled from its scale and rotation origins (e.g. position is top-left while rotation is center), scaling or rotating causes the element to drift unpredictably across the canvas.

#### 2. The Decision
1. **Unified Anchor (`anchor: [x, y]`)**: Every layer supports an explicit normalized anchor point:
   * `[0.5, 0.5]` for visual center
   * `[0, 0]` for top-left
   * `[0.5, 1.0]` for bottom baseline
   * `[0, 0.5]` for left-edge expansion
2. **Dual Function**: The anchor point controls **both**:
   * **Placement Pin**: Where `(x, y)` places the element on the canvas or parent container.
   * **Transform Origin**: Where the element scales from and rotates around.
3. **Zero Drift**: Scaling an element with `anchor: [0.5, 0.5]` expands symmetrically from its center without shifting its position.

---

### D5: Cascading Transition Choreography & Per-Channel Overrides

* **Date**: September 26, 2026
* **Status**: Decided

#### 1. Context
A single global progress value ($p$) across an entire transition produces rigid, robotic motion where position, size, opacity, and rotation are forced into the exact same timing curve.

#### 2. The Decision
We adopt a **Cascading Transition Hierarchy**:
1. **Scene-Level Defaults**: The scene transition sets the global baseline duration (e.g. `0.6s`) and default physics profile (e.g. `snappy` spring).
2. **Element-Level Overrides**: Any transitioning element can declare an element-level delay or duration override (e.g. `staggerDelay: 0.06s`).
3. **Channel-Level Overrides**: Any element can define per-property curves and delays:
   * e.g. `width: { duration: 0.4, delay: 0 }`, `height: { duration: 0.4, delay: 0.2 }` (horizontal expansion followed by vertical unroll).
   * e.g. `opacity: { duration: 0.2, easing: 'linear' }` (fade completes early while position springs smoothly).

---

### D6: Smart Content Reconciliation (Text & Vector Paths)

* **Date**: September 26, 2026
* **Status**: Decided

#### 1. Context
When an element's internal content updates between scenes (e.g. text copy changes from `"Hey"` to `"Hey, I got a surprise for you"`, or a vector path evolves):
* Naive replacement produces jarring visual pops or flashes.

#### 2. The Decision
1. **Kinetic Text Diffing**:
   * The engine performs token/character diffing between the text in Scene 1 and Scene 2.
   * Preserved words/characters stay stable or glide smoothly to their new baseline positions.
   * Added words/characters cascade-enter with a micro-reveal.
   * Removed words/characters cascade-exit or fade out.
2. **Vector Path Morphing**:
   * For vector paths with compatible point counts, point coordinates smoothly interpolate.
   * For topologically incompatible paths, the engine smoothly cross-fades stroke/fill while the outer bounding box smoothly springs to the new geometry.
3. **Container Continuity**: The element's background, border, and shadows always spring smoothly as a single continuous surface regardless of content diffs.

---

### D7: First-Class Scene Background Layer

* **Date**: September 26, 2026
* **Status**: Decided

#### 1. Context
Treating the scene background as a special-cased property (`scene.backgroundColor` or custom full-screen shaders) prevented natural cross-scene morphing, resizing, and styling.

#### 2. The Decision
1. **First-Class Layer**: The scene background is represented as a first-class layer at bottom index `0` of `screen.layers`.
2. **Standard Layer Schema**: Uses the exact same schema as shape/rect layers (fill color, gradient, opacity, blur, border radius, size, and anchor).
3. **State Reconciliation**: By assigning a persistent ID (e.g. `id: "scene-bg"`), the background seamlessly transitions between scenes (e.g. expanding from a card into full-bleed, or smoothly shifting color/gradient).

---

### D8: Hybrid Batch & Surgical AI Agent Tool Contract

* **Date**: September 26, 2026
* **Status**: Decided

#### 1. Context
* Requiring 30+ granular micro-tool calls to construct a scene exhausts LLM context windows, leading to forgotten IDs and hallucinated parameters.
* Conversely, requiring a single massive multi-megabyte project manifest makes small iterative tweaks impossible.

#### 2. The Decision
The AI agent tool suite follows a **Hybrid Batch & Surgical Architecture**:
1. **Batch Authoring (`create_scene`)**:
   * The agent can declare a complete initial scene in a single payload, including the background layer, groups, child elements, and initial styles.
2. **Surgical Evolution (`duplicate_scene` & `update_element`)**:
   * To create subsequent states, the agent calls `duplicate_scene` (preserving all IDs), followed by targeted `update_element` calls that specify *only the modified properties* (position, size, text, or color).
3. **Result**: Maximum token efficiency, zero context exhaustion, and guaranteed visual continuity across scenes.

---

### D9: User-Authored Component Library (Purge Hardcoded Templates)

* **Date**: September 26, 2026
* **Status**: Decided

#### 1. Context & The Flaw with Hardcoded Templates
Previously, `insert_template` stamped rigid, pre-built components (`comp_browser_window`, `comp_terminal_window`).
* Hardcoded templates lock AI agents into generic SaaS website tropes and undermine aesthetic freedom.
* Creators and agents had no way to save and reuse their own unique compositions.

#### 2. The Decision
1. **Purge Built-In Templates**: Completely remove `insert_template` and hardcoded component mockups.
2. **First-Class Component Library**:
   * Any Group or composition can be saved as a reusable Component (`save_component({ groupId, name })`).
   * Components store their complete sub-tree of layers, relative coordinate geometry, styling, and local animation parameters.
3. **Instantiation**:
   * In GUI: Drag any saved component from the Components panel directly into any scene.
   * For AI: `insert_component({ componentName, sceneId, x, y })` stamps a fresh instance with auto-generated unique child IDs.

---

### D10: Unified Targeted Sub-Element Splitting Architecture

* **Date**: September 26, 2026
* **Status**: Decided

#### 1. Context & The Flaw with Fragmented Split Tools
Previously, splitting was fragmented into 4 separate tools (`split_text`, `split_shape`, `split_line`, `separate_stroke_fill`).
* They forced rigid all-or-nothing decomposition (e.g. splitting *all* words or *all* edges).
* In real design workflows, an author only wants to isolate a specific sub-element to style or animate it independently (e.g. highlight one word in a sentence or separate a stroke from its fill).

#### 2. The Decision
We replace fragmented split tools with a single **Unified Targeted Split Engine**:
1. **The Mental Model ("Targeted Extract & Split")**:
   * The user or agent targets an element and selects a specific sub-part or range.
   * The engine cleanly separates the element into **two (or more) independent layers**:
     * Layer A: The extracted target sub-element.
     * Layer B: The remaining original element.
   * **Invariance**: Both layers render at their exact current positions with **$0.0000\text{px}$ visual shift**.
2. **Sub-Element Target Modes**:
   * **Text**: Select a specific word, substring, or character range (e.g. isolate the word `"surprise"` in `"Hey, I got a surprise for you"` so it can be colored gold or scaled independently while preserving exact kerning and line baseline).
   * **Shapes**: Select `stroke` vs `fill` (separates into an independent stroke path and fill layer for draw-on + delayed fade-in), or select a specific edge/segment.
   * **Lines**: Select an arrowhead marker or split along a ratio.
3. **GUI Workflow**:
   * Double-clicking an element enters **Split Mode**.
   * Highlight the word, character, or edge/contour segment $\to$ Click "Split".
4. **AI Agent Tool Contract**:
   * Unified tool: `split_element({ layerId, target, range, mode: 'word' | 'range' | 'stroke_fill' | 'edge' })`.

---

### D11: Dedicated External Media & Vector Asset Ingestion

* **Date**: September 26, 2026
* **Status**: Decided

#### 1. Context
External media (images, videos, SVGs, audio) and vector icons were previously mixed into generic layer creation or ad-hoc URL strings without proper typing or asset pipeline separation.

#### 2. The Decision
1. **Dedicated Asset Ingestion (`import_asset`)**:
   * Clean, unified ingestion for external assets: images (PNG, JPG, WebP), videos (MP4, WebM), audio (MP3, WAV), and SVGs.
   * SVGs are parsed directly into native vector path/group layers.
2. **Native Lucide Icon Library**:
   * Lucide icons are accessible natively by icon name (`iconName: "Sparkles"`, `iconName: "Shield"`).
   * The engine renders icons directly as clean, scalable vector paths without requiring external HTTP asset loading.



