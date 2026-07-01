/**
 * ============================================================================
 * EXTERNAL PATTERN FORMAT PARSER & EXPORTER
 * ============================================================================
 *
 * This module reads and writes the text-based string art pattern format used
 * by external string-art applications. The format is a flat text stream with
 * embedded "color change" markers followed by comma-separated pin pairs.
 *
 * ----------------------------------------------------------------------------
 * FORMAT SPECIFICATION
 * ----------------------------------------------------------------------------
 *
 * Overall structure (single line, no newlines required):
 *
 *   ChangeColorR:{r}G:{g}B:{b},{pinA},{pinB},{pinA},{pinB},...ChangeColorR:{r}G:{g}B:{b},{pinA},{pinB},...
 *
 * Fields:
 *
 * 1. COLOR MARKER — `ChangeColorR:{r}G:{g}B:{b}`
 *    - Appears inline whenever the active thread color changes.
 *    - `{r}`, `{g}`, `{b}` are decimal integers 0–255.
 *    - Example: `ChangeColorR:0G:0B:0`       → Black (0,0,0)
 *               `ChangeColorR:255G:0B:0`     → Red   (255,0,0)
 *               `ChangeColorR:255G:255B:0`   → Yellow(255,255,0)
 *               `ChangeColorR:0G:0B:255`     → Blue  (0,0,255)
 *               `ChangeColorR:255G:255B:255` → White (255,255,255)
 *               `ChangeColorR:64G:224B:208`  → Cyan  (64,224,208)
 *    - The first token in the file is always a color marker.
 *    - All subsequent pin pairs belong to that color until the next marker.
 *
 * 2. PIN PAIRS — `{from},{to}`
 *    - Two consecutive integers represent one thread segment: pin `from` to pin `to`.
 *    - Pins are numbered 0 to N-1 (here N = 370).
 *    - Pin layout: evenly distributed around a circle (clockwise from angle 0).
 *    - The integers are comma-separated with no spaces.
 *    - A color marker may appear between any two integers; it does NOT consume
 *      a pin value — it only changes the active color for all following pairs.
 *
 * 3. LAYER ORGANIZATION
 *    - Colors are INTERLEAVED, not strictly sequential.
 *    - The generator alternates between color layers (e.g. Black → Red → Black
 *      → Yellow → Black → ...) based on which area of the image needs work.
 *    - Each contiguous run of one color between two markers is a "sub-pass".
 *    - A full layer for one color may be split across many sub-passes.
 *
 * 4. METADATA
 *    - No header, no footer, no metadata block.
 *    - Pin count is implicit: max(pinNumber) + 1.
 *    - Total line count = (total integers after removing markers) / 2.
 *    - No image, board shape, or dimensions are stored — only pin indices.
 *
 * ----------------------------------------------------------------------------
 * HOW THE PATTERN IS GENERATED (conceptual, not copied)
 * ----------------------------------------------------------------------------
 *
 * The external application:
 *   a. Places N pins evenly around a circle.
 *   b. Converts the source image to grayscale (or per-channel).
 *   c. For each color layer, greedily selects pin-to-pin lines that best
 *      reduce the error between the current canvas and the target image.
 *   d. Interleaves sub-passes across colors so each region gets attention
 *      from every relevant color before deepening any single color.
 *   e. Emits a flat stream of color markers + pin pairs in drawing order.
 *
 * ----------------------------------------------------------------------------
 * INTERNAL DATA MODEL (app's own format)
 * ----------------------------------------------------------------------------
 *
 *   {
 *     numPins:   number,             // e.g. 370
 *     colors:    [{ id, name, hex }], // deduplicated color palette
 *     paths:     [{ from, to, color }] // ordered thread segments
 *   }
 *
 * To implement a compatible EXPORTER, reverse the process:
 *   - Group consecutive paths by color.
 *   - Emit `ChangeColorR:{r}G:{g}B:{b}` whenever the color ID changes.
 *   - After each marker, emit `from,to` for every path in that run.
 *
 * ============================================================================
 */

/**
 * Convert an RGB triple to a hex string (#rrggbb).
 * @param {number} r  Red   (0–255)
 * @param {number} g  Green (0–255)
 * @param {number} b  Blue  (0–255)
 * @returns {string}  Hex color, e.g. "#ff0000"
 */
function rgbToHex(r, g, b) {
  const toHex = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Convert a hex string (#rrggbb) to an {r,g,b} object.
 * @param {string} hex  e.g. "#ff0000"
 * @returns {{r:number,g:number,b:number}}
 */
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

/**
 * Generate a short stable ID from an RGB triple.
 * Uses the hex string without the '#'.
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {string}  e.g. "ff0000"
 */
function colorIdFromRgb(r, g, b) {
  return rgbToHex(r, g, b).slice(1);
}

/**
 * Parse a color marker token.
 * Expected format: "ChangeColorR:255G:0B:0"
 * @param {string} token
 * @returns {{r:number,g:number,b:number}|null}  null if not a valid marker
 */
function parseColorMarker(token) {
  const match = token.match(/ChangeColorR:(\d+)G:(\d+)B:(\d+)/);
  if (!match) return null;
  return {
    r: parseInt(match[1], 10),
    g: parseInt(match[2], 10),
    b: parseInt(match[3], 10),
  };
}

/**
 * ============================================================================
 * PARSER — External text → internal data model
 * ============================================================================
 *
 * @param {string} text  Raw file content (single line or multi-line).
 * @returns {{
 *   numPins: number,
 *   colors: Array<{id:string,name:string,hex:string,count:number}>,
 *   paths: Array<{from:number,to:number,color:string}>,
 *   totalSteps: number,
 *   colorLayers: Array<{colorId:string,startStep:number,endStep:number,count:number}>,
 *   metadata: { rawLength:number, markerCount:number, maxPin:number }
 * }}
 */
export function parsePatternFile(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('parsePatternFile: input must be a non-empty string');
  }

  // Normalize: collapse whitespace/newlines so we can tokenize cleanly.
  // The format uses commas as separators and "ChangeColor" as inline markers.
  const cleaned = text.replace(/\s+/g, '');

  // Split on commas — some tokens will be "ChangeColorR:..G:..B:.." markers,
  // others will be plain integers (pin numbers).
  const tokens = cleaned.split(',').filter((t) => t.length > 0);

  const colors = [];          // deduplicated palette
  const colorMap = {};        // rgbKey → color object
  const paths = [];           // { from, to, color }
  const colorLayers = [];     // { colorId, startStep, endStep, count }

  let currentColorId = null;
  let maxPin = 0;
  let markerCount = 0;
  let pendingFrom = null;     // buffer for the first pin of a pair

  /**
   * Helper: get-or-create a color entry in the palette.
   */
  function ensureColor(r, g, b) {
    const hex = rgbToHex(r, g, b);
    const id = hex.slice(1);
    if (!colorMap[id]) {
      const name = guessColorName(r, g, b);
      const entry = { id, name, hex, count: 0 };
      colorMap[id] = entry;
      colors.push(entry);
    }
    return colorMap[id];
  }

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const marker = parseColorMarker(token);

    if (marker) {
      // --- Color change marker ---
      markerCount++;
      const colorObj = ensureColor(marker.r, marker.g, marker.b);
      currentColorId = colorObj.id;

      // Start a new layer tracking entry if this is a new color OR
      // the previous layer for this color is non-contiguous.
      // We track contiguous sub-passes as separate "layers".
      const lastLayer = colorLayers[colorLayers.length - 1];
      if (!lastLayer || lastLayer.colorId !== currentColorId || lastLayer._closed) {
        colorLayers.push({
          colorId: currentColorId,
          startStep: paths.length,
          endStep: paths.length,
          count: 0,
          _closed: false,
        });
      }
    } else {
      // --- Pin number ---
      const pin = parseInt(token, 10);
      if (isNaN(pin)) {
        // Skip unparseable tokens (shouldn't happen with valid files)
        continue;
      }

      if (pin > maxPin) maxPin = pin;

      if (pendingFrom === null) {
        // First pin of a pair — buffer it
        pendingFrom = pin;
      } else {
        // Second pin — complete the pair
        const from = pendingFrom;
        const to = pin;
        pendingFrom = null;

        if (currentColorId === null) {
          // No color marker seen yet — default to black
          const c = ensureColor(0, 0, 0);
          currentColorId = c.id;
          colorLayers.push({
            colorId: currentColorId,
            startStep: paths.length,
            endStep: paths.length,
            count: 0,
            _closed: false,
          });
        }

        paths.push({ from, to, color: currentColorId });
        colorMap[currentColorId].count++;

        const layer = colorLayers[colorLayers.length - 1];
        layer.endStep = paths.length;
        layer.count++;
      }
    }
  }

  // Close all layers
  colorLayers.forEach((l) => { l._closed = true; delete l._closed; });

  // Merge adjacent layers of the same color for a cleaner summary
  const mergedLayers = mergeContiguousLayers(colorLayers);

  return {
    numPins: maxPin + 1,
    colors,
    paths,
    totalSteps: paths.length,
    colorLayers: mergedLayers,
    metadata: {
      rawLength: text.length,
      markerCount,
      maxPin,
      pinCount: maxPin + 1,
    },
  };
}

/**
 * Merge contiguous sub-passes of the same color into single layer entries.
 * @param {Array} layers
 * @returns {Array<{colorId,startStep,endStep,count}>}
 */
function mergeContiguousLayers(layers) {
  if (layers.length === 0) return [];
  const merged = [{ ...layers[0] }];
  for (let i = 1; i < layers.length; i++) {
    const prev = merged[merged.length - 1];
    const curr = layers[i];
    if (curr.colorId === prev.colorId && curr.startStep === prev.endStep) {
      prev.endStep = curr.endStep;
      prev.count += curr.count;
    } else {
      merged.push({ ...curr });
    }
  }
  return merged;
}

/**
 * Guess a human-readable name for common RGB values.
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {string}
 */
function guessColorName(r, g, b) {
  const key = `${r},${g},${b}`;
  const known = {
    '0,0,0':         'Black',
    '255,0,0':       'Red',
    '0,255,0':       'Green',
    '0,0,255':       'Blue',
    '255,255,0':     'Yellow',
    '255,0,255':     'Magenta',
    '0,255,255':     'Cyan',
    '255,255,255':   'White',
    '64,224,208':    'Turquoise',
    '128,0,0':       'Maroon',
    '128,128,0':     'Olive',
    '0,128,0':       'Dark Green',
    '128,0,128':     'Purple',
    '0,128,128':     'Teal',
    '255,165,0':     'Orange',
    '255,192,203':   'Pink',
    '165,42,42':     'Brown',
    '255,215,0':     'Gold',
  };
  if (known[key]) return known[key];

  // Generic fallback
  if (r === g && g === b) return r < 60 ? 'Black' : r > 200 ? 'White' : 'Gray';
  return `RGB(${r},${g},${b})`;
}

/**
 * ============================================================================
 * EXPORTER — Internal data model → external text format
 * ============================================================================
 *
 * Produces a text string compatible with the external format.
 *
 * @param {{
 *   numPins: number,
 *   colors: Array<{id:string,name:string,hex:string}>,
 *   paths: Array<{from:number,to:number,color:string}>
 * }} pattern
 * @returns {string}  Text suitable for saving as .txt
 */
export function exportPatternFile(pattern) {
  if (!pattern || !pattern.paths || !pattern.colors) {
    throw new Error('exportPatternFile: invalid pattern object');
  }

  // Build a lookup: colorId → {r,g,b}
  const colorLookup = {};
  pattern.colors.forEach((c) => {
    colorLookup[c.id] = hexToRgb(c.hex);
  });

  const parts = [];
  let lastColorId = null;

  for (let i = 0; i < pattern.paths.length; i++) {
    const { from, to, color } = pattern.paths[i];
    const rgb = colorLookup[color] || { r: 0, g: 0, b: 0 };

    // Emit a color marker only when the color changes
    if (color !== lastColorId) {
      parts.push(`ChangeColorR:${rgb.r}G:${rgb.g}B:${rgb.b}`);
      lastColorId = color;
    }

    parts.push(String(from));
    parts.push(String(to));
  }

  return parts.join(',');
}

/**
 * ============================================================================
 * CONVENIENCE: Parse from a File object (for <input type="file">)
 * ============================================================================
 *
 * @param {File} file
 * @returns {Promise<object>}  Parsed pattern (see parsePatternFile return)
 */
export function parsePatternFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        resolve(parsePatternFile(e.target.result));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * ============================================================================
 * FORMAT ANALYSIS — Returns a human-readable summary of the file structure
 * ============================================================================
 *
 * Useful for debugging or displaying pattern stats to the user.
 *
 * @param {string} text  Raw file content
 * @returns {{
 *   pinCount: number,
 *   totalLines: number,
 *   colorCount: number,
 *   colors: Array<{name:string,hex:string,count:number,percentage:number}>,
 *   subPassCount: number,
 *   interleaved: boolean,
 *   rawSize: number
 * }}
 */
export function analyzePatternFile(text) {
  const parsed = parsePatternFile(text);

  const colorStats = parsed.colors.map((c) => ({
    name: c.name,
    hex: c.hex,
    count: c.count,
    percentage: parsed.totalSteps > 0 ? (c.count / parsed.totalSteps) * 100 : 0,
  }));

  // "Interleaved" = more than one sub-pass per color on average
  const subPassCount = parsed.colorLayers.length;
  const interleaved = parsed.colors.length > 1 && subPassCount > parsed.colors.length;

  return {
    pinCount: parsed.numPins,
    totalLines: parsed.totalSteps,
    colorCount: parsed.colors.length,
    colors: colorStats,
    subPassCount,
    interleaved,
    rawSize: text.length,
  };
}