import {useState, useEffect, useCallback} from "react";

// Custom hook to get current route
export function useRoute() {
  const [route, setRoute] = useState(() => {
    const path = window.location.pathname;
    const sketchMatch = path.match(/\/multiples\/sketches\/([^/]+)/);
    const exampleMatch = path.match(/\/multiples\/examples\/([^/]+)/);
    if (sketchMatch) {
      return {id: sketchMatch[1], type: "sketch"};
    } else if (exampleMatch) {
      return {id: exampleMatch[1], type: "example"};
    }
    return {id: null, type: null};
  });

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const sketchMatch = path.match(/\/multiples\/sketches\/([^/]+)/);
      const exampleMatch = path.match(/\/multiples\/examples\/([^/]+)/);
      if (sketchMatch) {
        setRoute({id: sketchMatch[1], type: "sketch"});
      } else if (exampleMatch) {
        setRoute({id: exampleMatch[1], type: "example"});
      } else {
        setRoute({id: null, type: null});
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = useCallback((path, options) => {
    if (options?.replace) {
      window.history.replaceState({}, "", path);
    } else {
      window.history.pushState({}, "", path);
    }
    const sketchMatch = path.match(/\/multiples\/sketches\/([^/]+)/);
    const exampleMatch = path.match(/\/multiples\/examples\/([^/]+)/);
    if (sketchMatch) {
      setRoute({id: sketchMatch[1], type: "sketch"});
    } else if (exampleMatch) {
      setRoute({id: exampleMatch[1], type: "example"});
    } else {
      setRoute({id: null, type: null});
    }
  }, []);

  return {id: route.id, type: route.type, navigate};
}
