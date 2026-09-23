import { useProjectStore } from "@/store/useProjectStore";
import {
  LinkElementsInput,
  LinkElementsInputSchema,
  UnlinkElementsInput,
  UnlinkElementsInputSchema,
  ToolResult,
} from "@/types/agentTools";
import { ElementLinkBinding, Layer, LinkMode, DriverProperty, DrivenProperty } from "@/types/layers";

/**
 * Checks whether adding a dependency from drivenId -> driverId would create a cycle.
 */
function wouldCreateCycle(layers: Layer[], driverId: string, drivenId: string): boolean {
  const layerMap = new Map<string, Layer>();
  function populate(items: Layer[]) {
    for (const item of items) {
      layerMap.set(item.id, item);
      if (item.type === "group" && (item as any).children) {
        populate((item as any).children);
      }
    }
  }
  populate(layers);

  // DFS from driverId to see if drivenId is reachable via existing bindings
  const visited = new Set<string>();
  function dfs(currId: string): boolean {
    if (currId === drivenId) return true;
    if (visited.has(currId)) return false;
    visited.add(currId);

    const layer = layerMap.get(currId);
    if (!layer || !layer.bindings) return false;

    for (const b of layer.bindings) {
      if (dfs(b.driverLayerId)) return true;
      if (b.targetLayerId && dfs(b.targetLayerId)) return true;
    }
    return false;
  }

  return dfs(driverId);
}

/**
 * Stage 2: Choreographer Agent Tool — link_elements
 * Establishes reactive, motion-first relational connections between elements:
 * - 'hug': Container dynamically hugs content with padding and spring buffering
 * - 'pin': Spatial anchor pinning to any of 9 anchor points with (dx, dy) offset
 * - 'reflow': Continuous axis flow maintaining authored gap as driver animates
 * - 'connect': Dynamic leader line tracking start/end points of two moving elements
 * - 'match' / 'remap' / 'lag': Property mirroring and physical inertia lag
 */
export function linkElements(rawInput: LinkElementsInput): ToolResult<{ binding: ElementLinkBinding }> {
  const notices: string[] = [];

  const parseResult = LinkElementsInputSchema.safeParse(rawInput);
  if (!parseResult.success) {
    return {
      success: false,
      notices: [parseResult.error.message],
      error: `Invalid link parameters: ${parseResult.error.issues.map((i) => i.message).join(", ")}`,
    };
  }

  const input = parseResult.data;
  const store = useProjectStore.getState();
  const doc = store.document;

  const targetScreen = input.sceneId
    ? doc.screens.find((s) => s.id === input.sceneId)
    : doc.screens.find((s) => s.id === store.activeScreenId) || doc.screens[0];

  if (!targetScreen) {
    return {
      success: false,
      notices: ["Target scene not found."],
      error: `Scene ${input.sceneId || store.activeScreenId} does not exist.`,
    };
  }

  // Find driver and driven layers
  function findLayer(items: Layer[], id: string): Layer | undefined {
    for (const l of items) {
      if (l.id === id) return l;
      if (l.type === "group" && (l as any).children) {
        const found = findLayer((l as any).children, id);
        if (found) return found;
      }
    }
    return undefined;
  }

  const driverLayer = findLayer(targetScreen.layers, input.driverId);
  const drivenLayer = findLayer(targetScreen.layers, input.drivenId);

  if (!driverLayer) {
    return {
      success: false,
      notices: [`Driver element '${input.driverId}' was not found in scene '${targetScreen.name}'.`],
      error: `Driver element not found: ${input.driverId}`,
    };
  }

  if (!drivenLayer) {
    return {
      success: false,
      notices: [`Driven element '${input.drivenId}' was not found in scene '${targetScreen.name}'.`],
      error: `Driven element not found: ${input.drivenId}`,
    };
  }

  if (input.driverId === input.drivenId) {
    return {
      success: false,
      notices: ["Cannot link an element to itself."],
      error: "Cyclic self-link detected.",
    };
  }

  // Cycle check
  if (wouldCreateCycle(targetScreen.layers, input.driverId, input.drivenId)) {
    notices.push(
      `Self-healing notice: Circular dependency prevented between '${driverLayer.name}' and '${drivenLayer.name}'.`
    );
    return {
      success: false,
      notices,
      error: `Circular dependency detected: '${driverLayer.name}' already depends on '${drivenLayer.name}'.`,
    };
  }

  // Mode sanitization & defaults
  const mode = input.mode as LinkMode;
  const bindingId = `bind_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  let driverProp: DriverProperty = "width";
  let drivenProp: DrivenProperty = "width";

  if (mode === "pin") {
    driverProp = "x";
    drivenProp = "x";
  } else if (mode === "reflow") {
    const axis = input.reflowAxis || "horizontal";
    driverProp = axis === "horizontal" ? "x" : "y";
    drivenProp = axis === "horizontal" ? "x" : "y";
  } else if (mode === "connect" || mode === "leader-line") {
    driverProp = "x";
    drivenProp = "width";
  }

  const binding: ElementLinkBinding = {
    id: bindingId,
    driverLayerId: input.driverId,
    targetLayerId: mode === "connect" || mode === "leader-line" ? input.drivenId : undefined,
    driverProp,
    drivenProp,
    mode,
    padding: input.padding || (mode === "hug" ? [16, 12] : undefined),
    driverAnchor: input.driverAnchor || (mode === "pin" ? "top-right" : "center"),
    targetAnchor: input.targetAnchor || (mode === "pin" ? "top-left" : "center"),
    offset2D: input.offset2D || (mode === "pin" ? [0, 0] : undefined),
    reflowAxis: input.reflowAxis || (mode === "reflow" ? "horizontal" : undefined),
    reflowGap: input.reflowGap !== undefined ? input.reflowGap : (mode === "reflow" ? 16 : undefined),
    reflowAlignment: input.reflowAlignment || (mode === "reflow" ? "center" : undefined),
    expansionPhysics: input.expansionPhysics || "spring",
    stiffness: input.stiffness || 260,
    damping: input.damping || 24,
    lagSeconds: input.lagSeconds,
  };

  store.addLayerBinding(input.drivenId, binding);
  notices.push(
    `Successfully linked '${drivenLayer.name}' to '${driverLayer.name}' using mode '${mode}'.`
  );

  return {
    success: true,
    data: { binding },
    notices,
  };
}

/**
 * Stage 2: Choreographer Agent Tool — unlink_elements
 * Removes a specific binding or all bindings on an element.
 */
export function unlinkElements(rawInput: UnlinkElementsInput): ToolResult<{ removedCount: number }> {
  const parseResult = UnlinkElementsInputSchema.safeParse(rawInput);
  if (!parseResult.success) {
    return {
      success: false,
      notices: [parseResult.error.message],
      error: `Invalid unlink parameters: ${parseResult.error.issues.map((i) => i.message).join(", ")}`,
    };
  }

  const input = parseResult.data;
  const store = useProjectStore.getState();
  const doc = store.document;

  const targetScreen = input.sceneId
    ? doc.screens.find((s) => s.id === input.sceneId)
    : doc.screens.find((s) => s.id === store.activeScreenId) || doc.screens[0];

  if (!targetScreen) {
    return {
      success: false,
      notices: ["Target scene not found."],
      error: `Scene not found.`,
    };
  }

  function findLayer(items: Layer[], id: string): Layer | undefined {
    for (const l of items) {
      if (l.id === id) return l;
      if (l.type === "group" && (l as any).children) {
        const found = findLayer((l as any).children, id);
        if (found) return found;
      }
    }
    return undefined;
  }

  const layer = findLayer(targetScreen.layers, input.layerId);
  if (!layer) {
    return {
      success: false,
      notices: [`Element '${input.layerId}' not found.`],
      error: "Element not found.",
    };
  }

  if (input.bindingId) {
    store.removeLayerBinding(input.layerId, input.bindingId);
    return {
      success: true,
      data: { removedCount: 1 },
      notices: [`Removed binding '${input.bindingId}' from '${layer.name}'.`],
    };
  } else {
    const count = layer.bindings?.length || 0;
    for (const b of layer.bindings || []) {
      store.removeLayerBinding(input.layerId, b.id);
    }
    return {
      success: true,
      data: { removedCount: count },
      notices: [`Removed all ${count} bindings from '${layer.name}'.`],
    };
  }
}
