import React, { useState, useEffect } from "react";
import { useProjectStore } from "@/store/useProjectStore";
import { TopNavBar } from "@/components/layout/TopNavBar";
import { LeftSidebar } from "@/components/sidebar/LeftSidebar";
import { CanvasViewport } from "@/components/canvas/CanvasViewport";
import { DesignInspector } from "@/components/inspector/DesignInspector";
import { AnimateInspector } from "@/components/inspector/AnimateInspector";
import { TimelinePanel } from "@/components/timeline/TimelinePanel";
import { AICommandBar } from "@/components/ai/AICommandBar";
import { ComponentsDrawer } from "@/components/components/ComponentsDrawer";
import { ExportModal } from "@/components/export/ExportModal";
import { ShortcutsModal } from "@/components/modals/ShortcutsModal";

export const App: React.FC = () => {
  const {
    uiMode,
    setUiMode,
    undo,
    redo,
    isPlaying,
    setIsPlaying,
    selectedLayerIds,
    duplicateLayer,
    removeLayer,
  } = useProjectStore();

  const [isAiBarOpen, setIsAiBarOpen] = useState(false);
  const [isComponentsDrawerOpen, setIsComponentsDrawerOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput =
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA";

      // 1. AI Command Bar: Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsAiBarOpen((prev) => !prev);
        return;
      }

      // 2. Undo: Ctrl+Z
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "z") {
        if (!isInput) {
          e.preventDefault();
          undo();
          return;
        }
      }

      // 3. Redo: Ctrl+Shift+Z or Ctrl+Y
      if (
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "z") ||
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y")
      ) {
        if (!isInput) {
          e.preventDefault();
          redo();
          return;
        }
      }

      // 4. Mode Toggle: Tab
      if (e.key === "Tab" && !isInput) {
        e.preventDefault();
        setUiMode(uiMode === "design" ? "animate" : "design");
        return;
      }

      // 5. Play / Pause: Space
      if (e.code === "Space" && !isInput) {
        e.preventDefault();
        setIsPlaying(!isPlaying);
        return;
      }

      // 6. Duplicate Layer: Ctrl+D
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d" && !isInput) {
        e.preventDefault();
        if (selectedLayerIds.length > 0) {
          duplicateLayer(selectedLayerIds[0]);
        }
        return;
      }

      // 7. Delete Layer: Delete or Backspace
      if ((e.key === "Delete" || e.key === "Backspace") && !isInput) {
        if (selectedLayerIds.length > 0) {
          e.preventDefault();
          removeLayer(selectedLayerIds[0]);
        }
        return;
      }

      // 8. Keyboard Shortcuts Modal: ? or Ctrl+/
      if ((e.key === "?" || ((e.ctrlKey || e.metaKey) && e.key === "/")) && !isInput) {
        e.preventDefault();
        setIsShortcutsModalOpen((prev) => !prev);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    uiMode,
    setUiMode,
    undo,
    redo,
    isPlaying,
    setIsPlaying,
    selectedLayerIds,
    duplicateLayer,
    removeLayer,
  ]);

  return (
    <div className="h-screen w-screen flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      {/* 1. Global Header */}
      <TopNavBar
        onOpenAiBar={() => setIsAiBarOpen(true)}
        onOpenExportModal={() => setIsExportModalOpen(true)}
      />

      {/* 2. Main Studio Workspace */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Left Sidebar: Screens & Layers */}
        <LeftSidebar />

        {/* Center: Canvas Viewport */}
        <CanvasViewport
          onOpenComponentsDrawer={() => setIsComponentsDrawerOpen(true)}
        />

        {/* Right Sidebar Inspector (Design or Animate based on active mode) */}
        {uiMode === "design" ? <DesignInspector /> : <AnimateInspector />}
      </div>

      {/* 3. Bottom Multi-Track Sequencer & Timeline (Animate Mode Only) */}
      {uiMode === "animate" && <TimelinePanel />}

      {/* 4. Floating Overlays & Modals */}
      <AICommandBar
        isOpen={isAiBarOpen}
        onClose={() => setIsAiBarOpen(false)}
      />

      <ComponentsDrawer
        isOpen={isComponentsDrawerOpen}
        onClose={() => setIsComponentsDrawerOpen(false)}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />

      <ShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />
    </div>
  );
};

export default App;
