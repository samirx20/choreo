import { Application, Container, Graphics, HTMLText, Text, TextStyle, BlurFilter, Rectangle } from "pixi.js";
import { Viewport } from "pixi-viewport";
import { Layer, Screen, GroupLayer, TextLayer, ShapeLayer, ImageLayer } from "@/types/scene";
import { evaluateSceneAtTime } from "@/engine/evaluator";

export interface PixiStageOptions {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  artboardWidth: number;
  artboardHeight: number;
  backgroundColor?: string;
  onLayerSelect?: (layerId: string, isShift: boolean) => void;
  onLayerDoubleClick?: (layerId: string) => void;
  onViewportChange?: (zoom: number, pan: { x: number; y: number }) => void;
}

export class PixiStage {
  public app: Application;
  public viewport: Viewport | null = null;
  public artboardContainer: Container;
  public artboardBg: Graphics;
  public artboardMask: Graphics;
  public layersContainer: Container;
  public options: PixiStageOptions;
  public isReady = false;

  private layerDisplayObjects = new Map<string, Container>();

  constructor(options: PixiStageOptions) {
    this.options = options;
    this.app = new Application();
    this.artboardContainer = new Container();
    this.artboardBg = new Graphics();
    this.artboardMask = new Graphics();
    this.layersContainer = new Container();
  }

  public async init(): Promise<void> {
    await this.app.init({
      canvas: this.options.canvas,
      width: this.options.width,
      height: this.options.height,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      antialias: true,
      backgroundColor: 0x09090b, // Zinc-950
      preference: "webgl",
    });

    // Create Viewport
    this.viewport = new Viewport({
      screenWidth: this.options.width,
      screenHeight: this.options.height,
      worldWidth: this.options.artboardWidth * 3,
      worldHeight: this.options.artboardHeight * 3,
      events: this.app.renderer.events,
    });

    this.app.stage.addChild(this.viewport);

    // Setup Viewport plugins: Drag (Spacebar or middle click), Pinch, Wheel zoom, Decelerate
    this.viewport
      .drag({ mouseButtons: "middle" })
      .pinch()
      .wheel({ percent: 0.1, smooth: 3 })
      .decelerate();

    // Center viewport on the artboard
    this.viewport.addChild(this.artboardContainer);
    this.artboardContainer.x = (this.viewport.worldWidth - this.options.artboardWidth) / 2;
    this.artboardContainer.y = (this.viewport.worldHeight - this.options.artboardHeight) / 2;

    // Draw artboard background & shadow
    this.updateArtboardBackground(
      this.options.artboardWidth,
      this.options.artboardHeight,
      this.options.backgroundColor || "#18181b"
    );

    this.artboardContainer.addChild(this.artboardBg);
    this.artboardContainer.addChild(this.artboardMask);
    this.artboardContainer.addChild(this.layersContainer);

    // Apply mask so layers don't bleed outside canvas bounds
    this.layersContainer.mask = this.artboardMask;

    // Center view
    this.centerOnArtboard();

    // Viewport change listener
    this.viewport.on("moved", () => {
      if (this.viewport && this.options.onViewportChange) {
        this.options.onViewportChange(this.viewport.scale.x, {
          x: this.viewport.x,
          y: this.viewport.y,
        });
      }
    });

    this.isReady = true;
  }

  public enableSpacebarPan(enabled: boolean) {
    if (!this.viewport) return;
    if (enabled) {
      this.viewport.plugins.pause("drag");
      this.viewport.drag({ mouseButtons: "left" });
    } else {
      this.viewport.plugins.pause("drag");
      this.viewport.drag({ mouseButtons: "middle" });
    }
  }

  public centerOnArtboard() {
    if (!this.viewport) return;
    const padding = 100;
    const availableW = this.options.width - padding * 2;
    const availableH = this.options.height - padding * 2;
    const scaleX = availableW / this.options.artboardWidth;
    const scaleY = availableH / this.options.artboardHeight;
    const targetScale = Math.min(scaleX, scaleY, 1.0);

    this.viewport.setZoom(targetScale, true);
    this.viewport.moveCenter(
      this.artboardContainer.x + this.options.artboardWidth / 2,
      this.artboardContainer.y + this.options.artboardHeight / 2
    );
  }

  public setZoom(zoomLevel: number) {
    if (!this.viewport) return;
    this.viewport.setZoom(zoomLevel, true);
  }

  public updateArtboardBackground(w: number, h: number, bgHex: string) {
    this.artboardBg.clear();
    const colorNum = parseInt(bgHex.replace("#", ""), 16) || 0x18181b;

    // Outer subtle border / drop shadow representation
    this.artboardBg.roundRect(0, 0, w, h, 8);
    this.artboardBg.fill({ color: colorNum });
    this.artboardBg.stroke({ color: 0x3f3f46, width: 2 }); // Zinc-700 border

    // Mask setup
    this.artboardMask.clear();
    this.artboardMask.roundRect(0, 0, w, h, 8);
    this.artboardMask.fill({ color: 0xffffff });
  }

  public renderScreen(screen: Screen) {
    if (!this.isReady) return;

    // Dynamically update artboard background to matching scene fill
    const screenBg = screen.backgroundColor || this.options.backgroundColor || "#18181b";
    this.updateArtboardBackground(
      this.options.artboardWidth,
      this.options.artboardHeight,
      screenBg
    );

    // Clear obsolete display objects
    const currentLayerIds = new Set<string>();
    const collectIds = (layers: Layer[]) => {
      for (const l of layers) {
        currentLayerIds.add(l.id);
        if (l.type === "group" && l.children) {
          collectIds(l.children);
        }
      }
    };
    collectIds(screen.layers);

    for (const [id, dobj] of this.layerDisplayObjects.entries()) {
      if (!currentLayerIds.has(id)) {
        dobj.destroy({ children: true });
        this.layerDisplayObjects.delete(id);
      }
    }

    // Render / update layers
    this.renderLayerList(screen.layers, this.layersContainer);
  }

  private renderLayerList(layers: Layer[], parentContainer: Container) {
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      let dobj = this.layerDisplayObjects.get(layer.id);

      if (!dobj) {
        dobj = this.createDisplayObject(layer);
        this.layerDisplayObjects.set(layer.id, dobj);
        parentContainer.addChild(dobj);
      } else {
        if (dobj.parent !== parentContainer) {
          parentContainer.addChild(dobj);
        }
        this.updateDisplayObject(dobj, layer);
      }

      dobj.zIndex = layer.style.zIndex ?? i;

      // If group, recursively render children
      if (layer.type === "group" && layer.children) {
        const groupContainer = (dobj as any).__childrenContainer || dobj;
        this.renderLayerList(layer.children, groupContainer);
      }
    }
  }

  private createDisplayObject(layer: Layer): Container {
    const container = new Container();
    container.label = layer.name || layer.id;
    container.eventMode = "static";
    container.cursor = "pointer";

    // Setup click handlers
    let lastClickTime = 0;
    container.on("pointerdown", (e) => {
      const now = Date.now();
      const isShift = e.shiftKey;
      if (now - lastClickTime < 300) {
        this.options.onLayerDoubleClick?.(layer.id);
      } else {
        this.options.onLayerSelect?.(layer.id, isShift);
      }
      lastClickTime = now;
    });

    if (layer.type === "text" || layer.type === "chunk") {
      const textObj = this.createTextObject(layer);
      container.addChild(textObj);
      (container as any).__textChild = textObj;
    } else if (layer.type === "shape") {
      const shapeObj = new Graphics();
      container.addChild(shapeObj);
      (container as any).__shapeChild = shapeObj;
      this.drawShape(shapeObj, layer);
    } else if (layer.type === "group") {
      const bgGraphics = new Graphics();
      const childrenContainer = new Container();
      container.addChild(bgGraphics);
      container.addChild(childrenContainer);
      (container as any).__bgGraphics = bgGraphics;
      (container as any).__childrenContainer = childrenContainer;
      this.drawGroupBackground(bgGraphics, layer);
    }

    this.updateDisplayObject(container, layer);
    return container;
  }

  private updateDisplayObject(container: Container, layer: Layer) {
    const s = layer.style;
    container.x = s.x || 0;
    container.y = s.y || 0;
    container.scale.x = s.scaleX ?? 1;
    container.scale.y = s.scaleY ?? 1;
    container.rotation = ((s.rotation || 0) * Math.PI) / 180;
    container.alpha = s.opacity ?? 1;
    container.visible = !layer.hidden;

    // Filters
    if (s.filterBlur && s.filterBlur > 0) {
      container.filters = [new BlurFilter({ strength: s.filterBlur })];
    } else {
      container.filters = [];
    }

    // Update child content
    if ((layer.type === "text" || layer.type === "chunk") && (container as any).__textChild) {
      this.updateTextObject((container as any).__textChild, layer);
    } else if (layer.type === "shape" && (container as any).__shapeChild) {
      this.drawShape((container as any).__shapeChild, layer);
    } else if (layer.type === "group" && (container as any).__bgGraphics) {
      this.drawGroupBackground((container as any).__bgGraphics, layer);
    }
  }

  private createTextObject(layer: TextLayer | any): Text {
    const s = layer.style;
    const colorNum = parseInt((s.color || "#ffffff").replace("#", ""), 16) || 0xffffff;

    const style = new TextStyle({
      fontFamily: s.fontFamily || "Inter",
      fontSize: s.fontSize || 32,
      fontWeight: (s.fontWeight as any) || "normal",
      fill: colorNum,
      align: s.textAlign || "left",
      wordWrap: s.wordWrap ?? false,
      wordWrapWidth: s.wordWrapWidth || 600,
      lineHeight: s.lineHeight ? s.lineHeight * (s.fontSize || 32) : undefined,
    });

    const text = new Text({
      text: layer.content || "",
      style,
    });

    return text;
  }

  private updateTextObject(text: Text, layer: TextLayer | any) {
    const s = layer.style;
    const colorNum = parseInt((s.color || "#ffffff").replace("#", ""), 16) || 0xffffff;

    text.text = layer.content || "";
    text.style.fontFamily = s.fontFamily || "Inter";
    text.style.fontSize = s.fontSize || 32;
    text.style.fontWeight = (s.fontWeight as any) || "normal";
    text.style.fill = colorNum;
    text.style.align = s.textAlign || "left";
    text.style.wordWrap = s.wordWrap ?? false;
    text.style.wordWrapWidth = s.wordWrapWidth || 600;
  }

  private drawShape(g: Graphics, layer: ShapeLayer) {
    g.clear();
    const s = layer.style;
    const w = typeof s.width === "number" ? s.width : 200;
    const h = typeof s.height === "number" ? s.height : 100;
    const fillHex = s.backgroundColor || "#3b82f6";
    const fillColor = parseInt(fillHex.replace("#", ""), 16) || 0x3b82f6;

    if (layer.shapeType === "circle" || layer.shapeType === "ellipse") {
      g.ellipse(w / 2, h / 2, w / 2, h / 2);
    } else if (layer.shapeType === "star") {
      const points = layer.points || 5;
      const outerR = Math.min(w, h) / 2;
      const innerR = outerR * (layer.innerRadiusRatio || 0.382);
      g.star(w / 2, h / 2, points, outerR, innerR, 0);
    } else if (layer.shapeType === "triangle" || layer.shapeType === "polygon") {
      const sides = layer.shapeType === "triangle" ? 3 : (layer.sides || 5);
      const radius = Math.min(w, h) / 2;
      g.regularPoly(w / 2, h / 2, radius, sides, -Math.PI / 2);
    } else if (layer.shapeType === "line" || layer.shapeType === "arrow") {
      g.moveTo(0, h / 2);
      g.lineTo(w, h / 2);
    } else {
      if (Array.isArray(s.borderRadius)) {
        const [tl, tr, br, bl] = s.borderRadius;
        g.moveTo(tl, 0);
        g.lineTo(w - tr, 0);
        g.arcTo(w, 0, w, tr, tr);
        g.lineTo(w, h - br);
        g.arcTo(w, h, w - br, h, br);
        g.lineTo(bl, h);
        g.arcTo(0, h, 0, h - bl, bl);
        g.lineTo(0, tl);
        g.arcTo(0, 0, tl, 0, tl);
        g.closePath();
      } else {
        const radius = typeof s.borderRadius === "number" ? s.borderRadius : 8;
        g.roundRect(0, 0, w, h, radius);
      }
    }

    g.fill({ color: fillColor, alpha: s.opacity ?? 1 });

    if (s.borderWidth && s.borderWidth > 0 && s.borderColor) {
      const strokeColor = parseInt(s.borderColor.replace("#", ""), 16) || 0xffffff;
      g.stroke({ color: strokeColor, width: s.borderWidth });
    }
  }

  private drawGroupBackground(g: Graphics, layer: GroupLayer) {
    g.clear();
    const s = layer.style;
    const w = typeof s.width === "number" ? s.width : 800;
    const h = typeof s.height === "number" ? s.height : 400;

    if (s.backgroundColor) {
      const fillHex = s.backgroundColor;
      const fillColor = parseInt(fillHex.replace("#", ""), 16) || 0x18181b;
      const radius = typeof s.borderRadius === "number" ? s.borderRadius : 16;
      g.roundRect(0, 0, w, h, radius);
      g.fill({ color: fillColor });

      if (s.borderWidth && s.borderWidth > 0 && s.borderColor) {
        const strokeColor = parseInt(s.borderColor.replace("#", ""), 16) || 0x27272a;
        g.stroke({ color: strokeColor, width: s.borderWidth });
      }
    }
  }

  /**
   * Translates artboard layer local coordinates into window screen coordinates
   * (Essential for placing the react-moveable gizmo overlay exactly on top of Pixi layers!)
   */
  public getLayerScreenBounds(layerId: string): DOMRect | null {
    const dobj = this.layerDisplayObjects.get(layerId);
    if (!dobj || !this.viewport) return null;

    const bounds = dobj.getBounds();
    const canvasRect = this.options.canvas.getBoundingClientRect();

    return new DOMRect(
      canvasRect.left + bounds.x,
      canvasRect.top + bounds.y,
      bounds.width,
      bounds.height
    );
  }

  /**
   * Deterministic frame buffer extraction:
   * Extracts raw RGBA pixels from WebGL render target for FFmpeg stdin streaming / WebCodecs export
   */
  public async extractPixels(): Promise<Uint8ClampedArray | Uint8Array> {
    try {
      const output: any = await this.app.renderer.extract.pixels(this.artboardContainer);
      return output.pixels || output;
    } catch {
      return new Uint8ClampedArray(4);
    }
  }

  /**
   * Deterministically seeks display objects to timestamp t using evaluateSceneAtTime.
   */
  public seek(time: number, screen: Screen): void {
    if (!this.isReady || !screen) return;
    const computedStyles = evaluateSceneAtTime(screen.layers, time);

    for (const [id, dobj] of this.layerDisplayObjects.entries()) {
      const style = computedStyles[id];
      if (style) {
        if (style.opacity !== undefined) {
          dobj.alpha = Number(style.opacity);
        }
        if (style.transform) {
          const scaleMatch = style.transform.match(/scale\(([^)]+)\)/);
          if (scaleMatch) {
            const s = parseFloat(scaleMatch[1]);
            if (!isNaN(s)) {
              dobj.scale.set(s);
            }
          }
          const rotMatch = style.transform.match(/rotate\(([^)]+)deg\)/);
          if (rotMatch) {
            const deg = parseFloat(rotMatch[1]);
            if (!isNaN(deg)) {
              dobj.rotation = (deg * Math.PI) / 180;
            }
          }
        }
        if (style.filter) {
          const blurMatch = style.filter.match(/blur\(([^)]+)px\)/);
          if (blurMatch) {
            const b = parseFloat(blurMatch[1]);
            if (!isNaN(b) && b > 0) {
              dobj.filters = [new BlurFilter({ strength: b })];
            } else {
              dobj.filters = [];
            }
          }
        }
      }
    }

    if (this.app.renderer) {
      this.app.renderer.render(this.app.stage);
    }
  }

  public resize(w: number, h: number) {
    this.options.width = w;
    this.options.height = h;
    this.app.renderer.resize(w, h);
    if (this.viewport) {
      this.viewport.resize(w, h);
    }
  }

  public destroy() {
    this.isReady = false;
    this.layerDisplayObjects.clear();
    try {
      this.app?.destroy?.(true, { children: true, texture: true });
    } catch {
      // Ignore cleanup error in headless / test environment
    }
  }
}
