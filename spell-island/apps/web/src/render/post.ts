// Final colour grade (runs on the HDR image before tone mapping): time-of-day / weather tint,
// a touch more colour, and a quiet vignette.
import * as THREE from 'three';

export const GradeShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    /** white = neutral; darker / bluer = dusk, night, storm */
    uTint: { value: new THREE.Color('#ffffff') },
    uSaturation: { value: 1.08 },
  },
  vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform vec3 uTint; uniform float uSaturation; varying vec2 vUv;
    void main(){
      vec3 col = texture2D(tDiffuse, vUv).rgb;
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, uSaturation);
      col *= uTint;
      float v = smoothstep(1.25, 0.35, length((vUv - 0.5) * vec2(1.0, 1.15)) * 1.3);
      col *= mix(0.78, 1.0, v);
      gl_FragColor = vec4(col, 1.0);
    }`,
};
