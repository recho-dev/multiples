import {useEffect, useRef, useState} from "react";
import {P5Renderer} from "./P5Renderer.jsx";
import {WebGL2Renderer} from "./WebGL2Renderer.jsx";
import {prepareFragmentShader, defaultVertexShader} from "../utils/shaderUtils.js";

// Shared WebGL context manager for thumbnails
class WebGLThumbnailRenderer {
  constructor() {
    this.canvas = null;
    this.gl = null;
    this.queue = [];
    this.processing = false;
  }

  async renderThumbnail(code, width, height, callback) {
    return new Promise((resolve) => {
      this.queue.push({code, width, height, callback, resolve});
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      await this.renderItem(item);
    }

    this.processing = false;
  }

  async renderItem({code, width, height, callback, resolve}) {
    try {
      // Use 1:1 aspect ratio - always square, use width if provided, otherwise height, otherwise default
      const targetSize = width || height || 200;

      // Create or reuse canvas
      if (!this.canvas) {
        this.canvas = document.createElement("canvas");
        this.canvas.width = targetSize;
        this.canvas.height = targetSize;
        this.gl = this.canvas.getContext("webgl2");
        if (!this.gl) {
          throw new Error("WebGL2 not supported");
        }
      } else {
        // Resize if needed - always keep 1:1
        if (this.canvas.width !== targetSize || this.canvas.height !== targetSize) {
          this.canvas.width = targetSize;
          this.canvas.height = targetSize;
        }
      }

      const gl = this.gl;

      // Ensure viewport matches canvas size exactly (1:1)
      const canvasSize = this.canvas.width;

      // Prepare fragment shader (inject noise code if needed)
      const finalFragmentShader = prepareFragmentShader(code);

      // Create shader program
      function createShader(type, src) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, src);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          throw new Error("Shader compilation failed: " + gl.getShaderInfoLog(shader));
        }
        return shader;
      }

      const vs = createShader(gl.VERTEX_SHADER, defaultVertexShader);
      const fs = createShader(gl.FRAGMENT_SHADER, finalFragmentShader);

      const program = gl.createProgram();
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error("Shader linking failed: " + gl.getProgramInfoLog(program));
      }

      gl.useProgram(program);

      // Setup vertex buffer
      const vertexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, 1, 0, 1, 1, 0, -1, -1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0]),
        gl.STATIC_DRAW
      );

      const aPos = gl.getAttribLocation(program, "aPos");
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);

      // Set viewport and clear - use exact canvas size (1:1)
      gl.viewport(0, 0, canvasSize, canvasSize);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      // Set time uniform (use 0 for static thumbnail)
      const timeLoc = gl.getUniformLocation(program, "uTime");
      if (timeLoc !== null) {
        gl.uniform1f(timeLoc, 0);
      }

      // Draw
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      // Convert to image
      const dataURL = this.canvas.toDataURL("image/png");
      callback(dataURL);

      // Cleanup
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(vertexBuffer);

      resolve();
    } catch (err) {
      console.error("Error rendering WebGL thumbnail:", err);
      callback(null);
      resolve();
    }
  }
}

// Singleton instance
const webglThumbnailRenderer = new WebGLThumbnailRenderer();

export function Thumbnail({code, width, height, sketchType = "p5"}) {
  const [thumbnailUrl, setThumbnailUrl] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const containerRef = useRef(null);
  const sketchRef = useRef(null);
  const previousCodeRef = useRef(null);

  const isWebGLCode = code?.trim().startsWith("#version");
  const isWebGL = sketchType === "webgl2" || isWebGLCode;

  useEffect(() => {
    // Only update if code changed
    if (code === previousCodeRef.current) {
      return;
    }
    previousCodeRef.current = code;

    // Reset thumbnail when code changes
    setThumbnailUrl(null);
    setIsCapturing(true);

    if (isWebGL) {
      // For WebGL, use shared renderer
      webglThumbnailRenderer
        .renderThumbnail(code, width, height, (dataURL) => {
          if (dataURL) {
            setThumbnailUrl(dataURL);
          }
          setIsCapturing(false);
        })
        .catch((err) => {
          console.error("Error capturing WebGL thumbnail:", err);
          setIsCapturing(false);
        });
    } else {
      // For p5, render first then capture
      // The capture will happen after p5 renders
    }
  }, [code, width, height, isWebGL]);

  // Capture p5 canvas after it renders
  useEffect(() => {
    if (!isWebGL && containerRef.current && isCapturing) {
      let attempts = 0;
      const maxAttempts = 50; // Try for up to 5 seconds (50 * 100ms)

      const captureP5Canvas = () => {
        const canvas = containerRef.current?.querySelector("canvas");
        if (canvas && canvas.width > 0 && canvas.height > 0) {
          try {
            // Wait a bit for p5 to finish rendering
            setTimeout(() => {
              const dataURL = canvas.toDataURL("image/png");
              if (dataURL && dataURL !== "data:,") {
                setThumbnailUrl(dataURL);
                setIsCapturing(false);
              } else if (attempts < maxAttempts) {
                attempts++;
                setTimeout(captureP5Canvas, 100);
              } else {
                setIsCapturing(false);
              }
            }, 100);
          } catch (err) {
            console.error("Error capturing p5 thumbnail:", err);
            setIsCapturing(false);
          }
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(captureP5Canvas, 100);
        } else {
          setIsCapturing(false);
        }
      };

      // Start capturing after a short delay to ensure rendering is complete
      const timeoutId = setTimeout(captureP5Canvas, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [isWebGL, isCapturing]);

  // Show thumbnail if available, otherwise show sketch
  if (thumbnailUrl && !isCapturing) {
    return (
      <div
        style={{
          width: width !== undefined ? `${width}px` : "100%",
          height: height !== undefined ? `${height}px` : "auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <img
          src={thumbnailUrl}
          alt="Thumbnail"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
        />
      </div>
    );
  }

  // Render sketch while capturing
  return (
    <div
      ref={containerRef}
      style={{
        width: width !== undefined ? `${width}px` : "100%",
        height: height !== undefined ? `${height}px` : "auto",
      }}
    >
      {isWebGL ? (
        <WebGL2Renderer code={code} width={width} height={height} />
      ) : (
        <P5Renderer code={code} width={width} height={height} />
      )}
    </div>
  );
}
