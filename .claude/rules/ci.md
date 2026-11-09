---
paths:
  - ".github/**"
---

# CI

- **`ci.yml` runs `nix flake check`** on every push to `main`, every pull request and by
  hand, with nothing installed but Nix, then builds `ci-cache` (`modules/ci.nix`), which
  roots everything the checks need.
- **Two caches, for two kinds of path.** The public Cachix cache `linlog-prover` is the
  organization's and must receive only its projects' own outputs, never third-party files:
  so the run reads it (linlog's CI pushes `deduxit-web` there, and this CI never builds
  Rust) and pushes to it only the built site (`nix build .#default | cachix push`, a
  closure of itself alone), only from `main` and only while the secret
  `CACHIX_AUTH_TOKEN` exists. node_modules, Chromium, the formatters and the checks'
  results are third-party or worthless to others: they are kept between runs in GitHub's
  Actions cache, private to the repository, by cache-nix-action as the author's sites do
  (restore the newest `nix-Linux-` store, save under the hash of `ci-cache`'s store path
  when it changed, only on `main`; `prune-caches` deletes the older ones). Never give the
  `cachix-action` step an auth token or a `pushFilter`: it would push everything the run
  built or fetched.
- **The check job's `timeout-minutes` is 180**, not the hour a cached run needs: a
  nixpkgs channel release can lack a cache.nixos.org build of a tool the checks use
  (`biome` 2.6.5 at `4fe25e12`, 2026-11-09, which took runs 34 to 36 past 60 minutes and
  stopped every deploy), and the Actions cache saves the store only after a passing run,
  so the first run after such a lock move must build it within the limit. Cachix is no
  way out (third-party files, above).
- **Actions are pinned to full commit SHAs**, with the version in a trailing comment. A
  new SHA is looked up fresh, never remembered (`gh api repos/<owner>/<repo>/releases/latest`,
  then `.../git/ref/tags/<tag>`, following an annotated tag once more), and every `gh`
  call asks first.
- **`actionlint`** (a flake check) validates the workflow and its shell steps.
- **The deployment to GitHub Pages** is this workflow's: on `main` alone, after
  `nix flake check` passed, the `check` job builds `packages.default` into `site/` and
  uploads it (`upload-pages-artifact`, which drops dot-files: nothing the site serves may
  start with a dot), and the `deploy` job, the only one with `pages: write` and
  `id-token: write`, publishes it (`deploy-pages`) in the `github-pages` environment. The
  repository's Pages source is "GitHub Actions": no Jekyll build, no `.nojekyll`.
- **`/deduxit` is the Pages site of linlog's repository** (its rustdoc and manual), and
  **`/rocq-deduxit` the Rocq library's**, project sites on the same address: nothing here may
  publish a path at either (the `pages-paths` check), and the service worker leaves them
  alone (`.claude/rules/web.md`). The library's old project site, `/rocq-linlog/`, is answered
  by this site since its repository was renamed: `src/pages/rocq-linlog/` forwards it to
  `/rocq-deduxit/` with a refresh (Pages has no redirects), which `pages-paths` and an e2e
  test hold. A repository renamed later is forwarded the same way.
