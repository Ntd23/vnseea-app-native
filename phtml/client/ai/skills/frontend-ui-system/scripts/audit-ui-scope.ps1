param(
    [string]$Context
)

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\\..\\..\\..")
$clientRoot = Join-Path $repoRoot "client"

if (-not $Context) {
    Write-Host "Available frontend contexts:" -ForegroundColor Cyan
    Get-ChildItem -Path (Join-Path $clientRoot "src") -Directory |
        Select-Object -ExpandProperty Name |
        Sort-Object
    exit 0
}

$presentationRoot = Join-Path $clientRoot "src\\$Context\\presentation"

if (-not (Test-Path $presentationRoot)) {
    Write-Error "No presentation folder found for context '$Context'."
    exit 1
}

Write-Host "Presentation files for context '$Context':" -ForegroundColor Cyan
Get-ChildItem -Path $presentationRoot -Recurse -File |
    Select-Object FullName

Write-Host ""
Write-Host "Related app route wrappers:" -ForegroundColor Cyan
rg -n "$Context|presentation/pages" (Join-Path $clientRoot "app\\pages") 2>$null
