# deduxit © Fabian Lukas Grubmüller 2026
# Licensed under the EUPL

# The Biome that the formatter (treefmt.nix), `biome lint' (checks.nix) and
# the dev shell run: nixpkgs' own, built without its test suite.
#
# Biome's tests are nixpkgs' tests of the tool, not this site's checks, and
# matter only when Biome is built here, which happens when the locked
# nixpkgs is a channel release that cache.nixos.org has no Biome for (Biome
# 2.6.5 at 4fe25e12). Their build links several targets with fat LTO at 8 to
# 10 GB of memory each, which a CI runner (16 GB, beside the other checks)
# does not have: the job is killed. Drop the override, so that `pkgs.biome'
# comes from cache.nixos.org again, once the locked nixpkgs has it there:
# `nix path-info --store https://cache.nixos.org --inputs-from . nixpkgs#biome'
# prints its path instead of an error.
{ lib, ... }:
{
  perSystem =
    { pkgs, ... }:
    {
      options.biome = lib.mkOption {
        type = lib.types.package;
        default = pkgs.biome.overrideAttrs { doCheck = false; };
        defaultText = lib.literalExpression "pkgs.biome without its test suite";
        description = "The Biome every formatter, check and shell here runs.";
      };
    };
}
