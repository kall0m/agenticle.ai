uniform sampler2D uMap;
varying vec2 vUv;

void main() {
  vec4 color = texture2D(uMap, vUv);
  float strength = length(color.xy);
  gl_FragColor = vec4(vec3(strength), 1.0);
}
