/**
 * ViewportMatrix.ts
 * Centralized 2D Affine Transformation & Projection Engine for Motion Studio
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface Rect2D {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CameraState {
  pan: Point2D; // Screen pixel translation
  zoom: number; // User zoom factor (1 = fit baseline)
  baseScale: number; // Viewport fit scale relative to container
}

export class ViewportMatrix {
  public readonly effectiveScale: number;
  public readonly pan: Point2D;
  public readonly containerRect: Rect2D;
  public readonly artboardSize: Point2D;

  constructor(camera: CameraState, containerRect: Rect2D, artboardSize: Point2D) {
    this.effectiveScale = camera.baseScale * camera.zoom;
    this.pan = camera.pan;
    this.containerRect = containerRect;
    this.artboardSize = artboardSize;
  }

  /**
   * Screen origin of the artboard (top-left corner of the canvas on the physical screen)
   */
  public get artboardScreenOrigin(): Point2D {
    const centerScreenX = this.containerRect.x + this.containerRect.width / 2;
    const centerScreenY = this.containerRect.y + this.containerRect.height / 2;

    return {
      x: centerScreenX + this.pan.x - (this.artboardSize.x * this.effectiveScale) / 2,
      y: centerScreenY + this.pan.y - (this.artboardSize.y * this.effectiveScale) / 2,
    };
  }

  /**
   * Converts Screen/Window coordinates (e.g. clientX, clientY) to Artboard/World space
   */
  public screenToWorld(screenPoint: Point2D): Point2D {
    const origin = this.artboardScreenOrigin;
    return {
      x: (screenPoint.x - origin.x) / this.effectiveScale,
      y: (screenPoint.y - origin.y) / this.effectiveScale,
    };
  }

  /**
   * Converts Artboard/World coordinates to Physical Screen coordinates
   */
  public worldToScreen(worldPoint: Point2D): Point2D {
    const origin = this.artboardScreenOrigin;
    return {
      x: origin.x + worldPoint.x * this.effectiveScale,
      y: origin.y + worldPoint.y * this.effectiveScale,
    };
  }

  /**
   * Converts a delta distance from Screen to World
   */
  public screenDeltaToWorld(delta: Point2D): Point2D {
    return {
      x: delta.x / this.effectiveScale,
      y: delta.y / this.effectiveScale,
    };
  }

  /**
   * Converts a delta distance from World to Screen
   */
  public worldDeltaToScreen(delta: Point2D): Point2D {
    return {
      x: delta.x * this.effectiveScale,
      y: delta.y * this.effectiveScale,
    };
  }

  /**
   * Projects a World rectangle into a Screen rectangle (for screen-space overlays)
   */
  public worldRectToScreen(rect: Rect2D): Rect2D {
    const screenTopLeft = this.worldToScreen({ x: rect.x, y: rect.y });
    return {
      x: screenTopLeft.x,
      y: screenTopLeft.y,
      width: rect.width * this.effectiveScale,
      height: rect.height * this.effectiveScale,
    };
  }

  /**
   * Converts a fixed physical screen snap threshold (e.g. 8px) into current world units
   */
  public getScreenSnapThresholdInWorld(screenPx = 8): number {
    return screenPx / this.effectiveScale;
  }

  /**
   * Computes the new camera pan when zooming around an arbitrary screen anchor (e.g. cursor point)
   */
  public static calculateZoomAtPoint(
    cursorScreen: Point2D,
    containerRect: Rect2D,
    currentPan: Point2D,
    currentZoom: number,
    nextZoom: number
  ): Point2D {
    const centerScreenX = containerRect.x + containerRect.width / 2;
    const centerScreenY = containerRect.y + containerRect.height / 2;

    // Cursor position relative to viewport center
    const mouseRelCenterX = cursorScreen.x - centerScreenX;
    const mouseRelCenterY = cursorScreen.y - centerScreenY;

    const zoomRatio = nextZoom / currentZoom;

    return {
      x: mouseRelCenterX - (mouseRelCenterX - currentPan.x) * zoomRatio,
      y: mouseRelCenterY - (mouseRelCenterY - currentPan.y) * zoomRatio,
    };
  }

  /**
   * Calculates Camera settings for 'Fit to Screen' (with configurable margin)
   */
  public static calculateFitToScreen(
    containerWidth: number,
    containerHeight: number,
    artboardWidth: number,
    artboardHeight: number,
    margin = 80
  ): { baseScale: number; zoom: number; pan: Point2D } {
    const availW = Math.max(containerWidth - margin, 100);
    const availH = Math.max(containerHeight - margin, 100);

    const fitScale = Math.min(availW / artboardWidth, availH / artboardHeight, 1.0);

    return {
      baseScale: fitScale,
      zoom: 1.0,
      pan: { x: 0, y: 0 },
    };
  }

  /**
   * Calculates Camera settings for '100% Actual Size' (1 artboard pixel = 1 screen pixel)
   */
  public static calculateActualSize(baseScale: number): { zoom: number; pan: Point2D } {
    return {
      zoom: 1.0 / Math.max(baseScale, 0.001),
      pan: { x: 0, y: 0 },
    };
  }
}
