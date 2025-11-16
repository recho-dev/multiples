import {EditorView, ViewPlugin} from "@codemirror/view";
import {Annotation, Facet} from "@codemirror/state";

// Define a annotation to label the slider change transaction.
export const ANNO_SLIDER_UPDATE = Annotation.define();

// Define a facet to provide the params change callback.
const paramsFacet = Facet.define({combine: (values) => values[0] || (() => {})});

const numberRegex = /-?\d+\.?\d*/g;

// Find a number on a specific line in the editor based on a given cursor or
// mouse position.
function findNumberAt(view, pos) {
  const line = view.state.doc.lineAt(pos);
  const text = line.text;
  const offset = pos - line.from;
  let match;
  while ((match = numberRegex.exec(text)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    if (offset >= start && offset <= end) {
      return {
        from: line.from + start,
        to: line.from + end,
        value: match[0],
      };
    }
  }
  return null;
}

function createSliderPopup(number, onChange, onClose, onCheckboxChange, isChecked) {
  const popup = document.createElement("div");
  popup.className = "cm-number-slider-popup";

  const container = document.createElement("div");
  container.className = "cm-slider-container";

  const valueDisplay = document.createElement("input");
  valueDisplay.type = "number";
  valueDisplay.className = "cm-slider-value";
  valueDisplay.value = parseFloat(number.value);
  valueDisplay.step = "any";

  const slider = document.createElement("input");
  slider.type = "range";
  slider.className = "cm-slider";

  const currentValue = parseFloat(number.value);
  let [min, max] = [0, currentValue * 2];
  if (currentValue === 0) [min, max] = [0, 100];
  if (min > max) [min, max] = [max, min];

  slider.min = min;
  slider.max = max;
  slider.step = (max - min) / 20;
  slider.value = currentValue;

  slider.addEventListener("input", (e) => {
    const newValue = parseFloat(e.target.value);
    valueDisplay.value = newValue;
    onChange(newValue);
  });

  valueDisplay.addEventListener("input", (e) => {
    const newValue = parseFloat(e.target.value);
    if (!isNaN(newValue)) {
      slider.value = newValue;
      onChange(newValue);
    }
  });

  popup.addEventListener("mousedown", (e) => {
    e.stopPropagation();
  });

  const closeButton = document.createElement("button");
  closeButton.className = "cm-slider-close";
  closeButton.textContent = "×";
  closeButton.addEventListener("click", onClose);

  const checkboxContainer = document.createElement("div");
  checkboxContainer.className = "cm-slider-checkbox-container";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.id = "show-details-checkbox";
  checkbox.className = "cm-slider-checkbox";
  checkbox.checked = isChecked;

  const label = document.createElement("label");
  label.htmlFor = "show-details-checkbox";
  label.textContent = "Show in multiples";
  label.className = "cm-slider-checkbox-label";

  checkbox.addEventListener("change", (e) => {
    onCheckboxChange(e.target.checked);
  });

  checkboxContainer.appendChild(checkbox);
  checkboxContainer.appendChild(label);

  container.appendChild(valueDisplay);
  container.appendChild(slider);
  container.appendChild(checkboxContainer);
  popup.appendChild(container);
  popup.appendChild(closeButton);

  return popup;
}

const numberSliderPlugin = ViewPlugin.fromClass(
  class {
    constructor(view) {
      this.view = view;
      this.popup = null;
      this.activeNumber = null;
      this.mouseDownPos = null;
      this.params = [];
      this.onParamsChange = view.state.facet(paramsFacet);
      this.mousedown = this.mousedown.bind(this);
      this.mouseup = this.mouseup.bind(this);
      view.dom.addEventListener("mousedown", this.mousedown);
      view.dom.addEventListener("mouseup", this.mouseup);
    }

    update(update) {
      if (update.docChanged) {
        this.updateParamPositions(update);
        const hasSliderUpdate = update.transactions.some((tr) => tr.annotation(ANNO_SLIDER_UPDATE));
        if (this.popup && !hasSliderUpdate) this.closePopup();
      }
    }

    updateParamPositions(update) {
      const newParams = [];

      for (const param of this.params) {
        // Map the old positions through the changes.
        let newFrom = param.from;
        let newTo = param.to;
        for (const tr of update.transactions) {
          newFrom = tr.changes.mapPos(newFrom, -1); // -1 to stick before insertions.
          newTo = tr.changes.mapPos(newTo, 1); // 1 to stick after insertions.
        }

        // Check if the position is still valid. If not, skip this param.
        if (newFrom < 0 || newTo > update.state.doc.length || newFrom >= newTo) continue;

        // Get the text at the new position.
        const text = update.state.doc.sliceString(newFrom, newTo);

        // Check if it's still a valid number.
        if (numberRegex.test(text)) newParams.push({from: newFrom, to: newTo, value: text});

        // Otherwise, the param was deleted or modified, so  skip it
      }

      this.params = newParams;
      this.onParamsChange({params: this.params, code: update.state.doc.toString()});
    }

    mousedown(event) {
      this.mouseDownPos = {x: event.clientX, y: event.clientY};
    }

    mouseup(event) {
      const currentPos = {x: event.clientX, y: event.clientY};
      const distance = Math.hypot(currentPos.x - this.mouseDownPos.x, currentPos.y - this.mouseDownPos.y);
      if (distance > 5) return;
      this.closePopup();
      const pos = this.view.posAtCoords({x: event.clientX, y: event.clientY});
      if (pos === null) return;
      const number = findNumberAt(this.view, pos);
      if (!number) return;
      event.preventDefault();
      this.showPopup(number);
    }

    showPopup(number) {
      this.closePopup();

      this.activeNumber = number;

      const onChange = (newValue) => {
        // Format the number (remove trailing zeros for decimals)
        let formattedValue = String(newValue);
        if (formattedValue.includes(".")) formattedValue = parseFloat(formattedValue).toString();
        this.view.dispatch({
          changes: {
            from: this.activeNumber.from,
            to: this.activeNumber.to,
            insert: formattedValue,
          },
          annotations: ANNO_SLIDER_UPDATE.of(true),
        });
        const diff = formattedValue.length - this.activeNumber.value.length;
        this.activeNumber.to += diff;
        this.activeNumber.value = formattedValue;
      };

      const onClose = () => this.closePopup();

      const onCheckboxChange = (checked) => {
        if (checked) {
          const param = {from: number.from, to: number.to, value: number.value};
          this.params.push(param);
        } else {
          this.params = this.params.filter((p) => !(p.from === number.from && p.to === number.to));
        }
        this.params = [...this.params];
        this.onParamsChange({params: this.params, code: this.view.state.doc.toString()});
      };

      const isChecked = this.params.some((p) => p.from === number.from && p.to === number.to);

      this.popup = createSliderPopup(number, onChange, onClose, onCheckboxChange, isChecked);

      const {left, top, right, bottom} = this.view.coordsAtPos(number.from);
      const {left: bboxLeft, top: bboxTop} = this.view.dom.parentElement.getBoundingClientRect();
      const coords = {
        left: left - bboxLeft,
        top: top - bboxTop,
        right: right - bboxLeft,
        bottom: bottom - bboxTop,
      };

      if (coords) {
        this.popup.style.position = "absolute";
        this.popup.style.left = `${coords.left}px`;
        this.popup.style.top = `${coords.bottom + 5}px`;
      }

      this.view.dom.appendChild(this.popup);
    }

    closePopup() {
      if (!this.popup) return;
      this.popup.remove();
      this.popup = null;
      this.activeNumber = null;
    }

    destroy() {
      this.view.dom.removeEventListener("mousedown", this.mousedown);
      this.view.dom.removeEventListener("mouseup", this.mouseup);
      this.closePopup();
    }
  }
);

const sliderStyles = EditorView.theme({
  ".cm-number-slider-popup": {
    position: "absolute",
    backgroundColor: "#ffffff",
    border: "1px solid #ccc",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
    padding: "12px",
    zIndex: "1000",
    minWidth: "200px",
  },
  ".cm-slider-container": {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  ".cm-slider-value": {
    width: "100%",
    padding: "6px 8px",
    fontSize: "14px",
    border: "1px solid #ddd",
    borderRadius: "4px",
    boxSizing: "border-box",
  },
  ".cm-slider": {
    width: "100%",
    cursor: "grab",
    "&:active": {
      cursor: "grabbing",
    },
  },
  ".cm-slider-close": {
    position: "absolute",
    top: "4px",
    right: "4px",
    background: "none",
    border: "none",
    fontSize: "20px",
    cursor: "pointer",
    color: "#999",
    lineHeight: "1",
    padding: "0",
    width: "20px",
    height: "20px",
    "&:hover": {
      color: "#333",
    },
  },
  ".cm-slider-checkbox-container": {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginTop: "4px",
  },
  ".cm-slider-checkbox": {
    cursor: "pointer",
    width: "16px",
    height: "16px",
  },
  ".cm-slider-checkbox-label": {
    cursor: "pointer",
    fontSize: "14px",
    userSelect: "none",
  },
});

export function numberSlider(onParamsChange) {
  return [numberSliderPlugin, sliderStyles, paramsFacet.of(onParamsChange || (() => {}))];
}
