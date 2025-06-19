uniform sampler2D uFlowMap;
uniform vec2 uMouse;
uniform float uTime;
uniform float uViscosity;
uniform float uFlowIntensity;
uniform vec2 uResolution;

varying vec2 vUv;

void main() {
  vec2 texel = 1.0 / uResolution;

  vec4 flow = texture2D(uFlowMap, vUv);

  float d = distance(vUv, uMouse);
  float influence = exp(-d * 100.0);
  vec2 dir = normalize(vUv - uMouse);

  flow.xy *= uViscosity;
  flow.xy += dir * influence * uFlowIntensity;

  gl_FragColor = flow;
}
