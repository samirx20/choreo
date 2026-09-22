import { describe, it, expect, beforeEach } from "vitest";
import {
  getProjectRegistry,
  saveProjectRegistry,
  loadProjectDocument,
  saveProjectDocument,
  createProject,
  duplicateProject,
  deleteProject,
  renameProject,
  exportProjectFile,
  importProjectFile,
  migrateLegacyProjectIfPresent,
  sortProjects,
  PROJECTS_REGISTRY_KEY,
  PROJECT_DOC_PREFIX,
} from "@/services/projectStorage";
import { useProjectRegistryStore } from "@/store/useProjectRegistryStore";
import { useProjectStore } from "@/store/useProjectStore";
import { STORAGE_DOC_KEY, INITIAL_SCENE } from "@/store/initialScene";

describe("Project Management & Storage Engine", () => {
  beforeEach(() => {
    localStorage.clear();
    useProjectRegistryStore.setState({
      projects: [],
      activeProjectId: null,
      currentView: "workspace",
      searchQuery: "",
      sortBy: "updatedAt",
      isNewProjectModalOpen: false,
    });
  });

  it("creates a new blank project and registers it with correct metadata", () => {
    const { id, document: doc } = createProject({
      name: "Brand Video 16:9",
      width: 1920,
      height: 1080,
      fps: 60,
      duration: 8.0,
      template: "blank",
    });

    expect(id).toBeDefined();
    expect(doc.name).toBe("Brand Video 16:9");
    expect(doc.settings.width).toBe(1920);
    expect(doc.settings.height).toBe(1080);
    expect(doc.settings.duration).toBe(8.0);
    expect(doc.screens.length).toBe(1);

    const registry = getProjectRegistry();
    expect(registry.length).toBe(1);
    expect(registry[0].id).toBe(id);
    expect(registry[0].name).toBe("Brand Video 16:9");
    expect(registry[0].width).toBe(1920);
    expect(registry[0].height).toBe(1080);
    expect(registry[0].duration).toBe(8.0);
  });

  it("creates a vertical 9:16 project", () => {
    const { id, document: doc } = createProject({
      name: "Reel Project",
      width: 1080,
      height: 1920,
      fps: 30,
      duration: 5.0,
      template: "blank",
    });

    expect(id).toBeDefined();
    expect(doc.name).toBe("Reel Project");
    expect(doc.settings.width).toBe(1080);
    expect(doc.settings.height).toBe(1920);
    expect(doc.screens[0].layers.length).toBe(0);

    const loaded = loadProjectDocument(id);
    expect(loaded).not.toBeNull();
    expect(loaded?.name).toBe("Reel Project");
  });

  it("duplicates an existing project with (Copy) suffix", () => {
    const { id: originalId } = createProject({
      name: "Original Ad",
      width: 1080,
      height: 1080,
      template: "blank",
    });

    const duplicateRes = duplicateProject(originalId);
    expect(duplicateRes).not.toBeNull();
    expect(duplicateRes?.id).not.toBe(originalId);
    expect(duplicateRes?.document.name).toBe("Original Ad (Copy)");

    const registry = getProjectRegistry();
    expect(registry.length).toBe(2);
    expect(registry.some((p) => p.name === "Original Ad (Copy)")).toBe(true);
  });

  it("renames a project in both the registry and stored document", () => {
    const { id } = createProject({
      name: "Draft 1",
      width: 1920,
      height: 1080,
      template: "blank",
    });

    renameProject(id, "Final Cut");

    const registry = getProjectRegistry();
    expect(registry[0].name).toBe("Final Cut");

    const doc = loadProjectDocument(id);
    expect(doc?.name).toBe("Final Cut");
  });

  it("deletes a project and removes its document from storage", () => {
    const { id } = createProject({
      name: "To Delete",
      width: 1920,
      height: 1080,
      template: "blank",
    });

    expect(getProjectRegistry().length).toBe(1);
    deleteProject(id);

    expect(getProjectRegistry().length).toBe(0);
    expect(loadProjectDocument(id)).toBeNull();
  });

  it("exports and imports project JSON file faithfully", () => {
    const { id: originalId } = createProject({
      name: "Export Test",
      width: 1080,
      height: 1350,
      fps: 24,
      duration: 10.0,
      template: "blank",
    });

    const exportedJson = exportProjectFile(originalId);
    expect(exportedJson).not.toBeNull();

    const { id: importedId, document: importedDoc } = importProjectFile(exportedJson!);
    expect(importedId).not.toBe(originalId);
    expect(importedDoc.name).toBe("Export Test (Imported)");
    expect(importedDoc.settings.width).toBe(1080);
    expect(importedDoc.settings.height).toBe(1350);
    expect(importedDoc.settings.duration).toBe(10.0);

    const registry = getProjectRegistry();
    expect(registry.length).toBe(2);
  });

  it("automatically migrates legacy localStorage document into project registry", () => {
    // Setup legacy single document in localStorage
    const legacyDoc = {
      ...INITIAL_SCENE,
      name: "Legacy Work",
    };
    localStorage.setItem(STORAGE_DOC_KEY, JSON.stringify(legacyDoc));

    const migrated = migrateLegacyProjectIfPresent();
    expect(migrated.length).toBe(1);
    expect(migrated[0].name).toBe("Legacy Work");

    const loaded = loadProjectDocument(migrated[0].id);
    expect(loaded?.name).toBe("Legacy Work");
  });

  it("sorts projects accurately by name, createdAt, and updatedAt", () => {
    const now = Date.now();
    const list = [
      {
        id: "p1",
        name: "Zebra",
        width: 1920,
        height: 1080,
        fps: 60,
        duration: 5,
        screenCount: 1,
        backgroundColor: "#000",
        createdAt: now - 1000,
        updatedAt: now - 500,
      },
      {
        id: "p2",
        name: "Alpha",
        width: 1920,
        height: 1080,
        fps: 60,
        duration: 5,
        screenCount: 1,
        backgroundColor: "#000",
        createdAt: now - 5000,
        updatedAt: now,
      },
    ];

    const sortedByName = sortProjects(list, "name");
    expect(sortedByName[0].name).toBe("Alpha");
    expect(sortedByName[1].name).toBe("Zebra");

    const sortedByRecent = sortProjects(list, "updatedAt");
    expect(sortedByRecent[0].name).toBe("Alpha"); // most recent updatedAt

    const sortedByCreated = sortProjects(list, "createdAt");
    expect(sortedByCreated[0].name).toBe("Zebra"); // higher createdAt timestamp
  });
});

describe("Project Registry Zustand Store", () => {
  beforeEach(() => {
    localStorage.clear();
    useProjectRegistryStore.setState({
      projects: [],
      activeProjectId: null,
      currentView: "workspace",
      searchQuery: "",
      sortBy: "updatedAt",
      isNewProjectModalOpen: false,
    });
  });

  it("loads registry and opens a project into editor", () => {
    const store = useProjectRegistryStore.getState();
    const id = store.createNewProject({
      name: "Test Project",
      width: 1920,
      height: 1080,
      template: "blank",
    });

    // When created, it should transition directly into editor
    expect(useProjectRegistryStore.getState().currentView).toBe("editor");
    expect(useProjectRegistryStore.getState().activeProjectId).toBe(id);
    expect(useProjectStore.getState().document.name).toBe("Test Project");

    // Close project returns to workspace
    useProjectRegistryStore.getState().closeProject();
    expect(useProjectRegistryStore.getState().currentView).toBe("workspace");
    expect(useProjectRegistryStore.getState().activeProjectId).toBeNull();

    // Reopen project
    const opened = useProjectRegistryStore.getState().openProject(id);
    expect(opened).toBe(true);
    expect(useProjectRegistryStore.getState().currentView).toBe("editor");
    expect(useProjectRegistryStore.getState().activeProjectId).toBe(id);
  });

  it("synchronizes project title renaming between registry and editor", () => {
    const store = useProjectRegistryStore.getState();
    const id = store.createNewProject({
      name: "Initial Name",
      width: 1920,
      height: 1080,
      template: "blank",
    });

    useProjectRegistryStore.getState().syncCurrentProjectName("Updated Name");

    expect(useProjectRegistryStore.getState().projects[0].name).toBe("Updated Name");
    expect(loadProjectDocument(id)?.name).toBe("Updated Name");
  });
});
