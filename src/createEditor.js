import {javascript} from "@codemirror/lang-javascript";
import {EditorView, basicSetup} from "codemirror";
import {indentWithTab} from "@codemirror/commands";
import {keymap} from "@codemirror/view";

function createEditor(parent, {initialCode = "", onSave = () => {}} = {}) {
  const editor = new EditorView({
    parent,
    extensions: [
      basicSetup,
      javascript(),
      keymap.of([
        {
          key: "Mod-s",
          run: handleSave,
          preventDefault: true,
        },
        indentWithTab,
      ]),
    ],
    doc: initialCode,
  });

  function handleSave(view) {
    onSave(view.state.doc.toString());
  }

  return {
    editor,
    destroy: () => editor.destroy(),
  };
}

export {createEditor};
