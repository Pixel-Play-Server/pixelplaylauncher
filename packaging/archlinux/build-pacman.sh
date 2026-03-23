#!/usr/bin/env bash
# Construye un paquete pacman (.pkg.tar.zst) a partir del binario Tauri ya compilado.
# Requiere: makepkg (base-devel), fakeroot. No ejecutar como root.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="${GITHUB_WORKSPACE:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
VERSION=$(grep '"version"' "$REPO_ROOT/src-tauri/tauri.conf.json" | head -1 | cut -d '"' -f4)
BIN="$REPO_ROOT/src-tauri/target/release/pixelplayclient-launcher-v3"

if [[ ! -f "$BIN" ]]; then
  echo "No está el binario release: $BIN" >&2
  exit 1
fi

if [[ "$(id -u)" -eq 0 ]]; then
  echo "makepkg no debe ejecutarse como root; usa un usuario sin privilegios (p. ej. runuser -u builder)." >&2
  exit 1
fi

cd "$SCRIPT_DIR"
# No borrar pixelplay-launcher.desktop ni PKGBUILD.in: son fuentes del repo.
rm -f PKGBUILD pixelplayclient-launcher-v3 icon.png ./*.pkg.tar.zst

sed "s/^pkgver=.*/pkgver=$VERSION/" PKGBUILD.in > PKGBUILD
cp "$BIN" ./pixelplayclient-launcher-v3
# pixelplay-launcher.desktop ya está en $SCRIPT_DIR (mismo cwd); no copiar sobre sí mismo.
ICON_SRC=""
for f in "$REPO_ROOT/src-tauri/icons/128x128.png" "$REPO_ROOT/src-tauri/icons/32x32.png"; do
  if [[ -f "$f" ]]; then
    ICON_SRC="$f"
    break
  fi
done
if [[ -z "$ICON_SRC" ]]; then
  echo "No hay icono en src-tauri/icons/ (128x128 o 32x32)." >&2
  exit 1
fi
cp "$ICON_SRC" ./icon.png

makepkg -f

echo "Paquete generado:"
ls -la "$SCRIPT_DIR"/*.pkg.tar.zst
