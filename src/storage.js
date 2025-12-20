/**
 * localStorage storage for version control
 * Sketches contain versions array and selectedVersion field
 */

const STORAGE_KEY_SKETCHES = "recho-multiples-sketches";
const STORAGE_KEY_METADATA = "recho-multiples-metadata";

/**
 * Load all sketches from localStorage
 */
export async function loadSketches() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SKETCHES);
    if (!saved) {
      return [];
    }
    const sketches = JSON.parse(saved);
    // Sort by timestamp descending (newest first)
    sketches.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return sketches;
  } catch (error) {
    console.error("Failed to load sketches from localStorage:", error);
    return [];
  }
}

/**
 * Get a sketch by ID
 */
export async function getSketch(sketchId) {
  try {
    const sketches = await loadSketches();
    return sketches.find((s) => s.id === sketchId) || null;
  } catch (error) {
    console.error("Failed to get sketch from localStorage:", error);
    return null;
  }
}

/**
 * Save a sketch (with versions array and selectedVersion)
 */
export async function saveSketch(sketch) {
  try {
    const sketches = await loadSketches();
    const existingIndex = sketches.findIndex((s) => s.id === sketch.id);
    if (existingIndex >= 0) {
      sketches[existingIndex] = sketch;
    } else {
      sketches.push(sketch);
    }
    localStorage.setItem(STORAGE_KEY_SKETCHES, JSON.stringify(sketches));
    return sketch;
  } catch (error) {
    console.error("Failed to save sketch to localStorage:", error);
    throw error;
  }
}

/**
 * Delete a sketch
 */
export async function deleteSketch(sketchId) {
  try {
    const sketches = await loadSketches();
    const filtered = sketches.filter((s) => s.id !== sketchId);
    localStorage.setItem(STORAGE_KEY_SKETCHES, JSON.stringify(filtered));
  } catch (error) {
    console.error("Failed to delete sketch from localStorage:", error);
    throw error;
  }
}

/**
 * Add a version to a sketch
 */
export async function saveVersion(sketchId, version) {
  try {
    const sketch = await getSketch(sketchId);
    if (!sketch) {
      throw new Error(`Sketch ${sketchId} not found`);
    }

    // Ensure versions array exists
    if (!sketch.versions) {
      sketch.versions = [];
    }

    const versionToStore = {
      id: version.id,
      parentId: version.parentId || null,
      timestamp: version.timestamp,
      time: version.time,
      name: version.name,
      code: version.code,
    };

    // Add or update version
    const existingIndex = sketch.versions.findIndex((v) => v.id === versionToStore.id);
    if (existingIndex >= 0) {
      sketch.versions[existingIndex] = versionToStore;
    } else {
      sketch.versions.push(versionToStore);
      // Sort versions by timestamp descending (newest first)
      sketch.versions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Update nextVersionId if this is a new version with a numeric ID
      const versionNum = parseInt(versionToStore.id, 10);
      if (!isNaN(versionNum)) {
        const currentNextId = sketch.nextVersionId ?? 0;
        // Only update if the new version ID is >= current counter
        if (versionNum >= currentNextId) {
          sketch.nextVersionId = versionNum + 1;
        }
      }
    }

    // Update selectedVersion to the newly saved version
    sketch.selectedVersion = versionToStore.id;

    await saveSketch(sketch);
    return versionToStore;
  } catch (error) {
    console.error("Failed to save version to sketch:", error);
    throw error;
  }
}

/**
 * Delete a version from a sketch
 */
export async function deleteVersion(sketchId, versionId) {
  try {
    const sketch = await getSketch(sketchId);
    if (!sketch) {
      throw new Error(`Sketch ${sketchId} not found`);
    }

    if (!sketch.versions) {
      return;
    }

    sketch.versions = sketch.versions.filter((v) => v.id !== versionId);

    // If deleted version was selected, select the first remaining version or null
    if (sketch.selectedVersion === versionId) {
      if (sketch.versions.length > 0) {
        sketch.selectedVersion = sketch.versions[0].id;
      } else {
        sketch.selectedVersion = null;
      }
    }

    await saveSketch(sketch);
  } catch (error) {
    console.error("Failed to delete version from sketch:", error);
    throw error;
  }
}

/**
 * Set selected version for a sketch
 */
export async function setSelectedVersion(sketchId, versionId) {
  try {
    const sketch = await getSketch(sketchId);
    if (!sketch) {
      throw new Error(`Sketch ${sketchId} not found`);
    }

    sketch.selectedVersion = versionId;
    await saveSketch(sketch);
  } catch (error) {
    console.error("Failed to set selected version:", error);
    throw error;
  }
}

/**
 * Get metadata (like split sizes)
 */
export async function getMetadata(key) {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_METADATA);
    if (!saved) {
      return null;
    }
    const metadata = JSON.parse(saved);
    return metadata[key] || null;
  } catch (error) {
    console.error("Failed to get metadata from localStorage:", error);
    return null;
  }
}

/**
 * Set metadata
 */
export async function setMetadata(key, value) {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_METADATA);
    const metadata = saved ? JSON.parse(saved) : {};
    metadata[key] = value;
    localStorage.setItem(STORAGE_KEY_METADATA, JSON.stringify(metadata));
  } catch (error) {
    console.error("Failed to set metadata in localStorage:", error);
    throw error;
  }
}
