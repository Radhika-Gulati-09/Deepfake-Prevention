# Veil — Windows Launch Script
# Opens the Veil Prototype in your default web browser

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$indexPath = Join-Path $scriptDir "index.html"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Veil — Video Protection Prototype (Research Exploration)  " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Opening in default browser: $indexPath" -ForegroundColor White
Write-Host "Zero-server privacy: 100% of processing runs in your browser." -ForegroundColor Gray
Write-Host ""

Start-Process $indexPath
