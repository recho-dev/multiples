export function generateCode(code, {count = 9} = {}) {
  return Array.from({length: count}, () => {
    return code.replace(/\d+/g, (d) => {
      if (d === "200") return 200;
      const max = d === "0" ? 255 : +d * 2;
      const min = d === "0" ? 0 : +d / 2;
      return Math.floor(Math.random() * (max - min + 1)) + min;
    });
  });
}
