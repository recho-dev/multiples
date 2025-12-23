import {useState, useRef, useEffect} from "react";

export function Header({
  isFullscreen,
  onNewSketch,
  onOpenSketch,
  onExamples,
  onDownloadAll,
  hasVersions,
  onFullscreen,
}) {
  const [showNewDropdown, setShowNewDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNewDropdown(false);
      }
    };

    if (showNewDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showNewDropdown]);

  const handleNewSketchSelect = (type) => {
    setShowNewDropdown(false);
    onNewSketch(type);
  };

  return (
    <header className="h-[50px] flex flex-col justify-center px-4 py-2 border-b border-gray-200 bg-black relative">
      {!isFullscreen && (
        <button
          onClick={onFullscreen}
          className="absolute top-2 right-4 p-2 text-white hover:bg-gray-800 rounded transition-colors cursor-pointer"
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
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowNewDropdown(!showNewDropdown)}
              className="px-3 py-1.5 text-white hover:bg-gray-800 rounded transition-colors text-sm cursor-pointer"
              title="New Sketch"
            >
              New
            </button>
            {showNewDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded shadow-lg z-50 min-w-[160px]">
                <button
                  onClick={() => handleNewSketchSelect("p5")}
                  className="w-full text-left px-3 py-2 text-white hover:bg-gray-700 text-sm block cursor-pointer"
                >
                  p5
                </button>
                <button
                  onClick={() => handleNewSketchSelect("webgl2")}
                  className="w-full text-left px-3 py-2 text-white hover:bg-gray-700 text-sm block cursor-pointer"
                >
                  WebGL2 Shader
                </button>
              </div>
            )}
          </div>
          <button
            onClick={onOpenSketch}
            className="px-3 py-1.5 text-white hover:bg-gray-800 rounded transition-colors text-sm cursor-pointer"
            title="Open Sketch"
          >
            Open
          </button>
          <button
            onClick={onExamples}
            className="px-3 py-1.5 text-white hover:bg-gray-800 rounded transition-colors text-sm cursor-pointer"
            title="Examples"
          >
            Examples
          </button>
          {hasVersions && (
            <button
              onClick={onDownloadAll}
              className="px-3 py-1.5 text-white hover:bg-gray-800 rounded transition-colors text-sm cursor-pointer"
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
