import { create } from "zustand";

interface McpState {
  isMcpEnabled: boolean;
  port: number;
  status: "stopped" | "starting" | "running" | "error";
  error: string | null;
  setPort: (port: number) => void;
  toggleMcp: () => void;
  setMcpEnabled: (enabled: boolean) => void;
  startServer: (customPort?: number) => Promise<boolean>;
  stopServer: () => Promise<boolean>;
  checkStatus: () => Promise<boolean>;
}

const STORAGE_KEY_ENABLED = "motion_studio_mcp_enabled";
const STORAGE_KEY_PORT = "motion_studio_mcp_port";
const DEFAULT_PORT = 8765;

export const useMcpStore = create<McpState>((set, get) => {
  let initialEnabled = true;
  let initialPort = DEFAULT_PORT;

  if (typeof window !== "undefined" && window.localStorage) {
    const savedEnabled = window.localStorage.getItem(STORAGE_KEY_ENABLED);
    if (savedEnabled !== null) {
      initialEnabled = savedEnabled === "true";
    }
    const savedPort = window.localStorage.getItem(STORAGE_KEY_PORT);
    if (savedPort !== null) {
      const parsed = parseInt(savedPort, 10);
      if (!isNaN(parsed) && parsed > 0 && parsed <= 65535) {
        initialPort = parsed;
      }
    }
  }

  return {
    isMcpEnabled: initialEnabled,
    port: initialPort,
    status: "stopped",
    error: null,

    setPort: (port: number) => {
      const clamped = Math.max(1024, Math.min(65535, port));
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY_PORT, String(clamped));
      }
      set({ port: clamped, error: null });
    },

    toggleMcp: () => {
      const { status, startServer, stopServer } = get();
      if (status === "running") {
        stopServer();
      } else {
        startServer();
      }
    },

    setMcpEnabled: (enabled: boolean) => {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY_ENABLED, String(enabled));
      }
      set({ isMcpEnabled: enabled });
    },

    startServer: async (customPort?: number) => {
      const targetPort = customPort || get().port;
      set({ status: "starting", error: null });

      // First check if an MCP server is already alive on targetPort
      try {
        const res = await fetch(`http://127.0.0.1:${targetPort}/health`, { signal: AbortSignal.timeout(600) });
        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (data?.name === "motion-studio") {
            set({ status: "running", port: targetPort, isMcpEnabled: true, error: null });
            if (typeof window !== "undefined" && window.localStorage) {
              window.localStorage.setItem(STORAGE_KEY_PORT, String(targetPort));
              window.localStorage.setItem(STORAGE_KEY_ENABLED, "true");
            }
            return true;
          }
        }
      } catch {
        // Not running yet, proceed with starting
      }

      const isDesktop =
        typeof window !== "undefined" &&
        ("__TAURI_INTERNALS__" in window || "__TAURI__" in window);

      if (isDesktop) {
        try {
          const { invoke } = await import("@tauri-apps/api/core");
          await invoke("start_mcp_server", { port: targetPort });

          // Verify server health via HTTP endpoint
          let isHealthy = false;
          for (let i = 0; i < 15; i++) {
            await new Promise((r) => setTimeout(r, 200));
            try {
              const res = await fetch(`http://127.0.0.1:${targetPort}/health`, { signal: AbortSignal.timeout(400) });
              if (res.ok) {
                isHealthy = true;
                break;
              }
            } catch {}
          }

          if (isHealthy) {
            set({ status: "running", port: targetPort, isMcpEnabled: true, error: null });
            if (typeof window !== "undefined" && window.localStorage) {
              window.localStorage.setItem(STORAGE_KEY_PORT, String(targetPort));
              window.localStorage.setItem(STORAGE_KEY_ENABLED, "true");
            }
            return true;
          } else {
            const isAlive = await invoke<boolean>("is_mcp_server_running").catch(() => false);
            if (!isAlive) {
              set({ status: "error", error: "MCP server process exited unexpectedly after starting." });
              return false;
            }
            set({ status: "running", port: targetPort, isMcpEnabled: true, error: null });
            return true;
          }
        } catch (err: any) {
          const msg = err?.message || String(err);
          set({ status: "error", error: msg });
          return false;
        }
      } else {
        // Web / dev mode: check if local mcp server is reachable
        try {
          const res = await fetch(`http://127.0.0.1:${targetPort}/health`, { signal: AbortSignal.timeout(1500) });
          if (res.ok) {
            set({ status: "running", port: targetPort, isMcpEnabled: true, error: null });
            return true;
          }
        } catch {
          // Server not reachable yet
        }
        // Set running state optimistically in web preview
        set({ status: "running", port: targetPort, isMcpEnabled: true, error: null });
        return true;
      }
    },

    stopServer: async () => {
      const isDesktop =
        typeof window !== "undefined" &&
        ("__TAURI_INTERNALS__" in window || "__TAURI__" in window);

      if (isDesktop) {
        try {
          const { invoke } = await import("@tauri-apps/api/core");
          await invoke("stop_mcp_server");
        } catch (err: any) {
          console.error("Error stopping MCP server:", err);
        }
      }

      set({ status: "stopped", isMcpEnabled: false, error: null });
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY_ENABLED, "false");
      }
      return true;
    },

    checkStatus: async () => {
      const { port } = get();
      const isDesktop =
        typeof window !== "undefined" &&
        ("__TAURI_INTERNALS__" in window || "__TAURI__" in window);

      if (isDesktop) {
        try {
          const { invoke } = await import("@tauri-apps/api/core");
          const isRunning = await invoke<boolean>("is_mcp_server_running");
          if (isRunning) {
            set({ status: "running", isMcpEnabled: true });
            return true;
          }
        } catch {
          // Fall through to health check
        }
      }

      try {
        const res = await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(800) });
        if (res.ok) {
          set({ status: "running", isMcpEnabled: true });
          return true;
        }
      } catch {
        // Not reachable
      }

      set({ status: "stopped" });
      return false;
    },
  };
});
