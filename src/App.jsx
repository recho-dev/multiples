import "./App.css";
import {useState, useCallback, useRef, useEffect} from "react";
import {useRoute} from "./hooks/useRoute.js";
import Split from "react-split";
import {createEditor} from "./editor/index.js";
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
import {Header} from "./components/Header.jsx";
import {HistoryPanel} from "./components/HistoryPanel.jsx";
import {EditorPanel} from "./components/EditorPanel.jsx";
import {PreviewPanel} from "./components/PreviewPanel.jsx";
import {OpenSketchModal} from "./components/OpenSketchModal.jsx";
import {ExamplesModal} from "./components/ExamplesModal.jsx";

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

function SketchEditor() {
  const {id, navigate} = useRoute();
  const [code, setCode] = useState(initialCode);
  const [editorCode, setEditorCode] = useState(initialCode); // Current code in editor
  const [hasNewCodeToRun, setHasNewCodeToRun] = useState(false); // Whether editor code differs from current code
  const [hasNewCodeToSave, setHasNewCodeToSave] = useState(false); // Whether editor code differs from saved version
  const [params, setParams] = useState([]);
  const [showMultiples, setShowMultiples] = useState(false);
  const [savedVersions, setSavedVersions] = useState([]);
  const [currentVersionId, setCurrentVersionId] = useState(null);
  const [sidebarWidth, setSidebarWidth] = useState(176);
  const [splitSizes, setSplitSizes] = useState([15, 35, 50]); // [history, editor, preview]
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentSketchId, setCurrentSketchId] = useState(id || null);
  const [currentSketchName, setCurrentSketchName] = useState(null);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [availableSketches, setAvailableSketches] = useState([]);
  const [showExamplesModal, setShowExamplesModal] = useState(false);
  const [availableExamples, setAvailableExamples] = useState([]);
  const sidebarRef = useRef(null);
  const editorRef = useRef(null);
  const editorInstanceRef = useRef(null);
  const lastLoadedSketchIdRef = useRef(null); // Track last loaded sketch to prevent infinite loops

  // Load split sizes on mount
  useEffect(() => {
    const loadSplitSizes = async () => {
      try {
        const sizes = await getMetadata(SPLIT_SIZES_KEY);
        if (Array.isArray(sizes) && sizes.length === 3) {
          setSplitSizes(sizes);
        }
      } catch (e) {
        console.error("Failed to load split sizes:", e);
      }
    };
    loadSplitSizes();
  }, []);

  // Load sketch from URL when id changes
  useEffect(() => {
    // Prevent reloading if we just loaded this sketch
    if (lastLoadedSketchIdRef.current === id) {
      return;
    }

    const loadSketchFromUrl = async () => {
      if (!id) {
        // No ID in URL - new sketch
        lastLoadedSketchIdRef.current = null;
        setCurrentSketchId(null);
        setCurrentSketchName(null);
        setCode(initialCode);
        setEditorCode(initialCode);
        setHasNewCodeToRun(false);
        setHasNewCodeToSave(false);
        if (editorInstanceRef.current) {
          editorInstanceRef.current.setCode(initialCode);
        }
        setCurrentVersionId(null);
        setSavedVersions([]);
        return;
      }

      try {
        const sketch = await getSketch(id);
        if (sketch) {
          lastLoadedSketchIdRef.current = id;
          setCurrentSketchId(sketch.id);
          setCurrentSketchName(sketch.name);
          const versions = sketch.versions || [];
          setSavedVersions(versions);

          // Load selected version or first version
          if (sketch.selectedVersion) {
            const selected = versions.find((v) => v.id === sketch.selectedVersion);
            if (selected) {
              setCurrentVersionId(selected.id);
              setCode(selected.code);
              setEditorCode(selected.code);
              setHasNewCodeToRun(false);
              setHasNewCodeToSave(false);
              if (editorInstanceRef.current) {
                editorInstanceRef.current.setCode(selected.code);
              }
            } else if (versions.length > 0) {
              setCurrentVersionId(versions[0].id);
              setCode(versions[0].code);
              setEditorCode(versions[0].code);
              setHasNewCodeToRun(false);
              setHasNewCodeToSave(false);
              if (editorInstanceRef.current) {
                editorInstanceRef.current.setCode(versions[0].code);
              }
            }
          } else if (versions.length > 0) {
            setCurrentVersionId(versions[0].id);
            setCode(versions[0].code);
            setEditorCode(versions[0].code);
            setHasNewCodeToRun(false);
            setHasNewCodeToSave(false);
            if (editorInstanceRef.current) {
              editorInstanceRef.current.setCode(versions[0].code);
            }
          } else {
            setCurrentVersionId(null);
            setCode(initialCode);
            setEditorCode(initialCode);
            setHasNewCodeToRun(false);
            setHasNewCodeToSave(false);
            if (editorInstanceRef.current) {
              editorInstanceRef.current.setCode(initialCode);
            }
          }
        } else {
          // Sketch not found in localStorage
          // If this is the last loaded sketch, it might be an unsaved example
          // Keep it in memory and don't redirect
          if (lastLoadedSketchIdRef.current === id) {
            // Already loaded in memory (e.g., from example), keep it
            return;
          }
          // Otherwise, redirect to home
          navigate("/multiples/", {replace: true});
        }
      } catch (e) {
        console.error("Failed to load sketch:", e);
        // If this is the last loaded sketch, it might be an unsaved example
        if (lastLoadedSketchIdRef.current === id) {
          // Already loaded in memory (e.g., from example), keep it
          return;
        }
        navigate("/multiples/", {replace: true});
      }
    };

    loadSketchFromUrl();
  }, [id, navigate]);

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

  const onSave = useCallback(() => {
    // Save doesn't automatically run the code - only play button or slider does
  }, []);

  const onSliderChange = useCallback((code) => {
    setCode(code);
  }, []);

  const onParamsChange = useCallback(({params, type}) => {
    setParams(params);
    if (type === "params-update") setShowMultiples(params.length > 0);
  }, []);

  const onSelect = useCallback(
    ({code, values}) => {
      if (!editorInstanceRef.current || params.length === 0) return;
      editorInstanceRef.current.update(params, values);
      setCode(code);
      setEditorCode(code);
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

  // Track editor code changes and update button states
  useEffect(() => {
    if (!editorInstanceRef.current) return;

    const checkEditorChanges = () => {
      const currentEditorCode = editorInstanceRef.current.getCode();
      setEditorCode(currentEditorCode);

      // Check if there's new code to run
      const needsRun = currentEditorCode !== code;
      setHasNewCodeToRun(needsRun);

      // Check if there's new code to save
      let needsSave = false;
      if (currentVersionId) {
        const currentVersion = savedVersions.find((v) => v.id === currentVersionId);
        if (currentVersion) {
          needsSave = currentVersion.code !== currentEditorCode;
        } else {
          needsSave = currentEditorCode !== initialCode;
        }
      } else {
        // No version saved yet, check if code is different from initial
        needsSave = currentEditorCode !== initialCode;
      }
      setHasNewCodeToSave(needsSave);
    };

    // Check on mount and set up interval to check for changes
    checkEditorChanges();
    const interval = setInterval(checkEditorChanges, 500); // Check every 500ms

    return () => clearInterval(interval);
  }, [code, currentVersionId, savedVersions]);

  const handleRun = useCallback(() => {
    if (editorInstanceRef.current) {
      const currentCode = editorInstanceRef.current.getCode();
      setCode(currentCode);
      setEditorCode(currentCode);
      setHasNewCodeToRun(false); // Reset after running
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!editorInstanceRef.current) return;

    const currentCode = editorInstanceRef.current.getCode();
    let sketchId = currentSketchId;

    // If no sketch ID, create a new sketch first
    if (!sketchId) {
      sketchId = uid();
      const newSketchName = currentSketchName || generateFriendlyName();
      await saveSketch({
        id: sketchId,
        name: newSketchName,
        timestamp: new Date().toISOString(),
        versions: [],
        selectedVersion: null,
        nextVersionId: 0, // Initialize counter at 0
      });
      setCurrentSketchId(sketchId);
      setCurrentSketchName(newSketchName);
      // Navigate to the sketch URL
      navigate(`/multiples/sketches/${sketchId}`);
    }

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
      let currentSketch = await getSketch(sketchId);
      if (!currentSketch) {
        // Sketch doesn't exist yet, save it first
        currentSketch = await saveSketch({
          id: sketchId,
          name: currentSketchName || generateFriendlyName(),
          timestamp: new Date().toISOString(),
          versions: [],
          selectedVersion: null,
          nextVersionId: 0, // Initialize counter at 0
        });
      }

      // Initialize nextVersionId if it doesn't exist (for backward compatibility)
      if (currentSketch.nextVersionId === undefined) {
        // Migrate existing sketches: find max version number and set counter
        const existingVersions = currentSketch.versions || [];
        let maxVersionNum = -1;
        for (const version of existingVersions) {
          const versionNum = parseInt(version.id, 10);
          if (!isNaN(versionNum) && versionNum > maxVersionNum) {
            maxVersionNum = versionNum;
          }
        }
        currentSketch.nextVersionId = maxVersionNum + 1;
        // Save the updated sketch with nextVersionId
        await saveSketch(currentSketch);
      }
      
      // Get the next version ID from the counter and increment it
      const nextVersionId = String(currentSketch.nextVersionId);
      currentSketch.nextVersionId = currentSketch.nextVersionId + 1;

      const newVersion = {
        id: nextVersionId,
        parentId: currentVersionId, // Track which version this was derived from
        code: currentCode,
        timestamp: new Date().toISOString(),
        time: new Date().toLocaleString(),
        name: null,
      };

      // Save the updated counter first
      await saveSketch(currentSketch);

      // Save version to sketch
      await saveVersion(sketchId, newVersion);

      // Reload sketch to get updated versions
      const sketch = await getSketch(sketchId);
      if (sketch) {
        const updatedVersions = sketch.versions || [];
        setSavedVersions(updatedVersions);
        setCurrentVersionId(newVersion.id);
        setHasNewCodeToSave(false); // Reset after saving
      }
    } catch (error) {
      console.error("Failed to save version:", error);
      alert("Failed to save version. Please try again.");
    }
  }, [currentSketchId, currentSketchName, currentVersionId, savedVersions, navigate]);

  const handleSaveAndRun = useCallback(async () => {
    // First save, then run
    await handleSave();
    handleRun();
  }, [handleSave, handleRun]);

  const handleLoadVersion = useCallback(
    async (version) => {
      if (editorInstanceRef.current && currentSketchId) {
        editorInstanceRef.current.setCode(version.code);
        setCode(version.code);
        setEditorCode(version.code);
        setRunnableCode(null); // Don't run by default when loading a version
        setHasNewCodeToRun(false);
        setHasNewCodeToSave(false);
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

  // Listen for Cmd+S / Ctrl+S keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSaveAndRun();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleSaveAndRun]);

  // Warn user before leaving page if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasNewCodeToSave) {
        e.preventDefault();
        e.returnValue = ""; // Chrome requires returnValue to be set
        return ""; // Some browsers require a return value
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasNewCodeToSave]);

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
    if (hasNewCodeToSave) {
      if (!window.confirm("You have unsaved changes. Are you sure you want to create a new sketch?")) {
        return;
      }
    }
    navigate("/multiples/");
  }, [navigate, hasNewCodeToSave]);

  const handleOpenSketch = useCallback(async () => {
    if (hasNewCodeToSave) {
      if (!window.confirm("You have unsaved changes. Are you sure you want to open another sketch?")) {
        return;
      }
    }
    try {
      const sketches = await loadSketches();
      setAvailableSketches(sketches);
      setShowOpenModal(true);
    } catch (error) {
      console.error("Failed to load sketches:", error);
      alert("Failed to load sketches. Please try again.");
    }
  }, [hasNewCodeToSave]);

  const handleExamples = useCallback(async () => {
    if (hasNewCodeToSave) {
      if (!window.confirm("You have unsaved changes. Are you sure you want to open examples?")) {
        return;
      }
    }
    try {
      // Load all example files from the examples directory
      const exampleModules = import.meta.glob("./examples/*.json", {eager: true});
      const examples = Object.values(exampleModules).map((module) => {
        // Vite imports JSON files as default exports
        return module.default || module;
      });
      setAvailableExamples(examples);
      setShowExamplesModal(true);
    } catch (error) {
      console.error("Failed to load examples:", error);
      alert("Failed to load examples. Please try again.");
    }
  }, [hasNewCodeToSave]);

  const handleSelectExample = useCallback(
    async (example) => {
      // Note: We already checked when opening the examples modal, but check again in case user made changes
      if (hasNewCodeToSave) {
        if (!window.confirm("You have unsaved changes. Are you sure you want to load this example?")) {
          return;
        }
      }
      try {
        // Create a new sketch ID but don't save it yet
        const newSketchId = uid();
        const versions = example.versions || [];
        const selectedVersionId = example.selectedVersion || (versions.length > 0 ? versions[0].id : null);

        // Find the code to load
        let codeToLoad = initialCode;
        if (selectedVersionId && versions.length > 0) {
          const selectedVersion = versions.find((v) => v.id === selectedVersionId);
          if (selectedVersion) {
            codeToLoad = selectedVersion.code;
          } else if (versions.length > 0) {
            codeToLoad = versions[0].code;
          }
        } else if (versions.length > 0) {
          codeToLoad = versions[0].code;
        }

        // Set up the sketch in memory (not saved yet)
        lastLoadedSketchIdRef.current = newSketchId; // Mark as loaded to prevent reload
        setCurrentSketchId(newSketchId);
        setCurrentSketchName(example.name);
        setCode(codeToLoad);
        setEditorCode(codeToLoad);
        setSavedVersions(versions);
        setCurrentVersionId(selectedVersionId);
        setHasNewCodeToRun(false);
        setHasNewCodeToSave(true); // Mark as needing save since it's not saved yet

        // Load code into editor
        if (editorInstanceRef.current) {
          editorInstanceRef.current.setCode(codeToLoad);
        }

        // Navigate to the sketch URL
        setShowExamplesModal(false);
        navigate(`/multiples/sketches/${newSketchId}`);
      } catch (error) {
        console.error("Failed to load example:", error);
        alert("Failed to load example. Please try again.");
      }
    },
    [navigate, hasNewCodeToSave]
  );

  const handleSaveName = useCallback(
    async (newName) => {
      if (!currentSketchId) return;

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
      } catch (error) {
        console.error("Failed to save sketch name:", error);
      }
    },
    [currentSketchId]
  );

  const handleSelectSketch = useCallback(
    async (sketch) => {
      // Note: We already checked when opening the modal, but check again in case user made changes
      if (hasNewCodeToSave) {
        if (!window.confirm("You have unsaved changes. Are you sure you want to switch to this sketch?")) {
          return;
        }
      }
      setShowOpenModal(false);
      navigate(`/multiples/sketches/${sketch.id}`);
    },
    [navigate, hasNewCodeToSave]
  );

  const handleDeleteSketch = useCallback(
    async (sketchId, e) => {
      e.stopPropagation(); // Prevent triggering the select action
      if (window.confirm("Are you sure you want to delete this sketch? All versions will also be deleted.")) {
        try {
          await deleteSketch(sketchId);
          // Reload sketches list
          const sketches = await loadSketches();
          setAvailableSketches(sketches);
          // If we deleted the current sketch, navigate to home or first available
          if (currentSketchId === sketchId) {
            if (sketches.length > 0) {
              navigate(`/multiples/sketches/${sketches[0].id}`);
            } else {
              navigate("/multiples/");
            }
          }
        } catch (error) {
          console.error("Failed to delete sketch:", error);
          alert("Failed to delete sketch. Please try again.");
        }
      }
    },
    [currentSketchId, navigate]
  );

  return (
    <div className="min-h-screen">
      <Header
        isFullscreen={isFullscreen}
        onNewSketch={handleNewSketch}
        onOpenSketch={handleOpenSketch}
        onExamples={handleExamples}
        onDownloadAll={handleDownloadAll}
        hasVersions={savedVersions.length > 0}
        onFullscreen={handleFullscreen}
      />
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
          <HistoryPanel
            ref={sidebarRef}
            versions={savedVersions}
            currentVersionId={currentVersionId}
            sidebarWidth={sidebarWidth}
            onLoadVersion={handleLoadVersion}
            onDeleteVersion={handleDeleteVersion}
          />
          <EditorPanel
            editorRef={editorRef}
            onRun={handleRun}
            onSave={handleSave}
            sketchName={currentSketchName}
            onSaveName={handleSaveName}
            hasNewCodeToRun={hasNewCodeToRun}
            hasNewCodeToSave={hasNewCodeToSave}
          />
          <PreviewPanel
            showMultiples={showMultiples}
            code={code}
            params={params}
            onToggleMultiples={setShowMultiples}
            onSelect={onSelect}
          />
        </Split>
      </main>
      {showOpenModal && (
        <OpenSketchModal
          sketches={availableSketches}
          onSelect={handleSelectSketch}
          onDelete={handleDeleteSketch}
          onClose={() => setShowOpenModal(false)}
        />
      )}
      {showExamplesModal && (
        <ExamplesModal
          examples={availableExamples}
          onSelect={handleSelectExample}
          onClose={() => setShowExamplesModal(false)}
        />
      )}
    </div>
  );
}

function App() {
  return <SketchEditor />;
}

export default App;
