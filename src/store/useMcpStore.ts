import { create } from "zustand";

interface McpState {
  isMcpEnabled: boolean;
  toggleMcp: () => void;
  setMcpEnabled: (enabled: boolean) => void;
}

const STORAGE_KEY = "motion_studio_mcp_enabled";

export const useMcpStore = create<McpState>((set) => {
  // Read initial setting from localStorage, default to true
  let initial = true;
  if (typeof window !== "undefined" && window.localStorage) {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      initial = saved === "true";
    }
  }

  return {
    isMcpEnabled: initial,
    toggleMcp: () =>
      set((state) => {
        const next = !state.isMcpEnabled;
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.setItem(STORAGE_KEY, String(next));
        }
        return { isMcpEnabled: next };
      }),
    setMcpEnabled: (enabled: boolean) => {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, String(enabled));
      }
      set({ isMcpEnabled: enabled });
    },
  };
});
