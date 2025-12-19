import {clsx} from "../clsx.js";
import {Sketch} from "./Sketch.jsx";
import {Multiples} from "./Multiples.jsx";

export function PreviewPanel({showMultiples, code, params, onToggleMultiples, onSelect}) {
  return (
    <div className="h-full overflow-auto ml-4 mt-2">
      <div className="flex gap-2 mb-2">
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
      <div>
        {showMultiples ? <Multiples code={code} params={params} onSelect={onSelect} /> : <Sketch code={code} />}
      </div>
    </div>
  );
}

