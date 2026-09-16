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

## 4. Immediate Starting Point for the Next Session

The next session will execute **Phase 1: Project Scaffolding & State Store**:

### Immediate Steps:
1. **Initialize Vite Project**:
   * Scaffold a React 19 + TypeScript project using Vite in the workspace root:
     ```bash
     npm create vite@latest . -- --template react-ts
     ```
2. **Install Styling & UI Dependencies**:
   * Install Tailwind CSS, `@tailwindcss/vite` (or Tailwind v3/v4 setup), `clsx`, `tailwind-merge`, `class-variance-authority`.
   * Install `lucide-react` and `@radix-ui` primitives.
   * Add initial **shadcn/ui** components into `src/components/ui/`.
3. **Implement Zustand `scene.json` Store**:
   * Create `src/store/useProjectStore.ts` defining the typed AST for `Project`, `Screen`, `Layer`, `GroupLayer`, `TextLayer`, `ShapeLayer`.
   * Create `src/store/history.ts` for the transactional undo/redo engine with drag/slider batching.
4. **Build Core DOM Layer Renderers**:
   * Create `src/components/canvas/renderers/`: `<ScreenRenderer>`, `<GroupRenderer>` (with CSS Flexbox support), `<TextRenderer>`, `<ChunkRenderer>`, `<ShapeRenderer>`.
5. **Verify**:
   * Ensure `npm run dev` boots cleanly and renders a live interactive sample screen from `scene.json` with working `Ctrl+Z` / `Ctrl+Shift+Z`.

---

## 5. Copy-Paste Starter Prompt for the Next Session

When opening the new thread, paste this prompt to start immediately:

> *"Please read [AGENTS.md](file:///c:/Users/Sam/Documents/CODE/MOTION-STUDIO/AGENTS.md) and [docs/HANDOFF.md](file:///c:/Users/Sam/Documents/CODE/MOTION-STUDIO/docs/HANDOFF.md). All specifications and architectural decisions for **Choreo** are fully resolved. Let's begin executing **Phase 1**: project scaffolding with React 19, Vite, Tailwind CSS, shadcn/ui, and the Zustand state store with transactional undo/redo."*
