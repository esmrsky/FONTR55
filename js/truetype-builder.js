/**
 * FONTR55 — Pure-JS TrueType (.ttf) Binary Font Compiler
 *
 * Compiles parametric Cubic Bézier contours from font-engine.js into an
 * installable, standards-compliant OpenType/TrueType (.ttf) binary font buffer.
 */

import { computeMetrics, buildGlyph } from './font-engine.js';

const EXPORT_CHARSET = [
  ' ', '!', '"', '#', '$', '%', '&', "'", '(', ')', '*', '+', ',', '-', '.', '/',
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', ':', ';', '=', '?', '@',
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
  '[', '\\', ']',
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
  'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
  '{', '}',
  'À', 'Á', 'Â', 'Ã', 'Ä', 'Å', 'Æ', 'Ç', 'È', 'É', 'Ê', 'Ë', 'Ì', 'Í', 'Î', 'Ï',
  'Ñ', 'Ò', 'Ó', 'Ô', 'Õ', 'Ö', 'Ø', 'Ù', 'Ú', 'Û', 'Ü', 'Ý', 'ß',
  'à', 'á', 'â', 'ã', 'ä', 'å', 'æ', 'ç', 'è', 'é', 'ê', 'ë', 'ì', 'í', 'î', 'ï',
  'ñ', 'ò', 'ó', 'ô', 'õ', 'ö', 'ø', 'ù', 'ú', 'û', 'ü', 'ý', 'ÿ',
  '–', '—', '‘', '’', '“', '”',
];

/**
 * Approximate a Cubic Bézier (P0, C1, C2, P3) with 2 quadratic Bézier segments
 * for TrueType `glyf` table compatibility.
 */
function cubicToQuadratics(p0, c1, c2, p3) {
  // Split cubic at t = 0.5 using De Casteljau
  const m01 = { x: (p0.x + c1.x) * 0.5, y: (p0.y + c1.y) * 0.5 };
  const m12 = { x: (c1.x + c2.x) * 0.5, y: (c1.y + c2.y) * 0.5 };
  const m23 = { x: (c2.x + p3.x) * 0.5, y: (c2.y + p3.y) * 0.5 };
  const m012 = { x: (m01.x + m12.x) * 0.5, y: (m01.y + m12.y) * 0.5 };
  const m123 = { x: (m12.x + m23.x) * 0.5, y: (m12.y + m23.y) * 0.5 };
  const mid = { x: (m012.x + m123.x) * 0.5, y: (m012.y + m123.y) * 0.5 };

  // Degree-reduced quadratic control points for each half
  const q1 = {
    x: Math.round(p0.x * 0.25 + m01.x * 0.75 + m012.x * 0.75 - mid.x * 0.75),
    y: Math.round(p0.y * 0.25 + m01.y * 0.75 + m012.y * 0.75 - mid.y * 0.75),
  };
  // Better standard quadratic control approximation: 0.75 * C_cubic + 0.25 * P_anchor
  const qc1 = {
    x: Math.round((3 * m01.x - p0.x + 3 * m012.x - mid.x) * 0.25),
    y: Math.round((3 * m01.y - p0.y + 3 * m012.y - mid.y) * 0.25),
  };
  const qc2 = {
    x: Math.round((3 * m23.x - p3.x + 3 * m123.x - mid.x) * 0.25),
    y: Math.round((3 * m23.y - p3.y + 3 * m123.y - mid.y) * 0.25),
  };

  return [
    { onCurve: false, x: qc1.x, y: qc1.y },
    { onCurve: true, x: Math.round(mid.x), y: Math.round(mid.y) },
    { onCurve: false, x: qc2.x, y: qc2.y },
    { onCurve: true, x: Math.round(p3.x), y: Math.round(p3.y) },
  ];
}

function contourToTTFPoints(contour) {
  const pts = [];
  let curr = { x: 0, y: 0 };

  for (const seg of contour) {
    if (seg.cmd === 'M') {
      curr = { x: seg.x, y: seg.y };
      pts.push({ onCurve: true, x: curr.x, y: curr.y });
    } else if (seg.cmd === 'L') {
      if (seg.x !== curr.x || seg.y !== curr.y) {
        curr = { x: seg.x, y: seg.y };
        pts.push({ onCurve: true, x: curr.x, y: curr.y });
      }
    } else if (seg.cmd === 'C') {
      const p3 = { x: seg.x, y: seg.y };
      const qPts = cubicToQuadratics(
        curr,
        { x: seg.c1x, y: seg.c1y },
        { x: seg.c2x, y: seg.c2y },
        p3
      );
      pts.push(...qPts);
      curr = p3;
    }
  }

  // Remove duplicate closing point if identical to first point
  if (
    pts.length > 1 &&
    pts[pts.length - 1].onCurve &&
    pts[pts.length - 1].x === pts[0].x &&
    pts[pts.length - 1].y === pts[0].y
  ) {
    pts.pop();
  }
  return pts;
}

function encodeSimpleGlyph(contours) {
  const ttfContours = contours.map(contourToTTFPoints).filter((c) => c.length >= 3);
  if (ttfContours.length === 0) {
    return { bytes: new Uint8Array(0), xMin: 0, yMin: 0, xMax: 0, yMax: 0, maxPts: 0, maxContours: 0 };
  }

  let xMin = Infinity, yMin = Infinity, xMax = -Infinity, yMax = -Infinity;
  const endPts = [];
  const allPts = [];

  for (const c of ttfContours) {
    for (const p of c) {
      if (p.x < xMin) xMin = p.x;
      if (p.y < yMin) yMin = p.y;
      if (p.x > xMax) xMax = p.x;
      if (p.y > yMax) yMax = p.y;
      allPts.push(p);
    }
    endPts.push(allPts.length - 1);
  }

  const numContours = ttfContours.length;
  const numPts = allPts.length;
  // Header (10) + endPts (2*numContours) + instrLen (2) + flags (numPts) + xCoords (2*numPts) + yCoords (2*numPts)
  const rawLen = 10 + 2 * numContours + 2 + numPts + 4 * numPts;
  const paddedLen = (rawLen + 3) & ~3;
  const buf = new ArrayBuffer(paddedLen);
  const dv = new DataView(buf);
  let off = 0;

  dv.setInt16(off, numContours); off += 2;
  dv.setInt16(off, xMin); off += 2;
  dv.setInt16(off, yMin); off += 2;
  dv.setInt16(off, xMax); off += 2;
  dv.setInt16(off, yMax); off += 2;

  for (let i = 0; i < numContours; i++) {
    dv.setUint16(off, endPts[i]); off += 2;
  }
  dv.setUint16(off, 0); off += 2; // instructionLength = 0

  // Flags: bit 0 = onCurve, bits 1-5 = 0 (16-bit signed relative coordinates)
  for (let i = 0; i < numPts; i++) {
    dv.setUint8(off++, allPts[i].onCurve ? 1 : 0);
  }

  let prevX = 0;
  for (let i = 0; i < numPts; i++) {
    const dx = allPts[i].x - prevX;
    dv.setInt16(off, dx); off += 2;
    prevX = allPts[i].x;
  }

  let prevY = 0;
  for (let i = 0; i < numPts; i++) {
    const dy = allPts[i].y - prevY;
    dv.setInt16(off, dy); off += 2;
    prevY = allPts[i].y;
  }

  return {
    bytes: new Uint8Array(buf),
    xMin,
    yMin,
    xMax,
    yMax,
    maxPts: numPts,
    maxContours: numContours,
  };
}

/**
 * Build a complete installable TrueType (.ttf) ArrayBuffer for the given slider parameters
 */
export function buildTrueTypeFont(rawParams = {}, familyName = 'FONTR55 Custom') {
  const m = computeMetrics(rawParams);
  const glyphs = [];

  // 0: .notdef
  const notdefPc = buildGlyph('□', m);
  glyphs.push({
    code: 0,
    advanceWidth: notdefPc.advanceWidth,
    encoded: encodeSimpleGlyph(notdefPc.compiler.toFontContours()),
  });

  // Sort characters by Unicode codepoint
  const sortedChars = [...EXPORT_CHARSET].sort((a, b) => a.codePointAt(0) - b.codePointAt(0));
  for (const ch of sortedChars) {
    const g = buildGlyph(ch, m);
    glyphs.push({
      code: ch.codePointAt(0),
      advanceWidth: g.advanceWidth,
      encoded: encodeSimpleGlyph(g.compiler.toFontContours()),
    });
  }

  const numGlyphs = glyphs.length;
  let globalXMin = 0, globalYMin = m.desc, globalXMax = 1000, globalYMax = m.asc;
  let maxPoints = 0, maxContours = 0, maxAdvance = 0;

  // Build glyf and loca (format 1: Uint32 offsets)
  let totalGlyfBytes = 0;
  for (const g of glyphs) {
    totalGlyfBytes += g.encoded.bytes.length;
    if (g.encoded.bytes.length > 0) {
      globalXMin = Math.min(globalXMin, g.encoded.xMin);
      globalYMin = Math.min(globalYMin, g.encoded.yMin);
      globalXMax = Math.max(globalXMax, g.encoded.xMax);
      globalYMax = Math.max(globalYMax, g.encoded.yMax);
      maxPoints = Math.max(maxPoints, g.encoded.maxPts);
      maxContours = Math.max(maxContours, g.encoded.maxContours);
    }
    maxAdvance = Math.max(maxAdvance, g.advanceWidth);
  }

  const glyfTable = new Uint8Array(Math.max(4, totalGlyfBytes));
  const locaBuf = new ArrayBuffer((numGlyphs + 1) * 4);
  const locaDv = new DataView(locaBuf);
  let glyfOff = 0;
  for (let i = 0; i < numGlyphs; i++) {
    locaDv.setUint32(i * 4, glyfOff);
    const b = glyphs[i].encoded.bytes;
    glyfTable.set(b, glyfOff);
    glyfOff += b.length;
  }
  locaDv.setUint32(numGlyphs * 4, glyfOff);

  // Build hmtx table
  const hmtxBuf = new ArrayBuffer(numGlyphs * 4);
  const hmtxDv = new DataView(hmtxBuf);
  for (let i = 0; i < numGlyphs; i++) {
    hmtxDv.setUint16(i * 4, glyphs[i].advanceWidth);
    hmtxDv.setInt16(i * 4 + 2, glyphs[i].encoded.xMin || 0);
  }

  // Build head table (54 bytes)
  const headBuf = new ArrayBuffer(54);
  const headDv = new DataView(headBuf);
  headDv.setUint32(0, 0x00010000); // version 1.0
  headDv.setUint32(4, 0x00010000); // fontRevision 1.0
  headDv.setUint32(8, 0);          // checkSumAdjustment
  headDv.setUint32(12, 0x5F0F3CF5);// magicNumber
  headDv.setUint16(16, 0x000B);    // flags
  headDv.setUint16(18, 1000);      // unitsPerEm
  headDv.setInt16(36, globalXMin);
  headDv.setInt16(38, globalYMin);
  headDv.setInt16(40, globalXMax);
  headDv.setInt16(42, globalYMax);
  headDv.setUint16(44, 0);         // macStyle
  headDv.setUint16(46, 8);         // lowestRecPPEM
  headDv.setInt16(48, 2);          // fontDirectionHint
  headDv.setInt16(50, 1);          // indexToLocFormat = 1 (long offsets)
  headDv.setInt16(52, 0);          // glyphDataFormat

  // Build hhea table (36 bytes)
  const hheaBuf = new ArrayBuffer(36);
  const hheaDv = new DataView(hheaBuf);
  hheaDv.setUint32(0, 0x00010000);
  hheaDv.setInt16(4, m.asc + 120);  // ascender
  hheaDv.setInt16(6, m.desc - 60);  // descender
  hheaDv.setInt16(8, 90);           // lineGap
  hheaDv.setUint16(10, maxAdvance);
  hheaDv.setInt16(16, globalXMax);
  hheaDv.setInt16(18, 1);           // caretSlopeRise
  hheaDv.setUint16(34, numGlyphs);  // numberOfHMetrics

  // Build maxp table (32 bytes, version 1.0)
  const maxpBuf = new ArrayBuffer(32);
  const maxpDv = new DataView(maxpBuf);
  maxpDv.setUint32(0, 0x00010000);
  maxpDv.setUint16(4, numGlyphs);
  maxpDv.setUint16(6, maxPoints);
  maxpDv.setUint16(8, maxContours);

  // Build OS/2 table (78 bytes, version 1)
  const os2Buf = new ArrayBuffer(78);
  const os2Dv = new DataView(os2Buf);
  os2Dv.setUint16(0, 1); // version 1
  os2Dv.setInt16(2, 580);
  os2Dv.setUint16(4, Math.round(Math.max(100, Math.min(900, m.p.weight)))); // usWeightClass
  os2Dv.setUint16(6, 5); // usWidthClass = Medium
  os2Dv.setInt16(10, 650);
  os2Dv.setInt16(12, 600);
  os2Dv.setInt16(16, 650);
  os2Dv.setInt16(18, 600);
  os2Dv.setInt16(22, 50);
  os2Dv.setInt16(24, 280);
  os2Dv.setUint16(62, 0x0040); // fsSelection = REGULAR
  os2Dv.setUint16(64, 0x0020); // usFirstCharIndex
  os2Dv.setUint16(66, 0x201D); // usLastCharIndex
  os2Dv.setInt16(68, m.asc + 120);
  os2Dv.setInt16(70, m.desc - 60);
  os2Dv.setInt16(72, 90);
  os2Dv.setUint16(74, m.asc + 120);
  os2Dv.setUint16(76, Math.abs(m.desc - 60));

  // Build post table (32 bytes, version 3.0)
  const postBuf = new ArrayBuffer(32);
  const postDv = new DataView(postBuf);
  postDv.setUint32(0, 0x00030000);
  postDv.setInt16(8, -100);
  postDv.setInt16(10, 50);

  // Build cmap table (Format 4, single-character segments + 0xFFFF terminator)
  const segCount = numGlyphs; // includes 1-to-1 segments for glyphs[1..numGlyphs-1] + 0xFFFF end segment
  const segCountX2 = segCount * 2;
  const searchRange = 2 * Math.pow(2, Math.floor(Math.log2(segCount)));
  const entrySelector = Math.floor(Math.log2(segCount));
  const rangeShift = segCountX2 - searchRange;
  const subtableLen = 16 + segCount * 8;
  const cmapBuf = new ArrayBuffer(12 + subtableLen);
  const cmapDv = new DataView(cmapBuf);
  cmapDv.setUint16(0, 0); // version
  cmapDv.setUint16(2, 1); // numTables = 1
  cmapDv.setUint16(4, 3); // platformID = Windows
  cmapDv.setUint16(6, 1); // encodingID = Unicode BMP
  cmapDv.setUint32(8, 12); // offset

  let cOff = 12;
  cmapDv.setUint16(cOff, 4); cOff += 2; // format 4
  cmapDv.setUint16(cOff, subtableLen); cOff += 2;
  cmapDv.setUint16(cOff, 0); cOff += 2; // language
  cmapDv.setUint16(cOff, segCountX2); cOff += 2;
  cmapDv.setUint16(cOff, searchRange); cOff += 2;
  cmapDv.setUint16(cOff, entrySelector); cOff += 2;
  cmapDv.setUint16(cOff, rangeShift); cOff += 2;

  // endCode array
  for (let i = 1; i < numGlyphs; i++) {
    cmapDv.setUint16(cOff, glyphs[i].code); cOff += 2;
  }
  cmapDv.setUint16(cOff, 0xFFFF); cOff += 2;
  cmapDv.setUint16(cOff, 0); cOff += 2; // reservedPad

  // startCode array
  for (let i = 1; i < numGlyphs; i++) {
    cmapDv.setUint16(cOff, glyphs[i].code); cOff += 2;
  }
  cmapDv.setUint16(cOff, 0xFFFF); cOff += 2;

  // idDelta array
  for (let i = 1; i < numGlyphs; i++) {
    const delta = (i - glyphs[i].code) & 0xFFFF;
    cmapDv.setUint16(cOff, delta); cOff += 2;
  }
  cmapDv.setUint16(cOff, 1); cOff += 2;

  // idRangeOffset array (all 0)
  for (let i = 0; i < segCount; i++) {
    cmapDv.setUint16(cOff, 0); cOff += 2;
  }

  // Build name table
  const psName = familyName.replace(/[^A-Za-z0-9]/g, '') || 'FONTR55Custom';
  const nameRecords = [
    [1, familyName],
    [2, 'Regular'],
    [3, `${psName}-${Date.now()}`],
    [4, familyName],
    [5, 'Version 1.000; FONTR55 Parametric Foundry'],
    [6, psName],
  ];
  const encodedStrings = nameRecords.map(([, str]) => {
    const b = new Uint8Array(str.length * 2);
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      b[i * 2] = (code >> 8) & 0xFF;
      b[i * 2 + 1] = code & 0xFF;
    }
    return b;
  });
  const storageSize = encodedStrings.reduce((s, b) => s + b.length, 0);
  const nameHeaderSize = 6 + nameRecords.length * 12;
  const nameBuf = new ArrayBuffer(nameHeaderSize + storageSize);
  const nameDv = new DataView(nameBuf);
  const nameBytes = new Uint8Array(nameBuf);
  nameDv.setUint16(0, 0);
  nameDv.setUint16(2, nameRecords.length);
  nameDv.setUint16(4, nameHeaderSize);

  let strOffset = 0;
  nameRecords.forEach(([nameId], idx) => {
    const rOff = 6 + idx * 12;
    const strBytes = encodedStrings[idx];
    nameDv.setUint16(rOff, 3);      // platformID = 3 (Windows)
    nameDv.setUint16(rOff + 2, 1);  // encodingID = 1 (Unicode BMP)
    nameDv.setUint16(rOff + 4, 0x0409); // en-US
    nameDv.setUint16(rOff + 6, nameId);
    nameDv.setUint16(rOff + 8, strBytes.length);
    nameDv.setUint16(rOff + 10, strOffset);
    nameBytes.set(strBytes, nameHeaderSize + strOffset);
    strOffset += strBytes.length;
  });

  const tables = [
    ['OS/2', new Uint8Array(os2Buf)],
    ['cmap', new Uint8Array(cmapBuf)],
    ['glyf', glyfTable],
    ['head', new Uint8Array(headBuf)],
    ['hhea', new Uint8Array(hheaBuf)],
    ['hmtx', new Uint8Array(hmtxBuf)],
    ['loca', new Uint8Array(locaBuf)],
    ['maxp', new Uint8Array(maxpBuf)],
    ['name', nameBytes],
    ['post', new Uint8Array(postBuf)],
  ].sort((a, b) => (a[0] < b[0] ? -1 : 1));

  const numTables = tables.length;
  const dirHeaderLen = 12 + numTables * 16;
  let totalFontSize = dirHeaderLen;
  for (const [, data] of tables) {
    totalFontSize += (data.length + 3) & ~3;
  }

  const fontBuf = new ArrayBuffer(totalFontSize);
  const fontDv = new DataView(fontBuf);
  const fontBytes = new Uint8Array(fontBuf);

  const tblSearchRange = 16 * Math.pow(2, Math.floor(Math.log2(numTables)));
  const tblEntrySelector = Math.floor(Math.log2(numTables));
  const tblRangeShift = numTables * 16 - tblSearchRange;

  fontDv.setUint32(0, 0x00010000);
  fontDv.setUint16(4, numTables);
  fontDv.setUint16(6, tblSearchRange);
  fontDv.setUint16(8, tblEntrySelector);
  fontDv.setUint16(10, tblRangeShift);

  let dataOffset = dirHeaderLen;
  tables.forEach(([tag, data], idx) => {
    const recOff = 12 + idx * 16;
    for (let c = 0; c < 4; c++) {
      fontDv.setUint8(recOff + c, tag.charCodeAt(c));
    }
    fontBytes.set(data, dataOffset);
    const padded = (data.length + 3) & ~3;
    let sum = 0;
    for (let p = 0; p < padded; p += 4) {
      sum = (sum + fontDv.getUint32(dataOffset + p)) >>> 0;
    }
    fontDv.setUint32(recOff + 4, sum);
    fontDv.setUint32(recOff + 8, dataOffset);
    fontDv.setUint32(recOff + 12, data.length);
    dataOffset += padded;
  });

  return fontBuf;
}
