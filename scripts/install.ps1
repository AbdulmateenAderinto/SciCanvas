# Installs or updates SciCanvas on Windows from the latest GitHub release (no admin rights needed):
#   irm https://raw.githubusercontent.com/AbdulmateenAderinto/SciCanvas/main/scripts/install.ps1 | iex
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'   # Invoke-WebRequest is far faster without its progress bar
$rel = Invoke-RestMethod 'https://api.github.com/repos/AbdulmateenAderinto/SciCanvas/releases/latest' -Headers @{ 'User-Agent' = 'SciCanvas-installer' }
$asset = $rel.assets | Where-Object { $_.name -like 'SciCanvas-Setup-*.exe' } | Select-Object -First 1
if (-not $asset) { throw 'The latest release has no Windows installer yet (it may still be building). Try again in a few minutes.' }
$exe = Join-Path $env:TEMP $asset.name
Write-Host "Downloading $($asset.name) ($([math]::Round($asset.size / 1MB)) MB)..."
Invoke-WebRequest $asset.browser_download_url -OutFile $exe
Write-Host 'Installing...'
Start-Process $exe -ArgumentList '/S', '/currentuser' -Wait
Remove-Item $exe -ErrorAction SilentlyContinue
Write-Host "SciCanvas $($rel.tag_name) installed. Start it from the Start menu or the desktop shortcut; it updates itself from now on."
