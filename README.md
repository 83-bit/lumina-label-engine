# Lumina Label Engine

A typography engine for **80 × 60 mm thermal labels**, built for a real production
line: pickleball overgrip labels printed on a 203 dpi thermal printer and applied
by hand, thousands at a time.

It renders print-ready SVG with:
- a scannable QR code (v2, error level M) drawn as a single path
- a **poem band** that typesets a Chinese poem and its English rendering into a
  fixed box without ever letting the two collide
- **1-bit / thermal-safe** output: every glyph is stroked, because thin horizontal
  CJK strokes (`一`, `三`, `二`) are the first thing to drop out at 203 dpi

The interesting part is not the layout. It is that the type has to *fit* a
physical box on a physical printer, and there is no second attempt once the roll
is running.

---

## The two hard problems

### 1. Line breaking is a minimax problem, not greedy packing

When an English line has to be split into *n* lines, the type size is set by the
**longest** line. Greedy packing strands a long tail line, and the whole block
shrinks to fit it.

So the engine solves it exactly with dynamic programming: choose the break
points that minimise the longest resulting line:

```js
function splitWordsMinimax(words, n) {
  // dp[k][i] = shortest possible longest-line, splitting words[i..] into k lines
  ...
  const cand = Math.max(seg(i, j), dp[k - 1][j]);
  if (cand < dp[k][i]) { dp[k][i] = cand; nxt[k][i] = j; }
}
```

Comma breaks are preferred **only when the halves are comparable in length** —
a 2 + 6 split looks broken even though it "fits".

### 2. The hero and the subtitle must never collide

The poem band is laid out by a small vertical engine:

- the subtitle block is anchored to the **bottom** of the band
- the hero block is centred in whatever space is left **above** it

So the hero always gets every millimetre the subtitle does not need, and the two
blocks are geometrically incapable of overlapping, regardless of how many lines
each one takes.

A candidate layout only wins if it renders the text at least **8% larger** than
the current best, so the engine never adds a line for nothing.

---

## Usage

```bash
node poem-label.js
```

Writes:

| File | Contents |
|---|---|
| `poem-label-80x60-v1.svg` | Chinese poem as hero, English as subtitle |
| `poem-label-80x60-en-v1.svg` | English poem as hero, Chinese as subtitle |
| `poem-label-testsheet.svg` | A4 sheet, 8 risk cases. The before-print check |

No dependencies. Node 14+.

### As a module

```js
const { poemLabel, poemLabelBody, layoutFor } = require('./poem-label');

const svg = poemLabel({
  cn: '一蓑煙雨任平生',
  en: 'Storms will pass, game goes on.',
  name: 'DEMO CLUB',
  lang: 'zh',
});
```

`poemLabelBody()` returns the inner markup only (no `<svg>` wrapper), so the
label can be placed onto a larger sheet or injected into another document.

---

## Geometry

Units are **0.1 mm**; the viewBox is `0 0 800 600` (80 × 60 mm).

Fonts are referenced by family name and must be installed on the rendering host:

- `IBM Plex Mono`: the mono column (brand, series, supplied-to, name)
- `Noto Serif TC`: Chinese poetry
- `Noto Serif Display`: Latin poetry

Monospace runs pin their advance width with `textLength` + `lengthAdjust="spacing"`,
which is the only reliable way to hold a mono grid across renderers.

---

## What this is not

The grip is a commodity and so is the label stock. This repo is the tooling, not
the moat. The moat is shelf position and the reorder data, neither of which is
in here.

---

## Licence

MIT. See `LICENSE`.
