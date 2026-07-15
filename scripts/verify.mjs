import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const distDir = path.join(rootDir, 'dist');

async function listFiles(dir, prefix = '') {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(path.join(dir, entry.name), relative));
    else files.push(relative);
  }
  return files.sort();
}

function count(text, pattern) {
  return [...text.matchAll(pattern)].length;
}

function toDistPath(reference, basePath) {
  if (!reference || reference.startsWith('#') || reference.startsWith('data:')) return null;
  const url = new URL(reference, `https://portfolio.invalid${basePath}`);
  if (url.origin !== 'https://portfolio.invalid') return null;
  if (!url.pathname.startsWith(basePath)) {
    throw new Error(`Internal URL escapes the configured base path: ${reference}`);
  }
  let relative = url.pathname.slice(basePath.length);
  if (!relative || relative.endsWith('/')) relative += 'index.html';
  return decodeURIComponent(relative);
}

async function main() {
  const files = await listFiles(distDir);
  const report = JSON.parse(await readFile(path.join(distDir, 'build-report.json'), 'utf8'));
  const projects = JSON.parse(await readFile(path.join(rootDir, 'content', 'projects.json'), 'utf8'));
  const htmlFiles = files.filter((file) => file.endsWith('.html'));
  const htmlByFile = new Map();
  for (const file of htmlFiles) {
    htmlByFile.set(file, await readFile(path.join(distDir, file), 'utf8'));
  }

  const expectedFiles = [...report.publicFiles, 'build-report.json'].sort();
  if (JSON.stringify(files) !== JSON.stringify(expectedFiles)) {
    throw new Error(`Published file whitelist mismatch.\nExpected: ${expectedFiles.join(', ')}\nActual: ${files.join(', ')}`);
  }

  const forbiddenBinary = /\.(?:pdf|docx?|pptx?|xlsx?|psd|ai|indd|zip|heic|jpe?g|png|webp|gif|mp4|mov|avi)$/i;
  const forbiddenFiles = files.filter((file) => forbiddenBinary.test(file));
  if (forbiddenFiles.length) {
    throw new Error(`Unapproved document, media, or project assets entered dist: ${forbiddenFiles.join(', ')}`);
  }

  const combinedHtml = [...htmlByFile.values()].join('\n');
  const forbiddenMarkup = [
    [/mailto:/i, 'email link'],
    [/tel:/i, 'telephone link'],
    [/<meta\s+name=["']author["']/i, 'author metadata'],
    [/schema\.org\/Person/i, 'Person structured data'],
    [/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i, 'email address']
  ];
  for (const [pattern, label] of forbiddenMarkup) {
    if (pattern.test(combinedHtml)) throw new Error(`Privacy gate found forbidden ${label}.`);
  }

  for (const project of projects.filter((item) => item.status !== 'approved')) {
    if (combinedHtml.includes(project.title)) {
      throw new Error(`Draft project leaked into public HTML: ${project.slug}`);
    }
  }

  if (report.personalDataIncluded !== false || report.projectAssetsIncluded !== false) {
    throw new Error('Build report must explicitly confirm that personal data and project assets are absent.');
  }

  for (const [file, html] of htmlByFile) {
    if (!/^<!doctype html>/i.test(html)) throw new Error(`${file} is missing a doctype.`);
    if (!/<html\s+lang=/i.test(html)) throw new Error(`${file} is missing a language declaration.`);
    if (count(html, /<main\b/g) !== 1) throw new Error(`${file} must contain exactly one main landmark.`);
    if (count(html, /<h1\b/g) !== 1) throw new Error(`${file} must contain exactly one h1.`);
    if (!/class="skip-link"/.test(html)) throw new Error(`${file} is missing a keyboard skip link.`);
    if (!/<meta\s+name="viewport"/.test(html)) throw new Error(`${file} is missing viewport metadata.`);
    if (!/<meta\s+http-equiv="Content-Security-Policy"/.test(html)) throw new Error(`${file} is missing its content security policy.`);

    const references = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((match) => match[1]);
    for (const reference of references) {
      const target = toDistPath(reference, report.basePath);
      if (target && !files.includes(target)) {
        throw new Error(`${file} references missing public file ${target} via ${reference}.`);
      }
    }
  }

  const home = htmlByFile.get('index.html');
  if (!home.includes('NO PERSONAL DATA · NO PROJECT ASSETS')) {
    throw new Error('Home page is missing the explicit privacy state.');
  }
  if (!home.includes('noindex,nofollow,noarchive')) {
    throw new Error('Anonymous shell must remain noindex until publication policy changes explicitly.');
  }
  if (report.publishedProjects === 0 && count(home, /class="slot"/g) !== 3) {
    throw new Error('Zero-project production state must render exactly three honest empty slots.');
  }

  const css = await readFile(path.join(distDir, 'assets', 'styles.css'), 'utf8');
  if (!css.includes('@media (prefers-reduced-motion: reduce)')) {
    throw new Error('Reduced-motion support is missing.');
  }
  if (!css.includes(':focus-visible')) throw new Error('Visible keyboard focus styling is missing.');

  console.log(`Verified ${files.length} public files, ${htmlFiles.length} HTML pages, and ${report.publishedProjects} approved projects.`);
}

await main();
