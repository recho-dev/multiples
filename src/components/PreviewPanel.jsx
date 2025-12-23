import {useState} from "react";
import {clsx} from "../clsx.js";
import {Sketch} from "./Sketch.jsx";
import {Multiples} from "./Multiples.jsx";

export function PreviewPanel({
  showMultiples,
  code,
  previewCode,
  params,
  ranges = {},
  onRangesChange,
  cellSize,
  onCellSizeChange,
  showLabels = true,
  onShowLabelsChange,
  sketchType = "p5",
  onToggleMultiples,
  onSelect,
  sketchId,
  currentVersionId,
}) {
  const [isFocusMode, setIsFocusMode] = useState(false);

  const handleFocusClick = (e) => {
    e.stopPropagation();
    setIsFocusMode(true);
  };

  const handleCloseFocus = () => {
    setIsFocusMode(false);
  };

  const renderContent = (hideVisualization = false, forFocusOverlay = false) => {
    if (showMultiples) {
      return (
        <Multiples
          code={code}
          params={params}
          ranges={ranges}
          onRangesChange={onRangesChange}
          cellSize={cellSize}
          onCellSizeChange={onCellSizeChange}
          showLabels={showLabels}
          onShowLabelsChange={onShowLabelsChange}
          sketchType={sketchType}
          onSelect={isFocusMode ? undefined : onSelect}
          sketchId={sketchId}
          currentVersionId={currentVersionId}
          isFocusMode={forFocusOverlay}
          hideVisualization={hideVisualization}
        />
      );
    } else {
      if (hideVisualization) {
        return null;
      }
      return <Sketch code={previewCode} sketchType={sketchType} />;
    }
  };

  return (
    <>
      <div className="h-full flex flex-col px-4 py-2">
        <div className="flex gap-2 mb-2 flex-shrink-0 items-center">
          <span
            className={clsx("cursor-pointer", !showMultiples && "border-b-1")}
            onClick={() => onToggleMultiples(false)}
          >
            Preview
          </span>
          {!showMultiples && (
            <button
              onClick={handleFocusClick}
              className="p-1 hover:bg-gray-200 rounded transition-colors cursor-pointer"
              title="Focus mode"
              aria-label="Focus mode"
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
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
              </svg>
            </button>
          )}
          {params.length >= 0 && (
            <>
              <span
                className={clsx("cursor-pointer", showMultiples && "border-b-1")}
                onClick={() => onToggleMultiples(true)}
              >
                Multiples
              </span>
              {showMultiples && (
                <button
                  onClick={handleFocusClick}
                  className="p-1 hover:bg-gray-200 rounded transition-colors cursor-pointer"
                  title="Focus mode"
                  aria-label="Focus mode"
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
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                  </svg>
                </button>
              )}
            </>
          )}
        </div>
        <div className="flex-1 overflow-auto">{renderContent(isFocusMode)}</div>
      </div>
      {isFocusMode && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-95 flex items-center justify-center">
          <button
            onClick={handleCloseFocus}
            className="absolute top-4 right-4 p-2 text-white hover:bg-gray-800 rounded transition-colors cursor-pointer z-10"
            title="Close focus mode"
            aria-label="Close focus mode"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          <div className="w-full h-full flex items-center justify-center p-8 overflow-auto">
            <div className="max-w-full max-h-full">{renderContent(false, true)}</div>
          </div>
        </div>
      )}
    </>
  );
}
