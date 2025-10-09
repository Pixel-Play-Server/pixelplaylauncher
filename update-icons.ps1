# Script para actualizar iconos del launcher NoRisk
# Descarga el nuevo logo y genera todos los tamaños y formatos necesarios

param(
    [string]$LogoUrl = "https://raw.githubusercontent.com/Pixel-Play-Server/Pixelplay-website/refs/heads/main/e7379f85-982b-48ec-a200-0799492524aa.ico",
    [string]$OutputDir = "src-tauri/icons",
    [string]$TempDir = "temp-icons"
)

Write-Host "Actualizando iconos del launcher NoRisk..." -ForegroundColor Cyan

# Crear directorio temporal si no existe
if (!(Test-Path $TempDir)) {
    New-Item -ItemType Directory -Path $TempDir | Out-Null
    Write-Host "Directorio temporal creado: $TempDir" -ForegroundColor Green
}

# Descargar el nuevo logo
$LogoPath = Join-Path $TempDir "new-logo.ico"
try {
    Write-Host "Descargando nuevo logo..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri $LogoUrl -OutFile $LogoPath -UseBasicParsing
    Write-Host "Logo descargado exitosamente" -ForegroundColor Green
} catch {
    Write-Host "Error al descargar el logo: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Verificar que el directorio de iconos existe
if (!(Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
    Write-Host "Directorio de iconos creado: $OutputDir" -ForegroundColor Green
}

# Definir todos los tamaños y formatos necesarios
$IconFormats = @(
    # Iconos principales
    @{ Name = "icon.png"; Size = 512; Format = "PNG" },
    @{ Name = "icon.ico"; Size = 256; Format = "ICO" },
    @{ Name = "icon.icns"; Size = 512; Format = "ICNS" },
    
    # Logos de Windows Store
    @{ Name = "Square30x30Logo.png"; Size = 30; Format = "PNG" },
    @{ Name = "Square44x44Logo.png"; Size = 44; Format = "PNG" },
    @{ Name = "Square71x71Logo.png"; Size = 71; Format = "PNG" },
    @{ Name = "Square89x89Logo.png"; Size = 89; Format = "PNG" },
    @{ Name = "Square107x107Logo.png"; Size = 107; Format = "PNG" },
    @{ Name = "Square142x142Logo.png"; Size = 142; Format = "PNG" },
    @{ Name = "Square150x150Logo.png"; Size = 150; Format = "PNG" },
    @{ Name = "Square284x284Logo.png"; Size = 284; Format = "PNG" },
    @{ Name = "Square310x310Logo.png"; Size = 310; Format = "PNG" },
    @{ Name = "Square512x512Logo.png"; Size = 512; Format = "PNG" },
    @{ Name = "StoreLogo.png"; Size = 50; Format = "PNG" },
    
    # Iconos adicionales
    @{ Name = "32x32.png"; Size = 32; Format = "PNG" },
    @{ Name = "128x128.png"; Size = 128; Format = "PNG" },
    @{ Name = "128x128@2x.png"; Size = 256; Format = "PNG" }
)

Write-Host "Generando iconos en diferentes tamaños..." -ForegroundColor Yellow

# Función para redimensionar imagen usando .NET
function Resize-Image {
    param(
        [string]$InputPath,
        [string]$OutputPath,
        [int]$Size
    )
    
    try {
        Add-Type -AssemblyName System.Drawing
        
        # Cargar imagen original
        $originalImage = [System.Drawing.Image]::FromFile($InputPath)
        
        # Crear nueva imagen con el tamaño deseado
        $resizedImage = New-Object System.Drawing.Bitmap($Size, $Size)
        $graphics = [System.Drawing.Graphics]::FromImage($resizedImage)
        
        # Configurar calidad de redimensionamiento
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        
        # Dibujar imagen redimensionada
        $graphics.DrawImage($originalImage, 0, 0, $Size, $Size)
        
        # Guardar según el formato
        $extension = [System.IO.Path]::GetExtension($OutputPath).ToLower()
        switch ($extension) {
            ".png" { $resizedImage.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png) }
            ".ico" { 
                # Para ICO necesitamos múltiples tamaños
                $iconStream = New-Object System.IO.MemoryStream
                $resizedImage.Save($iconStream, [System.Drawing.Imaging.ImageFormat]::Png)
                $resizedImage.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Icon)
            }
            ".icns" { 
                # ICNS es específico de macOS, guardamos como PNG por ahora
                $pngPath = $OutputPath -replace "\.icns$", ".png"
                $resizedImage.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)
                Write-Host "⚠️ ICNS convertido a PNG (requiere herramienta externa para ICNS real)" -ForegroundColor Yellow
            }
        }
        
        # Limpiar recursos
        $graphics.Dispose()
        $resizedImage.Dispose()
        $originalImage.Dispose()
        
        return $true
    }
    catch {
        Write-Host "❌ Error al redimensionar imagen: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Generar todos los iconos
$successCount = 0
$totalCount = $IconFormats.Count

foreach ($format in $IconFormats) {
    $outputPath = Join-Path $OutputDir $format.Name
    Write-Host "Generando $($format.Name) ($($format.Size)x$($format.Size))..." -ForegroundColor Cyan
    
    if (Resize-Image -InputPath $LogoPath -OutputPath $outputPath -Size $format.Size) {
        $successCount++
        Write-Host "SUCCESS: $($format.Name) generado exitosamente" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Error generando $($format.Name)" -ForegroundColor Red
    }
}

# Mostrar resumen
Write-Host "`nRESUMEN DE GENERACION:" -ForegroundColor Cyan
Write-Host "Exitosos: $successCount/$totalCount" -ForegroundColor Green
Write-Host "Fallidos: $($totalCount - $successCount)/$totalCount" -ForegroundColor Red

# Limpiar archivos temporales
Write-Host "`nLimpiando archivos temporales..." -ForegroundColor Yellow
Remove-Item -Path $TempDir -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "Archivos temporales eliminados" -ForegroundColor Green

# Mostrar información adicional
Write-Host "`nINFORMACION ADICIONAL:" -ForegroundColor Cyan
Write-Host "Directorio de iconos: $OutputDir" -ForegroundColor White
Write-Host "Logo original: $LogoUrl" -ForegroundColor White
Write-Host "Total de archivos generados: $successCount" -ForegroundColor White

Write-Host "`nProceso completado!" -ForegroundColor Green
Write-Host "Los iconos estan listos para usar en el launcher." -ForegroundColor Yellow
