export function Header({isFullscreen, onNewSketch, onOpenSketch, onDownloadAll, hasVersions, onFullscreen}) {
  return (
    <header className="h-[50px] flex flex-col justify-center px-4 py-2 border-b border-gray-200 bg-black relative">
      {!isFullscreen && (
        <button
          onClick={onFullscreen}
          className="absolute top-2 right-4 p-2 text-white hover:bg-gray-800 rounded transition-colors"
          title="Enter fullscreen"
          aria-label="Enter fullscreen"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
          </svg>
        </button>
      )}
      <div className="flex items-center gap-3">
        <h1 className="font-mono text-lg text-white">
          <strong>Recho Multiples</strong>
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={onNewSketch}
            className="px-3 py-1.5 text-white hover:bg-gray-800 rounded transition-colors text-sm"
            title="New Sketch"
          >
            New
          </button>
          <button
            onClick={onOpenSketch}
            className="px-3 py-1.5 text-white hover:bg-gray-800 rounded transition-colors text-sm"
            title="Open Sketch"
          >
            Open
          </button>
          {hasVersions && (
            <button
              onClick={onDownloadAll}
              className="px-3 py-1.5 text-white hover:bg-gray-800 rounded transition-colors text-sm"
              title="Download all versions"
            >
              Download
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

