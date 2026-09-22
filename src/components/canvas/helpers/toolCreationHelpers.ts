import { Layer } from "@/types/scene";
import { THEME_TOKENS } from "@/theme/tokens";

export function createLayerForTool(
  tool: string,
  canvasX: number,
  canvasY: number,
  existingLayerCount: number = 0
): Layer | null {
  const start = Math.round(existingLayerCount * 0.5 * 100) / 100;
  const duration = 0.5;

  if (tool === "text") {
    const newId = `text_${Date.now()}`;
    const clipId = `clip_${Date.now()}_in`;
    return {
      id: newId,
      name: "Text Layer",
      type: "text",
      content: "Add text",
      style: {
        x: Math.round(canvasX),
        y: Math.round(canvasY),
        width: 240,
        height: 70,
        textSizing: "fixed",
        scaleX: 1,
        scaleY: 1,
        pivotX: 0.5,
        pivotY: 0.5,
        rotation: 0,
        opacity: 1,
        fontSize: 54,
        fontWeight: 800,
        fontFamily: "Inter",
        color: THEME_TOKENS.typography.headingColor,
        textAlign: "center",
        verticalAlign: "middle",
      },
      animation: {
        in: {
          preset: "slideUp",
          start,
          duration,
          easing: "snappy",
          distance: 50,
        },
        clips: [
          {
            id: clipId,
            name: "Slide Up",
            type: "in",
            preset: "slideUp",
            start,
            duration,
            easing: "snappy",
            distance: 50,
          },
        ],
      },
    };
  }

  if (tool === "frame") {
    const newId = `frame_${Date.now()}`;
    const clipId = `clip_${Date.now()}_in`;
    return {
      id: newId,
      name: "Frame",
      type: "frame",
      clipContent: true,
      children: [],
      style: {
        x: Math.round(canvasX - 150),
        y: Math.round(canvasY - 100),
        width: 300,
        height: 200,
        rotation: 0,
        opacity: 1,
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.15)",
      },
      animation: {
        in: {
          preset: "grow",
          start,
          duration,
          easing: "bouncy",
          scaleAmount: 1.15,
        },
        clips: [
          {
            id: clipId,
            name: "Grow",
            type: "in",
            preset: "grow",
            start,
            duration,
            easing: "bouncy",
            scaleAmount: 1.15,
          },
        ],
      },
    };
  }

  if (tool === "line" || tool === "arrow") {
    const isArrow = tool === "arrow";
    const newId = `${tool}_${Date.now()}`;
    const clipId = `clip_${Date.now()}_in`;
    return {
      id: newId,
      name: isArrow ? "Arrow" : "Line",
      type: "line",
      arrowStart: "none",
      arrowEnd: isArrow ? "arrow" : "none",
      strokeWidth: 3,
      strokeColor: THEME_TOKENS.accent.primary,
      style: {
        x: Math.round(canvasX - 100),
        y: Math.round(canvasY - 10),
        width: 200,
        height: 20,
        rotation: 0,
        opacity: 1,
      },
      animation: {
        in: {
          preset: "slideRight",
          start,
          duration,
          easing: "smooth",
          distance: 60,
        },
        clips: [
          {
            id: clipId,
            name: "Slide Right",
            type: "in",
            preset: "slideRight",
            start,
            duration,
            easing: "smooth",
            distance: 60,
          },
        ],
      },
    };
  }

  if (tool === "polygon") {
    const newId = `polygon_${Date.now()}`;
    const clipId = `clip_${Date.now()}_in`;
    return {
      id: newId,
      name: "Polygon",
      type: "polygon",
      sides: 5,
      style: {
        x: Math.round(canvasX - 100),
        y: Math.round(canvasY - 100),
        width: 200,
        height: 200,
        rotation: 0,
        opacity: 1,
        backgroundColor: THEME_TOKENS.accent.primary,
      },
      animation: {
        in: {
          preset: "pop",
          start,
          duration,
          easing: "bouncy",
          scaleAmount: 1.2,
        },
        clips: [
          {
            id: clipId,
            name: "Pop",
            type: "in",
            preset: "pop",
            start,
            duration,
            easing: "bouncy",
            scaleAmount: 1.2,
          },
        ],
      },
    };
  }

  if (["rectangle", "circle", "star", "triangle"].includes(tool)) {
    const shapeType = tool as "rectangle" | "circle" | "star" | "triangle";
    const newId = `shape_${Date.now()}`;
    const clipId = `clip_${Date.now()}_in`;
    const isRect = shapeType === "rectangle";
    const defaultPreset = isRect ? "grow" : "pop";
    const defaultName = isRect ? "Grow" : "Pop";

    return {
      id: newId,
      name: `${shapeType.charAt(0).toUpperCase() + shapeType.slice(1)}`,
      type: "shape",
      shapeType,
      style: {
        x: Math.round(canvasX - 100),
        y: Math.round(canvasY - 100),
        width: 200,
        height: 200,
        scaleX: 1,
        scaleY: 1,
        pivotX: 0.5,
        pivotY: 0.5,
        rotation: 0,
        opacity: 1,
        backgroundColor:
          shapeType === "circle"
            ? THEME_TOKENS.accent.highlight
            : THEME_TOKENS.accent.primary,
        borderRadius: shapeType === "circle" ? 9999 : 16,
      },
      animation: {
        in: {
          preset: defaultPreset,
          start,
          duration,
          easing: "bouncy",
          scaleAmount: isRect ? 1.15 : 1.2,
        },
        clips: [
          {
            id: clipId,
            name: defaultName,
            type: "in",
            preset: defaultPreset,
            start,
            duration,
            easing: "bouncy",
            scaleAmount: isRect ? 1.15 : 1.2,
          },
        ],
      },
    };
  }

  return null;
}
