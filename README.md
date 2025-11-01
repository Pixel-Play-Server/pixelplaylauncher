# Pixel Play Launcher

PixelPlay Launcher is a modern Minecraft launcher forked from LiquidLauncher and NoRiskClient Launcher. This project is licensed under the GNU General Public License v3.0 (GPLv3).

## About This Fork
- **Origin:** Forked from [LiquidLauncher](https://github.com/liquidlauncher/liquidlauncher) and NoRiskClient Launcher.
- **License:** This project and all modifications are licensed under GPLv3. See the LICENSE file for details.
- **Branding:** All previous NoRisk and LiquidLauncher branding has been replaced with PixelPlay branding.

## Features
- Multi-platform support: Windows, Linux, macOS (Intel & ARM)
- Modern UI with React and Tauri
- Automatic updates via Cloudflare R2
- Installer builds for all major platforms

## Build Instructions
[![Build and Upload to R2 (Windows)](https://github.com/Pixel-Play-Server/pixelplaylauncher/actions/workflows/build-and-upload-r2-windows.yml/badge.svg)](https://github.com/Pixel-Play-Server/pixelplaylauncher/actions/workflows/build-and-upload-r2-windows.yml)

[![Build and Upload to R2 (macOS Intel)](https://github.com/Pixel-Play-Server/pixelplaylauncher/actions/workflows/build-and-upload-r2-macos-intel.yml/badge.svg)](https://github.com/Pixel-Play-Server/pixelplaylauncher/actions/workflows/build-and-upload-r2-macos-intel.yml)

[![Build and Upload to R2 (macOS ARM)](https://github.com/Pixel-Play-Server/pixelplaylauncher/actions/workflows/build-and-upload-r2-macos-arm.yml/badge.svg)](https://github.com/Pixel-Play-Server/pixelplaylauncher/actions/workflows/build-and-upload-r2-macos-arm.yml)

[![Build and Upload to R2 (Linux)](https://github.com/Pixel-Play-Server/pixelplaylauncher/actions/workflows/build-and-upload-r2-linux.yml/badge.svg)](https://github.com/Pixel-Play-Server/pixelplaylauncher/actions/workflows/build-and-upload-r2-linux.yml)

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or newer recommended)
- [Yarn](https://yarnpkg.com/) (v1.x)
- [Rust](https://rustup.rs/) (stable toolchain)
- [Tauri CLI](https://tauri.app/v1/guides/getting-started/prerequisites/)
- On Linux: `libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf build-essential`

### Steps
1. **Install dependencies:**
   ```sh
   yarn install --frozen-lockfile
   ```
2. **Build the frontend:**
   ```sh
   yarn build
   ```
3. **Build the Tauri app (installer):**
   ```sh
   yarn tauri build
   ```
   - For a specific platform (e.g., Windows):
     ```sh
     yarn tauri build --target windows
     ```

### Output
- The installer or app bundle will be in `src-tauri/target/release/bundle/` for your platform.

## License
This project is licensed under the GNU GPL v3. See [LICENSE](LICENSE).

## Credits
- Forked from [LiquidLauncher](https://github.com/liquidlauncher/liquidlauncher) and NoRiskClient Launcher.
- PixelPlay Team and contributors.
