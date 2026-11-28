// scripts/generate-icons.mjs
// Generates the PWA icons in public/icons/ from an inline SVG (glowing cyan orb in a dark cave).
//
//   npm run generate:icons
//
// Output is committed, so `npm run build` (and Vercel) never needs sharp.

import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(repoRoot, 'public', 'icons');

// Default skin ("cool-cyan") colours
const BALL = '#32ddff';
const LIGHT = '#55aaff';

/**
 * 512-unit artwork. `scale` shrinks the orb around the centre (maskable safe zone);
 * the background always fills the whole square (no transparency; iOS/Android mask it themselves).
 */
function svg(scale) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="bg" cx="50%" cy="50%" r="75%">
      <stop offset="0" stop-color="#0b1420"/>
      <stop offset="1" stop-color="#000000"/>
    </radialGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="${LIGHT}" stop-opacity="0.75"/>
      <stop offset="0.45" stop-color="${LIGHT}" stop-opacity="0.22"/>
      <stop offset="1" stop-color="${LIGHT}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="orb" cx="42%" cy="40%" r="62%">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.45" stop-color="${BALL}"/>
      <stop offset="1" stop-color="#1596c4"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <g transform="translate(256 256) scale(${scale}) translate(-256 -256)">
    <circle cx="256" cy="256" r="230" fill="url(#glow)"/>
    <circle cx="256" cy="256" r="150" fill="none" stroke="${BALL}" stroke-opacity="0.35" stroke-width="5"/>
    <circle cx="256" cy="256" r="195" fill="none" stroke="${BALL}" stroke-opacity="0.18" stroke-width="4"/>
    <circle cx="256" cy="256" r="100" fill="none" stroke="${BALL}" stroke-opacity="0.5" stroke-width="6"/>
    <circle cx="256" cy="256" r="62" fill="url(#orb)"/>
  </g>
</svg>`;
}

const targets = [
    { file: 'icon-192.png', size: 192, scale: 1 },
    { file: 'icon-512.png', size: 512, scale: 1 },
    // Maskable: everything important within the central ~60% (Android adaptive-icon safe zone)
    { file: 'icon-maskable-512.png', size: 512, scale: 0.78 },
    { file: 'apple-touch-icon-180.png', size: 180, scale: 0.9 },
];

mkdirSync(outDir, { recursive: true });
for (const { file, size, scale } of targets) {
    await sharp(Buffer.from(svg(scale)), { density: 300 })
        .resize(size, size)
        .flatten({ background: '#000000' })
        .png({ compressionLevel: 9 })
        .toFile(join(outDir, file));
    console.log(`Wrote public/icons/${file}`);
}
