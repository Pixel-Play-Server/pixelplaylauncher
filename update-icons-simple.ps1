# Script simple para actualizar iconos usando herramientas del sistema
# Requiere ImageMagick o herramientas similares instaladas

param(
    [string]$LogoUrl = "https://raw.githubusercontent.com/Pixel-Play-Server/Pixelplay-website/refs/heads/main/e7379f85-982b-48ec-a200-0799492524aa.ico",
    [string]$OutputDir = "src-tauri/icons"
)

Write-Host "Actualizando iconos del launcher NoRisk (Version Simple)..." -ForegroundColor Cyan

# Verificar si ImageMagick esta disponible
$magickAvailable = $false
try {
    $null = Get-Command magick -ErrorAction Stop
    $magickAvailable = $true
    Write-Host "SUCCESS: ImageMagick encontrado" -ForegroundColor Green
} catch {
    Write-Host "WARNING: ImageMagick no encontrado, usando metodo alternativo" -ForegroundColor Yellow
}

# Crear directorio temporal
$TempDir = "temp-icons"
if (!(Test-Path $TempDir)) {
    New-Item -ItemType Directory -Path $TempDir | Out-Null
}

# Descargar el logo
$LogoPath = Join-Path $TempDir "new-logo.ico"
try {
    Write-Host "Descargando logo desde: $LogoUrl" -ForegroundColor Yellow
    Invoke-WebRequest -Uri $LogoUrl -OutFile $LogoPath -UseBasicParsing
    Write-Host "SUCCESS: Logo descargado exitosamente" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Error al descargar: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Definir tamanos necesarios
$Sizes = @(30, 32, 44, 50, 71, 89, 107, 128, 142, 150, 256, 284, 310, 512)

# Funcion para generar iconos con ImageMagick
function Generate-IconsWithMagick {
    param([string]$InputPath, [string]$OutputDir, [array]$Sizes)
    
    Write-Host "Generando iconos con ImageMagick..." -ForegroundColor Yellow
    
    foreach ($size in $Sizes) {
        $outputPath = Join-Path $OutputDir "icon_${size}x${size}.png"
        try {
            & magick $InputPath -resize "${size}x${size}" $outputPath
            Write-Host "SUCCESS: Generado: icon_${size}x${size}.png" -ForegroundColor Green
        } catch {
            Write-Host "ERROR: Error generando ${size}x${size}: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    # Generar ICO con multiples tamanos
    $icoPath = Join-Path $OutputDir "icon.ico"
    try {
        & magick $InputPath -define icon:auto-resize=256,128,64,48,32,16 $icoPath
        Write-Host "SUCCESS: Generado: icon.ico" -ForegroundColor Green
    } catch {
        Write-Host "ERROR: Error generando ICO: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Funcion para generar iconos con .NET (fallback)
function Generate-IconsWithNet {
    param([string]$InputPath, [string]$OutputDir, [array]$Sizes)
    
    Write-Host "Generando iconos con .NET Framework..." -ForegroundColor Yellow
    
    Add-Type -AssemblyName System.Drawing
    
    foreach ($size in $Sizes) {
        $outputPath = Join-Path $OutputDir "icon_${size}x${size}.png"
        try {
            $originalImage = [System.Drawing.Image]::FromFile($InputPath)
            $resizedImage = New-Object System.Drawing.Bitmap($size, $size)
            $graphics = [System.Drawing.Graphics]::FromImage($resizedImage)
            
            $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $graphics.DrawImage($originalImage, 0, 0, $size, $size)
            $resizedImage.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
            
            $graphics.Dispose()
            $resizedImage.Dispose()
            $originalImage.Dispose()
            
            Write-Host "SUCCESS: Generado: icon_${size}x${size}.png" -ForegroundColor Green
        } catch {
            Write-Host "ERROR: Error generando ${size}x${size}: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

# Generar iconos segun el metodo disponible
if ($magickAvailable) {
    Generate-IconsWithMagick -InputPath $LogoPath -OutputDir $OutputDir -Sizes $Sizes
} else {
    Generate-IconsWithNet -InputPath $LogoPath -OutputDir $OutputDir -Sizes $Sizes
}

# Crear archivos con nombres especificos para Tauri
$SpecificFiles = @{
    "icon.png" = 512
    "icon.ico" = 256
    "Square30x30Logo.png" = 30
    "Square44x44Logo.png" = 44
    "Square71x71Logo.png" = 71
    "Square89x89Logo.png" = 89
    "Square107x107Logo.png" = 107
    "Square142x142Logo.png" = 142
    "Square150x150Logo.png" = 150
    "Square284x284Logo.png" = 284
    "Square310x310Logo.png" = 310
    "Square512x512Logo.png" = 512
    "StoreLogo.png" = 50
    "32x32.png" = 32
    "128x128.png" = 128
    "128x128@2x.png" = 256
}

Write-Host "`nCreando archivos con nombres especificos de Tauri..." -ForegroundColor Yellow

foreach ($file in $SpecificFiles.GetEnumerator()) {
    $sourceFile = Join-Path $OutputDir "icon_$($file.Value)x$($file.Value).png"
    $targetFile = Join-Path $OutputDir $file.Key
    
    if (Test-Path $sourceFile) {
        Copy-Item $sourceFile $targetFile -Force
        Write-Host "SUCCESS: Creado: $($file.Key)" -ForegroundColor Green
    } else {
        Write-Host "WARNING: No se encontro: $sourceFile" -ForegroundColor Yellow
    }
}

# Limpiar archivos temporales
Write-Host "`nLimpiando archivos temporales..." -ForegroundColor Yellow
Get-ChildItem $OutputDir -Filter "icon_*x*.png" | Remove-Item -Force
Remove-Item $TempDir -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "`nProceso completado!" -ForegroundColor Green
Write-Host "Iconos generados en: $OutputDir" -ForegroundColor White
Write-Host "Revisa los archivos generados antes de usar en produccion." -ForegroundColor Yellow

