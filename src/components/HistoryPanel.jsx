import {forwardRef} from "react";
import {VersionItem} from "./VersionItem.jsx";

export const HistoryPanel = forwardRef(function HistoryPanel(
  {versions, currentVersionId, sidebarWidth, onLoadVersion, onDeleteVersion, onWhiteboardClick},
  ref
) {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-4 py-2 border-b border-gray-200 flex-shrink-0 flex items-center justify-between">
        <span>History</span>
        {versions.length > 0 && (
          <button
            onClick={onWhiteboardClick}
            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
            title="Open Whiteboard"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
              <line x1="15" y1="3" x2="15" y2="21" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="3" y1="15" x2="21" y2="15" />
            </svg>
          </button>
        )}
      </div>
      <div ref={ref} className="flex-1 overflow-y-auto px-4 py-2">
        {versions.length === 0 ? (
          <p className="text-xs text-gray-500">No saved versions yet</p>
        ) : (
          <div className="space-y-3">
            {versions.map((version) => (
              <VersionItem
                key={version.id}
                version={version}
                isCurrent={currentVersionId === version.id}
                width={sidebarWidth}
                onLoad={onLoadVersion}
                onDelete={onDeleteVersion}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

