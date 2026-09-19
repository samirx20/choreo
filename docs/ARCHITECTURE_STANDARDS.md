# Motion Studio Architecture Standards: Creative Tool & Motion Model

This document establishes the definitive, binding architectural and design standards for **Motion Studio**. It resolves all ambiguity regarding the transition between Design and Motion, the Screen/Scene sequencing model, the Creative Tool UI philosophy, Light Mode, and component ergonomics.

---

## 1. Design $\leftrightarrow$ Motion Architecture: "Two Modes, One Truth"

### The Rule: Zero Pipeline Friction, Zero "Sending"
* **"Send to Motion" is Eliminated**: In professional tools (Jitter.video, Rive, Figma, After Effects), there is never a "Send to Motion" button. Forcing an export/import between design and animation creates state divergence and breaks creative flow.
* **Unified State**: Design and Motion are simply **two perspectives on the exact same project state (`scene.json`)**:
  - Every layer created in Design **already exists** in Motion.
  - Every edit made in Design is immediately reflected in Motion.
  - When an element is added in Design, it occupies the active screen's duration as a static layer until an animation preset (In, Out, Emphasis) is assigned.

### Mode Behaviors

| Feature | DESIGN Mode | MOTION Mode |
| :--- | :--- | :--- |
| **Canvas View** | Unobstructed infinite pasteboard with the active Screen artboard centered. | 75% dark camera frustum matte framing the artboard 1:1 like a broadcast program monitor. |
| **Time $t$** | **Resting State** (The target design layout at resting pose, free from temporal displacement). | **Dynamic Time $t$** (Driven by the playhead $0 \le t \le \text{duration}$). |
| **Bottom Sequencer** | **Hidden** to maximize vertical canvas workspace. | **Visible (Slides up)** with clip tracks, playhead needle, transport controls, and work area brackets. |
| **Right Inspector** | **Design Properties**: Layout ($X, Y, W, H, \angle$), Typography, Fill, Stroke, Radius. | **Motion Properties**: Animation Presets (`Pop`, `Slide`, `Blur`), Delays, Easings, and Durations. |
| **Switching Modes** | Instant 1-click tab toggle in the top bar (`DESIGN | MOTION`). Zero load time, zero state synchronization lag. |

---

## 2. Screens vs. Artboards vs. Frames Model

### The Choice: The Jitter Scene-Based Standard (Pattern B)
* A video project is structured as a collection of semantic **Screens / Scenes** (`screens: Screen[]`), e.g.:
  - **Screen 1**: Hook (3.0s)
  - **Screen 2**: Problem / Feature Demo (4.5s)
  - **Screen 3**: Call to Action (2.5s)
* **Active Screen Focus**:
  - In both **DESIGN** and **MOTION** modes, the canvas displays **only the currently active Screen** centered in the viewport.
  - **Screens Outliner**: The left sidebar features a clean **Screens List** where users can click to switch active screens, reorder them, adjust individual screen durations, or click `+` to add a new screen.
  - The Motion sequencer reflects the layers and timing of the *active screen*.
* **Master Sequencing (EDITOR Studio)**:
  - In the multi-track NLE Editor, all screens sequence linearly on the master track (Screen 1 $\to$ Screen 2 $\to$ Screen 3) alongside master audio waveforms and cut tools.
* **Why this is superior for video**: Displaying 20 artboards spatially across an infinite canvas is built for static UI apps (Figma), not temporal video. Isolating the active scene on a Program Monitor keeps rendering at 60fps and eliminates cognitive overload.

---

## 3. The Creative Tool Standard (Tool vs. SaaS)

Motion Studio is a **desktop creative tool**, not a SaaS marketing web app.

### A. Light Mode as First-Class & Neutral Tool Palette
* **Eliminate SaaS Marketing Trope**: Purge all purple/indigo (`#6366f1`), bluish gradients, and neon branding from the UI chrome. A creative tool must remain color-neutral to avoid contaminating the creator's visual perception of their artwork.
* **Light Mode Color System**:
  - **Canvas Pasteboard**: Neutral warm gray `#e5e5e5` or `#f1f5f9` (providing clear contrast against artboards).
  - **App Chrome & Panels**: Clean neutral `#ffffff` with subtle `#e2e8f0` 1px borders.
  - **Text Primary**: Crisp Slate-900 `#0f172a`.
  - **Text Secondary & Icons**: Muted Slate-500 `#64748b`.
  - **Input Backgrounds**: Neutral `#f8fafc` with `#e2e8f0` borders.
* **Dark Mode**: Neutral slate/charcoal (Figma Dark `#1e1e1e`), not neon or high-contrast void.
* **Selection / Active Color**: Pure monochrome (Slate-900 `#0f172a` in Light Mode, White in Dark Mode), or standard native system blue (`#0284c7` / `#0066ff`) strictly for canvas bounding boxes.

### B. Box Rounding & Ergonomics (`1.25rem` / `20px`)
* **Floating Tool Selector**:
  - Restored to the comfortable, well-padded pill aesthetic from the user's reference image:
  - Outer container: `rounded-[20px]` (`1.25rem`), height `44px`, generous horizontal padding, subtle shadow.
  - Tool buttons: `rounded-[12px]`, crisp 18–20px monochrome icons (`Select`, `Hand`, divider, `Text`, `Shape` with chevron dropdown, `Media` with chevron dropdown, divider, `Components`).
* **Input Fields & Panels**: Soft, comfortable `rounded-[10px]` to `rounded-[12px]`. No harsh 2px boxes or squished micro-buttons.

### C. Action Stripping (Zero Marketing Noise)
* **Purged**:
  - No "Send to Motion" buttons.
  - No "Export 🚀" marketing buttons.
  - No emoji icons in buttons.
  - No AI marketing banners or conversion badges.
* **Retained Functional Actions**:
  - **Top Bar**: Project title, clean mode toggle (`DESIGN | MOTION`), zoom control (`Fit`, `100%`), preview Play/Pause, and a quiet, neutral `Export` button (`bg-slate-900 text-white`).
