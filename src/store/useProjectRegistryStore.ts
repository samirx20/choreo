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
import {
  saveProjectToFile,
  openProjectFromFile,
  readProjectFromFileBlob,
  clearActiveFileHandle,
  triggerBrowserDownload,
  sanitizeProjectFileName,
} from "@/services/fileAdapter";
import { MOTION_FILE_EXTENSION } from "@/types/projectFile";
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
  saveCurrentProjectToFile: (options?: { forceSaveAs?: boolean }) => Promise<{ ok: boolean; fileName?: string; error?: string }>;
  openProjectFromFilePicker: () => Promise<string | null>;
  loadProjectFromFileBlob: (blob: Blob | File) => Promise<string | null>;
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

    clearActiveFileHandle();
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
    const fileName = `${sanitizeProjectFileName(meta?.name || "project")}${MOTION_FILE_EXTENSION}`;
    triggerBrowserDownload(jsonStr, fileName);
  },

  saveCurrentProjectToFile: async (options?: { forceSaveAs?: boolean }) => {
    const currentDoc = useProjectStore.getState().document;
    const activeId = get().activeProjectId || "proj_temp";
    const existingMeta = get().projects.find((p) => p.id === activeId);

    const meta: ProjectMeta = existingMeta || {
      id: activeId,
      name: currentDoc.name || "Untitled Project",
      width: currentDoc.settings?.width || 1920,
      height: currentDoc.settings?.height || 1080,
      fps: currentDoc.settings?.fps || 60,
      duration: currentDoc.settings?.duration || 5.0,
      screenCount: currentDoc.screens?.length || 1,
      backgroundColor:
        currentDoc.settings?.backgroundColor ||
        currentDoc.screens?.[0]?.backgroundColor ||
        "#09090b",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const result = await saveProjectToFile(currentDoc, meta, options);
    if (result.ok && activeId) {
      saveProjectDocument(activeId, currentDoc);
      const updatedList = sortProjects(getProjectRegistry(), get().sortBy);
      set({ projects: updatedList });
    }
    return result;
  },

  openProjectFromFilePicker: async () => {
    const result = await openProjectFromFile();
    if (!result.ok || !result.file) {
      return null;
    }

    const doc = result.file.document;
    const { id } = storageCreateProject({
      name: result.file.metadata?.name || doc.name || "Opened Project",
      width: doc.settings?.width || 1920,
      height: doc.settings?.height || 1080,
      fps: doc.settings?.fps || 60,
      duration: doc.settings?.duration || 5.0,
      backgroundColor: doc.settings?.backgroundColor || "#09090b",
    });

    saveProjectDocument(id, doc);
    useProjectStore.getState().loadDocument(doc);
    setActiveProjectId(id);

    const updatedList = sortProjects(getProjectRegistry(), get().sortBy);
    set({
      projects: updatedList,
      activeProjectId: id,
      currentView: "editor",
    });

    return id;
  },

  loadProjectFromFileBlob: async (blob: Blob | File) => {
    const result = await readProjectFromFileBlob(blob);
    if (!result.ok || !result.file) {
      return null;
    }

    const doc = result.file.document;
    const projectName =
      result.file.metadata?.name || doc.name || ("name" in blob ? (blob as File).name.replace(/\.[^/.]+$/, "") : "Imported Project");

    const { id } = storageCreateProject({
      name: projectName,
      width: doc.settings?.width || 1920,
      height: doc.settings?.height || 1080,
      fps: doc.settings?.fps || 60,
      duration: doc.settings?.duration || 5.0,
      backgroundColor: doc.settings?.backgroundColor || "#09090b",
    });

    saveProjectDocument(id, doc);
    useProjectStore.getState().loadDocument(doc);
    setActiveProjectId(id);

    const updatedList = sortProjects(getProjectRegistry(), get().sortBy);
    set({
      projects: updatedList,
      activeProjectId: id,
      currentView: "editor",
    });

    return id;
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
