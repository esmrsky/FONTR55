# FONTR55 — Parametric Type Foundry & Morphing Studio

**FONTR55** is a zero-dependency, GitHub-Pages-ready interactive parametric typeface studio inspired by **Google Sans Flex** and extended with surgical foundry axes from contemporary type design:

- **Spurless (`SPUR`)**: Smoothly morphs stem-to-bowl and stem-to-arch junctions from classic spurred grotesques (`0%`) to seamless continuous spurless arches (`100%`, inspired by *LL Circular*, *Universal Sans*, and *Futura*).
- **Surgical Ink Traps (`TRAP`)**: Cuts high-precision triangular/curved ink traps into acute interior vertices and stem-to-bowl shoulders (`0%`–`100%` with independent **Trap Depth** and **Trap Spread** controls, inspired by *ABC Whyte Inktrap* by Dinamo and *Neue Machina* by Pangram Pangram).
- **Grotesque Aperture & Terminal Cut**: Transitions between tight neo-grotesque horizontal terminal cuts (*Neue Haas Grotesk* / *Helvetica Now*) and open humanist apertures.
- **Elegance & High-Contrast Modulation (`ELEG`)**: Modulates horizontal vs. vertical stroke contrast, tilted stress axis (`-25°` to `+30°`), and concave stem waisting/flaring (*Optima* / *Grand Slang*).
- **Superellipse Squaring (`SQUA`) & Corner Roundness (`ROND`)**: Morphs outer and inner bowls from geometric circles to Eurostile/Monument-inspired superellipses while filleting polygon terminals.
- **Live Export (`.SVG` & Installable `.TTF`)**: Export the active specimen directly as clean Cubic Bézier `.svg` artwork or compile an installable binary OpenType/TrueType (`.ttf`) font in-browser.

---

## Access Passcode

The studio is protected by an authentication gate on first load:

- **Passcode**: `FONTR55`

---

## Running Locally or Publishing to GitHub Pages

Because **FONTR55** uses native ES Modules (`js/app.js`, `js/font-engine.js`, `js/presets.js`, `js/truetype-builder.js`) with zero external runtime dependencies, it runs directly on any static file server or GitHub Pages:

```bash
# Serve locally on port 8080
python3 -m http.server 8080
```

Then open `http://localhost:8080` in your browser and enter `FONTR55`.
