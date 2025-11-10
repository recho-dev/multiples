import "./App.css";
import {useState, useCallback} from "react";
import {Editor} from "./Editor.jsx";
import {Sketch} from "./Sketch.jsx";
import {Multiples} from "./Multiples.jsx";

const initialCode = `p.setup = () => {
  p.createCanvas(200, 200);
  p.background(0);
  p.circle(100, 100, 50);
};`;

function App() {
  const [code, setCode] = useState(initialCode);
  const [params, setParams] = useState([]);

  const onSave = useCallback((code) => {
    setCode(code);
  }, []);

  const onSliderChange = useCallback((code) => {
    setCode(code);
  }, []);

  return (
    <div className="min-h-screen">
      <header className="h-[64px]">
        <h1> Recho Multiples </h1>
      </header>
      <main className="flex h-[calc(100vh-64px)]">
        <div className="w-1/3 h-full">
          <Editor code={code} onSave={onSave} onSliderChange={onSliderChange} onParamsChange={setParams} />
        </div>
        <div className="w-2/3 h-full overflow-auto">
          <div>
            <h2 className="text-lg font-bold mb-2">Main Output</h2>
            <Sketch code={code} />
          </div>
          {params.length > 0 && (
            <div>
              <h2 className="text-lg font-bold mb-2">Multiples</h2>
              <Multiples code={code} params={params} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
