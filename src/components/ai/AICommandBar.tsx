import React, { useState, useEffect, useRef } from "react";
import { Sparkles, ArrowRight, CornerDownLeft, X, Undo, Check } from "lucide-react";
import { useProjectStore, findLayerInTree } from "@/store/useProjectStore";
import { splitTextIntoChunks } from "@/engine/textSplitter";
import { TextLayer, GroupLayer, Layer } from "@/types/scene";

interface AICommandBarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AICommandBar: React.FC<AICommandBarProps> = ({ isOpen, onClose }) => {
  const {
    document: doc,
    activeScreenId,
    selectedLayerIds,
    updateLayer,
    updateLayerStyle,
    updateLayerAnimation,
    addLayer,
    removeLayer,
    undo,
  } = useProjectStore();

  const [prompt, setPrompt] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen && !toastMessage) return null;

  const activeScreen =
    doc.screens.find((s) => s.id === activeScreenId) || doc.screens[0];
  const selectedLayerId = selectedLayerIds[0];
  const selectedLayer = selectedLayerId
    ? findLayerInTree(activeScreen.layers, selectedLayerId)
    : null;

  // Natural Language Intent Evaluator (Deterministic AST Mutator)
  const handleExecute = (text: string) => {
    const query = text.toLowerCase().trim();
    if (!query) return;

    let appliedDescription = "";

    // 1. Stagger / Pop in instruction
    if (query.includes("stagger") || query.includes("pop")) {
      if (selectedLayer && selectedLayer.type === "group") {
        const group = selectedLayer as GroupLayer;
        const stagger = 0.15;
        group.children.forEach((child, idx) => {
          updateLayerAnimation(child.id, {
            in: {
              preset: "pop",
              start: idx * stagger,
              duration: 0.6,
              easing: "bouncy",
            },
          });
        });
        appliedDescription = `Staggered ${group.children.length} chunks with pop-in`;
      } else if (selectedLayer && selectedLayer.type === "text") {
        const splitGroup = splitTextIntoChunks(selectedLayer as TextLayer);
        removeLayer(selectedLayer.id);
        addLayer(splitGroup);
        appliedDescription = "Split text into chunks with staggered pop-in";
      } else {
        // Apply pop to root card
        if (selectedLayer) {
          updateLayerAnimation(selectedLayer.id, {
            in: {
              preset: "pop",
              start: 0,
              duration: 0.6,
              easing: "bouncy",
            },
          });
          appliedDescription = `Applied bouncy pop-in to ${selectedLayer.name}`;
        }
      }
    }
    // 2. Faster / Bouncy instruction
    else if (query.includes("faster") || query.includes("speed")) {
      if (selectedLayer) {
        if (selectedLayer.type === "group") {
          const group = selectedLayer as GroupLayer;
          group.children.forEach((child) => {
            if (child.animation?.in) {
              updateLayerAnimation(child.id, {
                in: {
                  ...child.animation.in,
                  duration: Math.max(child.animation.in.duration * 0.5, 0.2),
                  easing: "bouncy",
                },
              });
            }
          });
          appliedDescription = `Sped up ${group.children.length} animations by 2x`;
        } else if (selectedLayer.animation?.in) {
          updateLayerAnimation(selectedLayer.id, {
            in: {
              ...selectedLayer.animation.in,
              duration: Math.max(selectedLayer.animation.in.duration * 0.5, 0.2),
              easing: "bouncy",
            },
          });
          appliedDescription = `Sped up entrance by 2x with bouncy easing`;
        }
      }
    }
    // 3. Neon styling / Theme change
    else if (query.includes("neon") || query.includes("glow") || query.includes("cyan")) {
      if (selectedLayer) {
        updateLayerStyle(selectedLayer.id, {
          backgroundColor: "#09090b",
          borderColor: "#06b6d4",
          borderWidth: 2,
          shadows: [
            { x: 0, y: 0, blur: 30, spread: 2, color: "rgba(6,182,212,0.4)" },
          ],
        });
        appliedDescription = `Applied neon cyan glow styling`;
      }
    }
    // 4. Split into chunks
    else if (query.includes("split")) {
      if (selectedLayer && selectedLayer.type === "text") {
        const splitGroup = splitTextIntoChunks(selectedLayer as TextLayer);
        removeLayer(selectedLayer.id);
        addLayer(splitGroup);
        appliedDescription = `Split "${selectedLayer.name}" into kinetic chunks`;
      }
    }
    // 5. Default fallback: Apply smooth slide-up
    else {
      if (selectedLayer) {
        updateLayerAnimation(selectedLayer.id, {
          in: {
            preset: "slideUp",
            start: 0,
            duration: 0.6,
            easing: "smooth",
          },
        });
        appliedDescription = `Applied smooth slide-up entrance`;
      }
    }

    setToastMessage(`AI Applied: ${appliedDescription || "Requested changes"}`);
    setPrompt("");
    onClose();

    // Auto-dismiss toast after 5s
    setTimeout(() => {
      setToastMessage(null);
    }, 5000);
  };

  const suggestions = [
    "Split text into chunks and stagger pop-ins by 0.15s",
    "Make entrance 2x faster with bouncy easing",
    "Apply glowing neon cyan border and shadow",
    "Change entrance to smooth slide up",
  ];

  return (
    <>
      {/* Centered Modal Backdrop & Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/60 backdrop-blur-sm animate-in fade-in-0">
          <div className="w-full max-w-xl bg-zinc-900/95 border border-zinc-700 shadow-2xl rounded-2xl p-4 text-zinc-100 flex flex-col gap-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-violet-400">
                <Sparkles className="h-4 w-4" />
                <span className="font-semibold text-xs text-zinc-200">
                  AI Command Bar
                </span>
                {selectedLayer && (
                  <span className="text-[11px] text-zinc-500 bg-zinc-800/80 px-2 py-0.5 rounded">
                    Target: {selectedLayer.name}
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Input prompt */}
            <div className="relative flex items-center">
              <input
                ref={inputRef}
                type="text"
                placeholder="Type an instruction (e.g. 'Stagger chunks by 0.15s and make them pop in')..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleExecute(prompt);
                  if (e.key === "Escape") onClose();
                }}
                className="w-full h-11 pl-3 pr-10 bg-zinc-950/80 border border-zinc-700 rounded-xl text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-violet-500"
              />
              <button
                onClick={() => handleExecute(prompt)}
                className="absolute right-2 p-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white"
              >
                <CornerDownLeft className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Suggestions Chips */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                Quick Prompts
              </span>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((sug) => (
                  <button
                    key={sug}
                    onClick={() => handleExecute(sug)}
                    className="text-[11px] bg-zinc-800/70 hover:bg-zinc-800 hover:text-violet-300 text-zinc-300 px-2.5 py-1 rounded-lg border border-zinc-700/60 transition-colors text-left"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Non-Intrusive Bottom Toast with Instant Undo */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-zinc-900/95 border border-violet-500/50 shadow-2xl px-4 py-2 rounded-full text-xs text-zinc-200 animate-in fade-in-0 slide-in-from-bottom-3 backdrop-blur-md">
          <Sparkles className="h-3.5 w-3.5 text-violet-400" />
          <span>{toastMessage}</span>
          <div className="h-3.5 w-px bg-zinc-700 mx-1" />
          <button
            onClick={() => {
              undo();
              setToastMessage(null);
            }}
            className="flex items-center gap-1 font-semibold text-violet-400 hover:text-violet-300 transition-colors"
          >
            <Undo className="h-3 w-3" /> Undo
          </button>
          <button
            onClick={() => setToastMessage(null)}
            className="flex items-center gap-1 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <Check className="h-3 w-3" /> Keep
          </button>
        </div>
      )}
    </>
  );
};
