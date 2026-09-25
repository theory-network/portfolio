// Build-time prerendering. Serves the production build, opens each route in a
// headless browser, and saves the rendered HTML next to the build output, so
// S3 + CloudFront can serve real HTML per route with no server.
//
// Run after `vite build` (the `prerender` Nx target depends on `build`).
// To prerender a new page, add it to ROUTES with the heading and title it must
// contain; the script fails the build if the saved HTML doesn't.
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { preview } from 'vite';

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, 'dist');
const PORT = 4300;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

// Serves dist the way production hosting will: a request for /portfolio/firefly
// gets /portfolio/firefly/index.html (S3 + CloudFront, Linear issue 2.4), and
// anything else falls back to the app shell.
async function serveDist() {
  const server = createServer(async (req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const candidates = [pathname, join(pathname, 'index.html'), '/index.html'];
    for (const candidate of candidates) {
      const file = join(dist, candidate);
      if (!file.startsWith(dist)) continue;
      try {
        if (!(await stat(file)).isFile()) continue;
        const ext = file.slice(file.lastIndexOf('.'));
        res.writeHead(200, {
          'content-type': TYPES[ext] ?? 'application/octet-stream',
        });
        res.end(await readFile(file));
        return;
      } catch {
        // try the next candidate
      }
    }
    res.writeHead(404).end();
  });
  await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));
  return { close: () => new Promise((resolve) => server.close(resolve)) };
}

const ROUTES = [
  { path: '/', heading: 'Theory Network', title: 'Theory Network' },
  {
    path: '/portfolio/firefly',
    heading: 'Firefly',
    title: 'Firefly | Theory Network',
  },
];

const server = await preview({
  root,
  logLevel: 'error',
  preview: { port: PORT, strictPort: true, host: '127.0.0.1' },
});
const browser = await chromium.launch();
const failures = [];
// Written after every route is captured: the preview server falls back to
// dist/index.html for unknown paths, so it must stay the pristine app shell
// until the last route has been rendered.
const outputs = [];

try {
  for (const route of ROUTES) {
    const page = await browser.newPage();
    // Keep client-only content (the federated remote) out of the captured HTML.
    await page.addInitScript(() => {
      window.__PRERENDER__ = true;
    });
    const errors = [];
    page.on(
      'console',
      (msg) => msg.type() === 'error' && errors.push(msg.text()),
    );
    page.on('pageerror', (err) => errors.push(String(err)));

    await page.goto(`http://127.0.0.1:${PORT}${route.path}`, {
      waitUntil: 'load',
    });
    await page.waitForFunction(() => window.__APP_READY__);
    await page.locator('#root h1').first().waitFor();
    const html = `<!DOCTYPE html>${await page.evaluate(
      () => document.documentElement.outerHTML,
    )}`;
    await page.close();

    const heading = html
      .match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1]
      ?.replace(/<[^>]+>/g, '');
    const titles = html.match(/<title[^>]*>[\s\S]*?<\/title>/g) ?? [];
    if (heading !== route.heading) {
      failures.push(
        `${route.path}: expected h1 "${route.heading}", got "${heading}"`,
      );
    }
    if (titles.length !== 1 || !titles[0].includes(route.title)) {
      failures.push(
        `${route.path}: expected one <title> "${route.title}", got ${JSON.stringify(titles)}`,
      );
    }
    if (errors.length)
      failures.push(`${route.path}: console errors: ${errors.join(' | ')}`);

    const file =
      route.path === '/'
        ? join(dist, 'index.html')
        : join(dist, route.path, 'index.html');
    outputs.push({ file, html, path: route.path });
  }
} finally {
  await server.close();
}

for (const { file, html, path } of outputs) {
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, html);
  console.log(`prerendered ${path} -> ${file.replace(`${root}/`, '')}`);
}

// Second pass: load the saved pages and check the client takes over cleanly:
// no console errors, the rendered DOM equals the prerendered HTML, and there is
// still exactly one <title> and description. The remote stays unmounted, as
// during capture.
if (!failures.length) {
  const check = await serveDist();
  const diffAt = (a, b) => {
    const at = [...a].findIndex((c, i) => c !== b[i]);
    const i = at === -1 ? Math.min(a.length, b.length) : at;
    return `at char ${i}: prerendered "${a.slice(Math.max(0, i - 40), i + 80)}" vs client "${b.slice(Math.max(0, i - 40), i + 80)}"`;
  };
  const rootInner = (html) =>
    html.match(/<div id="root">([\s\S]*)<\/div>\s*<\/body>/)?.[1] ?? null;
  try {
    for (const route of ROUTES) {
      const url = `http://127.0.0.1:${PORT}${route.path}`;
      const served = await (await fetch(url)).text();
      const page = await browser.newPage();
      await page.addInitScript(() => {
        window.__PRERENDER__ = true;
      });
      const errors = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error' || msg.type() === 'warning')
          errors.push(msg.text());
      });
      page.on('pageerror', (err) => errors.push(String(err)));
      await page.goto(url, { waitUntil: 'load' });
      await page.waitForFunction(() => window.__APP_READY__);
      const live = await page.evaluate(() => ({
        root: document.getElementById('root').innerHTML,
        titles: document.querySelectorAll('title').length,
        descriptions: document.querySelectorAll('meta[name="description"]')
          .length,
        title: document.title,
      }));
      await page.close();

      if (errors.length) {
        failures.push(`${route.path}: console errors: ${errors.join(' | ')}`);
      }
      if (rootInner(served) !== live.root) {
        failures.push(
          `${route.path}: client render differs from prerendered HTML: ${diffAt(rootInner(served) ?? '', live.root)}`,
        );
      }
      if (
        live.titles !== 1 ||
        live.descriptions !== 1 ||
        live.title !== route.title
      ) {
        failures.push(
          `${route.path}: head after client render: ${live.titles} <title>, ${live.descriptions} descriptions, title "${live.title}"`,
        );
      }
    }
  } finally {
    await check.close();
  }
}
await browser.close();

if (failures.length) {
  console.error(`\nPrerender failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
