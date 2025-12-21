import {P5Renderer} from "./P5Renderer.jsx";
import {WebGL2Renderer} from "./WebGL2Renderer.jsx";

export function Sketch({code, width, height, sketchType = "p5"}) {
  if (sketchType === "webgl2") {
    return <WebGL2Renderer code={code} width={width} height={height} />;
  }

  // Default to p5 mode
  return <P5Renderer code={code} width={width} height={height} />;
}
