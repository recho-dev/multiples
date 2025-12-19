import "./App.css";
import {useState, useCallback, useRef, useEffect} from "react";
import Split from "react-split";
import {Sketch} from "./Sketch.jsx";
import {Multiples} from "./Multiples.jsx";
import {createEditor} from "./editor/index.js";
import {clsx} from "./clsx.js";
import confetti from "canvas-confetti";
import {loadVersions, saveVersion, deleteVersion, getMetadata, setMetadata} from "./storage.js";

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

  // Load saved versions and split sizes from IndexedDB on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load versions from IndexedDB
        const versions = await loadVersions();
        setSavedVersions(versions);
        // Set the latest version as current by default
        if (versions.length > 0) {
          setCurrentVersionId(versions[0].id);
        }

        // Load split sizes from IndexedDB
        const sizes = await getMetadata(SPLIT_SIZES_KEY);
        if (Array.isArray(sizes) && sizes.length === 3) {
          setSplitSizes(sizes);
        }
      } catch (e) {
        console.error("Failed to load data:", e);
      }
    };

    loadData();
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

  const handleSaveSubmit = useCallback(async () => {
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

      try {
        // Save to IndexedDB
        await saveVersion(newVersion);

        // Reload all versions to get the updated list
        const updatedVersions = await loadVersions();
        setSavedVersions(updatedVersions);
        setCurrentVersionId(newVersion.id);
        setShowSaveModal(false);
        setSaveName("");

        // Trigger confetti animation
        confetti({
          particleCount: 100,
          spread: 70,
          origin: {y: 0.6},
        });
      } catch (error) {
        console.error("Failed to save version:", error);
        alert("Failed to save version. Please try again.");
      }
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
    async (versionId, e) => {
      e.stopPropagation(); // Prevent triggering the load version action
      if (window.confirm("Are you sure you want to delete this version?")) {
        try {
          await deleteVersion(versionId);
          // Reload all versions
          const updatedVersions = await loadVersions();
          setSavedVersions(updatedVersions);
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
        } catch (error) {
          console.error("Failed to delete version:", error);
          alert("Failed to delete version. Please try again.");
        }
      }
    },
    [savedVersions, currentVersionId]
  );

  const handleSplitChange = useCallback(async (sizes) => {
    setSplitSizes(sizes);
    try {
      await setMetadata(SPLIT_SIZES_KEY, sizes);
    } catch (error) {
      console.error("Failed to save split sizes:", error);
    }
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

  const handleDownloadAll = useCallback(() => {
    if (savedVersions.length === 0) {
      alert("No versions to download");
      return;
    }

    const dataStr = JSON.stringify(savedVersions, null, 2);
    const dataBlob = new Blob([dataStr], {type: "application/json"});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `recho-multiples-versions-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [savedVersions]);

  return (
    <div className="min-h-screen">
      <header className="h-[50px] flex flex-col justify-center px-4 py-2 border-b border-gray-200 bg-black relative">
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
          <strong>Recho Multiples</strong>
        </h1>
      </header>
      <main className="h-[calc(100vh-50px)]">
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
            <div className="px-4 py-2 border-b border-gray-200 flex-shrink-0 flex items-center justify-between">
              <span>History</span>
              {savedVersions.length > 0 && (
                <button
                  onClick={handleDownloadAll}
                  className="p-1.5 text-gray-600 hover:text-black hover:bg-gray-100 rounded transition-colors"
                  title="Download all versions"
                  aria-label="Download all versions"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </button>
              )}
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
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{backgroundColor: "rgba(0, 0, 0, 0.8)"}}
        >
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
