# Motion Studio Handoff — Architecture, Parity & AI Choreography Agenda

> **Date**: September 26, 2026  
> **Branch**: `main`  
> **Session Baseline**: 58 test suites, 595 automated tests passing via Vitest (`npm test`). Production build succeeds with 0 errors in 9.83s (`npm run build`). Working directory clean, pushed to `origin/main`.

---

## 1. Executive Summary: What Was Accomplished

In this milestone, we solved the systemic issues causing poor agent animations, closed the agent perceptual blackout, achieved strict 1:1 GUI-to-MCP parity, and purged all phantom legacy tools:

1. **Multi-Clip Animation Timelines & Persistent Transforms (`DECISIONS.md` Decision 129)**:
   - Replaced the single-entrance constraint with full multi-clip lifecycle choreography:
     - `in`: Scene entrance reveals (`baselineRise`, `wordCascade`, `elevationRise`, `cardSettlePop`, `pop`, `slide`).
     - `action`: Mid-scene coordinate shifts, scale transformations, and rotations (e.g. moving a hero card aside to yield focus).
     - `emphasis`: Attention pulses, bounces, wiggles, or floating loops.
     - `out`: Scene exits.
   - Added sequential chaining (`mode: 'append'`), batch provisioning via `animations: [...]` on both `place_element` and `apply_animation`, and set default `fillMode: 'forwards'` for `action` clips so transformed positions persist without snapping back.
2. **Deep Recursive Layer Resolution (`findLayerInDoc` & `findLayerInTree`)**:
   - Replaced all 18 shallow `screen.layers.find` / `splice` calls in `mcp.js`. Nested elements at arbitrary depth inside groups, frames, compound cards, and masks can be found, modified, reordered, deleted, split, or animated without "layer not found" errors.
3. **Eradication of the Agent Perceptual Blackout**:
   - Overhauled `get_storyboard_state` and `get_contact_sheet`: returns complete spatial `bounds: { x, y, width, height, rotation, opacity, zIndex }`, typography copy and styling (`content, fontSize, fontWeight, color, textAlign`), visual styles (`fillColor, strokeColor, shadowBlur, borderRadius`), counter configs, clip timelines (`id, role, preset, start, duration, end, easing, fillMode`), and nested `children`.
4. **Preserved Explicit Pixel Bounds**:
   - Fixed a bug where `place_element` auto-expanded headlines with `colSpan < 8`, overwriting explicit pixel `bounds: { x, y, width, height }` authored by the agent. Now explicit `bounds` are 100% preserved.
5. **Purged Retired Relational Linking from MCP & Schemas (`DECISIONS.md` Decision 130)**:
   - Completely deleted phantom `link_elements` and `unlink_elements` from `mcp.js`, tool schemas (`.gemini/antigravity/mcp/motion-studio/`), `src/tools/linkElements.ts`, and `src/types/agentTools.ts`.
   - Updated `instructions.md` and `AGENTS.md` Rule 7 to focus strictly on deterministic motion primitives and universal element splitting.
   - MCP now hosts strictly 40 real tools that match the actual studio GUI.

---

## 2. Next Session Agenda: How AI Should Author Animations

The core topic for the upcoming session is **determining the optimal mental model and authoring pipeline for AI agents to generate world-class animations effortlessly**, leveraging the engine underneath.

### The Question: Pure Keyframes vs. Magic Move vs. Macro Presets

```
Approach A: Pure Keyframes              Approach B: State-Based Magic Move           Approach C: Macro Animation Presets
(t₁ → t₂, Param₁ → Param₂)             (Beat 1 Scene → Beat 2 Scene)                (Single-scene apply_animation)
─────────────────────────────────      ──────────────────────────────────────       ───────────────────────────────────
Agent writes:                          Agent writes:                                Agent writes:
{ t: 0, y: 100 } → { t: 0.8, y: 0 }    Scene 1: Element A at (col 4, row 3)        place_element({ enter: "elevationRise" })
                                       Scene 2: Element A at (col 2, row 1)        apply_animation({ type: "action", ... })
PRO: Simple mental model, no presets   PRO: High-level state, no arithmetic         PRO: Instant Apple/Google polish in 1 call
CON: Typography looks amateurish,      CON: Requires multi-scene beat mindset       CON: High tool cognitive load; agent gets
     no spring harmonic depth               (though this matches Keynote)                confused between intra vs inter-scene
```

### Key Discussion & Decision Points for Next Session:

1. **The "State 1 → State 2" Simplification**:
   - Should we steer the AI agent primarily toward **Magic Move across scenes** (Scene 1 = initial resting state, Scene 2 = transformed state, transition = `magicMove`) as the primary motion mechanism?
   - How can the engine make Magic Move so seamless that an agent almost never needs to calculate mid-scene pixel offsets (`toY: -200`)?
2. **Typography Choreography (The One Place Presets Win)**:
   - For kinetic typography (`wordCascade`, `baselineRise`, `lineReveal`, `typewriter`), manual keyframing by an LLM is error-prone because LLMs struggle with millisecond offset tables and descender protection math.
   - How do we preserve one-line typography brilliance (`wordCascade`) while keeping the rest of the spatial movement purely state-driven?
3. **Agent Tool Streamlining**:
   - Can we introduce a unified `transition_element({ id, toState: { col, row, width, height, opacity }, easing })` tool, or does `magicMove` between scenes already solve this better?
   - How to ensure lightweight / smaller LLM models generate Apple-tier results without hallucinating complex parameters?
4. **Pre-Flight Telemetry & Visual Iteration Loop**:
   - Designing the feedback loop: Agent generates $\to$ calls `get_contact_sheet()` $\to$ reads exact bounding box and timing data $\to$ refines misalignments autonomously without user debugging.

---

## 3. Engineering State & Verification

* **Test Suite**: 58 files, 595 tests passing (100% green).
* **Production Build**: `tsc -b && vite build` completes in 9.83s with 0 errors.
* **Rust Backend**: `cargo check` passes with 0 warnings.
* **Git Status**: Clean working tree on `main` (`92cf491`), fully pushed to remote.

```bash
$ npx vitest run
Test Files  58 passed (58)
     Tests  595 passed (595)
  Duration  19.44s

$ npm run build
✓ built in 9.83s
```
