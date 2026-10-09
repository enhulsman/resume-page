// scripts/name-glyphs.mjs
// Writes src/data/name-glyphs.json: the outlines of the homepage name's letters, so the
// arrival can draw each one from construction lines (scripts/overzicht/intro.js). Taken from
// the site's own Archivo at the name's weight and width (.name in overzicht.css: weight 820,
// stretch 125%, letter-spacing -.035em), laid out with the font's kerning, one entry per line
// of the name as YouSheet splits it. Coordinates are font units, y down, baseline at 0.
// Re-run after changing the name, its font or those three values: `npm run name-glyphs`.
// (tests/name-glyphs.test.mjs fails when the name and the data disagree.)

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as fontkit from 'fontkit';
import woff2 from 'wawoff2';

const WGHT = 820, WDTH = 125, TRACKING = -0.035; // keep in step with .name
const at = p => fileURLToPath(new URL(p, import.meta.url));

const name = readFileSync(at('../src/config/site.ts'), 'utf8').match(/^\s*name:\s*'([^']+)'/m)[1];
const [first, ...rest] = name.split(' ');
const lines = [first, rest.join(' ')];

const ttf = Buffer.from(await woff2.decompress(readFileSync(at('../public/fonts/Archivo.woff2'))));
const font = fontkit.create(ttf).getVariation({ wght: WGHT, wdth: WDTH });
const upm = font.unitsPerEm;
const track = TRACKING * upm;

const r = v => Math.round(v);
// an outline as an SVG path, flipped so y runs down like the page's
function svgPath(path) {
  return path.commands.map(({ command, args }) => {
    const a = args.map((v, i) => r(i % 2 ? -v : v));
    switch (command) {
      case 'moveTo': return `M${a.join(' ')}`;
      case 'lineTo': return `L${a.join(' ')}`;
      case 'quadraticCurveTo': return `Q${a.join(' ')}`;
      case 'bezierCurveTo': return `C${a.join(' ')}`;
      case 'closePath': return 'Z';
      default: throw new Error(`unknown path command ${command}`);
    }
  }).join('');
}

const out = {
  name, upm, wght: WGHT, wdth: WDTH, tracking: TRACKING,
  capHeight: font.capHeight, xHeight: font.xHeight,
  lines: lines.map(text => {
    const run = font.layout(text);
    let x = 0;
    const glyphs = run.glyphs.map((g, i) => {
      const p = run.positions[i];
      const b = g.path.bbox;
      const glyph = {
        char: String.fromCodePoint(...g.codePoints),
        x: r(x + p.xOffset), adv: r(p.xAdvance),
        // the letter's own extent, for its construction box
        box: [r(b.minX), r(-b.maxY), r(b.maxX), r(-b.minY)],
        d: svgPath(g.path),
      };
      x += p.xAdvance + track;
      return glyph;
    }).filter(g => g.char.trim());
    return { text, width: r(x), glyphs };
  }),
};

writeFileSync(at('../src/data/name-glyphs.json'), JSON.stringify(out) + '\n');
console.log(`${name}: ${out.lines.map(l => `${l.text} ${l.glyphs.length} glyphs, ${l.width} units`).join('; ')}; upm ${upm}`);
