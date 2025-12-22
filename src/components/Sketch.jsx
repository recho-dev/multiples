import {P5Renderer} from "./P5Renderer.jsx";
import {WebGL2Renderer} from "./WebGL2Renderer.jsx";

export function Sketch({code, width, height, sketchType = "p5"}) {
  // Safeguard: If code starts with #version, it's definitely a WebGL shader
  // This prevents WebGL code from being executed in P5Renderer
  const isWebGLCode = code?.trim().startsWith("#version");
  
  if (sketchType === "webgl2" || isWebGLCode) {
    return <WebGL2Renderer code={code} width={width} height={height} />;
  }

  // Default to p5 mode
  return <P5Renderer code={code} width={width} height={height} />;
}
