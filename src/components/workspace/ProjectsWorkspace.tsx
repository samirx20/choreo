import React, { useRef, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Upload,
  Film,
  Monitor,
  Smartphone,
  Square,
  LayoutTemplate,
  ArrowUpDown,
} from "lucide-react";
import { useProjectRegistryStore } from "@/store/useProjectRegistryStore";
import { ProjectCard } from "./ProjectCard";
import { ProjectSortOption, CreateProjectOptions } from "@/types/project";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const ProjectsWorkspace: React.FC = () => {
  const {
    projects,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    openProject,
    createNewProject,
    duplicateProject,
    deleteProject,
    renameProject,
    exportProject,
    importProject,
    loadProjectFromFileBlob,
  } = useProjectRegistryStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter projects by search query
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const query = searchQuery.toLowerCase();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        `${p.width}x${p.height}`.includes(query)
    );
  }, [projects, searchQuery]);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await loadProjectFromFileBlob(file);
    // Reset file input
    e.target.value = "";
  };

  const handleQuickCreate = (options: CreateProjectOptions) => {
    createNewProject(options);
  };

  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("Files")) {
      e.preventDefault();
      dragCounter.current += 1;
      setIsDraggingFile(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("Files")) {
      e.preventDefault();
      dragCounter.current -= 1;
      if (dragCounter.current <= 0) {
        dragCounter.current = 0;
        setIsDraggingFile(false);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("Files")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("Files")) {
      e.preventDefault();
      setIsDraggingFile(false);
      dragCounter.current = 0;
      const file = e.dataTransfer.files?.[0];
      if (file) {
        await loadProjectFromFileBlob(file);
      }
    }
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="min-h-screen w-full bg-background text-foreground flex flex-col font-sans select-none relative"
    >
      {/* File Drop Overlay for Workspace */}
      {isDraggingFile && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-8 pointer-events-none">
          <div className="w-full max-w-md p-8 rounded-2xl border-2 border-dashed border-border bg-card/95 flex flex-col items-center text-center shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-2xl bg-muted text-foreground flex items-center justify-center mb-4 border border-border shadow-inner">
              <Film className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-foreground tracking-tight">
              Drop .mtn project to open
            </h3>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed max-w-xs">
              Instant loading and schema validation of project scenes, layers, spring physics, and timeline.
            </p>
          </div>
        </div>
      )}
      {/* 1. Workspace Top Bar */}
      <header className="h-14 w-full bg-card border-b border-border px-6 flex items-center justify-between z-30 shrink-0 text-card-foreground">
        {/* Left: Brand Mark */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
            <Film className="w-4 h-4" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-foreground">
            Motion Studio
          </span>
          <span className="text-[11px] font-mono text-muted-foreground ml-1">v1.0</span>
        </div>

        {/* Center: Search Bar */}
        <div className="relative w-80">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects..."
            className="h-8 w-full pl-8 pr-3 text-xs bg-muted border border-border focus:border-ring rounded-md outline-none text-foreground placeholder:text-muted-foreground transition-colors"
          />
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Hidden file input for import */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".mtn,.motion,.json"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            type="button"
            onClick={handleImportClick}
            className="h-8 px-3 rounded text-xs font-medium text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 border border-border flex items-center gap-1.5 transition-colors"
            title="Import project file (.mtn)"
          >
            <Upload className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Import</span>
          </button>

          <button
            type="button"
            onClick={() =>
              handleQuickCreate({
                name: "Untitled Project",
                width: 1920,
                height: 1080,
                fps: 60,
                duration: 5.0,
                template: "blank",
              })
            }
            className="h-8 px-3.5 rounded text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Project</span>
          </button>
        </div>
      </header>

      {/* 2. Workspace Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 flex flex-col gap-8">
        {/* Quick Start Formats Shelf */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground tracking-tight">
              Start from Format
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* 16:9 Preset */}
            <button
              type="button"
              onClick={() =>
                handleQuickCreate({
                  name: "Landscape Video",
                  width: 1920,
                  height: 1080,
                  template: "blank",
                })
              }
              className="group p-3 rounded-lg bg-card border border-border hover:border-muted-foreground/60 text-left transition-colors flex items-center gap-3 shadow-xs hover:shadow-sm"
            >
              <div className="p-2 rounded bg-muted text-muted-foreground group-hover:text-foreground group-hover:bg-muted/80 transition-colors">
                <Monitor className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-foreground">
                  16:9 Landscape
                </div>
                <div className="text-[10px] text-muted-foreground font-mono">1920×1080</div>
              </div>
            </button>

            {/* 9:16 Preset */}
            <button
              type="button"
              onClick={() =>
                handleQuickCreate({
                  name: "Vertical Story",
                  width: 1080,
                  height: 1920,
                  template: "blank",
                })
              }
              className="group p-3 rounded-lg bg-card border border-border hover:border-muted-foreground/60 text-left transition-colors flex items-center gap-3 shadow-xs hover:shadow-sm"
            >
              <div className="p-2 rounded bg-muted text-muted-foreground group-hover:text-foreground group-hover:bg-muted/80 transition-colors">
                <Smartphone className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-foreground">
                  9:16 Vertical
                </div>
                <div className="text-[10px] text-muted-foreground font-mono">1080×1920</div>
              </div>
            </button>

            {/* 1:1 Preset */}
            <button
              type="button"
              onClick={() =>
                handleQuickCreate({
                  name: "Square Post",
                  width: 1080,
                  height: 1080,
                  template: "blank",
                })
              }
              className="group p-3 rounded-lg bg-card border border-border hover:border-muted-foreground/60 text-left transition-colors flex items-center gap-3 shadow-xs hover:shadow-sm"
            >
              <div className="p-2 rounded bg-muted text-muted-foreground group-hover:text-foreground group-hover:bg-muted/80 transition-colors">
                <Square className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-foreground">
                  1:1 Square
                </div>
                <div className="text-[10px] text-muted-foreground font-mono">1080×1080</div>
              </div>
            </button>

            {/* 4:5 Preset */}
            <button
              type="button"
              onClick={() =>
                handleQuickCreate({
                  name: "Portrait Video",
                  width: 1080,
                  height: 1350,
                  template: "blank",
                })
              }
              className="group p-3 rounded-lg bg-card border border-border hover:border-muted-foreground/60 text-left transition-colors flex items-center gap-3 shadow-xs hover:shadow-sm"
            >
              <div className="p-2 rounded bg-muted text-muted-foreground group-hover:text-foreground group-hover:bg-muted/80 transition-colors">
                <LayoutTemplate className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-foreground">
                  4:5 Portrait
                </div>
                <div className="text-[10px] text-muted-foreground font-mono">1080×1350</div>
              </div>
            </button>
          </div>
        </section>

        {/* Projects Grid Section */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground tracking-tight">
                Projects
              </h2>
              <span className="text-xs font-mono text-muted-foreground">
                ({filteredProjects.length})
              </span>
            </div>

            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="h-7 px-2.5 rounded text-xs text-muted-foreground hover:text-foreground bg-card border border-border flex items-center gap-1.5 transition-colors"
                >
                  <ArrowUpDown className="w-3 h-3" />
                  <span>
                    Sort:{" "}
                    {sortBy === "updatedAt"
                      ? "Recent"
                      : sortBy === "name"
                      ? "Name"
                      : "Created"}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-36 bg-popover border border-border text-popover-foreground"
              >
                <DropdownMenuItem
                  onClick={() => setSortBy("updatedAt")}
                  className="text-xs cursor-pointer"
                >
                  Recent
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSortBy("name")}
                  className="text-xs cursor-pointer"
                >
                  Name
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSortBy("createdAt")}
                  className="text-xs cursor-pointer"
                >
                  Created
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Grid of Projects */}
          {filteredProjects.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onOpen={openProject}
                  onDuplicate={duplicateProject}
                  onDelete={deleteProject}
                  onRename={renameProject}
                  onExport={exportProject}
                />
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="w-full py-16 flex flex-col items-center justify-center text-center border border-dashed border-border rounded-xl bg-card/50 p-6">
              <Film className="w-8 h-8 text-muted-foreground mb-3" />
              <h3 className="text-sm font-medium text-foreground">
                {searchQuery ? "No matching projects" : "No projects yet"}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                {searchQuery
                  ? `No project matching "${searchQuery}". Check the query or reset your search.`
                  : "Create your first motion graphic project from a preset or start from blank."}
              </p>
              {!searchQuery && (
                <button
                  type="button"
                  onClick={() =>
                    handleQuickCreate({
                      name: "Untitled Project",
                      width: 1920,
                      height: 1080,
                      fps: 60,
                      duration: 5.0,
                      template: "blank",
                    })
                  }
                  className="mt-4 px-3.5 py-1.5 rounded text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 shadow-xs transition-colors"
                >
                  Create Project
                </button>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
