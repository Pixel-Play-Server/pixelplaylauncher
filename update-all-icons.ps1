# Script maestro para actualizar todos los iconos del launcher NoRisk
# Ejecuta descarga, generacion y verificacion automaticamente

param(
    [string]$LogoUrl = "https://raw.githubusercontent.com/Pixel-Play-Server/Pixelplay-website/refs/heads/main/e7379f85-982b-48ec-a200-0799492524aa.ico",
    [switch]$Force = $false,
    [switch]$SkipVerification = $false
)

Write-Host "ACTUALIZADOR DE ICONOS DEL LAUNCHER NORISK" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Cyan

# Verificar si ya existen iconos
$IconsDir = "src-tauri/icons"
if ((Test-Path $IconsDir) -and (Get-ChildItem $IconsDir -File).Count -gt 0 -and !$Force) {
    Write-Host "WARNING: Ya existen iconos en $IconsDir" -ForegroundColor Yellow
    $response = Read-Host "Deseas continuar y sobrescribir? (s/N)"
    if ($response -notmatch "^[sS]") {
        Write-Host "ERROR: Operacion cancelada por el usuario" -ForegroundColor Red
        exit 0
    }
}

Write-Host "`nCONFIGURACION:" -ForegroundColor White
Write-Host "Logo URL: $LogoUrl" -ForegroundColor Gray
Write-Host "Directorio de salida: $IconsDir" -ForegroundColor Gray
Write-Host "Forzar actualizacion: $Force" -ForegroundColor Gray

# Paso 1: Verificar estado actual
Write-Host "`nPASO 1: Verificando estado actual de iconos..." -ForegroundColor Yellow
if (Test-Path "verify-icons.ps1") {
    try {
        & ".\verify-icons.ps1" -IconsDir $IconsDir
        $verifyExitCode = $LASTEXITCODE
        if ($verifyExitCode -eq 0) {
            Write-Host "SUCCESS: Todos los iconos actuales estan correctos" -ForegroundColor Green
            if (!$Force) {
                $response = Read-Host "Deseas actualizar de todas formas? (s/N)"
                if ($response -notmatch "^[sS]") {
                    Write-Host "ERROR: Operacion cancelada" -ForegroundColor Red
                    exit 0
                }
            }
        }
    } catch {
        Write-Host "WARNING: No se pudo verificar el estado actual: $($_.Exception.Message)" -ForegroundColor Yellow
    }
} else {
    Write-Host "WARNING: Script de verificacion no encontrado, continuando..." -ForegroundColor Yellow
}

# Paso 2: Descargar y generar iconos
Write-Host "`nPASO 2: Generando nuevos iconos..." -ForegroundColor Yellow

# Intentar primero con el script completo
$scriptToRun = $null
if (Test-Path "update-icons.ps1") {
    $scriptToRun = "update-icons.ps1"
    Write-Host "Usando script completo de generacion" -ForegroundColor Cyan
} elseif (Test-Path "update-icons-simple.ps1") {
    $scriptToRun = "update-icons-simple.ps1"
    Write-Host "Usando script simple de generacion" -ForegroundColor Cyan
} else {
    Write-Host "ERROR: No se encontraron scripts de generacion de iconos" -ForegroundColor Red
    exit 1
}

try {
    & ".\$scriptToRun" -LogoUrl $LogoUrl -OutputDir $IconsDir
    if ($LASTEXITCODE -eq 0) {
        Write-Host "SUCCESS: Iconos generados exitosamente" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Error en la generacion de iconos" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "ERROR: Error ejecutando script de generacion: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Paso 3: Verificar resultados (opcional)
if (!$SkipVerification) {
    Write-Host "`nPASO 3: Verificando iconos generados..." -ForegroundColor Yellow
    if (Test-Path "verify-icons.ps1") {
        try {
            & ".\verify-icons.ps1" -IconsDir $IconsDir
            $finalVerifyExitCode = $LASTEXITCODE
            
            switch ($finalVerifyExitCode) {
                0 { 
                    Write-Host "SUCCESS: Todos los iconos estan perfectos!" -ForegroundColor Green
                }
                1 { 
                    Write-Host "WARNING: La mayoria de iconos estan bien, pero hay algunos problemas menores" -ForegroundColor Yellow
                }
                2 { 
                    Write-Host "ERROR: Hay problemas significativos con los iconos generados" -ForegroundColor Red
                }
                default {
                    Write-Host "UNKNOWN: Estado de verificacion desconocido" -ForegroundColor Gray
                }
            }
        } catch {
            Write-Host "WARNING: No se pudo verificar los resultados: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "WARNING: Script de verificacion no encontrado, saltando verificacion" -ForegroundColor Yellow
    }
}

# Paso 4: Mostrar informacion final
Write-Host "`nINFORMACION FINAL:" -ForegroundColor Cyan

if (Test-Path $IconsDir) {
    $iconFiles = Get-ChildItem $IconsDir -File
    $totalSize = ($iconFiles | Measure-Object -Property Length -Sum).Sum
    $totalSizeKB = [math]::Round($totalSize / 1KB, 2)
    
    Write-Host "Directorio: $IconsDir" -ForegroundColor White
    Write-Host "Archivos generados: $($iconFiles.Count)" -ForegroundColor White
    Write-Host "Tamano total: $totalSizeKB KB" -ForegroundColor White
    
    Write-Host "`nARCHIVOS EN EL DIRECTORIO:" -ForegroundColor White
    foreach ($file in $iconFiles | Sort-Object Name) {
        $sizeKB = [math]::Round($file.Length / 1KB, 2)
        Write-Host "  - $($file.Name) ($sizeKB KB)" -ForegroundColor Gray
    }
}

Write-Host "`nPROXIMOS PASOS:" -ForegroundColor Cyan
Write-Host "1. Revisa los iconos generados en $IconsDir" -ForegroundColor White
Write-Host "2. Ejecuta 'npm run tauri build' para compilar con los nuevos iconos" -ForegroundColor White
Write-Host "3. Prueba el launcher para asegurar que los iconos se muestran correctamente" -ForegroundColor White

Write-Host "`nPROCESO COMPLETADO!" -ForegroundColor Green
Write-Host "Los iconos del launcher NoRisk han sido actualizados con el nuevo logo de PixelPlay." -ForegroundColor White