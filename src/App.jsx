import "./App.css";
import {useState, useCallback, useRef, useEffect} from "react";
import Split from "react-split";
import {Sketch} from "./Sketch.jsx";
import {Multiples} from "./Multiples.jsx";
import {createEditor} from "./editor/index.js";
import {clsx} from "./clsx.js";
import confetti from "canvas-confetti";

const initialCode = `p.setup = () => {
  p.createCanvas(200, 200);
  p.background(0, 0, 0);
  p.translate(p.width / 2, p.height);
  branch(60, 1, 0);
};

function branch(len, strokeWeight, rotate) {
  if (len < 10) {
    p.fill(255, 255, 255);
    p.circle(0, 0, 5);
    return;
  }
  p.push();
  p.rotate(rotate);
  p.stroke(255, 255, 255);
  p.strokeWeight(strokeWeight);
  p.line(0, -len, 0, 0);
  p.translate(0, -len);
  len = len * safe(0.66);
  strokeWeight = strokeWeight * safe(0.66);
  branch(len, strokeWeight, -Math.PI / 6);
  branch(len, strokeWeight, Math.PI / 6);
  p.pop();
}

function safe(value) {
  return p.constrain(value, 0.3, 0.9);
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
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
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
    setShowSaveModal(true);
    setSaveName("");
  }, []);

  const handleSaveSubmit = useCallback(() => {
    if (editorInstanceRef.current) {
      const currentCode = editorInstanceRef.current.getCode();
      const newVersion = {
        id: uid(),
        parentId: currentVersionId, // Track which version this was derived from
        code: currentCode,
        timestamp: new Date().toISOString(),
        time: new Date().toLocaleString(),
        name: saveName.trim() || null,
      };
      const updatedVersions = [newVersion, ...savedVersions];
      setSavedVersions(updatedVersions);
      setCurrentVersionId(newVersion.id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedVersions));
      setShowSaveModal(false);
      setSaveName("");
      
      // Trigger confetti animation
      confetti({
        particleCount: 100,
        spread: 70,
        origin: {y: 0.6},
      });
    }
  }, [savedVersions, currentVersionId, saveName]);

  const handleCloseModal = useCallback(() => {
    setShowSaveModal(false);
    setSaveName("");
  }, []);

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

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
    };
  }, []);

  const handleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error("Error toggling fullscreen:", err);
    }
  }, []);

  return (
    <div className="min-h-screen">
      <header className="h-[80px] flex flex-col justify-center gap-1 px-4 py-4 border-b border-gray-200 bg-black relative">
        {!isFullscreen && (
          <button
            onClick={handleFullscreen}
            className="absolute top-2 right-4 p-2 text-white hover:bg-gray-800 rounded transition-colors"
            title="Enter fullscreen"
            aria-label="Enter fullscreen"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          </button>
        )}
        <h1 className="font-mono text-lg text-white">
          Let's draw a tree together with <strong>Recho Multiples</strong>!
        </h1>
        <h1 className="font-mono text-base text-white">
          You can <strong>code</strong>, <strong>drag sliders</strong>, <strong>sweep parameters</strong> and{" "}
          <strong>browse the history</strong> to see the evolution of the tree!
        </h1>
      </header>
      <main className="h-[calc(100vh-80px)]">
        <Split
          className="split"
          sizes={splitSizes}
          minSize={[150, 300, 400]}
          gutterSize={8}
          onDragEnd={handleSplitChange}
          direction="horizontal"
          snapOffset={0}
        >
          <div className="h-full flex flex-col overflow-hidden">
            <div className="px-4 py-2 border-b border-gray-200 flex-shrink-0">
              <span>History</span>
            </div>
            <div ref={sidebarRef} className="flex-1 overflow-y-auto px-4 py-2">
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
                          {version.name && (
                            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-xs px-2 py-1">
                              {version.name}
                            </div>
                          )}
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
          </div>
          <div className="h-full flex flex-col">
            <div className="flex items-center gap-2 p-2 border-b border-dashed border-gray-200">
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
            </div>
            <div ref={editorRef} className="flex-1" />
          </div>
          <div className="h-full overflow-auto ml-4 mt-2">
            <div className="flex gap-2 mb-2">
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
      {showSaveModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{backgroundColor: "rgba(0, 0, 0, 0.8)"}}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 relative">
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
              title="Close"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <h2 className="text-lg font-semibold mb-4">Save Version</h2>
            <div className="mb-4">
              <label htmlFor="save-name" className="block text-sm font-medium text-gray-700 mb-2">
                Your Name (optional)
              </label>
              <input
                id="save-name"
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="Enter your name"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSaveSubmit();
                  } else if (e.key === "Escape") {
                    handleCloseModal();
                  }
                }}
              />
            </div>
            <button
              onClick={handleSaveSubmit}
              className="w-full bg-black text-white py-2 px-4 rounded-md hover:bg-gray-800 transition-colors"
            >
              {saveName.trim() ? "Submit With Name" : "Submit Without Name"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
