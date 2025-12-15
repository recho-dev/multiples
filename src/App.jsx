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

const STORAGE_KEY = "recho-multiples-saved-versions";

function App() {
  const [code, setCode] = useState(initialCode);
  const [params, setParams] = useState([]);
  const [showMultiples, setShowMultiples] = useState(false);
  const [savedVersions, setSavedVersions] = useState([]);
  const [currentVersionTimestamp, setCurrentVersionTimestamp] = useState(null);
  const editorRef = useRef(null);
  const editorInstanceRef = useRef(null);

  // Load saved versions from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const versions = JSON.parse(saved);
        setSavedVersions(versions);
        // Set the latest version as current by default
        if (versions.length > 0) {
          setCurrentVersionTimestamp(versions[0].timestamp);
        }
      } catch (e) {
        console.error("Failed to load saved versions:", e);
      }
    }
  }, []);

  const onSave = useCallback((code) => {
    // Save doesn't automatically run the code - only play button or slider does
  }, []);

  const onSliderChange = useCallback((code) => {
    setCode(code);
  }, []);

  const onParamsChange = useCallback(({params, code, type}) => {
    setParams(params);
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

  const handleSave = useCallback(() => {
    if (editorInstanceRef.current) {
      const currentCode = editorInstanceRef.current.getCode();
      const newVersion = {
        code: currentCode,
        timestamp: new Date().toISOString(),
        time: new Date().toLocaleString(),
      };
      const updatedVersions = [newVersion, ...savedVersions];
      setSavedVersions(updatedVersions);
      setCurrentVersionTimestamp(newVersion.timestamp);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedVersions));
    }
  }, [savedVersions]);

  const handleLoadVersion = useCallback((version) => {
    if (editorInstanceRef.current) {
      editorInstanceRef.current.setCode(version.code);
      setCode(version.code);
      setCurrentVersionTimestamp(version.timestamp);
    }
  }, []);

  return (
    <div className="min-h-screen">
      <header className="h-[60px] flex items-center gap-3 px-4 py-4">
        <h1> Recho Multiples </h1>
        <button
          onClick={handleRun}
          className="w-10 h-10 bg-black hover:bg-gray-800 text-white rounded-full flex items-center justify-center transition-colors p-2 cursor-pointer"
          title="Run"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
        <button
          onClick={handleSave}
          className="w-10 h-10 bg-black hover:bg-gray-800 text-white rounded-full flex items-center justify-center transition-colors p-2 cursor-pointer"
          title="Save"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
        </button>
      </header>
      <main className="flex h-[calc(100vh-60px)]">
        <div className="w-48 border-r border-gray-200 overflow-y-auto p-4">
          <h2 className="text-sm font-semibold mb-3 text-gray-700">History</h2>
          {savedVersions.length === 0 ? (
            <p className="text-xs text-gray-500">No saved versions yet</p>
          ) : (
            <div className="space-y-2">
              {savedVersions.map((version, index) => {
                const isCurrent = currentVersionTimestamp === version.timestamp;
                return (
                  <div
                    key={version.timestamp}
                    onClick={() => handleLoadVersion(version)}
                    className={clsx(
                      "text-xs p-2 rounded cursor-pointer transition-colors border",
                      isCurrent
                        ? "bg-blue-50 border-blue-300 text-blue-900"
                        : "border-transparent hover:border-gray-300 hover:bg-gray-100"
                    )}
                    title={version.code.substring(0, 50) + "..."}
                  >
                    <div className={clsx("font-medium", isCurrent ? "text-blue-900" : "text-gray-700")}>
                      {version.time}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
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
