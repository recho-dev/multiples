import "./App.css";
import {useState, useCallback, useRef, useEffect} from "react";
import {Sketch} from "./Sketch.jsx";
import {Multiples} from "./Multiples.jsx";
import {createEditor} from "./createEditor.js";

const initialCode = `let angle = Math.PI / 6;

p.setup = () => {
  p.createCanvas(200, 200);
  p.background(0);
  p.stroke(255);
  p.translate(p.width / 2, p.height);
  branch(70, 0);
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
  const editorRef = useRef(null);

  const onSave = useCallback((code) => {
    setCode(code);
  }, []);

  const onSliderChange = useCallback((code) => {
    setCode(code);
  }, []);

  const onParamsChange = useCallback(({params, code}) => {
    setParams(params);
    setCode(code);
  }, []);

  useEffect(() => {
    if (!editorRef.current) return;
    const {destroy} = createEditor(editorRef.current, {
      initialCode: code,
      onSave,
      onSliderChange,
      onParamsChange,
    });
    return () => {
      destroy();
    };
  }, []);

  return (
    <div className="min-h-screen">
      <header className="h-[64px]">
        <h1> Recho Multiples </h1>
      </header>
      <main className="flex h-[calc(100vh-64px)]">
        <div className="w-1/3 h-full">
          <div ref={editorRef} />
        </div>
        <div className="w-2/3 h-full overflow-auto">
          <div>
            <Sketch code={code} />
          </div>
          {params.length > 0 && (
            <div>
              <Multiples code={code} params={params} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
