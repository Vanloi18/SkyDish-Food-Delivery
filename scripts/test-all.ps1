# ==============================================================================
# SkyDish Platform — Windows Master Test Automation Runner (.ps1)
# ==============================================================================

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "[*] SKYDISH PLATFORM -- MASTER TEST SUITE (POWERSHELL)" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
Set-Location $RootDir

# Invoke native Node master test runner
node "$RootDir\scripts\test-all.mjs"
$RunnerExit = $LASTEXITCODE

if ($RunnerExit -ne 0) {
    Write-Host "[-] Master test suite completed with failures (Exit code: $RunnerExit)" -ForegroundColor Red
    exit $RunnerExit
} else {
    Write-Host "[+] Master test suite passed successfully!" -ForegroundColor Green
    exit 0
}
