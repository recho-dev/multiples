import "./App.css";
import {useState, useCallback, useRef, useEffect} from "react";
import {useRoute} from "./hooks/useRoute.js";
import {loadSketches, deleteSketch, getSketch, saveSketch} from "./storage.js";
import {Header} from "./components/Header.jsx";
import {Workspace} from "./components/Workspace.jsx";
import {OpenSketchModal} from "./components/OpenSketchModal.jsx";
import {ExamplesModal} from "./components/ExamplesModal.jsx";
import {examples} from "./examples/index.js";

const initialCodeP5 = `p.setup = () => {
  p.createCanvas(400, 400);
};

p.draw = () => {
  p.background(220);
  p.circle(p.width / 2, p.height / 2, 100);
}
`;

const initialCodeWebGL2 = `#version 300 es
precision highp float;
uniform float uTime;
in  vec3 vPos;
out vec4 fragColor;

void main() {
   vec3 color = .5 - .5 * vPos;
   color += .3 * sin(uTime + vPos * 2.);
   fragColor = vec4(color, 1.);
}`;

function SketchEditor() {
  const {id, type, navigate} = useRoute();
  const [currentSketchId, setCurrentSketchId] = useState(id || null);
  const [currentSketchName, setCurrentSketchName] = useState(null);
  const [savedVersions, setSavedVersions] = useState([]);
  const [currentVersionId, setCurrentVersionId] = useState(null);
  const [sketchType, setSketchType] = useState("p5"); // "p5" or "webgl2"
  const [initialCodeToLoad, setInitialCodeToLoad] = useState(initialCodeP5);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [availableSketches, setAvailableSketches] = useState([]);
  const [showExamplesModal, setShowExamplesModal] = useState(false);
  const [availableExamples, setAvailableExamples] = useState([]);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
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
        // Use current sketchType or default to "p5"
        setSketchType((prev) => {
          const type = prev || "p5";
          setInitialCodeToLoad(type === "webgl2" ? initialCodeWebGL2 : initialCodeP5);
          return type;
        });
        setCurrentVersionId(null);
        setSavedVersions([]);
        return;
      }

      try {
        let sketch = null;

        // If it's an example route, load from examples
        if (type === "example") {
          try {
            const exampleEntry = examples.find((ex) => ex.data.id === id);
            sketch = exampleEntry?.data;
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

          // Get sketch type from sketch metadata, or infer from code, default to "p5"
          let sketchTypeValue = sketch.type;
          if (!sketchTypeValue) {
            // Try to infer type from code if available
            const versions = sketch.versions || [];
            if (versions.length > 0) {
              const firstVersion = versions.find((v) => v.id === sketch.selectedVersion) || versions[0];
              if (firstVersion?.code?.trim().startsWith("#version")) {
                sketchTypeValue = "webgl2";
              }
            }
          }
          sketchTypeValue = sketchTypeValue || "p5";

          // If type was inferred or missing, update the sketch
          if (sketch.type !== sketchTypeValue) {
            sketch.type = sketchTypeValue;
            await saveSketch(sketch);
          }

          setSketchType(sketchTypeValue);

          const versions = sketch.versions || [];
          setSavedVersions(versions);

          // Load selected version or first version
          let codeToLoad = sketchTypeValue === "webgl2" ? initialCodeWebGL2 : initialCodeP5;
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

  const handleDownloadAll = useCallback(async () => {
    if (savedVersions.length === 0) {
      alert("No versions to download");
      return;
    }

    try {
      let sketchData = null;

      // If it's a saved sketch, get the full sketch data
      if (currentSketchId && type !== "example") {
        sketchData = await getSketch(currentSketchId);
      }

      // If sketch not found or it's an example, construct the sketch from current state
      if (!sketchData) {
        sketchData = {
          id: currentSketchId || `sketch-${Date.now()}`,
          name: currentSketchName || "Untitled Sketch",
          timestamp: new Date().toISOString(),
          versions: savedVersions,
          selectedVersion: currentVersionId,
        };
      } else {
        // Ensure we have the latest versions and selected version
        sketchData.versions = savedVersions;
        sketchData.selectedVersion = currentVersionId;
      }

      const dataStr = JSON.stringify(sketchData, null, 2);
      const dataBlob = new Blob([dataStr], {type: "application/json"});
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      const sketchName = (currentSketchName || "sketch").replace(/[^a-z0-9]/gi, "-").toLowerCase();
      link.download = `${sketchName}-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download sketch:", error);
      alert("Failed to download sketch. Please try again.");
    }
  }, [currentSketchId, currentSketchName, savedVersions, currentVersionId, type]);

  const handleNewSketch = useCallback(
    (type = "p5") => {
      setSketchType(type);
      setInitialCodeToLoad(type === "webgl2" ? initialCodeWebGL2 : initialCodeP5);
      navigate("/multiples/");
    },
    [navigate]
  );

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

        // Get sketch type from example metadata, default to "p5"
        const exampleType = example.type || "p5";
        setSketchType(exampleType);

        let codeToLoad = exampleType === "webgl2" ? initialCodeWebGL2 : initialCodeP5;
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
      {!showWhiteboard && (
        <Header
          isFullscreen={isFullscreen}
          onNewSketch={handleNewSketch}
          onOpenSketch={handleOpenSketch}
          onExamples={handleExamples}
          onDownloadAll={handleDownloadAll}
          hasVersions={savedVersions.length > 0}
          onFullscreen={handleFullscreen}
        />
      )}
      <Workspace
        sketchId={currentSketchId}
        sketchName={currentSketchName}
        versions={savedVersions}
        currentVersionId={currentVersionId}
        initialCode={initialCodeToLoad}
        sketchType={sketchType}
        isExample={type === "example"}
        onSketchIdChange={setCurrentSketchId}
        onSketchNameChange={setCurrentSketchName}
        onVersionsChange={setSavedVersions}
        navigate={navigate}
        onWhiteboardChange={setShowWhiteboard}
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
