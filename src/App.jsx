import "./App.css";
import {useState} from "react";
import {Editor} from "./Editor.jsx";
import {Sketch} from "./Sketch.jsx";
import {Multiples} from "./Multiples.jsx";

const initialCode = `function setup() {
  createCanvas(200, 200);
  background(0);
  circle(100, 100, 50);
}`;

function App() {
  const [code, setCode] = useState(initialCode);
  return (
    <div className="min-h-screen">
      <header className="h-[64px]">
        <h1> Recho Mutiples </h1>
      </header>
      <main className="flex h-[calc(100vh-64px)]">
        <div className="w-1/2 h-full">
          <div className="h-1/2">
            <Editor code={code} setCode={setCode} />
          </div>
          <div className="h-1/2">
            <Sketch code={code} />
          </div>
        </div>
        <div className="w-1/2 h-full">
          <Multiples code={code} />
        </div>
      </main>
    </div>
  );
}

export default App;
