import {Decoration, EditorView, ViewPlugin} from "@codemirror/view";
import {StateField, StateEffect, Annotation} from "@codemirror/state";

const highlightEffect = StateEffect.define();
export const ANNO_SLIDER_UPDATE = Annotation.define();

const highlightField = StateField.define({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    decorations = decorations.map(tr.changes);
    for (let effect of tr.effects) {
      if (effect.is(highlightEffect)) {
        decorations = effect.value;
      }
    }
    return decorations;
  },
  provide: (f) => EditorView.decorations.from(f),
});

const numberHighlight = Decoration.mark({
  class: "cm-number-hover",
});

function findNumberAt(view, pos) {
  const line = view.state.doc.lineAt(pos);
  const text = line.text;
  const offset = pos - line.from;

  const numberRegex = /-?\d+\.?\d*/g;
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

function createSliderPopup(view, number, onChange, onClose) {
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

  container.appendChild(valueDisplay);
  container.appendChild(slider);
  popup.appendChild(container);
  popup.appendChild(closeButton);

  return popup;
}

const numberSliderPlugin = ViewPlugin.fromClass(
  class {
    constructor(view) {
      this.view = view;
      this.hoveredNumber = null;
      this.popup = null;
      this.activeNumber = null;
      this.mouseDownPos = null;
      this.mousemove = this.mousemove.bind(this);
      this.mousedown = this.mousedown.bind(this);
      this.mouseup = this.mouseup.bind(this);
      view.dom.addEventListener("mousemove", this.mousemove);
      view.dom.addEventListener("mousedown", this.mousedown);
      view.dom.addEventListener("mouseup", this.mouseup);
    }

    update(update) {
      if (this.popup && update.docChanged && !update.transactions.some((tr) => tr.annotation(ANNO_SLIDER_UPDATE))) {
        this.closePopup();
      }
    }

    mousemove(event) {
      if (this.popup) return;
      const pos = this.view.posAtCoords({x: event.clientX, y: event.clientY});
      if (pos === null) return this.clearHighlight();
      const number = findNumberAt(this.view, pos);
      if (number) {
        this.hoveredNumber = number;
        const deco = Decoration.set([numberHighlight.range(number.from, number.to)]);
        this.view.dispatch({effects: highlightEffect.of(deco)});
      } else {
        this.clearHighlight();
      }
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

      this.popup = createSliderPopup(this.view, number, onChange, onClose);

      // Position the popup
      const {left, top, right, bottom} = this.view.coordsAtPos(number.from);
      const bbox = this.view.dom.parentElement.getBoundingClientRect();
      const bboxLeft = bbox.left;
      const bboxTop = bbox.top;
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

    clearHighlight() {
      this.hoveredNumber = null;
      this.view.dispatch({effects: highlightEffect.of(Decoration.none)});
    }

    destroy() {
      this.view.dom.removeEventListener("mousemove", this.mousemove);
      this.view.dom.removeEventListener("mousedown", this.mousedown);
      document.removeEventListener("mousedown", this.documentClick);
      this.closePopup();
    }
  }
);

const sliderStyles = EditorView.theme({
  ".cm-number-hover": {
    borderBottom: "1px solid #ccc",
  },
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
});

export function numberSlider() {
  return [highlightField, numberSliderPlugin, sliderStyles];
}
