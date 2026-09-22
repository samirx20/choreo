import { create } from "zustand";
import React from "react";

export type ContextMenuZone =
  | "timeline-clip"
  | "timeline-track"
  | "timeline-empty"
  | "timeline-ruler"
  | "canvas-element"
  | "canvas-pasteboard"
  | "sidebar-card"
  | "scene";

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  divider?: boolean;
  action?: () => void;
  children?: ContextMenuItem[];
}

export interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  zone: ContextMenuZone | null;
  items: ContextMenuItem[];
  contextData: any;
  openContextMenu: (options: {
    x: number;
    y: number;
    zone: ContextMenuZone;
    items: ContextMenuItem[];
    contextData?: any;
  }) => void;
  closeContextMenu: () => void;
}

export const useContextMenuStore = create<ContextMenuState>((set) => ({
  isOpen: false,
  x: 0,
  y: 0,
  zone: null,
  items: [],
  contextData: null,

  openContextMenu: ({ x, y, zone, items, contextData }) => {
    set({
      isOpen: true,
      x,
      y,
      zone,
      items,
      contextData: contextData ?? null,
    });
  },

  closeContextMenu: () => {
    set({
      isOpen: false,
      zone: null,
      items: [],
      contextData: null,
    });
  },
}));
