import React, { useState, useEffect } from "react";
import { useProjectStore, isMotionMode } from "@/store/useProjectStore";
import { useProjectRegistryStore } from "@/store/useProjectRegistryStore";
import { ProjectsWorkspace } from "@/components/workspace/ProjectsWorkspace";
import { TopNavBar } from "@/components/layout/TopNavBar";
import { LeftSidebar } from "@/components/sidebar/LeftSidebar";
import { CanvasViewport } from "@/components/canvas/CanvasViewport";
import { RightInspectorPanel } from "@/components/inspector/RightInspectorPanel";
import { TimelinePanel } from "@/components/timeline/TimelinePanel";
import { AICommandBar } from "@/components/ai/AICommandBar";
import { ComponentsDrawer } from "@/components/components/ComponentsDrawer";
import { ExportModal } from "@/components/export/ExportModal";
import { ShortcutsModal } from "@/components/modals/ShortcutsModal";
import { UniversalContextMenuPortal } from "@/components/common/UniversalContextMenuPortal";
import { cn } from "@/lib/utils";

const App: React.FC = () => {
  const {
    document: doc,
    activeScreenId,
    uiMode,
    setUiMode,
    undo,
    redo,
    isPlaying,
    setIsPlaying,
    selectedLayerIds,
    duplicateLayer,
    deleteScreen,
  } = useProjectStore();

  const {
    currentView,
    loadRegistry,
    closeProject,
  } = useProjectRegistryStore();

  const [isAiBarOpen, setIsAiBarOpen] = useState(false);
  const [isComponentsDrawerOpen, setIsComponentsDrawerOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);

  const theme = useProjectStore((s) => s.theme);

  useEffect(() => {
    (window as any).__store = useProjectStore;
    (window as any).__registryStore = useProjectRegistryStore;
    loadRegistry();
  }, [loadRegistry]);

  // Synchronize document theme class
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // In workspace view, do not intercept editor keyboard shortcuts
      if (currentView === "workspace") return;

      const isInput =
        ["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName) ||
        (e.target as HTMLElement).isContentEditable;

      // 0. Zen Presentation Mode: Ctrl+\ or Cmd+\ (or Esc to exit Zen mode)
      if ((e.ctrlKey || e.metaKey) && e.key === "\\") {
        e.preventDefault();
        setIsZenMode((prev) => !prev);
        return;
      }
      if (e.key === "Escape" && isZenMode) {
        e.preventDefault();
        setIsZenMode(false);
        return;
      }

      // 1. AI Command Bar: Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsAiBarOpen((prev) => !prev);
        return;
      }

      // 2. Undo: Ctrl+Z / Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey && !isInput) {
        e.preventDefault();
        undo();
        return;
      }

      // 3. Redo: Ctrl+Shift+Z / Cmd+Shift+Z / Ctrl+Y
      if (
        ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey && !isInput) ||
        ((e.ctrlKey || e.metaKey) && e.key === "y" && !isInput)
      ) {
        e.preventDefault();
        redo();
        return;
      }

      // 4. Duplicate: Ctrl+D / Cmd+D
      if ((e.ctrlKey || e.metaKey) && e.key === "d" && !isInput) {
        e.preventDefault();
        selectedLayerIds.forEach((id) => duplicateLayer(id));
        return;
      }

      // 5. Mode Toggle: Tab (when not editing input)
      if (e.key === "Tab" && !isInput) {
        e.preventDefault();
        setUiMode(uiMode === "design" ? "motion" : "design");
        return;
      }

      // 6. Play / Pause: Space (Motion Mode only; in Design Mode, Space pans canvas)
      if (e.code === "Space" && !isInput && isMotionMode(uiMode)) {
        e.preventDefault();
        setIsPlaying(!isPlaying);
        return;
      }

      // 7. Keyboard Shortcuts Modal: ? or Ctrl+/
      if ((e.key === "?" || ((e.ctrlKey || e.metaKey) && e.key === "/")) && !isInput) {
        e.preventDefault();
        setIsShortcutsModalOpen((prev) => !prev);
        return;
      }

      // 8. Rename Layer: F2
      if (e.key === "F2" && !isInput && selectedLayerIds.length > 0) {
        e.preventDefault();
        window.dispatchEvent(
          new CustomEvent("motion-rename-layer", {
            detail: { layerId: selectedLayerIds[0] },
          })
        );
        return;
      }

      // 9. Delete Scene: Delete / Backspace when scene is selected and no layers are selected
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        !isInput &&
        selectedLayerIds.length === 0 &&
        activeScreenId &&
        doc.screens.length > 1
      ) {
        e.preventDefault();
        deleteScreen(activeScreenId);
        return;
      }
    };

    // Suppress default browser context menu globally for a native desktop application experience
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("contextmenu", handleContextMenu);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [
    doc.screens.length,
    activeScreenId,
    deleteScreen,
    uiMode,
    setUiMode,
    undo,
    redo,
    isPlaying,
    setIsPlaying,
    selectedLayerIds,
    duplicateLayer,
    isZenMode,
    currentView,
  ]);

  // 1. Projects Management Workspace (Dashboard / Home View)
  if (currentView === "workspace") {
    return <ProjectsWorkspace />;
  }

  // 2. Motion Studio Canvas Editor View
  return (
    <div className="h-screen w-screen flex flex-col bg-background text-foreground overflow-hidden font-sans select-none relative">
      {/* 1. Global Tool Header */}
      {!isZenMode && (
        <TopNavBar
          onOpenAiBar={() => setIsAiBarOpen(true)}
          onOpenExportModal={() => setIsExportModalOpen(true)}
          onToggleZenMode={() => setIsZenMode((prev) => !prev)}
          onBackToWorkspace={closeProject}
        />
      )}

      {/* 2. Main Studio Workspace */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Left Sidebar: Screens & Outliner */}
        {!isZenMode && <LeftSidebar />}

        {/* Center: Studio Viewport */}
        <CanvasViewport
          onOpenComponentsDrawer={() => setIsComponentsDrawerOpen(true)}
          onOpenAiBar={() => setIsAiBarOpen(true)}
        />

        {/* Right Sidebar Inspector (Jitter Design & Animate Switcher) */}
        {!isZenMode && <RightInspectorPanel />}
      </div>

      {/* 3. Bottom Multi-Track Sequencer & Timeline (Motion Mode) */}
      {!isZenMode && isMotionMode(uiMode) && (
        <div className="shrink-0 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]">
          <TimelinePanel />
        </div>
      )}

      {/* Zen Mode Exit Badge */}
      {isZenMode && (
        <div
          onClick={() => setIsZenMode(false)}
          className="absolute top-4 right-4 z-50 bg-[#101014]/90 backdrop-blur-md border border-white/[0.1] text-[11px] text-[#a1a1aa] hover:text-white px-2.5 py-1 rounded-full cursor-pointer shadow-2xl transition-all"
        >
          Exit Zen Mode (Esc)
        </div>
      )}

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

      {/* Universal Context Menu Portal (Zones A-G) */}
      <UniversalContextMenuPortal />
    </div>
  );
};

export default App;
