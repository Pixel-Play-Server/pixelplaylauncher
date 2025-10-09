Pixel Play Launcher — MSI packaging
=================================

Este directorio contiene plantillas y un script para generar un MSI localmente usando WiX.

Requisitos:
- WiX Toolset (heat.exe, candle.exe, light.exe) instalado y en PATH.

Uso rápido:
1. Prepara los archivos que quieres empaquetar en `src-tauri/target/release/bundle/msi-input`.
   - Por ejemplo, copia el ejecutable y recursos necesarios dentro de esa carpeta; el MSI los instalará en `Program Files`.
2. Desde PowerShell ejecuta:

   .\src-tauri\packaging\windows\build-msi.ps1

3. El MSI resultante aparecerá en `src-tauri/target/release/bundle/msi/` con el nombre `PixelPlayLauncher_<version>.msi`.

Notas:
- El archivo `Product.wxs` es una plantilla básica: actualiza el `UpgradeCode` con un GUID estable si vas a publicar actualizaciones.
- Este script usa `heat` para generar componentes basados en el contenido del folder. Para paquetes más complejos o registros de servicios, adapta `Product.wxs` manualmente.
