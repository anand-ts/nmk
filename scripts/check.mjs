import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = path.join(root, 'dist');
const routes = ['index.html', 'writings/index.html', 'contact/index.html'];
const documents = new Map(await Promise.all(routes.map(async (route) => [route, await readFile(path.join(dist, route), 'utf8')])));
const content = JSON.parse(await readFile(path.join(root, 'content/portfolio.json'), 'utf8'));
let checkedReferences = 0;

async function checkReference(value, route) {
  if (/^https:\/\//.test(value)) { new URL(value); return; }
  if (/^(mailto:|tel:|data:)/.test(value)) return;
  const [pathname, hash] = value.split('#');
  let target = pathname.startsWith('/') ? path.join(dist, pathname) : path.resolve(dist, path.dirname(route), pathname || path.basename(route));
  const relative = path.relative(dist, target);
  assert(!relative.startsWith('..'), `Reference escapes dist: ${value}`);
  let info = await stat(target).catch(() => { throw new Error(`Broken reference in ${route}: ${value}`); });
  if (info.isDirectory()) { target = path.join(target, 'index.html'); info = await stat(target); }
  assert(info.isFile(), `Not a file: ${value}`);
  if (hash) {
    const destination = await readFile(target, 'utf8');
    assert(destination.includes(`id="${hash}"`), `Missing anchor in ${route}: ${value}`);
  }
  checkedReferences++;
}

for (const [route, html] of documents) {
  assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1, `${route} needs exactly one h1`);
  assert(html.includes('lang="en"'), `${route} needs a document language`);
  assert(html.includes('aria-label="Main navigation"'), `${route} needs navigation`);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, `Duplicate IDs in ${route}`);
  for (const match of html.matchAll(/\b(?:href|src|data-src|poster)="([^"]+)"/g)) await checkReference(match[1], route);
  for (const match of html.matchAll(/\bsrcset="([^"]+)"/g)) {
    for (const candidate of match[1].split(',')) await checkReference(candidate.trim().split(/\s+/)[0], route);
  }
  for (const match of html.matchAll(/<img\b[^>]*>/g)) {
    assert(/alt="[^"]+"/.test(match[0]), `Image needs alt text in ${route}`);
    assert(/width="\d+"/.test(match[0]) && /height="\d+"/.test(match[0]), `Image needs dimensions in ${route}`);
  }
}

const home = documents.get('index.html');
for (const project of content.projects) {
  assert(project.images.length >= 1, `${project.title} needs a photograph`);
  assert(home.includes(`id="${project.id}"`), `Missing series: ${project.title}`);
}
assert.equal((home.match(/data-lightbox /g) || []).length, content.projects.reduce((sum, project) => sum + project.images.length, 0));
assert(!documents.get('contact/index.html').includes('site-footer'), 'Contact should remain blank below navigation');
assert(!/<(?:p|form|button|img)\b/.test(documents.get('contact/index.html').split('<main')[1].split('</main>')[0]), 'Contact body should remain blank');
for (const filename of ['src/main.js', 'src/gallery.js', 'scripts/build.mjs', 'scripts/serve.mjs']) {
  const check = spawnSync(process.execPath, ['--check', path.join(root, filename)], { encoding: 'utf8' });
  assert.equal(check.status, 0, check.stderr);
}
console.log(`Checked ${routes.length} HTML documents, ${checkedReferences} local references, image dimensions/alt text, blank Contact, and JavaScript syntax.`);
