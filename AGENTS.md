# AGENTS.md — Motion Studio Agent Guidelines & Engineering Standards

Welcome to **Motion Studio**. This repository is engineered to allow AI agents—even lightweight or "dumb" models—to reliably generate world-class, Apple- and Google-tier product showcase motion graphics.

This document establishes the mandatory engineering standards, architectural rules, and documentation synchronization protocols for all AI agents operating in this codebase.

---

## 1. Core Mission & Philosophy

* **Target Output**: Apple Keynote & Google Material 3 showcase-grade motion graphics (fluid spring physics, metric-aligned typographic reveals, cinematic telephoto 3D camera staging, and optical depth).
* **Target Author**: AI agents. The engine is an **Aesthetic Compiler and Guardian**: it guarantees spatial validity, physical momentum, and narrative timing by construction, leaving the agent to specify creative and structural intent.
* **Mental Model**: **State-Based Storyboards with Magic Move on a Modular Video Grid**, operated via **Step-by-Step Tool Calling**.

---

## 2. Mandatory Rules for AI Agents

### Rule 1: Maintain Documentation Synchronization
* Whenever you make architectural changes, refine decisions, introduce new tools, or modify schema contracts, you **MUST immediately update**:
  1. `docs/DECISIONS.md` (or the relevant file in `docs/`)
  2. `AGENTS.md` (this file)
* Never leave documentation out of sync with the codebase. Documentation in this repository is the single source of truth for all human and AI collaborators.

### Rule 2: Absolute Zero Hardcoding
* **No Magic Numbers**: Never hardcode pixel values, spring stiffness/damping coefficients, colors, or durations inside components or renderers.
* **Config & Token Driven**:
  * Spring profiles must live in modular token registries (e.g., `src/engine/easings.ts` or design token definitions).
  * Grid definitions must derive from aspect ratios (e.g., 16:9 $\to$ 16x9, 9:16 $\to$ 9x16).
  * Device models, materials, and camera presets must be cleanly registered in asset registries.
* **Dynamic Sizing**: Elements must use the modular grid bounds and auto-fit math rather than hardcoded width/height pixels.
* **Checkbox Single-Property Design**: Visual properties must follow the single-property checkbox model (`fillColor`, `strokeWeight`, `shadowBlur`), avoiding Figma-style array stacks (`fills: []`). This guarantees 1:1 unambiguous animation targeting for AI agents.

### Rule 3: Strict Modular Architecture
Follow a clean, unidirectional separation of concerns:
```
src/
├── types/              # Pure TypeScript interfaces & Zod validation schemas
├── engine/
│   ├── grid/           # Modular video grid solver & box-fit auto-scaling
│   ├── physics/        # Analytical 2nd-order harmonic oscillator spring solvers
│   ├── storyboard/     # Beat solver & Magic Move interpolation engine
│   ├── pixi/           # 2D Canvas vector, shape, and text rendering
│   ├── three/          # 3D stage, PBR materials, telephoto camera, & FBO projection
│   ├── export/         # WebCodecs / FFmpeg frame-accurate video exporters
│   └── perception/     # AST pre-flight linter & contact sheet generator
├── tools/              # AI Agent Tool Calling API (create_beat, place_element, etc.)
├── store/              # Zustand state stores (project, selection, playback)
└── components/         # React Studio UI (Storyboard Strip, Viewport, Inspectors)
```
* **No cross-layer bleeding**: Renderers must not know about React hooks. Evaluators must be pure mathematical functions.

### Rule 4: Deterministic & Scrubbable Evaluation ($O(1)$)
* All animations and transitions must evaluate **deterministically** as a pure function of time:
  $$\text{State}(t) = f(\text{Storyboard}, t)$$
* Never use frame-dependent numerical integration (Euler/Verlet accumulation loops) that drifts with frame rates or breaks backward scrubbing.
* Always use **closed-form analytical solutions** for second-order harmonic oscillator springs.

### Rule 5: Self-Healing & Constructive Agent Tools
* Agent tools (`create_beat`, `place_element`, etc.) must never fail silently or throw unhandled exceptions.
* If an agent specifies an invalid coordinate (e.g., `col: 15, colSpan: 4` on a 16-col grid):
  * The tool must **auto-correct / clamp** the parameter to a valid state.
  * The tool must return a clear, constructive notice explaining the correction so the agent learns and stays in bounds.

### Rule 6: Type Safety & Zod Validation
* Every schema exposed to agents or stored in state must have an accompanying **Zod schema** and derived TypeScript type.
* Avoid `any` types. If dynamic properties are necessary, use strict discriminated unions or typed records with validation.

### Rule 7: Motion-First Reactive Primitives & Zero-Shift Splitting
* Never force AI agents to calculate transient frame-by-frame coordinates for expanding cards, following cursors, or leader lines.
* Use first-class relational bindings and reactive layout primitives:
  * **Reactive Container Hugging (`mode: 'hug'`)**: Background cards dynamically expand to hug typing text or rolling counters with spring buffering.
  * **Universal Element Splitting (0.0000px Visual Shift Invariance)**:
    * Shape contour decomposition: Rounded rectangles split into dual continuous bezier arc paths (NW $\to$ SE and SE $\to$ NW) with dual-origin draw-on.
    * Stroke & Fill separation: Instant stroke draw-on paired with delayed fill fade-in.
    * Typography semantic splitting: Words, lines, and custom selections with exact whitespace advance calculation.
    * Line & Arrow detachment: Collinear ratio splitting and independent arrowhead tip stamping.
    * Container detaching: Absolute coordinate preservation un-nesting.
  * **Word Morphing (`configure_word_morph`)**: Rotating keyword highlights with continuous spring reflow of trailing suffixes.
  * **Connected Leader Lines & Pins**: Dynamic links tracking moving elements with physical inertia lag.

### Rule 8: Impeccable Craft Floor & Banned Anti-Patterns
Never generate or suggest cheap SaaS cliches, decorative gimmicks, or lazy UI tropes:
* **ABSOLUTE BAN: Eyebrows, Kickers, & Category Badges**:
  * Never place an eyebrow label or category kicker above a headline (e.g. no "AI POWERED", "FEATURE", or pill tags floating above titles). Headings carry their own weight; delete the label and let the heading speak.
* **NO DECORATIVE GIMMICKS**:
  * **No Gradient Text**: Text emphasis comes from weight or scale, never rainbow or metallic text gradients.
  * **No Hacker/Scramble Decrypt**: Monospace character scrambling is a costume, not content.
  * **No Gratuitous 3D Grid Floors**: Backgrounds are surfaces textured only from the subject's world; never throw in a 3D floor grid or cyber lines as generic filler.
  * **No Fake Sparklines or Empty Activity Rings**: Data visualizations must represent real data, never stand in as generic decoration.
  * **Single Elevation System**: Never combine a 1px border under a wide soft shadow ("ghost card"). Declare elevation once: clean border OR physical shadow.
* **MOTION DISCIPLINE: One Authored Moment**:
  * Showcase motion graphics must have **one authored moment per beat**, not a scattershot of ten competing entrances, pulses, and floating pills.

### Rule 9: Professional Precision Tool Principle (High Signal, Zero Noise UI)
* Motion Studio is a precision engineering instrument, not a conversational assistant or decorative demo.
* Expose **only the information that is strictly necessary**.
* Dropdowns, selects, and inputs must use clean, minimal values without conversational descriptions, mood labels, or decorative suffixes (e.g. frame rate is strictly `60`, `30`, `24`, `12`, `8`, `6`, never "Smooth (60 fps)" or "Cinematic (24 fps)").
* Single-row alignment, compact sizing, high information-to-ink ratio.
* Never introduce random layout shifts or break established UI patterns. Always use shared design system components (shadcn `Select`, `DropdownMenu`, etc.) over native browser elements.

### Rule 10: Multi-Project Lifecycle & Storage Standards
* All project lifecycle operations (create, duplicate, rename, delete, import, export) must go through `src/services/projectStorage.ts` and `src/store/useProjectRegistryStore.ts`.
* **Zero Data Loss**: Always maintain backward compatibility with legacy single documents via `migrateLegacyProjectIfPresent()`.
* **Clean Studio View Separation**: The application maintains a decoupled top-level view state (`"workspace"` vs `"editor"`). Returning to the workspace must auto-save the active project document before unmounting the editor.
* **Standard Aspect Formats**: Projects must conform to canonical dimensions: 16:9 (`1920×1080`), 9:16 (`1080×1920`), 1:1 (`1080×1080`), 4:5 (`1080×1350`), or validated custom bounds.

### Rule 11: Continuous & Frequent Git Commits (Atomic Discipline)
* **Commit Early & Often**: Never accumulate large backlogs of uncommitted code across multiple turns or sessions.
* **Atomic Semantic Commits**: As soon as a logical unit of work passes verification (e.g. a feature phase, refactor, bugfix, or test suite addition), create an atomic commit with conventional commit format (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`).
* **Always Push to Remote**: After completing a task or milestone, push commits to GitHub (`git push origin <branch>`). Do not leave commits unpushed or code untracked.
* **Codebase Hygiene**: Never commit or leave temporary scratch scripts, debug logs, or binary dumps on disk.

### Rule 12: Element Individuality & Form Truth (Ontological Purity)
* **No Cross-Element Property Pollution**: Every layer type has a distinct physical and ontological identity. Never assign or expose properties that violate the physical form:
  * 1D lines and arrows do not have area fills, font sizes, or border radii.
  * Circles and ellipses have fixed radial geometry and do not expose 4-corner radii inputs.
  * Icons do not have competing outer box borders; text layers do not receive card box strokes unless explicitly wrapped in a card frame.
* **Non-Spatial Channel Monotonicity**: Easing curves applied to non-spatial property channels (opacity, colors, blurs, trim paths) must be monotonic. Never apply overshooting/elastic spring curves to color or opacity channels to prevent numerical explosion or visual clipping.
* **Constructive Agent Tool Sanitization**: When an agent invokes `place_element` or `apply_animation`, tools must constructively sanitize and strip invalid properties/presets with clear learning notices instead of silently accepting corrupted states.

---

## 3. The Agent Workflow Pattern

When building or choreographing a motion graphic, agents follow the **Two-Stage Pipeline**:

```
[Stage 1: Director]
  └─► Proposes narrative beat sheet, copy, theme, and 3D device staging.

[Stage 2: Choreographer]
  └─► Step 1: create_beat({ id, duration, transition, camera })
  └─► Step 2: place_element({ beatId, id, type, grid, enter, style })
  └─► Step 3: Repeat for subsequent beats (Magic Move triggers by ID)
  └─► Step 4: get_contact_sheet() to visually inspect the composition
```

---

## 4. Quality Guardrails Checklist

Before completing any generation or refactoring, verify against this checklist:
- [ ] **Grid Validity**: Are all elements positioned on the aspect-ratio grid within safe margins?
- [ ] **No Overflows**: Does text auto-fit inside its assigned grid cell?
- [ ] **Velocity Continuity ($C^1$)**: Are transitions between beats using smooth spring momentum hand-offs?
- [ ] **Element Individuality**: Are all elements free from cross-property pollution (e.g., no fills on lines, no 4-corner radii on circles)?
- [ ] **Corner Radius**: Are card corners cleanly and intentionally rounded without arbitrary magic curvature?
- [ ] **Metric-Aligned Text**: Are text reveals clipping along the baseline without chopping descenders ("g", "y", "p")?
- [ ] **Zero Layout Shift on Split**: Does text splitting maintain 0.0px visual shift from unsplit resting state?
- [ ] **Zero Eyebrows or Kickers**: Are headings clean and self-standing without floating category badges?
- [ ] **Single Elevation**: Does each surface choose either border or shadow, avoiding the ghost card?
- [ ] **One Authored Moment**: Does each beat focus on a single primary movement without scattered visual clutter?
- [ ] **Zero Black Frames**: Does the AST pre-flight linter pass with 0 errors?

---

## 5. Autonomous Testing & Engineering Roadmap

* For the current roadmap, pending primitives, and implementation specifications, refer to [docs/HANDOFF.md](file:///c:/Users/Sam/Documents/CODE/MOTION-STUDIO/docs/HANDOFF.md).
Agents must never rely on manual user bug reports. Features and workflows must be rigorously verified with automated unit and integration tests across all layers.

