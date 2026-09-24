import { SceneDocument, Screen, TextLayer } from "@/types/scene";

export interface BeatSnapshot {
  sceneId: string;
  index: number;
  name: string;
  duration: number;
  timeWindow: [number, number]; // [startSec, endSec]
  mood?: string;
  stepFps?: string | number;
  layerCount: number;
  headlines: string[];
  keyElements: string[];
  cameraFraming: string;
  transitions: string[];
}

export interface StoryboardContactSheet {
  projectTitle: string;
  totalDuration: number;
  resolution: { width: number; height: number };
  fps: number;
  beatCount: number;
  beats: BeatSnapshot[];
}

/**
 * Generates a structured Contact Sheet representation of the storyboard scenes.
 * Allows AI agents to visually inspect composition, narrative pacing, and layout in $O(1)$ time.
 */
export function generateContactSheet(doc: SceneDocument): StoryboardContactSheet {
  let currentTime = 0;

  const beats: BeatSnapshot[] = doc.screens.map((screen: Screen, index: number) => {
    const duration = screen.duration || 3.0;
    const timeWindow: [number, number] = [
      Math.round(currentTime * 100) / 100,
      Math.round((currentTime + duration) * 100) / 100,
    ];
    currentTime += duration;

    // Extract key text headlines
    const headlines: string[] = [];
    const keyElements: string[] = [];
    const transitions: string[] = [];

    screen.layers.forEach((layer) => {
      if (layer.type === "text") {
        const textLayer = layer as TextLayer;
        if (textLayer.content && (textLayer.style?.fontSize ?? 0) >= 32) {
          headlines.push(`"${textLayer.content.slice(0, 40)}${textLayer.content.length > 40 ? "…" : ""}"`);
        }
      } else if (layer.type === "mockup3d" || (layer.type as string) === "mockup-3d") {
        keyElements.push(`3D Mockup (${layer.name})`);
      } else if (layer.type === "icon") {
        keyElements.push(`Icon (${layer.name})`);
      } else if (layer.type === "counter") {
        keyElements.push(`Kinetic Counter (${layer.name})`);
      } else if (layer.type === "frame") {
        keyElements.push(`Frame Container (${layer.name})`);
      } else if (layer.type === "image" || layer.type === "video") {
        keyElements.push(`${layer.type.toUpperCase()} (${layer.name})`);
      }

      if (layer.animation?.in?.preset) {
        transitions.push(`${layer.name}: ${layer.animation.in.preset} (${layer.animation.in.easing || "spring"})`);
      }
    });

    const cameraFraming = screen.layers.some((l) => l.type === "mockup3d" || (l.type as string) === "mockup-3d")
      ? "Telephoto 35mm 3D Stage"
      : "2D Modular Grid Stage";

    return {
      sceneId: screen.id,
      index,
      name: screen.name,
      duration,
      timeWindow,
      mood: screen.mood || "product-showcase",
      stepFps: screen.stepFps || "smooth",
      layerCount: screen.layers.length,
      headlines: headlines.slice(0, 3),
      keyElements: keyElements.slice(0, 5),
      cameraFraming,
      transitions: transitions.slice(0, 4),
    };
  });

  return {
    projectTitle: doc.name || (doc as any).title || "Untitled Project",
    totalDuration: Math.round(currentTime * 100) / 100,
    resolution: { width: doc.settings.width, height: doc.settings.height },
    fps: doc.settings.fps,
    beatCount: beats.length,
    beats,
  };
}
