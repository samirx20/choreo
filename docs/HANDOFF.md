# HANDOFF.MD: Session Transition & Next Steps Briefing

Welcome to the **Choreo** (Motion Studio) implementation thread! This document provides the complete context and immediate actionable starting point so the next agent can proceed directly with Phase 1 execution without any ambiguity or redundant questioning.

---

## 1. Project Identity & Vision

* **App Name**: **Choreo** (AI-Native Motion Graphics Studio, inspired by Jitter.video and Linear).
* **Core Philosophy**: *"AI does 0% to 80% (the grunt work), Human does 80% to 100% (the taste and polish)."*
* **Architecture Advantage**: Built on web standards (React 19 + Tailwind CSS + shadcn/ui). All text shaping, multi-line wrapping, flex alignment, and FLIP reactive layout morphs are natively handled by the browser engine on the GPU.

---

## 2. Key Architecture Decisions Locked in Session 1

| Decision Area | Decision | Details & Documentation |
| :--- | :--- | :--- |
| **UI Components** | **shadcn/ui** | Built with Tailwind CSS, Radix UI primitives, and Lucide Icons in dark mode (`zinc-950`/`zinc-900`). |
| **Canvas Paradigm** | Hybrid | Freeform root canvas ($X, Y$) + CSS Auto-Layout groups (Flexbox/Grid). |
| **Audio Strategy** | **Zero Audio in Editor** | 100% focus on visual motion graphics. Audio is intentionally delegated to external NLEs. |
| **Video Rendering** | **Unified FFmpeg Sidecar** | Single native FFmpeg binary sidecar across Windows, macOS, and Linux. Zero external Chromium/Puppeteer bloat. 100% offline, GPU-accelerated. |
| **Project Persistence** | `.motion` Bundle | Single self-contained zip archive packing `scene.json`, `components.json`, and `assets/` (images, videos, embedded fonts) with continuous background auto-save. |
| **Font Management** | Hybrid (3 tiers) | Google Fonts catalog + Host OS System Fonts (via Rust `font-kit`) + Custom font file drag-and-drop. |
| **AI Assistant** | Command Bar (`Ctrl+K`) | Clean palette prompt with instant AST mutation, canvas diff highlighting, and `[✨ AI Applied] [Undo] [Keep]` toast. |
| **Text Splitting** | Context-Aware | Lines $\to$ flex-column; words $\to$ flex-row wrap with **0px visual shift** and default Auto-Link 🔗 staggers. |
| **Snapping & Guides** | Smart Magnetic | Magenta alignment lines + dynamic gap measurement badges (e.g. `24px`). |
| **Custom Components** | Dual-Scope Library | Stampable templates with optional `Keep Linked to Master` toggle, saved in Project or Global library. |
| **Context Menu vs Sidebar** | Strict Separation | Right Sidebar = continuous parameter tuning; Right-Click = discrete 1-click operational triggers. |
| **Documentation Rule** | **Rule 5** | Continuous documentation sync: `AGENTS.md` and `docs/` must immediately be updated on any new feature or architectural change. |

---

## 3. Specification Sitemap (Single Source of Truth)

Before writing code, review these dedicated specification documents:
1. **[AGENTS.md](file:///c:/Users/Sam/Documents/CODE/MOTION-STUDIO/AGENTS.md)** — Primary briefing, agent rules, and `scene.json` schema.
2. **[docs/IMPLEMENTATION_PHASES.md](file:///c:/Users/Sam/Documents/CODE/MOTION-STUDIO/docs/IMPLEMENTATION_PHASES.md)** — 7 detailed engineering phases with checklists.
3. **[docs/UI_PANELS_SPEC.md](file:///c:/Users/Sam/Documents/CODE/MOTION-STUDIO/docs/UI_PANELS_SPEC.md)** — Top bar, Left sidebar, Canvas viewport, Floating toolbar, Timeline, `Ctrl+K` bar, and shortcuts modal.
4. **[docs/RIGHT_SIDEBAR_SPEC.md](file:///c:/Users/Sam/Documents/CODE/MOTION-STUDIO/docs/RIGHT_SIDEBAR_SPEC.md)** — Inspector schemas directly matching reference screenshots (Design Inspector & Animate Inspector tabs).
5. **[docs/DEFAULT_BEHAVIORS_AND_INTERACTIONS.md](file:///c:/Users/Sam/Documents/CODE/MOTION-STUDIO/docs/DEFAULT_BEHAVIORS_AND_INTERACTIONS.md)** — Text splitting, auto-grouping, auto-link cascade, FLIP auto-fit, animation copy-paste, and transactional undo/redo.
6. **[docs/CONTEXT_MENU_MATRIX.md](file:///c:/Users/Sam/Documents/CODE/MOTION-STUDIO/docs/CONTEXT_MENU_MATRIX.md)** — Clean right-click vs. sidebar action matrix.
7. **[docs/PROJECT_SPEC_AND_STORAGE.md](file:///c:/Users/Sam/Documents/CODE/MOTION-STUDIO/docs/PROJECT_SPEC_AND_STORAGE.md)** — `.motion` bundle architecture, font resolution, offline FFmpeg export, and adaptive canvas performance.
8. **[implementation.md](file:///c:/Users/Sam/Documents/CODE/MOTION-STUDIO/implementation.md)** — High-level roadmap.

---

## 4. Current Status: Phases 1 - 6 Completed & Ready for User Verification

All browser-runnable studio features across **Phases 1 through 6** are fully built, tested, and pushed to [`samirx20/choreo`](https://github.com/samirx20/choreo.git) on `main`:
1. **Scaffolding & Store**: React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui primitives. Typed AST in `src/types/scene.ts`, transactional undo/redo in `src/store/history.ts`, Zustand store in `src/store/useProjectStore.ts`.
2. **Motion Engine**: 8 atomic evaluators (`src/engine/atomics.ts`), cubic-bezier easings (`src/engine/easings.ts`), deterministic virtual clock evaluator (`src/engine/evaluator.ts`).
3. **Canvas & Design Mode**: Interactive canvas with pan/zoom, TransformBox with 8 handles and rotation pin, magnetic snapping guides (`src/components/canvas/snapping.ts`), Left Sidebar (screens & layers tree), Floating Add Toolbar, Design Inspector matching Screenshot 4, and context-aware text splitting with 0px visual shift (`src/engine/textSplitter.ts`).
4. **Animate Mode & Timeline**: Multi-track sequencer (`src/components/timeline/TimelinePanel.tsx`) with playhead scrubber, DraggableClip blocks with left/right trim handles, and Animate Inspector (`src/components/inspector/AnimateInspector.tsx`) matching Screenshots 1, 2, and 3.
5. **AI Command Bar & Components**: `Ctrl+K` floating palette with deterministic AST mutation, suggestion chips, and bottom undo toast (`src/components/ai/AICommandBar.tsx`); stampable Custom Components drawer (`src/components/components/ComponentsDrawer.tsx`).
6. **Persistence**: Self-contained `.motion` zip bundle export & import via JSZip (`src/engine/bundle.ts`) and Export modal.

---

## 5. Immediate Next Step: User Verification & Phase 7 Packaging

1. **User Verification Flow**:
   Run `npm run dev` and open `http://localhost:5173`. Test canvas dragging, text splitting, timeline scrubbing, clip dragging, preset swapping, AI command bar, and .motion bundle download.
2. **Phase 7 (Post-Verification)**:
   Initialize Tauri v2 (`cargo tauri init`), configure bundled native FFmpeg sidecar, and wrap the verified React frontend into the standalone desktop binary.
