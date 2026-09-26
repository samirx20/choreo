# Next-Gen Architecture Implementation Plan & Codebase Audit

> **Status**: Comprehensive Engineering Plan & Migration Blueprint  
> **Source Decisions**: [`docs/NEW_ARCHITECTURE_DECISIONS.md`](./NEW_ARCHITECTURE_DECISIONS.md) (Decisions D1–D12)  
> **Target**: Transition from procedural clip-stacking to pure declarative state reconciliation, unified sub-element splitting, custom component libraries, and precision spatial composition.

---

## 1. Executive Summary: The Structural Shift

Our deep audit of the codebase (`src/engine/`, `src/types/`, `src/components/`, `mcp.js`) revealed that the engine already contains world-class mathematical primitives (analytical spring physics, 0.0px font metrics, Pixi 2D vector rendering, hardware-accelerated FFmpeg export). However, the authoring pipeline suffered from:
1. **The Monolithic $p$ in `PixiStage.ts`**: All property channels ($X, Y, W, H, \text{Opacity}, \text{Rotation}, \text{Color}$) were forced to lerp at the exact same rate across scene transitions.
2. **Scattered, Fragmented Tools**: 4 different splitting tools, redundant animation clip updaters, and hardcoded templates (`comp_browser_window`) that locked AI into SaaS website tropes.
3. **The Timeline Chicken-and-Egg Bug**: Container groups with children were hidden from the timeline unless they already possessed animation clips, making GUI group animation nearly impossible.
4. **Anchor & Pivot Decoupling**: Position was anchored top-left while rotation/scale used center pivot, causing elements to drift when scaled.

This plan details every single file to **delete**, **add**, and **update** across Types, Engine, UI/UX, and MCP Tools.

---

## 2. Codebase Audit: Files to Delete / Purge

| File / Entity | Action | Rationale |
| :--- | :--- | :--- |
| `src/components/components/templates/componentTemplates.ts` | **DELETE** | Hardcoded SaaS browser/terminal templates violate creative freedom (D9). Replaced by user/agent-authored component library. |
| `insert_template` in `mcp.js` & schemas | **PURGE** | Replaced by `save_component` and `insert_component`. |
| `update_animation_clip` in `mcp.js` & schemas | **PURGE** | Redundant duplicate; fully merged into `apply_animation`. |
| `lint_storyboard` in `mcp.js` & schemas | **PURGE** | Reactive AST linter generates false alarms and fails; engine enforces correctness by construction (D2). |
| `split_text`, `split_shape`, `split_line`, `separate_stroke_fill` | **MERGE / PURGE** | 4 fragmented tools replaced by the single unified `split_element` tool (D10). |
| `import_svg` in `mcp.js` | **MERGE / PURGE** | Merged into the unified `import_asset` tool (D11). |

---

## 3. Codebase Audit: New Files & Primitives to Add

### A. Engine & Reconciliation Layer
1. **`src/engine/reconciliation/transitionSolver.ts`**:
   * Evaluates per-channel progress curves ($p_{\text{pos}}, p_{\text{width}}, p_{\text{height}}, p_{\text{alpha}}, p_{\text{color}}$) between Scene $A$ and Scene $B$.
   * Resolves axis choreography (`horizontalFirst`, `verticalFirst`, `simultaneous`) and element stagger delays (D5).
2. **`src/engine/reconciliation/contentDiffEngine.ts`**:
   * Kinetic text token diffing: matches common words between Scene 1 and Scene 2, cascades new words in, and fades deleted words out (D6).
   * Vector path morphing with cross-dissolve fallback for topologically incompatible shapes.
3. **`src/engine/split/subElementSplitter.ts`**:
   * Unified surgical splitting engine for text substrings/words, shape stroke/fill separation, shape contour edges, and lines (D10).
   * Guarantees $0.0000\text{px}$ visual shift invariance.
4. **`src/engine/assets/assetIngestion.ts`**:
   * Ingests external media (images, videos, audio, SVGs) into native layers.
   * Native Lucide icon resolver (renders vector icons directly by name) (D11).

### B. State & Component Management
5. **`src/store/useComponentStore.ts` & `src/services/componentStorage.ts`**:
   * Persistence and registry for user/agent-authored reusable components (`save_component`, `insert_component`) (D9).
   * Stores complete sub-trees of layers, local relative coordinates, and animation parameters.

---

## 4. Codebase Audit: Files to Update & Refactor

### A. Types & Schemas
* **`src/types/layers.ts`**:
  * Add top-level `anchor: [number, number]` (normalized 0..1 pivot for both position and transform origin) (D4).
  * Add `parentId?: string` for hierarchical group membership (D3).
  * Add `transition?: ElementTransitionConfig` for per-element transition overrides (delays, custom curves) (D5).
* **`src/types/scene.ts`**:
  * Formalize the **Scene Background Layer** as a first-class layer at index `0` of `screen.layers` (D7).
  * Update `SceneTransition` interface to support channel timing descriptors (`position`, `size`, `opacity`, `stagger`).
* **`src/types/agentTools.ts`**:
  * Update Zod validation schemas to match the revamped 4-group tool inventory.

### B. Core Graphics & Physics Engine
* **`src/engine/pixi/PixiStage.ts`**:
  * **Line 872 (`renderTransition`)**: Replace the monolithic single $p$ easing with calls to `transitionSolver.ts` for per-channel interpolation.
  * **Transform Math**: Compute display object position and pivot from the layer's explicit `anchor: [x, y]` so scaling/rotating never drifts.
  * **Hierarchical Group Rendering**: When `layer.type === 'group'`, compute and update `childrenContainer` local matrix transforms seamlessly.
  * **Content Morphing**: Wire `contentDiffEngine.ts` into text transitions.
* **`src/engine/evaluator.ts`**:
  * Update scene time evaluator to support hierarchical local group coordinate spaces and recursive state transitions.

### C. GUI & UX Overhaul
* **`src/components/inspector/design/TransformCard.tsx`**:
  * **Add 9-Point Anchor Box**: A visual 3×3 grid of anchor dots (`top-left`, `center`, `bottom-right`, etc.) directly above Position/Size controls (D4).
* **`src/components/inspector/design/LayerHeaderCard.tsx`**:
  * **Add Hierarchy Breadcrumbs**: When a child layer inside a group is selected, render breadcrumb buttons (e.g. `Hero Card > Badge > Icon`) allowing 1-click navigation to parent groups.
  * **Add State-Linked Badge (🔗)**: If the selected layer's ID exists in adjacent scenes, display an interactive badge indicating active Magic Move state continuity (D1).
* **`src/components/inspector/animate/AnimateInspector.tsx` & `LayerAnimationsView.tsx`**:
  * **Dedicated Group Animation Mode**: When a `group` is selected, display group-level animation controls with a *"Stagger Children (0.05s)"* toggle (D3).
* **`src/components/timeline/TimelinePanel.tsx`**:
  * **Fix Line 294 Bug**: Remove the condition that hides groups without animation clips.
  * **Collapsible Group Tracks**: Render groups as parent folder rows with disclosure chevrons (`▼ Folder`), showing a Group animation bar and indented child tracks.
* **`src/components/components/ComponentsDrawer.tsx`**:
  * Replace the static sample templates with live user-authored components from `useComponentStore.ts` (D9).
  * Add a *"Save Selection as Component"* button.
* **Storyboard Strip / Scene Transition Pill**:
  * Add a popover **Transition Inspector** to inspect matched cross-scene element IDs and configure per-channel choreography (duration, easing, width-first).

### D. MCP Server & Tool Surface (`mcp.js`)
* Refactor `mcp.js` tool catalog down to the clean 4-group specification:
  1. **Lifecycle**: `create_project`, `update_project`, `duplicate_project`, `rename_project`, `delete_project`, `list_projects`, `set_palette`, `create_scene` (with batch `elements[]`), `duplicate_scene` (preserves IDs), `update_scene`, `delete_scene`, `reorder_scenes`.
  2. **Composition**: `place_element` (with top-level `anchor`), `update_element`, `duplicate_element`, `delete_element`, `reorder_element`, `group_elements`, `ungroup_elements`, `align_elements`.
  3. **Components & Splitting**: `save_component`, `insert_component`, `split_element`, `apply_boolean_operation`, `join_lines_into_shape`, `create_mask_group`.
  4. **Animation & Output**: `apply_animation`, `remove_animation`, `stagger_elements`, `import_asset`, `set_audio_track`, `remove_audio_track`, `export_project`, `get_storyboard_state`, `get_contact_sheet`, `render_frame`.
* Synchronize schemas in `.gemini/antigravity/mcp/motion-studio/`.

---

## 5. Phased Implementation Roadmap

```
┌────────────────────────────────────────────────────────────────────────┐
│                        IMPLEMENTATION PHASES                           │
├────────────────────────────────────────────────────────────────────────┤
│ PHASE 1: Data Model, Anchors & Transition Solver (Engine Foundation)   │
│   • Update layers.ts & scene.ts (anchor, parentId, transitionOverrides)│
│   • Implement transitionSolver.ts (per-channel progress curves)        │
│   • Refactor PixiStage.ts to use transitionSolver and unified anchors  │
│   • Verify with Vitest automated tests                                │
├────────────────────────────────────────────────────────────────────────┤
│ PHASE 2: Hierarchical Groups & Timeline UI Fix                         │
│   • Fix TimelinePanel.tsx chicken-and-egg group hiding bug             │
│   • Implement collapsible group tracks & group-level animation bars    │
│   • Add hierarchy breadcrumbs (Parent > Child) in LayerHeaderCard      │
│   • Wire group transform inheritance in PixiStage & evaluator          │
├────────────────────────────────────────────────────────────────────────┤
│ PHASE 3: User Component System & Asset Ingestion                       │
│   • Delete hardcoded componentTemplates.ts                             │
│   • Implement useComponentStore & componentStorage                     │
│   • Update ComponentsDrawer to browse & insert custom components       │
│   • Implement import_asset & native Lucide icon rendering              │
├────────────────────────────────────────────────────────────────────────┤
│ PHASE 4: Unified Targeted Splitting & Content Diffing                  │
│   • Implement subElementSplitter.ts (surgical extract & split)         │
│   • Implement contentDiffEngine.ts (kinetic text token diffing)        │
│   • Connect split mode into canvas / inspector UI                      │
├────────────────────────────────────────────────────────────────────────┤
│ PHASE 5: MCP Tool Surface Revamp & Verification                        │
│   • Refactor mcp.js (purge 8 deprecated tools, upgrade core tools)     │
│   • Update .gemini/antigravity/mcp/ schemas                            │
│   • Run full Vitest suite (58+ test suites) & verify clean build       │
└────────────────────────────────────────────────────────────────────────┘
```
