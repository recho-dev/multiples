/**
 * IndexedDB storage for version control
 * Stores all versions directly with full code
 */

const DB_NAME = "recho-multiples-db";
const DB_VERSION = 1;
const STORE_VERSIONS = "versions";
const STORE_METADATA = "metadata";

/**
 * Initialize IndexedDB
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create versions store
      if (!db.objectStoreNames.contains(STORE_VERSIONS)) {
        const versionStore = db.createObjectStore(STORE_VERSIONS, {keyPath: "id"});
        versionStore.createIndex("timestamp", "timestamp", {unique: false});
        versionStore.createIndex("parentId", "parentId", {unique: false});
      }

      // Create metadata store
      if (!db.objectStoreNames.contains(STORE_METADATA)) {
        db.createObjectStore(STORE_METADATA, {keyPath: "key"});
      }
    };
  });
}

/**
 * Load all versions from IndexedDB
 */
export async function loadVersions() {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_VERSIONS], "readonly");
    const store = transaction.objectStore(STORE_VERSIONS);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const versions = request.result || [];

        // Sort by timestamp descending (newest first)
        versions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        resolve(versions);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to load versions from IndexedDB:", error);
    return [];
  }
}

/**
 * Save a new version
 */
export async function saveVersion(version) {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_VERSIONS], "readwrite");
    const store = transaction.objectStore(STORE_VERSIONS);

    const versionToStore = {
      id: version.id,
      parentId: version.parentId || null,
      timestamp: version.timestamp,
      time: version.time,
      name: version.name,
      code: version.code,
    };

    await store.put(versionToStore);
    return versionToStore;
  } catch (error) {
    console.error("Failed to save version to IndexedDB:", error);
    throw error;
  }
}

/**
 * Save multiple versions (for migration)
 */
export async function saveVersions(versions) {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_VERSIONS], "readwrite");
    const store = transaction.objectStore(STORE_VERSIONS);

    // Store all versions with full code
    await Promise.all(
      versions.map((version) =>
        store.put({
          id: version.id,
          parentId: version.parentId || null,
          timestamp: version.timestamp,
          time: version.time,
          name: version.name,
          code: version.code,
        })
      )
    );
  } catch (error) {
    console.error("Failed to save versions to IndexedDB:", error);
    throw error;
  }
}

/**
 * Delete a version
 */
export async function deleteVersion(versionId) {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_VERSIONS], "readwrite");
    const store = transaction.objectStore(STORE_VERSIONS);
    await store.delete(versionId);
  } catch (error) {
    console.error("Failed to delete version from IndexedDB:", error);
    throw error;
  }
}

/**
 * Get metadata (like split sizes)
 */
export async function getMetadata(key) {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_METADATA], "readonly");
    const store = transaction.objectStore(STORE_METADATA);
    const request = store.get(key);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        resolve(request.result ? request.result.value : null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to get metadata from IndexedDB:", error);
    return null;
  }
}

/**
 * Set metadata
 */
export async function setMetadata(key, value) {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_METADATA], "readwrite");
    const store = transaction.objectStore(STORE_METADATA);
    await store.put({key, value});
  } catch (error) {
    console.error("Failed to set metadata in IndexedDB:", error);
    throw error;
  }
}
