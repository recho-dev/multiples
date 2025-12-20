import {useState, useEffect, useCallback} from "react";

// Custom hook to get current route
export function useRoute() {
  const [route, setRoute] = useState(() => {
    const path = window.location.pathname;
    const match = path.match(/\/multiples\/sketches\/([^/]+)/);
    return match ? {id: match[1]} : {id: null};
  });

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const match = path.match(/\/multiples\/sketches\/([^/]+)/);
      setRoute(match ? {id: match[1]} : {id: null});
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = useCallback((path) => {
    window.history.pushState({}, "", path);
    const match = path.match(/\/multiples\/sketches\/([^/]+)/);
    setRoute(match ? {id: match[1]} : {id: null});
  }, []);

  return {id: route.id, navigate};
}
