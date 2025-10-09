# Script para verificar que todos los iconos necesarios estén presentes y tengan el tamaño correcto

param(
    [string]$IconsDir = "src-tauri/icons"
)

Write-Host "Verificando iconos del launcher NoRisk..." -ForegroundColor Cyan

# Lista de archivos requeridos con sus tamaños esperados
$RequiredFiles = @{
    "icon.png" = 512
    "icon.ico" = @(16, 32, 48, 64, 128, 256)  # ICO puede tener múltiples tamaños
    "icon.icns" = 512
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

$MissingFiles = @()
$IncorrectSizes = @()
$ValidFiles = @()

# Verificar que el directorio existe
if (!(Test-Path $IconsDir)) {
    Write-Host "ERROR: Directorio de iconos no encontrado: $IconsDir" -ForegroundColor Red
    exit 1
}

Write-Host "Verificando archivos en: $IconsDir" -ForegroundColor White

# Función para obtener dimensiones de imagen
function Get-ImageDimensions {
    param([string]$ImagePath)
    
    try {
        Add-Type -AssemblyName System.Drawing
        $image = [System.Drawing.Image]::FromFile($ImagePath)
        $width = $image.Width
        $height = $image.Height
        $image.Dispose()
        return @{ Width = $width; Height = $height }
    }
    catch {
        return $null
    }
}

# Verificar cada archivo requerido
foreach ($file in $RequiredFiles.GetEnumerator()) {
    $filePath = Join-Path $IconsDir $file.Key
    $expectedSize = $file.Value
    
    Write-Host "Verificando: $($file.Key)" -ForegroundColor Cyan
    
    if (!(Test-Path $filePath)) {
        $MissingFiles += $file.Key
        Write-Host "  ERROR: ARCHIVO FALTANTE" -ForegroundColor Red
        continue
    }
    
    # Verificar tamaño del archivo
    $fileSize = (Get-Item $filePath).Length
    if ($fileSize -eq 0) {
        $IncorrectSizes += "$($file.Key) (archivo vacío)"
        Write-Host "  ERROR: ARCHIVO VACIO" -ForegroundColor Red
        continue
    }
    
    # Para archivos ICO, verificar que existe pero no las dimensiones específicas
    if ($file.Key -eq "icon.ico") {
        $ValidFiles += $file.Key
        Write-Host "  SUCCESS: ICO encontrado ($([math]::Round($fileSize/1KB, 2)) KB)" -ForegroundColor Green
        continue
    }
    
    # Para archivos ICNS, verificar que existe pero no las dimensiones específicas
    if ($file.Key -eq "icon.icns") {
        $ValidFiles += $file.Key
        Write-Host "  SUCCESS: ICNS encontrado ($([math]::Round($fileSize/1KB, 2)) KB)" -ForegroundColor Green
        continue
    }
    
    # Para archivos PNG, verificar dimensiones
    $dimensions = Get-ImageDimensions -ImagePath $filePath
    if ($null -eq $dimensions) {
        $IncorrectSizes += "$($file.Key) (no se pudo leer)"
        Write-Host "  ERROR: NO SE PUDO LEER" -ForegroundColor Red
        continue
    }
    
    if ($dimensions.Width -eq $expectedSize -and $dimensions.Height -eq $expectedSize) {
        $ValidFiles += $file.Key
        Write-Host "  SUCCESS: Correcto (${expectedSize}x${expectedSize}) - $([math]::Round($fileSize/1KB, 2)) KB" -ForegroundColor Green
    } else {
        $IncorrectSizes += "$($file.Key) (esperado: ${expectedSize}x${expectedSize}, actual: $($dimensions.Width)x$($dimensions.Height))"
        Write-Host "  ERROR: TAMAÑO INCORRECTO (esperado: ${expectedSize}x${expectedSize}, actual: $($dimensions.Width)x$($dimensions.Height))" -ForegroundColor Red
    }
}

# Mostrar resumen
Write-Host "`nRESUMEN DE VERIFICACION:" -ForegroundColor Cyan
Write-Host "Archivos validos: $($ValidFiles.Count)" -ForegroundColor Green
Write-Host "Archivos faltantes: $($MissingFiles.Count)" -ForegroundColor Red
Write-Host "Archivos con problemas: $($IncorrectSizes.Count)" -ForegroundColor Yellow

if ($MissingFiles.Count -gt 0) {
    Write-Host "`nARCHIVOS FALTANTES:" -ForegroundColor Red
    foreach ($file in $MissingFiles) {
        Write-Host "  - $file" -ForegroundColor Red
    }
}

if ($IncorrectSizes.Count -gt 0) {
    Write-Host "`nARCHIVOS CON PROBLEMAS:" -ForegroundColor Yellow
    foreach ($file in $IncorrectSizes) {
        Write-Host "  - $file" -ForegroundColor Yellow
    }
}

if ($ValidFiles.Count -gt 0) {
    Write-Host "`nARCHIVOS VALIDOS:" -ForegroundColor Green
    foreach ($file in $ValidFiles) {
        Write-Host "  - $file" -ForegroundColor Green
    }
}

# Determinar estado general
$totalRequired = $RequiredFiles.Count
$totalValid = $ValidFiles.Count
$percentage = [math]::Round(($totalValid / $totalRequired) * 100, 1)

Write-Host "`nESTADO GENERAL:" -ForegroundColor Cyan
Write-Host "Completitud: $totalValid/$totalRequired ($percentage%)" -ForegroundColor White

if ($percentage -eq 100) {
    Write-Host "Todos los iconos estan correctos!" -ForegroundColor Green
    exit 0
} elseif ($percentage -ge 80) {
    Write-Host "La mayoria de iconos estan correctos, pero faltan algunos." -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "Muchos iconos faltan o tienen problemas." -ForegroundColor Red
    exit 2
}
