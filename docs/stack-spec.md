# Stack specification: deduxit.github.io's own part

The stack this site shares with the author's other sites is the stack spec in
`~/Projects/own/website-stack` (`stack-spec.md`): its fixed requirements (§1), the stack at a
glance (§2), why each choice (§3), the security baseline (§4), *Revisit when* and its sources.
This file holds this site's own decisions, as §5, numbered after that spec's sections so that
§3.7 or §4.2 names a section there and §5.1 one here. Everything the spec says that no section
here overrides holds for this site.

### 5.1 Hosting on GitHub Pages: decided 2026-11-25

The author's decision, 2026-11-25: the page stays on GitHub Pages, at `https://deduxit.github.io/`.
It overrides the spec's §1.5 (Cloudflare's free plan), §2's rows *Hosting* and *Checks and
deploy*, and §3.10.

- **Why:** the address is published. deduxit's README, its manual and its citation file name
  it, and a link someone sent holds a proof in its fragment.
- **The CSP is a `<meta>` element** in every page's head, written by Astro's `security.csp`
  (`astro.config.ts`), since Pages sends no header a site sets. It overrides §4.1. The `csp`
  check (`modules/_checks/csp.py`) recomputes its hashes from the built HTML, as §4.3 asks of
  the header. A `<meta>` policy cannot carry `frame-ancestors`; the page is meant to be framed
  (its embed code for course packs), so nothing is lost there.
- **The other headers of §4.6 are not sent**, but HSTS, which Pages sends for `github.io`
  (`strict-transport-security: max-age=31556952`, read 2026-11-25).
- **CI deploys.** Pages publishes from a GitHub Actions workflow (`.github/workflows/ci.yml`),
  which runs every flake check before it deploys. It overrides §3.10's "no CI" and local gate.
- §4.4 (no `style` attribute, checked by the flake) and §4.5 (`'wasm-unsafe-eval'`, the page
  ships WebAssembly; no `'unsafe-eval'`) hold as the spec says.

Revisit when the project takes an address of its own: then the spec's Cloudflare hosting, the
header and the local gate apply, and `deduxit.github.io` forwards to it, keeping each link's
fragment.
