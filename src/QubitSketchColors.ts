/**
 * QubitSketchColors.ts
 *
 * Defines all dynamic colors for the simulation using ProfileColorProperty.
 * Each color has a "default" (dark) and "projector" (light) profile.
 */
import { ProfileColorProperty } from "scenerystack/scenery";
import QubitSketchNamespace from "./QubitSketchNamespace.js";

const QubitSketchColors = {
  backgroundColorProperty: new ProfileColorProperty(QubitSketchNamespace, "background", {
    default: "#0d1b2a",
    projector: "#ffffff",
  }),

  panelBackgroundColorProperty: new ProfileColorProperty(QubitSketchNamespace, "panelBackground", {
    default: "#0f3460",
    projector: "#f0f0f0",
  }),

  panelBorderColorProperty: new ProfileColorProperty(QubitSketchNamespace, "panelBorder", {
    default: "#1565c0",
    projector: "#aaaaaa",
  }),

  textColorProperty: new ProfileColorProperty(QubitSketchNamespace, "text", {
    default: "#e8eaf6",
    projector: "#1a1a1a",
  }),

  // Qubit wire and slot colors
  wireColorProperty: new ProfileColorProperty(QubitSketchNamespace, "wire", {
    default: "#1e88e5",
    projector: "#1565c0",
  }),

  slotBackgroundColorProperty: new ProfileColorProperty(QubitSketchNamespace, "slotBackground", {
    default: "#0a2744",
    projector: "#e8eaf6",
  }),

  slotBorderColorProperty: new ProfileColorProperty(QubitSketchNamespace, "slotBorder", {
    default: "#1565c0",
    projector: "#9e9e9e",
  }),

  slotHoverColorProperty: new ProfileColorProperty(QubitSketchNamespace, "slotHover", {
    default: "#1a3a5c",
    projector: "#d0d8e0",
  }),

  selectedToolHighlightColorProperty: new ProfileColorProperty(QubitSketchNamespace, "selectedToolHighlight", {
    default: "#4fc3f7",
    projector: "#1565c0",
  }),

  // Gate colors — one per gate type
  hGateColorProperty: new ProfileColorProperty(QubitSketchNamespace, "hGate", {
    default: "#7c4dff",
    projector: "#6200ea",
  }),

  xGateColorProperty: new ProfileColorProperty(QubitSketchNamespace, "xGate", {
    default: "#ef5350",
    projector: "#c62828",
  }),

  yGateColorProperty: new ProfileColorProperty(QubitSketchNamespace, "yGate", {
    default: "#ff7043",
    projector: "#bf360c",
  }),

  zGateColorProperty: new ProfileColorProperty(QubitSketchNamespace, "zGate", {
    default: "#42a5f5",
    projector: "#1565c0",
  }),

  sGateColorProperty: new ProfileColorProperty(QubitSketchNamespace, "sGate", {
    default: "#26c6da",
    projector: "#00838f",
  }),

  tGateColorProperty: new ProfileColorProperty(QubitSketchNamespace, "tGate", {
    default: "#ffca28",
    projector: "#f57f17",
  }),

  sdgGateColorProperty: new ProfileColorProperty(QubitSketchNamespace, "sdgGate", {
    default: "#00acc1",
    projector: "#006064",
  }),

  tdgGateColorProperty: new ProfileColorProperty(QubitSketchNamespace, "tdgGate", {
    default: "#ffb300",
    projector: "#e65100",
  }),

  vxGateColorProperty: new ProfileColorProperty(QubitSketchNamespace, "vxGate", {
    default: "#ec407a",
    projector: "#ad1457",
  }),

  // Parametrized rotation gates (Rx, Ry, Rz) — lighter relatives of the Pauli colors
  rxGateColorProperty: new ProfileColorProperty(QubitSketchNamespace, "rxGate", {
    default: "#e57373",
    projector: "#b71c1c",
  }),

  ryGateColorProperty: new ProfileColorProperty(QubitSketchNamespace, "ryGate", {
    default: "#ffb74d",
    projector: "#e65100",
  }),

  rzGateColorProperty: new ProfileColorProperty(QubitSketchNamespace, "rzGate", {
    default: "#64b5f6",
    projector: "#0d47a1",
  }),

  eraserColorProperty: new ProfileColorProperty(QubitSketchNamespace, "eraser", {
    default: "#546e7a",
    projector: "#455a64",
  }),

  // Control dot (•) and the vertical connector line linking it to its target
  controlDotColorProperty: new ProfileColorProperty(QubitSketchNamespace, "controlDot", {
    default: "#e8eaf6",
    projector: "#1a1a1a",
  }),

  // SWAP endpoint (✕) markers and the line connecting them
  swapMarkerColorProperty: new ProfileColorProperty(QubitSketchNamespace, "swapMarker", {
    default: "#26a69a",
    projector: "#00695c",
  }),

  // Simulation displays
  probabilityBarColorProperty: new ProfileColorProperty(QubitSketchNamespace, "probabilityBar", {
    default: "#4fc3f7",
    projector: "#1565c0",
  }),

  histogramBarColorProperty: new ProfileColorProperty(QubitSketchNamespace, "histogramBar", {
    default: "#66bb6a",
    projector: "#2e7d32",
  }),

  blochArrowColorProperty: new ProfileColorProperty(QubitSketchNamespace, "blochArrow", {
    default: "#ffca28",
    projector: "#f57f17",
  }),

  blochSphereOutlineColorProperty: new ProfileColorProperty(QubitSketchNamespace, "blochSphereOutline", {
    default: "#1e88e5",
    projector: "#9e9e9e",
  }),
};

export default QubitSketchColors;
