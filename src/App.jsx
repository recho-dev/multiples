import "./App.css";
import {useState, useCallback, useRef, useEffect} from "react";
import Split from "react-split";
import {Sketch} from "./Sketch.jsx";
import {Multiples} from "./Multiples.jsx";
import {createEditor} from "./editor/index.js";
import {clsx} from "./clsx.js";
import friendlyWords from "friendly-words";
import {
  saveVersion,
  deleteVersion,
  getMetadata,
  setMetadata,
  loadSketches,
  saveSketch,
  deleteSketch,
  getSketch,
  setSelectedVersion,
} from "./storage.js";

const initialCode = `p.setup = () => {
  p.createCanvas(400, 400);
};

p.draw = () => {
  p.background(220);
};
`;

const SPLIT_SIZES_KEY = "recho-multiples-split-sizes";

function uid() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function generateFriendlyName() {
  const predicate = friendlyWords.predicates[Math.floor(Math.random() * friendlyWords.predicates.length)];
  const object = friendlyWords.objects[Math.floor(Math.random() * friendlyWords.objects.length)];
  const num = Math.floor(Math.random() * 100);
  return `${predicate}-${object}-${num}`;
}

function App() {
  const [code, setCode] = useState(initialCode);
  const [params, setParams] = useState([]);
  const [showMultiples, setShowMultiples] = useState(false);
  const [savedVersions, setSavedVersions] = useState([]);
  const [currentVersionId, setCurrentVersionId] = useState(null);
  const [sidebarWidth, setSidebarWidth] = useState(176);
  const [splitSizes, setSplitSizes] = useState([15, 35, 50]); // [history, editor, preview]
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentSketchId, setCurrentSketchId] = useState(null);
  const [currentSketchName, setCurrentSketchName] = useState(null);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [availableSketches, setAvailableSketches] = useState([]);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingNameValue, setEditingNameValue] = useState("");
  const sidebarRef = useRef(null);
  const editorRef = useRef(null);
  const editorInstanceRef = useRef(null);

  // Load saved versions and split sizes from IndexedDB on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load split sizes from IndexedDB
        const sizes = await getMetadata(SPLIT_SIZES_KEY);
        if (Array.isArray(sizes) && sizes.length === 3) {
          setSplitSizes(sizes);
        }

        // Create a default sketch if none exists
        const sketches = await loadSketches();
        if (sketches.length === 0) {
          const newSketchId = uid();
          const newSketchName = generateFriendlyName();
          await saveSketch({
            id: newSketchId,
            name: newSketchName,
            timestamp: new Date().toISOString(),
            versions: [],
            selectedVersion: null,
          });
          setCurrentSketchId(newSketchId);
          setCurrentSketchName(newSketchName);
        } else {
          // Load the most recent sketch
          const latestSketch = sketches[0];
          setCurrentSketchId(latestSketch.id);
          setCurrentSketchName(latestSketch.name);
          // Load versions from sketch
          const versions = latestSketch.versions || [];
          setSavedVersions(versions);
          // Load selected version or first version
          if (latestSketch.selectedVersion) {
            const selected = versions.find((v) => v.id === latestSketch.selectedVersion);
            if (selected) {
              setCurrentVersionId(selected.id);
              setCode(selected.code);
              if (editorInstanceRef.current) {
                editorInstanceRef.current.setCode(selected.code);
              }
            } else if (versions.length > 0) {
              setCurrentVersionId(versions[0].id);
              setCode(versions[0].code);
              if (editorInstanceRef.current) {
                editorInstanceRef.current.setCode(versions[0].code);
              }
            }
          } else if (versions.length > 0) {
            setCurrentVersionId(versions[0].id);
            setCode(versions[0].code);
            if (editorInstanceRef.current) {
              editorInstanceRef.current.setCode(versions[0].code);
            }
          }
        }
      } catch (e) {
        console.error("Failed to load data:", e);
      }
    };

    loadData();
  }, []);

  // Reload versions when sketch changes
  useEffect(() => {
    if (currentSketchId) {
      const loadSketchData = async () => {
        try {
          const sketch = await getSketch(currentSketchId);
          if (sketch) {
            const versions = sketch.versions || [];
            setSavedVersions(versions);
            // Load selected version or first version
            if (sketch.selectedVersion) {
              const selected = versions.find((v) => v.id === sketch.selectedVersion);
              if (selected) {
                setCurrentVersionId(selected.id);
                setCode(selected.code);
                if (editorInstanceRef.current) {
                  editorInstanceRef.current.setCode(selected.code);
                }
              } else if (versions.length > 0) {
                setCurrentVersionId(versions[0].id);
                setCode(versions[0].code);
                if (editorInstanceRef.current) {
                  editorInstanceRef.current.setCode(versions[0].code);
                }
              } else {
                setCurrentVersionId(null);
              }
            } else if (versions.length > 0) {
              setCurrentVersionId(versions[0].id);
              setCode(versions[0].code);
              if (editorInstanceRef.current) {
                editorInstanceRef.current.setCode(versions[0].code);
              }
            } else {
              setCurrentVersionId(null);
            }
          }
        } catch (e) {
          console.error("Failed to load sketch data:", e);
        }
      };
      loadSketchData();
    }
  }, [currentSketchId]);

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

  const handleSave = useCallback(async () => {
    if (editorInstanceRef.current && currentSketchId) {
      const currentCode = editorInstanceRef.current.getCode();

      // Check if code has changed from the current version
      if (currentVersionId) {
        const currentVersion = savedVersions.find((v) => v.id === currentVersionId);
        if (currentVersion && currentVersion.code === currentCode) {
          // Code hasn't changed, no need to save
          return;
        }
      }

      try {
        // Check if sketch exists in localStorage, if not, save it first
        const existingSketch = await getSketch(currentSketchId);
        if (!existingSketch) {
          // Sketch doesn't exist yet, save it first
          await saveSketch({
            id: currentSketchId,
            name: currentSketchName,
            timestamp: new Date().toISOString(),
            versions: [],
            selectedVersion: null,
          });
        }

        const newVersion = {
          id: uid(),
          parentId: currentVersionId, // Track which version this was derived from
          code: currentCode,
          timestamp: new Date().toISOString(),
          time: new Date().toLocaleString(),
          name: null,
        };

        // Save version to sketch
        await saveVersion(currentSketchId, newVersion);

        // Reload sketch to get updated versions
        const sketch = await getSketch(currentSketchId);
        if (sketch) {
          const updatedVersions = sketch.versions || [];
          setSavedVersions(updatedVersions);
          setCurrentVersionId(newVersion.id);
        }
      } catch (error) {
        console.error("Failed to save version:", error);
        alert("Failed to save version. Please try again.");
      }
    }
  }, [currentSketchId, currentSketchName, currentVersionId, savedVersions]);

  const handleLoadVersion = useCallback(
    async (version) => {
      if (editorInstanceRef.current && currentSketchId) {
        editorInstanceRef.current.setCode(version.code);
        setCode(version.code);
        setCurrentVersionId(version.id);
        // Update selected version in sketch
        await setSelectedVersion(currentSketchId, version.id);
      }
    },
    [currentSketchId]
  );

  const handleDeleteVersion = useCallback(
    async (versionId, e) => {
      e.stopPropagation(); // Prevent triggering the load version action
      if (window.confirm("Are you sure you want to delete this version?")) {
        try {
          await deleteVersion(currentSketchId, versionId);
          // Reload sketch to get updated versions
          const sketch = await getSketch(currentSketchId);
          if (sketch) {
            const updatedVersions = sketch.versions || [];
            setSavedVersions(updatedVersions);
            // If we deleted the current version, set currentVersionId to the selected version or first available
            if (currentVersionId === versionId) {
              if (sketch.selectedVersion) {
                const selected = updatedVersions.find((v) => v.id === sketch.selectedVersion);
                if (selected) {
                  setCurrentVersionId(selected.id);
                  if (editorInstanceRef.current) {
                    editorInstanceRef.current.setCode(selected.code);
                    setCode(selected.code);
                  }
                } else if (updatedVersions.length > 0) {
                  setCurrentVersionId(updatedVersions[0].id);
                  if (editorInstanceRef.current) {
                    editorInstanceRef.current.setCode(updatedVersions[0].code);
                    setCode(updatedVersions[0].code);
                  }
                } else {
                  setCurrentVersionId(null);
                }
              } else if (updatedVersions.length > 0) {
                setCurrentVersionId(updatedVersions[0].id);
                if (editorInstanceRef.current) {
                  editorInstanceRef.current.setCode(updatedVersions[0].code);
                  setCode(updatedVersions[0].code);
                }
              } else {
                setCurrentVersionId(null);
              }
            }
          }
        } catch (error) {
          console.error("Failed to delete version:", error);
          alert("Failed to delete version. Please try again.");
        }
      }
    },
    [currentSketchId, currentVersionId]
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

  const handleNewSketch = useCallback(() => {
    const newSketchId = uid();
    const newSketchName = generateFriendlyName();
    // Create sketch in memory only, don't save to localStorage yet
    setCurrentSketchId(newSketchId);
    setCurrentSketchName(newSketchName);
    setCode(initialCode);
    if (editorInstanceRef.current) {
      editorInstanceRef.current.setCode(initialCode);
    }
    setCurrentVersionId(null);
    setSavedVersions([]);
  }, []);

  const handleOpenSketch = useCallback(async () => {
    try {
      const sketches = await loadSketches();
      setAvailableSketches(sketches);
      setShowOpenModal(true);
    } catch (error) {
      console.error("Failed to load sketches:", error);
      alert("Failed to load sketches. Please try again.");
    }
  }, []);

  const handleStartEditName = useCallback(() => {
    setIsEditingName(true);
    setEditingNameValue(currentSketchName || "");
  }, [currentSketchName]);

  const handleSaveName = useCallback(async () => {
    if (!currentSketchId) return;

    const newName = editingNameValue.trim();
    if (newName === currentSketchName) {
      // Name hasn't changed
      setIsEditingName(false);
      return;
    }

    if (newName === "") {
      // Empty name, revert
      setIsEditingName(false);
      return;
    }

    try {
      const sketch = await getSketch(currentSketchId);
      if (sketch) {
        sketch.name = newName;
        await saveSketch(sketch);
        setCurrentSketchName(newName);
      } else {
        // Sketch doesn't exist yet, just update the state
        setCurrentSketchName(newName);
      }
      setIsEditingName(false);
    } catch (error) {
      console.error("Failed to save sketch name:", error);
      setIsEditingName(false);
    }
  }, [currentSketchId, editingNameValue, currentSketchName]);

  const handleSelectSketch = useCallback(async (sketch) => {
    try {
      setCurrentSketchId(sketch.id);
      setCurrentSketchName(sketch.name);
      setShowOpenModal(false);
      // Versions will be loaded by the useEffect that watches currentSketchId
    } catch (error) {
      console.error("Failed to load sketch:", error);
      alert("Failed to load sketch. Please try again.");
    }
  }, []);

  const handleDeleteSketch = useCallback(
    async (sketchId, e) => {
      e.stopPropagation(); // Prevent triggering the select action
      if (window.confirm("Are you sure you want to delete this sketch? All versions will also be deleted.")) {
        try {
          await deleteSketch(sketchId);
          // Reload sketches list
          const sketches = await loadSketches();
          setAvailableSketches(sketches);
          // If we deleted the current sketch, switch to the first available or create new
          if (currentSketchId === sketchId) {
            if (sketches.length > 0) {
              setCurrentSketchId(sketches[0].id);
              setCurrentSketchName(sketches[0].name);
            } else {
              // Create a new sketch in memory if none remain (don't save until user clicks save)
              const newSketchId = uid();
              const newSketchName = generateFriendlyName();
              setCurrentSketchId(newSketchId);
              setCurrentSketchName(newSketchName);
              setCode(initialCode);
              if (editorInstanceRef.current) {
                editorInstanceRef.current.setCode(initialCode);
              }
              setCurrentVersionId(null);
              setSavedVersions([]);
            }
          }
        } catch (error) {
          console.error("Failed to delete sketch:", error);
          alert("Failed to delete sketch. Please try again.");
        }
      }
    },
    [currentSketchId]
  );

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
        <div className="flex items-center gap-3">
          <h1 className="font-mono text-lg text-white">
            <strong>Recho Multiples</strong>
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleNewSketch}
              className="px-3 py-1.5 text-white hover:bg-gray-800 rounded transition-colors text-sm"
              title="New Sketch"
            >
              New
            </button>
            <button
              onClick={handleOpenSketch}
              className="px-3 py-1.5 text-white hover:bg-gray-800 rounded transition-colors text-sm"
              title="Open Sketch"
            >
              Open
            </button>
          </div>
        </div>
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
              {currentSketchName &&
                (isEditingName ? (
                  <input
                    type="text"
                    value={editingNameValue}
                    onChange={(e) => setEditingNameValue(e.target.value)}
                    onBlur={handleSaveName}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.target.blur();
                      } else if (e.key === "Escape") {
                        setIsEditingName(false);
                        setEditingNameValue(currentSketchName);
                      }
                    }}
                    className="ml-2 text-sm text-gray-600 font-medium bg-transparent border border-gray-400 focus:outline-none focus:border-gray-600 px-1 rounded"
                    autoFocus
                  />
                ) : (
                  <span
                    onClick={handleStartEditName}
                    className="ml-2 text-sm text-gray-600 font-medium cursor-pointer hover:text-gray-800 hover:border hover:border-gray-400 hover:px-1 rounded"
                    title="Click to edit name"
                  >
                    {currentSketchName}
                  </span>
                ))}
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
      {showOpenModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{backgroundColor: "rgba(0, 0, 0, 0.8)"}}
        >
          <div className="bg-white  p-6 max-w-md w-full mx-4 relative max-h-[80vh] overflow-y-auto">
            <button
              onClick={() => setShowOpenModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
              title="Close"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <h2 className="text-lg font-semibold mb-4">Open Sketch</h2>
            {availableSketches.length === 0 ? (
              <p className="text-gray-500">No sketches available</p>
            ) : (
              <div className="space-y-2">
                {availableSketches.map((sketch) => (
                  <div
                    key={sketch.id}
                    className="w-full px-4 py-3 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors flex items-center justify-between group"
                  >
                    <button onClick={() => handleSelectSketch(sketch)} className="flex-1 text-left">
                      <div className="font-medium">{sketch.name}</div>
                      <div className="text-xs text-gray-500">{new Date(sketch.timestamp).toLocaleString()}</div>
                    </button>
                    <button
                      onClick={(e) => handleDeleteSketch(sketch.id, e)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete sketch"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
