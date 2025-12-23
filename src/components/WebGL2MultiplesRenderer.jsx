import {useEffect, useRef} from "react";
import {prepareFragmentShader, defaultVertexShader} from "../utils/shaderUtils.js";

function createShaderProgram(gl, vertexShader, fragmentShader) {
  const program = gl.createProgram();

  function addShader(type, src) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader compilation failed: ${info}`);
    }
    gl.attachShader(program, shader);
    return shader;
  }

  const vs = addShader(gl.VERTEX_SHADER, vertexShader);
  const fs = addShader(gl.FRAGMENT_SHADER, fragmentShader);

  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    throw new Error(`Shader linking failed: ${info}`);
  }

  gl.deleteShader(vs);
  gl.deleteShader(fs);

  return program;
}


// Gap between cells (matching gap-6 from Tailwind = 24px)
const GAP = 24;

export function WebGL2MultiplesRenderer({multiples, cellSize, columnCount, showLabels = true, onSelect}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const glRef = useRef(null);
  const programsRef = useRef([]);
  const animationFrameIdRef = useRef(null);
  const startTimeRef = useRef(Date.now() / 1000);

  useEffect(() => {
    if (!containerRef.current || !multiples || multiples.length === 0) return;

    // Clear previous content
    containerRef.current.innerHTML = "";

    const rows = Math.ceil(multiples.length / columnCount);
    // Calculate canvas size accounting for gaps (only if showLabels is true)
    const gap = showLabels ? GAP : 0;
    const canvasWidth = columnCount * cellSize + (columnCount - 1) * gap;
    const canvasHeight = rows * cellSize + (rows - 1) * gap;

    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    canvas.style.display = "block";
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;
    canvas.style.backgroundColor = "#fff"; // White background for gaps
    containerRef.current.appendChild(canvas);
    canvasRef.current = canvas;

    // Create label elements with absolute positioning (only if showLabels is true)
    if (showLabels) {
      const labelsContainer = document.createElement("div");
      labelsContainer.style.position = "absolute";
      labelsContainer.style.top = "0";
      labelsContainer.style.left = "0";
      labelsContainer.style.width = "100%";
      labelsContainer.style.height = "100%";
      labelsContainer.style.pointerEvents = "none";
      containerRef.current.appendChild(labelsContainer);

      // Create label for each cell (positioned in the gap below each cell)
      multiples.forEach((multiple, i) => {
        const row = Math.floor(i / columnCount);
        const col = i % columnCount;

        // Calculate cell position accounting for gaps
        const cellX = col * (cellSize + gap);
        const cellY = row * (cellSize + gap);

        const label = document.createElement("div");
        label.className = "text-xs whitespace-nowrap";
        label.style.position = "absolute";
        label.style.left = `${cellX}px`;
        label.style.top = `${cellY + cellSize}px`;
        label.style.width = `${cellSize}px`;
        label.style.pointerEvents = "none";
        label.textContent = `${multiple.values.map((v, idx) => `X${idx}=${v}`).join(", ")}`;
        labelsContainer.appendChild(label);
      });
    }

    // Create single WebGL context
    const gl = canvas.getContext("webgl2");
    if (!gl) {
      containerRef.current.innerHTML = `
        <div style="padding: 16px; margin: 16px; background-color: #fee; border: 1px solid #fcc; border-radius: 4px; color: #c00; font-family: monospace; font-size: 14px;">
          <strong>Error:</strong> WebGL2 not supported
        </div>
      `;
      return;
    }

    glRef.current = gl;

    // Create vertex buffer (shared by all shaders)
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, 1, 0, 1, 1, 0, -1, -1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0]),
      gl.STATIC_DRAW
    );

    // Compile all shader programs
    const programs = [];
    try {
      for (const multiple of multiples) {
        const fragmentShader = prepareFragmentShader(multiple.code);
        const program = createShaderProgram(gl, defaultVertexShader, fragmentShader);
        programs.push(program);
      }
      programsRef.current = programs;
    } catch (err) {
      console.error("Error compiling shaders:", err);
      containerRef.current.innerHTML = `
        <div style="padding: 16px; margin: 16px; background-color: #fee; border: 1px solid #fcc; border-radius: 4px; color: #c00; font-family: monospace; font-size: 14px; white-space: pre-wrap; word-break: break-word;">
          <strong>Error:</strong> ${err.message || "An error occurred"}
        </div>
      `;
      return;
    }

    // Setup vertex attributes for all programs
    programs.forEach((program) => {
      gl.useProgram(program);
      const aPos = gl.getAttribLocation(program, "aPos");
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
    });

    // Render function
    const render = () => {
      if (!glRef.current || !canvasRef.current) return;

      const gl = glRef.current;
      const time = Date.now() / 1000 - startTimeRef.current;

      // Clear the entire canvas with white background (for gaps) or black (no gaps)
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(showLabels ? 1 : 0, showLabels ? 1 : 0, showLabels ? 1 : 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      // Render each shader to its grid cell
      for (let i = 0; i < multiples.length; i++) {
        const row = Math.floor(i / columnCount);
        const col = i % columnCount;

        // Calculate cell position accounting for gaps
        const x = col * (cellSize + gap);
        const y = row * (cellSize + gap);

        // Set viewport for this cell
        gl.viewport(x, canvas.height - y - cellSize, cellSize, cellSize);

        // Use the corresponding shader program
        const program = programsRef.current[i];
        if (!program) continue;

        gl.useProgram(program);

        // Set time uniform
        const timeLoc = gl.getUniformLocation(program, "uTime");
        if (timeLoc !== null) {
          gl.uniform1f(timeLoc, time);
        }

        // Rebind vertex buffer and attributes
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        const aPos = gl.getAttribLocation(program, "aPos");
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);

        // Draw
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }

      animationFrameIdRef.current = requestAnimationFrame(render);
    };

    // Handle click events
    const handleClick = (e) => {
      if (!canvasRef.current || !onSelect) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Calculate which cell was clicked, accounting for gaps
      const col = Math.floor(x / (cellSize + gap));
      const row = Math.floor(y / (cellSize + gap));

      // Check if click is within the actual cell (not in the gap)
      const cellX = col * (cellSize + gap);
      const cellY = row * (cellSize + gap);
      const localX = x - cellX;
      const localY = y - cellY;

      // Only select if click is within cell bounds
      if (localX >= 0 && localX < cellSize && localY >= 0 && localY < cellSize) {
        const index = row * columnCount + col;
        if (index >= 0 && index < multiples.length) {
          onSelect(multiples[index]);
        }
      }
    };

    if (onSelect) {
      canvas.addEventListener("click", handleClick);
      canvas.style.cursor = "pointer";
    } else {
      canvas.style.cursor = "default";
    }

    // Start rendering
    startTimeRef.current = Date.now() / 1000;
    render();

    // Cleanup
    return () => {
      canvas.removeEventListener("click", handleClick);
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      // Clean up programs
      programsRef.current.forEach((program) => {
        if (glRef.current) {
          glRef.current.deleteProgram(program);
        }
      });
      programsRef.current = [];
      glRef.current = null;
    };
  }, [multiples, cellSize, columnCount, showLabels, onSelect]);

  const rows = multiples && multiples.length > 0 ? Math.ceil(multiples.length / columnCount) : 0;
  // Calculate total width/height accounting for gaps (only if showLabels is true)
  const gap = showLabels ? GAP : 0;
  const totalWidth = columnCount * cellSize + (columnCount > 0 ? (columnCount - 1) * gap : 0);
  // Add extra height for labels in the gap below the last row (only if showLabels is true)
  const labelHeight = showLabels ? 20 : 0;
  const totalHeight = rows * cellSize + (rows > 0 ? (rows - 1) * gap + labelHeight : 0);

  return (
    <div
      ref={containerRef}
      style={{
        width: `${totalWidth}px`,
        height: `${totalHeight}px`,
        overflow: "visible",
        display: "block",
        position: "relative",
      }}
    ></div>
  );
}
