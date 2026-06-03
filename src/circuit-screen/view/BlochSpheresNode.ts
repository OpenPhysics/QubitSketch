/**
 * BlochSpheresNode.ts
 *
 * The Bloch-sphere display: one large, interactive 3D sphere for the focused
 * qubit, plus a row of small thumbnails (one per qubit) you click to focus.
 *
 * Each sphere is an orthographic 3D projection (see BlochSphereNode). Dragging
 * the large sphere rotates a single shared camera (azimuth + elevation), so the
 * big sphere and every thumbnail spin together — a genuine "rotate the 3D view"
 * interaction rather than the old flat 2D projection.
 *
 * When a qubit is entangled its reduced state is mixed: the arrow shrinks toward
 * the center (shown as a dot), a direct cue that "this qubit alone no longer has
 * a definite state."
 */
import { Multilink, NumberProperty, type ReadOnlyProperty } from "scenerystack/axon";
import type { Vector3 } from "scenerystack/dot";
import { Circle, DragListener, Node, Rectangle, Text } from "scenerystack/scenery";
import QubitSketchColors from "../../QubitSketchColors.js";
import { BlochSphereNode } from "./BlochSphereNode.js";

const BIG_RADIUS = 46;
const THUMB_RADIUS = 11;
const THUMB_SPACING = 6;
const SECTION_GAP = 6;
// Initial camera: looking from slightly off-axis and above the equator so all
// three axes are visible (azimuth ≈ −36°, elevation ≈ 20°).
const INITIAL_AZIMUTH = -Math.PI / 5;
const INITIAL_ELEVATION = Math.PI / 9;
const ROTATE_SPEED = 0.01; // radians of camera rotation per pixel dragged
const MIN_ELEVATION = -1.45; // clamp near ±83° to avoid looking straight down the pole
const MAX_ELEVATION = 1.45;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export class BlochSpheresNode extends Node {
  private readonly blochVectorsProperty: ReadOnlyProperty<Vector3[]>;
  private readonly availableWidth: number;

  // View-only camera + focus state (shared by the big sphere and all thumbnails).
  private readonly selectedQubitProperty = new NumberProperty(0);
  private readonly azimuthProperty = new NumberProperty(INITIAL_AZIMUTH);
  private readonly elevationProperty = new NumberProperty(INITIAL_ELEVATION);

  private readonly bigSphere: BlochSphereNode;
  private readonly bigLabel: Text;
  private readonly thumbContainer: Node;
  private thumbs: Array<{ sphere: BlochSphereNode; ring: Rectangle }> = [];

  public constructor(
    blochVectorsProperty: ReadOnlyProperty<Vector3[]>,
    qubitCountProperty: ReadOnlyProperty<number>,
    width: number,
  ) {
    super();
    this.blochVectorsProperty = blochVectorsProperty;
    this.availableWidth = width;

    // ── Large focused sphere ──────────────────────────────────────────────────
    this.bigSphere = new BlochSphereNode({ radius: BIG_RADIUS, detailed: true });
    this.bigSphere.centerX = width / 2;
    this.bigSphere.centerY = BIG_RADIUS + 2;
    this.addChild(this.bigSphere);

    // Transparent disc over the big sphere captures drags (the sphere's own parts
    // are non-pickable so they never steal the pointer).
    const dragArea = new Circle(BIG_RADIUS, {
      centerX: width / 2,
      centerY: BIG_RADIUS + 2,
      fill: "rgba(0,0,0,0)",
      cursor: "pointer",
    });
    dragArea.addInputListener(
      new DragListener({
        drag: (_event, listener) => {
          const delta = listener.modelDelta;
          this.azimuthProperty.value += delta.x * ROTATE_SPEED;
          this.elevationProperty.value = clamp(
            this.elevationProperty.value - delta.y * ROTATE_SPEED,
            MIN_ELEVATION,
            MAX_ELEVATION,
          );
        },
      }),
    );
    this.addChild(dragArea);

    // "qN" caption naming the focused qubit.
    this.bigLabel = new Text("q0", {
      font: "bold 12px monospace",
      fill: QubitSketchColors.textColorProperty,
      centerX: width / 2,
      top: this.bigSphere.bottom + 2,
    });
    this.addChild(this.bigLabel);

    // ── Thumbnail strip ───────────────────────────────────────────────────────
    // Set the translation directly (not `top`): the container is still empty here,
    // so a bounds-relative `top` would resolve against nothing and stack the
    // thumbnails over the big sphere.
    this.thumbContainer = new Node();
    this.thumbContainer.y = this.bigLabel.bottom + SECTION_GAP;
    this.addChild(this.thumbContainer);

    // Rebuild the strip whenever the qubit count changes…
    qubitCountProperty.link((count) => this.rebuildThumbnails(count));
    // …and re-render every sphere whenever the state, focus, or camera changes.
    Multilink.multilink(
      [blochVectorsProperty, this.selectedQubitProperty, this.azimuthProperty, this.elevationProperty],
      () => this.updateAll(),
    );
  }

  /** (Re)creates one thumbnail per qubit, centred in a row, and re-renders. */
  private rebuildThumbnails(count: number): void {
    this.thumbContainer.removeAllChildren();
    this.thumbs = [];

    // Keep the focus in range when the count shrinks.
    if (this.selectedQubitProperty.value > count - 1) {
      this.selectedQubitProperty.value = count - 1;
    }

    // Shrink thumbnails if the default size would overflow the available width.
    const r = Math.min(THUMB_RADIUS, this.availableWidth / count / 2 - THUMB_SPACING / 2 - 2);
    const cell = 2 * r + THUMB_SPACING;
    const rowWidth = count * cell - THUMB_SPACING;
    const startX = (this.availableWidth - rowWidth) / 2;

    for (let q = 0; q < count; q++) {
      const cx = startX + q * cell + r;
      const sphere = new BlochSphereNode({ radius: r });
      sphere.centerX = cx;
      sphere.centerY = r;

      const ring = new Rectangle(cx - r - 3, -3, 2 * r + 6, 2 * r + 6, {
        cornerRadius: 4,
        stroke: QubitSketchColors.selectedToolHighlightColorProperty,
        lineWidth: 2,
        visible: false,
        pickable: false,
      });
      const label = new Text(`q${q}`, {
        font: "9px monospace",
        fill: QubitSketchColors.textColorProperty,
        centerX: cx,
        top: 2 * r + 3,
        pickable: false,
      });
      // Transparent hit disc — clicking focuses this qubit's sphere.
      const hitArea = new Circle(r, { centerX: cx, centerY: r, fill: "rgba(0,0,0,0)" });
      const thumb = new Node({ children: [ring, sphere, label, hitArea], cursor: "pointer" });
      thumb.addInputListener({
        down: () => {
          this.selectedQubitProperty.value = q;
        },
      });

      this.thumbContainer.addChild(thumb);
      this.thumbs.push({ sphere, ring });
    }
    this.updateAll();
  }

  /** Renders the big sphere and every thumbnail from the current state + camera. */
  private updateAll(): void {
    const vectors = this.blochVectorsProperty.value;
    const azimuth = this.azimuthProperty.value;
    const elevation = this.elevationProperty.value;
    const selected = this.selectedQubitProperty.value;

    this.bigSphere.render(vectors[selected] ?? null, azimuth, elevation);
    this.bigLabel.string = `q${selected}`;
    this.bigLabel.centerX = this.availableWidth / 2;

    for (let q = 0; q < this.thumbs.length; q++) {
      const { sphere, ring } = this.thumbs[q]!;
      sphere.render(vectors[q] ?? null, azimuth, elevation);
      ring.visible = q === selected;
    }
  }
}
