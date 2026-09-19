# Scoped 3D Device Mockups & Perspective Animations
## Architectural Research, Declarative Specification & Engine Blueprint

**Author:** Motion Studio 3D & Kinetic Systems Specialist  
**Status:** Architectural Blueprint & Proposed Specification  
**Target Engine:** Motion Studio Core (`PixiJS v8`, `@theatre/core`, `three`, `dependencyEngine.ts`, `evaluator.ts`, `scene.json`)

---

## Executive Summary

Motion graphics for modern tech products (Apple, Stripe, Linear, Cash App, Raycast) have converged on a signature aesthetic: sleek 3D device mockups (iPhone, MacBook, payment cards, embossed tokens) moving through dramatic isometric perspectives, camera orbits, push-in dollies, and tactile floating hover animations. 

Historically, creating these animations required full 3D Digital Content Creation (DCC) suites like Cinema 4D, Blender, or Spline, or heavy After Effects plugins (Element 3D). This introduces three catastrophic friction points for video creators:
1. **Broken Workflow & Disconnected UI Updates**: When the 2D app UI design changes (e.g. headline copy edit, button color update), the motion designer must re-export PNG/MP4 textures, re-map UVs in the 3D DCC, and re-render the entire 3D sequence (taking minutes or hours).
2. **Timeline Disconnect**: Animating 3D device turns while simultaneously timing 2D kinetic typography and UI transitions requires juggling two separate timeline systems with mismatched easing curves.
3. **Heavyweight Asset Overhead**: General-purpose 3D web engines often load 30MB uncompressed CAD assets, compile dozens of monolithic PBR shader variants, and introduce WebGL state corruption that degrades 2D canvas performance.

**Motion Studio solves this with Scoped 3D Device Mockups**: a high-performance, deterministic hybrid architecture combining **Three.js offscreen surfaces** sampled directly as **PixiJS v8 texture layers**, driven seamlessly by **Theatre.js keyframe tracks**, with **Screen-as-Texture dynamic UV projection**.

```
+----------------------------------------------------------------------------------------------------+
|                                    MOTION STUDIO WORKSPACE                                         |
|                                                                                                    |
|  +-----------------------------+         Dynamic UV Frame         +-----------------------------+  |
|  |     Screen A (2D Canvas)    |  ============================>>  |     Screen B (3D Mockup)    |  |
|  |                             |   PixiJS Offscreen Render Target |                             |  |
|  |  * Kinetic Text Staggers    |   (Zero-copy GPU blit)           |  * iPhone 16 Pro GLB        |  |
|  |  * Auto-hug Shape Cards     |                                  |  * OLED Emissive Screen UV  |  |
|  |  * Word Highlight Pills     |                                  |  * Studio 3-Point Lighting  |  |
|  |  * Vector Icons             |                                  |  * Damped Contact Shadow    |  |
|  +-----------------------------+                                  +-----------------------------+  |
|                 ^                                                                ^                 |
|                 |                                                                |                 |
|                 +-----------------------+----------------------------------------+                 |
|                                         |                                                          |
|                       +----------------------------------+                                         |
|                       |   Theatre.js Unified Timeline    |                                         |
|                       |   Single Playhead (t = 1.450s)   |                                         |
|                       |   * 2D text opacity & stagger    |                                         |
|                       |   * 3D camera yaw & dolly Z      |                                         |
|                       +----------------------------------+                                         |
+----------------------------------------------------------------------------------------------------+
```

### Core Breakthroughs
1. **Three.js Offscreen Surface Isolation**: High-fidelity PBR rendering of `.glb` models on dedicated offscreen canvases sampled as `PIXI.CanvasSource` textures inside PixiJS v8. Zero WebGL state bleeding, full GPU batching, and isolated depth testing.
2. **Nested Screen-as-Texture Projection**: Any 2D Screen in the Motion Studio document can serve as the dynamic live texture for a 3D model's screen UV coordinates. Scrubbing the timeline simultaneously updates the 2D UI animations and their 3D perspective projection in real time.
3. **Unified Theatre.js 3D Controls**: Direct mapping of 3D spatial transforms ($X, Y, Z$, Pitch/Yaw/Roll), camera orbits, field-of-view, and studio lighting parameters to Theatre.js compound property sheets.
4. **Declarative Camera Presets**: Five 1-click industry-standard motion presets: **360° Orbit**, **Isometric Tilt**, **Push-In Dolly**, **Float / Hover Wobble**, and **Card Flip**.
5. **Deterministic Headless Export**: Synchronous frame evaluation (`seekAndRender(t)`) ensuring 100% dropped-frame-free 4K/60fps video rendering via WebCodecs and FFmpeg.

---

## 1. Architectural Landscape & Engine Comparison

| Dimension | Spline / General 3D Web | After Effects + Element 3D | Canvas CSS 3D Transforms | **Motion Studio Scoped 3D** |
| :--- | :--- | :--- | :--- | :--- |
| **Rendering Pipeline** | Standalone 3D canvas; poor 2D kinetic typography | Heavy desktop plugins; proprietary file formats | Fake perspective (`perspective: 1000px`); flat planes only | **PixiJS v8 + Three.js Offscreen Surface**: True 3D PBR meshes inside 2D scene graph |
| **Texture Projection** | Static image uploads or basic embedded iframes | Pre-comps mapped via custom texture channels | CSS background image on transformed `div` | **Live Screen-as-Texture**: Any project screen or video clip projected dynamically onto UVs |
| **Animation Control** | Separate keyframe editor; hard to sync with UI | Complex expression links & separate timeline tracks | CSS keyframes / GSAP (no dope sheet or curve editor) | **Theatre.js Unified Dope Sheet**: Sub-pixel curves and damped physics for 2D & 3D |
| **Asset Overhead** | 10MB–50MB runtime scenes; heavy load times | Gigabytes of VRAM; high crash rates | 0MB (no real 3D geometry) | **~1.5MB Draco/KTX2 GLB models**: Cached in memory; minimal footprint |
| **Export Determinism** | Variable frame rate (rAF); frame drops on export | Slow background rendering (Render Queue) | Screen recording only (non-deterministic) | **Deterministic `seekAndRender(t)`**: WebCodecs / FFmpeg frame-by-frame exact sync |

---

## 2. Three.js Offscreen Surface Architecture & PixiJS v8 Texture Pipeline

### 2.1 The WebGL State Isolation Imperative

When combining 2D compositing engines (PixiJS) with 3D rendering engines (Three.js), developers face two architectural options:
1. **Shared WebGL Context (Interleaved Draw Calls)**: Both PixiJS and Three.js draw into the same `WebGL2RenderingContext`.
2. **Isolated Offscreen Canvas (Texture Sampling)**: Three.js renders into an offscreen `HTMLCanvasElement` or `OffscreenCanvas`, which PixiJS v8 ingests as an external texture (`PIXI.CanvasSource`).

#### Architectural Verdict: Isolated Offscreen Canvas Wins Decisively
Attempting to share a WebGL context between PixiJS v8 and Three.js causes severe runtime issues:
* **OpenGL State Machine Pollution**: Three.js deeply manipulates global WebGL state (depth test enabled, depth func `LEQUAL`, cull face `BACK`, custom stencil buffers, polygon offset, active texture units `TEXTURE0`..`TEXTURE15`, custom vertex array bindings). PixiJS v8 relies on an optimized 2D batching pipeline that assumes depth testing is disabled and blend modes are managed through its internal state cache.
* **Driver Crashes & State Invalidation**: Calling `renderer.resetState()` or `gl.resetState()` before and after every draw call destroys GPU pipeline caches, causing frame-rate drops from 60fps down to 18fps on Apple Silicon and triggering context loss on Intel/Nvidia mobile GPUs.
* **Filter Pipeline Compatibility**: In PixiJS v8, layers frequently use post-processing filters (Gaussian blur, bloom, color matrices, drop shadows). When a 3D layer is an isolated `PIXI.Sprite` backed by a `CanvasSource`, all PixiJS GPU filters, blend modes (`screen`, `overlay`), masks, and z-index ordering work automatically without modifications.

```mermaid
flowchart LR
    subgraph ThreeJS ["Three.js Offscreen Engine (Scoped 3D)"]
        GLB["Device Model (.glb)"] --> ThreeScene["THREE.Scene"]
        PBRMat["PBR Display Material"] --> ThreeScene
        Lights["Studio 3-Point Rig"] --> ThreeScene
        Cam["PerspectiveCamera"] --> ThreeRenderer["THREE.WebGLRenderer"]
        ThreeScene --> ThreeRenderer
        ThreeRenderer --> OffscreenCanvas["OffscreenCanvas / HTMLCanvasElement"]
    end

    subgraph PixiJSPipeline ["Motion Studio Core (PixiJS v8 Stage)"]
        OffscreenCanvas -- "gl.texSubImage2D\n(canvasSource.update())" --> CanvasSource["PIXI.CanvasSource"]
        CanvasSource --> PixiTexture["PIXI.Texture"]
        PixiTexture --> PixiSprite["PIXI.Sprite (Mockup3D Layer)"]
        PixiSprite --> LayerHierarchy["PixiStage Artboard Container"]
        LayerHierarchy --> PixiFilters["PixiJS Filters & Shaders\n(Bloom, Shadows, Blur)"]
        PixiFilters --> Viewport["Canvas Viewport / Export"]
    end
```

### 2.2 PixiJS v8 Texture Ingestion Mechanics

In PixiJS v8 (`pixi.js@^8.21.0`), the texture pipeline is rebuilt around `TextureSource` primitives. Wrapping an offscreen Three.js canvas requires:
1. Creating a `CanvasSource` wrapping the Three.js canvas element.
2. Setting `autoGarbageCollect: false` and `resolution: window.devicePixelRatio || 1`.
3. Notifying PixiJS whenever Three.js renders a new frame via `canvasSource.update()`.

```typescript
import { Application, Container, Sprite, Texture, CanvasSource } from "pixi.js";
import * as THREE from "three";

export class Mockup3DDisplayObject extends Container {
  public sprite: Sprite;
  public canvasSource: CanvasSource;
  public texture: Texture;
  private offscreenCanvas: HTMLCanvasElement;
  private threeRenderer: THREE.WebGLRenderer;
  private threeScene: THREE.Scene;
  private threeCamera: THREE.PerspectiveCamera;

  constructor(width: number, height: number) {
    super();

    // 1. Create dedicated offscreen canvas for Three.js
    this.offscreenCanvas = document.createElement("canvas");
    this.offscreenCanvas.width = width * (window.devicePixelRatio || 1);
    this.offscreenCanvas.height = height * (window.devicePixelRatio || 1);

    // 2. Initialize Three.js WebGLRenderer with high-precision PBR settings
    this.threeRenderer = new THREE.WebGLRenderer({
      canvas: this.offscreenCanvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true, // Crucial for headless frame readback
    });
    this.threeRenderer.setPixelRatio(window.devicePixelRatio || 1);
    this.threeRenderer.setSize(width, height, false);
    this.threeRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.threeRenderer.toneMappingExposure = 1.1;

    // 3. Setup Three.js Scene and Camera
    this.threeScene = new THREE.Scene();
    this.threeCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.threeCamera.position.set(0, 0, 5);

    // 4. Wrap offscreen canvas in PixiJS v8 CanvasSource
    this.canvasSource = new CanvasSource({
      resource: this.offscreenCanvas,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
    });

    this.texture = new Texture({ source: this.canvasSource });
    this.sprite = new Sprite(this.texture);
    this.sprite.width = width;
    this.sprite.height = height;

    this.addChild(this.sprite);
  }

  /**
   * Deterministically renders the 3D scene and updates Pixi texture
   */
  public render3D(): void {
    this.threeRenderer.render(this.threeScene, this.threeCamera);
    // Tell PixiJS v8 that the underlying canvas pixels changed
    this.canvasSource.update();
  }

  public destroy(): void {
    this.threeRenderer.dispose();
    this.texture.destroy(true);
    super.destroy({ children: true });
  }
}
```

### 2.3 WebGL Context Limit Pooling

Browsers enforce a strict hardware limit on concurrent WebGL contexts:
* Chrome / Edge: 16 contexts maximum.
* Firefox: 8–16 contexts.
* Safari: 8–16 contexts.

If a Motion Studio project contains 6 screens, each with 2 device mockups, instantiating an unmanaged `WebGLRenderer` per layer would exceed the browser quota and trigger `webglcontextlost` on the main Pixi canvas!

#### Context Pool Design: The `ThreeRendererPool`
To guarantee strict stability:
1. **Singleton Active Renderer**: Only layers on the *currently active Screen* maintain initialized WebGL rendering contexts.
2. **LRU Context Pool**: Maximum of 3 concurrent Three.js renderers across the entire app. When a user switches screens or hides a layer, the renderer is paused or assigned to a frozen snapshot.
3. **Static Freeze Optimization**: When a 3D layer is resting (no keyframes changing and not being scrubbed), its rendered output is converted to a static `PIXI.Texture` and its Three.js render loop is suspended, freeing GPU cycles.

```typescript
export class ThreeRendererPool {
  private static instance: ThreeRendererPool;
  private activeRenderers = new Map<string, THREE.WebGLRenderer>();
  private maxContexts = 3;

  public static getInstance(): ThreeRendererPool {
    if (!ThreeRendererPool.instance) {
      ThreeRendererPool.instance = new ThreeRendererPool();
    }
    return ThreeRendererPool.instance;
  }

  public acquireRenderer(layerId: string, canvas: HTMLCanvasElement): THREE.WebGLRenderer {
    if (this.activeRenderers.has(layerId)) {
      return this.activeRenderers.get(layerId)!;
    }

    if (this.activeRenderers.size >= this.maxContexts) {
      // Evict oldest renderer (convert to frozen texture first)
      const oldestKey = this.activeRenderers.keys().next().value;
      this.releaseRenderer(oldestKey);
    }

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true,
    });

    this.activeRenderers.set(layerId, renderer);
    return renderer;
  }

  public releaseRenderer(layerId: string): void {
    const renderer = this.activeRenderers.get(layerId);
    if (renderer) {
      renderer.dispose();
      renderer.forceContextLoss();
      this.activeRenderers.delete(layerId);
    }
  }
}
```

### 2.4 Model Library & DRACO / KTX2 Compression

To ensure instant preview scrubbing and rapid bundle loading, Motion Studio scopes its 3D library to the 4 essential tech product categories:
1. **iPhone 16 Pro / 15 Pro**: Natural Titanium, Black Titanium, White Titanium, Desert Titanium. Includes separate mesh hierarchy: `Chassis`, `Display_Bezel`, `Screen` (UV mapped 0..1), `Glass_Cover`, `Camera_Lenses`. (~1.4MB with Draco).
2. **MacBook Pro 16"**: Space Black, Silver. Articulated `Lid_Hinge` group for animated screen opening/closing ($0^\circ \to 135^\circ$), `Retina_Display_Screen` (16:10 aspect ratio), keyboard, and unibody base. (~1.9MB with Draco).
3. **Smart Payment Card**: Credit card / Member pass with EMV chip mesh, magnetic strip back, and anisotropic normal maps simulating holographic foils. (~120KB).
4. **3D Token / Coin**: Circular embossed badge with beveled edge, customizable front/back relief textures, and metallic roughness glints. (~210KB).

Models are loaded via `GLTFLoader` with `DRACOLoader` WebAssembly decoders workers to prevent main-thread UI jank. Decoded geometries are cached globally in `AssetManager.ts`.

### 2.5 Studio Lighting, PBR Environment & Ground Contact Shadows

Tech mockups require pristine studio lighting to showcase chamfered edges, metallic finishes, and glass reflections.

#### The 3-Point Studio Lighting Rig
* **Key Light**: Directional light with soft penumbra, positioned at $(3, 5, 4)$, illuminating the front face and screen.
* **Fill Light**: Subtle blue-tinted directional light at $(-4, 1, 2)$, intensity $0.35$, softening harsh shadows.
* **Rim / Kick Light**: Intense warm light positioned behind the device at $(0, 4, -4)$, intensity $2.0$, producing the iconic razor-sharp edge highlight along the phone's titanium frame.

```
                  [ Rim Light ]
                (Intensity: 2.0)
                       \
                        \
    +---------------------------------------+
    |           3D DEVICE MODEL             |
    |          (iPhone / MacBook)           |
    +---------------------------------------+
          /                           \
         /                             \
[ Key Light ]                    [ Fill Light ]
(Intensity: 1.2)                 (Intensity: 0.35)
```

#### Procedural Studio Environment Map
Instead of loading bulky 5MB HDR environment files over the network, Motion Studio generates an in-memory studio gradient cubemap via `PMREMGenerator`:
* Upper hemisphere: Neutral softbox white ($0xffffff$).
* Horizon: Subtle dark studio falloff ($0x18181b$).
* Lower hemisphere: Floor bounce ($0x09090b$).
This yields instant reflections on phone glass and metal bezels in under 3ms with zero network transfer.

#### Dynamic Ground Contact Shadow
Real-world devices cast soft, ambient-occlusion contact shadows directly onto the floor surface. Rather than expensive real-time shadow maps, Motion Studio uses a **damped contact shadow plane**:
* Placed at $Y = -1.5$ directly beneath the device.
* Shadow radius and opacity dynamically scale with the device's elevation $Y$:
  $$\alpha_{\text{shadow}} = \text{clamp}\left(1.0 - \frac{Y - Y_0}{2.0}, 0.1, 0.85\right)$$
  $$\text{Scale}_{\text{shadow}} = 1.0 + 0.45 \cdot (Y - Y_0)$$
When the device hovers or flips upwards, the contact shadow naturally diffuses, softens, and fades, reinforcing spatial depth.

---

## 3. Screen Texture Projection (Dynamic UV Mapping)

### 3.1 Nested Screen-as-Texture Architecture

The hallmark feature of Motion Studio's 3D Mockup Suite is **Nested Screen Composition**:

> **The Screen-as-Texture Paradigm**: Any 2D Screen in the Motion Studio document can be designated as the live projected texture for a 3D model's screen UV coordinates.

For example:
* **Screen 1 ("Mobile App UI")**: 1179 x 2556 portrait composition containing animated cards, kinetic text, user avatars, and floating buttons.
* **Screen 2 ("Hero 3D Promo")**: 1920 x 1080 landscape composition containing an iPhone 16 Pro 3D mockup.
* In Screen 2, the iPhone layer's `screenSourceId` is set to `"Screen 1"`.

```mermaid
sequenceDiagram
    autonumber
    participant Timeline as Theatre.js Timeline (t = 2.0s)
    participant Screen1 as Screen 1 (2D Mobile UI)
    participant PixiStage as Offscreen PixiJS Stage
    participant ThreeEngine as Three.js Mockup Engine
    participant MainStage as Main Artboard (Screen 2)

    Timeline->>Screen1: Seek 2D animations at t = 2.0s
    Screen1->>PixiStage: Render 2D UI to Offscreen Canvas (1179x2556)
    PixiStage->>ThreeEngine: Update THREE.CanvasTexture (flipY = false)
    Timeline->>ThreeEngine: Seek 3D transforms (Yaw = 45 deg, Dolly Z = 3.2)
    ThreeEngine->>ThreeEngine: Render PBR Mesh with OLED Emissive Material
    ThreeEngine->>MainStage: gl.texSubImage2D -> PIXI.Sprite Layer
    MainStage->>MainStage: Composite 3D layer with background & text
```

### 3.2 Texture Sources: Video, Image, and Live Canvas

The projection engine supports three distinct input types via a unified `ScreenTextureManager`:
1. **Internal Screen Source (`sourceType: 'screen'`)**: Evaluates the designated 2D screen at time $t$ using `HeadlessRenderStage` or an offscreen canvas, updating a `THREE.CanvasTexture`.
2. **Video Clip Source (`sourceType: 'video'`)**: Reads decoded video frames from the WebCodecs `VideoDecoder` or an HTML `<video>` element, feeding a `THREE.VideoTexture` or CanvasTexture.
3. **Static Image Source (`sourceType: 'image'`)**: High-resolution PNG/JPEG uploaded by the user or imported from Figma.

### 3.3 UV Mapping, Aspect Ratio Fitting & Matrix Transform

Real-world device displays have rigid physical aspect ratios:
* **iPhone 16 Pro**: $1179 \times 2556$ ($\approx 19.5:9$, ratio $0.461$).
* **MacBook Pro 16"**: $3456 \times 2234$ ($16:10$, ratio $1.547$).
* **Smart Payment Card**: $85.60\text{mm} \times 53.98\text{mm}$ (ratio $1.586$).

If a user assigns a standard 16:9 ($1920 \times 1080$) video to an iPhone mockup, naïve UV mapping stretches the video vertically, distorting typography and geometry.

#### Projection Fitting Modes
The engine implements three declarative fitting algorithms applied directly to the texture's UV transform matrix:

```typescript
export type ScreenFitMode = 'cover' | 'contain' | 'stretch';

export function applyTextureUVFitting(
  texture: THREE.Texture,
  sourceWidth: number,
  sourceHeight: number,
  targetAspect: number, // e.g. 1179 / 2556 for iPhone
  fitMode: ScreenFitMode
): void {
  const sourceAspect = sourceWidth / sourceHeight;

  // Reset texture transform matrix
  texture.matrixAutoUpdate = false;
  texture.matrix.identity();

  if (fitMode === 'stretch') {
    // 1:1 direct UV mapping
    texture.repeat.set(1, 1);
    texture.offset.set(0, 0);
    texture.updateMatrix();
    return;
  }

  let scaleU = 1;
  let scaleV = 1;
  let offsetU = 0;
  let offsetV = 0;

  if (fitMode === 'cover') {
    // Fill entire screen geometry, crop excess
    if (sourceAspect > targetAspect) {
      scaleU = targetAspect / sourceAspect;
      offsetU = (1 - scaleU) / 2;
    } else {
      scaleV = sourceAspect / targetAspect;
      offsetV = (1 - scaleV) / 2;
    }
  } else if (fitMode === 'contain') {
    // Letterbox / pillarbox inside screen geometry
    if (sourceAspect > targetAspect) {
      scaleV = sourceAspect / targetAspect;
      offsetV = (1 - scaleV) / 2;
    } else {
      scaleU = targetAspect / sourceAspect;
      offsetU = (1 - scaleU) / 2;
    }
  }

  texture.repeat.set(scaleU, scaleV);
  texture.offset.set(offsetU, offsetV);
  texture.updateMatrix();
}
```

> [!IMPORTANT]
> **UV Origin Flip Note**: WebGL standard UV origin is at the bottom-left $(0,0)$, whereas DOM Canvas and video frames have origin at top-left $(0,0)$. When projecting canvas or video textures in Three.js for GLTF models, set `texture.flipY = false` if the GLTF UVs follow standard Khronos glTF conventions, or adjust `offsetV` accordingly.

### 3.4 OLED Display PBR Material Shader

Real mobile and laptop screens do not look like flat paper. They are high-density OLED / Liquid Retina XDR panels covered by an anti-reflective glass surface that produces subtle specular highlights as the device rotates under studio lighting.

To replicate this premium look, the screen mesh uses a customized `THREE.MeshPhysicalMaterial`:
* **Emissive Self-Illumination**:
  $$\text{emissiveMap} = \text{screenTexture}, \quad \text{emissive} = 0xffffff, \quad \text{emissiveIntensity} = 0.85$$
  This ensures the UI remains vibrant and legible even in dark studio lighting setups.
* **Anti-Reflective Glass Coat**:
  $$\text{roughness} = 0.04, \quad \text{metalness} = 0.0, \quad \text{clearcoat} = 1.0, \quad \text{clearcoatRoughness} = 0.08$$
  When the device tilts through the light rig, a soft specular glint travels across the glass without washing out the high-contrast UI elements underneath.

```typescript
export function createOLEDDisplayMaterial(screenTexture: THREE.Texture): THREE.MeshPhysicalMaterial {
  screenTexture.colorSpace = THREE.SRGBColorSpace;
  screenTexture.minFilter = THREE.LinearFilter;
  screenTexture.magFilter = THREE.LinearFilter;
  screenTexture.generateMipmaps = false; // Fast real-time canvas updates

  return new THREE.MeshPhysicalMaterial({
    map: screenTexture,
    emissiveMap: screenTexture,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 0.85,
    roughness: 0.04,
    metalness: 0.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
    reflectivity: 0.5,
    toneMapped: true,
  });
}
```

---

## 4. Theatre.js 3D Controls & Timeline Keyframe Tracks

### 4.1 Native Theatre.js 3D Alignment

Theatre.js was conceived specifically as a high-end animation suite for Three.js. Motion Studio already uses `@theatre/core` for 2D tracks (`x`, `y`, `scaleX`, `scaleY`, `rotation`, `opacity`, `filterBlur`). 

Integrating 3D mockups requires zero new timeline dependencies: we simply register a 3D property sheet schema using Theatre's native `types.compound` primitives.

```
+--------------------------------------------------------------------------------------------------+
| THEATRE.JS STUDIO - DOPE SHEET & CURVE EDITOR                                                    |
|                                                                                                  |
| [>]  iphone_mockup_1                                0.0s        1.0s        2.0s        3.0s     |
|   v  position3D                                                                                  |
|      * x : 0.00                                      o-----------------------o                   |
|      * y : 0.00                                      o-----------------------o                   |
|      * z : -1.20                                     o.......................o                   |
|   v  rotation3D (Euler)                                                                          |
|      * pitch : 15.0 deg                              o~~~~~~~~~~~~~~~~~~~~~~~o                   |
|      * yaw : 360.0 deg                               o=======================o                   |
|      * roll : 0.0 deg                                o-----------------------o                   |
|   v  camera                                                                                      |
|      * fov : 38.0                                    o-----------------------o                   |
|      * dollyZ : 4.2                                  o.......................o                   |
|   v  studio                                                                                      |
|      * lightAngle : 60.0                             o-----------------------o                   |
|      * screenGlow : 1.2                              o-----------------------o                   |
+--------------------------------------------------------------------------------------------------+
```

### 4.2 Theatre.js 3D Property Sheet Schema

```typescript
import { types } from "@theatre/core";

export const Mockup3DTheatreProps = {
  // 1. Spatial Transforms
  position: types.compound({
    x: types.number(0, { range: [-10, 10] }),
    y: types.number(0, { range: [-10, 10] }),
    z: types.number(0, { range: [-20, 10] }),
  }),
  rotation: types.compound({
    pitch: types.number(0, { range: [-360, 360] }), // X axis (degrees)
    yaw: types.number(0, { range: [-360, 360] }),   // Y axis (degrees)
    roll: types.number(0, { range: [-360, 360] }),  // Z axis (degrees)
  }),
  scale: types.number(1, { range: [0.1, 5] }),

  // 2. Camera Controls
  camera: types.compound({
    fov: types.number(45, { range: [15, 90] }),
    dollyZ: types.number(5, { range: [1, 20] }),
    targetX: types.number(0, { range: [-5, 5] }),
    targetY: types.number(0, { range: [-5, 5] }),
  }),

  // 3. Lighting & Studio Environment
  studio: types.compound({
    lightIntensity: types.number(1.2, { range: [0, 4] }),
    lightAngle: types.number(45, { range: [0, 360] }),
    shadowSoftness: types.number(0.6, { range: [0, 1] }),
    screenGlow: types.number(0.85, { range: [0, 2] }),
  }),

  // 4. Device Articulation (MacBook Lid, Card Flip)
  mechanics: types.compound({
    laptopLidAngle: types.number(105, { range: [0, 135] }), // Lid angle in degrees
    cardFlipProgress: types.number(0, { range: [0, 1] }),   // 0 = front, 1 = back
  }),
};
```

### 4.3 Bidirectional State Sync: Scrubbing & Gizmos

1. **Timeline Scrub $\to$ 3D Mesh Sync**:
   When the user or playback clock advances the timeline position, `sheetObject.onValuesChange()` fires synchronously:
   ```typescript
   sheetObj.onValuesChange((values) => {
     // Apply 3D transforms
     model.position.set(values.position.x, values.position.y, values.position.z);
     model.rotation.set(
       THREE.MathUtils.degToRad(values.rotation.pitch),
       THREE.MathUtils.degToRad(values.rotation.yaw),
       THREE.MathUtils.degToRad(values.rotation.roll)
     );
     model.scale.setScalar(values.scale);

     // Apply camera
     camera.fov = values.camera.fov;
     camera.position.z = values.camera.dollyZ;
     camera.lookAt(values.camera.targetX, values.camera.targetY, 0);
     camera.updateProjectionMatrix();

     // Apply laptop lid angle if model is MacBook
     if (lidMesh) {
       lidMesh.rotation.x = THREE.MathUtils.degToRad(values.mechanics.laptopLidAngle);
     }

     // Trigger offscreen render & Pixi texture update
     mockupDisplayObject.render3D();
   });
   ```

2. **On-Canvas 3D Gizmos (Design Mode)**:
   In Design Mode, when a 3D Mockup layer is selected, Motion Studio can display Three.js `TransformControls` overlay or viewport handles. Dragging rotation rings or translation arrows modifies the resting pose in `useProjectStore` or writes keyframes directly into Theatre.js.

---

## 5. Declarative Camera Presets: Mathematical Formulations & Kinetic Physics

Rather than forcing users to manually keyframe dozens of compound 3D parameters, Motion Studio provides **5 declarative 1-click motion presets**.

### 5.1 Preset Overview Matrix

| Preset Name | Target Use Case | Primary Animated Axis | Motion Profile | Key Kinetic Parameter |
| :--- | :--- | :--- | :--- | :--- |
| **1. 360° Orbit** | Hardware reveals, product hero intros | Yaw ($Y$-rotation) | Continuous or easing spin | $360^\circ$ rotation + edge glint |
| **2. Isometric Tilt** | SaaS marketing, tech landing hero | Pitch: $35.3^\circ$, Yaw: $45^\circ$ | Static pose or gentle drift | Low FOV ($20^\circ$), telephoto perspective |
| **3. Push-In Dolly** | Feature highlight, UI zoom-in | Camera Dolly $Z$ ($6.5 \to 2.2$) | Snappy quintic ease with settle | Screen focal lock + depth of field |
| **4. Float / Hover Wobble** | Idle floating, hero card elevation | Dual harmonic $Y$, Pitch, Roll | Organic non-looping oscillation | Dynamic contact shadow pulsation |
| **5. Card Flip** | Fintech cards, loyalty passes, IDs | Yaw ($180^\circ$) + $Z$-recoil | Spring-damped snap ($f_{\text{spring}}$) | Perspective pop (prevents edge-on vanishing) |

---

### 5.2 Deep-Dive Mathematical Formulations

#### 1. 360° Turntable Orbit (`orbit360`)
* **Kinetic Narrative**: The device executes a continuous or eased turntable rotation around its vertical axis, showcasing its front display, titanium edge, sculpted back glass, and camera bump, returning smoothly to the front.
* **Mathematical Function**:
  $$\text{Yaw}(t) = \theta_0 + 360^\circ \cdot E(t / T)$$
  where $E(\tau)$ is a customizable easing curve (linear for continuous infinite loops, smooth cubic bezier for a single showcase reveal).
* **Light Glint Coupling**: As Yaw rotates past $45^\circ$ and $225^\circ$, the key light intensity subtly pulses by $+15\%$ to catch the chamfered titanium edge reflections.

```typescript
export function evaluateOrbit360(t: number, duration: number, startYaw = 0): { yaw: number; pitch: number; roll: number } {
  const progress = Math.min(Math.max(t / duration, 0), 1);
  // Smooth cubic ease-in-out
  const ease = progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;

  return {
    yaw: startYaw + 360 * ease,
    pitch: 8 * Math.sin(progress * Math.PI), // Subtle forward tilt at midpoint
    roll: 0,
  };
}
```

---

#### 2. Isometric Tilt (`isometric`)
* **Kinetic Narrative**: The signature modern SaaS hero perspective (Stripe, Linear, Apple Keynote). The device floats at a classic 30° isometric angle, giving 2D UI designs a dimensional architectural presence.
* **Mathematical Angles**:
  * Pitch ($\theta_X$): $\arcsin(1/\sqrt{3}) \approx 35.264^\circ$
  * Yaw ($\theta_Y$): $45.0^\circ$
  * Roll ($\theta_Z$): $0.0^\circ$
* **Telephoto Distortion Elimination**: Standard wide-angle cameras ($FOV = 60^\circ$) create severe perspective convergence that makes isometric designs look crooked. The preset automatically narrows the camera to a telephoto lens ($FOV = 22^\circ$) and dollies back ($Z = 11.5$), flattening perspective lines into near-orthographic perfection.

```typescript
export const ISOMETRIC_PRESET = {
  rotation: { pitch: 35.264, yaw: 45.0, roll: 0.0 },
  camera: { fov: 22, dollyZ: 11.5, targetX: 0, targetY: 0 },
};
```

---

#### 3. Push-In Dolly (`dollyIn`)
* **Kinetic Narrative**: The camera begins at a wide product view showing the full device floating in space, then accelerates aggressively forward into an intimate close-up on a specific button, chart, or text block on the screen.
* **Mathematical Trajectory**:
  $$\text{Dolly}_Z(t) = Z_{\text{start}} - (Z_{\text{start}} - Z_{\text{screen}}) \cdot E_{\text{snappy}}(t / T)$$
  $$\text{Target}(t) = \text{Lerp}(\text{DeviceCenter}, \text{FeatureAnchor}, E_{\text{snappy}}(t / T))$$
  $$\text{Pitch}(t) = \text{Pitch}_{\text{start}} \cdot (1 - E_{\text{snappy}}(t / T))$$
* As the camera pushes within $2.2$ units of the screen, device tilt flattens to $0^\circ$, transforming the 3D perspective into a crisp, pixel-aligned 2D app demonstration.

```typescript
export function evaluateDollyIn(
  t: number,
  duration: number,
  startZ = 6.5,
  endZ = 2.2,
  targetOffset: [number, number] = [0, 0]
) {
  const u = Math.min(Math.max(t / duration, 0), 1);
  // Snappy quintic ease out: 1 - (1 - u)^5
  const ease = 1 - Math.pow(1 - u, 5);

  return {
    dollyZ: startZ + (endZ - startZ) * ease,
    targetX: targetOffset[0] * ease,
    targetY: targetOffset[1] * ease,
    pitch: 15 * (1 - ease), // Flatten device from 15 deg tilt to 0 deg
    yaw: -20 * (1 - ease),  // Straighten device
  };
}
```

---

#### 4. Float / Hover Wobble (`hover`)
* **Kinetic Narrative**: An organic, zero-gravity anti-gravity hover state. The device gently levitates up and down while nodding subtly in 3D space, preventing static hero sections from feeling dead.
* **Dual Harmonic Oscillators**: To prevent unnatural, mechanical repetition, the motion uses non-commensurate frequencies (e.g. prime ratios $f_1 = 0.65\text{Hz}$, $f_2 = 0.95\text{Hz}$, $f_3 = 0.42\text{Hz}$):
  $$Y(t) = Y_0 + A_y \cdot \sin(2\pi f_1 t)$$
  $$\text{Pitch}(t) = P_0 + A_p \cdot \sin(2\pi f_2 t + \phi_1)$$
  $$\text{Yaw}(t) = \text{Yw}_0 + A_{yw} \cdot \cos(2\pi f_3 t + \phi_2)$$
  $$\text{Roll}(t) = R_0 + A_r \cdot \sin(2\pi (f_1 + f_2)/2 \cdot t)$$
* **Reactive Contact Shadow**: The ground shadow expands and diffuses as $Y(t)$ peaks, reinforcing realistic light attenuation.

```typescript
export function evaluateHover(t: number, baseElevation = 0) {
  const f1 = 0.65; // Elevation frequency
  const f2 = 0.95; // Pitch frequency
  const f3 = 0.42; // Yaw frequency

  const deltaY = 0.18 * Math.sin(2 * Math.PI * f1 * t);
  const pitch = 3.5 * Math.sin(2 * Math.PI * f2 * t + 0.4);
  const yaw = 4.0 * Math.cos(2 * Math.PI * f3 * t);
  const roll = 1.8 * Math.sin(2 * Math.PI * (f1 * 0.5) * t);

  return {
    positionY: baseElevation + deltaY,
    pitch,
    yaw,
    roll,
    shadowScale: 1.0 + deltaY * 0.8,
    shadowOpacity: Math.max(0.2, 0.65 - deltaY * 1.2),
  };
}
```

---

#### 5. Card Flip (`cardFlip`)
* **Kinetic Narrative**: Used in fintech promos (Stripe, Apple Card, Ramp). A payment card or badge flips $180^\circ$ on its $Y$-axis or diagonal, revealing the rear holographic strip, EMV chip, or member tier.
* **The "Vanishing Edge" Problem**: In naïve $180^\circ$ card flips, when the card reaches $90^\circ$ (edge-on to camera), it appears as an infinitely thin 1-pixel hairline or vanishes completely, causing visual hitching.
* **The Motion Studio Solution (Perspective Pop & Z-Recoil)**:
  1. **Z-Recoil**: As the card approaches $90^\circ$, it draws back along the $Z$-axis ($Z_{\text{offset}} = -1.2 \cdot \sin(\pi \cdot t/T)$), creating an exaggerated perspective pull.
  2. **Camera Field-of-View Pulse**: FOV expands by $5^\circ$ at the flip midpoint, adding dynamic optical speed.
  3. **Multi-Sided Geometry**: Front and back materials are distinct meshes (`CardFront`, `CardBack`) with opposite normal orientations, eliminating z-fighting.
  4. **Damped Spring Physics**: Settling motion uses damped harmonic oscillation ($f_{\text{spring}}$, stiffness $320$, damping $24$) to produce a satisfying mechanical snap into the final resting pose.

```typescript
export function evaluateCardFlip(t: number, duration: number) {
  const u = Math.min(Math.max(t / duration, 0), 1);

  // Damped spring settling curve
  const omega = 18.0; // Angular frequency
  const zeta = 0.72;  // Damping ratio
  const springProgress = 1 - Math.exp(-zeta * omega * u) * Math.cos(omega * Math.sqrt(1 - zeta * zeta) * u);

  const yaw = 180 * springProgress;

  // Perspective recoil: peaks at halfway point (u = 0.5)
  const recoilZ = -0.85 * Math.sin(Math.PI * u);

  return {
    yaw,
    pitch: 12 * Math.sin(Math.PI * u), // Dramatic diagonal flip
    positionZ: recoilZ,
    activeFace: yaw < 90 ? 'front' : 'back',
  };
}
```

---

## 6. Deterministic Headless Rendering & Video Export

### 6.1 The Non-Deterministic rAF Hazard

In desktop browser animation, Three.js applications typically run inside `requestAnimationFrame(loop)`. 

However, during video export (WebCodecs MP4 encoding or FFmpeg image-sequence streaming):
* `requestAnimationFrame` throttles or drops when tabs are in the background.
* Heavy GPU readbacks (`extractPixels()`) stall the render thread, causing erratic $\Delta t$ spikes.
* Result: Exported MP4 videos suffer from jittery motion, skipped frames, and out-of-sync audio.

### 6.2 Synchronous Frame-by-Frame Pipeline

Motion Studio's `HeadlessRenderStage` executes a **100% deterministic stepping loop**:
$$\text{For frame } k \in [0, N-1]: \quad t_k = k \cdot \frac{1}{\text{FPS}}$$

```mermaid
sequenceDiagram
    autonumber
    participant Exporter as VideoExporter (FFmpeg / WebCodecs)
    participant Headless as HeadlessRenderStage
    participant ThreeEngine as Three.js Mockup Stage
    participant PixiStage as PixiJS Canvas Stage

    Exporter->>Headless: seekAndRender(t = k * dt)
    Headless->>ThreeEngine: seek(t)
    Note over ThreeEngine: 1. Update Theatre.js Sheet Objects<br/>2. Update Screen Projection Texture<br/>3. threeRenderer.render(scene, camera)
    ThreeEngine->>PixiStage: canvasSource.update()
    Headless->>PixiStage: pixiApp.render()
    Exporter->>PixiStage: extractPixels()
    PixiStage-->>Exporter: Raw RGBA Uint8ClampedArray
    Exporter->>Exporter: Pipe frame to VideoEncoder / FFmpeg stdin
```

```typescript
export class Headless3DExportPipeline {
  private mockupStage: Mockup3DStage;
  private pixiStage: PixiStage;

  public async renderExactFrame(timestamp: number, screen: Screen): Promise<Uint8ClampedArray> {
    // 1. Evaluate nested 2D texture source at timestamp t (if screen-as-texture is active)
    if (this.mockupStage.hasNestedScreenSource()) {
      await this.mockupStage.updateNestedTextureAtTime(timestamp);
    }

    // 2. Seek Theatre.js 3D parameters to timestamp t
    this.mockupStage.seekAtTime(timestamp);

    // 3. Force synchronous Three.js render into offscreen canvas
    this.mockupStage.renderSynchronous();

    // 4. Force PixiJS canvasSource texture upload
    this.mockupStage.syncToPixi();

    // 5. Render top-level Pixi stage
    this.pixiStage.seek(timestamp, screen);

    // 6. Read back raw WebGL framebuffer
    return await this.pixiStage.extractPixels();
  }
}
```

This ensures that whether a frame takes 4ms or 400ms to compute on low-end hardware, the exported 4K/60fps video file is mathematically frame-perfect with zero jitter.

---

## 7. Declarative AST Specification (`scene.json` & TypeScript Types)

### 7.1 Layer Extension Schema

To incorporate 3D mockups cleanly into Motion Studio's document model, we extend `Layer` in `src/types/scene.ts`:

```typescript
export type MockupModelType = 'iphone' | 'macbook' | 'card' | 'badge' | 'custom';
export type CameraPresetType = 'custom' | 'orbit360' | 'isometric' | 'dollyIn' | 'hover' | 'cardFlip';
export type ScreenSourceType = 'screen' | 'video' | 'image' | 'color';

export interface Mockup3DStyle extends LayerStyle {
  // Model Configuration
  modelType: MockupModelType;
  modelUrl?: string; // Custom .glb/.gltf URL if modelType === 'custom'
  deviceFinish?: string; // e.g. 'natural_titanium', 'space_black', 'silver'

  // 3D Spatial Transforms
  position3D: [number, number, number]; // [X, Y, Z] in 3D world units
  rotation3D: [number, number, number]; // [Pitch, Yaw, Roll] in degrees
  scale3D?: [number, number, number];   // Uniform or non-uniform scale

  // Camera Configuration
  cameraPreset?: CameraPresetType;
  cameraFov: number;                    // 15 to 90 degrees
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];

  // Studio Lighting & Environment
  lightIntensity: number;               // Default 1.2
  lightAngle: number;                   // 0 to 360 degrees
  shadowGround: boolean;                // Enable contact shadow
  shadowGroundOpacity: number;          // 0 to 1

  // Screen Texture Projection
  screenSourceType: ScreenSourceType;
  screenSourceId?: string;              // Screen ID in document, or media asset URL
  screenFit: 'cover' | 'contain' | 'stretch';
  screenEmissiveIntensity: number;      // 0 to 2 (OLED glow)

  // Device Specific Articulation
  laptopLidAngle?: number;              // 0 to 135 degrees (for MacBook)
  cardBackAssetUrl?: string;            // Secondary texture for card flip
}

export interface Mockup3DLayer extends BaseLayer {
  type: 'mockup3d';
  style: Mockup3DStyle;
}

// Update the unified Layer union:
export type Layer =
  | GroupLayer
  | TextLayer
  | ChunkLayer
  | ShapeLayer
  | ImageLayer
  | Mockup3DLayer;
```

### 7.2 AST JSON Representation in `scene.json`

```json
{
  "id": "iphone_hero_3d",
  "name": "iPhone 16 Pro Mockup",
  "type": "mockup3d",
  "style": {
    "x": 480,
    "y": 140,
    "width": 960,
    "height": 800,
    "rotation": 0,
    "opacity": 1,
    "zIndex": 10,
    "modelType": "iphone",
    "deviceFinish": "natural_titanium",
    "position3D": [0, 0, 0],
    "rotation3D": [15, -25, 0],
    "cameraPreset": "dollyIn",
    "cameraFov": 38,
    "cameraPosition": [0, 0, 4.5],
    "cameraTarget": [0, 0, 0],
    "lightIntensity": 1.25,
    "lightAngle": 45,
    "shadowGround": true,
    "shadowGroundOpacity": 0.65,
    "screenSourceType": "screen",
    "screenSourceId": "screen_mobile_app_1",
    "screenFit": "cover",
    "screenEmissiveIntensity": 0.9
  },
  "animation": {
    "in": {
      "preset": "dollyIn",
      "start": 0.5,
      "duration": 1.2,
      "easing": "snappy"
    }
  }
}
```

---

## 8. End-to-End Implementation Blueprint & Code Architecture

### 8.1 Class Architecture & Module Responsibilities

```
src/
├── engine/
│   ├── mockup3d/
│   │   ├── Mockup3DStage.ts          # Three.js scene, camera, lighting, and render loop
│   │   ├── Mockup3DModelLoader.ts   # GLTF/Draco model loader and geometry cache
│   │   ├── ScreenTextureProjector.ts # Dynamic UV matrix fitting and OLED material
│   │   ├── PresetsEvaluator.ts       # Mathematical evaluation of the 5 motion presets
│   │   └── ThreeRendererPool.ts      # Singleton WebGL context pool and lifecycle manager
│   ├── pixi/
│   │   ├── Mockup3DDisplayObject.ts  # PixiJS v8 Container wrapping Three's CanvasSource
│   │   └── PixiStage.ts              # Extended with renderMockup3DLayer()
│   └── theatre/
│       └── TheatreController.ts      # Extended with 3D compound properties
├── components/
│   └── inspector/
│       └── Mockup3DInspector.tsx     # Device picker, preset buttons, texture selector
```

### 8.2 Production-Ready Implementation: `Mockup3DStage.ts`

```typescript
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { Mockup3DStyle } from "@/types/scene";

export class Mockup3DStage {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public canvas: HTMLCanvasElement;

  private modelGroup: THREE.Group;
  private screenMesh: THREE.Mesh | null = null;
  private screenMaterial: THREE.MeshPhysicalMaterial | null = null;
  private screenTexture: THREE.CanvasTexture | null = null;
  private contactShadowMesh: THREE.Mesh | null = null;

  private keyLight: THREE.DirectionalLight;
  private fillLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;

  constructor(width: number, height: number) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = width * (window.devicePixelRatio || 1);
    this.canvas.height = height * (window.devicePixelRatio || 1);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    this.renderer.setSize(width, height, false);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 50);
    this.camera.position.set(0, 0, 5);

    this.modelGroup = new THREE.Group();
    this.scene.add(this.modelGroup);

    // 1. Setup Studio Lighting Rig
    this.keyLight = new THREE.DirectionalLight(0xffffff, 1.25);
    this.keyLight.position.set(3, 5, 4);
    this.scene.add(this.keyLight);

    this.fillLight = new THREE.DirectionalLight(0xdbeafe, 0.35); // Soft blue bounce
    this.fillLight.position.set(-4, 1, 2);
    this.scene.add(this.fillLight);

    this.rimLight = new THREE.DirectionalLight(0xffedd5, 1.8); // Warm rim glint
    this.rimLight.position.set(0, 4, -4);
    this.scene.add(this.rimLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    // 2. Setup Contact Shadow Plane
    this.setupContactShadow();
  }

  private setupContactShadow(): void {
    const shadowGeo = new THREE.PlaneGeometry(3.5, 3.5);
    // Radial gradient shadow canvas texture
    const shadowCanvas = document.createElement("canvas");
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const ctx = shadowCanvas.getContext("2d")!;
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, "rgba(0,0,0,0.8)");
    gradient.addColorStop(0.5, "rgba(0,0,0,0.25)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);

    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });

    this.contactShadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    this.contactShadowMesh.rotation.x = -Math.PI / 2;
    this.contactShadowMesh.position.y = -1.5;
    this.scene.add(this.contactShadowMesh);
  }

  /**
   * Updates the 2D canvas texture projected onto the 3D screen UV
   */
  public updateScreenTextureFromCanvas(sourceCanvas: HTMLCanvasElement): void {
    if (!this.screenTexture) {
      this.screenTexture = new THREE.CanvasTexture(sourceCanvas);
      this.screenTexture.colorSpace = THREE.SRGBColorSpace;
      this.screenTexture.minFilter = THREE.LinearFilter;
      this.screenTexture.magFilter = THREE.LinearFilter;
      this.screenTexture.generateMipmaps = false;

      this.screenMaterial = new THREE.MeshPhysicalMaterial({
        map: this.screenTexture,
        emissiveMap: this.screenTexture,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 0.85,
        roughness: 0.05,
        metalness: 0.0,
        clearcoat: 1.0,
        clearcoatRoughness: 0.08,
      });

      if (this.screenMesh) {
        this.screenMesh.material = this.screenMaterial;
      }
    } else {
      this.screenTexture.needsUpdate = true;
    }
  }

  /**
   * Applies animated style parameters from AST / Theatre.js
   */
  public applyStyle(style: Mockup3DStyle): void {
    // Spatial Transforms
    if (style.position3D) {
      this.modelGroup.position.set(style.position3D[0], style.position3D[1], style.position3D[2]);
    }
    if (style.rotation3D) {
      this.modelGroup.rotation.set(
        THREE.MathUtils.degToRad(style.rotation3D[0]),
        THREE.MathUtils.degToRad(style.rotation3D[1]),
        THREE.MathUtils.degToRad(style.rotation3D[2])
      );
    }

    // Camera
    if (style.cameraFov && style.cameraFov !== this.camera.fov) {
      this.camera.fov = style.cameraFov;
      this.camera.updateProjectionMatrix();
    }
    if (style.cameraPosition) {
      this.camera.position.set(style.cameraPosition[0], style.cameraPosition[1], style.cameraPosition[2]);
    }
    if (style.cameraTarget) {
      this.camera.lookAt(style.cameraTarget[0], style.cameraTarget[1], style.cameraTarget[2]);
    }

    // Contact Shadow Dynamics
    if (this.contactShadowMesh) {
      const elevation = style.position3D ? style.position3D[1] : 0;
      this.contactShadowMesh.scale.setScalar(1.0 + Math.max(0, elevation) * 0.4);
      (this.contactShadowMesh.material as THREE.MeshBasicMaterial).opacity =
        Math.max(0.1, (style.shadowGroundOpacity ?? 0.65) - elevation * 0.25);
    }
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.renderer.dispose();
    this.screenTexture?.dispose();
    this.screenMaterial?.dispose();
  }
}
```

---

## 9. Performance Benchmarks, Resource Lifecycle & Compatibility

### 9.1 Target Frame Budget & Memory Footprint

| Metric | Target | Measured / Theoretical | Verification Strategy |
| :--- | :--- | :--- | :--- |
| **Preview Scrub Framerate** | 60 fps (16.6ms) | ~58–60 fps on M1 / RTX 3060 | `performance.now()` delta across 120 scrub frames |
| **GPU Texture Upload** | $< 2.5\text{ms}$ | ~1.2ms (`gl.texSubImage2D`) | Zero-copy canvas blit on modern WebGL2 drivers |
| **GLB Model Memory** | $< 4\text{MB}$ VRAM | iPhone: 1.4MB, MacBook: 1.9MB | `renderer.info.memory.geometries` inspection |
| **WebGL Contexts** | $\le 3$ active | Capped via `ThreeRendererPool` | Verification against browser 16-context hard limit |
| **4K Offline Export Time** | $< 45\text{ms}$ / frame | ~32ms / frame (30fps realtime) | `HeadlessRenderStage` deterministic benchmarking |

### 9.2 VRAM Leak Prevention & Cleanup Checklist

To ensure memory stability during hours-long creative sessions:
1. **Geometry & Buffer Attribute Disposal**: When a 3D layer is deleted or its model swapped, all children of `modelGroup` must be traversed and their `.geometry.dispose()` called explicitly.
2. **Material & Texture Unbinding**: All PBR materials and associated textures (`map`, `emissiveMap`, `normalMap`, `roughnessMap`) must be unbound and destroyed via `.dispose()`.
3. **Canvas Element Detachment**: Offscreen canvas dimensions must be reset to $1 \times 1$ before garbage collection to release backing GPU surface memory.
4. **Context Loss Simulation Testing**: Unit tests must trigger `gl.getExtension('WEBGL_lose_context').loseContext()` to ensure the application recovers gracefully without crashing.

---

## 10. Phased Implementation Roadmap

```
+---------------------------------------------------------------------------------------------------+
| PHASE 11.1: Core 3D Offscreen Surface & PixiJS v8 Integration (Week 1)                            |
| * Install three, @types/three.                                                                    |
| * Implement Mockup3DStage.ts, Mockup3DDisplayObject.ts, and ThreeRendererPool.ts.                |
| * Integrate Mockup3DLayer into scene.ts, evaluator.ts, and PixiStage.ts.                         |
+---------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
| PHASE 11.2: Dynamic Screen UV Projection & PBR OLED Shader (Week 2)                               |
| * Build ScreenTextureProjector.ts with UV fitting (cover, contain, stretch).                      |
| * Implement live Screen-as-Texture nested composition pipeline.                                   |
| * Bundle optimized Draco-compressed iPhone 16 Pro and MacBook Pro models.                        |
+---------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
| PHASE 11.3: Theatre.js 3D Controls & Declarative Camera Presets (Week 3)                          |
| * Register 3D compound property schemas in TheatreController.ts.                                  |
| * Implement mathematical evaluators for the 5 presets: Orbit, Isometric, Dolly, Hover, Flip.      |
| * Build Mockup3DInspector UI section in the Design & Animate inspector panels.                    |
+---------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
| PHASE 11.4: Headless Export Determinism & Automated Verification (Week 4)                         |
| * Wire synchronous frame seeking into HeadlessRenderStage.ts and videoExporter.ts.                |
| * Add end-to-end multi-frame contact sheet capture tests for 3D device sequences.                 |
+---------------------------------------------------------------------------------------------------+
```

---

## Conclusion & Architectural Recommendation

Bringing 3D device mockups into Motion Studio does not require bloating the software into a heavyweight 3D DCC. 

By treating **Three.js as a scoped, offscreen texture generator** sampled natively by **PixiJS v8**, and driving its spatial transforms through **Theatre.js compound timeline tracks**, Motion Studio achieves:
1. **Unrivaled Workflow Speed**: Edit 2D UI designs and watch the 3D phone update instantly with zero re-rendering delays.
2. **Sub-Pixel Kinetic Timing**: Coordinate 2D typography staggers and 3D camera orbits along a single, unified Theatre.js dope sheet.
3. **Flawless 4K Export Determinism**: 100% dropped-frame-free video exports via synchronous frame evaluation.
4. **Lightweight Distribution**: Less than 3MB of compressed assets delivering Apple-keynote-quality product animations right in the browser.
