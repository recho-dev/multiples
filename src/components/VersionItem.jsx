import {forwardRef, useState, useRef, useEffect} from "react";
import {Sketch} from "./Sketch.jsx";
import {clsx} from "../clsx.js";

export const VersionItem = forwardRef(function VersionItem(
  {version, isCurrent, width, onLoad, onDelete, onSaveName},
  ref
) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(version.name || "");
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleClick = (e) => {
    // Don't trigger edit if clicking on delete button or sketch
    if (e.target.closest("button") || e.target.closest(".sketch-container")) {
      return;
    }
    setIsEditing(true);
    setEditValue(version.name || "");
  };

  const handleSave = () => {
    const trimmedValue = editValue.trim();
    onSaveName?.(version.id, trimmedValue || null);
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setEditValue(version.name || "");
    }
  };

  const displayText = version.name || version.time;

  return (
    <div
      ref={ref}
      className={clsx(
        "rounded cursor-pointer transition-all border-2 overflow-hidden group relative",
        isCurrent
          ? "bg-blue-50 border-blue-600 shadow-md ring-2 ring-blue-400"
          : "border-transparent hover:border-gray-300 hover:bg-gray-50"
      )}
      title={version.code.substring(0, 50) + "..."}
    >
      <div onClick={() => onLoad(version)} className="w-full relative sketch-container">
        <Sketch code={version.code} width={width} />
      </div>
      <div className="px-2 py-1 text-xs text-gray-500 cursor-text hover:bg-gray-100 rounded" onClick={handleClick}>
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="w-full bg-white border border-blue-500 rounded px-1 py-0.5 text-xs"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          displayText
        )}
      </div>
      <button
        onClick={(e) => onDelete(version.id, e)}
        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1.5 bg-white hover:bg-red-100 rounded shadow-sm transition-opacity"
        title="Delete version"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </button>
    </div>
  );
});
