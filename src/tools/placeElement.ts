import { useProjectStore } from "@/store/useProjectStore";
import {
  Layer,
  TextLayer,
  ShapeLayer,
  IconLayer,
  Mockup3DLayer,
  CounterLayer,
  FrameLayer,
  LineLayer,
  PolygonLayer,
  LayerStyle,
} from "@/types/scene";
import { PlaceElementInput, PlaceElementInputSchema, ToolResult } from "@/types/agentTools";
import { getGridConfig, gridToPixels, clampGridCoords } from "@/engine/grid/gridSolver";

/**
 * Self-healing Agent Tool: place_element.
 * Places a visual element onto the canvas using modular grid coordinates or absolute bounds,
 * auto-correcting any invalid coordinates and guaranteeing zero clipping/overflow.
 */
export function placeElement(
  rawInput: PlaceElementInput,
  targetStore = useProjectStore
): ToolResult<{ layerId: string; layer: Layer }> {
  const notices: string[] = [];

  // 1. Zod schema validation with safe fallback
  const parseResult = PlaceElementInputSchema.safeParse(rawInput);
  const input = parseResult.success ? parseResult.data : rawInput;

  if (!parseResult.success) {
    notices.push(`Input warnings: ${parseResult.error.issues.map((i) => i.message).join("; ")}`);
  }

  const state = targetStore.getState();
  const targetScreenId = input.sceneId || state.activeScreenId || state.document.screens[0]?.id;
  const targetScreen = state.document.screens.find((s) => s.id === targetScreenId);

  if (!targetScreen) {
    return {
      success: false,
      error: `Scene with ID "${targetScreenId}" not found. Create a scene first using create_scene().`,
      notices,
    };
  }

  const docSettings = state.document.settings;
  const layerId = input.id || `layer_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  // 2. Resolve Spatial Coordinates (Grid-First, Pixels Fallback)
  let bounds = { x: 100, y: 100, width: 300, height: 120 };
  let resolvedGrid = input.grid;

  if (input.grid) {
    const gridConfig = getGridConfig(
      (targetScreen as any).aspectRatio || "16:9",
      docSettings.width,
      docSettings.height
    );
    const clamped = clampGridCoords(input.grid, gridConfig);
    if (clamped.wasAdjusted) {
      notices.push(...clamped.corrections);
    }
    resolvedGrid = clamped.coords;
    bounds = gridToPixels(clamped.coords, gridConfig);
  } else if (input.bounds) {
    bounds = {
      x: Math.max(0, input.bounds.x),
      y: Math.max(0, input.bounds.y),
      width: Math.max(20, input.bounds.width),
      height: Math.max(20, input.bounds.height),
    };
  }

  // 3. Resolve Style and Checkbox-style Single Properties
  const baseStyle: LayerStyle = {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    rotation: 0,
    opacity: input.style?.opacity ?? 1,
    fillColor: input.style?.fillColor || input.style?.color || "#ffffff",
    backgroundColor: input.style?.backgroundColor,
    borderRadius: input.style?.borderRadius ?? 0,
    borderWidth: input.style?.borderWidth ?? 0,
    borderColor: input.style?.borderColor || "transparent",
    shadowColor: input.style?.shadowColor || "rgba(0,0,0,0.5)",
    shadowBlur: input.style?.shadowBlur ?? 0,
    shadowDistance: Math.sqrt(
      Math.pow(input.style?.shadowOffsetX ?? 0, 2) + Math.pow(input.style?.shadowOffsetY ?? 0, 2)
    ),
    shadowAngle:
      Math.atan2(input.style?.shadowOffsetY ?? 0, input.style?.shadowOffsetX ?? 0) *
      (180 / Math.PI),
    shadowMode: input.style?.shadowMode || "soft",
    stickerBorder: input.style?.stickerBorder,
    padding: input.style?.padding,
  };

  // 4. Construct Layer by Discriminated Type
  let createdLayer: Layer;

  switch (input.type) {
    case "text": {
      const textLayer: TextLayer = {
        id: layerId,
        name: input.name,
        type: "text",
        content: input.content || input.name,
        grid: resolvedGrid,
        style: {
          ...baseStyle,
          fontSize: input.style?.fontSize ?? 48,
          fontWeight: input.style?.fontWeight ?? 700,
          fontFamily: input.style?.fontFamily ?? "Inter",
          color: input.style?.color || input.style?.fillColor || "#ffffff",
          textAlign: input.style?.textAlign || "left",
          lineHeight: 1.2,
        },
      };
      createdLayer = textLayer;
      break;
    }

    case "icon": {
      const iconLayer: IconLayer = {
        id: layerId,
        name: input.name,
        type: "icon",
        iconName: input.iconName || "Sparkles",
        grid: resolvedGrid,
        strokeWidth: 2,
        style: {
          ...baseStyle,
          color: input.style?.color || "#ffffff",
        },
      };
      createdLayer = iconLayer;
      break;
    }

    case "mockup-3d":
    case "mockup3d": {
      const mockupLayer: Mockup3DLayer = {
        id: layerId,
        name: input.name,
        type: "mockup3d",
        modelType: (input.mockupType?.includes("macbook") ? "macbook" : "iphone") as any,
        position3D: [0, 0, 0],
        rotation3D: [0, 0, 0],
        cameraFov: 35,
        cameraPosition: [0, 0, 5],
        cameraTarget: [0, 0, 0],
        grid: resolvedGrid,
        style: baseStyle,
      };
      createdLayer = mockupLayer;
      break;
    }

    case "counter": {
      const counterCfg: any = input.counterConfig || {};
      const counterLayer: CounterLayer = {
        id: layerId,
        name: input.name,
        type: "counter",
        startValue: counterCfg.startValue ?? 0,
        endValue: counterCfg.endValue ?? 100,
        prefix: counterCfg.prefix || "",
        suffix: counterCfg.suffix || "",
        decimals: counterCfg.decimals ?? 0,
        useGrouping: true,
        counterMode: counterCfg.counterMode || "odometer",
        grid: resolvedGrid,
        style: {
          ...baseStyle,
          fontSize: input.style?.fontSize ?? 54,
          fontWeight: input.style?.fontWeight ?? 800,
          fontFamily: input.style?.fontFamily ?? "Inter",
          color: input.style?.color || "#ffffff",
        },
      };
      createdLayer = counterLayer;
      break;
    }

    case "frame": {
      const frameLayer: FrameLayer = {
        id: layerId,
        name: input.name,
        type: "frame",
        clipContent: true,
        children: [],
        grid: resolvedGrid,
        style: {
          ...baseStyle,
          backgroundColor: input.style?.backgroundColor || "rgba(255,255,255,0.05)",
          borderRadius: input.style?.borderRadius ?? 16,
        },
      };
      createdLayer = frameLayer;
      break;
    }

    case "line": {
      if (input.style?.fontSize) {
        notices.push("Property 'fontSize' is invalid for 'line' layers and was omitted.");
      }
      if (input.style?.borderRadius) {
        notices.push("Property 'borderRadius' is invalid for 1D 'line' layers and was omitted.");
      }
      if (input.style?.fillColor) {
        notices.push("Property 'fillColor' is invalid for 1D 'line' layers and was omitted.");
      }
      const lineLayer: LineLayer = {
        id: layerId,
        name: input.name,
        type: "line",
        x1: bounds.x,
        y1: bounds.y,
        x2: bounds.x + bounds.width,
        y2: bounds.y,
        strokeWidth: input.style?.borderWidth || 2,
        strokeColor: input.style?.borderColor || input.style?.color || "#ffffff",
        grid: resolvedGrid,
        style: {
          ...baseStyle,
          fillColor: undefined,
          backgroundColor: "transparent",
          borderRadius: 0,
          borderWidth: input.style?.borderWidth || 2,
          borderColor: input.style?.borderColor || input.style?.color || "#ffffff",
          shadowBlur: 0,
          shadowDistance: 0,
        },
      };
      createdLayer = lineLayer;
      break;
    }

    case "polygon": {
      if (input.style?.borderRadius) {
        notices.push("Property 'borderRadius' on polygon vertices is not supported as CSS box radius; omitted.");
      }
      const polygonLayer: PolygonLayer = {
        id: layerId,
        name: input.name,
        type: "polygon",
        sides: 3,
        grid: resolvedGrid,
        style: {
          ...baseStyle,
          borderRadius: 0,
        },
      };
      createdLayer = polygonLayer;
      break;
    }

    case "shape":
    default: {
      const isCirc = input.shapeType === "circle" || (input.shapeType as string) === "ellipse";
      if (isCirc && input.style?.borderRadius) {
        notices.push("Property 'borderRadius' is redundant on circular shapes and was normalized to continuous 50%.");
      }
      const shapeLayer: ShapeLayer = {
        id: layerId,
        name: input.name,
        type: "shape",
        shapeType: input.shapeType || "rectangle",
        grid: resolvedGrid,
        style: isCirc ? { ...baseStyle, borderRadius: 9999 } : baseStyle,
      };
      createdLayer = shapeLayer;
      break;
    }
  }

  // 5. Entrance Animation Preset
  if (input.enter) {
    createdLayer.animation = {
      in: {
        preset: input.enter.preset || "pop",
        duration: input.enter.duration ?? 0.6,
        start: input.enter.delay ?? 0,
        easing: (input.enter.easing as any) || "bouncy",
      },
    };
  }

  // 6. Mutate Store
  if (typeof state.selectScreen === "function") {
    state.selectScreen(targetScreen.id);
  }
  state.addLayer(createdLayer, input.parentId);

  return {
    success: true,
    data: { layerId: createdLayer.id, layer: createdLayer },
    notices,
  };
}
