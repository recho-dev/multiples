import {javascript, esLint} from "@codemirror/lang-javascript";
import {EditorView, basicSetup} from "codemirror";
import {indentWithTab} from "@codemirror/commands";
import {keymap} from "@codemirror/view";
import {numberSlider, ANNO_SLIDER_UPDATE} from "./slider.js";
import {numberHighlight} from "./number.js";
import * as d3 from "d3";
import {linter} from "@codemirror/lint";
import * as eslint from "eslint-linter-browserify";
import {browser} from "globals";

const eslintConfig = {
  languageOptions: {
    globals: {
      ...browser,
    },
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
  },
};

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
      numberHighlight(),
      keymap.of([
        {
          key: "Mod-s",
          run: handleSave,
          preventDefault: true,
        },
        indentWithTab,
      ]),
      EditorView.updateListener.of(handleSliderChange),
      linter(esLint(new eslint.Linter(), eslintConfig)),
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

  function handleUpdate(params, values) {
    const I = Array.from({length: params.length}, (_, i) => i);
    const sortedI = d3.sort(I, (a, b) => params[b].from - params[a].from);
    const changes = sortedI.map((i) => {
      const {from, to} = params[i];
      const newValue = values[i];
      return {from, to, insert: newValue};
    });
    editor.dispatch({changes});
  }

  function setCode(newCode) {
    editor.dispatch({
      changes: {from: 0, to: editor.state.doc.length, insert: newCode},
    });
  }

  return {
    editor,
    destroy: () => editor.destroy(),
    update: handleUpdate,
    getCode: () => editor.state.doc.toString(),
    setCode,
  };
}

export {createEditor};
