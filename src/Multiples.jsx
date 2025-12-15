import {useMemo} from "react";
import {Sketch} from "./Sketch.jsx";
import * as d3 from "d3";

function replaceValues(V, code, params) {
  return V.map((v) => {
    const I = Array.from({length: params.length}, (_, i) => i);
    const sortedI = d3.sort(I, (a, b) => params[b].from - params[a].from);
    let modifiedCode = code;
    for (const i of sortedI) {
      const {from, to} = params[i];
      modifiedCode = modifiedCode.slice(0, from) + v[i] + modifiedCode.slice(to);
    }
    return {code: modifiedCode, values: v};
  });
}

function generateVariations(value, count) {
  value = parseFloat(value);
  let [min, max] = [value * 0.5, value * 2];
  if (value === 0) [min, max] = [0, 100];
  if (min > max) [min, max] = [max, min];
  const step = (max - min) / (count - 1);
  return Array.from({length: count}, (_, i) => min + step * i).map((v) => v.toFixed(2));
}

function generateXd(code, params, {count = 4} = {}) {
  const V0 = generateVariations(params[0].value, count);
  const V1 = generateVariations(params[1].value, count);
  const V = d3.cross(V0, V1);
  const [, , ...Vs] = params;
  const restV = Vs.map((v) => {
    // const shuffler = d3.shuffler(d3.randomLcg(v.value));
    // return shuffler(values);
    const values = generateVariations(v.value, count ** 2);
    return values;
  });
  for (let i = 0; i < count ** 2; i++) V[i].push(...restV.map((v) => v[i]));
  return replaceValues(V, code, params);
}

function generate2d(code, params, {count = 4} = {}) {
  const V0 = generateVariations(params[0].value, count);
  const V1 = generateVariations(params[1].value, count);
  const V = d3.cross(V0, V1);
  return replaceValues(V, code, params);
}

function generate1d(code, params, {count = 4} = {}) {
  const {value, from, to} = params[0];
  const V = generateVariations(value, count * 2);
  return V.map((v) => ({
    code: code.slice(0, from) + v + code.slice(to),
    values: [v],
  }));
}

function generateCode(code, params, {count = 4} = {}) {
  if (params.length === 0) return [];
  if (params.length === 1) return generate1d(code, params, {count});
  if (params.length === 2) return generate2d(code, params, {count});
  return generateXd(code, params, {count});
}

export function Multiples({code, params, onSelect}) {
  const cols = 4;

  const multiples = useMemo(() => generateCode(code, params, {count: cols}), [code, params]);

  const rows = useMemo(() => {
    const n = Math.ceil(multiples.length / cols);
    return Array.from({length: n}, (_, i) => multiples.slice(i * cols, (i + 1) * cols));
  }, [multiples, cols]);

  return (
    <div>
      <div>
        {params.map((d, i) => (
          <span key={d.from} className="inline-block pr-2 text-xs">
            X{i}={d.value}
          </span>
        ))}
      </div>
      <div>
        {rows.map((row, i) => (
          <div key={i} className="flex gap-6 py-3">
            {row.map((multiple, j) => (
              <div
                key={j}
                className="w-[200px] h-[200px] cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => onSelect(multiple)}
              >
                <Sketch code={multiple.code} width={200} height={200} />
                <span className="text-xs">{`(${multiple.values.join(", ")})`}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
