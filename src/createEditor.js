import {javascript} from "@codemirror/lang-javascript";
import {EditorView, basicSetup} from "codemirror";
import {indentWithTab} from "@codemirror/commands";
import {keymap} from "@codemirror/view";
import {numberSlider} from "./slider.js";

function createEditor(parent, {initialCode = "", onSave = () => {}, onChange = () => {}} = {}) {
  const editor = new EditorView({
    parent,
    extensions: [
      basicSetup,
      javascript(),
      numberSlider(),
      keymap.of([
        {
          key: "Mod-s",
          run: handleSave,
          preventDefault: true,
        },
        indentWithTab,
      ]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChange(update.state.doc.toString());
        }
      }),
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
