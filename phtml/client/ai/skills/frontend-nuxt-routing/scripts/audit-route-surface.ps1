$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\\..\\..\\..")
$clientRoot = Join-Path $repoRoot "client"

Write-Host "Page wrappers:" -ForegroundColor Cyan
Get-ChildItem -Path (Join-Path $clientRoot "app\\pages") -Recurse -File |
    Select-Object FullName

Write-Host ""
Write-Host "Route middleware:" -ForegroundColor Cyan
Get-ChildItem -Path (Join-Path $clientRoot "app\\middleware") -File |
    Select-Object Name, FullName

Write-Host ""
Write-Host "Server middleware:" -ForegroundColor Cyan
Get-ChildItem -Path (Join-Path $clientRoot "server\\middleware") -File |
    Select-Object Name, FullName

Write-Host ""
Write-Host "Route registry entries:" -ForegroundColor Cyan
Get-Content (Join-Path $clientRoot "src\\shared-kernel\\application\\constants\\route-registry.ts")
