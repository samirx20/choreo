# Motion-First Design Primitives Catalog

> **Status:** Approved Architectural Standard  
> **Last Updated:** September 20, 2026  
> **Governing Standard:** Impeccable Craft Floor (`reference/craft-floor.md`) & `AGENTS.md`

---

## 1. Executive Philosophy: Motion-First vs. Static UI

In static UI tools (Figma) and basic keyframe animators (Jitter), layout is computed as a single static snapshot. When elements animate (typing text, rolling numbers, expanding viewports), designers are forced to manually keyframe surrounding containers and related elements frame-by-frame.

In **Motion Studio**, **time is a first-class physical dimension**. Primitives are **reactive by construction**:
1. **Design at Rest**: The designer or AI agent authors the composition at its final resting state.
2. **Deterministic $O(1)$ Evaluation**: Every element's position, scale, and deformation evaluates as a pure function of time: $\text{State}(t) = f(\text{Storyboard}, t)$.
3. **One Authored Moment**: Each beat focuses on one primary movement, avoiding scattered visual noise.
4. **Impeccable Craft Floor**: Absolute ban on SaaS cliches (no eyebrows/kickers, no floating pill badges, no hacker scramble text, no decorative 3D grid floors, no gradient text, no ghost cards).

---

## 2. Element-by-Element Primitives

### 2.1 Media & Screens (The Product in Action)

* **Kinetic Viewport Scroll (`scroll_track`)**:
  * *Purpose*: Replaces static cropped screenshots with natural, inertia-driven viewport navigation.
  * *Schema*:
    ```ts
    {
      scrollTrack: {
        waypoints: [
          { offsetY: 0, hold: 1.0 },
          { offsetY: 640, hold: 2.0, springProfile: 'smooth' },
          { offsetY: 1420, hold: 1.5, springProfile: 'snappy' }
        ]
      }
    }
    ```
  * *Behavior*: The internal frame scrolls smoothly through the content with physical deceleration and subtle boundary bounce at waypoint arrivals.

* **Focal-Locked Media Scaling (`focalPoint: [x, y]`)**:
  * *Purpose*: Prevents the focal subject from drifting out of frame when expanding or changing aspect ratios.
  * *Behavior*: Scaling math uses the normalized focal vector (e.g. `[0.5, 0.2]`) as the transform origin, seamlessly transitioning between `contain` and `cover`.

* **Playhead-Synced Video Scrubbing (`playhead: 'beat-synced'`)**:
  * *Purpose*: Synchronizes screen recordings to the storyboard clock.
  * *Behavior*: Video frames map deterministically to the timeline: pause on frame 60 during Beat 1, play at `1.0x` during Beat 2, reverse during Beat 3.

---

### 2.2 3D Devices & Hardware (Physical Materials)

* **Dynamic Specular Light Sweep (`specularSweep`)**:
  * *Purpose*: Highlights physical hardware quality (titanium chamfers, camera glass, display bezels) during turns.
  * *Behavior*: A directional virtual light sweeps across the 3D model’s PBR materials during rotation transitions, generating realistic specular glints without manual texture animation.

* **Screen-to-World Elevation (`zElevate`)**:
  * *Purpose*: Pops a real UI layer out of the device screen into 3D world space.
  * *Behavior*: The layer decouples from the screen's FBO texture and translates forward along the screen normal vector in $Z$-space, accompanied by true optical depth-of-field blur.

* **Chassis Separation (`explode`)**:
  * *Purpose*: Exploded hardware view revealing internal engineering.
  * *Behavior*: Display, glass, battery, and chassis separate along the normal axis with spring momentum:
    $$Z_i(t) = Z_{\text{rest}, i} + \Delta Z_i \cdot \text{SpringProgress}(t)$$

* **Telephoto Follow-Cam (`camera.tracking`)**:
  * *Purpose*: Automatically tracks the device's screen normal vector with damped quaternion spherical interpolation (`slerp`), eliminating manual camera counter-rotation math.

---

### 2.3 Real Data & Numbers (Honest Metrics)

* **Mechanical Odometer Roll (`counterMode: 'odometer'`)**:
  * *Purpose*: Elevates number animations from cheap stopwatch counting to tactile, mechanical tumbler wheels.
  * *Behavior*: Each digit column (0–9) rolls vertically on its own drum with staggered deceleration:
    * Higher place values stop first; the lowest digit has the most momentum.
    * Eliminates character flicker and layout jitter.

* **Format-Preserving Interpolation (`format: '$#,##0'`)**:
  * *Purpose*: Keeps commas, decimals, and currency symbols rock-solid during numerical interpolation without layout drift.

* **Path-Tracing Line Charts (`drawProgress: 0 -> 1`)**:
  * *Purpose*: For real data curves, draws the path with spring acceleration. Data points pop in as the leading tip of the line crosses their $X$-coordinate.
  * *Craft Rule*: Strictly prohibited from standing in as fake decoration or uncalibrated sparklines.

---

### 2.4 Surfaces & Layouts (Single Elevation, Pure Geometry)

* **Reactive Container Hugging (`mode: 'hug'`)**:
  * *Purpose*: Allows background containers to dynamically expand as content types out or rolls, without manual keyframing.
  * *Math*:
    $$\text{Width}(t) = \text{SpringFilter}\Big(W_{\text{content}}(t) + 2 \times \text{padding}\Big)$$
    Driven by a 2nd-order harmonic oscillator ($\zeta = 0.72, \omega_0 = 20\text{ rad/s}$) anchored to an invariant origin (`top-left`, `center`).

* **Z-Coupled Elevation Shadows (`elevation: 0 -> 3`)**:
  * *Purpose*: Physically accurate depth without arbitrary multi-property shadow stacks.
  * *Behavior*:
    * Tight contact shadow: fades out as elevation increases.
    * Ambient elevation shadow: expands in blur ($4\text{px} \to 48\text{px}$), decreases in opacity, and shifts downward away from the virtual light source.
  * *Craft Rule*: Single elevation system. Never combine a 1px border with a soft shadow ("ghost card"). Choose clean border OR physical shadow.

* **Bento Grid Reflow (`bento.expand`)**:
  * *Purpose*: Expanding one card causes neighboring cards to glide into their new grid slots using continuous spring physics, eliminating manual $(x, y)$ keyframing.

* **G2 Continuous Curvature Squircles (`curvature: 'G2'`)**:
  * *Purpose*: Uses Lamé superellipses ($n \approx 4.5$) or quintic Bézier clothoids to eliminate the optical "pinch" and shadow pooling of standard circular CSS `border-radius`.

---

### 2.5 Simulated User Interactions (Natural Ballistics)

* **Target-Snapped Cursor Navigation (`cursorTo: 'target_id'`)**:
  * *Purpose*: Eliminates manual keyframing of $(x, y)$ cursor coordinates.
  * *Behavior*: The cursor computes a curved ballistic trajectory with natural inertia to the target's center. If the target moves or scales, the cursor automatically tracks it.

* **Choreographed Interaction Sequence (`cursorAction: 'click'`)**:
  * *Purpose*: Simulates a physical click with one declaration.
  * *Behavior*: Cursor scales down ($0.85\times$), the target button depresses with spring return. No floating cursor tags, no cartoonish tap halos.

---

### 2.6 Connectors & Flow Architecture (Real Systems)

* **Orthogonal Collision-Free Routing (`route: 'orthogonal'`)**:
  * *Purpose*: For real architecture or workflow diagrams, automatically routes lines around intervening cards with rounded $90^\circ$ elbows.
  * *Behavior*: Sockets dynamically flip (`left`, `right`, `top`, `bottom`) as cards move across quadrants.

* **Data Packet Flow (`packetFlow: true`)**:
  * *Purpose*: Shows data streaming between connected nodes with animated light pulses along the path vector.

---

### 2.7 Typography (Authoritative & Metric-Aligned)

* **Metric-Aligned Baseline Mask Reveals**:
  * *Purpose*: Text emerges from behind the baseline with snappy spring physics.
  * *Formula*:
    $$\text{ClipHeight} = \text{ascent} + |\text{descent}| + 2 L_{\text{half}}$$
    Ensures descenders (`"g"`, `"y"`, `"p"`, `"q"`, `"j"`) are **never chopped off**.

* **0.0px Visual Shift Invariant Splitting (`split_text_layer`)**:
  * *Purpose*: Splitting a paragraph into words or sentences for staggered reveals produces zero visual drift ($< 0.01\text{px}$) compared to the unsplit text.
  * *Rules*:
    * Uses canvas `measureText` space character (`U+0020`) advance width, never hardcoded percentages.
    * Punctuation marks (`, . ! ? : ;`) remain permanently bound to the preceding word chunk, preventing orphan punctuation.

* **Word Replacement / Morphing with Spring Reflow**:
  * *Purpose*: Rotating keywords within a sentence (`"The [Fastest / Most Powerful] platform"`).
  * *Behavior*: Word 1 exits, Word 2 enters, and the trailing suffix smoothly glides horizontally using the same analytical spring physics ($C^1$ velocity hand-off) without layout snapping.

* **Variable Font Weight Dynamics (`fontWeight: 200 -> 800`)**:
  * *Purpose*: Emphasis through weight and scale, strictly avoiding gradient text.

---

## 3. Banned Anti-Patterns Summary (The Craft Floor)

| Anti-Pattern | Why It Is Banned | The Approved Motion Studio Alternative |
| :--- | :--- | :--- |
| **Eyebrows / Kickers / Category Badges** | Cheap SaaS cliche; dilutes headline authority. | Headings carry their own weight. Delete the label and let the heading speak. |
| **Monospace / Scramble Decrypt** | Costume, not content; visually noisy gimmick. | Metric-aligned baseline reveals or clean word-by-word stagger. |
| **3D Grid Floors / Cyber Lines** | Generic sci-fi wallpaper; violates surface truth. | Backgrounds are surfaces textured only from the subject's world (or clean deep dark). |
| **Fake Sparklines / Empty Rings** | Decorative deception. | Real data charts with `drawProgress` or honest odometer metrics. |
| **Gradient Text** | Low-contrast visual noise. | Optical weight scaling (`fontWeight: 200 -> 800`) or size contrast. |
| **Ghost Cards (Border + Shadow)** | Unclear elevation hierarchy. | Choose clean border OR physical shadow. Never both. |
| **Competing Multi-Element Entrances** | Visual clutter and cognitive overload. | **One authored moment per beat**. |
