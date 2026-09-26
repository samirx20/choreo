import { Application, Container, Graphics, HTMLText, Text, TextStyle, BlurFilter, Rectangle, Sprite } from "pixi.js";
import { Viewport } from "pixi-viewport";
import { Layer, Screen, GroupLayer, TextLayer, ShapeLayer, ImageLayer, SceneTransition } from "@/types/scene";
import { evaluateSceneAtTime, evaluateCounterValue } from "@/engine/evaluator";
import { getEasing } from "@/engine/easings";

export interface PixiStageOptions {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  artboardWidth: number;
  artboardHeight: number;
  scale?: number;
  backgroundColor?: string;
  isHeadless?: boolean;
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
  private isTransparent = false;

  constructor(options: PixiStageOptions) {
    this.options = options;
    this.app = new Application();
    this.artboardContainer = new Container();
    this.artboardBg = new Graphics();
    this.artboardMask = new Graphics();
    this.layersContainer = new Container();
  }

  public async init(): Promise<void> {
    const isHeadless = Boolean(this.options.isHeadless);
    await this.app.init({
      canvas: this.options.canvas,
      width: this.options.width,
      height: this.options.height,
      resolution: isHeadless ? 1 : (typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1),
      autoDensity: !isHeadless,
      antialias: true,
      backgroundColor: 0x09090b, // Zinc-950
      backgroundAlpha: 1,
      preference: "webgl",
      preserveDrawingBuffer: true,
    });

    if (isHeadless) {
      // Direct 1:1 artboard attachment for headless export (no zoom margins or middle-click drag)
      this.app.stage.addChild(this.artboardContainer);
      this.artboardContainer.x = 0;
      this.artboardContainer.y = 0;
      const exportScale = this.options.scale ?? 1;
      this.artboardContainer.scale.set(exportScale, exportScale);
    } else {
      // Create Interactive Viewport
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
    }

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

    // Center view if interactive
    if (!isHeadless) {
      this.centerOnArtboard();

      // Viewport change listener
      this.viewport?.on("moved", () => {
        if (this.viewport && this.options.onViewportChange) {
          this.options.onViewportChange(this.viewport.scale.x, {
            x: this.viewport.x,
            y: this.viewport.y,
          });
        }
      });
    }

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
    let cleanHex = bgHex;
    if (bgHex && bgHex.includes("gradient")) {
      const match = bgHex.match(/#[0-9a-fA-F]{3,8}/);
      cleanHex = match ? match[0] : "#18181b";
    }
    const colorNum = parseInt(cleanHex.replace("#", ""), 16) || 0x18181b;

    if (this.options.isHeadless) {
      // Full flush frame without outer border or rounded corners in export mode
      this.artboardBg.rect(0, 0, w, h);
      this.artboardBg.fill({ color: colorNum });

      this.artboardMask.clear();
      this.artboardMask.rect(0, 0, w, h);
      this.artboardMask.fill({ color: 0xffffff });
    } else {
      // Outer subtle border / drop shadow representation in editor
      this.artboardBg.roundRect(0, 0, w, h, 8);
      this.artboardBg.fill({ color: colorNum });
      this.artboardBg.stroke({ color: 0x3f3f46, width: 2 }); // Zinc-700 border

      // Mask setup
      this.artboardMask.clear();
      this.artboardMask.roundRect(0, 0, w, h, 8);
      this.artboardMask.fill({ color: 0xffffff });
    }
  }

  public setTransparentBackground(transparent: boolean): void {
    this.isTransparent = transparent;
    if (this.app?.renderer?.background) {
      this.app.renderer.background.alpha = transparent ? 0.0 : 1.0;
    }
    if (transparent) {
      this.artboardBg.visible = false;
    } else {
      this.artboardBg.visible = true;
      this.updateArtboardBackground(
        this.options.artboardWidth,
        this.options.artboardHeight,
        this.options.backgroundColor || "#18181b"
      );
    }
    if (this.app?.renderer) {
      this.app.renderer.render(this.app.stage);
    }
  }

  public renderScreen(screen: Screen) {
    if (!this.isReady) return;

    const hasBg = Boolean(
      (screen.background && screen.background.fill && screen.background.fill !== "transparent") ||
      (screen.backgroundColor && screen.backgroundColor !== "transparent")
    );

    if (this.isTransparent || !hasBg) {
      this.artboardBg.visible = false;
      if (this.app?.renderer?.background) {
        this.app.renderer.background.alpha = 0.0;
      }
    } else {
      this.artboardBg.visible = true;
      if (this.app?.renderer?.background) {
        this.app.renderer.background.alpha = 1.0;
      }
      // Dynamically update artboard background to matching scene fill
      const screenBg = screen.background?.fill || screen.backgroundColor || this.options.backgroundColor || "#18181b";
      this.updateArtboardBackground(
        screen.width || this.options.artboardWidth,
        screen.height || this.options.artboardHeight,
        screenBg
      );
    }

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
        const layoutObj = layer.layout;
        const isFlex = (layoutObj && typeof layoutObj === "object" && layoutObj.display === "flex") ||
          (layer as any).layout === "flex" ||
          (layer as any).compoundType === "split-text";
        const isRow = ((layoutObj && typeof layoutObj === "object" && layoutObj.flexDirection) || (layer as any).flexDirection || "row") === "row";
        const gap = (layoutObj && typeof layoutObj === "object" && typeof layoutObj.gap === "number")
          ? layoutObj.gap
          : typeof (layer as any).gap === "number"
            ? (layer as any).gap
            : (layer as any).compoundType === "split-text" ? 0 : 8;

        if (isFlex) {
          let offset = 0;
          for (let c = 0; c < layer.children.length; c++) {
            const child = layer.children[c];
            const childW = typeof child.style?.width === "number" ? child.style.width : 50;
            const childH = typeof child.style?.height === "number" ? child.style.height : 30;
            if (isRow) {
              child.style.x = offset;
              child.style.y = 0;
              offset += childW + gap;
            } else {
              child.style.x = 0;
              child.style.y = offset;
              offset += childH + gap;
            }
          }
        }

        this.renderLayerList(layer.children, groupContainer);

        // Mask Group Support
        if (layer.isMaskGroup && layer.children.length > 1) {
          const maskChild = layer.children.find((c) => c.isMask) || layer.children[0];
          const maskDobj = this.layerDisplayObjects.get(maskChild.id);
          if (maskDobj) {
            groupContainer.mask = maskDobj;
          }
        } else if (groupContainer.mask) {
          groupContainer.mask = null;
        }
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

    if (layer.type === "text" || layer.type === "chunk" || (layer as any).type === "counter") {
      const textObj = this.createTextObject(layer);
      container.addChild(textObj);
      (container as any).__textChild = textObj;
    } else if (layer.type === "shape" || (layer as any).type === "line" || (layer as any).type === "polygon") {
      const shapeObj = new Graphics();
      container.addChild(shapeObj);
      (container as any).__shapeChild = shapeObj;
      this.drawShape(shapeObj, layer as any);
    } else if (layer.type === "group" || (layer as any).type === "frame") {
      const bgGraphics = new Graphics();
      const childrenContainer = new Container();
      container.addChild(bgGraphics);
      container.addChild(childrenContainer);
      (container as any).__bgGraphics = bgGraphics;
      (container as any).__childrenContainer = childrenContainer;
      this.drawGroupBackground(bgGraphics, layer as any);
    } else if ((layer as any).type === "icon") {
      const iconGraphics = new Graphics();
      container.addChild(iconGraphics);
      (container as any).__iconChild = iconGraphics;
      this.drawIcon(iconGraphics, layer);
    } else if (layer.type === "image" && (layer as any).src) {
      try {
        const sprite = Sprite.from((layer as any).src);
        const w = typeof layer.style.width === "number" ? layer.style.width : 200;
        const h = typeof layer.style.height === "number" ? layer.style.height : 200;
        sprite.width = w;
        sprite.height = h;
        container.addChild(sprite);
        (container as any).__imageChild = sprite;
      } catch (e) {
        console.warn("Could not load image sprite in PixiStage:", e);
      }
    }

    this.updateDisplayObject(container, layer);
    return container;
  }

  private updateDisplayObject(container: Container, layer: Layer) {
    const s = layer.style;
    const w = typeof s.width === "number" ? s.width : ((container as any).__baseW || 0);
    const h = typeof s.height === "number" ? s.height : ((container as any).__baseH || 0);
    const pivotX = s.pivotX ?? 0.5;
    const pivotY = s.pivotY ?? 0.5;

    (container as any).__baseW = w;
    (container as any).__baseH = h;
    (container as any).__pivotX = pivotX;
    (container as any).__pivotY = pivotY;

    // Cache base transform attributes for seek animation offset calculation
    (container as any).__baseX = s.x || 0;
    (container as any).__baseY = s.y || 0;
    (container as any).__baseScaleX = s.scaleX ?? 1;
    (container as any).__baseScaleY = s.scaleY ?? 1;
    (container as any).__baseRotation = ((s.rotation || 0) * Math.PI) / 180;

    container.pivot.set(w * pivotX, h * pivotY);
    container.x = (s.x || 0) + w * pivotX;
    container.y = (s.y || 0) + h * pivotY;
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
    if ((layer.type === "text" || layer.type === "chunk" || (layer as any).type === "counter") && (container as any).__textChild) {
      this.updateTextObject((container as any).__textChild, layer);
    } else if ((layer.type === "shape" || (layer as any).type === "line" || (layer as any).type === "polygon") && (container as any).__shapeChild) {
      this.drawShape((container as any).__shapeChild, layer as any);
    } else if ((layer.type === "group" || (layer as any).type === "frame") && (container as any).__bgGraphics) {
      this.drawGroupBackground((container as any).__bgGraphics, layer as any);
    } else if ((layer as any).type === "icon" && (container as any).__iconChild) {
      this.drawIcon((container as any).__iconChild, layer);
    }
  }

  private positionTextObject(text: Text, layer: TextLayer | any) {
    const s = layer.style;
    const w = typeof s.width === "number" ? s.width : text.width;
    const h = typeof s.height === "number" ? s.height : text.height;

    const textAlign = s.textAlign || "center";
    if (textAlign === "left") {
      text.x = 0;
    } else if (textAlign === "right") {
      text.x = Math.max(0, w - text.width);
    } else {
      text.x = Math.max(0, (w - text.width) / 2);
    }

    const verticalAlign = s.verticalAlign || "center";
    if (verticalAlign === "top") {
      text.y = 0;
    } else if (verticalAlign === "bottom") {
      text.y = Math.max(0, h - text.height);
    } else {
      text.y = Math.max(0, (h - text.height) / 2);
    }
  }

  private createTextObject(layer: TextLayer | any): Text {
    const s = layer.style;
    const colorNum = parseInt((s.color || "#ffffff").replace("#", ""), 16) || 0xffffff;

    const style = new TextStyle({
      fontFamily: s.fontFamily || "Inter, -apple-system, sans-serif",
      fontSize: s.fontSize || 32,
      fontWeight: (s.fontWeight as any) || "normal",
      fill: colorNum,
      align: (s.textAlign as any) || "center",
      wordWrap: s.wordWrap ?? (s.boxMode === "area" || s.textSizing === "fixed" || s.textSizing === "auto-height"),
      wordWrapWidth: s.width || 600,
      lineHeight: s.lineHeight ? s.lineHeight * (s.fontSize || 32) : undefined,
    });

    const text = new Text({
      text: layer.content || "",
      style,
    });

    this.positionTextObject(text, layer);
    return text;
  }

  private updateTextObject(text: Text, layer: TextLayer | any) {
    const s = layer.style;
    const colorNum = parseInt((s.color || "#ffffff").replace("#", ""), 16) || 0xffffff;

    text.text = layer.content || "";
    text.style.fontFamily = s.fontFamily || "Inter, -apple-system, sans-serif";
    text.style.fontSize = s.fontSize || 32;
    text.style.fontWeight = (s.fontWeight as any) || "normal";
    text.style.fill = colorNum;
    text.style.align = (s.textAlign as any) || "center";
    text.style.wordWrap = s.wordWrap ?? (s.boxMode === "area" || s.textSizing === "fixed" || s.textSizing === "auto-height");
    text.style.wordWrapWidth = s.width || 600;

    this.positionTextObject(text, layer);
  }

  private drawShape(g: Graphics, layer: ShapeLayer | any) {
    g.clear();
    const s = layer.style;
    const w = typeof s.width === "number" ? s.width : 200;
    const h = typeof s.height === "number" ? s.height : 100;
    const fillHex = s.backgroundColor || "#3b82f6";
    const fillColor = parseInt(fillHex.replace("#", ""), 16) || 0x3b82f6;

    if (layer.vertices && Array.isArray(layer.vertices) && layer.vertices.length > 1) {
      const pts = layer.vertices;
      g.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        g.lineTo(pts[i].x, pts[i].y);
      }
      if (layer.closed) {
        g.closePath();
      }
    } else if (layer.shapeType === "circle" || layer.shapeType === "ellipse") {
      g.ellipse(w / 2, h / 2, w / 2, h / 2);
    } else if (layer.shapeType === "star") {
      const points = layer.points || 5;
      const outerR = Math.min(w, h) / 2;
      const innerR = outerR * (layer.innerRadiusRatio || 0.382);
      g.star(w / 2, h / 2, points, outerR, innerR, 0);
    } else if (layer.shapeType === "triangle" || layer.shapeType === "polygon" || layer.type === "polygon") {
      const sides = layer.shapeType === "triangle" ? 3 : (layer.sides || 5);
      const radius = Math.min(w, h) / 2;
      g.regularPoly(w / 2, h / 2, radius, sides, -Math.PI / 2);
    } else if (layer.type === "line" || layer.shapeType === "line" || layer.shapeType === "arrow") {
      const x1 = layer.x1 ?? 0;
      const y1 = layer.y1 ?? (h / 2);
      const x2 = layer.x2 ?? w;
      const y2 = layer.y2 ?? (h / 2);
      g.moveTo(x1, y1);
      g.lineTo(x2, y2);

      const hasArrowEnd = layer.shapeType === "arrow" || layer.arrowEnd === "arrow" || layer.arrowEnd === true;
      const hasArrowStart = layer.arrowStart === "arrow" || layer.arrowStart === true;
      const arrowLen = Math.max(10, (s.borderWidth || 3) * 3);

      if (hasArrowEnd) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const angle = Math.atan2(dy, dx);
        const a1 = angle - Math.PI / 6;
        const a2 = angle + Math.PI / 6;
        g.moveTo(x2 - arrowLen * Math.cos(a1), y2 - arrowLen * Math.sin(a1));
        g.lineTo(x2, y2);
        g.lineTo(x2 - arrowLen * Math.cos(a2), y2 - arrowLen * Math.sin(a2));
      }
      if (hasArrowStart) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const angle = Math.atan2(dy, dx);
        const a1 = angle - Math.PI / 6;
        const a2 = angle + Math.PI / 6;
        g.moveTo(x1 + arrowLen * Math.cos(a1), y1 + arrowLen * Math.sin(a1));
        g.lineTo(x1, y1);
        g.lineTo(x1 + arrowLen * Math.cos(a2), y1 + arrowLen * Math.sin(a2));
      }
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

    const isLine = layer.type === "line" || layer.shapeType === "line" || layer.shapeType === "arrow";
    const hasFill = Boolean(s.backgroundColor && s.backgroundColor !== "transparent" && s.backgroundColor !== "none");

    if (!isLine && hasFill) {
      g.fill({ color: fillColor, alpha: s.opacity ?? 1 });
    }

    if (isLine) {
      const lineStrokeHex = s.borderColor || s.backgroundColor || "#3b82f6";
      const strokeColor = parseInt(lineStrokeHex.replace("#", ""), 16) || 0x3b82f6;
      const lineWidth = s.borderWidth && s.borderWidth > 0 ? s.borderWidth : 3;
      g.stroke({ color: strokeColor, width: lineWidth });
    } else if (s.borderWidth && s.borderWidth > 0 && s.borderColor && s.borderColor !== "transparent") {
      const strokeColor = parseInt(s.borderColor.replace("#", ""), 16) || 0xffffff;
      g.stroke({ color: strokeColor, width: s.borderWidth });
    }
  }

  private drawIcon(g: Graphics, layer: any) {
    g.clear();
    const s = layer.style;
    const w = typeof s.width === "number" ? s.width : 48;
    const h = typeof s.height === "number" ? s.height : 48;
    const strokeHex = (s.color as string) || (s.borderColor as string) || "#ffffff";
    const strokeColor = parseInt(strokeHex.replace("#", ""), 16) || 0xffffff;
    const strokeWidth = layer.strokeWidth || s.borderWidth || 2;

    // Render crisp geometric vector icon mark
    g.roundRect(4, 4, w - 8, h - 8, 8);
    g.stroke({ color: strokeColor, width: strokeWidth });
    g.circle(w / 2, h / 2, Math.max(3, (w - 16) / 4));
    g.stroke({ color: strokeColor, width: strokeWidth });
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

    const hasBg = Boolean(
      (screen.background && screen.background.fill && screen.background.fill !== "transparent") ||
      (screen.backgroundColor && screen.backgroundColor !== "transparent")
    );

    if (this.isTransparent || !hasBg) {
      this.artboardBg.visible = false;
      if (this.app?.renderer?.background) {
        this.app.renderer.background.alpha = 0.0;
      }
    } else {
      this.artboardBg.visible = true;
      if (this.app?.renderer?.background) {
        this.app.renderer.background.alpha = 1.0;
      }
    }

    const computedStyles = evaluateSceneAtTime(
      screen.layers,
      time,
      0,
      screen.stepFps,
      screen.background
    );

    if (screen.background && this.artboardBg && this.artboardBg.visible) {
      const bgStyle = computedStyles[screen.background.id];
      if (bgStyle) {
        if (bgStyle.opacity !== undefined) {
          this.artboardBg.alpha = Number(bgStyle.opacity);
        }
        if (bgStyle.background || bgStyle.backgroundColor) {
          const bgFill = String(bgStyle.background || bgStyle.backgroundColor);
          this.updateArtboardBackground(
            screen.width || this.options.artboardWidth,
            screen.height || this.options.artboardHeight,
            bgFill
          );
        }
      }
    }

    const layerMap = new Map<string, Layer>();
    const collectLayers = (layers: Layer[]) => {
      for (const l of layers) {
        layerMap.set(l.id, l);
        if (l.children) collectLayers(l.children);
      }
    };
    collectLayers(screen.layers);

    for (const [id, dobj] of this.layerDisplayObjects.entries()) {
      const style = computedStyles[id];
      const layer = layerMap.get(id);

      if (style) {
        if (style.opacity !== undefined) {
          dobj.alpha = Number(style.opacity);
        }

        const baseX = (dobj as any).__baseX ?? dobj.x;
        const baseY = (dobj as any).__baseY ?? dobj.y;
        const baseScaleX = (dobj as any).__baseScaleX ?? 1;
        const baseScaleY = (dobj as any).__baseScaleY ?? 1;
        const baseRotation = (dobj as any).__baseRotation ?? 0;

        let tx = 0;
        let ty = 0;
        let sx = 1;
        let sy = 1;
        let rotDeg = 0;

        if (style.transform) {
          // translate3d(x px, y px, z px)
          const t3d = style.transform.match(/translate3d\(([-0-9.]+)px,\s*([-0-9.]+)px/);
          if (t3d) {
            tx = parseFloat(t3d[1]) || 0;
            ty = parseFloat(t3d[2]) || 0;
          } else {
            const t2d = style.transform.match(/translate\(([-0-9.]+)px,\s*([-0-9.]+)px\)/);
            if (t2d) {
              tx = parseFloat(t2d[1]) || 0;
              ty = parseFloat(t2d[2]) || 0;
            } else {
              const txMatch = style.transform.match(/translateX\(([-0-9.]+)px\)/);
              if (txMatch) tx = parseFloat(txMatch[1]) || 0;
              const tyMatch = style.transform.match(/translateY\(([-0-9.]+)px\)/);
              if (tyMatch) ty = parseFloat(tyMatch[1]) || 0;
            }
          }

          // scale(sx, sy) or scale(s)
          const s2d = style.transform.match(/scale\(([-0-9.]+),\s*([-0-9.]+)\)/);
          if (s2d) {
            sx = parseFloat(s2d[1]) || 1;
            sy = parseFloat(s2d[2]) || 1;
          } else {
            const s1d = style.transform.match(/scale\(([-0-9.]+)\)/);
            if (s1d) {
              const val = parseFloat(s1d[1]);
              if (!isNaN(val)) {
                sx = val;
                sy = val;
              }
            }
          }

          // rotate(deg)
          const rotMatch = style.transform.match(/rotate\(([-0-9.]+)deg\)/);
          if (rotMatch) {
            rotDeg = parseFloat(rotMatch[1]) || 0;
          }
        }

        const wVal = (dobj as any).__baseW || (typeof layer?.style.width === "number" ? layer.style.width : 0);
        const hVal = (dobj as any).__baseH || (typeof layer?.style.height === "number" ? layer.style.height : 0);
        const pivotX = (dobj as any).__pivotX ?? 0.5;
        const pivotY = (dobj as any).__pivotY ?? 0.5;

        // Dynamic width/height resize during seek
        const targetW = style.width !== undefined ? parseFloat(String(style.width)) : wVal;
        const targetH = style.height !== undefined ? parseFloat(String(style.height)) : hVal;
        if (!isNaN(targetW) && !isNaN(targetH) && (targetW !== (dobj as any).__lastW || targetH !== (dobj as any).__lastH)) {
          (dobj as any).__lastW = targetW;
          (dobj as any).__lastH = targetH;
          if ((dobj as any).__shapeChild) {
            const shapeLayer = { ...layer, style: { ...layer?.style, width: targetW, height: targetH } };
            this.drawShape((dobj as any).__shapeChild, shapeLayer as any);
          } else if ((dobj as any).__bgGraphics) {
            const groupLayer = { ...layer, style: { ...layer?.style, width: targetW, height: targetH } };
            this.drawGroupBackground((dobj as any).__bgGraphics, groupLayer as any);
          }
        }

        // Clip-path reveals (e.g. maskReveal, lineReveal, drawOn)
        if (style.clipPath) {
          const insetMatch = String(style.clipPath).match(/inset\(([-0-9.]+)%?\s+([-0-9.]+)%?\s+([-0-9.]+)%?\s+([-0-9.]+)%?\)/);
          if (insetMatch) {
            const topPct = parseFloat(insetMatch[1]) / 100;
            const rightPct = parseFloat(insetMatch[2]) / 100;
            const bottomPct = parseFloat(insetMatch[3]) / 100;
            const leftPct = parseFloat(insetMatch[4]) / 100;

            let clipMask = (dobj as any).__clipMask;
            if (!clipMask) {
              clipMask = new Graphics();
              (dobj as any).__clipMask = clipMask;
              dobj.addChild(clipMask);
              dobj.mask = clipMask;
            }
            clipMask.clear();
            const curW = (dobj as any).__lastW || targetW;
            const curH = (dobj as any).__lastH || targetH;
            const cx = curW * leftPct;
            const cy = curH * topPct;
            const cw = Math.max(0, curW * (1 - leftPct - rightPct));
            const ch = Math.max(0, curH * (1 - topPct - bottomPct));
            clipMask.rect(cx, cy, cw, ch);
            clipMask.fill({ color: 0xffffff });
          }
        } else if ((dobj as any).__clipMask) {
          dobj.mask = null;
          (dobj as any).__clipMask.destroy();
          (dobj as any).__clipMask = null;
        }

        // Rolling Counter evaluation
        if ((layer as any)?.type === "counter" && (dobj as any).__textChild) {
          const val = evaluateCounterValue(layer as any, time);
          (dobj as any).__textChild.text = String(val);
          this.positionTextObject((dobj as any).__textChild, layer);
        }

        const leftPos = style.left !== undefined ? parseFloat(String(style.left)) : baseX;
        const topPos = style.top !== undefined ? parseFloat(String(style.top)) : baseY;
        const curW = (dobj as any).__lastW || targetW;
        const curH = (dobj as any).__lastH || targetH;

        dobj.pivot.set(curW * pivotX, curH * pivotY);
        dobj.x = (isNaN(leftPos) ? baseX : leftPos) + tx + curW * pivotX;
        dobj.y = (isNaN(topPos) ? baseY : topPos) + ty + curH * pivotY;
        dobj.scale.set(baseScaleX * sx, baseScaleY * sy);
        dobj.rotation = baseRotation + (rotDeg * Math.PI) / 180;

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

        // Update kinetic counter text if present
        if (layer?.type === "counter" && (dobj as any).__textChild) {
          const val = (layer as any).renderedValue || (layer as any).content;
          if (val !== undefined) {
            (dobj as any).__textChild.text = String(val);
          }
        }
      }
    }

    if (this.app.renderer) {
      this.app.renderer.render(this.app.stage);
    }
  }

  public renderTransition(
    fromScreen: Screen,
    toScreen: Screen,
    rawProgress: number,
    transition: SceneTransition
  ): void {
    if (!this.isReady || !fromScreen || !toScreen) return;

    const easeType = transition?.easing || (transition?.type === "magicMove" ? "snappy" : "smooth");
    const easeFn = getEasing(easeType);
    const p = easeFn(Math.max(0, Math.min(1, rawProgress)));

    // 1. Dynamic background transition
    if (!this.isTransparent) {
      this.artboardBg.visible = true;
      const fromBg = fromScreen.backgroundColor || this.options.backgroundColor || "#18181b";
      const toBg = toScreen.backgroundColor || this.options.backgroundColor || "#18181b";
      const currentBg = this.lerpColorHex(fromBg, toBg, p);
      this.updateArtboardBackground(
        toScreen.width || this.options.artboardWidth,
        toScreen.height || this.options.artboardHeight,
        currentBg
      );
    }

    // 2. Evaluate boundary states
    const fromStyles = evaluateSceneAtTime(fromScreen.layers, fromScreen.duration || 5.0);
    const toStyles = evaluateSceneAtTime(toScreen.layers, 0);

    const fromLayerMap = new Map<string, Layer>();
    const collectFrom = (layers: Layer[]) => {
      for (const l of layers) {
        fromLayerMap.set(l.id, l);
        if (l.children) collectFrom(l.children);
      }
    };
    collectFrom(fromScreen.layers);

    const toLayerMap = new Map<string, Layer>();
    const collectTo = (layers: Layer[]) => {
      for (const l of layers) {
        toLayerMap.set(l.id, l);
        if (l.children) collectTo(l.children);
      }
    };
    collectTo(toScreen.layers);

    // Ensure all layers from both scenes exist in layerDisplayObjects
    for (const [id, layer] of fromLayerMap.entries()) {
      if (!this.layerDisplayObjects.has(id)) {
        const dobj = this.createDisplayObject(layer);
        this.layerDisplayObjects.set(id, dobj);
        this.layersContainer.addChild(dobj);
      }
    }
    for (const [id, layer] of toLayerMap.entries()) {
      if (!this.layerDisplayObjects.has(id)) {
        const dobj = this.createDisplayObject(layer);
        this.layerDisplayObjects.set(id, dobj);
        this.layersContainer.addChild(dobj);
      }
    }

    const artboardW = toScreen.width || this.options.artboardWidth || 1920;
    const artboardH = toScreen.height || this.options.artboardHeight || 1080;
    const transType = transition?.type || "magicMove";

    const parseTranslate = (transformStr?: string): { tx: number; ty: number; sx: number; sy: number; rotDeg: number } => {
      let tx = 0, ty = 0, sx = 1, sy = 1, rotDeg = 0;
      if (!transformStr) return { tx, ty, sx, sy, rotDeg };

      const t3d = transformStr.match(/translate3d\(([-0-9.]+)px,\s*([-0-9.]+)px/);
      if (t3d) {
        tx = parseFloat(t3d[1]) || 0;
        ty = parseFloat(t3d[2]) || 0;
      } else {
        const t2d = transformStr.match(/translate\(([-0-9.]+)px,\s*([-0-9.]+)px\)/);
        if (t2d) {
          tx = parseFloat(t2d[1]) || 0;
          ty = parseFloat(t2d[2]) || 0;
        }
      }

      const s2d = transformStr.match(/scale\(([-0-9.]+)(?:,\s*([-0-9.]+))?\)/);
      if (s2d) {
        sx = parseFloat(s2d[1]) || 1;
        sy = s2d[2] !== undefined ? parseFloat(s2d[2]) || 1 : sx;
      }

      const rotMatch = transformStr.match(/rotate\(([-0-9.]+)deg\)/);
      if (rotMatch) {
        rotDeg = parseFloat(rotMatch[1]) || 0;
      }

      return { tx, ty, sx, sy, rotDeg };
    };

    // 3. Update each display object
    const allIds = new Set([...fromLayerMap.keys(), ...toLayerMap.keys()]);

    for (const id of allIds) {
      const dobj = this.layerDisplayObjects.get(id);
      if (!dobj) continue;

      const fromLayer = fromLayerMap.get(id);
      const toLayer = toLayerMap.get(id);

      if (fromLayer && toLayer) {
        // MAGIC MOVE: Element exists in both scenes!
        const fromStyle = fromStyles[id];
        const toStyle = toStyles[id];

        const fromT = parseTranslate(fromStyle?.transform);
        const toT = parseTranslate(toStyle?.transform);

        const fromBaseX = (fromLayer.style.x ?? 0);
        const fromBaseY = (fromLayer.style.y ?? 0);
        const toBaseX = (toLayer.style.x ?? 0);
        const toBaseY = (toLayer.style.y ?? 0);

        const fromX = fromBaseX + fromT.tx;
        const fromY = fromBaseY + fromT.ty;
        const toX = toBaseX + toT.tx;
        const toY = toBaseY + toT.ty;

        const fromW = typeof fromLayer.style.width === "number" ? fromLayer.style.width : 100;
        const toW = typeof toLayer.style.width === "number" ? toLayer.style.width : 100;
        const fromH = typeof fromLayer.style.height === "number" ? fromLayer.style.height : 100;
        const toH = typeof toLayer.style.height === "number" ? toLayer.style.height : 100;

        const fromAlpha = fromStyle?.opacity !== undefined ? Number(fromStyle.opacity) : (fromLayer.style.opacity ?? 1);
        const toAlpha = toStyle?.opacity !== undefined ? Number(toStyle.opacity) : (toLayer.style.opacity ?? 1);

        const curX = fromX + (toX - fromX) * p;
        const curY = fromY + (toY - fromY) * p;
        const curW = fromW + (toW - fromW) * p;
        const curH = fromH + (toH - fromH) * p;
        const curAlpha = fromAlpha + (toAlpha - fromAlpha) * p;
        const curScaleX = fromT.sx + (toT.sx - fromT.sx) * p;
        const curScaleY = fromT.sy + (toT.sy - fromT.sy) * p;
        const curRot = fromT.rotDeg + (toT.rotDeg - fromT.rotDeg) * p;

        const pivotX = (dobj as any).__pivotX ?? 0.5;
        const pivotY = (dobj as any).__pivotY ?? 0.5;
        dobj.pivot.set(curW * pivotX, curH * pivotY);
        dobj.x = curX + curW * pivotX;
        dobj.y = curY + curH * pivotY;
        dobj.scale.set(curScaleX, curScaleY);
        dobj.rotation = (curRot * Math.PI) / 180;
        dobj.alpha = Math.max(0, Math.min(1, curAlpha));

        if (toLayer.type === "text" || fromLayer.type === "text") {
          const fromFs = fromLayer.style.fontSize || 32;
          const toFs = toLayer.style.fontSize || 32;
          const curFs = Math.round(fromFs + (toFs - fromFs) * p);
          if ((dobj as any).style) {
            (dobj as any).style.fontSize = curFs;
          }
        }
      } else if (fromLayer && !toLayer) {
        // Outgoing element only in fromScreen
        const fromStyle = fromStyles[id];
        const fromT = parseTranslate(fromStyle?.transform);
        const fromX = (fromLayer.style.x ?? 0) + fromT.tx;
        const fromY = (fromLayer.style.y ?? 0) + fromT.ty;
        const fromW = typeof fromLayer.style.width === "number" ? fromLayer.style.width : 100;
        const fromH = typeof fromLayer.style.height === "number" ? fromLayer.style.height : 100;
        const fromAlpha = fromStyle?.opacity !== undefined ? Number(fromStyle.opacity) : (fromLayer.style.opacity ?? 1);

        const pivotX = (dobj as any).__pivotX ?? 0.5;
        const pivotY = (dobj as any).__pivotY ?? 0.5;
        dobj.pivot.set(fromW * pivotX, fromH * pivotY);

        if (transType === "slideLeft") {
          dobj.x = fromX - artboardW * p + fromW * pivotX;
          dobj.y = fromY + fromH * pivotY;
          dobj.alpha = fromAlpha;
        } else if (transType === "slideRight") {
          dobj.x = fromX + artboardW * p + fromW * pivotX;
          dobj.y = fromY + fromH * pivotY;
          dobj.alpha = fromAlpha;
        } else if (transType === "slideUp") {
          dobj.x = fromX + fromW * pivotX;
          dobj.y = fromY - artboardH * p + fromH * pivotY;
          dobj.alpha = fromAlpha;
        } else if (transType === "slideDown") {
          dobj.x = fromX + fromW * pivotX;
          dobj.y = fromY + artboardH * p + fromH * pivotY;
          dobj.alpha = fromAlpha;
        } else {
          dobj.x = fromX + fromW * pivotX;
          dobj.y = fromY + fromH * pivotY;
          dobj.alpha = Math.max(0, fromAlpha * (1 - p));
        }
      } else if (toLayer && !fromLayer) {
        // Incoming element only in toScreen
        const toStyle = toStyles[id];
        const toT = parseTranslate(toStyle?.transform);
        const toX = (toLayer.style.x ?? 0) + toT.tx;
        const toY = (toLayer.style.y ?? 0) + toT.ty;
        const toW = typeof toLayer.style.width === "number" ? toLayer.style.width : 100;
        const toH = typeof toLayer.style.height === "number" ? toLayer.style.height : 100;
        const toAlpha = toStyle?.opacity !== undefined ? Number(toStyle.opacity) : (toLayer.style.opacity ?? 1);

        const pivotX = (dobj as any).__pivotX ?? 0.5;
        const pivotY = (dobj as any).__pivotY ?? 0.5;
        dobj.pivot.set(toW * pivotX, toH * pivotY);

        if (transType === "slideLeft") {
          dobj.x = toX + artboardW * (1 - p) + toW * pivotX;
          dobj.y = toY + toH * pivotY;
          dobj.alpha = toAlpha;
        } else if (transType === "slideRight") {
          dobj.x = toX - artboardW * (1 - p) + toW * pivotX;
          dobj.y = toY + toH * pivotY;
          dobj.alpha = toAlpha;
        } else if (transType === "slideUp") {
          dobj.x = toX + toW * pivotX;
          dobj.y = toY + artboardH * (1 - p) + toH * pivotY;
          dobj.alpha = toAlpha;
        } else if (transType === "slideDown") {
          dobj.x = toX + toW * pivotX;
          dobj.y = toY - artboardH * (1 - p) + toH * pivotY;
          dobj.alpha = toAlpha;
        } else {
          dobj.x = toX + toW * pivotX;
          dobj.y = toY + toH * pivotY;
          dobj.alpha = Math.max(0, toAlpha * p);
        }
      }
    }

    if (this.app.renderer) {
      this.app.renderer.render(this.app.stage);
    }
  }

  private lerpColorHex(hexA: string, hexB: string, t: number): string {
    const parse = (h: string) => {
      const clean = h.replace("#", "");
      if (clean.length === 3) {
        return [
          parseInt(clean[0] + clean[0], 16),
          parseInt(clean[1] + clean[1], 16),
          parseInt(clean[2] + clean[2], 16),
        ];
      }
      return [
        parseInt(clean.slice(0, 2), 16) || 0,
        parseInt(clean.slice(2, 4), 16) || 0,
        parseInt(clean.slice(4, 6), 16) || 0,
      ];
    };
    const cA = parse(hexA);
    const cB = parse(hexB);
    const r = Math.round(cA[0] + (cB[0] - cA[0]) * t);
    const g = Math.round(cA[1] + (cB[1] - cA[1]) * t);
    const b = Math.round(cA[2] + (cB[2] - cA[2]) * t);
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
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
