import {useRef, useEffect} from "react";
import {createEditor} from "./createEditor.js";

export function Editor({code, onSave}) {
  const editorRef = useRef(null);

  useEffect(() => {
    if (!editorRef.current) return;
    const {destroy} = createEditor(editorRef.current, {initialCode: code, onSave});
    return () => {
      destroy();
    };
  }, []);

  return <div ref={editorRef} />;
}
