import {useMemo, useState, useEffect, useRef, useCallback} from "react";
import {Sketch} from "./Sketch.jsx";
import {WebGL2MultiplesRenderer} from "./WebGL2MultiplesRenderer.jsx";
import * as d3 from "d3";

function replaceValues(V, code, params) {
  return V.map((v) => {
    const I = Array.from({length: params.length}, (_, i) => i);
    const sortedI = d3.sort(I, (a, b) => params[b].from - params[a].from);
    let modifiedCode = code;
    for (const i of sortedI) {
      const {from, to} = params[i];
      // Validate positions are within code bounds and from < to
      if (from < 0 || to > code.length || from >= to) {
        console.warn(`Invalid param positions: from=${from}, to=${to}, code.length=${code.length}`);
        // Skip this param if positions are invalid
        continue;
      }
      modifiedCode = modifiedCode.slice(0, from) + v[i] + modifiedCode.slice(to);
    }
    return {code: modifiedCode, values: v};
  });
}

function getDefaultRange(value, defaultCount = 4) {
  value = parseFloat(value);
  let [min, max] = [value * 0.5, value * 2];
  if (value === 0) [min, max] = [0, 100];
  if (min > max) [min, max] = [max, min];
  return {min, max, count: defaultCount};
}

function generateVariations(value, defaultCount, customRange = null) {
  let min, max, count;
  const type = customRange?.type || "Float";

  if (customRange) {
    min = parseFloat(customRange.start);
    max = parseFloat(customRange.end);
    count = parseInt(customRange.count, 10) || defaultCount;
  } else {
    const defaultRange = getDefaultRange(value, defaultCount);
    min = defaultRange.min;
    max = defaultRange.max;
    count = defaultRange.count;
  }

  if (isNaN(min) || isNaN(max) || isNaN(count) || count < 1) {
    const defaultRange = getDefaultRange(value, defaultCount);
    min = defaultRange.min;
    max = defaultRange.max;
    count = defaultRange.count;
  }

  if (min > max) [min, max] = [max, min];
  if (count < 1) count = defaultCount;

  // Round min/max to integers if type is Int
  if (type === "Int") {
    min = Math.round(min);
    max = Math.round(max);
  }

  // Generate evenly spaced values from min to max
  const values = [];
  if (count === 1) {
    values.push(min);
  } else {
    const step = (max - min) / (count - 1);
    for (let i = 0; i < count; i++) {
      let val = min + step * i;
      // Round to integer if type is Int
      if (type === "Int") {
        val = Math.round(val);
      }
      values.push(val);
    }
  }

  // Format output: integers without decimals, floats with 2 decimal places
  return values.map((v) => {
    if (type === "Int") {
      return Math.round(v).toString();
    }
    return parseFloat(v.toFixed(10)).toFixed(2);
  });
}

function getParamKey(param) {
  // Use uid if available, fallback to from-to for backward compatibility
  return param.uid || `${param.from}-${param.to}`;
}

function generateXd(code, params, ranges, {count = 4} = {}) {
  const V0 = generateVariations(params[0].value, count, ranges[getParamKey(params[0])]);
  const V1 = generateVariations(params[1].value, count, ranges[getParamKey(params[1])]);
  const V = d3.cross(V0, V1);
  const [, , ...Vs] = params;
  const totalItems = count ** 2;

  // For additional params, generate variations based on their own count,
  // then repeat cyclically to match the total number of combinations
  const restV = Vs.map((v) => {
    const key = getParamKey(v);
    const range = ranges[key];
    // Generate variations based on the param's own count (not count ** 2)
    const values = generateVariations(v.value, count, range);

    // Repeat values cyclically to match totalItems
    const repeatedValues = [];
    for (let i = 0; i < totalItems; i++) {
      repeatedValues.push(values[i % values.length]);
    }
    return repeatedValues;
  });

  for (let i = 0; i < totalItems; i++) {
    V[i].push(...restV.map((values) => values[i]));
  }
  return replaceValues(V, code, params);
}

function generate2d(code, params, ranges, {count = 4} = {}) {
  const V0 = generateVariations(params[0].value, count, ranges[getParamKey(params[0])]);
  const V1 = generateVariations(params[1].value, count, ranges[getParamKey(params[1])]);
  const V = d3.cross(V0, V1);
  return replaceValues(V, code, params);
}

function generate1d(code, params, ranges, {count = 4} = {}) {
  const {value, from, to} = params[0];
  const V = generateVariations(value, count * 2, ranges[getParamKey(params[0])]);
  return V.map((v) => ({
    code: code.slice(0, from) + v + code.slice(to),
    values: [v],
  }));
}

function generateCode(code, params, ranges, {count = 4} = {}) {
  if (params.length === 0) return [];
  if (params.length === 1) return generate1d(code, params, ranges, {count});
  if (params.length === 2) return generate2d(code, params, ranges, {count});
  return generateXd(code, params, ranges, {count});
}

export function Multiples({
  code,
  params,
  ranges: initialRanges = {},
  onRangesChange,
  cellSize: initialCellSize = 200,
  onCellSizeChange,
  showLabels: initialShowLabels = true,
  onShowLabelsChange,
  sketchType = "p5",
  onSelect,
  sketchId,
  currentVersionId,
}) {
  const cols = 4;
  const [sketchSize, setSketchSize] = useState(initialCellSize);
  const [sliderValue, setSliderValue] = useState(initialCellSize);
  const [showLabels, setShowLabels] = useState(initialShowLabels);
  const skipNotificationRef = useRef(false);
  const prevInitialRangesRef = useRef(JSON.stringify(initialRanges));
  const debounceTimeoutRef = useRef(null);

  // Update sketch size when initialCellSize changes (e.g., when loading a version)
  useEffect(() => {
    setSketchSize(initialCellSize);
    setSliderValue(initialCellSize);
  }, [initialCellSize]);

  // Update showLabels when initialShowLabels changes (e.g., when loading a version)
  useEffect(() => {
    setShowLabels(initialShowLabels);
  }, [initialShowLabels]);

  // Debounced function to update sketch size
  const debouncedSetSketchSize = useCallback(
    (value) => {
      setSliderValue(value); // Update slider immediately for visual feedback
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      debounceTimeoutRef.current = setTimeout(() => {
        setSketchSize(value);
        if (onCellSizeChange) {
          onCellSizeChange(value);
        }
      }, 150);
    },
    [onCellSizeChange]
  );

  // Initialize range settings for each param, using initialRanges if provided
  const [ranges, setRanges] = useState(() => {
    const ranges = {...initialRanges};
    params.forEach((param) => {
      const key = getParamKey(param);
      if (!ranges[key]) {
        const defaultRange = getDefaultRange(param.value, cols);
        ranges[key] = {
          start: defaultRange.min.toFixed(2),
          end: defaultRange.max.toFixed(2),
          count: defaultRange.count.toString(),
          type: "Float",
        };
      }
    });
    return ranges;
  });

  // Update ranges when initialRanges prop changes (e.g., when loading a version)
  useEffect(() => {
    const currentInitialRangesStr = JSON.stringify(initialRanges);
    if (currentInitialRangesStr !== prevInitialRangesRef.current && Object.keys(initialRanges).length > 0) {
      skipNotificationRef.current = true;
      prevInitialRangesRef.current = currentInitialRangesStr;
      setRanges((prevRanges) => {
        const newRanges = {...initialRanges};
        // Fill in any missing ranges with defaults for current params
        params.forEach((param) => {
          const key = getParamKey(param);
          if (!newRanges[key]) {
            const defaultRange = getDefaultRange(param.value, cols);
            newRanges[key] = {
              start: defaultRange.min.toFixed(2),
              end: defaultRange.max.toFixed(2),
              count: defaultRange.count.toString(),
              type: "Float",
            };
          }
        });
        return newRanges;
      });
      // Reset the flag in the next tick after state has updated
      requestAnimationFrame(() => {
        skipNotificationRef.current = false;
      });
    }
  }, [initialRanges, params, cols]);

  // Update ranges when params change
  useEffect(() => {
    setRanges((prevRanges) => {
      const newRanges = {...prevRanges};
      params.forEach((param) => {
        const key = getParamKey(param);
        if (!newRanges[key]) {
          const defaultRange = getDefaultRange(param.value, cols);
          newRanges[key] = {
            start: defaultRange.min.toFixed(2),
            end: defaultRange.max.toFixed(2),
            count: defaultRange.count.toString(),
            type: "Float",
          };
        }
      });
      // Remove ranges for params that no longer exist
      Object.keys(newRanges).forEach((key) => {
        if (!params.some((p) => getParamKey(p) === key)) {
          delete newRanges[key];
        }
      });
      return newRanges;
    });
  }, [params, cols]);

  // Notify parent of range changes only when not updating from parent
  useEffect(() => {
    if (skipNotificationRef.current) {
      skipNotificationRef.current = false;
      return;
    }
    if (onRangesChange) {
      // Only notify if ranges differ from initialRanges (user-initiated change)
      const rangesStr = JSON.stringify(ranges);
      const initialRangesStr = JSON.stringify(initialRanges);
      if (rangesStr !== initialRangesStr) {
        onRangesChange(ranges);
      }
    }
  }, [ranges, onRangesChange, initialRanges]);

  const updateRange = (paramKey, field, value) => {
    setRanges((prev) => {
      const newRanges = {
        ...prev,
        [paramKey]: {
          ...prev[paramKey],
          [field]: value,
        },
      };
      return newRanges;
    });
  };

  // Calculate column count: if more than 1 param, use second param's count, otherwise use default
  const columnCount = useMemo(() => {
    if (params.length > 1) {
      const secondParamKey = getParamKey(params[1]);
      const secondParamRange = ranges[secondParamKey];
      if (secondParamRange && secondParamRange.count) {
        return parseInt(secondParamRange.count, 10) || cols;
      }
    }
    return cols;
  }, [params, ranges, cols]);

  const multiples = useMemo(
    () => generateCode(code, params, ranges, {count: columnCount}),
    [code, params, ranges, columnCount]
  );

  const rows = useMemo(() => {
    const n = Math.ceil(multiples.length / columnCount);
    return Array.from({length: n}, (_, i) => multiples.slice(i * columnCount, (i + 1) * columnCount));
  }, [multiples, columnCount]);

  // Detect WebGL code by checking if code starts with #version
  const isWebGLCode = code?.trim().startsWith("#version");
  const isWebGL = sketchType === "webgl2" || isWebGLCode;

  if (params.length === 0) {
    return (
      <div className="text-gray-500">
        <p>No parameter is swept</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs">
            <span>Cell Size:</span>
            <input
              type="range"
              min="25"
              max="400"
              step="10"
              value={sliderValue}
              onChange={(e) => debouncedSetSketchSize(parseInt(e.target.value, 10))}
              className="w-[200px]"
            />
            <span className="w-12 text-right">{sliderValue}px</span>
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(e) => {
                const newValue = e.target.checked;
                setShowLabels(newValue);
                if (onShowLabelsChange) {
                  onShowLabelsChange(newValue);
                }
              }}
            />
            <span>Label</span>
          </label>
        </div>
      </div>
      <div className="space-y-2 my-2">
        {params.map((param, i) => {
          const paramKey = getParamKey(param);
          const range = ranges[paramKey] || {start: "0", end: "100", count: "4", type: "Float"};
          return (
            <div
              key={`${sketchId || "new"}-${currentVersionId || "none"}-${i}-${paramKey}`}
              className="flex items-center gap-4 text-xs"
            >
              <span className="w-8 mr-6">
                X{i}={param.value}
              </span>
              <label className="flex items-center gap-1">
                <span>type</span>
                <select
                  value={range.type || "Float"}
                  onChange={(e) => updateRange(paramKey, "type", e.target.value)}
                  className="w-16 px-1 py-0.5 border border-gray-300 rounded text-xs"
                >
                  <option value="Float">Float</option>
                  <option value="Int">Int</option>
                </select>
              </label>
              <label className="flex items-center gap-1">
                <span>start</span>
                <input
                  type="number"
                  step={range.type === "Int" ? "1" : "any"}
                  value={range.start}
                  onChange={(e) => updateRange(paramKey, "start", e.target.value)}
                  className="w-20 px-1 py-0.5 border border-gray-300 rounded text-xs"
                />
              </label>
              <label className="flex items-center gap-1">
                <span>end</span>
                <input
                  type="number"
                  step={range.type === "Int" ? "1" : "any"}
                  value={range.end}
                  onChange={(e) => updateRange(paramKey, "end", e.target.value)}
                  className="w-20 px-1 py-0.5 border border-gray-300 rounded text-xs"
                />
              </label>
              <label className="flex items-center gap-1">
                <span>count</span>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={range.count}
                  onChange={(e) => updateRange(paramKey, "count", e.target.value)}
                  className="w-20 px-1 py-0.5 border border-gray-300 rounded text-xs"
                />
              </label>
            </div>
          );
        })}
      </div>
      {isWebGL ? (
        // Use single WebGL context for WebGL sketches
        <div className="py-3">
          <div className="relative" style={{width: `${columnCount * sketchSize}px`}}>
            <WebGL2MultiplesRenderer
              multiples={multiples}
              cellSize={sketchSize}
              columnCount={columnCount}
              showLabels={showLabels}
              onSelect={onSelect}
            />
          </div>
        </div>
      ) : params.length === 1 ? (
        // Flexbox layout for single param
        <div
          className="flex flex-wrap"
          style={{
            gap: showLabels ? "24px" : "0",
            paddingTop: showLabels ? "12px" : "0",
            paddingBottom: showLabels ? "12px" : "0",
          }}
        >
          {multiples.map((multiple, i) => (
            <div
              key={i}
              className="cursor-pointer hover:opacity-80 transition-opacity"
              style={{
                width: `${sketchSize}px`,
                height: `${sketchSize}px`,
              }}
              onClick={() => onSelect(multiple)}
            >
              <Sketch code={multiple.code} width={sketchSize} height={sketchSize} sketchType={sketchType} />
              {showLabels && (
                <span className="text-xs whitespace-nowrap">{`${multiple.values
                  .map((v, idx) => `X${idx}=${v}`)
                  .join(", ")}`}</span>
              )}
            </div>
          ))}
        </div>
      ) : (
        // Grid layout for multiple params
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${columnCount}, ${sketchSize}px)`,
            gap: showLabels ? "24px" : "0",
            paddingTop: showLabels ? "12px" : "0",
            paddingBottom: showLabels ? "12px" : "0",
            width: showLabels
              ? `${columnCount * sketchSize + (columnCount - 1) * 24}px`
              : `${columnCount * sketchSize}px`,
          }}
        >
          {multiples.map((multiple, i) => (
            <div
              key={i}
              className="cursor-pointer hover:opacity-80 transition-opacity"
              style={{
                width: `${sketchSize}px`,
                height: `${sketchSize}px`,
                margin: "0",
                padding: "0",
              }}
              onClick={() => onSelect(multiple)}
            >
              <Sketch code={multiple.code} width={sketchSize} height={sketchSize} sketchType={sketchType} />
              {showLabels && (
                <span className="text-xs whitespace-nowrap">{`${multiple.values
                  .map((v, idx) => `X${idx}=${v}`)
                  .join(", ")}`}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
