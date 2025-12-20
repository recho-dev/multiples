import "./App.css";
import {useState, useCallback, useRef, useEffect} from "react";
import {useRoute} from "./hooks/useRoute.js";
import {loadSketches, deleteSketch, getSketch} from "./storage.js";
import {Header} from "./components/Header.jsx";
import {Workspace} from "./components/Workspace.jsx";
import {OpenSketchModal} from "./components/OpenSketchModal.jsx";
import {ExamplesModal} from "./components/ExamplesModal.jsx";

const initialCode = `p.setup = () => {
  p.createCanvas(400, 400);
};

p.draw = () => {
  p.background(220);
};
`;

function SketchEditor() {
  const {id, type, navigate} = useRoute();
  const [currentSketchId, setCurrentSketchId] = useState(id || null);
  const [currentSketchName, setCurrentSketchName] = useState(null);
  const [savedVersions, setSavedVersions] = useState([]);
  const [currentVersionId, setCurrentVersionId] = useState(null);
  const [initialCodeToLoad, setInitialCodeToLoad] = useState(initialCode);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [availableSketches, setAvailableSketches] = useState([]);
  const [showExamplesModal, setShowExamplesModal] = useState(false);
  const [availableExamples, setAvailableExamples] = useState([]);
  const lastLoadedSketchIdRef = useRef(null);

  // Load sketch from URL when id changes
  useEffect(() => {
    if (lastLoadedSketchIdRef.current === id) {
      return;
    }

    const loadSketchFromUrl = async () => {
      if (!id) {
        // No ID in URL - new sketch
        lastLoadedSketchIdRef.current = null;
        setCurrentSketchId(null);
        setCurrentSketchName(null);
        setInitialCodeToLoad(initialCode);
        setCurrentVersionId(null);
        setSavedVersions([]);
        return;
      }

      try {
        let sketch = null;

        // If it's an example route, load from examples
        if (type === "example") {
          try {
            const exampleModules = import.meta.glob("./examples/*.json", {eager: true});
            const examples = Object.values(exampleModules).map((module) => {
              return module.default || module;
            });
            sketch = examples.find((ex) => ex.id === id);
          } catch (e) {
            console.error("Failed to load examples:", e);
          }
        } else {
          // Otherwise, try to load from localStorage
          sketch = await getSketch(id);
        }

        if (sketch) {
          lastLoadedSketchIdRef.current = id;
          setCurrentSketchId(sketch.id);
          setCurrentSketchName(sketch.name);
          const versions = sketch.versions || [];
          setSavedVersions(versions);

          // Load selected version or first version
          let codeToLoad = initialCode;
          let versionId = null;

          if (sketch.selectedVersion) {
            const selected = versions.find((v) => v.id === sketch.selectedVersion);
            if (selected) {
              versionId = selected.id;
              codeToLoad = selected.code;
            } else if (versions.length > 0) {
              versionId = versions[0].id;
              codeToLoad = versions[0].code;
            }
          } else if (versions.length > 0) {
            versionId = versions[0].id;
            codeToLoad = versions[0].code;
          }

          setCurrentVersionId(versionId);
          setInitialCodeToLoad(codeToLoad);
        } else {
          // Sketch/example not found
          if (lastLoadedSketchIdRef.current === id) {
            return;
          }
          navigate("/multiples/", {replace: true});
        }
      } catch (e) {
        console.error("Failed to load sketch:", e);
        if (lastLoadedSketchIdRef.current === id) {
          return;
        }
        navigate("/multiples/", {replace: true});
      }
    };

    loadSketchFromUrl();
  }, [id, type, navigate]);

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
      const exampleModules = import.meta.glob("./examples/*.json", {eager: true});
      const examples = Object.values(exampleModules).map((module) => {
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
        const exampleId = example.id;
        lastLoadedSketchIdRef.current = exampleId;
        setCurrentSketchId(exampleId);
        setCurrentSketchName(example.name);
        const versions = example.versions || [];
        setSavedVersions(versions);

        const selectedVersionId = example.selectedVersion || (versions.length > 0 ? versions[0].id : null);
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

        setCurrentVersionId(selectedVersionId);
        setInitialCodeToLoad(codeToLoad);
        setShowExamplesModal(false);
        navigate(`/multiples/examples/${exampleId}`);
      } catch (error) {
        console.error("Failed to load example:", error);
        alert("Failed to load example. Please try again.");
      }
    },
    [navigate]
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
      e.stopPropagation();
      if (window.confirm("Are you sure you want to delete this sketch? All versions will also be deleted.")) {
        try {
          await deleteSketch(sketchId);
          const sketches = await loadSketches();
          setAvailableSketches(sketches);
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
      <Workspace
        sketchId={currentSketchId}
        sketchName={currentSketchName}
        versions={savedVersions}
        currentVersionId={currentVersionId}
        initialCode={initialCodeToLoad}
        isExample={type === "example"}
        onSketchIdChange={setCurrentSketchId}
        onSketchNameChange={setCurrentSketchName}
        onVersionsChange={setSavedVersions}
        navigate={navigate}
      />
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
