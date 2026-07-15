# Solution and validation record

## Problem definition

Build and deploy a visually complete portfolio framework that contains zero personal information and zero real project assets today, while allowing future approved records to generate case-study pages automatically and safely.

## Independent routes

| Route | Core assumption | Conclusion | Principal failure risk | Falsifiable check |
|---|---|---|---|---|
| A — First principles | A portfolio must first communicate a coherent argument and grow from structured evidence. | Static generation with a content schema and human publication approval. | Choosing a framework before understanding real case studies. | Add structurally different synthetic cases without editing templates. |
| B — Structured decomposition | Content, interface, privacy, deployment, and validation must have separate contracts. | Component-like layout, structured records, output whitelist, and layered tests. | A rigid schema may not fit spatial, brand, and tool-based work equally. | Stress short, long, multilingual, 0, 1, and 30-item inputs. |
| C — Counterexample construction | A strong-looking site is still wrong if mobile, JavaScript, privacy, or deployment fails. | Static HTML first; enhancement only; drafts never enter public output. | Automation may report success while assets or routes fail online. | Disable JavaScript, inspect `dist`, and test every live URL and asset response. |
| D — Boundary conditions | The production state is exactly 0 projects and GitHub Project Pages has a repository subpath. | Zero-dependency generator, base-path-safe URLs, and `dist/`-only Pages deployment. | GitHub Pages may remain disabled or use the wrong source. | Require Actions success, live HTTP 200, build fingerprint match, and browser replay. |
| E — Cross-domain analogy | A portfolio combines editorial curation, museum sequencing, and a software release train. | An editorial index whose empty positions are honest, plus a gated release protocol. | The system can become more visible than the future work. | Insert an approved synthetic case and confirm the interface recedes without structural changes. |
| F — Minimal route | A single hand-written HTML file has the smallest operational surface. | Keep the interface static and dependency-free. | Manual duplication, weak content validation, and accidental root publication. | Compare one-file edits against generator output for 30 cases and draft exclusion. |

## Route comparison

Scores are relative to this problem, from 1 (weak) to 5 (strong).

| Route | Correctness | Completeness | Verifiability | Simplicity | Originality | Stability under change |
|---|---:|---:|---:|---:|---:|---:|
| Astro content collections | 4 | 5 | 4 | 3 | 3 | 5 |
| Framework-neutral static generator | 5 | 5 | 5 | 4 | 4 | 5 |
| Client-rendered SPA | 2 | 3 | 3 | 3 | 3 | 3 |
| One-file static page | 3 | 2 | 3 | 5 | 2 | 2 |
| SharePoint/CMS direct publishing | 2 | 4 | 2 | 2 | 3 | 3 |

The selected route is the zero-dependency static generator, combined with the editorial index from Route E and the privacy counterexamples from Route C. It avoids a package supply chain, renders core content without client JavaScript, and remains reproducible with Node.js alone.

## Three counterexample rounds

1. **Single failures:** no projects, JavaScript disabled, external services unavailable, or mobile-only access.
2. **Combined failures:** draft metadata plus an automatic deploy; a long bilingual title plus a narrow screen; a valid build plus an incorrect GitHub subpath.
3. **Adversarial failures:** an approved record without explicit permission, an unapproved binary copied to public output, a successful workflow serving an old page, or a rollback exposing legacy personal content.

## Two clean derivations

### Derivation one — visitor task

The current visitor cannot evaluate real work because none is authorized. Therefore the truthful public task is to demonstrate information architecture, visual judgment, and publication discipline without making project claims. This yields the anonymous editorial shell and clearly labelled empty positions.

### Derivation two — release safety

Anything committed to a public repository may remain in history. Therefore private inputs must never enter the repository, and production must be generated from an explicit public allowlist. This yields structured records, triple approval fields, `dist/` isolation, automated checks, and live fingerprint verification.

Both derivations independently require static, privacy-gated output; their conclusions are compatible.

## Assumption audit

- **Verified:** the current content source contains zero projects.
- **Verified:** the builder excludes drafts and rejects incomplete approval.
- **Verified:** only whitelisted files enter `dist/`.
- **Verified:** output uses the GitHub Project Pages base path.
- **Verified:** the Figma desktop and mobile nodes exist and can be read back.
- **Not yet verified:** GitHub Actions can enable Pages for this repository.
- **Not yet verified:** the live deployment returns HTTP 200 and matches the intended build fingerprint.
- **Not yet verified:** rendered code matches the Figma design at desktop and mobile widths.
- **Not claimed:** anonymous page content makes the hosting account itself anonymous.

## Adversarial review

The strongest attempted refutation is that “anonymous website” is impossible on a Pages URL owned by an identifiable account. This refutes strict source anonymity, but it does not refute the narrower and authorized requirement: the website page and deploy artifact contain no personal information or work. Strict source anonymity would require a neutral organization account or neutral custom domain.

The second attempted refutation is that synthetic stress cases are fake portfolio projects. They are generated only inside temporary test directories, deleted after tests, excluded from `dist/`, and never committed as public content. Therefore they test the template without making public claims.

The third attempted refutation is that a successful build proves the site runs. It does not. Completion requires a successful Pages deployment, public HTTP checks, exact build-report fingerprint, browser inspection, console-error inspection, and a fresh final replay.

## Reproduction

```bash
npm test
npm run serve
```

Then open `/wei-portfolio/`, disable JavaScript once, check the mobile and desktop layouts, request an unknown route, and compare `/wei-portfolio/build-report.json` with the expected production fingerprint.
