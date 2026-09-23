# Motion Studio Handoff — Element Individuality, Next-Gen Motion & Novel Concepts

> **Session Context**: This handoff establishes the architectural foundation and execution roadmap for the upcoming session. It focuses on **Element Individuality** (pruning irrelevant properties, context menus, and animations per layer type), elevating the motion engine **beyond "upgraded PowerPoint" into Apple/Google showcase-tier motion**, and preparing the technical groundwork for **user-envisioned novel features**.
> **Date**: September 23, 2026
> **Branch**: `main` (Latest commit: `2b456e5`, pushed to remote)

---

## 1. Current Verified Baseline

The repository is in a pristine, fully verified, production-ready state:
* **Automated Unit & Integration Tests**: All **38 test suites (329 tests)** passing via Vitest (`npm test`).
* **Production Build**: Compiles cleanly with **0 TypeScript / Vite bundling errors** (`npm run build`).
* **Git Status**: Clean working tree on `main`, synchronized with GitHub remote.
* **Recent Deliverables Completed (Decisions 57–61)**:
  * **Interactive Drag-to-Create Elements (Decision 61)**:
    * Implemented interactive click-and-drag creation across all canvas tools (`Rectangle`, `Circle`, `Star`, `Triangle`, `Polygon`, `Line`, `Arrow`, `Frame`, `Text`).
    * Real-time creation ghost preview overlay with live dimension badge (`340 × 180`) and rotated vector angle badge (`280px (45°)`).
    * `Shift` modifier for 1:1 aspect ratio constraint and 45° angle snapping.
    * `Alt` modifier for symmetrical center-origin expansion.
    * Single-click fallback ($\le 5\text{px}$) retaining standard default sizes.
    * Auto-proportioning text box font size based on dragged height.
  * **Triangle/Star Solid Fill & Line Shape Rendering (Decision 60)**:
    * Disentangled outer container CSS from SVG inner fill in `ShapeRenderer.tsx`. Triangles, stars, and polygons now render solid authored fills and support instant fill toggling.
    * Fixed `LineRenderer.tsx` stroke width collapsing bug (`baseCss.borderWidth = 0` masking stroke).
    * Line creation helper initialized with non-zero dimensions, theme colors, and dual Fill/Stroke color picker responsiveness.
  * **Sequential Scene Background Inheritance (Decision 59)**:
    * New scenes automatically inherit the background fill of the preceding scene.
    * Completely removed the "Apply to All" complexity and batch mutation side-effects.
  * **White Canvas Default & Inspector Layout Compression (Decision 58)**:
    * Default canvas background switched to clean `#ffffff`.
    * Solved the permanent fill toggle disable bug caused by `"transparent"` string truthiness.
    * Compressed the Canvas Format header into a single minimal row with a Lock indicator.
  * **Native Desktop Natural Storage & Autosaves (Decision 57)**:
    * Tauri save dialogs open directly into `Documents/Motion Studio/`.
    * Background disk autosave mirroring active `.mtn` files to `Documents/Motion Studio/Autosaves/`.
    * Bidirectional project title <-> `.mtn` file name synchronization.

---

## 2. Next Session Agenda & Technical Roadmaps

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       NEXT SESSION CORE ROADMAP                             │
├──────────────────────────────┬──────────────────────────────┬───────────────┤
│ Track 1: Element             │ Track 2: Next-Gen Motion     │ Track 3:      │
│ Individuality & Context Purity│ Beyond "PowerPoint"         │ Novel Concepts│
│ (Inspectors, Menus, Catalogs)│ (Liquid Springs, Morphing)   │ (User Vision) │
└──────────────────────────────┴──────────────────────────────┴───────────────┘
```

---

### Track 1: Element Individuality & Context-Aware Purity

**Core Problem**: Currently, inspectors, right-click context menus, and animation pickers expose generic options across all element types. For example, a Line displays a "Fill" section (which makes no physical sense on a 1D stroke), Rectangular controls show up on text, and nonsensical animations clutter the catalog.

**Engineering Target**: Every layer type must only expose properties, context actions, and animation presets that are strictly relevant and editable for its specific physical form.

#### 1. Inspector Card Pruning Matrix
| Layer Type | Fill | Stroke | Radius | Shadows | Typography | Arrow Ends | Specific Controls |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Line / Arrow** | ❌ **Absent** | ✅ Width, Color, Cap, Dash | ❌ **Absent** | ❌ **Absent** | ❌ **Absent** | ✅ Start/End Markers | Length, Angle |
| **Rectangle** | ✅ Solid / Gradient | ✅ Width, Color, Style | ✅ 4-Corner Radii | ✅ Soft / Hard | ❌ **Absent** | ❌ **Absent** | Overflow Clip |
| **Circle / Ellipse** | ✅ Solid / Gradient | ✅ Width, Color, Style | ❌ **Absent** (Fixed 100%) | ✅ Soft / Hard | ❌ **Absent** | ❌ **Absent** | Aspect Ratio Lock |
| **Star** | ✅ Solid / Gradient | ✅ Width, Color, Style | ❌ **Absent** | ✅ Soft / Hard | ❌ **Absent** | ❌ **Absent** | Points Count, Inner Ratio |
| **Triangle / Polygon**| ✅ Solid / Gradient | ✅ Width, Color, Style | ❌ **Absent** | ✅ Soft / Hard | ❌ **Absent** | ❌ **Absent** | Sides Count |
| **Text** | ✅ Font Color | ❌ **Absent** (unless card) | ❌ **Absent** | ✅ Text Shadow | ✅ Full Type Suite | ❌ **Absent** | Split Mode, Text Background |
| **Frame** | ✅ Surface Fill | ✅ Frame Border | ✅ Frame Radii | ✅ Soft / Hard | ❌ **Absent** | ❌ **Absent** | Flex Layout, Clip Content |
| **Icon** | ❌ **Absent** | ✅ Stroke Width, Color | ❌ **Absent** | ❌ **Absent** | ❌ **Absent** | ❌ **Absent** | Lucide Icon Picker |
| **Media (Image/Video)**| ❌ **Absent** | ✅ Media Border | ✅ Corner Radii | ✅ Elevation | ❌ **Absent** | ❌ **Absent** | Fit Mode, Loop, Source URL |

#### 2. Context Menu (Right-Click) Customization
* `buildCanvasElementMenu.ts`:
  * **Line / Arrow**: Suppress "Add Background Card", "Round Corners", or "Split Text". Expose "Flip Direction", "Toggle Arrow Heads", "Reverse Endpoints".
  * **Text**: Expose "Split into Words", "Split into Lines", "Convert to Title Case".
  * **Group / Frame**: Expose "Auto-Fit Content", "Distribute Evenly", "Ungroup".

#### 3. Context-Aware Animation Catalog Filtering
* Filter animation presets based on layer physics:
  * **Line / Arrow**: Draw-On (Trim Path), Stroke Width Pulse, Slide In from Endpoint, Dart. Exclude Scale-Bounce, Text Baseline Reveals, Hacker Decrypt.
  * **Text**: Staggered Word Cascades, Baseline Ascents, Letter Tracking Spreads, Counter Rolls.
  * **Shapes**: Morph, Grow, Pop, Elevation Rise, Corner Smooth.

---

### Track 2: Beyond "Upgraded PowerPoint" — Showcase Motion Graphics

**Core Problem**: The current animation engine relies on simple slides, fades, and scale pops. These feel like presentation slide transitions rather than modern high-end product motion graphics (such as those seen in Apple keynote unveils, Google Material 3 showcase videos, or Linear/Raycast trailers).

**Engineering Target**: Elevate the engine into a state-based aesthetic compiler with fluid physical momentum, metric-aligned typographic reveals, and optical depth:

1. **Continuous Magic Move & Vector Path Morphing**:
   * Automatic vertex and curvature interpolation when transitioning shapes between beats.
   * Seamless morphing of geometric shapes (e.g. circle $\to$ squircle $\to$ rounded card) with $C^1$ velocity hand-offs.
2. **Kinetic Typography Primitives**:
   * **Smart Baseline Masking**: Text revealing from underneath an optical baseline without chopping descenders (`g`, `y`, `p`).
   * **Dynamic Word Morphing with Spring Reflow**: A keyword changes in the middle of a sentence, and the trailing suffix words physically reflow via smooth spring physics instead of snapping.
   * **Rolling Odometer Counters**: Numbers that roll with optical blur and elastic settle.
3. **Reactive Layout Primitives (Zero Manual Keyframes)**:
   * **Container Hugging (`mode: 'hug'`)**: Background pill cards dynamically expand with physical spring inertia as text types or counters roll.
   * **Connected Leader Lines & Pins**: Dynamic lines linking an element to an anchor point with realistic physics lag as the driver element shifts.
4. **Cinematic 3D & 2.5D Staging**:
   * Telephoto camera framing (compression of visual depth).
   * Parallax elevation dispersion (contact shadow vs ambient dispersion shadow).
   * PBR specular sweeps over hardware bezels and glass surfaces.

---

### Track 3: Novel & Unseen Features (User Vision)

* A dedicated collaborative session to explore and architect breakthrough features conceptualized by the user that do not currently exist in Figma, After Effects, or Jitter.
* Focus on agentic choreography, generative layout solvers, or novel visual interaction paradigms.

---

## 3. Verification Checklist for Next Session

- [ ] Inspect each element type on canvas and confirm **zero irrelevant properties** appear in the Inspector (e.g. no Fill on Line, no Radii on Circle).
- [ ] Verify right-click context menu options adapt cleanly to the selected layer type.
- [ ] Run automated test suite: `npx vitest run` (all 329+ tests passing).
- [ ] Run production build: `npm run build` (0 TypeScript / bundling errors).
- [ ] Maintain Documentation Synchronization: Record all structural decisions in `docs/DECISIONS.md` and keep `AGENTS.md` up to date.
- [ ] Commit atomically with conventional commit format and push to GitHub remote (`git push origin main`).
