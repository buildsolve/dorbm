# Deploy CakeERP to Railway.
# Run this from the repo root after merging your changes into master.
#
# What it does:
#   1. Builds the frontend and copies it into backend/public
#   2. Commits backend/public (frontend is shipped as a pre-built artifact —
#      Railway's Root Directory setting can't reach the sibling frontend/ folder)
#   3. Pushes to GitHub
#   4. Deploys directly to Railway via CLI (bypasses GitHub auto-deploy,
#      which has been unreliable for this project)

# Note: deliberately NOT using $ErrorActionPreference = "Stop" — native tools (npm, vite)
# write harmless warnings to stderr, which PowerShell would otherwise treat as fatal.
# We check $LASTEXITCODE explicitly after each step instead.
$env:PATH = "C:\Users\User\nodejs-portable\node-v20.11.1-win-x64;" + $env:PATH

function Assert-Success($step) {
    if ($LASTEXITCODE -ne 0) {
        Write-Host "==> FAILED at: $step (exit code $LASTEXITCODE)" -ForegroundColor Red
        exit 1
    }
}

Write-Host "==> Building frontend and copying into backend/public..." -ForegroundColor Cyan
Set-Location "$PSScriptRoot\backend"
npm run build:full
Assert-Success "frontend build"

Write-Host "==> Committing build artifacts..." -ForegroundColor Cyan
Set-Location $PSScriptRoot
git add -f backend/public
git add -A
$changes = git status --porcelain
if ($changes) {
    git commit -m "Deploy: rebuild frontend bundle"
} else {
    Write-Host "No changes to commit." -ForegroundColor Yellow
}

Write-Host "==> Pushing to GitHub..." -ForegroundColor Cyan
git push origin master
Assert-Success "git push"

Write-Host "==> Deploying to Railway..." -ForegroundColor Cyan
railway up -c
Assert-Success "railway up"

Write-Host "==> Done. Live at https://dorbm-production.up.railway.app" -ForegroundColor Green
