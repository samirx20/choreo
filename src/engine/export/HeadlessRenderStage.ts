import { PixiStage } from "@/engine/pixi/PixiStage";
import { Screen, ProjectSettings } from "@/types/scene";

/**
 * HeadlessRenderStage:
 * Dynamically instantiates an offscreen PixiJS stage for headless background video
 * rendering, offline frame exports, and environments where the main canvas is unmounted.
 */
export class HeadlessRenderStage {
  private stage: PixiStage | null = null;
  private canvas: HTMLCanvasElement | null = null;

  public async init(settings: ProjectSettings): Promise<PixiStage> {
    const width = settings.width || 1920;
    const height = settings.height || 1080;

    if (typeof document !== "undefined") {
      this.canvas = document.createElement("canvas");
      this.canvas.width = width;
      this.canvas.height = height;
    } else {
      this.canvas = {} as any;
    }

    this.stage = new PixiStage({
      canvas: this.canvas!,
      width,
      height,
      artboardWidth: width,
      artboardHeight: height,
      backgroundColor: settings.backgroundColor || "#18181b",
    });

    await this.stage.init();
    return this.stage;
  }

  public seekAndRender(time: number, screen: Screen): void {
    if (!this.stage) return;
    this.stage.seek(time, screen);
  }

  public async extractPixels(): Promise<Uint8ClampedArray> {
    if (!this.stage) return new Uint8ClampedArray(0);
    const px = await this.stage.extractPixels();
    return px instanceof Uint8ClampedArray
      ? px
      : new Uint8ClampedArray(px.buffer, px.byteOffset, px.byteLength);
  }

  public getStage(): PixiStage | null {
    return this.stage;
  }

  public destroy(): void {
    if (this.stage) {
      this.stage.destroy();
      this.stage = null;
    }
    if (this.canvas) {
      this.canvas.remove?.();
      this.canvas = null;
    }
  }
}
