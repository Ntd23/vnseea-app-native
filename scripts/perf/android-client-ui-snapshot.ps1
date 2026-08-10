param(
  [ValidateSet('baseline', 'optimized')]
  [string]$Mode = 'optimized',
  [ValidateSet('reset', 'snapshot')]
  [string]$Action = 'snapshot',
  [double]$FrameBudgetMs = 8.33
)

$ErrorActionPreference = 'Stop'
$adb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
$probe = Join-Path $PSScriptRoot 'rn-client-perf-probe.cjs'

if (-not (Test-Path -LiteralPath $adb)) {
  throw "adb was not found at $adb"
}

& $adb get-state | Out-Null

if ($Action -eq 'reset') {
  $expression = "globalThis.__VNSEEA_PERF__.configure({enabled:true,frameBudgetMs:$FrameBudgetMs,optimizationMode:'$Mode'});globalThis.__VNSEEA_PERF__.reset();globalThis.__VNSEEA_PERF__.snapshot()"
  & $adb shell dumpsys gfxinfo com.vnseea.android reset | Out-Null
} else {
  $expression = 'globalThis.__VNSEEA_PERF__.snapshot()'
}

node $probe $expression
