/**
 * BlochSphereNode.ts
 *
 * A single 3D-looking Bloch sphere rendered with Scenery vector graphics.
 *
 * This is not a GPU 3D scene: every point of a unit sphere is orthographically
 * projected to 2D through an interactive camera defined by an azimuth (spin
 * about the vertical |0⟩–|1⟩ axis) and an elevation (tilt above the equator). A
 * translucent shaded ball, an equator ring (solid in front, dashed behind), the
 * three Bloch axes, and the state-vector arrow (faded with depth) together read
 * as 3D and rotate live as the user drags.
 *
 * The node draws centred on its local origin (0, 0). It is presentation-only:
 * `render(vector, azimuth, elevation)` redraws the camera-dependent geometry,
 * and the owning BlochSpheresNode drives it from the model + a shared camera.
 */
import { Vector3 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Circle, Node, Path, Text } from "scenerystack/scenery";
import { ArrowNode, ShadedSphereNode } from "scenerystack/scenery-phet";
import QubitSketchColors from "../../QubitSketchColors.js";

export type BlochSphereNodeOptions = {
  /** Sphere radius, in view units. */
  radius: number;
  /** Whether to draw the X/Y axes and the |0⟩/|1⟩/x/y labels (large sphere only). */
  detailed?: boolean;
};

type ScreenPoint = { x: number; y: number; depth: number };

// Number of segments used to draw the equator ring.
const EQUATOR_SAMPLES = 48;
// Treat a Bloch vector shorter than this (a maximally mixed reduced state) as "no arrow".
const MIN_ARROW_LENGTH = 1e-3;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export class BlochSphereNode extends Node {
  private readonly radius: number;
  private readonly detailed: boolean;

  // Wireframe split into the half behind the ball (dashed/faint) and the half in front (solid).
  private readonly backEquator: Path;
  private readonly frontEquator: Path;
  private readonly axesBack: Path;
  private readonly axesFront: Path;

  // State vector and its endpoint marker; the center dot shows a mixed (entangled) state.
  private readonly arrow: ArrowNode;
  private readonly tipDot: Circle;
  private readonly mixedDot: Circle;

  private readonly axisLabels: Array<{ text: Text; point: Vector3 }> = [];

  public constructor(options: BlochSphereNodeOptions) {
    super();
    this.radius = options.radius;
    this.detailed = options.detailed ?? false;
    const r = this.radius;
    const outline = QubitSketchColors.blochSphereOutlineColorProperty;

    // Wireframe behind the translucent ball: dashed + faint so it reads as "far side".
    this.axesBack = new Path(null, { stroke: outline, lineWidth: 0.5, lineDash: [2, 2], opacity: 0.5 });
    this.backEquator = new Path(null, { stroke: outline, lineWidth: 0.75, lineDash: [3, 3], opacity: 0.55 });

    // The 3D body: a translucent shaded ball so the far-side wireframe shows through.
    const ball = new ShadedSphereNode(2 * r, {
      mainColor: QubitSketchColors.blochSphereFillColorProperty,
      highlightColor: QubitSketchColors.blochSphereHighlightColorProperty,
      highlightDiameterRatio: 0.6,
      highlightXOffset: -0.4,
      highlightYOffset: -0.4,
      opacity: 0.45,
      pickable: false,
    });
    const silhouette = new Circle(r, { stroke: outline, lineWidth: 1, opacity: 0.85, pickable: false });

    // Wireframe in front of the ball: solid.
    this.axesFront = new Path(null, { stroke: outline, lineWidth: 0.5 });
    this.frontEquator = new Path(null, { stroke: outline, lineWidth: 1 });

    const arrowColor = QubitSketchColors.blochArrowColorProperty;
    this.arrow = new ArrowNode(0, 0, 0, 0, {
      fill: arrowColor,
      stroke: arrowColor,
      headWidth: this.detailed ? 9 : 6,
      headHeight: this.detailed ? 10 : 6,
      tailWidth: this.detailed ? 2.5 : 1.5,
      pickable: false,
    });
    this.tipDot = new Circle(this.detailed ? 3 : 2, { fill: arrowColor, pickable: false });
    this.mixedDot = new Circle(this.detailed ? 3 : 2.5, { fill: arrowColor, visible: false, pickable: false });

    this.children = [
      this.axesBack,
      this.backEquator,
      ball,
      silhouette,
      this.axesFront,
      this.frontEquator,
      this.arrow,
      this.tipDot,
      this.mixedDot,
    ];

    if (this.detailed) {
      const labelData: ReadonlyArray<readonly [string, Vector3]> = [
        ["x", new Vector3(1, 0, 0)],
        ["y", new Vector3(0, 1, 0)],
        ["|0⟩", new Vector3(0, 0, 1)],
        ["|1⟩", new Vector3(0, 0, -1)],
      ];
      for (const [label, point] of labelData) {
        const text = new Text(label, { font: "11px sans-serif", fill: outline, pickable: false });
        this.axisLabels.push({ text, point });
        this.addChild(text);
      }
    }
  }

  /**
   * Orthographic projection of a point on/inside the unit sphere through a camera
   * at the given azimuth (about z) and elevation (above the equatorial plane).
   *
   * Camera basis (world): right = (−sa, ca, 0); up = (−se·ca, −se·sa, ce);
   * toward-viewer = (ce·ca, ce·sa, se). |0⟩ = +z maps to screen-up, |1⟩ = −z down.
   * `depth` > 0 means the point is on the near (front) hemisphere.
   */
  private project(p: Vector3, azimuth: number, elevation: number): ScreenPoint {
    const ca = Math.cos(azimuth);
    const sa = Math.sin(azimuth);
    const ce = Math.cos(elevation);
    const se = Math.sin(elevation);
    const r = this.radius;
    const sx = -sa * p.x + ca * p.y;
    const up = -se * ca * p.x - se * sa * p.y + ce * p.z;
    const depth = ce * ca * p.x + ce * sa * p.y + se * p.z;
    // Scenery y points down, so screen-up is negated.
    return { x: r * sx, y: -r * up, depth };
  }

  /** Redraws all camera-dependent geometry for the given Bloch vector (null ⇒ mixed). */
  public render(vector: Vector3 | null, azimuth: number, elevation: number): void {
    this.renderEquator(azimuth, elevation);
    if (this.detailed) {
      this.renderAxes(azimuth, elevation);
    }
    this.renderVector(vector, azimuth, elevation);
  }

  /** Equator ring (unit circle in the xy-plane), split into front (solid) and back (dashed). */
  private renderEquator(azimuth: number, elevation: number): void {
    const front = new Shape();
    const back = new Shape();
    let prev = this.project(new Vector3(1, 0, 0), azimuth, elevation);
    for (let i = 1; i <= EQUATOR_SAMPLES; i++) {
      const t = (i / EQUATOR_SAMPLES) * 2 * Math.PI;
      const cur = this.project(new Vector3(Math.cos(t), Math.sin(t), 0), azimuth, elevation);
      const target = (prev.depth + cur.depth) / 2 >= 0 ? front : back;
      target.moveTo(prev.x, prev.y).lineTo(cur.x, cur.y);
      prev = cur;
    }
    this.frontEquator.shape = front;
    this.backEquator.shape = back;
  }

  /** Three Bloch axes through the center, each half assigned to front/back by depth. */
  private renderAxes(azimuth: number, elevation: number): void {
    const front = new Shape();
    const back = new Shape();
    const ends = [new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1)];
    for (const end of ends) {
      const pos = this.project(end, azimuth, elevation);
      const neg = this.project(new Vector3(-end.x, -end.y, -end.z), azimuth, elevation);
      (pos.depth >= 0 ? front : back).moveTo(0, 0).lineTo(pos.x, pos.y);
      (neg.depth >= 0 ? front : back).moveTo(0, 0).lineTo(neg.x, neg.y);
    }
    this.axesFront.shape = front;
    this.axesBack.shape = back;

    // Place each label just inside the surface so the node bounds stay ≈ the sphere diameter.
    const labelInset = 0.78;
    for (const { text, point } of this.axisLabels) {
      const sp = this.project(point, azimuth, elevation);
      text.centerX = sp.x * labelInset;
      text.centerY = sp.y * labelInset;
      text.opacity = sp.depth >= 0 ? 1 : 0.45;
    }
  }

  /** State-vector arrow from the center to the projected tip, faded by depth. */
  private renderVector(vector: Vector3 | null, azimuth: number, elevation: number): void {
    if (vector === null || vector.magnitude < MIN_ARROW_LENGTH) {
      this.arrow.visible = false;
      this.tipDot.visible = false;
      this.mixedDot.visible = true;
      return;
    }
    this.mixedDot.visible = false;
    const tip = this.project(vector, azimuth, elevation);
    this.arrow.visible = true;
    this.arrow.setTailAndTip(0, 0, tip.x, tip.y);
    this.tipDot.visible = true;
    this.tipDot.centerX = tip.x;
    this.tipDot.centerY = tip.y;
    // Near the front hemisphere → fully opaque; far side → dimmed for depth.
    const opacity = 0.45 + 0.55 * clamp((tip.depth + 1) / 2, 0, 1);
    this.arrow.opacity = opacity;
    this.tipDot.opacity = opacity;
  }
}
