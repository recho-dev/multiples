import {EditableName} from "./EditableName.jsx";

export function EditorPanel({editorRef, onRun, onSave, sketchName, onSaveName}) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 p-2 border-b border-dashed border-gray-200">
        <button
          onClick={onRun}
          className="w-10 h-10 bg-black hover:bg-gray-800 text-white rounded-full flex items-center justify-center transition-colors p-2 cursor-pointer"
          title="Run"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
        <button
          onClick={onSave}
          className="w-10 h-10 bg-black hover:bg-gray-800 text-white rounded-full flex items-center justify-center transition-colors p-2 cursor-pointer"
          title="Save"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
        </button>
        {sketchName && <EditableName name={sketchName} onSave={onSaveName} />}
      </div>
      <div ref={editorRef} className="flex-1" />
    </div>
  );
}

