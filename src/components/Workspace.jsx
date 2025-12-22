import {useState, useCallback, useRef, useEffect} from "react";
import Split from "react-split";
import {createEditor} from "../editor/index.js";
import friendlyWords from "friendly-words";
import {
  saveVersion,
  deleteVersion,
  getSketch,
  setSelectedVersion,
  getMetadata,
  setMetadata,
  saveSketch,
} from "../storage.js";
import {HistoryPanel} from "./HistoryPanel.jsx";
import {EditorPanel} from "./EditorPanel.jsx";
import {PreviewPanel} from "./PreviewPanel.jsx";
import {Whiteboard} from "./Whiteboard.jsx";

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

function getParamKey(param) {
  return `${param.from}-${param.to}`;
}

function getDefaultRange(value, defaultCount = 4) {
  value = parseFloat(value);
  let [min, max] = [value * 0.5, value * 2];
  if (value === 0) [min, max] = [0, 100];
  if (min > max) [min, max] = [max, min];
  return {min, max, count: defaultCount};
}

function paramsEqual(params1, ranges1, params2, ranges2) {
  if (!params1 && !params2) return true;
  if (!params1 || !params2) return false;

  // Compare params arrays
  if (params1.length !== params2.length) return false;
  const params1Str = JSON.stringify(params1.sort((a, b) => a.from - b.from));
  const params2Str = JSON.stringify(params2.sort((a, b) => a.from - b.from));
  if (params1Str !== params2Str) return false;

  // Compare ranges objects
  const ranges1Str = JSON.stringify(ranges1 || {});
  const ranges2Str = JSON.stringify(ranges2 || {});
  return ranges1Str === ranges2Str;
}

export function Workspace({
  sketchId,
  sketchName,
  versions: initialVersions = [],
  currentVersionId: initialVersionId = null,
  initialCode: providedInitialCode,
  sketchType: providedSketchType = "p5",
  isExample = false,
  onSketchIdChange,
  onSketchNameChange,
  onVersionsChange,
  navigate,
}) {
  const handleSaveName = useCallback(
    async (newName) => {
      if (!sketchId || isExample) {
        // For examples or new sketches, just update the name in parent
        onSketchNameChange?.(newName);
        return;
      }

      try {
        const sketch = await getSketch(sketchId);
        if (sketch) {
          sketch.name = newName;
          await saveSketch(sketch);
          onSketchNameChange?.(newName);
        } else {
          onSketchNameChange?.(newName);
        }
      } catch (error) {
        console.error("Failed to save sketch name:", error);
      }
    },
    [sketchId, isExample, onSketchNameChange]
  );
  const [code, setCode] = useState(providedInitialCode);
  const [previewCode, setPreviewCode] = useState(providedInitialCode);
  const [multiplesCode, setMultiplesCode] = useState(providedInitialCode);
  const [sketchType, setSketchType] = useState(providedSketchType);
  const [hasNewCodeToRun, setHasNewCodeToRun] = useState(false);
  const [hasNewCodeToSave, setHasNewCodeToSave] = useState(false);
  const [params, setParams] = useState([]);
  const [ranges, setRanges] = useState({});
  const [cellSize, setCellSize] = useState(200);
  const [showMultiples, setShowMultiples] = useState(false);
  const [savedVersions, setSavedVersions] = useState(initialVersions);
  const [currentVersionId, setCurrentVersionId] = useState(initialVersionId);
  const [sidebarWidth, setSidebarWidth] = useState(176);
  const [splitSizes, setSplitSizes] = useState([15, 35, 50]);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const sidebarRef = useRef(null);
  const editorRef = useRef(null);
  const editorInstanceRef = useRef(null);
  const editorInitializedRef = useRef(false);
  const pendingVersionToLoadRef = useRef(null);
  const loadedParamsForVersionRef = useRef(null);
  const isSelectingFromMultiplesRef = useRef(false);
  const isSwitchingContextRef = useRef(false);

  // Update local state when props change
  useEffect(() => {
    setSavedVersions(initialVersions);
  }, [initialVersions]);

  useEffect(() => {
    setCurrentVersionId(initialVersionId);
  }, [initialVersionId]);

  // Update sketchType when prop changes
  useEffect(() => {
    setSketchType(providedSketchType);
  }, [providedSketchType]);

  // Update code when initialCode prop changes (e.g., when loading from URL)
  useEffect(() => {
    setCode(providedInitialCode);
    setPreviewCode(providedInitialCode);
    setMultiplesCode(providedInitialCode);
    if (editorInstanceRef.current) {
      editorInstanceRef.current.setCode(providedInitialCode);
    }
  }, [providedInitialCode]);

  // Clear params when switching sketches or examples
  useEffect(() => {
    // Reset the loaded params ref when sketchId or isExample changes
    // This ensures params are properly loaded/cleared when switching contexts
    loadedParamsForVersionRef.current = null;

    // Set flag to ignore stale params updates from editor during context switch
    isSwitchingContextRef.current = true;

    // Immediately clear params state to prevent stale params from showing
    setParams([]);
    setRanges({});
    setShowMultiples(false);

    // Clear editor params if editor is initialized
    if (editorInstanceRef.current) {
      editorInstanceRef.current.setParams([]);
    }

    // Reset flag after a short delay to allow editor updates to complete
    setTimeout(() => {
      isSwitchingContextRef.current = false;
    }, 100);
  }, [sketchId, isExample]);

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

  // Measure sidebar width
  useEffect(() => {
    if (!sidebarRef.current) return;

    const updateWidth = () => {
      if (sidebarRef.current) {
        const width = sidebarRef.current.clientWidth - 32;
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
    setPreviewCode(code);
    setMultiplesCode(code); // Update multiples code when slider is dragged
  }, []);

  const onParamsChange = useCallback(({params, code, type}) => {
    // Ignore params updates during context switching to prevent stale params from showing
    if (isSwitchingContextRef.current) {
      return;
    }

    // When positions are updated due to code edits, update the code state
    // but don't update previewCode or multiplesCode - those only update when user explicitly runs or drags slider
    // This prevents the preview and multiples from automatically rerunning on every code edit
    if (type === "position-update" && code !== undefined) {
      setCode(code);
    }

    setParams(params);
    if (type === "params-update" && !isSelectingFromMultiplesRef.current) {
      setShowMultiples(params.length > 0);
    }

    // Update ranges when params change - initialize missing ranges with defaults
    setRanges((prevRanges) => {
      const newRanges = {...prevRanges};
      params.forEach((param) => {
        const key = getParamKey(param);
        if (!newRanges[key]) {
          const defaultRange = getDefaultRange(param.value, 4);
          newRanges[key] = {
            start: defaultRange.min.toFixed(2),
            end: defaultRange.max.toFixed(2),
            count: defaultRange.count.toString(),
            type: "Float",
          };
        }
      });
      // Remove ranges for params that no longer exist
      Object.keys(newRanges).forEach((key) => {
        if (!params.some((p) => getParamKey(p) === key)) {
          delete newRanges[key];
        }
      });
      return newRanges;
    });
  }, []);

  const onSelect = useCallback(
    ({code, values}) => {
      if (!editorInstanceRef.current || params.length === 0) return;
      isSelectingFromMultiplesRef.current = true;
      editorInstanceRef.current.update(params, values);
      setCode(code);
      setPreviewCode(code);
      setMultiplesCode(code); // Update multiples code when selecting from multiples
      setHasNewCodeToRun(false);
      setShowMultiples(false);
      // Reset the flag after a short delay to allow any pending updates to complete
      setTimeout(() => {
        isSelectingFromMultiplesRef.current = false;
      }, 100);
    },
    [params]
  );

  // Destroy editor when showing whiteboard, reinitialize when hiding whiteboard
  useEffect(() => {
    if (showWhiteboard) {
      // Destroy editor when showing whiteboard
      if (editorInstanceRef.current) {
        editorInstanceRef.current.destroy();
        editorInstanceRef.current = null;
      }
      editorInitializedRef.current = false;
      return;
    }

    // Initialize editor when not showing whiteboard and editor ref is available
    if (!editorRef.current || editorInitializedRef.current) return;

    // Use pending version code if available, otherwise use providedInitialCode
    const codeToLoad = pendingVersionToLoadRef.current?.code || providedInitialCode;

    editorInstanceRef.current = createEditor(editorRef.current, {
      initialCode: codeToLoad,
      sketchType,
      onSave,
      onSliderChange,
      onParamsChange,
    });
    editorInitializedRef.current = true;

    // If there's a pending version to load, load it now
    if (pendingVersionToLoadRef.current) {
      const version = pendingVersionToLoadRef.current;
      editorInstanceRef.current.setCode(version.code);
      setCode(version.code);
      setPreviewCode(version.code);
      setMultiplesCode(version.code);
      setHasNewCodeToRun(false);
      setHasNewCodeToSave(false);
      setCurrentVersionId(version.id);

      // Restore params and ranges if the version has them
      if (version.params && version.params.definitions && version.params.definitions.length > 0) {
        // Use setTimeout to ensure the editor is fully initialized
        setTimeout(() => {
          if (editorInstanceRef.current) {
            editorInstanceRef.current.setParams(version.params.definitions);
          }
        }, 0);
        setParams(version.params.definitions);
        setRanges(version.params.ranges || {});
        setShowMultiples(true);
      } else {
        // Clear params in editor and state when version has no params
        setTimeout(() => {
          if (editorInstanceRef.current) {
            editorInstanceRef.current.setParams([]);
          }
        }, 0);
        setParams([]);
        setRanges({});
        setShowMultiples(false);
      }
      // Restore cell size if the version has it
      if (version.cellSize !== undefined) {
        setCellSize(version.cellSize);
      } else {
        setCellSize(200); // Default value
      }
      loadedParamsForVersionRef.current = version.id;

      if (!isExample && sketchId) {
        setSelectedVersion(sketchId, version.id).catch((err) => {
          console.error("Failed to set selected version:", err);
        });
      }
      pendingVersionToLoadRef.current = null;
    } else if (currentVersionId && savedVersions.length > 0) {
      // Load params from current version if editor was just initialized
      const version = savedVersions.find((v) => v.id === currentVersionId);
      if (version && version.params && version.params.definitions && version.params.definitions.length > 0) {
        // Use setTimeout to ensure the editor is fully initialized
        setTimeout(() => {
          if (editorInstanceRef.current) {
            editorInstanceRef.current.setParams(version.params.definitions);
          }
        }, 0);
        setParams(version.params.definitions);
        setRanges(version.params.ranges || {});
        setShowMultiples(true);
        loadedParamsForVersionRef.current = currentVersionId;
      } else {
        // Clear params if version doesn't have them
        setTimeout(() => {
          if (editorInstanceRef.current) {
            editorInstanceRef.current.setParams([]);
          }
        }, 0);
        setParams([]);
        setRanges({});
        setShowMultiples(false);
        loadedParamsForVersionRef.current = currentVersionId;
      }
      // Restore cell size if the version has it
      if (version && version.cellSize !== undefined) {
        setCellSize(version.cellSize);
      } else {
        setCellSize(200); // Default value
      }
    }

    return () => {
      if (editorInstanceRef.current) {
        editorInstanceRef.current.destroy();
        editorInstanceRef.current = null;
        editorInitializedRef.current = false;
      }
    };
  }, [showWhiteboard, sketchType, onSave, onSliderChange, onParamsChange, providedInitialCode, isExample]);

  // Load params from current version when editor is ready and version data is available
  useEffect(() => {
    if (editorInstanceRef.current && !showWhiteboard) {
      if (currentVersionId && savedVersions.length > 0) {
        // We have a version, check if it has params
        if (loadedParamsForVersionRef.current !== currentVersionId) {
          const version = savedVersions.find((v) => v.id === currentVersionId);
          if (version && version.params && version.params.definitions && version.params.definitions.length > 0) {
            editorInstanceRef.current.setParams(version.params.definitions);
            setParams(version.params.definitions);
            setRanges(version.params.ranges || {});
            setShowMultiples(true);
            loadedParamsForVersionRef.current = currentVersionId;
          } else {
            // Clear params if version doesn't have them
            editorInstanceRef.current.setParams([]);
            setParams([]);
            setRanges({});
            setShowMultiples(false);
            loadedParamsForVersionRef.current = currentVersionId;
          }
          // Restore cell size if the version has it
          if (version && version.cellSize !== undefined) {
            setCellSize(version.cellSize);
          } else {
            setCellSize(200); // Default value
          }
        }
      } else {
        // No version selected, clear params
        if (loadedParamsForVersionRef.current !== null) {
          editorInstanceRef.current.setParams([]);
          setParams([]);
          setRanges({});
          setShowMultiples(false);
          loadedParamsForVersionRef.current = null;
        }
      }
    }
  }, [currentVersionId, savedVersions, showWhiteboard, sketchId, isExample]);

  // Track editor code changes and update button states
  useEffect(() => {
    if (!editorInstanceRef.current || showWhiteboard) return;

    const checkEditorChanges = () => {
      if (!editorInstanceRef.current) return;
      const currentEditorCode = editorInstanceRef.current.getCode();

      // Check if there's new code to run
      // Compare against previewCode (not code) since code gets updated on position updates
      // but previewCode only updates when user explicitly runs
      const needsRun = currentEditorCode !== previewCode;
      setHasNewCodeToRun(needsRun);

      // Check if there's new code or params to save
      let needsSave = false;
      if (currentVersionId) {
        const currentVersion = savedVersions.find((v) => v.id === currentVersionId);
        if (currentVersion) {
          const codeChanged = currentVersion.code !== currentEditorCode;
          const paramsChanged = !paramsEqual(
            params,
            ranges,
            currentVersion.params?.definitions || [],
            currentVersion.params?.ranges || {}
          );
          const cellSizeChanged = (currentVersion.cellSize || 200) !== cellSize;
          needsSave = codeChanged || paramsChanged || cellSizeChanged;
        } else {
          const codeChanged = currentEditorCode !== providedInitialCode;
          const paramsChanged = params.length > 0 || Object.keys(ranges).length > 0;
          needsSave = codeChanged || paramsChanged;
        }
      } else {
        const codeChanged = currentEditorCode !== providedInitialCode;
        const paramsChanged = params.length > 0 || Object.keys(ranges).length > 0;
        needsSave = codeChanged || paramsChanged;
      }
      setHasNewCodeToSave(needsSave);
    };

    checkEditorChanges();
    const interval = setInterval(checkEditorChanges, 500);

    return () => clearInterval(interval);
  }, [previewCode, currentVersionId, savedVersions, showWhiteboard, params, ranges, providedInitialCode]);

  const handleRun = useCallback(() => {
    if (editorInstanceRef.current) {
      const currentCode = editorInstanceRef.current.getCode();
      setCode(currentCode);
      setPreviewCode(currentCode);
      setMultiplesCode(currentCode); // Update multiples code when explicitly run
      setHasNewCodeToRun(false);
    }
  }, []);

  const handleFork = useCallback(async () => {
    if (!isExample) return;

    try {
      const newSketchId = uid();
      const newSketchName = sketchName ? `Fork of ${sketchName}` : generateFriendlyName();

      // Copy all versions from the example
      const forkedVersions = savedVersions.map((version) => ({
        id: version.id,
        parentId: version.parentId,
        code: version.code,
        timestamp: version.timestamp,
        time: version.time,
        name: version.name,
        ...(version.params && {params: version.params}),
      }));

      // Determine the next version ID based on existing versions
      let maxVersionNum = -1;
      for (const version of forkedVersions) {
        const versionNum = parseInt(version.id, 10);
        if (!isNaN(versionNum) && versionNum > maxVersionNum) {
          maxVersionNum = versionNum;
        }
      }

      // Create the new sketch with copied versions
      const newSketch = {
        id: newSketchId,
        name: newSketchName,
        type: sketchType,
        timestamp: new Date().toISOString(),
        versions: forkedVersions,
        selectedVersion: currentVersionId || (forkedVersions.length > 0 ? forkedVersions[0].id : null),
        nextVersionId: maxVersionNum + 1,
      };

      await saveSketch(newSketch);

      // Update parent state and navigate to the new sketch
      onSketchIdChange?.(newSketchId);
      onSketchNameChange?.(newSketchName);
      navigate(`/multiples/sketches/${newSketchId}`);
    } catch (error) {
      console.error("Failed to fork example:", error);
      alert("Failed to fork example. Please try again.");
    }
  }, [isExample, sketchName, savedVersions, currentVersionId, navigate, onSketchIdChange, onSketchNameChange]);

  const handleSave = useCallback(async () => {
    if (!editorInstanceRef.current) return;
    if (isExample) return; // Don't save examples directly

    const currentCode = editorInstanceRef.current.getCode();
    let currentSketchId = sketchId;

    // If no sketch ID, create a new sketch first
    if (!currentSketchId) {
      currentSketchId = uid();
      const newSketchName = sketchName || generateFriendlyName();
      await saveSketch({
        id: currentSketchId,
        name: newSketchName,
        type: sketchType,
        timestamp: new Date().toISOString(),
        versions: [],
        selectedVersion: null,
        nextVersionId: 0,
      });
      onSketchIdChange?.(currentSketchId);
      onSketchNameChange?.(newSketchName);
      navigate(`/multiples/sketches/${currentSketchId}`);
    }

    // If there's a current version, update it
    if (currentVersionId) {
      const currentVersion = savedVersions.find((v) => v.id === currentVersionId);
      if (currentVersion) {
        const codeChanged = currentVersion.code !== currentCode;
        const paramsChanged = !paramsEqual(
          params,
          ranges,
          currentVersion.params?.definitions || [],
          currentVersion.params?.ranges || {}
        );
        const cellSizeChanged = (currentVersion.cellSize || 200) !== cellSize;
        if (!codeChanged && !paramsChanged && !cellSizeChanged) {
          return;
        }

        // Update the existing version
        try {
          const updatedVersion = {
            ...currentVersion,
            code: currentCode,
            timestamp: new Date().toISOString(),
            time: new Date().toLocaleString(),
            ...(params.length > 0
              ? {
                  params: {
                    definitions: params,
                    ranges,
                  },
                }
              : {}),
            cellSize,
          };

          await saveVersion(currentSketchId, updatedVersion);

          const sketch = await getSketch(currentSketchId);
          if (sketch) {
            const updatedVersions = sketch.versions || [];
            setSavedVersions(updatedVersions);
            onVersionsChange?.(updatedVersions);
            setHasNewCodeToSave(false);
          }
        } catch (error) {
          console.error("Failed to save version:", error);
          alert("Failed to save version. Please try again.");
        }
        return;
      }
    }

    // If no current version, create a new one
    try {
      let currentSketch = await getSketch(currentSketchId);
      if (!currentSketch) {
        currentSketch = await saveSketch({
          id: currentSketchId,
          name: sketchName || generateFriendlyName(),
          type: sketchType,
          timestamp: new Date().toISOString(),
          versions: [],
          selectedVersion: null,
          nextVersionId: 0,
        });
      } else {
        // Update sketch type if it changed
        if (currentSketch.type !== sketchType) {
          currentSketch.type = sketchType;
          await saveSketch(currentSketch);
        }
      }

      // Initialize nextVersionId if it doesn't exist
      if (currentSketch.nextVersionId === undefined) {
        const existingVersions = currentSketch.versions || [];
        let maxVersionNum = -1;
        for (const version of existingVersions) {
          const versionNum = parseInt(version.id, 10);
          if (!isNaN(versionNum) && versionNum > maxVersionNum) {
            maxVersionNum = versionNum;
          }
        }
        currentSketch.nextVersionId = maxVersionNum + 1;
        await saveSketch(currentSketch);
      }

      const nextVersionId = String(currentSketch.nextVersionId);
      currentSketch.nextVersionId = currentSketch.nextVersionId + 1;

      const newVersion = {
        id: nextVersionId,
        parentId: currentVersionId,
        code: currentCode,
        timestamp: new Date().toISOString(),
        time: new Date().toLocaleString(),
        name: null,
        ...(params.length > 0
          ? {
              params: {
                definitions: params,
                ranges,
              },
            }
          : {}),
        cellSize,
      };

      await saveSketch(currentSketch);
      await saveVersion(currentSketchId, newVersion);

      const sketch = await getSketch(currentSketchId);
      if (sketch) {
        const updatedVersions = sketch.versions || [];
        setSavedVersions(updatedVersions);
        onVersionsChange?.(updatedVersions);
        setCurrentVersionId(newVersion.id);
        setHasNewCodeToSave(false);
      }
    } catch (error) {
      console.error("Failed to save version:", error);
      alert("Failed to save version. Please try again.");
    }
  }, [
    sketchId,
    sketchName,
    currentVersionId,
    savedVersions,
    isExample,
    navigate,
    onSketchIdChange,
    onSketchNameChange,
    onVersionsChange,
    params,
    ranges,
    sketchType,
  ]);

  const handleDuplicate = useCallback(async () => {
    if (!editorInstanceRef.current) return;
    if (isExample) return; // Don't duplicate examples

    const currentCode = editorInstanceRef.current.getCode();
    const currentSketchId = sketchId;

    if (!currentSketchId) {
      alert("Please save the sketch first before duplicating.");
      return;
    }

    try {
      let currentSketch = await getSketch(currentSketchId);
      if (!currentSketch) {
        alert("Sketch not found.");
        return;
      }

      // Update sketch type if it changed
      if (currentSketch.type !== sketchType) {
        currentSketch.type = sketchType;
        await saveSketch(currentSketch);
      }

      // Initialize nextVersionId if it doesn't exist
      if (currentSketch.nextVersionId === undefined) {
        const existingVersions = currentSketch.versions || [];
        let maxVersionNum = -1;
        for (const version of existingVersions) {
          const versionNum = parseInt(version.id, 10);
          if (!isNaN(versionNum) && versionNum > maxVersionNum) {
            maxVersionNum = versionNum;
          }
        }
        currentSketch.nextVersionId = maxVersionNum + 1;
        await saveSketch(currentSketch);
      }

      const nextVersionId = String(currentSketch.nextVersionId);
      currentSketch.nextVersionId = currentSketch.nextVersionId + 1;

      const newVersion = {
        id: nextVersionId,
        parentId: currentVersionId,
        code: currentCode,
        timestamp: new Date().toISOString(),
        time: new Date().toLocaleString(),
        name: null,
        ...(params.length > 0
          ? {
              params: {
                definitions: params,
                ranges,
              },
            }
          : {}),
        cellSize,
      };

      await saveSketch(currentSketch);
      await saveVersion(currentSketchId, newVersion);

      const sketch = await getSketch(currentSketchId);
      if (sketch) {
        const updatedVersions = sketch.versions || [];
        setSavedVersions(updatedVersions);
        onVersionsChange?.(updatedVersions);
        setCurrentVersionId(newVersion.id);
        setHasNewCodeToSave(false);
        loadedParamsForVersionRef.current = newVersion.id;
      }
    } catch (error) {
      console.error("Failed to duplicate version:", error);
      alert("Failed to duplicate version. Please try again.");
    }
  }, [sketchId, currentVersionId, savedVersions, isExample, onVersionsChange, params, ranges, sketchType]);

  const handleLoadVersion = useCallback(
    async (version) => {
      if (editorInstanceRef.current && sketchId) {
        // Warn if there are unsaved changes
        if (hasNewCodeToSave) {
          const confirmed = window.confirm(
            "You have unsaved changes (code or params). Loading a different version will discard your changes. Are you sure you want to continue?"
          );
          if (!confirmed) {
            return;
          }
        }

        editorInstanceRef.current.setCode(version.code);
        setCode(version.code);
        setPreviewCode(version.code);
        setMultiplesCode(version.code);
        setHasNewCodeToRun(false);
        setHasNewCodeToSave(false);
        setCurrentVersionId(version.id);

        // Restore params and ranges if the version has them
        if (version.params && version.params.definitions && version.params.definitions.length > 0) {
          editorInstanceRef.current.setParams(version.params.definitions);
          setParams(version.params.definitions);
          setRanges(version.params.ranges || {});
          setShowMultiples(true);
        } else {
          // Clear params in editor and state when version has no params
          editorInstanceRef.current.setParams([]);
          setParams([]);
          setRanges({});
          setShowMultiples(false);
        }
        // Restore cell size if the version has it
        if (version.cellSize !== undefined) {
          setCellSize(version.cellSize);
        } else {
          setCellSize(200); // Default value
        }
        loadedParamsForVersionRef.current = version.id;

        if (!isExample) {
          await setSelectedVersion(sketchId, version.id);
        }
      }
    },
    [sketchId, isExample, hasNewCodeToSave]
  );

  const handleDeleteVersion = useCallback(
    async (versionId, e) => {
      e.stopPropagation();
      if (isExample) return; // Don't delete versions from examples
      if (window.confirm("Are you sure you want to delete this version?")) {
        try {
          await deleteVersion(sketchId, versionId);
          const sketch = await getSketch(sketchId);
          if (sketch) {
            const updatedVersions = sketch.versions || [];
            setSavedVersions(updatedVersions);
            onVersionsChange?.(updatedVersions);
            if (currentVersionId === versionId) {
              if (sketch.selectedVersion) {
                const selected = updatedVersions.find((v) => v.id === sketch.selectedVersion);
                if (selected) {
                  setCurrentVersionId(selected.id);
                  if (editorInstanceRef.current) {
                    editorInstanceRef.current.setCode(selected.code);
                    setCode(selected.code);
                    setPreviewCode(selected.code);
                    setMultiplesCode(selected.code);
                  }
                } else if (updatedVersions.length > 0) {
                  setCurrentVersionId(updatedVersions[0].id);
                  if (editorInstanceRef.current) {
                    editorInstanceRef.current.setCode(updatedVersions[0].code);
                    setCode(updatedVersions[0].code);
                    setPreviewCode(updatedVersions[0].code);
                    setMultiplesCode(updatedVersions[0].code);
                  }
                } else {
                  setCurrentVersionId(null);
                }
              } else if (updatedVersions.length > 0) {
                setCurrentVersionId(updatedVersions[0].id);
                if (editorInstanceRef.current) {
                  editorInstanceRef.current.setCode(updatedVersions[0].code);
                  setCode(updatedVersions[0].code);
                  setPreviewCode(updatedVersions[0].code);
                  setMultiplesCode(updatedVersions[0].code);
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
    [sketchId, currentVersionId, isExample, onVersionsChange]
  );

  const handleSaveVersionName = useCallback(
    async (versionId, newName) => {
      if (!sketchId || isExample) return;

      try {
        const version = savedVersions.find((v) => v.id === versionId);
        if (!version) return;

        const updatedVersion = {
          ...version,
          name: newName,
        };

        await saveVersion(sketchId, updatedVersion);

        const sketch = await getSketch(sketchId);
        if (sketch) {
          const updatedVersions = sketch.versions || [];
          setSavedVersions(updatedVersions);
          onVersionsChange?.(updatedVersions);
        }
      } catch (error) {
        console.error("Failed to save version name:", error);
        alert("Failed to save version name. Please try again.");
      }
    },
    [sketchId, savedVersions, isExample, onVersionsChange]
  );

  const handleSplitChange = useCallback(async (sizes) => {
    setSplitSizes(sizes);
    try {
      await setMetadata(SPLIT_SIZES_KEY, sizes);
    } catch (error) {
      console.error("Failed to save split sizes:", error);
    }
  }, []);

  // Listen for Cmd+S / Ctrl+S keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
        handleRun();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleSave, handleRun]);

  // Warn user before leaving page if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasNewCodeToSave) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasNewCodeToSave]);

  const handleWhiteboardClick = useCallback(() => {
    setShowWhiteboard(true);
  }, []);

  const handleCloseWhiteboard = useCallback(() => {
    setShowWhiteboard(false);
  }, []);

  const handleSelectVersionFromWhiteboard = useCallback(
    (version) => {
      // Warn if there are unsaved changes
      if (hasNewCodeToSave) {
        const confirmed = window.confirm(
          "You have unsaved changes (code or params). Loading a different version will discard your changes. Are you sure you want to continue?"
        );
        if (!confirmed) {
          return;
        }
      }

      // Store the version to load after editor reinitializes
      pendingVersionToLoadRef.current = version;
      // Close whiteboard to reinitialize editor
      setShowWhiteboard(false);
    },
    [hasNewCodeToSave]
  );

  if (showWhiteboard) {
    return (
      <main className="h-[calc(100vh-50px)]">
        <Whiteboard
          versions={savedVersions}
          onClose={handleCloseWhiteboard}
          onSelectVersion={handleSelectVersionFromWhiteboard}
        />
      </main>
    );
  }

  return (
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
          onSaveVersionName={handleSaveVersionName}
          onWhiteboardClick={handleWhiteboardClick}
        />
        <EditorPanel
          editorRef={editorRef}
          onRun={handleRun}
          onSave={handleSave}
          onDuplicate={handleDuplicate}
          onFork={handleFork}
          sketchName={sketchName}
          onSaveName={handleSaveName}
          hasNewCodeToRun={hasNewCodeToRun}
          hasNewCodeToSave={hasNewCodeToSave}
          isExample={isExample}
        />
        <PreviewPanel
          showMultiples={showMultiples}
          code={multiplesCode}
          previewCode={previewCode}
          params={params}
          ranges={ranges}
          onRangesChange={setRanges}
          cellSize={cellSize}
          onCellSizeChange={setCellSize}
          sketchType={sketchType}
          onToggleMultiples={setShowMultiples}
          onSelect={onSelect}
          sketchId={sketchId}
          currentVersionId={currentVersionId}
        />
      </Split>
    </main>
  );
}
