import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');

const requiredSiteFields = ['siteTitle', 'pageTitle', 'description', 'language', 'hero', 'statement', 'method'];
const requiredProjectFields = ['slug', 'title', 'summary', 'category', 'role', 'year', 'status', 'approvedForPublic', 'assetLicense', 'sections'];
const allowedProjectStatuses = new Set(['draft', 'approved']);

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function normalizeBasePath(value) {
  const raw = value || '/wei-portfolio/';
  return `/${raw.split('/').filter(Boolean).join('/')}/`;
}

function assertString(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} must be a non-empty string.`);
  }
}

export function validateContent(site, projects) {
  if (!site || typeof site !== 'object' || Array.isArray(site)) {
    throw new Error('content/site.json must contain an object.');
  }

  for (const field of requiredSiteFields) {
    if (!(field in site)) throw new Error(`site.${field} is required.`);
  }

  for (const field of ['siteTitle', 'pageTitle', 'description', 'language', 'statement']) {
    assertString(site[field], `site.${field}`);
  }

  if (!site.hero || !Array.isArray(site.hero.lines) || site.hero.lines.length < 2) {
    throw new Error('site.hero.lines must contain at least two lines.');
  }

  for (const [index, item] of site.method.entries()) {
    for (const field of ['number', 'name', 'description']) {
      assertString(item?.[field], `site.method[${index}].${field}`);
    }
  }

  if (!Array.isArray(projects)) throw new Error('content/projects.json must contain an array.');

  const slugs = new Set();
  projects.forEach((project, index) => {
    if (!project || typeof project !== 'object' || Array.isArray(project)) {
      throw new Error(`projects[${index}] must be an object.`);
    }

    for (const field of requiredProjectFields) {
      if (!(field in project)) throw new Error(`projects[${index}].${field} is required.`);
    }

    for (const field of ['slug', 'title', 'summary', 'category', 'role', 'year', 'status', 'assetLicense']) {
      assertString(project[field], `projects[${index}].${field}`);
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project.slug)) {
      throw new Error(`projects[${index}].slug must use lowercase kebab-case.`);
    }

    if (slugs.has(project.slug)) throw new Error(`Duplicate project slug: ${project.slug}`);
    slugs.add(project.slug);

    if (!allowedProjectStatuses.has(project.status)) {
      throw new Error(`projects[${index}].status must be draft or approved.`);
    }

    if (!Array.isArray(project.sections) || project.sections.length < 2) {
      throw new Error(`projects[${index}].sections must contain at least two sections.`);
    }

    project.sections.forEach((section, sectionIndex) => {
      assertString(section?.heading, `projects[${index}].sections[${sectionIndex}].heading`);
      assertString(section?.body, `projects[${index}].sections[${sectionIndex}].body`);
    });

    if (project.status === 'approved') {
      if (project.approvedForPublic !== true) {
        throw new Error(`Approved project ${project.slug} requires approvedForPublic: true.`);
      }
      if (project.assetLicense !== 'cleared') {
        throw new Error(`Approved project ${project.slug} requires assetLicense: cleared.`);
      }
    }
  });

  return true;
}

function pageShell({ site, title, description, body, basePath, buildId, pageClass = '' }) {
  const robots = site.allowIndexing ? 'index,follow,max-image-preview:large' : 'noindex,nofollow,noarchive';
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);

  return `<!doctype html>
<html lang="${escapeHtml(site.language)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="description" content="${safeDescription}">
  <meta name="robots" content="${robots}">
  <meta name="theme-color" content="#f1eee8">
  <meta name="build-id" content="${escapeHtml(buildId)}">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; base-uri 'none'; object-src 'none'; form-action 'none'; img-src 'self' data:; style-src 'self'; script-src 'self'">
  <title>${safeTitle}</title>
  <link rel="stylesheet" href="${basePath}assets/styles.css">
  <link rel="manifest" href="${basePath}manifest.webmanifest">
  <script src="${basePath}assets/app.js" defer></script>
</head>
<body class="${escapeHtml(pageClass)}">
  <a class="skip-link" href="#main">Skip to content</a>
  ${body}
</body>
</html>`;
}

function navigation(basePath) {
  return `<header class="topbar">
    <a class="wordmark" href="${basePath}" aria-label="Anonymous portfolio home">INDEX / 00</a>
    <button class="menu-toggle" type="button" data-menu-toggle aria-expanded="false" aria-controls="primary-nav">MENU</button>
    <nav aria-label="Primary navigation">
      <ul class="nav-links" id="primary-nav" data-menu data-open="false">
        <li><a href="${basePath}#system" data-section-link>SYSTEM</a></li>
        <li><a href="${basePath}#slots" data-section-link>SLOTS</a></li>
        <li><a href="${basePath}#protocol" data-section-link>PROTOCOL</a></li>
      </ul>
    </nav>
  </header>`;
}

function placeholderSlots() {
  const labels = ['BRAND × SPACE', 'VISUAL SYSTEM', 'CREATIVE TOOL'];
  return `<div class="slot-grid" aria-label="Empty project positions">
    ${labels.map((label, index) => `<article class="slot">
      <div class="slot__meta">
        <p class="meta">SLOT ${String(index + 1).padStart(2, '0')}</p>
        <p class="meta">${escapeHtml(label)}</p>
      </div>
      <div class="slot__visual" role="img" aria-label="Abstract structural placeholder; not a project image"></div>
      <h3 class="slot__title">Reserved for an approved case study</h3>
      <p class="slot__note">Empty by design · awaiting approval</p>
    </article>`).join('\n')}
  </div>`;
}

function projectCards(projects, basePath) {
  return `<div class="project-grid">
    ${projects.map((project, index) => `<a class="project-card" href="${basePath}work/${escapeHtml(project.slug)}/">
      <div class="project-card__meta">
        <p class="meta">CASE ${String(index + 1).padStart(2, '0')}</p>
        <p class="meta">${escapeHtml(project.category)}</p>
      </div>
      <div class="project-card__visual" aria-hidden="true">${escapeHtml(project.title.slice(0, 1).toUpperCase())}</div>
      <h3 class="project-card__title">${escapeHtml(project.title)}</h3>
      <p class="project-card__summary">${escapeHtml(project.summary)}</p>
    </a>`).join('\n')}
  </div>`;
}

function homePage(site, projects, basePath, buildId) {
  const hasProjects = projects.length > 0;
  const methods = site.method.map((item, index) => `<li class="method-row">
    <p class="meta ${index === 0 ? 'meta--signal' : ''}">${escapeHtml(item.number)}</p>
    <h3 class="method-row__name">${escapeHtml(item.name)}</h3>
    <p class="method-row__description">${escapeHtml(item.description)}</p>
  </li>`).join('\n');

  const protocol = [
    ['01', 'DRAFT', 'Content stays private.'],
    ['02', 'VALIDATE', 'Fields, links, privacy.'],
    ['03', 'PREVIEW', 'Review the exact build.'],
    ['04', 'APPROVE', 'Explicit human decision.'],
    ['05', 'PUBLISH', 'Deploy and verify live.']
  ].map(([number, title, description], index) => `<article class="protocol-step ${index === 3 ? 'is-gate' : ''}">
    <p class="meta ${index === 3 ? 'meta--signal' : ''}">${number}</p>
    <div class="protocol-step__copy">
      <h3 class="protocol-step__title">${title}</h3>
      <p class="protocol-step__description">${description}</p>
    </div>
  </article>`).join('\n');

  const body = `${navigation(basePath)}
  <main id="main">
    <section class="hero" id="system" aria-labelledby="hero-title">
      <div class="hero__meta">
        <p class="meta">${escapeHtml(site.hero.eyebrow)}</p>
        <p class="meta">STATUS · ${escapeHtml(site.hero.status)}</p>
      </div>
      <h1 class="hero__title" id="hero-title">${site.hero.lines.map((line) => `<span>${escapeHtml(line)}</span>`).join('')}</h1>
      <div class="hero__bottom">
        <p class="hero__note">${escapeHtml(site.hero.note)}</p>
        <a class="round-link" href="#slots">VIEW<br>SYSTEM ↓</a>
      </div>
      <div class="signal-rule" aria-hidden="true"></div>
    </section>

    <section class="statement" aria-labelledby="position-title">
      <p class="meta">POSITION / 01</p>
      <h2 class="statement__copy" id="position-title">${escapeHtml(site.statement)}</h2>
    </section>

    <section class="slots" id="slots" aria-labelledby="slots-title">
      <div class="section-heading">
        <div class="heading-stack">
          <p class="meta meta--signal">${hasProjects ? 'APPROVED CASE STUDIES' : 'FUTURE CASE STUDIES'} / 02</p>
          <h2 class="section-title" id="slots-title">${hasProjects ? 'Selected work.' : 'Three spaces.\nNothing invented.'.replace('\n', '<br>')}</h2>
        </div>
        <p class="section-heading__note">${hasProjects
          ? 'Only projects that passed the publication gate appear here.'
          : 'Each slot remains empty until a project is explicitly approved for publication. The structure is tested without pretending the work exists.'}</p>
      </div>
      ${hasProjects ? projectCards(projects, basePath) : placeholderSlots()}
    </section>

    <section class="method" aria-labelledby="method-title">
      <div class="method__heading">
        <p class="meta">OPERATING METHOD / 03</p>
        <h2 class="section-title" id="method-title">From ambiguity<br>to form.</h2>
      </div>
      <ol class="method-list">${methods}</ol>
    </section>

    <section class="protocol" id="protocol" aria-labelledby="protocol-title">
      <div class="protocol__heading">
        <p class="meta meta--signal">PUBLICATION PROTOCOL / 04</p>
        <h2 class="section-title" id="protocol-title">Automation<br>with a human gate.</h2>
      </div>
      <div class="protocol-flow">${protocol}</div>
    </section>
  </main>
  <footer class="footer">
    <p class="meta">ANONYMOUS PORTFOLIO SYSTEM</p>
    <p class="meta">NO PERSONAL DATA · NO PROJECT ASSETS</p>
    <a class="meta" href="#main">BACK TO TOP ↑</a>
  </footer>`;

  return pageShell({
    site,
    title: site.pageTitle,
    description: site.description,
    body,
    basePath,
    buildId
  });
}

function projectPage(site, project, basePath, buildId) {
  const sections = project.sections.map((section, index) => `<section class="case-section" aria-labelledby="section-${index}">
    <p class="meta">${String(index + 1).padStart(2, '0')}</p>
    <div>
      <h2 id="section-${index}">${escapeHtml(section.heading)}</h2>
      <p>${escapeHtml(section.body)}</p>
    </div>
  </section>`).join('\n');

  const body = `${navigation(basePath)}
  <main id="main">
    <article>
      <header class="case-hero">
        <div>
          <p class="meta meta--signal">APPROVED CASE STUDY · ${escapeHtml(project.year)}</p>
          <p class="meta">${escapeHtml(project.category)} · ${escapeHtml(project.role)}</p>
        </div>
        <h1>${escapeHtml(project.title)}</h1>
      </header>
      <section class="case-summary">
        <p class="meta">SUMMARY</p>
        <p class="statement__copy">${escapeHtml(project.summary)}</p>
      </section>
      ${sections}
    </article>
  </main>
  <p class="privacy-note">This page was generated only after its content record passed the explicit public-approval gate.</p>
  <footer class="footer">
    <p class="meta">ANONYMOUS PORTFOLIO SYSTEM</p>
    <a class="meta" href="${basePath}#slots">ALL CASE STUDIES ↑</a>
  </footer>`;

  return pageShell({
    site,
    title: `${project.title} — ${site.siteTitle}`,
    description: project.summary,
    body,
    basePath,
    buildId,
    pageClass: 'case-page'
  });
}

function notFoundPage(site, basePath, buildId) {
  const body = `<main class="case-hero" id="main">
    <p class="meta meta--signal">ERROR / 404</p>
    <h1>NOTHING<br>HERE.</h1>
    <a class="round-link" href="${basePath}">RETURN<br>HOME ↗</a>
  </main>`;

  return pageShell({
    site,
    title: `404 — ${site.siteTitle}`,
    description: 'The requested page does not exist.',
    body,
    basePath,
    buildId
  });
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

export async function buildSite({
  sitePath = path.join(rootDir, 'content', 'site.json'),
  projectsPath = path.join(rootDir, 'content', 'projects.json'),
  outDir = path.join(rootDir, 'dist'),
  basePath = normalizeBasePath(process.env.SITE_BASE_PATH),
  buildId = process.env.GITHUB_SHA?.slice(0, 12) || 'local-reproducible'
} = {}) {
  const [site, projects] = await Promise.all([readJson(sitePath), readJson(projectsPath)]);
  validateContent(site, projects);

  const approvedProjects = projects
    .filter((project) => project.status === 'approved' && project.approvedForPublic === true && project.assetLicense === 'cleared')
    .sort((a, b) => Number(b.year) - Number(a.year) || a.title.localeCompare(b.title));

  await rm(outDir, { recursive: true, force: true });
  await mkdir(path.join(outDir, 'assets'), { recursive: true });
  await Promise.all([
    cp(path.join(rootDir, 'src', 'styles.css'), path.join(outDir, 'assets', 'styles.css')),
    cp(path.join(rootDir, 'src', 'app.js'), path.join(outDir, 'assets', 'app.js'))
  ]);

  await writeFile(path.join(outDir, 'index.html'), homePage(site, approvedProjects, basePath, buildId));
  await writeFile(path.join(outDir, '404.html'), notFoundPage(site, basePath, buildId));
  await writeFile(path.join(outDir, '.nojekyll'), '');

  for (const project of approvedProjects) {
    const projectDir = path.join(outDir, 'work', project.slug);
    await mkdir(projectDir, { recursive: true });
    await writeFile(path.join(projectDir, 'index.html'), projectPage(site, project, basePath, buildId));
  }

  const manifest = {
    name: site.siteTitle,
    short_name: 'Portfolio',
    start_url: basePath,
    display: 'standalone',
    background_color: '#f1eee8',
    theme_color: '#f1eee8'
  };
  await writeFile(path.join(outDir, 'manifest.webmanifest'), `${JSON.stringify(manifest, null, 2)}\n`);

  const robots = site.allowIndexing
    ? `User-agent: *\nAllow: ${basePath}\n`
    : 'User-agent: *\nDisallow: /\n';
  await writeFile(path.join(outDir, 'robots.txt'), robots);

  if (site.allowIndexing) {
    const urls = [basePath, ...approvedProjects.map((project) => `${basePath}work/${project.slug}/`)];
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${escapeHtml(url)}</loc></url>`).join('\n')}\n</urlset>\n`;
    await writeFile(path.join(outDir, 'sitemap.xml'), sitemap);
  }

  const publicFiles = [
    '.nojekyll',
    '404.html',
    'assets/app.js',
    'assets/styles.css',
    'index.html',
    'manifest.webmanifest',
    'robots.txt',
    ...approvedProjects.map((project) => `work/${project.slug}/index.html`)
  ].sort();

  const fingerprint = createHash('sha256')
    .update(JSON.stringify({ site, approvedProjects, basePath }))
    .digest('hex')
    .slice(0, 16);

  const report = {
    schemaVersion: 1,
    buildId,
    fingerprint,
    basePath,
    publishedProjects: approvedProjects.length,
    personalDataIncluded: false,
    projectAssetsIncluded: false,
    publicFiles
  };
  await writeFile(path.join(outDir, 'build-report.json'), `${JSON.stringify(report, null, 2)}\n`);

  return { site, projects, approvedProjects, outDir, basePath, buildId, fingerprint };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = await buildSite();
  console.log(`Built ${result.approvedProjects.length} approved project(s) with fingerprint ${result.fingerprint}.`);
}
