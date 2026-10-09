// Test helper: load every app script (in index.html order) into one Node context with a catch-all browser stub,
// so templates and diagrams can be built and rendered to SVG outside the app.
const fs = require('fs'), vm = require('vm'), path = require('path');
const dir = path.join(__dirname, '..', 'src');
const order = [...fs.readFileSync(path.join(dir, 'index.html'), 'utf8').matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]).filter((f) => !f.startsWith('..'));
// Anything not modelled is a "blob": callable, constructible, and every property is another blob.
const blob = () => new Proxy(function () {}, {
  get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : k === 'then' ? undefined : k === 'length' ? 0 : k === Symbol.iterator ? () => [][Symbol.iterator]() : blob()),
  apply: () => blob(), construct: () => blob(), set: () => true, has: () => true,
});
const ctx = {
  console, Math, Date, JSON, Promise, Map, Set, WeakMap, Symbol, Array, Object, String, Number, Boolean, RegExp, Error, TypeError, parseFloat, parseInt, isFinite, isNaN, encodeURIComponent, decodeURIComponent, escape, unescape, btoa: (s) => Buffer.from(s, 'binary').toString('base64'), atob: (s) => Buffer.from(s, 'base64').toString('binary'), Uint8Array, Uint16Array, Float32Array, Float64Array, Int32Array, ArrayBuffer, DataView, TextEncoder, TextDecoder, Intl, structuredClone, queueMicrotask, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {}, requestAnimationFrame: () => 0, cancelAnimationFrame() {},
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, sessionStorage: { getItem: () => null, setItem() {} },
  navigator: { platform: 'MacIntel', userAgent: 'node', clipboard: blob() }, location: { search: '', hash: '' },
  matchMedia: () => ({ matches: false, addEventListener() {} }), getComputedStyle: () => ({ getPropertyValue: () => '' }),
  DOMParser: blob(), XMLSerializer: blob(), Image: blob(), FileReader: blob(), Blob: blob(), URL: blob(), fetch: blob(), ResizeObserver: blob(), MutationObserver: blob(), IntersectionObserver: blob(), Path2D: blob(), OffscreenCanvas: blob(), CustomEvent: blob(), Event: blob(),
  $3Dmol: blob(), JSZip: blob(), PptxGenJS: blob(), SmilesDrawer: blob(), pako: blob(), UTIF: blob(), polygonClipping: { union: () => [], difference: () => [], intersection: () => [], xor: () => [] },
};
const canvas = () => ({ getContext: () => ({ measureText: (t) => ({ width: String(t).length * 7, actualBoundingBoxAscent: 10, actualBoundingBoxDescent: 3 }), font: '', fillText() {}, drawImage() {}, getImageData: () => ({ data: [] }) }), width: 0, height: 0, toDataURL: () => '' });
ctx.document = new Proxy({ createElement: (t) => (t === 'canvas' ? canvas() : blob()), createElementNS: () => blob(), addEventListener() {}, getElementById: () => blob(), querySelector: () => blob(), querySelectorAll: () => [], body: blob(), documentElement: blob(), fonts: { ready: Promise.resolve(), add() {} } }, { get: (t, k) => (k in t ? t[k] : blob()) });
ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
ctx.window.native = blob(); ctx.addEventListener = () => {};
const extra = (process.env.EXTRA_SRC || '').split(',').filter(Boolean);
const code = [...order, ...extra].map((f) => `/* ${f} */\n` + fs.readFileSync(path.join(dir, f), 'utf8')).join('\n;\n') + '\n;({ Make, makeGroup, pageSvgString, ICONS, ICON_MAP, TEMPLATES, Color, measureText, textMetrics, DIAGRAMS, findIcon, parseNewick, gametes, dgParseIndented, parseFlowText, buildFlowchart, docxXmlToText, pptxSlidesToText, pdfPageCount, referencesForRequest, aiChartFromTables })';
let R;
try { R = vm.runInNewContext(code, ctx, { filename: 'app-bundle.js' }); } catch (e) { console.error('LOAD ERROR', e.message, e.stack.split('\n').slice(1, 3).join(' ')); throw e; }
module.exports = R;
