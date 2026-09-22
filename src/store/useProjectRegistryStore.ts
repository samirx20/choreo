import { create } from "zustand";
import { ProjectMeta, ProjectSortOption, CreateProjectOptions } from "@/types/project";
import {
  getProjectRegistry,
  loadProjectDocument,
  saveProjectDocument,
  createProject as storageCreateProject,
  duplicateProject as storageDuplicateProject,
  deleteProject as storageDeleteProject,
  renameProject as storageRenameProject,
  exportProjectFile,
  importProjectFile,
  getActiveProjectId,
  setActiveProjectId,
  sortProjects,
} from "@/services/projectStorage";
import { useProjectStore } from "./useProjectStore";

export type StudioView = "workspace" | "editor";

export interface ProjectRegistryState {
  projects: ProjectMeta[];
  activeProjectId: string | null;
  currentView: StudioView;
  searchQuery: string;
  sortBy: ProjectSortOption;
  isNewProjectModalOpen: boolean;

  // Actions
  loadRegistry: () => void;
  openProject: (id: string) => boolean;
  closeProject: () => void;
  createNewProject: (options: CreateProjectOptions) => string;
  duplicateProject: (id: string) => string | null;
  deleteProject: (id: string) => void;
  renameProject: (id: string, newName: string) => void;
  importProject: (jsonContent: string) => string | null;
  exportProject: (id: string) => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (sortBy: ProjectSortOption) => void;
  setIsNewProjectModalOpen: (isOpen: boolean) => void;
  syncCurrentProjectName: (name: string) => void;
}

export const useProjectRegistryStore = create<ProjectRegistryState>((set, get) => ({
  projects: [],
  activeProjectId: null,
  currentView: "workspace",
  searchQuery: "",
  sortBy: "updatedAt",
  isNewProjectModalOpen: false,

  loadRegistry: () => {
    const list = getProjectRegistry();
    const sorted = sortProjects(list, get().sortBy);
    const storedActiveId = getActiveProjectId();

    set({ projects: sorted });

    // Check if we should restore an active project (e.g. from session)
    if (storedActiveId && list.some((p) => p.id === storedActiveId)) {
      get().openProject(storedActiveId);
    }
  },

  openProject: (id: string) => {
    const doc = loadProjectDocument(id);
    if (!doc) return false;

    // Load document into the studio editor store
    useProjectStore.getState().loadDocument(doc);

    setActiveProjectId(id);
    set({
      activeProjectId: id,
      currentView: "editor",
    });
    return true;
  },

  closeProject: () => {
    const activeId = get().activeProjectId;
    if (activeId) {
      // Auto-save currently active document state before closing
      const currentDoc = useProjectStore.getState().document;
      saveProjectDocument(activeId, currentDoc);
    }

    setActiveProjectId(null);
    const updatedList = sortProjects(getProjectRegistry(), get().sortBy);
    set({
      activeProjectId: null,
      currentView: "workspace",
      projects: updatedList,
    });
  },

  createNewProject: (options: CreateProjectOptions) => {
    const { id, document: doc } = storageCreateProject(options);

    // Immediately load document into studio store
    useProjectStore.getState().loadDocument(doc);
    setActiveProjectId(id);

    const updatedList = sortProjects(getProjectRegistry(), get().sortBy);
    set({
      projects: updatedList,
      activeProjectId: id,
      currentView: "editor",
      isNewProjectModalOpen: false,
    });

    return id;
  },

  duplicateProject: (id: string) => {
    const res = storageDuplicateProject(id);
    if (!res) return null;

    const updatedList = sortProjects(getProjectRegistry(), get().sortBy);
    set({ projects: updatedList });
    return res.id;
  },

  deleteProject: (id: string) => {
    storageDeleteProject(id);
    const updatedList = sortProjects(getProjectRegistry(), get().sortBy);
    set({ projects: updatedList });
  },

  renameProject: (id: string, newName: string) => {
    storageRenameProject(id, newName);
    // If the renamed project is currently active in editor, update store doc name too
    if (get().activeProjectId === id) {
      useProjectStore.getState().setProjectName(newName);
    }
    const updatedList = sortProjects(getProjectRegistry(), get().sortBy);
    set({ projects: updatedList });
  },

  syncCurrentProjectName: (name: string) => {
    const activeId = get().activeProjectId;
    if (activeId) {
      storageRenameProject(activeId, name);
      const updatedList = sortProjects(getProjectRegistry(), get().sortBy);
      set({ projects: updatedList });
    }
  },

  importProject: (jsonContent: string) => {
    try {
      const { id, document: doc } = importProjectFile(jsonContent);
      useProjectStore.getState().loadDocument(doc);
      setActiveProjectId(id);

      const updatedList = sortProjects(getProjectRegistry(), get().sortBy);
      set({
        projects: updatedList,
        activeProjectId: id,
        currentView: "editor",
      });
      return id;
    } catch (err) {
      console.error("Failed to import project:", err);
      return null;
    }
  },

  exportProject: (id: string) => {
    const jsonStr = exportProjectFile(id);
    if (!jsonStr) return;

    const meta = get().projects.find((p) => p.id === id);
    const fileName = `${(meta?.name || "project").toLowerCase().replace(/[^a-z0-9_-]/g, "_")}.motion`;

    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  setSortBy: (sortBy: ProjectSortOption) => {
    set((state) => ({
      sortBy,
      projects: sortProjects(state.projects, sortBy),
    }));
  },

  setIsNewProjectModalOpen: (isOpen: boolean) => {
    set({ isNewProjectModalOpen: isOpen });
  },
}));
