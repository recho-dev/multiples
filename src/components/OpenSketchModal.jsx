export function OpenSketchModal({sketches, onSelect, onDelete, onClose}) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{backgroundColor: "rgba(0, 0, 0, 0.8)"}}
    >
      <div className="bg-white  p-6 max-w-md w-full mx-4 relative max-h-[80vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          title="Close"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <h2 className="text-lg font-semibold mb-4">Open Sketch</h2>
        {sketches.length === 0 ? (
          <p className="text-gray-500">No sketches available</p>
        ) : (
          <div className="space-y-2">
            {sketches.map((sketch) => (
              <div
                key={sketch.id}
                className="w-full px-4 py-3 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors flex items-center justify-between group"
              >
                <button onClick={() => onSelect(sketch)} className="flex-1 text-left">
                  <div className="font-medium">{sketch.name}</div>
                  <div className="text-xs text-gray-500">{new Date(sketch.timestamp).toLocaleString()}</div>
                </button>
                <button
                  onClick={(e) => onDelete(sketch.id, e)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                  title="Delete sketch"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

