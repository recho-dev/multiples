import cardioidVisualization from "./cardioid-visualization.json";
import fractalTree from "./fractal-tree.json";
import itpWinterShow2025Trees from "./itp-winter-show-2025-trees.json";
import mathematicsRose from "./mathematics-rose.json";
import beesandbombs from "./beesandbombs.json";

const BASE_URL = import.meta.env.BASE_URL;

export const examples = [
  {
    group: "p5",
    data: fractalTree,
    img: `${BASE_URL}fractal-tree.png`,
  },
  {
    group: "p5",
    data: mathematicsRose,
    img: `${BASE_URL}mathematics-rose.png`,
  },
  {
    group: "p5",
    data: cardioidVisualization,
    img: `${BASE_URL}cardioid-visualization.png`,
  },
  {
    group: "Showcase",
    data: itpWinterShow2025Trees,
    img: `${BASE_URL}itp-winter-show-2025-trees.png`,
  },
  {
    group: "WebGL2 Shader",
    data: beesandbombs,
    img: `${BASE_URL}beesandbombs.png`,
  },
];

export default examples;
