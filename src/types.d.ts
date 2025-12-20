/**
 * Type definitions for Recho Multiples
 * These types serve as documentation for the data structure
 */

/**
 * A version represents a saved state of code
 */
export interface Version {
  /** Unique identifier for the version */
  id: string;
  /** ID of the parent version this was derived from (null for root versions) */
  parentId: string | null;
  /** ISO timestamp when the version was created */
  timestamp: string;
  /** Human-readable timestamp */
  time: string;
  /** Optional name for the version (user-provided) */
  name: string | null;
  /** The code content of this version */
  code: string;
}

/**
 * A sketch is a collection of versions with a selected version
 */
export interface Sketch {
  /** Unique identifier for the sketch */
  id: string;
  /** Friendly name for the sketch (generated or user-provided) */
  name: string;
  /** ISO timestamp when the sketch was created */
  timestamp: string;
  /** Array of all versions in this sketch */
  versions: Version[];
  /** ID of the currently selected version (null if no version is selected) */
  selectedVersion: string | null;
  /** Next version ID counter (always increments, never reused) */
  nextVersionId?: number;
}

/**
 * Metadata stored in localStorage
 */
export interface Metadata {
  [key: string]: any;
}

