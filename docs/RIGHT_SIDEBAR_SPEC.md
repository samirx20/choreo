# RIGHT_SIDEBAR_SPEC.MD: Right Inspector Specifications (Design & Animate Modes)

This document provides the precise layout, input schemas, and visual hierarchies for the **Right Sidebar Inspector** in Motion Studio, directly reflecting the clean organization of the reference screenshots while unlocking the full styling power of modern **HTML, Tailwind, and CSS**.

---

## 1. Design Mode Inspector

Width: `320px`, `bg-zinc-950 border-l border-zinc-800 flex flex-col overflow-y-auto`.

### A. Visual Layout (Directly Matching Screenshot 4)

```
┌──────────────────────────────────────────────┐
│ [◼] Rectangle 1                          […] │
├──────────────────────────────────────────────┤
│  ⫷    ⫸    ⫹    ⫺    ⫦    ⫧                   │ (Quick Alignment Bar)
├──────────────────────────────────────────────┤
│ Layout                                       │
│   Position    [ 186      ]    [ 372      ]   │
│   Size        [ 690      ]    [ 302      ] 🔗│
│   Angle       [ 0°       ]                   │
├──────────────────────────────────────────────┤
│ Auto-Layout (CSS Flex)   [ Auto-Fit Box 🟢 ] │ (Shown for Groups & Cards)
│   Direction   [ Row | Column ]  Gap: [ 12px ]│
│   Padding     [ 32px     ]                   │
├──────────────────────────────────────────────┤
│ Typography                                   │ (Shown for Text & Chunks)
│   Font        [ Inter          ▾ ]  [ 700 ▾ ]│
│   Size / Line [ 72px     ]    [ 1.2      ]   │
│   Align / Case[ ≡   ≡   ≡ ]   [ TT  tt  Tt ] │
├──────────────────────────────────────────────┤
│ Opacity       [ 100%     ]               💧  │
├──────────────────────────────────────────────┤
│ Corner        [ 0        ]               ⛶   │ (Expands to 4 corners)
├──────────────────────────────────────────────┤
│ [✓] Fill                                 🎨  │ (Expands on check)
├──────────────────────────────────────────────┤
│ [ ] Stroke                               ✏️   │
├──────────────────────────────────────────────┤
│ [✓] Shadow                               🌫️  │
├──────────────────────────────────────────────┤
│ [ ] Layer blur                           🫧  │
├──────────────────────────────────────────────┤
│ [✓] Background blur                      🪞  │
├──────────────────────────────────────────────┤
│ ▸ Advanced CSS & Tailwind                    │ (Collapsible Drawer)
└──────────────────────────────────────────────┘
```

### B. Property Specifications (Design Mode)

#### 1. Header & Layer Identification
* Layer Type Icon (e.g. `◼` Rectangle, `T` Text, `⊞` Group).
* Editable Layer Name (`Input` without border; updates layer tree).
* More Options Button (`[...]`): Quick actions (Copy, Duplicate, Delete, Save as Component).

#### 2. Alignment Quick-Bar (6 Icon Buttons)
* Align Left (`AlignLeft`)
* Align Horizontal Center (`AlignHorizontalJustifyCenter`)
* Align Right (`AlignRight`)
* Align Top (`AlignVerticalJustifyStart`)
* Align Vertical Center (`AlignVerticalJustifyCenter`)
* Align Bottom (`AlignVerticalJustifyEnd`)
* *Multi-Selection Extension*: Distribute Horizontally & Distribute Vertically buttons appear.

#### 3. Layout Section
* **Position**: `X` and `Y` numeric inputs in pixels (or relative percentage).
* **Size**: `Width` (`W`) and `Height` (`H`) numeric inputs with aspect-ratio lock toggle (`🔗`).
* **Angle**: Rotation in degrees (`0°` to `360°`), mapped to CSS `transform: rotate(Ndeg)`.

#### 4. Auto-Layout / Flex Section (Groups, Text Containers, Cards)
* **Display Mode**: `Flex` / `Grid` / `Absolute`.
* **Direction**: Toggle `[ Row | Column ]`.
* **Gap**: Gap between child items in pixels.
* **Padding**: Uniform padding (or 4-sided expansion: Top, Right, Bottom, Left).
* **Align Items**: `Start`, `Center`, `End`, `Stretch`.
* **Justify Content**: `Start`, `Center`, `End`, `Space-Between`.
* **Auto-Fit Reactive Box (FLIP)**: Toggle switch enabling smooth background morphing as chunks animate in.

#### 5. Typography Section (Text Elements & Chunks)
* **Font Family**: Google Fonts / System Fonts dropdown (`Inter`, `Geist`, `Roboto`, `Playfair Display`, `Fira Code`, etc.).
* **Font Weight**: Dropdown from `100 (Thin)` to `900 (Black)`.
* **Font Size**: Numeric input in pixels (`fontSize`).
* **Line Height**: Numeric multiplier (`lineHeight`, e.g. `1.2` or `1.5`).
* **Letter Spacing**: Numeric input (`letterSpacing`, e.g. `-0.02em` or `2px`).
* **Text Align**: Segmented control `[ Left | Center | Right | Justify ]`.
* **Text Transform**: `[ UPPERCASE | lowercase | Capitalize ]`.

#### 6. Style & Appearance (Progressive Disclosure)
* **Opacity**: Percentage input (`100%`) with quick-drag slider and visibility toggle.
* **Corner Radius**: Numeric input (`0px`) with 4-corner expander icon (`⛶`) to set individual corners: Top-Left, Top-Right, Bottom-Right, Bottom-Left (CSS `border-radius`).
* **Fill**:
  * Checkbox toggle to enable/disable.
  * When checked: Color preview swatch, Hex input (`#FFFFFF`), Opacity percentage, Color Picker popover supporting **Solid Hex**, **Linear Gradient**, **Radial Gradient**, and **Image Pattern**.
* **Stroke**:
  * Checkbox toggle.
  * When checked: Color picker, Stroke Width (`px`), Style (`Solid`, `Dashed`, `Dotted`), and Alignment (`Inside`, `Center`, `Outside`).
* **Shadow**:
  * Checkbox toggle.
  * When checked: Multi-layer CSS `box-shadow` manager (`+ Add Shadow`).
  * Parameters: X offset, Y offset, Blur radius, Spread radius, Color, Mode (`Drop Shadow` or `Inner Shadow`).
* **Layer Blur**:
  * Checkbox toggle.
  * Blur radius in pixels (CSS `filter: blur(Npx)`).
* **Background Blur (Glassmorphism)**:
  * Checkbox toggle.
  * Blur radius in pixels (CSS `backdrop-filter: blur(Npx)`).

#### 7. Advanced CSS & Tailwind Drawer (Collapsible)
* Expands an accordion at the bottom of the inspector:
  * **Tailwind Class Input**: Text input to add arbitrary Tailwind utility classes (e.g. `ring-2 ring-indigo-500 hover:scale-105 transition-all`).
  * **Custom CSS Editor**: Clean mini-code field for raw CSS key-value pairs (e.g. `mix-blend-mode: multiply; clip-path: polygon(...)`).

---

## 2. Animate Mode Inspector

Width: `320px`, `bg-zinc-950 border-l border-zinc-800 flex flex-col overflow-y-auto`.

### A. Top Navigation Tabs (Matching Screenshots 1 & 2)

```
┌──────────────────────────────────────────────┐
│ [ PRESETS ]    │    CUSTOM    │   EFFECTS    │
└────────────────┴──────────────┴──────────────┘
```

Three full-width segmented tab triggers:
1. `[ PRESETS ]`: Curated motion recipes (Fade, Scale, Mask, 3D, Bounce).
2. `[ CUSTOM ]`: Granular property-level animators (Transform, Style, Effects, Other).
3. `[ EFFECTS ]`: Advanced procedural and shader effects.

---

### B. Tab 1: PRESETS (Directly Matching Screenshot 1)

Categorized 2-column card grid with live preview animation on hover:

```
┌──────────────────────────────────────────────┐
│ Fade                                         │
│   ┌────────────────────┬────────────────────┐│
│   │                    │                    ││
│   │      Fade          │       Slide        ││
│   └────────────────────┴────────────────────┘│
│ Scale                                        │
│   ┌────────────────────┬────────────────────┐│
│   │                    │                    ││
│   │      Grow          │       Shrink       ││
│   ├────────────────────┼────────────────────┤│
│   │                    │                    ││
│   │      Spin          │       Twist        ││
│   ├────────────────────┼────────────────────┤│
│   │                    │                    ││
│   │   Move & Scale     │       Pop          ││
│   └────────────────────┴────────────────────┘│
│ Mask & Reveal                                │
│   ┌────────────────────┬────────────────────┐│
│   │    Mask Wipe       │   Circle Reveal    ││
│   └────────────────────┴────────────────────┘│
│ 3D Motion                                    │
│   ┌────────────────────┬────────────────────┐│
│   │    3D Flip X       │     Drop In        ││
│   └────────────────────┴────────────────────┘│
└──────────────────────────────────────────────┘
```

* **Clicking any preset card**: Immediately adds or updates the active animation block on the selected element's timeline track, and opens the **Active Animation Card**.

---

### C. Tab 2: CUSTOM (Directly Matching Screenshot 2)

Allows picking individual CSS properties to keyframe or animate independently:

```
┌──────────────────────────────────────────────┐
│ Transform                                    │
│   ↗ Scale                                    │
│   ↺ Rotate                                   │
│   ✥ Move                                     │
├──────────────────────────────────────────────┤
│ Style                                        │
│   ░ Opacity                                  │
│   🎨 Color                                    │
│   ◱ Shadow                                   │
├──────────────────────────────────────────────┤
│ Effects                                      │
│   ▦ Layer Blur                               │
│   🪞 Background Blur                         │
│   🫧 Glass                                    │
├──────────────────────────────────────────────┤
│ Other                                        │
│   👁 Hide / Show                             │
│   ↔ Resize                                   │
│   ⬡ Morph (Border Radius / SVG)              │
│   ⌜ Corner Radius                            │
└──────────────────────────────────────────────┘
```

* **Clicking any property**: Creates a custom property action block on the element's timeline track and opens property-specific keyframe inputs.

---

### D. Tab 3: EFFECTS

Complex, multi-pass motion and text shader effects:
* **Text Scramble / Typewriter**: Chunks animate character-by-character with random glyph decoding.
* **Neon Pulse / Glow**: Pulsing CSS filter shadow loop.
* **Glitch**: Chromatic aberration RGB split animation.
* **Wave / Float**: Continuous subtle floating sinusoidal motion.

---

### E. Active Animation Card (Directly Matching Screenshot 3)

When an animation is active on an element or selected on the timeline, this card is displayed prominently at the top of the Animate Inspector:

```
┌──────────────────────────────────────────────┐
│ ⚡ Grow                          [Change] […]│
├──────────────────────────────────────────────┤
│ Mode               [   In   |   Out   ]      │
├──────────────────────────────────────────────┤
│ Initial scale      [ 50%       ]             │
│ Fade               [ ✓ ]                     │
├──────────────────────────────────────────────┤
│ Animation                               […] │
│   Duration         [ 0.8s      ]             │
│   Delay            [ 0.0s      ]             │
│   Easing           [ Slow down       ▾ ] ⫹⫺  │
├──────────────────────────────────────────────┤
│ Cascade Stagger    [ 0.15s     ] (Groups)    │
└──────────────────────────────────────────────┘
```

#### Detailed Breakdown of Active Card Controls:
1. **Header**:
   - Animation type icon (e.g. `⚡` Grow, `↗` Slide, `░` Fade).
   - Animation Name (`Grow`).
   - `[Change]` button: Re-opens the Presets grid to swap the animation recipe with 1 click while preserving durations.
   - More Options (`[...]`): Invert animation, Copy animation recipe, Reset parameters, Delete animation.
2. **Mode Segmented Toggle**:
   - `[ In | Out ]` (plus optional `Emphasis / Loop` badge).
   - Toggles whether the preset animates into the resting state or exits from it.
3. **Dynamic Parameters (Preset-Specific)**:
   - For `Grow` / `Scale`: Initial scale percentage (`50%`), Fade toggle (`[✓]`).
   - For `Slide`: Direction toggle `[ ↑ | ↓ | ← | → ]`, Travel distance (`80px`), Fade toggle (`[✓]`).
   - For `Blur In`: Initial blur radius (`20px`), Fade toggle (`[✓]`).
   - For `Pop`: Overshoot amount (`120%`), Bounce tension.
   - For `3D Flip`: Axis `[ X | Y ]`, Perspective (`600px`), Initial angle (`90°`).
4. **Animation Section**:
   - **Duration**: Numeric input with time units (`0.8s`).
   - **Delay**: Start offset relative to track block (`0.0s`).
   - **Easing Selector**:
     - Dropdown with presets: `Slow down` (Cubic ease-out), `Bouncy / Elastic`, `Overshoot`, `Snappy`, `Linear`.
     - Curve Editor Icon Button (`⫹⫺`): Opens an interactive cubic-bezier curve editor modal/popover allowing visual dragging of control handles ($P_1, P_2$).
5. **Cascade Stagger (for Groups & Split Chunks)**:
   - Slider controlling the time gap between consecutive children (`0.05s` to `0.5s`, default `0.15s`).
   - Reverses or scrambles stagger order (`Normal`, `Reverse`, `Center-Out`, `Random`).
