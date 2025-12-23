import {forwardRef, useEffect, useRef} from "react";
import {VersionItem} from "./VersionItem.jsx";

export const HistoryPanel = forwardRef(function HistoryPanel(
  {versions, currentVersionId, sidebarWidth, sketchType = "p5", onLoadVersion, onDeleteVersion, onSaveVersionName, onWhiteboardClick},
  ref
) {
  const versionItemRefs = useRef({});
  const scrollContainerRef = useRef(null);

  // Scroll to selected version when currentVersionId changes
  useEffect(() => {
    if (currentVersionId && versionItemRefs.current[currentVersionId] && scrollContainerRef.current) {
      const versionElement = versionItemRefs.current[currentVersionId];
      const scrollContainer = scrollContainerRef.current;
      setTimeout(() => {
        // Calculate the position relative to the scroll container
        const containerRect = scrollContainer.getBoundingClientRect();
        const elementRect = versionElement.getBoundingClientRect();
        const scrollTop = scrollContainer.scrollTop + (elementRect.top - containerRect.top);
        scrollContainer.scrollTo({
          top: scrollTop,
          behavior: "smooth",
        });
      }, 100);
    }
  }, [currentVersionId]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-4 py-2 border-b border-gray-200 flex-shrink-0 flex items-center justify-between relative z-10 bg-white">
        <span>Versions</span>
        {versions.length > 0 && (
          <button
            onClick={onWhiteboardClick}
            className="p-1.5 hover:bg-gray-100 rounded transition-colors cursor-pointer"
            title="Open Whiteboard"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
              <line x1="15" y1="3" x2="15" y2="21" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="3" y1="15" x2="21" y2="15" />
            </svg>
          </button>
        )}
      </div>
      <div
        ref={(node) => {
          scrollContainerRef.current = node;
          if (ref) {
            if (typeof ref === "function") {
              ref(node);
            } else {
              ref.current = node;
            }
          }
        }}
        className="flex-1 overflow-y-auto px-4 py-2"
      >
        {versions.length === 0 ? (
          <p className="text-xs text-gray-500">No saved versions yet</p>
        ) : (
          <div className="space-y-3">
            {[...versions].reverse().map((version) => (
              <VersionItem
                key={version.id}
                ref={(node) => {
                  versionItemRefs.current[version.id] = node;
                }}
                version={version}
                isCurrent={currentVersionId === version.id}
                width={sidebarWidth}
                sketchType={sketchType}
                onLoad={onLoadVersion}
                onDelete={onDeleteVersion}
                onSaveName={onSaveVersionName}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
