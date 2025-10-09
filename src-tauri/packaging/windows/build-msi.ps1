<#
  build-msi.ps1
  Create an MSI using WiX (heat -> candle -> light).

  Prerequisites:
  - WiX Toolset installed and available in PATH (candle.exe, light.exe, heat.exe)
  - Run this script from the repository root or adjust paths
#>

param(
  [string]$SourceFolder = "src-tauri/target/release/bundle/msi-input",
  [string]$OutputDir = "src-tauri/target/release/bundle/msi",
  [string]$ProductWxs = "src-tauri/packaging/windows/Product.wxs",
  [string]$ProductVersion = "4.0.0"
)

if (-not (Test-Path $SourceFolder)) {
  Write-Error "Source folder '$SourceFolder' does not exist. Place the files you want to package there (e.g., the app files)."
  exit 1
}

New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

$time = Get-Date -Format "yyyyMMddHHmmss"
$harvestedWxs = Join-Path $OutputDir "harvested_$time.wxs"

Write-Host "Harvesting files from $SourceFolder into $harvestedWxs"
heat dir "$SourceFolder" -sfrag -srd -cg ProductComponents -dr INSTALLFOLDER -out "$harvestedWxs"

$productWixObj = Join-Path $OutputDir "Product.wixobj"
$harvestObj = Join-Path $OutputDir "harvested.wixobj"

Write-Host "Compiling WXS files (candle)"
candle -nologo -out "$productWixObj" "$ProductWxs"
candle -nologo -out "$harvestObj" "$harvestedWxs"

Write-Host "Linking MSI (light)"
$msiOut = Join-Path $OutputDir ("PixelPlayLauncher_{0}.msi" -f $ProductVersion)
light -nologo -out "$msiOut" "$productWixObj" "$harvestObj"

if (Test-Path $msiOut) {
  Write-Host "MSI created: $msiOut"
  exit 0
} else {
  Write-Error "MSI build failed"
  exit 2
}
