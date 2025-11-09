import {useEffect, useRef} from "react";
import p5 from "p5";

function evalP5Code(parent, code) {
  const sketch = new p5(eval(`(p) => { ${code}}`), parent);
  return sketch;
}

export function Sketch({code}) {
  const sketchRef = useRef(null);
  const p5InstanceRef = useRef(null);

  useEffect(() => {
    if (!sketchRef.current) return;
    sketchRef.current.innerHTML = "";
    const parent = document.createElement("div");
    sketchRef.current.appendChild(parent);
    p5InstanceRef.current = evalP5Code(parent, code);
    return () => {
      if (p5InstanceRef.current) {
        p5InstanceRef.current.remove();
        p5InstanceRef.current = null;
      }
    };
  }, [code]);

  return <div ref={sketchRef} />;
}
