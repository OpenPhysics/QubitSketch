/**
 * Vitest setup file — runs before every test file.
 *
 * SceneryStack (via paper.js) requires a Canvas 2D context at import time.
 * happy-dom's canvas stub doesn't provide one, so we patch getContext()
 * to return a minimal mock before any scenerystack code loads.
 */

// ── Canvas 2D mock ──────────────────────────────────────────────────────────
// paper.js only needs basic CanvasRenderingContext2D methods during init.
// We provide a no-op stub that satisfies the property reads and draw calls.

const noop: () => void = () => {
  /* no-op */
};
const noopReturn: (val: unknown) => () => unknown = (val: unknown) => (): unknown => val;

function createMockContext2D(): CanvasRenderingContext2D {
  const ctx: Record<string, unknown> = {
    // State
    canvas: { width: 1, height: 1 },
    save: noop,
    restore: noop,
    // Transform
    scale: noop,
    rotate: noop,
    translate: noop,
    transform: noop,
    setTransform: noop,
    getTransform: noopReturn({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    resetTransform: noop,
    // Compositing
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    // Styles
    fillStyle: "#000",
    strokeStyle: "#000",
    lineWidth: 1,
    lineCap: "butt",
    lineJoin: "miter",
    miterLimit: 10,
    lineDashOffset: 0,
    font: "10px sans-serif",
    textAlign: "start",
    textBaseline: "alphabetic",
    direction: "ltr",
    shadowBlur: 0,
    shadowColor: "rgba(0,0,0,0)",
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    imageSmoothingEnabled: true,
    // Drawing
    clearRect: noop,
    fillRect: noop,
    strokeRect: noop,
    fillText: noop,
    strokeText: noop,
    measureText: () => ({
      width: 0,
      actualBoundingBoxAscent: 0,
      actualBoundingBoxDescent: 0,
      fontBoundingBoxAscent: 0,
      fontBoundingBoxDescent: 0,
      actualBoundingBoxLeft: 0,
      actualBoundingBoxRight: 0,
      emHeightAscent: 0,
      emHeightDescent: 0,
    }),
    // Path
    beginPath: noop,
    closePath: noop,
    moveTo: noop,
    lineTo: noop,
    bezierCurveTo: noop,
    quadraticCurveTo: noop,
    arc: noop,
    arcTo: noop,
    ellipse: noop,
    rect: noop,
    fill: noop,
    stroke: noop,
    clip: noop,
    isPointInPath: noopReturn(false),
    isPointInStroke: noopReturn(false),
    // Line dash
    getLineDash: noopReturn([]),
    setLineDash: noop,
    // Image data
    createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }),
    createPattern: noopReturn(null),
    createImageData: (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    getImageData: (_x: number, _y: number, w: number, h: number) => ({
      width: w,
      height: h,
      data: new Uint8ClampedArray(w * h * 4),
    }),
    putImageData: noop,
    drawImage: noop,
  };
  return ctx as unknown as CanvasRenderingContext2D;
}

// ── Web Audio mock ──────────────────────────────────────────────────────────
// SceneryStack's tambo package decodes audio at import time.
// happy-dom doesn't provide AudioContext, so we stub it.

class MockAudioContext {
  readonly sampleRate = 44100;
  readonly state = "running" as AudioContextState;
  readonly destination = {} as AudioDestinationNode;
  createGain(): GainNode {
    const node = {
      gain: { value: 1, setValueAtTime: noop, linearRampToValueAtTime: noop },
      connect: noop,
      disconnect: noop,
    };
    return node as unknown as GainNode;
  }
  createBufferSource(): AudioBufferSourceNode {
    return {
      buffer: null,
      connect: noop,
      disconnect: noop,
      start: noop,
      stop: noop,
      playbackRate: { value: 1 },
    } as unknown as AudioBufferSourceNode;
  }
  createOscillator(): OscillatorNode {
    return { connect: noop, start: noop, stop: noop, frequency: { value: 440 } } as unknown as OscillatorNode;
  }
  createDynamicsCompressor(): DynamicsCompressorNode {
    return { connect: noop, disconnect: noop } as unknown as DynamicsCompressorNode;
  }
  decodeAudioData(_data: ArrayBuffer): Promise<AudioBuffer> {
    return Promise.resolve({
      length: 0,
      duration: 0,
      sampleRate: 44100,
      numberOfChannels: 1,
      getChannelData: () => new Float32Array(0),
    } as unknown as AudioBuffer);
  }
  close(): Promise<void> {
    return Promise.resolve();
  }
  resume(): Promise<void> {
    return Promise.resolve();
  }
}
(globalThis as Record<string, unknown>)["AudioContext"] = MockAudioContext;
(globalThis as Record<string, unknown>)["webkitAudioContext"] = MockAudioContext;

// ── Canvas 2D mock (patch before any scenerystack import) ───────────────────
const origGetContext: typeof HTMLCanvasElement.prototype.getContext = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, contextId: string, ...args: unknown[]) {
  if (contextId === "2d") {
    const ctx = createMockContext2D();
    (ctx as unknown as Record<string, unknown>)["canvas"] = this;
    return ctx as unknown as ReturnType<typeof origGetContext>;
  }
  return origGetContext.call(this, contextId, ...args) as ReturnType<typeof origGetContext>;
} as typeof origGetContext;

// ── SceneryStack init ───────────────────────────────────────────────────────
import { init, madeWithSceneryStackSplashDataURI } from "scenerystack/init";

init({
  name: "qubitSketch",
  version: "1.0.0-test",
  brand: "made-with-scenerystack",
  locale: "en",
  availableLocales: ["en"],
  splashDataURI: madeWithSceneryStackSplashDataURI,
  allowLocaleSwitching: false,
  colorProfiles: ["default"],
});
