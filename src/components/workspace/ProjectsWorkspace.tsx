import React, { useRef, useMemo } from "react";
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        importProject(content);
      }
    };
    reader.readAsText(file);
    // Reset file input
    e.target.value = "";
  };

  const handleQuickCreate = (options: CreateProjectOptions) => {
    createNewProject(options);
  };

  return (
    <div className="min-h-screen w-full bg-[#0c0c0e] text-zinc-100 flex flex-col font-sans select-none">
      {/* 1. Workspace Top Bar */}
      <header className="h-14 w-full bg-[#111113] border-b border-[#222226] px-6 flex items-center justify-between z-30 shrink-0">
        {/* Left: Brand Mark */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-b from-purple-600 to-indigo-700 flex items-center justify-center text-white shadow-sm border border-white/10">
            <Film className="w-4 h-4" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-white">
            Motion Studio
          </span>
          <span className="text-[11px] font-mono text-zinc-500 ml-1">v1.0</span>
        </div>

        {/* Center: Search Bar */}
        <div className="relative w-80">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects..."
            className="h-8 w-full pl-8 pr-3 text-xs bg-[#18181b] border border-[#27272a] focus:border-purple-500 rounded-md outline-none text-zinc-200 placeholder:text-zinc-600 transition-colors"
          />
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Hidden file input for import */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.motion"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            type="button"
            onClick={handleImportClick}
            className="h-8 px-3 rounded text-xs font-medium text-zinc-300 hover:text-white bg-[#18181b] hover:bg-[#222226] border border-[#27272a] flex items-center gap-1.5 transition-colors"
            title="Import project JSON file"
          >
            <Upload className="w-3.5 h-3.5 text-zinc-400" />
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
            className="h-8 px-3.5 rounded text-xs font-medium text-white bg-purple-600 hover:bg-purple-500 flex items-center gap-1.5 shadow-sm transition-colors"
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
            <h2 className="text-sm font-semibold text-zinc-200 tracking-tight">
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
              className="group p-3 rounded-lg bg-[#141416] border border-[#27272a] hover:border-zinc-500 text-left transition-colors flex items-center gap-3"
            >
              <div className="p-2 rounded bg-zinc-800 text-zinc-300 group-hover:text-purple-400 group-hover:bg-purple-500/10 transition-colors">
                <Monitor className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-zinc-200 group-hover:text-white">
                  16:9 Landscape
                </div>
                <div className="text-[10px] text-zinc-500 font-mono">1920×1080</div>
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
              className="group p-3 rounded-lg bg-[#141416] border border-[#27272a] hover:border-zinc-500 text-left transition-colors flex items-center gap-3"
            >
              <div className="p-2 rounded bg-zinc-800 text-zinc-300 group-hover:text-purple-400 group-hover:bg-purple-500/10 transition-colors">
                <Smartphone className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-zinc-200 group-hover:text-white">
                  9:16 Vertical
                </div>
                <div className="text-[10px] text-zinc-500 font-mono">1080×1920</div>
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
              className="group p-3 rounded-lg bg-[#141416] border border-[#27272a] hover:border-zinc-500 text-left transition-colors flex items-center gap-3"
            >
              <div className="p-2 rounded bg-zinc-800 text-zinc-300 group-hover:text-purple-400 group-hover:bg-purple-500/10 transition-colors">
                <Square className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-zinc-200 group-hover:text-white">
                  1:1 Square
                </div>
                <div className="text-[10px] text-zinc-500 font-mono">1080×1080</div>
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
              className="group p-3 rounded-lg bg-[#141416] border border-[#27272a] hover:border-zinc-500 text-left transition-colors flex items-center gap-3"
            >
              <div className="p-2 rounded bg-zinc-800 text-zinc-300 group-hover:text-purple-400 group-hover:bg-purple-500/10 transition-colors">
                <LayoutTemplate className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-zinc-200 group-hover:text-white">
                  4:5 Portrait
                </div>
                <div className="text-[10px] text-zinc-500 font-mono">1080×1350</div>
              </div>
            </button>
          </div>
        </section>

        {/* Projects Grid Section */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-zinc-200 tracking-tight">
                Projects
              </h2>
              <span className="text-xs font-mono text-zinc-500">
                ({filteredProjects.length})
              </span>
            </div>

            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="h-7 px-2.5 rounded text-xs text-zinc-400 hover:text-zinc-200 bg-[#141416] border border-[#27272a] flex items-center gap-1.5 transition-colors"
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
                className="w-36 bg-[#18181b] border border-[#27272a] text-zinc-200"
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
            <div className="w-full py-16 flex flex-col items-center justify-center text-center border border-dashed border-[#27272a] rounded-xl bg-[#111113]/50 p-6">
              <Film className="w-8 h-8 text-zinc-600 mb-3" />
              <h3 className="text-sm font-medium text-zinc-300">
                {searchQuery ? "No matching projects" : "No projects yet"}
              </h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm">
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
                  className="mt-4 px-3.5 py-1.5 rounded text-xs font-medium text-white bg-purple-600 hover:bg-purple-500 transition-colors"
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
