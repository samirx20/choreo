import { useProjectStore } from "@/store/useProjectStore";
import { SceneDocument, Screen, Layer, TextLayer, IconLayer, CounterLayer } from "@/types/scene";
import { GetStoryboardStateInput, GetStoryboardStateInputSchema, ToolResult } from "@/types/agentTools";

export interface CompactLayerAST {
  id: string;
  name: string;
  type: string;
  grid?: { col: number; row: number; colSpan: number; rowSpan: number };
  content?: string;
  iconName?: string;
  inAnimation?: string;
}

export interface CompactSceneAST {
  id: string;
  name: string;
  duration: number;
  mood?: string;
  stepFps?: string | number;
  layers?: CompactLayerAST[];
}

export interface CompactStoryboardAST {
  title: string;
  totalDuration: number;
  resolution: string;
  fps: number;
  scenes: CompactSceneAST[];
}

/**
 * Agent Tool: get_storyboard_state.
 * Returns a token-efficient AST representation of the current storyboard.
 */
export function getStoryboardState(
  rawInput?: GetStoryboardStateInput,
  targetStore = useProjectStore
): ToolResult<CompactStoryboardAST | SceneDocument> {
  const parseResult = GetStoryboardStateInputSchema.safeParse(rawInput || {});
  const input = parseResult.success ? parseResult.data : { format: "compact" as const, includeLayers: true };

  const state = targetStore.getState();
  const doc = state.document;

  if (input.format === "detailed") {
    return {
      success: true,
      data: doc,
      notices: [],
    };
  }

  let totalDuration = 0;
  const scenes: CompactSceneAST[] = doc.screens.map((screen: Screen) => {
    totalDuration += screen.duration || 3.0;

    const sceneAST: CompactSceneAST = {
      id: screen.id,
      name: screen.name,
      duration: screen.duration || 3.0,
      mood: screen.mood,
      stepFps: screen.stepFps,
    };

    if (input.includeLayers) {
      sceneAST.layers = screen.layers.map((layer: Layer) => {
        const item: CompactLayerAST = {
          id: layer.id,
          name: layer.name,
          type: layer.type,
          grid: layer.grid,
        };

        if (layer.type === "text") {
          item.content = (layer as TextLayer).content;
        } else if (layer.type === "icon") {
          item.iconName = (layer as IconLayer).iconName;
        } else if (layer.type === "counter") {
          item.content = `${(layer as CounterLayer).startValue} -> ${(layer as CounterLayer).endValue}`;
        }

        if (layer.animation?.in?.preset) {
          item.inAnimation = `${layer.animation.in.preset} (${layer.animation.in.easing || "snappy"})`;
        }

        return item;
      });
    }

    return sceneAST;
  });

  return {
    success: true,
    data: {
      title: doc.name,
      totalDuration: Math.round(totalDuration * 100) / 100,
      resolution: `${doc.settings.width}x${doc.settings.height}`,
      fps: doc.settings.fps,
      scenes,
    },
    notices: [],
  };
}
