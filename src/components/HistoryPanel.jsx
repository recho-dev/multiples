import {forwardRef} from "react";
import {VersionItem} from "./VersionItem.jsx";

export const HistoryPanel = forwardRef(function HistoryPanel(
  {versions, currentVersionId, sidebarWidth, onLoadVersion, onDeleteVersion},
  ref
) {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-4 py-2 border-b border-gray-200 flex-shrink-0">
        <span>History</span>
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

