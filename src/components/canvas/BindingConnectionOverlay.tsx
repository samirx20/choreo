import React from 'react';
import { useProjectStore, findLayerInTree } from '@/store/useProjectStore';
import { Layer } from '@/types/scene';

interface BindingConnectionOverlayProps {
  canvasWidth: number;
  canvasHeight: number;
  screenOffset?: { x: number; y: number };
}

export const BindingConnectionOverlay: React.FC<BindingConnectionOverlayProps> = ({
  canvasWidth,
  canvasHeight,
  screenOffset,
}) => {
  const { document: doc, activeScreenId, selectedLayerIds } = useProjectStore();

  if (selectedLayerIds.length === 0) return null;

  const activeScreen = doc.screens.find((s) => s.id === activeScreenId) || doc.screens[0];

  // Find all connections involving the selected layer(s)
  const connections: Array<{
    id: string;
    driver: Layer;
    target: Layer;
    mode: string;
  }> = [];

  function scanLayers(layers: Layer[]) {
    for (const l of layers) {
      if (l.bindings && l.bindings.length > 0) {
        for (const b of l.bindings) {
          const isTargetSelected = selectedLayerIds.includes(l.id);
          const isDriverSelected = selectedLayerIds.includes(b.driverLayerId);

          if (isTargetSelected || isDriverSelected) {
            const driver = findLayerInTree(activeScreen.layers, b.driverLayerId);
            if (driver) {
              connections.push({
                id: `${b.id}_${driver.id}_${l.id}`,
                driver,
                target: l,
                mode: b.mode,
              });
            }
          }
        }
      }
      if (l.type === 'group' && (l as any).children) {
        scanLayers((l as any).children);
      }
    }
  }

  scanLayers(activeScreen.layers);

  if (connections.length === 0) return null;

  return (
    <svg
      className="pointer-events-none z-40 overflow-visible"
      style={{
        position: 'absolute',
        left: `${screenOffset?.x ?? 0}px`,
        top: `${screenOffset?.y ?? 0}px`,
        width: `${canvasWidth}px`,
        height: `${canvasHeight}px`,
      }}
      viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
    >
      <defs>
        <marker
          id="link-arrow"
          viewBox="0 0 10 10"
          refX="6"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8" />
        </marker>
        <filter id="link-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#38bdf8" floodOpacity="0.6" />
        </filter>
      </defs>

      {connections.map((conn) => {
        const driverEl = typeof document !== 'undefined' ? document.getElementById(`layer-${conn.driver.id}`) : null;
        const targetEl = typeof document !== 'undefined' ? document.getElementById(`layer-${conn.target.id}`) : null;

        let dX = conn.driver.style.x || 0;
        let dY = conn.driver.style.y || 0;
        let dW = typeof conn.driver.style.width === 'number' ? conn.driver.style.width : 160;
        let dH = typeof conn.driver.style.height === 'number' ? conn.driver.style.height : 60;

        let tX = conn.target.style.x || 0;
        let tY = conn.target.style.y || 0;
        let tW = typeof conn.target.style.width === 'number' ? conn.target.style.width : 160;
        let tH = typeof conn.target.style.height === 'number' ? conn.target.style.height : 60;

        const screenContainer = typeof document !== 'undefined' ? document.getElementById(`screen-${activeScreen.id}`) : null;
        if (screenContainer) {
          const screenRect = screenContainer.getBoundingClientRect();
          const domScale = screenRect.width > 0 ? screenRect.width / canvasWidth : 1;

          if (driverEl) {
            const r = driverEl.getBoundingClientRect();
            dX = (r.left - screenRect.left) / domScale;
            dY = (r.top - screenRect.top) / domScale;
            dW = r.width / domScale;
            dH = r.height / domScale;
          }

          if (targetEl) {
            const r = targetEl.getBoundingClientRect();
            tX = (r.left - screenRect.left) / domScale;
            tY = (r.top - screenRect.top) / domScale;
            tW = r.width / domScale;
            tH = r.height / domScale;
          }
        }

        const startPt = { x: dX + dW / 2, y: dY + dH / 2 };
        const endPt = { x: tX + tW / 2, y: tY + tH / 2 };

        const midX = (startPt.x + endPt.x) / 2;
        const midY = (startPt.y + endPt.y) / 2;
        const deltaY = endPt.y - startPt.y;
        const cp1Y = startPt.y + deltaY * 0.5;
        const cp2Y = endPt.y - deltaY * 0.5;

        const pathData = `M ${startPt.x} ${startPt.y} C ${startPt.x} ${cp1Y}, ${endPt.x} ${cp2Y}, ${endPt.x} ${endPt.y}`;

        const modeBadge =
          conn.mode === 'pin'
            ? '📍 Pin'
            : conn.mode === 'hug'
            ? '📐 Hug'
            : conn.mode === 'reflow'
            ? '↔️ Reflow'
            : conn.mode === 'match'
            ? '🔗 Match'
            : conn.mode === 'track-word'
            ? '✨ Word'
            : conn.mode === 'leader-line' || conn.mode === 'connect'
            ? '↗️ Line'
            : conn.mode === 'remap'
            ? '🎚️ Remap'
            : '🌊 Lag';

        return (
          <g key={conn.id} filter="url(#link-glow)">
            {/* Background halo curve */}
            <path
              d={pathData}
              fill="none"
              stroke="#0284c7"
              strokeWidth="4"
              opacity="0.4"
            />
            {/* Dashed animated line */}
            <path
              d={pathData}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2"
              strokeDasharray="6 4"
              markerEnd="url(#link-arrow)"
            />
            {/* Driver anchor circle */}
            <circle cx={startPt.x} cy={startPt.y} r="4" fill="#38bdf8" />
            {/* Relationship pill badge */}
            <g transform={`translate(${midX}, ${midY})`}>
              <rect
                x="-34"
                y="-11"
                width="68"
                height="22"
                rx="11"
                fill="#0f172a"
                stroke="#38bdf8"
                strokeWidth="1.5"
              />
              <text
                x="0"
                y="3.5"
                textAnchor="middle"
                fill="#e0f2fe"
                fontSize="10"
                fontWeight="600"
                fontFamily="sans-serif"
              >
                {modeBadge}
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
};
