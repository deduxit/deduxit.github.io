# deduxit © Fabian Lukas Grubmüller 2026
# Licensed under the EUPL

# What the site takes from deduxit, through the pinned flake input `deduxit':
#
#   deduxitWeb   the package `deduxit-web' of deduxit's flake: the library
#                compiled to wasm32 (deduxit_web_bg.wasm), its JavaScript glue
#                and type declarations from the wasm-bindgen CLI, LICENSE and
#                THIRD-PARTY-NOTICES.txt, the Rust crates' notices. Built by
#                deduxit's flake (and fetched from the Cachix cache
#                `linlog-prover' where its CI pushed it), never here.
#   deduxitFonts deduxit's math fonts and their licences, every file of
#                deduxit's cli/fonts/, where the prover keeps the fonts its
#                drawings are measured with: Euler Math (Euler-Math.otf,
#                OFL.txt), the font every drawing of the page is set in, and
#                STIX Two Math, Garamond-Math and Asana Math (each with its
#                <file>-OFL.txt), which an export may be set in; the bytes the
#                PNG and PDF exports render with. Taken from the input's
#                source at its pinned commit, never copied into this
#                repository.
#   deduxitCli   the package `deduxit-cli' of deduxit's flake, its command
#                `deduxit', at the same commit: the `problems' check decides the
#                store of problems with it (checks.nix).
#
# The dev shell and every npm task link the two at .cache/deduxit-web and
# .cache/deduxit-fonts, where astro.config.ts's aliases `deduxit-web' and
# `deduxit-fonts' point (devshell.nix, node-modules.nix).
{ inputs, lib, ... }:
{
  perSystem =
    { pkgs, system, ... }:
    {
      options = {
        deduxitWeb = lib.mkOption {
          type = lib.types.package;
          default = inputs.deduxit.packages.${system}.deduxit-web;
          defaultText = lib.literalExpression "inputs.deduxit.packages.\${system}.deduxit-web";
          description = "deduxit's WebAssembly bindings, the package the site's worker loads.";
        };

        deduxitCli = lib.mkOption {
          type = lib.types.package;
          default = inputs.deduxit.packages.${system}.deduxit-cli;
          defaultText = lib.literalExpression "inputs.deduxit.packages.\${system}.deduxit-cli";
          description = "deduxit's command, by which the store of problems is decided.";
        };

        deduxitFonts = lib.mkOption {
          type = lib.types.package;
          default = pkgs.runCommand "deduxit-fonts" { } ''
            mkdir $out
            cp ${inputs.deduxit}/cli/fonts/*.otf ${inputs.deduxit}/cli/fonts/*.txt $out/
          '';
          defaultText = lib.literalMD "deduxit's math fonts and their licences from deduxit's `cli/fonts/`";
          description = "The fonts deduxit's drawings are set in, with their licences.";
        };
      };
    };
}
