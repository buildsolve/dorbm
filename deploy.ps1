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

$ErrorActionPreference = "Stop"
$env:PATH = "C:\Users\User\nodejs-portable\node-v20.11.1-win-x64;" + $env:PATH

Write-Host "==> Building frontend and copying into backend/public..." -ForegroundColor Cyan
Set-Location "$PSScriptRoot\backend"
npm run build:full

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

Write-Host "==> Deploying to Railway..." -ForegroundColor Cyan
railway up -c

Write-Host "==> Done. Live at https://dorbm-production.up.railway.app" -ForegroundColor Green
