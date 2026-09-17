## 1. Design Mode Inspector (Direct Jitter Reference)

Width: `280px` – `300px`, `bg-[#1c1c1e] text-zinc-200 border-l border-[#2c2c2e] flex flex-col overflow-y-auto select-none text-xs`.
Design philosophy: **Minimal in layout, rich in capability**. No bloated cards, no nested wrappers, no redundant textareas. Compact dark pill inputs with integrated prefix icons and clear sub-labels placed directly above input pairs.

### A. Reference Visual Structure

```
┌────────────────────────────────────────────────────────┐
│ Rectangle                    [⬚]  [◑]  [❏ ▾]  [⛶]      │ (Header: Name & Quick Actions)
├────────────────────────────────────────────────────────┤
│ Position                                               │
│   Alignment                                            │
│   [ |← ] [ ╪ ] [ →| ]  [ ₸ ] [ ╫ ] [ ╨ ]               │ (6-icon alignment bar)
│   Position                                             │
│   [ X  -102        ]    [ Y  -168        ]             │ (X, Y pill inputs)
│   Rotation                                             │
│   [ ∠  0°          ]    [ ↻ ] [ ▷|◁ ] [ ▵/▿ ]          │ (Angle + 90° + Flip H/V)
├────────────────────────────────────────────────────────┤
│ Layout                                                 │
│   Dimensions                                           │
│   [ W  185         ]    [ H  154         ]  [ ⧉ ]      │ (Width, Height, Aspect Lock)
├────────────────────────────────────────────────────────┤
│ Appearance                               [ 👁 ] [ 💧 ]  │ (Visibility & Blend mode)
│   Opacity               Corner radius                  │
│   [ ▦  100%        ]    [ ⌜⌟  17         ]  [ ⛶ ]      │ (Opacity & Radius + 4-corners)
├────────────────────────────────────────────────────────┤
│ Fill                                     [ ⬚ ] [ + ]   │ (Color styles & Add Fill)
│   [■] [ E64E4E     ]    [ 100 % ]   [ 👁 ]   [ — ]      │ (Swatch, Hex, %, Eye, Delete)
├────────────────────────────────────────────────────────┤
│ Stroke                                   [ ⬚ ] [ + ]   │ (Stroke styles & Add Stroke)
│   [■] [ 000000     ]    [ 100 % ]   [ 👁 ]   [ — ]      │
│   Position              Weight                         │
│   [ Inside       ▾ ]    [ ≡  1           ]  [ ⧉ ]      │ (Inside/Center/Outside, Weight)
├────────────────────────────────────────────────────────┤
│ Effects                                        [ + ]   │ (Add Effect Menu)
│   ┌──────────────────────────────────────────────────┐ │
│   │ [☐] Inner shadow                                 │ │
│   │ [☐] Drop shadow                                  │ │
│   │ [▦] Layer blur                                   │ │
│   │ [▦] Background blur                              │ │
│   │ [▦] Noise                                        │ │
│   │ [▦] Texture                                      │ │
│   │ [⭘] Glass                                        │ │
│   │ [≈] Shader [Beta]                                │ │
│   └──────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────┤
│ Export                                         [ + ]   │
└────────────────────────────────────────────────────────┘
```

### B. Detailed Field & Interaction Specifications

#### 1. Header Row
* **Layer Name**: Inline editable text (`Rectangle`, `Text Layer`, `Group`).
* **Header Action Icons**:
  * `⬚` (Component / Shared Style Library)
  * `◑` (Invert Colors / Dark-Light Switch)
  * `❏▾` (Duplicate / Options Dropdown)
  * `⛶` (Frame Bounds / Focus on Canvas)

#### 2. Position Section
* **Alignment Bar**: 6 icon buttons with 1-click snap:
  * Left (`|←`), Horizontal Center (`╪`), Right (`→|`)
  * Top (`₸`), Vertical Center (`╫`), Bottom (`╨`)
* **Position Inputs**:
  * Sub-label `Position` above.
  * Side-by-side pill inputs: `X` and `Y` with subtle gray prefix and dark background. Scrubbable on drag.
* **Rotation & Flip**:
  * Sub-label `Rotation` above.
  * Left input: Angle `∠ 0°`.
  * Right button group: Rotate 90° clockwise (`↻`), Flip Horizontal (`▷|◁`), Flip Vertical (`▵/▿`).

#### 3. Layout Section
* **Dimensions**:
  * Sub-label `Dimensions` above.
  * `W` (Width) and `H` (Height) numeric pill inputs.
  * Aspect Ratio toggle icon button (`⧉`): Locks/unlocks aspect ratio during manual input and canvas handle resize.
  * **Text Layer Behavior**: `H` displays `auto` with dynamic height reflow; typing or editing width keeps height dynamic.

#### 4. Appearance Section
* **Header Controls**: Eye visibility toggle (`👁`) and Blend Mode / Fill Style (`💧`).
* **Two-Column Inputs**:
  * **Opacity**: Sub-label `Opacity` above, input `▦ 100%`.
  * **Corner Radius**: Sub-label `Corner radius` above, input `⌜⌟ 17`.
  * **Independent Corners (`⛶`)**: Clicking expands into 4 individual corner inputs (Top-Left, Top-Right, Bottom-Right, Bottom-Left).

#### 5. Fill Section
* **Header Controls**: Shared Style Library (`⬚`) and Add Fill (`+`).
* **Fill Item Row**:
  * Color preview square swatch (clicking opens color picker popover with Hex, RGB, HSL, Linear Gradient, Radial Gradient).
  * Hex string input (`E64E4E`).
  * Opacity percentage (`100 %`).
  * Visibility toggle (`👁`).
  * Remove fill row (`—`).

#### 6. Stroke Section
* **Header Controls**: Shared Style Library (`⬚`) and Add Stroke (`+`).
* **Stroke Color Row**: Swatch, Hex (`000000`), Opacity (`100%`), Eye toggle, Remove (`—`).
* **Stroke Settings Row**:
  * **Position**: Dropdown `[ Inside | Center | Outside ]`.
  * **Weight**: Sub-label `Weight` above, input `≡ 1` (scrubbable).
  * **Stroke Cap & Dash (`⧉`)**: Opens popover for solid vs. dashed line styling and dash gap intervals.

#### 7. Effects Section (Modular Post-Processing)
* Clicking `+` reveals the dedicated Jitter effect roster:
  1. **Inner shadow**: Inset elevation with X, Y, blur, and spread.
  2. **Drop shadow**: Elevated depth with X, Y, blur, spread, and color.
  3. **Layer blur**: Full element Gaussian blur (CSS `filter: blur()`).
  4. **Background blur**: Frosted glass backdrop blur (CSS `backdrop-filter: blur()`).
  5. **Noise**: Procedural SVG noise / grain overlay with adjustable opacity.
  6. **Texture**: Subtle canvas texture overlay.
  7. **Glass**: Pre-configured frosted glass recipe combining background blur, subtle white border, and translucency.
  8. **Shader (Beta)**: GPU pixel shader / kinetic distort effects.

#### 8. Export Section
* Quick export preset configuration (`PNG`, `SVG`, `MP4`, `GIF`, `ProRes`) with resolution scale multipliers (`1x`, `2x`, `4x`).

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
