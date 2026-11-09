# linlog © Fabian Lukas Grubmüller 2026
# Licensed under the EUPL

# deduxit's web front end, served at https://deduxit.github.io/, as a
# flake in the dendritic pattern (flake-parts + import-tree): every .nix file
# under modules/ is discovered automatically and configures one aspect of the
# flake (a path segment starting with `_' is skipped), so this file declares
# the inputs and nothing else.
{
  description = "deduxit in the browser: linear logic proved by clicking";

  inputs = {
    # The prover. Its flake builds the package `deduxit-web' (the library
    # compiled to WebAssembly with its JavaScript glue, LICENSE and the Rust
    # crates' notices), which the site serves; nothing here builds Rust.
    # Pinned by flake.lock to a commit on deduxit's main; while a change of
    # deduxit is under way, `--override-input deduxit path:../linlog-…' points
    # a build at a local workspace without touching the lock.
    deduxit.url = "github:deduxit/deduxit";

    # deduxit's own nixpkgs, so that the bindings and the site share one
    # package set (and one store and one binary cache), and an update of
    # deduxit moves both. Its Node.js 24 and playwright-driver are the site's.
    nixpkgs.follows = "deduxit/nixpkgs";

    # The flake machinery follows deduxit's too: one set of versions for both
    # repositories, all of them past the fourteen days an update waits.
    flake-parts.follows = "deduxit/flake-parts";
    import-tree.follows = "deduxit/import-tree";
    devshell.follows = "deduxit/devshell";
    treefmt-nix.follows = "deduxit/treefmt-nix";
  };

  outputs = inputs: inputs.flake-parts.lib.mkFlake { inherit inputs; } (inputs.import-tree ./modules);
}
