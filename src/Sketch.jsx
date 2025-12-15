import {useEffect, useRef, useState} from "react";
import p5 from "p5";

p5.disableFriendlyErrors = true;

function evalP5Code(parent, code) {
  const sketch = new p5(eval(`(p) => { ${code}}`), parent);
  return sketch;
}

function scaleCanvas(canvas, containerWidth, containerHeight) {
  if (!canvas) return;
  const canvasWidth = canvas.width / (window.devicePixelRatio || 1);
  const canvasHeight = canvas.height / (window.devicePixelRatio || 1);
  if (!canvasWidth || !canvasHeight) return;

  let scale;
  let calculatedHeight;

  if (containerHeight === undefined) {
    // Width-only: preserve aspect ratio
    scale = Math.min(containerWidth / canvasWidth, 1); // Don't scale up, only down
    calculatedHeight = canvasHeight * scale;
  } else {
    // Both width and height: fit within container
    const scaleX = containerWidth / canvasWidth;
    const scaleY = containerHeight / canvasHeight;
    scale = Math.min(scaleX, scaleY, 1); // Don't scale up, only down
    calculatedHeight = containerHeight;
  }

  canvas.style.transform = `scale(${scale})`;
  canvas.style.transformOrigin = "center center";
  canvas.style.display = "block";

  // Update container height if width-only
  if (containerHeight === undefined) {
    const parent = canvas.parentElement;
    if (parent) {
      parent.style.height = `${calculatedHeight}px`;
    }
  }

  return calculatedHeight;
}

export function Sketch({code, width, height}) {
  const sketchRef = useRef(null);
  const p5InstanceRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!sketchRef.current) return;
    sketchRef.current.innerHTML = "";
    setError(null);

    try {
      const parent = document.createElement("div");
      if (width !== undefined) {
        parent.style.width = `${width}px`;
        parent.style.overflow = "hidden";
        parent.style.display = "flex";
        parent.style.alignItems = "center";
        parent.style.justifyContent = "center";
        parent.style.position = "relative";
        if (height !== undefined) {
          parent.style.height = `${height}px`;
        }
      }
      sketchRef.current.appendChild(parent);

      p5InstanceRef.current = evalP5Code(parent, code);

      // Observe canvas creation and size changes
      const mutationObserver = new MutationObserver(() => {
        const canvas = parent.querySelector("canvas");
        if (canvas) {
          if (width !== undefined) {
            // Scale the canvas to fit within the container
            requestAnimationFrame(() => {
              scaleCanvas(canvas, width, height);
            });

            // Watch for canvas resize
            const resizeObserver = new ResizeObserver(() => {
              requestAnimationFrame(() => {
                scaleCanvas(canvas, width, height);
              });
            });
            resizeObserver.observe(canvas);

            // Store for cleanup
            parent._resizeObserver = resizeObserver;
          }
          mutationObserver.disconnect();
        }
      });
      mutationObserver.observe(parent, {childList: true, subtree: true});

      // Store for cleanup
      parent._mutationObserver = mutationObserver;
    } catch (err) {
      console.error("Error executing sketch code:", err);
      setError(err.message || "An error occurred");
    }

    return () => {
      if (p5InstanceRef.current) {
        p5InstanceRef.current.remove();
        p5InstanceRef.current = null;
      }
      // Cleanup observers
      const parent = sketchRef.current?.firstChild;
      if (parent) {
        parent._mutationObserver?.disconnect();
        parent._resizeObserver?.disconnect();
      }
    };
  }, [code, width, height]);

  return (
    <>
      <div ref={sketchRef}></div>
      {error && (
        <div
          style={{
            padding: "16px",
            margin: "16px",
            backgroundColor: "#fee",
            border: "1px solid #fcc",
            borderRadius: "4px",
            color: "#c00",
            fontFamily: "monospace",
            fontSize: "14px",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}
    </>
  );
}
