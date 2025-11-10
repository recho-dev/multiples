import {useMemo} from "react";
import {Sketch} from "./Sketch.jsx";

function generateCode(code, params, {count = 6} = {}) {
  if (params.length === 0) return [];
  const multiples = [];
  const baseValues = params.map((n) => parseFloat(n.value));
  for (let i = 0; i < count; i++) {
    let modifiedCode = code;
    const variations = params.map((_, j) => {
      const baseValue = baseValues[j];
      const minValue = Math.max(0, baseValue * 0.5);
      const maxValue = baseValue === 0 ? 100 : baseValue * 2;
      const step = (maxValue - minValue) / 5;
      const newValue = minValue + step * i;
      // Format nicely - remove unnecessary decimals
      const formatted = newValue % 1 === 0 ? newValue.toString() : newValue.toFixed(1);
      return formatted;
    });
    const sortedParams = [...params].sort((a, b) => b.from - a.from);
    for (let j = 0; j < sortedParams.length; j++) {
      const param = sortedParams[j];
      modifiedCode = modifiedCode.slice(0, param.from) + variations[j] + modifiedCode.slice(param.to);
    }
    multiples.push(modifiedCode);
  }
  return multiples;
}

export function Multiples({code, params}) {
  const multiples = useMemo(() => generateCode(code, params), [code, params]);
  return (
    <div>
      <div>
        {params.map((d) => (
          <span key={d.from} className="inline-block pr-4">
            {d.from}-{d.to}: {d.value}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-4">
        {multiples.map((multiple, index) => (
          <div key={index} className="w-[200px] h-[200px]">
            <Sketch code={multiple} />
          </div>
        ))}
      </div>
    </div>
  );
}
