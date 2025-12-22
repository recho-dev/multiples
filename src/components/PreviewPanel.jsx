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
  sketchType = "p5",
  onToggleMultiples,
  onSelect,
  sketchId,
  currentVersionId,
}) {
  return (
    <div className="h-full flex flex-col px-4 py-2">
      <div className="flex gap-2 mb-2 flex-shrink-0">
        <span
          className={clsx("cursor-pointer", !showMultiples && "border-b-1")}
          onClick={() => onToggleMultiples(false)}
        >
          Preview
        </span>
        {params.length >= 0 && (
          <span
            className={clsx("cursor-pointer", showMultiples && "border-b-1")}
            onClick={() => onToggleMultiples(true)}
          >
            Multiples
          </span>
        )}
      </div>
      <div className="flex-1 overflow-auto">
        {showMultiples ? (
          <Multiples
            code={code}
            params={params}
            ranges={ranges}
            onRangesChange={onRangesChange}
            cellSize={cellSize}
            onCellSizeChange={onCellSizeChange}
            sketchType={sketchType}
            onSelect={onSelect}
            sketchId={sketchId}
            currentVersionId={currentVersionId}
          />
        ) : (
          <Sketch code={previewCode} sketchType={sketchType} />
        )}
      </div>
    </div>
  );
}
