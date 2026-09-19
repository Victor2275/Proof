/**
 * Generates Proof's app icons from the design tokens.
 *
 * Provenance for every shipping raster, which the direction contract requires:
 * nothing here is hand-painted, so re-running this reproduces the icons exactly
 * and changing a token changes them honestly.
 *
 * The mark is the step row — four keys, two complete, one lit red for *now*,
 * one not yet reached. It is the product's thesis in one glyph: a recipe is a
 * pattern and a bake is that pattern running. It also survives being shrunk,
 * because at 48px it is still four bars with one of them red, which no other
 * cookbook app's icon looks like.
 *
 * The icons it replaces were a gold chef's hat from the Black & Gold world this
 * design deliberately replaced — and they were not being served at all: the PWA
 * manifest named files that did not exist, so an installed Proof had no icon.
 *
 *   node scripts/generate-icons.mjs
 */
import { Jimp, intToRGBA, rgbaToInt } from 'jimp';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/* Straight from src/index.css. Dark is the default theme, so it is the icon. */
const GROUND = '#000000';
const KEY_DONE = '#57564f';
const KEY_NOW = '#ff3b30';
const KEY_UNLIT = '#2a2a2a';

/** The row, left to right: what has happened, what is happening, what has not. */
const KEYS = [KEY_DONE, KEY_DONE, KEY_NOW, KEY_UNLIT];

const hex = (h) => {
  const n = h.replace('#', '');
  return rgbaToInt(
    parseInt(n.slice(0, 2), 16),
    parseInt(n.slice(2, 4), 16),
    parseInt(n.slice(4, 6), 16),
    255,
  );
};

/**
 * Draws the row at any size.
 *
 * Proportions are fractions of the canvas rather than fixed pixels, so the
 * 192px icon is the 512px icon and not a squashed cousin. The row occupies 70%
 * of the width, which keeps it inside the 80% safe circle Android masks
 * adaptive icons to.
 */
function drawRow(image, size) {
  const rowWidth = Math.round(size * 0.7);
  const gap = Math.max(1, Math.round(size * 0.022));
  const keyWidth = Math.round((rowWidth - gap * (KEYS.length - 1)) / KEYS.length);
  const keyHeight = Math.round(size * 0.32);
  const left = Math.round((size - (keyWidth * KEYS.length + gap * (KEYS.length - 1))) / 2);
  const top = Math.round((size - keyHeight) / 2);

  KEYS.forEach((colour, i) => {
    const x0 = left + i * (keyWidth + gap);
    const fill = hex(colour);
    for (let y = top; y < top + keyHeight; y += 1) {
      for (let x = x0; x < x0 + keyWidth; x += 1) {
        image.setPixelColor(fill, x, y);
      }
    }
  });
}

async function png(size, file) {
  const image = new Jimp({ width: size, height: size, color: hex(GROUND) });
  drawRow(image, size);
  const buffer = await image.getBuffer('image/png');
  await writeFile(resolve(root, file), buffer);
  const { r, g, b } = intToRGBA(image.getPixelColor(Math.round(size / 2), Math.round(size / 2)));
  console.log(`${file}  ${size}x${size}  centre rgb(${r},${g},${b})`);
}

/* The favicon and the pinned-tab mark are vector: a favicon is drawn at 16px,
 * where four hand-placed rectangles beat four resampled ones. */
function svg({ monochrome }) {
  const keys = KEYS.map((colour, i) => {
    const x = 6 + i * 13;
    const fill = monochrome ? 'black' : colour;
    return `<rect x="${x}" y="16" width="11" height="32" rx="1" fill="${fill}"/>`;
  }).join('');
  const ground = monochrome ? '' : `<rect width="64" height="64" fill="${GROUND}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${ground}${keys}</svg>\n`;
}

await mkdir(resolve(root, 'public'), { recursive: true });

/*
 * The Capacitor source. `npx capacitor-assets generate` reads assets/logo.png
 * and writes the Android launcher icons from it, so leaving the old artwork
 * there would have put the gold chef's hat back on the phone's home screen the
 * next time anyone built the APK.
 */
await mkdir(resolve(root, 'assets'), { recursive: true });
await png(1024, 'assets/logo.png');

await png(512, 'public/pwa-512x512.png');
await png(192, 'public/pwa-192x192.png');
await png(180, 'public/apple-touch-icon.png');

await writeFile(resolve(root, 'public/favicon.svg'), svg({ monochrome: false }));
console.log('public/favicon.svg');
await writeFile(resolve(root, 'public/masked-icon.svg'), svg({ monochrome: true }));
console.log('public/masked-icon.svg');
