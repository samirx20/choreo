import React from "react";
import { X, Keyboard } from "lucide-react";

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const categories = [
    {
      title: "Navigation & Modes",
      shortcuts: [
        { key: "Tab", desc: "Toggle between Design and Animate mode" },
        { key: "Space", desc: "Play / Pause timeline playback" },
        { key: "Space + Drag", desc: "Pan canvas viewport" },
        { key: "Ctrl + Wheel", desc: "Zoom in / out" },
        { key: ",", desc: "Step back 1 frame" },
        { key: ".", desc: "Step forward 1 frame" },
        { key: "Home", desc: "Jump to beginning of scene" },
      ],
    },
    {
      title: "Editing & Operations",
      shortcuts: [
        { key: "Ctrl + K", desc: "Open AI Command Bar" },
        { key: "Ctrl + Z", desc: "Undo last action (transactional)" },
        { key: "Ctrl + Shift + Z", desc: "Redo last action" },
        { key: "Ctrl + D", desc: "Duplicate selected layer" },
        { key: "Delete / Backspace", desc: "Delete selected layer" },
        { key: "Shift + Drag", desc: "Constrain movement to axis / 1:1 resize / 15° rotation" },
        { key: "?", desc: "Open this Keyboard Shortcuts cheat sheet" },
      ],
    },
  ];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in-0 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-card border border-border shadow-2xl rounded-2xl p-5 flex flex-col gap-4 text-foreground"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/15 text-primary border border-primary/30 flex items-center justify-center">
              <Keyboard className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Keyboard Shortcuts</h2>
              <p className="text-[11px] text-muted-foreground">
                Speed up your animation workflow with hotkeys
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="grid grid-cols-2 gap-4 max-h-96 overflow-y-auto pr-1">
          {categories.map((cat) => (
            <div key={cat.title} className="space-y-2">
              <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                {cat.title}
              </h3>
              <div className="space-y-1.5">
                {cat.shortcuts.map((sc) => (
                  <div
                    key={sc.key}
                    className="flex items-center justify-between p-1.5 rounded-lg bg-secondary/40 border border-border text-xs"
                  >
                    <span className="text-[11px] text-foreground/80 pr-2 truncate">
                      {sc.desc}
                    </span>
                    <kbd className="bg-muted px-1.5 py-0.5 rounded border border-border font-mono text-[10px] text-primary shrink-0">
                      {sc.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
