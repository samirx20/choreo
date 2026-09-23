import { ProjectStoreState, ShapeEdgeId } from "../types";
import { SceneDocument, Layer, GroupLayer, FrameLayer, ShapeLayer, LineLayer } from "@/types/scene";
import {
  findLayerInTree,
  mutateLayerInTree,
  findParentGroupInTree,
  insertLayerRelativeInTree,
} from "../helpers/treeHelpers";
import { commitDoc } from "../historyManager";
import { splitLayerAtPlayhead } from "@/engine/video/razorSplit";
import {
  splitTextIntoWords as splitWordsEngine,
  splitTextIntoLines as splitLinesEngine,
  splitTextBySelection,
} from "@/engine/textSplitter";
import {
  splitRoundedRectContour,
  splitCircleContour,
  separateStrokeAndFill as separateStrokeFillEngine,
  splitShapeByEdges,
} from "@/engine/shapeSplitter";
import { getShapeEdges } from "@/engine/shapeGeometry";
import {
  splitLineAtRatio,
  detachArrowhead as detachArrowheadEngine,
} from "@/engine/lineSplitter";

export type LayerSlice = Pick<
  ProjectStoreState,
  | "splitModeState"
  | "addLayer"
  | "updateLayer"
  | "removeLayer"
  | "duplicateLayer"
  | "duplicateLayerInPlace"
  | "nestLayerInGroup"
  | "ungroup"
  | "reorderLayer"
  | "bringToFront"
  | "sendToBack"
  | "bringForward"
  | "sendBackward"
  | "groupSelection"
  | "splitTextRange"
  | "splitTextAtCaret"
  | "splitTextIntoWords"
  | "splitTextIntoLines"
  | "splitShapeContour"
  | "separateStrokeAndFill"
  | "splitLineAtPoint"
  | "detachArrowhead"
  | "detachGroupToAbsolute"
  | "mergeChunkWithPrevious"
  | "mergeChunkWithNext"
  | "addLayerBinding"
  | "updateLayerBinding"
  | "removeLayerBinding"
  | "razorSplitLayer"
  | "enterSplitMode"
  | "toggleSplitEdge"
  | "setSplitCutRatio"
  | "setSplitDetachArrowhead"
  | "exitSplitMode"
  | "confirmSplit"
>;

export const createLayerSlice = (
  set: (fn: Partial<ProjectStoreState> | ((prev: ProjectStoreState) => Partial<ProjectStoreState>)) => void,
  get: () => ProjectStoreState
): LayerSlice => ({
  splitModeState: null,
  addLayer: (layer, targetGroupId) => {
    const { document: doc, activeScreenId } = get();
    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((screen) => {
        if (screen.id !== activeScreenId) return screen;
        if (!targetGroupId) {
          return { ...screen, layers: [...screen.layers, layer] };
        }
        return {
          ...screen,
          layers: mutateLayerInTree(screen.layers, targetGroupId, (group) => {
            if (group.type !== "group" && group.type !== "frame") return group;
            return {
              ...group,
              children: [...group.children, layer],
            };
          }),
        };
      }),
    };
    commitDoc(set, nextDoc, {
      selectedLayerIds: [layer.id],
    });
  },

  updateLayer: (layerId, updates) => {
    const { document: doc, activeScreenId } = get();
    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((screen) => {
        if (screen.id !== activeScreenId) return screen;
        return {
          ...screen,
          layers: mutateLayerInTree(screen.layers, layerId, (layer) => {
            const isText = layer.type === "text" || layer.type === "chunk";
            const newContent = (updates as any).content;
            const shouldSyncName =
              isText &&
              typeof newContent === "string" &&
              (!layer.name || layer.name === (layer as any).content);
            return {
              ...layer,
              ...(shouldSyncName ? { name: newContent } : {}),
              ...updates,
            } as Layer;
          }),
        };
      }),
    };
    commitDoc(set, nextDoc);
  },

  removeLayer: (layerId) => {
    const { document: doc, activeScreenId, selectedLayerIds } = get();
    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((screen) => {
        if (screen.id !== activeScreenId) return screen;
        return {
          ...screen,
          layers: mutateLayerInTree(screen.layers, layerId, () => null),
        };
      }),
    };
    commitDoc(set, nextDoc, {
      selectedLayerIds: selectedLayerIds.filter((id) => id !== layerId),
    });
  },

  duplicateLayer: (layerId) => {
    const { document: doc, activeScreenId } = get();
    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen) return;
    const target = findLayerInTree(activeScreen.layers, layerId);
    if (!target) return;

    const newId = `${target.id}_copy_${Math.random().toString(36).substring(2, 6)}`;
    const cloned: Layer = JSON.parse(JSON.stringify(target));
    cloned.id = newId;
    cloned.name = `${target.name} (Copy)`;
    cloned.style.x = (cloned.style.x || 0) + 30;
    cloned.style.y = (cloned.style.y || 0) + 30;

    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((s) =>
        s.id === activeScreenId ? { ...s, layers: [...s.layers, cloned] } : s
      ),
    };
    commitDoc(set, nextDoc, {
      selectedLayerIds: [newId],
    });
  },

  duplicateLayerInPlace: (layerId) => {
    const { document: doc, activeScreenId } = get();
    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen) return layerId;
    const target = findLayerInTree(activeScreen.layers, layerId);
    if (!target) return layerId;

    const newId = `${target.id}_copy_${Math.random().toString(36).substring(2, 6)}`;
    const cloned: Layer = JSON.parse(JSON.stringify(target));
    cloned.id = newId;
    cloned.name = `${target.name} (Copy)`;

    const parentGroup = findParentGroupInTree(activeScreen.layers, layerId);
    let nextLayers: Layer[];
    if (parentGroup) {
      nextLayers = mutateLayerInTree(activeScreen.layers, parentGroup.id, (group) => {
        if (group.type !== "group") return group;
        return {
          ...group,
          children: [...group.children, cloned],
        };
      });
    } else {
      nextLayers = [...activeScreen.layers, cloned];
    }

    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((s) =>
        s.id === activeScreenId ? { ...s, layers: nextLayers } : s
      ),
    };
    commitDoc(set, nextDoc, {
      selectedLayerIds: [newId],
    });
    return newId;
  },

  nestLayerInGroup: (layerId, targetGroupId) => {
    const { document: doc, activeScreenId } = get();
    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen) return;
    const layer = findLayerInTree(activeScreen.layers, layerId);
    if (!layer || layerId === targetGroupId) return;

    // Remove from existing location, append to target group
    const withoutLayer = mutateLayerInTree(activeScreen.layers, layerId, () => null);
    const withLayerInGroup = mutateLayerInTree(
      withoutLayer,
      targetGroupId,
      (group) => {
        if (group.type !== "group") return group;
        return {
          ...group,
          children: [...group.children, layer],
        };
      }
    );

    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((s) =>
        s.id === activeScreenId ? { ...s, layers: withLayerInGroup } : s
      ),
    };
    commitDoc(set, nextDoc);
  },

  ungroup: (groupId) => {
    const { document: doc, activeScreenId } = get();
    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen) return;
    const group = findLayerInTree(activeScreen.layers, groupId) as GroupLayer | null;
    if (!group || group.type !== "group") return;

    // Hoist children to the parent level with absolute positions adjusted
    const childrenToHoist = group.children.map((c) => ({
      ...c,
      style: {
        ...c.style,
        x: (group.style.x || 0) + (c.style.x || 0),
        y: (group.style.y || 0) + (c.style.y || 0),
      },
    }));

    // Replace group with its children in root layers
    const nextLayers = activeScreen.layers.flatMap((l) =>
      l.id === groupId ? childrenToHoist : [l]
    );

    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((s) =>
        s.id === activeScreenId ? { ...s, layers: nextLayers } : s
      ),
    };
    commitDoc(set, nextDoc, {
      selectedLayerIds: childrenToHoist.map((c) => c.id),
    });
  },

  reorderLayer: (sourceId, targetId, position) => {
    if (sourceId === targetId) return;
    const { document: doc, activeScreenId } = get();
    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen) return;

    const sourceLayer = findLayerInTree(activeScreen.layers, sourceId);
    if (!sourceLayer) return;

    // Calculate world coordinates of source before removal
    const oldParent = findParentGroupInTree(activeScreen.layers, sourceId);
    const oldWorldX = (oldParent?.style.x || 0) + (sourceLayer.style.x || 0);
    const oldWorldY = (oldParent?.style.y || 0) + (sourceLayer.style.y || 0);

    // Calculate new parent coordinates
    let targetGroup: (GroupLayer | FrameLayer) | null = null;
    if (position === "inside") {
      const target = findLayerInTree(activeScreen.layers, targetId);
      if (target?.type === "group" || target?.type === "frame") targetGroup = target as (GroupLayer | FrameLayer);
    } else {
      targetGroup = findParentGroupInTree(activeScreen.layers, targetId);
    }

    // Normalize position to new container origin
    const newLocalX = targetGroup ? oldWorldX - (targetGroup.style.x || 0) : oldWorldX;
    const newLocalY = targetGroup ? oldWorldY - (targetGroup.style.y || 0) : oldWorldY;

    const adjustedSourceLayer: Layer = {
      ...sourceLayer,
      style: {
        ...sourceLayer.style,
        x: Math.round(newLocalX),
        y: Math.round(newLocalY),
      },
    };

    // Remove source from existing position
    const withoutSource = mutateLayerInTree(activeScreen.layers, sourceId, () => null);

    // Insert source relative to target
    const { updated: withSourcePlaced, inserted } = insertLayerRelativeInTree(
      withoutSource,
      targetId,
      adjustedSourceLayer,
      position
    );

    if (!inserted) return;

    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((s) =>
        s.id === activeScreenId ? { ...s, layers: withSourcePlaced } : s
      ),
    };

    commitDoc(set, nextDoc, {
      selectedLayerIds: [sourceId],
    });
  },

  bringToFront: (layerId: string) => {
    const { document: doc, activeScreenId } = get();
    const screen = doc.screens.find((s) => s.id === activeScreenId);
    if (!screen) return;
    const parent = findParentGroupInTree(screen.layers, layerId);
    const containerList: Layer[] = parent ? parent.children : screen.layers;
    const idx = containerList.findIndex((l: Layer) => l.id === layerId);
    if (idx === -1 || idx === containerList.length - 1) return;

    const item = containerList[idx];
    const reordered = [...containerList.slice(0, idx), ...containerList.slice(idx + 1), item];

    const nextDoc: SceneDocument = parent
      ? {
          ...doc,
          screens: doc.screens.map((s) =>
            s.id === activeScreenId
              ? {
                  ...s,
                  layers: mutateLayerInTree(s.layers, parent.id, (g) => ({
                    ...g,
                    children: reordered,
                  })),
                }
              : s
          ),
        }
      : {
          ...doc,
          screens: doc.screens.map((s) =>
            s.id === activeScreenId ? { ...s, layers: reordered } : s
          ),
        };
    commitDoc(set, nextDoc);
  },

  sendToBack: (layerId: string) => {
    const { document: doc, activeScreenId } = get();
    const screen = doc.screens.find((s) => s.id === activeScreenId);
    if (!screen) return;
    const parent = findParentGroupInTree(screen.layers, layerId);
    const containerList: Layer[] = parent ? parent.children : screen.layers;
    const idx = containerList.findIndex((l: Layer) => l.id === layerId);
    if (idx <= 0) return;

    const item = containerList[idx];
    const reordered = [item, ...containerList.slice(0, idx), ...containerList.slice(idx + 1)];

    const nextDoc: SceneDocument = parent
      ? {
          ...doc,
          screens: doc.screens.map((s) =>
            s.id === activeScreenId
              ? {
                  ...s,
                  layers: mutateLayerInTree(s.layers, parent.id, (g) => ({
                    ...g,
                    children: reordered,
                  })),
                }
              : s
          ),
        }
      : {
          ...doc,
          screens: doc.screens.map((s) =>
            s.id === activeScreenId ? { ...s, layers: reordered } : s
          ),
        };
    commitDoc(set, nextDoc);
  },

  bringForward: (layerId: string) => {
    const { document: doc, activeScreenId } = get();
    const screen = doc.screens.find((s) => s.id === activeScreenId);
    if (!screen) return;
    const parent = findParentGroupInTree(screen.layers, layerId);
    const containerList: Layer[] = parent ? parent.children : screen.layers;
    const idx = containerList.findIndex((l: Layer) => l.id === layerId);
    if (idx === -1 || idx === containerList.length - 1) return;

    const reordered = [...containerList];
    const temp = reordered[idx];
    reordered[idx] = reordered[idx + 1];
    reordered[idx + 1] = temp;

    const nextDoc: SceneDocument = parent
      ? {
          ...doc,
          screens: doc.screens.map((s) =>
            s.id === activeScreenId
              ? {
                  ...s,
                  layers: mutateLayerInTree(s.layers, parent.id, (g) => ({
                    ...g,
                    children: reordered,
                  })),
                }
              : s
          ),
        }
      : {
          ...doc,
          screens: doc.screens.map((s) =>
            s.id === activeScreenId ? { ...s, layers: reordered } : s
          ),
        };
    commitDoc(set, nextDoc);
  },

  sendBackward: (layerId: string) => {
    const { document: doc, activeScreenId } = get();
    const screen = doc.screens.find((s) => s.id === activeScreenId);
    if (!screen) return;
    const parent = findParentGroupInTree(screen.layers, layerId);
    const containerList: Layer[] = parent ? parent.children : screen.layers;
    const idx = containerList.findIndex((l: Layer) => l.id === layerId);
    if (idx <= 0) return;

    const reordered = [...containerList];
    const temp = reordered[idx];
    reordered[idx] = reordered[idx - 1];
    reordered[idx - 1] = temp;

    const nextDoc: SceneDocument = parent
      ? {
          ...doc,
          screens: doc.screens.map((s) =>
            s.id === activeScreenId
              ? {
                  ...s,
                  layers: mutateLayerInTree(s.layers, parent.id, (g) => ({
                    ...g,
                    children: reordered,
                  })),
                }
              : s
          ),
        }
      : {
          ...doc,
          screens: doc.screens.map((s) =>
            s.id === activeScreenId ? { ...s, layers: reordered } : s
          ),
        };
    commitDoc(set, nextDoc);
  },

  groupSelection: () => {
    const { document: doc, activeScreenId, selectedLayerIds } = get();
    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen || selectedLayerIds.length === 0) return;

    const selectedLayers = selectedLayerIds
      .map((id) => findLayerInTree(activeScreen.layers, id))
      .filter((l): l is Layer => l !== null);

    if (selectedLayers.length === 0) return;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    selectedLayers.forEach((l) => {
      const el = typeof document !== "undefined" ? document.getElementById(`layer-${l.id}`) : null;
      const x = l.style.x || 0;
      const y = l.style.y || 0;
      const w = typeof l.style.width === "number" ? l.style.width : (el && el.offsetWidth > 0 ? el.offsetWidth : 200);
      const h = typeof l.style.height === "number" ? l.style.height : (el && el.offsetHeight > 0 ? el.offsetHeight : 60);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    });

    if (!isFinite(minX)) minX = 100;
    if (!isFinite(minY)) minY = 100;
    if (!isFinite(maxX)) maxX = 500;
    if (!isFinite(maxY)) maxY = 300;

    const newGroupId = `group_${Date.now()}`;
    const newGroup: GroupLayer = {
      id: newGroupId,
      name: "Group",
      type: "group",
      layout: {
        display: "none",
        flexDirection: "column",
        gap: 0,
        align: "start",
      },
      autoFit: false,
      autoLink: false,
      staggerDelay: 0.15,
      style: {
        x: Math.round(minX),
        y: Math.round(minY),
        width: Math.max(Math.round(maxX - minX), 10),
        height: Math.max(Math.round(maxY - minY), 10),
        rotation: 0,
        opacity: 1,
      },
      children: selectedLayers.map((l) => ({
        ...l,
        style: {
          ...l.style,
          x: Math.round((l.style.x || 0) - minX),
          y: Math.round((l.style.y || 0) - minY),
        },
      })),
    };

    const firstIdx = activeScreen.layers.findIndex((l) => selectedLayerIds.includes(l.id));
    let cleanedLayers = activeScreen.layers;
    for (const id of selectedLayerIds) {
      cleanedLayers = mutateLayerInTree(cleanedLayers, id, () => null);
    }
    const insertIdx = firstIdx !== -1 ? Math.min(firstIdx, cleanedLayers.length) : cleanedLayers.length;
    const nextLayers = [
      ...cleanedLayers.slice(0, insertIdx),
      newGroup,
      ...cleanedLayers.slice(insertIdx),
    ];

    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((s) =>
        s.id === activeScreenId ? { ...s, layers: nextLayers } : s
      ),
    };

    commitDoc(set, nextDoc, {
      selectedLayerIds: [newGroupId],
    });
  },

  splitTextRange: (layerId, start, end) => {
    const { document: doc, activeScreenId } = get();
    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen) return;

    const targetLayer = findLayerInTree(activeScreen.layers, layerId);
    if (!targetLayer || (targetLayer.type !== "text" && targetLayer.type !== "chunk")) return;

    const fullContent = (targetLayer as any).content || "";
    if (start < 0) start = 0;
    if (end > fullContent.length) end = fullContent.length;
    if (start >= end) return;

    const prefix = fullContent.slice(0, start);
    const selected = fullContent.slice(start, end);
    const suffix = fullContent.slice(end);

    let remainder = "";
    if (prefix && suffix) {
      remainder = `${prefix.trimEnd()} ${suffix.trimStart()}`;
    } else if (prefix) {
      remainder = prefix.trim();
    } else if (suffix) {
      remainder = suffix.trim();
    }

    const baseStyle = { ...targetLayer.style };
    const chunks: Layer[] = [];

    // 1. First element: what was selected
    const selectedChunkId = `chunk_${Date.now()}_sel`;
    chunks.push({
      id: selectedChunkId,
      name: selected.trim() || "Selection",
      type: "chunk" as const,
      content: selected,
      style: {
        ...baseStyle,
        x: 0,
        y: 0,
        width: "auto",
        height: "auto",
      },
      animation: { in: { preset: "pop", start: 0, duration: 0.6, easing: "bouncy" } },
    } as any);

    // 2. Second element: remainder (everything that was not selected)
    const remainderChunkId = `chunk_${Date.now()}_rem`;
    chunks.push({
      id: remainderChunkId,
      name: remainder || "Remainder",
      type: "chunk" as const,
      content: remainder,
      style: {
        ...baseStyle,
        x: 0,
        y: 0,
        width: "auto",
        height: "auto",
      },
      animation: { in: { preset: "pop", start: 0.15, duration: 0.6, easing: "bouncy" } },
    } as any);

    const parentGroup = findParentGroupInTree(activeScreen.layers, layerId);

    let nextLayers: Layer[];
    if (parentGroup) {
      nextLayers = mutateLayerInTree(activeScreen.layers, parentGroup.id, (group) => {
        if (group.type !== "group") return group;
        const newChildren: Layer[] = [];
        for (const child of group.children) {
          if (child.id === layerId) {
            newChildren.push(...chunks);
          } else {
            newChildren.push(child);
          }
        }
        return { ...group, children: newChildren };
      });
    } else {
      const newGroupId = `group_text_${Date.now()}`;
      const newGroup: GroupLayer = {
        id: newGroupId,
        name: targetLayer.name || "Text Group",
        type: "group",
        isCompound: true,
        compoundType: "split-text",
        layout: {
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          align: "center",
        },
        autoFit: true,
        autoLink: true,
        staggerDelay: 0.15,
        style: {
          ...baseStyle,
          width: "auto",
          height: "auto",
        },
        children: chunks,
      };

      nextLayers = activeScreen.layers.map((l) => (l.id === layerId ? newGroup : l));
    }

    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((s) =>
        s.id === activeScreenId ? { ...s, layers: nextLayers } : s
      ),
    };

    commitDoc(set, nextDoc, {
      selectedLayerIds: [selectedChunkId],
      editingLayerId: null,
      activeTextSelection: null,
    });
  },

  splitTextIntoWords: (layerId) => {
    const { document: doc, activeScreenId } = get();
    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen) return;

    const targetLayer = findLayerInTree(activeScreen.layers, layerId);
    if (!targetLayer || (targetLayer.type !== "text" && targetLayer.type !== "chunk")) return;

    const group = splitWordsEngine(targetLayer as any);

    const nextLayers = mutateLayerInTree(activeScreen.layers, layerId, () => group);
    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((s) =>
        s.id === activeScreenId ? { ...s, layers: nextLayers } : s
      ),
    };

    commitDoc(set, nextDoc, {
      selectedLayerIds: group.children.map((c) => c.id),
      editingLayerId: null,
      activeTextSelection: null,
    });
  },

  splitTextIntoLines: (layerId) => {
    const { document: doc, activeScreenId } = get();
    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen) return;

    const targetLayer = findLayerInTree(activeScreen.layers, layerId);
    if (!targetLayer || (targetLayer.type !== "text" && targetLayer.type !== "chunk")) return;

    const group = splitLinesEngine(targetLayer as any);

    const nextLayers = mutateLayerInTree(activeScreen.layers, layerId, () => group);
    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((s) =>
        s.id === activeScreenId ? { ...s, layers: nextLayers } : s
      ),
    };

    commitDoc(set, nextDoc, {
      selectedLayerIds: group.children.map((c) => c.id),
      editingLayerId: null,
      activeTextSelection: null,
    });
  },

  splitShapeContour: (layerId) => {
    const { document: doc, activeScreenId } = get();
    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen) return;

    const targetLayer = findLayerInTree(activeScreen.layers, layerId);
    if (!targetLayer || targetLayer.type !== "shape") return;

    const shape = targetLayer as ShapeLayer;
    const isCirc = shape.shapeType === "circle" || shape.shapeType === "ellipse";
    const splitResult = isCirc ? splitCircleContour(shape) : splitRoundedRectContour(shape);

    const nextLayers = mutateLayerInTree(activeScreen.layers, layerId, () => splitResult.group);
    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((s) =>
        s.id === activeScreenId ? { ...s, layers: nextLayers } : s
      ),
    };

    commitDoc(set, nextDoc, {
      selectedLayerIds: splitResult.subLayers.map((s) => s.id),
    });
  },

  separateStrokeAndFill: (layerId) => {
    const { document: doc, activeScreenId } = get();
    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen) return;

    const targetLayer = findLayerInTree(activeScreen.layers, layerId);
    if (!targetLayer || targetLayer.type !== "shape") return;

    const splitResult = separateStrokeFillEngine(targetLayer as ShapeLayer);

    const nextLayers = mutateLayerInTree(activeScreen.layers, layerId, () => splitResult.group);
    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((s) =>
        s.id === activeScreenId ? { ...s, layers: nextLayers } : s
      ),
    };

    commitDoc(set, nextDoc, {
      selectedLayerIds: [splitResult.subLayers[1].id],
    });
  },

  splitLineAtPoint: (layerId, ratio = 0.5) => {
    const { document: doc, activeScreenId } = get();
    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen) return;

    const targetLayer = findLayerInTree(activeScreen.layers, layerId);
    if (!targetLayer) return;

    const splitResult = splitLineAtRatio(targetLayer, ratio);

    const nextLayers = mutateLayerInTree(activeScreen.layers, layerId, () => splitResult.group);
    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((s) =>
        s.id === activeScreenId ? { ...s, layers: nextLayers } : s
      ),
    };

    commitDoc(set, nextDoc, {
      selectedLayerIds: splitResult.segments.map((s) => s.id),
    });
  },

  detachArrowhead: (layerId) => {
    const { document: doc, activeScreenId } = get();
    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen) return;

    const targetLayer = findLayerInTree(activeScreen.layers, layerId);
    if (!targetLayer) return;

    const splitResult = detachArrowheadEngine(targetLayer);

    const nextLayers = mutateLayerInTree(activeScreen.layers, layerId, () => splitResult.group);
    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((s) =>
        s.id === activeScreenId ? { ...s, layers: nextLayers } : s
      ),
    };

    commitDoc(set, nextDoc, {
      selectedLayerIds: [splitResult.segments[1].id],
    });
  },

  detachGroupToAbsolute: (groupId) => {
    const { document: doc, activeScreenId } = get();
    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen) return;

    const targetGroup = findLayerInTree(activeScreen.layers, groupId);
    if (!targetGroup || (targetGroup.type !== "group" && targetGroup.type !== "frame")) return;

    const parentGroup = targetGroup as GroupLayer | FrameLayer;
    const parentX = parentGroup.style.x || 0;
    const parentY = parentGroup.style.y || 0;

    const absoluteChildren: Layer[] = parentGroup.children.map((child) => ({
      ...child,
      style: {
        ...child.style,
        x: Math.round(parentX + (child.style.x || 0)),
        y: Math.round(parentY + (child.style.y || 0)),
        rotation: (parentGroup.style.rotation || 0) + (child.style.rotation || 0),
      },
    }));

    const replaceInTree = (layers: Layer[]): Layer[] => {
      const result: Layer[] = [];
      for (const layer of layers) {
        if (layer.id === groupId) {
          result.push(...absoluteChildren);
        } else if ((layer.type === "group" || layer.type === "frame") && (layer as any).children) {
          result.push({
            ...layer,
            children: replaceInTree((layer as any).children),
          } as Layer);
        } else {
          result.push(layer);
        }
      }
      return result;
    };

    const nextLayers = replaceInTree(activeScreen.layers);
    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((s) =>
        s.id === activeScreenId ? { ...s, layers: nextLayers } : s
      ),
    };

    commitDoc(set, nextDoc, {
      selectedLayerIds: absoluteChildren.map((c) => c.id),
    });
  },

  splitTextAtCaret: (layerId, index) => {
    const { document: doc, activeScreenId } = get();
    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen) return;

    const targetLayer = findLayerInTree(activeScreen.layers, layerId);
    if (!targetLayer || (targetLayer.type !== "text" && targetLayer.type !== "chunk")) return;

    const fullContent = (targetLayer as any).content || "";
    if (index <= 0 || index >= fullContent.length) return;

    get().splitTextRange(layerId, 0, index);
  },

  mergeChunkWithPrevious: (chunkId) => {
    const { document: doc, activeScreenId } = get();
    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen) return;

    const parentGroup = findParentGroupInTree(activeScreen.layers, chunkId);
    if (!parentGroup) return;

    const chunkIdx = parentGroup.children.findIndex((c: Layer) => c.id === chunkId);
    if (chunkIdx <= 0) return;

    const prevChunk = parentGroup.children[chunkIdx - 1];
    const targetChunk = parentGroup.children[chunkIdx];

    const mergedContent =
      ((prevChunk as any).content || "") + ((targetChunk as any).content || "");

    const newChildren = parentGroup.children
      .filter((c: Layer) => c.id !== chunkId)
      .map((c: Layer) => (c.id === prevChunk.id ? { ...c, content: mergedContent } : c));

    let nextLayers: Layer[];
    if (newChildren.length === 1) {
      const soleChild: Layer = {
        ...newChildren[0],
        type: newChildren[0].type === "chunk" ? ("text" as const) : newChildren[0].type,
        style: {
          ...newChildren[0].style,
          x: (parentGroup.style.x || 0) + (newChildren[0].style.x || 0),
          y: (parentGroup.style.y || 0) + (newChildren[0].style.y || 0),
        },
      } as any;
      nextLayers = activeScreen.layers.map((l) => (l.id === parentGroup.id ? soleChild : l));
    } else {
      nextLayers = mutateLayerInTree(activeScreen.layers, parentGroup.id, (g) => ({
        ...g,
        children: newChildren,
      }));
    }

    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((s) =>
        s.id === activeScreenId ? { ...s, layers: nextLayers } : s
      ),
    };

    commitDoc(set, nextDoc, {
      selectedLayerIds: [prevChunk.id],
    });
  },

  mergeChunkWithNext: (chunkId) => {
    const { document: doc, activeScreenId } = get();
    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen) return;

    const parentGroup = findParentGroupInTree(activeScreen.layers, chunkId);
    if (!parentGroup) return;

    const chunkIdx = parentGroup.children.findIndex((c: Layer) => c.id === chunkId);
    if (chunkIdx === -1 || chunkIdx >= parentGroup.children.length - 1) return;

    const targetChunk = parentGroup.children[chunkIdx];
    const nextChunk = parentGroup.children[chunkIdx + 1];

    const mergedContent =
      ((targetChunk as any).content || "") + ((nextChunk as any).content || "");

    const newChildren = parentGroup.children
      .filter((c: Layer) => c.id !== nextChunk.id)
      .map((c: Layer) => (c.id === targetChunk.id ? { ...c, content: mergedContent } : c));

    let nextLayers: Layer[];
    if (newChildren.length === 1) {
      const soleChild: Layer = {
        ...newChildren[0],
        type: newChildren[0].type === "chunk" ? ("text" as const) : newChildren[0].type,
        style: {
          ...newChildren[0].style,
          x: (parentGroup.style.x || 0) + (newChildren[0].style.x || 0),
          y: (parentGroup.style.y || 0) + (newChildren[0].style.y || 0),
        },
      } as any;
      nextLayers = activeScreen.layers.map((l) => (l.id === parentGroup.id ? soleChild : l));
    } else {
      nextLayers = mutateLayerInTree(activeScreen.layers, parentGroup.id, (g) => ({
        ...g,
        children: newChildren,
      }));
    }

    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((s) =>
        s.id === activeScreenId ? { ...s, layers: nextLayers } : s
      ),
    };

    commitDoc(set, nextDoc, {
      selectedLayerIds: [targetChunk.id],
    });
  },

  addLayerBinding: (layerId, binding) => {
    const { document: doc, activeScreenId } = get();
    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen) return;

    const nextLayers = mutateLayerInTree(activeScreen.layers, layerId, (layer) => {
      const existing = layer.bindings || [];
      return {
        ...layer,
        bindings: [...existing, binding],
      };
    });

    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((s) =>
        s.id === activeScreenId ? { ...s, layers: nextLayers } : s
      ),
    };
    commitDoc(set, nextDoc);
  },

  updateLayerBinding: (layerId, bindingId, patch) => {
    const { document: doc, activeScreenId } = get();
    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen) return;

    const nextLayers = mutateLayerInTree(activeScreen.layers, layerId, (layer) => {
      const existing = layer.bindings || [];
      return {
        ...layer,
        bindings: existing.map((b) => (b.id === bindingId ? { ...b, ...patch } : b)),
      };
    });

    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((s) =>
        s.id === activeScreenId ? { ...s, layers: nextLayers } : s
      ),
    };
    commitDoc(set, nextDoc);
  },

  removeLayerBinding: (layerId, bindingId) => {
    const { document: doc, activeScreenId } = get();
    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen) return;

    const nextLayers = mutateLayerInTree(activeScreen.layers, layerId, (layer) => {
      const existing = layer.bindings || [];
      return {
        ...layer,
        bindings: existing.filter((b) => b.id !== bindingId),
      };
    });

    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((s) =>
        s.id === activeScreenId ? { ...s, layers: nextLayers } : s
      ),
    };
    commitDoc(set, nextDoc);
  },

  razorSplitLayer: (layerId, time) => {
    const { document: doc, activeScreenId, currentTime } = get();
    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen) return { updatedLayers: [], headClipId: null, tailClipId: null, didSplit: false };

    const cutTime = time ?? currentTime;
    const splitResult = splitLayerAtPlayhead(activeScreen.layers, layerId, cutTime);

    if (!splitResult.didSplit) {
      return splitResult;
    }

    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((s) =>
        s.id === activeScreenId ? { ...s, layers: splitResult.updatedLayers } : s
      ),
    };

    commitDoc(set, nextDoc, {
      selectedLayerIds: splitResult.tailClipId ? [splitResult.tailClipId] : [layerId],
    });

    return splitResult;
  },

  enterSplitMode: (layerId) => {
    const { document: doc, activeScreenId } = get();
    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen) return;

    const layer = findLayerInTree(activeScreen.layers, layerId);
    if (!layer) return;

    if (layer.type === "shape") {
      const shape = layer as ShapeLayer;
      const edges = getShapeEdges(shape);
      const isRect = !shape.shapeType || shape.shapeType === "rectangle";
      const defaultEdges = isRect
        ? ["top", "left"]
        : edges.slice(0, Math.max(1, Math.floor(edges.length / 2))).map((e) => e.id);
      set({
        splitModeState: {
          layerId,
          type: "shape",
          selectedEdges: defaultEdges,
          cutRatio: 0.5,
          detachArrowhead: false,
        },
        selectedLayerIds: [layerId],
      });
    } else if (layer.type === "line") {
      set({
        splitModeState: {
          layerId,
          type: "line",
          selectedEdges: [],
          cutRatio: 0.5,
          detachArrowhead: false,
        },
        selectedLayerIds: [layerId],
      });
    }
  },

  toggleSplitEdge: (edge) => {
    const { splitModeState } = get();
    if (!splitModeState || splitModeState.type !== "shape") return;

    const exists = splitModeState.selectedEdges.includes(edge);
    const nextEdges = exists
      ? splitModeState.selectedEdges.filter((e) => e !== edge)
      : [...splitModeState.selectedEdges, edge];

    if (nextEdges.length === 0) return;

    set({
      splitModeState: {
        ...splitModeState,
        selectedEdges: nextEdges,
      },
    });
  },

  setSplitCutRatio: (ratio) => {
    const { splitModeState } = get();
    if (!splitModeState) return;
    const clamped = Math.max(0.05, Math.min(0.95, ratio));
    set({
      splitModeState: {
        ...splitModeState,
        cutRatio: clamped,
      },
    });
  },

  setSplitDetachArrowhead: (detach) => {
    const { splitModeState } = get();
    if (!splitModeState) return;
    set({
      splitModeState: {
        ...splitModeState,
        detachArrowhead: detach,
      },
    });
  },

  exitSplitMode: () => {
    set({ splitModeState: null });
  },

  confirmSplit: () => {
    const { document: doc, activeScreenId, splitModeState } = get();
    if (!splitModeState) return;

    const activeScreen = doc.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen) {
      set({ splitModeState: null });
      return;
    }

    const targetLayer = findLayerInTree(activeScreen.layers, splitModeState.layerId);
    if (!targetLayer) {
      set({ splitModeState: null });
      return;
    }

    let splitGroup: GroupLayer | null = null;

    if (splitModeState.type === "shape" && targetLayer.type === "shape") {
      const res = splitShapeByEdges(targetLayer as ShapeLayer, splitModeState.selectedEdges);
      splitGroup = res.group;
    } else if (splitModeState.type === "line" && targetLayer.type === "line") {
      if (splitModeState.detachArrowhead) {
        const res = detachArrowheadEngine(targetLayer as LineLayer);
        splitGroup = res.group;
      } else {
        const res = splitLineAtRatio(targetLayer as LineLayer, splitModeState.cutRatio);
        splitGroup = res.group;
      }
    }

    if (!splitGroup) {
      set({ splitModeState: null });
      return;
    }

    const nextLayers = mutateLayerInTree(
      activeScreen.layers,
      splitModeState.layerId,
      () => splitGroup!
    );

    const nextDoc: SceneDocument = {
      ...doc,
      screens: doc.screens.map((s) =>
        s.id === activeScreenId ? { ...s, layers: nextLayers } : s
      ),
    };

    commitDoc(set, nextDoc, {
      selectedLayerIds: [splitGroup.id],
      splitModeState: null,
    });
  },
});
