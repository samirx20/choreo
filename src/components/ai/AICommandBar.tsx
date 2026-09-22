import React, { useState, useEffect, useRef } from "react";
import { Sparkles, ArrowRight, CornerDownLeft, X, Undo, Check } from "lucide-react";
import { useProjectStore, findLayerInTree } from "@/store/useProjectStore";
import { splitTextIntoChunks } from "@/engine/textSplitter";
import { TextLayer, GroupLayer, Layer } from "@/types/scene";
import { executeTwoStagePipeline } from "@/tools/orchestrator";

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
    startTransaction,
    commitTransaction,
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

    startTransaction();
    let appliedDescription = "";

    // 0. Storyboard / Showcase Generation (Two-Stage Pipeline)
    const isGenerationIntent =
      !selectedLayer ||
      query.includes("teaser") ||
      query.includes("showcase") ||
      query.includes("video") ||
      query.startsWith("create") ||
      query.startsWith("generate") ||
      query.startsWith("build") ||
      query.startsWith("make");

    if (isGenerationIntent && (query.includes("teaser") || query.includes("showcase") || query.includes("video") || query.includes("promo") || !selectedLayer)) {
      const orchResult = executeTwoStagePipeline(text);
      if (orchResult.success && orchResult.data) {
        appliedDescription = `Generated ${orchResult.data.plan.beats.length}-beat "${orchResult.data.plan.title}" (${orchResult.data.totalDuration}s, Lint: ${orchResult.data.lintReport.score}/100)`;
      } else {
        appliedDescription = `Choreographed showcase with warnings: ${orchResult.notices.slice(0, 2).join("; ")}`;
      }
    }
    // 1. Stagger / Pop in instruction
    else if (query.includes("stagger") || query.includes("pop")) {

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
    // 3. Stamp Gold styling / Theme change
    else if (query.includes("gold") || query.includes("glow") || query.includes("stamp") || query.includes("neon")) {
      if (selectedLayer) {
        updateLayerStyle(selectedLayer.id, {
          backgroundColor: "#111111",
          borderColor: "#e8c547",
          borderWidth: 2,
          shadows: [
            { x: 0, y: 0, blur: 30, spread: 2, color: "rgba(232,197,71,0.4)" },
          ],
        });
        appliedDescription = `Applied Stamp Gold glow styling`;
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

    commitTransaction();
    setToastMessage(`Applied AI generation: ${appliedDescription || "Requested changes"}`);
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
    "Apply glowing Stamp Gold border and shadow",
    "Change entrance to smooth slide up",
  ];

  return (
    <>
      {/* Centered Modal Backdrop & Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/60 backdrop-blur-sm animate-in fade-in-0">
          <div className="w-full max-w-xl bg-card border border-border shadow-2xl rounded-2xl p-4 text-foreground flex flex-col gap-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary">
                <Sparkles className="h-4 w-4" />
                <span className="font-semibold text-xs text-foreground">
                  AI Command Bar
                </span>
                {selectedLayer && (
                  <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border">
                    Target: {selectedLayer.name}
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
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
                className="w-full h-11 pl-3 pr-10 bg-background border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={() => handleExecute(prompt)}
                className="absolute right-2 p-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                <CornerDownLeft className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Suggestions Chips */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                Quick Prompts
              </span>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((sug) => (
                  <button
                    key={sug}
                    onClick={() => handleExecute(sug)}
                    className="text-[11px] bg-secondary hover:bg-muted hover:text-primary text-foreground/80 px-2.5 py-1 rounded-lg border border-border transition-colors text-left"
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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-card border border-primary/40 shadow-2xl px-4 py-2 rounded-full text-xs text-foreground animate-in fade-in-0 slide-in-from-bottom-3 backdrop-blur-md">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>{toastMessage}</span>
          <div className="h-3.5 w-px bg-border mx-1" />
          <button
            onClick={() => {
              undo();
              setToastMessage(null);
            }}
            className="flex items-center gap-1 font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            <Undo className="h-3 w-3" /> Undo
          </button>
          <button
            onClick={() => setToastMessage(null)}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Check className="h-3 w-3" /> Keep
          </button>
        </div>
      )}
    </>
  );
};
