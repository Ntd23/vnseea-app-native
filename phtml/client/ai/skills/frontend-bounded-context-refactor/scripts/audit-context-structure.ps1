param(
    [string]$Context
)

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\\..\\..\\..")
$clientRoot = Join-Path $repoRoot "client"

if (-not $Context) {
    Write-Host "Usage: audit-context-structure.ps1 -Context <context-name>" -ForegroundColor Yellow
    Write-Host "Available contexts:" -ForegroundColor Cyan
    Get-ChildItem -Path (Join-Path $clientRoot "src") -Directory |
        Select-Object -ExpandProperty Name |
        Sort-Object
    exit 0
}

$srcRoot = Join-Path $clientRoot "src\\$Context"

if (-not (Test-Path $srcRoot)) {
    Write-Error "Context not found in src: $Context"
    exit 1
}

Write-Host "Context structure for '$Context':" -ForegroundColor Cyan
Get-ChildItem -Path $srcRoot -Directory | Select-Object Name, FullName

Write-Host ""
Write-Host "Legacy references in app/*:" -ForegroundColor Cyan
rg -n $Context (Join-Path $clientRoot "app") 2>$null

Write-Host ""
Write-Host "Presentation files:" -ForegroundColor Cyan
Get-ChildItem -Path (Join-Path $srcRoot "presentation") -Recurse -File -ErrorAction SilentlyContinue |
    Select-Object FullName

Write-Host ""
Write-Host "Application files:" -ForegroundColor Cyan
Get-ChildItem -Path (Join-Path $srcRoot "application") -Recurse -File -ErrorAction SilentlyContinue |
    Select-Object FullName
