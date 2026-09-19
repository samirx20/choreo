import { getProject, types, IProject, ISheet, ISheetObject } from "@theatre/core";
import { Layer, Screen } from "@/types/scene";

export interface LayerAnimationValues {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  opacity: number;
  filterBlur: number;
}

export class TheatreController {
  private project: IProject;
  private currentSheet: ISheet | null = null;
  private sheetObjects = new Map<string, ISheetObject<any>>();
  private onValueChangeCallbacks = new Map<string, (values: LayerAnimationValues) => void>();
  private onTimeUpdateCallback?: (time: number) => void;
  private isStudioInitialized = false;

  constructor() {
    this.project = getProject("MotionStudio", {
      state: { definitionVersion: "0.4.0", sheetsById: {} },
    });
  }

  public async initStudio(): Promise<void> {
    if (this.isStudioInitialized) return;
    try {
      const studioMod = await import("@theatre/studio");
      const studio = (studioMod as any).default?.default || (studioMod as any).default || studioMod;
      studio.initialize();
      this.isStudioInitialized = true;
      if (studio?.ui?.hide) {
        studio.ui.hide();
      }
    } catch (e) {
      console.warn("Theatre.js Studio already initialized or failed to initialize:", e);
    }
  }

  public async openStudio(layerId?: string): Promise<void> {
    await this.initStudio();
    try {
      const studioMod = await import("@theatre/studio");
      const studio = (studioMod as any).default?.default || (studioMod as any).default || studioMod;
      if (studio?.ui?.restore) {
        studio.ui.restore();
      }
      if (typeof document !== "undefined") {
        const roots = document.querySelectorAll("#theatrejs-studio-root, .theatrejs-studio-root");
        roots.forEach((el) => {
          (el as HTMLElement).style.display = "";
          (el as HTMLElement).classList.add("theatre-visible");
        });
      }
      if (layerId && this.sheetObjects.has(layerId) && studio?.setSelection) {
        studio.setSelection([this.sheetObjects.get(layerId)]);
      }
    } catch (e) {
      console.warn("Could not open Theatre Studio:", e);
    }
  }

  public async hideStudio(): Promise<void> {
    try {
      const studioMod = await import("@theatre/studio");
      const studio = (studioMod as any).default?.default || (studioMod as any).default || studioMod;
      if (studio?.ui?.hide) {
        studio.ui.hide();
      }
      if (typeof document !== "undefined") {
        const roots = document.querySelectorAll("#theatrejs-studio-root, .theatrejs-studio-root");
        roots.forEach((el) => {
          (el as HTMLElement).style.display = "none";
          (el as HTMLElement).classList.remove("theatre-visible");
        });
      }
    } catch {
      // ignore
    }
  }

  public setScreen(screen: Screen): ISheet {
    this.currentSheet = this.project.sheet(screen.name || screen.id);
    this.syncLayers(screen.layers);
    return this.currentSheet;
  }

  public syncLayers(layers: Layer[]) {
    if (!this.currentSheet) return;

    const flattenLayers = (list: Layer[]): Layer[] => {
      const result: Layer[] = [];
      for (const l of list) {
        result.push(l);
        if (l.type === "group" && l.children) {
          result.push(...flattenLayers(l.children));
        }
      }
      return result;
    };

    const allLayers = flattenLayers(layers);

    for (const layer of allLayers) {
      if (!this.sheetObjects.has(layer.id)) {
        const s = layer.style;
        const sheetObj = this.currentSheet.object(
          layer.name || layer.id,
          {
            x: types.number(s.x || 0, { range: [-2000, 4000] }),
            y: types.number(s.y || 0, { range: [-2000, 4000] }),
            scaleX: types.number(s.scaleX ?? 1, { range: [0, 10] }),
            scaleY: types.number(s.scaleY ?? 1, { range: [0, 10] }),
            rotation: types.number(s.rotation || 0, { range: [-360, 360] }),
            opacity: types.number(s.opacity ?? 1, { range: [0, 1] }),
            filterBlur: types.number(s.filterBlur || 0, { range: [0, 100] }),
          },
          { reconfigure: true }
        );

        sheetObj.onValuesChange((values) => {
          const cb = this.onValueChangeCallbacks.get(layer.id);
          if (cb) {
            cb(values as LayerAnimationValues);
          }
        });

        this.sheetObjects.set(layer.id, sheetObj);
      }
    }
  }

  public registerValueCallback(layerId: string, cb: (values: LayerAnimationValues) => void) {
    this.onValueChangeCallbacks.set(layerId, cb);
  }

  public unregisterValueCallback(layerId: string) {
    this.onValueChangeCallbacks.delete(layerId);
  }

  public play(duration = 5.0, loop = true) {
    if (!this.currentSheet) return;
    this.currentSheet.sequence.play({
      iterationCount: loop ? Infinity : 1,
      range: [0, duration],
    });
  }

  public pause() {
    if (!this.currentSheet) return;
    this.currentSheet.sequence.pause();
  }

  public seek(timeInSeconds: number) {
    if (!this.currentSheet) return;
    this.currentSheet.sequence.position = timeInSeconds;
  }

  public getPosition(): number {
    if (!this.currentSheet) return 0;
    return this.currentSheet.sequence.position;
  }

  public exportState(): any {
    return (this.project as any).export ? (this.project as any).export() : null;
  }
}

export const theatreController = new TheatreController();
