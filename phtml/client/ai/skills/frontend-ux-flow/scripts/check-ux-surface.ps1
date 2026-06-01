param(
    [string]$Needle = "welcome|register|forgot-password|guest|auth|redirect|loading|pending"
)

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\\..\\..\\..")
$clientRoot = Join-Path $repoRoot "client"

Write-Host "Route middleware:" -ForegroundColor Cyan
Get-ChildItem -Path (Join-Path $clientRoot "app\\middleware") -File |
    Select-Object Name, FullName

Write-Host ""
Write-Host "Server middleware:" -ForegroundColor Cyan
Get-ChildItem -Path (Join-Path $clientRoot "server\\middleware") -File |
    Select-Object Name, FullName

Write-Host ""
Write-Host "Common UX flow matches:" -ForegroundColor Cyan
rg -n $Needle $clientRoot 2>$null
