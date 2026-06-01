$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\\..\\..\\..")
$clientRoot = Join-Path $repoRoot "client"

Write-Host "Nuxt SEO usage:" -ForegroundColor Cyan
rg -n "useSeoMeta|useHead|canonical|robots|og:" $clientRoot 2>$null

Write-Host ""
Write-Host "Route wrappers:" -ForegroundColor Cyan
Get-ChildItem -Path (Join-Path $clientRoot "app\\pages") -Recurse -File |
    Select-Object FullName
