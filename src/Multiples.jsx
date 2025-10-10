import {useState} from "react";
import {generateCode} from "./generate.js";
import {Sketch} from "./Sketch.jsx";

export function Multiples({code}) {
  const [multiples, setMultiples] = useState(generateCode(code));
  return (
    <div className="flex flex-wrap gap-4">
      {multiples.map((multiple, index) => (
        <div key={index} className="w-[200px] h-[200px]">
          <Sketch code={multiple} />
        </div>
      ))}
    </div>
  );
}
