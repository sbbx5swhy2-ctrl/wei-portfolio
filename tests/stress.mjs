import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSite } from '../scripts/build.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(testDir, '..');
const siteSource = path.join(rootDir, 'content', 'site.json');

function project(index, overrides = {}) {
  return {
    slug: `synthetic-case-${String(index).padStart(2, '0')}`,
    title: index === 30
      ? 'A deliberately long synthetic project title 用于验证多语言与换行边界'
      : `Synthetic Case ${String(index).padStart(2, '0')}`,
    summary: 'Synthetic validation content; not a real project or public claim.',
    category: index % 2 ? 'VISUAL SYSTEM' : 'SPATIAL LOGIC',
    role: 'TEST FIXTURE',
    year: String(2020 + (index % 7)),
    status: 'approved',
    approvedForPublic: true,
    assetLicense: 'cleared',
    sections: [
      { heading: 'Question', body: 'Can the template contain this structure without layout-specific assumptions?' },
      { heading: 'Evidence', body: 'The generated page is inspected as a static document during the test.' }
    ],
    ...overrides
  };
}

async function treeHash(dir) {
  const hash = createHash('sha256');
  async function walk(current, prefix = '') {
    const entries = (await readdir(current, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const relative = path.posix.join(prefix, entry.name);
      if (entry.isDirectory()) await walk(path.join(current, entry.name), relative);
      else {
        hash.update(relative);
        hash.update(await readFile(path.join(current, entry.name)));
      }
    }
  }
  await walk(dir);
  return hash.digest('hex');
}

async function writeProjects(dir, projects) {
  const file = path.join(dir, 'projects.json');
  await writeFile(file, `${JSON.stringify(projects, null, 2)}\n`);
  return file;
}

async function assertRejects(task, expectedMessage) {
  let rejected = false;
  try {
    await task();
  } catch (error) {
    rejected = String(error.message).includes(expectedMessage);
  }
  if (!rejected) throw new Error(`Expected rejection containing: ${expectedMessage}`);
}

const temp = await mkdtemp(path.join(os.tmpdir(), 'portfolio-stress-'));

try {
  const zeroProjects = await writeProjects(temp, []);
  const zeroOut = path.join(temp, 'out-0');
  await buildSite({ sitePath: siteSource, projectsPath: zeroProjects, outDir: zeroOut, basePath: '/portfolio-test/', buildId: 'stress-fixed' });
  const zeroHome = await readFile(path.join(zeroOut, 'index.html'), 'utf8');
  if ((zeroHome.match(/class="slot"/g) || []).length !== 3) throw new Error('0-project state did not render three honest slots.');

  const oneProjects = await writeProjects(temp, [project(1)]);
  const oneOut = path.join(temp, 'out-1');
  await buildSite({ sitePath: siteSource, projectsPath: oneProjects, outDir: oneOut, basePath: '/portfolio-test/', buildId: 'stress-fixed' });
  const onePage = await readFile(path.join(oneOut, 'work', 'synthetic-case-01', 'index.html'), 'utf8');
  if (!onePage.includes('Synthetic Case 01')) throw new Error('1-project state did not generate its case page.');

  const thirty = Array.from({ length: 30 }, (_, index) => project(index + 1));
  const thirtyProjects = await writeProjects(temp, thirty);
  const thirtyOutA = path.join(temp, 'out-30-a');
  const thirtyOutB = path.join(temp, 'out-30-b');
  await buildSite({ sitePath: siteSource, projectsPath: thirtyProjects, outDir: thirtyOutA, basePath: '/portfolio-test/', buildId: 'stress-fixed' });
  await buildSite({ sitePath: siteSource, projectsPath: thirtyProjects, outDir: thirtyOutB, basePath: '/portfolio-test/', buildId: 'stress-fixed' });
  const workDirs = await readdir(path.join(thirtyOutA, 'work'));
  if (workDirs.length !== 30) throw new Error(`30-project state generated ${workDirs.length} pages.`);
  if (await treeHash(thirtyOutA) !== await treeHash(thirtyOutB)) throw new Error('Two clean builds were not byte-for-byte reproducible.');

  const draftTitle = 'PRIVATE SYNTHETIC RECORD THAT MUST NEVER APPEAR';
  const mixedProjects = await writeProjects(temp, [
    project(1),
    project(2, { slug: 'private-draft', title: draftTitle, status: 'draft', approvedForPublic: false, assetLicense: 'not-cleared' })
  ]);
  const mixedOut = path.join(temp, 'out-mixed');
  await buildSite({ sitePath: siteSource, projectsPath: mixedProjects, outDir: mixedOut, basePath: '/portfolio-test/', buildId: 'stress-fixed' });
  const mixedHome = await readFile(path.join(mixedOut, 'index.html'), 'utf8');
  if (mixedHome.includes(draftTitle)) throw new Error('Draft title leaked into production HTML.');
  try {
    await readFile(path.join(mixedOut, 'work', 'private-draft', 'index.html'));
    throw new Error('Draft page was generated.');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  const invalidProjects = await writeProjects(temp, [project(1, { approvedForPublic: false })]);
  await assertRejects(
    () => buildSite({ sitePath: siteSource, projectsPath: invalidProjects, outDir: path.join(temp, 'out-invalid'), basePath: '/portfolio-test/', buildId: 'stress-fixed' }),
    'requires approvedForPublic: true'
  );

  console.log('Stress tests passed: 0, 1, 30, draft-exclusion, invalid-approval, multilingual length, and reproducible-build cases.');
} finally {
  await rm(temp, { recursive: true, force: true });
}
