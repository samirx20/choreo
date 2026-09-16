# UI_PANELS_SPEC.MD: Motion Studio UI & Panel Architecture

This document defines the complete layout, responsive panel organization, navigation flow, and component breakdown for **Motion Studio**, built using **shadcn/ui**, **Tailwind CSS**, and **Lucide Icons**.

---

## 1. Application Layout Hierarchy

Motion Studio operates in two primary modes: **Design Mode** (static layout composition) and **Animate Mode** (motion sequencing and timeline).

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ TOP NAVIGATION BAR (Global Header)                                                     │
├─────────────────┬──────────────────────────────────────────────────────┬───────────────┤
│ LEFT SIDEBAR    │ CENTER VIEWPORT                                      │ RIGHT SIDEBAR │
│                 │                                                      │ (INSPECTOR)   │
│ ▾ Screens       │ Interactive Canvas                                   │ Dynamic by    │
│   • Screen 1    │ (@remotion/player)                                   │ Selection:    │
│                 │                                                      │               │
│ ▾ Layers Tree   │                                                      │ - Design Mode │
│   ▾ Group 1     │                                                      │ - Animate Mode│
│     Chunk 1     │                                                      │               │
│     Chunk 2     │ ┌──────────────────────────────────────────────────┐ │               │
│   ▸ Card Shape  │ │ FLOATING ADD TOOLBAR (Design Mode Only)          │ │               │
│                 │ └──────────────────────────────────────────────────┘ │               │
├─────────────────┴──────────────────────────────────────────────────────┴───────────────┤
│ BOTTOM TIMELINE PANEL (Animate Mode Only - Multi-track Sequencer)                      │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Top Navigation Bar (Global)

Fixed at the top of the viewport (Height: `56px`, `bg-zinc-950 border-b border-zinc-800`).

| Section | Component | Description & Interactions |
| :--- | :--- | :--- |
| **Left** | App Logo + Project Title | • Minimal Motion Studio vector logo.<br>• Inline editable project name (`Input` without border; auto-saves on blur/Enter).<br>• Project save indicator (e.g. `Saved`, `Saving...`). |
| **Center** | Mode Switcher | • Segmented toggle group (`Tabs` / `ToggleGroup`): `[ Design | Animate ]`.<br>• Keyboard shortcut: `Tab` to seamlessly switch between static design and motion timing. |
| **Right** | Utilities & Export | • **Undo / Redo**: Buttons with hotkey tooltips (`Ctrl+Z`, `Ctrl+Shift+Z`).<br>• **Canvas Zoom**: Dropdown (`Fit (Auto)`, `50%`, `75%`, `100%`, `150%`, `200%`).<br>• **AI Assistant**: Sparkle icon button `[ ✨ AI Prompt ]` opening floating AI instruction prompt.<br>• **Export**: Primary accent button `[ Export Video ]` launching render settings modal. |

---

## 3. Left Sidebar: Screens & Layer Tree

Width: `280px`, `bg-zinc-950 border-r border-zinc-800 flex flex-col`.

### A. Screens Panel (Top Half / Accordion)
* **Header**: "Screens" label with a `+ Add Screen` icon button.
* **Screen Cards**:
  * Thumbnail preview card of the screen's canvas.
  * Screen title (e.g. `Hook Scene`, `Product Reveal`, `Call to Action`) - double click to rename.
  * Duration badge (e.g. `05.00s`).
  * Context menu on right click: Duplicate Screen, Delete Screen, Move Up, Move Down.
  * Drag-and-drop handles for reordering scenes in the video sequence.

### B. Layers Tree Panel (Bottom Half)
* **Header**: "Layers" with layer count badge and filter/search bar.
* **Hierarchical Tree View**:
  * Supports unlimited nested groups (`<Group>`, `<Chunk>`, `<Text>`, `<Shape>`, `<Image>`).
  * **Tree Node Items**:
    * Expand/collapse chevron for groups.
    * Layer type icon (Text `T`, Rectangle `◼`, Ellipse `○`, Group `⊞`, Image `🖼`, Chunk `⚡`).
    * Inline editable layer label.
    * Hover actions: Visibility toggle (Eye icon: `hidden` / `visible`), Lock toggle (Lock icon).
  * **Interactions**:
    * Single click: Selects layer (updates canvas transform box and Right Sidebar).
    * `Shift+Click` / `Ctrl+Click`: Multi-selection for grouping or bulk alignment.
    * Drag-and-drop: Reorder layer z-index; drag into/out of groups to re-parent elements.
    * Double-click on Group: Enters nested isolation mode (focuses on child layers).

---

## 4. Center Canvas Viewport

Fills remaining center space (`bg-zinc-900 overflow-hidden relative flex items-center justify-center`).

### A. Viewport & Canvas Frame
* Renders the active screen composition using `@remotion/player`.
* Canvas resolution matches project settings (default: `1920x1080` or `1080x1920` 9:16).
* Responsive scaling with smooth pan (`Space + Drag` or Middle Mouse) and zoom (`Ctrl + Wheel`).
* Grid overlay toggle (optional dot grid or column guides).

### B. Interactive Transform Bounding Box
When an element or group is selected on the canvas:
* Bounding outline with 8 resize handles (4 corners, 4 edges).
* Top rotation handle with angle readout tooltip during drag.
* Smart alignment snapping guides (magenta lines when aligning to canvas center or sibling edges).
* Freeform dragging ($X, Y$) for root layers; flex reordering handles when dragging inside flex groups.

### C. Floating Add Toolbar (Design Mode Bottom Dock)
Positioned at bottom center of the canvas viewport (`fixed bottom-8 z-30`):
* Pill-shaped floating dock (`bg-zinc-900/90 backdrop-blur-md border border-zinc-700/60 shadow-2xl px-3 py-2 rounded-full flex items-center gap-2`).
* **Tool Items**:
  1. `[ T Text ]`: Dropdown for Heading (`72px Bold`), Subtitle (`36px Semibold`), Body (`24px Regular`), or click-to-type.
  2. `[ ◼ Shapes ]`: Popover selecting Rectangle, Rounded Card, Ellipse/Circle, Triangle, Star, Line, Arrow, Custom SVG.
  3. `[ 🖼 Media ]`: File uploader for PNG, JPG, WebP, MP4, and integrated Lucide Icon vector picker.
  4. `[ 🧩 Components ]`: **Custom Component Library Drawer** (see Section 6).

---

## 5. Bottom Timeline Panel (Animate Mode Only)

Height: `320px` (resizable with vertical drag handle), `bg-zinc-950 border-t border-zinc-800 flex flex-col`.

### A. Timeline Header & Transport Controls
* **Timecode / Frame Display**: Monospaced timecode (e.g. `00:01:15`) and current frame counter (`F75 / 300`).
* **Transport Buttons**:
  * Jump to Start (`Home` or `|◀`)
  * Step Back 1 Frame (`Left Arrow` or `,`)
  * Play / Pause (`Space` or `▶ / ⏸`)
  * Step Forward 1 Frame (`Right Arrow` or `.`)
  * Loop Toggle (`L` or `🔁`)
* **Time Snapping & Splits**:
  * Snap to Keyframes / Grid toggle (`S`).
  * Split Animation Clip at Playhead button (`Ctrl+K` or `✂`).
* **Zoom Slider**: Horizontal timeline zoom (from 1 second view to full composition overview).

### B. Track Headers (Left Column, Width: `240px`)
* Rows aligned 1:1 with canvas layers.
* Group tracks have an expand/collapse toggle to reveal child chunk tracks.
* **Auto-Link (🔗) Toggle**: Enabled by default on groups and split chunks. When active, moving or resizing an animation block cascades following blocks automatically.
* Mute animation toggle (disables layer animation during preview).

### C. Sequencer Grid & Draggable Clips (Right Column)
* Ruler displaying seconds (`0s`, `1s`, `2s`, `3s`...) and sub-second frame ticks.
* Playhead scrubber (red vertical bar with current timestamp badge; scrubbable across entire duration).
* **Animation Clip Blocks**:
  * Rounded pills representing active animations (e.g. `[⚡ Grow (0.8s)]`, `[↗ Slide Up (0.6s)]`).
  * Visual color coding: Green for *In*, Orange for *Emphasis/Loop*, Purple for *Out*, Cyan for *Custom*.
  * Left and right edge handles to drag-trim start offset and duration.
  * Right-click clip: Copy Animation (`Ctrl+Alt+C`), Paste Animation (`Ctrl+Alt+V`), Invert In/Out, Delete.
* **Expandable Property Sub-Tracks**: Clicking expand on an animation block reveals individual keyframe curves (e.g. `Translate Y`, `Opacity`, `Scale`) for granular curve tweaking.

---

## 6. Custom Components Library Drawer

Accessible from the floating toolbar `[ 🧩 Components ]` or Right-Click -> "Save as Custom Component".

### A. Storage Architecture (Dual Scope)
1. **Project Scope**: Components stored within the active project file (`scene.json` / `components.json`).
2. **Global Library Scope**: Components saved to user application storage (`~/.motion-studio/components/`), accessible across all future video projects.

### B. Library Drawer UI
* Opens as a floating drawer or popover.
* **Tabs**: `[ Project Components ]` | `[ Global Library ]`.
* **Categories**: `Buttons`, `Cards & Containers`, `Typography Badges`, `Social Callouts`, `Lower Thirds`.
* **Component Cards**:
  * Interactive canvas thumbnail showing animated preview on hover.
  * Component name, creator tag, and attached animation count.
  * Drag onto canvas or click to insert at canvas center.
* **Instance Linking**:
  * By default, inserting stamps an independent, fully editable copy.
  * Toggle available in inspector: `Keep Linked to Master` (changes to the master template automatically ripple to linked instances).

---

## 7. Export Modal

Launched via the top bar `[ Export Video ]` button:
* **Format Options**:
  * `MP4 (H.264)` - High compatibility web video.
  * `WebM (VP9)` - Supports transparent alpha channel backgrounds.
  * `ProRes 4444` - Lossless broadcast quality with alpha.
  * `GIF` - Animated social media loops.
  * `PNG Sequence` - Frame-by-frame asset archive.
* **Resolution Presets**: `1080p (1920x1080)`, `4K (3840x2160)`, `9:16 Story (1080x1920)`, `1:1 Square (1080x1080)`.
* **Framerate**: `24 fps`, `30 fps`, `60 fps`.
* **Render Progress**: Shows real-time frame progress bar and ETA via the Tauri Rust / FFmpeg pipeline.

---

## 8. Modals & Overlays

### A. AI Command Bar (`Ctrl+K`)
* Centered floating modal palette (`max-w-xl bg-zinc-900/95 backdrop-blur-xl border border-zinc-700 shadow-2xl rounded-2xl p-4`).
* Auto-focused natural language input field with placeholder: `"Type an instruction e.g. 'Stagger chunks by 0.15s and make them pop in'..."`.
* Quick suggestion chips based on currently selected layer types.
* Instant execution: modifies `scene.json` deterministically and renders the `[✨ AI Applied] [Undo] [Keep]` toast at bottom-center.

### B. Keyboard Shortcuts Modal (`?` or `Ctrl+/`)
* Clean two-column modal categorizing hotkeys by workflow:
  * **Navigation & Modes**: `Space`, `Tab`, `Home`, `End`, `,`, `.`, `L`
  * **Tools & Creation**: `V`, `T`, `R`, `O`, `Shift+C`, `Shift+W`
  * **Operations**: `Ctrl+K`, `Ctrl+G`, `Ctrl+Shift+G`, `Ctrl+D`, `Ctrl+Alt+C`, `Ctrl+Alt+V`, `S`
  * **Canvas Navigation**: `Space+Drag`, `Ctrl+Wheel`, `Shift+Drag`

