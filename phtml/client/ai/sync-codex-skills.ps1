param(
    [switch]$Clean
)

$clientRoot = Split-Path -Parent $PSScriptRoot
$sourceRoot = Join-Path $PSScriptRoot "skills"
$codexHome = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $HOME ".codex" }
$targetRoot = Join-Path $codexHome "skills"

if (-not (Test-Path $sourceRoot)) {
    Write-Error "Skill source directory not found: $sourceRoot"
    exit 1
}

New-Item -ItemType Directory -Force -Path $targetRoot | Out-Null

$skills = Get-ChildItem -Path $sourceRoot -Directory

foreach ($skill in $skills) {
    $target = Join-Path $targetRoot $skill.Name

    if ($Clean -and (Test-Path $target)) {
        Remove-Item -LiteralPath $target -Recurse -Force
    }

    Copy-Item -Path $skill.FullName -Destination $target -Recurse -Force
    Write-Host "Synced $($skill.Name) -> $target"
}

Write-Host ""
Write-Host "Codex skill sync complete."
Write-Host "Source: $sourceRoot"
Write-Host "Target: $targetRoot"
