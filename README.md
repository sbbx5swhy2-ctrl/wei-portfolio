# Anonymous Portfolio System

A privacy-safe, zero-dependency portfolio framework. The deployed shell intentionally contains no name, contact details, biography, client information, or project assets.

## Current public state

- Zero published projects
- Three clearly labelled empty case-study positions
- No analytics, external fonts, forms, or third-party content
- Search indexing disabled
- Static HTML remains readable when JavaScript is unavailable

## Automated publication gate

```text
Draft → Validate → Preview → Approve → Publish → Verify live
```

Project records live in `content/projects.json`. A record is generated only when all of these are true:

- `status` is `approved`
- `approvedForPublic` is `true`
- `assetLicense` is `cleared`
- every required field and case-study section passes schema validation

Draft records never enter `dist/`. GitHub Pages publishes only the audited `dist/` directory, never the repository root.

## Local verification

Requires Node.js 20 or newer. No package installation is required.

```bash
npm test
npm run serve
```

Open `http://127.0.0.1:4173/wei-portfolio/`.

`npm test` performs a clean production build, privacy and link verification, plus stress builds for 0, 1, and 30 synthetic projects. It also confirms draft exclusion, approval failure, multilingual long-title handling, and byte-for-byte reproducibility.

## Repository structure

```text
content/               public content records
src/                   CSS and progressive-enhancement JavaScript
scripts/build.mjs      static site generator and schema gate
scripts/verify.mjs     output whitelist, privacy, link, and semantic checks
tests/stress.mjs       boundary and reproducibility tests
dist/                  generated public artifact; never edited by hand
```

## Privacy boundary

Do not place private drafts, original project files, source documents, or unapproved media in this public repository. Hiding a file from navigation does not make it private; Git history and direct asset URLs remain public.
