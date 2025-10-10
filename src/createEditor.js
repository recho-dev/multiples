import {javascript} from "@codemirror/lang-javascript";
import {EditorView, basicSetup} from "codemirror";

function createEditor(parent, {initialCode = ""} = {}) {
  const editor = new EditorView({
    parent,
    extensions: [basicSetup, javascript()],
    doc: initialCode,
  });
  return {
    editor,
    destroy: () => editor.destroy(),
  };
}

export {createEditor};
