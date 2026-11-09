// WebGL2 renderer for one glass card, carried over from the [04] study (src/shader.js).
// The fragment shader is the GLSL twin of pixelAt() in model.js; keep the two in step.
// The card is drawn in the study's units (296 x 360), whatever its CSS size.
export const MAX_LAYERS = 3;
const KIND = { ellipse: 0, band: 1, drop: 2 };

const VS = `#version 300 es
in vec2 aPos;           // 0..1 over the card quad
uniform vec2 uSize;     // the card in study px
out vec2 vLocal;        // card-local study px
void main() {
  vLocal = aPos * uSize;
  gl_Position = vec4(aPos.x * 2.0 - 1.0, 1.0 - aPos.y * 2.0, 0.0, 1.0);
}`;

const FS = `#version 300 es
precision highp float;
in vec2 vLocal;
uniform vec3 uBase;          // 0..255
uniform vec4 uL[${MAX_LAYERS * 7}];
uniform int uCount;
uniform vec4 uGlass;         // pitch, m, seamDepth, seamWidth
uniform vec3 uLine;          // groove depth (levels), groove width, seam blur radius
uniform float uD[9];         // measured rib profile: sample offset from the rib centre at s = 0..8
uniform float uA[9];         // and how much of the light survives there
uniform int uTable;
uniform vec4 uSeam2;         // offset, right seam width, groove fraction, on
uniform vec3 uCard;          // w, h, radius
uniform float uPx;           // stage px per device px
uniform float uGlassOn;
uniform vec3 uQuiet;         // readout band: y0, y1 (study px), light kept behind the text
uniform sampler2D uInk;      // ink: a drawing behind the glass over the lights; its alpha is coverage
uniform vec4 uInkP;          // on, strength, mip level (its distance: blur), unused
uniform vec3 uInkCol;        // 0..255
out vec4 outColor;

// clamp first: tanh of a large argument is NaN on some GPUs (it is computed as inf/inf)
float Phi(float x) { x = clamp(x, -6.0, 6.0); return 0.5 * (1.0 + tanh(0.7978845608 * (x + 0.044715 * x * x * x))); }
float soft(float sd, float s) { return Phi(-sd / max(s, 1e-4)); }

float coverage(int i, float X, float Y) {
  vec4 a = uL[i*7], b = uL[i*7+1], c = uL[i*7+2], d = uL[i*7+3];
  int kind = int(a.x + 0.5);
  float cx = a.y, cy = a.z, sx = a.w, sy = b.x, sigma = b.y, h = b.z, shear = b.w;
  float x = X - shear * (Y - cy);
  if (kind == 0) {
    vec2 q = abs(vec2((x - cx) / max(abs(sx), 4.0), (Y - cy) / max(abs(sy), 4.0))); // sizes never cross zero
    float pn = uL[i*7+6].w; // superellipse norm, 2 = ellipse
    float dq = pn == 2.0 ? length(q) : pow(pow(q.x, pn) + pow(q.y, pn), 1.0 / pn);
    return soft(dq - 1.0, sigma);
  }
  if (kind == 1) {
    vec4 w2 = uL[i*7+6];
    float yc = c.x + c.y * sin(6.283185307 * x / c.z + c.w) + w2.x * sin(6.283185307 * x / w2.y + w2.z);
    float hh = a.y > 0.5 ? 10.0 + abs(d.x) : d.x;            // band: a.y = 1 when d.x is hq (floor 10 px)
    float sg = b.z != 0.0 ? abs(b.z) / max(abs(hh), 1e-3) : sigma; // band: b.z = edge softness in px
    return soft((abs(Y - yc) - hh) / hh, sg);
  }
  float px = abs((x - cx) / sx), py = -(Y - cy) / sy;
  float bb = 1.0 / h, aa = sqrt(max(1.0 - bb * bb, 1e-6));
  float k = -px * bb + py * aa;
  float sd = k < 0.0 ? length(vec2(px, py)) - 1.0
           : (k > aa * h ? length(vec2(px, py - h)) : px * aa + py * bb - 1.0);
  return soft(sd, sigma);
}

vec3 field(float X, float Y) {
  vec3 P = vec3(0.0); float A = 0.0;
  for (int i = 0; i < ${MAX_LAYERS}; i++) {
    if (i >= uCount) break;
    vec4 d = uL[i*7+3], e = uL[i*7+4], f = uL[i*7+5];
    float cov = coverage(i, X, Y) * d.y;
    vec3 col = e.rgb;
    if (e.a > 0.5) col = mix(col, f.rgb, clamp((Y - d.z) / (d.w - d.z), 0.0, 1.0));
    P = P * (1.0 - cov) + col * cov;
    A = A * (1.0 - cov) + cov;
  }
  if (uInkP.x > 0.5) { // ink over the lights, as fieldAt() in model.js
    float a = clamp(textureLod(uInk, vec2(X / uCard.x, Y / uCard.y), uInkP.z).a, 0.0, 1.0) * uInkP.y;
    P = P * (1.0 - a) + uInkCol * a;
    A = A * (1.0 - a) + a;
  }
  return uBase * (1.0 - A) + P; // unclipped: the seams mix the light before it is clipped
}

void main() {
  vec3 acc = vec3(0.0);
  // seams fade toward a broad average of the light, not toward the card colour
  vec3 T = uBase;
  if (uGlassOn > 0.5 && uLine.z > 0.0) {
    T = 0.25 * (field(vLocal.x - 1.5 * uLine.z, vLocal.y) + field(vLocal.x - 0.5 * uLine.z, vLocal.y)
              + field(vLocal.x + 0.5 * uLine.z, vLocal.y) + field(vLocal.x + 1.5 * uLine.z, vLocal.y));
  }
  const int SS = 4;
  for (int s = 0; s < SS; s++) {
    float u = vLocal.x + uPx * ((float(s) + 0.5) / float(SS) - 0.5);
    float xs = u, alpha = 1.0, line = 0.0, mul = 0.0;
    if (uGlassOn > 0.5 && uSeam2.w > 0.5) {
      float uu = u - uSeam2.x, k = floor(uu / uGlass.x), c = k * uGlass.x + 0.5 * uGlass.x + uSeam2.x;
      float sr = uu - k * uGlass.x, e = min(sr, uGlass.x - sr), sR = uGlass.x - sr;
      xs = c + uGlass.y * (u - c);
      alpha = 1.0 - uGlass.z * (exp(-(sr / uGlass.w) * (sr / uGlass.w)) + exp(-(sR / uSeam2.y) * (sR / uSeam2.y)));
      mul = uSeam2.z * exp(-(e / uLine.y) * (e / uLine.y));
    } else if (uGlassOn > 0.5) {
      float k = floor(u / uGlass.x), c = k * uGlass.x + 0.5 * uGlass.x;
      float e = min(u - k * uGlass.x, (k + 1.0) * uGlass.x - u);
      if (uTable == 1) {
        float sr = u - k * uGlass.x; int i = min(7, int(floor(sr))); float f = sr - float(i);
        xs = c + mix(uD[i], uD[i + 1], f);
        alpha = 1.0 - uGlass.z * exp(-(e / uGlass.w) * (e / uGlass.w));
      } else if (uTable == 2) {
        float sr = u - k * uGlass.x; int i = min(7, int(floor(sr))); float f = sr - float(i);
        xs = c + mix(uD[i], uD[i + 1], f);
        alpha = mix(uA[i], uA[i + 1], f);
      } else {
        xs = c + uGlass.y * (u - c);
        alpha = 1.0 - uGlass.z * exp(-(e / uGlass.w) * (e / uGlass.w));
      }
      line = uLine.x * exp(-(e / uLine.y) * (e / uLine.y));
    }
    vec3 F = field(xs, vLocal.y);
    vec3 v = T + alpha * (F - T);
    acc += clamp(mix(v, uBase, mul) - line, 0.0, 255.0); // the groove pulls the light toward the card, never shades the card
  }
  vec3 px = acc / float(SS);
  if (uQuiet.y > uQuiet.x) px = uBase + (px - uBase) * (1.0 - (1.0 - uQuiet.z) * smoothstep(uQuiet.x, uQuiet.y, vLocal.y));
  vec3 col = px / 255.0;
  // rounded-rect coverage, antialiased over one device px
  vec2 q = abs(vLocal - 0.5 * uCard.xy) - (0.5 * uCard.xy - uCard.z);
  float sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uCard.z;
  float cov = clamp(0.5 - sd / uPx, 0.0, 1.0);
  outColor = vec4(col * cov, cov);
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}

export function packLayers(layers) {
  const a = new Float32Array(MAX_LAYERS * 7 * 4);
  layers.slice(0, MAX_LAYERS).forEach((L, i) => {
    const o = i * 28;
    const v = [
      KIND[L.kind], L.kind === 'band' ? (L.hq != null ? 1 : 0) : (L.cx ?? 0), L.cy ?? 0, L.sx ?? 1,
      L.sy ?? 1, L.sigma ?? 0, L.kind === 'band' ? (L.soft ?? 0) : (L.h ?? 2), L.shear ?? 0,
      L.y0 ?? 0, L.amp ?? 0, L.lam ?? 1e9, L.phase ?? 0,
      L.hq ?? L.half ?? 1, L.opacity ?? 1, L.g0 ?? 0, L.g1 ?? 1,
      ...L.color, L.color2 ? 1 : 0,
      ...(L.color2 ?? [0, 0, 0]), 0,
      L.amp2 ?? 0, L.lam2 ?? 1e9, L.phase2 ?? 0, L.pn ?? 2,
    ];
    a.set(v, o);
  });
  return a;
}

export function createRenderer(canvas) {
  const gl = canvas.getContext('webgl2', { premultipliedAlpha: true, antialias: false, preserveDrawingBuffer: true });
  if (!gl) return null;
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'aPos');
  const U = {};
  for (const n of ['uSize', 'uBase', 'uL', 'uCount', 'uGlass', 'uLine', 'uD', 'uA', 'uTable', 'uSeam2', 'uCard', 'uPx', 'uGlassOn', 'uQuiet', 'uInk', 'uInkP', 'uInkCol']) U[n] = gl.getUniformLocation(prog, n);

  // one texture per ink source: a shared renderer draws many panes, each may bring its own ink
  const inks = new WeakMap();
  function uploadInk(ink) {
    let t = inks.get(ink.source);
    if (!t) { t = { tex: gl.createTexture(), version: -1 }; inks.set(ink.source, t); }
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, t.tex);
    if (ink.version === t.version) return;
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, ink.source);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    t.version = ink.version;
  }

  return {
    gl,
    /**
     * state: cardState(); size: the card in study px; radius in study px; px: study px per device px.
     * target: the device px to draw into, from the canvas's bottom-left corner (default: all of it),
     * so one shared canvas can draw panes of any size in turn.
     */
    draw(state, { size, radius, px, glass, glassOn = true, target }) {
      const w = target?.w ?? canvas.width, h = target?.h ?? canvas.height;
      gl.viewport(0, 0, w, h);
      gl.enable(gl.SCISSOR_TEST); gl.scissor(0, 0, w, h);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.disable(gl.SCISSOR_TEST);
      gl.useProgram(prog);
      gl.enableVertexAttribArray(loc);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(U.uSize, size.w, size.h);
      gl.uniform4f(U.uGlass, glass.pitch, glass.m, glass.seamDepth, glass.seamWidth);
      gl.uniform3f(U.uLine, glass.lineDepth ?? 0, glass.lineWidth ?? 0.5, glass.blurR ?? 0);
      gl.uniform1i(U.uTable, glass.D ? (glass.A ? 2 : 1) : 0);
      gl.uniform4f(U.uSeam2, glass.offset ?? 0, glass.seamWidthR ?? 1, glass.groove ?? 0, glass.seamWidthR != null ? 1 : 0);
      if (glass.D) gl.uniform1fv(U.uD, glass.D);
      if (glass.A) gl.uniform1fv(U.uA, glass.A);
      gl.uniform3f(U.uCard, size.w, size.h, radius);
      gl.uniform1f(U.uPx, px);
      gl.uniform1f(U.uGlassOn, glassOn ? 1 : 0);
      const q = state.quiet;
      gl.uniform3f(U.uQuiet, q ? q.y0 : 0, q ? q.y1 : 0, q ? q.keep : 1);
      gl.uniform3f(U.uBase, ...state.base);
      gl.uniform4fv(U.uL, packLayers(state.layers));
      gl.uniform1i(U.uCount, Math.min(state.layers.length, MAX_LAYERS));
      // ink: { source: a canvas (or image), version: bump it when the canvas is redrawn, color, strength, lod }
      const ink = state.ink;
      if (ink?.source) {
        uploadInk(ink);
        gl.uniform1i(U.uInk, 0);
        gl.uniform4f(U.uInkP, 1, ink.strength ?? 1, ink.lod ?? 0, 0);
        gl.uniform3f(U.uInkCol, ...ink.color);
      } else gl.uniform4f(U.uInkP, 0, 0, 0, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
  };
}
