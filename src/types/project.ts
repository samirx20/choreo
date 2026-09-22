import { SceneDocument } from "./scene";

export interface ProjectMeta {
  id: string;
  name: string;
  width: number;
  height: number;
  fps: number;
  duration: number;
  screenCount: number;
  backgroundColor: string;
  createdAt: number;
  updatedAt: number;
}

export type AspectRatioPresetId =
  | "16:9"
  | "9:16"
  | "1:1"
  | "4:5"
  | "custom";

export interface AspectRatioPreset {
  id: AspectRatioPresetId;
  label: string;
  subLabel: string;
  width: number;
  height: number;
  aspectRatioDisplay: string;
}

export const ASPECT_RATIO_PRESETS: AspectRatioPreset[] = [
  {
    id: "16:9",
    label: "Landscape",
    subLabel: "YouTube, Presentations, Keynotes",
    width: 1920,
    height: 1080,
    aspectRatioDisplay: "16:9",
  },
  {
    id: "9:16",
    label: "Vertical",
    subLabel: "Reels, Shorts, TikTok, Stories",
    width: 1080,
    height: 1920,
    aspectRatioDisplay: "9:16",
  },
  {
    id: "1:1",
    label: "Square",
    subLabel: "Instagram & LinkedIn Feed",
    width: 1080,
    height: 1080,
    aspectRatioDisplay: "1:1",
  },
  {
    id: "4:5",
    label: "Portrait",
    subLabel: "Social Media Feed Portrait",
    width: 1080,
    height: 1350,
    aspectRatioDisplay: "4:5",
  },
];

export type ProjectSortOption = "updatedAt" | "name" | "createdAt";

export interface CreateProjectOptions {
  name: string;
  width: number;
  height: number;
  fps?: number;
  duration?: number;
  backgroundColor?: string;
  template?: "blank" | "teaser";
}
