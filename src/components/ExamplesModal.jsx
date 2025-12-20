export function ExamplesModal({examples, onSelect, onClose}) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{backgroundColor: "rgba(0, 0, 0, 0.8)"}}
      onClick={onClose}
    >
      <div 
        className="bg-white p-6 max-w-6xl w-full mx-4 relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
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
        <h2 className="text-lg font-semibold mb-4">Examples</h2>
        {examples.length === 0 ? (
          <p className="text-gray-500">No examples available</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {examples.map((example) => (
              <button
                key={example.id}
                onClick={() => onSelect(example)}
                className="p-4 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors text-left rounded"
              >
                <div className="font-medium mb-1">{example.name}</div>
                <div className="text-xs text-gray-500">
                  {example.versions?.length || 0} version{example.versions?.length !== 1 ? "s" : ""}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

