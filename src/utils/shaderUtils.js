// Noise shader code to be injected into fragment shaders
const noiseShader = `
vec3  _s(vec3 i) { return cos(5.*(i+5.*cos(5.*(i.yzx+5.*cos(5.*(i.zxy+5.*cos(5.*i))))))); }
float _t(vec3 i, vec3 u, vec3 a) { return dot(normalize(_s(i + a)), u - a); }
float noise(vec3 p) {
   vec3 i = floor(p), u = p - i, v = 2.*mix(u*u, u*(2.-u)-.5, step(.5,u));
   return mix(mix(mix(_t(i, u, vec3(0.,0.,0.)), _t(i, u, vec3(1.,0.,0.)), v.x),
                  mix(_t(i, u, vec3(0.,1.,0.)), _t(i, u, vec3(1.,1.,0.)), v.x), v.y),
              mix(mix(_t(i, u, vec3(0.,0.,1.)), _t(i, u, vec3(1.,0.,1.)), v.x),
                  mix(_t(i, u, vec3(0.,1.,1.)), _t(i, u, vec3(1.,1.,1.)), v.x), v.y), v.z);
}`;

/**
 * Prepares a fragment shader by injecting noise code by default.
 * Injects noise shader code right after "precision highp float;"
 *
 * @param {string} fragmentShader - The fragment shader source code
 * @returns {string} - The prepared fragment shader with noise code injected
 */
export function prepareFragmentShader(fragmentShader) {
  let finalFragmentShader = fragmentShader.trim();

  // Find "precision highp float;" and inject noise code right after it
  const precisionIndex = finalFragmentShader.indexOf("precision highp float;");
  if (precisionIndex !== -1) {
    const afterPrecision = precisionIndex + "precision highp float;".length;
    finalFragmentShader =
      finalFragmentShader.slice(0, afterPrecision) +
      "\n" +
      noiseShader.trim() +
      "\n" +
      finalFragmentShader.slice(afterPrecision);
  } else {
    // If precision not found, prepend at the beginning
    finalFragmentShader = noiseShader.trim() + "\n" + finalFragmentShader;
  }

  return finalFragmentShader.trim();
}

export const defaultVertexShader = `#version 300 es
in  vec3 aPos;
out vec3 vPos;
void main() {
   gl_Position = vec4(aPos, 1.);
   vPos = aPos;
}`;
