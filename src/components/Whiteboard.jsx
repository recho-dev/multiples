import {useEffect, useRef, useState, useCallback} from "react";
import {Sketch} from "./Sketch.jsx";

const SKETCH_PADDING = 20; // Padding around each sketch

function isOverLap(wordA, wordB, padding = 0) {
  // Add padding to the bounding boxes for overlap detection
  const xA = wordA.x + wordA.data.width + padding;
  const yA = wordA.y + wordA.data.height + padding;
  const xB = wordB.x + wordB.data.width + padding;
  const yB = wordB.y + wordB.data.height + padding;
  return !(xA < wordB.x - padding || yA < wordB.y - padding || xB < wordA.x - padding || yB < wordA.y - padding);
}

function hasOverLap(word, index, array, padding = 0) {
  return array.filter((_, i) => i < index).some((d) => isOverLap(d, word, padding));
}

function allocate(word, index, array, padding = 0) {
  if (index === 0) {
    word.x = 0;
    word.y = 0;
    return;
  }
  let r = 10;
  let degree = 0;
  const increase = 400;
  do {
    word.x = Math.round(r * Math.sin((degree * Math.PI) / 180));
    word.y = Math.round(r * Math.cos((degree * Math.PI) / 180));
    degree += 1;
    degree >= 360 && ((r += increase), (degree = 0));
  } while (hasOverLap(word, index, array, padding));
}

function layoutNodes(nodes, padding = 0) {
  nodes.forEach((node, index) => allocate(node, index, nodes, padding));
  return nodes;
}

export function Whiteboard({versions, onClose}) {
  const containerRef = useRef(null);
  const viewportRef = useRef(null);
  const [positionedVersions, setPositionedVersions] = useState([]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({x: 0, y: 0});
  const dimensionRefs = useRef({});

  const calculateLayout = useCallback(() => {
    if (versions.length === 0 || !containerRef.current) return;

    // Check if all dimensions are ready
    const allMeasured = versions.every((v) => dimensionRefs.current[v.id]);
    if (!allMeasured) return;

    // Create nodes with dimensions
    const nodes = versions.map((version) => {
      const dimensions = dimensionRefs.current[version.id];
      return {
        id: version.id,
        version: version,
        x: 0,
        y: 0,
        data: {
          width: dimensions.width,
          height: dimensions.height,
        },
      };
    });

    // Apply layout algorithm with padding
    layoutNodes(nodes, SKETCH_PADDING);

    // Calculate bounding box (including padding)
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    nodes.forEach((node) => {
      minX = Math.min(minX, node.x - SKETCH_PADDING);
      minY = Math.min(minY, node.y - SKETCH_PADDING);
      maxX = Math.max(maxX, node.x + node.data.width + SKETCH_PADDING);
      maxY = Math.max(maxY, node.y + node.data.height + SKETCH_PADDING);
    });

    const boundingWidth = maxX - minX;
    const boundingHeight = maxY - minY;

    // Calculate zoom and pan to fit in viewport
    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;

    const padding = 40;
    const scaleX = (containerWidth - padding * 2) / boundingWidth;
    const scaleY = (containerHeight - padding * 2) / boundingHeight;
    const newZoom = Math.min(scaleX, scaleY, 1);

    // Center the content
    const scaledWidth = boundingWidth * newZoom;
    const scaledHeight = boundingHeight * newZoom;
    const newPanX = (containerWidth - scaledWidth) / 2 - minX * newZoom;
    const newPanY = (containerHeight - scaledHeight) / 2 - minY * newZoom;

    setZoom(newZoom);
    setPan({x: newPanX, y: newPanY});
    setPositionedVersions(nodes);
  }, [versions]);

  const handleDimensionReady = useCallback(
    (versionId, width, height) => {
      dimensionRefs.current[versionId] = {width, height};
      calculateLayout();
    },
    [calculateLayout]
  );

  // Reset dimensions when versions change
  useEffect(() => {
    dimensionRefs.current = {};
    setPositionedVersions([]);
  }, [versions]);

  // Recalculate layout when container resizes
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver(() => {
      calculateLayout();
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [calculateLayout]);

  return (
    <div ref={containerRef} className="h-full w-full relative bg-gray-50 overflow-hidden">
      <button
        onClick={onClose}
        className="absolute top-4 left-4 z-10 px-4 py-2 bg-white hover:bg-gray-100 border border-gray-300 rounded shadow-sm transition-colors"
      >
        Close Whiteboard
      </button>

      {/* Hidden sketches for dimension measurement */}
      <div className="absolute opacity-0 pointer-events-none" style={{left: "-9999px", top: "-9999px"}}>
        {versions.map((version) => (
          <SketchWithDimensions key={version.id} version={version} onDimensionReady={handleDimensionReady} />
        ))}
      </div>

      {/* Visible positioned sketches */}
      <div
        ref={viewportRef}
        className="absolute inset-0"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
        }}
      >
        {positionedVersions.map((node) => (
          <div
            key={node.id}
            className="absolute border border-gray-200 bg-white shadow-sm"
            style={{
              left: `${node.x}px`,
              top: `${node.y}px`,
              width: `${node.data.width}px`,
              height: `${node.data.height}px`,
            }}
          >
            <Sketch code={node.version.code} width={node.data.width} height={node.data.height} />
          </div>
        ))}
      </div>
    </div>
  );
}

function SketchWithDimensions({version, onDimensionReady}) {
  const sketchRef = useRef(null);
  const measuredRef = useRef(false);

  useEffect(() => {
    if (measuredRef.current || !sketchRef.current) return;

    const checkCanvas = () => {
      if (measuredRef.current) return;
      const canvas = sketchRef.current?.querySelector("canvas");
      if (canvas) {
        // Get actual canvas dimensions
        const width = canvas.width / (window.devicePixelRatio || 1);
        const height = canvas.height / (window.devicePixelRatio || 1);
        if (width > 0 && height > 0) {
          onDimensionReady(version.id, width, height);
          measuredRef.current = true;
          return true;
        }
      }
      return false;
    };

    // Try immediately
    if (checkCanvas()) return;

    // Use MutationObserver to detect when canvas is added
    const observer = new MutationObserver(() => {
      if (checkCanvas()) {
        observer.disconnect();
      }
    });

    observer.observe(sketchRef.current, {
      childList: true,
      subtree: true,
    });

    // Fallback timeout
    const timeout = setTimeout(() => {
      observer.disconnect();
      if (!measuredRef.current) {
        // Default dimensions if we can't measure
        onDimensionReady(version.id, 400, 400);
        measuredRef.current = true;
      }
    }, 3000);

    return () => {
      observer.disconnect();
      clearTimeout(timeout);
    };
  }, [version.id, version.code, onDimensionReady]);

  return (
    <div ref={sketchRef} style={{position: "absolute", left: "-9999px", top: "-9999px", visibility: "hidden"}}>
      <Sketch code={version.code} />
    </div>
  );
}
