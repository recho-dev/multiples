import "./App.css";
import {useState, useCallback, useRef, useEffect} from "react";
import {Sketch} from "./Sketch.jsx";
import {Multiples} from "./Multiples.jsx";
import {createEditor} from "./editor/index.js";
import {clsx} from "./clsx.js";

const initialCode = `let angle = Math.PI / 6;

p.setup = () => {
  p.createCanvas(200, 200);
  p.background(0);
  p.stroke(255);
  p.translate(p.width / 2, p.height);
  branch(60, 0);
};

function branch(len, rotate) {
  if (len < 10) return;
  p.push();
  p.rotate(rotate);
  p.line(0, -len, 0, 0);
  p.translate(0, -len);
  len *= 0.66;
  branch(len, -angle);
  branch(len, angle);
  p.pop();
}
`;

function App() {
  const [code, setCode] = useState(initialCode);
  const [params, setParams] = useState([]);
  const [showMultiples, setShowMultiples] = useState(false);
  const editorRef = useRef(null);
  const editorInstanceRef = useRef(null);

  const onSave = useCallback((code) => {
    setCode(code);
  }, []);

  const onSliderChange = useCallback((code) => {
    setCode(code);
  }, []);

  const onParamsChange = useCallback(({params, code, type}) => {
    setParams(params);
    setCode(code);
    if (type === "params-update") setShowMultiples(params.length > 0);
  }, []);

  const onSelect = useCallback(
    ({code, values}) => {
      if (!editorInstanceRef.current || params.length === 0) return;
      editorInstanceRef.current.update(params, values);
      setCode(code);
      setShowMultiples(false);
    },
    [params]
  );

  useEffect(() => {
    if (!editorRef.current) return;
    editorInstanceRef.current = createEditor(editorRef.current, {
      initialCode: code,
      onSave,
      onSliderChange,
      onParamsChange,
    });
    return () => {
      editorInstanceRef.current.destroy();
      editorInstanceRef.current = null;
    };
  }, []);

  const handleRun = useCallback(() => {
    if (editorInstanceRef.current) {
      const currentCode = editorInstanceRef.current.getCode();
      setCode(currentCode);
    }
  }, []);

  return (
    <div className="min-h-screen">
      <header className="h-[60px] flex items-center gap-3 px-4 py-4">
        <h1> Recho Multiples </h1>
        <button
          onClick={handleRun}
          className="w-10 h-10 bg-black hover:bg-gray-800 text-white rounded-full flex items-center justify-center transition-colors shadow-md p-2 cursor-pointer"
          title="Run"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      </header>
      <main className="flex h-[calc(100vh-60px)]">
        <div className="w-1/3 h-full mt-6">
          <div ref={editorRef} />
        </div>
        <div className="w-2/3 h-full overflow-auto">
          <div className="flex gap-2 mb-1">
            <span
              className={clsx("cursor-pointer", !showMultiples && "border-b-1")}
              onClick={() => setShowMultiples(false)}
            >
              Preview
            </span>
            {params.length >= 0 && (
              <span
                className={clsx("cursor-pointer", showMultiples && "border-b-1")}
                onClick={() => setShowMultiples(true)}
              >
                Multiples
              </span>
            )}
          </div>
          <div>
            {showMultiples ? <Multiples code={code} params={params} onSelect={onSelect} /> : <Sketch code={code} />}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
