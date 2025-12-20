import {Decoration, ViewPlugin, EditorView} from "@codemirror/view";
import {paramsStateField} from "./slider.js";

const numberDeco = Decoration.mark({class: "cm-number"});
const selectedNumberDeco = Decoration.mark({class: "cm-number cm-number-selected"});

const numberHighlightPlugin = ViewPlugin.fromClass(
  class {
    constructor(view) {
      this.decorations = this.buildDeco(view);
    }

    update(update) {
      if (
        update.docChanged ||
        update.viewportChanged ||
        update.state.field(paramsStateField, false) !== update.startState.field(paramsStateField, false)
      ) {
        this.decorations = this.buildDeco(update.view);
      }
    }

    buildDeco(view) {
      const ranges = [];
      const params = view.state.field(paramsStateField, false) || [];
      const numberRegex = /-?\d+\.?\d*/g;

      // Create a set of param positions for quick lookup
      const paramPositions = new Set();
      for (const param of params) {
        paramPositions.add(`${param.from}-${param.to}`);
      }

      for (const {from, to} of view.visibleRanges) {
        const text = view.state.doc.sliceString(from, to);
        numberRegex.lastIndex = 0;
        let m;
        while ((m = numberRegex.exec(text))) {
          const start = from + m.index;
          const end = start + m[0].length;
          const isSelected = paramPositions.has(`${start}-${end}`);
          ranges.push((isSelected ? selectedNumberDeco : numberDeco).range(start, end));
        }
      }
      return Decoration.set(ranges, true);
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);

const numberStyles = EditorView.theme({
  ".cm-number": {
    "border-bottom": "1px dotted #999",
  },
  ".cm-number-selected": {
    border: "1px solid #0066cc",
    "border-radius": "2px",
    padding: "0 1px",
    "background-color": "rgba(0, 102, 204, 0.1)",
  },
});

export function numberHighlight() {
  return [numberHighlightPlugin, numberStyles];
}
