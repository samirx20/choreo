import React, { useState } from 'react';
import {
  Link2,
  Plus,
  Trash2,
  Maximize2,
  Move,
  Sliders,
  Waves,
  Type,
  Square,
  Folder,
  Image as ImageIcon,
  ChevronDown,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import {
  Layer,
  ConstraintAnchor,
  DriverProperty,
  DrivenProperty,
  LinkMode,
  ElementLinkBinding,
  EasingType,
} from '@/types/scene';
import { useProjectStore, findLayerInTree } from '@/store/useProjectStore';
import { ScrubbableInput } from '@/components/ui/scrubbable-input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface BindingsSectionProps {
  selectedLayer: Layer;
}

const ANCHORS: ConstraintAnchor[] = [
  'top-left',
  'top-center',
  'top-right',
  'middle-left',
  'center',
  'middle-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
];

export const BindingsSection: React.FC<BindingsSectionProps> = ({ selectedLayer }) => {
  const {
    document: doc,
    activeScreenId,
    addLayerBinding,
    updateLayerBinding,
    removeLayerBinding,
  } = useProjectStore();

  const activeScreen = doc.screens.find((s) => s.id === activeScreenId) || doc.screens[0];

  // Collect all available layers to link to (excluding self and self descendants)
  const availableDrivers: Layer[] = [];
  function collectEligibleLayers(layers: Layer[]) {
    for (const l of layers) {
      if (l.id !== selectedLayer.id) {
        availableDrivers.push(l);
        if (l.type === 'group' && (l as any).children) {
          collectEligibleLayers((l as any).children);
        }
      }
    }
  }
  collectEligibleLayers(activeScreen.layers);

  const bindings = selectedLayer.bindings || [];

  const handleAddBinding = (driverId: string) => {
    const driver = findLayerInTree(activeScreen.layers, driverId);
    const defaultMode: LinkMode = driver?.type === 'text' ? 'hug' : 'pin';

    const newBinding: ElementLinkBinding = {
      id: `bind_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      driverLayerId: driverId,
      driverProp: defaultMode === 'hug' ? 'width' : 'x',
      drivenProp: defaultMode === 'hug' ? 'width' : 'x',
      mode: defaultMode,
      targetAnchor: 'center',
      driverAnchor: 'center',
      offset2D: [0, 0],
      padding: [16, 12],
      multiplier: 1,
      offset: 0,
      sourceRange: [0, 100],
      targetRange: [0, 1],
      easing: 'smooth',
      lagSeconds: 0.1,
    };

    addLayerBinding(selectedLayer.id, newBinding);
  };

  const getLayerIcon = (type: string) => {
    switch (type) {
      case 'text':
      case 'chunk':
        return <Type className="h-3 w-3 text-primary" />;
      case 'shape':
        return <Square className="h-3 w-3 text-foreground" />;
      case 'group':
        return <Folder className="h-3 w-3 text-foreground" />;
      case 'image':
        return <ImageIcon className="h-3 w-3 text-foreground" />;
      default:
        return <Square className="h-3 w-3 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-3 pt-3 border-t border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Link2 className="h-3.5 w-3.5 text-primary" />
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Linked Dependencies ({bindings.length})
          </span>
        </div>

        {availableDrivers.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-1 text-[10px] text-foreground hover:bg-muted font-medium px-2 py-0.5 rounded-[6px] border border-border transition-colors"
                title="Link this layer's state to another layer"
              >
                <Plus className="h-3 w-3" />
                <span>Link to Element</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="text-xs p-1 w-52 max-h-56 overflow-y-auto">
              {availableDrivers.map((driver) => (
                <DropdownMenuItem
                  key={driver.id}
                  onClick={() => handleAddBinding(driver.id)}
                  className="flex items-center gap-2 py-1.5 cursor-pointer rounded-[6px]"
                >
                  {getLayerIcon(driver.type)}
                  <span className="truncate">{driver.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {bindings.length === 0 ? (
        <div className="p-3 rounded-[12px] bg-muted/40 border border-dashed border-border text-center">
          <p className="text-[11px] text-muted-foreground">No active dependencies.</p>
          <p className="text-[10px] text-muted-foreground/80 mt-0.5">
            Link to another layer to pin, hug size, match properties, or trail with inertia.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {bindings.map((b) => {
            const driver = findLayerInTree(activeScreen.layers, b.driverLayerId);
            const driverName = driver ? driver.name : 'Unknown Driver';

            return (
              <div
                key={b.id}
                className="p-2.5 rounded-[12px] bg-muted/30 border border-border space-y-2.5"
              >
                {/* Binding Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {driver && getLayerIcon(driver.type)}
                    <span className="text-xs font-medium text-foreground truncate max-w-[140px]" title={driverName}>
                      {driverName}
                    </span>
                  </div>

                  <button
                    onClick={() => removeLayerBinding(selectedLayer.id, b.id)}
                    className="h-6 w-6 rounded-[6px] flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Remove binding"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>

                {/* Mode Selector Tabs */}
                <div className="grid grid-cols-7 gap-0.5 bg-muted/60 p-0.5 rounded-[8px] border border-input">
                  {(
                    [
                      { id: 'pin', label: 'Pin', icon: Move },
                      { id: 'hug', label: 'Hug', icon: Maximize2 },
                      { id: 'match', label: 'Match', icon: Link2 },
                      { id: 'track-word', label: 'Word', icon: Sparkles },
                      { id: 'leader-line', label: 'Line', icon: ArrowUpRight },
                      { id: 'remap', label: 'Remap', icon: Sliders },
                      { id: 'lag', label: 'Lag', icon: Waves },
                    ] as const
                  ).map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => updateLayerBinding(selectedLayer.id, b.id, { mode: id })}
                      className={cn(
                        'py-1 px-0.5 rounded-[6px] text-[9px] font-medium flex flex-col items-center gap-0.5 transition-colors',
                        b.mode === id
                          ? 'bg-card text-foreground font-semibold shadow-xs border border-border/50'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                      title={`${label} Mode`}
                    >
                      <Icon className="h-2.5 w-2.5" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>

                {/* Mode Specific Controls */}
                {b.mode === 'pin' && (
                  <div className="space-y-2 pt-1 border-t border-border">
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div>
                        <span className="text-muted-foreground block mb-1">Target Anchor</span>
                        <div className="grid grid-cols-3 gap-1 w-16 bg-muted/60 p-1 rounded-[6px] border border-input">
                          {ANCHORS.map((anc) => (
                            <button
                              key={anc}
                              onClick={() => updateLayerBinding(selectedLayer.id, b.id, { targetAnchor: anc })}
                              className={cn(
                                'h-3.5 w-3.5 rounded-2xs transition-colors',
                                (b.targetAnchor || 'center') === anc
                                  ? 'bg-primary'
                                  : 'bg-muted-foreground/30 hover:bg-muted-foreground/60'
                              )}
                              title={`Target: ${anc}`}
                            />
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-muted-foreground block mb-1">Driver Anchor</span>
                        <div className="grid grid-cols-3 gap-1 w-16 bg-muted/60 p-1 rounded-[6px] border border-input">
                          {ANCHORS.map((anc) => (
                            <button
                              key={anc}
                              onClick={() => updateLayerBinding(selectedLayer.id, b.id, { driverAnchor: anc })}
                              className={cn(
                                'h-3.5 w-3.5 rounded-2xs transition-colors',
                                (b.driverAnchor || 'center') === anc
                                  ? 'bg-primary'
                                  : 'bg-muted-foreground/30 hover:bg-muted-foreground/60'
                              )}
                              title={`Driver: ${anc}`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Pin Offset [dx, dy] */}
                    <div className="grid grid-cols-2 gap-2">
                      <ScrubbableInput
                        label="dX"
                        value={b.offset2D ? b.offset2D[0] : 0}
                        onChange={(val) => {
                          const curY = b.offset2D ? b.offset2D[1] : 0;
                          updateLayerBinding(selectedLayer.id, b.id, { offset2D: [val || 0, curY] });
                        }}
                      />
                      <ScrubbableInput
                        label="dY"
                        value={b.offset2D ? b.offset2D[1] : 0}
                        onChange={(val) => {
                          const curX = b.offset2D ? b.offset2D[0] : 0;
                          updateLayerBinding(selectedLayer.id, b.id, { offset2D: [curX, val || 0] });
                        }}
                      />
                    </div>

                    {/* Clamp to Track Bounds (for progress bars) */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-muted-foreground">Clamp to Track</span>
                      <button
                        onClick={() => updateLayerBinding(selectedLayer.id, b.id, { clampToTrack: !b.clampToTrack })}
                        className={cn(
                          'h-5 px-2 rounded-[6px] text-[10px] font-mono border transition-colors',
                          b.clampToTrack
                            ? 'bg-accent text-accent-foreground border-border font-semibold shadow-xs'
                            : 'bg-muted/40 border-input text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {b.clampToTrack ? 'CLAMPED' : 'OFF'}
                      </button>
                    </div>
                  </div>
                )}

                {b.mode === 'hug' && (
                  <div className="space-y-2 pt-1 border-t border-border">
                    {/* Tail Lock / Hug Anchor */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-muted-foreground">Tail Lock (Anchor)</span>
                        <span className="text-[9px] font-mono text-primary">{b.hugAnchor || 'center'}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1 w-20 bg-muted/60 p-1 rounded-[6px] border border-input">
                        {ANCHORS.map((anc) => (
                          <button
                            key={anc}
                            onClick={() => updateLayerBinding(selectedLayer.id, b.id, { hugAnchor: anc })}
                            className={cn(
                              'h-4 w-4 rounded-2xs transition-colors',
                              (b.hugAnchor || 'center') === anc
                                ? 'bg-primary'
                                : 'bg-muted-foreground/30 hover:bg-muted-foreground/60'
                            )}
                            title={`Lock Anchor: ${anc}`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Expansion Physics */}
                    <div>
                      <span className="text-[10px] text-muted-foreground block mb-1">Expansion Dynamics</span>
                      <div className="grid grid-cols-3 gap-1 bg-muted/60 p-0.5 rounded-[8px] border border-input">
                        {(['instant', 'smooth', 'spring'] as const).map((phys) => (
                          <button
                            key={phys}
                            onClick={() => updateLayerBinding(selectedLayer.id, b.id, { expansionPhysics: phys })}
                            className={cn(
                              'py-0.5 rounded-[6px] text-[9px] font-medium capitalize transition-colors',
                              (b.expansionPhysics || 'instant') === phys
                                ? 'bg-card text-foreground font-semibold shadow-xs border border-border/50'
                                : 'text-muted-foreground hover:text-foreground'
                            )}
                          >
                            {phys}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Padding [X, Y] */}
                    <div>
                      <span className="text-[10px] text-muted-foreground block mb-1">Padding</span>
                      <div className="grid grid-cols-2 gap-2">
                        <ScrubbableInput
                          label="Pad X"
                          value={b.padding ? b.padding[0] : 16}
                          onChange={(val) => {
                            const curY = b.padding ? b.padding[1] : 12;
                            updateLayerBinding(selectedLayer.id, b.id, { padding: [val || 0, curY] });
                          }}
                        />
                        <ScrubbableInput
                          label="Pad Y"
                          value={b.padding ? b.padding[1] : 12}
                          onChange={(val) => {
                            const curX = b.padding ? b.padding[0] : 16;
                            updateLayerBinding(selectedLayer.id, b.id, { padding: [curX, val || 0] });
                          }}
                        />
                      </div>
                    </div>

                    {/* Minimum Bounds Clamp */}
                    <div className="grid grid-cols-2 gap-2">
                      <ScrubbableInput
                        label="Min W"
                        value={b.minWidth || 0}
                        onChange={(val) => updateLayerBinding(selectedLayer.id, b.id, { minWidth: val || 0 })}
                      />
                      <ScrubbableInput
                        label="Min H"
                        value={b.minHeight || 0}
                        onChange={(val) => updateLayerBinding(selectedLayer.id, b.id, { minHeight: val || 0 })}
                      />
                    </div>
                  </div>
                )}

                {b.mode === 'match' && (
                  <div className="space-y-2 pt-1 border-t border-border">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-muted-foreground block mb-1">Driver Prop</span>
                        <select
                          value={b.driverProp}
                          onChange={(e) =>
                            updateLayerBinding(selectedLayer.id, b.id, {
                              driverProp: e.target.value as DriverProperty,
                            })
                          }
                          className="w-full bg-muted/60 border border-input rounded-[6px] px-1.5 py-1 text-xs text-foreground outline-none"
                        >
                          <option value="x">X Position</option>
                          <option value="y">Y Position</option>
                          <option value="width">Width</option>
                          <option value="height">Height</option>
                          <option value="rotation">Rotation</option>
                          <option value="opacity">Opacity</option>
                          <option value="scale">Scale</option>
                          <option value="progress">Animation Progress</option>
                        </select>
                      </div>

                      <div>
                        <span className="text-[10px] text-muted-foreground block mb-1">Target Prop</span>
                        <select
                          value={b.drivenProp}
                          onChange={(e) =>
                            updateLayerBinding(selectedLayer.id, b.id, {
                              drivenProp: e.target.value as DrivenProperty,
                            })
                          }
                          className="w-full bg-muted/60 border border-input rounded-[6px] px-1.5 py-1 text-xs text-foreground outline-none"
                        >
                          <option value="x">X Position</option>
                          <option value="y">Y Position</option>
                          <option value="width">Width</option>
                          <option value="height">Height</option>
                          <option value="rotation">Rotation</option>
                          <option value="opacity">Opacity</option>
                          <option value="scale">Scale</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <ScrubbableInput
                        label="Factor"
                        value={b.multiplier ?? 1}
                        onChange={(val) => updateLayerBinding(selectedLayer.id, b.id, { multiplier: val || 1 })}
                      />
                      <ScrubbableInput
                        label="Offset"
                        value={b.offset ?? 0}
                        onChange={(val) => updateLayerBinding(selectedLayer.id, b.id, { offset: val || 0 })}
                      />
                    </div>
                  </div>
                )}

                {b.mode === 'track-word' && (
                  <div className="space-y-2 pt-1 border-t border-border">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>Word Tracking Padding</span>
                      <span className="text-primary font-mono">Auto Snap</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <ScrubbableInput
                        label="Pad X"
                        value={Array.isArray(b.padding) ? b.padding[0] : 12}
                        onChange={(val) => {
                          const curY = Array.isArray(b.padding) ? b.padding[1] ?? 6 : 6;
                          updateLayerBinding(selectedLayer.id, b.id, { padding: [val || 0, curY] });
                        }}
                      />
                      <ScrubbableInput
                        label="Pad Y"
                        value={Array.isArray(b.padding) ? b.padding[1] ?? 6 : 6}
                        onChange={(val) => {
                          const curX = Array.isArray(b.padding) ? b.padding[0] ?? 12 : 12;
                          updateLayerBinding(selectedLayer.id, b.id, { padding: [curX, val || 0] });
                        }}
                      />
                    </div>
                  </div>
                )}

                {b.mode === 'leader-line' && (
                  <div className="space-y-2 pt-1 border-t border-border">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>Dynamic Leader Line</span>
                      <span className="text-primary font-mono">Auto Angle</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div>
                        <span className="text-muted-foreground block mb-1">Driver Anchor</span>
                        <select
                          value={b.driverAnchor || 'center'}
                          onChange={(e) => updateLayerBinding(selectedLayer.id, b.id, { driverAnchor: e.target.value as any })}
                          className="w-full bg-muted/60 border border-input rounded-[6px] px-1.5 py-1 text-xs text-foreground outline-none"
                        >
                          {ANCHORS.map((a) => (
                            <option key={a} value={a}>{a}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <span className="text-muted-foreground block mb-1">Target Anchor</span>
                        <select
                          value={b.targetAnchor || 'center'}
                          onChange={(e) => updateLayerBinding(selectedLayer.id, b.id, { targetAnchor: e.target.value as any })}
                          className="w-full bg-muted/60 border border-input rounded-[6px] px-1.5 py-1 text-xs text-foreground outline-none"
                        >
                          {ANCHORS.map((a) => (
                            <option key={a} value={a}>{a}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {b.mode === 'remap' && (
                  <div className="space-y-2 pt-1 border-t border-border">
                    <div className="grid grid-cols-2 gap-2">
                      <ScrubbableInput
                        label="Src Min"
                        value={b.sourceRange ? b.sourceRange[0] : 0}
                        onChange={(val) => {
                          const curMax = b.sourceRange ? b.sourceRange[1] : 100;
                          updateLayerBinding(selectedLayer.id, b.id, { sourceRange: [val || 0, curMax] });
                        }}
                      />
                      <ScrubbableInput
                        label="Src Max"
                        value={b.sourceRange ? b.sourceRange[1] : 100}
                        onChange={(val) => {
                          const curMin = b.sourceRange ? b.sourceRange[0] : 0;
                          updateLayerBinding(selectedLayer.id, b.id, { sourceRange: [curMin, val || 0] });
                        }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <ScrubbableInput
                        label="Tgt Min"
                        value={b.targetRange ? b.targetRange[0] : 0}
                        onChange={(val) => {
                          const curMax = b.targetRange ? b.targetRange[1] : 1;
                          updateLayerBinding(selectedLayer.id, b.id, { targetRange: [val || 0, curMax] });
                        }}
                      />
                      <ScrubbableInput
                        label="Tgt Max"
                        value={b.targetRange ? b.targetRange[1] : 1}
                        onChange={(val) => {
                          const curMin = b.targetRange ? b.targetRange[0] : 0;
                          updateLayerBinding(selectedLayer.id, b.id, { targetRange: [curMin, val || 0] });
                        }}
                      />
                    </div>
                  </div>
                )}

                {b.mode === 'lag' && (
                  <div className="space-y-2 pt-1 border-t border-border">
                    <span className="text-[10px] text-muted-foreground block">Temporal Follower Delay</span>
                    <ScrubbableInput
                      label="Lag (s)"
                      value={b.lagSeconds ?? 0.1}
                      onChange={(val) => updateLayerBinding(selectedLayer.id, b.id, { lagSeconds: val || 0.1 })}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
