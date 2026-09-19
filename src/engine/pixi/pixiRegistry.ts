import { PixiStage } from "./PixiStage";

let activeStage: PixiStage | null = null;

export function setActivePixiStage(stage: PixiStage | null): void {
  activeStage = stage;
}

export function getActivePixiStage(): PixiStage | null {
  return activeStage;
}
