import {useEffect, useRef} from "react";

const noiseShader = `
vec3  _s(vec3 i) { return cos(5.*(i+5.*cos(5.*(i.yzx+5.*cos(5.*(i.zxy+5.*cos(5.*i))))))); }
float _t(vec3 i, vec3 u, vec3 a) { return dot(normalize(_s(i + a)), u - a); }
float noise(vec3 p) {
   vec3 i = floor(p), u = p - i, v = 2.*mix(u*u, u*(2.-u)-.5, step(.5,u));
   return mix(mix(mix(_t(i, u, vec3(0.,0.,0.)), _t(i, u, vec3(1.,0.,0.)), v.x),
                  mix(_t(i, u, vec3(0.,1.,0.)), _t(i, u, vec3(1.,1.,0.)), v.x), v.y),
              mix(mix(_t(i, u, vec3(0.,0.,1.)), _t(i, u, vec3(1.,0.,1.)), v.x),
                  mix(_t(i, u, vec3(0.,1.,1.)), _t(i, u, vec3(1.,1.,1.)), v.x), v.y), v.z);
}`;

const defaultVertexShader = `#version 300 es
in  vec3 aPos;
out vec3 vPos;
void main() {
   gl_Position = vec4(aPos, 1.);
   vPos = aPos;
}`;

function setUniform(gl, type, name, a, b, c) {
  gl["uniform" + type](gl.getUniformLocation(gl.program, name), a, b, c);
}

function glStart(canvas, vertexShader, fragmentShader) {
  if (!canvas.width) canvas.width = 640;
  if (!canvas.height) canvas.height = 640;
  const gl = canvas.getContext("webgl2");
  if (!gl) {
    throw new Error("WebGL2 not supported");
  }

  // Set viewport to match canvas dimensions
  gl.viewport(0, 0, canvas.width, canvas.height);

  canvas.setShaders = function (vertexShader, fragmentShader) {
    gl.program = gl.createProgram();
    function addshader(type, src) {
      let shader = gl.createShader(type);
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.log("Cannot compile shader:", gl.getShaderInfoLog(shader));
        throw new Error("Shader compilation failed: " + gl.getShaderInfoLog(shader));
      }
      gl.attachShader(gl.program, shader);
    }
    addshader(gl.VERTEX_SHADER, vertexShader);
    addshader(gl.FRAGMENT_SHADER, fragmentShader);
    gl.linkProgram(gl.program);
    if (!gl.getProgramParameter(gl.program, gl.LINK_STATUS)) {
      console.log("Could not link the shader program!");
      throw new Error("Shader linking failed");
    }
    gl.useProgram(gl.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, 1, 0, 1, 1, 0, -1, -1, 0, 1, -1, 0, -1, -1, 0, 1, 1, 0]),
      gl.STATIC_DRAW
    );
    let aPos = gl.getAttribLocation(gl.program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
  };

  // Combine noise shader with fragment shader if it contains noise function
  let finalFragmentShader = fragmentShader;
  if (fragmentShader.includes("noise(") && !fragmentShader.includes("vec3  _s")) {
    // Insert noise shader before main()
    const mainIndex = finalFragmentShader.indexOf("void main()");
    if (mainIndex !== -1) {
      finalFragmentShader =
        finalFragmentShader.slice(0, mainIndex) + noiseShader + "\n" + finalFragmentShader.slice(mainIndex);
    }
  }

  canvas.setShaders(vertexShader.trim(), finalFragmentShader.trim());

  let startTime = Date.now() / 1000;
  let animationFrameId;

  const update = () => {
    // Update viewport if canvas size changed
    if (gl.canvas.width !== canvas.width || gl.canvas.height !== canvas.height) {
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    let time = Date.now() / 1000 - startTime;
    setUniform(gl, "1f", "uTime", time);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    animationFrameId = requestAnimationFrame(update);
  };

  update();

  canvas.gl = gl;
  canvas.stop = () => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
  };

  return canvas;
}

export function WebGL2Renderer({code, width, height}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const glInstanceRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !code) return;

    // Clear previous content
    containerRef.current.innerHTML = "";
    const canvas = document.createElement("canvas");
    if (width !== undefined) {
      canvas.width = width;
    }
    if (height !== undefined) {
      canvas.height = height;
    }
    if (width === undefined && height === undefined) {
      canvas.width = 640;
      canvas.height = 640;
    }
    containerRef.current.appendChild(canvas);
    canvasRef.current = canvas;

    try {
      // Extract fragment shader from code (assuming it's just the fragment shader code)
      const fragmentShader = code.trim();

      // Start WebGL2 rendering
      glInstanceRef.current = glStart(canvas, defaultVertexShader, fragmentShader);

      // Scale canvas to fit container if dimensions are specified
      if (width !== undefined || height !== undefined) {
        const scaleCanvas = () => {
          if (!canvas || !containerRef.current) return;
          const containerWidth = containerRef.current.clientWidth;
          const containerHeight = containerRef.current.clientHeight || height;

          const canvasWidth = canvas.width;
          const canvasHeight = canvas.height;

          if (!canvasWidth || !canvasHeight) return;

          let scale;
          if (height === undefined) {
            // Width-only: preserve aspect ratio
            scale = Math.min(containerWidth / canvasWidth, 1);
          } else {
            // Both width and height: fit within container
            const scaleX = containerWidth / canvasWidth;
            const scaleY = containerHeight / canvasHeight;
            scale = Math.min(scaleX, scaleY, 1);
          }

          canvas.style.transform = `scale(${scale})`;
          canvas.style.transformOrigin = "top left";
          canvas.style.display = "block";
        };

        requestAnimationFrame(scaleCanvas);
        const resizeObserver = new ResizeObserver(() => {
          requestAnimationFrame(scaleCanvas);
        });
        resizeObserver.observe(containerRef.current);

        return () => {
          resizeObserver.disconnect();
          if (glInstanceRef.current && glInstanceRef.current.stop) {
            glInstanceRef.current.stop();
          }
        };
      }
    } catch (err) {
      console.error("Error executing WebGL2 shader:", err);
      if (containerRef.current) {
        containerRef.current.innerHTML = `
          <div style="padding: 16px; margin: 16px; background-color: #fee; border: 1px solid #fcc; border-radius: 4px; color: #c00; font-family: monospace; font-size: 14px; white-space: pre-wrap; word-break: break-word;">
            <strong>Error:</strong> ${err.message || "An error occurred"}
          </div>
        `;
      }
    }

    return () => {
      if (glInstanceRef.current && glInstanceRef.current.stop) {
        glInstanceRef.current.stop();
      }
      glInstanceRef.current = null;
    };
  }, [code, width, height]);

  return (
    <div
      ref={containerRef}
      style={{
        width: width !== undefined ? `${width}px` : "100%",
        height: height !== undefined ? `${height}px` : "auto",
        overflow: "hidden",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "flex-start",
        position: "relative",
      }}
    ></div>
  );
}
