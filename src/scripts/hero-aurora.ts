const VERT = `#version 300 es
void main() {
  const vec2[3] pos = vec2[](
    vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0)
  );
  gl_Position = vec4(pos[gl_VertexID], 0.0, 1.0);
}
`;

// 2D simplex noise + 3-octave fbm aurora fragment shader
const FRAG = `#version 300 es
precision mediump float;
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;
uniform float uLightTheme;
out vec4 fragColor;

// 2D simplex noise helpers
vec3 mod289(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289((x*34.0+1.0)*x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm(vec2 p) {
  float v = 0.0;
  v += 0.500 * snoise(p * 1.0);
  v += 0.250 * snoise(p * 2.1 + vec2(1.7, 9.2));
  v += 0.125 * snoise(p * 4.3 + vec2(8.3, 2.8));
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  // y=0 is bottom in WebGL, flip so uv.y=1 is top
  uv.y = 1.0 - uv.y;

  // Mouse displacement (aurora flows toward cursor)
  vec2 mouseDisplace = (uMouse - 0.5) * 0.25;
  vec2 p = uv + mouseDisplace;

  // Aurora bands concentrate toward top/middle — vertical envelope
  float envelope = smoothstep(0.0, 0.55, 1.0 - uv.y) * smoothstep(1.0, 0.3, 1.0 - uv.y);
  envelope = pow(envelope, 1.4);

  // Primary aurora layer: slow horizontal drift
  float n1 = fbm(p * vec2(1.8, 3.5) + vec2(uTime * 0.08, uTime * 0.05));
  // Secondary layer: different angle + speed
  float n2 = fbm(p * vec2(2.5, 1.5) + vec2(-uTime * 0.06, uTime * 0.09) + 3.7);
  // Combine and clamp
  float aurora = clamp((n1 * 0.6 + n2 * 0.4 + 0.1) * envelope * 1.6, 0.0, 1.0);

  // Dark mode palette
  vec3 bgDark    = vec3(0.078, 0.063, 0.094);   // #141018
  vec3 goldDark  = vec3(0.831, 0.627, 0.188);   // #d4a030
  vec3 brownDark = vec3(0.745, 0.392, 0.235);   // #be643c

  // Light mode palette
  vec3 bgLight    = vec3(0.988, 0.980, 0.961);  // #fcfaf5
  vec3 goldLight  = vec3(0.722, 0.533, 0.165);  // #b8882a
  vec3 brownLight = vec3(0.620, 0.360, 0.200);  // lighter warm brown

  // Pick palette by theme
  vec3 bg    = mix(bgDark,    bgLight,    uLightTheme);
  vec3 gold  = mix(goldDark,  goldLight,  uLightTheme);
  vec3 brown = mix(brownDark, brownLight, uLightTheme);

  // Light mode reduces aurora intensity to 40%
  float intensityMod = mix(1.0, 0.4, uLightTheme);

  // Color blend: bg → warm-brown → gold based on aurora intensity
  vec3 auroraColor = mix(brown, gold, smoothstep(0.3, 0.8, aurora));
  vec3 color = mix(bg, auroraColor, aurora * intensityMod * 0.85);

  fragColor = vec4(color, 1.0);
}
`;

// WebGL1 fallback shaders (no version directive, no 'out')
const VERT1 = `
void main() {
  vec2 pos[3];
  pos[0] = vec2(-1.0, -1.0);
  pos[1] = vec2( 3.0, -1.0);
  pos[2] = vec2(-1.0,  3.0);
  gl_Position = vec4(pos[gl_VertexID], 0.0, 1.0);
}
`;

// WebGL1 doesn't support gl_VertexID without extension — use a triangle strip instead
const VERT1_COMPAT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;
const FRAG1 = FRAG.replace('#version 300 es\n', '').replace('out vec4 fragColor;', '').replace('fragColor', 'gl_FragColor');

export interface AuroraHandle {
  canvas: HTMLCanvasElement;
  destroy: () => void;
}

function compileShader(gl: WebGL2RenderingContext | WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const s = gl.createShader(type);
  if (!s) return null;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.warn('[aurora] shader compile error:', gl.getShaderInfoLog(s));
    gl.deleteShader(s);
    return null;
  }
  return s;
}

function createProgram(gl: WebGL2RenderingContext | WebGLRenderingContext, vert: string, frag: string): WebGLProgram | null {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vert);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, frag);
  if (!vs || !fs) return null;
  const prog = gl.createProgram();
  if (!prog) return null;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn('[aurora] program link error:', gl.getProgramInfoLog(prog));
    gl.deleteProgram(prog);
    return null;
  }
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return prog;
}

export function initAurora(container: HTMLElement): AuroraHandle | null {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
  container.prepend(canvas);

  // Try WebGL2 first, fall back to WebGL1
  const gl2 = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false }) as WebGL2RenderingContext | null;
  const gl1 = !gl2 ? canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false }) as WebGLRenderingContext | null : null;
  const gl: WebGL2RenderingContext | WebGLRenderingContext | null = gl2 || gl1;

  if (!gl) {
    canvas.remove();
    return null;
  }

  const isGL2 = !!gl2;
  let prog: WebGLProgram | null = null;

  if (isGL2) {
    prog = createProgram(gl2!, VERT, FRAG);
  } else {
    prog = createProgram(gl1!, VERT1_COMPAT, FRAG1);
  }

  if (!prog) {
    canvas.remove();
    return null;
  }

  // For WebGL1: set up a fullscreen quad via attribute buffer
  let posBuffer: WebGLBuffer | null = null;
  if (!isGL2) {
    posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  }

  gl.useProgram(prog);
  const uTime       = gl.getUniformLocation(prog, 'uTime');
  const uResolution = gl.getUniformLocation(prog, 'uResolution');
  const uMouse      = gl.getUniformLocation(prog, 'uMouse');
  const uLightTheme = gl.getUniformLocation(prog, 'uLightTheme');

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let w = 0, h = 0;

  function resize() {
    const rect = container.getBoundingClientRect();
    w = Math.round(rect.width * dpr);
    h = Math.round(rect.height * dpr);
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
    gl.useProgram(prog);
    gl.uniform2f(uResolution, w, h);
  }

  // Mouse tracking — lerped for smoothness
  let targetMx = 0.5, targetMy = 0.5;
  let currMx = 0.5, currMy = 0.5;
  let mouseFrame = false;

  function onMouseMove(e: MouseEvent) {
    if (mouseFrame) return;
    mouseFrame = true;
    requestAnimationFrame(() => { mouseFrame = false; });
    const rect = container.getBoundingClientRect();
    targetMx = (e.clientX - rect.left) / rect.width;
    targetMy = (e.clientY - rect.top) / rect.height;
  }
  document.addEventListener('mousemove', onMouseMove, { passive: true });

  // Theme
  let lightTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 1.0 : 0.0;
  function onThemeChange() {
    lightTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 1.0 : 0.0;
  }
  // theme-changed is dispatched on window (see src/lib/theme.ts)
  window.addEventListener('theme-changed', onThemeChange);

  // Context loss
  function onContextLost(e: Event) {
    e.preventDefault();
    cancelAnimationFrame(rafId);
    const fallback = container.querySelector('.hero-gradient-fallback') as HTMLElement | null;
    if (fallback) fallback.style.display = '';
  }
  canvas.addEventListener('webglcontextlost', onContextLost);

  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  const startTime = performance.now();
  let rafId = 0;

  function draw() {
    rafId = requestAnimationFrame(draw);
    const t = (performance.now() - startTime) * 0.001;

    // Lerp mouse
    currMx += (targetMx - currMx) * 0.04;
    currMy += (targetMy - currMy) * 0.04;

    gl.useProgram(prog);
    gl.uniform1f(uTime, t);
    gl.uniform2f(uMouse, currMx, currMy);
    gl.uniform1f(uLightTheme, lightTheme);

    if (isGL2) {
      (gl as WebGL2RenderingContext).drawArrays(gl.TRIANGLES, 0, 3);
    } else {
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
  }

  draw();

  function destroy() {
    cancelAnimationFrame(rafId);
    ro.disconnect();
    document.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('theme-changed', onThemeChange);
    canvas.removeEventListener('webglcontextlost', onContextLost);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    canvas.remove();
  }

  return { canvas, destroy };
}
