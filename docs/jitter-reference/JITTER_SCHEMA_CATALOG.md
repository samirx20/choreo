# Jitter Schema & Animation Catalog (Exhaustive Reverse-Engineered Reference)
> **Source:** Extracted directly from Jitter's client engine bundle (`stores-CsiJx7xb.js`) and live IndexedDB leveldb storage (`https_jitter.video_0`).  
> **Date:** September 20, 2026

---

## 1. Core Data Model Architecture

Jitter structures every project into a clean, decoupled **Scene Graph**:

```
[Project]
  └─► nodes: Array<Node>
        ├─► [Artboard: Scene 1]
        │     ├─► [layersTree]      <── Hierarchy of visual elements
        │     │     ├─► rect (Rectangle 1)
        │     │     ├─► text (Text 1)
        │     │     ├─► ellipse (Ellipse 1)
        │     │     ├─► star (Star 1)
        │     │     ├─► image
        │     │     └─► maskGrp / layerGrp
        │     │
        │     └─► [operationsTree]  <── Timeline Animation Actions
        │           ├─► growIn (target: Rectangle 1, start: 0, end: 1000)
        │           ├─► slideIn (target: Text 1, start: 200, end: 1200)
        │           └─► counter (target: Text 1, startValue: 0, endValue: 100)
        │
        └─► [Artboard: Scene 2]
```

---

## 2. The 16 Element / Layer Types

| Layer Type | Purpose & Unique Properties |
| :--- | :--- |
| `artboard` | The scene canvas. Properties: `name`, `x`, `y`, `width`, `height`, `angle`, `scale`, `opacity`, `background` (boolean), `fillColor`, `shadowEnabled` (boolean), `duration` (ms). |
| `rect` | Rounded rectangle / card. Properties: `width`, `height`, `cornerRadius`, `background`, `fillColor`, `strokeEnabled`, `shadowEnabled`. |
| `text` | Typographic layer. Properties: `text`, `font: { type: "googlefont", name, weight }`, `fontSize`, `lineHeight`, `letterSpacing`, `textAlign`, `verticalAlign`, `justifyContent`, `autoResize` (`width_and_height`), `case` (`normal`), `ligatures`, `kerning`, `strokeColor`, `strokePosition` (`centered`), `strokeWeight`, `strokeCap`, `strokeJoin`. |
| `ellipse` | Circle, oval, or pie slice. Properties: `startAngle`, `sweep` (0..360), `ratio` (inner hole ratio for donuts), `fillColor`, `strokeEnabled`. |
| `star` | Polygonal star. Properties: `spikes` (number of points), `radiusRatio` (inner-to-outer ratio), `fillColor`, `strokeEnabled`. |
| `image` | Raster image asset. Properties: `url`, `mediaName`, `width`, `height`, `cornerRadius`, `strokeEnabled`, `shadowEnabled`. |
| `video` | Video asset layer. Properties: `url`, `mediaName`, `playVideo`, volume, trim in/out. |
| `gif` | Animated GIF layer with loop controls. |
| `svg` / `shape` | Vector path shape. |
| `textImg` | Pre-rendered or bitmap font text container. |
| `instance` | Reusable component instance. |
| `resolvedInstance` | Expanded component instance with local overrides. |
| `maskGrp` | Masking group (the bottom/top layer clips the sibling layers). |
| `layerGrp` | Standard grouping container for nesting. |
| `multiLayerSelection` | Transient multi-selection bounding box. |
| `layersTree` | Internal tree node managing z-index and parenting. |

---

## 3. The 26 Elementary Custom Animation Actions

In Jitter, **all animations are built from these 26 elementary building blocks**:

### Spatial & Transform Actions
1. `move`: Interpolates `x` and `y` coordinates.
2. `resize`: Interpolates `width` and `height`.
3. `scale`: Uniform or 2D scaling factor.
4. `rotate`: 2D angular rotation (`angle`).
5. `show` / `hide`: Discrete visibility switch.

### Appearance & Style Actions
6. `opacity`: Fade opacity (0.0 to 1.0).
7. `color`: Fill color transition (hex/rgba).
8. `stroke`: Stroke color, weight, and dash offset.
9. `cornerRadius`: Smooth corner radius morph.
10. `shadow`: Drop shadow blur, offset, and color.
11. `blurRadius`: Layer blur (px).
12. `backgroundBlur`: Glassmorphism backdrop blur (px).

### Shape-Specific Actions
13. `ellipseA`: Animates `startAngle`, `sweep` (pie slice / circular progress), and `ratio` (donut hole).
14. `starA`: Animates `spikes` count and `radiusRatio`.
15. `morph`: Path vector morphing between two vector outlines.

### Advanced & Shader Actions
16. `displacement`: GPU displacement map distortion.
17. `bulge`: Spherical optical pinch / bulge distortion.
18. `glass`: Dynamic refraction and specular sheen.
19. `customShader`: Raw WebGL shader pass.

### Content & Media Actions
20. `counter`: Animated number roll with prefix, suffix, and decimal formatting.
21. `changeText`: Text content replacement / typewriter interpolation.
22. `lineHeight`: Typographic leading animation.
23. `letterSpacing`: Typographic tracking animation.
24. `playVideo`: Video playback trigger and scrubbing.
25. `playAudio`: Audio playback trigger and volume fade.
26. `playInstance`: Triggers nested component animations.

---

## 4. The 32 Built-In Presets (In & Out)

Jitter pairs each `In` preset with an inverse `Out` preset. Every preset is a pre-packaged recipe of the 26 elementary actions:

| In Preset | Out Preset | Under-the-Hood Composition |
| :--- | :--- | :--- |
| `fadeIn` | `fadeOut` | `opacity: 0 -> 1` |
| `slideIn` | `slideOut` | `move(dx, dy) + opacity` |
| `growIn` | `growOut` | `scale(0 -> 1) + opacity` (with `noFade` option) |
| `shrinkIn` | `shrinkOut` | `scale(1.5 -> 1) + opacity` |
| `spinIn` | `spinOut` | `rotate(angle) + opacity` |
| `twistIn` | `twistOut` | `rotate + scale + opacity` |
| `moveThenScaleIn` | `moveThenScaleOut` | Chained `move` followed by `scale` |
| `blurIn` | `blurOut` | `blurRadius(20 -> 0) + opacity` |
| `blurScaleIn` | `blurScaleOut` | `blurRadius + scale + opacity` |
| `blurSlideIn` | `blurSlideOut` | `blurRadius + move + opacity` |
| `textIn` | `textOut` | Staggered character/word `move + opacity` with font clipping |
| `maskRevealIn` | `maskRevealOut` | Mask clipping plane translation (directional wipe) |
| `maskResizeIn` | `maskResizeOut` | Mask bounds expansion |
| `maskSizeIn` | `maskSizeOut` | Mask uniform scale expansion |
| `maskCenterIn` | `maskCenterOut` | Radial iris / circle reveal from center |
| `maskSlideIn` | `maskSlideOut` | Linear sliding mask window |

---

## 5. Checkbox-Based Single Property Pattern (Jitter vs. Figma)

Unlike Figma, where users click `+` to stack multiple fills, strokes, and shadows, Jitter enforces **single, toggleable properties**:

```typescript
interface JitterLayerStyle {
  // Checkbox: Fill
  background: boolean;
  fillColor: string; // single hex/rgba or gradient
  
  // Checkbox: Stroke
  strokeEnabled: boolean;
  strokeColor: string;
  strokeWeight: number;
  strokePosition: "inside" | "center" | "outside";
  strokeCap: "butt" | "round" | "square";
  strokeJoin: "miter" | "round" | "bevel";
  
  // Checkbox: Shadow
  shadowEnabled: boolean;
  shadowColor: string;
  shadowX: number;
  shadowY: number;
  shadowBlur: number;
  
  // Checkbox: Blur
  blurEnabled: boolean;
  blurRadius: number;
  backgroundBlur: boolean;
  backgroundBlurRadius: number;
}
```

This single-property checkbox model is dramatically simpler and cleaner for an AI agent to reason about than Figma's multi-layered property stacks.
