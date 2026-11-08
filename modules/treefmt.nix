# linlog © Fabian Lukas Grubmüller 2026
# Licensed under the EUPL

# One formatter per file type, all behind `nix fmt' and the `treefmt' flake
# check treefmt-nix adds by itself: nixfmt, Biome for the TypeScript (the
# island's .tsx too), JSON and CSS, by biome.json -- the same file
# `biome lint' (checks.nix) reads, which Biome finds itself in the tree's
# root, so the formatter cannot drift from it -- shfmt and shellcheck for the
# hooks' shell, ruff for their Python.
#
# Biome parses and lints the .astro files but leaves them as written: its HTML
# formatter lays out markup inside {...} by JSX's whitespace rules while Astro
# builds by HTML's (the author's sites found a second pass changing the built
# pages). `format', not the module's default `check': under `nix fmt' a
# linter reports rather than rewrites.
#
# Not formatted: Markdown (prose), and package-lock.json, which is npm's to
# write.
{ inputs, ... }:
{
  imports = [ inputs.treefmt-nix.flakeModule ];

  perSystem =
    { config, lib, ... }:
    {
      treefmt = {
        programs = {
          nixfmt.enable = true;

          biome = {
            enable = true;
            formatCommand = "format";
            # The module's schema validation of its own settings, which
            # these options leave unused.
            validate.enable = false;
            # The whole list: setting `includes' replaces the module's
            # default rather than extending it.
            includes = [
              "*.ts"
              "*.tsx"
              "*.js"
              "*.mjs"
              "*.json"
              "*.jsonc"
              "*.css"
              "*.astro"
            ];
          };

          shfmt.enable = true;
          shellcheck.enable = true;
          ruff-format.enable = true;
        };

        # The module passes its generated settings as `--config-path
        # /nix/store/…', and Biome 2.6 resolves a configuration's `includes'
        # from its own directory, so the tree's files fell outside it and
        # got Biome's defaults (Tailwind's `@theme' then fails to parse).
        # Without the flag Biome reads biome.json from the root treefmt runs
        # in. The arguments are the module's own.
        settings.formatter.biome.options = lib.mkForce [
          config.treefmt.programs.biome.formatCommand
          "--write"
          "--no-errors-on-unmatched"
        ];

        settings.global.excludes = [
          ".direnv/**"
          "result*"
          "node_modules/**"
          "dist/**"
          ".astro/**"
          ".cache/**"
          "playwright-report/**"
          "test-results/**"
          "package-lock.json"
        ];
      };

      # treefmt itself on the shell's PATH, configured exactly as `nix fmt'
      # is, for an editor or a hook formatting one file.
      devshells.default.devshell.packages = [ config.treefmt.build.wrapper ];
    };
}
