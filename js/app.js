/**
 * FONTR55 — Interactive Parametric Typeface Studio Controller
 */

import { DEFAULT_PARAMS, computeMetrics, buildGlyph, exportLinesToSVG } from './font-engine.js';
import { buildTrueTypeFont } from './truetype-builder.js';
import { STYLE_PRESETS, SLIDER_COLUMNS, CHARACTER_SETS } from './presets.js';

const ACCESS_CODE = 'FONTR55';
const STORAGE_AUTH_KEY = 'fontr55_studio_unlocked';

const state = {
  params: { ...DEFAULT_PARAMS },
  activeSets: {
    capitals: true,
    lowercase: true,
    figures: true,
    symbols: false,
    accents: false,
  },
  lines: [
    CHARACTER_SETS.capitals,
    CHARACTER_SETS.lowercase,
    CHARACTER_SETS.figures,
  ],
  activePresetId: 'specimen-84',
  inspectorMode: false,
  // Interactive cursor & selection in specimen
  focused: false,
  caret: { row: 0, col: 26 },
  selection: null, // { r1, c1, r2, c2 }
  isDraggingSelection: false,
  dragAnchor: null,
  glyphHitBoxes: [], // [{ row, col, x, y, w, h }]
  // Undo / Redo history
  history: [],
  historyIndex: -1,
  animFrameId: null,
};

// DOM References
const authGate = document.getElementById('auth-gate');
const authForm = document.getElementById('auth-form');
const passwordInput = document.getElementById('access-password');
const togglePasswordBtn = document.getElementById('toggle-password-btn');
const authError = document.getElementById('auth-error');
const appShell = document.getElementById('app-shell');

const sizeSlider = document.getElementById('size-slider');
const sizeReadout = document.getElementById('size-readout');
const summaryWeight = document.getElementById('summary-weight');
const summaryWidth = document.getElementById('summary-width');
const summaryExtra = document.getElementById('summary-extra');

const btnUndo = document.getElementById('btn-undo');
const btnRedo = document.getElementById('btn-redo');
const btnInspector = document.getElementById('btn-inspector');
const btnReset = document.getElementById('btn-reset');
const btnExportTTF = document.getElementById('btn-export-ttf');
const btnExportSVG = document.getElementById('btn-export-svg');
const btnLock = document.getElementById('btn-lock');
const btnFullAlphabet = document.getElementById('btn-full-alphabet');
const toolbarStatus = document.getElementById('toolbar-status');

const presetButtonsContainer = document.getElementById('preset-buttons');
const specimenStage = document.getElementById('specimen-stage');
const specimenSvg = document.getElementById('specimen-svg');
const sliderColumnsGrid = document.getElementById('slider-columns-grid');

// Map of slider key -> { input, valueEl }
const sliderControls = new Map();
const toggleControls = new Map();
let xyPadEl = null;
let xyHandleEl = null;
let xyCrossV = null;
let xyCrossH = null;
let activeRefCardEl = null;

/**
 * Initialize Authentication Gate (Password: FONTR55)
 */
function initAuthGate() {
  const isUnlocked = sessionStorage.getItem(STORAGE_AUTH_KEY) === 'true';
  if (isUnlocked) {
    unlockStudio(false);
  } else {
    passwordInput.focus();
  }

  togglePasswordBtn.addEventListener('click', () => {
    const showing = togglePasswordBtn.getAttribute('aria-pressed') === 'true';
    const nextState = !showing;
    togglePasswordBtn.setAttribute('aria-pressed', String(nextState));
    togglePasswordBtn.textContent = nextState ? 'Hide' : 'Show';
    passwordInput.type = nextState ? 'text' : 'password';
    passwordInput.focus();
  });

  // Clear error state on input (per modern-web-guidance `forms`)
  passwordInput.addEventListener('input', () => {
    passwordInput.setCustomValidity('');
    passwordInput.removeAttribute('aria-invalid');
    authError.hidden = true;
  });

  authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const entered = passwordInput.value.trim();
    if (entered === ACCESS_CODE || entered.toUpperCase() === ACCESS_CODE) {
      sessionStorage.setItem(STORAGE_AUTH_KEY, 'true');
      unlockStudio(true);
    } else {
      passwordInput.setAttribute('aria-invalid', 'true');
      passwordInput.setCustomValidity('Invalid studio password.');
      authError.hidden = false;
      passwordInput.focus();
      passwordInput.select();
    }
  });

  btnLock.addEventListener('click', () => {
    sessionStorage.removeItem(STORAGE_AUTH_KEY);
    authGate.hidden = false;
    appShell.setAttribute('inert', '');
    passwordInput.value = '';
    passwordInput.removeAttribute('aria-invalid');
    authError.hidden = true;
    passwordInput.focus();
    announceStatus('Studio locked.');
  });
}

function unlockStudio(announce = true) {
  authGate.hidden = true;
  appShell.removeAttribute('inert');
  if (announce) {
    announceStatus('FONTR55 Type Lab unlocked.');
  }
}

/**
 * Sync native range slider CSS custom properties for cross-browser track progress
 */
function syncSliderCSSVars(slider, unit = '') {
  const min = slider.min || 0;
  const max = slider.max || 100;
  const val = slider.value;
  slider.style.setProperty('--attr-min', min);
  slider.style.setProperty('--attr-max', max);
  slider.style.setProperty('--control-value', val);
  slider.setAttribute('aria-valuetext', `${val}${unit}`);
}

/**
 * Build the 5-Column Parametric Slider Matrix & 2D XY Pad
 */
function buildBottomControlDeck() {
  sliderColumnsGrid.innerHTML = '';

  for (const col of SLIDER_COLUMNS) {
    const colEl = document.createElement('div');
    colEl.className = 'param-column';

    const titleEl = document.createElement('h2');
    titleEl.className = 'param-group-title';
    titleEl.textContent = col.title;
    colEl.append(titleEl);

    for (const s of col.sliders) {
      colEl.append(createSliderItem(s));
    }

    // 2D XY Design-Space Pad in Column 1 (Weight x Width)
    if (col.hasXYPad) {
      const xyWrap = document.createElement('div');
      xyWrap.className = 'xy-pad-wrap';
      xyWrap.innerHTML = `
        <div class="xy-pad" id="xy-pad" role="application" tabindex="0" aria-label="2D Weight and Width Design Space Pad. Use arrow keys or drag to adjust Weight and Width simultaneously.">
          <div class="xy-pad-top-bar"></div>
          <div class="xy-pad-crosshair-v" id="xy-cross-v"></div>
          <div class="xy-pad-crosshair-h" id="xy-cross-h"></div>
          <div class="xy-pad-handle" id="xy-handle"></div>
        </div>
        <div class="xy-pad-caption">
          <span>X: Width (50–140%)</span>
          <span>Y: Weight (100–1000)</span>
        </div>
      `;
      colEl.append(xyWrap);
      xyPadEl = xyWrap.querySelector('#xy-pad');
      xyHandleEl = xyWrap.querySelector('#xy-handle');
      xyCrossV = xyWrap.querySelector('#xy-cross-v');
      xyCrossH = xyWrap.querySelector('#xy-cross-h');
      setupXYPadInteractions(xyPadEl);
    }

    if (col.subGroup) {
      const subEl = document.createElement('div');
      subEl.className = 'param-subgroup';
      const subTitle = document.createElement('h3');
      subTitle.className = 'param-group-title';
      subTitle.textContent = col.subGroup.title;
      subEl.append(subTitle);
      for (const s of col.subGroup.sliders) {
        subEl.append(createSliderItem(s));
      }
      colEl.append(subEl);
    }

    if (col.toggles) {
      const altGroup = document.createElement('div');
      altGroup.className = 'alternates-group';
      const altTitle = document.createElement('h3');
      altTitle.className = 'param-group-title';
      altTitle.textContent = 'Glyph Alternates';
      altGroup.append(altTitle);

      for (const t of col.toggles) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'alt-toggle-btn';
        const isPressed = Boolean(state.params[t.key]);
        btn.setAttribute('aria-pressed', String(isPressed));
        btn.innerHTML = `<span>${t.label}</span><span class="alt-state">${isPressed ? 'ON' : 'OFF'}</span>`;
        btn.addEventListener('click', () => {
          const next = state.params[t.key] ? 0 : 1;
          state.params[t.key] = next;
          state.activePresetId = null;
          updateAllControlsFromState();
          renderSpecimen();
          pushHistorySnapshot();
        });
        toggleControls.set(t.key, btn);
        altGroup.append(btn);
      }

      const refCard = document.createElement('div');
      refCard.className = 'ref-card';
      refCard.id = 'active-ref-card';
      refCard.innerHTML = `
        <strong>Heavy Display 84</strong>
        <span>Screenshot Default · Weight 1000 · Width 84%</span>
      `;
      activeRefCardEl = refCard;
      colEl.append(altGroup, refCard);
    }

    sliderColumnsGrid.append(colEl);
  }
}

function createSliderItem(s) {
  const wrap = document.createElement('div');
  wrap.className = 'slider-item';

  const id = `param-slider-${s.key}`;
  const header = document.createElement('div');
  header.className = 'slider-header';

  const label = document.createElement('label');
  label.className = 'slider-label';
  label.htmlFor = id;
  label.textContent = s.label;
  label.title = 'Double-click to reset parameter';

  const valSpan = document.createElement('span');
  valSpan.className = 'slider-value';
  valSpan.textContent = `${state.params[s.key]}${s.unit}`;

  header.append(label, valSpan);

  const input = document.createElement('input');
  input.type = 'range';
  input.id = id;
  input.className = 'range-slider';
  input.min = String(s.min);
  input.max = String(s.max);
  input.step = String(s.step);
  input.value = String(state.params[s.key]);
  syncSliderCSSVars(input, s.unit);

  input.addEventListener('input', () => {
    cancelMorphAnimation();
    state.params[s.key] = Number(input.value);
    state.activePresetId = null;
    valSpan.textContent = `${state.params[s.key]}${s.unit}`;
    syncSliderCSSVars(input, s.unit);
    updateXYPadPosition();
    updateTopSummary();
    updatePresetPills();
    renderSpecimen();
  });

  input.addEventListener('change', () => {
    pushHistorySnapshot();
  });

  // Double-click label or slider to reset single parameter
  const resetSingle = () => {
    cancelMorphAnimation();
    state.params[s.key] = DEFAULT_PARAMS[s.key];
    updateAllControlsFromState();
    renderSpecimen();
    pushHistorySnapshot();
  };
  label.addEventListener('dblclick', resetSingle);
  input.addEventListener('dblclick', resetSingle);

  sliderControls.set(s.key, { input, valSpan, spec: s });
  wrap.append(header, input);
  return wrap;
}

/**
 * 2D XY Pad for simultaneous Weight & Width control
 */
function setupXYPadInteractions(pad) {
  let dragging = false;

  const updateFromPointer = (e) => {
    const rect = pad.getBoundingClientRect();
    const normX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const normY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    // X = Width (50..140), Y = top is Weight 1000, bottom is Weight 100
    state.params.width = Math.round(50 + normX * 90);
    state.params.weight = Math.round(1000 - normY * 900);
    state.activePresetId = null;
    updateAllControlsFromState();
    renderSpecimen();
  };

  pad.addEventListener('pointerdown', (e) => {
    cancelMorphAnimation();
    dragging = true;
    pad.setPointerCapture(e.pointerId);
    updateFromPointer(e);
  });

  pad.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    updateFromPointer(e);
  });

  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    pushHistorySnapshot();
  };
  pad.addEventListener('pointerup', endDrag);
  pad.addEventListener('pointercancel', endDrag);

  pad.addEventListener('keydown', (e) => {
    let handled = true;
    if (e.key === 'ArrowRight') state.params.width = Math.min(140, state.params.width + 2);
    else if (e.key === 'ArrowLeft') state.params.width = Math.max(50, state.params.width - 2);
    else if (e.key === 'ArrowUp') state.params.weight = Math.min(1000, state.params.weight + 20);
    else if (e.key === 'ArrowDown') state.params.weight = Math.max(100, state.params.weight - 20);
    else handled = false;

    if (handled) {
      e.preventDefault();
      state.activePresetId = null;
      updateAllControlsFromState();
      renderSpecimen();
      pushHistorySnapshot();
    }
  });
}

function updateXYPadPosition() {
  if (!xyHandleEl) return;
  const xPct = ((state.params.width - 50) / 90) * 100;
  const yPct = ((1000 - state.params.weight) / 900) * 100;
  const cx = `${Math.max(2, Math.min(98, xPct))}%`;
  const cy = `${Math.max(6, Math.min(94, yPct))}%`;
  xyHandleEl.style.insetInlineStart = cx;
  xyHandleEl.style.insetBlockStart = cy;
  xyCrossV.style.insetInlineStart = cx;
  xyCrossH.style.insetBlockStart = cy;
}

/**
 * Build Reference Font Style Preset Pills
 */
function buildPresetBar() {
  presetButtonsContainer.innerHTML = '';
  for (const preset of STYLE_PRESETS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'preset-pill';
    btn.dataset.presetId = preset.id;
    btn.setAttribute('aria-pressed', String(state.activePresetId === preset.id));
    btn.title = preset.refFont;
    btn.textContent = preset.name;

    btn.addEventListener('click', () => {
      morphToPreset(preset);
    });
    presetButtonsContainer.append(btn);
  }
}

function updatePresetPills() {
  const buttons = presetButtonsContainer.querySelectorAll('.preset-pill');
  buttons.forEach((btn) => {
    const isMatch = btn.dataset.presetId === state.activePresetId;
    btn.setAttribute('aria-pressed', String(isMatch));
  });

  if (activeRefCardEl) {
    const preset = STYLE_PRESETS.find((p) => p.id === state.activePresetId);
    if (preset) {
      activeRefCardEl.innerHTML = `
        <strong>${preset.name} (${preset.tag})</strong>
        <span>${preset.refFont}</span>
      `;
    } else {
      activeRefCardEl.innerHTML = `
        <strong>Custom Parametric Blend</strong>
        <span>Weight ${Math.round(state.params.weight)} · Width ${Math.round(state.params.width)}% · Spurless ${Math.round(state.params.spurless)}% · Traps ${Math.round(state.params.inkTraps)}%</span>
      `;
    }
  }
}

/**
 * Smoothly animate all sliders & morph the font to a target preset
 */
function morphToPreset(preset) {
  cancelMorphAnimation();
  state.activePresetId = preset.id;
  const startParams = { ...state.params };
  const targetParams = { ...preset.params, size: state.params.size };
  const duration = 420;
  const startTime = performance.now();

  const tick = (now) => {
    const t = Math.min(1, (now - startTime) / duration);
    // Cubic ease-out
    const ease = 1 - Math.pow(1 - t, 3);

    for (const key of Object.keys(targetParams)) {
      if (key === 'singleStoryA' || key === 'doubleStoryG' || key === 'slashedZero') {
        state.params[key] = t > 0.5 ? targetParams[key] : startParams[key];
      } else {
        const val = startParams[key] + (targetParams[key] - startParams[key]) * ease;
        const spec = sliderControls.get(key)?.spec;
        state.params[key] = spec && spec.step === 0.5 ? Math.round(val * 2) / 2 : Math.round(val);
      }
    }

    updateAllControlsFromState();
    renderSpecimen();

    if (t < 1) {
      state.animFrameId = requestAnimationFrame(tick);
    } else {
      state.animFrameId = null;
      pushHistorySnapshot();
      announceStatus(`Morphed to ${preset.name} (${preset.refFont})`);
    }
  };

  state.animFrameId = requestAnimationFrame(tick);
}

function cancelMorphAnimation() {
  if (state.animFrameId) {
    cancelAnimationFrame(state.animFrameId);
    state.animFrameId = null;
  }
}

function updateTopSummary() {
  summaryWeight.textContent = String(Math.round(state.params.weight));
  summaryWidth.textContent = `${Math.round(state.params.width)}%`;

  const badges = [];
  if (state.params.spurless > 0) badges.push(`Spurless ${Math.round(state.params.spurless)}%`);
  if (state.params.inkTraps > 0) badges.push(`Ink Traps ${Math.round(state.params.inkTraps)}%`);
  if (state.params.elegance > 0) badges.push(`Elegance ${Math.round(state.params.elegance)}%`);
  if (state.params.roundness > 0) badges.push(`ROND ${Math.round(state.params.roundness)}%`);

  summaryExtra.textContent = badges.length > 0 ? ` · ${badges.join(' · ')}` : '';
}

function updateAllControlsFromState() {
  sizeSlider.value = String(state.params.size);
  sizeReadout.textContent = `${Math.round(state.params.size)}%`;
  syncSliderCSSVars(sizeSlider, '%');

  for (const [key, { input, valSpan, spec }] of sliderControls.entries()) {
    const val = state.params[key];
    input.value = String(val);
    valSpan.textContent = `${val}${spec.unit}`;
    syncSliderCSSVars(input, spec.unit);
  }

  for (const [key, btn] of toggleControls.entries()) {
    const on = Boolean(state.params[key]);
    btn.setAttribute('aria-pressed', String(on));
    const stateSpan = btn.querySelector('.alt-state');
    if (stateSpan) stateSpan.textContent = on ? 'ON' : 'OFF';
  }

  document.querySelectorAll('[data-charset]').forEach((btn) => {
    const setKey = btn.dataset.charset;
    btn.setAttribute('aria-pressed', String(Boolean(state.activeSets[setKey])));
  });

  updateXYPadPosition();
  updateTopSummary();
  updatePresetPills();
}

/**
 * Render the Live Interactive Specimen SVG
 */
function renderSpecimen() {
  const m = computeMetrics(state.params);
  const padX = 36;
  const lineGap = 1090;
  const firstBaselineY = 850;

  state.glyphHitBoxes = [];
  const svgElements = [];
  let maxRowWidth = 1200;

  const nonEmptyLines = state.lines.length > 0 ? state.lines : [''];
  const totalChars = nonEmptyLines.reduce((acc, l) => acc + l.length, 0);

  nonEmptyLines.forEach((lineText, rowIdx) => {
    const baselineY = firstBaselineY + rowIdx * lineGap;
    let cursorX = padX;

    // Optional Vector Metric Guides (Baseline, X-Height, Cap Height, Ascender, Descender)
    if (state.inspectorMode) {
      const guides = [
        { y: baselineY - m.asc, label: `Asc ${m.asc}`, color: '#b8b4a6', dash: '8 8' },
        { y: baselineY - m.cap, label: `Cap ${m.cap}`, color: '#d9381e', dash: 'none' },
        { y: baselineY - m.xh, label: `xH ${m.xh}`, color: '#2b6cb0', dash: '6 6' },
        { y: baselineY, label: 'Baseline 0', color: '#111110', dash: 'none' },
        { y: baselineY - m.desc, label: `Desc ${m.desc}`, color: '#b8b4a6', dash: '8 8' },
      ];
      for (const g of guides) {
        svgElements.push(
          `<line x1="0" y1="${g.y}" x2="22000" y2="${g.y}" stroke="${g.color}" stroke-width="3" stroke-dasharray="${g.dash}" opacity="0.45" />`,
          `<text x="8" y="${g.y - 12}" fill="${g.color}" font-family="monospace" font-size="38" opacity="0.75">${g.label}</text>`
        );
      }
    }

    for (let colIdx = 0; colIdx < lineText.length; colIdx++) {
      const ch = lineText[colIdx];
      const glyph = buildGlyph(ch, m);
      const cellX = cursorX;
      const cellW = glyph.advanceWidth;
      const cellTop = baselineY - m.asc - 60;
      const cellH = m.asc - m.desc + 120;

      state.glyphHitBoxes.push({
        row: rowIdx,
        col: colIdx,
        x: cellX,
        y: cellTop,
        w: cellW,
        h: cellH,
      });

      const isSelected = isCellSelected(rowIdx, colIdx);
      if (isSelected) {
        svgElements.push(
          `<rect class="glyph-selection-box" x="${cellX}" y="${cellTop}" width="${cellW}" height="${cellH}" rx="8" />`
        );
      }

      const d = glyph.compiler.toSVGPath(cursorX, baselineY, 1);
      if (d) {
        svgElements.push(
          `<path class="glyph-cell" data-row="${rowIdx}" data-col="${colIdx}" d="${d}" fill="${
            state.inspectorMode ? 'rgba(17,17,16,0.16)' : '#111110'
          }" stroke="${state.inspectorMode ? '#111110' : 'none'}" stroke-width="${
            state.inspectorMode ? '5' : '0'
          }" />`
        );
      }

      // In Vector Guides mode, render Cubic Bézier anchor points and off-curve handles!
      if (state.inspectorMode) {
        const slant = m.slantTan;
        const tx = (x, y) => x + y * slant + cursorX;
        const ty = (y) => baselineY - y;
        for (const c of glyph.contours) {
          let prevX = 0, prevY = 0;
          for (const seg of c) {
            if (seg.cmd === 'M' || seg.cmd === 'L') {
              const px = tx(seg.x, seg.y);
              const py = ty(seg.y);
              svgElements.push(
                `<rect x="${px - 8}" y="${py - 8}" width="16" height="16" fill="#111110" />`
              );
              prevX = px;
              prevY = py;
            } else if (seg.cmd === 'C') {
              const c1x = tx(seg.c1x, seg.c1y);
              const c1y = ty(seg.c1y);
              const c2x = tx(seg.c2x, seg.c2y);
              const c2y = ty(seg.c2y);
              const px = tx(seg.x, seg.y);
              const py = ty(seg.y);
              svgElements.push(
                `<line x1="${prevX}" y1="${prevY}" x2="${c1x}" y2="${c1y}" stroke="#d9381e" stroke-width="2.5" opacity="0.65" />`,
                `<line x1="${px}" y1="${py}" x2="${c2x}" y2="${c2y}" stroke="#d9381e" stroke-width="2.5" opacity="0.65" />`,
                `<circle cx="${c1x}" cy="${c1y}" r="6" fill="#ffffff" stroke="#d9381e" stroke-width="2.5" />`,
                `<circle cx="${c2x}" cy="${c2y}" r="6" fill="#ffffff" stroke="#d9381e" stroke-width="2.5" />`,
                `<rect x="${px - 7}" y="${py - 7}" width="14" height="14" fill="#111110" />`
              );
              prevX = px;
              prevY = py;
            }
          }
        }
      }

      cursorX += cellW;
    }

    // End-of-line hitbox
    state.glyphHitBoxes.push({
      row: rowIdx,
      col: lineText.length,
      x: cursorX,
      y: baselineY - m.asc - 60,
      w: 240,
      h: m.asc - m.desc + 120,
    });

    // Draw Caret if focused and no range selection
    if (state.focused && !state.selection && state.caret.row === rowIdx) {
      const caretCol = Math.min(state.caret.col, lineText.length);
      let caretX = padX;
      for (let c = 0; c < caretCol; c++) {
        caretX += buildGlyph(lineText[c], m).advanceWidth;
      }
      svgElements.push(
        `<line class="specimen-caret" x1="${caretX}" y1="${baselineY - m.asc - 25}" x2="${caretX}" y2="${
          baselineY - m.desc + 25
        }" />`
      );
    }

    maxRowWidth = Math.max(maxRowWidth, cursorX + padX);
  });

  // Base coordinate width is ~16650 UPM for the 26-letter alphabet at Width 84%
  // Scale viewBox smoothly with the Size slider and focus zoom when only a few letters are kept
  const sizeScale = state.params.size / 100;
  const focusZoom = totalChars > 0 && totalChars <= 8 ? Math.min(2.2, 10 / Math.max(2, totalChars)) : 1;
  const effectiveScale = sizeScale * focusZoom;

  const viewWidth = Math.max(maxRowWidth, 16650 / effectiveScale);
  const viewHeight = Math.max(1100, firstBaselineY + (nonEmptyLines.length - 1) * lineGap + 310);

  specimenSvg.setAttribute('viewBox', `0 0 ${Math.round(viewWidth)} ${Math.round(viewHeight)}`);
  specimenSvg.innerHTML = svgElements.join('');
}

/**
 * Interactive Specimen Caret, Selection, Typing & Deletion
 */
function setupSpecimenInteractions() {
  const clientToSVGPoint = (e) => {
    const pt = specimenSvg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = specimenSvg.getScreenCTM();
    return ctm ? pt.matrixTransform(ctm.inverse()) : { x: 0, y: 0 };
  };

  const hitTestCaret = (svgPt) => {
    let bestRow = 0;
    let minRowDist = Infinity;
    for (const box of state.glyphHitBoxes) {
      const cy = box.y + box.h * 0.5;
      const d = Math.abs(svgPt.y - cy);
      if (d < minRowDist) {
        minRowDist = d;
        bestRow = box.row;
      }
    }

    const rowBoxes = state.glyphHitBoxes.filter((b) => b.row === bestRow);
    for (const box of rowBoxes) {
      if (svgPt.x <= box.x + box.w * 0.55) {
        return { row: bestRow, col: box.col };
      }
    }
    const last = rowBoxes[rowBoxes.length - 1];
    return { row: bestRow, col: last ? last.col : 0 };
  };

  specimenStage.addEventListener('focus', () => {
    state.focused = true;
    renderSpecimen();
  });

  specimenStage.addEventListener('blur', () => {
    state.focused = false;
    renderSpecimen();
  });

  specimenStage.addEventListener('pointerdown', (e) => {
    specimenStage.focus();
    const pos = hitTestCaret(clientToSVGPoint(e));
    state.caret = pos;
    state.dragAnchor = pos;
    state.selection = null;
    state.isDraggingSelection = true;
    specimenStage.setPointerCapture(e.pointerId);
    renderSpecimen();
  });

  specimenStage.addEventListener('pointermove', (e) => {
    if (!state.isDraggingSelection || !state.dragAnchor) return;
    const pos = hitTestCaret(clientToSVGPoint(e));
    state.caret = pos;
    if (pos.row !== state.dragAnchor.row || pos.col !== state.dragAnchor.col) {
      state.selection = normalizeSelection(state.dragAnchor, pos);
    } else {
      state.selection = null;
    }
    renderSpecimen();
  });

  const endSelect = () => {
    state.isDraggingSelection = false;
  };
  specimenStage.addEventListener('pointerup', endSelect);
  specimenStage.addEventListener('pointercancel', endSelect);

  specimenStage.addEventListener('keydown', (e) => {
    if (e.isComposing) return;

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      const lastRow = Math.max(0, state.lines.length - 1);
      state.selection = {
        r1: 0,
        c1: 0,
        r2: lastRow,
        c2: state.lines[lastRow].length,
      };
      renderSpecimen();
      return;
    }

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) performRedo();
      else performUndo();
      return;
    }

    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      if (state.selection) {
        deleteSelection();
      } else if (e.key === 'Backspace') {
        const { row, col } = state.caret;
        if (col > 0) {
          const line = state.lines[row];
          state.lines[row] = line.slice(0, col - 1) + line.slice(col);
          state.caret.col = col - 1;
        } else if (row > 0) {
          const prevLen = state.lines[row - 1].length;
          state.lines[row - 1] += state.lines[row];
          state.lines.splice(row, 1);
          state.caret = { row: row - 1, col: prevLen };
        }
      } else if (e.key === 'Delete') {
        const { row, col } = state.caret;
        const line = state.lines[row] || '';
        if (col < line.length) {
          state.lines[row] = line.slice(0, col) + line.slice(col + 1);
        } else if (row < state.lines.length - 1) {
          state.lines[row] += state.lines[row + 1];
          state.lines.splice(row + 1, 1);
        }
      }
      if (state.lines.length === 0) state.lines = [''];
      renderSpecimen();
      pushHistorySnapshot();
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (state.selection) deleteSelection();
      const { row, col } = state.caret;
      const line = state.lines[row] || '';
      const before = line.slice(0, col);
      const after = line.slice(col);
      state.lines.splice(row, 1, before, after);
      state.caret = { row: row + 1, col: 0 };
      renderSpecimen();
      pushHistorySnapshot();
      return;
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      state.selection = null;
      if (state.caret.col > 0) state.caret.col--;
      else if (state.caret.row > 0) {
        state.caret.row--;
        state.caret.col = state.lines[state.caret.row].length;
      }
      renderSpecimen();
      return;
    }

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      state.selection = null;
      const lineLen = (state.lines[state.caret.row] || '').length;
      if (state.caret.col < lineLen) state.caret.col++;
      else if (state.caret.row < state.lines.length - 1) {
        state.caret.row++;
        state.caret.col = 0;
      }
      renderSpecimen();
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      state.selection = null;
      if (state.caret.row > 0) {
        state.caret.row--;
        state.caret.col = Math.min(state.caret.col, state.lines[state.caret.row].length);
      }
      renderSpecimen();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      state.selection = null;
      if (state.caret.row < state.lines.length - 1) {
        state.caret.row++;
        state.caret.col = Math.min(state.caret.col, state.lines[state.caret.row].length);
      }
      renderSpecimen();
      return;
    }

    if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      if (state.selection) deleteSelection();
      const { row, col } = state.caret;
      const line = state.lines[row] || '';
      state.lines[row] = line.slice(0, col) + e.key + line.slice(col);
      state.caret.col = col + 1;
      renderSpecimen();
      pushHistorySnapshot();
    }
  });
}

function normalizeSelection(a, b) {
  if (a.row < b.row || (a.row === b.row && a.col <= b.col)) {
    return { r1: a.row, c1: a.col, r2: b.row, c2: b.col };
  }
  return { r1: b.row, c1: b.col, r2: a.row, c2: a.col };
}

function isCellSelected(row, col) {
  if (!state.selection) return false;
  const { r1, c1, r2, c2 } = state.selection;
  if (row < r1 || row > r2) return false;
  if (r1 === r2) return col >= c1 && col < c2;
  if (row === r1) return col >= c1;
  if (row === r2) return col < c2;
  return true;
}

function deleteSelection() {
  if (!state.selection) return;
  const { r1, c1, r2, c2 } = state.selection;
  const firstPart = (state.lines[r1] || '').slice(0, c1);
  const lastPart = (state.lines[r2] || '').slice(c2);
  state.lines.splice(r1, r2 - r1 + 1, firstPart + lastPart);
  if (state.lines.length === 0) state.lines = [''];
  state.caret = { row: r1, col: c1 };
  state.selection = null;
}

/**
 * Character Set Toggles & Top Toolbar Actions
 */
function setupTopToolbarActions() {
  sizeSlider.addEventListener('input', () => {
    state.params.size = Number(sizeSlider.value);
    sizeReadout.textContent = `${state.params.size}%`;
    syncSliderCSSVars(sizeSlider, '%');
    renderSpecimen();
  });

  sizeSlider.addEventListener('change', () => {
    pushHistorySnapshot();
  });

  document.querySelectorAll('[data-charset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.charset;
      state.activeSets[key] = !state.activeSets[key];
      // Ensure at least one set stays active if toggling
      if (!Object.values(state.activeSets).some(Boolean)) {
        state.activeSets[key] = true;
      }
      rebuildLinesFromActiveSets();
      updateAllControlsFromState();
      renderSpecimen();
      pushHistorySnapshot();
    });
  });

  btnFullAlphabet.addEventListener('click', () => {
    state.activeSets = {
      capitals: true,
      lowercase: true,
      figures: true,
      symbols: false,
      accents: false,
    };
    rebuildLinesFromActiveSets();
    updateAllControlsFromState();
    renderSpecimen();
    pushHistorySnapshot();
    announceStatus('Restored full alphabet specimen.');
  });

  btnInspector.addEventListener('click', () => {
    state.inspectorMode = !state.inspectorMode;
    btnInspector.setAttribute('aria-pressed', String(state.inspectorMode));
    renderSpecimen();
    announceStatus(state.inspectorMode ? 'Vector Bézier guides enabled.' : 'Vector Bézier guides hidden.');
  });

  btnReset.addEventListener('click', () => {
    cancelMorphAnimation();
    state.params = { ...DEFAULT_PARAMS };
    state.activePresetId = 'specimen-84';
    updateAllControlsFromState();
    renderSpecimen();
    pushHistorySnapshot();
    announceStatus('All sliders reset to default.');
  });

  btnUndo.addEventListener('click', () => {
    if (btnUndo.getAttribute('aria-disabled') === 'true') return;
    performUndo();
  });

  btnRedo.addEventListener('click', () => {
    if (btnRedo.getAttribute('aria-disabled') === 'true') return;
    performRedo();
  });

  btnExportSVG.addEventListener('click', () => {
    const svgString = exportLinesToSVG(state.lines, state.params);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FONTR55-W${Math.round(state.params.weight)}-Wd${Math.round(state.params.width)}.svg`;
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    announceStatus('Exported specimen as clean vector SVG.');
  });

  btnExportTTF.addEventListener('click', () => {
    try {
      const fontBuffer = buildTrueTypeFont(
        state.params,
        `FONTR55 W${Math.round(state.params.weight)}`
      );
      const blob = new Blob([fontBuffer], { type: 'font/ttf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FONTR55-Custom-W${Math.round(state.params.weight)}.ttf`;
      document.body.append(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      announceStatus('Exported installable TrueType (.ttf) font file.');
    } catch (err) {
      console.error(err);
      announceStatus('Font export failed.');
    }
  });
}

function rebuildLinesFromActiveSets() {
  const nextLines = [];
  for (const key of ['capitals', 'lowercase', 'figures', 'symbols', 'accents']) {
    if (state.activeSets[key]) {
      nextLines.push(CHARACTER_SETS[key]);
    }
  }
  state.lines = nextLines.length > 0 ? nextLines : [CHARACTER_SETS.capitals];
  state.selection = null;
  state.caret = { row: 0, col: state.lines[0].length };
}

/**
 * Undo / Redo Snapshot Stack
 */
function pushHistorySnapshot() {
  const snap = JSON.stringify({
    params: state.params,
    activeSets: state.activeSets,
    lines: state.lines,
    activePresetId: state.activePresetId,
  });

  if (state.historyIndex >= 0 && state.history[state.historyIndex] === snap) {
    return;
  }

  state.history = state.history.slice(0, state.historyIndex + 1);
  state.history.push(snap);
  if (state.history.length > 50) state.history.shift();
  state.historyIndex = state.history.length - 1;
  updateUndoRedoButtons();
}

function restoreSnapshot(snapStr) {
  const data = JSON.parse(snapStr);
  state.params = { ...DEFAULT_PARAMS, ...data.params };
  state.activeSets = { ...data.activeSets };
  state.lines = [...data.lines];
  state.activePresetId = data.activePresetId;
  state.selection = null;
  updateAllControlsFromState();
  renderSpecimen();
  updateUndoRedoButtons();
}

function performUndo() {
  if (state.historyIndex <= 0) return;
  state.historyIndex--;
  restoreSnapshot(state.history[state.historyIndex]);
  announceStatus('Undo applied.');
}

function performRedo() {
  if (state.historyIndex >= state.history.length - 1) return;
  state.historyIndex++;
  restoreSnapshot(state.history[state.historyIndex]);
  announceStatus('Redo applied.');
}

function updateUndoRedoButtons() {
  btnUndo.setAttribute('aria-disabled', String(state.historyIndex <= 0));
  btnRedo.setAttribute('aria-disabled', String(state.historyIndex >= state.history.length - 1));
}

function announceStatus(msg) {
  if (toolbarStatus) {
    toolbarStatus.textContent = msg;
  }
}

/**
 * Roving tabindex fallback for `[role="toolbar"]` when native `focusgroup` is unsupported
 * (per modern-web-guidance `toolbar`)
 */
function initToolbarFocusgroupFallback() {
  if ('focusGroup' in HTMLElement.prototype) return;

  document.querySelectorAll('[role="toolbar"]').forEach((bar) => {
    const items = Array.from(bar.querySelectorAll('button'));
    if (items.length === 0) return;

    items.forEach((b, i) => {
      b.tabIndex = i === 0 ? 0 : -1;
    });

    bar.addEventListener('focusin', ({ target }) => {
      if (items.includes(target)) {
        items.forEach((b) => {
          b.tabIndex = b === target ? 0 : -1;
        });
      }
    });

    bar.addEventListener('keydown', (e) => {
      const idx = items.indexOf(document.activeElement);
      if (idx === -1) return;

      const vertical = bar.getAttribute('aria-orientation') === 'vertical';
      const rtl = getComputedStyle(bar).direction === 'rtl';
      const steps = vertical
        ? { ArrowDown: 1, ArrowUp: -1 }
        : { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1 };

      let nextIdx = null;
      if (e.key in steps) {
        nextIdx = (idx + steps[e.key] + items.length) % items.length;
      } else if (e.key === 'Home') {
        nextIdx = 0;
      } else if (e.key === 'End') {
        nextIdx = items.length - 1;
      }

      if (nextIdx !== null) {
        e.preventDefault();
        items[nextIdx].focus();
      }
    });
  });
}

/**
 * Boot FONTR55 Studio
 */
function init() {
  buildBottomControlDeck();
  buildPresetBar();
  setupTopToolbarActions();
  setupSpecimenInteractions();
  initToolbarFocusgroupFallback();
  updateAllControlsFromState();
  renderSpecimen();
  pushHistorySnapshot();
  initAuthGate();
}

init();
