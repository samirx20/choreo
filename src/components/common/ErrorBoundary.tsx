import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw, Trash2, Copy, Check } from "lucide-react";
import { STORAGE_DOC_KEY } from "@/store/useProjectStore";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, copied: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(STORAGE_DOC_KEY);
      }
    } catch {
      // ignore
    }
    window.location.reload();
  };

  private handleCopy = () => {
    if (this.state.error) {
      navigator.clipboard.writeText(
        `${this.state.error.name}: ${this.state.error.message}\n${this.state.error.stack || ""}`
      );
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen w-full bg-background text-foreground flex items-center justify-center p-6 select-none">
          <div className="max-w-md w-full p-6 rounded-[20px] bg-card border border-border shadow-lg space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h2 className="text-base font-semibold text-foreground">Studio Interruption Recovered</h2>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                An unexpected interface issue was intercepted. Your project data has been safely preserved.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 rounded-[12px] bg-muted/60 border border-border text-left">
                <div className="text-[11px] font-mono text-muted-foreground break-all line-clamp-3">
                  {this.state.error.message || "Unknown error"}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full h-9 rounded-[10px] bg-primary text-primary-foreground font-medium text-xs hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reload Studio
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={this.handleCopy}
                  className="flex-1 h-8 rounded-[8px] bg-muted hover:bg-muted/80 text-foreground text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                >
                  {this.state.copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {this.state.copied ? "Copied" : "Copy Details"}
                </button>

                <button
                  onClick={this.handleReset}
                  className="flex-1 h-8 rounded-[8px] bg-muted hover:bg-destructive/10 hover:text-destructive text-muted-foreground text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Reset Project
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
