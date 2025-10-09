# 🎨 Actualizador de Iconos - NoRisk Launcher

Este conjunto de scripts te permite actualizar todos los iconos del launcher NoRisk con el nuevo logo de PixelPlay.

## 📁 Archivos Incluidos

- **`update-all-icons.ps1`** - Script maestro (recomendado)
- **`update-icons.ps1`** - Script completo con todas las funciones
- **`update-icons-simple.ps1`** - Script simple (requiere ImageMagick)
- **`verify-icons.ps1`** - Script de verificación
- **`README-icon-update.md`** - Este archivo de instrucciones

## 🚀 Uso Rápido (Recomendado)

```powershell
# Ejecutar el script maestro
.\update-all-icons.ps1
```

El script maestro:
1. ✅ Verifica el estado actual de los iconos
2. 🎨 Descarga y genera todos los iconos necesarios
3. 🔍 Verifica que todo esté correcto
4. 📊 Muestra un resumen completo

## 📋 Uso Avanzado

### Script Completo
```powershell
# Usar el script completo con todas las opciones
.\update-icons.ps1 -LogoUrl "https://tu-logo-url.ico" -OutputDir "src-tauri/icons"
```

### Script Simple
```powershell
# Usar el script simple (requiere ImageMagick)
.\update-icons-simple.ps1 -LogoUrl "https://tu-logo-url.ico"
```

### Solo Verificación
```powershell
# Verificar iconos existentes
.\verify-icons.ps1 -IconsDir "src-tauri/icons"
```

## 🎯 Iconos Generados

El script genera todos los tamaños y formatos necesarios para Tauri:

### Iconos Principales
- `icon.png` (512x512) - Icono principal PNG
- `icon.ico` (múltiples tamaños) - Icono Windows
- `icon.icns` (512x512) - Icono macOS

### Logos de Windows Store
- `Square30x30Logo.png` hasta `Square512x512Logo.png`
- `StoreLogo.png` (50x50)

### Iconos Adicionales
- `32x32.png`, `128x128.png`, `128x128@2x.png`

## 🔧 Requisitos

### Mínimos
- ✅ PowerShell 5.0+
- ✅ .NET Framework 4.5+
- ✅ Conexión a internet

### Opcionales (para mejor calidad)
- 🎨 ImageMagick (para el script simple)
- 🖼️ Herramientas de conversión ICNS

## 📊 Tamaños y Formatos

| Archivo | Tamaño | Formato | Uso |
|---------|--------|---------|-----|
| `icon.png` | 512x512 | PNG | Icono principal |
| `icon.ico` | 16-256px | ICO | Windows |
| `icon.icns` | 512x512 | ICNS | macOS |
| `Square*Logo.png` | 30-512px | PNG | Windows Store |
| `StoreLogo.png` | 50x50 | PNG | Windows Store |
| `128x128@2x.png` | 256x256 | PNG | Retina display |

## 🛠️ Solución de Problemas

### Error: "No se pudo descargar el logo"
- ✅ Verifica tu conexión a internet
- ✅ Comprueba que la URL del logo sea accesible
- ✅ Prueba descargar manualmente el archivo

### Error: "ImageMagick no encontrado"
- 📥 Instala ImageMagick desde: https://imagemagick.org/script/download.php
- 🔄 O usa el script completo: `.\update-icons.ps1`

### Error: "No se pudo redimensionar imagen"
- ✅ Verifica que el archivo de logo sea válido
- ✅ Comprueba que el formato sea compatible (ICO, PNG, JPG)
- 🔄 Intenta con un formato diferente

### Iconos no se muestran en la aplicación
- 🔄 Ejecuta `npm run tauri build` para recompilar
- 🧹 Limpia la caché: `npm run tauri clean`
- 📁 Verifica que los archivos estén en `src-tauri/icons/`

## 📝 Notas Importantes

1. **Backup**: Los scripts sobrescriben los iconos existentes
2. **Formato**: El logo debe ser ICO, PNG o JPG válido
3. **Tamaño**: Se recomienda un logo de al menos 512x512 píxeles
4. **Compilación**: Después de actualizar, recompila la aplicación
5. **Testing**: Prueba en diferentes tamaños de pantalla

## 🔗 URLs de Logo

- **PixelPlay Logo**: https://raw.githubusercontent.com/Pixel-Play-Server/Pixelplay-website/refs/heads/main/e7379f85-982b-48ec-a200-0799492524aa.ico
- **Logo Alternativo**: Puedes usar cualquier URL de logo válida

## 📞 Soporte

Si encuentras problemas:
1. 🔍 Revisa los logs del script
2. ✅ Verifica que todos los requisitos estén instalados
3. 🔄 Intenta con el script alternativo
4. 📝 Reporta el problema con los logs completos

---

**¡Disfruta tu nuevo launcher con los iconos de PixelPlay! 🎉**
