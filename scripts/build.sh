#!/usr/bin/env bash
set -euo pipefail

root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
version="$(node -p 'require(process.argv[1]).version' "$root/extension/manifest.json")"
if [[ $# -gt 1 || ( $# -eq 1 && "$1" != "$version" ) ]]; then
    echo "Expected a tag version matching manifest version $version." >&2
    exit 1
fi

mkdir -p "$root/dist"
cd "$root/extension"
files=(*)
temporary="$(mktemp -d "$root/dist/.build.XXXXXX")"
trap 'rm -f -- "$temporary/extension.zip"; rmdir -- "$temporary"' EXIT
zip -q "$temporary/extension.zip" -- "${files[@]}"
mv -f -- "$temporary/extension.zip" "$root/dist/media-playback-speed-$version.zip"
