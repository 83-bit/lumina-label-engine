/**
 * Lumina Grip - 80x60 mm poem label generator
 * -------------------------------------------
 * Print-ready SVG for a 203 dpi thermal label printer.
 *
 * Layout is done by a small vertical engine:
 *   - the subtitle block is anchored to the BOTTOM of the band
 *   - the hero block is centred in whatever is left ABOVE it
 * so the two can never collide, and the hero always gets every millimetre the
 * subtitle does not need.
 *
 * Two tracks:
 *   lang:'zh' (default) - the Chinese poem is the hero, its English rendering
 *                         is the subtitle
 *   lang:'en'           - the English poem is the hero, its Chinese rendering
 *                         is the subtitle
 *
 * Everything is STROKED (thermal bleed compensation) because 明體 thin
 * horizontal strokes (一, 三, 二) are the first to drop out at 203 dpi.
 *
 * Writes:
 *   poem-label-80x60-v1.svg        - ZH track
 *   poem-label-80x60-en-v1.svg     - EN track
 *   poem-label-testsheet.svg       - 8 risky cases on one A4
 *
 * Units: 1 unit = 0.1 mm, viewBox 0 0 800 600.
 * Run: node poem-label.js
 */

'use strict';

const fs = require('fs');
const path = require('path');

const HERE = __dirname;

/* ---- QR (https://www.luminagrip.com) v2 level M ---- */
const QR_WWW = [
  '1111111001000011001111111',
  '1000001011100101001000001',
  '1011101000100001001011101',
  '1011101000101010001011101',
  '1011101011010011001011101',
  '1000001001011011101000001',
  '1111111010101010101111111',
  '0000000001011111000000000',
  '1010101001100101100010010',
  '0010100110000110101000001',
  '0000101001111110011100111',
  '1100100110111101101000010',
  '0110011101001101111101011',
  '0010100001010000101001001',
  '1001011000000010011100111',
  '0100100100011111101010010',
  '1000111110011100111111000',
  '0000000011001110100011011',
  '1111111001100011101011011',
  '1000001000001100100011011',
  '1011101011011110111111000',
  '1011101000101001010111100',
  '1011101011100101000010001',
  '1000001001000101101011010',
  '1111111011001101100100011',
];

const ADVANCE = 0.6;   // IBM Plex Mono
const EN_ADV = 0.54;   // Noto Serif Display: measured 0.528 + safety margin
const MONO = "'IBM Plex Mono', ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace";
const CJK = "'Noto Serif TC', 'Songti TC', 'Source Han Serif TC', PMingLiU, MingLiU, SimSun, serif";
/* Latin serif for English poetry — Noto Serif Display shares the Noto superfamily */
const SERIF = "'Noto Serif Display', 'Noto Serif TC', Georgia, 'Times New Roman', serif";

/* poem — public domain, Su Shi 蘇軾《定風波》1037-1101 */
const POEM_CN = '\u4e00\u84d1\u7159\u96e8\u4efb\u5e73\u751f'; // 一蓑煙雨任平生
const POEM_EN = 'Storms will pass, game goes on.';

const r = (n) => Math.round(n * 1000) / 1000;

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* monospace run, advance pinned with textLength (the only reliable way to hold
   a mono grid across renderers) */
function mono(str, x, y, size, weight, pitch, extra) {
  let a = ` x="${r(x)}" y="${r(y)}" font-size="${r(size)}" font-weight="${weight}"`;
  if (str.length > 1) {
    const len = (str.length - 1) * pitch + size * ADVANCE;
    a += ` textLength="${r(len)}" lengthAdjust="spacing"`;
  }
  return `<text${a}${extra || ''}>${esc(str)}</text>`;
}

function qrPath(rows, box) {
  const n = rows.length;
  const m = box.size / n;
  let d = '';
  for (let y = 0; y < n; y++) {
    let x = 0;
    while (x < n) {
      if (rows[y].charAt(x) !== '1') { x++; continue; }
      const s = x;
      while (x < n && rows[y].charAt(x) === '1') x++;
      const w = (x - s) * m;
      d += `M${r(box.x + s * m)} ${r(box.y + y * m)}h${r(w)}v${r(m)}h${r(-w)}z`;
    }
  }
  return d;
}

/* ---- geometry (80 x 60 mm, 1 unit = 0.1 mm) ---- */
const LEFT = 41;                 // 4.1 mm
const COLUMN_END = 396.6;        // 39.66 mm
const W = 800, H = 600;

const L = {
  brand:  { y: 94.1,  size: 52.8, weight: 700, pitch: 31.27 },
  series: { y: 147.5, size: 35.2, weight: 500, pitch: 23.56 },
  title:  { y: 263.6, size: 69.2, weight: 700, pitch: 40.3 },
  pack:   { y: 315.8, size: 36.2, weight: 600, pitch: 20.27 },
  prep:   { y: 489.8, size: 35.2, weight: 500, pitch: 23.6 },
  name:   { y: 553.4, size: 49.2, weight: 700, pitchRatio: 0.571 },
};
const RULES = [
  { y: 174.6, h: 8.5 },
  { y: 435.6, h: 6.8 },
];
const QR = { x: 489.8, y: 57.6, size: 210.2 };
/* the logo slot is trimmed to 9.2 mm; the poem band runs from under it to the
   bottom margin. */
const LOGO = { x: 444.5, y: 293, width: 300, height: 92 };
const POEM = {
  cx: 594.9,         // centred under the QR
  avail: 310,        // symmetric ink width either side of cx -> 43.99 .. 74.99 mm
  bandTop: 389,      // 38.9 mm (logo box ends at 385)
  subBase: 572,      // 57.2 mm — last subtitle baseline; leaves ~2.2 mm clear of
                     // the edge, which is the printer's unreliable margin
  gap: 12,           // 1.2 mm clear between the hero and subtitle blocks
  /* --- ZH track: 中文詩做主角 --- */
  cnCap: 56,         // 5.6 mm across two lines
  singleCap: 80,     // 8.0 mm for short poems (執生 / 頂硬上)
  cnStroke: 0.9,
  enCap: 26,         // 2.6 mm English subtitle
  enStroke: 0.5,
  /* --- EN track: 英文詩做主角 --- */
  enHeroCap: 56,     // 5.6 mm, allowed to run to three lines
  enHeroStroke: 0.7,
  cjkSubCap: 26,     // 2.6 mm Chinese rendering
  cjkSubStroke: 0.45,
  maxLines: 3,       // the hero never runs past three lines
};
const PREP = 'SUPPLIED TO';
const NAME = 'DEMO CLUB';

/* ---- line splitting -------------------------------------------------------- */

/* One line if it fits at the cap; otherwise a balanced two-line split.
   A comma is the natural break, but only when the halves are comparable —
   otherwise a phrase like 甜區，就係你嘅聖殿 breaks 2+6 and the glyphs shrink. */
function splitTwo(s, cap) {
  if (s.length * cap <= POEM.avail) return [s];
  const parts = s.split(/[\uFF0C,]/).map((t) => t.trim()).filter((t) => t.length);
  if (parts.length >= 2) {
    const a = parts[0], b = parts.slice(1).join('');
    if (a.length >= 2 && b.length >= 3 && Math.abs(a.length - b.length) <= 3) return [a, b];
  }
  const n = Math.ceil(s.length / 2);
  return [s.slice(0, n), s.slice(n)];
}

/* English, two lines: prefer a comma break when the halves are comparable,
   otherwise the word boundary nearest the middle. */
function enSplit2(s) {
  const parts = s.split(/,\s*/).map((t) => t.trim()).filter((t) => t.length);
  if (parts.length >= 2) {
    const a = parts[0] + ',', b = parts.slice(1).join(' ');
    if (Math.abs(a.length - b.length) <= 6) return [a, b];
  }
  const words = s.split(/\s+/);
  let best = null, bestD = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ');
    const b = words.slice(i).join(' ');
    if (a.length < 3 || b.length < 3) continue;
    const d = Math.abs(a.length - b.length);
    if (d < bestD) { bestD = d; best = [a, b]; }
  }
  return best || [s];
}

/* English, n lines: exact minimax split — choose the break points that make the
   LONGEST line as short as possible, because the longest line is what sets the
   type size. Greedy packing is not good enough: it strands a long tail line and
   the whole block has to shrink to fit it. */
function splitWordsMinimax(words, n) {
  const N = words.length;
  if (n <= 1) return [words.join(' ')];
  if (n >= N) return words.slice();
  const pre = new Array(N + 1).fill(0);
  for (let i = 0; i < N; i++) pre[i + 1] = pre[i] + words[i].length + 1; // +1 for the space
  const seg = (i, j) => pre[j] - pre[i] - 1;                             // words[i..j-1] joined

  const dp = Array.from({ length: n + 1 }, () => new Array(N + 1).fill(Infinity));
  const nxt = Array.from({ length: n + 1 }, () => new Array(N + 1).fill(0));
  dp[0][N] = 0;
  for (let k = 1; k <= n; k++) {
    for (let i = 0; i <= N; i++) {
      for (let j = i + 1; j <= N; j++) {
        if (dp[k - 1][j] === Infinity) continue;
        const cand = Math.max(seg(i, j), dp[k - 1][j]);
        if (cand < dp[k][i]) { dp[k][i] = cand; nxt[k][i] = j; }
      }
    }
  }
  if (dp[n][0] === Infinity) return [words.join(' ')];
  const out = [];
  let i = 0;
  for (let k = n; k >= 1; k--) {
    const j = nxt[k][i];
    out.push(words.slice(i, j).join(' '));
    i = j;
  }
  return out;
}

function enSplitN(s, n) {
  const words = s.split(/\s+/).filter((w) => w.length);
  if (words.length < n) return [s];
  return splitWordsMinimax(words, n);
}

/* candidate line-sets for an English phrase, cheapest first */
function enCandidates(s, adv, cap, maxN) {
  const out = [];
  if (s.length * adv * cap <= POEM.avail) out.push([s]);
  if (s.length > 12) {
    const two = enSplit2(s);
    if (two.length === 2) out.push(two);
  }
  if ((maxN || 2) >= 3 && s.split(/\s+/).length >= 4) {
    const three = enSplitN(s, 3);
    if (three.length === 3) out.push(three);
  }
  if (!out.length) out.push([s]);
  return out;
}

/* ---- fitting --------------------------------------------------------------- */

/* how tall a block of n lines at size s really is: cap height on the first line,
   full leading for each line after it, then the descender */
function blockHeight(n, s) {
  return (n - 1) * 1.05 * s + 0.97 * s;
}

/* Pick the candidate line-set whose longest line can be rendered biggest.
   A candidate only wins by a clear margin, so we never add a line for nothing. */
function bestFit(cands, capOf, adv, widthLimit, heightLimit) {
  let best = null;
  for (const lines of cands) {
    if (!lines || !lines.length) continue;
    const n = lines.length;
    const maxLen = Math.max.apply(null, lines.map((l) => l.length));
    let size = Math.min(capOf(n), widthLimit / (adv * maxLen));
    size = Math.min(size, heightLimit / blockHeight(n, 1));
    if (!best || size > best.size * 1.08) best = { lines, size };
  }
  return best;
}

/* hero: sized to fit, then centred in the space it was given */
function heroLayout(cands, capOf, adv, widthLimit, heightLimit, top, bottom) {
  const best = bestFit(cands, capOf, adv, widthLimit, heightLimit);
  const h = blockHeight(best.lines.length, best.size);
  const start = top + Math.max(0, (bottom - top - h) / 2);
  const lead = 1.05 * best.size;
  const ys = best.lines.map((_, i) => start + 0.75 * best.size + i * lead);
  return { lines: best.lines, size: best.size, ys, topInk: start, botInk: start + h };
}

/* subtitle: sized to fit, anchored so its LAST baseline sits on `lastBaseline` */
function subLayout(cands, capOf, adv, widthLimit, lastBaseline) {
  const best = bestFit(cands, capOf, adv, widthLimit, Infinity);
  const lead = 1.05 * best.size;
  const n = best.lines.length;
  const ys = best.lines.map((_, i) => lastBaseline - (n - 1 - i) * lead);
  return {
    lines: best.lines,
    size: best.size,
    ys,
    topInk: ys[0] - 0.75 * best.size,
    botInk: ys[ys.length - 1] + 0.22 * best.size,
  };
}

/* ---- the two track layouts ------------------------------------------------- */

/* ZH track: 中文詩主角 + 英譯副標 */
function layoutZh(cn, en) {
  const sub = subLayout(
    enCandidates(String(en || '').trim(), ADVANCE, POEM.enCap, 2),
    () => POEM.enCap, ADVANCE, POEM.avail, POEM.subBase);
  const bottom = sub.topInk - POEM.gap;
  const hero = heroLayout(
    [splitTwo(String(cn || '').trim(), POEM.cnCap)],
    (n) => (n > 1 ? POEM.cnCap : POEM.singleCap),
    1, POEM.avail, bottom - POEM.bandTop, POEM.bandTop, bottom);
  return { hero, sub };
}

/* EN track: 英文詩主角 + 中文意譯副標 */
function layoutEn(cn, en) {
  const sub = subLayout(
    [splitTwo(String(cn || '').trim(), POEM.cjkSubCap)],
    () => POEM.cjkSubCap, 1, POEM.avail, POEM.subBase);
  const bottom = sub.topInk - POEM.gap;
  const hero = heroLayout(
    enCandidates(String(en || '').trim(), EN_ADV, POEM.enHeroCap, POEM.maxLines),
    () => POEM.enHeroCap, EN_ADV, POEM.avail, bottom - POEM.bandTop, POEM.bandTop, bottom);
  return { hero, sub };
}

function layoutFor(lang, cn, en) {
  return lang === 'en' ? layoutEn(cn, en) : layoutZh(cn, en);
}

/* ---- drawing --------------------------------------------------------------- */

function textBlock(block, cx, family, weight, stroke, letterSpacing) {
  const attrs = ` font-family="${family}" font-size="${r(block.size)}" font-weight="${weight}"`
    + ` fill="#000" stroke="#000" stroke-width="${stroke}" stroke-linejoin="round"`
    + (letterSpacing ? ` letter-spacing="${letterSpacing}"` : '')
    + ` text-anchor="middle"`;
  return block.lines
    .map((ln, i) => `<text x="${cx}" y="${r(block.ys[i])}"${attrs}>${esc(ln)}</text>`)
    .join('');
}

function nameRun(name, spec, columnEnd) {
  const width = (columnEnd || COLUMN_END) - LEFT;
  const size = Math.min(spec.size, width / (spec.pitchRatio * (name.length - 1) + ADVANCE));
  return mono(name, LEFT, spec.y, size, spec.weight, size * spec.pitchRatio);
}

/* inner markup only (no <svg> wrapper) so the label can be placed on a sheet */
function poemLabelBody(opts) {
  const o = opts || {};
  const cn = o.cn || POEM_CN;
  const en = o.en || POEM_EN;
  const prep = o.prep || PREP;
  const name = o.name || NAME;
  const lang = o.lang === 'en' ? 'en' : 'zh';

  let out = `<g font-family="${MONO}" fill="#000">`;
  out += mono('LUMINA GRIP', LEFT, L.brand.y, L.brand.size, L.brand.weight, L.brand.pitch);
  out += mono('ELEMENT SERIES', LEFT, L.series.y, L.series.size, L.series.weight, L.series.pitch);
  out += mono('GENESIS', LEFT, L.title.y, L.title.size, L.title.weight, L.title.pitch);
  out += mono('3-PACK / 01\u00b702\u00b703', LEFT, L.pack.y, L.pack.size, L.pack.weight, L.pack.pitch);
  out += mono(prep, LEFT, L.prep.y, L.prep.size, L.prep.weight, L.prep.pitch);
  out += nameRun(name, L.name);
  out += `</g>`;

  for (const rule of RULES) {
    out += `<rect x="40.7" y="${rule.y}" width="${r(COLUMN_END - 40.7)}" height="${rule.h}" fill="#000"/>`;
  }

  out += `<path d="${qrPath(QR_WWW, QR)}" fill="#000" shape-rendering="crispEdges"/>`;

  /* logo slot left empty here; the club logo is injected as a data URI */
  out += `<rect x="${LOGO.x}" y="${LOGO.y}" width="${LOGO.width}" height="${LOGO.height}" fill="none"/>`;

  /* poem band */
  const lay = layoutFor(lang, cn, en);
  if (lang === 'en') {
    out += textBlock(lay.hero, POEM.cx, SERIF, 700, POEM.enHeroStroke, '');
    out += textBlock(lay.sub, POEM.cx, CJK, 600, POEM.cjkSubStroke, '');
  } else {
    out += textBlock(lay.hero, POEM.cx, CJK, 700, POEM.cnStroke, '');
    out += textBlock(lay.sub, POEM.cx, MONO, 600, POEM.enStroke, '0.2');
  }

  return out;
}

function poemLabel(opts) {
  const o = opts || {};
  const cn = o.cn || POEM_CN;
  let out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Lumina Grip GENESIS - ${esc(cn)}">`;
  out += `<rect width="${W}" height="${H}" fill="#fff"/>`;
  out += poemLabelBody(o);
  out += `</svg>`;
  return out;
}

/* ---- 試印校驗頁 (A4, 2x4 = 8 個風險位, 1 unit = 0.1mm) ---- */
const TEST_CASES = [
  { cn: '\u4e00\u84d1\u7159\u96e8\u4efb\u5e73\u751f', en: 'Storms will pass, game goes on.', note: 'ZH \u57fa\u6e96 7\u5b57 \u2014 \u770b\u300c\u4e00\u300d' },
  { cn: '\u96f6\u843d\u6210\u6ce5\u78be\u4f5c\u5875\uff0c\u53ea\u6709\u9999\u5982\u6545', en: 'Indomitable spirit.', note: 'ZH \u6700\u9577 12\u5b57' },
  { cn: '\u52dd\u4eba\u8005\u6709\u529b\uff0c\u81ea\u52dd\u8005\u5f37', en: 'Mastering yourself is true power.', note: 'ZH \u9017\u865f 5+5' },
  { cn: '\u57f7\u751f', en: 'Improvise. Survive.', note: 'ZH 2\u5b57 \u55ae\u884c' },
  { cn: '\u6211\uff0c\u4fc2\u547d\u904b\u5605\u4e3b\u4eba', en: 'I am the master of my fate', lang: 'en', note: 'EN 26\u5b57 \u2014 3\u884c?' },
  { cn: '\u9806\u9006\uff0c\u4e00\u8996\u540c\u4ec1', en: 'Treat those two impostors just the same', lang: 'en', note: 'EN \u6700\u9577 39\u5b57' },
  { cn: '\u4fe1\u81ea\u5df1', en: 'Trust thyself', lang: 'en', note: 'EN \u6700\u77ed 12\u5b57' },
  { cn: '\u552f\u6709\u81ea\u5df1\uff0c\u80fd\u7d66\u4f60\u5e73\u975c', en: 'Nothing can bring you peace but yourself', lang: 'en', note: 'EN \u6700\u9577 + \u4e2d\u6587\u526f\u6a19\u6700\u9577' },
];

function testSheet() {
  const AW = 2100, AH = 2970, COLS = [150, 1150], ROW0 = 150, STEP = 700;
  let out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${AW} ${AH}" role="img" aria-label="Lumina Grip 80x60 poem label test sheet">`;
  out += `<rect width="${AW}" height="${AH}" fill="#fff"/>`;
  out += `<g font-family="${MONO}" fill="#000">`;
  out += `<text x="150" y="56" font-size="34" font-weight="700">LUMINA GRIP \u00b7 80\u00d760mm \u8a69\u53e5\u6a19\u7c64 \u00b7 \u8a66\u5370\u6821\u9a57\u9801</text>`;
  out += `<text x="150" y="96" font-size="22" font-weight="500">2026-10-06 \u00b7 \u5370 1 \u5f35 = \u9a57 8 \u500b\u98a8\u96aa\u4f4d \u00b7 \u8acb\u7528 1-bit \u7248 \u00b7 \u5be6\u969b\u5c3a\u5bf8 80\u00d760mm \u00b7 \u524d 4 \u683c\u4e2d\u6587\u4e3b\u89d2 / \u5f8c 4 \u683c\u82f1\u6587\u4e3b\u89d2</text>`;
  out += `</g>`;

  TEST_CASES.forEach((c, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = COLS[col], y = ROW0 + row * STEP;
    const lay = layoutFor(c.lang, c.cn, c.en);
    const cap = `#${i + 1} ${c.note} | hero ${(lay.hero.size / 10).toFixed(1)}mm x${lay.hero.lines.length}`
      + ` | sub ${(lay.sub.size / 10).toFixed(1)}mm x${lay.sub.lines.length}`;

    out += `<rect x="${x}" y="${y}" width="${W}" height="${H}" fill="#fff" stroke="#000" stroke-width="2"/>`;
    out += `<g transform="translate(${x} ${y})">${poemLabelBody({ cn: c.cn, en: c.en, name: 'DEMO CLUB', lang: c.lang })}</g>`;
    out += `<g font-family="${MONO}" fill="#000"><text x="${x}" y="${y - 28}" font-size="27" font-weight="500">${esc(cap)}</text></g>`;
  });

  out += `</svg>`;
  return out;
}

/* ---- exports ---- */
module.exports = {
  POEM, EN_ADV, ADVANCE,
  splitTwo, enSplit2, enSplitN, splitWordsMinimax, enCandidates,
  blockHeight, bestFit,
  layoutZh, layoutEn, layoutFor,
  poemLabelBody, poemLabel,
};

/* ---- file writes only when run directly ---- */
if (require.main !== module) return;

const poem = poemLabel();
fs.writeFileSync(path.join(HERE, 'poem-label-80x60-v1.svg'), poem, 'utf8');
console.log('wrote poem-label-80x60-v1.svg', poem.length, 'bytes');

/* EN-hero variant: English poem big, Chinese rendering below */
const EN_HERO = {
  cn: '\u6211\uff0c\u4fc2\u547d\u904b\u5605\u4e3b\u4eba',
  en: 'I am the master of my fate',
  lang: 'en',
};
const poemEn = poemLabel(EN_HERO);
fs.writeFileSync(path.join(HERE, 'poem-label-80x60-en-v1.svg'), poemEn, 'utf8');
console.log('wrote poem-label-80x60-en-v1.svg', poemEn.length, 'bytes');

const sheet = testSheet();
fs.writeFileSync(path.join(HERE, 'poem-label-testsheet.svg'), sheet, 'utf8');
console.log('wrote poem-label-testsheet.svg', sheet.length, 'bytes');
