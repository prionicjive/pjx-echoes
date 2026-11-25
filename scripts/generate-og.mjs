// scripts/generate-og.mjs
// Generates public/og-image.png: a 1200x630 screenshot of the live game (cave lighting, bloom/CRT,
// and the Intro UI) for OpenGraph / Twitter link previews.
//
//   npm run build && npm run generate:og
//
// Prerequisite (once): `npx playwright-core install chromium`  (CI also passes --with-deps).
// Flags:  --seed <s>   level seed (default: OG_SEED below)
//         --out <path> output file (default: public/og-image.png)
//         --force      overwrite even if the new image is visually near-identical
//
// Not part of `npm run build` on purpose: Vercel's build must stay fast.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { preview } from 'vite';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

// Seed of the cave shown behind the intro (applied via ?seed=, first level only).
const OG_SEED = 'echoes-3'; // Picked by eye: exit + gate, torches, anti pickups and sentries all in view

const WIDTH = 1200;
const HEIGHT = 630;
const SETTLE_MS = 1000; // After the intro finished fading in: let bloom/CRT/flicker settle
const PAGE_TIMEOUT_MS = 90_000; // Generous: software WebGL on CI is slow
// Keep the committed image unless at least this fraction of pixels visibly changed. CRT noise and
// light flicker make captures differ by ~0.01% of pixels; real UI/colour changes are well above this.
const MIN_CHANGED_FRACTION = 0.0025;

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// ---- CLI ---------------------------------------------------------------------------------------

function parseArgs(argv) {
    const args = { seed: process.env.OG_SEED || OG_SEED, out: join(repoRoot, 'public', 'og-image.png'), force: false };
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '--seed') args.seed = argv[++i];
        else if (argv[i] === '--out') args.out = resolve(argv[++i]);
        else if (argv[i] === '--force') args.force = true;
        else throw new Error(`Unknown argument: ${argv[i]}`);
    }
    return args;
}

// ---- Image checks ------------------------------------------------------------------------------

/** Throws unless the PNG is 1200x630 and clearly not a black/blank frame. */
function assertImageLooksRight(png) {
    if (png.width !== WIDTH || png.height !== HEIGHT) {
        throw new Error(`Screenshot is ${png.width}x${png.height}, expected ${WIDTH}x${HEIGHT}`);
    }
    let lit = 0;
    let maxLuma = 0;
    const total = png.width * png.height;
    for (let i = 0; i < png.data.length; i += 4) {
        const luma = 0.2126 * png.data[i] + 0.7152 * png.data[i + 1] + 0.0722 * png.data[i + 2];
        if (luma > 24) lit++;
        if (luma > maxLuma) maxLuma = luma;
    }
    const litFraction = lit / total;
    if (litFraction < 0.03 || maxLuma < 120) {
        throw new Error(
            `Screenshot looks black/blank (lit pixels: ${(litFraction * 100).toFixed(2)}%, peak luma: ${maxLuma.toFixed(0)})`
        );
    }
    return { litFraction, maxLuma };
}

// ---- Main --------------------------------------------------------------------------------------

async function main() {
    const { seed, out, force } = parseArgs(process.argv.slice(2));

    if (!existsSync(join(repoRoot, 'dist', 'index.html'))) {
        throw new Error('dist/ not found. Run `npm run build` first.');
    }

    const debugPath = join(repoRoot, 'og-debug.png');
    const problems = [];
    let server;
    let browser;
    let page;

    try {
        server = await preview({
            root: repoRoot,
            logLevel: 'warn',
            preview: { host: '127.0.0.1', port: 4173, strictPort: false, open: false },
        });
        const baseUrl = server.resolvedUrls?.local?.[0];
        if (!baseUrl) throw new Error('vite preview did not report a local URL');
        const url = `${baseUrl}?seed=${encodeURIComponent(seed)}`;

        try {
            browser = await chromium.launch({
                headless: true,
                args: [
                    // Software WebGL so PixiJS, lighting and filters render without a GPU (Linux CI)
                    '--use-angle=swiftshader',
                    '--use-gl=angle',
                    '--enable-unsafe-swiftshader',
                    '--ignore-gpu-blocklist',
                    '--enable-webgl',
                ],
            });
        } catch (err) {
            if (/Executable doesn't exist|browserType\.launch/i.test(String(err))) {
                throw new Error('Chromium is not installed. Run: npx playwright-core install chromium');
            }
            throw err;
        }

        const context = await browser.newContext({
            viewport: { width: WIDTH, height: HEIGHT },
            deviceScaleFactor: 1,
            reducedMotion: 'no-preference',
        });
        page = await context.newPage();

        page.on('pageerror', err => problems.push(`pageerror: ${err.message}`));
        page.on('console', msg => {
            if (msg.type() !== 'error') return;
            const text = msg.text();
            if (/webgl|context lost|shader/i.test(text)) problems.push(`console error: ${text}`);
            else console.warn(`  [page console error] ${text}`);
        });

        console.log(`Capturing ${url}`);
        await page.goto(url, { waitUntil: 'load', timeout: PAGE_TIMEOUT_MS });
        await page.evaluate(() => document.fonts.ready);

        // Boot cover has faded out AND the last (staggered) intro item is fully opaque.
        await page.waitForFunction(() => {
            const cover = document.querySelector('[data-echoes="transition-cover"]');
            const lastItem = document.querySelector('.echoes-intro__mute');
            if (!cover || !lastItem) return false;
            return getComputedStyle(cover).visibility === 'hidden'
                && parseFloat(getComputedStyle(lastItem).opacity) >= 0.999;
        }, null, { timeout: PAGE_TIMEOUT_MS, polling: 100 });

        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(SETTLE_MS);
        await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));

        if (problems.length) throw new Error(problems.join('\n'));

        const buffer = await page.screenshot({ type: 'png' });
        const next = PNG.sync.read(buffer);
        const stats = assertImageLooksRight(next);
        console.log(`  OK: ${next.width}x${next.height}, lit ${(stats.litFraction * 100).toFixed(1)}%, peak luma ${stats.maxLuma.toFixed(0)}`);

        // Noise gate: keep the committed image if the new one is visually the same
        if (!force && existsSync(out)) {
            const prev = PNG.sync.read(readFileSync(out));
            if (prev.width === next.width && prev.height === next.height) {
                const diff = pixelmatch(prev.data, next.data, null, next.width, next.height, { threshold: 0.15 });
                const fraction = diff / (next.width * next.height);
                console.log(`  Changed pixels vs existing: ${(fraction * 100).toFixed(2)}% (threshold ${(MIN_CHANGED_FRACTION * 100).toFixed(1)}%)`);
                if (fraction < MIN_CHANGED_FRACTION) {
                    console.log('  Visually unchanged: keeping existing image.');
                    return;
                }
            }
        }

        mkdirSync(dirname(out), { recursive: true });
        writeFileSync(out, buffer);
        console.log(`  Wrote ${out} (${(buffer.length / 1024).toFixed(0)} KB)`);
    } catch (err) {
        if (page) {
            try {
                writeFileSync(debugPath, await page.screenshot({ type: 'png', timeout: 5000 }));
                console.error(`Saved debug screenshot to ${debugPath}`);
            } catch { /* page already gone */ }
        }
        throw err;
    } finally {
        await browser?.close().catch(() => {});
        await server?.close().catch(() => {});
    }
}

main().then(
    () => process.exit(0),
    err => {
        console.error(`generate-og failed: ${err.message ?? err}`);
        process.exit(1);
    },
);
