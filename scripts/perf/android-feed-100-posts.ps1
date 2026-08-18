param(
  [ValidateSet('baseline', 'optimized')]
  [string]$Mode,
  [int]$TargetPosts = 100,
  [int]$MaxSwipes = 220,
  [double]$FrameBudgetMs = 8.33,
  [string]$OutputDirectory = '.tmp-build\client-perf'
)

$ErrorActionPreference = 'Stop'
$adb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
$package = 'com.vnseea.android'
$probe = Join-Path $PSScriptRoot 'rn-client-perf-probe.cjs'
$workspace = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$outputRoot = Join-Path $workspace $OutputDirectory
$runId = "$(Get-Date -Format 'yyyyMMdd-HHmmss')-$Mode"
$runDirectory = Join-Path $outputRoot $runId

New-Item -ItemType Directory -Force -Path $runDirectory | Out-Null
& $adb reverse tcp:8081 tcp:8081 | Out-Null
# Keep the foreground measurement window exclusive on the connected test phone.
& $adb shell am force-stop --user 0 com.ss.android.ugc.trill | Out-Null
& $adb shell am force-stop --user 999 com.ss.android.ugc.trill | Out-Null
& $adb shell am force-stop --user 0 $package | Out-Null
& $adb shell am start -W --user 0 -n "$package/.MainActivity" | Out-Null

$probeReady = $false
1..30 | ForEach-Object {
  if ($probeReady) { return }
  Start-Sleep -Milliseconds 500
  try {
    $probeType = node $probe "typeof globalThis.__VNSEEA_PERF__" 2>$null
    $probeReady = $probeType -eq '"object"'
  } catch {
    $probeReady = $false
  }
}
if (-not $probeReady) {
  throw 'The React Native performance probe did not become ready.'
}

$resetExpression = "globalThis.__VNSEEA_PERF__.configure({enabled:true,frameBudgetMs:$FrameBudgetMs,optimizationMode:'$Mode'});globalThis.__VNSEEA_PERF__.reset();globalThis.__VNSEEA_PERF__.snapshot()"
node $probe $resetExpression | Out-File -Encoding utf8 (Join-Path $runDirectory 'reset.json')
& $adb shell dumpsys gfxinfo $package reset | Out-Null
& $adb shell dumpsys meminfo $package | Out-File -Encoding utf8 (Join-Path $runDirectory 'memory-before.txt')

$swipeCount = 0
$uniqueVisiblePostCount = 0
while (
  $uniqueVisiblePostCount -lt $TargetPosts -and
  $swipeCount -lt $MaxSwipes
) {
  & $adb shell input swipe 540 1920 540 360 500 | Out-Null
  Start-Sleep -Milliseconds 180
  $swipeCount += 1

  if ($swipeCount % 5 -eq 0) {
    $snapshotJson = node $probe "globalThis.__VNSEEA_PERF__.snapshot()"
    $snapshot = $snapshotJson | ConvertFrom-Json
    $uniqueVisiblePostCount = $snapshot.surfaces.feed.uniqueVisiblePostCount
    Write-Host "[$Mode] swipes=$swipeCount posts=$uniqueVisiblePostCount"
  }
}

Start-Sleep -Seconds 2
$finalSnapshotJson = node $probe "globalThis.__VNSEEA_PERF__.snapshot()"
$finalSnapshotJson | Out-File -Encoding utf8 (Join-Path $runDirectory 'runtime.json')
& $adb shell dumpsys gfxinfo $package framestats | Out-File -Encoding utf8 (Join-Path $runDirectory 'gfxinfo.txt')
& $adb shell dumpsys meminfo $package | Out-File -Encoding utf8 (Join-Path $runDirectory 'memory-after-immediate.txt')
Start-Sleep -Seconds 10
& $adb shell dumpsys meminfo $package | Out-File -Encoding utf8 (Join-Path $runDirectory 'memory-after-settled.txt')

[ordered]@{
  mode = $Mode
  targetPosts = $TargetPosts
  frameBudgetMs = $FrameBudgetMs
  uniqueVisiblePostCount = ($finalSnapshotJson | ConvertFrom-Json).surfaces.feed.uniqueVisiblePostCount
  swipeCount = $swipeCount
  outputDirectory = $runDirectory
} | ConvertTo-Json
