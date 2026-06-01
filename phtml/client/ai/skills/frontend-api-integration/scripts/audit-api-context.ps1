param(
    [string]$Context
)

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\\..\\..\\..")
$clientRoot = Join-Path $repoRoot "client"

if (-not $Context) {
    Write-Host "Usage: audit-api-context.ps1 -Context <context-name>" -ForegroundColor Yellow
    Write-Host "Available contexts:" -ForegroundColor Cyan
    Get-ChildItem -Path (Join-Path $clientRoot "src") -Directory |
        Select-Object -ExpandProperty Name |
        Sort-Object
    exit 0
}

$contextRoot = Join-Path $clientRoot "src\\$Context"

if (-not (Test-Path $contextRoot)) {
    Write-Error "Context not found: $Context"
    exit 1
}

Write-Host "Context root: $contextRoot" -ForegroundColor Cyan

$checks = @(
    "domain\\repositories",
    "application\\view-models",
    "application\\stores",
    "infrastructure\\repositories",
    "infrastructure\\mappers",
    "presentation\\pages"
)

foreach ($relative in $checks) {
    $path = Join-Path $contextRoot $relative
    $exists = Test-Path $path
    "{0,-32} {1}" -f $relative, ($(if ($exists) { "OK" } else { "MISSING" }))
}

Write-Host ""
Write-Host "Related server bridge routes:" -ForegroundColor Cyan
rg -n $Context (Join-Path $clientRoot "server\\api") 2>$null

Write-Host ""
Write-Host "Related route registry entries:" -ForegroundColor Cyan
rg -n $Context (Join-Path $clientRoot "src\\shared-kernel\\application\\constants\\route-registry.ts") 2>$null
