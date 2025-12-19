import {forwardRef} from "react";
import {VersionItem} from "./VersionItem.jsx";

export const HistoryPanel = forwardRef(function HistoryPanel(
  {versions, currentVersionId, sidebarWidth, onLoadVersion, onDeleteVersion, onDownloadAll},
  ref
) {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-4 py-2 border-b border-gray-200 flex-shrink-0 flex items-center justify-between">
        <span>History</span>
        {versions.length > 0 && (
          <button
            onClick={onDownloadAll}
            className="p-1.5 text-gray-600 hover:text-black hover:bg-gray-100 rounded transition-colors"
            title="Download all versions"
            aria-label="Download all versions"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
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

