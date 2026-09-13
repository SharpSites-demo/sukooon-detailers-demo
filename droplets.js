/* ==========================================================================
   Canvas UI — Droplets (vanilla WebGL build) + rect-cache helper
   Vendored from https://github.com/DavidHDev/canvas-ui (https://canvasui.dev)
   License: MIT + Commons Clause License Condition v1.0 — Copyright (c) 2026 David Haz
   https://github.com/DavidHDev/canvas-ui/blob/main/LICENSE.md
   Ported from the TypeScript WebGL source; logic kept faithful.
   ========================================================================== */
function createRectCache(l){var v=l.getBoundingClientRect(),a=function(){v=l.getBoundingClientRect()},f=new ResizeObserver(a);return f.observe(l),window.addEventListener("resize",a,{passive:!0}),window.addEventListener("scroll",a,{capture:!0,passive:!0}),{get current(){return v},destroy:function(){f.disconnect(),window.removeEventListener("resize",a),window.removeEventListener("scroll",a,!0)}}}var DROPLETS_DEFAULTS={intensity:.5,speed:1,scale:.4,dropWidth:1,dropLength:1,refraction:.2,blur:0,vignette:0,fallSpeed:1,wiggle:1,staticDrops:.2,interactive:!0,interactionRadius:.3,interactionStrength:.6,interactionDistortion:3,tint:[1,1,1],tintStrength:0};const DROPLETS_VERT=`#version 300 es
precision highp float;
layout(location = 0) in vec2 aPos;
out vec2 vUv;
void main () {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`,DROPLETS_FRAG=`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uContent;
uniform vec2 uResolution;
uniform vec2 uOffset;
uniform float uTime;
uniform float uIntensity;
uniform float uScale;
uniform float uDropWidth;
uniform float uDropLength;
uniform float uRefraction;
uniform float uBlur;
uniform float uVignette;
uniform float uFallSpeed;
uniform float uWiggle;
uniform float uStaticDrops;
uniform float uMaxX;
uniform sampler2D uTrail;
uniform float uWipe;
uniform float uWipeDistort;
uniform vec3 uTint;
uniform float uTintStrength;
uniform float uHasContent;

#define S(a, b, t) smoothstep(a, b, t)

vec3 N13 (float p) {
  vec3 p3 = fract(vec3(p) * vec3(0.1031, 0.11369, 0.13787));
  p3 += dot(p3, p3.yzx + 19.19);
  return fract(vec3(
    (p3.x + p3.y) * p3.z,
    (p3.x + p3.z) * p3.y,
    (p3.y + p3.z) * p3.x
  ));
}

float N (float t) {
  return fract(sin(t * 12345.564) * 7658.76);
}

float Saw (float b, float t) {
  return S(0.0, b, t) * S(1.0, b, t);
}

float sdEgg (vec2 p, float ra, float rb) {
  const float k = 1.7320508;
  p.x = abs(p.x);
  float r = ra - rb;
  return ((p.y < 0.0) ? length(vec2(p.x, p.y)) - r :
          (k * (p.x + r) < p.y) ? length(vec2(p.x, p.y - k * r)) :
          length(vec2(p.x + r, p.y)) - 2.0 * r) - rb;
}

vec2 DropLayer (vec2 uv, float t) {
  vec2 UV = uv;
  vec2 a = vec2(6.0, 1.0);
  vec2 grid = a * 2.0;

  vec2 id = floor(uv * grid);
  float gridFall = N(id.x) / 3.0 + 0.5;
  uv.y += t * gridFall / a.y;
  id = floor(uv * grid);
  uv.y += N(id.x);

  id = floor(uv * grid);
  vec2 st = fract(uv * grid) - vec2(0.5, 0.0);
  vec3 n = N13(id.x * 35.2 + id.y * 2376.1);

  float x = n.x - 0.5;
  float lambda = UV.y * 20.0;
  float wiggle = sin(lambda + sin(lambda));
  x += wiggle * (0.5 - abs(x)) * (n.z - 0.5) * uWiggle;
  x *= 0.6;

  float slowStart = 0.85;
  float ti = fract(t * (gridFall + 0.1) + n.z);
  float y = (Saw(slowStart, ti) - 0.5) * 0.9 + 0.5;
  vec2 p = vec2(x, y);

  float dropShape = (ti > slowStart)
    ? -sin(6.2831853 * ti / (1.0 - slowStart)) * 0.5 - 0.5
    : 0.0;
  float d = sdEgg((st - p) * a.yx / vec2(uDropWidth, uDropLength), 0.0, dropShape);
  float diameter = N(id.x + id.y) / 7.0 + 0.2;
  float mainDrop = S(diameter / 1.5, 0.0, d);

  float r2 = S(1.0, y, st.y);
  float r = sqrt(r2);
  float cd = abs(st.x - x);
  float thickness = diameter * 0.95 * uDropWidth;
  float trail = S(thickness * r, 0.0, cd);
  float trailFront = S(-0.02, 0.02, st.y - y);
  trail *= r2 * trailFront * 0.5;

  y = UV.y;
  float trail2 = S((thickness - 0.15) * r, 0.0, cd);
  trail2 *= trailFront * n.z;
  float rndX = N(id.x) / 1.5 + 0.5;
  float rndY = N(st.y) / 40.0 + 0.05;
  y = fract(y * 11.0 * rndX) + (st.y - 0.5);
  float dd = length(st - vec2(x, y));
  float droplets = S(trail2 + rndY, 0.0, dd);

  float m = mainDrop + droplets * r * trailFront;
  return vec2(m, trail);
}

float StaticDrops (vec2 uv, float t) {
  uv *= 40.0;

  vec2 id = floor(uv);
  vec3 n = N13(id.x * 107.45 + id.y * 3543.654);
  vec2 p = (n.xy - 0.5) * 0.6;
  uv = fract(uv) - 0.5;

  float d = length(uv - p);
  float drop = S(0.3 * clamp(uDropWidth, 0.4, 1.4), 0.0, d);

  float fade = Saw(0.1, fract(t + n.y));
  float intensity = fract(n.x * 27.0);
  return drop * fade * intensity;
}

vec2 Drops (vec2 uv, float t, float tFall, float l0, float l1, float l2, float wipe) {
  float s = StaticDrops(uv, t) * l0 * (1.0 - wipe);
  vec2 m1 = DropLayer(uv, tFall) * (l1 * (1.0 - wipe * 0.8));
  vec2 m2 = DropLayer(uv * 1.85, tFall) * (l2 * (1.0 - wipe * 0.8));

  float c = s + m1.x + m2.x;
  c = S(0.3, 1.0, c);

  return vec2(c, m1.y + m2.y);
}

void main () {
  vec2 uv = vUv;

  if (uv.x > uMaxX) {
    outColor = vec4(0.0);
    return;
  }

  vec2 aspectUv = (uv + uOffset - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
  float t = uTime * 0.2;
  float dropScale = clamp(min(uResolution.x, uResolution.y) / 900.0, 0.75, 1.35) * uScale;
  vec2 scaledUv = aspectUv * dropScale;

  float rainAmount = clamp(uIntensity, 0.0, 1.25);

  float staticDrops = S(-0.5, 1.0, rainAmount) * 2.0 * uStaticDrops;
  float layer1 = S(0.25, 0.75, rainAmount);
  float layer2 = S(0.0, 0.5, rainAmount);
  float tFall = t * uFallSpeed;

  float wipeMask = texture(uTrail, uv).r;
  float wipe = wipeMask * clamp(uWipe, 0.0, 1.0);

  vec2 c = Drops(scaledUv, t, tFall, staticDrops, layer1, layer2, wipe);

  vec2 e = vec2(0.001, 0.0);
  float cx = Drops(scaledUv + e, t, tFall, staticDrops, layer1, layer2, wipe).x;
  float cy = Drops(scaledUv + e.yx, t, tFall, staticDrops, layer1, layer2, wipe).x;
  vec2 normal = vec2(cx - c.x, cy - c.x);

  vec2 e2 = vec2(0.012, 0.0);
  float wx = texture(uTrail, uv + e2).r;
  float wy = texture(uTrail, uv + e2.yx).r;
  normal += vec2(wipeMask - wx, wipeMask - wy) * 0.05 * uWipeDistort * clamp(uWipe, 0.0, 1.0);

  vec2 refractedUv = clamp(uv + normal * uRefraction, vec2(0.001), vec2(uMaxX - 0.004, 0.999));
  float fog = clamp(uBlur, 0.0, 8.0) * mix(0.7, 1.0, rainAmount);
  float back = fog * (1.0 - clamp(c.y * 2.0, 0.0, 1.0)) * (1.0 - wipe);
  float focus = mix(back, 0.0, S(0.1, 0.2, c.x));

  if (uHasContent < 0.5) {
    float mask = S(0.02, 0.14, c.x);
    vec3 n3 = normalize(vec3(normal * 42.0, 1.0));
    vec3 L = normalize(vec3(-0.35, 0.75, 0.55));
    float spec = pow(max(dot(reflect(vec3(0.0, 0.0, -1.0), n3), L), 0.0), 34.0);
    float rim = clamp(length(normal) * 26.0, 0.0, 1.0);
    vec3 dropCol = mix(vec3(0.72), uTint, clamp(uTintStrength, 0.0, 1.0));
    vec3 colF = dropCol * (0.12 + 0.5 * rim) + vec3(spec);
    float alphaF = mask * clamp(0.1 + rim * 0.5 + spec * 0.9, 0.0, 1.0);
    outColor = vec4(clamp(colF, 0.0, 1.0) * alphaF, alphaF);
    return;
  }

  vec4 content = textureLod(uContent, vec2(refractedUv.x, 1.0 - refractedUv.y), focus);
  vec3 col = content.rgb;

  col = mix(col, uTint, clamp(uTintStrength, 0.0, 1.0) * 0.35);

  vec2 vignetteUv = uv - 0.5;
  col *= 1.0 - dot(vignetteUv, vignetteUv) * clamp(uVignette, 0.0, 1.0) * 2.0;

  outColor = vec4(col * content.a, content.a);
}`,DROPLETS_TRAIL_FRAG=`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uPrev;
uniform vec2 uFrom;
uniform vec2 uTo;
uniform float uAspect;
uniform float uRadius;
uniform float uDecay;
uniform float uSplat;

float capsule (vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return length(pa - ba * h);
}

void main () {
  float prev = max(texture(uPrev, vUv).r * uDecay - uDrain, 0.0);
  vec2 p = vec2(vUv.x * uAspect, vUv.y);
  vec2 a = vec2(uFrom.x * uAspect, uFrom.y);
  vec2 b = vec2(uTo.x * uAspect, uTo.y);
  float d = capsule(p, a, b);
  float m = smoothstep(uRadius, uRadius * 0.5, d) * uSplat;
  outColor = vec4(max(prev, m), 0.0, 0.0, 1.0);
}`;function supportsHtmlInCanvas(){if(typeof document>"u")return!1;var l=document.createElement("canvas"),v=l.getContext("2d");return!!(v&&typeof v.drawElementImage=="function"&&typeof l.requestPaint=="function")}function createDroplets(l,v){var a=Object.assign({},DROPLETS_DEFAULTS,v||{}),f=l.source,p=l.content,n=l.output,e=n.getContext("webgl2",{alpha:!0,depth:!1,stencil:!1,antialias:!1,premultipliedAlpha:!0});if(!e||e.isContextLost())return null;var R=f.getContext("2d"),y=f,x=!!(R&&typeof R.drawElementImage=="function"&&typeof y.requestPaint=="function"),D=!1,W=function(){};x&&(y.onpaint=function(){try{R.reset(),R.drawElementImage(p,0,0),D=!0,W()}catch{}});function w(t,r){var o=e.createShader(t);return e.shaderSource(o,r),e.compileShader(o),e.getShaderParameter(o,e.COMPILE_STATUS)||console.error("Droplets shader error:",e.getShaderInfoLog(o)),o}var N=w(e.VERTEX_SHADER,DROPLETS_VERT),O=w(e.FRAGMENT_SHADER,DROPLETS_FRAG),G=w(e.FRAGMENT_SHADER,DROPLETS_TRAIL_FRAG);function k(t){var r=e.createProgram();e.attachShader(r,N),e.attachShader(r,t),e.linkProgram(r);for(var o={},c=e.getProgramParameter(r,e.ACTIVE_UNIFORMS),m=0;m<c;m++){var E=e.getActiveUniform(r,m);o[E.name]=e.getUniformLocation(r,E.name)}return{program:r,uniforms:o}}var z=k(O),H=z.program,i=z.uniforms,V=k(G),Y=V.program,h=V.uniforms,q=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,q),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0);var S=e.createTexture();e.bindTexture(e.TEXTURE_2D,S),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR_MIPMAP_LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,new Uint8Array([0,0,0,0])),e.generateMipmap(e.TEXTURE_2D);var j=1;function _(){var t=Math.min(window.devicePixelRatio||1,2),r=Math.max(1,Math.round(n.clientWidth*t)),o=Math.max(1,Math.round(n.clientHeight*t));if((n.width!==r||n.height!==o)&&(n.width=r,n.height=o),j=Math.min(1,Math.max(.05,p.clientWidth/Math.max(n.clientWidth,1))),x){var c=Math.max(1,Math.round(f.clientWidth)),m=Math.max(1,Math.round(f.clientHeight));(f.width!==c*t||f.height!==m*t)&&(f.width=c*t,f.height=m*t),y.requestPaint()}}_();var M=0,L=0,d=[],T=[],g=0;function ae(){var t=Math.max(1,Math.round(n.width/4)),r=Math.max(1,Math.round(n.height/4));if(!(t===M&&r===L&&d.length)){M=t,L=r;for(var o,c,m=0;m<d.length;m++)e.deleteTexture(d[m]);for(var E=0;E<T.length;E++)e.deleteFramebuffer(T[E]);d.length=0,T.length=0;for(var re=0;re<2;re++)o=e.createTexture(),e.bindTexture(e.TEXTURE_2D,o),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,t,r,0,e.RGBA,e.UNSIGNED_BYTE,null),c=e.createFramebuffer(),e.bindFramebuffer(e.FRAMEBUFFER,c),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,o,0),e.clearColor(0,0,0,1),e.clear(e.COLOR_BUFFER_BIT),d.push(o),T.push(c);e.bindFramebuffer(e.FRAMEBUFFER,null)}}var u={x:.5,y:.5,px:.5,py:.5,seen:!1,moved:!1};function oe(t){ae(),e.useProgram(Y),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,d[g]),e.uniform1i(h.uPrev,0),e.uniform1f(h.uDecay,Math.exp(-t*.5)),e.uniform1f(h.uDrain,t*.3),e.uniform1f(h.uAspect,n.width/Math.max(n.height,1)),e.uniform2f(h.uFrom,u.px,u.py),e.uniform2f(h.uTo,u.x,u.y),e.uniform1f(h.uRadius,Math.max(a.interactionRadius,.01)),e.uniform1f(h.uSplat,a.interactive&&u.moved?1:0),e.bindFramebuffer(e.FRAMEBUFFER,T[1-g]),e.viewport(0,0,M,L),e.drawArrays(e.TRIANGLE_STRIP,0,4),e.bindFramebuffer(e.FRAMEBUFFER,null),g=1-g,u.px=u.x,u.py=u.y,u.moved=!1}function ne(){!x||!D||(D=!1,e.bindTexture(e.TEXTURE_2D,S),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,f),e.generateMipmap(e.TEXTURE_2D))}function ie(t){ne(),e.useProgram(H),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,S),e.uniform1i(i.uContent,0),e.uniform1f(i.uHasContent,x?1:0),e.uniform2f(i.uResolution,n.width,n.height),e.uniform2f(i.uOffset,p.scrollLeft/Math.max(p.clientWidth,1),-p.scrollTop/Math.max(p.clientHeight,1)),e.uniform1f(i.uTime,t),e.uniform1f(i.uIntensity,a.intensity),e.uniform1f(i.uScale,Math.max(a.scale,.01)),e.uniform1f(i.uDropWidth,Math.max(a.dropWidth,.05)),e.uniform1f(i.uDropLength,Math.max(a.dropLength,.05)),e.uniform1f(i.uRefraction,a.refraction),e.uniform1f(i.uBlur,Math.max(a.blur,0)),e.uniform1f(i.uVignette,a.vignette),e.uniform1f(i.uFallSpeed,a.fallSpeed),e.uniform1f(i.uWiggle,a.wiggle),e.uniform1f(i.uStaticDrops,a.staticDrops),e.uniform1f(i.uMaxX,j),e.activeTexture(e.TEXTURE1),e.bindTexture(e.TEXTURE_2D,d[g]),e.uniform1i(i.uTrail,1),e.uniform1f(i.uWipe,a.interactive?Math.min(Math.max(a.interactionStrength,0),1):0),e.uniform1f(i.uWipeDistort,Math.max(a.interactionDistortion,0)),e.uniform3f(i.uTint,a.tint[0],a.tint[1],a.tint[2]),e.uniform1f(i.uTintStrength,a.tintStrength),e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,n.width,n.height),e.drawArrays(e.TRIANGLE_STRIP,0,4)}var P=0,C=performance.now(),Q=0,I=!1,F=!1,U=!0,A=window.matchMedia("(prefers-reduced-motion: reduce)"),X=A.matches;function J(t){if(!I){if(!U){F=!1;return}var r=Math.min((t-C)/1e3,1/30);if(C=t,Q+=r*a.speed,oe(r),ie(Q),X&&!D){F=!1;return}P=requestAnimationFrame(J)}}function s(){I||F||!U||(F=!0,C=performance.now(),P=requestAnimationFrame(J))}W=s,s();function K(){X=A.matches,s()}A.addEventListener("change",K);var B=new ResizeObserver(function(){_(),s()});B.observe(n),B.observe(p);var Z=new IntersectionObserver(function(t){U=t.length?t[t.length-1].isIntersecting:!0,U&&s()});Z.observe(n);var b=n.parentElement||n,$=createRectCache(n);function ee(t){if(!(!a.interactive||X)){var r=$.current,o=(t.clientX-r.left)/Math.max(r.width,1),c=1-(t.clientY-r.top)/Math.max(r.height,1);u.seen||(u.seen=!0,u.px=o,u.py=c),u.x=o,u.y=c,u.moved=!0,s()}}function te(){u.seen=!1}return b.addEventListener("pointermove",ee,{passive:!0}),b.addEventListener("pointerleave",te,{passive:!0}),p.addEventListener("scroll",s,{passive:!0}),{setOptions:function(t){var r=!1;for(var o in t)Object.prototype.hasOwnProperty.call(t,o)&&a[o]!==t[o]&&(r=!0);r&&(Object.assign(a,t),s())},resize:function(){_(),s()},destroy:function(){I=!0,$.destroy(),cancelAnimationFrame(P),B.disconnect(),Z.disconnect(),A.removeEventListener("change",K),b.removeEventListener("pointermove",ee),b.removeEventListener("pointerleave",te),p.removeEventListener("scroll",s),e.deleteTexture(S);for(var t=0;t<d.length;t++)e.deleteTexture(d[t]);for(var r=0;r<T.length;r++)e.deleteFramebuffer(T[r]);e.deleteProgram(H),e.deleteProgram(Y),e.deleteShader(N),e.deleteShader(O),e.deleteShader(G),e.deleteBuffer(q),x&&(y.onpaint=null)}}}function supportsWebGL2(){try{var l=document.createElement("canvas"),v=l.getContext("webgl2");return!!(v&&!v.isContextLost())}catch{return!1}}window.CanvasUIDroplets={createDroplets,supportsHtmlInCanvas,supportsWebGL2};
