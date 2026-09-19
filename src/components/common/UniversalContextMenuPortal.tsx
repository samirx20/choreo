import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { useContextMenuStore, ContextMenuItem } from "@/store/useContextMenuStore";
import { calculateMenuPosition, calculateSubmenuPosition } from "@/utils/contextMenuMath";
import { ChevronRight } from "lucide-react";

export const UniversalContextMenuPortal: React.FC = () => {
  const { isOpen, x, y, items, closeContextMenu } = useContextMenuStore();
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeSubmenuId, setActiveSubmenuId] = useState<string | null>(null);
  const [submenuAnchorRect, setSubmenuAnchorRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setActiveSubmenuId(null);
      setSubmenuAnchorRect(null);
      return;
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeContextMenu();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeContextMenu();
      }
    };

    const handleWindowBlur = () => {
      closeContextMenu();
    };

    window.addEventListener("pointerdown", handleClickOutside, { capture: true });
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      window.removeEventListener("pointerdown", handleClickOutside, { capture: true });
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [isOpen, closeContextMenu]);

  if (!isOpen || items.length === 0 || typeof document === "undefined") {
    return null;
  }

  const estimatedHeight = items.length * 30 + 16;
  const menuPos = calculateMenuPosition(x, y, 220, estimatedHeight);

  const activeSubmenuItem = items.find((item) => item.id === activeSubmenuId);
  const submenuPos = submenuAnchorRect
    ? calculateSubmenuPosition(
        {
          left: submenuAnchorRect.left,
          top: submenuAnchorRect.top,
          right: submenuAnchorRect.right,
          bottom: submenuAnchorRect.bottom,
        },
        200,
        (activeSubmenuItem?.children?.length || 4) * 30 + 16
      )
    : null;

  return ReactDOM.createPortal(
    <div
      ref={menuRef}
      className="fixed z-[99999] select-none text-xs font-sans animate-in fade-in zoom-in-95 duration-100 outline-none"
      style={{
        left: menuPos.x,
        top: menuPos.y,
        transformOrigin: menuPos.transformOrigin,
      }}
      data-testid="universal-context-menu"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="w-[220px] rounded-[12px] bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800/80 shadow-2xl backdrop-blur-md p-1.5 text-slate-800 dark:text-slate-100">
        {items.map((item, idx) => {
          if (item.divider) {
            return (
              <div
                key={`div-${idx}`}
                className="my-1 border-t border-slate-200/70 dark:border-slate-800/70"
              />
            );
          }

          const hasSubmenu = item.children && item.children.length > 0;
          const isSubmenuOpen = activeSubmenuId === item.id;

          return (
            <div
              key={item.id}
              className={`relative flex items-center justify-between px-2.5 py-1.5 rounded-[8px] transition-colors cursor-pointer ${
                item.disabled
                  ? "opacity-40 cursor-not-allowed text-slate-400"
                  : item.danger
                  ? "text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                  : "hover:bg-slate-100 dark:hover:bg-slate-800/80"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                if (item.disabled) return;
                if (!hasSubmenu && item.action) {
                  item.action();
                  closeContextMenu();
                }
              }}
              onMouseEnter={(e) => {
                if (hasSubmenu) {
                  setActiveSubmenuId(item.id);
                  setSubmenuAnchorRect(e.currentTarget.getBoundingClientRect());
                } else {
                  setActiveSubmenuId(null);
                  setSubmenuAnchorRect(null);
                }
              }}
            >
              <div className="flex items-center gap-2 truncate">
                {item.icon && <span className="text-slate-500 dark:text-slate-400">{item.icon}</span>}
                <span className="truncate font-medium">{item.label}</span>
              </div>

              <div className="flex items-center gap-1.5 ml-2 shrink-0">
                {item.shortcut && (
                  <kbd className="text-[10px] text-slate-400 dark:text-slate-500 font-mono tracking-tight">
                    {item.shortcut}
                  </kbd>
                )}
                {hasSubmenu && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Nested Submenu Rendering */}
      {activeSubmenuItem && submenuPos && (
        <div
          className="fixed z-[100000] select-none text-xs font-sans animate-in fade-in zoom-in-95 duration-100 outline-none"
          style={{
            left: submenuPos.x,
            top: submenuPos.y,
            transformOrigin: submenuPos.transformOrigin,
          }}
          data-testid="universal-submenu"
        >
          <div className="w-[200px] rounded-[12px] bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800/80 shadow-2xl backdrop-blur-md p-1.5 text-slate-800 dark:text-slate-100">
            {activeSubmenuItem.children?.map((subItem, sIdx) => {
              if (subItem.divider) {
                return (
                  <div
                    key={`sdiv-${sIdx}`}
                    className="my-1 border-t border-slate-200/70 dark:border-slate-800/70"
                  />
                );
              }

              return (
                <div
                  key={subItem.id}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-[8px] transition-colors cursor-pointer ${
                    subItem.disabled
                      ? "opacity-40 cursor-not-allowed text-slate-400"
                      : subItem.danger
                      ? "text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800/80"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (subItem.disabled) return;
                    if (subItem.action) {
                      subItem.action();
                      closeContextMenu();
                    }
                  }}
                >
                  <div className="flex items-center gap-2 truncate">
                    {subItem.icon && (
                      <span className="text-slate-500 dark:text-slate-400">{subItem.icon}</span>
                    )}
                    <span className="truncate font-medium">{subItem.label}</span>
                  </div>
                  {subItem.shortcut && (
                    <kbd className="text-[10px] text-slate-400 dark:text-slate-500 font-mono tracking-tight">
                      {subItem.shortcut}
                    </kbd>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
