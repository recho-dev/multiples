import "./App.css";
import {useState, useCallback, useRef, useEffect} from "react";
import Split from "react-split";
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
const SPLIT_SIZES_KEY = "recho-multiples-split-sizes";

function uid() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function App() {
  const [code, setCode] = useState(initialCode);
  const [params, setParams] = useState([]);
  const [showMultiples, setShowMultiples] = useState(false);
  const [savedVersions, setSavedVersions] = useState([]);
  const [currentVersionId, setCurrentVersionId] = useState(null);
  const [sidebarWidth, setSidebarWidth] = useState(176);
  const [splitSizes, setSplitSizes] = useState([15, 35, 50]); // [history, editor, preview]
  const sidebarRef = useRef(null);
  const editorRef = useRef(null);
  const editorInstanceRef = useRef(null);

  // Load saved versions and split sizes from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const versions = JSON.parse(saved);
        setSavedVersions(versions);
        // Set the latest version as current by default
        if (versions.length > 0) {
          setCurrentVersionId(versions[0].id);
        }
      } catch (e) {
        console.error("Failed to load saved versions:", e);
      }
    }

    // Load split sizes
    const savedSizes = localStorage.getItem(SPLIT_SIZES_KEY);
    if (savedSizes) {
      try {
        const sizes = JSON.parse(savedSizes);
        if (Array.isArray(sizes) && sizes.length === 3) {
          setSplitSizes(sizes);
        }
      } catch (e) {
        console.error("Failed to load split sizes:", e);
      }
    }
  }, []);

  // Measure sidebar width
  useEffect(() => {
    if (!sidebarRef.current) return;

    const updateWidth = () => {
      if (sidebarRef.current) {
        const width = sidebarRef.current.clientWidth - 32; // Subtract padding (p-4 = 16px * 2)
        setSidebarWidth(width);
      }
    };

    updateWidth();

    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(sidebarRef.current);

    return () => {
      resizeObserver.disconnect();
    };
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
        id: uid(),
        parentId: currentVersionId, // Track which version this was derived from
        code: currentCode,
        timestamp: new Date().toISOString(),
        time: new Date().toLocaleString(),
      };
      const updatedVersions = [newVersion, ...savedVersions];
      setSavedVersions(updatedVersions);
      setCurrentVersionId(newVersion.id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedVersions));
    }
  }, [savedVersions, currentVersionId]);

  const handleLoadVersion = useCallback((version) => {
    if (editorInstanceRef.current) {
      editorInstanceRef.current.setCode(version.code);
      setCode(version.code);
      setCurrentVersionId(version.id);
    }
  }, []);

  const handleDeleteVersion = useCallback(
    (versionId, e) => {
      e.stopPropagation(); // Prevent triggering the load version action
      if (window.confirm("Are you sure you want to delete this version?")) {
        const updatedVersions = savedVersions.filter((v) => v.id !== versionId);
        setSavedVersions(updatedVersions);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedVersions));
        // If we deleted the current version, set currentVersionId to the first available version or null
        if (currentVersionId === versionId) {
          if (updatedVersions.length > 0) {
            setCurrentVersionId(updatedVersions[0].id);
            // Optionally load the first version's code
            if (editorInstanceRef.current) {
              editorInstanceRef.current.setCode(updatedVersions[0].code);
              setCode(updatedVersions[0].code);
            }
          } else {
            setCurrentVersionId(null);
          }
        }
      }
    },
    [savedVersions, currentVersionId]
  );

  const handleSplitChange = useCallback((sizes) => {
    setSplitSizes(sizes);
    localStorage.setItem(SPLIT_SIZES_KEY, JSON.stringify(sizes));
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
      <main className="h-[calc(100vh-60px)]">
        <Split
          className="split"
          sizes={splitSizes}
          minSize={[150, 300, 400]}
          gutterSize={8}
          onDragEnd={handleSplitChange}
          direction="horizontal"
          snapOffset={0}
        >
          <div ref={sidebarRef} className="overflow-y-auto p-4">
            <h2 className="text-sm font-semibold mb-3 text-gray-700">History</h2>
            {savedVersions.length === 0 ? (
              <p className="text-xs text-gray-500">No saved versions yet</p>
            ) : (
              <div className="space-y-3">
                {savedVersions.map((version, index) => {
                  const isCurrent = currentVersionId === version.id;
                  return (
                    <div
                      key={version.id}
                      className={clsx(
                        "rounded cursor-pointer transition-colors border overflow-hidden group relative",
                        isCurrent
                          ? "bg-blue-50 border-blue-300"
                          : "border-transparent hover:border-gray-300 hover:bg-gray-50"
                      )}
                      title={version.code.substring(0, 50) + "..."}
                    >
                      <div onClick={() => handleLoadVersion(version)} className="w-full relative">
                        <Sketch code={version.code} width={sidebarWidth} />
                      </div>
                      <button
                        onClick={(e) => handleDeleteVersion(version.id, e)}
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1.5 bg-white hover:bg-red-100 rounded shadow-sm transition-opacity"
                        title="Delete version"
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="h-full mt-6">
            <div ref={editorRef} className="h-full" />
          </div>
          <div className="h-full overflow-auto">
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
        </Split>
      </main>
    </div>
  );
}

export default App;
