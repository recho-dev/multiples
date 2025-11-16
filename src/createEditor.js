import {javascript} from "@codemirror/lang-javascript";
import {EditorView, basicSetup} from "codemirror";
import {indentWithTab} from "@codemirror/commands";
import {keymap} from "@codemirror/view";
import {numberSlider, ANNO_SLIDER_UPDATE} from "./slider.js";

function createEditor(
  parent,
  {initialCode = "", onSave = () => {}, onSliderChange = () => {}, onParamsChange = () => {}} = {}
) {
  const editor = new EditorView({
    parent,
    extensions: [
      basicSetup,
      javascript(),
      numberSlider(onParamsChange),
      keymap.of([
        {
          key: "Mod-s",
          run: handleSave,
          preventDefault: true,
        },
        indentWithTab,
      ]),
      EditorView.updateListener.of(handleSliderChange),
    ],
    doc: initialCode,
  });

  function handleSliderChange(update) {
    const isSliderUpdate = update.transactions.some((tr) => tr.annotation(ANNO_SLIDER_UPDATE));
    if (update.docChanged && isSliderUpdate) {
      onSliderChange(update.state.doc.toString());
    }
  }

  function handleSave(view) {
    onSave(view.state.doc.toString());
  }

  return {
    editor,
    destroy: () => editor.destroy(),
  };
}

export {createEditor};
