/**
 * FONTR55 — Parametric Foundry Vector Font Engine
 *
 * Generates clean, artifact-free, point-compatible Cubic Bézier contours
 * across 20+ continuous design axes including:
 * - Weight (100–1000), Width (50%–150%), Slant (-16° to +16°), Optical Size, Grade
 * - X-Height, Cap Height, Crossbar Height, Ascender/Descender
 * - Spurless (0% spurred grotesque -> 100% seamless continuous spurless arches/bowls)
 * - Aperture (0% open geometric -> 100% tight Swiss neo-grotesque)
 * - Terminal Cut (0% radial -> 100% horizontal shear)
 * - Bowl Squaring (0% circular -> 100% superellipse)
 * - Shoulder Tension (0% humanist -> 100% high-shoulder grotesque)
 * - Ink Traps (0% none -> 100% surgical Whyte-style vertex traps) + Trap Depth + Trap Width
 * - Elegance / Contrast (0% monoline -> 100% high-contrast modulated editorial) + Contrast Angle + Terminal Flare
 * - Roundness / ROND (0% crisp corners -> 100% rounded pill terminals & corners)
 * - Tracking & Optical Overshoot
 */

export const DEFAULT_PARAMS = {
  // Top bar
  size: 100, // 20% to 200%

  // Column 1: Primary Dimensions & Optical
  weight: 1000,      // 100 to 1000 (Matches screenshot default: Weight 1000)
  width: 84,         // 50% to 140% (Matches screenshot default: Width 84%)
  opticalSize: 72,   // 8pt to 144pt
  grade: 0,          // -50 to +50

  // Column 2: Proportions & Posture
  slant: 0,          // -16° to +16°
  xHeight: 74,       // 62% to 82% of Cap Height
  crossbar: 0,       // -30% to +30% vertical shift
  ascender: 100,     // 85% to 118% extent

  // Column 3: Grotesque & Spurless Anatomy
  spurless: 0,       // 0% (Spurred Grotesque) to 100% (Pure Spurless Continuous)
  aperture: 35,      // 0% (Open Geometric) to 100% (Closed Neo-Grotesque)
  terminalCut: 45,   // 0% (Radial Cut) to 100% (Horizontal Grotesque Cut)
  squaring: 18,      // 0% (Pure Circle) to 100% (Boxed Superellipse)
  shoulder: 50,      // 0% (Central Arch) to 100% (High Cornered Shoulder)

  // Column 4: Ink Traps & Elegance
  inkTraps: 0,       // 0% to 100% (Surgical vertex ink traps)
  trapDepth: 65,     // 20% to 100%
  trapWidth: 55,     // 20% to 100%
  elegance: 0,       // 0% (Monoline) to 100% (High-Contrast Editorial Modulation)
  contrastAngle: 0,  // 0° to 30° stress axis
  flare: 0,          // 0% to 100% glyphic terminal flare (Optima-like)
  roundness: 0,      // 0% (Crisp) to 100% (Soft ROND terminals)

  // Column 5: Spacing & Details
  tracking: 0,       // -40 to +160 (in 1/1000 em)
  overshoot: 100,    // 0% to 160% optical curve overshoot
  singleStoryA: 0,   // 0 (Double-story 'a') or 1 (Single-story 'a')
  doubleStoryG: 0,   // 0 (Grotesque single-loop 'g') or 1 (Double-story 'g')
  slashedZero: 0,    // 0 or 1
};

const KAPPA = 0.5522847498;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Compute derived typographic metrics from user slider parameters
 */
export function computeMetrics(rawParams = {}) {
  const p = { ...DEFAULT_PARAMS, ...rawParams };

  const UPM = 1000;
  const cap = 720;
  const xhRatio = clamp(p.xHeight, 60, 84) / 100;
  const xh = Math.round(cap * xhRatio);
  const ascScale = clamp(p.ascender, 85, 120) / 100;
  const asc = Math.round(755 * ascScale);
  const desc = -Math.round(205 * ascScale);

  // Optical size adjustments (smaller optical sizes open counters and boost x-height slightly)
  const opszFactor = clamp((72 - p.opticalSize) / 64, -0.5, 1);
  const effectiveWeight = clamp(p.weight + p.grade * 1.4 + opszFactor * 18, 90, 1050);
  const wNorm = (effectiveWeight - 100) / 900; // 0..1

  // Width scale (84% in screenshot is compact display; 100% is normal)
  const widthScale = clamp(p.width / 100, 0.5, 1.45) * (1 + opszFactor * 0.04);

  // Base vertical stem thickness V (from 26 at Thin 100 to 212 at Black 1000)
  const rawV = lerp(26, 214, Math.pow(clamp(wNorm, 0, 1.05), 0.92));
  // Scale stem slightly with widthScale so ultra-condensed black still preserves counters
  const V = rawV * clamp(0.76 + 0.26 * widthScale, 0.72, 1.08);

  // Elegance / Stroke Contrast (0% = monoline optical 0.85*V, 100% = high-contrast 0.21*V)
  const eleg = clamp(p.elegance / 100, 0, 1);
  const contrastRad = (clamp(p.contrastAngle, 0, 35) * Math.PI) / 180;
  const baseHRatio = lerp(0.85, 0.21, Math.pow(eleg, 0.88));
  const H = Math.max(14, V * baseHRatio);

  // Diagonal primary (\) and secondary (/) stroke thicknesses
  const D1 = V * lerp(0.97, 1.03, eleg * Math.cos(contrastRad));
  const D2 = Math.max(15, V * lerp(0.92, 0.26, Math.pow(eleg, 0.85)));

  // Curve superellipse tension kappa
  const sq = clamp(p.squaring / 100, 0, 1);
  const kappaOut = lerp(KAPPA, 0.77, sq);
  const kappaIn = lerp(KAPPA, 0.72, sq * 0.85);

  // Optical overshoot for curved tops/bottoms
  const ovScale = clamp(p.overshoot / 100, 0, 1.6);
  const ov = Math.round(lerp(8, 17, wNorm) * ovScale);

  // Spurless, Aperture, Terminal Cut, Shoulder
  const spurless = clamp(p.spurless / 100, 0, 1);
  const aperture = clamp(p.aperture / 100 - opszFactor * 0.08, 0, 1);
  const termCut = clamp(p.terminalCut / 100, 0, 1);
  const shoulder = clamp(p.shoulder / 100, 0, 1);

  // Ink traps
  const inkTraps = clamp(p.inkTraps / 100, 0, 1);
  const trapDepth = clamp(p.trapDepth / 100, 0.15, 1);
  const trapWidth = clamp(p.trapWidth / 100, 0.15, 1);

  // Flare & Roundness
  const flare = clamp(p.flare / 100, 0, 1);
  const roundness = clamp(p.roundness / 100, 0, 1);
  const crossbarShift = clamp(p.crossbar / 100, -0.35, 0.35);
  const slantTan = Math.tan((clamp(p.slant, -18, 18) * Math.PI) / 180);

  return {
    p,
    UPM,
    cap,
    xh,
    asc,
    desc,
    wNorm,
    widthScale,
    V,
    H,
    D1,
    D2,
    eleg,
    kappaOut,
    kappaIn,
    ov,
    spurless,
    aperture,
    termCut,
    shoulder,
    inkTraps,
    trapDepth,
    trapWidth,
    flare,
    roundness,
    crossbarShift,
    slantTan,
  };
}

/**
 * Helper to create a polygon/mixed contour with automatic Ink Trap, Flare, and Corner Fillet operators.
 *
 * A contour is an array of segment descriptors:
 * - { type: 'pt', x, y, r?: number, trap?: { d?: number, w?: number, bx?: number, by?: number } }
 * - { type: 'cubic', c1x, c1y, c2x, c2y, x, y, r?: number }
 */
export class PathCompiler {
  constructor(m) {
    this.m = m;
    this.contours = []; // Each contour is an array of SVG/OpenType commands: { cmd: 'M'|'L'|'C'|'Z', ... }
  }

  /**
   * Add a closed polygon of points where each point is [x, y, opts]
   * opts: { r: cornerRadiusScale (default 1), trap: { d: depthScale, w: widthScale, bx, by } }
   */
  addPolygon(pts, dir = 1) {
    if (!pts || pts.length < 3) return;
    const nodes = pts.map((pt) => ({
      type: 'pt',
      x: pt[0],
      y: pt[1],
       ...(pt[2] || {}),
    }));
    this.addMixedContour(nodes, dir);
  }

  /**
   * Compile a mixed contour (points + cubic Béziers) with Ink Traps, Terminal Flare, and Roundness fillets
   * dir = 1 for CW outer contour, -1 for CCW inner counter contour
   */
  addMixedContour(rawNodes, dir = 1) {
    if (!rawNodes || rawNodes.length < 2) return;
    const m = this.m;

    // 1. Expand any polygon vertices that have Ink Traps enabled when m.inkTraps > 0.01
    const expanded = [];
    const n = rawNodes.length;

    for (let i = 0; i < n; i++) {
      const curr = rawNodes[i];
      const prev = rawNodes[(i - 1 + n) % n];
      const next = rawNodes[(i + 1) % n];

      if (
        m.inkTraps > 0.01 &&
        curr.trap &&
        curr.type === 'pt' &&
        next.type === 'pt'
      ) {
        const dx1 = prev.x - curr.x;
        const dy1 = prev.y - curr.y;
        const len1 = Math.hypot(dx1, dy1);

        const dx2 = next.x - curr.x;
        const dy2 = next.y - curr.y;
        const len2 = Math.hypot(dx2, dy2);

        if (len1 > 6 && len2 > 6) {
          const u1x = dx1 / len1;
          const u1y = dy1 / len1;
          const u2x = dx2 / len2;
          const u2y = dy2 / len2;

          // Bisector pointing INTO the ink body
          let bx = curr.trap.bx;
          let by = curr.trap.by;
          if (bx === undefined || by === undefined) {
            // Default: opposite of the interior corner opening vector (u1 + u2)
            let sx = -(u1x + u2x);
            let sy = -(u1y + u2y);
            const slen = Math.hypot(sx, sy);
            if (slen > 1e-4) {
              bx = sx / slen;
              by = sy / slen;
            } else {
              bx = -u1y;
              by = u1x;
            }
          } else {
            const blen = Math.hypot(bx, by) || 1;
            bx /= blen;
            by /= blen;
          }

          const wScale = curr.trap.w ?? 1.0;
          const dScale = curr.trap.d ?? 1.0;
          const maxDepth = curr.trap.maxD ?? m.V * 0.62;

          const mouth = Math.min(
            len1 * 0.38,
            len2 * 0.38,
            m.V * (0.12 + 0.30 * m.trapWidth) * m.inkTraps * wScale
          );
          const depth = Math.min(
            maxDepth,
            m.V * (0.24 + 0.68 * m.trapDepth) * m.inkTraps * dScale
          );

          if (mouth > 1.2 && depth > 1.8) {
            // Chisel tip perpendicular to bisector, oriented from u1 side to u2 side
            let px = -by;
            let py = bx;
            if (px * (u2x - u1x) + py * (u2y - u1y) < 0) {
              px = -px;
              py = -py;
            }
            const tipHalfW = Math.max(1.2, mouth * 0.22);

            const m1x = curr.x + u1x * mouth;
            const m1y = curr.y + u1y * mouth;
            const t1x = curr.x + bx * depth - px * tipHalfW;
            const t1y = curr.y + by * depth - py * tipHalfW;
            const t2x = curr.x + bx * depth + px * tipHalfW;
            const t2y = curr.y + by * depth + py * tipHalfW;
            const m2x = curr.x + u2x * mouth;
            const m2y = curr.y + u2y * mouth;

            expanded.push({ type: 'pt', x: m1x, y: m1y, r: 0.15 });
            expanded.push({
              type: 'cubic',
              c1x: lerp(m1x, t1x, 0.45),
              c1y: lerp(m1y, t1y, 0.45),
              c2x: lerp(m1x, t1x, 0.82),
              c2y: lerp(m1y, t1y, 0.82),
              x: t1x,
              y: t1y,
              r: 0,
            });
            expanded.push({ type: 'pt', x: t2x, y: t2y, r: 0 });
            expanded.push({
              type: 'cubic',
              c1x: lerp(t2x, m2x, 0.18),
              c1y: lerp(t2y, m2y, 0.18),
              c2x: lerp(t2x, m2x, 0.55),
              c2y: lerp(t2y, m2y, 0.55),
              x: m2x,
              y: m2y,
              r: 0.15,
            });
            continue;
          }
        }
      }
      expanded.push(curr);
    }

    // 2. Compile into commands with optional Corner Roundness (ROND) and Terminal Flare
    const cmds = [];
    const len = expanded.length;
    const baseRoundRadius = m.roundness * Math.min(m.V * 0.48, 46);

    // Compute corner fillets for 'pt' nodes bounded by straight segments
    const fillets = new Array(len).fill(null);
    if (baseRoundRadius > 0.75) {
      for (let i = 0; i < len; i++) {
        const curr = expanded[i];
        const prev = expanded[(i - 1 + len) % len];
        const next = expanded[(i + 1) % len];
        const rMult = curr.r ?? 1.0;
        if (rMult <= 0 || curr.type !== 'pt' || next.type !== 'pt') continue;

        const v1x = prev.x - curr.x;
        const v1y = prev.y - curr.y;
        const l1 = Math.hypot(v1x, v1y);

        const v2x = next.x - curr.x;
        const v2y = next.y - curr.y;
        const l2 = Math.hypot(v2x, v2y);

        if (l1 < 3 || l2 < 3) continue;
        const u1x = v1x / l1;
        const u1y = v1y / l1;
        const u2x = v2x / l2;
        const u2y = v2y / l2;

        const dot = clamp(u1x * u2x + u1y * u2y, -0.999, 0.999);
        const angle = Math.acos(dot);
        if (angle > Math.PI - 0.05 || angle < 0.05) continue;

        const r = Math.min(baseRoundRadius * rMult, l1 * 0.44, l2 * 0.44);
        if (r < 0.75) continue;

        const p1x = curr.x + u1x * r;
        const p1y = curr.y + u1y * r;
        const p2x = curr.x + u2x * r;
        const p2y = curr.y + u2y * r;

        const handleFactor = KAPPA * clamp((Math.PI - angle) / (Math.PI / 2), 0.35, 1.25);
        fillets[i] = {
          p1x,
          p1y,
          c1x: p1x - u1x * r * handleFactor,
          c1y: p1y - u1y * r * handleFactor,
          c2x: p2x - u2x * r * handleFactor,
          c2y: p2y - u2y * r * handleFactor,
          p2x,
          p2y,
        };
      }
    }

    // Start point
    const firstFillet = fillets[0];
    const startX = firstFillet ? firstFillet.p2x : expanded[0].x;
    const startY = firstFillet ? firstFillet.p2y : expanded[0].y;
    cmds.push({ cmd: 'M', x: startX, y: startY });

    for (let i = 1; i <= len; i++) {
      const idx = i % len;
      const node = expanded[idx];
      const prevNode = expanded[(idx - 1 + len) % len];
      const f = fillets[idx];

      if (node.type === 'cubic') {
        cmds.push({
          cmd: 'C',
          c1x: node.c1x,
          c1y: node.c1y,
          c2x: node.c2x,
          c2y: node.c2y,
          x: node.x,
          y: node.y,
        });
      } else if (f) {
        this.emitLineOrFlare(cmds, prevNode, f.p1x, f.p1y, node.flare);
        cmds.push({
          cmd: 'C',
          c1x: f.c1x,
          c1y: f.c1y,
          c2x: f.c2x,
          c2y: f.c2y,
          x: f.p2x,
          y: f.p2y,
        });
      } else {
        this.emitLineOrFlare(cmds, prevNode, node.x, node.y, node.flare);
      }
    }

    cmds.push({ cmd: 'Z' });
    this.contours.push(this.ensureContourWinding(cmds, dir));
  }

  ensureContourWinding(cmds, dir = 1) {
    // Sample points along contour to compute signed shoelace area in +Y-up font space
    const pts = [];
    let cx = 0, cy = 0;
    for (const seg of cmds) {
      if (seg.cmd === 'M' || seg.cmd === 'L') {
        cx = seg.x;
        cy = seg.y;
        pts.push({ x: cx, y: cy });
      } else if (seg.cmd === 'C') {
        // Sample midpoint + endpoint of cubic for accurate winding area
        const mx = 0.125 * cx + 0.375 * seg.c1x + 0.375 * seg.c2x + 0.125 * seg.x;
        const my = 0.125 * cy + 0.375 * seg.c1y + 0.375 * seg.c2y + 0.125 * seg.y;
        pts.push({ x: mx, y: my });
        cx = seg.x;
        cy = seg.y;
        pts.push({ x: cx, y: cy });
      }
    }
    if (pts.length < 3) return cmds;

    let area2 = 0;
    for (let i = 0; i < pts.length; i++) {
      const p1 = pts[i];
      const p2 = pts[(i + 1) % pts.length];
      area2 += p1.x * p2.y - p2.x * p1.y;
    }

    // In +Y-up coordinates: CW has area2 < 0 (dir = 1), CCW has area2 > 0 (dir = -1)
    const isCurrentlyCW = area2 < 0;
    const wantCW = dir >= 0;
    if (isCurrentlyCW === wantCW) return cmds;

    // Reverse compiled [M, L/C..., Z] segments losslessly
    const drawSegs = cmds.filter((s) => s.cmd === 'L' || s.cmd === 'C');
    const startPt = { x: cmds[0].x, y: cmds[0].y };
    const endPts = [startPt];
    for (const s of drawSegs) {
      endPts.push({ x: s.x, y: s.y });
    }
    const lastPt = endPts[endPts.length - 1];
    if (Math.hypot(lastPt.x - startPt.x, lastPt.y - startPt.y) > 0.1) {
      drawSegs.push({ cmd: 'L', x: startPt.x, y: startPt.y });
      endPts.push(startPt);
    }

    const rev = [{ cmd: 'M', x: endPts[endPts.length - 1].x, y: endPts[endPts.length - 1].y }];
    for (let i = drawSegs.length - 1; i >= 0; i--) {
      const seg = drawSegs[i];
      const target = endPts[i];
      if (seg.cmd === 'L') {
        rev.push({ cmd: 'L', x: target.x, y: target.y });
      } else if (seg.cmd === 'C') {
        rev.push({
          cmd: 'C',
          c1x: seg.c2x,
          c1y: seg.c2y,
          c2x: seg.c1x,
          c2y: seg.c1y,
          x: target.x,
          y: target.y,
        });
      }
    }
    rev.push({ cmd: 'Z' });
    return rev;
  }

  emitLineOrFlare(cmds, prevNode, tx, ty, flareDir) {
    const m = this.m;
    if (m.flare > 0.02 && flareDir) {
      const last = cmds[cmds.length - 1];
      const sx = last.x;
      const sy = last.y;
      const dx = tx - sx;
      const dy = ty - sy;
      const len = Math.hypot(dx, dy);
      if (len > 80) {
        // Concave waisting along long stems for Optima-like glyphic elegance
        const nx = (-dy / len) * flareDir * m.flare * Math.min(m.V * 0.14, 14);
        const ny = (dx / len) * flareDir * m.flare * Math.min(m.V * 0.14, 14);
        cmds.push({
          cmd: 'C',
          c1x: lerp(sx, tx, 0.33) + nx,
          c1y: lerp(sy, ty, 0.33) + ny,
          c2x: lerp(sx, tx, 0.67) + nx,
          c2y: lerp(sy, ty, 0.67) + ny,
          x: tx,
          y: ty,
        });
        return;
      }
    }
    cmds.push({ cmd: 'L', x: tx, y: ty });
  }

  /**
   * Add a superelliptical ring or oval contour:
   * dir = 1 for CW (outer contour), -1 for CCW (inner counter)
   */
  addSuperellipse(cx, cy, rx, ry, dir = 1, kOverride = null) {
    if (rx <= 1 || ry <= 1) return;
    const k = kOverride ?? (dir === 1 ? this.m.kappaOut : this.m.kappaIn);
    const kx = rx * k;
    const ky = ry * k;

    if (dir === 1) {
      // CW in +Y-up font space: Left -> Top -> Right -> Bottom -> Left
      this.contours.push([
        { cmd: 'M', x: cx - rx, y: cy },
        { cmd: 'C', c1x: cx - rx, c1y: cy + ky, c2x: cx - kx, c2y: cy + ry, x: cx, y: cy + ry },
        { cmd: 'C', c1x: cx + kx, c1y: cy + ry, c2x: cx + rx, c2y: cy + ky, x: cx + rx, y: cy },
        { cmd: 'C', c1x: cx + rx, c1y: cy - ky, c2x: cx + kx, c2y: cy - ry, x: cx, y: cy - ry },
        { cmd: 'C', c1x: cx - kx, c1y: cy - ry, c2x: cx - rx, c2y: cy - ky, x: cx - rx, y: cy },
        { cmd: 'Z' },
      ]);
    } else {
      // CCW in +Y-up font space: Left -> Bottom -> Right -> Top -> Left
      this.contours.push([
        { cmd: 'M', x: cx - rx, y: cy },
        { cmd: 'C', c1x: cx - rx, c1y: cy - ky, c2x: cx - kx, c2y: cy - ry, x: cx, y: cy - ry },
        { cmd: 'C', c1x: cx + kx, c1y: cy - ry, c2x: cx + rx, c2y: cy - ky, x: cx + rx, y: cy },
        { cmd: 'C', c1x: cx + rx, c1y: cy + ky, c2x: cx + kx, c2y: cy + ry, x: cx, y: cy + ry },
        { cmd: 'C', c1x: cx - kx, c1y: cy + ry, c2x: cx - rx, c2y: cy + ky, x: cx - rx, y: cy },
        { cmd: 'Z' },
      ]);
    }
  }

  /**
   * Convert compiled contours into an SVG path string (`d="..."`)
   * with slant transform and Y-inversion relative to baseline = 0
   */
  toSVGPath(offsetX = 0, baselineY = 0, scale = 1) {
    const slant = this.m.slantTan;
    const tx = (x, y) => ((x + y * slant) * scale + offsetX).toFixed(2);
    const ty = (y) => (baselineY - y * scale).toFixed(2);

    const parts = [];
    for (const c of this.contours) {
      for (const seg of c) {
        if (seg.cmd === 'M') {
          parts.push(`M${tx(seg.x, seg.y)} ${ty(seg.y)}`);
        } else if (seg.cmd === 'L') {
          parts.push(`L${tx(seg.x, seg.y)} ${ty(seg.y)}`);
        } else if (seg.cmd === 'C') {
          parts.push(
            `C${tx(seg.c1x, seg.c1y)} ${ty(seg.c1y)} ${tx(seg.c2x, seg.c2y)} ${ty(seg.c2y)} ${tx(seg.x, seg.y)} ${ty(seg.y)}`
          );
        } else if (seg.cmd === 'Z') {
          parts.push('Z');
        }
      }
    }
    return parts.join(' ');
  }

  /**
   * Return raw contours with slant applied in standard OpenType +Y up coordinates (for TTF/OTF export)
   */
  toFontContours() {
    const slant = this.m.slantTan;
    const sx = (x, y) => Math.round(x + y * slant);
    const sy = (y) => Math.round(y);

    return this.contours.map((c) =>
      c.map((seg) => {
        if (seg.cmd === 'M' || seg.cmd === 'L') {
          return { cmd: seg.cmd, x: sx(seg.x, seg.y), y: sy(seg.y) };
        }
        if (seg.cmd === 'C') {
          return {
            cmd: 'C',
            c1x: sx(seg.c1x, seg.c1y),
            c1y: sy(seg.c1y),
            c2x: sx(seg.c2x, seg.c2y),
            c2y: sy(seg.c2y),
            x: sx(seg.x, seg.y),
            y: sy(seg.y),
          };
        }
        return { cmd: 'Z' };
      })
    );
  }
}

/**
 * Build a C-like open-aperture contour (used for C, c, G, e base, etc.)
 * Perfectly smooth 4-quadrant superellipse with parametric Aperture & Terminal Cut
 */
function addOpenBowlContour(pc, m, {
  cx, cy, rx, ry, vStroke, hStroke,
  topAngleDeg = 32,   // degrees above horizontal on right side
  botAngleDeg = 32,   // degrees below horizontal on right side
  extraNodesBottomRight = null, // optional hook for G or e crossbar
}) {
  const kOut = m.kappaOut;
  const kIn = m.kappaIn;
  const ix = Math.max(rx * 0.16, rx - vStroke);
  const iy = Math.max(ry * 0.16, ry - hStroke);

  // Convert aperture parameter: higher aperture value = tighter closed grotesque jaws
  const topA = (clamp(topAngleDeg - m.aperture * 20, 6, 68) * Math.PI) / 180;
  const botA = (clamp(botAngleDeg - m.aperture * 20, 6, 68) * Math.PI) / 180;

  // Outer & Inner terminal coordinates on right quadrant
  const outTopX = cx + rx * Math.cos(topA);
  const outTopY = cy + ry * Math.sin(topA);
  const inTopY = lerp(
    cy + iy * Math.sin(topA),
    outTopY - hStroke * 0.35,
    m.termCut * 0.72
  );
  const inTopX = cx + ix * Math.cos(asinClamp((inTopY - cy) / iy));

  const outBotX = cx + rx * Math.cos(botA);
  const outBotY = cy - ry * Math.sin(botA);
  const inBotY = lerp(
    cy - iy * Math.sin(botA),
    outBotY + hStroke * 0.35,
    m.termCut * 0.72
  );
  const inBotX = cx + ix * Math.cos(asinClamp((cy - inBotY) / iy));

  const kxOut = rx * kOut;
  const kyOut = ry * kOut;
  const kxIn = ix * kIn;
  const kyIn = iy * kIn;

  // Fractional handle scaling for right-top and right-bottom partial quadrants
  const topFrac = clamp((Math.PI / 2 - topA) / (Math.PI / 2), 0.18, 1);
  const botFrac = clamp((Math.PI / 2 - botA) / (Math.PI / 2), 0.18, 1);

  const nodes = [
    // Start at outer top-right terminal
    { type: 'pt', x: outTopX, y: outTopY, r: 0.75 },
    // Curve up-left to top crown (cx, cy + ry)
    {
      type: 'cubic',
      c1x: outTopX - rx * Math.sin(topA) * kOut * topFrac * 0.75,
      c1y: lerp(outTopY, cy + ry, 0.58 + 0.25 * (1 - topFrac)),
      c2x: cx + kxOut * topFrac,
      c2y: cy + ry,
      x: cx,
      y: cy + ry,
    },
    // Top crown -> Left outer cheek (cx - rx, cy)
    {
      type: 'cubic',
      c1x: cx - kxOut,
      c1y: cy + ry,
      c2x: cx - rx,
      c2y: cy + kyOut,
      x: cx - rx,
      y: cy,
    },
    // Left outer cheek -> Bottom crown (cx, cy - ry)
    {
      type: 'cubic',
      c1x: cx - rx,
      c1y: cy - kyOut,
      c2x: cx - kxOut,
      c2y: cy - ry,
      x: cx,
      y: cy - ry,
    },
  ];

  if (extraNodesBottomRight) {
    extraNodesBottomRight(nodes, {
      cx, cy, rx, ry, ix, iy, kxOut, kyOut, kxIn, kyIn,
      outTopX, outTopY, inTopX, inTopY, topFrac, topA,
    });
  } else {
    // Bottom crown -> Outer bottom-right terminal
    nodes.push(
      {
        type: 'cubic',
        c1x: cx + kxOut * botFrac,
        c1y: cy - ry,
        c2x: outBotX - rx * Math.sin(botA) * kOut * botFrac * 0.75,
        c2y: lerp(outBotY, cy - ry, 0.58 + 0.25 * (1 - botFrac)),
        x: outBotX,
        y: outBotY,
      },
      // Inner bottom-right terminal
      { type: 'pt', x: inBotX, y: inBotY, r: 0.75 },
      // Curve down-left to inner bottom crown (cx, cy - iy)
      {
        type: 'cubic',
        c1x: inBotX - ix * Math.sin(botA) * kIn * botFrac * 0.65,
        c1y: lerp(inBotY, cy - iy, 0.62),
        c2x: cx + kxIn * botFrac,
        c2y: cy - iy,
        x: cx,
        y: cy - iy,
      },
      // Inner bottom -> Inner left wall (cx - ix, cy)
      {
        type: 'cubic',
        c1x: cx - kxIn,
        c1y: cy - iy,
        c2x: cx - ix,
        c2y: cy - kyIn,
        x: cx - ix,
        y: cy,
      },
      // Inner left wall -> Inner top crown (cx, cy + iy)
      {
        type: 'cubic',
        c1x: cx - ix,
        c1y: cy + kyIn,
        c2x: cx - kxIn,
        c2y: cy + iy,
        x: cx,
        y: cy + iy,
      },
      // Inner top crown -> Inner top-right terminal
      {
        type: 'cubic',
        c1x: cx + kxIn * topFrac,
        c1y: cy + iy,
        c2x: inTopX - ix * Math.sin(topA) * kIn * topFrac * 0.65,
        c2y: lerp(inTopY, cy + iy, 0.62),
        x: inTopX,
        y: inTopY,
      }
    );
  }

  pc.addMixedContour(nodes);
}

function asinClamp(v) {
  return Math.asin(clamp(v, -0.999, 0.999));
}

/**
 * Canonical 12-extremum S / s contour builder (G2 smooth spine & terminals)
 */
function addSContour(pc, m, { xL, xR, topY, botY, vStroke, hStroke }) {
  const w = xR - xL;
  const h = topY - botY;
  const cx = (xL + xR) * 0.5;
  const waistY = botY + h * (0.51 + m.crossbarShift * 0.12);

  // Upper loop is slightly narrower than lower loop for optical stability
  const upL = xL + w * 0.025;
  const upR = xR - w * 0.03;
  const loL = xL;
  const loR = xR;

  const vS = Math.min(vStroke * 0.90, w * 0.32);
  const hS = Math.min(hStroke * 0.86, h * 0.19);
  const spineThick = Math.min(
    h * 0.205,
    lerp(Math.max(hS * 1.04, vS * 0.80), Math.max(hS * 1.02, vS * 0.56), m.eleg * 0.55)
  );

  // Spine top and bottom y at cx
  const spineTopY = waistY + spineThick * 0.5;
  const spineBotY = waistY - spineThick * 0.5;

  // Inner counter vertical midpoints
  const upperInnerMidY = lerp(spineTopY, topY - hS, 0.52);
  const lowerInnerMidY = lerp(botY + hS, spineBotY, 0.48);

  // Outer cheeks wrap around the outside of the diagonal turn
  const upperOuterMidY = lerp(spineBotY, topY, 0.47);
  const lowerOuterMidY = lerp(botY, spineTopY, 0.53);

  // Terminal aperture control: terminals curl to the cheek level with horizontal/hooded cut
  const topCrownInY = topY - hS;
  const botCrownInY = botY + hS;
  const topTermOutY = lerp(
    upperInnerMidY - hS * 0.06,
     lerp(upperInnerMidY, topCrownInY, 0.48),
    m.aperture
  );
  const topTermInY = Math.min(
    topCrownInY - 14,
    lerp(topTermOutY + hS * 0.20, topTermOutY, m.termCut)
  );
  const topTermInX = upR - vS * lerp(0.95, 1.0, m.termCut);

  const botTermOutY = lerp(
    lowerInnerMidY + hS * 0.06,
    lerp(lowerInnerMidY, botCrownInY, 0.48),
    m.aperture
  );
  const botTermInY = Math.max(
    botCrownInY + 14,
    lerp(botTermOutY - hS * 0.20, botTermOutY, m.termCut)
  );
  const botTermInX = loL + vS * lerp(0.95, 1.0, m.termCut);

  const k = m.kappaOut;
  const kIn = m.kappaIn;
  const dxSpineIn = Math.max(18, Math.min(w * 0.18, (cx - (upL + vS)) * 0.65));
  const dxSpineOut = w * 0.20;
  // Monotonic spine slope that never overshoots inner counter midpoints
  const dySpineIn = Math.min(
    (upperInnerMidY - spineTopY) * 0.42,
    (spineBotY - lowerInnerMidY) * 0.42
  );
  const dySpineOut = dySpineIn * (dxSpineOut / dxSpineIn);

  const nodes = [
    // 1. Outer top-right terminal
    { type: 'pt', x: upR, y: topTermOutY, r: 0.7 },
    // 2. Curve to Top outer crown (cx, topY)
    {
      type: 'cubic',
      c1x: upR,
      c1y: lerp(topTermOutY, topY, k),
      c2x: lerp(cx, upR, k),
      c2y: topY,
      x: cx,
      y: topY,
    },
    // 3. Top outer crown -> Upper-left outer cheek (upL, upperOuterMidY)
    {
      type: 'cubic',
      c1x: lerp(cx, upL, k),
      c1y: topY,
      c2x: upL,
      c2y: lerp(upperOuterMidY, topY, k),
      x: upL,
      y: upperOuterMidY,
    },
    // 4. Upper-left outer cheek -> Spine lower edge -> Lower-right inner cheek (loR - vS, lowerInnerMidY)
    {
      type: 'cubic',
      c1x: upL,
      c1y: lerp(upperOuterMidY, spineBotY, 0.56),
      c2x: cx - dxSpineOut,
      c2y: spineBotY + dySpineOut,
      x: cx,
      y: spineBotY,
    },
    {
      type: 'cubic',
      c1x: cx + dxSpineIn,
      c1y: spineBotY - dySpineIn,
      c2x: loR - vS,
      c2y: lerp(spineBotY, lowerInnerMidY, 0.66),
      x: loR - vS,
      y: lowerInnerMidY,
    },
    // 5. Lower-right inner cheek -> Bottom inner crown (cx, botY + hS)
    {
      type: 'cubic',
      c1x: loR - vS,
      c1y: lerp(lowerInnerMidY, botY + hS, kIn),
      c2x: lerp(cx, loR - vS, kIn),
      c2y: botY + hS,
      x: cx,
      y: botY + hS,
    },
    // 6. Bottom inner crown -> Bottom-left inner terminal
    {
      type: 'cubic',
      c1x: lerp(cx, botTermInX, kIn),
      c1y: botY + hS,
      c2x: botTermInX,
      c2y: lerp(botTermInY, botY + hS, kIn),
      x: botTermInX,
      y: botTermInY,
    },
    // 7. Bottom-left outer terminal
    { type: 'pt', x: loL, y: botTermOutY, r: 0.7 },
    // 8. Bottom-left outer terminal -> Bottom outer crown (cx, botY)
    {
      type: 'cubic',
      c1x: loL,
      c1y: lerp(botTermOutY, botY, k),
      c2x: lerp(cx, loL, k),
      c2y: botY,
      x: cx,
      y: botY,
    },
    // 9. Bottom outer crown -> Lower-right outer cheek (loR, lowerOuterMidY)
    {
      type: 'cubic',
      c1x: lerp(cx, loR, k),
      c1y: botY,
      c2x: loR,
      c2y: lerp(lowerOuterMidY, botY, k),
      x: loR,
      y: lowerOuterMidY,
    },
    // 10. Lower-right outer cheek -> Spine upper edge -> Upper-left inner cheek (upL + vS, upperInnerMidY)
    {
      type: 'cubic',
      c1x: loR,
      c1y: lerp(lowerOuterMidY, spineTopY, 0.56),
      c2x: cx + dxSpineOut,
      c2y: spineTopY - dySpineOut,
      x: cx,
      y: spineTopY,
    },
    {
      type: 'cubic',
      c1x: cx - dxSpineIn,
      c1y: spineTopY + dySpineIn,
      c2x: upL + vS,
      c2y: lerp(spineTopY, upperInnerMidY, 0.66),
      x: upL + vS,
      y: upperInnerMidY,
    },
    // 11. Upper-left inner cheek -> Top inner crown (cx, topY - hS)
    {
      type: 'cubic',
      c1x: upL + vS,
      c1y: lerp(upperInnerMidY, topY - hS, kIn),
      c2x: lerp(cx, upL + vS, kIn),
      c2y: topY - hS,
      x: cx,
      y: topY - hS,
    },
    // 12. Top inner crown -> Top-right inner terminal
    {
      type: 'cubic',
      c1x: lerp(cx, topTermInX, kIn),
      c1y: topY - hS,
      c2x: topTermInX,
      c2y: lerp(topTermInY, topY - hS, kIn),
      x: topTermInX,
      y: topTermInY,
    },
  ];

  pc.addMixedContour(nodes, 1);
}

/**
 * Unified Stem + Bowl Builder for b, d, p, q (and g upper bowl)
 * Supports seamless Spurless (0%..100%), Surgical Ink Traps at shoulder & base notches,
 * High-Contrast Elegance, and Superellipse Bowl Squaring!
 */
function buildStemAndBowl(pc, m, mode) {
  // mode: 'b' | 'd' | 'p' | 'q'
  const isLeftStem = mode === 'b' || mode === 'p';
  const isAscender = mode === 'b' || mode === 'd';
  const isSpurAtBottom = mode === 'b' || mode === 'd';

  const w = Math.round(575 * m.widthScale);
  const sb = Math.round(52 * clamp(m.widthScale, 0.75, 1.15));
  const adv = w + sb * 2;
  const xL = sb;
  const xR = sb + w;

  const V = Math.min(m.V * 0.96, w * 0.39);
  const H = Math.min(m.H * 0.94, m.xh * 0.30);
  const topY = m.xh + m.ov;
  const botY = -m.ov;
  const midY = m.xh * 0.5;

  const kOut = m.kappaOut;
  const kIn = m.kappaIn;
  const sp = m.spurless; // 0 = full grotesque spur, 1 = pure continuous spurless

  // Shoulder / notch depth where bowl meets stem
  const baseNotch = lerp(Math.min(m.xh * 0.16, V * 0.55), m.xh * 0.28, m.inkTraps * m.trapDepth);
  const spurNotch = baseNotch * (1 - sp);
  const nonSpurNotch = baseNotch;

  // Build in canonical 'b' orientation (left stem, spur at bottom-left, ascender at top-left)
  // Then mirror X for 'd'/'q' and mirror Y around midY for 'p'/'q' (where m.xh - stemTop === m.desc)!
  const stemTop = isAscender ? m.asc : m.xh - m.desc;
  const bowlCenterX = xL + V + (w - V) * lerp(0.45, 0.49, sp);
  const bowlRx = xR - bowlCenterX;
  const bowlRy = (topY - botY) * 0.5;

  // Outer left bottom corner rises smoothly when spurless -> 1
  const leftBotCornerY = lerp(0, midY, sp);
  const botNotchY = lerp(botY + spurNotch, botY, sp);
  const topNotchY = topY - nonSpurNotch;

  // Trap width at the stem-bowl notch
  const notchSpread = m.inkTraps > 0.01 ? V * 0.14 * m.inkTraps * m.trapWidth : 0;

  const outerB = [
    // Left stem bottom-left
    { type: 'pt', x: xL, y: leftBotCornerY, r: sp > 0.5 ? 0 : 1 },
    // Left stem top-left
    { type: 'pt', x: xL, y: stemTop, r: 1 },
    // Left stem top-right
    { type: 'pt', x: xL + V, y: stemTop, r: 1 },
    // Down to upper shoulder notch
    { type: 'pt', x: xL + V, y: topNotchY + notchSpread, r: 0.2 },
    ...(m.inkTraps > 0.02
      ? [
          {
            type: 'pt',
            x: xL + V - Math.min(V * 0.35, V * 0.32 * m.inkTraps * m.trapDepth),
            y: topNotchY - V * 0.12 * m.inkTraps * m.trapDepth,
            r: 0,
          },
        ]
      : []),
    { type: 'pt', x: xL + V + notchSpread * 0.6, y: topNotchY, r: 0.15 },
    // Curve up to top bowl crown (bowlCenterX, topY)
    {
      type: 'cubic',
      c1x: xL + V + (bowlCenterX - (xL + V)) * 0.25,
      c1y: lerp(topNotchY, topY, 0.78),
      c2x: bowlCenterX - bowlRx * kOut * 0.85,
      c2y: topY,
      x: bowlCenterX,
      y: topY,
    },
    // Top crown -> Right cheek (xR, midY)
    {
      type: 'cubic',
      c1x: bowlCenterX + bowlRx * kOut,
      c1y: topY,
      c2x: xR,
      c2y: midY + bowlRy * kOut,
      x: xR,
      y: midY,
    },
    // Right cheek -> Bottom crown (bowlCenterX, botY)
    {
      type: 'cubic',
      c1x: xR,
      c1y: midY - bowlRy * kOut,
      c2x: bowlCenterX + bowlRx * kOut,
      c2y: botY,
      x: bowlCenterX,
      y: botY,
    },
  ];

  if (sp < 0.98) {
    // Spurred or partially-spurred bottom junction
    outerB.push(
      {
        type: 'cubic',
        c1x: bowlCenterX - bowlRx * kOut * 0.85,
        c1y: botY,
        c2x: xL + V + (bowlCenterX - (xL + V)) * 0.25,
        c2y: lerp(botNotchY, botY, 0.78),
        x: xL + V + notchSpread * 0.6 * (1 - sp),
        y: botNotchY,
      },
      ...(m.inkTraps > 0.02 && sp < 0.7
        ? [
            {
              type: 'pt',
              x: xL + V - Math.min(V * 0.35, V * 0.30 * m.inkTraps * m.trapDepth * (1 - sp)),
              y: botNotchY + V * 0.12 * m.inkTraps * m.trapDepth * (1 - sp),
              r: 0,
            },
          ]
        : []),
      { type: 'pt', x: xL + V, y: (0 + leftBotCornerY) * 0.5, r: 0.8 },
      { type: 'pt', x: xL + V * (1 - sp), y: leftBotCornerY * 0.15, r: 0.8 }
    );
  } else {
    // Pure Spurless (sp >= 0.98): continuous sweep from bottom crown directly into outer-left stem wall!
    const fullRx = bowlCenterX - xL;
    outerB.push({
      type: 'cubic',
      c1x: bowlCenterX - fullRx * kOut,
      c1y: botY,
      c2x: xL,
      c2y: midY - bowlRy * kOut,
      x: xL,
      y: leftBotCornerY,
    });
  }

  // Inner counter of 'b' (CCW)
  const inLeft = xL + V;
  const inRight = xR - V;
  const inTop = topY - H;
  const inBot = botY + H;
  const inCx = (inLeft + inRight) * 0.5;
  const inRx = Math.max(18, (inRight - inLeft) * 0.5);
  const inRy = Math.max(18, (inTop - inBot) * 0.5);

  const innerB = [
    { type: 'pt', x: inCx - inRx, y: midY },
    {
      type: 'cubic',
      c1x: inCx - inRx,
      c1y: midY - inRy * kIn,
      c2x: inCx - inRx * kIn,
      c2y: inBot,
      x: inCx,
      y: inBot,
    },
    {
      type: 'cubic',
      c1x: inCx + inRx * kIn,
      c1y: inBot,
      c2x: inCx + inRx,
      c2y: midY - inRy * kIn,
      x: inCx + inRx,
      y: midY,
    },
    {
      type: 'cubic',
      c1x: inCx + inRx,
      c1y: midY + inRy * kIn,
      c2x: inCx + inRx * kIn,
      c2y: inTop,
      x: inCx,
      y: inTop,
    },
    {
      type: 'cubic',
      c1x: inCx - inRx * kIn,
      c1y: inTop,
      c2x: inCx - inRx,
      c2y: midY + inRy * kIn,
      x: inCx - inRx,
      y: midY,
    },
  ];

  // Transform canonical 'b' coordinates to target mode ('b', 'd', 'p', 'q')
  const mapX = (x) => (isLeftStem ? x : adv - x);
  const mapY = (y) => (isSpurAtBottom ? y : m.xh - y);

  const transformNodes = (nodes) =>
    nodes.map((nd) => {
      if (nd.type === 'cubic') {
        return {
          ...nd,
          c1x: mapX(nd.c1x),
          c1y: mapY(nd.c1y),
          c2x: mapX(nd.c2x),
          c2y: mapY(nd.c2y),
          x: mapX(nd.x),
          y: mapY(nd.y),
        };
      }
      return { ...nd, x: mapX(nd.x), y: mapY(nd.y) };
    });

  pc.addMixedContour(transformNodes(outerB), 1);
  pc.addMixedContour(transformNodes(innerB), -1);
  return adv;
}

/**
 * Reverse the winding order of a mixed point+cubic contour
 */
function reverseMixedContour(nodes) {
  const n = nodes.length;
  const out = [];
  out.push({ type: 'pt', x: nodes[0].x, y: nodes[0].y, r: nodes[0].r, trap: nodes[0].trap });
  for (let i = n - 1; i >= 1; i--) {
    const seg = nodes[i];
    const prev = nodes[i - 1];
    if (seg.type === 'cubic') {
      out.push({
        type: 'cubic',
        c1x: seg.c2x,
        c1y: seg.c2y,
        c2x: seg.c1x,
        c2y: seg.c1y,
        x: prev.x,
        y: prev.y,
      });
    } else {
      out.push({
        type: 'pt',
        x: prev.x,
        y: prev.y,
        r: prev.r,
        trap: prev.trap,
      });
    }
  }
  return out;
}

/**
 * Build Lowercase Arch Glyphs: 'n', 'h', 'u', 'm', 'r'
 * Seamlessly morphs from classic spurred grotesque (spurless = 0)
 * to pure continuous spurless arches (spurless = 1), with Whyte-style ink traps at shoulder junctions!
 */
function buildArchGlyph(pc, m, mode) {
  // mode: 'n' | 'h' | 'u' | 'r' | 'm'
  if (mode === 'm') {
    const w = Math.round(845 * m.widthScale);
    const sb = Math.round(48 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    const xL = sb;
    const xR = sb + w;
    // 3 stems in 'm': optical density reduction so Weight 1000 stays crisp
    const V = Math.min(m.V * 0.88, w * 0.255);
    const H = Math.min(m.H * 0.90, m.xh * 0.30);
    const topY = m.xh + m.ov;
    const sp = m.spurless;
    const kOut = m.kappaOut;
    const kIn = m.kappaIn;

    const midStemL = xL + (w - V) * 0.5;
    const midStemR = midStemL + V;
    const arch1Cx = lerp(xL + V, midStemR, 0.52);
    const arch2Cx = lerp(midStemR, xR, 0.52);
    const archDrop = m.xh * lerp(0.42, 0.28, m.shoulder);

    const notchBase = lerp(Math.min(m.xh * 0.16, V * 0.55), m.xh * 0.30, m.inkTraps * m.trapDepth);
    const notch1 = notchBase * (1 - sp);
    const notch2 = notchBase;
    const leftTopCornerY = lerp(m.xh, m.xh - archDrop, sp);

    const inArchTop = topY - H;
    const c1L = xL + V;
    const c1R = midStemL;
    const c1Mid = (c1L + c1R) * 0.5;
    const c2L = midStemR;
    const c2R = xR - V;
    const c2Mid = (c2L + c2R) * 0.5;

    const nodes = [
      { type: 'pt', x: xL, y: 0, r: 1 },
      { type: 'pt', x: xL, y: leftTopCornerY, r: sp > 0.5 ? 0 : 1 },
    ];

    if (sp < 0.98) {
      nodes.push(
        { type: 'pt', x: xL + V * (1 - sp), y: lerp(m.xh, leftTopCornerY, sp), r: 0.8 },
        { type: 'pt', x: xL + V, y: topY - notch1, r: 0.15 },
        ...(m.inkTraps > 0.02 && sp < 0.75
          ? [
              {
                type: 'pt',
                x: xL + V - V * 0.26 * m.inkTraps * m.trapDepth * (1 - sp),
                y: topY - notch1 - V * 0.14 * m.inkTraps * m.trapDepth * (1 - sp),
                r: 0,
              },
            ]
          : []),
        {
          type: 'cubic',
          c1x: xL + V + (arch1Cx - (xL + V)) * 0.22,
          c1y: lerp(topY - notch1, topY, 0.78),
          c2x: arch1Cx - (arch1Cx - (xL + V)) * kOut,
          c2y: topY,
          x: arch1Cx,
          y: topY,
        }
      );
    } else {
      nodes.push({
        type: 'cubic',
        c1x: xL,
        c1y: lerp(leftTopCornerY, topY, kOut),
        c2x: lerp(arch1Cx, xL, kOut),
        c2y: topY,
        x: arch1Cx,
        y: topY,
      });
    }

    // Arch 1 down into middle valley (midStemR, topY - notch2)
    nodes.push(
      {
        type: 'cubic',
        c1x: lerp(arch1Cx, midStemR, kOut),
        c1y: topY,
        c2x: midStemR,
        c2y: lerp(topY - notch2, topY, 0.72),
        x: midStemR,
        y: topY - notch2,
      },
      ...(m.inkTraps > 0.02
        ? [
            {
              type: 'pt',
              x: midStemR - V * 0.24 * m.inkTraps * m.trapDepth,
              y: topY - notch2 - V * 0.15 * m.inkTraps * m.trapDepth,
              r: 0,
            },
          ]
        : []),
      // Up Arch 2 to arch2Cx
      {
        type: 'cubic',
        c1x: midStemR + (arch2Cx - midStemR) * 0.22,
        c1y: lerp(topY - notch2, topY, 0.78),
        c2x: arch2Cx - (arch2Cx - midStemR) * kOut,
        c2y: topY,
        x: arch2Cx,
        y: topY,
      },
      // Arch 2 down to outer right wall
      {
        type: 'cubic',
        c1x: lerp(arch2Cx, xR, kOut),
        c1y: topY,
        c2x: xR,
        c2y: lerp(m.xh - archDrop, topY, kOut),
        x: xR,
        y: m.xh - archDrop,
      },
      { type: 'pt', x: xR, y: 0, r: 1 },
      { type: 'pt', x: c2R, y: 0, r: 1 },
      { type: 'pt', x: c2R, y: m.xh - archDrop - H * 0.35, r: 0 },
      // Inner Arch 2
      {
        type: 'cubic',
        c1x: c2R,
        c1y: lerp(m.xh - archDrop - H * 0.35, inArchTop, kIn),
        c2x: lerp(c2Mid, c2R, kIn),
        c2y: inArchTop,
        x: c2Mid,
        y: inArchTop,
      },
      {
        type: 'cubic',
        c1x: lerp(c2Mid, c2L, kIn),
        c1y: inArchTop,
        c2x: c2L,
        c2y: lerp(m.xh - archDrop - H * 0.35, inArchTop, kIn),
        x: c2L,
        y: m.xh - archDrop - H * 0.35,
      },
      { type: 'pt', x: c2L, y: 0, r: 1 },
      { type: 'pt', x: c1R, y: 0, r: 1 },
      { type: 'pt', x: c1R, y: m.xh - archDrop - H * 0.35, r: 0 },
      // Inner Arch 1
      {
        type: 'cubic',
        c1x: c1R,
        c1y: lerp(m.xh - archDrop - H * 0.35, inArchTop, kIn),
        c2x: lerp(c1Mid, c1R, kIn),
        c2y: inArchTop,
        x: c1Mid,
        y: inArchTop,
      },
      {
        type: 'cubic',
        c1x: lerp(c1Mid, c1L, kIn),
        c1y: inArchTop,
        c2x: c1L,
        c2y: lerp(m.xh - archDrop - H * 0.35, inArchTop, kIn),
        x: c1L,
        y: m.xh - archDrop - H * 0.35,
      },
      { type: 'pt', x: c1L, y: 0, r: 1 }
    );

    pc.addMixedContour(nodes);
    return adv;
  }

  if (mode === 'r') {
    const w = Math.round(395 * m.widthScale);
    const sb = Math.round(50 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    const xL = sb;
    const xR = sb + w;
    const V = Math.min(m.V * 0.96, w * 0.48);
    const H = Math.min(m.H * 0.96, m.xh * 0.32);
    const topY = m.xh + m.ov;
    const sp = m.spurless;
    const kOut = m.kappaOut;

    const notchBase = lerp(Math.min(m.xh * 0.18, V * 0.6), m.xh * 0.32, m.inkTraps * m.trapDepth);
    const notch = notchBase * (1 - sp);
    const leftTopCornerY = lerp(m.xh, m.xh * 0.56, sp);
    const armCrownX = lerp(xL + V + (xR - (xL + V)) * 0.55, xR - w * 0.08, 0.5);
    const termDrop = m.aperture * H * 0.55;

    const nodes = [
      { type: 'pt', x: xL, y: 0, r: 1 },
      { type: 'pt', x: xL, y: leftTopCornerY, r: sp > 0.5 ? 0 : 1 },
    ];

    if (sp < 0.98) {
      nodes.push(
        { type: 'pt', x: xL + V * (1 - sp), y: lerp(m.xh, leftTopCornerY, sp), r: 0.8 },
        { type: 'pt', x: xL + V, y: topY - notch, r: 0.15 },
        ...(m.inkTraps > 0.02 && sp < 0.75
          ? [
              {
                type: 'pt',
                x: xL + V - V * 0.28 * m.inkTraps * m.trapDepth * (1 - sp),
                y: topY - notch - V * 0.14 * m.inkTraps * m.trapDepth * (1 - sp),
                r: 0,
              },
            ]
          : []),
        {
          type: 'cubic',
          c1x: xL + V + (armCrownX - (xL + V)) * 0.25,
          c1y: lerp(topY - notch, topY, 0.82),
          c2x: lerp(armCrownX, xL + V, kOut),
          c2y: topY,
          x: armCrownX,
          y: topY,
        }
      );
    } else {
      nodes.push({
        type: 'cubic',
        c1x: xL,
        c1y: lerp(leftTopCornerY, topY, kOut),
        c2x: lerp(armCrownX, xL, kOut),
        c2y: topY,
        x: armCrownX,
        y: topY,
      });
    }

    nodes.push(
      {
        type: 'cubic',
        c1x: lerp(armCrownX, xR, 0.55),
        c1y: topY,
        c2x: xR,
        c2y: topY - termDrop * 0.4,
        x: xR,
        y: topY - termDrop,
      },
      { type: 'pt', x: xR - H * 0.18 * (1 - m.termCut), y: topY - H - termDrop, r: 0.7 },
      {
        type: 'cubic',
        c1x: lerp(xL + V, xR, 0.55),
        c1y: topY - H,
        c2x: xL + V,
        c2y: lerp(m.xh * 0.48, topY - H, 0.68),
        x: xL + V,
        y: m.xh * 0.46,
      },
      { type: 'pt', x: xL + V, y: 0, r: 1 }
    );

    pc.addMixedContour(nodes);
    return adv;
  }

  // 'n', 'h', or 'u' (where 'u' is 180-degree rotated 'n')
  const w = Math.round(555 * m.widthScale);
  const sb = Math.round(52 * clamp(m.widthScale, 0.75, 1.15));
  const adv = w + sb * 2;
  const xL = sb;
  const xR = sb + w;
  const V = Math.min(m.V * 0.95, w * 0.39);
  const H = Math.min(m.H * 0.94, m.xh * 0.31);
  const topY = m.xh + m.ov;
  const sp = m.spurless;
  const kOut = m.kappaOut;
  const kIn = m.kappaIn;

  const isH = mode === 'h';
  const isU = mode === 'u';

  const archDrop = m.xh * lerp(0.44, 0.28, m.shoulder);
  const notchBase = lerp(Math.min(m.xh * 0.16, V * 0.55), m.xh * 0.30, m.inkTraps * m.trapDepth);
  const notch = isH ? notchBase : notchBase * (1 - sp);
  const leftTopY = isH ? m.asc : lerp(m.xh, m.xh - archDrop, sp);
  const archCx = lerp(xL + V + (xR - (xL + V)) * 0.48, (xL + xR) * 0.5, sp);
  const inCx = (xL + V + (xR - V)) * 0.5;
  const inTop = topY - H;

  const nNodes = [
    { type: 'pt', x: xL, y: 0, r: 1 },
    { type: 'pt', x: xL, y: leftTopY, r: !isH && sp > 0.5 ? 0 : 1 },
  ];

  if (isH || sp < 0.98) {
    const spurR = isH ? xL + V : xL + V * (1 - sp);
    const spurTop = isH ? m.asc : lerp(m.xh, leftTopY, sp);
    nNodes.push(
      { type: 'pt', x: spurR, y: spurTop, r: 0.8 },
      { type: 'pt', x: xL + V, y: topY - notch, r: 0.15 },
      ...(m.inkTraps > 0.02 && (isH || sp < 0.75)
        ? [
            {
              type: 'pt',
              x: xL + V - V * 0.28 * m.inkTraps * m.trapDepth * (isH ? 1 : 1 - sp),
              y: topY - notch - V * 0.14 * m.inkTraps * m.trapDepth * (isH ? 1 : 1 - sp),
              r: 0,
            },
          ]
        : []),
      {
        type: 'cubic',
        c1x: xL + V + (archCx - (xL + V)) * 0.24,
        c1y: lerp(topY - notch, topY, 0.80),
        c2x: lerp(archCx, xL + V, kOut),
        c2y: topY,
        x: archCx,
        y: topY,
      }
    );
  } else {
    // Pure Spurless 'n' / 'u': outer wall sweeps seamlessly over arch!
    nNodes.push({
      type: 'cubic',
      c1x: xL,
      c1y: lerp(leftTopY, topY, kOut),
      c2x: lerp(archCx, xL, kOut),
      c2y: topY,
      x: archCx,
      y: topY,
    });
  }

  nNodes.push(
    {
      type: 'cubic',
      c1x: lerp(archCx, xR, kOut),
      c1y: topY,
      c2x: xR,
      c2y: lerp(m.xh - archDrop, topY, kOut),
      x: xR,
      y: m.xh - archDrop,
    },
    { type: 'pt', x: xR, y: 0, r: 1 },
    { type: 'pt', x: xR - V, y: 0, r: 1 },
    { type: 'pt', x: xR - V, y: m.xh - archDrop - H * 0.35, r: 0 },
    {
      type: 'cubic',
      c1x: xR - V,
      c1y: lerp(m.xh - archDrop - H * 0.35, inTop, kIn),
      c2x: lerp(inCx, xR - V, kIn),
      c2y: inTop,
      x: inCx,
      y: inTop,
    },
    {
      type: 'cubic',
      c1x: lerp(inCx, xL + V, kIn),
      c1y: inTop,
      c2x: xL + V,
      c2y: lerp(m.xh - archDrop - H * 0.35, inTop, kIn),
      x: xL + V,
      y: m.xh - archDrop - H * 0.35,
    },
    { type: 'pt', x: xL + V, y: 0, r: 1 }
  );

  if (isU) {
    // 180-degree rotation around (adv/2, m.xh/2) preserves CW winding!
    const rotX = (x) => adv - x;
    const rotY = (y) => m.xh - y;
    const uNodes = nNodes.map((nd) =>
      nd.type === 'cubic'
        ? {
            ...nd,
            c1x: rotX(nd.c1x),
            c1y: rotY(nd.c1y),
            c2x: rotX(nd.c2x),
            c2y: rotY(nd.c2y),
            x: rotX(nd.x),
            y: rotY(nd.y),
          }
        : { ...nd, x: rotX(nd.x), y: rotY(nd.y) }
    );
    pc.addMixedContour(uNodes);
  } else {
    pc.addMixedContour(nNodes);
  }
  return adv;
}

/**
 * Build Uppercase Glyphs (A-Z)
 */
const GLYPH_BUILDERS = {
  A(pc, m) {
    const w = Math.round(670 * m.widthScale);
    const sb = Math.round(28 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    const xL = sb;
    const xR = sb + w;
    const cx = (xL + xR) * 0.5;
    const cap = m.cap;

    const rightW = Math.min(m.D1 * 0.90, w * 0.295);
    const leftW = Math.min(m.D2 * 0.88, w * 0.285);
    const barH = Math.min(m.H * 0.86, cap * 0.205);

    const apexHalfW = Math.min(w * 0.23, Math.max((leftW + rightW) * 0.36, w * 0.125));
    const topL = cx - apexHalfW;
    const topR = cx + apexHalfW;

    const barBotY = clamp(cap * (0.23 + m.crossbarShift * 0.24), cap * 0.11, cap * 0.43);
    const barTopY = Math.min(cap * 0.58, barBotY + barH);
    const apexInnerY = Math.max(barTopY + 95, cap - Math.max(leftW, rightW) * 0.88);
    const apexCx = cx - (leftW - rightW) * 0.16;

    // Collinear inner leg X at any height y from 0 up to apexInnerY
    const inLeftX = (y) => lerp(xL + leftW, apexCx, y / apexInnerY);
    const inRightX = (y) => lerp(xR - rightW, apexCx, y / apexInnerY);

    const cBotL = inLeftX(barTopY);
    const cBotR = inRightX(barTopY);

    // Outer CW contour
    pc.addPolygon(
      [
        [xL, 0, { r: 1 }],
        [topL, cap, { r: 1, flare: 1 }],
        [topR, cap, { r: 1 }],
        [xR, 0, { r: 1, flare: 1 }],
        [xR - rightW, 0, { r: 1 }],
        [inRightX(barBotY), barBotY, { r: 0.4, trap: { d: 0.65, w: 0.65, bx: 0.85, by: 0.5 } }],
        [inLeftX(barBotY), barBotY, { r: 0.4, trap: { d: 0.65, w: 0.65, bx: -0.85, by: 0.5 } }],
        [xL + leftW, 0, { r: 1 }],
      ],
      1
    );

    // Inner CCW triangle counter with deep Whyte-style ink trap at top apex
    if (cBotR - cBotL > 14 && apexInnerY - barTopY > 18) {
      pc.addPolygon(
        [
          [cBotL, barTopY, { r: 0.35, trap: { d: 0.5, w: 0.5, bx: -0.7, by: -0.7 } }],
          [cBotR, barTopY, { r: 0.35, trap: { d: 0.5, w: 0.5, bx: 0.7, by: -0.7 } }],
          [apexCx, apexInnerY, { r: 0.25, trap: { d: 1.25, w: 0.9, bx: 0, by: 1, maxD: (cap - apexInnerY) * 0.68 } }],
        ],
        -1
      );
    }
    return adv;
  },

  B(pc, m) {
    const w = Math.round(615 * m.widthScale);
    const sb = Math.round(56 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    const xL = sb;
    const xR = sb + w;
    const cap = m.cap;

    const V = Math.min(m.V * 0.94, w * 0.36);
    const H = Math.min(m.H * 0.88, cap * 0.205);
    const waistY = clamp(cap * (0.515 + m.crossbarShift * 0.16), cap * 0.36, cap * 0.66);

    const upR = xR - w * 0.035;
    const loR = xR;
    const upMidY = (waistY + cap) * 0.5;
    const loMidY = waistY * 0.5;

    const upFlatR = xL + V + (upR - (xL + V)) * 0.42;
    const loFlatR = xL + V + (loR - (xL + V)) * 0.44;
    const waistPinchX = Math.min(upFlatR, loFlatR) + (loR - upFlatR) * 0.22;

    const kOut = m.kappaOut;
    const kIn = m.kappaIn;
    const trapIn = m.inkTraps > 0.01 ? V * 0.38 * m.inkTraps * m.trapDepth : 0;
    const trapSpread = m.inkTraps > 0.01 ? H * 0.32 * m.inkTraps * m.trapWidth : 0;

    // Outer CW contour
    const outer = [
      { type: 'pt', x: xL, y: 0, r: 1 },
      { type: 'pt', x: xL, y: cap, r: 1, flare: 1 },
      { type: 'pt', x: upFlatR, y: cap, r: 0 },
      {
        type: 'cubic',
        c1x: lerp(upFlatR, upR, kOut),
        c1y: cap,
        c2x: upR,
        c2y: lerp(upMidY, cap, kOut),
        x: upR,
        y: upMidY,
      },
      {
        type: 'cubic',
        c1x: upR,
        c1y: lerp(upMidY, waistY + trapSpread, kOut),
        c2x: lerp(waistPinchX, upR, 0.55),
        c2y: waistY + trapSpread,
        x: waistPinchX,
        y: waistY + trapSpread,
      },
      ...(trapIn > 1
        ? [
            { type: 'pt', x: waistPinchX - trapIn, y: waistY + trapSpread * 0.28, r: 0 },
            { type: 'pt', x: waistPinchX - trapIn, y: waistY - trapSpread * 0.28, r: 0 },
          ]
        : []),
      { type: 'pt', x: waistPinchX, y: waistY - trapSpread, r: 0.15 },
      {
        type: 'cubic',
        c1x: lerp(waistPinchX, loR, 0.55),
        c1y: waistY - trapSpread,
        c2x: loR,
        c2y: lerp(loMidY, waistY - trapSpread, kOut),
        x: loR,
        y: loMidY,
      },
      {
        type: 'cubic',
        c1x: loR,
        c1y: lerp(loMidY, 0, kOut),
        c2x: lerp(loFlatR, loR, kOut),
        c2y: 0,
        x: loFlatR,
        y: 0,
      },
    ];
    pc.addMixedContour(outer, 1);

    // Upper D-counter (CCW)
    const inL = xL + V;
    const upTop = cap - H;
    const upBot = waistY + H * 0.46;
    const upInR = Math.max(inL + 22, upR - V * 0.94);
    const upInFlat = lerp(inL, upInR, 0.42);
    const upInMidY = (upTop + upBot) * 0.5;
    if (upTop - upBot > 14 && upInR - inL > 14) {
      pc.addMixedContour(
        [
          { type: 'pt', x: inL, y: upTop, r: 0.4, trap: { d: 0.65, w: 0.6, bx: -0.7, by: 0.7 } },
          { type: 'pt', x: inL, y: upBot, r: 0.4, trap: { d: 0.65, w: 0.6, bx: -0.7, by: -0.7 } },
          { type: 'pt', x: upInFlat, y: upBot, r: 0 },
          {
            type: 'cubic',
            c1x: lerp(upInFlat, upInR, kIn),
            c1y: upBot,
            c2x: upInR,
            c2y: lerp(upInMidY, upBot, kIn),
            x: upInR,
            y: upInMidY,
          },
          {
            type: 'cubic',
            c1x: upInR,
            c1y: lerp(upInMidY, upTop, kIn),
            c2x: lerp(upInFlat, upInR, kIn),
            c2y: upTop,
            x: upInFlat,
            y: upTop,
          },
        ],
        -1
      );
    }

    // Lower D-counter (CCW)
    const loTop = waistY - H * 0.46;
    const loBot = H;
    const loInR = Math.max(inL + 24, loR - V * 0.94);
    const loInFlat = lerp(inL, loInR, 0.44);
    const loInMidY = (loTop + loBot) * 0.5;
    if (loTop - loBot > 14 && loInR - inL > 14) {
      pc.addMixedContour(
        [
          { type: 'pt', x: inL, y: loTop, r: 0.4, trap: { d: 0.65, w: 0.6, bx: -0.7, by: 0.7 } },
          { type: 'pt', x: inL, y: loBot, r: 0.4, trap: { d: 0.65, w: 0.6, bx: -0.7, by: -0.7 } },
          { type: 'pt', x: loInFlat, y: loBot, r: 0 },
          {
            type: 'cubic',
            c1x: lerp(loInFlat, loInR, kIn),
            c1y: loBot,
            c2x: loInR,
            c2y: lerp(loInMidY, loBot, kIn),
            x: loInR,
            y: loInMidY,
          },
          {
            type: 'cubic',
            c1x: loInR,
            c1y: lerp(loInMidY, loTop, kIn),
            c2x: lerp(loInFlat, loInR, kIn),
            c2y: loTop,
            x: loInFlat,
            y: loTop,
          },
        ],
        -1
      );
    }
    return adv;
  },

  C(pc, m) {
    const w = Math.round(640 * m.widthScale);
    const sb = Math.round(42 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    const cx = sb + w * 0.51;
    const cy = m.cap * 0.5;
    const rx = w * 0.51;
    const ry = m.cap * 0.5 + m.ov;
    const V = Math.min(m.V, rx * 0.68);
    const H = Math.min(m.H, ry * 0.62);

    addOpenBowlContour(pc, m, {
      cx,
      cy,
      rx,
      ry,
      vStroke: V,
      hStroke: H,
      topAngleDeg: 32,
      botAngleDeg: 32,
    });
    return adv;
  },

  D(pc, m) {
    const w = Math.round(650 * m.widthScale);
    const sb = Math.round(56 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    const xL = sb;
    const xR = sb + w;
    const cap = m.cap;
    const midY = cap * 0.5;
    const V = Math.min(m.V, w * 0.39);
    const H = Math.min(m.H, cap * 0.30);
    const flatR = xL + V + (xR - (xL + V)) * 0.36;
    const kOut = m.kappaOut;
    const kIn = m.kappaIn;

    // Outer CW
    pc.addMixedContour(
      [
        { type: 'pt', x: xL, y: 0, r: 1 },
        { type: 'pt', x: xL, y: cap, r: 1, flare: 1 },
        { type: 'pt', x: flatR, y: cap, r: 0 },
        {
          type: 'cubic',
          c1x: lerp(flatR, xR, kOut),
          c1y: cap,
          c2x: xR,
          c2y: lerp(midY, cap, kOut),
          x: xR,
          y: midY,
        },
        {
          type: 'cubic',
          c1x: xR,
          c1y: lerp(midY, 0, kOut),
          c2x: lerp(flatR, xR, kOut),
          c2y: 0,
          x: flatR,
          y: 0,
        },
      ],
      1
    );

    // Inner CCW D-counter
    const inL = xL + V;
    const inR = Math.max(inL + 26, xR - V);
    const inTop = cap - H;
    const inBot = H;
    const inFlat = lerp(inL, inR, 0.36);
    if (inTop - inBot > 20 && inR - inL > 20) {
      pc.addMixedContour(
        [
          { type: 'pt', x: inL, y: inTop, r: 0.45, trap: { d: 0.85, w: 0.75, bx: -0.7, by: 0.7 } },
          { type: 'pt', x: inL, y: inBot, r: 0.45, trap: { d: 0.85, w: 0.75, bx: -0.7, by: -0.7 } },
          { type: 'pt', x: inFlat, y: inBot, r: 0 },
          {
            type: 'cubic',
            c1x: lerp(inFlat, inR, kIn),
            c1y: inBot,
            c2x: inR,
            c2y: lerp(midY, inBot, kIn),
            x: inR,
            y: midY,
          },
          {
            type: 'cubic',
            c1x: inR,
            c1y: lerp(midY, inTop, kIn),
            c2x: lerp(inFlat, inR, kIn),
            c2y: inTop,
            x: inFlat,
            y: inTop,
          },
        ],
        -1
      );
    }
    return adv;
  },

  E(pc, m) {
    const w = Math.round(545 * m.widthScale);
    const sb = Math.round(56 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    const xL = sb;
    const xR = sb + w;
    const cap = m.cap;
    const V = Math.min(m.V, w * 0.44);
    const H = Math.min(m.H * 0.92, cap * 0.215);

    const midCenterY = clamp(cap * (0.51 + m.crossbarShift * 0.18), H * 1.45, cap - H * 1.45);
    const midTop = midCenterY + H * 0.46;
    const midBot = midCenterY - H * 0.46;
    const midR = xR - w * 0.08;
    const topR = xR - w * 0.02;

    pc.addPolygon([
      [xL, 0, { r: 1 }],
      [xL, cap, { r: 1, flare: 1 }],
      [topR, cap, { r: 1 }],
      [topR, cap - H, { r: 1 }],
      [xL + V, cap - H, { r: 0.4, trap: { d: 0.85, w: 0.75, bx: -0.7, by: 0.7 } }],
      [xL + V, midTop, { r: 0.4, trap: { d: 0.8, w: 0.7, bx: -0.7, by: -0.7 } }],
      [midR, midTop, { r: 1 }],
      [midR, midBot, { r: 1 }],
      [xL + V, midBot, { r: 0.4, trap: { d: 0.8, w: 0.7, bx: -0.7, by: 0.7 } }],
      [xL + V, H, { r: 0.4, trap: { d: 0.85, w: 0.75, bx: -0.7, by: -0.7 } }],
      [xR, H, { r: 1 }],
      [xR, 0, { r: 1 }],
    ]);
    return adv;
  },

  F(pc, m) {
    const w = Math.round(515 * m.widthScale);
    const sb = Math.round(56 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    const xL = sb;
    const xR = sb + w;
    const cap = m.cap;
    const V = Math.min(m.V, w * 0.46);
    const H = Math.min(m.H * 0.94, cap * 0.23);

    const midCenterY = clamp(cap * (0.48 + m.crossbarShift * 0.18), H * 1.1, cap - H * 1.45);
    const midTop = midCenterY + H * 0.47;
    const midBot = midCenterY - H * 0.47;
    const midR = xR - w * 0.08;

    pc.addPolygon([
      [xL, 0, { r: 1 }],
      [xL, cap, { r: 1, flare: 1 }],
      [xR, cap, { r: 1 }],
      [xR, cap - H, { r: 1 }],
      [xL + V, cap - H, { r: 0.4, trap: { d: 0.9, w: 0.8, bx: -0.7, by: 0.7 } }],
      [xL + V, midTop, { r: 0.4, trap: { d: 0.85, w: 0.75, bx: -0.7, by: -0.7 } }],
      [midR, midTop, { r: 1 }],
      [midR, midBot, { r: 1 }],
      [xL + V, midBot, { r: 0.4, trap: { d: 0.85, w: 0.75, bx: -0.7, by: 0.7 } }],
      [xL + V, 0, { r: 1, flare: 1 }],
    ]);
    return adv;
  },

  G(pc, m) {
    const w = Math.round(675 * m.widthScale);
    const sb = Math.round(42 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    const cx = sb + w * 0.5;
    const cy = m.cap * 0.5;
    const rx = w * 0.5;
    const ry = m.cap * 0.5 + m.ov;
    const V = Math.min(m.V, rx * 0.64);
    const H = Math.min(m.H, ry * 0.56);
    const barTopY = clamp(m.cap * (0.48 + m.crossbarShift * 0.15), H * 1.5, m.cap * 0.68);
    const barBotY = barTopY - H * 0.92;
    const barLeftX = cx - rx * 0.04;
    const sp = m.spurless;

    addOpenBowlContour(pc, m, {
      cx,
      cy,
      rx,
      ry,
      vStroke: V,
      hStroke: H,
      topAngleDeg: 32,
      botAngleDeg: 32,
      extraNodesBottomRight(nodes, info) {
        const { ix, iy, kxOut, kyOut, kxIn, kyIn, inTopX, inTopY, topFrac, topA } = info;
        const xR = cx + rx;
        const notchDepth = lerp(m.cap * 0.12, m.cap * 0.22, m.inkTraps * m.trapDepth) * (1 - sp);

        if (sp < 0.95) {
          // Grotesque G with bottom-right spur or notch
          const spurL = xR - V * 0.88;
          nodes.push(
            {
              type: 'cubic',
              c1x: cx + kxOut * 0.65,
              c1y: cy - ry,
              c2x: spurL - rx * 0.1,
              c2y: -m.ov + notchDepth * 0.35,
              x: spurL,
              y: -m.ov + notchDepth,
            },
            ...(m.inkTraps > 0.02
              ? [
                  {
                    type: 'pt',
                    x: spurL + V * 0.22 * m.inkTraps * m.trapDepth,
                    y: -m.ov + notchDepth + V * 0.14 * m.inkTraps * m.trapDepth,
                    r: 0,
                  },
                ]
              : []),
            { type: 'pt', x: spurL, y: 0, r: 0.8 },
            { type: 'pt', x: xR, y: 0, r: 0.8 }
          );
        } else {
          // Spurless G: continuous outer curve up to barTopY
          nodes.push({
            type: 'cubic',
            c1x: cx + kxOut,
            c1y: cy - ry,
            c2x: xR,
            c2y: cy - kyOut,
            x: xR,
            y: Math.min(cy, barTopY),
          });
        }

        // Up outer right wall to barTopY, then inward crossbar
        nodes.push(
          { type: 'pt', x: xR, y: barTopY, r: 0.8 },
          { type: 'pt', x: barLeftX, y: barTopY, r: 0.8 },
          { type: 'pt', x: barLeftX, y: barBotY, r: 0.8 },
          {
            type: 'pt',
            x: cx + ix,
            y: barBotY,
            r: 0.35,
            trap: { d: 0.7, w: 0.65, bx: 0.7, by: 0.7 },
          },
          // Inner bottom curve
          {
            type: 'cubic',
            c1x: cx + ix,
            c1y: lerp(barBotY, cy - iy, 0.58),
            c2x: cx + kxIn,
            c2y: cy - iy,
            x: cx,
            y: cy - iy,
          },
          // Inner left wall
          {
            type: 'cubic',
            c1x: cx - kxIn,
            c1y: cy - iy,
            c2x: cx - ix,
            c2y: cy - kyIn,
            x: cx - ix,
            y: cy,
          },
          // Inner top crown
          {
            type: 'cubic',
            c1x: cx - ix,
            c1y: cy + kyIn,
            c2x: cx - kxIn,
            c2y: cy + iy,
            x: cx,
            y: cy + iy,
          },
          // Inner top-right terminal
          {
            type: 'cubic',
            c1x: cx + kxIn * topFrac,
            c1y: cy + iy,
            c2x: inTopX - kxIn * Math.sin(topA) * topFrac * 0.65,
            c2y: lerp(inTopY, cy + iy, 0.62),
            x: inTopX,
            y: inTopY,
          }
        );
      },
    });
    return adv;
  },

  H(pc, m) {
    const w = Math.round(645 * m.widthScale);
    const sb = Math.round(56 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    const xL = sb;
    const xR = sb + w;
    const cap = m.cap;
    const V = Math.min(m.V, w * 0.40);
    const H = Math.min(m.H, cap * 0.28);

    const midY = clamp(cap * (0.51 + m.crossbarShift * 0.20), H * 0.8, cap - H * 0.8);
    const barTop = midY + H * 0.5;
    const barBot = midY - H * 0.5;

    pc.addPolygon([
      [xL, 0, { r: 1 }],
      [xL, cap, { r: 1, flare: 1 }],
      [xL + V, cap, { r: 1 }],
      [xL + V, barTop, { r: 0.4, flare: 1, trap: { d: 0.9, w: 0.8, bx: -0.7, by: -0.7 } }],
      [xR - V, barTop, { r: 0.4, trap: { d: 0.9, w: 0.8, bx: 0.7, by: -0.7 } }],
      [xR - V, cap, { r: 1, flare: 1 }],
      [xR, cap, { r: 1 }],
      [xR, 0, { r: 1, flare: 1 }],
      [xR - V, 0, { r: 1 }],
      [xR - V, barBot, { r: 0.4, flare: 1, trap: { d: 0.9, w: 0.8, bx: 0.7, by: 0.7 } }],
      [xL + V, barBot, { r: 0.4, trap: { d: 0.9, w: 0.8, bx: -0.7, by: 0.7 } }],
      [xL + V, 0, { r: 1, flare: 1 }],
    ]);
    return adv;
  },

  I(pc, m) {
    const V = m.V;
    const sb = Math.round(62 * clamp(m.widthScale, 0.75, 1.15));
    const adv = Math.round(V + sb * 2);
    const xL = sb;
    pc.addPolygon([
      [xL, 0, { r: 1 }],
      [xL, m.cap, { r: 1, flare: 1 }],
      [xL + V, m.cap, { r: 1 }],
      [xL + V, 0, { r: 1, flare: 1 }],
    ]);
    return adv;
  },

  J(pc, m) {
    const w = Math.round(485 * m.widthScale);
    const sb = Math.round(38 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    const xL = sb;
    const xR = sb + w;
    const cap = m.cap;
    const V = Math.min(m.V, w * 0.45);
    const H = Math.min(m.H, cap * 0.26);
    const cx = (xL + xR) * 0.5;
    const botY = -m.ov;
    const turnY = Math.max(H * 1.4, w * 0.46);
    const leftTermY = turnY + lerp(0, cap * 0.12, m.aperture);
    const kOut = m.kappaOut;
    const kIn = m.kappaIn;

    pc.addMixedContour([
      { type: 'pt', x: xR - V, y: cap, r: 1 },
      { type: 'pt', x: xR, y: cap, r: 1 },
      { type: 'pt', x: xR, y: turnY, r: 0, flare: 1 },
      {
        type: 'cubic',
        c1x: xR,
        c1y: lerp(turnY, botY, kOut),
        c2x: lerp(cx, xR, kOut),
        c2y: botY,
        x: cx,
        y: botY,
      },
      {
        type: 'cubic',
        c1x: lerp(cx, xL, kOut),
        c1y: botY,
        c2x: xL,
        c2y: lerp(leftTermY, botY, kOut),
        x: xL,
        y: leftTermY,
      },
      { type: 'pt', x: xL + V * 0.96, y: leftTermY - H * 0.22 * (1 - m.termCut), r: 0.75 },
      {
        type: 'cubic',
        c1x: xL + V * 0.96,
        c1y: lerp(leftTermY, botY + H, kIn),
        c2x: lerp(cx, xL + V * 0.96, kIn),
        c2y: botY + H,
        x: cx,
        y: botY + H,
      },
      {
        type: 'cubic',
        c1x: lerp(cx, xR - V, kIn),
        c1y: botY + H,
        c2x: xR - V,
        c2y: lerp(turnY, botY + H, kIn),
        x: xR - V,
        y: turnY,
      },
    ]);
    return adv;
  },

  K(pc, m) {
    const w = Math.round(645 * m.widthScale);
    const sb = Math.round(56 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    const xL = sb;
    const xR = sb + w;
    const cap = m.cap;
    const V = Math.min(m.V, w * 0.38);
    const upArmW = Math.min(m.D2 * 1.04, w * 0.36);
    const loLegW = Math.min(m.D1 * 1.08, w * 0.38);

    const midY = clamp(cap * (0.48 + m.crossbarShift * 0.16), cap * 0.28, cap * 0.68);
    const crotchX = xL + V + (xR - (xL + V)) * 0.25;
    const stemJoinTopY = Math.min(cap * 0.78, midY + upArmW * 0.48);
    const stemJoinBotY = Math.max(cap * 0.18, midY - upArmW * 0.48);

    pc.addPolygon([
      [xL, 0, { r: 1 }],
      [xL, cap, { r: 1, flare: 1 }],
      [xL + V, cap, { r: 1 }],
      [xL + V, stemJoinTopY, { r: 0.3, trap: { d: 1.1, w: 0.85, bx: -0.35, by: -0.94 } }],
      [xR - upArmW * 1.08, cap, { r: 1 }],
      [xR - w * 0.02, cap, { r: 1 }],
      [crotchX, midY, { r: 0.3, trap: { d: 1.05, w: 0.85, bx: -1, by: 0 } }],
      [xR, 0, { r: 1 }],
      [xR - loLegW * 1.08, 0, { r: 1 }],
      [xL + V, stemJoinBotY, { r: 0.3, trap: { d: 1.1, w: 0.85, bx: 0.25, by: 0.96 } }],
      [xL + V, 0, { r: 1 }],
    ]);
    return adv;
  },

  L(pc, m) {
    const w = Math.round(525 * m.widthScale);
    const sb = Math.round(56 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    const xL = sb;
    const xR = sb + w;
    const cap = m.cap;
    const V = Math.min(m.V, w * 0.45);
    const H = Math.min(m.H, cap * 0.28);

    pc.addPolygon([
      [xL, 0, { r: 1 }],
      [xL, cap, { r: 1, flare: 1 }],
      [xL + V, cap, { r: 1 }],
      [xL + V, H, { r: 0.45, flare: 1, trap: { d: 0.95, w: 0.85, bx: -0.7, by: -0.7 } }],
      [xR, H, { r: 1 }],
      [xR, 0, { r: 1 }],
    ]);
    return adv;
  },

  M(pc, m) {
    const w = Math.round(795 * m.widthScale);
    const sb = Math.round(54 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    const xL = sb;
    const xR = sb + w;
    const cx = (xL + xR) * 0.5;
    const cap = m.cap;

    // 4 strokes in M: apply optical density control so Weight 1000 stays crisp
    const V = Math.min(m.V * 0.86, w * 0.24);
    const dLeft = Math.min(m.D1 * 0.84, w * 0.23);
    const dRight = Math.min(m.D2 * 0.84, w * 0.23);

    const shoulderW = Math.max(V * 1.38, w * 0.24);
    const vBotHalfW = Math.max((dLeft + dRight) * 0.42, w * 0.08);
    const vTopY = Math.max(cap * 0.28, (dLeft + dRight) * 1.05);
    const innerDropY = Math.min(cap * 0.68, cap - V * 0.95);

    pc.addPolygon([
      [xL, 0, { r: 1 }],
      [xL, cap, { r: 1, flare: 1 }],
      [xL + shoulderW, cap, { r: 0.8 }],
      [cx, vTopY, { r: 0.25, trap: { d: 1.25, w: 0.95, bx: 0, by: -1, maxD: vTopY * 0.65 } }],
      [xR - shoulderW, cap, { r: 0.8 }],
      [xR, cap, { r: 1 }],
      [xR, 0, { r: 1, flare: 1 }],
      [xR - V, 0, { r: 1 }],
      [xR - V, innerDropY, { r: 0.25, trap: { d: 1.15, w: 0.85, bx: 0.2, by: 0.98 } }],
      [cx + vBotHalfW, 0, { r: 0.8 }],
      [cx - vBotHalfW, 0, { r: 0.8 }],
      [xL + V, innerDropY, { r: 0.25, trap: { d: 1.15, w: 0.85, bx: -0.2, by: 0.98 } }],
      [xL + V, 0, { r: 1 }],
    ]);
    return adv;
  },

  N(pc, m) {
    const w = Math.round(665 * m.widthScale);
    const sb = Math.round(56 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    const xL = sb;
    const xR = sb + w;
    const cap = m.cap;

    const vStem = Math.min(m.V * lerp(0.92, 0.56, m.eleg * 0.65), w * 0.33);
    const diagW = Math.min(m.D1 * 0.96, w * 0.34);
    const shoulderW = Math.max(vStem + diagW * 0.58, w * 0.28);
    const joinDrop = Math.min(cap * 0.64, cap - diagW * 1.05);

    pc.addPolygon([
      [xL, 0, { r: 1 }],
      [xL, cap, { r: 1, flare: 1 }],
      [xL + shoulderW, cap, { r: 0.8 }],
      [xR - vStem, cap - joinDrop, { r: 0.25, trap: { d: 1.2, w: 0.9, bx: 0.2, by: -0.98 } }],
      [xR - vStem, cap, { r: 1, flare: 1 }],
      [xR, cap, { r: 1 }],
      [xR, 0, { r: 1, flare: 1 }],
      [xR - shoulderW, 0, { r: 0.8 }],
      [xL + vStem, joinDrop, { r: 0.25, trap: { d: 1.2, w: 0.9, bx: -0.2, by: 0.98 } }],
      [xL + vStem, 0, { r: 1 }],
    ]);
    return adv;
  },

  O(pc, m) {
    const w = Math.round(690 * m.widthScale);
    const sb = Math.round(42 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    const cx = sb + w * 0.5;
    const cy = m.cap * 0.5;
    const rx = w * 0.5;
    const ry = m.cap * 0.5 + m.ov;
    const V = Math.min(m.V, rx * 0.70);
    const H = Math.min(m.H, ry * 0.64);

    pc.addSuperellipse(cx, cy, rx, ry, 1);
    pc.addSuperellipse(cx, cy, Math.max(20, rx - V), Math.max(24, ry - H), -1);
    return adv;
  },

  P(pc, m) {
    const w = Math.round(590 * m.widthScale);
    const sb = Math.round(56 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    const xL = sb;
    const xR = sb + w;
    const cap = m.cap;
    const V = Math.min(m.V, w * 0.39);
    const H = Math.min(m.H * 0.92, cap * 0.22);

    const bowlBotY = clamp(cap * (0.37 + m.crossbarShift * 0.16), cap * 0.24, cap * 0.54);
    const bowlMidY = (cap + bowlBotY) * 0.5;
    const flatR = xL + V + (xR - (xL + V)) * 0.38;
    const kOut = m.kappaOut;
    const kIn = m.kappaIn;

    pc.addMixedContour([
      { type: 'pt', x: xL, y: 0, r: 1 },
      { type: 'pt', x: xL, y: cap, r: 1, flare: 1 },
      { type: 'pt', x: flatR, y: cap, r: 0 },
      {
        type: 'cubic',
        c1x: lerp(flatR, xR, kOut),
        c1y: cap,
        c2x: xR,
        c2y: lerp(bowlMidY, cap, kOut),
        x: xR,
        y: bowlMidY,
      },
      {
        type: 'cubic',
        c1x: xR,
        c1y: lerp(bowlMidY, bowlBotY, kOut),
        c2x: lerp(flatR, xR, kOut),
        c2y: bowlBotY,
        x: flatR,
        y: bowlBotY,
      },
      { type: 'pt', x: xL + V, y: bowlBotY, r: 0.4, trap: { d: 0.95, w: 0.85, bx: -0.7, by: 0.7 } },
      { type: 'pt', x: xL + V, y: 0, r: 1, flare: 1 },
    ]);

    const inL = xL + V;
    const inR = Math.max(inL + 22, xR - V * 0.96);
    const inTop = cap - H;
    const inBot = bowlBotY + H * 0.92;
    const inFlat = lerp(inL, inR, 0.38);
    const inMidY = (inTop + inBot) * 0.5;
    if (inTop - inBot > 14 && inR - inL > 14) {
      pc.addMixedContour(
        [
          { type: 'pt', x: inL, y: inTop, r: 0.4, trap: { d: 0.7, w: 0.65, bx: -0.7, by: 0.7 } },
          { type: 'pt', x: inL, y: inBot, r: 0.4, trap: { d: 0.7, w: 0.65, bx: -0.7, by: -0.7 } },
          { type: 'pt', x: inFlat, y: inBot, r: 0 },
          {
            type: 'cubic',
            c1x: lerp(inFlat, inR, kIn),
            c1y: inBot,
            c2x: inR,
            c2y: lerp(inMidY, inBot, kIn),
            x: inR,
            y: inMidY,
          },
          {
            type: 'cubic',
            c1x: inR,
            c1y: lerp(inMidY, inTop, kIn),
            c2x: lerp(inFlat, inR, kIn),
            c2y: inTop,
            x: inFlat,
            y: inTop,
          },
        ],
        -1
      );
    }
    return adv;
  },

  Q(pc, m) {
    const w = Math.round(695 * m.widthScale);
    const sb = Math.round(42 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    const cx = sb + w * 0.5;
    const cy = m.cap * 0.5;
    const rx = w * 0.5;
    const ry = m.cap * 0.5 + m.ov;
    const V = Math.min(m.V, rx * 0.68);
    const H = Math.min(m.H, ry * 0.62);
    const kOut = m.kappaOut;

    // Unified outer contour of O + bottom-right diagonal tail (like screenshot!)
    const tailW = Math.max(H * 0.95, V * 0.62);
    const tailTipX = cx + rx * 0.92;
    const tailTipY = -m.cap * 0.095;
    const tailJoinAngle1 = 0.52; // ~30 deg below right extremum
    const tailJoinAngle2 = 1.05; // ~60 deg below right extremum

    const j1x = cx + rx * Math.cos(tailJoinAngle1);
    const j1y = cy - ry * Math.sin(tailJoinAngle1);
    const j2x = cx + rx * Math.cos(tailJoinAngle2);
    const j2y = cy - ry * Math.sin(tailJoinAngle2);

    pc.addMixedContour([
      { type: 'pt', x: cx - rx, y: cy, r: 0 },
      {
        type: 'cubic',
        c1x: cx - rx,
        c1y: cy + ry * kOut,
        c2x: cx - rx * kOut,
        c2y: cy + ry,
        x: cx,
        y: cy + ry,
      },
      {
        type: 'cubic',
        c1x: cx + rx * kOut,
        c1y: cy + ry,
        c2x: cx + rx,
        c2y: cy + ry * kOut,
        x: cx + rx,
        y: cy,
      },
      {
        type: 'cubic',
        c1x: cx + rx,
        c1y: lerp(cy, j1y, 0.55),
        c2x: lerp(j1x, cx + rx, 0.45),
        c2y: lerp(j1y, cy, 0.35),
        x: j1x,
        y: j1y,
      },
      // Tail top edge
      { type: 'pt', x: tailTipX + tailW * 0.45, y: tailTipY + tailW * 0.55, r: 0.7 },
      // Tail bottom tip
      { type: 'pt', x: tailTipX - tailW * 0.35, y: tailTipY - tailW * 0.25, r: 0.7 },
      // Tail bottom edge back to bowl
      {
        type: 'pt',
        x: j2x,
        y: j2y,
        r: 0.3,
        trap: { d: 0.85, w: 0.75, bx: -0.45, by: 0.88 },
      },
      {
        type: 'cubic',
        c1x: lerp(cx, j2x, 0.55),
        c1y: cy - ry,
        c2x: cx + rx * 0.18,
        c2y: cy - ry,
        x: cx,
        y: cy - ry,
      },
      {
        type: 'cubic',
        c1x: cx - rx * kOut,
        c1y: cy - ry,
        c2x: cx - rx,
        c2y: cy - ry * kOut,
        x: cx - rx,
        y: cy,
      },
    ]);

    pc.addSuperellipse(cx, cy, Math.max(20, rx - V), Math.max(24, ry - H), -1);
    return adv;
  },

  R(pc, m) {
    const w = Math.round(625 * m.widthScale);
    const sb = Math.round(56 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    const xL = sb;
    const xR = sb + w;
    const cap = m.cap;
    const V = Math.min(m.V * 0.96, w * 0.38);
    const H = Math.min(m.H * 0.90, cap * 0.21);
    const legW = Math.min(m.D1 * 1.02, w * 0.38);

    const bowlBotY = clamp(cap * (0.42 + m.crossbarShift * 0.15), cap * 0.28, cap * 0.56);
    const bowlMidY = (cap + bowlBotY) * 0.5;
    const bowlR = xR - w * 0.02;
    const flatR = xL + V + (bowlR - (xL + V)) * 0.38;
    const legJoinX = lerp(xL + V, flatR, 0.76);
    const kOut = m.kappaOut;
    const kIn = m.kappaIn;
    const trapIn = m.inkTraps > 0.01 ? V * 0.34 * m.inkTraps * m.trapDepth : 0;

    // Outer CW contour
    pc.addMixedContour([
      { type: 'pt', x: xL, y: 0, r: 1 },
      { type: 'pt', x: xL, y: cap, r: 1, flare: 1 },
      { type: 'pt', x: flatR, y: cap, r: 0 },
      {
        type: 'cubic',
        c1x: lerp(flatR, bowlR, kOut),
        c1y: cap,
        c2x: bowlR,
        c2y: lerp(bowlMidY, cap, kOut),
        x: bowlR,
        y: bowlMidY,
      },
      {
        type: 'cubic',
        c1x: bowlR,
        c1y: lerp(bowlMidY, bowlBotY, kOut),
        c2x: lerp(legJoinX, bowlR, kOut),
        c2y: bowlBotY + H * 0.1,
        x: legJoinX,
        y: bowlBotY + H * 0.08,
      },
      ...(trapIn > 1
        ? [{ type: 'pt', x: legJoinX - trapIn, y: bowlBotY + H * 0.25, r: 0 }]
        : []),
      { type: 'pt', x: xR, y: 0, r: 1 },
      { type: 'pt', x: xR - legW, y: 0, r: 1 },
      {
        type: 'pt',
        x: Math.max(xL + V, legJoinX - legW * 0.78),
        y: bowlBotY,
        r: 0.35,
        trap: { d: 0.9, w: 0.75, bx: -0.5, by: 0.85 },
      },
      {
        type: 'pt',
        x: xL + V,
        y: bowlBotY,
        r: 0.35,
        trap: { d: 0.85, w: 0.75, bx: -0.7, by: 0.7 },
      },
      { type: 'pt', x: xL + V, y: 0, r: 1 },
    ]);

    // Inner CCW D-counter
    const inL = xL + V;
    const inR = Math.max(inL + 22, bowlR - V * 0.94);
    const inTop = cap - H;
    const inBot = bowlBotY + H * 0.92;
    const inFlat = lerp(inL, inR, 0.38);
    const inMidY = (inTop + inBot) * 0.5;
    if (inTop - inBot > 14 && inR - inL > 14) {
      pc.addMixedContour(
        [
          { type: 'pt', x: inL, y: inTop, r: 0.4, trap: { d: 0.7, w: 0.65, bx: -0.7, by: 0.7 } },
          { type: 'pt', x: inL, y: inBot, r: 0.4, trap: { d: 0.7, w: 0.65, bx: -0.7, by: -0.7 } },
          { type: 'pt', x: inFlat, y: inBot, r: 0 },
          {
            type: 'cubic',
            c1x: lerp(inFlat, inR, kIn),
            c1y: inBot,
            c2x: inR,
            c2y: lerp(inMidY, inBot, kIn),
            x: inR,
            y: inMidY,
          },
          {
            type: 'cubic',
            c1x: inR,
            c1y: lerp(inMidY, inTop, kIn),
            c2x: lerp(inFlat, inR, kIn),
            c2y: inTop,
            x: inFlat,
            y: inTop,
          },
        ],
        -1
      );
    }
    return adv;
  },

  S(pc, m) {
    const w = Math.round(595 * m.widthScale);
    const sb = Math.round(44 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    addSContour(pc, m, {
      xL: sb,
      xR: sb + w,
      topY: m.cap + m.ov,
      botY: -m.ov,
      vStroke: m.V,
      hStroke: m.H,
    });
    return adv;
  },

  T(pc, m) {
    const w = Math.round(585 * m.widthScale);
    const sb = Math.round(30 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    const xL = sb;
    const xR = sb + w;
    const cx = (xL + xR) * 0.5;
    const cap = m.cap;
    const V = Math.min(m.V, w * 0.45);
    const H = Math.min(m.H, cap * 0.28);

    pc.addPolygon([
      [cx - V * 0.5, 0, { r: 1 }],
      [cx - V * 0.5, cap - H, { r: 0.45, flare: 1, trap: { d: 0.95, w: 0.85, bx: 0.7, by: 0.7 } }],
      [xL, cap - H, { r: 1 }],
      [xL, cap, { r: 1 }],
      [xR, cap, { r: 1 }],
      [xR, cap - H, { r: 1 }],
      [cx + V * 0.5, cap - H, { r: 0.45, trap: { d: 0.95, w: 0.85, bx: -0.7, by: 0.7 } }],
      [cx + V * 0.5, 0, { r: 1, flare: 1 }],
    ]);
    return adv;
  },

  U(pc, m) {
    const w = Math.round(645 * m.widthScale);
    const sb = Math.round(54 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    const xL = sb;
    const xR = sb + w;
    const cx = (xL + xR) * 0.5;
    const cap = m.cap;
    const V = Math.min(m.V, w * 0.39);
    const H = Math.min(m.H, cap * 0.28);
    const rightStemW = V * lerp(1, 0.52, m.eleg * 0.65);
    const botY = -m.ov;
    const turnY = Math.max(H * 1.4, w * 0.46);
    const kOut = m.kappaOut;
    const kIn = m.kappaIn;
    const inCx = (xL + V + (xR - rightStemW)) * 0.5;

    pc.addMixedContour([
      { type: 'pt', x: xL, y: cap, r: 1 },
      { type: 'pt', x: xL + V, y: cap, r: 1 },
      { type: 'pt', x: xL + V, y: turnY + H * 0.25, r: 0, flare: 1 },
      {
        type: 'cubic',
        c1x: xL + V,
        c1y: lerp(turnY + H * 0.25, botY + H, kIn),
        c2x: lerp(inCx, xL + V, kIn),
        c2y: botY + H,
        x: inCx,
        y: botY + H,
      },
      {
        type: 'cubic',
        c1x: lerp(inCx, xR - rightStemW, kIn),
        c1y: botY + H,
        c2x: xR - rightStemW,
        c2y: lerp(turnY + H * 0.25, botY + H, kIn),
        x: xR - rightStemW,
        y: turnY + H * 0.25,
      },
      { type: 'pt', x: xR - rightStemW, y: cap, r: 1, flare: 1 },
      { type: 'pt', x: xR, y: cap, r: 1 },
      { type: 'pt', x: xR, y: turnY, r: 0, flare: 1 },
      {
        type: 'cubic',
        c1x: xR,
        c1y: lerp(turnY, botY, kOut),
        c2x: lerp(cx, xR, kOut),
        c2y: botY,
        x: cx,
        y: botY,
      },
      {
        type: 'cubic',
        c1x: lerp(cx, xL, kOut),
        c1y: botY,
        c2x: xL,
        c2y: lerp(turnY, botY, kOut),
        x: xL,
        y: turnY,
      },
    ]);
    return adv;
  },

  V(pc, m) {
    const w = Math.round(660 * m.widthScale);
    const sb = Math.round(28 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    const xL = sb;
    const xR = sb + w;
    const cx = (xL + xR) * 0.5;
    const cap = m.cap;

    const leftW = Math.min(m.D1 * 0.92, w * 0.305);
    const rightW = Math.min(m.D2 * 0.88, w * 0.295);
    const botHalfW = Math.min(w * 0.22, Math.max((leftW + rightW) * 0.36, w * 0.125));
    const innerApexY = Math.min(cap * 0.68, Math.max(leftW, rightW) * 0.95);

    pc.addPolygon([
      [cx - botHalfW, 0, { r: 1 }],
      [xL, cap, { r: 1, flare: 1 }],
      [xL + leftW, cap, { r: 1 }],
      [cx, innerApexY, { r: 0.25, trap: { d: 1.35, w: 0.95, bx: 0, by: -1, maxD: innerApexY * 0.68 } }],
      [xR - rightW, cap, { r: 1 }],
      [xR, cap, { r: 1, flare: 1 }],
      [cx + botHalfW, 0, { r: 1 }],
    ]);
    return adv;
  },

  W(pc, m) {
    const w = Math.round(890 * m.widthScale);
    const sb = Math.round(26 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    const xL = sb;
    const xR = sb + w;
    const cx = (xL + xR) * 0.5;
    const cap = m.cap;

    const s1 = Math.min(m.D1 * 0.78, w * 0.195);
    const s2 = Math.min(m.D2 * 0.75, w * 0.185);
    const v1X = xL + w * 0.27;
    const v2X = xR - w * 0.27;
    const botHalf = Math.min(w * 0.125, Math.max((s1 + s2) * 0.45, w * 0.085));
    const midTopHalf = Math.min(w * 0.11, Math.max((s1 + s2) * 0.42, w * 0.075));
    const midTopY = cap * 0.96;
    const innerBotY = Math.min(cap * 0.68, Math.max(s1, s2) * 1.18);
    const innerMidY = Math.max(cap * 0.30, cap - Math.max(s1, s2) * 1.18);

    pc.addPolygon([
      [v1X - botHalf, 0, { r: 0.9 }],
      [xL, cap, { r: 1 }],
      [xL + s1, cap, { r: 1 }],
      [v1X, innerBotY, { r: 0.2, trap: { d: 1.25, w: 0.9, bx: 0, by: -1, maxD: innerBotY * 0.66 } }],
      [cx - midTopHalf, midTopY, { r: 0.8 }],
      [cx + midTopHalf, midTopY, { r: 0.8 }],
      [v2X, innerBotY, { r: 0.2, trap: { d: 1.25, w: 0.9, bx: 0, by: -1, maxD: innerBotY * 0.66 } }],
      [xR - s2, cap, { r: 1 }],
      [xR, cap, { r: 1 }],
      [v2X + botHalf, 0, { r: 0.9 }],
      [v2X - botHalf, 0, { r: 0.9 }],
      [cx, innerMidY, { r: 0.2, trap: { d: 1.25, w: 0.9, bx: 0, by: 1, maxD: (midTopY - innerMidY) * 0.66 } }],
      [v1X + botHalf, 0, { r: 0.9 }],
    ]);
    return adv;
  },

  X(pc, m) {
    const w = Math.round(640 * m.widthScale);
    const sb = Math.round(30 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    const xL = sb;
    const xR = sb + w;
    const cx = (xL + xR) * 0.5;
    const cap = m.cap;
    const midY = clamp(cap * (0.50 + m.crossbarShift * 0.14), cap * 0.34, cap * 0.66);

    const d1 = Math.min(m.D1 * 0.94, w * 0.31);
    const d2 = Math.min(m.D2 * 0.90, w * 0.30);
    const dAvg = (d1 + d2) * 0.5;
    // Exact collinear intersection geometry for two crossing diagonals
    const waistHalfX = Math.max(dAvg * 0.52, w * 0.08);
    const waistHalfY = Math.min(
      cap * 0.26,
      Math.max((cap * 0.5) * (dAvg / Math.max(dAvg * 1.4, w - dAvg)), cap * 0.08)
    );

    pc.addPolygon([
      [xL, 0, { r: 1 }],
      [cx - waistHalfX, midY, { r: 0.25, trap: { d: 1.1, w: 0.85, bx: 1, by: 0 } }],
      [xL + w * 0.02, cap, { r: 1 }],
      [xL + w * 0.02 + d1, cap, { r: 1 }],
      [cx, midY + waistHalfY, { r: 0.25, trap: { d: 1.1, w: 0.85, bx: 0, by: -1 } }],
      [xR - w * 0.02 - d2, cap, { r: 1 }],
      [xR - w * 0.02, cap, { r: 1 }],
      [cx + waistHalfX, midY, { r: 0.25, trap: { d: 1.1, w: 0.85, bx: -1, by: 0 } }],
      [xR, 0, { r: 1 }],
      [xR - d1, 0, { r: 1 }],
      [cx, midY - waistHalfY, { r: 0.25, trap: { d: 1.1, w: 0.85, bx: 0, by: 1 } }],
      [xL + d2, 0, { r: 1 }],
    ]);
    return adv;
  },

  Y(pc, m) {
    const w = Math.round(640 * m.widthScale);
    const sb = Math.round(28 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    const xL = sb;
    const xR = sb + w;
    const cx = (xL + xR) * 0.5;
    const cap = m.cap;

    const V = Math.min(m.V, w * 0.36);
    const d1 = Math.min(m.D1 * 1.02, w * 0.35);
    const d2 = Math.min(m.D2 * 0.96, w * 0.34);
    const joinY = clamp(cap * (0.40 + m.crossbarShift * 0.16), cap * 0.22, cap * 0.56);
    const innerCrotchY = Math.min(cap * 0.84, joinY + Math.max(d1, d2) * 0.95);

    pc.addPolygon([
      [cx - V * 0.5, 0, { r: 1 }],
      [cx - V * 0.5, joinY, { r: 0.4, flare: 1 }],
      [xL, cap, { r: 1 }],
      [xL + d1, cap, { r: 1 }],
      [cx, innerCrotchY, { r: 0.25, trap: { d: 1.25, w: 0.9, bx: 0, by: -1 } }],
      [xR - d2, cap, { r: 1 }],
      [xR, cap, { r: 1 }],
      [cx + V * 0.5, joinY, { r: 0.4 }],
      [cx + V * 0.5, 0, { r: 1, flare: 1 }],
    ]);
    return adv;
  },

  Z(pc, m) {
    const w = Math.round(590 * m.widthScale);
    const sb = Math.round(42 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    const xL = sb;
    const xR = sb + w;
    const cap = m.cap;
    const H = Math.min(m.H * 0.96, cap * 0.25);
    const diagW = Math.min(m.D1 * 1.04, w * 0.38);

    pc.addPolygon([
      [xL, 0, { r: 1 }],
      [xL, H * 0.92, { r: 0.6 }],
      [xR - diagW * 1.08, cap - H, { r: 0.25, trap: { d: 1.15, w: 0.85, bx: 0.85, by: 0.5 } }],
      [xL + w * 0.02, cap - H, { r: 1 }],
      [xL + w * 0.02, cap, { r: 1 }],
      [xR, cap, { r: 1 }],
      [xR, cap - H * 0.92, { r: 0.6 }],
      [xL + diagW * 1.08, H, { r: 0.25, trap: { d: 1.15, w: 0.85, bx: -0.85, by: -0.5 } }],
      [xR, H, { r: 1 }],
      [xR, 0, { r: 1 }],
    ]);
    return adv;
  },
};

/**
 * Lowercase Glyphs (a-z)
 */
Object.assign(GLYPH_BUILDERS, {
  a(pc, m) {
    // If single-story 'a' alternate is chosen (e.g. Circular / Futura geometric mode)
    if (m.p.singleStoryA > 0.5) {
      return buildStemAndBowl(pc, { ...m, asc: m.xh }, 'd');
    }

    const w = Math.round(555 * m.widthScale);
    const sb = Math.round(44 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    const xL = sb;
    const xR = sb + w;
    const xh = m.xh;
    const topY = xh + m.ov;
    const botY = -m.ov;

    // 3 horizontal bars in double-story 'a': optical density control
    const V = Math.min(m.V * 0.90, w * 0.37);
    const H = Math.min(m.H * 0.84, xh * 0.22);
    const sp = m.spurless;
    const kOut = m.kappaOut;
    const kIn = m.kappaIn;

    const archCx = xL + w * 0.48;
    const topTermX = xL + w * 0.05;
    const topTermOutY = xh * lerp(0.66, 0.58, m.aperture);
    const topTermInY = lerp(topTermOutY - H * 0.38, topTermOutY, m.termCut * 0.8);
    const topTermInX = topTermX + V * 0.92;

    const bellyTopY = clamp(xh * (0.57 + m.crossbarShift * 0.14), H * 2.1, xh - H * 1.35);
    const bellyMidY = (bellyTopY + botY) * 0.48;
    const bellyBotX = xL + (xR - V - xL) * 0.48;
    const notchDepth = lerp(Math.min(xh * 0.14, V * 0.48), xh * 0.25, m.inkTraps * m.trapDepth) * (1 - sp);
    const rightBotCornerY = lerp(0, xh * 0.36, sp);

    // Outer CW contour of double-story 'a'
    const outer = [
      // Top-left terminal outer
      { type: 'pt', x: topTermX, y: topTermOutY, r: 0.75 },
      // Curve to top arch crown (archCx, topY)
      {
        type: 'cubic',
        c1x: topTermX,
        c1y: lerp(topTermOutY, topY, 0.72),
        c2x: lerp(archCx, topTermX, kOut),
        c2y: topY,
        x: archCx,
        y: topY,
      },
      // Arch crown -> Outer right stem top
      {
        type: 'cubic',
        c1x: lerp(archCx, xR, kOut),
        c1y: topY,
        c2x: xR,
        c2y: lerp(xh * 0.58, topY, kOut),
        x: xR,
        y: xh * 0.58,
      },
      // Down right stem to rightBotCornerY
      { type: 'pt', x: xR, y: rightBotCornerY, r: sp > 0.5 ? 0 : 1 },
    ];

    if (sp < 0.98) {
      outer.push(
        { type: 'pt', x: xR - V * (1 - sp), y: rightBotCornerY * 0.15, r: 0.8 },
        { type: 'pt', x: xR - V, y: botY + notchDepth, r: 0.15 },
        ...(m.inkTraps > 0.02 && sp < 0.75
          ? [
              {
                type: 'pt',
                x: xR - V + V * 0.25 * m.inkTraps * m.trapDepth * (1 - sp),
                y: botY + notchDepth + V * 0.12 * m.inkTraps * m.trapDepth * (1 - sp),
                r: 0,
              },
            ]
          : []),
        {
          type: 'cubic',
          c1x: lerp(xR - V, bellyBotX, 0.28),
          c1y: lerp(botY + notchDepth, botY, 0.78),
          c2x: lerp(bellyBotX, xR - V, kOut),
          c2y: botY,
          x: bellyBotX,
          y: botY,
        }
      );
    } else {
      // Spurless bottom-right sweep
      outer.push({
        type: 'cubic',
        c1x: xR,
        c1y: lerp(rightBotCornerY, botY, kOut),
        c2x: lerp(bellyBotX, xR, kOut),
        c2y: botY,
        x: bellyBotX,
        y: botY,
      });
    }

    // Belly bottom -> Left belly cheek (xL, bellyMidY) -> Belly top -> Inner stem wall (xR - V)
    outer.push(
      {
        type: 'cubic',
        c1x: lerp(bellyBotX, xL, kOut),
        c1y: botY,
        c2x: xL,
        c2y: lerp(bellyMidY, botY, kOut),
        x: xL,
        y: bellyMidY,
      },
      {
        type: 'cubic',
        c1x: xL,
        c1y: lerp(bellyMidY, bellyTopY, kOut),
        c2x: lerp(bellyBotX, xL, 0.65),
        c2y: bellyTopY,
        x: xR - V,
        y: bellyTopY,
      },
      // Up inner stem wall to inner arch
      { type: 'pt', x: xR - V, y: xh * 0.60, r: 0.3, trap: { d: 0.7, w: 0.6, bx: 0.7, by: 0.7 } },
      {
        type: 'cubic',
        c1x: xR - V,
        c1y: lerp(xh * 0.60, topY - H, kIn),
        c2x: lerp(archCx, xR - V, kIn),
        c2y: topY - H,
        x: archCx,
        y: topY - H,
      },
      {
        type: 'cubic',
        c1x: lerp(archCx, topTermInX, kIn),
        c1y: topY - H,
        c2x: topTermInX,
        c2y: lerp(topTermInY, topY - H, 0.68),
        x: topTermInX,
        y: topTermInY,
      }
    );

    pc.addMixedContour(outer);

    // Inner CCW belly counter
    const inL = xL + V * 0.92;
    const inR = xR - V;
    const inTop = bellyTopY - H * 0.86;
    const inBot = botY + H * 0.90;
    const inMidY = (inTop + inBot) * 0.5;
    const inCx = (inL + inR) * 0.48;
    if (inR - inL > 14 && inTop - inBot > 12) {
      pc.addMixedContour(
        [
          { type: 'pt', x: inL, y: inMidY, r: 0 },
          {
            type: 'cubic',
            c1x: inL,
            c1y: lerp(inMidY, inBot, kIn),
            c2x: lerp(inCx, inL, kIn),
            c2y: inBot,
            x: inCx,
            y: inBot,
          },
          {
            type: 'cubic',
            c1x: lerp(inCx, inR, kIn),
            c1y: inBot,
            c2x: inR,
            c2y: lerp(inMidY, inBot, kIn),
            x: inR,
            y: inMidY,
          },
          { type: 'pt', x: inR, y: inTop, r: 0.35, trap: { d: 0.65, w: 0.6, bx: 0.7, by: 0.7 } },
          {
            type: 'cubic',
            c1x: lerp(inCx, inR, 0.55),
            c1y: inTop,
            c2x: inL,
            c2y: lerp(inMidY, inTop, kIn),
            x: inL,
            y: inMidY,
          },
        ],
        -1
      );
    }
    return adv;
  },

  b(pc, m) {
    return buildStemAndBowl(pc, m, 'b');
  },

  c(pc, m) {
    const w = Math.round(525 * m.widthScale);
    const sb = Math.round(40 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    const cx = sb + w * 0.51;
    const cy = m.xh * 0.5;
    const rx = w * 0.51;
    const ry = m.xh * 0.5 + m.ov;
    const V = Math.min(m.V * 0.95, rx * 0.68);
    const H = Math.min(m.H * 0.92, ry * 0.62);

    addOpenBowlContour(pc, m, {
      cx,
      cy,
      rx,
      ry,
      vStroke: V,
      hStroke: H,
      topAngleDeg: 33,
      botAngleDeg: 33,
    });
    return adv;
  },

  d(pc, m) {
    return buildStemAndBowl(pc, m, 'd');
  },

  e(pc, m) {
    const w = Math.round(555 * m.widthScale);
    const sb = Math.round(40 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    const xL = sb;
    const xR = sb + w;
    const cx = (xL + xR) * 0.5;
    const cy = m.xh * 0.5;
    const rx = w * 0.5;
    const ry = m.xh * 0.5 + m.ov;

    const V = Math.min(m.V * 0.92, rx * 0.65);
    const H = Math.min(m.H * 0.85, ry * 0.44);
    const kOut = m.kappaOut;
    const kIn = m.kappaIn;

    const barBotY = clamp(cy - H * 0.25 + m.crossbarShift * m.xh * 0.14, H * 1.1, m.xh - H * 1.65);
    const barTopY = barBotY + H * 0.88;

    const botA = (clamp(32 - m.aperture * 20, 8, 56) * Math.PI) / 180;
    const outBotX = cx + rx * Math.cos(botA);
    const outBotY = cy - ry * Math.sin(botA);
    const ix = Math.max(20, rx - V);
    const iy = Math.max(20, ry - H);
    const inBotY = lerp(cy - iy * Math.sin(botA), outBotY + H * 0.32, m.termCut * 0.75);
    const inBotX = cx + ix * Math.cos(asinClamp((cy - inBotY) / iy));
    const botFrac = clamp((Math.PI / 2 - botA) / (Math.PI / 2), 0.2, 1);

    // Outer CW contour
    pc.addMixedContour(
      [
        { type: 'pt', x: xR, y: barBotY, r: 0.7 },
        { type: 'pt', x: xR, y: cy, r: 0 },
        {
          type: 'cubic',
          c1x: xR,
          c1y: cy + ry * kOut,
          c2x: cx + rx * kOut,
          c2y: cy + ry,
          x: cx,
          y: cy + ry,
        },
        {
          type: 'cubic',
          c1x: cx - rx * kOut,
          c1y: cy + ry,
          c2x: xL,
          c2y: cy + ry * kOut,
          x: xL,
          y: cy,
        },
        {
          type: 'cubic',
          c1x: xL,
          c1y: cy - ry * kOut,
          c2x: cx - rx * kOut,
          c2y: cy - ry,
          x: cx,
          y: cy - ry,
        },
        {
          type: 'cubic',
          c1x: cx + rx * kOut * botFrac,
          c1y: cy - ry,
          c2x: outBotX - rx * Math.sin(botA) * kOut * botFrac * 0.7,
          c2y: lerp(outBotY, cy - ry, 0.58),
          x: outBotX,
          y: outBotY,
        },
        { type: 'pt', x: inBotX, y: inBotY, r: 0.7 },
        {
          type: 'cubic',
          c1x: inBotX - ix * Math.sin(botA) * kIn * botFrac * 0.65,
          c1y: lerp(inBotY, cy - iy, 0.62),
          c2x: cx + ix * kIn * botFrac,
          c2y: cy - iy,
          x: cx,
          y: cy - iy,
        },
        {
          type: 'cubic',
          c1x: cx - ix * kIn,
          c1y: cy - iy,
          c2x: cx - ix,
          c2y: lerp(barBotY, cy - iy, 0.55),
          x: cx - ix,
          y: barBotY,
        },
        { type: 'pt', x: cx - ix, y: barBotY, r: 0.35, trap: { d: 0.75, w: 0.65, bx: -0.7, by: 0.7 } },
      ],
      1
    );

    // Upper D-eye counter (CCW)
    const eyeTop = cy + iy;
    if (eyeTop - barTopY > 12 && ix > 14) {
      pc.addMixedContour(
        [
          { type: 'pt', x: cx - ix, y: barTopY, r: 0.35, trap: { d: 0.6, w: 0.55, bx: -0.7, by: -0.7 } },
          { type: 'pt', x: cx + ix, y: barTopY, r: 0.35, trap: { d: 0.6, w: 0.55, bx: 0.7, by: -0.7 } },
          {
            type: 'cubic',
            c1x: cx + ix,
            c1y: lerp(barTopY, eyeTop, kIn),
            c2x: cx + ix * kIn,
            c2y: eyeTop,
            x: cx,
            y: eyeTop,
          },
          {
            type: 'cubic',
            c1x: cx - ix * kIn,
            c1y: eyeTop,
            c2x: cx - ix,
            c2y: lerp(barTopY, eyeTop, kIn),
            x: cx - ix,
            y: barTopY,
          },
        ],
        -1
      );
    }
    return adv;
  },

  f(pc, m) {
    const w = Math.round(375 * m.widthScale);
    const sb = Math.round(28 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    const xL = sb;
    const xR = sb + w;
    const V = Math.min(m.V * 0.94, w * 0.52);
    const H = Math.min(m.H * 0.92, m.xh * 0.28);

    const stemL = xL + w * 0.22;
    const stemR = stemL + V;
    const barTop = m.xh;
    const barBot = m.xh - H;
    const topY = m.asc + m.ov * 0.5;
    const hookCurveY = Math.max(barTop + 20, m.asc - V * 0.85);
    const kOut = m.kappaOut;

    pc.addMixedContour([
      { type: 'pt', x: stemL, y: 0, r: 1 },
      { type: 'pt', x: stemL, y: barBot, r: 0.4, trap: { d: 0.7, w: 0.65, bx: 0.7, by: 0.7 } },
      { type: 'pt', x: xL, y: barBot, r: 1 },
      { type: 'pt', x: xL, y: barTop, r: 1 },
      { type: 'pt', x: stemL, y: barTop, r: 0.4, trap: { d: 0.7, w: 0.65, bx: 0.7, by: -0.7 } },
      { type: 'pt', x: stemL, y: hookCurveY, r: 0 },
      {
        type: 'cubic',
        c1x: stemL,
        c1y: lerp(hookCurveY, topY, kOut),
        c2x: lerp(xR - w * 0.12, stemL, kOut),
        c2y: topY,
        x: xR - w * 0.08,
        y: topY,
      },
      { type: 'pt', x: xR, y: topY, r: 0.8 },
      { type: 'pt', x: xR, y: topY - H, r: 0.8 },
      { type: 'pt', x: lerp(stemR, xR, 0.35), y: topY - H, r: 0 },
      {
        type: 'cubic',
        c1x: lerp(stemR, xR, 0.12),
        c1y: topY - H,
        c2x: stemR,
        c2y: lerp(hookCurveY, topY - H, 0.65),
        x: stemR,
        y: Math.min(hookCurveY, topY - H),
      },
      { type: 'pt', x: stemR, y: barTop, r: 0.4, trap: { d: 0.7, w: 0.65, bx: -0.7, by: -0.7 } },
      { type: 'pt', x: xR - w * 0.04, y: barTop, r: 1 },
      { type: 'pt', x: xR - w * 0.04, y: barBot, r: 1 },
      { type: 'pt', x: stemR, y: barBot, r: 0.4, trap: { d: 0.7, w: 0.65, bx: -0.7, by: 0.7 } },
      { type: 'pt', x: stemR, y: 0, r: 1, flare: 1 },
    ]);
    return adv;
  },

  g(pc, m) {
    const w = Math.round(570 * m.widthScale);
    const sb = Math.round(46 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    const xL = sb;
    const xR = sb + w;
    const xh = m.xh;
    const topY = xh + m.ov;
    const bowlBotY = m.p.doubleStoryG > 0.5 ? xh * 0.22 : 0;
    const bowlMidY = (topY + bowlBotY) * 0.5;

    const V = Math.min(m.V * 0.94, w * 0.38);
    const H = Math.min(m.H * 0.90, xh * 0.26);
    const sp = m.spurless;
    const kOut = m.kappaOut;
    const kIn = m.kappaIn;

    const bowlCenterX = xR - V - (w - V) * lerp(0.45, 0.49, sp);
    const bowlRx = bowlCenterX - xL;
    const bowlRy = (topY - bowlBotY) * 0.5;
    const notchDepth = lerp(Math.min(xh * 0.15, V * 0.52), xh * 0.28, m.inkTraps * m.trapDepth);
    const topNotch = notchDepth * (1 - sp);
    const botNotch = notchDepth;
    const rightTopCornerY = lerp(xh, bowlMidY, sp);

    const descBotY = m.desc - m.ov;
    const descTurnY = m.desc + H * 1.25;
    const descTermY = descTurnY + lerp(0, xh * 0.12, m.aperture);
    const descCx = (xL + xR) * 0.5;

    // Outer CW contour
    const outer = [
      { type: 'pt', x: xR, y: rightTopCornerY, r: sp > 0.5 ? 0 : 1 },
      { type: 'pt', x: xR, y: descTurnY, r: 0 },
      // Descender hook bottom curve
      {
        type: 'cubic',
        c1x: xR,
        c1y: lerp(descTurnY, descBotY, kOut),
        c2x: lerp(descCx, xR, kOut),
        c2y: descBotY,
        x: descCx,
        y: descBotY,
      },
      {
        type: 'cubic',
        c1x: lerp(descCx, xL + w * 0.04, kOut),
        c1y: descBotY,
        c2x: xL + w * 0.04,
        c2y: lerp(descTermY, descBotY, kOut),
        x: xL + w * 0.04,
        y: descTermY,
      },
      { type: 'pt', x: xL + w * 0.04 + V * 0.94, y: descTermY - H * 0.2 * (1 - m.termCut), r: 0.7 },
      {
        type: 'cubic',
        c1x: xL + w * 0.04 + V * 0.94,
        c1y: lerp(descTermY, descBotY + H, kIn),
        c2x: lerp(descCx, xL + w * 0.04 + V * 0.94, kIn),
        c2y: descBotY + H,
        x: descCx,
        y: descBotY + H,
      },
      {
        type: 'cubic',
        c1x: lerp(descCx, xR - V, kIn),
        c1y: descBotY + H,
        c2x: xR - V,
        c2y: lerp(descTurnY, descBotY + H, kIn),
        x: xR - V,
        y: descTurnY,
      },
      // Up inner stem wall to bottom bowl notch
      { type: 'pt', x: xR - V, y: bowlBotY + botNotch, r: 0.15 },
      ...(m.inkTraps > 0.02
        ? [
            {
              type: 'pt',
              x: xR - V + V * 0.26 * m.inkTraps * m.trapDepth,
              y: bowlBotY + botNotch + V * 0.12 * m.inkTraps * m.trapDepth,
              r: 0,
            },
          ]
        : []),
      // Bottom bowl crown
      {
        type: 'cubic',
        c1x: lerp(xR - V, bowlCenterX, 0.25),
        c1y: lerp(bowlBotY + botNotch, bowlBotY, 0.78),
        c2x: bowlCenterX + bowlRx * kOut * 0.85,
        c2y: bowlBotY,
        x: bowlCenterX,
        y: bowlBotY,
      },
      // Left bowl cheek
      {
        type: 'cubic',
        c1x: bowlCenterX - bowlRx * kOut,
        c1y: bowlBotY,
        c2x: xL,
        c2y: bowlMidY - bowlRy * kOut,
        x: xL,
        y: bowlMidY,
      },
      // Top bowl crown
      {
        type: 'cubic',
        c1x: xL,
        c1y: bowlMidY + bowlRy * kOut,
        c2x: bowlCenterX - bowlRx * kOut,
        c2y: topY,
        x: bowlCenterX,
        y: topY,
      },
    ];

    if (sp < 0.98) {
      outer.push(
        {
          type: 'cubic',
          c1x: bowlCenterX + bowlRx * kOut * 0.85,
          c1y: topY,
          c2x: lerp(xR - V, bowlCenterX, 0.25),
          c2y: lerp(topY - topNotch, topY, 0.78),
          x: xR - V,
          y: topY - topNotch,
        },
        ...(m.inkTraps > 0.02 && sp < 0.75
          ? [
              {
                type: 'pt',
                x: xR - V + V * 0.26 * m.inkTraps * m.trapDepth * (1 - sp),
                y: topY - topNotch - V * 0.12 * m.inkTraps * m.trapDepth * (1 - sp),
                r: 0,
              },
            ]
          : []),
        { type: 'pt', x: xR - V, y: lerp(xh, rightTopCornerY, sp), r: 0.8 },
        { type: 'pt', x: xR - V * sp, y: lerp(xh, rightTopCornerY, sp), r: 0.8 }
      );
    } else {
      // Spurless top-right sweep
      const fullRx = xR - bowlCenterX;
      outer.push({
        type: 'cubic',
        c1x: bowlCenterX + fullRx * kOut,
        c1y: topY,
        c2x: xR,
        c2y: bowlMidY + bowlRy * kOut,
        x: xR,
        y: rightTopCornerY,
      });
    }

    pc.addMixedContour(outer);

    // Inner CCW bowl counter
    const inCx = (xL + V + (xR - V)) * 0.5;
    const inRx = Math.max(16, (xR - V - (xL + V)) * 0.5);
    const inRy = Math.max(16, (topY - bowlBotY) * 0.5 - H);
    pc.addSuperellipse(inCx, bowlMidY, inRx, inRy, -1);
    return adv;
  },

  h(pc, m) {
    return buildArchGlyph(pc, m, 'h');
  },

  i(pc, m) {
    const V = m.V * 0.96;
    const sb = Math.round(54 * clamp(m.widthScale, 0.75, 1.15));
    const adv = Math.round(V + sb * 2);
    const xL = sb;
    const cx = xL + V * 0.5;

    pc.addPolygon([
      [xL, 0, { r: 1 }],
      [xL, m.xh, { r: 1, flare: 1 }],
      [xL + V, m.xh, { r: 1 }],
      [xL + V, 0, { r: 1, flare: 1 }],
    ]);

    // Tittle dot (superellipse/square depending on squaring & roundness)
    const dotR = V * 0.54;
    const dotCy = Math.min(m.asc - dotR * 0.2, m.xh + dotR * 1.42);
    if (m.roundness > 0.35 || m.p.squaring < 45) {
      pc.addSuperellipse(cx, dotCy, dotR, dotR, 1);
    } else {
      pc.addPolygon([
        [cx - dotR, dotCy - dotR, { r: 1 }],
        [cx - dotR, dotCy + dotR, { r: 1 }],
        [cx + dotR, dotCy + dotR, { r: 1 }],
        [cx + dotR, dotCy - dotR, { r: 1 }],
      ]);
    }
    return adv;
  },

  j(pc, m) {
    const V = m.V * 0.96;
    const sb = Math.round(48 * clamp(m.widthScale, 0.75, 1.15));
    const adv = Math.round(V + sb * 2.1);
    const stemR = adv - sb;
    const stemL = stemR - V;
    const cx = stemL + V * 0.5;
    const H = Math.min(m.H, m.xh * 0.28);
    const botY = m.desc - m.ov * 0.5;
    const hookL = sb * 0.35;

    pc.addPolygon([
      [ hookL, botY, { r: 1 } ],
      [ hookL, botY + H, { r: 1 } ],
      [ stemL, botY + H, { r: 0.4, trap: { d: 0.7, w: 0.65, bx: 0.7, by: -0.7 } } ],
      [ stemL, m.xh, { r: 1, flare: 1 } ],
      [ stemR, m.xh, { r: 1 } ],
      [ stemR, botY, { r: 1.4, flare: 1 } ],
    ]);

    const dotR = V * 0.54;
    const dotCy = Math.min(m.asc - dotR * 0.2, m.xh + dotR * 1.42);
    pc.addSuperellipse(cx, dotCy, dotR, dotR, 1);
    return adv;
  },

  k(pc, m) {
    const w = Math.round(535 * m.widthScale);
    const sb = Math.round(52 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    const xL = sb;
    const xR = sb + w;
    const V = Math.min(m.V * 0.96, w * 0.40);
    const upArmW = Math.min(m.D2 * 0.96, w * 0.38);
    const loLegW = Math.min(m.D1 * 1.00, w * 0.40);

    const midY = m.xh * (0.46 + m.crossbarShift * 0.14);
    const crotchX = xL + V + (xR - (xL + V)) * 0.24;
    const joinTopY = Math.min(m.xh * 0.82, midY + upArmW * 0.45);
    const joinBotY = Math.max(m.xh * 0.14, midY - upArmW * 0.45);

    pc.addPolygon([
      [xL, 0, { r: 1 }],
      [xL, m.asc, { r: 1, flare: 1 }],
      [xL + V, m.asc, { r: 1 }],
      [xL + V, joinTopY, { r: 0.25, trap: { d: 1.05, w: 0.8, bx: -0.35, by: -0.94 } }],
      [xR - upArmW * 1.05, m.xh, { r: 1 }],
      [xR - w * 0.02, m.xh, { r: 1 }],
      [crotchX, midY, { r: 0.25, trap: { d: 1.0, w: 0.8, bx: -1, by: 0 } }],
      [xR, 0, { r: 1 }],
      [xR - loLegW * 1.05, 0, { r: 1 }],
      [xL + V, joinBotY, { r: 0.25, trap: { d: 1.05, w: 0.8, bx: 0.25, by: 0.96 } }],
      [xL + V, 0, { r: 1 }],
    ]);
    return adv;
  },

  l(pc, m) {
    const V = m.V * 0.96;
    const sb = Math.round(56 * clamp(m.widthScale, 0.75, 1.15));
    const adv = Math.round(V + sb * 2);
    const xL = sb;
    pc.addPolygon([
      [xL, 0, { r: 1 }],
      [xL, m.asc, { r: 1, flare: 1 }],
      [xL + V, m.asc, { r: 1 }],
      [xL + V, 0, { r: 1, flare: 1 }],
    ]);
    return adv;
  },

  m(pc, m) {
    return buildArchGlyph(pc, m, 'm');
  },

  n(pc, m) {
    return buildArchGlyph(pc, m, 'n');
  },

  o(pc, m) {
    const w = Math.round(565 * m.widthScale);
    const sb = Math.round(42 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    const cx = sb + w * 0.5;
    const cy = m.xh * 0.5;
    const rx = w * 0.5;
    const ry = m.xh * 0.5 + m.ov;
    const V = Math.min(m.V * 0.96, rx * 0.70);
    const H = Math.min(m.H * 0.92, ry * 0.64);

    pc.addSuperellipse(cx, cy, rx, ry, 1);
    pc.addSuperellipse(cx, cy, Math.max(18, rx - V), Math.max(18, ry - H), -1);
    return adv;
  },

  p(pc, m) {
    return buildStemAndBowl(pc, m, 'p');
  },

  q(pc, m) {
    return buildStemAndBowl(pc, m, 'q');
  },

  r(pc, m) {
    return buildArchGlyph(pc, m, 'r');
  },

  s(pc, m) {
    const w = Math.round(495 * m.widthScale);
    const sb = Math.round(40 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    addSContour(pc, m, {
      xL: sb,
      xR: sb + w,
      topY: m.xh + m.ov,
      botY: -m.ov,
      vStroke: m.V * 0.92,
      hStroke: m.H * 0.88,
    });
    return adv;
  },

  t(pc, m) {
    const w = Math.round(385 * m.widthScale);
    const sb = Math.round(28 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    const xL = sb;
    const xR = sb + w;
    const V = Math.min(m.V * 0.94, w * 0.52);
    const H = Math.min(m.H * 0.92, m.xh * 0.28);

    const stemL = xL + w * 0.22;
    const stemR = stemL + V;
    const topY = Math.min(m.asc, m.xh + V * 1.15);
    const barTop = m.xh;
    const barBot = m.xh - H;
    const botY = -m.ov * 0.5;
    const turnY = Math.max(H * 1.2, V * 0.85);
    const kOut = m.kappaOut;

    pc.addMixedContour([
      { type: 'pt', x: stemL, y: turnY, r: 0 },
      { type: 'pt', x: stemL, y: barBot, r: 0.4, trap: { d: 0.7, w: 0.65, bx: 0.7, by: 0.7 } },
      { type: 'pt', x: xL, y: barBot, r: 1 },
      { type: 'pt', x: xL, y: barTop, r: 1 },
      { type: 'pt', x: stemL, y: barTop, r: 0.4, trap: { d: 0.7, w: 0.65, bx: 0.7, by: -0.7 } },
      { type: 'pt', x: stemL, y: topY, r: 1 },
      { type: 'pt', x: stemR, y: topY, r: 1 },
      { type: 'pt', x: stemR, y: barTop, r: 0.4, trap: { d: 0.7, w: 0.65, bx: -0.7, by: -0.7 } },
      { type: 'pt', x: xR, y: barTop, r: 1 },
      { type: 'pt', x: xR, y: barBot, r: 1 },
      { type: 'pt', x: stemR, y: barBot, r: 0.4, trap: { d: 0.7, w: 0.65, bx: -0.7, by: 0.7 } },
      { type: 'pt', x: stemR, y: Math.max(turnY, botY + H), r: 0 },
      {
        type: 'cubic',
        c1x: stemR,
        c1y: lerp(turnY, botY + H, 0.65),
        c2x: lerp(stemR, xR, 0.15),
        c2y: botY + H,
        x: lerp(stemR, xR, 0.40),
        y: botY + H,
      },
      { type: 'pt', x: xR, y: botY + H, r: 0.8 },
      { type: 'pt', x: xR, y: botY, r: 0.8 },
      { type: 'pt', x: xR - w * 0.10, y: botY, r: 0 },
      {
        type: 'cubic',
        c1x: lerp(xR - w * 0.10, stemL, kOut),
        c1y: botY,
        c2x: stemL,
        c2y: lerp(turnY, botY, kOut),
        x: stemL,
        y: turnY,
      },
    ]);
    return adv;
  },

  u(pc, m) {
    return buildArchGlyph(pc, m, 'u');
  },

  v(pc, m) {
    const w = Math.round(545 * m.widthScale);
    const sb = Math.round(24 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    const xL = sb;
    const xR = sb + w;
    const cx = (xL + xR) * 0.5;
    const xh = m.xh;

    const leftW = Math.min(m.D1 * 0.90, w * 0.305);
    const rightW = Math.min(m.D2 * 0.86, w * 0.295);
    const botHalfW = Math.min(w * 0.22, Math.max((leftW + rightW) * 0.36, w * 0.125));
    const innerApexY = Math.min(xh * 0.68, Math.max(leftW, rightW) * 0.95);

    pc.addPolygon([
      [cx - botHalfW, 0, { r: 1 }],
      [xL, xh, { r: 1, flare: 1 }],
      [xL + leftW, xh, { r: 1 }],
      [cx, innerApexY, { r: 0.25, trap: { d: 1.25, w: 0.9, bx: 0, by: -1, maxD: innerApexY * 0.68 } }],
      [xR - rightW, xh, { r: 1 }],
      [xR, xh, { r: 1, flare: 1 }],
      [cx + botHalfW, 0, { r: 1 }],
    ]);
    return adv;
  },

  w(pc, m) {
    const w = Math.round(765 * m.widthScale);
    const sb = Math.round(24 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    const xL = sb;
    const xR = sb + w;
    const cx = (xL + xR) * 0.5;
    const xh = m.xh;

    const s1 = Math.min(m.D1 * 0.76, w * 0.195);
    const s2 = Math.min(m.D2 * 0.73, w * 0.185);
    const v1X = xL + w * 0.27;
    const v2X = xR - w * 0.27;
    const botHalf = Math.min(w * 0.125, Math.max((s1 + s2) * 0.45, w * 0.085));
    const midTopHalf = Math.min(w * 0.11, Math.max((s1 + s2) * 0.42, w * 0.075));
    const midTopY = xh * 0.96;
    const innerBotY = Math.min(xh * 0.68, Math.max(s1, s2) * 1.15);
    const innerMidY = Math.max(xh * 0.30, xh - Math.max(s1, s2) * 1.15);

    pc.addPolygon([
      [v1X - botHalf, 0, { r: 0.9 }],
      [xL, xh, { r: 1 }],
      [xL + s1, xh, { r: 1 }],
      [v1X, innerBotY, { r: 0.2, trap: { d: 1.2, w: 0.88, bx: 0, by: -1, maxD: innerBotY * 0.65 } }],
      [cx - midTopHalf, midTopY, { r: 0.8 }],
      [cx + midTopHalf, midTopY, { r: 0.8 }],
      [v2X, innerBotY, { r: 0.2, trap: { d: 1.2, w: 0.88, bx: 0, by: -1, maxD: innerBotY * 0.65 } }],
      [xR - s2, xh, { r: 1 }],
      [xR, xh, { r: 1 }],
      [v2X + botHalf, 0, { r: 0.9 }],
      [v2X - botHalf, 0, { r: 0.9 }],
      [cx, innerMidY, { r: 0.2, trap: { d: 1.2, w: 0.88, bx: 0, by: 1, maxD: (midTopY - innerMidY) * 0.65 } }],
      [v1X + botHalf, 0, { r: 0.9 }],
    ]);
    return adv;
  },

  x(pc, m) {
    const w = Math.round(535 * m.widthScale);
    const sb = Math.round(26 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    const xL = sb;
    const xR = sb + w;
    const cx = (xL + xR) * 0.5;
    const xh = m.xh;
    const midY = xh * (0.50 + m.crossbarShift * 0.12);

    const d1 = Math.min(m.D1 * 0.88, w * 0.31);
    const d2 = Math.min(m.D2 * 0.85, w * 0.30);
    const dAvg = (d1 + d2) * 0.5;
    const waistHalfX = Math.max(dAvg * 0.52, w * 0.085);
    const waistHalfY = Math.min(
      xh * 0.26,
      Math.max((xh * 0.5) * (dAvg / Math.max(dAvg * 1.4, w - dAvg)), xh * 0.085)
    );

    pc.addPolygon([
      [xL, 0, { r: 1 }],
      [cx - waistHalfX, midY, { r: 0.25, trap: { d: 1.05, w: 0.8, bx: 1, by: 0 } }],
      [xL + w * 0.02, xh, { r: 1 }],
      [xL + w * 0.02 + d1, xh, { r: 1 }],
      [cx, midY + waistHalfY, { r: 0.25, trap: { d: 1.05, w: 0.8, bx: 0, by: -1 } }],
      [xR - w * 0.02 - d2, xh, { r: 1 }],
      [xR - w * 0.02, xh, { r: 1 }],
      [cx + waistHalfX, midY, { r: 0.25, trap: { d: 1.05, w: 0.8, bx: -1, by: 0 } }],
      [xR, 0, { r: 1 }],
      [xR - d1, 0, { r: 1 }],
      [cx, midY - waistHalfY, { r: 0.25, trap: { d: 1.05, w: 0.8, bx: 0, by: 1 } }],
      [xL + d2, 0, { r: 1 }],
    ]);
    return adv;
  },

  y(pc, m) {
    const w = Math.round(545 * m.widthScale);
    const sb = Math.round(24 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    const xL = sb;
    const xR = sb + w;
    const cx = (xL + xR) * 0.5;
    const xh = m.xh;

    const leftW = Math.min(m.D1 * 0.90, w * 0.305);
    const rightW = Math.min(m.D2 * 0.86, w * 0.295);
    const botHalfW = Math.min(w * 0.21, Math.max((leftW + rightW) * 0.35, w * 0.125));
    const innerApexY = Math.min(xh * 0.68, Math.max(leftW, rightW) * 0.95);
    // Collinear continuation of right leg down to descender
    const rightSlope = ((xR - (cx + botHalfW)) / xh) * 0.88;
    const descShift = Math.abs(m.desc) * rightSlope;

    pc.addPolygon([
      [cx - botHalfW - descShift, m.desc, { r: 1 }],
      [cx - botHalfW, 0, { r: 0.25 }],
      [xL, xh, { r: 1 }],
      [xL + leftW, xh, { r: 1 }],
      [cx, innerApexY, { r: 0.25, trap: { d: 1.25, w: 0.9, bx: 0, by: -1, maxD: innerApexY * 0.68 } }],
      [xR - rightW, xh, { r: 1 }],
      [xR, xh, { r: 1 }],
      [cx + botHalfW - descShift, m.desc, { r: 1 }],
    ]);
    return adv;
  },

  z(pc, m) {
    const w = Math.round(495 * m.widthScale);
    const sb = Math.round(38 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    const xL = sb;
    const xR = sb + w;
    const xh = m.xh;
    const H = Math.min(m.H * 0.92, xh * 0.26);
    const diagW = Math.min(m.D1 * 0.98, w * 0.38);

    pc.addPolygon([
      [xL, 0, { r: 1 }],
      [xL, H * 0.9, { r: 0.6 }],
      [xR - diagW * 1.06, xh - H, { r: 0.25, trap: { d: 1.1, w: 0.85, bx: 0.85, by: 0.5 } }],
      [xL + w * 0.02, xh - H, { r: 1 }],
      [xL + w * 0.02, xh, { r: 1 }],
      [xR, xh, { r: 1 }],
      [xR, xh - H * 0.9, { r: 0.6 }],
      [xL + diagW * 1.06, H, { r: 0.25, trap: { d: 1.1, w: 0.85, bx: -0.85, by: -0.5 } }],
      [xR, H, { r: 1 }],
      [xR, 0, { r: 1 }],
    ]);
    return adv;
  },
});

/**
 * Figures (0-9) — Matched to the bold grotesque numerals in the reference screenshot
 */
Object.assign(GLYPH_BUILDERS, {
  '0'(pc, m) {
    const w = Math.round(585 * m.widthScale);
    const sb = Math.round(42 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    const cx = sb + w * 0.5;
    const cy = m.cap * 0.5;
    const rx = w * 0.5;
    const ry = m.cap * 0.5 + m.ov;
    const V = Math.min(m.V * 0.94, rx * 0.68);
    const H = Math.min(m.H * 0.92, ry * 0.60);

    pc.addSuperellipse(cx, cy, rx, ry, 1);
    const irx = Math.max(22, rx - V);
    const iry = Math.max(26, ry - H);
    if (m.p.slashedZero > 0.5 && irx > 25 && iry > 35) {
      // Slashed 0: two triangular/crescent counters separated by a diagonal bar
      const slashHalf = Math.max(10, H * 0.28);
      pc.addPolygon(
        [
          [cx - irx * 0.85, cy - iry * 0.55 + slashHalf, { r: 0.4 }],
          [cx + irx * 0.55 - slashHalf, cy + iry * 0.85, { r: 0.4 }],
          [cx - irx * 0.75, cy + iry * 0.75, { r: 0.8 }],
        ],
        -1
      );
      pc.addPolygon(
        [
          [cx + irx * 0.85, cy + iry * 0.55 - slashHalf, { r: 0.4 }],
          [cx - irx * 0.55 + slashHalf, cy - iry * 0.85, { r: 0.4 }],
          [cx + irx * 0.75, cy - iry * 0.75, { r: 0.8 }],
        ],
        -1
      );
    } else {
      pc.addSuperellipse(cx, cy, irx, iry, -1);
    }
    return adv;
  },

  '1'(pc, m) {
    const w = Math.round(380 * m.widthScale);
    const sb = Math.round(44 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    const xL = sb + w * 0.06;
    const xR = sb + w * 0.92;
    const cap = m.cap;
    const V = Math.min(m.V * 0.96, (xR - xL) * 0.62);
    const H = Math.min(m.H * 0.92, cap * 0.24);
    const stemL = xR - V;

    pc.addPolygon([
      [stemL, 0, { r: 1 }],
      [stemL, cap - H * 1.05, { r: 0.35, flare: 1, trap: { d: 0.95, w: 0.8, bx: 0.7, by: 0.7 } }],
      [xL, cap - H * 1.32, { r: 0.8 }],
      [xL, cap - H * 0.32, { r: 0.8 }],
      [stemL + V * 0.12, cap, { r: 0.8 }],
      [xR, cap, { r: 1 }],
      [xR, 0, { r: 1, flare: 1 }],
    ]);
    return adv;
  },

  '2'(pc, m) {
    const w = Math.round(575 * m.widthScale);
    const sb = Math.round(40 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    const xL = sb;
    const xR = sb + w;
    const cx = (xL + xR) * 0.5;
    const cap = m.cap;
    const topY = cap + m.ov;
    const V = Math.min(m.V * 0.92, w * 0.37);
    const H = Math.min(m.H * 0.90, cap * 0.22);
    const kOut = m.kappaOut;
    const kIn = m.kappaIn;

    const bowlMidY = cap * 0.68;
    const termOutY = cap * lerp(0.62, 0.54, m.aperture);
    const termInX = xL + V * 0.94;
    const termInY = lerp(termOutY - H * 0.35, termOutY, m.termCut * 0.8);

    pc.addMixedContour([
      { type: 'pt', x: xL, y: 0, r: 1 },
      { type: 'pt', x: xL, y: H * 0.96, r: 0.6 },
      {
        type: 'cubic',
        c1x: xL + w * 0.22,
        c1y: cap * 0.30,
        c2x: xR - V * 0.94,
        c2y: lerp(H, bowlMidY, 0.58),
        x: xR - V * 0.94,
        y: bowlMidY,
      },
      {
        type: 'cubic',
        c1x: xR - V * 0.94,
        c1y: lerp(bowlMidY, topY - H, kIn),
        c2x: lerp(cx, xR - V * 0.94, kIn),
        c2y: topY - H,
        x: cx,
        y: topY - H,
      },
      {
        type: 'cubic',
        c1x: lerp(cx, termInX, kIn),
        c1y: topY - H,
        c2x: termInX,
        c2y: lerp(termInY, topY - H, 0.65),
        x: termInX,
        y: termInY,
      },
      { type: 'pt', x: xL + w * 0.02, y: termOutY, r: 0.75 },
      {
        type: 'cubic',
        c1x: xL + w * 0.02,
        c1y: lerp(termOutY, topY, 0.72),
        c2x: lerp(cx, xL + w * 0.02, kOut),
        c2y: topY,
        x: cx,
        y: topY,
      },
      {
        type: 'cubic',
        c1x: lerp(cx, xR, kOut),
        c1y: topY,
        c2x: xR,
        c2y: lerp(bowlMidY, topY, kOut),
        x: xR,
        y: bowlMidY,
      },
      {
        type: 'cubic',
        c1x: xR,
        c1y: cap * 0.42,
        c2x: xL + V * 1.35,
        c2y: H * 1.45,
        x: xL + V * 1.12,
        y: H,
      },
      { type: 'pt', x: xL + V * 1.12, y: H, r: 0.25, trap: { d: 1.15, w: 0.85, bx: -0.85, by: -0.5 } },
      { type: 'pt', x: xR, y: H, r: 1 },
      { type: 'pt', x: xR, y: 0, r: 1 }],
    );
    return adv;
  },

  '3'(pc, m) {
    const w = Math.round(575 * m.widthScale);
    const sb = Math.round(40 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    const xL = sb;
    const xR = sb + w;
    const cx = (xL + xR) * 0.5;
    const cap = m.cap;
    const topY = cap + m.ov;
    const botY = -m.ov;
    const waistY = clamp(cap * (0.52 + m.crossbarShift * 0.14), cap * 0.36, cap * 0.66);

    const V = Math.min(m.V * 0.90, w * 0.36);
    const H = Math.min(m.H * 0.84, cap * 0.195);
    const kOut = m.kappaOut;
    const kIn = m.kappaIn;

    const upR = xR - w * 0.03;
    const loR = xR;
    const upMidY = (waistY + topY) * 0.5;
    const loMidY = (botY + waistY) * 0.5;

    const topTermOutY = topY - (topY - waistY) * lerp(0.55, 0.68, m.aperture);
    const topTermInX = xL + w * 0.03 + V * 0.92;
    const topTermInY = lerp(topTermOutY - H * 0.3, topTermOutY, m.termCut * 0.8);

    const botTermOutY = botY + (waistY - botY) * lerp(0.55, 0.68, m.aperture);
    const botTermInX = xL + V * 0.92;
    const botTermInY = lerp(botTermOutY + H * 0.3, botTermOutY, m.termCut * 0.8);

    const waistL = cx - w * 0.08;
    const waistPinchR = cx + w * 0.20;
    const trapIn = m.inkTraps > 0.01 ? V * 0.34 * m.inkTraps * m.trapDepth : 0;

    pc.addMixedContour([
      { type: 'pt', x: xL + w * 0.03, y: topTermOutY, r: 0.75 },
      {
        type: 'cubic',
        c1x: xL + w * 0.03,
        c1y: lerp(topTermOutY, topY, 0.72),
        c2x: lerp(cx, xL + w * 0.03, kOut),
        c2y: topY,
        x: cx,
        y: topY,
      },
      {
        type: 'cubic',
        c1x: lerp(cx, upR, kOut),
        c1y: topY,
        c2x: upR,
        c2y: lerp(upMidY, topY, kOut),
        x: upR,
        y: upMidY,
      },
      {
        type: 'cubic',
        c1x: upR,
        c1y: lerp(upMidY, waistY, kOut),
        c2x: lerp(waistPinchR, upR, 0.55),
        c2y: waistY + H * 0.08,
        x: waistPinchR,
        y: waistY + H * 0.06,
      },
      ...(trapIn > 1 ? [{ type: 'pt', x: waistPinchR - trapIn, y: waistY, r: 0 }] : []),
      {
        type: 'cubic',
        c1x: lerp(waistPinchR, loR, 0.55),
        c1y: waistY - H * 0.08,
        c2x: loR,
        c2y: lerp(loMidY, waistY, kOut),
        x: loR,
        y: loMidY,
      },
      {
        type: 'cubic',
        c1x: loR,
        c1y: lerp(loMidY, botY, kOut),
        c2x: lerp(cx, loR, kOut),
        c2y: botY,
        x: cx,
        y: botY,
      },
      {
        type: 'cubic',
        c1x: lerp(cx, xL, kOut),
        c1y: botY,
        c2x: xL,
        c2y: lerp(botTermOutY, botY, 0.72),
        x: xL,
        y: botTermOutY,
      },
      { type: 'pt', x: botTermInX, y: botTermInY, r: 0.75 },
      {
        type: 'cubic',
        c1x: botTermInX,
        c1y: lerp(botTermInY, botY + H, 0.65),
        c2x: lerp(cx, botTermInX, kIn),
        c2y: botY + H,
        x: cx,
        y: botY + H,
      },
      {
        type: 'cubic',
        c1x: lerp(cx, loR - V, kIn),
        c1y: botY + H,
        c2x: loR - V,
        c2y: lerp(loMidY, botY + H, kIn),
        x: loR - V,
        y: loMidY,
      },
      {
        type: 'cubic',
        c1x: loR - V,
        c1y: lerp(loMidY, waistY - H * 0.45, kIn),
        c2x: lerp(waistL, loR - V, 0.55),
        c2y: waistY - H * 0.45,
        x: waistL,
        y: waistY - H * 0.45,
      },
      { type: 'pt', x: waistL, y: waistY + H * 0.45, r: 0.75 },
      {
        type: 'cubic',
        c1x: lerp(waistL, upR - V, 0.55),
        c1y: waistY + H * 0.45,
        c2x: upR - V,
        c2y: lerp(upMidY, waistY + H * 0.45, kIn),
        x: upR - V,
        y: upMidY,
      },
      {
        type: 'cubic',
        c1x: upR - V,
        c1y: lerp(upMidY, topY - H, kIn),
        c2x: lerp(cx, upR - V, kIn),
        c2y: topY - H,
        x: cx,
        y: topY - H,
      },
      {
        type: 'cubic',
        c1x: lerp(cx, topTermInX, kIn),
        c1y: topY - H,
        c2x: topTermInX,
        c2y: lerp(topTermInY, topY - H, 0.65),
        x: topTermInX,
        y: topTermInY,
      },
    ]);
    return adv;
  },

  '4'(pc, m) {
    const w = Math.round(610 * m.widthScale);
    const sb = Math.round(32 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    const xL = sb;
    const xR = sb + w;
    const cap = m.cap;
    const V = Math.min(m.V * 0.92, w * 0.34);
    const H = Math.min(m.H * 0.90, cap * 0.21);
    const diagW = Math.min(m.D2 * 0.95, w * 0.32);

    const stemR = xR - w * 0.16;
    const stemL = stemR - V;
    const barBotY = clamp(cap * (0.25 + m.crossbarShift * 0.16), H * 0.6, cap * 0.46);
    const barTopY = barBotY + H;
    const topLeftX = Math.max(xL + w * 0.22, stemL - diagW * 0.55);

    // Outer CW contour
    pc.addPolygon([
      [stemL, 0, { r: 1 }],
      [stemL, barBotY, { r: 0.4, trap: { d: 0.8, w: 0.7, bx: 0.7, by: 0.7 } }],
      [xL, barBotY, { r: 1 }],
      [xL, barBotY + H * 0.92, { r: 0.6 }],
      [topLeftX, cap, { r: 1 }],
      [stemR, cap, { r: 1 }],
      [stemR, barTopY, { r: 0.4, trap: { d: 0.8, w: 0.7, bx: -0.7, by: -0.7 } }],
      [xR, barTopY, { r: 1 }],
      [xR, barBotY, { r: 1 }],
      [stemR, barBotY, { r: 0.4, trap: { d: 0.8, w: 0.7, bx: -0.7, by: 0.7 } }],
      [stemR, 0, { r: 1, flare: 1 }],
    ]);

    // Inner CCW triangle counter
    const cLeftX = xL + diagW * 1.05;
    const cTopY = Math.max(barTopY + 36, cap - diagW * 1.15);
    if (stemL - cLeftX > 14 && cTopY - barTopY > 18) {
      pc.addPolygon(
        [
          [cLeftX, barTopY, { r: 0.3, trap: { d: 0.85, w: 0.75, bx: -0.7, by: -0.7 } }],
          [stemL, barTopY, { r: 0.3, trap: { d: 0.8, w: 0.7, bx: 0.7, by: -0.7 } }],
          [stemL, cTopY, { r: 0.25, trap: { d: 1.15, w: 0.85, bx: 0.3, by: 0.95 } }],
        ],
        -1
      );
    }
    return adv;
  },

  '5'(pc, m) {
    const w = Math.round(575 * m.widthScale);
    const sb = Math.round(40 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    const xL = sb;
    const xR = sb + w;
    const cx = (xL + xR) * 0.5;
    const cap = m.cap;
    const botY = -m.ov;

    const V = Math.min(m.V * 0.92, w * 0.37);
    const H = Math.min(m.H * 0.86, cap * 0.205);
    const kOut = m.kappaOut;
    const kIn = m.kappaIn;

    const bellyTopY = clamp(cap * (0.58 + m.crossbarShift * 0.14), cap * 0.42, cap * 0.72);
    const bellyMidY = (bellyTopY + botY) * 0.5;
    const botTermOutY = botY + (bellyTopY - botY) * lerp(0.45, 0.60, m.aperture);
    const botTermInX = xL + V * 0.92;
    const botTermInY = lerp(botTermOutY + H * 0.32, botTermOutY, m.termCut * 0.8);

    const dropL = xL + w * 0.04;
    const dropR = dropL + V * 0.92;
    const inBellyTop = bellyTopY - H * 0.92;

    pc.addMixedContour([
      { type: 'pt', x: dropL, y: bellyTopY - H * 0.65, r: 0.8 },
      { type: 'pt', x: dropL + w * 0.02, y: cap, r: 1 },
      { type: 'pt', x: xR - w * 0.04, y: cap, r: 1 }],
    );
    // Replace with single unified contour of '5'
    pc.contours.pop();

    pc.addMixedContour([
      { type: 'pt', x: dropL, y: bellyTopY - H * 0.55, r: 0.75 },
      { type: 'pt', x: dropL + w * 0.02, y: cap, r: 1 },
      { type: 'pt', x: xR - w * 0.03, y: cap, r: 1 },
      { type: 'pt', x: xR - w * 0.03, y: cap - H, r: 1 },
      { type: 'pt', x: dropR, y: cap - H, r: 0.35, trap: { d: 0.85, w: 0.75, bx: -0.7, by: 0.7 } },
      {
        type: 'pt',
        x: dropR,
        y: bellyTopY - H * 0.15,
        r: 0.3,
        trap: { d: 0.95, w: 0.8, bx: -0.7, by: -0.7 },
      },
      {
        type: 'cubic',
        c1x: lerp(dropR, cx, 0.35),
        c1y: bellyTopY,
        c2x: lerp(cx, dropR, 0.25),
        c2y: bellyTopY,
        x: cx + w * 0.04,
        y: bellyTopY,
      },
      {
        type: 'cubic',
        c1x: lerp(cx + w * 0.04, xR, kOut),
        c1y: bellyTopY,
        c2x: xR,
        c2y: lerp(bellyMidY, bellyTopY, kOut),
        x: xR,
        y: bellyMidY,
      },
      {
        type: 'cubic',
        c1x: xR,
        c1y: lerp(bellyMidY, botY, kOut),
        c2x: lerp(cx, xR, kOut),
        c2y: botY,
        x: cx,
        y: botY,
      },
      {
        type: 'cubic',
        c1x: lerp(cx, xL, kOut),
        c1y: botY,
        c2x: xL,
        c2y: lerp(botTermOutY, botY, 0.72),
        x: xL,
        y: botTermOutY,
      },
      { type: 'pt', x: botTermInX, y: botTermInY, r: 0.75 },
      {
        type: 'cubic',
        c1x: botTermInX,
        c1y: lerp(botTermInY, botY + H, 0.65),
        c2x: lerp(cx, botTermInX, kIn),
        c2y: botY + H,
        x: cx,
        y: botY + H,
      },
      {
        type: 'cubic',
        c1x: lerp(cx, xR - V, kIn),
        c1y: botY + H,
        c2x: xR - V,
        c2y: lerp(bellyMidY, botY + H, kIn),
        x: xR - V,
        y: bellyMidY,
      },
      {
        type: 'cubic',
        c1x: xR - V,
        c1y: lerp(bellyMidY, inBellyTop, kIn),
        c2x: lerp(cx, xR - V, kIn),
        c2y: inBellyTop,
        x: cx,
        y: inBellyTop,
      },
      {
        type: 'cubic',
        c1x: lerp(cx, dropR, 0.45),
        c1y: inBellyTop,
        c2x: dropR,
        c2y: inBellyTop - H * 0.15,
        x: dropR - V * 0.15,
        y: bellyTopY - H * 0.55,
      },
    ]);
    return adv;
  },

  '6'(pc, m) {
    return buildSixOrNine(pc, m, false);
  },

  '7'(pc, m) {
    const w = Math.round(545 * m.widthScale);
    const sb = Math.round(36 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    const xL = sb;
    const xR = sb + w;
    const cap = m.cap;
    const H = Math.min(m.H * 0.94, cap * 0.25);
    const diagW = Math.min(m.D1 * 1.04, w * 0.40);
    const botL = xL + w * 0.14;

    pc.addPolygon([
      [botL, 0, { r: 1 }],
      [xR - diagW * 1.04, cap - H, { r: 0.25, trap: { d: 1.2, w: 0.88, bx: 0.85, by: 0.5 } }],
      [xL, cap - H, { r: 1 }],
      [xL, cap, { r: 1 }],
      [xR, cap, { r: 1 }],
      [xR, cap - H * 0.85, { r: 0.6 }],
      [botL + diagW * 1.06, 0, { r: 1 }],
    ]);
    return adv;
  },

  '8'(pc, m) {
    const w = Math.round(595 * m.widthScale);
    const sb = Math.round(40 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    const xL = sb;
    const xR = sb + w;
    const cx = (xL + xR) * 0.5;
    const cap = m.cap;
    const topY = cap + m.ov;
    const botY = -m.ov;
    const waistY = clamp(cap * (0.52 + m.crossbarShift * 0.14), cap * 0.36, cap * 0.66);

    const V = Math.min(m.V * 0.90, w * 0.36);
    const H = Math.min(m.H * 0.84, cap * 0.195);
    const kOut = m.kappaOut;

    const upRx = w * 0.465;
    const loRx = w * 0.50;
    const upMidY = (waistY + topY) * 0.5;
    const loMidY = (botY + waistY) * 0.5;
    const pinchRx = w * 0.34;
    const trapIn = m.inkTraps > 0.01 ? V * 0.28 * m.inkTraps * m.trapDepth : 0;

    // Outer figure-8 CW contour
    pc.addMixedContour([
      { type: 'pt', x: cx - upRx, y: upMidY, r: 0 },
      {
        type: 'cubic',
        c1x: cx - upRx,
        c1y: lerp(upMidY, topY, kOut),
        c2x: cx - upRx * kOut,
        c2y: topY,
        x: cx,
        y: topY,
      },
      {
        type: 'cubic',
        c1x: cx + upRx * kOut,
        c1y: topY,
        c2x: cx + upRx,
        c2y: lerp(upMidY, topY, kOut),
        x: cx + upRx,
        y: upMidY,
      },
      {
        type: 'cubic',
        c1x: cx + upRx,
        c1y: lerp(upMidY, waistY, 0.72),
        c2x: cx + pinchRx,
        c2y: waistY + H * 0.12,
        x: cx + pinchRx,
        y: waistY + H * 0.06,
      },
      ...(trapIn > 1 ? [{ type: 'pt', x: cx + pinchRx - trapIn, y: waistY, r: 0 }] : []),
      {
        type: 'cubic',
        c1x: cx + pinchRx,
        c1y: waistY - H * 0.12,
        c2x: cx + loRx,
        c2y: lerp(loMidY, waistY, 0.72),
        x: cx + loRx,
        y: loMidY,
      },
      {
        type: 'cubic',
        c1x: cx + loRx,
        c1y: lerp(loMidY, botY, kOut),
        c2x: cx + loRx * kOut,
        c2y: botY,
        x: cx,
        y: botY,
      },
      {
        type: 'cubic',
        c1x: cx - loRx * kOut,
        c1y: botY,
        c2x: cx - loRx,
        c2y: lerp(loMidY, botY, kOut),
        x: cx - loRx,
        y: loMidY,
      },
      {
        type: 'cubic',
        c1x: cx - loRx,
        c1y: lerp(loMidY, waistY, 0.72),
        c2x: cx - pinchRx,
        c2y: waistY - H * 0.12,
        x: cx - pinchRx,
        y: waistY - H * 0.06,
      },
      ...(trapIn > 1 ? [{ type: 'pt', x: cx - pinchRx + trapIn, y: waistY, r: 0 }] : []),
      {
        type: 'cubic',
        c1x: cx - pinchRx,
        c1y: waistY + H * 0.12,
        c2x: cx - upRx,
        c2y: lerp(upMidY, waistY, 0.72),
        x: cx - upRx,
        y: upMidY,
      },
    ]);

    // Upper and Lower CCW oval counters
    const upInRx = Math.max(18, upRx - V * 0.94);
    const upInRy = Math.max(15, (topY - waistY) * 0.5 - H * 0.74);
    const loInRx = Math.max(20, loRx - V * 0.94);
    const loInRy = Math.max(16, (waistY - botY) * 0.5 - H * 0.74);
    pc.addSuperellipse(cx, upMidY - H * 0.08, upInRx, upInRy, -1);
    pc.addSuperellipse(cx, loMidY + H * 0.08, loInRx, loInRy, -1);
    return adv;
  },

  '9'(pc, m) {
    return buildSixOrNine(pc, m, true);
  },
});

/**
 * Shared 180-degree symmetric builder for '6' and '9'
 */
function buildSixOrNine(pc, m, isNine) {
  const w = Math.round(590 * m.widthScale);
  const sb = Math.round(40 * clamp(m.widthScale, 0.75, 1.15));
  const adv = w + sb * 2;
  const xL = sb;
  const xR = sb + w;
  const cx = (xL + xR) * 0.5;
  const cap = m.cap;
  const topY = cap + m.ov;
  const botY = -m.ov;

  const V = Math.min(m.V * 0.92, w * 0.37);
  const H = Math.min(m.H * 0.86, cap * 0.205);
  const kOut = m.kappaOut;
  const kIn = m.kappaIn;

  // Build '6' in canonical coordinates, then rotate 180° around (adv/2, cap/2) for '9'
  const bowlTopY = cap * 0.62;
  const bowlMidY = (bowlTopY + botY) * 0.5;
  const topTermX = xR - w * 0.04;
  const topTermOutY = cap * lerp(0.74, 0.66, m.aperture);
  const topTermInX = topTermX - V * 0.94;
  const topTermInY = lerp(topTermOutY - H * 0.32, topTermOutY, m.termCut * 0.8);
  const notchY = bowlTopY - lerp(cap * 0.06, cap * 0.16, m.inkTraps * m.trapDepth);

  const outer6 = [
    { type: 'pt', x: topTermX, y: topTermOutY, r: 0.75 },
    {
      type: 'cubic',
      c1x: topTermX,
      c1y: lerp(topTermOutY, topY, 0.70),
      c2x: lerp(cx, topTermX, kOut),
      c2y: topY,
      x: cx + w * 0.02,
      y: topY,
    },
    {
      type: 'cubic',
      c1x: lerp(cx, xL, kOut),
      c1y: topY,
      c2x: xL,
      c2y: lerp(cap * 0.48, topY, kOut),
      x: xL,
      y: cap * 0.46,
    },
    {
      type: 'cubic',
      c1x: xL,
      c1y: lerp(cap * 0.46, botY, kOut),
      c2x: lerp(cx, xL, kOut),
      c2y: botY,
      x: cx,
      y: botY,
    },
    {
      type: 'cubic',
      c1x: lerp(cx, xR, kOut),
      c1y: botY,
      c2x: xR,
      c2y: lerp(bowlMidY, botY, kOut),
      x: xR,
      y: bowlMidY,
    },
    {
      type: 'cubic',
      c1x: xR,
      c1y: lerp(bowlMidY, bowlTopY, kOut),
      c2x: lerp(cx + w * 0.04, xR, kOut),
      c2y: bowlTopY,
      x: cx + w * 0.04,
      y: bowlTopY,
    },
    {
      type: 'cubic',
      c1x: lerp(cx + w * 0.04, xL + V, 0.55),
      c1y: bowlTopY,
      c2x: xL + V * 1.15,
      c2y: lerp(notchY, bowlTopY, 0.65),
      x: xL + V * 0.98,
      y: notchY,
    },
    ...(m.inkTraps > 0.02
      ? [
          {
            type: 'pt',
            x: xL + V * (0.98 - 0.26 * m.inkTraps * m.trapDepth),
            y: notchY - V * 0.14 * m.inkTraps * m.trapDepth,
            r: 0,
          },
        ]
      : []),
    {
      type: 'cubic',
      c1x: xL + V * 0.98,
      c1y: lerp(notchY, topY - H, kIn),
      c2x: lerp(cx + w * 0.02, xL + V * 0.98, kIn),
      c2y: topY - H,
      x: cx + w * 0.02,
      y: topY - H,
    },
    {
      type: 'cubic',
      c1x: lerp(cx + w * 0.02, topTermInX, kIn),
      c1y: topY - H,
      c2x: topTermInX,
      c2y: lerp(topTermInY, topY - H, 0.65),
      x: topTermInX,
      y: topTermInY,
    },
  ];

  const inRx = Math.max(18, (w - V * 1.92) * 0.5);
  const inRy = Math.max(16, (bowlTopY - botY) * 0.5 - H * 0.88);

  if (!isNine) {
    pc.addMixedContour(outer6);
    pc.addSuperellipse(cx, bowlMidY, inRx, inRy, -1);
  } else {
    const rotX = (x) => adv - x;
    const rotY = (y) => cap - y;
    const outer9 = outer6.map((nd) =>
      nd.type === 'cubic'
        ? {
            ...nd,
            c1x: rotX(nd.c1x),
            c1y: rotY(nd.c1y),
            c2x: rotX(nd.c2x),
            c2y: rotY(nd.c2y),
            x: rotX(nd.x),
            y: rotY(nd.y),
          }
        : { ...nd, x: rotX(nd.x), y: rotY(nd.y) }
    );
    pc.addMixedContour(outer9);
    pc.addSuperellipse(rotX(cx), rotY(bowlMidY), inRx, inRy, -1);
  }
  return adv;
}

/**
 * Symbols, Punctuation & Special Ligatures
 */
Object.assign(GLYPH_BUILDERS, {
  ' '(pc, m) {
    return Math.round(280 * clamp(m.widthScale, 0.7, 1.3));
  },

  '.'(pc, m) {
    const r = Math.max(24, m.V * 0.56);
    const sb = Math.round(45 * clamp(m.widthScale, 0.75, 1.15));
    const cx = sb + r;
    pc.addSuperellipse(cx, r * 0.92, r, r, 1);
    return Math.round((sb + r) * 2);
  },

  ','(pc, m) {
    const r = Math.max(24, m.V * 0.54);
    const sb = Math.round(45 * clamp(m.widthScale, 0.75, 1.15));
    const cx = sb + r;
    pc.addPolygon([
      [cx - r * 0.85, 0, { r: 0.8 }],
      [cx - r * 0.85, r * 1.85, { r: 0.8 }],
      [cx + r * 0.85, r * 1.85, { r: 0.8 }],
      [cx + r * 0.85, r * 0.25, { r: 0.4 }],
      [cx - r * 0.15, -r * 1.45, { r: 0.6 }],
      [cx - r * 0.85, -r * 1.45, { r: 0.6 }],
      [cx - r * 0.15, 0, { r: 0.3 }],
    ]);
    return Math.round((sb + r) * 2);
  },

  ':'(pc, m) {
    const r = Math.max(24, m.V * 0.54);
    const sb = Math.round(48 * clamp(m.widthScale, 0.75, 1.15));
    const cx = sb + r;
    pc.addSuperellipse(cx, r * 0.92, r, r, 1);
    pc.addSuperellipse(cx, m.xh - r * 0.92, r, r, 1);
    return Math.round((sb + r) * 2);
  },

  ';'(pc, m) {
    const r = Math.max(24, m.V * 0.54);
    const sb = Math.round(48 * clamp(m.widthScale, 0.75, 1.15));
    const cx = sb + r;
    GLYPH_BUILDERS[','](pc, m);
    pc.addSuperellipse(cx, m.xh - r * 0.92, r, r, 1);
    return Math.round((sb + r) * 2);
  },

  '!'(pc, m) {
    const r = Math.max(24, m.V * 0.56);
    const sb = Math.round(52 * clamp(m.widthScale, 0.75, 1.15));
    const cx = sb + r;
    const botBarY = Math.max(r * 2.45, m.cap * 0.28);
    pc.addSuperellipse(cx, r * 0.92, r, r, 1);
    pc.addPolygon([
      [cx - r * 0.78, botBarY, { r: 0.8 }],
      [cx - r * 0.96, m.cap, { r: 1 }],
      [cx + r * 0.96, m.cap, { r: 1 }],
      [cx + r * 0.78, botBarY, { r: 0.8 }],
    ]);
    return Math.round((sb + r) * 2);
  },

  '?'(pc, m) {
    const w = Math.round(515 * m.widthScale);
    const sb = Math.round(38 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    const xL = sb;
    const xR = sb + w;
    const cx = (xL + xR) * 0.5;
    const cap = m.cap;
    const topY = cap + m.ov;
    const V = Math.min(m.V * 0.92, w * 0.38);
    const H = Math.min(m.H * 0.90, cap * 0.22);
    const rDot = Math.max(24, V * 0.54);
    const stemBotY = Math.max(rDot * 2.35, cap * 0.27);
    const bowlMidY = cap * 0.70;
    const termOutY = cap * 0.62;
    const kOut = m.kappaOut;
    const kIn = m.kappaIn;

    pc.addSuperellipse(cx, rDot * 0.92, rDot, rDot, 1);
    pc.addMixedContour([
      { type: 'pt', x: cx - V * 0.48, y: stemBotY, r: 0.8 },
      { type: 'pt', x: cx - V * 0.48, y: cap * 0.42, r: 0.3 },
      {
        type: 'cubic',
        c1x: cx - V * 0.48,
        c1y: cap * 0.52,
        c2x: xR - V * 0.94,
        c2y: cap * 0.56,
        x: xR - V * 0.94,
        y: bowlMidY,
      },
      {
        type: 'cubic',
        c1x: xR - V * 0.94,
        c1y: lerp(bowlMidY, topY - H, kIn),
        c2x: lerp(cx, xR - V * 0.94, kIn),
        c2y: topY - H,
        x: cx,
        y: topY - H,
      },
      {
        type: 'cubic',
        c1x: lerp(cx, xL + V * 0.92, kIn),
        c1y: topY - H,
        c2x: xL + V * 0.92,
        c2y: lerp(termOutY, topY - H, 0.65),
        x: xL + V * 0.92,
        y: termOutY,
      },
      { type: 'pt', x: xL, y: termOutY, r: 0.8 },
      {
        type: 'cubic',
        c1x: xL,
        c1y: lerp(termOutY, topY, 0.72),
        c2x: lerp(cx, xL, kOut),
        c2y: topY,
        x: cx,
        y: topY,
      },
      {
        type: 'cubic',
        c1x: lerp(cx, xR, kOut),
        c1y: topY,
        c2x: xR,
        c2y: lerp(bowlMidY, topY, kOut),
        x: xR,
        y: bowlMidY,
      },
      {
        type: 'cubic',
        c1x: xR,
        c1y: cap * 0.50,
        c2x: cx + V * 0.48,
        c2y: cap * 0.46,
        x: cx + V * 0.48,
        y: cap * 0.36,
      },
      { type: 'pt', x: cx + V * 0.48, y: stemBotY, r: 0.8 },
    ]);
    return adv;
  },

  '-'(pc, m) {
    const w = Math.round(350 * m.widthScale);
    const sb = Math.round(44 * clamp(m.widthScale, 0.75, 1.15));
    const H = Math.min(m.H * 0.95, m.xh * 0.32);
    const cy = m.xh * 0.52;
    pc.addPolygon([
      [sb, cy - H * 0.5, { r: 1 }],
      [sb, cy + H * 0.5, { r: 1 }],
      [sb + w, cy + H * 0.5, { r: 1 }],
      [sb + w, cy - H * 0.5, { r: 1 }],
    ]);
    return w + sb * 2;
  },

  '–'(pc, m) {
    const w = Math.round(520 * m.widthScale);
    const sb = Math.round(40 * clamp(m.widthScale, 0.75, 1.15));
    const H = Math.min(m.H * 0.90, m.xh * 0.30);
    const cy = m.xh * 0.52;
    pc.addPolygon([
      [sb, cy - H * 0.5, { r: 1 }],
      [sb, cy + H * 0.5, { r: 1 }],
      [sb + w, cy + H * 0.5, { r: 1 }],
      [sb + w, cy - H * 0.5, { r: 1 }],
    ]);
    return w + sb * 2;
  },

  '—'(pc, m) {
    const w = Math.round(780 * m.widthScale);
    const sb = Math.round(32 * clamp(m.widthScale, 0.75, 1.15));
    const H = Math.min(m.H * 0.90, m.xh * 0.30);
    const cy = m.xh * 0.52;
    pc.addPolygon([
      [sb, cy - H * 0.5, { r: 1 }],
      [sb, cy + H * 0.5, { r: 1 }],
      [sb + w, cy + H * 0.5, { r: 1 }],
      [sb + w, cy - H * 0.5, { r: 1 }],
    ]);
    return w + sb * 2;
  },

  '+'(pc, m) {
    const w = Math.round(520 * m.widthScale);
    const sb = Math.round(42 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    const cx = adv * 0.5;
    const cy = m.cap * 0.46;
    const arm = w * 0.5;
    const V = Math.min(m.V * 0.84, w * 0.34);
    const H = Math.min(m.H * 0.84, w * 0.34);

    pc.addPolygon([
      [cx - V * 0.5, cy - arm, { r: 1 }],
      [cx - V * 0.5, cy - H * 0.5, { r: 0.35, trap: { d: 0.75, w: 0.65, bx: 0.7, by: 0.7 } }],
      [cx - arm, cy - H * 0.5, { r: 1 }],
      [cx - arm, cy + H * 0.5, { r: 1 }],
      [cx - V * 0.5, cy + H * 0.5, { r: 0.35, trap: { d: 0.75, w: 0.65, bx: 0.7, by: -0.7 } }],
      [cx - V * 0.5, cy + arm, { r: 1 }],
      [cx + V * 0.5, cy + arm, { r: 1 }],
      [cx + V * 0.5, cy + H * 0.5, { r: 0.35, trap: { d: 0.75, w: 0.65, bx: -0.7, by: -0.7 } }],
      [cx + arm, cy + H * 0.5, { r: 1 }],
      [cx + arm, cy - H * 0.5, { r: 1 }],
      [cx + V * 0.5, cy - H * 0.5, { r: 0.35, trap: { d: 0.75, w: 0.65, bx: -0.7, by: 0.7 } }],
      [cx + V * 0.5, cy - arm, { r: 1 }],
    ]);
    return adv;
  },

  '='(pc, m) {
    const w = Math.round(520 * m.widthScale);
    const sb = Math.round(42 * clamp(m.widthScale, 0.75, 1.15));
    const H = Math.min(m.H * 0.82, m.xh * 0.25);
    const cy = m.cap * 0.46;
    const gap = Math.max(H * 0.65, 58);

    pc.addPolygon([
      [sb, cy + gap * 0.5, { r: 1 }],
      [sb, cy + gap * 0.5 + H, { r: 1 }],
      [sb + w, cy + gap * 0.5 + H, { r: 1 }],
      [sb + w, cy + gap * 0.5, { r: 1 }],
    ]);
    pc.addPolygon([
      [sb, cy - gap * 0.5 - H, { r: 1 }],
      [sb, cy - gap * 0.5, { r: 1 }],
      [sb + w, cy - gap * 0.5, { r: 1 }],
      [sb + w, cy - gap * 0.5 - H, { r: 1 }],
    ]);
    return w + sb * 2;
  },

  '/'(pc, m) {
    const w = Math.round(380 * m.widthScale);
    const sb = Math.round(22 * clamp(m.widthScale, 0.75, 1.15));
    const sw = Math.min(m.D2 * 0.88, w * 0.45);
    pc.addPolygon([
      [sb, -m.cap * 0.08, { r: 0.8 }],
      [sb + w - sw, m.cap * 1.04, { r: 0.8 }],
      [sb + w, m.cap * 1.04, { r: 0.8 }],
      [sb + sw, -m.cap * 0.08, { r: 0.8 }],
    ]);
    return w + sb * 2;
  },

  '\\'(pc, m) {
    const w = Math.round(380 * m.widthScale);
    const sb = Math.round(22 * clamp(m.widthScale, 0.75, 1.15));
    const sw = Math.min(m.D1 * 0.88, w * 0.45);
    pc.addPolygon([
      [sb + w - sw, -m.cap * 0.08, { r: 0.8 }],
      [sb, m.cap * 1.04, { r: 0.8 }],
      [sb + sw, m.cap * 1.04, { r: 0.8 }],
      [sb + w, -m.cap * 0.08, { r: 0.8 }],
    ]);
    return w + sb * 2;
  },

  '('(pc, m) {
    const w = Math.round(290 * m.widthScale);
    const sb = Math.round(38 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    const xL = sb;
    const xR = sb + w;
    const topY = m.asc;
    const botY = m.desc * 0.75;
    const midY = (topY + botY) * 0.5;
    const V = Math.min(m.V * 0.82, w * 0.54);
    const H = Math.min(m.H * 0.72, V * 0.75);
    const k = m.kappaOut;

    pc.addMixedContour([
      { type: 'pt', x: xR - H * 0.4, y: topY, r: 0.7 },
      { type: 'pt', x: xR, y: topY - H * 0.5, r: 0.7 },
      {
        type: 'cubic',
        c1x: lerp(xL + V, xR, 0.25),
        c1y: lerp(midY, topY, k),
        c2x: xL + V,
        c2y: lerp(midY, topY, 0.35),
        x: xL + V,
        y: midY,
      },
      {
        type: 'cubic',
        c1x: xL + V,
        c1y: lerp(midY, botY, 0.35),
        c2x: lerp(xL + V, xR, 0.25),
        c2y: lerp(midY, botY, k),
        x: xR,
        y: botY + H * 0.5,
      },
      { type: 'pt', x: xR - H * 0.4, y: botY, r: 0.7 },
      {
        type: 'cubic',
        c1x: lerp(xL, xR, 0.22),
        c1y: lerp(midY, botY, k),
        c2x: xL,
        c2y: lerp(midY, botY, 0.38),
        x: xL,
        y: midY,
      },
      {
        type: 'cubic',
        c1x: xL,
        c1y: lerp(midY, topY, 0.38),
        c2x: lerp(xL, xR, 0.22),
        c2y: lerp(midY, topY, k),
        x: xR - H * 0.4,
        y: topY,
      },
    ]);
    return adv;
  },

  ')'(pc, m) {
    const tmp = new PathCompiler(m);
    const adv = GLYPH_BUILDERS['('](tmp, m);
    for (const c of tmp.contours) {
      const mirrored = c.map((seg) => {
        if (seg.cmd === 'M' || seg.cmd === 'L') return { ...seg, x: adv - seg.x };
        if (seg.cmd === 'C') {
          return {
            ...seg,
            c1x: adv - seg.c1x,
            c2x: adv - seg.c2x,
            x: adv - seg.x,
          };
        }
        return seg;
      });
      pc.contours.push(mirrored);
    }
    return adv;
  },

  '['(pc, m) {
    const w = Math.round(285 * m.widthScale);
    const sb = Math.round(44 * clamp(m.widthScale, 0.75, 1.15));
    const xL = sb;
    const xR = sb + w;
    const topY = m.asc;
    const botY = m.desc * 0.75;
    const V = Math.min(m.V * 0.82, w * 0.52);
    const H = Math.min(m.H * 0.82, (topY - botY) * 0.18);

    pc.addPolygon([
      [xL, botY, { r: 1 }],
      [xL, topY, { r: 1 }],
      [xR, topY, { r: 1 }],
      [xR, topY - H, { r: 1 }],
      [xL + V, topY - H, { r: 0.4, trap: { d: 0.7, w: 0.65, bx: -0.7, by: 0.7 } }],
      [xL + V, botY + H, { r: 0.4, trap: { d: 0.7, w: 0.65, bx: -0.7, by: -0.7 } }],
      [xR, botY + H, { r: 1 }],
      [xR, botY, { r: 1 }],
    ]);
    return w + sb * 2;
  },

  ']'(pc, m) {
    const w = Math.round(285 * m.widthScale);
    const sb = Math.round(44 * clamp(m.widthScale, 0.75, 1.15));
    const xL = sb;
    const xR = sb + w;
    const topY = m.asc;
    const botY = m.desc * 0.75;
    const V = Math.min(m.V * 0.82, w * 0.52);
    const H = Math.min(m.H * 0.82, (topY - botY) * 0.18);

    pc.addPolygon([
      [xL, botY, { r: 1 }],
      [xL, botY + H, { r: 1 }],
      [xR - V, botY + H, { r: 0.4, trap: { d: 0.7, w: 0.65, bx: 0.7, by: -0.7 } }],
      [xR - V, topY - H, { r: 0.4, trap: { d: 0.7, w: 0.65, bx: 0.7, by: 0.7 } }],
      [xL, topY - H, { r: 1 }],
      [xL, topY, { r: 1 }],
      [xR, topY, { r: 1 }],
      [xR, botY, { r: 1 }],
    ]);
    return w + sb * 2;
  },

  "'"(pc, m) {
    const r = Math.max(22, m.V * 0.48);
    const sb = Math.round(42 * clamp(m.widthScale, 0.75, 1.15));
    const cx = sb + r;
    pc.addPolygon([
      [cx - r * 0.65, m.cap - r * 2.5, { r: 0.8 }],
      [cx - r * 0.88, m.cap, { r: 0.9 }],
      [cx + r * 0.88, m.cap, { r: 0.9 }],
      [cx + r * 0.65, m.cap - r * 2.5, { r: 0.8 }],
    ]);
    return Math.round((sb + r) * 2);
  },

  '"'(pc, m) {
    const r = Math.max(22, m.V * 0.46);
    const sb = Math.round(42 * clamp(m.widthScale, 0.75, 1.15));
    const gap = Math.max(r * 2.35, 92);
    const c1 = sb + r;
    const c2 = c1 + gap;
    for (const cx of [c1, c2]) {
      pc.addPolygon([
        [cx - r * 0.65, m.cap - r * 2.5, { r: 0.8 }],
        [cx - r * 0.88, m.cap, { r: 0.9 }],
        [cx + r * 0.88, m.cap, { r: 0.9 }],
        [cx + r * 0.65, m.cap - r * 2.5, { r: 0.8 }],
      ]);
    }
    return Math.round(c2 + r + sb);
  },

  '*'(pc, m) {
    const w = Math.round(420 * m.widthScale);
    const sb = Math.round(38 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    const cx = adv * 0.5;
    const cy = m.cap * 0.68;
    const R = w * 0.48;
    const rIn = Math.max(22, m.V * 0.36);
    const pts = [];
    const arms = 6;
    for (let i = 0; i < arms; i++) {
      const a = (i * 2 * Math.PI) / arms - Math.PI / 2;
      const aPrev = a - Math.PI / (arms * 2.4);
      const aNext = a + Math.PI / (arms * 2.4);
      const aValley = a + Math.PI / arms;
      pts.push([cx + R * Math.cos(aPrev), cy + R * Math.sin(aPrev), { r: 0.6 }]);
      pts.push([cx + R * Math.cos(aNext), cy + R * Math.sin(aNext), { r: 0.6 }]);
      pts.push([
        cx + rIn * Math.cos(aValley),
        cy + rIn * Math.sin(aValley),
        { r: 0.25, trap: { d: 0.65, w: 0.55, bx: -Math.cos(aValley), by: -Math.sin(aValley) } },
      ]);
    }
    pc.addPolygon(pts);
    return adv;
  },

  '#'(pc, m) {
    const w = Math.round(620 * m.widthScale);
    const sb = Math.round(36 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    const xL = sb;
    const xR = sb + w;
    const cap = m.cap;
    const barH = Math.min(m.H * 0.76, cap * 0.16);
    const stemW = Math.min(m.V * 0.74, w * 0.20);
    // Render clean hash with two horizontal and two vertical bars
    const y1 = cap * 0.28;
    const y2 = cap * 0.64;
    const x1 = xL + w * 0.24;
    const x2 = xL + w * 0.62;
    const tilt = w * 0.06;

    // Outer unified contour not needed to overlap if we emit 1 outer + 1 inner counter, or clean bars:
    // Let's emit exact unified # contour (1 outer CW + 1 inner CCW counter)!
    pc.addPolygon([
      [x1 - tilt * 0.5, 0, { r: 0.8 }],
      [x1 - tilt * 0.2, y1, { r: 0.3 }],
      [xL, y1, { r: 0.8 }],
      [xL, y1 + barH, { r: 0.8 }],
      [x1, y1 + barH, { r: 0.3 }],
      [x1 + tilt * 0.25, y2, { r: 0.3 }],
      [xL + tilt * 0.3, y2, { r: 0.8 }],
      [xL + tilt * 0.3, y2 + barH, { r: 0.8 }],
      [x1 + tilt * 0.45, y2 + barH, { r: 0.3 }],
      [x1 + tilt * 0.75, cap, { r: 0.8 }],
      [x1 + stemW + tilt * 0.75, cap, { r: 0.8 }],
      [x1 + stemW + tilt * 0.45, y2 + barH, { r: 0.3 }],
      [x2 + tilt * 0.45, y2 + barH, { r: 0.3 }],
      [x2 + tilt * 0.75, cap, { r: 0.8 }],
      [x2 + stemW + tilt * 0.75, cap, { r: 0.8 }],
      [x2 + stemW + tilt * 0.45, y2 + barH, { r: 0.3 }],
      [xR, y2 + barH, { r: 0.8 }],
      [xR, y2, { r: 0.8 }],
      [x2 + stemW + tilt * 0.25, y2, { r: 0.3 }],
      [x2 + stemW, y1 + barH, { r: 0.3 }],
      [xR - tilt * 0.3, y1 + barH, { r: 0.8 }],
      [xR - tilt * 0.3, y1, { r: 0.8 }],
      [x2 + stemW - tilt * 0.2, y1, { r: 0.3 }],
      [x2 + stemW - tilt * 0.5, 0, { r: 0.8 }],
      [x2 - tilt * 0.5, 0, { r: 0.8 }],
      [x2 - tilt * 0.2, y1, { r: 0.3 }],
      [x1 + stemW - tilt * 0.2, y1, { r: 0.3 }],
      [x1 + stemW - tilt * 0.5, 0, { r: 0.8 }],
    ]);

    // Inner CCW parallelogram counter
    pc.addPolygon(
      [
        [x1 + stemW, y1 + barH, { r: 0.3 }],
        [x2, y1 + barH, { r: 0.3 }],
        [x2 + tilt * 0.25, y2, { r: 0.3 }],
        [x1 + stemW + tilt * 0.25, y2, { r: 0.3 }],
      ],
      -1
    );
    return adv;
  },

  '%'(pc, m) {
    const w = Math.round(720 * m.widthScale);
    const sb = Math.round(36 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    const xL = sb;
    const xR = sb + w;
    const cap = m.cap;

    const r = Math.min(w * 0.21, cap * 0.22);
    const inR = Math.max(14, r - m.V * 0.52);
    const sw = Math.max(24, m.D2 * 0.58);

    // Top-left ring
    pc.addSuperellipse(xL + r, cap - r, r, r, 1);
    pc.addSuperellipse(xL + r, cap - r, inR, inR, -1);

    // Bottom-right ring
    pc.addSuperellipse(xR - r, r, r, r, 1);
    pc.addSuperellipse(xR - r, r, inR, inR, -1);

    // Diagonal slash
    pc.addPolygon([
      [xL + w * 0.16, 0, { r: 0.8 }],
      [xR - w * 0.16 - sw, cap, { r: 0.8 }],
      [xR - w * 0.16, cap, { r: 0.8 }],
      [xL + w * 0.16 + sw, 0, { r: 0.8 }],
    ]);
    return adv;
  },

  '&'(pc, m) {
    const w = Math.round(665 * m.widthScale);
    const sb = Math.round(40 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    const xL = sb;
    const xR = sb + w;
    const cap = m.cap;
    const topY = cap + m.ov;
    const botY = -m.ov;
    const waistY = cap * 0.52;

    const V = Math.min(m.V * 0.88, w * 0.34);
    const H = Math.min(m.H * 0.82, cap * 0.19);
    const kOut = m.kappaOut;

    const upCx = xL + w * 0.43;
    const upRx = w * 0.34;
    const upMidY = (waistY + topY) * 0.5;
    const loCx = xL + w * 0.43;
    const loRx = w * 0.43;
    const loMidY = (botY + waistY) * 0.5;

    // Outer CW contour of grotesque ampersand with bottom-right diagonal cross-tail
    pc.addMixedContour(
      [
        { type: 'pt', x: upCx - upRx, y: upMidY, r: 0 },
        {
          type: 'cubic',
          c1x: upCx - upRx,
          c1y: lerp(upMidY, topY, kOut),
          c2x: upCx - upRx * kOut,
          c2y: topY,
          x: upCx,
          y: topY,
        },
        {
          type: 'cubic',
          c1x: upCx + upRx * kOut,
          c1y: topY,
          c2x: upCx + upRx,
          c2y: lerp(upMidY, topY, kOut),
          x: upCx + upRx,
          y: upMidY,
        },
        {
          type: 'cubic',
          c1x: upCx + upRx,
          c1y: lerp(upMidY, waistY, 0.7),
          c2x: upCx + upRx * 0.68,
          c2y: waistY + H * 0.15,
          x: upCx + upRx * 0.58,
          y: waistY,
        },
        // Diagonal stem down-right to right crossbar hook
        { type: 'pt', x: xR - V * 0.78, y: loMidY + H * 0.45, r: 0.3 },
        { type: 'pt', x: xR - w * 0.04, y: waistY - H * 0.2, r: 0.7 },
        { type: 'pt', x: xR, y: waistY - H * 0.2, r: 0.7 },
        { type: 'pt', x: xR - w * 0.04, y: loMidY - H * 0.2, r: 0.3 },
        { type: 'pt', x: xR, y: 0, r: 0.8 },
        { type: 'pt', x: xR - V * 0.96, y: 0, r: 0.8 },
        { type: 'pt', x: loCx + loRx * 0.66, y: H * 0.55, r: 0.3, trap: { d: 0.8, w: 0.7, bx: -0.5, by: 0.85 } },
        {
          type: 'cubic',
          c1x: loCx + loRx * 0.45,
          c1y: botY,
          c2x: loCx + loRx * 0.2,
          c2y: botY,
          x: loCx,
          y: botY,
        },
        {
          type: 'cubic',
          c1x: loCx - loRx * kOut,
          c1y: botY,
          c2x: xL,
          c2y: lerp(loMidY, botY, kOut),
          x: xL,
          y: loMidY,
        },
        {
          type: 'cubic',
          c1x: xL,
          c1y: lerp(loMidY, waistY, 0.72),
          c2x: upCx - upRx * 0.75,
          c2y: waistY - H * 0.12,
          x: upCx - upRx * 0.65,
          y: waistY,
        },
        {
          type: 'cubic',
          c1x: upCx - upRx * 0.75,
          c1y: waistY + H * 0.12,
          c2x: upCx - upRx,
          c2y: lerp(upMidY, waistY, 0.72),
          x: upCx - upRx,
          y: upMidY,
        },
      ],
      1
    );

    const upInRx = Math.max(16, upRx - V * 0.88);
    const upInRy = Math.max(14, (topY - waistY) * 0.5 - H * 0.72);
    const loInRx = Math.max(18, loRx - V * 0.88);
    const loInRy = Math.max(15, (waistY - botY) * 0.5 - H * 0.72);
    pc.addSuperellipse(upCx, upMidY - H * 0.06, upInRx, upInRy, -1);
    pc.addSuperellipse(loCx, loMidY + H * 0.06, loInRx, loInRy, -1);
    return adv;
  },

  '@'(pc, m) {
    const w = Math.round(760 * m.widthScale);
    const sb = Math.round(38 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    const cx = sb + w * 0.5;
    const cy = m.cap * 0.46;
    const rx = w * 0.48;
    const ry = m.cap * 0.48;
    const V = Math.min(m.V * 0.58, rx * 0.34);
    const H = Math.min(m.H * 0.58, ry * 0.34);

    addOpenBowlContour(pc, m, {
      cx,
      cy,
      rx,
      ry,
      vStroke: V,
      hStroke: H,
      topAngleDeg: 18,
      botAngleDeg: 28,
    });
    const innerR = rx * 0.44;
    pc.addSuperellipse(cx, cy, innerR, innerR, 1);
    pc.addSuperellipse(cx, cy, Math.max(14, innerR - V * 0.9), Math.max(14, innerR - H * 0.9), -1);
    return adv;
  },

  '$'(pc, m) {
    const adv = GLYPH_BUILDERS.S(pc, m);
    const cx = adv * 0.5;
    const barW = Math.max(22, m.V * 0.48);
    // Top and bottom vertical currency ticks
    pc.addPolygon([
      [cx - barW * 0.5, m.cap - 10, { r: 0.7 }],
      [cx - barW * 0.5, m.cap + 85, { r: 0.7 }],
      [cx + barW * 0.5, m.cap + 85, { r: 0.7 }],
      [cx + barW * 0.5, m.cap - 10, { r: 0.7 }],
    ]);
    pc.addPolygon([
      [cx - barW * 0.5, -85, { r: 0.7 }],
      [cx - barW * 0.5, 10, { r: 0.7 }],
      [cx + barW * 0.5, 10, { r: 0.7 }],
      [cx + barW * 0.5, -85, { r: 0.7 }],
    ]);
    return adv;
  },

  'ß'(pc, m) {
    const w = Math.round(610 * m.widthScale);
    const sb = Math.round(52 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    const xL = sb;
    const xR = sb + w;
    const V = Math.min(m.V * 0.92, w * 0.36);
    const H = Math.min(m.H * 0.88, m.asc * 0.20);
    const topY = m.asc + m.ov;
    const waistY = m.xh * 0.56;
    const kOut = m.kappaOut;
    const kIn = m.kappaIn;
    const archCx = (xL + xR - w * 0.04) * 0.5;

    pc.addMixedContour([
      { type: 'pt', x: xL, y: 0, r: 1 },
      { type: 'pt', x: xL, y: m.xh * 0.75, r: 0 },
      {
        type: 'cubic',
        c1x: xL,
        c1y: lerp(m.xh * 0.75, topY, kOut),
        c2x: lerp(archCx, xL, kOut),
        c2y: topY,
        x: archCx,
        y: topY,
      },
      {
        type: 'cubic',
        c1x: lerp(archCx, xR - w * 0.04, kOut),
        c1y: topY,
        c2x: xR - w * 0.04,
        c2y: lerp((waistY + topY) * 0.5, topY, kOut),
        x: xR - w * 0.04,
        y: (waistY + topY) * 0.5,
      },
      {
        type: 'cubic',
        c1x: xR - w * 0.04,
        c1y: lerp((waistY + topY) * 0.5, waistY, kOut),
        c2x: lerp(archCx, xR - w * 0.04, 0.55),
        c2y: waistY,
        x: archCx,
        y: waistY,
      },
      {
        type: 'cubic',
        c1x: lerp(archCx, xR, kOut),
        c1y: waistY,
        c2x: xR,
        c2y: lerp(waistY * 0.48, waistY, kOut),
        x: xR,
        y: waistY * 0.48,
      },
      {
        type: 'cubic',
        c1x: xR,
        c1y: lerp(waistY * 0.48, -m.ov, kOut),
        c2x: lerp(archCx, xR, kOut),
        c2y: -m.ov,
        x: archCx,
        y: -m.ov,
      },
      { type: 'pt', x: xL + V * 1.35, y: -m.ov, r: 0.8 },
      { type: 'pt', x: xL + V * 1.35, y: H, r: 0.8 },
      {
        type: 'cubic',
        c1x: lerp(archCx, xR - V, kIn),
        c1y: H,
        c2x: xR - V,
        c2y: lerp(waistY * 0.48, H, kIn),
        x: xR - V,
        y: waistY * 0.48,
      },
      {
        type: 'cubic',
        c1x: xR - V,
        c1y: lerp(waistY * 0.48, waistY - H * 0.5, kIn),
        c2x: lerp(archCx, xR - V, kIn),
        c2y: waistY - H * 0.5,
        x: archCx - V * 0.2,
        y: waistY - H * 0.5,
      },
      { type: 'pt', x: archCx - V * 0.2, y: waistY + H * 0.5, r: 0.6 },
      {
        type: 'cubic',
        c1x: lerp(archCx, xR - w * 0.04 - V, kIn),
        c1y: waistY + H * 0.5,
        c2x: xR - w * 0.04 - V,
        c2y: lerp((waistY + topY) * 0.5, waistY + H * 0.5, kIn),
        x: xR - w * 0.04 - V,
        y: (waistY + topY) * 0.5,
      },
      {
        type: 'cubic',
        c1x: xR - w * 0.04 - V,
        c1y: lerp((waistY + topY) * 0.5, topY - H, kIn),
        c2x: lerp(archCx, xR - w * 0.04 - V, kIn),
        c2y: topY - H,
        x: archCx,
        y: topY - H,
      },
      {
        type: 'cubic',
        c1x: lerp(archCx, xL + V, kIn),
        c1y: topY - H,
        c2x: xL + V,
        c2y: lerp(m.xh * 0.75, topY - H, kIn),
        x: xL + V,
        y: m.xh * 0.75,
      },
      { type: 'pt', x: xL + V, y: 0, r: 1 },
    ]);
    return adv;
  },

  'Ø'(pc, m) {
    return GLYPH_BUILDERS['0'](pc, { ...m, p: { ...m.p, slashedZero: 1 } });
  },

  'ø'(pc, m) {
    const w = Math.round(565 * m.widthScale);
    const sb = Math.round(42 * clamp(m.widthScale, 0.75, 1.15));
    const adv = w + sb * 2;
    const cx = sb + w * 0.5;
    const cy = m.xh * 0.5;
    const rx = w * 0.5;
    const ry = m.xh * 0.5 + m.ov;
    const V = Math.min(m.V * 0.94, rx * 0.68);
    const H = Math.min(m.H * 0.90, ry * 0.60);
    pc.addSuperellipse(cx, cy, rx, ry, 1);
    const irx = Math.max(18, rx - V);
    const iry = Math.max(18, ry - H);
    const slashHalf = Math.max(8, H * 0.26);
    pc.addPolygon(
      [
        [cx - irx * 0.85, cy - iry * 0.55 + slashHalf, { r: 0.4 }],
        [cx + irx * 0.55 - slashHalf, cy + iry * 0.85, { r: 0.4 }],
        [cx - irx * 0.75, cy + iry * 0.75, { r: 0.8 }],
      ],
      -1
    );
    pc.addPolygon(
      [
        [cx + irx * 0.85, cy + iry * 0.55 - slashHalf, { r: 0.4 }],
        [cx - irx * 0.55 + slashHalf, cy - iry * 0.85, { r: 0.4 }],
        [cx + irx * 0.75, cy - iry * 0.75, { r: 0.8 }],
      ],
      -1
    );
    return adv;
  },

  'Æ'(pc, m) {
    const advA = GLYPH_BUILDERS.A(pc, { ...m, widthScale: m.widthScale * 0.82 });
    const eShift = Math.round(advA * 0.68);
    const tmp = new PathCompiler(m);
    const advE = GLYPH_BUILDERS.E(tmp, { ...m, widthScale: m.widthScale * 0.84 });
    for (const c of tmp.contours) {
      pc.contours.push(
        c.map((seg) =>
          seg.cmd === 'C'
            ? { ...seg, c1x: seg.c1x + eShift, c2x: seg.c2x + eShift, x: seg.x + eShift }
            : seg.cmd === 'Z'
            ? seg
            : { ...seg, x: seg.x + eShift }
        )
      );
    }
    return eShift + advE;
  },

  'æ'(pc, m) {
    const advA = GLYPH_BUILDERS.a(pc, { ...m, widthScale: m.widthScale * 0.85 });
    const eShift = Math.round(advA * 0.72);
    const tmp = new PathCompiler(m);
    const advE = GLYPH_BUILDERS.e(tmp, { ...m, widthScale: m.widthScale * 0.88 });
    for (const c of tmp.contours) {
      pc.contours.push(
        c.map((seg) =>
          seg.cmd === 'C'
            ? { ...seg, c1x: seg.c1x + eShift, c2x: seg.c2x + eShift, x: seg.x + eShift }
            : seg.cmd === 'Z'
            ? seg
            : { ...seg, x: seg.x + eShift }
        )
      );
    }
    return eShift + advE;
  },
});

/**
 * Parametric Diacritic Marks & Accented Character Map
 */
const ACCENT_MAP = {
  À: ['A', 'grave', true],
  Á: ['A', 'acute', true],
  Â: ['A', 'circumflex', true],
  Ã: ['A', 'tilde', true],
  Ä: ['A', 'umlaut', true],
  Å: ['A', 'ring', true],
  Ç: ['C', 'cedilla', true],
  È: ['E', 'grave', true],
  É: ['E', 'acute', true],
  Ê: ['E', 'circumflex', true],
  Ë: ['E', 'umlaut', true],
  Ì: ['I', 'grave', true],
  Í: ['I', 'acute', true],
  Î: ['I', 'circumflex', true],
  Ï: ['I', 'umlaut', true],
  Ñ: ['N', 'tilde', true],
  Ò: ['O', 'grave', true],
  Ó: ['O', 'acute', true],
  Ô: ['O', 'circumflex', true],
  Õ: ['O', 'tilde', true],
  Ö: ['O', 'umlaut', true],
  Ù: ['U', 'grave', true],
  Ú: ['U', 'acute', true],
  Û: ['U', 'circumflex', true],
  Ü: ['U', 'umlaut', true],
  Ý: ['Y', 'acute', true],

  à: ['a', 'grave', false],
  á: ['a', 'acute', false],
  â: ['a', 'circumflex', false],
  ã: ['a', 'tilde', false],
  ä: ['a', 'umlaut', false],
  å: ['a', 'ring', false],
  ç: ['c', 'cedilla', false],
  è: ['e', 'grave', false],
  é: ['e', 'acute', false],
  ê: ['e', 'circumflex', false],
  ë: ['e', 'umlaut', false],
  ì: ['dotlessi', 'grave', false],
  í: ['dotlessi', 'acute', false],
  î: ['dotlessi', 'circumflex', false],
  ï: ['dotlessi', 'umlaut', false],
  ñ: ['n', 'tilde', false],
  ò: ['o', 'grave', false],
  ó: ['o', 'acute', false],
  ô: ['o', 'circumflex', false],
  õ: ['o', 'tilde', false],
  ö: ['o', 'umlaut', false],
  ù: ['u', 'grave', false],
  ú: ['u', 'acute', false],
  û: ['u', 'circumflex', false],
  ü: ['u', 'umlaut', false],
  ý: ['y', 'acute', false],
  ÿ: ['y', 'umlaut', false],
};

GLYPH_BUILDERS.dotlessi = function (pc, m) {
  const V = m.V * 0.96;
  const sb = Math.round(54 * clamp(m.widthScale, 0.75, 1.15));
  const adv = Math.round(V + sb * 2);
  pc.addPolygon([
    [sb, 0, { r: 1 }],
    [sb, m.xh, { r: 1, flare: 1 }],
    [sb + V, m.xh, { r: 1 }],
    [sb + V, 0, { r: 1, flare: 1 }],
  ]);
  return adv;
};

function addDiacriticMark(pc, m, mark, cx, topRefY) {
  const r = Math.max(22, m.V * 0.44);
  const h = Math.max(78, m.H * 0.85 + 48);
  const yBase = topRefY + Math.max(36, m.H * 0.32);

  if (mark === 'acute') {
    pc.addPolygon([
      [cx - r * 0.85, yBase, { r: 0.7 }],
      [cx + r * 0.35, yBase + h, { r: 0.8 }],
      [cx + r * 1.65, yBase + h, { r: 0.8 }],
      [cx + r * 0.15, yBase, { r: 0.7 }],
    ]);
  } else if (mark === 'grave') {
    pc.addPolygon([
      [cx - r * 0.15, yBase, { r: 0.7 }],
      [cx - r * 1.65, yBase + h, { r: 0.8 }],
      [cx - r * 0.35, yBase + h, { r: 0.8 }],
      [cx + r * 0.85, yBase, { r: 0.7 }],
    ]);
  } else if (mark === 'circumflex') {
    const span = Math.max(105, r * 2.35);
    const thick = Math.max(26, m.H * 0.56);
    pc.addPolygon([
      [cx - span, yBase, { r: 0.7 }],
      [cx - thick * 0.45, yBase + h, { r: 0.7 }],
      [cx + thick * 0.45, yBase + h, { r: 0.7 }],
      [cx + span, yBase, { r: 0.7 }],
      [cx + span - thick * 0.95, yBase, { r: 0.7 }],
      [cx, yBase + h - thick * 0.88, { r: 0.3, trap: { d: 0.65, w: 0.55, bx: 0, by: 1 } }],
      [cx - span + thick * 0.95, yBase, { r: 0.7 }],
    ]);
  } else if (mark === 'umlaut') {
    const gap = Math.max(r * 1.45, 62);
    const dotR = r * 0.92;
    pc.addSuperellipse(cx - gap, yBase + dotR, dotR, dotR, 1);
    pc.addSuperellipse(cx + gap, yBase + dotR, dotR, dotR, 1);
  } else if (mark === 'ring') {
    const outR = Math.max(52, r * 1.38);
    const inR = Math.max(18, outR - Math.max(22, m.H * 0.48));
    pc.addSuperellipse(cx, yBase + outR * 0.82, outR, outR, 1);
    pc.addSuperellipse(cx, yBase + outR * 0.82, inR, inR, -1);
  } else if (mark === 'tilde') {
    const span = Math.max(115, r * 2.55);
    const thick = Math.max(28, m.H * 0.56);
    const cy = yBase + h * 0.48;
    const amp = h * 0.36;
    pc.addMixedContour([
      { type: 'pt', x: cx - span, y: cy - thick * 0.5 - amp * 0.4, r: 0.7 },
      {
        type: 'cubic',
        c1x: cx - span * 0.45,
        c1y: cy + thick * 0.5 + amp,
        c2x: cx + span * 0.35,
        c2y: cy - thick * 0.5 - amp,
        x: cx + span,
        y: cy + thick * 0.5 + amp * 0.4,
      },
      { type: 'pt', x: cx + span, y: cy - thick * 0.5 + amp * 0.4, r: 0.7 },
      {
        type: 'cubic',
        c1x: cx + span * 0.35,
        c1y: cy - thick * 1.5 - amp,
        c2x: cx - span * 0.45,
        c2y: cy - thick * 0.5 + amp,
        x: cx - span,
        y: cy - thick * 1.5 - amp * 0.4,
      },
    ]);
  } else if (mark === 'cedilla') {
    const cw = Math.max(46, r * 1.15);
    pc.addPolygon([
      [cx - cw * 0.4, -m.ov, { r: 0.5 }],
      [cx + cw * 0.4, -m.ov, { r: 0.5 }],
      [cx + cw * 0.75, m.desc * 0.62, { r: 0.8 }],
      [cx - cw * 0.85, m.desc * 0.78, { r: 0.8 }],
      [cx - cw * 0.85, m.desc * 0.45, { r: 0.8 }],
      [cx + cw * 0.05, m.desc * 0.45, { r: 0.4 }],
    ]);
  }
}

/**
 * Compile a single character's contours and advance width
 */
export function buildGlyph(char, metricsOrParams) {
  const m = metricsOrParams.UPM ? metricsOrParams : computeMetrics(metricsOrParams);
  const pc = new PathCompiler(m);

  let adv;
  if (GLYPH_BUILDERS[char]) {
    adv = GLYPH_BUILDERS[char](pc, m);
  } else if (ACCENT_MAP[char]) {
    const [baseChar, mark, isCap] = ACCENT_MAP[char];
    adv = GLYPH_BUILDERS[baseChar](pc, m);
    addDiacriticMark(pc, m, mark, adv * 0.5, isCap ? m.cap : m.xh);
  } else if (char === '“' || char === '”') {
    adv = GLYPH_BUILDERS['"'](pc, m);
  } else if (char === '‘' || char === '’') {
    adv = GLYPH_BUILDERS["'"](pc, m);
  } else if (char === '{') {
    adv = GLYPH_BUILDERS['['](pc, m);
  } else if (char === '}') {
    adv = GLYPH_BUILDERS[']'](pc, m);
  } else {
    // Fallback box for unknown character
    adv = Math.round(500 * m.widthScale);
    pc.addPolygon([
      [50, 0, { r: 1 }],
      [50, m.cap, { r: 1 }],
      [adv - 50, m.cap, { r: 1 }],
      [adv - 50, 0, { r: 1 }],
    ]);
  }

  const trackingUnits = Math.round(m.p.tracking * 4);
  return {
    char,
    advanceWidth: Math.max(120, adv + trackingUnits),
    rawAdvance: adv,
    compiler: pc,
    contours: pc.contours,
  };
}

/**
 * Generate a complete, clean standalone SVG document for an array of text lines
 */
export function exportLinesToSVG(lines, rawParams) {
  const m = computeMetrics(rawParams);
  const lineGap = 1080;
  const padX = 80;
  const padTop = 920;

  let maxLineWidth = 800;
  const linePaths = [];

  lines.forEach((lineText, rowIdx) => {
    let cursorX = padX;
    const baselineY = padTop + rowIdx * lineGap;
    for (const ch of lineText) {
      if (ch === ' ') {
        const g = buildGlyph(' ', m);
        cursorX += g.advanceWidth;
        continue;
      }
      const g = buildGlyph(ch, m);
      const d = g.compiler.toSVGPath(cursorX, baselineY, 1);
      if (d) {
        linePaths.push(`    <path data-char="${escapeXml(ch)}" d="${d}" />`);
      }
      cursorX += g.advanceWidth;
    }
    maxLineWidth = Math.max(maxLineWidth, cursorX + padX);
  });

  const totalHeight = Math.max(1150, padTop + (lines.length - 1) * lineGap + 340);

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Math.round(maxLineWidth)} ${Math.round(totalHeight)}" width="${Math.round(maxLineWidth * 0.18)}" height="${Math.round(totalHeight * 0.18)}">`,
    `  <title>FONTR55 Parametric Specimen — Weight ${m.p.weight} · Width ${m.p.width}%</title>`,
    `  <g fill="#111111" fill-rule="nonzero">`,
    ...linePaths,
    `  </g>`,
    `</svg>`,
  ].join('\n');
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
