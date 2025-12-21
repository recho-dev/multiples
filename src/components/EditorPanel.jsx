import {EditableName} from "./EditableName.jsx";

export function EditorPanel({editorRef, onRun, onSave, onFork, sketchName, onSaveName, hasNewCodeToRun, hasNewCodeToSave, isExample}) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 p-2 border-b border-dashed border-gray-200">
        <button
          onClick={onRun}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors p-2 cursor-pointer ${
            hasNewCodeToRun
              ? "bg-black hover:bg-gray-800 text-white"
              : "bg-gray-300 hover:bg-gray-400 text-gray-600"
          }`}
          title="Run"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
        {isExample ? (
          <button
            onClick={onFork}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-colors p-2 cursor-pointer bg-black hover:bg-gray-800 text-white"
            title="Fork"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="18" r="3" />
              <circle cx="6" cy="6" r="3" />
              <path d="M13 6h3a2 2 0 0 1 2 2v7" />
              <path d="M11 18H8a2 2 0 0 1-2-2V9" />
            </svg>
          </button>
        ) : (
          <button
            onClick={onSave}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors p-2 cursor-pointer ${
              hasNewCodeToSave
                ? "bg-black hover:bg-gray-800 text-white"
                : "bg-gray-300 hover:bg-gray-400 text-gray-600"
            }`}
            title="Save"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
          </button>
        )}
        {sketchName && <EditableName name={sketchName} onSave={onSaveName} />}
      </div>
      <div ref={editorRef} className="flex-1" />
    </div>
  );
}

