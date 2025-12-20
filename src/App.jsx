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
    const loadSketchFromUrl = async () => {
      if (!id) {
        // No ID in URL - new sketch
        setCurrentSketchId(null);
        setCurrentSketchName(null);
        setCode(initialCode);
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
          } else {
            setCurrentVersionId(null);
            setCode(initialCode);
            if (editorInstanceRef.current) {
              editorInstanceRef.current.setCode(initialCode);
            }
          }
        } else {
          // Sketch not found, redirect to home
          navigate("/multiples/", {replace: true});
        }
      } catch (e) {
        console.error("Failed to load sketch:", e);
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
      const existingSketch = await getSketch(sketchId);
      if (!existingSketch) {
        // Sketch doesn't exist yet, save it first
        await saveSketch({
          id: sketchId,
          name: currentSketchName || generateFriendlyName(),
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
      await saveVersion(sketchId, newVersion);

      // Reload sketch to get updated versions
      const sketch = await getSketch(sketchId);
      if (sketch) {
        const updatedVersions = sketch.versions || [];
        setSavedVersions(updatedVersions);
        setCurrentVersionId(newVersion.id);
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
    navigate("/multiples/");
  }, [navigate]);

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

  const handleExamples = useCallback(async () => {
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
  }, []);

  const handleSelectExample = useCallback(
    async (example) => {
      try {
        // Create a new sketch from the example
        const newSketchId = uid();
        const exampleSketch = {
          id: newSketchId,
          name: example.name,
          timestamp: new Date().toISOString(),
          versions: example.versions || [],
          selectedVersion: example.selectedVersion || (example.versions?.length > 0 ? example.versions[0].id : null),
        };

        // Save the example as a new sketch
        await saveSketch(exampleSketch);

        // Navigate to the sketch URL
        setShowExamplesModal(false);
        navigate(`/multiples/sketches/${newSketchId}`);
      } catch (error) {
        console.error("Failed to load example:", error);
        alert("Failed to load example. Please try again.");
      }
    },
    [navigate]
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
      setShowOpenModal(false);
      navigate(`/multiples/sketches/${sketch.id}`);
    },
    [navigate]
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
