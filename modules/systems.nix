# linlog © Fabian Lukas Grubmüller 2026
# Licensed under the EUPL

# The platforms deduxit's flake builds the package `deduxit-web' for, and where
# the site is worked on. CI builds and checks x86_64-linux alone.
{
  systems = [
    "x86_64-linux"
    "aarch64-linux"
    "aarch64-darwin"
  ];
}
